// Procedural low-poly 3D models: humanoids (people, horse-man, mannequins, ghost), robot,
// cart, taxi, toilet monster, RTX 4090, props. Plus a shared pose/animation system.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mat, basic, box, cyl, textTex, lerp, rand } from './util.js';

const SKINS = ['#e0b58f', '#c99572', '#8d5a3b', '#f1c9a5', '#a87250', '#6b4129'];
const SHIRTS = ['#5a1f1f', '#1f3a5a', '#3a3a3a', '#55552a', '#2a4a2a', '#6a4a2a', '#444466', '#7a2a5a', '#996633', '#334'];
const PANTS = ['#222', '#2b2f3a', '#3a2b22', '#1c2a1c', '#444'];

const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
/** Character material: slightly self-lit so faces and clothes read in the dark (PS1 style). */
const cm = (c, o = {}) => mat(c, { emissive: shade(c, 0.28), ...o });
const shade = (c, k = 0.6) => '#' + new THREE.Color(c).multiplyScalar(k).getHexString();

/** Collects boxes per material and merges them into one mesh per material (keeps draw calls low). */
class PartBuilder {
  constructor() { this.groups = new Map(); this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1); }
  add(material, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) {
    const g = new THREE.BoxGeometry(w, h, d);
    this._e.set(rx, ry, rz); this._q.setFromEuler(this._e);
    g.applyMatrix4(this._m.compose(this._p.set(x, y, z), this._q, this._s));
    if (!this.groups.has(material)) this.groups.set(material, []);
    this.groups.get(material).push(g);
  }
  build(parent, shadow = true) {
    for (const [m, list] of this.groups) {
      const geo = list.length === 1 ? list[0] : mergeGeometries(list);
      if (list.length > 1) list.forEach((g) => g.dispose());
      const mesh = new THREE.Mesh(geo, m); mesh.castShadow = shadow; parent.add(mesh);
    }
    this.groups.clear();
  }
}

/**
 * Humanoid rig. Root at the feet; `body` is the group that tilts when ragdolling.
 * opts: { skin, shirt, pants, fat, scale, hat:'cap'|'tophat'|'none',
 *         hair:'short'|'long'|'buzz'|'bun'|'mohawk'|'none', hairColor, beard, glasses,
 *         outfit:'plain'|'tshirt'|'jacket'|'hoodie'|'shirt'|'suit', accent, shoe,
 *         headless, horse, mannequin, suit, eyesGlow, faceless, buff, tinyLegs }
 * Each body part is built from many small boxes merged per material, so faces, fingers and
 * clothing details cost only a few draw calls per character.
 */
