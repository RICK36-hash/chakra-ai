// ===== STATE & SETTINGS =====
let conversations = {};
let activeConversationId = null;
let isGenerating = false;
let currentController = null; // For aborting fetches
let settings = {
  theme: "ratri",
  accent: "sahasrara",
  bg: "mandala",
  font: "inter",
  model: "auto",
  temp: 0.7,
  persona: "default",
  enterToSend: true,
  intro: "session",
  reducedMotion: false,
  sound: false,
};

// Has intro run this session?
let introRunSession = sessionStorage.getItem("chakra_intro_run");

// ===== DOM ELEMENTS =====
const elements = {
  html: document.documentElement,
  body: document.body,
  app: document.getElementById("app"),
  introScreen: document.getElementById("introScreen"),
  introWrapper: document.getElementById("introChakraWrapper"),
  introText: document.getElementById("introText"),
  enterBtn: document.getElementById("enterBtn"),
  skipBtn: document.getElementById("skipIntroBtn"),
  
  sidebar: document.getElementById("sidebar"),
  sidebarToggle: document.getElementById("sidebarToggle"),
  closeSidebar: document.getElementById("closeSidebarMobile"),
  newChatBtn: document.getElementById("newChatBtn"),
  mobileNewChatBtn: document.getElementById("mobileNewChatBtn"),
  conversationList: document.getElementById("conversationList"),
  clearAllBtn: document.getElementById("clearAllBtn"),
  searchChats: document.getElementById("chatSearch"),
  
  chatMessages: document.getElementById("chatMessages"),
  welcomeScreen: document.getElementById("welcomeScreen"),
  messageInput: document.getElementById("messageInput"),
  sendBtn: document.getElementById("sendBtn"),
  micBtn: document.getElementById("micBtn"),
  scrollToBottomBtn: document.getElementById("scrollToBottomBtn"),
  
  settingsModal: document.getElementById("settingsModal"),
  openSettingsBtn: document.getElementById("openSettingsBtn"),
  closeSettingsBtn: document.getElementById("closeSettingsBtn"),
  exportChatsBtn: document.getElementById("exportChatsBtn"),
  
  cmdPalette: document.getElementById("cmdPalette"),
  cmdInput: document.getElementById("cmdInput"),
  cmdResults: document.getElementById("cmdResults"),
  
  toastContainer: document.getElementById("toastContainer"),
};

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", () => {
  loadSettings();
  applySettings();
  loadConversations();
  cleanupEmptyConversations();
  
  const keys = Object.keys(conversations);
  if (keys.length > 0) activeConversationId = keys[keys.length - 1];

  renderConversationList();
  renderChat();
  setupEventListeners();
  configureMarked();
  handleIntroSequence();
});

// ===== SETTINGS MANAGEMENT =====
function loadSettings() {
  try {
    const saved = localStorage.getItem("chakra_settings");
    if (saved) settings = { ...settings, ...JSON.parse(saved) };
  } catch (e) { console.warn("Failed to load settings"); }
  
  // Sync UI to loaded settings
  document.getElementById("setting-theme").value = settings.theme;
  document.getElementById("setting-bg").value = settings.bg;
  document.getElementById("setting-font").value = settings.font;
  document.getElementById("setting-model").value = settings.model;
  document.getElementById("setting-temp").value = settings.temp;
  document.getElementById("tempValue").textContent = settings.temp;
  document.getElementById("setting-persona").value = settings.persona;
  document.getElementById("setting-enter").checked = settings.enterToSend;
  document.getElementById("setting-intro").value = settings.intro;
  document.getElementById("setting-reduced-motion").checked = settings.reducedMotion;
  document.getElementById("setting-sound").checked = settings.sound;
  
  document.querySelectorAll(".accent-swatch").forEach(swatch => {
    swatch.classList.toggle("active", swatch.dataset.acc === settings.accent);
  });
}

function saveSettings() {
  localStorage.setItem("chakra_settings", JSON.stringify(settings));
  applySettings();
}

function applySettings() {
  elements.html.dataset.theme = settings.theme;
  elements.html.dataset.accent = settings.accent;
  elements.html.dataset.font = settings.font;
  
  elements.body.className = `bg-${settings.bg}`;
}

