// ===== State =====
let conversations = {}; // { id: { title, messages: [{role, parts}] } }
let activeConversationId = null;

// ===== DOM Elements =====
const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChatBtn");
const conversationList = document.getElementById("conversationList");
const clearAllBtn = document.getElementById("clearAllBtn");
const welcomeScreen = document.getElementById("welcomeScreen");
const sidebarToggle = document.getElementById("sidebarToggle");
const sidebar = document.getElementById("sidebar");

// ===== Initialize =====
document.addEventListener("DOMContentLoaded", () => {
  loadConversations();
  cleanupEmptyConversations();
  
  // Set the most recent conversation as active on load
  const keys = Object.keys(conversations);
  if (keys.length > 0) {
    activeConversationId = keys[keys.length - 1]; // latest
  }

  renderConversationList();
  renderChat();
  setupEventListeners();
  configureMarked();
});

// ===== Marked.js Config =====
function configureMarked() {
  marked.setOptions({
    highlight: function (code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    },
    breaks: true,
    gfm: true,
  });
}

// ===== Event Listeners =====
function setupEventListeners() {
  // Form submit
  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleSendMessage();
  });

  // Enable/disable send button
  messageInput.addEventListener("input", () => {
    sendBtn.disabled = messageInput.value.trim() === "";
    autoResizeTextarea();
  });

  // Enter to send, Shift+Enter for newline
  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (messageInput.value.trim()) {
        handleSendMessage();
      }
    }
  });

  // New chat
  newChatBtn.addEventListener("click", createNewConversation);

  // Clear all
  clearAllBtn.addEventListener("click", () => {
    if (confirm("Delete all conversations? This cannot be undone.")) {
      conversations = {};
      activeConversationId = null;
      saveConversations();
      renderConversationList();
      renderChat();
    }
  });

  // Suggestion chips
  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      messageInput.value = chip.dataset.prompt;
      sendBtn.disabled = false;
      handleSendMessage();
    });
  });

  // Mobile sidebar
  sidebarToggle.addEventListener("click", toggleSidebar);

  // Close sidebar on overlay click
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("sidebar-overlay")) {
      closeSidebar();
    }
  });
}

// ===== Textarea Auto-Resize =====
function autoResizeTextarea() {
  messageInput.style.height = "auto";
  messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + "px";
}

// ===== Sidebar Toggle (Mobile) =====
function toggleSidebar() {
  sidebar.classList.toggle("open");
  let overlay = document.querySelector(".sidebar-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "sidebar-overlay";
    document.body.appendChild(overlay);
  }
  overlay.classList.toggle("active");
}

function closeSidebar() {
  sidebar.classList.remove("open");
  const overlay = document.querySelector(".sidebar-overlay");
  if (overlay) overlay.classList.remove("active");
}

// ===== LocalStorage =====
function saveConversations() {
  localStorage.setItem("chakra_conversations", JSON.stringify(conversations));
}

function loadConversations() {
  const stored = localStorage.getItem("chakra_conversations");
  if (stored) {
    try {
      conversations = JSON.parse(stored);
    } catch {
      conversations = {};
    }
  }
}

// ===== Conversation Management =====
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function cleanupEmptyConversations() {
  let modified = false;
  for (const id in conversations) {
    if (conversations[id].messages.length === 0) {
      delete conversations[id];
      modified = true;
    }
  }
  if (modified) {
    saveConversations();
    // If the active conversation was deleted because it was empty, reset it
    if (activeConversationId && !conversations[activeConversationId]) {
      activeConversationId = null;
    }
  }
}

function createNewConversation() {
  cleanupEmptyConversations();
  activeConversationId = null;
  renderConversationList();
  renderChat();
  messageInput.focus();
  closeSidebar();
}

