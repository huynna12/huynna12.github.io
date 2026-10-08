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

// Tetromino icons, drawn as SVG squares.
const PIECES = {
  I: [[0, 0], [1, 0], [2, 0], [3, 0]],
  O: [[0, 0], [1, 0], [0, 1], [1, 1]],
  T: [[0, 0], [1, 0], [2, 0], [1, 1]],
  S: [[0, 0], [1, 0], [1, 1], [2, 1]],
  Z: [[1, 0], [2, 0], [0, 1], [1, 1]],
  J: [[0, 0], [1, 0], [2, 0], [0, 1]],
  L: [[0, 0], [1, 0], [2, 0], [2, 1]],
};
function piece(type, size = 0.8) {
  const ns = 'http://www.w3.org/2000/svg';
  const cells = PIECES[type];
  const w = Math.max(...cells.map((c) => c[0])) + 1;
  const hgt = Math.max(...cells.map((c) => c[1])) + 1;
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${hgt}`);
  svg.setAttribute('width', `${w * size}em`);
  svg.setAttribute('height', `${hgt * size}em`);
  svg.setAttribute('class', `pc pc-${type}`);
  svg.setAttribute('aria-hidden', 'true');
  for (const [x, y] of cells) {
    const r = document.createElementNS(ns, 'rect');
    r.setAttribute('x', x + 0.06);
    r.setAttribute('y', hgt - 1 - y + 0.06);
    r.setAttribute('width', 0.88);
    r.setAttribute('height', 0.88);
    r.setAttribute('rx', 0.16);
    svg.append(r);
  }
  return svg;
}

// A small spinning 3D piece built from CSS cubes (no WebGL needed).
function piece3d(type, delay = 0) {
  const cells = PIECES[type];
  const w = Math.max(...cells.map((c) => c[0])) + 1;
  const hgt = Math.max(...cells.map((c) => c[1])) + 1;
  return h('span', { class: `p3 pc3-${type}`, style: `--w:${w};--h:${hgt};--d:${delay}s`, 'aria-hidden': 'true' },
    h('span', { class: 'p3-spin' },
      cells.map(([x, y]) => h('span', { class: 'cube', style: `--x:${x};--y:${hgt - 1 - y}` },
        ['f', 'k', 'r', 'l', 't', 'b'].map((c) => h('i', { class: c }))))));
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
$('logo').append(piece('T', 0.45));
document.querySelectorAll('.num[data-piece]').forEach((n, i) => n.prepend(piece3d(n.dataset.piece, -i * 1.3)));
buttons($('hero-buttons'), true);
buttons($('contact-buttons'), false);

// Open source
const prRow = (p, fallbackTitle) => h('li', { class: 'pr' },
  h('div', { class: 'pr-head' },
    piece('I', 0.55),
    h('span', { class: 'unlocked' }, 'Line cleared'),
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
const SKILL_PIECES = { Languages: 'I', Infrastructure: 'J', 'Backend and Observability': 'S', AI: 'Z' };
$('skills-list').append(...SITE.skills.map((s) =>
  h('div', null, h('dt', null, piece(SKILL_PIECES[s.group] || 'T', 0.5), s.group), h('dd', null, s.items.join(', ')))));

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

// The 3D board loads after the page is ready so it never blocks first paint.
const col = $('stage-col');
const hint = $('hint');
const playBtn = $('play');
const pad = $('pad');
const HINT_AUTO = 'Each block is something I work with. Take over if you like.';
const TOUCH = matchMedia('(pointer: coarse)').matches;
const HINT_PLAY = TOUCH ? 'Use the buttons below. Tap Hand it back to let it play itself.' : '\u2190 \u2192 move \u00b7 \u2191 rotate \u00b7 \u2193 soft drop \u00b7 Space drop \u00b7 Esc hands it back';
const pad2 = (n) => String(n).padStart(2, '0');

const best = {
  get() { try { return Number(localStorage.getItem('tetris-best')) || 0; } catch (e) { return 0; } },
  set(n) { try { localStorage.setItem('tetris-best', String(n)); } catch (e) {} },
};

// Color key for the board: one color per category of what drops.
$('legend').append(...SITE.dropCategories.map((c) =>
  h('li', null, h('i', { class: 'lg', 'data-c': c.col }), c.name)));

function loadBoard() {
  if (navigator.connection && navigator.connection.saveData) return col.classList.add('nogl');
  import('./board.js?v=9').then((m) => {
    let lastLines = 0;
    const api = m.startBoard({
      canvas: $('board'),
      stage: $('stage'),
      tagsEl: $('blocklabels'),
      items: SITE.drops.map((d) => ({
        label: d.label,
        col: (SITE.dropCategories.find((c) => c.name === d.cat) || { col: 'I' }).col,
      })),
      onStats: (l) => { lastLines = l; $('lines').textContent = pad2(l); },
      onEvent: (ev, arg) => {
        if (ev === 'now') { $('now').textContent = arg.label; return; }
        if (ev !== 'over') return;
        const lines = arg;
        const b = Math.max(best.get(), lines);
        best.set(b);
        hint.textContent = 'Game over: ' + lines + ' line' + (lines === 1 ? '' : 's') + '. Best: ' + b + '. Starting again.';
        setTimeout(() => { if (api.human) hint.textContent = HINT_PLAY; }, 2600);
      },
      onMode: (human) => {
        playBtn.textContent = human ? 'Hand it back' : 'Take over';
        playBtn.setAttribute('aria-pressed', String(human));
        $('stage').classList.toggle('playing', human);
        pad.hidden = !human;
        hint.textContent = human ? HINT_PLAY : HINT_AUTO;
        if (human) {
          const b = best.get();
          if (b) hint.textContent = HINT_PLAY + ' Best: ' + b + '.';
          playBtn.blur();
        }
      },
    });
    if (!api) return col.classList.add('nogl');
    playBtn.disabled = false;
    playBtn.addEventListener('click', () => api.toggle());

    // On-screen pad: hold left, right and down to repeat.
    pad.querySelectorAll('button').forEach((b) => {
      const act = b.dataset.act;
      let t1 = 0, t2 = 0;
      const stop = () => { clearTimeout(t1); clearInterval(t2); if (act === 'soft') api.act('soft-off'); };
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (act === 'soft') return api.act('soft-on');
        api.act(act);
        if (act === 'left' || act === 'right') t1 = setTimeout(() => { t2 = setInterval(() => api.act(act), 70); }, 260);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, stop));
    });
  }).catch((e) => { col.dataset.err = String((e && e.message) || e).slice(0, 160); col.classList.add('nogl'); });
}
if (document.readyState === 'complete') setTimeout(loadBoard, 0);
else addEventListener('load', () => (window.requestIdleCallback ? requestIdleCallback(loadBoard, { timeout: 1500 }) : setTimeout(loadBoard, 300)));