// ===== INTRO SEQUENCE =====
function handleIntroSequence() {
  const shouldRun = settings.intro === "always" || (settings.intro === "session" && !introRunSession);
  
  if (!shouldRun || settings.reducedMotion) {
    elements.introScreen.classList.add("hidden");
    elements.app.classList.remove("hidden");
    elements.app.classList.add("visible");
    return;
  }
  
  // Start Intro
  elements.introScreen.classList.remove("hidden");
  setTimeout(() => {
    elements.introScreen.classList.add("intro-animating");
    setTimeout(() => elements.introScreen.classList.add("intro-idle"), 2000);
  }, 100);

  elements.enterBtn.onclick = () => runEnterAnimation();
  elements.skipBtn.onclick = () => skipIntro();
  
  // Space or Enter
  const handleKey = (e) => {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault(); document.removeEventListener("keydown", handleKey); runEnterAnimation();
    }
  };
  document.addEventListener("keydown", handleKey);
}

function runEnterAnimation() {
  sessionStorage.setItem("chakra_intro_run", "true");
  if (settings.sound) playSingingBowl();
  
  elements.introScreen.classList.remove("intro-idle");
  elements.introScreen.classList.add("intro-enter");
  
  elements.introText.querySelector("h1").textContent = "नमस्ते";
  elements.introText.querySelector("p").textContent = "Namaste";
  
  setTimeout(() => {
    elements.introWrapper.classList.add("intro-zoom");
    elements.app.classList.remove("hidden");
    // Crossfade
    setTimeout(() => {
      elements.app.classList.add("visible");
      elements.introScreen.style.opacity = 0;
      setTimeout(() => elements.introScreen.classList.add("hidden"), 800);
    }, 400);
  }, 1400);
}

function skipIntro() {
  sessionStorage.setItem("chakra_intro_run", "true");
  elements.introScreen.style.opacity = 0;
  elements.app.classList.remove("hidden");
  elements.app.classList.add("visible");
  setTimeout(() => elements.introScreen.classList.add("hidden"), 800);
}

