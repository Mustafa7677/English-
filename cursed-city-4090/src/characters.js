// Procedural low-poly 3D models: humanoids (people, horse-man, mannequins, ghost), robot,
// cart, taxi, toilet monster, RTX 4090, props. Plus a shared pose/animation system.
import * as THREE from 'three';
import { mat, basic, box, cyl, textTex, lerp, rand } from './util.js';

const SKINS = ['#e0b58f', '#c99572', '#8d5a3b', '#f1c9a5', '#a87250', '#6b4129'];
const SHIRTS = ['#5a1f1f', '#1f3a5a', '#3a3a3a', '#55552a', '#2a4a2a', '#6a4a2a', '#444466', '#7a2a5a', '#996633', '#334'];
const PANTS = ['#222', '#2b2f3a', '#3a2b22', '#1c2a1c', '#444'];

/**
 * Humanoid rig. Root at the feet; `body` is the group that tilts when ragdolling.
 * opts: { skin, shirt, pants, fat, scale, hat:'cap'|'tophat'|'none', hair:'short'|'long'|'none',
 *         headless, horse, mannequin, suit, eyesGlow, faceless }
 */
export function makeHumanoid(o = {}) {
  const fat = o.fat || 1;
  const skinC = o.mannequin ? '#cdb899' : o.skin || SKINS[Math.floor(Math.random() * SKINS.length)];
  const shirtC = o.mannequin ? skinC : o.shirt || SHIRTS[Math.floor(Math.random() * SHIRTS.length)];
  const pantsC = o.mannequin ? skinC : o.pants || PANTS[Math.floor(Math.random() * PANTS.length)];
  const skin = mat(skinC), shirt = mat(shirtC), pants = mat(pantsC), shoe = mat(o.horse ? '#111' : '#151515');

  const root = new THREE.Group();
  const body = new THREE.Group();
  body.scale.setScalar(o.scale || 1);
  root.add(body);

  const hips = new THREE.Group(); hips.position.y = 0.92; body.add(hips);
  const pelvis = box(0.5 * fat, 0.22, 0.3 * fat, pants, 0, 0, 0); hips.add(pelvis);

  const mkLeg = (side) => {
    const g = new THREE.Group(); g.position.set(side * 0.14 * fat, 0, 0);
    g.add(box(0.21 * Math.sqrt(fat), 0.86, 0.23 * Math.sqrt(fat), pants, 0, -0.43, 0));
    g.add(box(0.22, 0.1, 0.32, shoe, 0, -0.87, 0.05));
    hips.add(g); return g;
  };
  const legL = mkLeg(1), legR = mkLeg(-1);

  const spine = new THREE.Group(); spine.position.y = 0.08; hips.add(spine);
  const torso = box(0.56 * fat, 0.66, 0.32 * fat, shirt, 0, 0.33, 0); spine.add(torso);
  if (fat > 1.2) spine.add(box(0.5 * fat, 0.4, 0.2 * fat, shirt, 0, 0.18, 0.14 * fat)); // belly
  if (o.suit) {
    spine.add(box(0.12, 0.5, 0.02, mat('#ddd'), 0, 0.38, 0.165 * fat));
    spine.add(box(0.06, 0.36, 0.025, mat('#8a0f0f'), 0, 0.38, 0.17 * fat));
  }

  const head = new THREE.Group(); head.position.y = 0.7; spine.add(head);
  if (o.horse) buildHorseHead(head, skin);
  else if (!o.headless) {
    head.add(box(0.32, 0.36, 0.32, skin, 0, 0.18, 0));
    if (!o.mannequin && !o.faceless) {
      const eyeM = o.eyesGlow ? basic(o.eyesGlow) : mat('#111');
      head.add(box(0.06, 0.05, 0.02, eyeM, -0.08, 0.22, 0.165));
      head.add(box(0.06, 0.05, 0.02, eyeM, 0.08, 0.22, 0.165));
      head.add(box(0.12, 0.03, 0.02, mat('#4a2020'), 0, 0.09, 0.165));
    } else if (o.eyesGlow) {
      const eyeM = basic(o.eyesGlow);
      head.add(box(0.07, 0.04, 0.02, eyeM, -0.08, 0.22, 0.165));
      head.add(box(0.07, 0.04, 0.02, eyeM, 0.08, 0.22, 0.165));
    }
    const hairC = mat(o.hairColor || '#1a1410');
    if (o.hair === 'long') {
      head.add(box(0.36, 0.14, 0.36, hairC, 0, 0.38, 0));
      head.add(box(0.36, 0.55, 0.1, hairC, 0, 0.08, -0.16));
    } else if (o.hair === 'short') head.add(box(0.34, 0.1, 0.34, hairC, 0, 0.38, 0));
  } else {
    head.add(box(0.12, 0.08, 0.12, skin, 0, 0.04, 0)); // neck stump
  }
  if (o.hat === 'tophat') {
    const hm = mat('#111');
    head.add(cyl(0.2, 0.2, 0.04, 8, hm, 0, o.horse ? 0.42 : 0.38, 0));
    head.add(cyl(0.13, 0.13, 0.26, 8, hm, 0, o.horse ? 0.56 : 0.52, 0));
  } else if (o.hat === 'cap') {
    const hm = mat(o.capColor || '#2a6a2a');
    head.add(box(0.35, 0.1, 0.35, hm, 0, 0.39, 0));
    head.add(box(0.3, 0.03, 0.18, hm, 0, 0.35, 0.22));
  }

  const mkArm = (side) => {
    const g = new THREE.Group(); g.position.set(side * (0.28 * fat + 0.09), 0.62, 0);
    g.add(box(0.15, 0.64, 0.17, shirt, 0, -0.3, 0));
    g.add(box(0.13, 0.13, 0.13, o.horse ? shoe : skin, 0, -0.66, 0));
    spine.add(g); return g;
  };
  const armL = mkArm(1), armR = mkArm(-1);

  root.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = false; } });
  return { root, body, hips, spine, head, armL, armR, legL, legR, skinMat: skin, opts: o, phase: Math.random() * 10 };
}

