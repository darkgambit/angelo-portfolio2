/* =========================================================
   Angelo De Ocampo — Portfolio Interactions
   Connected Blueprint · Interactive Roadmap · Private Booking
   ========================================================= */
(() => {
  'use strict';

  /* Optional: After your first test submission, FormSubmit emails you an
     activation link + a random anonymous string. You can optionally paste
     that random string (or any n8n / Make / Apps Script webhook URL) here. */
  const ENDPOINT_OVERRIDE = '';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const body = document.body;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

  /* ---------------------------------------------------------
     1. Calm Hero Rotator + Live Pipeline Ticker
  --------------------------------------------------------- */
  const rotItems = $$('.rot-item');
  if (rotItems.length > 1 && !reduceMotion) {
    let ri = 0;
    setInterval(() => {
      const cur = rotItems[ri];
      ri = (ri + 1) % rotItems.length;
      const next = rotItems[ri];
      cur.classList.remove('is-active');
      cur.classList.add('is-leaving');
      next.classList.remove('is-leaving');
      next.classList.add('is-active');
      setTimeout(() => cur.classList.remove('is-leaving'), 700);
    }, 3400);
  }

  const liveText = $('.live-text');
  if (liveText && !reduceMotion) {
    const events = [
      'Dental clinic AI · Appointment booked',
      'Asana → Xero report synced',
      'Job scraper → CV tailored via n8n',
      '3 email attachments standardized',
      'Excel VBA & Sheets tracker updated',
      'RAG index · Vectors synced'
    ];
    let ei = 0;
    setInterval(() => {
      liveText.classList.add('out');
      setTimeout(() => {
        ei = (ei + 1) % events.length;
        liveText.textContent = events[ei];
        liveText.classList.remove('out');
      }, 340);
    }, 3200);
  }

  /* ---------------------------------------------------------
     2. Navigation, Mobile Drawer, Scrollspy & Workflow Rail
  --------------------------------------------------------- */
  const header = $('.site-header');
  const menuBtn = $('.menu-toggle');
  const nav = $('.nav-links');
  const navInd = $('.nav-indicator');
  const navLinks = $$('.nav-links a');
  const railDots = $$('.rail-dot');
  const railFill = $('.rail-fill');
  const topBar = $('.scroll-progress i');

  const setMenu = open => {
    if (!nav || !menuBtn) return;
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  };
  menuBtn?.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  navLinks.forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav?.classList.contains('open')) {
      setMenu(false);
      menuBtn.focus();
    }
  });
  document.addEventListener('click', e => {
    if (nav?.classList.contains('open') && !nav.contains(e.target) && !menuBtn.contains(e.target)) {
      setMenu(false);
    }
  });

  const moveNavIndicator = el => {
    if (!navInd) return;
    if (!el) { navInd.style.opacity = '0'; return; }
    navInd.style.opacity = '1';
    navInd.style.width = `${el.offsetWidth}px`;
    navInd.style.transform = `translateX(${el.offsetLeft}px)`;
  };

  const setActiveSection = id => {
    let activeNav = null;
    navLinks.forEach(a => {
      const match = a.getAttribute('href') === `#${id}`;
      a.classList.toggle('active', match);
      if (match) activeNav = a;
    });
    moveNavIndicator(activeNav);
    railDots.forEach(d => d.classList.toggle('active', d.dataset.rail === id));
  };

  const trackedSections = $$('main section[id]');
  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) setActiveSection(e.target.id);
    });
  }, { rootMargin: '-38% 0px -54%' });
  trackedSections.forEach(s => spy.observe(s));

  const heroSec = $('.hero');
  if (heroSec) {
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && e.intersectionRatio > .45) setActiveSection('top');
    }, { threshold: [.45] }).observe(heroSec);
  }
  addEventListener('resize', () => moveNavIndicator($('.nav-links a.active')));

  /* Scroll-driven top bar, workflow rail & career timeline */
  const timeline = $('#career-timeline');
  const timelineItems = $$('.timeline-item', timeline || document);
  let lastY = scrollY, scrollTick = false;

  const onScroll = () => {
    const y = scrollY;
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const ratio = clamp(y / max, 0, 1);

    if (topBar) topBar.style.transform = `scaleX(${ratio})`;
    if (railFill) railFill.style.transform = `scaleY(${ratio})`;

    header?.classList.toggle('scrolled', y > 16);
    if (!nav?.classList.contains('open')) {
      header?.classList.toggle('is-hidden', y > lastY && y > 520);
    }
    lastY = y;

    if (timeline) {
      const r = timeline.getBoundingClientRect();
      const p = clamp((innerHeight * .62 - r.top) / r.height, 0, 1);
      timeline.style.setProperty('--p', p.toFixed(4));
      const lineY = r.top + p * r.height;
      timelineItems.forEach(item => {
        const dot = $('.time-dot', item)?.getBoundingClientRect();
        if (dot) item.classList.toggle('passed', dot.top < lineY);
      });
    }
    scrollTick = false;
  };
  addEventListener('scroll', () => {
    if (!scrollTick) { scrollTick = true; requestAnimationFrame(onScroll); }
  }, { passive: true });

  /* ---------------------------------------------------------
     3. Reveal on Scroll & Count-up Metrics
  --------------------------------------------------------- */
  const revealObs = new IntersectionObserver(entries => {
    const visible = entries.filter(e => e.isIntersecting);
    visible.forEach((e, i) => {
      if (!e.target.style.getPropertyValue('--rd')) {
        e.target.style.setProperty('--rd', `${i * 75}ms`);
      }
      e.target.classList.add('visible');
      revealObs.unobserve(e.target);
    });
  }, { threshold: .12, rootMargin: '0px 0px -5% 0px' });
  $$('.reveal').forEach(el => revealObs.observe(el));

  const fmt = n => n.toLocaleString('en-US');
  const countObs = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const target = +el.dataset.count;
    const pre = el.dataset.prefix || '';
    const suf = el.dataset.suffix || '';
    countObs.unobserve(el);
    if (reduceMotion) { el.textContent = pre + fmt(target) + suf; return; }
    const dur = target > 100 ? 1500 : 1100;
    const t0 = performance.now();
    const tick = now => {
      const p = Math.min((now - t0) / dur, 1);
      el.textContent = pre + fmt(Math.round(target * (1 - Math.pow(1 - p, 4)))) + suf;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { threshold: .55 });
  $$('[data-count]').forEach(el => countObs.observe(el));

  /* ---------------------------------------------------------
     4. Interactive 4-Stage Delivery Roadmap
  --------------------------------------------------------- */
  const roadmapData = [
    {
      fill: .125,
      input: 'Current SOPs, spreadsheets, recurring bottlenecks, and stakeholder pain points.',
      control: 'Identify edge cases, compliance risks, duplicate entry points, and data-integrity gaps.',
      output: 'Visual workflow blueprint + prioritized ROI baseline before build begins.'
    },
    {
      fill: .38,
      input: 'Approved workflow map, API credentials scope, and target data structures.',
      control: 'Define validation rules, staging schemas, least-privilege access, and approval gates.',
      output: 'Modular system architecture across n8n, Make, Zapier, databases, and AI models.'
    },
    {
      fill: .64,
      input: 'Architecture spec, connected business apps (Xero, Asana, Drive, CRM), and test records.',
      control: 'Idempotency checks, structured AI output parsing, retry logic, and staging cleanup.',
      output: 'End-to-end automated pipeline tested against real-world exceptions.'
    },
    {
      fill: 1,
      input: 'Live workflow executions, run telemetry, and operating team handoff.',
      control: 'Automated error routing, execution audit trails, and clear SOP documentation.',
      output: 'Audit-ready, measurable automation your team can operate and scale with confidence.'
    }
  ];

  const rmSteps = $$('.rm-step');
  const rmFill = $('#roadmap-fill');
  const rmDetail = $('#roadmap-detail');
  const rdInput = $('#rd-input');
  const rdControl = $('#rd-control');
  const rdOutput = $('#rd-output');
  let activeStage = 0;
  let rmPaused = false;
  let rmVisible = false;

  function selectRoadmapStage(index) {
    const d = roadmapData[index];
    if (!d) return;
    activeStage = index;
    rmSteps.forEach((btn, i) => {
      const on = i === index;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', String(on));
    });
    if (rmFill) rmFill.style.transform = `scaleX(${d.fill})`;
    if (rmDetail && rdInput && rdControl && rdOutput) {
      rmDetail.classList.add('is-swapping');
      setTimeout(() => {
        rdInput.textContent = d.input;
        rdControl.textContent = d.control;
        rdOutput.textContent = d.output;
        rmDetail.classList.remove('is-swapping');
      }, reduceMotion ? 0 : 140);
    }
  }

  rmSteps.forEach((btn, i) => {
    btn.addEventListener('click', () => { rmPaused = true; selectRoadmapStage(i); });
    btn.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); const n = (i + 1) % rmSteps.length; rmSteps[n].focus(); selectRoadmapStage(n); rmPaused = true; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); const n = (i - 1 + rmSteps.length) % rmSteps.length; rmSteps[n].focus(); selectRoadmapStage(n); rmPaused = true; }
    });
  });

  const rmShell = $('.roadmap-shell');
  if (rmShell && !reduceMotion) {
    rmShell.addEventListener('pointerenter', () => { rmPaused = true; });
    rmShell.addEventListener('pointerleave', () => { rmPaused = false; });
    new IntersectionObserver(([e]) => { rmVisible = e.isIntersecting; }, { threshold: .35 }).observe(rmShell);
    setInterval(() => {
      if (rmVisible && !rmPaused && !document.hidden) {
        selectRoadmapStage((activeStage + 1) % roadmapData.length);
      }
    }, 4800);
  }

  /* ---------------------------------------------------------
     5. Image Fallbacks (Portrait Monogram + Generated Flow SVG)
  --------------------------------------------------------- */
  function flowSVG(labels, seed = 1) {
    const W = 560, H = 310;
    const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('class', 'flow-fallback');
    svg.setAttribute('aria-hidden', 'true');
    let html = '';
    for (let x = 20; x < W; x += 28) for (let y = 20; y < H; y += 28) html += `<circle class="grid-dot" cx="${x}" cy="${y}" r="1"/>`;
    const cols = Math.max(3, Math.min(labels.length + 1, 5));
    const pts = [];
    const gap = (W - 120) / (cols - 1);
    for (let c = 0; c < cols; c++) {
      const branch = c > 0 && c < cols - 1 && rand() > .45;
      const ys = branch ? [H / 2 - 48, H / 2 + 48] : [H / 2 + (rand() - .5) * 28];
      pts.push(ys.map(y => ({ x: 60 + c * gap, y, label: labels[(c + ys.indexOf(y)) % labels.length] || 'Step' })));
    }
    for (let c = 0; c < cols - 1; c++) {
      pts[c].forEach(a => pts[c + 1].forEach(b => {
        const mx = (a.x + b.x) / 2;
        const d = `M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`;
        html += `<path class="edge" d="${d}"/><path class="edge-flow" d="${d}" style="animation-delay:${-rand() * 2}s"/>`;
      }));
    }
    pts.flat().forEach(p => {
      const label = String(p.label).slice(0, 14);
      const bw = Math.max(70, label.length * 7.2 + 30);
      html += `<g class="node" transform="translate(${p.x - bw / 2},${p.y - 17})"><rect width="${bw}" height="34" rx="10"/><circle cx="14" cy="17" r="4"/><text x="25" y="21">${label}</text></g>`;
    });
    svg.innerHTML = html;
    return svg;
  }

  const tagsFor = el => {
    const card = el.closest('.project-card');
    if (card) return $$('.project-tags span', card).map(s => s.textContent.trim()).filter(Boolean);
    return $$('#modal-tags span').map(s => s.textContent.trim()).filter(Boolean);
  };
  const applyFallback = img => {
    if (img.dataset.failed) return;
    img.dataset.failed = '1';
    if (img.dataset.fallback === 'portrait') {
      img.closest('.portrait-frame')?.classList.add('is-fallback');
    } else {
      const tags = tagsFor(img);
      const seed = [...(img.getAttribute('src') || 'x')].reduce((a, ch) => a + ch.charCodeAt(0), 0);
      img.style.display = 'none';
      img.insertAdjacentElement('afterend', flowSVG(tags.length ? tags : ['Trigger', 'Process', 'Output'], seed));
    }
  };
  $$('img[data-fallback]').forEach(img => {
    if (img.id === 'modal-image') return;
    img.addEventListener('error', () => applyFallback(img));
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) applyFallback(img);
  });

  /* ---------------------------------------------------------
     6. Project Filters & Case-Study Modal
  --------------------------------------------------------- */
  const filterWrap = $('.filters');
  const filters = $$('.filters button');
  const filterInd = $('.filter-indicator');
  const cards = $$('.project-card');

  const placeFilterInd = () => {
    const a = $('.filters button.active');
    if (!a || !filterInd) return;
    filterInd.style.width = `${a.offsetWidth}px`;
    filterInd.style.transform = `translateX(${a.offsetLeft}px)`;
  };
  placeFilterInd();
  addEventListener('resize', placeFilterInd);
  if (filterWrap && window.ResizeObserver) new ResizeObserver(placeFilterInd).observe(filterWrap);
  document.fonts?.ready.then(placeFilterInd);

  let filtering = false;
  filters.forEach(btn => btn.addEventListener('click', async () => {
    if (filtering || btn.classList.contains('active')) return;
    filtering = true;
    filters.forEach(b => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-pressed', String(b === btn));
    });
    placeFilterInd();
    const f = btn.dataset.filter;
    const match = c => f === 'all' || c.dataset.category.split(' ').includes(f);
    const leaving = cards.filter(c => !match(c) && !c.classList.contains('hidden'));
    const entering = cards.filter(c => match(c) && c.classList.contains('hidden'));
    const staying = cards.filter(c => match(c) && !c.classList.contains('hidden'));

    if (reduceMotion) {
      leaving.forEach(c => c.classList.add('hidden'));
      entering.forEach(c => { c.classList.remove('hidden'); c.classList.add('visible'); });
      filtering = false;
      return;
    }
    const first = new Map(staying.map(c => [c, c.getBoundingClientRect()]));
    await Promise.all(leaving.map(c => c.animate(
      [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.95)' }],
      { duration: 220, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' }
    ).finished));
    leaving.forEach(c => { c.classList.add('hidden'); c.getAnimations().forEach(a => a.cancel()); });
    entering.forEach(c => { c.classList.remove('hidden'); c.classList.add('visible'); });
    staying.forEach(c => {
      const a = first.get(c), b = c.getBoundingClientRect();
      const dx = a.left - b.left, dy = a.top - b.top;
      if (dx || dy) c.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: 500, easing: 'cubic-bezier(.22,1,.36,1)' });
    });
    entering.forEach((c, i) => c.animate(
      [{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'none' }],
      { duration: 500, delay: 50 + i * 60, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }
    ));
    setTimeout(() => { filtering = false; }, 260);
  }));

  const cases = {
    xero: {
      title: 'Asana → Xero Bank Transaction Reporting',
      image: 'assets/asana-xero.webp',
      bg: '#f0f0f0',
      alt: 'Make workflow connecting Asana, Xero, Google Sheets, routing, iteration, aggregation, and attachment actions.',
      summary: 'A Make scenario that turns completed Asana work into a structured bank-transaction report and returns the final output to the task.',
      challenge: 'Manual retrieval, formatting, attachment preparation, and staging-sheet cleanup create reporting delays and reconciliation risk.',
      solution: 'Watches completed tasks, calls Xero, routes records, iterates and aggregates data, adds rows to Sheets, attaches the final report to Asana, then clears staging cells.',
      value: 'Estimated 12 hours and $120 in labor saved monthly under moderate volume.'
    },
    content: {
      title: 'AI Content Repurposing Engine',
      image: 'assets/ai-content.webp',
      bg: '#fbfbfa',
      alt: 'Zapier workflow with Google Drive, filters, AI generation, loops, paths, and social publishing actions.',
      summary: 'A Zapier workflow that converts source files into multiple AI-assisted posts and routes outputs to Facebook, LinkedIn, and Instagram.',
      challenge: 'Rewriting one asset into multiple platform formats is repetitive and creates inconsistent publishing cadence.',
      solution: 'A Drive trigger passes qualifying files to AI generation steps, loops through platform-tailored outputs, and routes publishing actions via conditional paths.',
      value: 'Estimated 18 hours and $180 in labor saved monthly, excluding human review and platform fees.'
    },
    leads: {
      title: 'Asana 5-Stage Lead Pipeline Automation',
      image: 'assets/asana-leads.webp',
      bg: '#f7f7f7',
      alt: 'Zapier lead pipeline with five Asana stages and branched follow-up, quotation, approval, and closing actions.',
      summary: 'A five-stage Asana lead system covering Ready to Start, No Response, Quoted, Approved, and Paid & Closed.',
      challenge: 'Manual follow-ups, folder setup, quote reminders, and onboarding handoffs lead to dropped deals and uneven client experience.',
      solution: 'Stage transitions trigger Drive folder creation, timed Gmail follow-ups, conditional filters, AI-assisted replies, and automated welcome workflows.',
      value: 'Estimated 15 hours and $150 in labor saved monthly with consistent pipeline hygiene.'
    },
    video: {
      title: 'AI Video Creation & Publishing',
      image: 'assets/ai-video.webp',
      bg: '#080e16',
      alt: 'n8n AI video workflow from prompt generation and JWT authentication through publishing.',
      summary: 'An end-to-end n8n workflow that generates AI videos and publishes them automatically to YouTube and Facebook.',
      challenge: 'Prompting, token signing, render polling, media conversion, and dual-platform uploads require repetitive manual coordination.',
      solution: 'Schedules structured Gemini prompts, signs a JWT, calls an external video API, monitors status and errors, converts Base64 media, and publishes to both channels.',
      value: 'Estimated 24 hours and $240 in labor saved monthly; external API rendering fees excluded.'
    },
    docs: {
      title: 'Audit-Ready Attachment Renaming & Filing',
      image: 'assets/attachment-filing.webp',
      bg: '#f0f0f0',
      alt: 'Make workflow from Gmail attachment intake through AI naming, Drive upload, Sheets logging, aggregation, and confirmation.',
      summary: 'A document-control scenario that standardizes incoming email attachments and logs every processed file for audit traceability.',
      challenge: 'Manual download, reading, naming, filing, and spreadsheet logging are slow and prone to naming drift.',
      solution: 'Watches Gmail attachments, analyzes contents with AI, generates standardized filenames, archives to Google Drive, logs metadata in Sheets, and sends confirmation.',
      value: 'Estimated 8 hours and $80 in labor saved monthly with audit-grade naming consistency.'
    },
    rag: {
      title: 'Self-Cleaning RAG Knowledge Pipeline',
      image: 'assets/rag-agent.webp',
      bg: '#0f1112',
      alt: 'n8n RAG pipeline using Google Drive, Gemini embeddings, Supabase Vector Store, and automatic cleanup.',
      summary: 'A retrieval-augmented-generation data pipeline that keeps a Supabase vector store continuously synchronized with Google Drive.',
      challenge: 'AI knowledge bases quickly go stale without repeatable ingestion, chunking, embedding, and deleted-file cleanup.',
      solution: 'Drive file events trigger ingestion, Gemini generates embeddings into Supabase Vector Store, and file deletion events purge obsolete vector records.',
      value: 'Estimated 10 hours and $100 in labor saved monthly on recurring knowledge-base upkeep.'
    }
  };

  const modal = $('.project-modal');
  const shell = $('.modal-shell', modal);
  const modalMedia = $('.modal-media', modal);
  let currentCard = null, lastFocus = null;
  const visibleCards = () => cards.filter(c => !c.classList.contains('hidden'));

  function fillCase(card) {
    const c = cases[card?.dataset.project];
    if (!c) return false;
    currentCard = card;
    $('#modal-tags').innerHTML = $$('.project-tags span', card).map(s => `<span>${s.innerHTML}</span>`).join('');
    $$('.flow-fallback', modalMedia).forEach(n => n.remove());
    const mi = $('#modal-image');
    mi.style.display = '';
    mi.style.setProperty('--modal-img-bg', c.bg || 'var(--bg2)');
    delete mi.dataset.failed;
    mi.onerror = () => applyFallback(mi);
    mi.alt = c.alt;
    mi.src = c.image;
    $('#modal-title').textContent = c.title;
    $('#modal-summary').textContent = c.summary;
    $('#modal-challenge').textContent = c.challenge;
    $('#modal-solution').textContent = c.solution;
    $('#modal-value').textContent = c.value;
    const list = visibleCards();
    $('#modal-count').textContent = `${String(list.indexOf(card) + 1).padStart(2, '0')} / ${String(list.length).padStart(2, '0')}`;
    return true;
  }

  function openCase(card) {
    if (!fillCase(card)) return;
    lastFocus = document.activeElement;
    modal.showModal();
    body.classList.add('is-locked');
    requestAnimationFrame(() => modal.classList.add('is-open'));
  }
  function closeCase() {
    if (!modal.open) return;
    modal.classList.remove('is-open');
    const done = () => {
      modal.close();
      body.classList.remove('is-locked');
      lastFocus?.focus?.({ preventScroll: true });
    };
    reduceMotion ? done() : setTimeout(done, 320);
  }
  function stepCase(dir) {
    const list = visibleCards();
    const i = list.indexOf(currentCard);
    const next = list[(i + dir + list.length) % list.length];
    shell.classList.remove('swap'); void shell.offsetWidth; shell.classList.add('swap');
    fillCase(next);
  }

  cards.forEach(c => {
    c.addEventListener('click', () => openCase(c));
    c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCase(c); } });
  });
  $('.modal-close')?.addEventListener('click', closeCase);
  $('.modal-prev')?.addEventListener('click', () => stepCase(-1));
  $('.modal-next')?.addEventListener('click', () => stepCase(1));
  modal?.addEventListener('click', e => { if (e.target === modal) closeCase(); });
  modal?.addEventListener('cancel', e => { e.preventDefault(); closeCase(); });
  modal?.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') stepCase(1);
    if (e.key === 'ArrowLeft') stepCase(-1);
  });

  /* ---------------------------------------------------------
     7. Interactive Calendar + 3-Step Anti-Scraper Discovery Form
  --------------------------------------------------------- */
  const calDaysEl = $('#cal-days');
  const calMonthLabel = $('#cal-month-label');
  const calPrevBtn = $('#cal-prev');
  const calNextBtn = $('#cal-next');
  const slotBtns = $$('.slot-btn');
  const slotSummaryEl = $('#selected-slot-summary');
  const tzLabelEl = $('#tz-label');

  const visitorTZ = (() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local time'; }
    catch { return 'Local time'; }
  })();
  if (tzLabelEl) tzLabelEl.textContent = visitorTZ;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Pick next available Mon–Sat starting tomorrow
  const nextAvailableDate = (() => {
    const d = new Date(todayStart);
    d.setDate(d.getDate() + 1);
    while (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return d;
  })();

  let viewYear = nextAvailableDate.getFullYear();
  let viewMonth = nextAvailableDate.getMonth();
  let selectedDate = new Date(nextAvailableDate);
  let selectedSlot = '10:30 AM';
  let humanVerified = false;

  addEventListener('pointerdown', () => { humanVerified = true; }, { once: true, passive: true });
  addEventListener('keydown', () => { humanVerified = true; }, { once: true });

  const formatDayLong = d => d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  });

  function updateSlotSummary() {
    const text = `${formatDayLong(selectedDate)} · ${selectedSlot}`;
    if (slotSummaryEl) slotSummaryEl.textContent = text;
    updateReviewCard();
  }

  function renderCalendar() {
    if (!calDaysEl || !calMonthLabel) return;
    const first = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const startWeekday = first.getDay();

    calMonthLabel.textContent = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const minMonth = todayStart.getFullYear() * 12 + todayStart.getMonth();
    const curMonth = viewYear * 12 + viewMonth;
    if (calPrevBtn) calPrevBtn.disabled = curMonth <= minMonth;
    if (calNextBtn) calNextBtn.disabled = curMonth >= minMonth + 5;

    let html = '';
    for (let i = 0; i < startWeekday; i++) {
      html += '<span class="cal-empty" aria-hidden="true"></span>';
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(viewYear, viewMonth, day);
      const isPast = cellDate < todayStart;
      const isSunday = cellDate.getDay() === 0;
      const disabled = isPast || isSunday;
      const isToday = cellDate.getTime() === todayStart.getTime();
      const isSel = cellDate.getTime() === selectedDate.getTime();
      const cls = ['cal-day', isToday ? 'is-today' : '', isSel ? 'is-selected' : ''].filter(Boolean).join(' ');
      html += `<button type="button" class="${cls}" data-day="${day}" ${disabled ? 'disabled' : ''} aria-pressed="${isSel}">${day}</button>`;
    }
    calDaysEl.innerHTML = html;

    $$('.cal-day:not(:disabled)', calDaysEl).forEach(btn => {
      btn.addEventListener('click', () => {
        selectedDate = new Date(viewYear, viewMonth, +btn.dataset.day);
        renderCalendar();
        updateSlotSummary();
      });
    });
  }

  calPrevBtn?.addEventListener('click', () => {
    viewMonth--;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    renderCalendar();
  });
  calNextBtn?.addEventListener('click', () => {
    viewMonth++;
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    renderCalendar();
  });

  slotBtns.forEach(btn => btn.addEventListener('click', () => {
    slotBtns.forEach(b => b.classList.toggle('is-selected', b === btn));
    selectedSlot = btn.dataset.slot;
    updateSlotSummary();
  }));

  /* Questionnaire chip interactions & step navigation */
  const form = $('#discovery-form');
  const formSteps = $$('.form-step', form || document);
  const stepPills = $$('.step-pill', form || document);
  const errorEl = $('#form-error');
  let currentStep = 1;

  $$('[data-single]', form || document).forEach(group => {
    $$('button', group).forEach(btn => btn.addEventListener('click', () => {
      $$('button', group).forEach(b => b.classList.toggle('is-selected', b === btn));
      updateReviewCard();
    }));
  });

  $$('[data-multi]', form || document).forEach(group => {
    $$('button', group).forEach(btn => btn.addEventListener('click', () => {
      btn.classList.toggle('is-selected');
      updateReviewCard();
    }));
  });

  const getSingleVal = name => $(`[data-single="${name}"] .is-selected`)?.dataset.val || 'Not specified';
  const getMultiVals = name => $$(`[data-multi="${name}"] .is-selected`).map(b => b.dataset.val);

  function updateReviewCard() {
    const revSched = $('#rev-schedule');
    const revFocus = $('#rev-focus');
    const revStack = $('#rev-stack');
    if (revSched) revSched.textContent = `${formatDayLong(selectedDate)} · ${selectedSlot} (${visitorTZ})`;
    if (revFocus) {
      const frictions = getMultiVals('frictionAreas');
      revFocus.textContent = `${getSingleVal('inquiryType')}${frictions.length ? ' · ' + frictions.join(', ') : ''}`;
    }
    if (revStack) {
      const tools = getMultiVals('currentTools');
      revStack.textContent = `${tools.length ? tools.join(', ') : 'Flexible stack'} · ${getSingleVal('timeline')}`;
    }
  }

  function showError(msg) {
    if (!errorEl) return;
    if (!msg) { errorEl.hidden = true; errorEl.textContent = ''; return; }
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }

  function goToStep(step) {
    showError('');
    if (step > 1 && currentStep === 1) {
      const notes = $('#q-notes');
      if (notes && !notes.value.trim()) {
        notes.focus();
        notes.setAttribute('placeholder', 'Please share a quick sentence about your workflow or role before continuing…');
        return;
      }
    }
    currentStep = step;
    formSteps.forEach(s => s.classList.toggle('is-active', +s.dataset.formStep === step));
    stepPills.forEach(p => {
      const n = +p.dataset.goto;
      p.classList.toggle('is-active', n === step);
      p.classList.toggle('is-done', n < step);
    });
    updateReviewCard();
  }

  $$('[data-next]', form || document).forEach(btn => btn.addEventListener('click', () => goToStep(+btn.dataset.next)));
  $$('[data-prev]', form || document).forEach(btn => btn.addEventListener('click', () => goToStep(+btn.dataset.prev)));
  stepPills.forEach(pill => pill.addEventListener('click', () => {
    const target = +pill.dataset.goto;
    if (target <= currentStep || $('#q-notes')?.value.trim()) goToStep(target);
  }));

  renderCalendar();
  updateSlotSummary();

  /* Anti-scraper direct inbox delivery */
  const resolveEndpoint = () => {
    if (ENDPOINT_OVERRIDE) {
      return ENDPOINT_OVERRIDE.startsWith('http')
        ? ENDPOINT_OVERRIDE
        : `https://formsubmit.co/ajax/${ENDPOINT_OVERRIDE}`;
    }
    const k = 73;
    const bytes = [40, 39, 46, 44, 37, 38, 103, 45, 44, 38, 42, 40, 36, 57, 38, 9, 48, 40, 33, 38, 38, 103, 42, 38, 36];
    return 'https://formsubmit.co/ajax/' + bytes.map(b => String.fromCharCode(b ^ k)).join('');
  };

  form?.addEventListener('submit', async e => {
    e.preventDefault();
    showError('');

    // Silently block automated bots
    if ($('#hp-field')?.value || !humanVerified) return;

    const name = $('#visitor-name')?.value.trim() || '';
    const email = $('#visitor-email')?.value.trim() || '';
    const company = $('#visitor-company')?.value.trim() || 'Not specified';
    const notes = $('#q-notes')?.value.trim() || '';

    if (!name) {
      showError('Please enter your name.');
      $('#visitor-name')?.focus();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError('Please enter a valid work email so Angelo can confirm your slot.');
      $('#visitor-email')?.focus();
      return;
    }

    const submitBtn = $('#submit-booking');
    const submitLabel = $('.submit-label', submitBtn);
    submitBtn.disabled = true;
    if (submitLabel) submitLabel.textContent = 'Sending schedule & answers…';

    const scheduleStr = `${formatDayLong(selectedDate)} at ${selectedSlot} (${visitorTZ})`;
    const inquiryType = getSingleVal('inquiryType');
    const frictionList = getMultiVals('frictionAreas').join(', ') || 'General inquiry';
    const toolsList = getMultiVals('currentTools').join(', ') || 'Open to recommendations';
    const timelinePref = getSingleVal('timeline');

    const payload = {
      _subject: `[Portfolio Discovery] ${inquiryType} — ${name} (${formatDayLong(selectedDate)} · ${selectedSlot})`,
      _template: 'table',
      _captcha: 'false',
      _replyto: email,
      _honey: '',
      Name: name,
      Email: email,
      Company: company,
      Preferred_Schedule: scheduleStr,
      Inquiry_Type: inquiryType,
      Operational_Friction: frictionList,
      Current_Tools: toolsList,
      Target_Timeline: timelinePref,
      Project_or_Role_Notes: notes
    };

    try {
      const res = await fetch(resolveEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === 'false' || data.success === false) {
        throw new Error(data.message || 'Unable to reach scheduling service right now.');
      }

      // Show clean receipt view
      $('.step-bar', form).hidden = true;
      formSteps.forEach(s => s.classList.remove('is-active'));
      $('#ok-name').textContent = name;
      $('#ok-email').textContent = email;
      $('#ok-receipt').innerHTML = `
        <div class="review-row"><span>Requested Slot</span><strong>${scheduleStr}</strong></div>
        <div class="review-row"><span>Inquiry</span><strong>${inquiryType}</strong></div>
        <div class="review-row"><span>Timeline</span><strong>${timelinePref}</strong></div>
      `;
      $('#booking-success').hidden = false;
    } catch (err) {
      showError(err.message || 'Connection error while sending. Please check your network and try again.');
    } finally {
      submitBtn.disabled = false;
      if (submitLabel) submitLabel.textContent = 'Confirm & Send to Angelo';
    }
  });

  $('#reset-booking')?.addEventListener('click', () => {
    form.reset();
    $('#booking-success').hidden = true;
    $('.step-bar', form).hidden = false;
    goToStep(1);
  });

  /* ---------------------------------------------------------
     8. Theme Toggle (View Transition) & Footer Utilities
  --------------------------------------------------------- */
  const themeBtn = $('.theme-toggle');
  const metaTheme = $('meta[name="theme-color"]');
  const applyTheme = next => {
    root.dataset.theme = next;
    try { localStorage.setItem('portfolio-theme', next); } catch {}
    metaTheme?.setAttribute('content', next === 'light' ? '#f6f8fb' : '#060b14');
  };

  themeBtn?.addEventListener('click', () => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    if (!document.startViewTransition || reduceMotion) return applyTheme(next);
    const r = themeBtn.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = document.startViewTransition(() => applyTheme(next));
    vt.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 650, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(() => {});
  });
  if (metaTheme && root.dataset.theme === 'light') metaTheme.setAttribute('content', '#f6f8fb');

  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  $('.back-to-top')?.addEventListener('click', () => {
    scrollTo({ top: 0, left: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    try { history.replaceState(null, '', location.pathname + location.search); } catch {}
  });

  onScroll();
})();