export function makeHumanoid(o = {}) {
  const fat = o.fat || 1, sq = Math.sqrt(fat);
  const skinC = o.mannequin ? '#cdb899' : o.skin || pickOne(SKINS);
  const shirtC = o.mannequin ? skinC : o.shirt || pickOne(SHIRTS);
  const pantsC = o.mannequin ? skinC : o.pants || pickOne(PANTS);
  const outfit = o.mannequin ? 'plain' : o.suit ? 'suit' : o.outfit || 'plain';
  const skin = cm(skinC), shirt = cm(shirtC), pants = cm(pantsC);
  const accent = cm(o.accent || (outfit === 'suit' ? '#e8e6df' : shade(shirtC, outfit === 'jacket' ? 1.6 : 0.6)));
  const shoe = o.mannequin ? skin : cm(o.horse ? '#111' : o.shoe || '#151515');
  const sole = o.mannequin ? skin : cm('#cfcabc');
  const dark = cm('#121212'), white = cm('#ecebe4'), lip = cm('#6a2c2c'), hairM = cm(o.hairColor || '#1a1410');
  const B = new PartBuilder();

  const root = new THREE.Group();
  const body = new THREE.Group();
  body.scale.setScalar(o.scale || 1);
  root.add(body);

  // ---- hips & belt
  const hips = new THREE.Group(); hips.position.y = 0.92; body.add(hips);
  B.add(pants, 0.5 * fat, 0.22, 0.3 * fat, 0, 0, 0);
  if (!o.mannequin) {
    B.add(dark, 0.52 * fat, 0.06, 0.32 * fat, 0, 0.09, 0);
    B.add(cm('#9a8a50'), 0.07, 0.05, 0.02, 0, 0.09, 0.165 * fat);
  }
  B.build(hips);

  // ---- legs (pants, shoes with soles)
  const lw = 0.21 * sq * (o.tinyLegs ? 0.5 : 1), ld = 0.23 * sq * (o.tinyLegs ? 0.5 : 1);
  const mkLeg = (side) => {
    const g = new THREE.Group(); g.position.set(side * 0.14 * fat, 0, 0);
    B.add(pants, lw, 0.86, ld, 0, -0.43, 0);
    if (!o.mannequin) B.add(pants, lw + 0.01, 0.05, ld + 0.01, 0, -0.78, 0); // cuff
    B.add(shoe, 0.22, 0.1, 0.32, 0, -0.85, 0.05);
    if (!o.horse) B.add(sole, 0.23, 0.035, 0.33, 0, -0.9, 0.05);
    if (!o.mannequin && !o.horse) B.add(white, 0.12, 0.012, 0.14, 0, -0.795, 0.12); // laces
    B.build(g);
    hips.add(g); return g;
  };
  const legL = mkLeg(1), legR = mkLeg(-1);

  // ---- torso & outfit
  const spine = new THREE.Group(); spine.position.y = 0.08; hips.add(spine);
  const tw = 0.56 * fat, td = 0.32 * fat, front = td / 2;
  B.add(shirt, tw, 0.66, td, 0, 0.33, 0);
  if (fat > 1.2) B.add(shirt, 0.5 * fat, 0.4, 0.2 * fat, 0, 0.18, 0.14 * fat);
  if (outfit === 'jacket') {
    B.add(accent, 0.15, 0.6, 0.02, 0, 0.33, front + 0.005);
    B.add(shirt, tw + 0.04, 0.08, td + 0.04, 0, 0.63, 0);
    B.add(dark, 0.1, 0.07, 0.02, -0.16 * fat, 0.12, front + 0.006); B.add(dark, 0.1, 0.07, 0.02, 0.16 * fat, 0.12, front + 0.006);
  } else if (outfit === 'hoodie') {
    B.add(shirt, 0.38, 0.24, 0.14, 0, 0.68, -td / 2 - 0.02);
    B.add(accent, 0.34, 0.14, 0.02, 0, 0.1, front + 0.006);
    B.add(white, 0.015, 0.15, 0.01, -0.05, 0.52, front + 0.008); B.add(white, 0.015, 0.15, 0.01, 0.05, 0.52, front + 0.008);
  } else if (outfit === 'suit') {
    B.add(white, 0.14, 0.5, 0.02, 0, 0.38, front + 0.005);
    B.add(cm('#8a0f0f'), 0.06, 0.38, 0.025, 0, 0.36, front + 0.01);
    B.add(shirt, 0.07, 0.4, 0.02, -0.1, 0.42, front + 0.008, 0, 0, -0.25); B.add(shirt, 0.07, 0.4, 0.02, 0.1, 0.42, front + 0.008, 0, 0, 0.25);
  } else if (outfit === 'shirt') {
    B.add(white, tw * 0.55, 0.06, td + 0.03, 0, 0.63, 0);
    for (let i = 0; i < 5; i++) B.add(dark, 0.025, 0.025, 0.01, 0, 0.55 - i * 0.11, front + 0.005);
  } else if (outfit === 'tshirt' && !o.mannequin) {
    B.add(accent, 0.2, 0.2, 0.01, 0, 0.42, front + 0.005); // print on the shirt
  }
  B.build(spine);

  // ---- head & face
  const head = new THREE.Group(); head.position.y = 0.7; spine.add(head);
  if (o.horse) buildHorseHead(B, skin);
  else if (o.animal) buildAnimalHead(B, skin, o.animal);
  else if (!o.headless) {
    B.add(skin, 0.32, 0.36, 0.32, 0, 0.18, 0);
    B.add(skin, 0.14, 0.12, 0.14, 0, -0.01, 0); // neck
    if (!o.mannequin) { B.add(skin, 0.04, 0.09, 0.07, -0.17, 0.18, 0); B.add(skin, 0.04, 0.09, 0.07, 0.17, 0.18, 0); }
    if (!o.mannequin && !o.faceless) {
      B.add(skin, 0.06, 0.08, 0.06, 0, 0.16, 0.18); // nose
      for (const s of [-1, 1]) {
        B.add(white, 0.075, 0.045, 0.012, s * 0.075, 0.22, 0.163);
        B.add(dark, 0.035, 0.042, 0.014, s * 0.075, 0.22, 0.168);
        B.add(hairM, 0.085, 0.022, 0.016, s * 0.075, 0.265, 0.165, 0, 0, s * -0.12);
      }
      B.add(lip, 0.11, 0.026, 0.012, 0, 0.09, 0.163);
      if (o.beard) {
        B.add(hairM, 0.3, 0.1, 0.05, 0, 0.05, 0.15); B.add(hairM, 0.12, 0.025, 0.02, 0, 0.115, 0.168);
        B.add(hairM, 0.04, 0.14, 0.06, -0.155, 0.12, 0.12); B.add(hairM, 0.04, 0.14, 0.06, 0.155, 0.12, 0.12);
      }
      if (o.glasses) {
        B.add(dark, 0.28, 0.018, 0.012, 0, 0.25, 0.172); B.add(dark, 0.05, 0.015, 0.012, 0, 0.22, 0.172);
        for (const s of [-1, 1]) { B.add(dark, 0.012, 0.06, 0.012, s * 0.135, 0.22, 0.172); B.add(dark, 0.012, 0.012, 0.18, s * 0.165, 0.24, 0.08); B.add(dark, 0.09, 0.012, 0.012, s * 0.075, 0.19, 0.172); }
      }
    }
    const hs = o.mannequin ? 'none' : o.hair;
    if (hs === 'long') { B.add(hairM, 0.36, 0.14, 0.36, 0, 0.38, 0); B.add(hairM, 0.36, 0.55, 0.1, 0, 0.08, -0.16); B.add(hairM, 0.05, 0.4, 0.3, -0.17, 0.2, -0.02); B.add(hairM, 0.05, 0.4, 0.3, 0.17, 0.2, -0.02); }
    else if (hs === 'short') { B.add(hairM, 0.34, 0.1, 0.34, 0, 0.38, 0); B.add(hairM, 0.34, 0.18, 0.06, 0, 0.29, -0.15); B.add(hairM, 0.34, 0.05, 0.05, 0, 0.345, 0.155); }
    else if (hs === 'buzz') B.add(hairM, 0.33, 0.035, 0.33, 0, 0.37, 0);
    else if (hs === 'bun') { B.add(hairM, 0.34, 0.1, 0.34, 0, 0.38, 0); B.add(hairM, 0.13, 0.13, 0.13, 0, 0.47, -0.1); }
    else if (hs === 'mohawk') B.add(hairM, 0.06, 0.16, 0.32, 0, 0.44, 0);
    if (!o.mannequin && !o.faceless && o.eyesGlow) { /* glow eyes handled below */ }
  } else {
    B.add(skin, 0.12, 0.08, 0.12, 0, 0.04, 0); // neck stump
  }
  B.build(head);
  if (!o.headless && !o.horse && o.eyesGlow) {
    const eyeM = basic(o.eyesGlow);
    head.add(box(0.07, 0.045, 0.02, eyeM, -0.075, 0.22, 0.17, false));
    head.add(box(0.07, 0.045, 0.02, eyeM, 0.075, 0.22, 0.17, false));
  }
  let hat = null;
  if (o.hat === 'tophat' || o.hat === 'cap') {
    hat = new THREE.Group();
    const hm = cm(o.hat === 'tophat' ? '#111' : o.capColor || '#2a6a2a');
    const y0 = o.horse ? 0.04 : 0;
    if (o.hat === 'tophat') { B.add(hm, 0.4, 0.04, 0.4, 0, 0.38 + y0, 0); B.add(hm, 0.26, 0.26, 0.26, 0, 0.52 + y0, 0); B.add(cm('#6a1010'), 0.27, 0.05, 0.27, 0, 0.42 + y0, 0); }
    else { B.add(hm, 0.35, 0.1, 0.35, 0, 0.39, 0); B.add(hm, 0.3, 0.03, 0.18, 0, 0.35, 0.22); B.add(hm, 0.04, 0.03, 0.04, 0, 0.45, 0); }
    B.build(hat); head.add(hat);
  }

  // ---- arms with sleeves, hands and fingers
  const mkArm = (side) => {
    const g = new THREE.Group(); g.position.set(side * (0.28 * fat + 0.09), 0.62, 0);
    if (outfit === 'tshirt') { B.add(shirt, 0.16, 0.3, 0.18, 0, -0.14, 0); B.add(skin, 0.13, 0.36, 0.15, 0, -0.45, 0); }
    else {
      B.add(shirt, 0.15, 0.64, 0.17, 0, -0.3, 0);
      if (outfit === 'suit' || outfit === 'shirt' || outfit === 'jacket') B.add(outfit === 'jacket' ? shirt : white, 0.155, 0.05, 0.175, 0, -0.6, 0);
    }
    if (o.horse) B.add(cm('#111'), 0.13, 0.13, 0.13, 0, -0.66, 0);
    else {
      B.add(skin, 0.11, 0.1, 0.07, 0, -0.67, 0);
      for (let i = 0; i < 4; i++) B.add(skin, 0.024, 0.075, 0.03, (i - 1.5) * 0.027, -0.755, 0.005);
      B.add(skin, 0.028, 0.065, 0.03, -side * 0.062, -0.69, 0.03, 0, 0, side * 0.5);
    }
    B.build(g);
    if (o.buff) g.scale.set(1.7, 1.05, 1.7);
    spine.add(g); return g;
  };
  const armL = mkArm(1), armR = mkArm(-1);

  root.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = false; } });
  return { root, body, hips, spine, head, armL, armR, legL, legR, hat, skinMat: skin, opts: o, phase: Math.random() * 10 };
}

