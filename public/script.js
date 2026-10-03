/** CHAKRA AI: Living Motion System & Engine **/

// --- GSAP Safe Wrapper ---
const safeGsap = {
  to(target, vars) { if (window.gsap) return gsap.to(target, vars); },
  from(target, vars) { if (window.gsap) return gsap.from(target, vars); },
  timeline(vars) { return window.gsap ? gsap.timeline(vars) : { to() { return this; }, from() { return this; } }; }
};

// --- GLOBAL STATE ---
let settings = {
  theme: 'ratri',
  accent: 'sahasrara',
  bg: 'mandala',
  font: 'inter',
  model: 'gemini-3.8-flash',
  temp: 0.7,
  persona: 'default',
  enterToSend: true,
  anim: 'tandava',
  sound: false,
  dhyana: true,
  sanskrit: true
};

let conversations = [];
let currentChatId = null;
let isGenerating = false;
let idleTimer = null;
let abortController = null;

// --- SETTINGS INIT ---
function loadSettings() {
  try {
    const saved = localStorage.getItem("chakra_settings");
    if (saved) settings = { ...settings, ...JSON.parse(saved) };
    if (settings.model === "auto") settings.model = "gemini-3.8-flash";
  } catch (e) {}
  document.documentElement.setAttribute('data-theme', settings.theme);
  document.documentElement.setAttribute('data-accent', settings.accent);
  document.documentElement.setAttribute('data-font', settings.font);
  document.documentElement.setAttribute('data-anim', settings.anim);
  if (document.body) document.body.className = `bg-${settings.bg}`;
}
loadSettings();

// --- SOUND (WEB AUDIO) ---
const AudioSys = {
  ctx: null,
  enabled: () => settings.sound,
  init() {
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) {}
  },
  freqs: [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88], // Sa Re Ga Ma Pa Dha Ni
  playTone(index, type = 'sine', duration = 0.5) {
    if (!this.enabled()) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = this.freqs[Math.min(index, 6)];
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  },
  playBowl() {
    if (!this.enabled()) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(261.63, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(260, this.ctx.currentTime + 3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 1);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 3.5);
      osc.start();
      osc.stop(this.ctx.currentTime + 3.5);
    } catch (e) {}
  }
};

