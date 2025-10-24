# backend_test.py

import os
from dotenv import load_dotenv
from google import genai
from google.genai.errors import APIError

# 1. Charger les variables d'environnement (y compris votre clé API)
load_dotenv()

# 2. Obtenir la clé API (Le SDK la trouvera automatiquement si vous l'avez nommée GEMINI_API_KEY)
# Si ce n'est pas le cas, vous pouvez la récupérer manuellement :
# api_key = os.getenv("GEMINI_API_KEY")

try:
    # 3. Initialiser le client Gemini
    # Le client cherche automatiquement la clé dans les variables d'environnement.
    client = genai.Client()

    # 4. Le message de l'utilisateur que nous testons
    user_prompt = "Quel est le moyen le plus simple d'expliquer l'intelligence artificielle à un enfant de 10 ans ?"

    print(f"User Prompt: {user_prompt}\n")
    print("🤖 Génération de la réponse...\n")

    # 5. Appeler le modèle Gemini
    response = client.models.generate_content(
        model='gemini-2.5-flash', # Un modèle rapide et efficace pour le chat
        contents=user_prompt
    )

    # 6. Afficher la réponse
    print("=== Réponse du Chatbot ===")
    print(response.text)
    print("===========================")

except APIError as e:
    print(f"Erreur d'API Gemini : {e}")
    print("Vérifiez que votre clé API est correcte et active dans le fichier .env.")
except Exception as e:
    print(f"Une erreur s'est produite : {e}")


# Astuce : Pour le MVP d'entreprise, vous pourriez ajouter une instruction (system instruction) 
# pour que le bot réponde toujours dans le ton de l'entreprise :
# system_instruction="Vous êtes un assistant aimable et professionnel pour l'entreprise 'XYZ'. 
# Répondez toujours de manière concise et utile."