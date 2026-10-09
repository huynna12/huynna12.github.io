// Builds the page from SITE (data/site.js).
const $ = (id) => document.getElementById(id);

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(kid));
  }
  return el;
}

const ext = (label, url, cls = 'btn') =>
  h('a', { class: cls, href: url, target: '_blank', rel: 'noopener' }, label);

const bullets = (list) =>
  list && list.length ? h('ul', { class: 'bullets' }, list.map((b) => h('li', null, b))) : null;

function flow(d) {
  // A step is a string, { parallel: [...] }, or { text, kind } where kind is 'new' (I added it) or 'bad' (the problem).
  const stepEl = (s) => {
    if (s.parallel) return h('div', { class: 'par' }, s.parallel.map((x) => h('span', { class: 'step' }, x)));
    if (s.text) return h('span', { class: 'step ' + (s.kind || '') }, s.text);
    return h('span', { class: 'step' }, s);
  };
  return h('div', { class: 'flow' },
    h('p', { class: 'flow-title' }, d.title),
    d.note ? h('p', { class: 'flow-note' }, d.note) : null,
    d.rows.map((r) => r.heading
      ? h('p', { class: 'flow-head' }, r.heading)
      : h('div', { class: 'flow-row' + (r.tone ? ' ' + r.tone : '') },
          r.label ? h('span', { class: 'flow-label' }, r.label) : null,
          h('ol', null, r.steps.map((x) => h('li', null, stepEl(x)))))));
}

function shot(s) {
  const host = s.url.replace('http://', '');
  return h('a', { class: 'shot', href: s.url, target: '_blank', rel: 'noopener' },
    h('span', { class: 'chrome', 'aria-hidden': 'true' },
      h('i'), h('i'), h('i'), h('b', null, host + ' (HTTP)')),
    h('img', { src: s.src, alt: s.alt, width: s.w, height: s.h, loading: 'lazy' }),
    h('span', { class: 'cap' }, s.caption));
}

// The resume button is in the HTML; turn it on once the file is confirmed to exist.
(function () {
  const r = $('resume-btn');
  if (!r) return;
  fetch(SITE.links.resume, { method: 'HEAD' }).then((res) => {
    if (!res.ok) return;
    r.className = 'btn btn-primary';
    r.href = SITE.links.resume;
    r.removeAttribute('aria-disabled');
    r.removeAttribute('title');
  }).catch(() => {});
})();

// Hero
$('glance').append(...SITE.sheet.map((r) => h('div', null, h('dt', null, r.k), h('dd', null, r.v))));

// Open source
const prRow = (p, fallbackTitle) => h('li', { class: 'pr' },
  h('div', { class: 'pr-head' },
    ext('#' + p.number, p.url, 'prnum'),
    h('span', { class: 'merged' }, 'Merged'),
    p.merged ? h('span', { class: 'date' }, p.merged) : null),
  p.title || fallbackTitle ? h('p', { class: 'mono' }, p.title || fallbackTitle) : null,
  p.text ? h('p', null, p.text) : null);

$('os-list').append(...SITE.openSource.map((o) =>
  h('article', { class: 'repo' },
    h('div', { class: 'repo-side' },
      h('h3', null, ext(o.repo, o.repoUrl, 'plain')),
      h('p', { class: 'muted' }, o.blurb)),
    h('div', { class: 'repo-main' },
      h('ul', { class: 'prs' }, o.prs.map((p) => prRow(p, o.summary))),
      bullets(o.bullets),
      o.diagram ? flow(o.diagram) : null))));

// Projects
$('proj-list').append(...SITE.projects.map((p, i) =>
  h('article', { class: 'project' },
    h('header', null,
      h('span', { class: 'idx' }, String(i + 1).padStart(2, '0')),
      h('h3', null, p.name),
      p.status ? h('span', { class: 'status' }, p.status) : null),
    h('p', { class: 'purpose' }, p.purpose),
    h('div', { class: 'proj-body' },
      h('div', null,
        h('ul', { class: 'tags', 'aria-label': 'Technologies' }, p.tags.map((t) => h('li', null, t))),
        bullets(p.bullets),
        p.links.length
          ? h('p', { class: 'links' }, p.links.map((l) =>
              h('span', null, ext(l.label, l.url, 'plain'), l.note ? h('small', null, ' (' + l.note + ')') : null)))
          : null),
      p.shot ? shot(p.shot) : null),
    p.diagram ? flow(p.diagram) : null)));

// Skills, laid out like a menu with dotted leaders.
$('skills-list').append(...SITE.skills.map((s) =>
  h('div', null, h('dt', null, s.group), h('span', { class: 'dots', 'aria-hidden': 'true' }), h('dd', null, s.items.join(', ')))));

// Education and experience
const E = SITE.education;
$('bg-list').append(
  h('article', { class: 'job' },
    h('h3', null, E.school),
    h('p', null, E.degree),
    h('p', { class: 'muted' }, E.detail),
    h('p', { class: 'muted' }, 'Coursework: ' + E.coursework.join(', '))),
  ...SITE.experience.map((x) =>
    h('article', { class: 'job' },
      h('h3', null, x.role),
      h('p', { class: 'muted' }, [x.where, x.when].filter(Boolean).join(' | ')),
      h('p', null, x.text))));

// Outside work
$('ow-list').append(...SITE.outsideWork.map((q) =>
  h('li', { class: q.done ? 'done' : null },
    h('span', { class: 'box', 'aria-hidden': 'true' }, q.done ? '✓' : ''),
    h('span', null, q.text),
    h('span', { class: 'sr' }, q.done ? ' (done)' : ' (not yet)'))));
$('always').textContent = SITE.alwaysOn;

