// A little 3D scene for the hero: a girl sipping coffee on a red plastic stool, next to a low table
// with a phin dripping into a glass. Loaded after the page is ready.
import * as THREE from './vendor/three.module.min.js';

const { MathUtils: M } = THREE;
const UP = new THREE.Vector3(0, 1, 0);

/* ---------- Glass (shared shapes) ---------- */
const GLASS_H = 9;
const RO = (y) => 2.4 + 0.8 * (y / GLASS_H);
const RI = (y) => RO(y) - 0.14;
const innerR = (y) => RI(y) - 0.03;
const MILK_TOP = 2.6;
const COFFEE_TOP = 8.8;

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

  const cBot = MILK_TOP - 0.1;
  const coffeeGeo = new THREE.CylinderGeometry(innerR(COFFEE_TOP), innerR(cBot), COFFEE_TOP - cBot, 40, 6, false);
  coffeeGeo.translate(0, (COFFEE_TOP + cBot) / 2, 0);
  const pos = coffeeGeo.attributes.position, cols = [];
  const c0 = new THREE.Color(0xb98a5a), c1 = new THREE.Color(0x3b2417), t = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    t.copy(c0).lerp(c1, M.clamp((pos.getY(i) - cBot) / 1.8, 0, 1));
    cols.push(t.r, t.g, t.b);
  }
  coffeeGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));

  const a = 0.62, r = 0.2, s = new THREE.Shape();
  s.moveTo(-a + r, -a); s.lineTo(a - r, -a); s.quadraticCurveTo(a, -a, a, -a + r);
  s.lineTo(a, a - r); s.quadraticCurveTo(a, a, a - r, a);
  s.lineTo(-a + r, a); s.quadraticCurveTo(-a, a, -a, a - r);
  s.lineTo(-a, -a + r); s.quadraticCurveTo(-a, -a, -a + r, -a);
  const iceGeo = new THREE.ExtrudeGeometry(s, { depth: 0.9, bevelEnabled: true, bevelThickness: 0.16, bevelSize: 0.12, bevelSegments: 3, curveSegments: 6 });
  iceGeo.translate(0, 0, -0.45);

  shared = {
    glassGeo, milkGeo, coffeeGeo, iceGeo,
    glassMat: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.2, envMapIntensity: 1.5, side: THREE.DoubleSide, depthWrite: false }),
    milkMat: new THREE.MeshStandardMaterial({ color: 0xf1dfc0, roughness: 0.55 }),
    iceMat: new THREE.MeshStandardMaterial({ color: 0xe3eef6, roughness: 0.1, transparent: true, opacity: 0.5, envMapIntensity: 1.6 }),
    surfGeo: new THREE.CircleGeometry(1, 32),
  };
  return shared;
}

/* A glass of cà phê sữa đá. Its coffee is clipped by a plane that follows the glass, so it can tilt. */
function makeGlass(withIce) {
  const p = sharedParts();
  const root = new THREE.Group();
  const glass = new THREE.Mesh(p.glassGeo, p.glassMat);
  glass.renderOrder = 4;
  root.add(glass, new THREE.Mesh(p.milkGeo, p.milkMat));
  const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 3);
  const coffee = new THREE.Mesh(p.coffeeGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.22, envMapIntensity: 1.1, side: THREE.DoubleSide, clippingPlanes: [plane] }));
  const surface = new THREE.Mesh(p.surfGeo, new THREE.MeshStandardMaterial({ color: 0x4a2c1c, roughness: 0.1, envMapIntensity: 1.3 }));
  surface.rotation.x = -Math.PI / 2;
  root.add(coffee, surface);
  const ice = [];
  if (withIce) {
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(p.iceGeo, p.iceMat);
      m.renderOrder = 3;
      m.userData = { ang: i * 2.1 + 0.4, rad: 0.45 + 0.25 * i, ph: i * 1.7, tilt: [0.3, -0.4, 0.2][i] };
      root.add(m); ice.push(m);
    }
  }
  const up = new THREE.Vector3(), pt = new THREE.Vector3(), n = new THREE.Vector3();
  return {
    root, ice, level: 0,
    setLevel(level, time, still) {
      this.level = level;
      surface.position.y = level;
      surface.scale.setScalar(innerR(level) * 0.995);
      root.updateWorldMatrix(true, false);
      up.set(0, 1, 0).transformDirection(root.matrixWorld);
      pt.set(0, level, 0).applyMatrix4(root.matrixWorld);
      plane.setFromNormalAndCoplanarPoint(n.copy(up).negate(), pt);
      for (const m of ice) {
        const u = m.userData;
        const bob = still ? 0 : Math.sin(time * 1.1 + u.ph) * 0.07;
        m.position.set(Math.cos(u.ang + (still ? 0 : time * 0.05)) * u.rad, level - 0.12 + bob, Math.sin(u.ang + (still ? 0 : time * 0.05)) * u.rad);
        m.rotation.set(u.tilt, u.ang + (still ? 0 : time * 0.12), 0.15 * u.tilt);
      }
    },
  };
}

