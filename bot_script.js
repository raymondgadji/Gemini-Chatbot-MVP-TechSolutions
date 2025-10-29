// === ÉLÉMENTS DOM ===
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const sendIcon = document.getElementById('send-icon');
const spinner = document.getElementById('spinner');
const errorMessageDiv = document.getElementById('error-message');

// === CONFIGURATION ===
const API_URL = "https://max-chatbot-techsolutions-mvp.onrender.com"; // ← Remplace par ton URL
const SESSION_ID = "local_" + Date.now();

// Historique complet (user/model)
let history = [];

// === FONCTIONS UTILITAIRES ===
const formatTimestamp = () => {
    return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

const addMessage = (text, sender) => {
    const message = { text, sender, timestamp: new Date() };
    const isUser = sender === 'user';
    const containerClass = isUser ? 'user-message-container' : 'bot-message-container';
    const bubbleClass = isUser ? 'user-message-bubble' : 'bot-message-bubble';

    const html = `
        <div class="message-container ${containerClass}">
            <div class="${bubbleClass}">
                <p class="message-text">${escapeHtml(text)}</p>
                <p class="message-timestamp">${formatTimestamp()}</p>
            </div>
        </div>
    `;
    chatMessages.insertAdjacentHTML('beforeend', html);
    scrollToBottom();
};

const scrollToBottom = () => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
};

const displayError = (msg) => {
    errorMessageDiv.textContent = msg;
    errorMessageDiv.classList.remove('hidden');
    setTimeout(() => errorMessageDiv.classList.add('hidden'), 5000);
};

// === APPEL À TON API FASTAPI ===
const sendToAPI = async (message) => {
    // Ajouter au history
    history.push({ role: "user", text: message });

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: message,
                session_id: SESSION_ID,
                history: history
            })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        const botResponse = data.response;
        history.push({ role: "model", text: botResponse });
        return botResponse;

    } catch (err) {
        console.error("API Error:", err);
        return "Erreur de connexion. Veuillez réessayer.";
    }
};

// === ENVOI MESSAGE ===
const handleSend = async () => {
    const prompt = userInput.value.trim();
    if (!prompt) return;

    addMessage(prompt, 'user');
    userInput.value = '';

    sendButton.disabled = true;
    userInput.disabled = true;
    sendIcon.classList.add('hidden');
    spinner.classList.remove('hidden');

    const botResponse = await sendToAPI(prompt);
    addMessage(botResponse, 'bot');

    sendButton.disabled = false;
    userInput.disabled = false;
    sendIcon.classList.remove('hidden');
    spinner.classList.add('hidden');
    userInput.focus();
};

// === ÉVÉNEMENTS ===
sendButton.addEventListener('click', handleSend);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
});
userInput.addEventListener('input', () => {
    sendButton.disabled = !userInput.value.trim();
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
});

// === INIT ===
document.addEventListener('DOMContentLoaded', () => {
    addMessage("Bonjour ! Je suis Yedi, votre assistant IA. Comment puis-je vous aider aujourd'hui ?", 'bot');
    userInput.focus();
});