// --- CANVAS AMBIENT LAYER ---
const CanvasSys = {
  bg: null, fg: null, ctxBg: null, ctxFg: null,
  sparks: [], auroraBlobs: [], mouseX: window.innerWidth / 2, mouseY: window.innerHeight / 2,
  running: false, frameTime: 0, highFrameDrops: 0,
  
  init() {
    this.bg = document.getElementById('bgCanvas');
    this.fg = document.getElementById('fgCanvas');
    if (!this.bg || !this.fg) return;
    this.ctxBg = this.bg.getContext('2d');
    this.ctxFg = this.fg.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('mousemove', (e) => { this.mouseX = e.clientX; this.mouseY = e.clientY; resetIdle(); });
    
    this.auroraBlobs = [];
    for (let i = 0; i < 3; i++) {
      this.auroraBlobs.push({
        x: Math.random() * this.bg.width,
        y: Math.random() * this.bg.height,
        r: 200 + Math.random() * 200,
        dx: (Math.random() - 0.5) * 0.4,
        dy: (Math.random() - 0.5) * 0.4
      });
    }
    
    if (!this.running) {
      this.running = true;
      requestAnimationFrame((t) => this.loop(t));
    }
  },
  resize() {
    if (!this.bg || !this.fg) return;
    this.bg.width = this.fg.width = window.innerWidth;
    this.bg.height = this.fg.height = window.innerHeight;
  },
  loop(time) {
    if (!this.running) return;
    const dt = time - this.frameTime;
    this.frameTime = time;
    
    // Auto-downgrade to Lasya if frame drops occur
    if (dt > 28 && settings.anim === 'tandava') {
      this.highFrameDrops++;
      if (this.highFrameDrops > 60) {
        settings.anim = 'lasya';
        document.documentElement.setAttribute('data-anim', 'lasya');
        showToast("Switched to Lasya for smoothness", "info");
        this.highFrameDrops = 0;
      }
    } else {
      this.highFrameDrops = Math.max(0, this.highFrameDrops - 1);
    }

    if (settings.anim === 'off') {
      requestAnimationFrame((t) => this.loop(t));
      return;
    }

    this.ctxBg.clearRect(0, 0, this.bg.width, this.bg.height);
    this.ctxFg.clearRect(0, 0, this.fg.width, this.fg.height);

    // Aurora blobs
    if (settings.anim === 'tandava') {
      this.auroraBlobs.forEach(b => {
        b.x += b.dx; b.y += b.dy;
        if (b.x < -b.r || b.x > this.bg.width + b.r) b.dx *= -1;
        if (b.y < -b.r || b.y > this.bg.height + b.r) b.dy *= -1;
        const grad = this.ctxBg.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        grad.addColorStop(0, 'rgba(160, 107, 255, 0.04)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        this.ctxBg.fillStyle = grad;
        this.ctxBg.beginPath();
        this.ctxBg.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        this.ctxBg.fill();
      });
    }

    // Soft Diya Sparks
    const maxSparks = window.innerWidth > 768 ? 50 : 25;
    if (Math.random() < 0.15 && this.sparks.length < maxSparks && settings.anim !== 'shanti') {
      this.sparks.push({
        x: Math.random() * this.fg.width,
        y: this.fg.height + 10,
        r: Math.random() * 2 + 0.8,
        speed: Math.random() * 0.7 + 0.3,
        wobble: Math.random() * Math.PI * 2,
        alpha: Math.random() * 0.4 + 0.4
      });
    }
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      let s = this.sparks[i];
      s.y -= s.speed;
      s.x += Math.sin(s.wobble) * 0.5;
      s.wobble += 0.02;
      s.alpha -= 0.002;
      if (s.alpha <= 0 || s.y < -10) { this.sparks.splice(i, 1); continue; }
      
      this.ctxFg.fillStyle = `rgba(245, 194, 107, ${s.alpha})`;
      this.ctxFg.beginPath();
      this.ctxFg.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      this.ctxFg.fill();
    }

    // Cursor Aura
    const auraRad = isGenerating ? 100 : 70;
    const auraGrad = this.ctxFg.createRadialGradient(this.mouseX, this.mouseY, 0, this.mouseX, this.mouseY, auraRad);
    auraGrad.addColorStop(0, isGenerating ? 'rgba(160, 107, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)');
    auraGrad.addColorStop(1, 'rgba(0,0,0,0)');
    this.ctxFg.fillStyle = auraGrad;
    this.ctxFg.beginPath();
    this.ctxFg.arc(this.mouseX, this.mouseY, auraRad, 0, Math.PI * 2);
    this.ctxFg.fill();

    requestAnimationFrame((t) => this.loop(t));
  }
};

// --- DHYANA (MEDITATION IDLE) ---
function resetIdle() {
  if (!settings.dhyana) return;
  document.body.classList.remove('dhyana-idle');
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    document.body.classList.add('dhyana-idle');
  }, 90000);
}

