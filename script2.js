// La nouvelle URL de votre API déployée sur Render.
const API_URL = 'https://max-chatbot-techsolutions-mvp.onrender.com/api/chat';

// Fonction pour ouvrir/fermer le chat
function toggleChat() {
    const chatWindow = document.getElementById('chat-window');
    chatWindow.classList.toggle('hidden'); // toggle ajoute ou retire la classe
}

// Fonction pour générer un ID de session unique (stocké dans le navigateur)
// Ce session_id est utilisé par le backend pour retrouver l'historique
function getSessionId() {
    let sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
        sessionId = 'session_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
}

// Fonction pour ajouter un message à l'interface
function appendMessage(sender, text) {
    const chatBody = document.getElementById('chat-body');
    
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    
    if (sender === 'user') {
        messageDiv.classList.add('user-message');
    } else {
        messageDiv.classList.add('bot-message');
    }
    
    messageDiv.innerText = text;
    chatBody.appendChild(messageDiv);
    
    // Faire défiler vers le bas pour voir le nouveau message
    chatBody.scrollTop = chatBody.scrollHeight;
}

// Fonction principale pour envoyer le message à l'API
async function sendMessage() {
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-btn');
    const message = userInput.value.trim();
    
    if (!message) return; // Ne rien faire si le message est vide

    // 1. Afficher le message de l'utilisateur et vider le champ
    appendMessage('user', message);
    userInput.value = '';
    
    // 2. Désactiver le bouton pour indiquer le travail de l'IA
    sendButton.disabled = true;
    sendButton.innerText = '...'; 

    try {
        // 3. Envoyer la requête POST à l'API de production
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            // On envoie le message ET le session_id pour la mémoire
            body: JSON.stringify({ 
                message: message,
                session_id: getSessionId() // Le session ID est envoyé ici
            }),
        });

        const data = await response.json();
        
        // 4. Afficher la réponse du bot
        appendMessage('bot', data.response);

    } catch (error) {
        console.error('Erreur lors de la communication avec l\'API de Production:', error);
        appendMessage('bot', 'Désolé, je n\'arrive pas à me connecter au serveur API déployé.');
    } finally {
        // 5. Rétablir le bouton Send
        sendButton.disabled = false;
        sendButton.innerText = 'Send';
        userInput.focus(); // Rétablit le focus sur le champ de saisie
    }
}

// Ajout des écouteurs d'événements
document.addEventListener('DOMContentLoaded', () => {
    // 1. Écouter le clic sur le bouton "Send"
    document.getElementById('send-btn').addEventListener('click', sendMessage);

    // 2. Écouter la touche "Entrée" dans le champ de saisie
    document.getElementById('user-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});
