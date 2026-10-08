// A 3D scene for the hero: a girl with a flag shirt sips iced coffee on a red plastic stool,
// next to a second stool with a phin dripping into a glass. Loaded after the page is ready.
import * as THREE from './vendor/three.module.min.js';

const { MathUtils: M } = THREE;
const UP = new THREE.Vector3(0, 1, 0);

/* ---------- Glass ---------- */
const GLASS_H = 9;
const RO = (y) => 2.4 + 0.8 * (y / GLASS_H);
const RI = (y) => RO(y) - 0.14;
const innerR = (y) => RI(y) - 0.03;
const MILK_TOP = 2.6;
const COFFEE_TOP = 8.8;

// Dark coffee with a caramel blend at the bottom, scattered with flag-coloured dots (like the stamp art).
function polkaTexture() {
  const W = 512, H = 256;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#3b2417'; g.fillRect(0, 0, W, H);
  const gr = g.createLinearGradient(0, H * 0.66, 0, H);
  gr.addColorStop(0, 'rgba(201,161,95,0)'); gr.addColorStop(1, 'rgba(201,161,95,1)');
  g.fillStyle = gr; g.fillRect(0, H * 0.66, W, H * 0.34);
  const cols = ['#d8352b', '#2a5bb8', '#f1be2d', '#fff4e0'];
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const dots = [];
  for (let i = 0; i < 17; i++) dots.push([rnd() * W, 14 + rnd() * (H * 0.6), 11 + rnd() * 24, cols[i % 4]]);
  for (const [x, y, r, col] of dots) {
    g.fillStyle = col;
    for (const dx of [-W, 0, W]) { g.beginPath(); g.arc(x + dx, y, r, 0, Math.PI * 2); g.fill(); }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

let shared = null;
function sharedParts() {
  if (shared) return shared;
  const pts = [new THREE.Vector2(0.001, 0), new THREE.Vector2(RO(0), 0)];
  for (let i = 1; i <= 12; i++) { const y = (GLASS_H * i) / 12; pts.push(new THREE.Vector2(RO(y), y)); }
  pts.push(new THREE.Vector2(RI(GLASS_H), GLASS_H));
  for (let i = 11; i >= 0; i--) { const y = 0.55 + ((GLASS_H - 0.55) * i) / 11; pts.push(new THREE.Vector2(RI(y), y)); }
  pts.push(new THREE.Vector2(0.001, 0.55));
  const glassGeo = new THREE.LatheGeometry(pts, 40);

  const milkGeo = new THREE.CylinderGeometry(innerR(MILK_TOP), innerR(0.55), MILK_TOP - 0.55, 40, 1, false);
  milkGeo.translate(0, (MILK_TOP + 0.55) / 2, 0);

  // Layered coffee (phin glass): caramel at the milk line, dark above.
  const cBot = MILK_TOP - 0.1;
  const layeredGeo = new THREE.CylinderGeometry(innerR(COFFEE_TOP), innerR(cBot), COFFEE_TOP - cBot, 40, 6, false);
  layeredGeo.translate(0, (COFFEE_TOP + cBot) / 2, 0);
  const pos = layeredGeo.attributes.position, cols = [];
  const c0 = new THREE.Color(0xb98a5a), c1 = new THREE.Color(0x3b2417), t = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    t.copy(c0).lerp(c1, M.clamp((pos.getY(i) - cBot) / 1.8, 0, 1));
    cols.push(t.r, t.g, t.b);
  }
  layeredGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));

  // Stirred coffee (her glass): one light-brown colour from the bottom up.
  const mixedGeo = new THREE.CylinderGeometry(innerR(COFFEE_TOP), innerR(0.55), COFFEE_TOP - 0.55, 40, 1, false);
  mixedGeo.translate(0, (COFFEE_TOP + 0.55) / 2, 0);

  const a = 0.62, r = 0.2, s = new THREE.Shape();
  s.moveTo(-a + r, -a); s.lineTo(a - r, -a); s.quadraticCurveTo(a, -a, a, -a + r);
  s.lineTo(a, a - r); s.quadraticCurveTo(a, a, a - r, a);
  s.lineTo(-a + r, a); s.quadraticCurveTo(-a, a, -a, a - r);
  s.lineTo(-a, -a + r); s.quadraticCurveTo(-a, -a, -a + r, -a);
  const iceGeo = new THREE.ExtrudeGeometry(s, { depth: 0.9, bevelEnabled: true, bevelThickness: 0.16, bevelSize: 0.12, bevelSegments: 3, curveSegments: 6 });
  iceGeo.translate(0, 0, -0.45);

  shared = {
    glassGeo, milkGeo, layeredGeo, mixedGeo, iceGeo,
    glassMat: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.2, envMapIntensity: 1.5, side: THREE.DoubleSide, depthWrite: false }),
    milkMat: new THREE.MeshStandardMaterial({ color: 0xf4e6a8, roughness: 0.5 }),
    polka: polkaTexture(),
    iceMat: new THREE.MeshStandardMaterial({ color: 0xe3eef6, roughness: 0.1, transparent: true, opacity: 0.5, envMapIntensity: 1.6 }),
    surfGeo: new THREE.CircleGeometry(1, 32),
  };
  return shared;
}