function switchConversation(id) {
  cleanupEmptyConversations();
  activeConversationId = id;
  renderConversationList();
  renderChat();
  closeSidebar();
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

// ===== Render Conversation List =====
function renderConversationList() {
  conversationList.innerHTML = "";
  const ids = Object.keys(conversations).reverse(); // Newest first

  ids.forEach((id) => {
    const conv = conversations[id];
    const item = document.createElement("div");
    item.className = `conversation-item${id === activeConversationId ? " active" : ""}`;
    item.onclick = () => switchConversation(id);

    item.innerHTML = `
      <span class="conv-title">${escapeHtml(conv.title)}</span>
      <button class="delete-conv-btn" title="Delete conversation">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;

    item.querySelector(".delete-conv-btn").onclick = (e) => deleteConversation(id, e);
    conversationList.appendChild(item);
  });
}

// ===== Render Chat Messages =====
function renderChat() {
  // Clear all messages except welcome screen
  const existingMessages = chatMessages.querySelectorAll(".message-row");
  existingMessages.forEach((el) => el.remove());

  const conv = activeConversationId ? conversations[activeConversationId] : null;

  if (!conv || conv.messages.length === 0) {
    welcomeScreen.style.display = "flex";
  } else {
    welcomeScreen.style.display = "none";
  }

  if (conv) {
    conv.messages.forEach((msg) => {
      appendMessageToDOM(msg.role === "user" ? "user" : "bot", msg.parts[0].text, false);
    });
  }

  scrollToBottom();
}

// ===== Append Message to DOM =====
function appendMessageToDOM(role, text, animate = true) {
  welcomeScreen.style.display = "none";

  const row = document.createElement("div");
  row.className = `message-row ${role}`;
  if (!animate) row.style.animation = "none";

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = role === "user" ? "👤" : "🔮";

  const content = document.createElement("div");
  content.className = "message-content";

  if (role === "bot") {
    content.innerHTML = renderMarkdown(text);
    // Add copy buttons to code blocks
    addCopyButtons(content);
  } else {
    content.textContent = text;
  }

  row.appendChild(avatar);
  row.appendChild(content);
  chatMessages.appendChild(row);
}

// ===== Markdown Rendering =====
function renderMarkdown(text) {
  try {
    return marked.parse(text);
  } catch {
    return escapeHtml(text);
  }
}

// ===== Copy Buttons for Code Blocks =====
function addCopyButtons(container) {
  container.querySelectorAll("pre").forEach((pre) => {
    const wrapper = document.createElement("div");
    wrapper.className = "code-block-wrapper";
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    const btn = document.createElement("button");
    btn.className = "copy-code-btn";
    btn.textContent = "Copy";
    btn.onclick = () => {
      const code = pre.querySelector("code")?.textContent || pre.textContent;
      navigator.clipboard.writeText(code).then(() => {
        btn.textContent = "Copied!";
        setTimeout(() => (btn.textContent = "Copy"), 2000);
      });
    };
    wrapper.appendChild(btn);
  });
}

// ===== Typing Indicator =====
function showTypingIndicator() {
  const row = document.createElement("div");
  row.className = "message-row bot";
  row.id = "typingRow";

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = "🔮";

  const content = document.createElement("div");
  content.className = "message-content";
  content.innerHTML = `
    <div class="typing-indicator">
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    </div>
  `;

  row.appendChild(avatar);
  row.appendChild(content);
  chatMessages.appendChild(row);
  scrollToBottom();
}

function removeTypingIndicator() {
  const el = document.getElementById("typingRow");
  if (el) el.remove();
}

// ===== Send Message =====
async function handleSendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  // Create a new conversation if none is active
  if (!activeConversationId) {
    activeConversationId = generateId();
    conversations[activeConversationId] = {
      title: "New Chat",
      messages: [],
    };
  }

  const conv = conversations[activeConversationId];

  // Add user message
  const userMessage = { role: "user", parts: [{ text }] };
  conv.messages.push(userMessage);

  // Update title from first message
  if (conv.messages.length === 1) {
    conv.title = text.substring(0, 40) + (text.length > 40 ? "..." : "");
    renderConversationList();
  }

  // Display user message
  appendMessageToDOM("user", text);
  scrollToBottom();

  // Clear input
  messageInput.value = "";
  messageInput.style.height = "auto";
  sendBtn.disabled = true;

  // Show typing indicator
  showTypingIndicator();

  try {
    // Send to API with full history (exclude the last user message since the API adds it)
    const historyForAPI = conv.messages.slice(0, -1);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        history: historyForAPI,
      }),
    });

    const data = await response.json();

    removeTypingIndicator();

    if (!response.ok) {
      throw new Error(data.error || "Something went wrong");
    }

    // Add bot response
    const botMessage = { role: "model", parts: [{ text: data.reply }] };
    conv.messages.push(botMessage);

    // Display bot message
    appendMessageToDOM("bot", data.reply);
  } catch (error) {
    removeTypingIndicator();

    // Show error in chat with Retry button
    const errorRow = document.createElement("div");
    errorRow.className = "message-row bot";

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = "⚠️";

    const content = document.createElement("div");
    content.className = "message-content error-message";

    const errorText = document.createElement("span");
    errorText.textContent = error.message || "Failed to get response. Please try again.";

    const retryBtn = document.createElement("button");
    retryBtn.textContent = "🔄 Retry";
    retryBtn.style.cssText = "margin-left:10px;padding:4px 12px;background:var(--accent);color:white;border:none;border-radius:6px;cursor:pointer;font-size:0.8rem;font-family:inherit;";
    retryBtn.onclick = () => {
      errorRow.remove();
      // Re-add the user message to history and retry
      conv.messages.push({ role: "user", parts: [{ text }] });
      messageInput.value = "";
      retrySendMessage(text, conv);
    };

    content.appendChild(errorText);
    content.appendChild(retryBtn);
    errorRow.appendChild(avatar);
    errorRow.appendChild(content);
    chatMessages.appendChild(errorRow);

    // Remove the failed user message from history
    conv.messages.pop();
  }

  // Save and scroll
  saveConversations();
  scrollToBottom();
  messageInput.focus();
}

// ===== Retry Send Message =====
async function retrySendMessage(text, conv) {
  showTypingIndicator();

  try {
    const historyForAPI = conv.messages.slice(0, -1);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        history: historyForAPI,
      }),
    });

    const data = await response.json();
    removeTypingIndicator();

    if (!response.ok) {
      throw new Error(data.error || "Something went wrong");
    }

    const botMessage = { role: "model", parts: [{ text: data.reply }] };
    conv.messages.push(botMessage);
    appendMessageToDOM("bot", data.reply);
  } catch (error) {
    removeTypingIndicator();
    // Remove the user message we re-added
    conv.messages.pop();

    const errorRow = document.createElement("div");
    errorRow.className = "message-row bot";
    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = "⚠️";
    const content = document.createElement("div");
    content.className = "message-content error-message";
    content.textContent = error.message || "Still failing. Please try again later.";
    errorRow.appendChild(avatar);
    errorRow.appendChild(content);
    chatMessages.appendChild(errorRow);
  }

  saveConversations();
  scrollToBottom();
}

// ===== Utilities =====
function scrollToBottom() {
  requestAnimationFrame(() => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
