# chatbot_api.py - AVEC GESTION DE LA MÉMOIRE DE CONVERSATION (Firestore)
import os
import json
from dotenv import load_dotenv
from google import genai
from google.genai.errors import APIError

# Pour l'API web et les modèles de données
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware 

# Importation de la base de connaissances
from context import CONTEXT_KNOWLEDGE 

# Importation des outils Firebase (simulés pour l'environnement Gemini)
# En production réelle, ceci nécessiterait l'installation d'un SDK Python comme firebase-admin
# Pour cet environnement, nous allons simuler les fonctions de Firestore (voir ci-dessous)
# NOTE: Dans un vrai déploiement Python, vous utiliseriez firebase-admin ou un ORM.

# --- Configuration de l'IA et de l'API ---

load_dotenv()
try:
    client = genai.Client()
except Exception as e:
    print(f"Erreur d'initialisation du client Gemini: {e}")

app = FastAPI()

# Configuration CORS
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

# 2. Modèle de données pour la requête (AJOUT DU session_id)
class ChatRequest(BaseModel):
    message: str 
    session_id: str # Clé pour stocker et récupérer la conversation

# --- FONCTIONS DE BASE DE DONNÉES (Simulation Firestore/Mémoire) ---
# Dans un environnement de déploiement réel (ex: sur Render), vous utiliseriez 
# le SDK Python de Firebase Admin. Ici, nous allons simuler un stockage simple
# en mémoire pour le test local, en attendant le vrai déploiement.
# NOTE PROFESSIONNELLE: Pour un vrai MVP, vous devez connecter une DB réelle (Firestore).

# Dictionnaire simulant une base de données Firestore en mémoire (pour le test local)
# Clé: session_id, Valeur: liste des messages
# Format de l'historique: [{"role": "user", "text": "Salut"}, {"role": "model", "text": "Bonjour"}]
in_memory_db = {}

def get_chat_history(session_id: str) -> list:
    """Récupère l'historique de conversation de la session."""
    return in_memory_db.get(session_id, [])

def save_turn(session_id: str, history: list):
    """Sauvegarde le nouvel état de l'historique."""
    in_memory_db[session_id] = history
    # IMPORTANT: En production avec Firestore, cette fonction ferait un 'setDoc' ou 'updateDoc'.


# 3. Route de l'API (AVEC MÉMOIRE)
@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    user_prompt = request.message
    session_id = request.session_id
    
    # 1. Définir le rôle de l'IA (System Instruction)
    system_instruction_entreprise = (
        "Vous êtes Max, un assistant virtuel amical et professionnel pour l'entreprise 'TechSolutions'. "
        "Votre rôle est d'aider les clients avec les questions sur les produits, les services, et le support technique de TechSolutions. "
        "Gardez les réponses concises et utiles. Ne mentionnez jamais que vous êtes un modèle "
        "linguistique entraîné par Google. Répondez uniquement en français."
        "Utilisez toujours la 'Base de Connaissances TechSolutions' fournie ci-dessous pour formuler vos réponses. "
        "Si l'information n'est pas dans la base de connaissances, indiquez-le poliment et invitez l'utilisateur à contacter le support direct."
    )
    
    # 2. Récupération de l'historique de la session
    history = get_chat_history(session_id)
    
    # 3. CONTEXT INJECTION (Assemblage du Prompt pour Gemini)
    
    # Préparez la liste de contenu pour Gemini
    # Gemini peut accepter une liste de messages passés pour maintenir le contexte.
    
    # (a) Créer la liste des contenus passés (historique + connaissance + nouveau message)
    gemini_contents = []
    
    # Ajout de l'historique de la conversation (rôles 'user' et 'model')
    for turn in history:
        # NOTE: Le rôle du modèle est 'model' dans l'API Gemini
        role = "user" if turn["role"] == "user" else "model"
        gemini_contents.append({"role": role, "parts": [{"text": turn["text"]}]})

    # Ajout du contexte RAG + du nouveau message de l'utilisateur
    
    # Le contexte RAG est ajouté au message utilisateur pour qu'il soit traité ensemble
    # C'est une stratégie de "mémoire contextuelle"
    full_user_prompt = f"{CONTEXT_KNOWLEDGE}\n\n--- QUESTION UTILISATEUR ---\n{user_prompt}"
    
    gemini_contents.append({"role": "user", "parts": [{"text": full_user_prompt}]})

    
    # --- Appel de l'IA ---
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            # ON ENVOIE TOUT L'HISTORIQUE PLUS LE NOUVEAU MESSAGE
            contents=gemini_contents, 
            config={"system_instruction": system_instruction_entreprise} 
        )
        
        bot_response_text = response.text
        
        # 4. Sauvegarde du nouveau tour de conversation
        # Ajout du message de l'utilisateur (sans le contexte RAG)
        history.append({"role": "user", "text": user_prompt}) 
        # Ajout de la réponse du bot
        history.append({"role": "model", "text": bot_response_text})
        
        save_turn(session_id, history)

        # 5. Retourne la réponse
        return {"response": bot_response_text}

    except APIError as e:
        print(f"Erreur d'API: {e}")
        return {"response": "Désolé, une erreur de l'IA s'est produite. Veuillez réessayer plus tard."}
    except Exception as e:
        print(f"Erreur inattendue: {e}")
        return {"response": "Désolé, une erreur interne du serveur s'est produite."}

# Route de test simple (pour vérifier que l'API est en ligne)
@app.get("/")
def read_root():
    return {"status": "API du Chatbot en cours d'exécution"}