function buildAnimalHead(B, skin, kind) {
  const dark = cm('#111'), pink = cm('#d07080'), white = cm('#eeeeee');
  B.add(skin, 0.14, 0.12, 0.14, 0, -0.01, 0);
  if (kind === 'dog') {
    B.add(skin, 0.32, 0.32, 0.32, 0, 0.18, 0);
    B.add(skin, 0.2, 0.16, 0.24, 0, 0.1, 0.22);                 // snout
    B.add(dark, 0.08, 0.06, 0.04, 0, 0.15, 0.345);              // nose
    B.add(cm('#5a3010'), 0.07, 0.24, 0.12, -0.18, 0.12, 0, 0, 0, 0.25); B.add(cm('#5a3010'), 0.07, 0.24, 0.12, 0.18, 0.12, 0, 0, 0, -0.25); // floppy ears
    for (const s of [-1, 1]) { B.add(white, 0.06, 0.05, 0.012, s * 0.08, 0.24, 0.163); B.add(dark, 0.03, 0.045, 0.014, s * 0.08, 0.24, 0.168); }
    B.add(pink, 0.06, 0.03, 0.08, 0, 0.02, 0.3);                // tongue
  } else if (kind === 'monkey') {
    B.add(skin, 0.34, 0.34, 0.3, 0, 0.18, 0);
    B.add(cm('#d8b890'), 0.26, 0.2, 0.08, 0, 0.14, 0.14);       // face
    B.add(cm('#d8b890'), 0.18, 0.1, 0.08, 0, 0.06, 0.19);       // muzzle
    for (const s of [-1, 1]) {
      B.add(skin, 0.06, 0.16, 0.14, s * 0.2, 0.2, 0); B.add(pink, 0.02, 0.1, 0.09, s * 0.23, 0.2, 0.01); // big ears
      B.add(white, 0.06, 0.05, 0.012, s * 0.06, 0.2, 0.185); B.add(dark, 0.03, 0.045, 0.014, s * 0.06, 0.2, 0.19);
    }
    B.add(dark, 0.1, 0.02, 0.012, 0, 0.04, 0.235);
  } else if (kind === 'cat') {
    B.add(skin, 0.34, 0.3, 0.3, 0, 0.17, 0);
    B.add(skin, 0.07, 0.12, 0.06, -0.11, 0.37, 0, 0, 0, 0.2); B.add(skin, 0.07, 0.12, 0.06, 0.11, 0.37, 0, 0, 0, -0.2);
    B.add(pink, 0.04, 0.06, 0.02, -0.11, 0.36, 0.035, 0, 0, 0.2); B.add(pink, 0.04, 0.06, 0.02, 0.11, 0.36, 0.035, 0, 0, -0.2);
    B.add(cm('#e0e0d8'), 0.16, 0.1, 0.06, 0, 0.1, 0.15);        // muzzle
    B.add(pink, 0.04, 0.03, 0.02, 0, 0.14, 0.185);
    for (const s of [-1, 1]) {
      B.add(cm('#e8c020'), 0.07, 0.06, 0.012, s * 0.08, 0.22, 0.152); B.add(dark, 0.015, 0.055, 0.014, s * 0.08, 0.22, 0.158);
      B.add(white, 0.14, 0.006, 0.006, s * 0.13, 0.11, 0.17, 0, 0, s * 0.1); B.add(white, 0.14, 0.006, 0.006, s * 0.13, 0.09, 0.17, 0, 0, -s * 0.1);
    }
  }
}