function buildHorseHead(head, skin) {
  head.add(box(0.3, 0.34, 0.32, skin, 0, 0.18, -0.02));
  head.add(box(0.22, 0.22, 0.42, skin, 0, 0.1, 0.3));
  head.add(box(0.2, 0.08, 0.06, mat('#1a0d05'), 0, 0.05, 0.52)); // nostrils
  head.add(box(0.06, 0.14, 0.06, skin, -0.1, 0.42, -0.04));
  head.add(box(0.06, 0.14, 0.06, skin, 0.1, 0.42, -0.04));
  head.add(box(0.08, 0.36, 0.1, mat('#120a05'), 0, 0.28, -0.18)); // mane
  head.add(box(0.03, 0.06, 0.06, mat('#000'), -0.155, 0.24, 0.12));
  head.add(box(0.03, 0.06, 0.06, mat('#000'), 0.155, 0.24, 0.12));
}

/** Giant floating horse head for the sky. */
export function makeGiantHorseHead() {
  const g = new THREE.Group();
  const skin = basic('#2a1408', { fog: false });
  const add = (w, h, d, m, x, y, z) => { const b = box(w, h, d, m, x, y, z, false); g.add(b); return b; };
  add(3, 3.4, 3.2, skin, 0, 1.8, -0.2);
  add(2.2, 2.2, 4.2, skin, 0, 1, 3);
  add(0.6, 1.4, 0.6, skin, -1, 4.2, -0.4); add(0.6, 1.4, 0.6, skin, 1, 4.2, -0.4);
  add(0.8, 3.6, 1, basic('#080402', { fog: false }), 0, 2.8, -1.8);
  const eye = basic('#ff1010', { fog: false });
  g.userData.eyes = [add(0.25, 0.6, 0.6, eye, -1.55, 2.4, 1.2), add(0.25, 0.6, 0.6, eye, 1.55, 2.4, 1.2)];
  add(1.8, 0.5, 0.2, basic('#000', { fog: false }), 0, 0.3, 5.12); // mouth
  return g;
}