// --- INTRO & ENTER SEQUENCE ---
function runIntro() {
  const introSession = sessionStorage.getItem('chakra_intro');
  if (settings.anim === 'off' || introSession) {
    skipIntro();
    return;
  }
  
  sessionStorage.setItem('chakra_intro', '1');
  
  const tl = safeGsap.timeline();
  tl.to('.c-ring', { strokeDashoffset: 0, duration: 1.2, ease: "power2.inOut" });
  tl.to('.c-spokes line', { scale: 1, opacity: 1, duration: 0.8, stagger: 0.02, ease: "back.out" });
  tl.to('.c-lotus', { strokeDashoffset: 0, duration: 1, ease: "power2.out" });
  tl.to('.c-bindu', { scale: 1, duration: 0.4, ease: "back.out" });
  tl.to('#introText', { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" });
  
  const enterBtn = document.getElementById('enterBtn');
  const skipBtn = document.getElementById('skipIntroBtn');
  if (enterBtn) enterBtn.addEventListener('click', enterApp);
  if (skipBtn) skipBtn.addEventListener('click', skipIntro);
}

function enterApp() {
  AudioSys.playBowl();
  const tl = safeGsap.timeline({ onComplete: skipIntro });
  tl.to('.chakra-svg', { rotation: 1080, duration: 1.6, ease: "power3.in" });
  tl.to('.chakra-bloom', { opacity: 1, duration: 1, ease: "power2.in" });
  tl.to('#introText', { scale: 1.1, opacity: 0, duration: 0.4 });
  
  const boots = ["Awakening Gemini core…", "Aligning seven chakras…", "Prana: stable", "Ready."];
  const bootEl = document.getElementById('introBootText');
  if (bootEl) {
    boots.forEach((t, i) => {
      setTimeout(() => {
        bootEl.innerText = t;
        safeGsap.to(bootEl, { opacity: 1, yoyo: true, repeat: 1, duration: 0.3 });
      }, i * 300 + 400);
    });
  }
  
  tl.to('.intro-center', { scale: 15, opacity: 0, duration: 0.8, ease: "power2.in" });
  tl.to('#introScreen', { opacity: 0, duration: 0.4 });
}

function skipIntro() {
  const intro = document.getElementById('introScreen');
  const app = document.getElementById('app');
  if (intro) intro.classList.add('hidden');
  if (app) app.classList.remove('hidden');
  
  CanvasSys.init();
  resetIdle();
  
  safeGsap.from('#sidebar', { x: -50, opacity: 0, duration: 0.6, ease: "power2.out" });
  safeGsap.from('#welcomeScreen', { y: 30, opacity: 0, duration: 0.6, ease: "power2.out", delay: 0.1 });
  safeGsap.from('.suggestion-card', { y: 20, opacity: 0, duration: 0.4, stagger: 0.08, ease: "back.out", delay: 0.2 });
  safeGsap.from('.composer-container', { y: 50, opacity: 0, duration: 0.6, ease: "power2.out", delay: 0.2 });
  
  loadHistory();
}

// --- CHAT LOGIC ---
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

if (messageInput) {
  messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
    if (sendBtn) sendBtn.disabled = !messageInput.value.trim() && !isGenerating;
    resetIdle();
  });

  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && settings.enterToSend) {
      e.preventDefault();
      if (sendBtn && !sendBtn.disabled && !isGenerating) handleSendMessage();
    }
  });
}

if (sendBtn) {
  sendBtn.addEventListener('click', () => {
    if (isGenerating) stopGeneration();
    else handleSendMessage();
  });
}

// Bind Suggestion Cards
document.querySelectorAll('.suggestion-card').forEach(card => {
  card.addEventListener('click', () => {
    const prompt = card.getAttribute('data-prompt');
    if (prompt && messageInput) {
      messageInput.value = prompt;
      messageInput.dispatchEvent(new Event('input'));
      handleSendMessage();
    }
  });
});

// Bind Chips Row
document.querySelectorAll('.chip').forEach(c => {
  c.addEventListener('click', () => {
    const prompt = c.getAttribute('data-prompt');
    if (prompt && messageInput) {
      messageInput.value = prompt;
      messageInput.dispatchEvent(new Event('input'));
      handleSendMessage();
      const row = document.getElementById('chipsRow');
      if (row) row.style.display = 'none';
    }
  });
});