// Basic Web Audio Sine wave for Singing Bowl
function playSingingBowl() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(349.23, ctx.currentTime); // F4 (Heart chakra frequency approx)
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 1);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 4);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 4);
  } catch (e) { console.warn("Audio not supported"); }
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
  // Input & Send
  elements.messageInput.addEventListener("input", autoResizeTextarea);
  elements.messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      if (settings.enterToSend && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      } else if (!settings.enterToSend && e.ctrlKey) {
        e.preventDefault();
        handleSendMessage();
      }
    }
  });
  elements.sendBtn.addEventListener("click", () => {
    if (isGenerating) stopGeneration(); else handleSendMessage();
  });

  // Sidebar toggles
  elements.sidebarToggle.addEventListener("click", () => elements.sidebar.classList.add("open"));
  elements.closeSidebar.addEventListener("click", () => elements.sidebar.classList.remove("open"));
  
  // New Chat
  const startNew = () => { createNewConversation(); elements.sidebar.classList.remove("open"); };
  elements.newChatBtn.addEventListener("click", startNew);
  elements.mobileNewChatBtn.addEventListener("click", startNew);

  // Search
  elements.searchChats.addEventListener("input", renderConversationList);

  // Settings Modal
  elements.openSettingsBtn.addEventListener("click", () => {
    elements.settingsModal.classList.remove("hidden");
    elements.sidebar.classList.remove("open");
  });
  elements.closeSettingsBtn.addEventListener("click", () => elements.settingsModal.classList.add("hidden"));
  elements.settingsModal.addEventListener("click", (e) => { if(e.target === elements.settingsModal) elements.settingsModal.classList.add("hidden"); });

  // Settings inputs
  document.getElementById("setting-theme").addEventListener("change", (e) => { settings.theme = e.target.value; saveSettings(); });
  document.getElementById("setting-bg").addEventListener("change", (e) => { settings.bg = e.target.value; saveSettings(); });
  document.getElementById("setting-font").addEventListener("change", (e) => { settings.font = e.target.value; saveSettings(); });
  document.getElementById("setting-model").addEventListener("change", (e) => { settings.model = e.target.value; saveSettings(); });
  document.getElementById("setting-persona").addEventListener("change", (e) => { settings.persona = e.target.value; saveSettings(); });
  document.getElementById("setting-temp").addEventListener("input", (e) => { settings.temp = e.target.value; document.getElementById("tempValue").textContent = e.target.value; saveSettings(); });
  document.getElementById("setting-enter").addEventListener("change", (e) => { settings.enterToSend = e.target.checked; saveSettings(); });
  document.getElementById("setting-intro").addEventListener("change", (e) => { settings.intro = e.target.value; saveSettings(); });
  document.getElementById("setting-reduced-motion").addEventListener("change", (e) => { settings.reducedMotion = e.target.checked; saveSettings(); });
  document.getElementById("setting-sound").addEventListener("change", (e) => { settings.sound = e.target.checked; saveSettings(); });

  document.querySelectorAll(".accent-swatch").forEach(swatch => {
    swatch.addEventListener("click", () => {
      document.querySelectorAll(".accent-swatch").forEach(s => s.classList.remove("active"));
      swatch.classList.add("active");
      settings.accent = swatch.dataset.acc;
      saveSettings();
    });
  });

  // Clear / Export
  elements.clearAllBtn.addEventListener("click", () => {
    if (confirm("Delete all conversations?")) { conversations = {}; activeConversationId = null; saveConversations(); renderConversationList(); renderChat(); }
  });
  elements.exportChatsBtn.addEventListener("click", exportChats);

  // Suggestion Cards
  document.querySelectorAll(".suggestion-card").forEach(card => {
    card.addEventListener("click", () => {
      elements.messageInput.value = card.dataset.prompt;
      elements.messageInput.style.height = 'auto';
      elements.sendBtn.disabled = false;
      handleSendMessage();
    });
  });

  // Voice Input
  elements.micBtn.addEventListener("click", handleVoiceInput);

  // Command Palette
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      toggleCmdPalette();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "n") {
      e.preventDefault(); startNew();
    }
    if (e.key === "Escape") {
      elements.cmdPalette.classList.add("hidden");
      elements.settingsModal.classList.add("hidden");
    }
  });

  elements.cmdInput.addEventListener("input", renderCmdResults);
  elements.cmdPalette.addEventListener("click", (e) => { if(e.target === elements.cmdPalette) elements.cmdPalette.classList.add("hidden"); });
  
  // Scroll to bottom tracking
  elements.chatMessages.addEventListener("scroll", () => {
    const isAtBottom = elements.chatMessages.scrollHeight - elements.chatMessages.scrollTop <= elements.chatMessages.clientHeight + 50;
    elements.scrollToBottomBtn.classList.toggle("hidden", isAtBottom);
  });
  elements.scrollToBottomBtn.addEventListener("click", scrollToBottom);
}

// ===== LOCAL STORAGE & CONVERSATIONS =====
function saveConversations() { localStorage.setItem("chakra_conversations", JSON.stringify(conversations)); }
function loadConversations() {
  try {
    const stored = localStorage.getItem("chakra_conversations");
    if (stored) conversations = JSON.parse(stored);
  } catch { conversations = {}; }
}

function generateId() { return Date.now().toString(36) + Math.random().toString(36).substring(2, 8); }

function cleanupEmptyConversations() {
  let modified = false;
  for (const id in conversations) {
    if (conversations[id].messages.length === 0) {
      delete conversations[id]; modified = true;
    }
  }
  if (modified) {
    saveConversations();
    if (activeConversationId && !conversations[activeConversationId]) activeConversationId = null;
  }
}

function createNewConversation() {
  cleanupEmptyConversations();
  activeConversationId = null;
  renderConversationList();
  renderChat();
  elements.messageInput.focus();
}

function switchConversation(id) {
  cleanupEmptyConversations();
  activeConversationId = id;
  renderConversationList();
  renderChat();
  elements.sidebar.classList.remove("open");
}

function deleteConversation(id, e) {
  e.stopPropagation();
  delete conversations[id];
  if (activeConversationId === id) {
    const keys = Object.keys(conversations);
    activeConversationId = keys.length > 0 ? keys[keys.length - 1] : null;
  }
  saveConversations();
  renderConversationList();
  renderChat();
}

