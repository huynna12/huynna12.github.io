// A self-playing 3D Tetris board for the hero. Loaded after the page is ready.
import * as THREE from './vendor/three.module.min.js';

const W = 10, H = 16;

/* ---------- Pieces ---------- */
const SHAPES = {
  I: [[0, 0], [1, 0], [2, 0], [3, 0]],
  O: [[0, 0], [1, 0], [0, 1], [1, 1]],
  T: [[0, 0], [1, 0], [2, 0], [1, 1]],
  S: [[0, 0], [1, 0], [1, 1], [2, 1]],
  Z: [[1, 0], [2, 0], [0, 1], [1, 1]],
  J: [[0, 0], [1, 0], [2, 0], [0, 1]],
  L: [[0, 0], [1, 0], [2, 0], [2, 1]],
};
const TYPES = Object.keys(SHAPES);

const norm = (cells) => {
  const mx = Math.min(...cells.map((c) => c[0]));
  const my = Math.min(...cells.map((c) => c[1]));
  return cells.map(([x, y]) => [x - mx, y - my]);
};
const rotate = (cells) => norm(cells.map(([x, y]) => [y, -x]));

const ROTS = {};
for (const t of TYPES) {
  let c = norm(SHAPES[t]);
  const seen = new Set();
  ROTS[t] = [];
  for (let i = 0; i < 4; i++) {
    const key = JSON.stringify([...c].sort());
    if (!seen.has(key)) { seen.add(key); ROTS[t].push(c); }
    c = rotate(c);
  }
}

const PALETTES = {
  classic: { I: 0x00c4e6, O: 0xffc400, T: 0xa24dff, S: 0x34d058, Z: 0xff4057, J: 0x3d6bff, L: 0xff8a1f, bg: 0x0b0d1a },
  gb:      { I: 0x9bbc0f, O: 0x8bac0f, T: 0xc4e07a, S: 0x9bbc0f, Z: 0x8bac0f, J: 0xc4e07a, L: 0xe0f0c8, bg: 0x0f380f },
};

/* ---------- AI: pick where to put a piece ---------- */
const hit = (occ, cells, ox, oy) => cells.some(([cx, cy]) => {
  const x = ox + cx, y = oy + cy;
  return x < 0 || x >= W || y < 0 || (y < H && occ[y][x]);
});

function plan(grid, type) {
  const occ = grid.map((r) => r.map(Boolean));
  let best = null;
  ROTS[type].forEach((cells, ri) => {
    const w = Math.max(...cells.map((c) => c[0])) + 1;
    const h = Math.max(...cells.map((c) => c[1])) + 1;
    for (let ox = 0; ox <= W - w; ox++) {
      let oy = H + 4;
      while (!hit(occ, cells, ox, oy - 1)) oy--;
      if (oy + h > H) continue;
      const g = occ.map((r) => r.slice());
      for (const [cx, cy] of cells) g[oy + cy][ox + cx] = true;
      const full = g.filter((r) => r.every(Boolean)).length;
      const rest = g.filter((r) => !r.every(Boolean));
      const heights = Array(W).fill(0);
      let holes = 0;
      for (let x = 0; x < W; x++) {
        let top = -1;
        for (let y = rest.length - 1; y >= 0; y--) if (rest[y][x]) { top = y; break; }
        heights[x] = top + 1;
        for (let y = 0; y < top; y++) if (!rest[y][x]) holes++;
      }
      const agg = heights.reduce((a, b) => a + b, 0);
      let bump = 0;
      for (let x = 0; x < W - 1; x++) bump += Math.abs(heights[x] - heights[x + 1]);
      const score = -0.51 * agg + 0.76 * full - 0.36 * holes - 0.18 * bump + Math.random() * 0.05;
      if (!best || score > best.score) best = { ri, ox, oy, score };
    }
  });
  return best;
}

/* ---------- Game state ---------- */
class Game {
  constructor(onStats) {
    this.onStats = onStats;
    this.lines = 0;
    this.pieces = 0;
    this.reset();
  }

  reset() {
    this.grid = Array.from({ length: H }, () => Array(W).fill(null));
    this.cells = [];
    this.cur = null;
    this.clearing = null;
    this.fade = null;
    this.bag = [];
  }

  nextType() {
    if (!this.bag.length) {
      this.bag = [...TYPES];
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
    }
    return this.bag.pop();
  }