async function handleSendMessage() {
  if (!messageInput) return;
  const text = messageInput.value.trim();
  if (!text) return;
  
  if (!Array.isArray(conversations)) conversations = [];
  
  if (!currentChatId) {
    currentChatId = Date.now().toString();
    conversations.unshift({ id: currentChatId, title: text.substring(0, 32), history: [] });
    const welcome = document.getElementById('welcomeScreen');
    if (welcome) welcome.classList.add('hidden');
    const chips = document.getElementById('chipsRow');
    if (chips) chips.style.display = 'none';
  }
  
  let chat = conversations.find(c => c.id === currentChatId);
  if (!chat) {
    chat = { id: currentChatId, title: text.substring(0, 32), history: [] };
    conversations.unshift(chat);
  }
  
  if (!Array.isArray(chat.history)) chat.history = [];
  chat.history.push({ role: 'user', parts: [{ text }] });
  saveHistory();
  renderHistoryList();
  
  messageInput.value = '';
  messageInput.style.height = 'auto';
  appendMessageUI('user', text);
  scrollToBottom();
  
  isGenerating = true;
  document.body.classList.add('is-generating');
  const composerBox = document.getElementById('composerBox');
  if (composerBox) composerBox.classList.add('generating');
  if (sendBtn) sendBtn.disabled = false;
  
  AudioSys.playTone(0, 'triangle', 0.2); // Start chime
  
  const botDiv = appendMessageUI('model', '', true);
  const contentDiv = botDiv.querySelector('.message-content');
  const toolsDiv = botDiv.querySelector('.msg-tools');
  const avatarDiv = botDiv.querySelector('.message-avatar');
  if (toolsDiv) toolsDiv.style.display = 'none';
  
  // Status phrase cycler
  const phrases = [
    "⚡ TUNING NEURAL FREQUENCY",
    "🌀 ACCELERATING CHAKRA VORTEX",
    "🔮 SYNTHESIZING KNOWLEDGE",
    "✨ CHANNELING GEMINI INTELLECT",
    "💫 WEAVING THOUGHT MATRIX"
  ];
  let pIdx = 0;
  const statusEl = contentDiv.querySelector('.status-phrase');
  const statusInterval = setInterval(() => {
    if (!isGenerating || !statusEl) { clearInterval(statusInterval); return; }
    pIdx = (pIdx + 1) % phrases.length;
    statusEl.innerText = phrases[pIdx];
  }, 600);
  
  try {
    abortController = new AbortController();
    
    const apiHistory = chat.history.slice(0, -1).map(m => ({
      role: m.role, parts: [{ text: m.parts[0].text }]
    }));
    
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        history: apiHistory,
        model: settings.model,
        temperature: settings.temp,
        systemInstruction: getPersonaInstruction(settings.persona)
      }),
      signal: abortController.signal
    });
    
    clearInterval(statusInterval);
    
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Server error');
    }
    
    const data = await response.json();
    
    // Switch to streaming words with glowing Bindu Spark
    const words = (data.reply || '').split(' ');
    contentDiv.innerHTML = '';
    
    // Add Bindu spark anchor
    const binduSpark = document.createElement('span');
    binduSpark.className = 'bindu-spark';
    contentDiv.appendChild(binduSpark);
    
    for (let i = 0; i < words.length; i++) {
      if (!isGenerating) break;
      const span = document.createElement('span');
      span.innerHTML = (window.marked ? marked.parseInline(words[i]) : words[i]) + ' ';
      span.className = 'stream-word';
      contentDiv.insertBefore(span, binduSpark);
      
      if (settings.anim !== 'off') {
        safeGsap.from(span, { opacity: 0, filter: 'blur(8px)', scale: 1.1, duration: 0.2, ease: 'power2.out' });
      }
      
      scrollToBottom();
      await new Promise(r => setTimeout(r, 14));
    }
    
    binduSpark.remove();
    contentDiv.innerHTML = window.marked ? marked.parse(data.reply) : data.reply;
    if (window.hljs) hljs.highlightAll();
    
    // Stop spinning avatar
    if (avatarDiv) {
      const svg = avatarDiv.querySelector('svg');
      if (svg) svg.classList.remove('slow-spin');
    }
    
    chat.history.push({ role: 'model', parts: [{ text: data.reply }] });
    saveHistory();
    
    if (toolsDiv) toolsDiv.style.display = 'flex';
    AudioSys.playTone(6, 'sine', 0.4); // Completion chime
    
  } catch (err) {
    clearInterval(statusInterval);
    if (err.name === 'AbortError') {
      contentDiv.innerHTML += '<br/><em>[Stopped by user]</em>';
    } else {
      contentDiv.innerHTML = `<div class="status-text" style="color:#E5383B">Error: ${err.message}</div>`;
      showToast(err.message, 'error');
    }
  }
  
  isGenerating = false;
  document.body.classList.remove('is-generating');
  if (composerBox) composerBox.classList.remove('generating');
  if (sendBtn) sendBtn.disabled = !messageInput.value.trim();
  abortController = null;
}

function stopGeneration() {
  if (abortController) abortController.abort();
  isGenerating = false;
  document.body.classList.remove('is-generating');
  const composerBox = document.getElementById('composerBox');
  if (composerBox) composerBox.classList.remove('generating');
}

