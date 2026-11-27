/* =========================================================
   Live AI Clinic Receptionist demo (Messenger-style widget)
   Talks to an n8n webhook so visitors can test the real agent.
   ========================================================= */
(() => {
  'use strict';

  /* =======================================================================
     n8n WEBHOOK URL
     - Paste the Production URL of the n8n "Portfolio Demo" webhook here,
       e.g. 'https://YOUR-N8N-DOMAIN/webhook/clinic-demo'
     - Leave blank ('') to hide the live demo (nothing shows on the site).
     Request:  POST JSON { sessionId, message, source: 'portfolio' }
     Response: JSON { reply: "..." }  (also accepts { output } or [{ output }])
     ======================================================================= */
  const CHAT_ENDPOINT = '';

  const MAX_CHARS = 300;          // per message
  const MAX_MESSAGES = 25;        // per browser session (keeps AI costs bounded)
  const TIMEOUT_MS = 45000;

  const params = new URLSearchParams(location.search);
  const endpoint = params.get('chatEndpoint') && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    ? params.get('chatEndpoint')
    : CHAT_ENDPOINT;
  if (!endpoint) return;

  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch { /* storage unavailable */ } }
  };
  let sessionId = store.get('clinic-demo-session');
  if (!sessionId) {
    sessionId = 'web-' + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
    store.set('clinic-demo-session', sessionId);
  }
  let sent = +(store.get('clinic-demo-count') || 0);

  const suggestions = [
    'What are your clinic hours?',
    'What services do you offer?',
    'Book a teeth cleaning tomorrow at 10 AM',
    'Show my bookings'
  ];

  /* ---------- Build UI ---------- */
  const root = document.createElement('div');
  root.className = 'cc';
  root.innerHTML = `
    <button class="cc-launch" type="button" aria-expanded="false" aria-controls="cc-panel">
      <span class="cc-launch-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 0C5.24 0 0 4.952 0 11.64c0 3.499 1.434 6.521 3.769 8.61a.96.96 0 0 1 .323.683l.065 2.135a.96.96 0 0 0 1.347.85l2.381-1.053a.96.96 0 0 1 .641-.046A13 13 0 0 0 12 23.28c6.76 0 12-4.952 12-11.64S18.76 0 12 0m6.806 7.44c.522-.03.971.567.63 1.094l-4.178 6.457a.707.707 0 0 1-.977.208l-3.87-2.504a.44.44 0 0 0-.49.007l-4.363 3.01c-.637.438-1.415-.317-.995-.966l4.179-6.457a.706.706 0 0 1 .977-.21l3.87 2.505c.15.097.344.094.491-.007l4.362-3.008a.7.7 0 0 1 .364-.13" fill="#fff"/></svg></span>
      <span class="cc-launch-text"><b>Test my AI receptionist</b><small>Live n8n agent · try it now</small></span>
    </button>
    <section class="cc-panel" id="cc-panel" role="dialog" aria-label="AI clinic receptionist live demo" hidden>
      <header class="cc-head">
        <span class="cc-avatar" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 0C5.24 0 0 4.952 0 11.64c0 3.499 1.434 6.521 3.769 8.61a.96.96 0 0 1 .323.683l.065 2.135a.96.96 0 0 0 1.347.85l2.381-1.053a.96.96 0 0 1 .641-.046A13 13 0 0 0 12 23.28c6.76 0 12-4.952 12-11.64S18.76 0 12 0m6.806 7.44c.522-.03.971.567.63 1.094l-4.178 6.457a.707.707 0 0 1-.977.208l-3.87-2.504a.44.44 0 0 0-.49.007l-4.363 3.01c-.637.438-1.415-.317-.995-.966l4.179-6.457a.706.706 0 0 1 .977-.21l3.87 2.505c.15.097.344.094.491-.007l4.362-3.008a.7.7 0 0 1 .364-.13" fill="#fff"/></svg></span>
        <div class="cc-title"><strong>Clinic Assistant</strong><small><i></i>Live demo · powered by n8n</small></div>
        <button class="cc-close" type="button" aria-label="Close chat">×</button>
      </header>
      <div class="cc-note">This is my real n8n AI agent running on a <b>sandbox clinic</b>. Bookings go to a demo calendar, so no real appointments are made.</div>
      <div class="cc-log" role="log" aria-live="polite"></div>
      <div class="cc-chips"></div>
      <form class="cc-form" autocomplete="off">
        <label class="sr-only" for="cc-input">Message the clinic assistant</label>
        <input id="cc-input" class="cc-input" type="text" maxlength="${MAX_CHARS}" placeholder="Ask about hours, or book a visit…" required>
        <button class="cc-send" type="submit" aria-label="Send"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z" fill="currentColor"/></svg></button>
      </form>
    </section>`;
  document.body.appendChild(root);

  const $ = s => root.querySelector(s);
  const launch = $('.cc-launch');
  const panel = $('.cc-panel');
  const log = $('.cc-log');
  const chips = $('.cc-chips');
  const form = $('.cc-form');
  const input = $('.cc-input');
  const sendBtn = $('.cc-send');
  let busy = false;
  let greeted = false;

  const add = (who, text) => {
    const el = document.createElement('div');
    el.className = `cc-msg ${who}`;
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  };

  const renderChips = () => {
    chips.innerHTML = '';
    suggestions.forEach(t => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cc-chip';
      b.textContent = t;
      b.addEventListener('click', () => send(t));
      chips.appendChild(b);
    });
  };

  const open = () => {
    panel.hidden = false;
    root.classList.add('is-open');
    launch.setAttribute('aria-expanded', 'true');
    if (!greeted) {
      greeted = true;
      add('bot', 'Hi! 👋 I’m the clinic’s AI assistant. I can answer questions, check availability, and book, cancel, or reschedule appointments. How can I help?');
      renderChips();
    }
    setTimeout(() => input.focus(), 60);
  };
  const close = () => {
    root.classList.remove('is-open');
    launch.setAttribute('aria-expanded', 'false');
    panel.hidden = true;
    launch.focus();
  };

  const readReply = async res => {
    const raw = await res.text();
    try {
      let data = JSON.parse(raw);
      if (Array.isArray(data)) data = data[0] || {};
      return data.reply || data.output || data.text || data.message || '';
    } catch {
      return raw;
    }
  };

  async function send(text) {
    text = (text || '').trim().slice(0, MAX_CHARS);
    if (!text || busy) return;
    if (sent >= MAX_MESSAGES) {
      add('sys', 'You’ve reached the demo limit for this session. Want to see it built for your business? Book a discovery call below.');
      return;
    }
    busy = true;
    chips.innerHTML = '';
    input.value = '';
    sendBtn.disabled = true;
    add('user', text);
    sent += 1;
    store.set('clinic-demo-count', String(sent));

    const typing = add('bot typing', '');
    typing.innerHTML = '<i></i><i></i><i></i>';
    typing.setAttribute('aria-label', 'Assistant is typing');

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: text, source: 'portfolio' }),
        signal: ctrl.signal
      });
      if (res.status === 429) throw new Error('busy');
      if (!res.ok) throw new Error('http');
      const reply = (await readReply(res)).trim();
      typing.remove();
      add('bot', reply || 'Sorry, I didn’t catch that. Could you rephrase?');
    } catch (err) {
      typing.remove();
      add('sys', err.message === 'busy'
        ? 'The demo is getting a lot of visitors right now. Please try again in a minute.'
        : 'The demo agent is taking a short break. Please try again in a moment, or book a discovery call below.');
    } finally {
      clearTimeout(timer);
      busy = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  launch.addEventListener('click', () => (root.classList.contains('is-open') ? close() : open()));
  $('.cc-close').addEventListener('click', close);
  form.addEventListener('submit', e => { e.preventDefault(); send(input.value); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && root.classList.contains('is-open')) close(); });

  /* "Try it live" button on the featured project card */
  document.querySelectorAll('[data-open-chat]').forEach(btn => {
    btn.hidden = false;
    const go = e => { e.preventDefault(); e.stopPropagation(); open(); };
    btn.addEventListener('click', go);
    btn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') go(e); });
  });

  /* Gentle nudge once the visitor has scrolled to the featured build */
  const featured = document.querySelector('.flagship');
  if (featured && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { root.classList.add('nudge'); io.disconnect(); }
    }, { threshold: .4 });
    io.observe(featured);
  }
})();
