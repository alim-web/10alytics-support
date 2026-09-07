(() => {
  'use strict';

  const ORANGE = '#DA6727';
  const STORAGE_SESSION = '10alytics_support_session';
  const STORAGE_MESSAGES = '10alytics_support_messages_v1';
  const STORAGE_CONVERSATIONS = '10alytics_support_conversations_v1';

  const params = new URLSearchParams(window.location.search);
  const apiUrl = params.get('api') || window.TenAlyticsWidgetConfig?.apiUrl || '';
  const welcomeMessage = params.get('welcome') || 'Hi 👋 Welcome to 10Alytics Support. How can I help you today?';

  const $ = (id) => document.getElementById(id);
  const historyScreen = $('historyScreen');
  const chatScreen = $('chatScreen');
  const conversationList = $('conversationList');
  const historyEmpty = $('historyEmpty');
  const messagesEl = $('messages');
  const typingRow = $('typingRow');
  const composer = $('composer');
  const input = $('messageInput');
  const sendButton = $('sendButton');
  const escalationBanner = $('escalationBanner');
  const menuPopover = $('menuPopover');

  let sessionId = localStorage.getItem(STORAGE_SESSION) || '';
  let messages = loadJSON(STORAGE_MESSAGES, []);
  let conversations = loadJSON(STORAGE_CONVERSATIONS, []);
  let status = 'open';
  let sending = false;

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_MESSAGES, JSON.stringify(messages));
    localStorage.setItem(STORAGE_CONVERSATIONS, JSON.stringify(conversations));
    if (sessionId) localStorage.setItem(STORAGE_SESSION, sessionId);
  }

  function newSessionId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID().replaceAll('-', '');
    return `10a_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  }

  function formatTime(date = new Date()) {
    return new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit' }).format(date);
  }

  function formatDate(date = new Date()) {
    return new Intl.DateTimeFormat([], { month: 'short', day: 'numeric' }).format(date);
  }

  function escapeHtml(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function linkify(text = '') {
    const safe = escapeHtml(text);
    return safe.replace(/(https?:\/\/[^\s<]+)/g, '<a class="message-link" href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  function renderHistory() {
    conversationList.innerHTML = '';
    const items = conversations.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    historyEmpty.classList.toggle('hidden', items.length > 0);

    items.forEach((conv) => {
      const card = document.createElement('div');
      card.className = 'conversation-card';
      card.innerHTML = `
        <img class="avatar" src="./assets/10alytics-logo.png" alt="10Alytics" />
        <div class="summary">
          <strong>Started ${escapeHtml(conv.startedLabel || '')}</strong>
          <p>${escapeHtml(conv.preview || '10Alytics Support conversation')}</p>
          ${conv.status === 'resolved' || conv.status === 'escalated' ? `<span class="status-pill">${conv.status === 'resolved' ? 'Ended' : 'With support team'}</span>` : ''}
        </div>
        <time>${escapeHtml(conv.dateLabel || '')}</time>
      `;
      card.addEventListener('click', () => openConversation(conv.sessionId));
      conversationList.appendChild(card);
    });
  }

  function renderMessages() {
    messagesEl.innerHTML = '';
    messages.forEach((msg) => appendMessageNode(msg));
    scrollToBottom();
  }

  function appendMessageNode(msg) {
    const row = document.createElement('div');
    row.className = `message-row ${msg.role === 'user' ? 'user' : 'assistant'}`;

    if (msg.role !== 'user') {
      const avatar = document.createElement('img');
      avatar.className = 'message-avatar';
      avatar.src = './assets/10alytics-logo.png';
      avatar.alt = '10Alytics';
      row.appendChild(avatar);
    }

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = `${linkify(msg.text || '')}<span class="message-time">${escapeHtml(msg.time || '')}</span>`;

    if (msg.image) {
      const img = document.createElement('img');
      img.className = 'message-image';
      img.src = msg.image;
      img.alt = msg.imageAlt || '10Alytics support guide';
      img.loading = 'lazy';
      bubble.insertBefore(img, bubble.querySelector('.message-time'));
    }

    row.appendChild(bubble);
    messagesEl.appendChild(row);
  }

  function addMessage(role, text, image = '', imageAlt = '') {
    const msg = { role, text, image, imageAlt, time: formatTime(), createdAt: Date.now() };
    messages.push(msg);
    appendMessageNode(msg);
    updateConversationPreview(text, role);
    saveState();
    scrollToBottom();
  }

  function updateConversationPreview(text, role) {
    if (!sessionId) return;
    let conv = conversations.find((c) => c.sessionId === sessionId);
    if (!conv) {
      const now = new Date();
      conv = {
        sessionId,
        startedAt: Date.now(),
        startedLabel: `${formatDate(now)} at ${formatTime(now)}`,
        dateLabel: formatDate(now),
        preview: '',
        status: 'open',
        updatedAt: Date.now()
      };
      conversations.push(conv);
    }
    conv.preview = `${role === 'assistant' ? '10Alytics: ' : 'You: '}${String(text || '').slice(0, 96)}`;
    conv.updatedAt = Date.now();
    conv.status = status;
  }

  function openConversation(id) {
    if (id !== sessionId) {
      // The current lightweight package persists one active transcript locally.
      // Server-backed history can be loaded here later if needed.
      sessionId = id;
      localStorage.setItem(STORAGE_SESSION, id);
    }
    showChat();
    renderMessages();
  }

  function startNewConversation() {
    sessionId = newSessionId();
    messages = [];
    status = 'open';
    localStorage.setItem(STORAGE_SESSION, sessionId);
    saveState();
    showChat();
    renderMessages();
    addMessage('assistant', welcomeMessage);
    setTimeout(() => input.focus(), 120);
  }

  function showHistory() {
    chatScreen.classList.add('hidden');
    historyScreen.classList.remove('hidden');
    renderHistory();
  }

  function showChat() {
    historyScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
    applyStatus();
  }

  function applyStatus() {
    const escalated = status === 'escalated';
    escalationBanner.classList.toggle('hidden', !escalated);
    input.disabled = escalated;
    sendButton.disabled = escalated;
    input.placeholder = escalated ? 'Waiting for support team...' : 'Type your message...';
  }

  function setSending(value) {
    sending = value;
    typingRow.classList.toggle('hidden', !value);
    sendButton.disabled = value || status === 'escalated';
    input.disabled = value || status === 'escalated';
    if (!value && status !== 'escalated') input.focus();
    scrollToBottom();
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  function autosize() {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 96)}px`;
  }

  function normalizeResponse(data) {
    if (typeof data === 'string') return { message: data, image: '', status: 'open' };
    if (Array.isArray(data)) data = data[0] || {};
    data = data || {};

    return {
      message:
        data.message ??
        data.assistant_response ??
        data.response ??
        data.text ??
        data.output ??
        'Thanks. I received your message.',
      image:
        data.image ??
        data.image_url ??
        data.selected_image?.url ??
        '',
      imageAlt:
        data.image_alt ??
        data.selected_image?.alt ??
        '',
      status: data.status ?? 'open',
      sessionId: data.sessionId ?? data.session_id ?? sessionId
    };
  }

  async function sendToApi(text) {
    if (!apiUrl) {
      // Development/demo mode: keeps the widget fully usable before the n8n URL is inserted.
      await new Promise((r) => setTimeout(r, 700));
      return {
        message: 'The widget is ready. Add your n8n webhook URL to connect me to the live 10Alytics support workflow.',
        image: '',
        status: 'open'
      };
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        message: text,
        chatInput: text,
        channel: 'web_widget',
        pageUrl: window.parent !== window ? document.referrer : window.location.href,
        timestamp: new Date().toISOString()
      })
    });

    const bodyText = await response.text();
    let payload = bodyText;
    try { payload = bodyText ? JSON.parse(bodyText) : {}; } catch (_) {}

    if (!response.ok) {
      const detail = typeof payload === 'string' ? payload : payload?.message || payload?.error || `HTTP ${response.status}`;
      throw new Error(detail);
    }

    return normalizeResponse(payload);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (sending || status === 'escalated') return;
    const text = input.value.trim();
    if (!text) return;

    if (!sessionId) sessionId = newSessionId();
    input.value = '';
    autosize();
    addMessage('user', text);
    setSending(true);

    try {
      const result = await sendToApi(text);
      if (result.sessionId) {
        sessionId = result.sessionId;
        localStorage.setItem(STORAGE_SESSION, sessionId);
      }
      status = result.status || status || 'open';
      addMessage('assistant', result.message, result.image, result.imageAlt);
      updateCurrentConversationStatus();
    } catch (error) {
      addMessage('assistant', 'I couldn’t connect to support just now. Please try again in a moment.');
      console.error('[10Alytics Support Widget]', error);
    } finally {
      setSending(false);
      applyStatus();
      saveState();
    }
  }

  function updateCurrentConversationStatus() {
    const conv = conversations.find((c) => c.sessionId === sessionId);
    if (conv) {
      conv.status = status;
      conv.updatedAt = Date.now();
    }
  }

  function clearHistory() {
    sessionId = '';
    messages = [];
    conversations = [];
    status = 'open';
    localStorage.removeItem(STORAGE_SESSION);
    localStorage.removeItem(STORAGE_MESSAGES);
    localStorage.removeItem(STORAGE_CONVERSATIONS);
    menuPopover.classList.add('hidden');
    showHistory();
  }

  $('newConversationButton').addEventListener('click', startNewConversation);
  $('backButton').addEventListener('click', showHistory);
  composer.addEventListener('submit', handleSubmit);
  input.addEventListener('input', autosize);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      composer.requestSubmit();
    }
  });

  $('menuButton').addEventListener('click', () => menuPopover.classList.toggle('hidden'));
  $('menuNewConversation').addEventListener('click', () => {
    menuPopover.classList.add('hidden');
    startNewConversation();
  });
  $('menuClearHistory').addEventListener('click', clearHistory);
  document.addEventListener('click', (event) => {
    if (!menuPopover.contains(event.target) && event.target !== $('menuButton')) {
      menuPopover.classList.add('hidden');
    }
  });

  // Parent page can open/start the widget through postMessage.
  window.addEventListener('message', (event) => {
    if (event.data?.type === '10A_WIDGET_NEW_CONVERSATION') startNewConversation();
    if (event.data?.type === '10A_WIDGET_SHOW_HISTORY') showHistory();
  });

  document.documentElement.style.setProperty('--orange', ORANGE);
  renderHistory();
  if (sessionId && messages.length) {
    showHistory();
  } else {
    showHistory();
  }
})();
