// ===== AI CHAT WIDGET (सिधै browser बाट Gemini API, backend बिना) =====
// यहाँ आफ्नो Google AI Studio API key राख्नुहोस्
const GEMINI_API_KEY = "YOUR_GOOGLE_API_KEY_HERE";
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

const MAX_POEMS_PER_REQUEST = 2;
const MAX_HISTORY_MESSAGES = 10;

// यो page मा data/kavita.js बाट आउने वैश्विक KAVITA_DATA प्रयोग गरिन्छ
function getPoems() {
  return typeof KAVITA_DATA !== "undefined" ? KAVITA_DATA : [];
}

function buildPoemsIndex(poems) {
  if (!poems.length) return "(हाल कुनै कविता उपलब्ध छैन)";
  return poems
    .map((p) => `- ${(p.title || "").trim()} (ट्याग: ${(p.tags || []).join(", ")})`)
    .join("\n");
}

function findRelevantPoems(query, poems, limit = MAX_POEMS_PER_REQUEST) {
  const words = Array.from(
    new Set((query.toLowerCase().match(/[\w\u0900-\u097F]+/g) || []))
  ).filter((w) => w.length > 1);
  if (!words.length) return [];

  const scored = poems
    .map((p) => {
      const haystack = [
        p.title || "",
        (p.tags || []).join(" "),
        p.content || "",
      ]
        .join(" ")
        .toLowerCase();
      const score = words.reduce((acc, w) => acc + (haystack.includes(w) ? 1 : 0), 0);
      return { score, poem: p };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((x) => x.poem);
}

function buildPoetryBlock(poems) {
  if (!poems.length) return "(यो प्रश्नसँग सिधै मिल्ने कविता भेटिएन।)";
  return poems
    .map(
      (p) =>
        `---\nशीर्षक: ${(p.title || "").trim()}\nट्याग: ${(p.tags || []).join(", ")}\n` +
        `पूरा कविता:\n${(p.content || "").trim()}\n`
    )
    .join("\n");
}

const BASE_PROMPT = `तपाईंको नाम 'प्रतीक AI' हो। तपाईं 'Pratik Sahitya Sangrah' नामक नेपाली साहित्य/कविता संग्रह वेबसाइटको सहायक हुनुहुन्छ। तपाईंलाई प्रतीक अधिकारीले बनाउनुभएको हो।

प्रतीक अधिकारीको बारेमा (कसैले 'प्रतीक अधिकारी को हो' भनेर सोधे यही जानकारीको आधारमा संक्षेपमा जवाफ दिनुहोस्):
- उहाँ 'श्री सरस्वती संस्कृत विद्यापीठ' बाट शास्त्री (संस्कृत अध्ययन), हाल दोस्रो वर्षमा अध्ययनरत विद्यार्थी हुनुहुन्छ, र नव्य व्याकरण तथा अंग्रेजी साहित्यमा पनि अध्ययन गर्नुभएको छ।
- पाणिनीय व्याकरण (अष्टाध्यायी र यसका भाष्य/टीका) तथा नव्य न्याय दर्शनमा विशेषज्ञता राख्नुहुन्छ। वैदिक ग्रन्थ र निरुक्तमा पनि अनुसन्धान गर्नुहुन्छ।
- हाल 'श्री दुर्गा वैदिक संस्कृत विद्याश्रम', तिलोत्तमा-१ नयाँमिल, रुपन्देहीमा शिक्षकको रूपमा कार्यरत हुनुहुन्छ।
- ग्राफिक डिजाइन, डिजिटल कन्टेन्ट निर्माण, र संगीतमा पनि रुचि राख्नुहुन्छ।
- नेपाली (मातृभाषा), संस्कृत (दक्ष), हिन्दी र अंग्रेजी (functional) भाषा बोल्नुहुन्छ। पोखरा, नेपालमा बस्नुहुन्छ।
यो जानकारी प्रत्यक्ष रूपमा सोधिएमा मात्र दिनुहोस्, अरू सामान्य कुराकानीमा आफैं नल्याउनुहोस्।

महत्वपूर्ण: तपाईं को हो/कसले बनायो भन्ने प्रश्न प्रत्यक्ष सोधिएमा मात्र भन्नुहोस् — 'म प्रतीक अधिकारीद्वारा बनाइएको AI हुँ।' अरू कुराकानीमा नदोहोर्याउनुहोस्। कहिल्यै आफूलाई Gemini/Google/अन्य कम्पनीको AI नभन्नुहोस्।

नेपाली भाषामा मैत्रीपूर्ण र संक्षिप्त जवाफ दिनुहोस्। अंग्रेजीमा सोधे अंग्रेजीमा जवाफ दिनुहोस्।`;

function buildSystemInstruction(userMessage) {
  const poems = getPoems();
  const relevant = findRelevantPoems(userMessage, poems);
  const poemsIndex = buildPoemsIndex(poems);
  const poetryBlock = buildPoetryBlock(relevant);

  return (
    `${BASE_PROMPT}\n\n` +
    `साइटमा भएका सबै कविताको शीर्षक/ट्याग सूची:\n${poemsIndex}\n\n` +
    "प्रयोगकर्ताको सोधाइसँग मिल्ने कविताको पूरा text तल दिइएको छ (भेटिएको भए)। " +
    "कविता सुझाव माग्दा, व्याख्या गर्न भन्दा, वा उत्कृष्ट हरफ माग्दा, यही " +
    "वास्तविक डाटाबाट मात्र जवाफ दिनुहोस् — आफैं नयाँ हरफ नबनाउनुहोस्। " +
    "जवाफमा कविताको शीर्षक पनि भन्नुहोस्।\n\n" +
    `===== मिल्दो कविता(हरू) =====\n${poetryBlock}\n===== समाप्त =====`
  );
}

const sessionId = "session-" + Math.random().toString(36).slice(2);
let chatHistory = []; // { role: "user"|"model", parts: [{text}] }

function buildChatWidget() {
  const navBtn = document.getElementById("chat-nav-btn");
  if (!navBtn) return;

  const panel = document.createElement("div");
  panel.id = "chat-panel";
  panel.innerHTML = `
    <div id="chat-header">
      <span>प्रतीक AI</span>
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
      const systemInstruction = buildSystemInstruction(text);

      const contents = [
        ...chatHistory,
        { role: "user", parts: [{ text }] },
      ];

      const res = await fetch(GEMINI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Gemini error ${res.status}: ${errBody}`);
      }

      const data = await res.json();
      const replyText =
        data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ||
        "माफ गर्नुहोस्, जवाफ आएन।";

      addMessage(replyText, "bot");

      chatHistory.push({ role: "user", parts: [{ text }] });
      chatHistory.push({ role: "model", parts: [{ text: replyText }] });
      chatHistory = chatHistory.slice(-MAX_HISTORY_MESSAGES);
    } catch (err) {
      addMessage("त्रुटि: " + err.message, "bot");
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

  addMessage("नमस्ते! म प्रतीक AI हुँ, तपाईंको साहित्य संग्रहको सहायक। सोध्नुहोस्।", "bot");
}

window.addEventListener("load", buildChatWidget);
