// ===== AI CHAT WIDGET (Cloudflare Worker मार्फत, API key यहाँ छैन) =====
// API key यहाँ छैन — Cloudflare Worker मा secret को रूपमा राखिएको छ
const WORKER_URL = "https://purple-dust-f97e.amababa055.workers.dev/";

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

// कविता संग्रह सानो भएकाले (हाल १५ भन्दा कम) हरेक प्रश्नमा सबै कविताको
// पूरा content नै पठाइन्छ — यसले AI लाई पूर्ण access दिन्छ र कुनै प्रश्नमा
// keyword नमिलेर सही जवाफ नआउने समस्या हटाउँछ।
function buildPoetryBlock(poems) {
  if (!poems.length) return "(हाल कुनै कविता उपलब्ध छैन)";
  return poems
    .map(
      (p) =>
        `---\nशीर्षक: ${(p.title || "").trim()}\nट्याग: ${(p.tags || []).join(", ")}\n` +
        `पूरा कविता:\n${(p.content || "").trim()}\n`
    )
    .join("\n");
}

const BASE_PROMPT = `तपाईंको नाम 'प्रतीक AI' हो। तपाईं 'Pratik Sahitya Sangrah' नामक नेपाली साहित्य/कविता संग्रह वेबसाइटको सहायक हुनुहुन्छ। तपाईंलाई प्रतीक अधिकारीले बनाउनुभएको हो।

प्रतीक अधिकारीको बारेमा (कसैले 'प्रतीक अधिकारी को हो' भनेर सोधे यही जानकारीको आधारमा संक्षेपमा जवाफ दिनुहोस्, पूरै एकैचोटि नबकाई प्रश्न अनुसार सान्दर्भिक अंश मात्र दिनुहोस्):

शिक्षा:
- शास्त्री (Bachelor of Sanskrit), विशेषज्ञता: पाणिनीय व्याकरण र वैदिक साहित्य, हाल दोस्रो वर्षमा अध्ययनरत, पोखरा।

पेशा:
- संस्कृत शिक्षक, श्री दुर्गा वैदिक संस्कृत विद्याश्रम, पोखरा (हाल कार्यरत) — पाणिनीय सूत्र र तिनका व्यावहारिक भाषिक प्रयोग सिकाउने, वैदिक पाठ स्मरण/उच्चारण र शास्त्रीय ग्रन्थ व्याख्यामा विद्यार्थी मार्गदर्शन, परम्परागत व्याकरण विश्लेषण र वैदिक टीकामाथि अनुसन्धानमूलक सत्र सञ्चालन।

अनुसन्धान र अध्ययन क्षेत्र:
- पाणिनीय व्याकरण — अष्टाध्यायी सूत्र प्रणालीको गहन अध्ययन
- संस्कृत व्याकरणिक संरचना र सूत्र-व्युत्पत्तिको भाषिक/रूपिम विश्लेषण
- वैदिक र शास्त्रीय संस्कृतको तुलनात्मक अध्ययन (पाणिनीय ढाँचामार्फत)
- भारतीय दर्शन शास्त्रहरूको ज्ञानमीमांसीय अध्ययन
- संस्कृत काव्यशास्त्र, रस सिद्धान्त, र शास्त्रीय साहित्य परम्परा

सीप र रुचि:
- ग्राफिक डिजाइन, डिजिटल कन्टेन्ट निर्माण, आलोचनात्मक/विश्लेषणात्मक चिन्तन, संगीत र सांस्कृतिक कला

भाषा:
- नेपाली (मातृभाषा), संस्कृत (दक्ष), हिन्दी (आधारभूत), अंग्रेजी (आधारभूत), मैथिली (सामान्य कुराकानी)

यो जानकारी प्रत्यक्ष रूपमा सोधिएमा मात्र दिनुहोस्, अरू सामान्य कुराकानीमा आफैं नल्याउनुहोस्। कसैले इमेल सोधे मात्र यो दिनुहोस्: apratik055@gmail.com। फोन नम्बर कसैले सोधे पनि नदिनुहोस् — भन्नुहोस् कि फोन नम्बर यहाँ उपलब्ध छैन।

महत्वपूर्ण: तपाईं को हो/कसले बनायो भन्ने प्रश्न प्रत्यक्ष सोधिएमा मात्र भन्नुहोस् — 'म प्रतीक अधिकारीद्वारा बनाइएको AI हुँ।' अरू कुराकानीमा नदोहोर्याउनुहोस्। कहिल्यै आफूलाई Gemini/Google/अन्य कम्पनीको AI नभन्नुहोस्।

नेपाली भाषामा मैत्रीपूर्ण र संक्षिप्त जवाफ दिनुहोस्। अंग्रेजीमा सोधे अंग्रेजीमा जवाफ दिनुहोस्।`;

