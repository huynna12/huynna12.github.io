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

const ext = (label, url, cls = 'btn', extra) =>
  h('a', { class: cls, href: url, target: '_blank', rel: 'noopener' }, label, extra);

function bullets(list) {
  return list.length ? h('ul', { class: 'bullets' }, list.map((b) => h('li', null, b))) : null;
}

function buttons(target, withResume) {
  const L = SITE.links;
  const row = [
    ext('GitHub', L.github),
    ext('LinkedIn', L.linkedin),
    h('a', { class: 'btn', href: 'mailto:' + L.email }, 'Email'),
  ];
  if (withResume) {
    const r = h('a', { class: 'btn btn-ghost is-disabled', 'aria-disabled': 'true' }, 'Resume (coming soon)');
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
buttons($('hero-buttons'), true);
buttons($('contact-buttons'), false);

// Open source
$('os-list').append(...SITE.openSource.map((o) => {
  const header = h('header', null,
    h('h3', null, ext(o.repo, o.repoUrl, 'plain')),
    h('p', { class: 'muted' }, o.blurb));
  const badge = (p) => [
    ext('#' + p.number, p.url, 'pr'),
    h('span', { class: 'merged' }, 'Merged'),
    p.merged ? h('span', { class: 'date' }, p.merged) : null,
  ];
  // Repos where each PR has its own description list one row per PR.
  if (o.prs.every((p) => p.text)) {
    return h('article', { class: 'card' }, header,
      h('ul', { class: 'pr-rows' }, o.prs.map((p) =>
        h('li', null,
          h('div', { class: 'pr-head' }, badge(p)),
          p.title ? h('p', { class: 'mono' }, p.title) : null,
          h('p', null, p.text)))));
  }
  return h('article', { class: 'card' }, header,
    o.summary ? h('p', { class: 'mono' }, o.summary) : null,
    h('ul', { class: 'prs' }, o.prs.map((p) => h('li', null, badge(p)))),
    bullets(o.bullets));
}));

// Projects
$('proj-list').append(...SITE.projects.map((p) =>
  h('article', { class: 'card' },
    h('header', null,
      h('h3', null, p.name),
      p.status ? h('span', { class: 'status' }, p.status) : null),
    h('p', null, p.purpose),
    h('ul', { class: 'tags', 'aria-label': 'Technologies' }, p.tags.map((t) => h('li', null, t))),
    bullets(p.bullets),
    p.links.length
      ? h('p', { class: 'links' }, p.links.map((l) =>
          h('span', null, ext(l.label, l.url, 'plain'), l.note ? h('small', null, ' (' + l.note + ')') : null)))
      : null)));

// Skills
$('skills-list').append(...SITE.skills.map((s) =>
  h('div', { class: 'card' }, h('h3', null, s.group), h('p', null, s.items.join(', ')))));

// Background
const E = SITE.education;
$('bg-list').append(
  h('article', { class: 'card' },
    h('h3', null, E.school),
    h('p', null, E.degree),
    h('p', { class: 'muted' }, E.detail),
    h('p', { class: 'muted' }, 'Coursework: ' + E.coursework.join(', '))),
  ...SITE.experience.map((x) =>
    h('article', { class: 'card' },
      h('h3', null, x.role),
      h('p', { class: 'muted' }, [x.where, x.when].filter(Boolean).join(' | ')),
      h('p', null, x.text))));

// Side quests
$('now-list').append(...SITE.sideQuests.map((c) => h('li', null, c)));

// Highlight the current section in the nav
const links = [...document.querySelectorAll('.hud nav a')];
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
  }
}, { rootMargin: '-40% 0px -55% 0px' });
document.querySelectorAll('main section[id]').forEach((s) => io.observe(s));