/** NVIDIA-style guard robot (rig compatible with pose()). */
export function makeRobot() {
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  const metal = mat('#2b2f2b'), dark = mat('#151815'), green = basic('#76ff03');
  const hips = new THREE.Group(); hips.position.y = 1.0; body.add(hips);
  hips.add(box(0.8, 0.3, 0.5, dark, 0, 0, 0));
  const mkLeg = (s) => {
    const g = new THREE.Group(); g.position.x = s * 0.28;
    g.add(box(0.3, 1.0, 0.36, metal, 0, -0.5, 0));
    g.add(box(0.4, 0.14, 0.6, dark, 0, -0.95, 0.08));
    g.add(box(0.06, 0.6, 0.02, green, 0, -0.5, 0.19));
    hips.add(g); return g;
  };
  const legL = mkLeg(1), legR = mkLeg(-1);
  const spine = new THREE.Group(); spine.position.y = 0.12; hips.add(spine);
  spine.add(box(1.1, 0.95, 0.65, metal, 0, 0.5, 0));
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.28), basic('#ffffff', { map: textTex('NVIDIA', { w: 256, h: 80 }) }));
  plate.position.set(0, 0.62, 0.33); spine.add(plate);
  spine.add(box(0.5, 0.1, 0.02, green, 0, 0.3, 0.33));
  const head = new THREE.Group(); head.position.y = 1.02; spine.add(head);
  head.add(box(0.62, 0.45, 0.5, metal, 0, 0.22, 0));
  const visorM = basic('#76ff03', {});
  const visor = box(0.56, 0.1, 0.04, visorM, 0, 0.26, 0.25, false); head.add(visor);
  head.add(cyl(0.02, 0.02, 0.4, 4, dark, 0.2, 0.62, 0));
  head.add(box(0.07, 0.07, 0.07, green, 0.2, 0.84, 0));
  const mkArm = (s) => {
    const g = new THREE.Group(); g.position.set(s * 0.7, 0.85, 0);
    g.add(box(0.26, 0.9, 0.3, metal, 0, -0.42, 0));
    g.add(box(0.34, 0.26, 0.34, dark, 0, -0.95, 0));
    spine.add(g); return g;
  };
  const armL = mkArm(1), armR = mkArm(-1);
  body.scale.setScalar(1.55);
  root.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return { root, body, hips, spine, head, armL, armR, legL, legR, visorMat: visorM, isRobot: true, phase: 0 };
}

/**
 * Pose / animation. Smoothly drives rig joints toward the pose for `mode`.
 * phase advances with movement (cycles), t = global time.
 */
