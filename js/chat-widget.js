// ===== AI CHAT WIDGET (bottom nav मा जोडिएको) =====
const CHAT_API_URL = "https://shastri-backend-chatbot.onrender.com/chat";

const sessionId = "session-" + Math.random().toString(36).slice(2);

// यहाँ आफ्नो custom SVG icon राख्न चाहनुभयो भने index.html को
// #chat-nav-icon भित्र भएको <svg> लाई सिधै बदल्नुहोस् (JS ले होइन,
// यसले icon तुरुन्तै देखिन्छ, load हुँदा ढिलो हुँदैन)

function buildChatWidget() {
  const navBtn = document.getElementById("chat-nav-btn");
  if (!navBtn) return;

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
  document.body.appendChild(panel);

  function positionPanelAboveNav() {
    const rect = navBtn.getBoundingClientRect();
    const margin = 10;
    const panelWidth = panel.offsetWidth || 320;
    const panelHeight = panel.offsetHeight || 420;

    let left = rect.left + rect.width / 2 - panelWidth / 2;
    left = Math.min(Math.max(margin, left), window.innerWidth - panelWidth - margin);

    const top = rect.top - panelHeight - margin;

    panel.style.left = left + "px";
    panel.style.top = Math.max(margin, top) + "px";
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  }

  navBtn.addEventListener("click", () => {
    positionPanelAboveNav();
    panel.classList.toggle("open");
    document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
    if (panel.classList.contains("open")) navBtn.classList.add("active");
  });

  panel.querySelector("#chat-close").addEventListener("click", () => {
    panel.classList.remove("open");
    navBtn.classList.remove("active");
  });

  window.addEventListener("resize", () => {
    if (panel.classList.contains("open")) positionPanelAboveNav();
  });

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