function appendMessageUI(role, text, generating = false) {
  const row = document.createElement('div');
  row.className = `message-row ${role}`;
  
  let avatarHTML = '';
  if (role === 'user') {
    avatarHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
  } else {
    avatarHTML = `<svg class="${generating ? 'slow-spin' : ''}" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="5"/><path d="M50 5 L50 95 M5 50 L95 50 M18 18 L82 82 M18 82 L82 18" stroke="currentColor" stroke-width="3"/><circle cx="50" cy="50" r="7" fill="currentColor"/></svg>`;
  }
  
  let contentHTML = '';
  if (role === 'user') {
    contentHTML = text;
  } else if (generating) {
    contentHTML = `
      <div class="cyber-status-pill">
        <span class="live-beacon"></span>
        <span class="status-phrase">⚡ TUNING NEURAL FREQUENCY</span>
      </div>
    `;
  } else {
    contentHTML = window.marked ? marked.parse(text) : text;
  }

  row.innerHTML = `
    <div class="message-avatar">${avatarHTML}</div>
    <div style="flex:1; display:flex; flex-direction:column; ${role === 'user' ? 'align-items:flex-end;' : ''}">
      <div class="message-content">${contentHTML}</div>
      ${role === 'model' ? `
        <div class="msg-tools">
          <button class="icon-btn copy-btn" title="Copy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
          <button class="icon-btn read-btn" title="Read Aloud"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg></button>
        </div>
      ` : ''}
    </div>
  `;
  if (chatMessages) chatMessages.appendChild(row);
  
  if (settings.anim !== 'off' && role === 'user') {
    safeGsap.from(row.querySelector('.message-content'), { y: 20, opacity: 0, scale: 0.95, duration: 0.4, ease: "back.out" });
  }

  // Copy and Read aloud buttons
  if (role === 'model') {
    const copyBtn = row.querySelector('.copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', (e) => {
        navigator.clipboard.writeText(row.querySelector('.message-content').innerText);
        const btn = e.currentTarget;
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        setTimeout(() => btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>', 2000);
      });
    }
    const readBtn = row.querySelector('.read-btn');
    if (readBtn) {
      readBtn.addEventListener('click', () => {
        const synth = window.speechSynthesis;
        if (!synth) return;
        if (synth.speaking) { synth.cancel(); return; }
        const ut = new SpeechSynthesisUtterance(row.querySelector('.message-content').innerText);
        synth.speak(ut);
      });
    }
  }
  
  return row;
}

function scrollToBottom() {
  if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- HISTORY & SIDEBAR ---
function saveHistory() {
  if (!Array.isArray(conversations)) conversations = [];
  localStorage.setItem("chakra_conversations", JSON.stringify(conversations));
}

function loadHistory() {
  try {
    const saved = localStorage.getItem("chakra_conversations");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        conversations = parsed;
      } else if (typeof parsed === 'object' && parsed !== null) {
        // Safe migration from legacy dictionary format
        conversations = Object.keys(parsed).map(id => {
          const item = parsed[id];
          return {
            id,
            title: item.title || "Untitled Chat",
            history: (item.messages || item.history || []).map(m => {
              if (m.parts && m.parts[0]) return m;
              return { role: m.role || 'user', parts: [{ text: m.text || m.content || '' }] };
            })
          };
        }).reverse();
      } else {
        conversations = [];
      }
    } else {
      conversations = [];
    }
  } catch (e) {
    conversations = [];
  }
  renderHistoryList();
}

function renderHistoryList() {
  const list = document.getElementById('conversationList');
  if (!list) return;
  list.innerHTML = '';
  if (!Array.isArray(conversations)) conversations = [];
  
  conversations.forEach((c, i) => {
    const div = document.createElement('div');
    div.className = `chat-item ${c.id === currentChatId ? 'active' : ''}`;
    div.innerHTML = `
      ${c.id === currentChatId ? '<div class="active-bg"></div>' : ''}
      <span class="chat-title">${c.title || 'Chat'}</span>
      <div class="chat-actions">
        <button class="action-icon danger" onclick="deleteChat('${c.id}', event)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
      </div>
    `;
    div.addEventListener('click', () => loadChat(c.id));
    list.appendChild(div);
    if (settings.anim !== 'off' && i < 10) {
      safeGsap.from(div, { x: -20, opacity: 0, duration: 0.3, delay: i * 0.04 });
    }
  });
}

