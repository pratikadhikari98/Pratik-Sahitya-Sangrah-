// ===== AI CHAT WIDGET (bottom nav मा जोडिएको) =====
const CHAT_API_URL = "https://shastri-backend-chatbot.onrender.com/chat";

const sessionId = "session-" + Math.random().toString(36).slice(2);

// यहाँ आफ्नो custom SVG icon राख्न सकिन्छ
const CHAT_ICON_SVG = `
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path opacity="0.4" d="M16.1898 2H7.81976C4.17976 2 2.00977 4.17 2.00977 7.81V16.18C2.00977 19.82 4.17976 21.99 7.81976 21.99H16.1898C19.8298 21.99 21.9998 19.82 21.9998 16.18V7.81C21.9998 4.17 19.8298 2 16.1898 2Z" fill="currentColor"/>
<path d="M11.4991 8.09V17.25C11.4991 17.61 11.1391 17.85 10.8091 17.71C9.59914 17.19 8.01913 16.71 6.91913 16.57L6.72913 16.55C6.11913 16.47 5.61914 15.9 5.61914 15.28V7.57999C5.61914 6.81999 6.23915 6.25 6.99915 6.31C8.24915 6.41 10.0992 7.01001 11.2592 7.67001C11.4092 7.74001 11.4991 7.91 11.4991 8.09Z" fill="currentColor"/>
<path d="M18.38 7.69983V15.2698C18.38 15.8898 17.88 16.4598 17.27 16.5398L17.06 16.5598C15.97 16.7098 14.4 17.1798 13.19 17.6898C12.86 17.8298 12.5 17.5898 12.5 17.2298V8.0798C12.5 7.8998 12.59 7.72983 12.75 7.63983C13.91 6.98983 15.72 6.4098 16.95 6.2998H16.99C17.76 6.3098 18.38 6.92983 18.38 7.69983Z" fill="currentColor"/>
</svg>`;

function buildChatWidget() {
  const navBtn = document.getElementById("chat-nav-btn");
  const navIcon = document.getElementById("chat-nav-icon");
  if (!navBtn || !navIcon) return;

  navIcon.innerHTML = CHAT_ICON_SVG;

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