/* A glass of coffee. `mixed` = stirred light brown; otherwise milk at the bottom with dark coffee above.
   The coffee is clipped by a plane that follows the glass, so it can tilt. */
function makeGlass({ ice, mixed }) {
  const p = sharedParts();
  const root = new THREE.Group();
  const glass = new THREE.Mesh(p.glassGeo, p.glassMat);
  glass.renderOrder = 4;
  root.add(glass);
  if (!mixed) root.add(new THREE.Mesh(p.milkGeo, p.milkMat));
  const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 3);
  const coffeeMat = mixed
    ? new THREE.MeshStandardMaterial({ color: 0xb98a5a, roughness: 0.35, envMapIntensity: 0.9, side: THREE.DoubleSide, clippingPlanes: [plane] })
    : new THREE.MeshStandardMaterial({ map: p.polka, roughness: 0.25, envMapIntensity: 1.1, side: THREE.DoubleSide, clippingPlanes: [plane] });
  const coffee = new THREE.Mesh(mixed ? p.mixedGeo : p.layeredGeo, coffeeMat);
  const surface = new THREE.Mesh(p.surfGeo, new THREE.MeshStandardMaterial({ color: mixed ? 0xc59a6b : 0x3b2417, roughness: mixed ? 0.3 : 0.1, envMapIntensity: 1.3 }));
  surface.rotation.x = -Math.PI / 2;
  root.add(coffee, surface);
  const cubes = [];
  if (ice) {
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(p.iceGeo, p.iceMat);
      m.renderOrder = 3;
      m.userData = { ang: i * 2.1 + 0.4, rad: 0.45 + 0.25 * i, ph: i * 1.7, tilt: [0.3, -0.4, 0.2][i] };
      root.add(m); cubes.push(m);
    }
  }
  const up = new THREE.Vector3(), pt = new THREE.Vector3(), n = new THREE.Vector3();
  return {
    root, level: 0,
    setLevel(level, time, still) {
      this.level = level;
      surface.position.y = level;
      surface.scale.setScalar(innerR(level) * 0.995);
      root.updateWorldMatrix(true, false);
      up.set(0, 1, 0).transformDirection(root.matrixWorld);
      pt.set(0, level, 0).applyMatrix4(root.matrixWorld);
      plane.setFromNormalAndCoplanarPoint(n.copy(up).negate(), pt);
      for (const m of cubes) {
        const u = m.userData;
        const bob = still ? 0 : Math.sin(time * 1.1 + u.ph) * 0.07;
        const a = u.ang + (still ? 0 : time * 0.05);
        m.position.set(Math.cos(a) * u.rad, level - 0.12 + bob, Math.sin(a) * u.rad);
        m.rotation.set(u.tilt, u.ang + (still ? 0 : time * 0.12), 0.15 * u.tilt);
      }
    },
  };
}