export function pose(rig, mode, dt, t, speed = 0) {
  const k = Math.min(1, dt * 12);
  const s = Math.sin(rig.phase), c = Math.cos(rig.phase);
  const T = { sx: 0, sz: 0, sy: 0, hx: 0, hy: 0, alx: 0, alz: 0.06, arx: 0, arz: -0.06, llx: 0, lrx: 0, by: 0 };
  switch (mode) {
    case 'walk':
      T.llx = s * 0.6; T.lrx = -s * 0.6; T.alx = -s * 0.5; T.arx = s * 0.5; T.by = Math.abs(c) * 0.03; break;
    case 'run':
      T.llx = s * 1.05; T.lrx = -s * 1.05; T.alx = -s * 1.1; T.arx = s * 1.1; T.sx = 0.28; T.by = Math.abs(c) * 0.08; break;
    case 'panic':
      T.llx = s * 1.1; T.lrx = -s * 1.1; T.alx = -2.8 + s * 0.6; T.arx = -2.8 - s * 0.6; T.sx = 0.15; T.by = Math.abs(c) * 0.08; break;
    case 'quad':
      T.sx = 1.3; T.by = -0.3; T.llx = 0.75 + s * 0.45; T.lrx = 0.75 - s * 0.45; T.alx = -1.3 - s * 0.5; T.arx = -1.3 + s * 0.5; T.hx = -0.9; break;
    case 'sit':
      T.llx = -1.5; T.lrx = -1.5; T.by = -0.45; T.alx = -0.5; T.arx = -0.5; break;
    case 'sleep':
      T.llx = -1.5; T.lrx = -1.5; T.by = -0.45; T.alx = -0.2; T.arx = -0.2; T.hx = 0.7; T.sz = 0.2; break;
    case 'sitground':
      T.llx = -1.45; T.lrx = -1.45; T.by = -0.86; T.sx = -0.25; T.alx = 0.6; T.arx = 0.6; T.alz = 0.3; T.arz = -0.3; T.hx = -0.3 + Math.sin(t * 9) * 0.1; break;
    case 'tpose':
      T.alz = 1.57; T.arz = -1.57; break;
    case 'dance':
      T.sz = Math.sin(t * 7) * 0.25; T.by = Math.abs(Math.sin(t * 7)) * 0.12; T.alx = -2.6 + Math.sin(t * 14) * 0.5; T.arx = -2.6 - Math.sin(t * 14) * 0.5;
      T.llx = Math.sin(t * 7) * 0.4; T.lrx = -Math.sin(t * 7) * 0.4; T.hy = Math.sin(t * 3.5) * 0.5; break;
    case 'phone':
      T.llx = s * 0.5; T.lrx = -s * 0.5; T.arx = -1.35; T.arz = 0.35; T.alx = -s * 0.3; T.hx = 0.6; T.by = Math.abs(c) * 0.03; break;
    case 'punch': {
      const p = Math.sin(t * 14);
      T.arx = p > 0 ? -1.6 : -0.4; T.alx = p > 0 ? -0.4 : -1.6; T.sy = p * 0.3; T.llx = 0.3; T.lrx = -0.3; break;
    }
    case 'windup':
      T.arx = 0.9; T.arz = -0.5; T.alx = -1.2; T.sy = -0.4; T.sx = -0.1; T.llx = 0.35; T.lrx = -0.35; break;
    case 'pull':
      T.sx = -0.35 - Math.max(0, Math.sin(t * 6)) * 0.2; T.alx = -1.4; T.arx = -1.4; T.llx = -0.35; T.lrx = 0.25; break;
    case 'push':
      T.sx = 0.35; T.alx = -1.55; T.arx = -1.55; T.llx = 0.4; T.lrx = -0.4; break;
    case 'laugh':
      T.sx = -0.35 + Math.sin(t * 18) * 0.05; T.hx = -0.6; T.alx = -0.7; T.arx = -0.7; T.alz = -0.3; T.arz = 0.3; break;
    case 'lookup':
      T.hx = -0.8; T.sx = -0.15; break;
    case 'creep':
      T.sx = 0.55; T.hx = -0.5; T.alx = -1.8 + Math.sin(t * 3) * 0.2; T.arx = -1.8 - Math.sin(t * 3) * 0.2; T.llx = s * 0.4; T.lrx = -s * 0.4; T.by = -0.1; break;
    case 'carry':
      T.llx = s * (speed > 4 ? 1 : 0.6); T.lrx = -T.llx; T.alx = -1.2; T.arx = -1.2; T.alz = -0.25; T.arz = 0.25; T.sx = speed > 4 ? 0.2 : 0; T.by = Math.abs(c) * 0.05; break;
    case 'stare':
      T.alz = 0.02; T.arz = -0.02; break;
    case 'whip':
      T.llx = -1.5; T.lrx = -1.5; T.by = -0.45; T.arx = -2.6 + Math.sin(t * 10) * 1.3; T.alx = -0.6; break;
    case 'drive':
      T.llx = -1.5; T.lrx = -1.5; T.by = -0.45; T.alx = -1.2; T.arx = -1.2; break;
    case 'wave':
      T.arz = -2.6 + Math.sin(t * 10) * 0.4; break;
    case 'flail':
      T.alx = Math.sin(t * 20) * 2; T.arx = Math.cos(t * 19) * 2; T.llx = Math.sin(t * 17); T.lrx = -Math.sin(t * 17); T.alz = 0.8; T.arz = -0.8; break;
    case 'protect':
      T.llx = s * 1.0; T.lrx = -s * 1.0; T.alx = -1.6; T.arx = -1.6; T.alz = 0.6; T.arz = -0.6; T.sx = 0.2; T.by = Math.abs(c) * 0.07; break;
    default: // idle
      T.sx = Math.sin(t * 1.5 + rig.phase) * 0.02; T.alz = 0.08; T.arz = -0.08;
  }
  rig.spine.rotation.x = lerp(rig.spine.rotation.x, T.sx, k);
  rig.spine.rotation.z = lerp(rig.spine.rotation.z, T.sz, k);
  rig.spine.rotation.y = lerp(rig.spine.rotation.y, T.sy, k);
  rig.head.rotation.x = lerp(rig.head.rotation.x, T.hx, k);
  rig.head.rotation.y = lerp(rig.head.rotation.y, T.hy, k);
  rig.armL.rotation.x = lerp(rig.armL.rotation.x, T.alx, k);
  rig.armL.rotation.z = lerp(rig.armL.rotation.z, T.alz, k);
  rig.armR.rotation.x = lerp(rig.armR.rotation.x, T.arx, k);
  rig.armR.rotation.z = lerp(rig.armR.rotation.z, T.arz, k);
  rig.legL.rotation.x = lerp(rig.legL.rotation.x, T.llx, k);
  rig.legR.rotation.x = lerp(rig.legR.rotation.x, T.lrx, k);
  rig.hips.position.y = lerp(rig.hips.position.y, (rig.isRobot ? 1.0 : 0.92) + T.by, k);
}

