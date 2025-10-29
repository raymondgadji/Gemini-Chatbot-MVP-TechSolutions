// === ÉLÉMENTS DOM ===
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const sendIcon = document.getElementById('send-icon');
const spinner = document.getElementById('spinner');
const errorMessageDiv = document.getElementById('error-message');

// === CONFIGURATION ===
const API_URL = "https://max-chatbot-techsolutions-mvp.onrender.com/chat";
const SESSION_ID = "local_" + Date.now();

let history = [];

// === FONCTIONS UTILITAIRES ===
const formatTimestamp = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

const addMessage = (text, sender) => {
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
    chatMessages.scrollTop = chatMessages.scrollHeight;
};

// === APPEL API ===
const sendToAPI = async (message, retries = 0) => {
    history.push({ role: "user", text: message });

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, session_id: SESSION_ID, history })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        const botResponse = data.response;
        history.push({ role: "model", text: botResponse });
        return botResponse;

    } catch (err) {
        console.error("API Error:", err);
        if (retries < 2) {
            await new Promise(r => setTimeout(r, 1500 * (retries + 1)));
            return sendToAPI(message, retries + 1);
        }
        return "Désolé, je rencontre un problème de connexion. Réessayez dans un instant.";
    }
};

// === ENVOI ===
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
userInput.addEventListener('keypress', e => {
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