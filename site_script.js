// Logique pour afficher/masquer l'iframe du chatbot
const chatButtonExternal = document.getElementById('chat-button-external');
const chatbotIframe = document.getElementById('chatbot-iframe');
const openChatHero = document.getElementById('open-chat-hero');
const openChatCTA = document.getElementById('open-chat-cta');
let isChatOpen = false;

function toggleChat() {
    isChatOpen = !isChatOpen;
    if (isChatOpen) {
        chatbotIframe.style.opacity = '1';
        chatbotIframe.style.pointerEvents = 'auto';
        chatbotIframe.style.display = 'block';
        chatButtonExternal.style.display = 'none';
    } else {
        chatbotIframe.style.opacity = '0';
        chatbotIframe.style.pointerEvents = 'none';
        chatButtonExternal.style.display = 'flex';
        setTimeout(() => {
            if (!isChatOpen) {
                chatbotIframe.style.display = 'none';
            }
        }, 300);
    }
}

chatbotIframe.style.display = 'none';
chatbotIframe.style.opacity = '0';
chatbotIframe.style.pointerEvents = 'none';

chatButtonExternal.addEventListener('click', toggleChat);
if (openChatHero) openChatHero.addEventListener('click', (e) => { e.preventDefault(); if (!isChatOpen) toggleChat(); });
if (openChatCTA) openChatCTA.addEventListener('click', (e) => { e.preventDefault(); if (!isChatOpen) toggleChat(); });

window.addEventListener('message', (event) => {
    if (event.data === 'close-chatbot' && isChatOpen) {
        toggleChat();
    }
});

chatButtonExternal.style.display = 'flex';