/** Wooden cart. Returns { group, wheels, seat (local pos), shaftFront (local pos) }. Forward = +z. */
export function makeCart() {
  const g = new THREE.Group();
  const wood = mat('#4a3018'), dark = mat('#2a1a0c');
  g.add(box(1.6, 0.12, 2.2, wood, 0, 0.75, 0));
  g.add(box(0.08, 0.4, 2.2, wood, -0.8, 1.0, 0));
  g.add(box(0.08, 0.4, 2.2, wood, 0.8, 1.0, 0));
  g.add(box(1.6, 0.4, 0.08, wood, 0, 1.0, -1.1));
  g.add(box(1.2, 0.1, 0.5, dark, 0, 1.2, -0.5)); // bench seat
  g.add(box(0.07, 0.07, 2.6, wood, -0.55, 0.75, 2.2));
  g.add(box(0.07, 0.07, 2.6, wood, 0.55, 0.75, 2.2));
  g.add(box(1.17, 0.07, 0.07, wood, 0, 0.75, 3.45));
  const wheels = [];
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 10), dark);
    w.rotation.z = Math.PI / 2; w.position.set(s * 0.9, 0.55, 0); w.castShadow = true;
    g.add(w); wheels.push(w);
  }
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return { group: g, wheels, seat: new THREE.Vector3(0, 0.78, -0.5), harness: new THREE.Vector3(0, 0, 3.0) };
}

/** Old taxi. Forward = +z. */
export function makeTaxi() {
  const g = new THREE.Group();
  const yel = mat('#c9a100'), dark = mat('#111'), glass = mat('#0d1a1a', { emissive: '#020404', transparent: true, opacity: 0.35, depthWrite: false });
  g.add(box(2.0, 0.7, 4.4, yel, 0, 0.75, 0));
  g.add(box(1.8, 0.65, 2.3, glass, 0, 1.42, -0.2));
  g.add(box(1.82, 0.08, 2.3, yel, 0, 1.78, -0.2));
  const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.25), basic('#fff', { map: textTex('TAXI', { w: 128, h: 48, bg: '#c9a100', fg: '#111', font: 'bold 34px monospace', glow: false }) }));
  sign.position.set(0, 1.93, -0.2); g.add(sign);
  g.add(box(0.3, 0.15, 0.05, basic('#ffffcc'), -0.7, 0.85, 2.21, false));
  g.add(box(0.3, 0.15, 0.05, basic('#ffffcc'), 0.7, 0.85, 2.21, false));
  g.add(box(0.3, 0.12, 0.05, basic('#ff2020'), -0.7, 0.85, -2.21, false));
  g.add(box(0.3, 0.12, 0.05, basic('#ff2020'), 0.7, 0.85, -2.21, false));
  g.add(box(1.9, 0.1, 0.3, mat('#333'), 0, 0.5, 2.25));
  const wheels = [];
  for (const [x, z] of [[-1, 1.4], [1, 1.4], [-1, -1.4], [1, -1.4]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.25, 10), dark);
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.38, z); g.add(w); wheels.push(w);
  }
  // passenger door on the right (-x side when facing +z)
  const door = new THREE.Group(); door.position.set(-1.0, 0.75, 0.6);
  door.add(box(0.06, 0.7, 1.2, yel, 0, 0, -0.6));
  door.add(box(0.05, 0.5, 1.0, glass, 0, 0.6, -0.6));
  g.add(door);
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return { group: g, wheels, door, driverSeat: new THREE.Vector3(0.45, 0.42, 0.1), passengerSeat: new THREE.Vector3(-0.45, 1.25, 0.1) };
}

