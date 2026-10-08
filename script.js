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

// A tiny pixel star, drawn as SVG rects so it stays crisp at any size.
function star() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 7 7');
  svg.setAttribute('class', 'star');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('shape-rendering', 'crispEdges');
  const d = document.createElementNS(ns, 'path');
  d.setAttribute('d', 'M3 0h1v2h3v1H5v1l1 3H4V5H3v2H1l1-3V3H0V2h3z');
  svg.append(d);
  return svg;
}

function flow(d) {
  const stepEl = (s) => s.parallel
    ? h('div', { class: 'par' }, s.parallel.map((x) => h('span', { class: 'step' }, x)))
    : h('span', { class: 'step' }, s);
  return h('div', { class: 'flow' },
    h('p', { class: 'flow-title' }, d.title),
    d.rows.map((r) =>
      h('div', { class: 'flow-row' },
        r.label ? h('span', { class: 'flow-label' }, r.label) : null,
        h('ol', null, r.steps.map((s) => h('li', null, stepEl(s)))))));
}

function shot(s) {
  const host = s.url.replace('http://', '');
  return h('a', { class: 'shot', href: s.url, target: '_blank', rel: 'noopener' },
    h('span', { class: 'chrome', 'aria-hidden': 'true' },
      h('i'), h('i'), h('i'), h('b', null, host + ' (HTTP)')),
    h('img', { src: s.src, alt: s.alt, width: s.w, height: s.h, loading: 'lazy' }),
    h('span', { class: 'cap' }, s.caption));
}

function buttons(target, withResume) {
  const L = SITE.links;
  const row = [
    ext('GitHub', L.github),
    ext('LinkedIn', L.linkedin),
    h('a', { class: 'btn', href: 'mailto:' + L.email }, 'Email'),
  ];
  if (withResume) {
    const r = h('a', { class: 'btn is-disabled', 'aria-disabled': 'true' }, 'Resume (coming soon)');
    row.push(r);
    fetch(L.resume, { method: 'HEAD' }).then((res) => {
      if (!res.ok) return;
      r.className = 'btn btn-primary';
      r.textContent = 'Resume (PDF)';
      r.href = L.resume;
      r.removeAttribute('aria-disabled');
    }).catch(() => {});
  }
  target.append(...row);
}

// Hero
$('name').textContent = SITE.name;
$('pref').textContent = SITE.preferredName;
$('tagline').textContent = SITE.tagline;
$('seeking').textContent = SITE.seeking;
$('sheet').append(...SITE.sheet.map((r) => h('div', null, h('dt', null, r.k), h('dd', null, r.v))));
buttons($('hero-buttons'), true);
buttons($('contact-buttons'), false);

// Open source
const prRow = (p, fallbackTitle) => h('li', { class: 'pr' },
  h('div', { class: 'pr-head' },
    star(),
    h('span', { class: 'unlocked' }, 'Achievement unlocked'),
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

// Skills
$('skills-list').append(...SITE.skills.map((s) =>
  h('div', null, h('dt', null, s.group), h('dd', null, s.items.join(', ')))));

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

// Side quests
$('sq-list').append(...SITE.sideQuests.map((q) =>
  h('li', { class: q.done ? 'done' : null },
    h('span', { class: 'box', 'aria-hidden': 'true' }, q.done ? 'x' : ''),
    h('span', null, q.text),
    h('span', { class: 'sr' }, q.done ? ' (done)' : ' (not yet)'))));

// Scroll progress bar
const xp = $('xp');
let ticking = false;
function onScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  xp.style.width = (max > 0 ? (scrollY / max) * 100 : 0) + '%';
  ticking = false;
}
addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
onScroll();

// Highlight the current section in the nav
const links = [...document.querySelectorAll('.bar nav a')];
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
  }
}, { rootMargin: '-40% 0px -55% 0px' });
document.querySelectorAll('main section[id]').forEach((s) => io.observe(s));

// Konami code switches to a handheld palette.
const code = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
let pos = 0;
addEventListener('keydown', (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  pos = k === code[pos] ? pos + 1 : (k === code[0] ? 1 : 0);
  if (pos === code.length) {
    pos = 0;
    const on = document.documentElement.dataset.theme !== 'gb';
    document.documentElement.dataset.theme = on ? 'gb' : '';
  }
});