// ===== RENDERING =====
function renderConversationList() {
  elements.conversationList.innerHTML = "";
  const query = elements.searchChats.value.toLowerCase();
  
  // We can group by "Today", "Previous", etc., but keeping it simple for now: sorted newest first
  const ids = Object.keys(conversations).reverse();
  const filtered = ids.filter(id => conversations[id].title.toLowerCase().includes(query));

  if (filtered.length === 0) {
    elements.conversationList.innerHTML = `<div class="group-label">No chats found</div>`;
    return;
  }

  filtered.forEach((id) => {
    const conv = conversations[id];
    const item = document.createElement("div");
    item.className = `chat-item${id === activeConversationId ? " active" : ""}`;
    item.onclick = () => switchConversation(id);
    item.innerHTML = `
      <span class="chat-title">${escapeHtml(conv.title)}</span>
      <div class="chat-actions">
        <button class="action-icon danger delete-btn" title="Delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    `;
    item.querySelector(".delete-btn").onclick = (e) => deleteConversation(id, e);
    elements.conversationList.appendChild(item);
  });
}

function renderChat() {
  const existingMessages = elements.chatMessages.querySelectorAll(".message-row");
  existingMessages.forEach(el => el.remove());

  const conv = activeConversationId ? conversations[activeConversationId] : null;

  if (!conv || conv.messages.length === 0) {
    elements.welcomeScreen.style.display = "flex";
    updateGreeting();
  } else {
    elements.welcomeScreen.style.display = "none";
    conv.messages.forEach(msg => appendMessageToDOM(msg.role === "user" ? "user" : "bot", msg.parts[0].text, false));
  }
  scrollToBottom();
}

function updateGreeting() {
  const hour = new Date().getHours();
  let text = "Welcome to CHAKRA AI";
  let sub = "Powered by Google Gemini. Ask me anything.";
  if (hour < 12) text = "Suprabhat (Good Morning)";
  else if (hour < 17) text = "Namaste (Good Afternoon)";
  else if (hour < 21) text = "Shubh Sandhya (Good Evening)";
  else text = "Shubh Ratri (Good Night)";
  
  document.getElementById("greetingText").textContent = text;
}