  maxHeight() {
    for (let y = H - 1; y >= 0; y--) if (this.grid[y].some(Boolean)) return y + 1;
    return 0;
  }

  spawn() {
    const type = this.nextType();
    const target = plan(this.grid, type);
    if (!target) { this.fade = { t: 0 }; return; }
    this.cur = { type, ri: 0, target, x: 3, y: H + 3, tRot: 0, tMove: 0 };
  }

  update(dt) {
    if (this.fade) {
      this.fade.t += dt;
      if (this.fade.t > 0.7) this.reset();
      return;
    }
    if (this.clearing) {
      this.clearing.t += dt;
      if (this.clearing.t > 0.32) this.finishClear();
      return;
    }
    if (!this.cur) { this.spawn(); return; }

    const p = this.cur;
    const rots = ROTS[p.type];
    if (p.ri !== p.target.ri) {
      p.tRot += dt;
      if (p.tRot > 0.1) { p.tRot = 0; p.ri = (p.ri + 1) % rots.length; }
    }
    const w = Math.max(...rots[p.ri].map((c) => c[0])) + 1;
    p.x = Math.min(Math.max(p.x, 0), W - w);
    if (p.x !== p.target.ox) {
      p.tMove += dt;
      if (p.tMove > 0.06) { p.tMove = 0; p.x += Math.sign(p.target.ox - p.x); }
    }
    const aligned = p.ri === p.target.ri && p.x === p.target.ox;
    const floor = aligned ? p.target.oy : this.maxHeight() + 1;
    p.y = Math.max(p.y - 11 * dt, floor);
    if (aligned && p.y <= p.target.oy) this.lock();
  }

  lock() {
    const p = this.cur;
    const cells = ROTS[p.type][p.ri];
    for (const [cx, cy] of cells) {
      const c = { x: p.target.ox + cx, y: p.target.oy + cy, vy: p.target.oy + cy, type: p.type, s: 1 };
      this.grid[c.y][c.x] = c;
      this.cells.push(c);
    }
    this.cur = null;
    this.pieces++;
    const rows = [];
    for (let y = 0; y < H; y++) if (this.grid[y].every(Boolean)) rows.push(y);
    if (rows.length) {
      this.clearing = { rows, t: 0 };
      this.lines += rows.length;
    } else if (this.maxHeight() >= H - 3) {
      this.fade = { t: 0 };
    }
    this.onStats && this.onStats(this.lines, this.pieces);
  }

  finishClear() {
    const rows = new Set(this.clearing.rows);
    this.cells = this.cells.filter((c) => !rows.has(c.y));
    for (const c of this.cells) {
      c.y -= this.clearing.rows.filter((r) => r < c.y).length;
    }
    this.grid = Array.from({ length: H }, () => Array(W).fill(null));
    for (const c of this.cells) this.grid[c.y][c.x] = c;
    this.clearing = null;
  }
}

/* ---------- Rendering ---------- */
function blockGeometry() {
  const a = 0.45, r = 0.13;
  const s = new THREE.Shape();
  s.moveTo(-a + r, -a);
  s.lineTo(a - r, -a);
  s.quadraticCurveTo(a, -a, a, -a + r);
  s.lineTo(a, a - r);
  s.quadraticCurveTo(a, a, a - r, a);
  s.lineTo(-a + r, a);
  s.quadraticCurveTo(-a, a, -a, a - r);
  s.lineTo(-a, -a + r);
  s.quadraticCurveTo(-a, -a, -a + r, -a);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.42, bevelEnabled: true, bevelThickness: 0.09, bevelSize: 0.05, bevelSegments: 3, curveSegments: 5,
  });
  g.translate(0, 0, -0.21);
  return g;
}