function makePhin(steel) {
  const g = new THREE.Group();
  const body = [[0, 0.05], [3.9, 0], [4.0, 0.06], [4.0, 0.28], [3.1, 0.28], [2.78, 0.36], [2.78, 3.7], [2.62, 3.7], [2.62, 0.5], [0, 0.5]];
  g.add(new THREE.Mesh(new THREE.LatheGeometry(body.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.001), y)), 48), steel));
  const lid = [new THREE.Vector2(3.02, 3.6), new THREE.Vector2(3.02, 3.74)];
  for (let a = 0; a <= 12; a++) {
    const t = (a / 12) * (Math.PI / 2);
    lid.push(new THREE.Vector2(Math.max(2.96 * Math.cos(t), 0.001), 3.74 + 1.25 * Math.sin(t)));
  }
  g.add(new THREE.Mesh(new THREE.LatheGeometry(lid, 48), steel));
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.3, 12), steel); stem.position.y = 5.1;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 12), steel); knob.position.y = 5.42;
  g.add(stem, knob);
  return g;
}

/* ---------- The red plastic stool ---------- */
const SEAT = 7.5;
const STOOL = 11;      // width of the square top

function makeStool(red, darkRed) {
  const g = new THREE.Group();
  const half = STOOL / 2, rad = 2.2;
  // top slab with rounded corners
  const s = new THREE.Shape();
  s.moveTo(-half + rad, -half); s.lineTo(half - rad, -half); s.quadraticCurveTo(half, -half, half, -half + rad);
  s.lineTo(half, half - rad); s.quadraticCurveTo(half, half, half - rad, half);
  s.lineTo(-half + rad, half); s.quadraticCurveTo(-half, half, -half, half - rad);
  s.lineTo(-half, -half + rad); s.quadraticCurveTo(-half, -half, -half + rad, -half);
  const slabGeo = new THREE.ExtrudeGeometry(s, { depth: 0.9, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.2, bevelSegments: 3, curveSegments: 8 });
  slabGeo.rotateX(-Math.PI / 2);
  const slab = new THREE.Mesh(slabGeo, red);
  slab.position.y = SEAT - 1.1 - 0.2 + 0.2;
  g.add(slab);
  // hand hole and a few ridges on top
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.95, 24), darkRed);
  hole.rotation.x = -Math.PI / 2; hole.position.set(2.7, SEAT + 0.005, -2.9);
  g.add(hole);
  for (let i = -2; i <= 2; i++) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 8.6), darkRed);
    r.position.set(i * 1.8, SEAT + 0.01, 0); g.add(r);
  }
  // four arched side panels: they read as legs with an arch between them
  const pw = STOOL - 2.4, ph = SEAT - 1.1 + 0.5, leg = 1.5;
  const sh = new THREE.Shape();
  sh.moveTo(-pw / 2, 0); sh.lineTo(-pw / 2 + leg, 0); sh.lineTo(-pw / 2 + leg, ph * 0.5);
  sh.quadraticCurveTo(0, ph * 0.5 + (pw - 2 * leg) * 0.62, pw / 2 - leg, ph * 0.5);
  sh.lineTo(pw / 2 - leg, 0); sh.lineTo(pw / 2, 0); sh.lineTo(pw / 2, ph); sh.lineTo(-pw / 2, ph); sh.lineTo(-pw / 2, 0);
  const panelGeo = new THREE.ExtrudeGeometry(sh, { depth: 0.55, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 2, curveSegments: 12 });
  panelGeo.translate(0, 0, -0.275);
  const e = half - 0.9;
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(panelGeo, red);
    const a = (i * Math.PI) / 2;
    m.rotation.y = a;
    m.position.set(Math.sin(a) * e, 0.05, Math.cos(a) * e);
    g.add(m);
  }
  // little corner feet blocks so the corners look solid
  for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.9, ph, 1.9), red);
    b.position.set(x * (half - 1.15), ph / 2 + 0.05, z * (half - 1.15));
    g.add(b);
  }
  return g;
}

/* ---------- Limb helpers ---------- */
const _d = new THREE.Vector3(), _p = new THREE.Vector3(), _dir = new THREE.Vector3();
function limb(r, mat) { return new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 14), mat); }
function setLimb(m, A, B) {
  _d.copy(B).sub(A);
  const len = _d.length() || 0.001;
  m.position.copy(A).addScaledVector(_d, 0.5);
  m.scale.set(1, len, 1);
  m.quaternion.setFromUnitVectors(UP, _d.multiplyScalar(1 / len));
}
function elbow(S, T, a, b, pole, out) {
  const d = M.clamp(S.distanceTo(T), 0.01, a + b - 0.02);
  _dir.copy(T).sub(S).normalize();
  const x = (a * a - b * b + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(a * a - x * x, 0));
  _p.copy(pole).addScaledVector(_dir, -pole.dot(_dir)).normalize();
  return out.copy(S).addScaledVector(_dir, x).addScaledVector(_p, h);
}
const smooth = (t) => t * t * (3 - 2 * t);

