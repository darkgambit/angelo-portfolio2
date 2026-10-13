/* =========================================================
   Angelo De Ocampo — Portfolio interactions
   Vanilla JS · no dependencies · respects reduced motion
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const body = document.body;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------------------------------------------------------
     1. Split text into animatable words
  --------------------------------------------------------- */
  function splitWords(el, wordClass = 'w', innerClass = 'wi') {
    let i = 0;
    const walk = node => {
      [...node.childNodes].forEach(child => {
        if (child.nodeType === 3) {
          const parts = child.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const outer = document.createElement('span');
            outer.className = wordClass;
            const inner = document.createElement('span');
            inner.className = innerClass;
            inner.style.setProperty('--i', i++);
            inner.textContent = part;
            outer.appendChild(inner);
            frag.appendChild(outer);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && !child.classList.contains('rotator')) {
          walk(child);
        }
      });
    };
    walk(el);
    return i;
  }
  // Hero lines share a continuous stagger index
  let heroIndex = 0;
  $$('.hero .h1-line[data-split]').forEach(line => {
    splitWords(line);
    $$('.wi', line).forEach(w => w.style.setProperty('--i', heroIndex++));
  });
  $$('[data-split]:not(.h1-line)').forEach(el => splitWords(el));

  // Scroll-scrubbed lead paragraph
  const scrubEl = $('[data-scrub]');
  let scrubWords = [];
  if (scrubEl) {
    const words = scrubEl.textContent.trim().split(/\s+/);
    scrubEl.innerHTML = words.map(w => `<span class="sw">${w}</span>`).join(' ');
    scrubWords = $$('.sw', scrubEl);
  }

  // Chip stagger indices
  $$('.chips').forEach(group => $$('span', group).forEach((c, i) => c.style.setProperty('--ci', i)));

  /* ---------------------------------------------------------
     2. Loader → page ready
  --------------------------------------------------------- */
  const loader = $('.loader');
  const ready = () => {
    body.classList.add('is-ready');
    startRotator();
  };
  const seen = (() => { try { return sessionStorage.getItem('intro-seen'); } catch { return null; } })();

  if (!loader || reduceMotion || seen) {
    loader && loader.classList.add('is-hidden');
    requestAnimationFrame(() => requestAnimationFrame(ready));
  } else {
    body.classList.add('is-locked');
    const countEl = $('.loader-count', loader);
    const bar = $('.loader-bar i', loader);
    const duration = 1500;
    const start = performance.now();
    let pageLoaded = document.readyState === 'complete';
    addEventListener('load', () => { pageLoaded = true; }, { once: true });
    const step = now => {
      // Ease to 90% on time; finish once window load fires (or after a safety cap)
      const t = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const canFinish = pageLoaded || now - start > 3500;
      const p = canFinish ? eased : Math.min(eased, .9);
      countEl.textContent = Math.round(p * 100);
      bar.style.transform = `scaleX(${p})`;
      if (p < 1) return requestAnimationFrame(step);
      setTimeout(() => {
        loader.classList.add('is-done');
        body.classList.remove('is-locked');
        try { sessionStorage.setItem('intro-seen', '1'); } catch {}
        setTimeout(ready, 250);
        setTimeout(() => loader.classList.add('is-hidden'), 1100);
      }, 180);
    };
    requestAnimationFrame(step);
  }

  /* ---------------------------------------------------------
     3. Rotating hero words + live run ticker
  --------------------------------------------------------- */
  let rotatorStarted = false;
  function startRotator() {
    if (rotatorStarted) return;
    rotatorStarted = true;
    const items = $$('.rot-item');
    if (items.length > 1 && !reduceMotion) {
      let idx = 0;
      setInterval(() => {
        const cur = items[idx];
        idx = (idx + 1) % items.length;
        const next = items[idx];
        cur.classList.remove('is-active');
        cur.classList.add('is-leaving');
        next.classList.remove('is-leaving');
        next.classList.add('is-active');
        setTimeout(() => cur.classList.remove('is-leaving'), 800);
      }, 3200);
    }
    const live = $('.live-text');
    if (live && !reduceMotion) {
      const feed = ['Asana → Xero report synced', 'RAG index: 42 vectors added', 'Lead stage → Quoted', '3 attachments filed', 'Video published · YouTube', 'Posts routed to LinkedIn'];
      let li = 0;
      setInterval(() => {
        live.classList.add('out');
        setTimeout(() => {
          li = (li + 1) % feed.length;
          live.textContent = feed[li];
          live.classList.remove('out');
          live.classList.add('in');
          void live.offsetWidth;
          live.classList.remove('in');
        }, 450);
      }, 2600);
    }
  }

  /* ---------------------------------------------------------
     4. Hero canvas — live automation network
  --------------------------------------------------------- */
  const canvas = $('.hero-canvas');
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = 1, nodes = [], packets = [], running = true, visible = true, raf = 0;
    const mouse = { x: -9999, y: -9999, active: false };
    let colA = '86,227,193', colB = '107,168,255', lineAlpha = .14;

    const readColors = () => {
      const cs = getComputedStyle(root);
      colA = cs.getPropertyValue('--accent-rgb').trim() || colA;
      colB = cs.getPropertyValue('--accent2-rgb').trim() || colB;
      lineAlpha = root.dataset.theme === 'light' ? .16 : .14;
    };
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(clamp((w * h) / 17000, 28, 95));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - .5) * .28, vy: (Math.random() - .5) * .28,
        r: Math.random() * 1.6 + .8, hub: Math.random() < .12
      }));
      packets = [];
    };
    const LINK = 150;
    const neighbours = (n) => {
      const list = [];
      for (const m of nodes) {
        if (m === n) continue;
        const d = Math.hypot(m.x - n.x, m.y - n.y);
        if (d < LINK) list.push(m);
      }
      return list;
    };
    const spawnPacket = (from) => {
      const a = from || nodes[(Math.random() * nodes.length) | 0];
      const ns = neighbours(a);
      if (!ns.length) return;
      const b = ns[(Math.random() * ns.length) | 0];
      packets.push({ a, b, t: 0, speed: .008 + Math.random() * .012, hops: from ? 0 : 3 + ((Math.random() * 4) | 0), col: Math.random() < .5 ? colA : colB });
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      // Move nodes
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < -20) n.x = w + 20; else if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20; else if (n.y > h + 20) n.y = -20;
        if (mouse.active) {
          const dx = mouse.x - n.x, dy = mouse.y - n.y, d = Math.hypot(dx, dy);
          if (d < 200 && d > 1) { n.x += dx / d * .25; n.y += dy / d * .25; }
        }
      }
      // Edges
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK * LINK) {
            const al = (1 - Math.sqrt(d2) / LINK) * lineAlpha;
            ctx.strokeStyle = `rgba(${colA},${al})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        if (mouse.active) {
          const d = Math.hypot(a.x - mouse.x, a.y - mouse.y);
          if (d < 190) {
            ctx.strokeStyle = `rgba(${colB},${(1 - d / 190) * .45})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
          }
        }
      }
      // Nodes
      for (const n of nodes) {
        ctx.fillStyle = `rgba(${n.hub ? colB : colA},${n.hub ? .9 : .55})`;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.hub ? n.r + 1.2 : n.r, 0, Math.PI * 2); ctx.fill();
        if (n.hub) {
          ctx.strokeStyle = `rgba(${colB},.25)`;
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 6, 0, Math.PI * 2); ctx.stroke();
        }
      }
      // Packets — data flowing hop to hop like a workflow run
      if (packets.length < Math.min(14, nodes.length / 4) && Math.random() < .06) spawnPacket();
      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i];
        p.t += p.speed;
        const x = lerp(p.a.x, p.b.x, p.t), y = lerp(p.a.y, p.b.y, p.t);
        const tx = lerp(p.a.x, p.b.x, Math.max(0, p.t - .25)), ty = lerp(p.a.y, p.b.y, Math.max(0, p.t - .25));
        const g = ctx.createLinearGradient(tx, ty, x, y);
        g.addColorStop(0, `rgba(${p.col},0)`); g.addColorStop(1, `rgba(${p.col},.9)`);
        ctx.strokeStyle = g; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
        ctx.fillStyle = `rgba(${p.col},1)`;
        ctx.shadowColor = `rgba(${p.col},.9)`; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(x, y, 2.1, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.lineWidth = 1;
        if (p.t >= 1) {
          packets.splice(i, 1);
          if (p.hops > 0) {
            const ns = neighbours(p.b).filter(n => n !== p.a);
            if (ns.length) packets.push({ a: p.b, b: ns[(Math.random() * ns.length) | 0], t: 0, speed: p.speed, hops: p.hops - 1, col: p.col });
          }
        }
      }
    };
    const loop = () => {
      if (running && visible) draw();
      raf = requestAnimationFrame(loop);
    };

    readColors(); resize();
    if (reduceMotion) { draw(); }
    else { loop(); }
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { resize(); if (reduceMotion) draw(); }, 150); });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
    document.addEventListener('visibilitychange', () => { running = !document.hidden; });
    const hero = $('.hero');
    hero.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.active = true; });
    hero.addEventListener('pointerleave', () => { mouse.active = false; });
    window.__refreshCanvasColors = () => { readColors(); if (reduceMotion) draw(); };
  }

  /* ---------------------------------------------------------
     5. Header, progress bar, scroll-driven effects
  --------------------------------------------------------- */
  const header = $('.site-header');
  const progress = $('.scroll-progress i');
  const timeline = $('.timeline');
  const timelineItems = $$('.timeline-item');
  let lastY = scrollY, ticking = false;

  const onScroll = () => {
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    header.classList.toggle('scrolled', y > 20);
    const navOpen = nav.classList.contains('open');
    if (!navOpen) header.classList.toggle('is-hidden', y > lastY && y > 500);
    lastY = y;

    // Lead paragraph scrub
    if (scrubWords.length) {
      const r = scrubEl.getBoundingClientRect();
      const p = clamp((innerHeight * .9 - r.top) / (r.height + innerHeight * .2), 0, 1);
      const lit = Math.round(p * scrubWords.length);
      scrubWords.forEach((w, i) => w.classList.toggle('lit', i < lit));
    }
    // Timeline progress line
    if (timeline) {
      const r = timeline.getBoundingClientRect();
      const p = clamp((innerHeight * .6 - r.top) / r.height, 0, 1);
      timeline.style.setProperty('--p', p.toFixed(4));
      const lineY = r.top + p * r.height;
      timelineItems.forEach(item => {
        const dot = $('.time-dot', item).getBoundingClientRect();
        item.classList.toggle('passed', dot.top < lineY);
      });
    }
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  /* ---------------------------------------------------------
     6. Navigation: mobile menu, scrollspy, sliding indicator
  --------------------------------------------------------- */
  const menu = $('.menu-toggle');
  const nav = $('.nav-links');
  const indicator = $('.nav-indicator');
  const links = $$('.nav-links a');
  const setMenu = open => {
    nav.classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  };
  menu.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  links.forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); menu.focus(); } });
  document.addEventListener('click', e => { if (nav.classList.contains('open') && !nav.contains(e.target) && !menu.contains(e.target)) setMenu(false); });

  const moveIndicator = el => {
    if (!indicator) return;
    if (!el) { indicator.style.opacity = '0'; return; }
    indicator.style.opacity = '1';
    indicator.style.width = el.offsetWidth + 'px';
    indicator.style.transform = `translateX(${el.offsetLeft}px)`;
  };
  const sections = $$('main section[id]');
  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      let activeLink = null;
      links.forEach(a => {
        const on = a.getAttribute('href') === '#' + e.target.id;
        a.classList.toggle('active', on);
        if (on) activeLink = a;
      });
      moveIndicator(activeLink);
    });
  }, { rootMargin: '-40% 0px -55%' });
  sections.forEach(s => spy.observe(s));
  // Hide indicator when back in hero
  new IntersectionObserver(([e]) => { if (e.isIntersecting && e.intersectionRatio > .5) { links.forEach(a => a.classList.remove('active')); moveIndicator(null); } }, { threshold: [.5] }).observe($('.hero'));
  addEventListener('resize', () => moveIndicator($('.nav-links a.active')));

  /* ---------------------------------------------------------
     7. Reveal on scroll (auto-stagger siblings)
  --------------------------------------------------------- */
  const revealEls = $$('.reveal, .reveal-words');
  const revealObs = new IntersectionObserver(entries => {
    const batch = entries.filter(e => e.isIntersecting);
    batch.forEach((e, i) => {
      const el = e.target;
      if (!el.style.getPropertyValue('--rd')) el.style.setProperty('--rd', `${i * 90}ms`);
      el.classList.add('visible');
      revealObs.unobserve(el);
    });
  }, { threshold: .14, rootMargin: '0px 0px -6% 0px' });
  revealEls.forEach(el => revealObs.observe(el));

  /* ---------------------------------------------------------
     8. Count-up numbers
  --------------------------------------------------------- */
  const fmt = n => n.toLocaleString('en-US');
  const countObs = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target, n = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    countObs.unobserve(el);
    if (reduceMotion) { el.textContent = pre + fmt(n) + suf; return; }
    const dur = n > 100 ? 1800 : 1300, start = performance.now();
    const tick = t => {
      const p = Math.min((t - start) / dur, 1);
      el.textContent = pre + fmt(Math.round(n * (1 - Math.pow(1 - p, 4)))) + suf;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { threshold: .6 });
  $$('[data-count]').forEach(c => countObs.observe(c));

  /* ---------------------------------------------------------
     9. Pointer effects: cursor, magnetic, spotlight, tilt
  --------------------------------------------------------- */
  if (finePointer && !reduceMotion) {
    const ring = $('.cursor-ring'), dot = $('.cursor-dot');
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, shown = false;
    addEventListener('pointermove', e => {
      mx = e.clientX; my = e.clientY;
      if (!shown) { shown = true; rx = mx; ry = my; body.classList.add('has-cursor'); }
      dot.style.transform = `translate3d(${mx}px,${my}px,0)`;
    }, { passive: true });
    document.addEventListener('pointerleave', () => { body.classList.remove('has-cursor'); shown = false; });
    addEventListener('pointerdown', () => body.classList.add('cursor-down'));
    addEventListener('pointerup', () => body.classList.remove('cursor-down'));
    const follow = () => {
      rx = lerp(rx, mx, .18); ry = lerp(ry, my, .18);
      ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
      requestAnimationFrame(follow);
    };
    follow();
    document.addEventListener('pointerover', e => {
      const t = e.target;
      const view = t.closest('.project-card');
      const hov = t.closest('a, button, [data-magnetic], .chips span, .credential-row span');
      body.classList.toggle('cursor-view', !!view);
      body.classList.toggle('cursor-hover', !view && !!hov);
    });

    // Magnetic elements (uses `translate` so CSS transforms stay intact)
    $$('[data-magnetic]').forEach(el => {
      const strength = el.classList.contains('nav-cta') ? .25 : .32;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * strength;
        const y = (e.clientY - r.top - r.height / 2) * strength;
        el.style.translate = `${x}px ${y}px`;
      });
      el.addEventListener('pointerleave', () => { el.style.translate = '0px 0px'; });
    });

    // 3D tilt on the portrait
    $$('[data-tilt]').forEach(el => {
      const stage = el.closest('.hero') || el;
      const shine = $('.portrait-shine', el);
      stage.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const px = clamp((e.clientX - r.left) / r.width, -0.5, 1.5);
        const py = clamp((e.clientY - r.top) / r.height, -0.5, 1.5);
        el.style.transform = `perspective(1100px) rotateY(${(px - .5) * 14}deg) rotateX(${(.5 - py) * 12}deg)`;
        if (shine) { shine.style.setProperty('--sx', px * 100 + '%'); shine.style.setProperty('--sy', py * 100 + '%'); }
      });
      stage.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }
  // Spotlight works for any pointer
  $$('.spotlight').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  /* ---------------------------------------------------------
     10. Image fallbacks (portrait monogram + generated workflow art)
  --------------------------------------------------------- */
  const svgNS = 'http://www.w3.org/2000/svg';
  function flowSVG(labels, seed = 1) {
    let s = seed;
    const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const W = 640, H = 300;
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    svg.setAttribute('class', 'flow-fallback');
    svg.setAttribute('aria-hidden', 'true');
    let html = '';
    for (let x = 20; x < W; x += 28) for (let y = 20; y < H; y += 28) html += `<circle class="grid-dot" cx="${x}" cy="${y}" r="1"/>`;
    const cols = Math.max(3, Math.min(labels.length + 1, 5));
    const pts = [];
    const gap = (W - 120) / (cols - 1);
    for (let c = 0; c < cols; c++) {
      const branch = c > 0 && c < cols - 1 && rand() > .45;
      const ys = branch ? [H / 2 - 52, H / 2 + 52] : [H / 2 + (rand() - .5) * 30];
      pts.push(ys.map(y => ({ x: 60 + c * gap, y, label: labels[(c + ys.indexOf(y)) % labels.length] || 'Step' })));
    }
    for (let c = 0; c < cols - 1; c++) {
      pts[c].forEach(a => pts[c + 1].forEach(b => {
        const mx = (a.x + b.x) / 2;
        const d = `M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`;
        html += `<path class="edge" d="${d}"/><path class="edge-flow" d="${d}" style="animation-delay:${-rand() * 2}s"/>`;
      }));
    }
    pts.flat().forEach((p, i) => {
      const label = String(p.label).slice(0, 14);
      const bw = Math.max(70, label.length * 7.2 + 30);
      html += `<g class="node${i === 0 ? ' trigger' : ''}" transform="translate(${p.x - bw / 2},${p.y - 17})"><rect width="${bw}" height="34" rx="10"/><circle cx="14" cy="17" r="4"/><text x="25" y="21">${label}</text></g>`;
    });
    svg.innerHTML = html;
    return svg;
  }
  const tagsFor = el => {
    const card = el.closest('.project-card');
    if (card) return $$('.project-tags span', card).map(s => s.textContent);
    return ($$('#modal-tags span').map(s => s.textContent));
  };
  const applyFallback = img => {
    if (img.dataset.failed) return;
    img.dataset.failed = '1';
    if (img.dataset.fallback === 'portrait') {
      img.closest('.portrait-frame').classList.add('is-fallback');
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
     11. Project filters with FLIP animation
  --------------------------------------------------------- */
  const filterWrap = $('.filters');
  const filters = $$('.filters button');
  const filterInd = $('.filter-indicator');
  const cards = $$('.project-card');
  const placeFilterInd = () => {
    const a = $('.filters button.active');
    if (!a || !filterInd) return;
    filterInd.style.width = a.offsetWidth + 'px';
    filterInd.style.transform = `translateX(${a.offsetLeft}px)`;
  };
  placeFilterInd();
  addEventListener('resize', placeFilterInd);
  document.fonts && document.fonts.ready.then(placeFilterInd);

  let filtering = false;
  filters.forEach(btn => btn.addEventListener('click', async () => {
    if (filtering || btn.classList.contains('active')) return;
    filtering = true;
    filters.forEach(b => { b.classList.toggle('active', b === btn); b.setAttribute('aria-pressed', String(b === btn)); });
    placeFilterInd();
    const f = btn.dataset.filter;
    const match = c => f === 'all' || c.dataset.category.split(' ').includes(f);
    const leaving = cards.filter(c => !match(c) && !c.classList.contains('hidden'));
    const entering = cards.filter(c => match(c) && c.classList.contains('hidden'));
    const staying = cards.filter(c => match(c) && !c.classList.contains('hidden'));

    if (reduceMotion) {
      leaving.forEach(c => c.classList.add('hidden'));
      entering.forEach(c => { c.classList.remove('hidden'); c.classList.add('visible'); });
      filtering = false; return;
    }
    const first = new Map(staying.map(c => [c, c.getBoundingClientRect()]));
    await Promise.all(leaving.map(c => c.animate(
      [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.94)' }],
      { duration: 260, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' }
    ).finished));
    leaving.forEach(c => { c.classList.add('hidden'); c.getAnimations().forEach(a => a.cancel()); });
    entering.forEach(c => { c.classList.remove('hidden'); c.classList.add('visible'); });
    staying.forEach(c => {
      const a = first.get(c), b = c.getBoundingClientRect();
      const dx = a.left - b.left, dy = a.top - b.top;
      if (dx || dy) c.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: 650, easing: 'cubic-bezier(.22,1,.36,1)' });
    });
    entering.forEach((c, i) => c.animate(
      [{ opacity: 0, transform: 'translateY(30px) scale(.96)' }, { opacity: 1, transform: 'none' }],
      { duration: 650, delay: 80 + i * 70, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }
    ));
    setTimeout(() => { filtering = false; }, 300);
  }));

  /* ---------------------------------------------------------
     12. Case-study modal with prev / next
  --------------------------------------------------------- */
  const cases = {
    xero: { title: 'Asana → Xero Bank Transaction Reporting', image: 'assets/asana-xero.webp', alt: 'Make workflow connecting Asana, Xero, Google Sheets, routing, iteration, aggregation, and attachment actions.', summary: 'A Make scenario that turns completed Asana work into a structured bank-transaction report and returns the final output to the task.', challenge: 'Manual retrieval, formatting, attachment preparation, and staging-sheet cleanup can create delays and reconciliation risk.', solution: 'The workflow watches completed tasks, calls Xero, routes records, iterates and aggregates data, adds rows to Sheets, uploads the report to Asana, then clears the staging range.', value: 'Estimated 12 hours and $120 in labor saved monthly under moderate usage.' },
    content: { title: 'AI Content Repurposing Engine', image: 'assets/ai-content.webp', alt: 'Zapier workflow with Google Drive, filters, AI generation, loops, paths, and social publishing actions.', summary: 'A Zapier workflow that converts source files into multiple AI-assisted posts and routes outputs to Facebook, LinkedIn, and Instagram.', challenge: 'Rewriting one asset into multiple platform formats is repetitive and creates inconsistent publishing cadence.', solution: 'A Drive trigger passes qualifying files to AI steps, generates multiple posts, loops through outputs, and uses paths for platform-specific actions.', value: 'Estimated 18 hours and $180 in labor saved monthly, excluding review and platform fees.' },
    leads: { title: 'Asana Lead Pipeline Automation', image: 'assets/asana-leads.webp', alt: 'Zapier lead pipeline with five Asana stages and branched follow-up, quotation, approval, and closing actions.', summary: 'A five-stage Asana lead system covering Ready to Start, No Response, Quoted, Approved, and Paid and Closed.', challenge: 'Manual follow-ups, folder setup, quote reminders, and onboarding messages can cause missed opportunities.', solution: 'Zapier paths trigger Drive organization, scheduled Gmail follow-ups, filters, AI-assisted messages, welcome emails, and stage-specific actions.', value: 'Estimated 15 hours and $150 in labor saved monthly while improving follow-up consistency.' },
    video: { title: 'AI Video Creation & Publishing', image: 'assets/ai-video.webp', alt: 'n8n AI video workflow from prompt generation and JWT authentication through publishing.', summary: 'An end-to-end n8n workflow that creates AI-assisted videos and publishes them to YouTube and Facebook.', challenge: 'Prompting, authentication, generation monitoring, file conversion, and multi-platform publishing require repeated coordination.', solution: 'The workflow schedules prompt generation with Gemini, signs a JWT, calls an external video API, checks status and errors, converts Base64 output, and publishes to both platforms.', value: 'Estimated 24 hours and $240 in labor saved monthly; API generation charges are not included.' },
    docs: { title: 'Automated Attachment Renaming & Filing', image: 'assets/attachment-filing.webp', alt: 'Make workflow from Gmail attachment intake through AI naming, Drive upload, Sheets logging, aggregation, and confirmation.', summary: 'A document-control scenario that standardizes incoming email attachments and records each processed file.', challenge: 'Manual download, interpretation, naming, filing, logging, and confirmation are slow and prone to inconsistency.', solution: 'Make watches Gmail, lists attachments, analyzes each file with AI, creates a standardized filename, uploads to Drive, logs it in Sheets, aggregates text, and sends a confirmation email.', value: 'Estimated 8 hours and $80 in labor saved monthly with stronger naming consistency.' },
    rag: { title: 'Basic RAG Knowledge Pipeline', image: 'assets/rag-agent.webp', alt: 'n8n RAG pipeline using Google Drive, Gemini embeddings, Supabase Vector Store, and automatic cleanup.', summary: 'A basic retrieval-augmented-generation data pipeline that keeps a vector knowledge store synchronized with Google Drive.', challenge: 'Knowledge files need repeatable ingestion, embedding, storage, and deletion handling before an AI agent can retrieve them reliably.', solution: 'Drive events trigger downloads, Gemini creates embeddings, Supabase stores vectors through a data loader, and deletion events remove stale records.', value: 'Estimated 10 hours and $100 in labor saved monthly for recurring knowledge-base maintenance.' }
  };
  const modal = $('.project-modal');
  const shell = $('.modal-shell', modal);
  const modalMedia = $('.modal-media', modal);
  let currentCard = null, lastFocus = null;
  const visibleCards = () => cards.filter(c => !c.classList.contains('hidden'));

  function fillCase(card) {
    const c = cases[card.dataset.project];
    if (!c) return false;
    currentCard = card;
    const tags = $$('.project-tags span', card).map(s => s.textContent);
    $('#modal-tags').innerHTML = tags.map(t => `<span>${t}</span>`).join('');
    // reset media
    $$('.flow-fallback', modalMedia).forEach(n => n.remove());
    const mi = $('#modal-image');
    mi.style.display = '';
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
    const done = () => { modal.close(); body.classList.remove('is-locked'); lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true }); };
    reduceMotion ? done() : setTimeout(done, 380);
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
  $('.modal-close').addEventListener('click', closeCase);
  $('.modal-prev').addEventListener('click', () => stepCase(-1));
  $('.modal-next').addEventListener('click', () => stepCase(1));
  modal.addEventListener('click', e => { if (e.target === modal) closeCase(); });
  modal.addEventListener('cancel', e => { e.preventDefault(); closeCase(); });
  modal.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') stepCase(1);
    if (e.key === 'ArrowLeft') stepCase(-1);
  });

  /* ---------------------------------------------------------
     13. Theme toggle with circular view-transition reveal
  --------------------------------------------------------- */
  const themeBtn = $('.theme-toggle');
  const metaTheme = $('meta[name="theme-color"]');
  const applyTheme = next => {
    root.dataset.theme = next;
    try { localStorage.setItem('portfolio-theme', next); } catch {}
    metaTheme && metaTheme.setAttribute('content', next === 'light' ? '#f4f6f9' : '#050b16');
    window.__refreshCanvasColors && window.__refreshCanvasColors();
  };
  themeBtn.addEventListener('click', e => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    if (!document.startViewTransition || reduceMotion) return applyTheme(next);
    const r = themeBtn.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = document.startViewTransition(() => applyTheme(next));
    vt.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 750, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(() => {});
  });
  if (metaTheme && root.dataset.theme === 'light') metaTheme.setAttribute('content', '#f4f6f9');

  /* ---------------------------------------------------------
     14. Utilities: copy email, year, back to top
  --------------------------------------------------------- */
  const toast = $('.toast');
  $('.copy-btn').addEventListener('click', async e => {
    const btn = e.currentTarget, label = $('span', btn);
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      btn.classList.add('copied'); label.textContent = 'Copied ✓';
      toast.classList.add('show');
      setTimeout(() => { toast.classList.remove('show'); btn.classList.remove('copied'); label.textContent = 'Copy email'; }, 2000);
    } catch { location.href = 'mailto:' + btn.dataset.copy; }
  });
  $('#year').textContent = new Date().getFullYear();
  $('.back-to-top').addEventListener('click', () => {
    scrollTo({ top: 0, left: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    try { history.replaceState(null, '', location.pathname + location.search); } catch {}
  });

  onScroll();
})();
