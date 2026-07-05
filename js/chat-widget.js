// ===== AI CHAT WIDGET =====
const CHAT_API_URL = "https://shastri-backend-chatbot.onrender.com/chat";

const sessionId = "session-" + Math.random().toString(36).slice(2);
const POSITION_KEY = "chatWidgetPosition";

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

  // ===== सुरुको स्थान (पहिले save भएको वा default bottom-right) =====
  function applyPosition(left, top) {
    const margin = 8;
    const maxLeft = window.innerWidth - toggleBtn.offsetWidth - margin;
    const maxTop = window.innerHeight - toggleBtn.offsetHeight - margin;
    left = Math.min(Math.max(margin, left), maxLeft);
    top = Math.min(Math.max(margin, top), maxTop);

    toggleBtn.style.left = left + "px";
    toggleBtn.style.top = top + "px";
    toggleBtn.style.right = "auto";
    toggleBtn.style.bottom = "auto";

    positionPanelNearButton(left, top);
    return { left, top };
  }

  function positionPanelNearButton(btnLeft, btnTop) {
    const panelWidth = panel.offsetWidth || 320;
    const panelHeight = panel.offsetHeight || 420;
    const margin = 10;

    // बटन दायाँ आधा भागमा छ भने panel लाई देब्रेतिर देखाउने, नत्र दायाँतिर
    const openLeft = btnLeft + toggleBtn.offsetWidth / 2 < window.innerWidth / 2;
    let panelLeft = openLeft ? btnLeft : btnLeft + toggleBtn.offsetWidth - panelWidth;
    panelLeft = Math.min(Math.max(margin, panelLeft), window.innerWidth - panelWidth - margin);

    // बटन तल्लो आधा भागमा छ भने panel माथितिर देखाउने, नत्र तलतिर
    const openAbove = btnTop + toggleBtn.offsetHeight / 2 > window.innerHeight / 2;
    let panelTop = openAbove ? btnTop - panelHeight - margin : btnTop + toggleBtn.offsetHeight + margin;
    panelTop = Math.min(Math.max(margin, panelTop), window.innerHeight - panelHeight - margin);

    panel.style.left = panelLeft + "px";
    panel.style.top = panelTop + "px";
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  }

  let savedPos = null;
  try {
    savedPos = JSON.parse(localStorage.getItem(POSITION_KEY));
  } catch (e) {}

  requestAnimationFrame(() => {
    if (savedPos && typeof savedPos.left === "number") {
      applyPosition(savedPos.left, savedPos.top);
    } else {
      applyPosition(
        window.innerWidth - toggleBtn.offsetWidth - 20,
        window.innerHeight - toggleBtn.offsetHeight - 20
      );
    }
  });

  // ===== Drag गर्ने functionality (mouse + touch) =====
  let dragging = false;
  let moved = false;
  let startX, startY, startLeft, startTop;

  function onDragStart(clientX, clientY) {
    dragging = true;
    moved = false;
    toggleBtn.classList.add("dragging");
    startX = clientX;
    startY = clientY;
    const rect = toggleBtn.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
  }

  function onDragMove(clientX, clientY) {
    if (!dragging) return;
    const dx = clientX - startX;
    const dy = clientY - startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
    applyPosition(startLeft + dx, startTop + dy);
  }

  function onDragEnd() {
    if (!dragging) return;
    dragging = false;
    toggleBtn.classList.remove("dragging");
    const rect = toggleBtn.getBoundingClientRect();
    const finalPos = applyPosition(rect.left, rect.top);
    try {
      localStorage.setItem(POSITION_KEY, JSON.stringify(finalPos));
    } catch (e) {}
  }

  toggleBtn.addEventListener("pointerdown", (e) => {
    toggleBtn.setPointerCapture(e.pointerId);
    onDragStart(e.clientX, e.clientY);
  });
  toggleBtn.addEventListener("pointermove", (e) => {
    onDragMove(e.clientX, e.clientY);
  });
  toggleBtn.addEventListener("pointerup", () => {
    onDragEnd();
  });
  toggleBtn.addEventListener("pointercancel", () => {
    onDragEnd();
  });

  window.addEventListener("resize", () => {
    const rect = toggleBtn.getBoundingClientRect();
    applyPosition(rect.left, rect.top);
  });

  toggleBtn.addEventListener("click", () => {
    if (moved) {
      moved = false;
      return; // तानिसकेपछिको click ले panel नखोलोस्
    }
    const rect = toggleBtn.getBoundingClientRect();
    positionPanelNearButton(rect.left, rect.top);
    panel.classList.toggle("open");
  });

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
