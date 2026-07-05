// ===== AI CHAT WIDGET =====
// तलको URL लाई आफ्नो Render/Railway बाट पाएको backend URL ले बदल्नुहोस्
const CHAT_API_URL = "https://shastri-backend-chatbot.onrender.com/chat";

const sessionId = "session-" + Math.random().toString(36).slice(2);

function buildChatWidget() {
  const toggleBtn = document.createElement("button");
  toggleBtn.id = "chat-toggle-btn";
  toggleBtn.innerText = "💬";
  toggleBtn.setAttribute("aria-label", "AI सहायकसँग कुरा गर्नुहोस्");

  const panel = document.createElement("div");
  panel.id = "chat-panel";
  panel.innerHTML = `
    <div id="chat-header">
      <span>AI सहायक</span>
      <button id="chat-close" aria-label="बन्द गर्नुहोस्">✕</button>
    </div>
    <div id="chat-messages"></div>
    <div id="chat-input-row">
      <input id="chat-input" type="text" placeholder="सोध्नुहोस्..." />
      <button id="chat-send">पठाउनुहोस्</button>
    </div>
  `;

  document.body.appendChild(toggleBtn);
  document.body.appendChild(panel);

  toggleBtn.addEventListener("click", () => panel.classList.toggle("open"));
  panel.querySelector("#chat-close").addEventListener("click", () =>
    panel.classList.remove("open")
  );

  const messagesEl = panel.querySelector("#chat-messages");
  const inputEl = panel.querySelector("#chat-input");
  const sendBtn = panel.querySelector("#chat-send");

  function addMessage(text, sender) {
    const div = document.createElement("div");
    div.className = "chat-msg " + sender;
    div.innerText = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text) return;

    addMessage(text, "user");
    inputEl.value = "";
    sendBtn.disabled = true;

    try {
      const res = await fetch(CHAT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, session_id: sessionId }),
      });

      if (!res.ok) {
        throw new Error("Server error: " + res.status);
      }

      const data = await res.json();
      addMessage(data.reply || "माफ गर्नुहोस्, जवाफ आएन।", "bot");
    } catch (err) {
      addMessage("त्रुटि भयो, पछि फेरि प्रयास गर्नुहोस्।", "bot");
      console.error("[chat-widget]", err);
    } finally {
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  sendBtn.addEventListener("click", sendMessage);
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  addMessage("नमस्ते! म तपाईंको साहित्य संग्रहको AI सहायक हुँ। सोध्नुहोस्।", "bot");
}

window.addEventListener("load", buildChatWidget);