function buildSystemInstruction() {
  const poems = getPoems();
  const poemsIndex = buildPoemsIndex(poems);
  const poetryBlock = buildPoetryBlock(poems);

  return (
    `${BASE_PROMPT}\n\n` +
    `साइटमा भएका सबै कविताको शीर्षक/ट्याग सूची:\n${poemsIndex}\n\n` +
    "तलको section मा साइटमा भएका सबै कविताको पूरा text दिइएको छ। " +
    "कविता सुझाव माग्दा, व्याख्या गर्न भन्दा, वा उत्कृष्ट हरफ माग्दा, यही " +
    "वास्तविक डाटाबाट मात्र जवाफ दिनुहोस् — आफैं नयाँ हरफ नबनाउनुहोस्। " +
    "जवाफमा कविताको शीर्षक पनि भन्नुहोस्।\n\n" +
    `===== सबै कविता =====\n${poetryBlock}\n===== समाप्त =====`
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
    return div;
  }

  function showTyping() {
    const div = document.createElement("div");
    div.className = "chat-msg bot chat-typing";
    div.id = "chat-typing-indicator";
    div.innerHTML = `<span class="dot"></span><span class="dot"></span><span class="dot"></span>`;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function removeTyping() {
    const el = document.getElementById("chat-typing-indicator");
    if (el) el.remove();
  }

  // ===== FALLBACK (API quota सकिँदा वा network/error हुँदा प्रयोग हुने local जवाफ) =====
  const BIO_FALLBACK =
    "प्रतीक अधिकारी शास्त्री (संस्कृत) को विद्यार्थी हुनुहुन्छ, विशेषज्ञता पाणिनीय व्याकरण र वैदिक साहित्यमा। " +
    "हाल श्री दुर्गा वैदिक संस्कृत विद्याश्रम, पोखरामा संस्कृत शिक्षकको रूपमा कार्यरत हुनुहुन्छ। " +
    "उहाँको रुचि ग्राफिक डिजाइन, डिजिटल कन्टेन्ट निर्माण र संगीतमा पनि छ।";

  const GREETING_WORDS = ["नमस्ते", "नमस्कार", "hi", "hello", "hey", "namaste"];
  const BIO_WORDS = ["को हो", "प्रतीक", "who are you", "बारेमा", "परिचय"];
  const EMAIL_WORDS = ["इमेल", "email", "ईमेल", "मेल"];
  const PHONE_WORDS = ["फोन", "phone", "नम्बर", "सम्पर्क"];

  function containsAny(text, words) {
    const t = text.toLowerCase();
    return words.some((w) => t.includes(w.toLowerCase()));
  }

  // कविता डाटाबाट keyword मिलेर सबैभन्दा उत्तम मिल्ने कविता खोज्ने (quota सकिँदा प्रयोग हुने)
  function localPoemSearch(query) {
    const poems = getPoems();
    const words = Array.from(
      new Set((query.toLowerCase().match(/[\w\u0900-\u097F]+/g) || []))
    ).filter((w) => w.length > 1);
    if (!words.length || !poems.length) return null;

    const scored = poems
      .map((p) => {
        const haystack = [p.title || "", (p.tags || []).join(" "), p.content || ""]
          .join(" ")
          .toLowerCase();
        const score = words.reduce((acc, w) => acc + (haystack.includes(w) ? 1 : 0), 0);
        return { score, poem: p };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.length ? scored[0].poem : null;
  }

  function localFallbackReply(userText) {
    if (containsAny(userText, GREETING_WORDS)) {
      return "नमस्ते! म प्रतीक AI हुँ। अहिले पूर्ण क्षमतामा जवाफ दिन गाह्रो भए पनि, म साइटमा भएको जानकारीबाट सकेसम्म मद्दत गर्छु — के सोध्नुहुन्छ?";
    }
    if (containsAny(userText, EMAIL_WORDS)) {
      return "प्रतीक अधिकारीको इमेल: apratik055@gmail.com";
    }
    if (containsAny(userText, PHONE_WORDS)) {
      return "माफ गर्नुहोस्, फोन नम्बर यहाँ उपलब्ध छैन।";
    }
    if (containsAny(userText, BIO_WORDS)) {
      return BIO_FALLBACK;
    }

    const poem = localPoemSearch(userText);
    if (poem) {
      return `यो कविता तपाईंलाई मन पर्न सक्छ — "${(poem.title || "").trim()}":\n\n${(poem.content || "").trim()}`;
    }

    return (
      "माफ गर्नुहोस्, अहिले म राम्रोसँग बुझ्न सकिनँ। कृपया कविताको नाम, ट्याग, वा " +
      "प्रतीक अधिकारीको बारेमा सोझो प्रश्न सोध्नुहोस्, म साइटको जानकारीबाट जवाफ दिने प्रयास गर्छु।"
    );
  }

  function isQuotaOrUnavailableError(status, data) {
    const msg = JSON.stringify(data || "").toLowerCase();
    return (
      status === 429 ||
      status === 503 ||
      status === 0 ||
      msg.includes("quota") ||
      msg.includes("resource_exhausted") ||
      msg.includes("rate limit") ||
      msg.includes("leaked") ||
      msg.includes("permission_denied")
    );
  }

  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text) return;

    addMessage(text, "user");
    inputEl.value = "";
    sendBtn.disabled = true;
    showTyping();

    let usedFallback = false;

    try {
      const systemInstruction = buildSystemInstruction();

      const contents = [
        ...chatHistory,
        { role: "user", parts: [{ text }] },
      ];

      const res = await fetch(WORKER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        if (isQuotaOrUnavailableError(res.status, data)) {
          usedFallback = true;
          removeTyping();
          addMessage(localFallbackReply(text), "bot");
        } else {
          throw new Error(`Gemini error ${res.status}: ${JSON.stringify(data.error || data)}`);
        }
      } else {
        const replyText =
          data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ||
          "माफ गर्नुहोस्, जवाफ आएन।";

        removeTyping();
        addMessage(replyText, "bot");

        chatHistory.push({ role: "user", parts: [{ text }] });
        chatHistory.push({ role: "model", parts: [{ text: replyText }] });
        chatHistory = chatHistory.slice(-MAX_HISTORY_MESSAGES);
      }
    } catch (err) {
      // network error वा अन्य नमिल्ने अवस्थामा पनि local जवाफ नै दिने, कच्चा error होइन
      removeTyping();
      addMessage(localFallbackReply(text), "bot");
      console.error("[chat-widget] falling back locally:", err);
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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", buildChatWidget);
} else {
  buildChatWidget();
}