/** Toilet monster. Head pops out of the bowl; tiny legs appear when it hops out. */
export function makeToilet() {
  const g = new THREE.Group();
  const white = mat('#e8e6dc'), dark = mat('#333');
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.22, 0.45, 10), white); bowl.position.y = 0.42; g.add(bowl);
  g.add(box(0.5, 0.06, 0.6, white, 0, 0.66, 0.02));
  g.add(box(0.48, 0.55, 0.2, white, 0, 0.9, -0.3));
  const lid = new THREE.Group(); lid.position.set(0, 0.7, -0.24);
  lid.add(box(0.48, 0.04, 0.56, white, 0, 0, 0.28)); lid.rotation.x = -1.3; g.add(lid);
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.26, 10), mat('#2a4a3a')); water.rotation.x = -Math.PI / 2; water.position.y = 0.6; g.add(water);
  const head = new THREE.Group(); head.position.y = 0.75;
  const skin = mat('#4d6b3a');
  head.add(box(0.42, 0.4, 0.4, skin, 0, 0.12, 0));
  const eyeW = mat('#fff', { emissive: '#555' }), pupil = basic('#000');
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), eyeW); e.position.set(s * 0.12, 0.3, 0.17); head.add(e);
    const p = box(0.07, 0.07, 0.03, pupil, s * 0.12, 0.3, 0.3, false); head.add(p);
  }
  head.add(box(0.3, 0.08, 0.04, mat('#200'), 0, 0.02, 0.21));
  head.visible = false; g.add(head);
  const legs = [];
  for (const s of [-1, 1]) {
    const l = new THREE.Group(); l.position.set(s * 0.15, 0.2, 0);
    l.add(box(0.06, 0.3, 0.06, skin, 0, -0.05, 0)); l.add(box(0.12, 0.05, 0.16, dark, 0, -0.2, 0.04));
    l.visible = false; g.add(l); legs.push(l);
  }
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return { group: g, head, legs, lid, bowl };
}

/** RTX 4090 graphics card. */
export function makeRTX(scale = 1) {
  const g = new THREE.Group();
  const body = mat('#2a2c2e'), fanM = mat('#0f0f0f'), green = basic('#76ff03');
  g.add(box(0.12, 0.16, 0.6, body, 0, 0, 0));
  for (const z of [-0.19, 0, 0.19]) {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 10), fanM);
    f.rotation.z = Math.PI / 2; f.position.set(0.065, 0, z); g.add(f);
  }
  g.add(box(0.125, 0.015, 0.6, green, 0, 0.085, 0, false));
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.1), basic('#fff', { map: textTex('RTX 4090', { w: 256, h: 50, font: 'bold 34px monospace' }) }));
  label.rotation.y = -Math.PI / 2; label.position.set(-0.062, 0, 0); g.add(label);
  g.add(box(0.13, 0.02, 0.04, mat('#bba030'), 0, -0.09, 0.1));
  g.scale.setScalar(scale);
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return g;
}

export function makeChair() {
  const g = new THREE.Group(); const w = mat('#5a4030');
  g.add(box(0.45, 0.06, 0.45, w, 0, 0.45, 0));
  g.add(box(0.45, 0.5, 0.06, w, 0, 0.72, -0.2));
  for (const [x, z] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) g.add(box(0.05, 0.45, 0.05, w, x, 0.22, z));
  return g;
}

export function makeTV() {
  const g = new THREE.Group();
  g.add(box(0.7, 0.55, 0.5, mat('#3a3530'), 0, 0, 0));
  g.add(box(0.55, 0.42, 0.02, basic('#9aa'), 0, 0.02, 0.26, false));
  return g;
}

export function makeBrick() {
  return box(0.22, 0.1, 0.11, mat('#7a3020'), 0, 0, 0);
}

export function makeBattery() {
  const g = new THREE.Group();
  g.add(cyl(0.05, 0.05, 0.2, 8, mat('#222'), 0, 0, 0));
  g.add(cyl(0.051, 0.051, 0.05, 8, basic('#e0c000'), 0, 0.07, 0));
  return g;
}

export const randomLook = () => ({
  skin: SKINS[Math.floor(Math.random() * SKINS.length)],
  shirt: SHIRTS[Math.floor(Math.random() * SHIRTS.length)],
  pants: PANTS[Math.floor(Math.random() * PANTS.length)],
  hair: Math.random() < 0.7 ? 'short' : 'none',
  hat: Math.random() < 0.2 ? 'cap' : 'none',
  capColor: ['#333', '#600', '#225', '#552'][Math.floor(rand(0, 4))],
  fat: Math.random() < 0.15 ? 1.4 : rand(0.92, 1.08),
});
