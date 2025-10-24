import os
from dotenv import load_dotenv
from google import genai
from google.genai.errors import APIError

# Importation du contexte de connaissances de l'entreprise
from context import CONTEXT_KNOWLEDGE

# Pour la création de l'API web
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, List

# --- Configuration de la base de données simulée pour la mémoire ---
# ATTENTION: En production réelle, ceci doit être remplacé par Firestore.
in_memory_db: Dict[str, List[Dict[str, str]]] = {} 

# --- Configuration de l'IA ---

load_dotenv()
try:
    # Le client cherche automatiquement la clé dans les variables d'environnement (GEMINI_API_KEY)
    client = genai.Client()
except Exception as e:
    print(f"Erreur d'initialisation du client Gemini: {e}")

# --- Définition de l'application FastAPI ---

app = FastAPI()

# Configuration CORS pour autoriser l'accès depuis le frontend
origins = [
    "*", # Important: En production, remplacez par l'URL exacte du client
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

# Modèle de données pour la requête (y compris l'ID de session pour la mémoire)
class ChatRequest(BaseModel):
    message: str 
    session_id: str # Clé pour maintenir l'historique de la conversation

# --- Fonctions de gestion de la mémoire ---

def get_history(session_id: str) -> List[Dict[str, str]]:
    """Récupère l'historique d'une session donnée depuis la base de données."""
    return in_memory_db.get(session_id, [])

def save_turn(session_id: str, role: str, message: str):
    """Sauvegarde un tour de conversation (utilisateur ou bot) dans la base de données."""
    if session_id not in in_memory_db:
        in_memory_db[session_id] = []
    
    # Limiter l'historique pour éviter des coûts trop élevés et des prompts trop longs
    MAX_HISTORY_LENGTH = 10 # Garde les 5 derniers tours utilisateur/bot (10 messages)
    
    in_memory_db[session_id].append({"role": role, "text": message})
    
    # Appliquer la limite de taille
    if len(in_memory_db[session_id]) > MAX_HISTORY_LENGTH:
        in_memory_db[session_id] = in_memory_db[session_id][-MAX_HISTORY_LENGTH:]


# 3. Route de l'API (Le "pont")
@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Route qui prend le message de l'utilisateur, gère l'historique, appelle l'IA et retourne la réponse.
    """
    user_prompt = request.message
    session_id = request.session_id

    # 1. Définir le rôle de l'IA (System Instruction)
    system_instruction_entreprise = (
        "Vous êtes Maître Max, un assistant virtuel professionnel et confidentiel du 'Cabinet APJ (Assistance Pro Juridique)'. "
        "Votre rôle est d'aider les clients avec les questions initiales sur les domaines d'expertise, les tarifs et les processus du cabinet. "
        "Utilisez un ton formel, courtois et très précis. Ne donnez jamais de conseil juridique direct ou de diagnostic de cas. "
        "Répondez uniquement en français. Ne mentionnez jamais que vous êtes un modèle "
        "linguistique entraîné par Google. "
        "Utilisez toujours la 'Base de Connaissances Cabinet APJ' fournie ci-dessous pour formuler vos réponses. "
        "Si l'information n'est pas dans la base de connaissances, indiquez poliment que cela nécessite une consultation directe avec un avocat."
    )

    # 2. Récupérer l'historique
    history = get_history(session_id)
    
    # 3. Construire le prompt complet avec Contexte + Historique + Message Utilisateur
    
    # Créer le message de l'utilisateur avec le contexte des connaissances RAG
    full_prompt = (
        f"{system_instruction_entreprise}\n\n"
        f"{CONTEXT_KNOWLEDGE}\n\n"
        # Ajout de l'historique pour la mémoire
        + "".join([f"{t['role'].capitalize()}: {t['text']}\n" for t in history])
        + f"Utilisateur: {user_prompt}"
    )

    # Sauvegarder le message utilisateur (pour le prochain appel)
    save_turn(session_id, "utilisateur", user_prompt)
    
    # --- Appel de l'IA ---
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=full_prompt
        )
        
        bot_response_text = response.text
        
        # Sauvegarder la réponse du bot
        save_turn(session_id, "bot", bot_response_text)
        
        # Retourne le texte de la réponse
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