// Scroll progress line, with a runner at its leading edge. The runner only swings its legs while the page is moving,
// and turns around when you scroll back up.
const bar = $('progress'), runner = $('runner'), track = bar.parentElement;
const RUNNER_W = 21;
let ticking = false, trackW = track.clientWidth, lastY = scrollY, stopTimer = 0;
function onScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
  bar.style.transform = 'scaleX(' + p + ')';
  const x = Math.min(trackW - RUNNER_W, Math.max(0, p * trackW - RUNNER_W * 0.6));
  runner.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
  ticking = false;
}
addEventListener('scroll', () => {
  const dy = scrollY - lastY;
  if (dy) { runner.classList.toggle('back', dy < 0); lastY = scrollY; }
  runner.classList.add('running');
  clearTimeout(stopTimer);
  stopTimer = setTimeout(() => runner.classList.remove('running'), 160);
  if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
}, { passive: true });
new ResizeObserver(() => { trackW = track.clientWidth; onScroll(); }).observe(track);
onScroll();

// Highlight the current section in the nav
const links = [...document.querySelectorAll('.bar nav a')];
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
  }
}, { rootMargin: '-40% 0px -55% 0px' });
document.querySelectorAll('main section[id]').forEach((s) => io.observe(s));

// Press R for an "ultimate": a shower of coffee beans.
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
function beanShower() {
  if (reduceMotion) return;
  const layer = h('div', { class: 'beans', 'aria-hidden': 'true' });
  for (let i = 0; i < 36; i++) {
    const b = h('i', { class: 'bean' });
    b.style.left = Math.random() * 100 + 'vw';
    b.style.animationDuration = 2.2 + Math.random() * 2.2 + 's';
    b.style.animationDelay = Math.random() * 0.9 + 's';
    b.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
    b.style.setProperty('--s', (0.7 + Math.random() * 0.8).toFixed(2));
    layer.append(b);
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), 5200);
}
addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target;
  if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
  if (e.key === 'r' || e.key === 'R') beanShower();
});

// The same shower as pressing R also plays once when you arrive: after the intro, or on load when the intro is skipped.
let entered = false;
function enter() { if (entered) return; entered = true; setTimeout(beanShower, 300); }
if (document.documentElement.classList.contains('no-intro')) {
  if (document.readyState === 'complete') setTimeout(enter, 600); else addEventListener('load', () => setTimeout(enter, 600));
}

// The 3D scene loads after the page is ready. The line drawing stays as the fallback.
const fig = $('phin-fig');
function loadCoffee() {
  if (navigator.connection && navigator.connection.saveData) return;
  import('./coffee.js?v=48').then((m) => {
    m.startCoffee({ canvas: $('coffee'), stage: $('coffee-stage'), onReady: () => fig.classList.add('has3d') });
  }).catch((e) => { fig.dataset.err = String((e && e.message) || e).slice(0, 160); });
}
if (document.readyState === 'complete') setTimeout(loadCoffee, 0);
else addEventListener('load', () => (window.requestIdleCallback ? requestIdleCallback(loadCoffee, { timeout: 1500 }) : setTimeout(loadCoffee, 300)));

// Postage-stamp edge: a paper shape with half-circle notches, redrawn whenever the frame resizes.
function stampPath(w, h, r, gap) {
  const nx = Math.max(3, Math.round(w / gap)), ny = Math.max(3, Math.round(h / gap));
  const sx = w / nx, sy = h / ny;
  let d = 'M0 0';
  for (let i = 0; i < nx; i++) { const c = (i + 0.5) * sx; d += ` L${c - r} 0 A${r} ${r} 0 0 0 ${c + r} 0`; }
  d += ` L${w} 0`;
  for (let j = 0; j < ny; j++) { const c = (j + 0.5) * sy; d += ` L${w} ${c - r} A${r} ${r} 0 0 0 ${w} ${c + r}`; }
  d += ` L${w} ${h}`;
  for (let i = nx - 1; i >= 0; i--) { const c = (i + 0.5) * sx; d += ` L${c + r} ${h} A${r} ${r} 0 0 0 ${c - r} ${h}`; }
  d += ` L0 ${h}`;
  for (let j = ny - 1; j >= 0; j--) { const c = (j + 0.5) * sy; d += ` L0 ${c + r} A${r} ${r} 0 0 0 0 ${c - r}`; }
  return d + ' Z';
}
(function () {
  const el = $('stamp');
  if (!el) return;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'stamp-edge');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(ns, 'path');
  svg.append(path);
  el.prepend(svg);
  const draw = () => {
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    path.setAttribute('d', stampPath(w, h, 5.5, 18));
  };
  new ResizeObserver(draw).observe(el);
  draw();
})();

// Intro: remember it was seen this visit, let any click, key or scroll skip it, then remove it.
(function () {
  const el = $('intro');
  if (!el) return;
  try { sessionStorage.setItem('intro-seen', '1'); } catch (e) {}
  let done = false;
  const end = () => { if (done) return; done = true; el.remove(); enter(); };
  // The three cubes land by about 2.3s and the spill settles by 3s; then the curtain slides up and is removed.
  const liftTimer = setTimeout(() => { el.classList.add('lift'); }, 4300);
  el.addEventListener('transitionend', (e) => { if (e.propertyName === 'transform') end(); });
  const skip = () => { if (done) return; clearTimeout(liftTimer); el.classList.add('skip'); setTimeout(end, 340); };
  el.addEventListener('click', skip);
  addEventListener('keydown', skip, { once: true });
  addEventListener('wheel', skip, { once: true, passive: true });
  addEventListener('touchmove', skip, { once: true, passive: true });
  setTimeout(end, 7000);   // safety net
})();