function appendMessageToDOM(role, text, animate = true) {
  elements.welcomeScreen.style.display = "none";

  const row = document.createElement("div");
  row.className = `message-row ${role}`;
  if (!animate) row.style.animation = "none";

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  if (role === "user") avatar.textContent = "👤";
  else avatar.innerHTML = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="6"/><path d="M50 5 L50 95 M5 50 L95 50 M18 18 L82 82 M18 82 L82 18" stroke="currentColor" stroke-width="4"/><circle cx="50" cy="50" r="8" fill="currentColor"/></svg>`;

  const content = document.createElement("div");
  content.className = "message-content";

  if (role === "bot") {
    content.innerHTML = renderMarkdown(text);
    addCopyButtons(content);
  } else {
    content.textContent = text;
  }

  // Tools
  const tools = document.createElement("div");
  tools.className = "msg-tools";
  
  const copyBtn = document.createElement("button");
  copyBtn.className = "icon-btn";
  copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
  copyBtn.onclick = () => { navigator.clipboard.writeText(text); showToast("Copied to clipboard"); };
  tools.appendChild(copyBtn);

  if (role === "bot") {
    const speakBtn = document.createElement("button");
    speakBtn.className = "icon-btn";
    speakBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
    speakBtn.onclick = () => readAloud(text);
    tools.appendChild(speakBtn);
  }

  content.appendChild(tools);
  row.appendChild(avatar);
  row.appendChild(content);
  elements.chatMessages.appendChild(row);
}

// ===== API COMMUNICATION =====
async function handleSendMessage() {
  const text = elements.messageInput.value.trim();
  if (!text || isGenerating) return;

  if (!activeConversationId) {
    activeConversationId = generateId();
    conversations[activeConversationId] = { title: "New Chat", messages: [] };
  }
  const conv = conversations[activeConversationId];

  // Title gen
  if (conv.messages.length === 0) {
    conv.title = text.substring(0, 40) + (text.length > 40 ? "..." : "");
    renderConversationList();
  }

  conv.messages.push({ role: "user", parts: [{ text }] });
  appendMessageToDOM("user", text);
  scrollToBottom();

  elements.messageInput.value = "";
  elements.messageInput.style.height = "auto";
  elements.sendBtn.disabled = true;
  
  await fetchReply(conv, text);
}

async function fetchReply(conv, userText) {
  isGenerating = true;
  document.querySelector(".composer-container").classList.add("generating");
  
  // Indicator
  const row = document.createElement("div");
  row.className = "message-row bot";
  row.id = "streamingRow";
  row.innerHTML = `
    <div class="message-avatar spinning-avatar"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="6"/><path d="M50 5 L50 95 M5 50 L95 50 M18 18 L82 82 M18 82 L82 18" stroke="currentColor" stroke-width="4"/><circle cx="50" cy="50" r="8" fill="currentColor"/></svg></div>
    <div class="message-content"><div class="status-text">Turning the wheel <span class="caret"></span></div></div>
  `;
  elements.chatMessages.appendChild(row);
  scrollToBottom();

  const historyForAPI = conv.messages.slice(0, -1);
  const personaMapping = {
    "default": "",
    "acharya": "You are Acharya, a patient and wise teacher. Explain concepts step by step clearly.",
    "sakha": "You are Sakha, a casual and supportive friend. Keep your tone light and encouraging.",
    "karma": "You are Karma. Be concise, direct, and action-oriented. No fluff.",
    "kavi": "You are Kavi, a creative and poetic soul. Use metaphors and eloquent language."
  };

  currentController = new AbortController();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userText,
        history: historyForAPI,
        model: settings.model,
        temperature: settings.temp,
        systemInstruction: personaMapping[settings.persona]
      }),
      signal: currentController.signal
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Something went wrong");

    row.remove();
    conv.messages.push({ role: "model", parts: [{ text: data.reply }] });
    appendMessageToDOM("bot", data.reply);

  } catch (error) {
    if (error.name === 'AbortError') {
      row.remove();
      showToast("Generation stopped");
      conv.messages.pop(); // remove user msg if aborted? No, let user retry.
    } else {
      row.remove();
      conv.messages.pop(); // remove user msg from history
      
      const errorRow = document.createElement("div");
      errorRow.className = "message-row bot";
      errorRow.innerHTML = `
        <div class="message-avatar">⚠️</div>
        <div class="message-content" style="color: #E5383B; background: rgba(229,56,59,0.1); border: 1px solid rgba(229,56,59,0.3);">
          <span>${error.message || "Failed to get response."}</span>
          <button class="outline-btn" style="margin-left: 10px; padding: 4px 12px; font-size: 0.8rem;" onclick="retryMsg('${escapeHtml(userText).replace(/'/g, "\\'")}')">🔄 Retry</button>
        </div>
      `;
      elements.chatMessages.appendChild(errorRow);
    }
  }

  isGenerating = false;
  document.querySelector(".composer-container").classList.remove("generating");
  currentController = null;
  saveConversations();
  scrollToBottom();
}

window.retryMsg = (text) => {
  const conv = conversations[activeConversationId];
  if(!conv) return;
  
  // Remove the error message
  elements.chatMessages.lastChild.remove();
  
  // Re-push and fetch
  conv.messages.push({ role: "user", parts: [{ text }] });
  elements.messageInput.value = "";
  fetchReply(conv, text);
};

function stopGeneration() {
  if (currentController) currentController.abort();
}

// ===== UTILS & MARKDOWN =====
function autoResizeTextarea() {
  elements.messageInput.style.height = "auto";
  elements.messageInput.style.height = Math.min(elements.messageInput.scrollHeight, 200) + "px";
  elements.sendBtn.disabled = elements.messageInput.value.trim() === "";
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function configureMarked() {
  marked.setOptions({
    highlight: function(code, lang) {
      if (lang && hljs.getLanguage(lang)) return hljs.highlight(code, { language: lang }).value;
      return hljs.highlightAuto(code).value;
    }, breaks: true, gfm: true
  });
}

function renderMarkdown(text) {
  try { return marked.parse(text); } catch { return escapeHtml(text); }
}

function addCopyButtons(container) {
  container.querySelectorAll("pre").forEach(pre => {
    const lang = pre.querySelector("code")?.className.replace("language-", "") || "code";
    
    const wrapper = document.createElement("div");
    pre.parentNode.insertBefore(wrapper, pre);
    
    const header = document.createElement("div");
    header.className = "code-header";
    header.innerHTML = `
      <span>${lang}</span>
      <button class="copy-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        Copy
      </button>
    `;
    
    header.querySelector(".copy-btn").onclick = (e) => {
      const code = pre.querySelector("code")?.textContent || pre.textContent;
      navigator.clipboard.writeText(code).then(() => {
        const b = e.currentTarget;
        b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#2ECC71" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied`;
        setTimeout(() => b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy`, 2000);
      });
    };

    wrapper.appendChild(header);
    wrapper.appendChild(pre);
  });
}

// ===== SPEECH & VOICE =====
let recognition;
function handleVoiceInput() {
  if (!('webkitSpeechRecognition' in window)) {
    showToast("Voice input not supported in this browser"); return;
  }
  if (!recognition) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    
    recognition.onstart = () => elements.micBtn.classList.add("recording");
    recognition.onend = () => elements.micBtn.classList.remove("recording");
    recognition.onresult = (e) => {
      let finalTranscript = '';
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript;
      }
      if (finalTranscript) {
        elements.messageInput.value += (elements.messageInput.value ? " " : "") + finalTranscript;
        autoResizeTextarea();
      }
    };
  }
  
  if (elements.micBtn.classList.contains("recording")) recognition.stop();
  else recognition.start();
}

function readAloud(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  
  // Strip markdown
  const clean = text.replace(/[#*_`]/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1');
  const msg = new SpeechSynthesisUtterance(clean);
  msg.rate = 1.0;
  window.speechSynthesis.speak(msg);
}

