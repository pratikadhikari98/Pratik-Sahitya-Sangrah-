// ===== AI CHAT WIDGET =====
const CHAT_API_URL = "https://shastri-backend-chatbot.onrender.com/chat";

const sessionId = "session-" + Math.random().toString(36).slice(2);
const POSITION_KEY = "chatWidgetCorner"; // 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
const CORNER_MARGIN = 20;

// यहाँ आफ्नो custom SVG icon (chat bubble) राख्न सकिन्छ — यो <svg>...</svg> replace गर्नुहोस्
const CHAT_ICON_SVG = `
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path opacity="0.4" d="M16.1898 2H7.81976C4.17976 2 2.00977 4.17 2.00977 7.81V16.18C2.00977 19.82 4.17976 21.99 7.81976 21.99H16.1898C19.8298 21.99 21.9998 19.82 21.9998 16.18V7.81C21.9998 4.17 19.8298 2 16.1898 2Z" fill="currentColor"/>
<path d="M11.4991 8.09V17.25C11.4991 17.61 11.1391 17.85 10.8091 17.71C9.59914 17.19 8.01913 16.71 6.91913 16.57L6.72913 16.55C6.11913 16.47 5.61914 15.9 5.61914 15.28V7.57999C5.61914 6.81999 6.23915 6.25 6.99915 6.31C8.24915 6.41 10.0992 7.01001 11.2592 7.67001C11.4092 7.74001 11.4991 7.91 11.4991 8.09Z" fill="currentColor"/>
<path d="M18.38 7.69983V15.2698C18.38 15.8898 17.88 16.4598 17.27 16.5398L17.06 16.5598C15.97 16.7098 14.4 17.1798 13.19 17.6898C12.86 17.8298 12.5 17.5898 12.5 17.2298V8.0798C12.5 7.8998 12.59 7.72983 12.75 7.63983C13.91 6.98983 15.72 6.4098 16.95 6.2998H16.99C17.76 6.3098 18.38 6.92983 18.38 7.69983Z" fill="currentColor"/>
</svg>`;

function buildChatWidget() {
  const toggleBtn = document.createElement("button");
  toggleBtn.id = "chat-toggle-btn";
  toggleBtn.innerHTML = CHAT_ICON_SVG;
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

  // ===== कुनाहरूको coordinate निकाल्ने =====
  function getCornerPosition(corner) {
    const btnW = toggleBtn.offsetWidth || 56;
    const btnH = toggleBtn.offsetHeight || 56;
    const positions = {
      "top-left": { left: CORNER_MARGIN, top: CORNER_MARGIN },
      "top-right": { left: window.innerWidth - btnW - CORNER_MARGIN, top: CORNER_MARGIN },
      "bottom-left": { left: CORNER_MARGIN, top: window.innerHeight - btnH - CORNER_MARGIN },
      "bottom-right": { left: window.innerWidth - btnW - CORNER_MARGIN, top: window.innerHeight - btnH - CORNER_MARGIN },
    };
    return positions[corner] || positions["bottom-right"];
  }

  function nearestCorner(left, top) {
    const btnW = toggleBtn.offsetWidth || 56;
    const btnH = toggleBtn.offsetHeight || 56;
    const centerX = left + btnW / 2;
    const centerY = top + btnH / 2;
    const isLeft = centerX < window.innerWidth / 2;
    const isTop = centerY < window.innerHeight / 2;
    if (isTop && isLeft) return "top-left";
    if (isTop && !isLeft) return "top-right";
    if (!isTop && isLeft) return "bottom-left";
    return "bottom-right";
  }

  function setButtonPosition(left, top) {
    toggleBtn.style.left = left + "px";
    toggleBtn.style.top = top + "px";
    toggleBtn.style.right = "auto";
    toggleBtn.style.bottom = "auto";
  }

  function moveToCorner(corner, animate) {
    const pos = getCornerPosition(corner);
    if (animate) {
      toggleBtn.style.transition = "left 0.25s ease, top 0.25s ease";
      setTimeout(() => (toggleBtn.style.transition = ""), 260);
    }
    setButtonPosition(pos.left, pos.top);
    positionPanelNearButton(pos.left, pos.top, corner);
    try {
      localStorage.setItem(POSITION_KEY, corner);
    } catch (e) {}
  }

  function positionPanelNearButton(btnLeft, btnTop, corner) {
    const panelWidth = panel.offsetWidth || 320;
    const panelHeight = panel.offsetHeight || 420;
    const margin = 10;

    const isLeftCorner = corner.includes("left");
    const isTopCorner = corner.includes("top");

    let panelLeft = isLeftCorner ? btnLeft : btnLeft + toggleBtn.offsetWidth - panelWidth;
    panelLeft = Math.min(Math.max(margin, panelLeft), window.innerWidth - panelWidth - margin);

    let panelTop = isTopCorner
      ? btnTop + toggleBtn.offsetHeight + margin
      : btnTop - panelHeight - margin;
    panelTop = Math.min(Math.max(margin, panelTop), window.innerHeight - panelHeight - margin);

    panel.style.left = panelLeft + "px";
    panel.style.top = panelTop + "px";
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  }

  let currentCorner = "bottom-right";
  try {
    const saved = localStorage.getItem(POSITION_KEY);
    if (saved) currentCorner = saved;
  } catch (e) {}

  requestAnimationFrame(() => moveToCorner(currentCorner, false));

  // ===== Drag गर्ने functionality (मात्र चारै कुनामा snap हुने) =====
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
    setButtonPosition(startLeft + dx, startTop + dy);
  }

  function onDragEnd() {
    if (!dragging) return;
    dragging = false;
    toggleBtn.classList.remove("dragging");
    const rect = toggleBtn.getBoundingClientRect();
    currentCorner = nearestCorner(rect.left, rect.top);
    moveToCorner(currentCorner, true);
  }

  toggleBtn.addEventListener("pointerdown", (e) => {
    toggleBtn.setPointerCapture(e.pointerId);
    onDragStart(e.clientX, e.clientY);
  });
  toggleBtn.addEventListener("pointermove", (e) => {
    onDragMove(e.clientX, e.clientY);
  });
  toggleBtn.addEventListener("pointerup", onDragEnd);
  toggleBtn.addEventListener("pointercancel", onDragEnd);

  window.addEventListener("resize", () => moveToCorner(currentCorner, false));

  toggleBtn.addEventListener("click", () => {
    if (moved) {
      moved = false;
      return; // तानिसकेपछिको click ले panel नखोलोस्
    }
    const rect = toggleBtn.getBoundingClientRect();
    positionPanelNearButton(rect.left, rect.top, currentCorner);
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