function studio() {
  const s = new THREE.Scene();
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, '#e9dcc6'); gr.addColorStop(1, '#6d5a49');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  s.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide })));
  const panel = (w, h, x, y, z, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(i, i, i), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
  };
  panel(24, 16, -26, 14, 18, 6); panel(12, 30, 30, 6, 10, 4); panel(30, 8, 0, 34, -6, 5);
  return s;
}

// A yellow five-point star on a transparent canvas, for the flag shirt.
function starTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#ffd60a';
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 100 : 40;
    g.lineTo(128 + Math.cos(a) * r, 136 + Math.sin(a) * r);
  }
  g.closePath(); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function startCoffee({ canvas, stage, onReady }) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) {
    stage.dataset.glerr = String(e.message || e).slice(0, 160);
    return false;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(studio(), 0.03, 0.1, 100, { size: 64 }).texture;
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 300);
  const fov = M.degToRad(camera.fov);

  scene.add(new THREE.HemisphereLight(0xfff4e4, 0x6b7a9a, 0.85));
  const key = new THREE.DirectionalLight(0xfff1dc, 2.4);
  key.position.set(-14, 26, 22);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfe9ff, 1.1);
  rim.position.set(16, 10, -18);
  scene.add(rim);

  const world = new THREE.Group();
  scene.add(world);

  const blob = (x, z, w, a) => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    gr.addColorStop(0, `rgba(8,18,40,${a})`); gr.addColorStop(1, 'rgba(8,18,40,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, -0.02, z);
    world.add(m);
  };
  blob(0.5, 3, 26, 0.45);
  blob(-15.2, 0, 21, 0.42);

  /* floating balls in the flag colours, like the art */
  const balls = [[-19, 24.5, -3, 2.3, 0xd8352b], [-9, 29.5, -5, 1.6, 0xf1be2d], [13.5, 17, -6, 2.0, 0xfff4e0], [-23.5, 14, -4, 1.7, 0x2a5bb8], [10.5, 5.5, -5, 1.5, 0xf1be2d]].map(([x, y, z, r, color], i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), new THREE.MeshStandardMaterial({ color, roughness: 0.32, envMapIntensity: 1.1 }));
    m.position.set(x, y, z);
    m.userData = { y, ph: i * 1.3 };
    world.add(m);
    return m;
  });

  /* materials */
  const red = new THREE.MeshStandardMaterial({ color: 0xb4271b, roughness: 0.5, envMapIntensity: 0.7 });
  const darkRed = new THREE.MeshStandardMaterial({ color: 0x7e1a12, roughness: 0.6 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xf7e3d3, roughness: 0.6 });
  const hairM = new THREE.MeshStandardMaterial({ color: 0x0d0a09, roughness: 0.38, envMapIntensity: 1.3, side: THREE.DoubleSide });
  const shirt = new THREE.MeshStandardMaterial({ color: 0xd9241c, roughness: 0.7 });
  const jeans = new THREE.MeshStandardMaterial({ color: 0x2c4f8a, roughness: 0.8 });
  const shoeW = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.4 });
  const sole = new THREE.MeshStandardMaterial({ color: 0xe3a62a, roughness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x120d0b, roughness: 0.5 });
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xc9ced6, metalness: 1, roughness: 0.22, envMapIntensity: 1.35, side: THREE.DoubleSide });
  const blush = new THREE.MeshBasicMaterial({ color: 0xf08a96, transparent: true, opacity: 0.55 });

  /* ---- stool the girl sits on ---- */
  const YAW = -0.72;                      // she turns toward the phin, so the sip is seen in profile
  const stool1 = makeStool(red, darkRed);
  stool1.rotation.y = YAW;
  world.add(stool1);

  /* ---- second stool as a table: the phin and its glass ---- */
  const stool2 = makeStool(red, darkRed);
  stool2.position.set(-15.4, 0, 0.4);
  stool2.rotation.y = 0.25;
  world.add(stool2);
  const SET_SCALE = 0.78;
  const tableGlass = makeGlass({ ice: true, mixed: false });
  const phinSet = new THREE.Group();
  phinSet.position.set(-15.4, SEAT, 0.4);
  phinSet.scale.setScalar(SET_SCALE);
  const phin = makePhin(steel); phin.position.y = GLASS_H;
  phinSet.add(tableGlass.root, phin);
  world.add(phinSet);

  const drop = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 12), new THREE.MeshStandardMaterial({ color: 0x3b2417, roughness: 0.12, envMapIntensity: 1.3 }));
  drop.visible = false; drop.renderOrder = 2;
  phinSet.add(drop);
  const ringGeo = new THREE.RingGeometry(0.09, 0.17, 40);
  const ripples = [];
  const dr = { phase: 'wait', t: 0.7, y: 0, v: 0 };

  /* ---- the girl ---- */
  const girl = new THREE.Group();
  girl.rotation.y = YAW;
  world.add(girl);
  const upper = new THREE.Group();
  upper.position.set(0, SEAT + 0.9, 0.3);
  girl.add(upper);

  const hips = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), jeans); hips.scale.set(3.7, 2.3, 3.3); hips.position.set(0, SEAT + 1.1, 0.3);
  girl.add(hips);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(3.3, 3.6, 6, 20), shirt);
  torso.position.set(0, 4.6, 0); torso.scale.set(1, 1, 0.9);
  upper.add(torso);
  // yellow star on the chest: a patch of cylinder that hugs the torso
  {
    const arc = 3.6 / 3.34;
    const patch = new THREE.Mesh(
      new THREE.CylinderGeometry(3.34, 3.34, 3.6, 28, 1, true, -arc / 2, arc),
      new THREE.MeshStandardMaterial({ map: starTexture(), transparent: true, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    );
    patch.position.set(0, 5.0, 0); patch.scale.set(1, 1, 0.9);
    upper.add(patch);
  }
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, 1.4, 14), skin); neck.position.set(0, 8.7, 0.1);
  upper.add(neck);

  const head = new THREE.Group();
  head.position.set(0, 9.0, 0.1);
  upper.add(head);
  const HC = new THREE.Vector3(0, 4.0, 0.4);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(4.7, 40, 28), skin); skull.position.copy(HC);
  head.add(skull);

  // Hair: a smooth cap, short locks beside the face, and a ponytail tied at the back.
  // The cap is a little larger than the head, so its clean rim is the hairline (no jagged crossing edges).
  const crown = new THREE.Mesh(new THREE.SphereGeometry(5.3, 72, 36, 0, Math.PI * 2, 0, Math.PI / 2), hairM);
  crown.position.set(HC.x, HC.y + 0.0, HC.z - 0.35);
  crown.rotation.x = -0.3;
  const nape = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), hairM);       // fills in behind the head down to the neck
  nape.scale.set(4.9, 3.8, 3.7); nape.position.set(0, HC.y - 1.2, HC.z - 1.7);
  head.add(crown, nape);
  const locks = [-1, 1].map((side) => {
    const lock = new THREE.Group();                       // hangs from the temple and swings a little
    lock.position.set(side * 4.55, HC.y + 1.0, HC.z + 0.4);
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), hairM);
    m.scale.set(0.8, 3.6, 1.15); m.position.set(0, -3.2, 0);
    lock.add(m);
    head.add(lock);
    return lock;
  });
  // ponytail: a hair tie and a tapered tail that swings
  const pony = new THREE.Group();
  pony.position.set(0, HC.y + 2.4, HC.z - 5.0);
  const tie = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.3, 10, 24), new THREE.MeshStandardMaterial({ color: 0xd9241c, roughness: 0.5 }));
  tie.rotation.x = Math.PI / 2 + 0.4; tie.position.set(0, -0.3, 0);
  const tailPts = [[0.001, 0.8], [0.9, 0.5], [1.5, -0.8], [1.65, -2.6], [1.3, -5.0], [0.7, -7.0], [0.001, -8.2]].map(([r, y]) => new THREE.Vector2(r, y));
  const tail = new THREE.Mesh(new THREE.LatheGeometry(tailPts, 28), hairM);
  pony.add(tail, tie);
  pony.rotation.x = 0.35;
  head.add(pony);
  const longBack = pony;   // (the sway code below moves this)

  const faceZ = (x, y) => HC.z + Math.sqrt(Math.max(4.7 * 4.7 - x * x - (y - HC.y) * (y - HC.y), 0)) - 0.05;
  const eyes = [];
  for (const sx of [-1, 1]) {
    const eye = new THREE.Group();
    const ey = HC.y + 0.1;
    eye.position.set(sx * 1.95, ey, faceZ(sx * 1.95, ey) + 0.02);
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), white); sclera.scale.set(1.12, 1.25, 0.34);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), dark); pupil.scale.set(0.58, 0.68, 0.3); pupil.position.set(sx * -0.05, 0, 0.3);
    eye.add(sclera, pupil);
    head.add(eye);
    eyes.push({ eye, pupil, base: pupil.position.clone() });
    const b = new THREE.Mesh(new THREE.CircleGeometry(0.95, 20), blush);
    const bp = new THREE.Vector3(sx * 3.2, HC.y - 1.7, 0); bp.z = faceZ(bp.x, bp.y) + 0.02;
    b.position.copy(bp); b.lookAt(bp.x * 1.8, bp.y, bp.z * 1.8 + 2); head.add(b);
  }
  const mouth = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.55, 4, 8), dark);
  mouth.rotation.z = Math.PI / 2; mouth.position.set(0, HC.y - 2.15, faceZ(0, HC.y - 2.15)); head.add(mouth);

  const arms = [-1, 1].map((side) => ({
    side,
    upperArm: limb(0.98, skin), sleeve: limb(1.16, shirt), fore: limb(0.88, skin),
    sh: new THREE.Mesh(new THREE.SphereGeometry(1.2, 14, 10), shirt),
    sleeveEnd: new THREE.Mesh(new THREE.SphereGeometry(1.0, 14, 10), skin),
    el: new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 8), skin),
    hand: new THREE.Mesh(new THREE.SphereGeometry(1.05, 14, 10), skin),
    S: new THREE.Vector3(), E: new THREE.Vector3(), T: new THREE.Vector3(),
    pole: new THREE.Vector3(side * 0.8, -0.9, -0.1),
  }));
  const legs = [-1, 1].map((side) => ({
    side,
    thigh: limb(1.5, jeans), shin: limb(1.15, skin),
    hip: new THREE.Mesh(new THREE.SphereGeometry(1.5, 14, 10), jeans),
    knee: new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 8), skin),
    shoe: new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), shoeW),
    soleM: new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10), sole),
    H: new THREE.Vector3(side * 1.9, SEAT + 1.2, 0.5), K: new THREE.Vector3(), A: new THREE.Vector3(),
    pole: new THREE.Vector3(0, 0.7, 1),
  }));
  for (const a of arms) girl.add(a.upperArm, a.sleeve, a.fore, a.sh, a.el, a.hand);
  for (const l of legs) { girl.add(l.thigh, l.shin, l.hip, l.knee, l.shoe, l.soleM); l.shoe.scale.set(1.5, 1.0, 2.5); l.soleM.scale.set(1.55, 0.38, 2.6); }

  const held = makeGlass({ ice: true, mixed: true });
  const GS = 0.55;
  held.root.scale.setScalar(GS);
  girl.add(held.root);

  /* ---- animation ---- */
  const CYCLE = 7;
  const phase = (t) => {
    const k = t % CYCLE;
    if (k < 2) return 0;
    if (k < 3) return smooth(k - 2);
    if (k < 4.4) return 1;
    if (k < 5.4) return 1 - smooth(k - 4.4);
    return 0;
  };
  const lerpV = (a, b, s, out) => out.set(M.lerp(a[0], b[0], s), M.lerp(a[1], b[1], s), M.lerp(a[2], b[2], s));
  const RIM_REST = [3.0, 17.0, 5.6], RIM_MOUTH = [0.3, 20.6, 4.9];
  const sleeveEnd = new THREE.Vector3();
  const tmpRim = new THREE.Vector3(), tmpUp = new THREE.Vector3(), tmpO = new THREE.Vector3();
  const qTilt = new THREE.Quaternion(), eul = new THREE.Euler();
  const sipLevel = (t) => {
    const n = Math.floor((t - 3.7) / CYCLE) + 1;
    return Math.max(7.0 - 0.6 * (((n % 6) + 6) % 6), 2.8);
  };
  let lvl = 7.0, time = 0;
  const tableLevel = (t) => (reduced ? 6.9 : MILK_TOP + 0.1 + 4.6 * (1 - Math.exp(-t / 5.5)));

  function step(dt) {
    time += dt;
    const t = time;
    const s = reduced ? 0 : phase(t);
    const idle = reduced ? 0 : Math.sin(t * 1.6);

    upper.rotation.x = 0.05 + 0.03 * s;
    upper.scale.y = 1 + 0.008 * idle;
    head.rotation.x = -0.2 * s + 0.01 * idle;
    head.rotation.z = reduced ? 0 : Math.sin(t * 0.5) * 0.03;
    // hair swings a little
    for (const [i, l] of locks.entries()) l.rotation.z = (reduced ? 0 : Math.sin(t * 1.3 + i) * 0.05) + (i === 0 ? 0.05 : -0.05);
    pony.rotation.x = reduced ? 0.35 : 0.35 + Math.sin(t * 1.6) * 0.1 + 0.12 * s;
    pony.rotation.z = reduced ? 0 : Math.sin(t * 1.15) * 0.1;
    mouth.visible = s < 0.45;
    // big round eyes: look toward the glass, glance up while sipping, blink now and then
    const blink = reduced ? 1 : (t % 4.6 > 4.46 ? 0.08 : 1);
    for (const e of eyes) {
      e.eye.scale.y = M.lerp(e.eye.scale.y, blink, 0.6);
      e.pupil.position.set(e.base.x + 0.28 - 0.1 * s, e.base.y - 0.12 + 0.3 * s, e.base.z);
    }

    for (const b of balls) b.position.y = b.userData.y + (reduced ? 0 : Math.sin(t * 0.8 + b.userData.ph) * 0.55);

    // glass
    lerpV(RIM_REST, RIM_MOUTH, s, tmpRim);
    const tilt = M.degToRad(38) * s;
    tmpUp.set(0, Math.cos(tilt), -Math.sin(tilt));
    tmpO.copy(tmpRim).addScaledVector(tmpUp, -GLASS_H * GS);
    held.root.position.copy(tmpO);
    eul.set(-tilt, 0, 0); qTilt.setFromEuler(eul); held.root.quaternion.copy(qTilt);
    const target = reduced ? 6.6 : sipLevel(t);
    lvl += (target - lvl) * Math.min(dt * 1.6, 1);
    held.setLevel(lvl, t, reduced);

    // arms
    girl.updateMatrixWorld(true);
    for (const a of arms) {
      a.S.set(a.side * 3.55, 8.3, 0.1);
      upper.localToWorld(a.S); girl.worldToLocal(a.S);
      if (a.side > 0) a.T.copy(tmpRim).addScaledVector(tmpUp, -(GLASS_H * GS) * 0.62);
      else a.T.set(-2.6, SEAT + 4.6, 4.6);
      elbow(a.S, a.T, 4.5, 4.3, a.pole, a.E);
      setLimb(a.upperArm, a.S, a.E); setLimb(a.fore, a.E, a.T);
      sleeveEnd.copy(a.E).sub(a.S).multiplyScalar(0.42).add(a.S);      // a short T-shirt sleeve
      setLimb(a.sleeve, a.S, sleeveEnd);
      a.sh.position.copy(a.S); a.el.position.copy(a.E); a.hand.position.copy(a.T);
    }

    // legs: left foot taps
    for (const l of legs) {
      l.A.set(l.side * 2.5, 1.35, 6.9);
      if (l.side < 0 && !reduced) { const tap = Math.max(0, Math.sin(t * 3.2)); l.A.y += 0.6 * tap; l.A.z -= 0.25 * tap; }
      elbow(l.H, l.A, 5.4, 7.9, l.pole, l.K);
      setLimb(l.thigh, l.H, l.K); setLimb(l.shin, l.K, l.A);
      l.hip.position.copy(l.H); l.knee.position.copy(l.K);
      l.shoe.position.set(l.A.x, l.A.y - 0.2, l.A.z + 0.8);
      l.soleM.position.set(l.A.x, l.A.y - 0.95, l.A.z + 0.8);
    }

    // phin glass fills as it drips
    tableGlass.setLevel(tableLevel(t), t, reduced);
    if (!reduced) {
      const level = tableGlass.level;
      if (dr.phase === 'wait') { dr.t -= dt; drop.visible = false; if (dr.t <= 0) { dr.phase = 'form'; dr.t = 0; } }
      else if (dr.phase === 'form') {
        dr.t += dt;
        const k = Math.min(dr.t / 0.55, 1);
        drop.visible = true; drop.position.set(0, GLASS_H - 0.05, 0); drop.scale.set(k * 0.9, k * 1.25, k * 0.9);
        if (k >= 1) { dr.phase = 'fall'; dr.y = GLASS_H - 0.05; dr.v = 0; }
      } else {
        dr.v += 26 * dt; dr.y -= dr.v * dt;
        drop.position.y = dr.y; drop.scale.set(0.8, 1.5, 0.8);
        if (dr.y <= level) {
          const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
          m.rotation.x = -Math.PI / 2; m.position.y = level + 0.015; m.renderOrder = 2; m.userData.age = 0;
          phinSet.add(m); ripples.push(m);
          drop.visible = false; dr.phase = 'wait'; dr.t = 0.9 + Math.random() * 0.5;
        }
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        const m = ripples[i]; m.userData.age += dt;
        const a = m.userData.age;
        m.scale.setScalar(1 + a * 8);
        m.material.opacity = 0.45 * Math.max(0, 1 - a / 1.1);
        if (a > 1.1) { phinSet.remove(m); m.material.dispose(); ripples.splice(i, 1); }
      }
    }
  }

  /* ---- camera ---- */
  const CENTER = new THREE.Vector3(-7.0, 12.2, 1.5);
  let dist = 80, az = 0.38, azBase = 0.38, tilt = 0, tiltT = 0, drag = null, dragStart = 0;
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dist = Math.max((29 / 2) / Math.tan(fov / 2), (36 / 2) / (Math.tan(fov / 2) * camera.aspect));
    if (reduced) render();
  }
  function render() {
    camera.position.set(CENTER.x + Math.sin(az) * dist, CENTER.y + 8 + tilt * 8, CENTER.z + Math.cos(az) * dist);
    camera.lookAt(CENTER);
    renderer.render(scene, camera);
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  canvas.style.touchAction = 'pan-y';
  canvas.addEventListener('pointerdown', (e) => { drag = e.clientX; dragStart = azBase; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (drag === null) return;
    azBase = M.clamp(dragStart - (e.clientX - drag) * 0.01, -1.1, 1.1);
    if (reduced) { az = azBase; render(); }
  });
  const end = () => { drag = null; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  if (!reduced) addEventListener('pointermove', (e) => { tiltT = (e.clientY / innerHeight - 0.5) * 0.8; }, { passive: true });

  // /?coffee=3.4 jumps the animation clock; &freeze=1 stops it. Handy for screenshots.
  const params = new URLSearchParams(location.search);
  if (params.has('az')) { azBase = az = Number(params.get('az')); }
  const jump = Number(params.get('coffee'));
  if (jump > 0) { for (let n = 0; n < jump * 60; n++) step(1 / 60); } else step(0);
  const still = reduced || params.has('freeze');

  function begin() {
    if (still) { render(); onReady && onReady(); return; }
    let visible = true, last = performance.now(), first = true;
    new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe(stage);
    (function loop(now) {
      requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!visible) return;
      step(dt);
      const drift = drag === null ? Math.sin(time * 0.2) * 0.22 : 0;
      az += (azBase + drift - az) * 0.06;
      tilt += (tiltT - tilt) * 0.05;
      render();
      if (first) { first = false; onReady && onReady(); }
    })(last);
  }
  if (renderer.compileAsync) renderer.compileAsync(scene, camera).then(begin, begin);
  else begin();
  return true;
}