// ===== COMMAND PALETTE =====
function toggleCmdPalette() {
  const isHidden = elements.cmdPalette.classList.contains("hidden");
  if (isHidden) {
    elements.cmdPalette.classList.remove("hidden");
    elements.cmdInput.value = "";
    renderCmdResults();
    elements.cmdInput.focus();
  } else {
    elements.cmdPalette.classList.add("hidden");
  }
}

function renderCmdResults() {
  const query = elements.cmdInput.value.toLowerCase();
  let html = '';

  const actions = [
    { name: "New Chat", hint: "Ctrl+N", action: () => { createNewConversation(); toggleCmdPalette(); } },
    { name: "Open Settings", hint: "", action: () => { elements.settingsModal.classList.remove("hidden"); toggleCmdPalette(); } },
    { name: "Toggle Theme Mode", hint: "", action: () => { 
      const modes = ["ratri", "shunya", "prakash"];
      settings.theme = modes[(modes.indexOf(settings.theme) + 1) % 3];
      saveSettings(); document.getElementById("setting-theme").value = settings.theme; toggleCmdPalette();
    }},
  ];

  actions.filter(a => a.name.toLowerCase().includes(query)).forEach((act, i) => {
    html += `<div class="cmd-item" data-idx="act_${i}">${act.name} ${act.hint ? `<kbd>${act.hint}</kbd>` : ''}</div>`;
  });

  const ids = Object.keys(conversations).reverse();
  ids.filter(id => conversations[id].title.toLowerCase().includes(query)).forEach(id => {
    html += `<div class="cmd-item" data-idx="chat_${id}">Go to: ${escapeHtml(conversations[id].title)}</div>`;
  });

  elements.cmdResults.innerHTML = html;
  
  elements.cmdResults.querySelectorAll(".cmd-item").forEach(item => {
    item.onclick = () => {
      const idx = item.dataset.idx;
      if (idx.startsWith("act_")) actions[idx.split("_")[1]].action();
      else { switchConversation(idx.split("_")[1]); toggleCmdPalette(); }
    };
  });
}

// ===== EXPORT =====
function exportChats() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(conversations, null, 2));
  const el = document.createElement('a');
  el.setAttribute("href", dataStr);
  el.setAttribute("download", "chakra_history.json");
  document.body.appendChild(el); el.click(); el.remove();
  showToast("Chats exported successfully");
}

function showToast(msg) {
  const toast = document.createElement("div");
  toast.className = "toast"; toast.textContent = msg;
  elements.toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}