function gridTexture() {
  const c = document.createElement('canvas');
  c.width = 320; c.height = 512;
  const g = c.getContext('2d');
  g.strokeStyle = 'rgba(160,175,255,0.09)';
  g.lineWidth = 2;
  for (let x = 0; x <= W; x++) { g.beginPath(); g.moveTo(x * 32, 0); g.lineTo(x * 32, 512); g.stroke(); }
  for (let y = 0; y <= H; y++) { g.beginPath(); g.moveTo(0, y * 32); g.lineTo(320, y * 32); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function startBoard({ canvas, stage, onStats }) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  } catch (e) {
    stage.dataset.glerr = String(e.message || e).slice(0, 160);
    return false;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  const fov = THREE.MathUtils.degToRad(camera.fov);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3f7a, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.8);
  key.position.set(-6, 10, 14);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x9db6ff, 1.2);
  fill.position.set(8, -4, 8);
  scene.add(fill);

  const group = new THREE.Group();
  scene.add(group);

  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H),
    new THREE.MeshBasicMaterial({ map: gridTexture(), transparent: true }),
  );
  back.position.z = -0.5;
  group.add(back);
  const frame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(W, H)),
    new THREE.LineBasicMaterial({ color: 0x39407a }),
  );
  frame.position.z = -0.49;
  group.add(frame);

  const CAP = W * H + 8;
  const mesh = new THREE.InstancedMesh(
    blockGeometry(),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.05, clearcoat: 0.9, clearcoatRoughness: 0.18 }),
    CAP,
  );
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.setColorAt(0, new THREE.Color(1, 1, 1));
  mesh.frustumCulled = false;
  group.add(mesh);

  let palette = 'classic';
  const colors = {};
  const setPalette = (name) => {
    palette = name;
    const p = PALETTES[name];
    for (const t of TYPES) colors[t] = new THREE.Color(p[t]);
    renderer.setClearColor(p.bg, 1);
  };
  setPalette(document.documentElement.dataset.theme === 'gb' ? 'gb' : 'classic');
  new MutationObserver(() => {
    setPalette(document.documentElement.dataset.theme === 'gb' ? 'gb' : 'classic');
    if (reduced) draw(0);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  const white = new THREE.Color(1, 1, 1);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const tmp = new THREE.Color();

  const game = new Game(onStats);

  function put(i, x, y, type, scale, flash) {
    pos.set(x - (W - 1) / 2, y - (H - 1) / 2, 0);
    sc.setScalar(scale);
    m.compose(pos, q, sc);
    mesh.setMatrixAt(i, m);
    tmp.copy(colors[type]);
    if (flash) tmp.lerp(white, flash);
    mesh.setColorAt(i, tmp);
  }

  function draw(dt) {
    let i = 0;
    const clearRows = game.clearing ? new Set(game.clearing.rows) : null;
    const flashT = game.clearing ? game.clearing.t : 0;
    const fadeS = game.fade ? Math.max(0, 1 - game.fade.t / 0.7) : 1;
    const ease = 1 - Math.exp(-dt * 14);
    for (const c of game.cells) {
      c.vy += (c.y - c.vy) * ease;
      let s = fadeS, f = 0;
      if (clearRows && clearRows.has(c.y)) {
        f = 0.5 + 0.5 * Math.sin(flashT * 40);
        s = fadeS * (1 + 0.12 * Math.sin(flashT * 24));
      }
      put(i++, c.x, c.vy, c.type, s, f);
    }
    const p = game.cur;
    if (p) {
      for (const [cx, cy] of ROTS[p.type][p.ri]) put(i++, p.x + cx, p.y + cy, p.type, 1, 0);
    }
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    renderer.render(scene, camera);
  }

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const needH = H + 3.2, needW = W + 2.2;
    const dist = Math.max((needH / 2) / Math.tan(fov / 2), (needW / 2) / (Math.tan(fov / 2) * camera.aspect));
    camera.position.set(0, 0.4, dist);
    camera.lookAt(0, 0.4, 0);
    if (reduced) draw(0);
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  // Tilt toward the pointer.
  let tx = 0, ty = 0;
  if (!reduced) {
    addEventListener('pointermove', (e) => {
      tx = (e.clientX / innerWidth - 0.5) * 2;
      ty = (e.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });
  }
  group.rotation.set(-0.08, -0.2, 0);

  if (reduced) {
    // Show a settled board without animating.
    for (let n = 0; n < 2600; n++) game.update(1 / 60);
    draw(0);
    return true;
  }

  let visible = true, last = performance.now();
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe(stage);
  (function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!visible) return;
    group.rotation.y += (-0.2 + tx * 0.32 - group.rotation.y) * 0.06;
    group.rotation.x += (-0.08 + ty * 0.12 - group.rotation.x) * 0.06;
    game.update(dt);
    draw(dt);
  })(last);

  // Fast-forward helper for screenshots: /?board=40 simulates 40 seconds first.
  const ff = Number(new URLSearchParams(location.search).get('board'));
  if (ff > 0) for (let n = 0; n < ff * 60; n++) game.update(1 / 60);
  return true;
}