/* ---------- Phin with a dripping drop ---------- */
function makePhin(steel) {
  const g = new THREE.Group();
  const body = [[0, 0.05], [3.9, 0], [4.0, 0.06], [4.0, 0.28], [3.1, 0.28], [2.78, 0.36], [2.78, 3.7], [2.62, 3.7], [2.62, 0.5], [0, 0.5]];
  g.add(new THREE.Mesh(new THREE.LatheGeometry(body.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.001), y)), 56), steel));
  const lid = [new THREE.Vector2(3.02, 3.6), new THREE.Vector2(3.02, 3.74)];
  for (let a = 0; a <= 12; a++) {
    const t = (a / 12) * (Math.PI / 2);
    lid.push(new THREE.Vector2(Math.max(2.96 * Math.cos(t), 0.001), 3.74 + 1.25 * Math.sin(t)));
  }
  g.add(new THREE.Mesh(new THREE.LatheGeometry(lid, 56), steel));
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.3, 12), steel); stem.position.y = 5.1;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 12), steel); knob.position.y = 5.42;
  g.add(stem, knob);
  return g;
}

/* ---------- Helpers for limbs ---------- */
const _d = new THREE.Vector3(), _p = new THREE.Vector3(), _dir = new THREE.Vector3();
function limb(r, mat) { return new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 14), mat); }
function setLimb(m, A, B) {
  _d.copy(B).sub(A);
  const len = _d.length() || 0.001;
  m.position.copy(A).addScaledVector(_d, 0.5);
  m.scale.set(1, len, 1);
  m.quaternion.setFromUnitVectors(UP, _d.multiplyScalar(1 / len));
}
// Two-bone IK: where the elbow (or knee) goes for a given shoulder and hand.
function elbow(S, T, a, b, pole, out) {
  const d = M.clamp(S.distanceTo(T), 0.01, a + b - 0.02);
  _dir.copy(T).sub(S).normalize();
  const x = (a * a - b * b + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(a * a - x * x, 0));
  _p.copy(pole).addScaledVector(_dir, -pole.dot(_dir)).normalize();
  return out.copy(S).addScaledVector(_dir, x).addScaledVector(_p, h);
}
const smooth = (t) => t * t * (3 - 2 * t);

/* ---------- The scene ---------- */
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