function buildHorseHead(B, skin) {
  const dark = cm('#1a0d05'), mane = cm('#120a05'), eye = cm('#000'), white = cm('#e8e6dc');
  B.add(skin, 0.3, 0.34, 0.32, 0, 0.18, -0.02);
  B.add(skin, 0.22, 0.22, 0.42, 0, 0.1, 0.3);
  B.add(skin, 0.14, 0.12, 0.14, 0, -0.01, -0.02);
  B.add(dark, 0.2, 0.08, 0.06, 0, 0.05, 0.52);
  B.add(dark, 0.04, 0.04, 0.02, -0.06, 0.08, 0.515); B.add(dark, 0.04, 0.04, 0.02, 0.06, 0.08, 0.515);
  B.add(skin, 0.06, 0.14, 0.06, -0.1, 0.42, -0.04); B.add(skin, 0.06, 0.14, 0.06, 0.1, 0.42, -0.04);
  B.add(mane, 0.08, 0.36, 0.1, 0, 0.28, -0.18); B.add(mane, 0.08, 0.06, 0.2, 0, 0.36, 0.05);
  for (const s of [-1, 1]) { B.add(white, 0.02, 0.07, 0.08, s * 0.155, 0.24, 0.12); B.add(eye, 0.025, 0.05, 0.04, s * 0.158, 0.24, 0.135); }
  B.add(white, 0.16, 0.03, 0.02, 0, -0.005, 0.5); // teeth
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
    case 'flex':
      T.alz = 2.3 + Math.sin(t * 6) * 0.15; T.arz = -2.3 - Math.sin(t * 6) * 0.15; T.alx = -0.4; T.arx = -0.4; T.sx = -0.12; T.hx = -0.15; T.by = Math.abs(Math.sin(t * 3)) * 0.03; break;
    case 'press':
      T.llx = -1.5; T.lrx = -1.5; T.by = -0.45; T.alx = -2.75 + Math.sin(t * 2) * 0.1; T.arx = -2.75 + Math.sin(t * 2) * 0.1; T.sx = -0.2; break;
    case 'sixseven':
      T.alx = -1.25 + Math.sin(t * 6) * 0.55; T.arx = -1.25 - Math.sin(t * 6) * 0.55; T.alz = 0.25; T.arz = -0.25; T.hy = Math.sin(t * 3) * 0.2; T.by = Math.abs(Math.sin(t * 6)) * 0.04; break;
    case 'peck': {
      const b = Math.max(0, Math.sin(t * 7));
      T.sx = 0.9 + b * 0.45; T.hx = 0.3; T.llx = -0.9; T.lrx = -0.9; T.by = -0.35; T.alx = 0.8; T.arx = 0.8; T.alz = 0.3; T.arz = -0.3; break;
    }
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
  outfit: pickOne(['tshirt', 'tshirt', 'jacket', 'hoodie', 'shirt', 'plain']),
  hair: pickOne(['short', 'short', 'buzz', 'bun', 'long', 'none', 'mohawk']),
  hairColor: pickOne(['#1a1410', '#1a1410', '#3a2414', '#6a4a20', '#888', '#b08040']),
  beard: Math.random() < 0.2,
  glasses: Math.random() < 0.15,
  shoe: pickOne(['#151515', '#151515', '#eeeeee', '#6a2a1a', '#2a3a6a']),
  hat: Math.random() < 0.2 ? 'cap' : 'none',
  capColor: ['#333', '#600', '#225', '#552'][Math.floor(rand(0, 4))],
  fat: Math.random() < 0.15 ? 1.4 : rand(0.92, 1.08),
});
