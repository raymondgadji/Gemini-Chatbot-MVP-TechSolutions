// === ÉLÉMENTS DOM ===
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const sendIcon = document.getElementById('send-icon');
const spinner = document.getElementById('spinner');
const errorMessageDiv = document.getElementById('error-message');

// === CONFIGURATION ===
const API_URL = "https://max-chatbot-techsolutions-mvp.onrender.com/chat";  // TON URL RENDER
const SESSION_ID = "local_" + Date.now();

// Historique (user/model)
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

// === Fallback Réponses (basées sur context.py) ===
const getFallbackResponse = (message) => {
    const lower = message.toLowerCase();
    if (lower.includes('bonjour') || lower.includes('salut')) {
        return "Bonjour ! Ravi de vous rencontrer. En quoi puis-je vous aider avec les chatbots IA d'AI_Y aujourd'hui ?";
    }
    if (lower.includes('prix') || lower.includes('tarif')) {
        return "Nos tarifs : Installation 750€ HT une fois, puis 99,99€ HT/mois (5 000 messages inclus). Messages supp. : 0,005€.";
    }
    if (lower.includes('délai') || lower.includes('temps')) {
        return "Mise en œuvre en 72h ! Fournissez votre FAQ et c'est prêt.";
    }
    if (lower.includes('contact')) {
        return "Contactez-nous pour une démo gratuite : contact@ai-y.fr ou 'Démarrer un projet' sur le site.";
    }
    return "Je suis Yedi d'AI_Y. Posez-moi une question sur nos chatbots pour PME ! (API temporairement indisponible)";
};

// === APPEL À TON API FASTAPI ===
const sendToAPI = async (message, retryCount = 0) => {
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

        console.log(`API Response Status: ${response.status}`);  // Debug

        if (!response.ok) {
            if (response.status === 429 && retryCount < 2) {
                await new Promise(r => setTimeout(r, 2000 * (retryCount + 1)));
                return sendToAPI(message, retryCount + 1);
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        const botResponse = data.response;
        history.push({ role: "model", text: botResponse });
        return botResponse;

    } catch (err) {
        console.error("API Error Details:", err);
        if (retryCount < 2) {
            await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
            return sendToAPI(message, retryCount + 1);
        }
        return getFallbackResponse(message);  // Fallback si API down
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