window.deleteChat = (id, e) => {
  if (e) e.stopPropagation();
  if (!Array.isArray(conversations)) conversations = [];
  conversations = conversations.filter(c => c.id !== id);
  saveHistory();
  if (currentChatId === id) startNewChat();
  else renderHistoryList();
};

function loadChat(id) {
  if (currentChatId === id) return;
  currentChatId = id;
  const chat = conversations.find(c => c.id === id);
  const welcome = document.getElementById('welcomeScreen');
  if (welcome) welcome.classList.add('hidden');
  const chips = document.getElementById('chipsRow');
  if (chips) chips.style.display = 'none';
  
  if (chatMessages) {
    chatMessages.innerHTML = '';
    if (chat && Array.isArray(chat.history)) {
      chat.history.forEach(m => appendMessageUI(m.role, m.parts[0]?.text || ''));
    }
  }
  renderHistoryList();
  scrollToBottom();
}

function startNewChat() {
  currentChatId = null;
  if (chatMessages) {
    chatMessages.innerHTML = '';
    const welcome = document.getElementById('welcomeScreen');
    if (welcome) {
      chatMessages.appendChild(welcome);
      welcome.classList.remove('hidden');
    }
  }
  const chips = document.getElementById('chipsRow');
  if (chips) chips.style.display = 'flex';
  renderHistoryList();
}

// Sidebar Buttons
const newChatBtn = document.getElementById('newChatBtn');
const mobileNewChatBtn = document.getElementById('mobileNewChatBtn');
const clearAllBtn = document.getElementById('clearAllBtn');

if (newChatBtn) newChatBtn.addEventListener('click', startNewChat);
if (mobileNewChatBtn) mobileNewChatBtn.addEventListener('click', startNewChat);
if (clearAllBtn) {
  clearAllBtn.addEventListener('click', () => {
    if (confirm('Delete all history?')) {
      conversations = [];
      saveHistory();
      startNewChat();
    }
  });
}

// --- SETTINGS MODAL & VIEW TRANSITIONS ---
const settingsModal = document.getElementById('settingsModal');
const openSettingsBtn = document.getElementById('openSettingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');

if (openSettingsBtn) {
  openSettingsBtn.addEventListener('click', () => {
    if (settingsModal) settingsModal.classList.remove('hidden');
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
  });
}
if (closeSettingsBtn) {
  closeSettingsBtn.addEventListener('click', () => {
    if (settingsModal) settingsModal.classList.add('hidden');
  });
}

// Bind settings fields
const sTheme = document.getElementById('setting-theme');
const sBg = document.getElementById('setting-bg');
const sFont = document.getElementById('setting-font');
const sAnim = document.getElementById('setting-anim');
const sModel = document.getElementById('setting-model');
const sTemp = document.getElementById('setting-temp');
const sPersona = document.getElementById('setting-persona');
const sEnter = document.getElementById('setting-enter');
const sSound = document.getElementById('setting-sound');
const sDhyana = document.getElementById('setting-dhyana');

if (sTheme) sTheme.value = settings.theme;
if (sBg) sBg.value = settings.bg;
if (sFont) sFont.value = settings.font;
if (sAnim) sAnim.value = settings.anim;
if (sModel) sModel.value = settings.model;
if (sTemp) {
  sTemp.value = settings.temp;
  const tv = document.getElementById('tempValue');
  if (tv) tv.innerText = settings.temp;
}
if (sPersona) sPersona.value = settings.persona;
if (sEnter) sEnter.checked = settings.enterToSend;
if (sSound) sSound.checked = settings.sound;
if (sDhyana) sDhyana.checked = settings.dhyana;

function applyThemeChange(cb) {
  if (!document.startViewTransition || settings.anim === 'off') { cb(); return; }
  document.startViewTransition(() => cb());
}

if (sTheme) {
  sTheme.addEventListener('change', (e) => {
    settings.theme = e.target.value;
    applyThemeChange(() => document.documentElement.setAttribute('data-theme', settings.theme));
    saveSettings();
  });
}