const SEAT = 7.5;           // height of the stool seat

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

  scene.add(new THREE.HemisphereLight(0xfff4e4, 0x6b5a4a, 0.8));
  const key = new THREE.DirectionalLight(0xfff1dc, 2.4);
  key.position.set(-14, 26, 22);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfe9ff, 1.0);
  rim.position.set(16, 10, -18);
  scene.add(rim);

  const world = new THREE.Group();
  scene.add(world);

  /* soft shadows on the ground */
  const blob = (x, z, w, a) => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    gr.addColorStop(0, `rgba(30,18,10,${a})`); gr.addColorStop(1, 'rgba(30,18,10,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, -0.02, z);
    world.add(m);
  };
  blob(0.5, 3, 24, 0.32);
  blob(-15.5, 0, 20, 0.3);

  /* materials */
  const red = new THREE.MeshStandardMaterial({ color: 0xc8141b, roughness: 0.32, envMapIntensity: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xeec3a4, roughness: 0.55 });
  const hairM = new THREE.MeshStandardMaterial({ color: 0x1b1412, roughness: 0.4, envMapIntensity: 1.2 });
  const shirt = new THREE.MeshStandardMaterial({ color: 0x3e7d4c, roughness: 0.7 });
  const shorts = new THREE.MeshStandardMaterial({ color: 0xe8dac0, roughness: 0.75 });
  const shoeW = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.4 });
  const sole = new THREE.MeshStandardMaterial({ color: 0x2f5d3a, roughness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x241913, roughness: 0.6 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xd9dde2, metalness: 1, roughness: 0.28, envMapIntensity: 1.25, side: THREE.DoubleSide });
  const tableTop = new THREE.MeshStandardMaterial({ color: 0xece3d3, roughness: 0.5 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x4a4540, metalness: 0.7, roughness: 0.45 });
  const blush = new THREE.MeshBasicMaterial({ color: 0xf08a8a, transparent: true, opacity: 0.5 });

  /* ---- red plastic stool ---- */
  {
    const g = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 4.7, 1.2, 48), red); seat.position.y = SEAT - 0.6;
    const rimT = new THREE.Mesh(new THREE.TorusGeometry(5.0, 0.38, 12, 48), red); rimT.rotation.x = Math.PI / 2; rimT.position.y = SEAT - 0.12;
    g.add(seat, rimT);
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      const top = new THREE.Vector3(Math.cos(a) * 3.4, SEAT - 1.1, Math.sin(a) * 3.4);
      const bot = new THREE.Vector3(Math.cos(a) * 4.9, 0.3, Math.sin(a) * 4.9);
      const l = limb(0.6, red); setLimb(l, top, bot); g.add(l);
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 8), red); foot.position.copy(bot); g.add(foot);
    }
    const brace = new THREE.Mesh(new THREE.TorusGeometry(4.15, 0.28, 10, 48), red); brace.rotation.x = Math.PI / 2; brace.position.y = 3.1;
    g.add(brace);
    world.add(g);
  }

  /* ---- low table with the phin and a glass ---- */
  const TABLE = new THREE.Vector3(-15.5, 0, 0);
  const TABLE_TOP = 9.5;
  const tbl = new THREE.Group();
  tbl.position.copy(TABLE);
  {
    const top = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 7.2, 0.7, 48), tableTop); top.position.y = TABLE_TOP - 0.35;
    const edge = new THREE.Mesh(new THREE.TorusGeometry(7.2, 0.2, 8, 48), iron); edge.rotation.x = Math.PI / 2; edge.position.y = TABLE_TOP - 0.35;
    tbl.add(top, edge);
    for (let i = 0; i < 3; i++) {
      const a = Math.PI / 2 + (i * 2 * Math.PI) / 3;
      const l = limb(0.34, iron);
      setLimb(l, new THREE.Vector3(Math.cos(a) * 4.8, TABLE_TOP - 0.6, Math.sin(a) * 4.8), new THREE.Vector3(Math.cos(a) * 6.3, 0.1, Math.sin(a) * 6.3));
      tbl.add(l);
    }
    world.add(tbl);
  }
  const SET_SCALE = 0.55;
  const tableGlass = makeGlass(true);
  const phinSet = new THREE.Group();
  phinSet.position.set(0, TABLE_TOP, 0.2);
  phinSet.scale.setScalar(SET_SCALE);
  const phin = makePhin(steel); phin.position.y = GLASS_H;
  phinSet.add(tableGlass.root, phin);
  tbl.add(phinSet);

  const drop = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 12), new THREE.MeshStandardMaterial({ color: 0x3b2417, roughness: 0.12, envMapIntensity: 1.3 }));
  drop.visible = false; drop.renderOrder = 2;
  phinSet.add(drop);
  const ringGeo = new THREE.RingGeometry(0.09, 0.17, 40);
  const ripples = [];
  const dr = { phase: 'wait', t: 0.7, y: 0, v: 0 };

  /* ---- the girl ---- */
  const girl = new THREE.Group();
  world.add(girl);
  const upper = new THREE.Group();            // torso, head and arms' shoulders lean from the hips
  upper.position.set(0, SEAT + 0.9, 0.3);
  girl.add(upper);

  const hips = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), shorts); hips.scale.set(3.7, 2.3, 3.3); hips.position.set(0, SEAT + 1.1, 0.3);
  girl.add(hips);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(3.3, 3.6, 6, 20), shirt);
  torso.position.set(0, 4.6, 0); torso.scale.set(1, 1, 0.9);
  upper.add(torso);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, 1.4, 14), skin); neck.position.set(0, 8.7, 0.1);
  upper.add(neck);

  const head = new THREE.Group();             // pivots at the neck
  head.position.set(0, 9.0, 0.1);
  upper.add(head);
  const HEAD_C = new THREE.Vector3(0, 4.0, 0.4);   // head centre, relative to neck pivot
  const skull = new THREE.Mesh(new THREE.SphereGeometry(4.7, 40, 28), skin); skull.position.copy(HEAD_C);
  head.add(skull);
  const wedge = 0.95;
  const hairBack = new THREE.Mesh(new THREE.SphereGeometry(4.95, 40, 24, Math.PI / 2 + wedge, Math.PI * 2 - 2 * wedge, 0, Math.PI * 0.64), hairM);
  hairBack.position.copy(HEAD_C); hairBack.material.side = THREE.DoubleSide;
  const bangs = new THREE.Mesh(new THREE.SphereGeometry(4.95, 40, 16, Math.PI / 2 - wedge - 0.1, 2 * wedge + 0.2, 0, Math.PI * 0.34), hairM);
  bangs.position.copy(HEAD_C); bangs.material.side = THREE.DoubleSide;
  head.add(hairBack, bangs);
  const pony = new THREE.Group();             // ponytail swings from a hair tie
  pony.position.set(0, HEAD_C.y + 2.6, HEAD_C.z - 4.6);
  const tie = new THREE.Mesh(new THREE.SphereGeometry(0.75, 14, 10), sole); pony.add(tie);
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(1.05, 4.2, 6, 14), hairM); tail.position.set(0, -2.9, -0.2);
  pony.add(tail);
  head.add(pony);
  const faceZ = (x, y) => HEAD_C.z + Math.sqrt(Math.max(4.7 * 4.7 - x * x - (y - HEAD_C.y) * (y - HEAD_C.y), 0)) - 0.05;
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.12, 8, 18, Math.PI), dark);
    eye.position.set(sx * 1.95, HEAD_C.y - 0.2, faceZ(sx * 1.95, HEAD_C.y - 0.2)); head.add(eye);
    const b = new THREE.Mesh(new THREE.CircleGeometry(0.85, 20), blush);
    const bp = new THREE.Vector3(sx * 3.1, HEAD_C.y - 1.5, 0); bp.z = faceZ(bp.x, bp.y) + 0.02;
    b.position.copy(bp); b.lookAt(bp.x * 1.8, bp.y, bp.z * 1.8 + 2); head.add(b);
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.1, 8, 16, Math.PI), dark);
  mouth.rotation.z = Math.PI; mouth.position.set(0, HEAD_C.y - 1.9, faceZ(0, HEAD_C.y - 1.9)); head.add(mouth);

  /* limbs */
  const arms = [-1, 1].map((side) => ({
    side,
    upperArm: limb(1.0, shirt), fore: limb(0.88, skin),
    sh: new THREE.Mesh(new THREE.SphereGeometry(1.05, 14, 10), shirt),
    el: new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 8), skin),
    hand: new THREE.Mesh(new THREE.SphereGeometry(1.05, 14, 10), skin),
    S: new THREE.Vector3(), E: new THREE.Vector3(), T: new THREE.Vector3(),
    pole: new THREE.Vector3(side * 0.8, -0.9, -0.1),
  }));
  const legs = [-1, 1].map((side) => ({
    side,
    thigh: limb(1.5, shorts), shin: limb(1.15, skin),
    hip: new THREE.Mesh(new THREE.SphereGeometry(1.5, 14, 10), shorts),
    knee: new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 8), skin),
    shoe: new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), shoeW),
    soleM: new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10), sole),
    H: new THREE.Vector3(side * 1.9, SEAT + 1.2, 0.5), K: new THREE.Vector3(), A: new THREE.Vector3(),
    pole: new THREE.Vector3(0, 0.7, 1),
  }));
  for (const a of arms) girl.add(a.upperArm, a.fore, a.sh, a.el, a.hand);
  for (const l of legs) { girl.add(l.thigh, l.shin, l.hip, l.knee, l.shoe, l.soleM); l.shoe.scale.set(1.5, 1.0, 2.5); l.soleM.scale.set(1.55, 0.38, 2.6); }

  const held = makeGlass(true);
  const GS = 0.55;                            // glass scale in her hand
  held.root.scale.setScalar(GS);
  girl.add(held.root);

  /* ---- animation ---- */
  const CYCLE = 7;
  const phase = (t) => {                      // 0 = glass at chest, 1 = glass at mouth
    const k = t % CYCLE;
    if (k < 2) return 0;
    if (k < 3) return smooth(k - 2);
    if (k < 4.4) return 1;
    if (k < 5.4) return 1 - smooth(k - 4.4);
    return 0;
  };
  const lerpV = (a, b, s, out) => out.set(M.lerp(a[0], b[0], s), M.lerp(a[1], b[1], s), M.lerp(a[2], b[2], s));
  const RIM_REST = [3.0, 17.0, 5.6], RIM_MOUTH = [0.3, 20.6, 4.9];
  const tmpRim = new THREE.Vector3(), tmpUp = new THREE.Vector3(), tmpS = new THREE.Vector3(), tmpO = new THREE.Vector3();
  const qTilt = new THREE.Quaternion(), eul = new THREE.Euler();
  const sipLevel = (t) => {                   // her glass goes down a little with each sip, then is refilled
    const n = Math.floor((t - 3.7) / CYCLE) + 1;      // sips so far
    const target = 7.0 - 0.6 * (((n % 6) + 6) % 6);
    return Math.max(target, 2.8);
  };
  let lvl = 7.0, time = 0;
  const tableLevel = (t) => (reduced ? 6.9 : MILK_TOP + 0.1 + 4.6 * (1 - Math.exp(-t / 5.5)));

  function step(dt) {
    time += dt;
    const t = time;
    const s = reduced ? 0 : phase(t);
    const idle = reduced ? 0 : Math.sin(t * 1.6);

    // body
    upper.rotation.x = 0.05 + 0.03 * s;
    upper.scale.y = 1 + 0.008 * idle;
    head.rotation.x = -0.2 * s + 0.01 * idle;
    head.rotation.z = reduced ? 0 : Math.sin(t * 0.5) * 0.03;
    pony.rotation.x = reduced ? 0.15 : 0.25 + Math.sin(t * 1.9) * 0.1 + 0.2 * s;
    pony.rotation.z = reduced ? 0 : Math.sin(t * 1.3) * 0.07;
    mouth.visible = s < 0.45;

    // glass: rim position and tilt follow the lift
    lerpV(RIM_REST, RIM_MOUTH, s, tmpRim);
    const tilt = M.degToRad(38) * s;
    tmpUp.set(0, Math.cos(tilt), -Math.sin(tilt));
    tmpO.copy(tmpRim).addScaledVector(tmpUp, -GLASS_H * GS);       // glass base
    held.root.position.copy(tmpO);
    eul.set(-tilt, 0, 0); qTilt.setFromEuler(eul); held.root.quaternion.copy(qTilt);
    const target = reduced ? 6.6 : sipLevel(t);
    lvl += (target - lvl) * Math.min(dt * 1.6, 1);
    held.setLevel(lvl, t, reduced);

    // arms (shoulders follow the lean)
    upper.updateMatrixWorld(true);
    for (const a of arms) {
      a.S.set(a.side * 3.5, 4.0 + 4.0, 0.0).set(a.side * 3.55, 8.0, 0.1);   // shoulder, in torso space
      a.S.y += 0.3;
      upper.localToWorld(a.S);
      if (a.side > 0) a.T.copy(tmpRim).addScaledVector(tmpUp, -(GLASS_H * GS) * 0.62);
      else a.T.set(-2.6, SEAT + 4.6, 4.6);
      elbow(a.S, a.T, 4.5, 4.3, a.pole, a.E);
      setLimb(a.upperArm, a.S, a.E); setLimb(a.fore, a.E, a.T);
      a.sh.position.copy(a.S); a.el.position.copy(a.E); a.hand.position.copy(a.T);
    }

    // legs: left foot taps along
    for (const l of legs) {
      l.K.set(l.side * 2.35, SEAT + 1.5, 5.6);
      l.A.set(l.side * 2.5, 1.35, 6.9);
      if (l.side < 0 && !reduced) { const tap = Math.max(0, Math.sin(t * 3.2)); l.A.y += 0.6 * tap; l.A.z -= 0.25 * tap; }
      elbow(l.H, l.A, 5.4, 7.9, l.pole, l.K);
      setLimb(l.thigh, l.H, l.K); setLimb(l.shin, l.K, l.A);
      l.hip.position.copy(l.H); l.knee.position.copy(l.K);
      l.shoe.position.set(l.A.x, l.A.y - 0.2, l.A.z + 0.8);
      l.soleM.position.set(l.A.x, l.A.y - 0.95, l.A.z + 0.8);
    }

    // table: the glass fills as the phin drips
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

  /* ---- camera: slow drift, tilt with the pointer, drag to look around ---- */
  const CENTER = new THREE.Vector3(-5.5, 11.5, 1.5);
  let dist = 80, az = 0.38, azBase = 0.38, tilt = 0, tiltT = 0, drag = null, dragStart = 0;
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dist = Math.max((34 / 2) / Math.tan(fov / 2), (40 / 2) / (Math.tan(fov / 2) * camera.aspect));
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

  // /?coffee=3.4 jumps the animation clock, handy for screenshots.
  const params = new URLSearchParams(location.search);
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
  // Compile shaders without blocking the page, then start drawing.
  if (renderer.compileAsync) renderer.compileAsync(scene, camera).then(begin, begin);
  else begin();
  return true;
}
