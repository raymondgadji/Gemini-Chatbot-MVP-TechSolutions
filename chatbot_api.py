# chatbot_api.py
import os
import time
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel
from context import CONTEXT
import logging

# Configuration de la journalisation pour le débogage
logging.basicConfig(level=logging.INFO)

# --- Configuration de l'API ---
app = FastAPI(title="AI_Y Chatbot API", version="1.0.0")

# Charger la clé API depuis l'environnement (Render)
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY n'est pas configuré dans les variables d'environnement.")

# Initialiser le client Gemini
client = genai.Client(api_key=GEMINI_API_KEY)

# Définition du modèle de requête pour l'historique de conversation
class ChatRequest(BaseModel):
    message: str
    session_id: str
    history: list[dict] # L'historique des tours de conversation

# --- Rôle et Contexte pour l'IA ---

# 1. Définir le rôle de l'IA (System Instruction)
system_instruction_entreprise = (
    "Vous êtes Yedidia, l'assistant commercial virtuel d'AI_Y (Artificial Intelligence Yedidia). "
    "Votre rôle principal est de présenter les services d'AI_Y, de rassurer le prospect, de fournir les tarifs clairs "
    "et d'inviter à l'action ('démarrer un projet' ou 'demander une démo'). "
    "Utilisez un ton amical, confiant, moderne et très orienté solution. "
    "Répondez uniquement en français. Ne mentionnez jamais que vous êtes un modèle "
    "linguistique entraîné par Google. "
    "Utilisez toujours la 'Base de Connaissances Artificial Intelligence Yedidia (AI_Y)' fournie ci-dessous pour formuler vos réponses. "
    "Si l'information n'est pas dans la base de connaissances (par exemple, pour des questions très techniques ou complexes), "
    "indiquez poliment que cela nécessite de contacter directement un expert d'AI_Y."
)

# Construire la consigne finale envoyée à l'IA
SYSTEM_INSTRUCTION_FINAL = f"""
{system_instruction_entreprise}

--- Base de Connaissances Artificial Intelligence Yedidia (AI_Y) ---
{CONTEXT}
"""

# --- Routes de l'API ---

@app.get("/")
def read_root():
    """Route de vérification de l'état de l'API."""
    return JSONResponse(content={"status": "API AI_Y en cours d'exécution", "model": "Gemini 2.5 Flash"})

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """Route principale pour les requêtes de chat."""
    try:
        # 1. Préparer l'historique et la nouvelle requête
        
        # Le modèle Gemini utilise des rôles 'user' et 'model'.
        # Nous reconstruisons l'historique dans ce format.
        contents = []
        for turn in request.history:
            contents.append({
                "role": "user" if turn["role"] == "user" else "model",
                "parts": [{"text": turn["text"]}]
            })
            
        # Ajouter le message utilisateur actuel
        contents.append({
            "role": "user",
            "parts": [{"text": request.message}]
        })

        # 2. Configuration et Appel à l'IA
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=contents,
            config={"system_instruction": SYSTEM_INSTRUCTION_FINAL}
        )
        
        # 3. Réponse
        ai_response_text = response.text
        
        return JSONResponse(content={
            "response": ai_response_text,
            "session_id": request.session_id # Renvoyer le même ID de session
        })

    except genai.errors.APIError as e:
        logging.error(f"Gemini API Error: {e}")
        return JSONResponse(
            content={"error": "Erreur de l'API Gemini. Veuillez réessayer.", "details": str(e)},
            status_code=500
        )
    except Exception as e:
        logging.error(f"Internal Server Error: {e}")
        return JSONResponse(
            content={"error": "Erreur interne du serveur. Vérifiez les logs.", "details": str(e)},
            status_code=500
        )

# Fix pour Render : le déploiement sur Render nécessite que l'application soit nommée 'app'
# C'est implicitement géré par l'instance FastAPI ci-dessus.