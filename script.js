// L'URL de votre API FastAPI (ne pas l'oublier!)
const API_URL = 'http://127.0.0.1:8000/api/chat';
let sessionId = null; // Variable globale pour stocker l'identifiant de session

// Fonction pour générer un UUID (identifiant unique universel)
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Fonction pour initialiser la session
function initializeSession() {
    // 1. Essayer de récupérer l'ID de session stocké dans le navigateur
    const storedId = localStorage.getItem('chatbot_session_id');
    
    if (storedId) {
        sessionId = storedId;
        console.log("Session ID récupéré:", sessionId);
    } else {
        // 2. Si aucun ID n'existe, en générer un nouveau et le stocker
        sessionId = generateUUID();
        localStorage.setItem('chatbot_session_id', sessionId);
        console.log("Nouvel Session ID généré:", sessionId);
    }
}


// Fonction pour ouvrir/fermer le chat
function toggleChat() {
    const chatWindow = document.getElementById('chat-window');
    chatWindow.classList.toggle('hidden'); 
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
    
    // Remplacement des sauts de ligne par des balises <br> pour un meilleur rendu
    const formattedText = text.replace(/\n/g, '<br>');
    messageDiv.innerHTML = formattedText;
    
    chatBody.appendChild(messageDiv);
    
    // Faire défiler vers le bas
    chatBody.scrollTop = chatBody.scrollHeight;
}

// Fonction principale pour envoyer le message
async function sendMessage() {
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-btn');
    const message = userInput.value.trim();
    
    if (!message) return;

    // 1. Afficher le message de l'utilisateur et vider le champ
    appendMessage('user', message);
    userInput.value = '';
    
    // 2. Désactiver le bouton
    sendButton.disabled = true;
    sendButton.innerText = '...'; 

    try {
        // 3. Envoyer la requête POST à l'API Python
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            // Le corps de la requête inclut le message ET le session_id
            body: JSON.stringify({ 
                message: message,
                session_id: sessionId // <--- AJOUT CRUCIAL
            }),
        });

        const data = await response.json();
        
        // 4. Afficher la réponse du bot
        appendMessage('bot', data.response);

    } catch (error) {
        console.error('Erreur lors de la communication avec l\'API:', error);
        appendMessage('bot', 'Désolé, je n\'arrive pas à me connecter au serveur API.');
    } finally {
        // 5. Rétablir le bouton Send
        sendButton.disabled = false;
        sendButton.innerText = 'Send';
        userInput.focus();
    }
}

// Ajout des écouteurs d'événements et INITIALISATION DE LA SESSION
document.addEventListener('DOMContentLoaded', () => {
    initializeSession(); // <-- Initialiser l'ID de session au chargement
    
    document.getElementById('send-btn').addEventListener('click', sendMessage);

    document.getElementById('user-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});