document.querySelectorAll('.accent-swatch').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.accent-swatch').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    settings.accent = e.target.dataset.acc;
    
    if (document.startViewTransition && settings.anim !== 'off') {
      const rect = e.target.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const endRadius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      const transition = document.startViewTransition(() => {
        document.documentElement.setAttribute('data-accent', settings.accent);
      });
      transition.ready.then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`] },
          { duration: 600, easing: "cubic-bezier(.16,1,.3,1)", pseudoElement: "::view-transition-new(root)" }
        );
      });
    } else {
      document.documentElement.setAttribute('data-accent', settings.accent);
    }
    saveSettings();
  });
});

if (sBg) {
  sBg.addEventListener('change', (e) => {
    settings.bg = e.target.value;
    if (document.body) document.body.className = `bg-${settings.bg}`;
    saveSettings();
  });
}
if (sFont) {
  sFont.addEventListener('change', (e) => {
    settings.font = e.target.value;
    document.documentElement.setAttribute('data-font', settings.font);
    saveSettings();
  });
}
if (sAnim) {
  sAnim.addEventListener('change', (e) => {
    settings.anim = e.target.value;
    document.documentElement.setAttribute('data-anim', settings.anim);
    saveSettings();
  });
}
if (sModel) {
  sModel.addEventListener('change', (e) => {
    settings.model = e.target.value;
    saveSettings();
  });
}
if (sTemp) {
  sTemp.addEventListener('input', (e) => {
    settings.temp = parseFloat(e.target.value);
    const tv = document.getElementById('tempValue');
    if (tv) tv.innerText = settings.temp;
    saveSettings();
  });
}
if (sPersona) {
  sPersona.addEventListener('change', (e) => {
    settings.persona = e.target.value;
    saveSettings();
  });
}
if (sEnter) {
  sEnter.addEventListener('change', (e) => {
    settings.enterToSend = e.target.checked;
    saveSettings();
  });
}
if (sSound) {
  sSound.addEventListener('change', (e) => {
    settings.sound = e.target.checked;
    saveSettings();
  });
}
if (sDhyana) {
  sDhyana.addEventListener('change', (e) => {
    settings.dhyana = e.target.checked;
    saveSettings();
  });
}

const exportBtn = document.getElementById('exportChatsBtn');
if (exportBtn) {
  exportBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(conversations, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'chakra_history.json';
    a.click();
  });
}

function saveSettings() {
  localStorage.setItem("chakra_settings", JSON.stringify(settings));
}

function getPersonaInstruction(id) {
  const map = {
    acharya: "You are Acharya, a wise and patient teacher. Explain concepts deeply and clearly.",
    sakha: "You are Sakha, a friendly and casual companion. Use conversational language.",
    karma: "You are Karma. Provide extremely concise, direct, and actionable answers. No fluff.",
    kavi: "You are Kavi. Answer creatively, occasionally using metaphors or poetic structures."
  };
  return map[id] || "";
}

// --- UTILS & COMMAND PALETTE ---
function showToast(msg, type = 'info') {
  const c = document.getElementById('toastContainer');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerText = msg;
  c.appendChild(t);
  safeGsap.from(t, { x: 50, opacity: 0, duration: 0.3 });
  setTimeout(() => {
    safeGsap.to(t, { x: 50, opacity: 0, duration: 0.3, onComplete: () => t.remove() });
  }, 3000);
}

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    const p = document.getElementById('cmdPalette');
    if (p) {
      p.classList.toggle('hidden');
      const inp = document.getElementById('cmdInput');
      if (inp && !p.classList.contains('hidden')) inp.focus();
    }
  }
});

const cmdPal = document.getElementById('cmdPalette');
if (cmdPal) {
  cmdPal.addEventListener('click', (e) => {
    if (e.target.id === 'cmdPalette') cmdPal.classList.add('hidden');
  });
}

const sidebarToggle = document.getElementById('sidebarToggle');
if (sidebarToggle) {
  sidebarToggle.addEventListener('click', () => {
    const sb = document.getElementById('sidebar');
    if (sb) sb.classList.add('open');
  });
}

const closeSidebarMobile = document.getElementById('closeSidebarMobile');
if (closeSidebarMobile) {
  closeSidebarMobile.addEventListener('click', () => {
    const sb = document.getElementById('sidebar');
    if (sb) sb.classList.remove('open');
  });
}

// --- BOOTSTRAP ---
window.addEventListener('DOMContentLoaded', () => {
  runIntro();
});
