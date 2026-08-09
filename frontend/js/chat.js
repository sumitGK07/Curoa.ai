/**
 * Curoa.AI — Chat workspace
 * Drives the sidebar conversation list, message thread, and composer.
 * Talks to POST /api/chat, which currently returns a placeholder
 * response until the medical AI model is connected (see backend).
 *
 * Conversations are persisted to the backend when logged in, and to
 * localStorage as a lightweight fallback so the UI works stand-alone.
 */

const CuroaChat = (() => {
  const LOCAL_KEY = "curoa_local_conversations";

  const EXAMPLE_PROMPTS = [
    { icon: "cough", title: "I've had a dry cough for 3 days", sub: "Possible causes & self-care" },
    { icon: "fever", title: "My child has a fever of 101°F", sub: "When to seek urgent care" },
    { icon: "skin", title: "Itchy red rash on my arm", sub: "Common skin concerns" },
    { icon: "stomach", title: "Stomach pain after eating", sub: "Digestive symptom guidance" },
  ];

  let state = {
    conversations: [],
    activeId: null,
  };

  function loadLocalConversations() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveLocalConversations() {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state.conversations));
  }

  function uid() {
    return "c_" + Math.random().toString(36).slice(2, 10);
  }

  async function init() {
    const els = getEls();

    // Try backend first; fall back to local storage while the API/DB
    // isn't connected yet.
    if (CuroaAPI.isLoggedIn()) {
      try {
        const remote = await CuroaAPI.listConversations();
        state.conversations = remote.map(normalizeRemote);
      } catch {
        state.conversations = loadLocalConversations();
      }
    } else {
      state.conversations = loadLocalConversations();
    }

    renderConversationList(els);
    renderExamplePrompts(els);
    showWelcome(els);

    wireComposer(els);
    wireNewChat(els);
    wireMobileDrawers(els);

    CuroaHospitals.renderSidebar(document.getElementById("hosp-list"));
  }

  function normalizeRemote(conv) {
    return {
      id: conv.id,
      title: conv.title || "New conversation",
      updated_at: conv.updated_at,
      messages: conv.messages || [],
      remote: true,
    };
  }

  function getEls() {
    return {
      convList: document.getElementById("conversation-list"),
      chatScroll: document.getElementById("chat-scroll"),
      composerForm: document.getElementById("composer-form"),
      textarea: document.getElementById("composer-input"),
      sendBtn: document.getElementById("send-btn"),
      newChatBtn: document.getElementById("new-chat-btn"),
      topbarTitle: document.getElementById("topbar-title"),
      exampleGrid: document.getElementById("example-grid"),
      sidebarToggle: document.getElementById("sidebar-toggle"),
      hospToggle: document.getElementById("hosp-toggle"),
      sideConversations: document.querySelector(".side-conversations"),
      sideHospitals: document.querySelector(".side-hospitals"),
      overlay: document.getElementById("drawer-overlay"),
    };
  }

  // ---------------- Sidebar: conversation list ----------------
  function renderConversationList(els) {
    if (!els.convList) return;
    if (!state.conversations.length) {
      els.convList.innerHTML = `<div style="padding:16px 10px;font-size:13px;color:var(--color-ink-faint);">No conversations yet. Start a new chat to ask about a symptom or health question.</div>`;
      return;
    }

    const sorted = [...state.conversations].sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));

    els.convList.innerHTML = `
      <div class="conv-group-label">Recent</div>
      ${sorted.map((c) => `
        <div class="conv-item ${c.id === state.activeId ? "active" : ""}" data-id="${c.id}">
          ${chatIcon()}
          <span>${escapeHtml(c.title || "New conversation")}</span>
          <button class="conv-delete" data-delete="${c.id}" aria-label="Delete conversation">${trashIcon()}</button>
        </div>
      `).join("")}
    `;

    els.convList.querySelectorAll(".conv-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        if (e.target.closest("[data-delete]")) return;
        openConversation(item.dataset.id, els);
        closeMobileDrawers(els);
      });
    });

    els.convList.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        await deleteConversation(btn.dataset.delete, els);
      });
    });
  }

  async function deleteConversation(id, els) {
    state.conversations = state.conversations.filter((c) => String(c.id) !== String(id));
    saveLocalConversations();
    if (CuroaAPI.isLoggedIn()) {
      CuroaAPI.deleteConversation(id).catch(() => null);
    }
    if (state.activeId === id) {
      state.activeId = null;
      showWelcome(els);
    }
    renderConversationList(els);
  }

  function openConversation(id, els) {
    state.activeId = id;
    const conv = state.conversations.find((c) => String(c.id) === String(id));
    if (!conv) return;
    els.topbarTitle.textContent = conv.title || "New conversation";
    renderMessages(conv.messages, els);
    renderConversationList(els);
  }

  // ---------------- Welcome / example prompts ----------------
  function showWelcome(els) {
    els.topbarTitle.textContent = "New conversation";
    els.chatScroll.innerHTML = `
      <div class="chat-column">
        <div class="chat-welcome" id="welcome-block">
          <div class="welcome-mark"><img src="assets/logo.svg" alt=""></div>
          <h1>Understand your health.</h1>
          <p class="tagline">Ask about a symptom, get general guidance on possible causes and self-care, and know when it's time to see a doctor. Curoa.AI is here to help you take the next step.</p>
          <div class="example-grid" id="example-grid"></div>
        </div>
      </div>
    `;
    renderExamplePrompts(getEls());
  }

  function renderExamplePrompts(els) {
    const grid = document.getElementById("example-grid");
    if (!grid) return;
    grid.innerHTML = EXAMPLE_PROMPTS.map((ex) => `
      <button class="example-card" data-prompt="${escapeAttr(ex.title)}">
        <div class="ex-icon">${symptomIcon(ex.icon)}</div>
        <div class="ex-title">${escapeHtml(ex.title)}</div>
        <div class="ex-sub">${escapeHtml(ex.sub)}</div>
      </button>
    `).join("");

    grid.querySelectorAll(".example-card").forEach((card) => {
      card.addEventListener("click", () => {
        const textarea = document.getElementById("composer-input");
        textarea.value = card.dataset.prompt;
        textarea.dispatchEvent(new Event("input"));
        document.getElementById("composer-form").requestSubmit();
      });
    });
  }

  // ---------------- Message rendering ----------------
  function renderMessages(messages, els) {
    els.chatScroll.innerHTML = `<div class="chat-column" id="message-column"></div>`;
    const col = document.getElementById("message-column");
    messages.forEach((m) => col.appendChild(buildMessageEl(m)));
    scrollToBottom(els);
  }

  function buildMessageEl(m) {
    const wrap = document.createElement("div");
    wrap.className = `msg ${m.role}`;
    wrap.innerHTML = `
      <div class="msg-avatar">${m.role === "user" ? "You" : `<img src="assets/logo.svg" alt="" style="width:16px;height:16px;filter:brightness(0) invert(1)">`}</div>
      <div>
        <div class="msg-bubble">${formatContent(m.content)}</div>
        <div class="msg-meta">${m.role === "user" ? "You" : "Curoa.AI"} · ${formatTime(m.created_at)}</div>
      </div>
    `;
    return wrap;
  }

  function formatContent(content) {
    return escapeHtml(content).split("\n\n").map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
  }

  function formatTime(ts) {
    const d = ts ? new Date(ts) : new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function scrollToBottom(els) {
    requestAnimationFrame(() => { els.chatScroll.scrollTop = els.chatScroll.scrollHeight; });
  }

  // ---------------- Composer ----------------
  function wireComposer(els) {
    els.textarea.addEventListener("input", () => {
      els.textarea.style.height = "auto";
      els.textarea.style.height = Math.min(els.textarea.scrollHeight, 160) + "px";
      els.sendBtn.disabled = !els.textarea.value.trim();
    });

    els.textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        els.composerForm.requestSubmit();
      }
    });

    els.composerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = els.textarea.value.trim();
      if (!text) return;
      els.textarea.value = "";
      els.textarea.style.height = "auto";
      els.sendBtn.disabled = true;
      await handleSend(text, els);
    });
  }

  async function handleSend(text, els) {
    let conv = state.conversations.find((c) => String(c.id) === String(state.activeId));
    if (!conv) {
      conv = { id: uid(), title: deriveTitle(text), messages: [], updated_at: new Date().toISOString() };
      state.conversations.unshift(conv);
      state.activeId = conv.id;
      els.chatScroll.innerHTML = `<div class="chat-column" id="message-column"></div>`;
    }

    const userMsg = { role: "user", content: text, created_at: new Date().toISOString() };
    conv.messages.push(userMsg);
    conv.updated_at = userMsg.created_at;
    els.topbarTitle.textContent = conv.title;

    document.getElementById("message-column")?.appendChild(buildMessageEl(userMsg));
    scrollToBottom(els);
    renderConversationList(els);
    saveLocalConversations();

    const typingEl = appendTypingIndicator();
    scrollToBottom(els);

    try {
      const response = await CuroaAPI.sendChatMessage({
        conversation_id: conv.remote ? conv.id : undefined,
        message: text,
      });
      typingEl.remove();

      const assistantMsg = {
        role: "assistant",
        content: response?.reply || "Curoa.AI's medical assistant is currently being developed. This space is ready for it — check back soon.",
        created_at: new Date().toISOString(),
      };
      conv.messages.push(assistantMsg);
      document.getElementById("message-column")?.appendChild(buildMessageEl(assistantMsg));
    } catch (err) {
      typingEl.remove();
      const assistantMsg = {
        role: "assistant",
        content: "Curoa.AI's chatbot is currently being developed. This is a placeholder response — the medical AI will be connected here soon. In the meantime, if you're experiencing severe or emergency symptoms, please contact a doctor or emergency services right away.",
        created_at: new Date().toISOString(),
      };
      conv.messages.push(assistantMsg);
      document.getElementById("message-column")?.appendChild(buildMessageEl(assistantMsg));
    } finally {
      scrollToBottom(els);
      saveLocalConversations();
    }
  }

  function appendTypingIndicator() {
    const col = document.getElementById("message-column");
    const el = document.createElement("div");
    el.className = "msg assistant";
    el.innerHTML = `
      <div class="msg-avatar"><img src="assets/logo.svg" alt="" style="width:16px;height:16px;filter:brightness(0) invert(1)"></div>
      <div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>
    `;
    col.appendChild(el);
    return el;
  }

  function deriveTitle(text) {
    const clean = text.trim().replace(/\s+/g, " ");
    return clean.length > 42 ? clean.slice(0, 42) + "…" : clean;
  }

  // ---------------- New chat ----------------
  function wireNewChat(els) {
    els.newChatBtn.addEventListener("click", () => {
      state.activeId = null;
      showWelcome(els);
      renderConversationList(els);
      closeMobileDrawers(els);
    });
  }

  // ---------------- Mobile drawers ----------------
  function wireMobileDrawers(els) {
    els.sidebarToggle?.addEventListener("click", () => {
      els.sideConversations.classList.toggle("open");
      els.overlay.classList.add("show");
    });
    els.hospToggle?.addEventListener("click", () => {
      els.sideHospitals.classList.toggle("open");
      els.overlay.classList.add("show");
    });
    els.overlay?.addEventListener("click", () => closeMobileDrawers(els));
  }

  function closeMobileDrawers(els) {
    els.sideConversations?.classList.remove("open");
    els.sideHospitals?.classList.remove("open");
    els.overlay?.classList.remove("show");
  }

  // ---------------- tiny helpers ----------------
  function escapeHtml(str = "") {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function escapeAttr(str = "") { return escapeHtml(str).replace(/"/g, "&quot;"); }
  function chatIcon() { return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`; }
  function trashIcon() { return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6z"/></svg>`; }
  function symptomIcon(kind) {
    const icons = {
      cough: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 12a4 4 0 1 1 8 0c0 3-4 5-4 9M4 21c1-1 2-2 2-4"/></svg>`,
      fever: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 4v10.5a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0z"/></svg>`,
      skin: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1"/><circle cx="14" cy="14" r="1.2"/><circle cx="15" cy="9" r="0.8"/></svg>`,
      stomach: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3v6a3 3 0 0 0 3 3 3 3 0 0 1 3 3c0 3-2 6-6 6-4 0-6-3-6-6"/></svg>`,
    };
    return icons[kind] || icons.cough;
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.page === "app") CuroaChat.init();
});
