// Chapter 20: METRO 404 is ONE LONG TRAIN.
// You wake up in the last wagon and walk through the whole train, wagon by wagon, to the driver's cab.
// Every wagon has its own meme, always in the same place (nothing random, nothing hidden):
//    1  the last wagon     the horse commuter, the newspaper with the rules, a ticket on the floor
//    2  ЕЙ, ДҮБӘРӘ!        a cockroach, an apa with a slipper... and her bag full of cockroaches
//    3  Зыпылдаған 25     the fastest talker in Almaty                     (stop: Райымбек батыр, Buddy on the bench)
//    4  the controller    «Білетіңіз қайда?» «Менің атым Отанбас.» «Білетіңіз бар ма?» «Жоқ.» «Жүр, түсеміз.»
//                         ...and then he asks for YOUR ticket               (stop: Жібек жолы, The Dad??? on the platform)
//    5  the wedding       the cake, the clapping cat, the toastmaster
//    6  Kaspi             a wrong transfer, a phone on credit, GTA 6, the RTX seller   (stop: Абай)
//    7  the aksakal       «Қазіргі жастар...», then «Қай рудансың?»... «Ә, біздікі екенсің!»
//    8  Remember November the train stops in the dark tunnel             (stop: Туннель 404)
//    9  the rap battle    Барыс MC vs the 67 crew, a Karate Cat           (stop: Шексіз бекет ∞)
//   10  the head wagon    the ads turn into faces, the darkness, «ОЙЛАШЫ!», and the driver's cab
// Rule: when the light turns RED, the meme becomes a screamer: RUN FORWARD to the next wagon. The gangway door
// closes behind you. Caught: this wagon starts again. After the cab: the exit hall, the escalator, the surface.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeHumanoid, pose, randomLook } from './characters.js';
import { ACH } from './scenes2.js';
import { faceTextures } from './scenes10.js';
import { makeCockroach } from './scenes16.js';
import { MEMES, THEMES, txt, medallion, silkMap, abaiPlaque, spray } from './scenes19.js';
import { mat, basic, box, cyl, canvasTex, facadeBox, rand, pick } from './util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const MY = -120, TX = 80;                    // floor height, the axis of the long train
const WL = 16, GAP = 1.2, WP = WL + GAP, NW = 18;
const zBack = (k) => -k * WP, zFront = (k) => -k * WP - WL;
const L = (k, l) => -k * WP - l;             // world z of a point l metres into wagon k (k = 0: the last wagon)
const CAB0 = zFront(NW - 1), CAB1 = CAB0 - 3.2; // the driver's cab, in front of the head wagon
const DOORS = [3.2, 8, 12.8];                // side doors (local z of their centres)
export const TRAIN = { MY, TX, WL, GAP, WP, NW, CAB0, CAB1, DOORS };
const WALLSEG = [[0, 2.55], [3.85, 7.35], [8.65, 12.15], [13.45, 16]];
const SEATS = [[0.3, 2.45], [3.95, 7.25], [8.75, 12.05], [13.55, 15.7]];
const VMAX = 16;                             // cruising speed, m/s
const TRIG = [99, 5.4, 1.2, 0.8, 0.8, 1.0, 0.8, 1.0, 1.0, 3.0];  // where each wagon's scene starts (local z)
const RESP = [3, 6.2, 3, 6.4, 3, 3, 6.6, 3, 6.8, 7];             // where you start again after being caught
const WNAME = ['Соңғы вагон', 'Ей, дүбәрә!', 'Зыпылдаған 25', 'Контролер', 'Той', 'Kaspi', 'Ақсақал', 'Туннель 404', 'Рэп-баттл', 'Бас вагон'];
const CATCHER = { 1: 'dubara', 3: 'otanbas', 6: 'ru', 8: 'bars', 9: 'oylashy' };
const STATION = { 5: 'Райымбек батыр', 4: 'Жібек жолы', 3: 'Абай', 2: 'Туннель 404', 1: 'Шексіз бекет ∞', 0: 'Жер беті' };
const STATION_EN = { 5: 'Raiymbek Batyr', 4: 'Zhibek Zholy', 3: 'Abai', 2: 'Tunnel 404', 1: 'The Infinite Station', 0: 'The Surface' };

// the meme book of the long train (replaces the corridor list)
MEMES.splice(0, MEMES.length, ...[
  ['horse', '🐴', 'Horse commuter', 'Ат-жолаушы'], ['dubara', '🪳', 'Ей, дүбәрә!', 'Тарақан'],
  ['slipper', '🩴', "Apa's slipper", 'Апаның тапочкасы'], ['zyp25', '⏩', 'Зыпылдаған 25', 'Зыпылдақ'],
  ['buddy', '🧢', 'Buddy on the bench', 'Бадди'], ['otanbas', '🎫', 'Менің атым Отанбас', 'Контролер'],
  ['dad', '🦘', 'The Dad???', 'Кенгуру әке'], ['cake', '🎂', 'Wedding cake', 'Той торты'],
  ['clap', '🐈', 'Clapping cat', 'Шапалақ мысық'], ['asaba', '🎤', 'Next toast: YOU', 'Асаба'],
  ['kaspi', '💸', 'Wrong Kaspi transfer', 'Қате аударым'], ['phone', '📱', 'Phone on credit', 'Несие телефон'],
  ['gta6', '💿', 'GTA 6', 'Он жыл күттім'], ['seller', '📦', 'RTX for 5000 ₸', 'Арзан RTX'],
  ['jastar', '👵', 'Қазіргі жастар...', 'Орын бер'], ['ru', '👴', 'Қай рудансың?', 'Ақсақал'],
  ['bear', '🐻', 'Remember November', 'Ақ аю'], ['karate', '🥋', 'Karate Cat', 'Каратэ мысық'],
  ['bars', '🐆', 'Барыс MC', 'Рэпер барыс'], ['crew67', '6️⃣7️⃣', '67 Crew', 'Алпыс жеті'],
  ['posters', '🖼️', 'The ads are watching', 'Жарнама'], ['oylashy', '🗣️', 'ОЙЛАШЫ!', 'Қараңғыдан'],
  ['manager', '👔', 'The driver', 'Жүргізуші'], ['tail', '♾️', 'Your own train, ahead', 'Өз пойызың'],
].map(([id, e, n, kz]) => ({ id, e, n, kz })));

Object.assign(ACH, {
  m_ticket: ['Honest Passenger', 'Show your ticket to the controller'],
  m_noticket: ['Жүр, түсеміз', 'Run from the ticket controller'],
  m_train: ['The Long Train', 'Walk through the whole train to the driver'],
  m_slipper: ['Тапочка', "Get hit by an apa's slipper"],
});

const $ = (id) => document.getElementById(id);
const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

// ---------------------------------------------------------------- props and painted textures
function plaidTex() { // the classic blue-red plaid market bag
  const t = canvasTex(64, 64, (ctx) => {
    ctx.fillStyle = '#ecebf2'; ctx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 64; i += 16) {
      ctx.fillStyle = 'rgba(30,60,200,0.75)'; ctx.fillRect(i, 0, 8, 64); ctx.fillRect(0, i, 64, 8);
      ctx.fillStyle = 'rgba(200,30,40,0.75)'; ctx.fillRect(i + 11, 0, 2, 64); ctx.fillRect(0, i + 11, 64, 2);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); return t;
}
function rulesTex() { // the newspaper left on the seat
  return txt(256, 192, (ctx) => {
    ctx.fillStyle = '#e8e2cc'; ctx.fillRect(0, 0, 256, 192); ctx.textAlign = 'center';
    ctx.fillStyle = '#a00'; ctx.font = 'bold 24px Georgia, serif'; ctx.fillText('ЕРЕЖЕ · RULES', 128, 32);
    ctx.fillStyle = '#111'; ctx.font = 'bold 18px Arial';
    ctx.fillText('1. АЛҒА ЖҮР — басына дейін', 128, 70); ctx.fillText('2. ШАМ ҚЫЗАРСА — ҚАШ!', 128, 104); ctx.fillText('3. БІЛЕТІҢДІ ҰМЫТПА', 128, 138);
    ctx.font = '12px monospace'; ctx.fillText('walk forward · red light: RUN · ticket!', 128, 170);
  });
}
function ticketTex() {
  return txt(128, 64, (ctx) => {
    ctx.fillStyle = '#f4e8b0'; ctx.fillRect(0, 0, 128, 64); ctx.strokeStyle = '#a07a20'; ctx.lineWidth = 3; ctx.strokeRect(2, 2, 124, 60);
    ctx.fillStyle = '#222'; ctx.textAlign = 'center'; ctx.font = 'bold 14px Arial'; ctx.fillText('БІЛЕТ · METRO 404', 64, 24);
    ctx.font = '12px monospace'; ctx.fillText('№ 000404', 56, 46); ctx.fillStyle = 'rgba(200,20,20,0.6)'; ctx.beginPath(); ctx.arc(104, 44, 10, 0, 7); ctx.fill();
  });
}
function tailTex() { // the back of a train in the tunnel: red lights, "404", a horse in the back window
  return txt(256, 232, (ctx) => {
    ctx.fillStyle = '#3a3e40'; ctx.fillRect(0, 0, 256, 232);
    ctx.fillStyle = '#0c1012'; ctx.fillRect(70, 34, 116, 80);
    ctx.fillStyle = '#5a3418'; ctx.fillRect(112, 58, 34, 56); ctx.fillRect(116, 42, 8, 18); ctx.fillRect(134, 42, 8, 18); ctx.fillRect(140, 76, 24, 18);
    ctx.fillStyle = '#000'; ctx.fillRect(120, 70, 6, 6);
    ctx.fillStyle = '#ff2a1a'; ctx.shadowColor = '#ff2a1a'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(40, 182, 14, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(216, 182, 14, 0, 7); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#e8e8e0'; ctx.font = 'bold 34px Arial'; ctx.textAlign = 'center'; ctx.fillText('404', 128, 192);
  });
}
function makeRoach3D() {
  const g = new THREE.Group(), body = mat('#4a2410'), dark = mat('#1a0c04');
  g.add(box(0.07, 0.03, 0.12, body, 0, 0.02, 0, false), box(0.05, 0.025, 0.04, dark, 0, 0.02, 0.075, false));
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) g.add(box(0.06, 0.008, 0.008, dark, s * 0.05, 0.01, -0.03 + i * 0.03, false));
  g.scale.setScalar(1.6);
  return g;
}
function makeSwarm(n) { // one draw call for the whole swarm of cockroaches
  const parts = [], add = (w, h, d, x, y, z) => { const b = new THREE.BoxGeometry(w, h, d); b.translate(x, y, z); parts.push(b); };
  add(0.08, 0.035, 0.13, 0, 0.02, 0); add(0.05, 0.03, 0.045, 0, 0.02, 0.085);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) add(0.07, 0.01, 0.01, s * 0.055, 0.012, -0.035 + i * 0.035);
  const geo = mergeGeometries(parts); parts.forEach((p) => p.dispose());
  const m = new THREE.InstancedMesh(geo, mat('#3a1c0a'), n); m.frustumCulled = false;
  return m;
}
export function addScarf(r, color) { // an apa's headscarf
  const m = mat(color);
  r.head.add(box(0.37, 0.08, 0.37, m, 0, 0.38, -0.01, false), box(0.05, 0.3, 0.34, m, -0.185, 0.22, -0.02, false),
    box(0.05, 0.3, 0.34, m, 0.185, 0.22, -0.02, false), box(0.37, 0.36, 0.05, m, 0, 0.2, -0.185, false));
}
function addKalpak(r) { // a white felt kalpak with a black rim
  r.head.add(box(0.33, 0.2, 0.33, mat('#f2efe6'), 0, 0.47, 0, false), box(0.37, 0.05, 0.37, mat('#151515'), 0, 0.38, 0, false));
}
function addHeadphones(r) {
  const m = mat('#e02060');
  r.head.add(box(0.4, 0.04, 0.06, m, 0, 0.4, 0, false), box(0.05, 0.11, 0.11, m, -0.19, 0.2, 0, false), box(0.05, 0.11, 0.11, m, 0.19, 0.2, 0, false));
}
function makeController() { // a metro ticket inspector in uniform
  const r = makeHumanoid({ suit: true, shirt: '#1d2c5e', pants: '#1a2444', hat: 'cap', capColor: '#1d2c5e', hair: 'short', skin: '#d2a37a' });
  r.spine.add(box(0.08, 0.05, 0.02, basic('#ffd040'), 0.11, 0.3, 0.16, false));
  r.armR.add(box(0.05, 0.12, 0.06, mat('#8a8a8a'), 0, -0.8, 0.05, false));
  return r;
}
function makeAksakal() {
  const r = makeHumanoid({ skin: '#c89a78', shirt: '#2e2e2e', pants: '#222', outfit: 'jacket', hair: 'short', hairColor: '#e8e8e0', beard: true });
  addKalpak(r); return r;
}
export function makeApa(shirt, scarf) {
  const r = makeHumanoid({ skin: '#d8b090', shirt, pants: '#3a2a3a', outfit: 'plain', hair: 'bun', hairColor: '#2a1a10', fat: 1.25 });
  addScarf(r, scarf); return r;
}

export function extendDirector20(D) {
  const P = D.prototype;

  // ================================================================ BUILD
  const origInit19 = P.initMetro19;
  P.initMetro19 = function () { origInit19.call(this); this.buildTrain(); this.buildTrainActors(); this.resetTrain(); };

  P.buildTrain = function () {
    const G = this.G, W = G.world, M = this.metro;
    const T = this.train = { on: false, k: 0, speed: VMAX, phase: 'run', phaseT: 0, platOff: 0, doors: [], wagons: [], actors: [], sc: [],
      stopsDone: {}, hasTicket: false, alertK: -1, sideOpen: 0, sideTarget: 0, paUntil: 0 };
    const g = T.group = new THREE.Group(); g.visible = false; G.scene.add(g);
    const bodyM = mat('#c9cdc4'), floorM = mat('#4a4a46'), seatM = mat('#2a5a8a'), steelM = mat('#a8acae'), doorM = mat('#8f969a'), darkM = mat('#1c1c1c');
    const glassM = new THREE.MeshBasicMaterial({ color: 0x0a1418, transparent: true, opacity: 0.42, side: THREE.DoubleSide });
    const col = (x0, x1, z0, z1, y1 = MY + 3) => W.addCollider(Math.min(x0, x1), Math.max(x0, x1), Math.min(z0, z1), Math.max(z0, z1), MY - 1, y1);
    const ads = [...(M.posterBase || []), ...(M.memePosters || [])];
    // the LED "next station" strip (one canvas for every wagon)
    const lc = document.createElement('canvas'); lc.width = 512; lc.height = 48; T.ledCtx = lc.getContext('2d'); T.ledTex = new THREE.CanvasTexture(lc);
    const ledM = new THREE.MeshBasicMaterial({ map: T.ledTex });
    for (let k = 0; k < NW; k++) {
      const wg = new THREE.Group(); g.add(wg);
      const zb = zBack(k), zf = zFront(k), zc = (zb + zf) / 2;
      const parts = { body: [], floor: [], seat: [], steel: [], dark: [], door: [], panel: [], la: [], lb: [] };
      const add = (arr, w, h, d, x, y, z) => { const b = new THREE.BoxGeometry(w, h, d); b.translate(x, y, z); arr.push(b); };
      add(parts.floor, 3.3, 0.1, WL, TX, MY - 0.05, zc);
      add(parts.body, 3.3, 0.08, WL, TX, MY + 2.58, zc);
      // the tunnel side (x-): a solid wall with painted doors
      add(parts.body, 0.1, 0.95, WL, TX - 1.6, MY + 0.475, zc); add(parts.body, 0.1, 0.6, WL, TX - 1.6, MY + 2.25, zc);
      for (const d of DOORS) add(parts.door, 0.04, 2.0, 1.3, TX - 1.53, MY + 1.0, zb - d);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(WL, 1.0), glassM); gl.position.set(TX - 1.6, MY + 1.45, zc); gl.rotation.y = Math.PI / 2; wg.add(gl);
      // the platform side (x+): real door openings with sliding leaves
      for (const [a, b] of WALLSEG) {
        const c = zb - (a + b) / 2;
        add(parts.body, 0.1, 0.95, b - a, TX + 1.6, MY + 0.475, c); add(parts.body, 0.1, 0.6, b - a, TX + 1.6, MY + 2.25, c);
        const gr = new THREE.Mesh(new THREE.PlaneGeometry(b - a, 1.0), glassM); gr.position.set(TX + 1.6, MY + 1.45, c); gr.rotation.y = -Math.PI / 2; wg.add(gr);
      }
      for (const d of DOORS) {
        add(parts.body, 0.1, 0.55, 1.3, TX + 1.6, MY + 2.275, zb - d);
        add(parts.la, 0.04, 2.0, 0.65, TX + 1.52, MY + 1.0, zb - d + 0.325); add(parts.lb, 0.04, 2.0, 0.65, TX + 1.52, MY + 1.0, zb - d - 0.325);
        for (const s of [-1, 1]) add(parts.steel, 0.045, 2.0, 0.045, TX + s * 0.75, MY + 1.0, zb - d);
      }
      col(TX - 1.75, TX - 1.55, zb, zf); col(TX + 1.55, TX + 1.75, zb, zf);
      // seats along both walls
      for (const s of [-1, 1]) for (const [a, b] of SEATS) {
        const c = zb - (a + b) / 2;
        add(parts.seat, 0.5, 0.45, b - a, TX + s * 1.27, MY + 0.225, c); add(parts.seat, 0.1, 0.5, b - a, TX + s * 1.5, MY + 0.62, c);
        col(TX + s * 1.02, TX + s * 1.6, zb - a, zb - b, MY + 0.5);
      }
      for (const s of [-1, 1]) add(parts.steel, 0.04, 0.04, WL, TX + s * 0.75, MY + 2.0, zc);
      for (let z = zb - 1.6; z > zf; z -= 3.2) for (const s of [-1, 1]) add(parts.panel, 0.38, 0.04, 2.4, TX + s * 0.55, MY + 2.52, z);
      // end walls with a 1 m door opening
      for (const z of [zb, zf]) {
        add(parts.body, 1.1, 2.6, 0.1, TX - 1.05, MY + 1.3, z); add(parts.body, 1.1, 2.6, 0.1, TX + 1.05, MY + 1.3, z); add(parts.body, 1.0, 0.6, 0.1, TX, MY + 2.3, z);
        col(TX - 1.6, TX - 0.5, z - 0.05, z + 0.05); col(TX + 0.5, TX + 1.6, z - 0.05, z + 0.05);
      }
      if (k < NW - 1) { // the gangway to the next wagon
        const gz = zf - GAP / 2;
        add(parts.dark, 0.06, 2.1, GAP, TX - 0.55, MY + 1.05, gz); add(parts.dark, 0.06, 2.1, GAP, TX + 0.55, MY + 1.05, gz);
        add(parts.floor, 1.1, 0.1, GAP, TX, MY - 0.05, gz); add(parts.dark, 1.1, 0.06, GAP, TX, MY + 2.1, gz);
        col(TX - 1.6, TX - 0.5, zf - GAP, zf); col(TX + 0.5, TX + 1.6, zf - GAP, zf);
      }
      const mk = (arr, m) => { if (!arr.length) return null; const mesh = new THREE.Mesh(mergeGeometries(arr), m); arr.forEach((x) => x.dispose()); wg.add(mesh); return mesh; };
      mk(parts.body, bodyM); mk(parts.floor, floorM); mk(parts.seat, seatM); mk(parts.steel, steelM); mk(parts.dark, darkM); mk(parts.door, doorM);
      const panelM = basic('#f4fff8'); mk(parts.panel, panelM);
      const leafA = mk(parts.la, doorM), leafB = mk(parts.lb, doorM);
      // the door to the next wagon (it closes behind you), and the LED above it
      const leaf = new THREE.Group(); leaf.position.set(TX, MY, zf - 0.09);
      leaf.add(box(1.0, 2.0, 0.05, doorM, 0, 1.0, 0, false), box(0.5, 0.6, 0.06, darkM, 0, 1.45, 0, false));
      wg.add(leaf);
      const dc = col(TX - 0.5, TX + 0.5, zf - 0.15, zf - 0.03);
      T.doors.push({ k, leaf, col: dc, open: 0, target: 0, locked: true, passed: false });
      const led = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.14), ledM); led.position.set(TX, MY + 2.12, zf + 0.06); wg.add(led);
      // meme adverts above the windows
      for (const [i, l] of [[0, 5.6], [1, 10.4]]) {
        const ad = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.42), new THREE.MeshBasicMaterial({ map: ads[(k * 2 + i) % ads.length] }));
        ad.position.set(TX - 1.545, MY + 2.25, L(k, l)); ad.rotation.y = Math.PI / 2; wg.add(ad);
      }
      T.wagons.push({ group: wg, panelM, leafA, leafB, lit: 'on' });
    }
    // the very back of the train: a locked door looking into the dark tunnel
    const back = new THREE.Group(); back.position.set(TX, MY, -0.09);
    back.add(box(1.0, 2.0, 0.05, doorM, 0, 1.0, 0, false), box(0.5, 0.6, 0.06, darkM, 0, 1.45, 0, false));
    T.wagons[0].group.add(back); col(TX - 0.5, TX + 0.5, -0.15, -0.03);
    // the head wagon: 6 adverts that will turn into faces
    T.ads9 = [];
    for (const s of [-1, 1]) for (const l of [4, 8.2, 12.4]) {
      const ad = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.42), new THREE.MeshBasicMaterial({ map: ads[T.ads9.length % ads.length] }));
      ad.position.set(TX + s * 1.545, MY + 2.25, L(NW - 1, l + (s > 0 ? 0 : 0.6))); ad.rotation.y = -s * Math.PI / 2;
      T.wagons[NW - 1].group.add(ad); T.ads9.push(ad);
    }
    T.adTex = T.ads9.map((a) => a.material.map);
    // the driver's cab
    const cg = T.wagons[NW - 1].group, cz = (CAB0 + CAB1) / 2;
    cg.add(box(3.3, 0.1, 3.2, floorM, TX, MY - 0.05, cz, false), box(3.3, 0.08, 3.2, bodyM, TX, MY + 2.58, cz, false));
    for (const s of [-1, 1]) cg.add(box(0.1, 2.6, 3.2, bodyM, TX + s * 1.6, MY + 1.3, cz, false));
    cg.add(box(3.3, 1.0, 0.1, bodyM, TX, MY + 0.5, CAB1, false), box(3.3, 0.45, 0.1, bodyM, TX, MY + 2.35, CAB1, false));
    for (const s of [-1, 1]) cg.add(box(0.3, 1.2, 0.1, bodyM, TX + s * 1.45, MY + 1.6, CAB1, false));
    const ws = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.15), new THREE.MeshBasicMaterial({ color: 0x0a1418, transparent: true, opacity: 0.2 }));
    ws.position.set(TX, MY + 1.6, CAB1 + 0.01); cg.add(ws);
    cg.add(box(2.3, 0.85, 0.6, darkM, TX, MY + 0.43, CAB1 + 0.38, false));
    for (let i = 0; i < 6; i++) cg.add(box(0.06, 0.03, 0.06, basic(['#f22', '#2f2', '#ff2', '#29f'][i % 4]), TX - 0.6 + i * 0.24, MY + 0.87, CAB1 + 0.3, false));
    cg.add(box(0.55, 0.5, 0.55, seatM, TX - 0.45, MY + 0.25, CAB1 + 1.3, false), box(0.55, 0.75, 0.1, seatM, TX - 0.45, MY + 0.85, CAB1 + 1.6, false));
    col(TX - 1.75, TX - 1.55, CAB0, CAB1); col(TX + 1.55, TX + 1.75, CAB0, CAB1); col(TX - 1.6, TX + 1.6, CAB1 - 0.1, CAB1 + 0.68);
    col(TX - 0.72, TX - 0.18, CAB1 + 1.0, CAB1 + 1.66, MY + 0.5);
    // the driver: from behind, a dark head; when he turns around... the Manager's smile
    T.driver = new THREE.Group();
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.0), new THREE.MeshBasicMaterial({ map: this.zone.mgrTex, transparent: true }));
    const nape = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.75), basic('#120c08')); nape.rotation.y = Math.PI; nape.position.z = -0.02;
    T.driver.add(face, nape); T.driver.position.set(TX - 0.45, MY + 1.3, CAB1 + 1.25); cg.add(T.driver);
    // ahead in the tunnel: the last wagon of a train (your own)
    T.tail = new THREE.Group();
    T.tail.add(new THREE.Mesh(new THREE.PlaneGeometry(3.0, 2.7), new THREE.MeshBasicMaterial({ map: tailTex() })));
    T.tail.add(box(3.0, 2.7, 8, darkM, 0, 0, -4.1, false));
    T.tail.position.set(TX, MY + 1.35, CAB1 - 48); T.tail.visible = false; g.add(T.tail);
    // the tunnel around the train
    const tunM = mat('#22201c'), tl = 440, tz = -200;
    g.add(box(0.4, 4.6, tl, tunM, TX - 3.3, MY + 1.1, tz, false), box(7.2, 0.2, tl, tunM, TX, MY - 1.15, tz, false), box(7.2, 0.2, tl, tunM, TX, MY + 3.5, tz, false));
    T.tunnelR = new THREE.Group(); g.add(T.tunnelR);
    T.tunnelR.add(box(0.4, 4.6, tl, tunM, TX + 3.3, MY + 1.1, tz, false));
    for (const y of [2.42, 2.56]) { g.add(box(0.06, 0.06, tl, darkM, TX - 3.08, MY + y, tz, false)); T.tunnelR.add(box(0.06, 0.06, tl, darkM, TX + 3.08, MY + y, tz, false)); }
    T.tlights = [];
    const tlm = basic('#ffd890');
    for (let i = 0; i < 26; i++) for (const s of [-1, 1]) {
      const b = box(0.12, 0.12, 0.7, tlm, TX + s * 3.05, MY + 1.75, 20 - i * 4, false); b.userData.right = s > 0; g.add(b); T.tlights.push(b);
    }
    // the station platform that slides in when the train stops
    const pf = T.plat = new THREE.Group(); pf.visible = false; g.add(pf);
    const PL = 46;
    T.platFloorM = mat('#6a6660', { unique: true }); T.platColM = mat('#d8d4c8', { unique: true });
    T.platFloorMesh = box(5.6, 1.0, PL, T.platFloorM, TX + 4.45, MY - 0.5, 0, false); pf.add(T.platFloorMesh);
    pf.add(box(0.16, 0.012, PL, basic('#e0b020'), TX + 1.95, MY + 0.006, 0, false));
    T.platWallM = mat('#ffffff', { map: M.themeTex[5], unique: true });
    const pw = new THREE.Mesh(facadeBox(0.3, 3.8, PL, 2, 2), T.platWallM); pw.position.set(TX + 7.4, MY + 1.9, 0); pf.add(pw);
    pf.add(box(5.8, 0.2, PL, darkM, TX + 4.45, MY + 3.95, 0, false));
    T.platCols = new THREE.Group(); pf.add(T.platCols);
    for (const z of [-17, -6, 6, 17]) T.platCols.add(box(0.6, 3.8, 0.6, T.platColM, TX + 4.6, MY + 1.9, z, false));
    for (const z of [-9, 9]) T.platCols.add(box(0.5, 0.45, 1.8, mat('#5a4a3a'), TX + 6.6, MY + 0.22, z, false));
    for (const z of [-PL / 2, PL / 2]) pf.add(box(5.8, 4.4, 0.3, darkM, TX + 4.45, MY + 1.8, z, false));
    const sc = document.createElement('canvas'); sc.width = 512; sc.height = 124; T.signCtx = sc.getContext('2d'); T.signTex = new THREE.CanvasTexture(sc);
    for (const z of [-14, 0, 14]) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.63), new THREE.MeshBasicMaterial({ map: T.signTex }));
      s.position.set(TX + 7.23, MY + 2.75, z); s.rotation.y = -Math.PI / 2; pf.add(s);
    }
    T.plaqueTex = {
      5: [txt(256, 256, medallion), 1.8, 1.8], 4: [txt(512, 280, silkMap), 2.8, 1.53], 3: [txt(512, 256, abaiPlaque), 3.2, 1.6],
      2: [txt(256, 128, (ctx, w, h) => spray(ctx, '404', '#e02020', w, h, 110)), 2.4, 1.2],
      1: [txt(256, 128, (ctx) => { ctx.fillStyle = '#05030c'; ctx.fillRect(0, 0, 256, 128); ctx.fillStyle = '#c8b0ff'; ctx.shadowColor = '#a080ff'; ctx.shadowBlur = 16; ctx.font = 'bold 110px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('∞', 128, 64); }), 1.8, 0.9],
    };
    T.plaque = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: T.plaqueTex[5][0], transparent: true }));
    T.plaque.position.set(TX + 7.22, MY + 1.55, 6); T.plaque.rotation.y = -Math.PI / 2; pf.add(T.plaque);
    // the ticket on the floor of the last wagon
    T.ticket = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.11), [mat('#d8c890'), mat('#d8c890'), new THREE.MeshBasicMaterial({ map: ticketTex() }), mat('#d8c890'), mat('#d8c890'), mat('#d8c890')]);
    T.ticket.position.set(TX + 0.35, MY + 0.01, L(0, 4.1)); T.ticket.rotation.y = 0.5; T.ticket.visible = false; T.wagons[0].group.add(T.ticket);
    W.addInteract({ pos: T.ticket.position.clone().setY(MY + 0.3), r: 2.4, label: '🎫 Take the ticket (Білетті алу)', enabled: () => T.on && T.ticketOut && !T.hasTicket,
      act: () => { T.hasTicket = true; T.ticket.visible = false; G.audio.beep(null, 1320, 0.1, 0.2, 'sine'); G.ui.toast('🎫 БІЛЕТ алынды (ticket taken). The controller will ask for it.'); } });
    T.rulesTex = rulesTex();
    T.group.add(M.wagonHorse.root); // the horse commuter rides in the last wagon now
  };

  P.buildTrainActors = function () {
    const G = this.G, T = this.train, M = this.metro, g = T.group;
    const A = (rig, k) => { g.add(rig.root); rig.act = { rig, root: rig.root, k, show: true }; T.actors.push(rig.act); return rig; };
    const H = (o, k) => A(makeHumanoid(o), k);
    T.sleepers = [H({ ...randomLook(), outfit: 'jacket' }, 0), H({ ...randomLook(), outfit: 'hoodie' }, 0), H({ ...randomLook(), outfit: 'shirt' }, 0)];
    // 2: the apa, her slipper, her bag, the cockroaches
    T.apa = A(makeApa('#7a2050', '#d84a8a'), 1);
    T.slipper = box(0.09, 0.03, 0.24, mat('#e05090'), 0, -0.8, 0.05, false); T.slipper.visible = false; T.apa.armR.add(T.slipper);
    T.slipperFly = box(0.09, 0.03, 0.24, mat('#e05090'), 0, 0, 0, false); T.slipperFly.visible = false; g.add(T.slipperFly);
    T.bag = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.45), mat('#ffffff', { map: plaidTex(), unique: true }));
    T.bag.position.set(TX + 0.62, MY + 0.28, L(1, 2.5)); T.wagons[1].group.add(T.bag);
    G.world.addCollider(TX + 0.27, TX + 0.97, L(1, 2.5) - 0.23, L(1, 2.5) + 0.23, MY - 1, MY + 0.6);
    T.roach = makeRoach3D(); T.roach.visible = false; g.add(T.roach);
    T.swarm = makeSwarm(40); T.swarm.visible = false; g.add(T.swarm);
    // 3: Зыпылдаған 25
    T.zyp = H({ ...randomLook(), outfit: 'tshirt', shirt: '#e0c020', hair: 'buzz' }, 2);
    T.bg2 = [H({ ...randomLook(), outfit: 'jacket' }, 2), H({ ...randomLook(), outfit: 'hoodie' }, 2)];
    // 4: the controller and Otanbas
    T.otanbas = H({ outfit: 'jacket', shirt: '#4a4a3a', pants: '#2a2a2a', hair: 'short', hat: 'cap', capColor: '#222', skin: '#c89870' }, 3);
    T.ctrl = A(makeController(), 3);
    // 5: the wedding
    T.bride = H({ shirt: '#ffffff', pants: '#ffffff', hair: 'long', hairColor: '#2a1a10', outfit: 'plain' }, 4);
    T.bride.hips.add(cyl(0.32, 0.55, 0.9, 10, mat('#ffffff'), 0, -0.45, 0));
    T.groom = H({ suit: true, shirt: '#1a1a1a', pants: '#1a1a1a', hair: 'short' }, 4);
    T.guests = [H({ ...randomLook(), outfit: 'shirt' }, 4), H({ ...randomLook(), outfit: 'shirt' }, 4)];
    T.asaba = H({ suit: true, shirt: '#6a1a1a', pants: '#2a1a1a', hair: 'short', glasses: true }, 4);
    T.asaba.armR.add(cyl(0.03, 0.025, 0.2, 6, mat('#222'), 0, -0.82, 0.08));
    T.cat = H({ animal: 'cat', skin: '#222', outfit: 'jacket', shirt: '#2a2a2a', pants: '#111' }, 4);
    T.cake = new THREE.Group(); T.cake.add(box(0.8, 0.75, 0.6, mat('#7a5a3a'), 0, 0.37, 0));
    T.cakeTiers = [[0.34, 0.26], [0.27, 0.24], [0.2, 0.22]].map(([r, h], i) => { const c = cyl(r, r, h, 12, mat(i === 2 ? '#fff0f4' : '#fffaf0'), 0, 0.75 + h / 2 + i * 0.25, 0); T.cake.add(c); return c; });
    T.cake.position.set(TX - 0.62, MY, L(4, 8)); T.wagons[4].group.add(T.cake);
    G.world.addCollider(TX - 1.02, TX - 0.22, L(4, 8) - 0.3, L(4, 8) + 0.3, MY - 1, MY + 1);
    ['#ff4080', '#40c0ff', '#ffd040', '#ffffff', '#ff4080'].forEach((c, i) => {
      T.wagons[4].group.add(box(0.26, 0.32, 0.26, mat(c, { emissive: c, emissiveIntensity: 0.3 }), TX + (i % 2 ? 0.55 : -0.55), MY + 2.2, L(4, 2.5 + i * 2.8), false));
    });
    // 6: Kaspi, the phone on credit, GTA 6, the RTX seller
    T.erlan = H({ ...randomLook(), outfit: 'jacket' }, 5);
    T.phoneGuy = H({ ...randomLook(), outfit: 'hoodie' }, 5);
    T.phoneProp = box(0.08, 0.15, 0.015, mat('#111', { emissive: '#223' }), 0, -0.75, 0.08); T.phoneGuy.armR.add(T.phoneProp);
    T.seller = H({ suit: true, shirt: '#2a2a33', pants: '#22222a', hair: 'short', glasses: true }, 5);
    const fb = new THREE.Group(); fb.add(box(0.55, 0.38, 0.75, mat('#1a1a1a'), 0, 0, 0), box(0.56, 0.05, 0.76, basic('#76ff03'), 0, 0.1, 0, false));
    fb.position.set(0, 0.35, 0.45); T.seller.spine.add(fb);
    T.disc = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.02, 0.24), [mat('#222'), mat('#222'), new THREE.MeshLambertMaterial({ map: M.discTex }), mat('#222'), mat('#222'), mat('#222')]);
    T.disc.position.set(TX + 1.25, MY + 0.47, L(5, 11)); T.disc.rotation.y = 0.4; T.wagons[5].group.add(T.disc);
    // 7: «Қазіргі жастар...» and the aksakal
    T.apa2 = A(makeApa('#3a5a8a', '#e0c040'), 6);
    T.youth = H({ ...randomLook(), outfit: 'hoodie', hair: 'mohawk' }, 6); addHeadphones(T.youth);
    T.aksakal = A(makeAksakal(), 6);
    // 8: Remember November
    T.bear = H({ animal: 'bear', skin: '#eeece4', shirt: '#eeece4', pants: '#eeece4', fat: 1.6, scale: 1.15 }, 7);
    T.bg7 = [H({ ...randomLook(), outfit: 'jacket' }, 7), H({ ...randomLook(), outfit: 'shirt' }, 7)];
    // 9: the rap battle
    T.leo = H({ animal: 'leopard', skin: '#e2d2a2', outfit: 'hoodie', shirt: '#1a1a1a', pants: '#2a2a4a', hat: 'cap', capColor: '#d02020' }, 8);
    T.leo.root.add(box(0.6, 0.35, 0.25, mat('#222'), 0.6, 0.18, 0));
    T.crew = [0, 1, 2, 3].map(() => H({ outfit: 'hoodie', hair: pick(['buzz', 'mohawk', 'short']) }, 8));
    T.karate = H({ animal: 'cat', skin: '#d08a3a', shirt: '#f4f4f0', pants: '#f4f4f0', outfit: 'plain' }, 8);
    // 10: the darkness with red eyes
    T.dark9 = new THREE.Group();
    T.dark9.add(box(3.1, 2.55, 0.4, basic('#000'), 0, 1.28, 0, false));
    T.darkEyes = [-0.25, 0.25].map((x) => { const e = box(0.12, 0.06, 0.02, basic('#ff1010', { fog: false }), x, 1.7, -0.22, false); T.dark9.add(e); return e; });
    T.dark9.visible = false; g.add(T.dark9);
    // on the platforms: Buddy on a bench (Райымбек батыр) and The Dad??? (Жібек жолы)
    T.buddy = makeHumanoid({ shirt: '#e0e0e0', pants: '#2a4a2a', hat: 'cap', capColor: '#2a8a2a', fat: 1.05, outfit: 'tshirt' });
    T.dad = makeHumanoid({ animal: 'kangaroo', skin: '#9a6a3a', shirt: '#9a6a3a', pants: '#9a6a3a', buff: true, scale: 1.9, fat: 1.15 });
    [T.buddy, T.dad].forEach((r) => { r.root.visible = false; T.plat.add(r.root); });
  };

  /** Every actor back to its place, every door closed: the train as it is when you wake up. */
  P.resetTrain = function () {
    const T = this.train, M = this.metro;
    T.doors.forEach((d) => { d.open = 0; d.target = 0; d.locked = true; d.passed = false; d.leaf.position.x = TX; d.col.enabled = true; });
    T.sc = Array.from({ length: NW }, () => ({ state: 'idle' }));
    T.sc[0].state = 'intro';
    Object.assign(T, { k: 0, alertK: -1, dark: false, flick: 0, flash: 0, speed: VMAX, phase: 'run', phaseT: 0, sideOpen: 0, sideTarget: 0,
      stopsDone: {}, inCab: false, cabStarted: false, caught: false, platLvl: undefined, onOpen: null, ticketOut: false });
    T.plat.visible = false; T.tunnelR.visible = true; T.tail.visible = false; T.dark9.visible = false;
    T.driver.visible = true; T.driver.rotation.y = Math.PI;
    T.ads9.forEach((a, i) => (a.material.map = T.adTex[i]));
    T.swarm.visible = false; T.roach.visible = false; T.slipperFly.visible = false; T.slipper.visible = false; T.bag.rotation.z = 0;
    T.cakeTiers.forEach((c) => (c.visible = true)); T.phoneProp.visible = true;
    T.disc.material[2].map = M.discTex;
    for (const a of T.actors) if (a.root.parent !== T.group) T.group.attach(a.root);
    const sit = (r, side, k, l, mode = 'sit') => { r.root.position.set(TX + side * 1.15, MY, L(k, l)); r.root.rotation.set(0, -side * Math.PI / 2, 0); r.mode = mode; r.spd = 0; r.act.show = true; };
    const stand = (r, x, k, l, ry, mode = 'stand') => { r.root.position.set(x, MY, L(k, l)); r.root.rotation.set(0, ry, 0); r.mode = mode; r.spd = 0; r.act.show = true; };
    sit(T.sleepers[0], 1, 0, 2.0, 'sleep'); sit(T.sleepers[1], -1, 0, 1.4, 'sleep'); sit(T.sleepers[2], 1, 0, 10.4, 'sleep');
    sit(T.apa, 1, 1, 3.4);
    sit(T.zyp, -1, 2, 9.2); sit(T.bg2[0], 1, 2, 5.6, 'sleep'); sit(T.bg2[1], -1, 2, 14);
    sit(T.otanbas, 1, 3, 1.6); stand(T.ctrl, TX + 0.1, 3, 12.6, 0);
    stand(T.bride, TX + 0.5, 4, 4.4, -Math.PI / 2, 'dance'); stand(T.groom, TX - 0.3, 4, 4.4, Math.PI / 2, 'dance');
    stand(T.guests[0], TX + 0.5, 4, 10.8, 0, 'dance'); stand(T.guests[1], TX - 0.25, 4, 11.6, 0, 'dance');
    stand(T.asaba, TX + 0.5, 4, 13.6, 0); sit(T.cat, 1, 4, 14.6);
    sit(T.erlan, 1, 5, 3.6); sit(T.phoneGuy, -1, 5, 6.2); T.seller.act.show = false;
    stand(T.apa2, TX - 0.45, 6, 2.2, -Math.PI / 2); sit(T.youth, -1, 6, 2.2); sit(T.aksakal, 1, 6, 3.6);
    T.bear.act.show = false; sit(T.bg7[0], -1, 7, 6, 'sleep'); sit(T.bg7[1], 1, 7, 12.4, 'sleep');
    stand(T.leo, TX + 0.1, 8, 1.8, 0, 'rap'); T.crew.forEach((r) => (r.act.show = false)); T.karate.act.show = false;
    T.buddy.root.visible = false; T.dad.root.visible = false;
    this.trainLed('СОҢҒЫ ПОЙЫЗ · 03:33 · Келесі бекет: Райымбек батыр');
  };

  // ================================================================ SMALL HELPERS
  P.trainLed = function (text) {
    const T = this.train, c = T.ledCtx;
    c.fillStyle = '#020'; c.fillRect(0, 0, 512, 48); c.fillStyle = '#ff9a20'; c.textAlign = 'center'; c.textBaseline = 'middle';
    let s = 28; do { c.font = `bold ${s}px Arial`; s -= 2; } while (c.measureText(text).width > 500 && s > 10);
    c.fillText(text, 256, 25); T.ledTex.needsUpdate = true;
  };
  P.trainLocal = function () { const z = this.G.player.pos.z, k = Math.max(0, Math.min(NW - 1, Math.floor(-z / WP))); return -z - k * WP; };
  P.trainFace = function (rig) { const p = this.G.player.pos; rig.root.rotation.y = Math.atan2(p.x - rig.root.position.x, p.z - rig.root.position.z); };
  /** Walk a rig towards (x, z) (in its parent's space). Returns true on arrival. */
  P.trainWalk = function (rig, x, z, sp, dt) {
    const p = rig.root.position, dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz);
    if (d < 0.06) { rig.mode = rig.mode === 'walk' || rig.mode === 'run' ? 'stand' : rig.mode; rig.spd = 0; return true; }
    const s = Math.min(d, sp * dt);
    p.x += dx / d * s; p.z += dz / d * s;
    rig.root.rotation.y = Math.atan2(dx, dz); rig.phase += dt * (2 + sp * 1.9); rig.mode = sp > 4 ? 'run' : 'walk'; rig.spd = sp;
    return false;
  };
  /** Chase the player inside wagon k (a chaser can never leave its wagon). Returns the distance. */
  P.trainChase = function (rig, sp, dt, k) {
    const P0 = this.G.player.pos;
    this.trainWalk(rig, Math.max(TX - 0.9, Math.min(TX + 0.9, P0.x)), Math.max(P0.z, zFront(k) + 0.5), sp, dt);
    return Math.hypot(P0.x - rig.root.position.x, P0.z - rig.root.position.z);
  };
  P.trainPA = function (kz, en, noChime) {
    const G = this.G, T = this.train;
    if (!noChime) { G.audio.beep(null, 660, 0.3, 0.2, 'triangle'); setTimeout(() => G.audio.beep(null, 523, 0.5, 0.2, 'triangle'), 320); }
    G.ui.say(kz, '📢 Пойыз', 3, '#9cf');
    if (!G.audio.speak(kz.replace(/\s*\(.*\)\s*$/, ''), { lang: 'kk' }) && en) G.audio.speak(en);
    T.paUntil = G.time + 3.2;
  };
  P.trainKK = function (text, who, color, dur, o = {}) { // a Kazakh line: subtitle + voice (if there is one that can read it)
    this.G.ui.say(text, who, dur, color);
    this.G.audio.speak(text.replace(/\s*\(.*\)\s*$/, ''), { lang: 'kk', ...o });
  };
  P.trainAlert = function (k, text) {
    const G = this.G, T = this.train, Pl = G.player;
    T.alertK = k;
    G.audio.sting(0.5); G.audio.infrasound(3, 0.5); G.audio.reverseWhisper(Pl.pos.clone().setY(MY + 1.6), 0.3);
    Pl.scare(0.5);
    if (text) G.ui.big(text, 1.8, 'red');
  };
  P.trainClearAlert = function () { this.train.alertK = -1; };
  P.trainJolt = function () { const G = this.G, Pl = G.player; G.audio.thud(null, 1); G.audio.clank(null, 0.5); Pl.shake = 0.8; Pl.knock.set(0, 0, -4); };
  P.trainBang = function (k) { const G = this.G; this.repeat(3, 0.45, () => G.audio.thud(V(TX, MY + 1.2, zFront(k)), 0.9)); };

  // ================================================================ STATIONS
  P.preparePlatform = function (lvl, k) {
    const T = this.train, M = this.metro, th = THEMES[lvl] || THEMES[5];
    T.platWallM.map = M.themeTex[lvl] || M.themeTex[5];
    T.platColM.color.set(th.ceil); T.platFloorM.color.set(th.floor); T.platLight = th.light;
    const tunnel = lvl === 2;
    T.platFloorMesh.visible = !tunnel; T.platCols.visible = !tunnel;
    const c = T.signCtx, name = STATION[lvl];
    c.fillStyle = tunnel ? '#2a0a08' : '#0a3a7a'; c.fillRect(0, 0, 512, 124); c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    let s = 64; do { c.font = `bold ${s}px Arial`; s -= 2; } while (c.measureText(name).width > 480 && s > 12);
    c.fillText(name, 256, 66); T.signTex.needsUpdate = true;
    const pq = T.plaqueTex[lvl];
    T.plaque.visible = !!pq;
    if (pq) { T.plaque.material.map = pq[0]; T.plaque.scale.set(pq[1], pq[2], 1); }
    T.buddy.root.visible = lvl === 5; T.dad.root.visible = lvl === 4;
    T.buddy.root.position.set(TX + 6.25, MY, 4); T.buddy.root.rotation.set(0, -Math.PI / 2, 0);
    T.dad.root.position.set(TX + 5.2, MY, -13); T.dad.root.rotation.set(0, -Math.PI / 2, 0);
    T.buddySaid = T.dadSaid = false;
    T.platLvl = lvl; T.platZ = (zBack(k) + zFront(k)) / 2; T.platOff = -VMAX * 2;
    T.plat.position.z = T.platZ + T.platOff; T.plat.visible = true; T.tunnelR.visible = false;
    this.trainLed(`Бекет: ${name}`);
  };

  /** The train stops at a station: brakes, the platform slides in, doors open, "Абайлаңыз, есіктер жабылады", off it goes. */
  P.trainStop = function* (lvl, hold = 5, holdUntil = null, quiet = false) {
    const G = this.G, T = this.train;
    if (T.stopsDone[lvl]) return;
    T.stopsDone[lvl] = true;
    yield () => T.phase === 'run';
    if (!quiet) { this.trainPA(`Келесі бекет — ${STATION[lvl]}.`, `Next station: ${STATION_EN[lvl]}.`); yield 2.4; }
    this.preparePlatform(lvl, T.k);
    T.phase = 'brake'; T.phaseT = 0;
    yield () => T.phase === 'stopped';
    T.sideTarget = 1; G.audio.beep(null, 880, 0.12, 0.12, 'square'); G.audio.whoosh(0.3);
    this.trainPA(`${STATION[lvl]}.`, `${STATION_EN[lvl]}.`, true);
    let t = 0;
    yield () => { t += G.dt; return t > hold && (!holdUntil || holdUntil()); };
    this.trainPA('Абайлаңыз, есіктер жабылады. (Careful, the doors are closing.)', 'Careful, the doors are closing.');
    yield 1.8;
    T.sideTarget = 0; G.audio.whoosh(0.3);
    yield 1.0;
    T.phase = 'go'; T.phaseT = 0;
    const next = [5, 4, 3, 2, 1, 0].find((v) => !T.stopsDone[v]);
    this.trainLed(`Келесі бекет: ${STATION[next ?? 0]}`);
  };

  // ================================================================ PER FRAME
  /** The world outside the windows: the train's speed, the tunnel lights, the platform, the doors. */
  P.trainOutside = function (dt) {
    const G = this.G, T = this.train, M = this.metro, Pl = G.player, D = VMAX * 2;
    if (T.phase === 'run') T.speed = Math.min(VMAX, T.speed + dt * 4);
    else if (T.phase === 'brake') {
      T.phaseT += dt; const u = Math.min(1, T.phaseT / 4);
      T.speed = VMAX * (1 - u); T.platOff = -D * (1 - u) * (1 - u);
      if (u >= 1) { T.phase = 'stopped'; T.speed = 0; T.platOff = 0; Pl.knock.set(0, 0, -2.5); G.audio.thud(null, 0.6); }
    } else if (T.phase === 'stopped') T.speed = 0;
    else if (T.phase === 'go') {
      T.phaseT += dt; const u = T.phaseT;
      T.speed = Math.min(VMAX, 4 * u); T.platOff = u < 4 ? 2 * u * u : D + VMAX * (u - 4);
      if (T.platOff > 75) {
        T.plat.visible = false; T.tunnelR.visible = true; T.phase = 'run';
        for (const a of T.actors) if (a.root.parent === T.plat) a.show = false; // whoever got off stays at that station
      }
    }
    if (T.plat.visible) T.plat.position.z = T.platZ + T.platOff;
    for (const b of T.tlights) {
      b.position.z += T.speed * dt;
      if (b.position.z > Pl.pos.z + 30) b.position.z -= 104; else if (b.position.z < Pl.pos.z - 74) b.position.z += 104;
      if (b.userData.right) b.visible = !T.plat.visible;
    }
    if (M.trainSnd) M.trainSnd.setGain(0.2 + 0.8 * T.speed / VMAX);
    if (T.speed > 0.5) Pl.shake = Math.max(Pl.shake, 0.02 + 0.04 * T.speed / VMAX);
    T.sideOpen += (T.sideTarget - T.sideOpen) * Math.min(1, dt * 5);
    for (const w of T.wagons) { w.leafA.position.z = 0.62 * T.sideOpen; w.leafB.position.z = -0.62 * T.sideOpen; }
    if (T.tail.visible) T.tail.position.z += ((T.tailTo ?? T.tail.position.z) - T.tail.position.z) * Math.min(1, dt * 0.5);
  };

  P.trainLights = function (dt, curK) {
    const T = this.train, M = this.metro, Pl = this.G.player, L1 = M.light, L2 = M.wagonLight;
    T.flick = Math.max(0, T.flick - dt); T.flash = Math.max(0, T.flash - dt);
    const alert = T.alertK === curK;
    L1.position.set(Pl.pos.x, MY + 2.4, Pl.pos.z); L1.color.setHex(alert ? 0xff3020 : 0xf0f4ff);
    const base = T.inCab ? 2.4 : 5.4; // softer in the small white cab
    let i1 = T.flick > 0 ? (Math.random() < 0.5 ? 0.7 : base) : base;
    if (T.dark) i1 = T.flash > 0 ? 3.2 : 0.12;
    L1.intensity = i1;
    if (T.plat.visible && T.phase !== 'run') {
      L2.position.set(TX + 4.2, MY + 3.1, Pl.pos.z); L2.color.setHex(T.dark ? 0xff3018 : T.platLight || 0xf0fff0);
      L2.intensity = T.dark ? (Math.random() < 0.06 ? 0 : 1.2) : 6;
    } else {
      L2.position.set(TX, MY + 2.2, Math.max(Pl.pos.z - 8, CAB1 + 0.6)); L2.color.setHex(alert ? 0xff3020 : 0xf0f4ff);
      L2.intensity = T.dark ? 0 : 4.2;
    }
    for (let k = 0; k < NW; k++) {
      const w = T.wagons[k];
      const want = T.dark && Math.abs(k - curK) <= 1 ? (T.flash > 0 ? 'on' : 'dark') : T.alertK === k ? 'red' : 'on';
      if (w.lit !== want) { w.lit = want; w.panelM.color.set(want === 'dark' ? '#1c1e1c' : want === 'red' ? '#ff2a1a' : '#f4fff8'); }
      w.group.visible = Math.abs(k - curK) <= 1;
    }
  };

  P.trainDoorsUpdate = function (dt) {
    const G = this.G, T = this.train, Pl = G.player;
    for (const d of T.doors) {
      const zf = zFront(d.k), dz = Pl.pos.z - zf; // > 0: you are still in wagon k
      if (!d.passed && dz < 1.9 && dz > -1.2 && Math.abs(Pl.pos.x - TX) < 1.3) {
        if (!d.locked) { if (d.target === 0) G.audio.whoosh(0.15); d.target = 1; }
        else if (dz < 1.3 && G.time - (T.lockMsgT || -9) > 5) { T.lockMsgT = G.time; G.ui.toast('🔒 The door will not open yet... (Есік ашылмайды)'); }
      }
      if (!d.passed && dz < -1.45) { d.passed = true; d.target = 0; G.audio.thud(V(TX, MY + 1, zf), 0.4); }
      d.open += (d.target - d.open) * Math.min(1, dt * 7);
      d.leaf.position.x = TX + 1.05 * d.open;
      d.col.enabled = d.open < 0.55;
    }
  };

  P.trainActors = function (dt, curK) {
    const G = this.G, T = this.train;
    for (const a of T.actors) {
      const vis = a.show && Math.abs(a.k - curK) <= 1;
      a.root.visible = vis;
      if (vis) pose(a.rig, a.rig.mode || 'stand', dt, G.time + a.k * 1.7, a.rig.spd || 0);
    }
  };

  P.trainPlatformTick = function (dt) {
    const G = this.G, T = this.train, Pl = G.player;
    if (!T.plat.visible) return;
    const open = T.phase === 'stopped' && T.sideOpen > 0.8;
    if (T.buddy.root.visible) {
      pose(T.buddy, 'sit', dt, G.time, 0);
      if (T.buddySaid) T.buddy.armR.rotation.z = -2.6 + Math.sin(G.time * 10) * 0.4;
      if (open && !T.buddySaid) {
        T.buddySaid = true;
        G.ui.say("HEY!! There you are! Мен осы бекетте үш күннен бері отырмын! (I've been sitting at this station for three days!)", 'Buddy', 4, '#7f7');
        this.collectMeme('buddy');
      }
    }
    if (T.dad.root.visible) {
      const d = T.dad, wz = d.root.position.z + T.plat.position.z;
      d.root.rotation.y = Math.atan2(Pl.pos.x - d.root.position.x, Pl.pos.z - wz);
      if (open && !T.dadSaid) { T.dadSaid = true; G.ui.big('THE DAD???', 2.2, 'glitch'); G.audio.vineBoom(0.9); this.collectMeme('dad'); }
      if (T.phase === 'go' || T.phase === 'run') { // he hops after the train
        d.root.position.z -= Math.min(T.speed, 7) * dt; d.root.position.y = MY + Math.abs(Math.sin(G.time * 6)) * 0.8; pose(d, 'fight', dt, G.time, 0);
      } else pose(d, 'stare', dt, G.time, 0);
    }
  };

  P.trainHud = function (curK) {
    const T = this.train, M = this.metro;
    if (this.G.frame % 6) return;
    const next = [5, 4, 3, 2, 1, 0].find((v) => !T.stopsDone[v]);
    const at = T.plat.visible && T.phase !== 'run' ? `Бекет: ${STATION[T.platLvl]}` : `Келесі бекет: ${STATION[next ?? 0]}`;
    const dots = Array.from({ length: NW }, (_, i) => (i < curK ? '●' : i === curK ? '◉' : '○')).join('');
    M.hud.innerHTML = `<b>METRO 404 · ВАГОН ${curK + 1}/10 · ${T.inCab ? 'Жүргізуші кабинасы' : WNAME[curK]}</b> <span class="mdots">${dots}</span>` +
      `<br><small>${at} · caught ${M.mistakes} · 🎫 ${T.hasTicket ? 'ticket ✔' : 'no ticket'} · RED LIGHT → run to the next wagon · J: meme book</small>`;
  };

  P.updateTrain = function (dt) {
    const G = this.G, T = this.train, Pl = G.player;
    const curK = Math.max(0, Math.min(NW - 1, Math.floor(-Pl.pos.z / WP)));
    const l = -Pl.pos.z - curK * WP;
    if (curK > T.k) T.k = curK;
    this.trainOutside(dt);
    this.trainLights(dt, curK);
    this.trainDoorsUpdate(dt);
    this.trainActors(dt, curK);
    this.trainPlatformTick(dt);
    const S = T.sc[curK];
    if (S && S.state === 'idle' && l > TRIG[curK] && Pl.pos.z > zFront(curK)) { S.state = 'run'; this.task(this['trainScene' + curK]); }
    for (const s of T.sc) if (s.tick) s.tick(dt);
    if (!T.cabStarted && T.doors[NW - 1].passed) { T.cabStarted = true; this.task(this.trainCabTask); }
    this.trainHud(curK);
  };

  /** Caught: a screamer, then this wagon starts again (the chaser goes back to where it started). */
  P.trainCaught = function (k, kind, dmg, msg) {
    const G = this.G, T = this.train, M = this.metro, Pl = G.player, S = T.sc[k];
    if (T.caught || !S) return;
    T.caught = true; S.danger = false; M.lastCatch = CATCHER[k];
    this.task(function* () {
      yield* this.lunge(kind, dmg);
      if (Pl.dead) return;
      M.mistakes++;
      if (this.addAura) this.addAura(-150, 'got caught');
      G.ui.fade(1, 0.3); yield 0.4;
      const d = T.doors[k]; if (d.passed) { d.passed = false; d.target = 0; }
      Pl.pos.set(TX, MY, L(k, RESP[k])); Pl.vel.set(0, 0, 0); Pl.yaw = 0; Pl.pitch = 0; Pl.downT = 0;
      if (S.respawn) S.respawn();
      yield 0.2; G.ui.fade(0, 0.7);
      G.ui.big(msg || 'ҰСТАЛДЫҢ', 2.2, 'red');
      this.after(1.3, () => G.ui.toast(`Вагон ${k + 1} starts again. RED LIGHT → run to the next wagon!`));
      T.caught = false; S.danger = true;
    });
  };

  // ================================================================ WAGON 1: the last train (the intro)
  P.setupIntroWagon = function () {
    const G = this.G, M = this.metro, T = this.train, Pl = G.player, h = M.wagonHorse;
    this.resetTrain();
    T.on = true; T.group.visible = true; M.root.visible = false; M.wagon.visible = false; if (M.esc) M.esc.group.visible = false;
    M.active = false; M.hud.classList.add('hidden');
    G.lighting.fog.color.set('#07080a'); G.lighting.fog.density = 0.03;
    const hx = TX + 1.15, hz = L(0, 5), px = TX - 0.45, pz = L(0, 6.6);
    h.root.visible = true; h.root.position.set(hx, MY, hz); h.root.rotation.set(0, Math.atan2(px - hx, pz - hz), 0);
    if (M.paper.parent !== h.root) h.root.add(M.paper);
    M.paper.material.map = M.paperFront; M.paper.visible = true;
    M.paper.position.set(0, 1.5, 0.6); M.paper.rotation.set(0, 0, 0); M.paperK = 0; M.paperDrop = false;
    T.ticket.visible = false; T.ticketOut = false;
    Pl.pos.set(px, MY, pz); Pl.vel.set(0, 0, 0); Pl.yaw = Math.atan2(-(hx - px), -(hz - pz)); Pl.pitch = -0.04;
    Pl.height = 1.15; Pl.curHeight = 1.15; Pl.locked = true;
  };

  /** Lights back on: the passengers and the horse are gone; the rules on the seat, a ticket on the floor. */
  P.introVanish = function () {
    const M = this.metro, T = this.train;
    T.sleepers.forEach((r) => (r.act.show = false));
    M.wagonHorse.root.visible = false;
    T.group.add(M.paper); M.paper.visible = true; M.paper.material.map = T.rulesTex;
    M.paper.position.set(TX + 1.3, MY + 0.84, L(0, 5)); M.paper.rotation.set(0, -Math.PI / 2, 0); M.paper.rotateX(-0.25);
    T.ticket.visible = !T.hasTicket; T.ticketOut = true;
  };

  P.updateIntro = function (dt) {
    const G = this.G, M = this.metro, T = this.train, Pl = G.player, h = M.wagonHorse;
    const dark = T.dark || M.wagonDark;
    this.trainOutside(dt);
    M.light.position.set(Pl.pos.x, MY + 2.25, Pl.pos.z); M.light.color.setHex(0xf0f4ff);
    M.light.intensity = dark ? 0 : Math.random() < 0.03 ? 1.5 : 6;
    M.wagonLight.position.set(TX, MY + 2.2, Pl.pos.z - 8); M.wagonLight.color.setHex(0xf0f4ff); M.wagonLight.intensity = dark ? 0 : 3.5;
    for (let k = 0; k < NW; k++) {
      const w = T.wagons[k], want = dark ? 'dark' : 'on';
      if (w.lit !== want) { w.lit = want; w.panelM.color.set(dark ? '#1c1e1c' : '#f4fff8'); }
      w.group.visible = k <= 1;
    }
    this.trainActors(dt, 0);
    if (h.root.visible) {
      pose(h, 'sit', dt, G.time, 0);
      if (M.paper.parent === h.root) {
        if (M.paperDrop) M.paperK = Math.min(1, M.paperK + dt / 1.4);
        const k = M.paperK * M.paperK * (3 - 2 * M.paperK);
        M.paper.position.set(0, 1.5 - 0.58 * k, 0.6 - 0.12 * k); M.paper.rotation.x = -1.25 * k;
        h.armL.rotation.x = h.armR.rotation.x = -1.3 * (1 - k) - 0.5 * k;
      }
    }
    if (!M.twist && G.input.hit('KeyE')) M.introSkip = true;
  };

  P.metroIntroTask = function* () {
    const G = this.G, M = this.metro, T = this.train, Pl = G.player;
    const wait = (s) => { const until = G.time + s; return () => M.introSkip || G.time >= until; };
    G.ui.fade(1, 0.01);
    this.setupIntroWagon();
    M.intro = true; M.introSkip = false;
    $('skiphint').classList.remove('hidden');
    M.trainSnd = G.audio.loop('train', null);
    G.audio.setAmbient(0.05, 0.5);
    const scenes = function* () {
      G.ui.big('03:33', 2.6, 'clock');
      yield wait(2); if (M.introSkip) return;
      G.ui.fade(0, 2.2);
      yield wait(2.6); if (M.introSkip) return;
      this.trainPA('Құрметті жолаушылар! Бұл — соңғы пойыз. (Dear passengers, this is the last train.)', 'Dear passengers. This is the last train.');
      yield wait(4.4); if (M.introSkip) return;
      this.trainPA('Келесі бекет — Райымбек батыр. (Next station: Raiymbek Batyr.)', 'Next station: Raiymbek Batyr.');
      yield wait(3.6); if (M.introSkip) return;
      M.paperDrop = true; G.audio.whoosh(0.15);
      yield wait(1.8); if (M.introSkip) return;
      G.ui.say('...сен де адасып қалдың ба? (are you lost too?)', 'Horse', 3.4, '#e0a060'); G.audio.speak('Are you lost too?', { pitch: 0.2, rate: 0.75 });
      yield wait(3.6); if (M.introSkip) return;
      G.ui.say('Бұл пойыздан ешкім түскен жоқ. Ешкім. (Nobody has ever got off this train. Nobody.)', 'Horse', 3.8, '#e0a060');
      this.collectMeme('horse');
      yield wait(4); if (M.introSkip) return;
      T.dark = true; G.audio.beep(null, 55, 0.7, 0.3, 'sawtooth'); G.audio.whoosh(0.5); Pl.scare(0.3);
      yield wait(1.4); if (M.introSkip) return;
      this.introVanish(); T.dark = false;
      G.audio.sting(0.35); Pl.scare(0.4); Pl.shake = 0.4;
      yield wait(1.4); if (M.introSkip) return;
      G.ui.say('(everyone is gone. On the seat: the newspaper with the RULES. On the floor: a ticket.)', '', 4);
      yield wait(4.2);
    };
    yield* scenes.call(this);
    G.ui.fade(1, 0.25); yield 0.3;
    $('skiphint').classList.add('hidden');
    this.introVanish();
    this.collectMeme('horse');
    M.intro = false; T.dark = false; M.wagonDark = false;
    Pl.height = 1.65; Pl.locked = false; Pl.pitch = 0;
    T.doors[0].locked = false; T.sc[0].state = 'done';
    M.hud.classList.remove('hidden');
    yield 0.2; G.ui.fade(0, 0.8);
    G.ui.big('METRO 404', 2.6, 'clock');
    G.ui.toast('Walk forward through the whole train, to the driver. RED LIGHT → run to the next wagon!');
    this.after(3.5, () => { if (!T.hasTicket) G.ui.toast('🎫 There is a ticket on the floor. Take it (E): the controller will ask.'); });
  };

  // ================================================================ WAGON 2: ЕЙ, ДҮБӘРӘ!
  P.trainSwarmSpawn = function () {
    const T = this.train, S = T.sc[1], b = T.bag.position;
    S.n = 40; S.x = []; S.z = []; S.a = []; S.sp = [];
    for (let i = 0; i < S.n; i++) { S.x.push(b.x + rand(-0.3, 0.3)); S.z.push(b.z + rand(-0.25, 0.25)); S.a.push(rand(0, 6)); S.sp.push(rand(4.9, 5.6)); }
    T.swarm.visible = true;
    this.trainSwarm(0, false);
  };
  P.trainSwarm = function (dt, move) {
    const G = this.G, T = this.train, S = T.sc[1], P0 = G.player.pos, sw = T.swarm;
    const m4 = T._m4 || (T._m4 = new THREE.Matrix4()), q = T._q || (T._q = new THREE.Quaternion()), up = V(0, 1, 0), p = V(), one = V(1, 1, 1);
    let hit = false;
    for (let i = 0; i < S.n; i++) {
      if (move) {
        const dx = P0.x - S.x[i], dz = P0.z - S.z[i], d = Math.hypot(dx, dz) || 1;
        const a = Math.atan2(dx, dz) + Math.sin(G.time * 9 + i * 1.7) * 0.6;
        S.x[i] = Math.max(TX - 1.0, Math.min(TX + 1.0, S.x[i] + Math.sin(a) * S.sp[i] * dt));
        S.z[i] = Math.max(zFront(1) + 0.3, S.z[i] + Math.cos(a) * S.sp[i] * dt);
        S.a[i] = a;
        if (d < 0.5) hit = true;
      }
      p.set(S.x[i], MY + 0.01, S.z[i]); q.setFromAxisAngle(up, S.a[i]); m4.compose(p, q, one); sw.setMatrixAt(i, m4);
    }
    sw.instanceMatrix.needsUpdate = true;
    if (move && Math.random() < dt * 5) G.audio.chalk(null);
    return hit;
  };

  P.trainScene1 = function* () {
    const G = this.G, T = this.train, Pl = G.player, cam = G.camera, k = 1, S = T.sc[k], a = T.apa, r = T.roach;
    r.visible = true; r.position.set(TX + 0.95, MY + 0.01, L(k, 3.1)); r.rotation.set(0, 0, 0);
    S.roachRun = true; G.audio.chalk(null);
    S.tick = (dt) => {
      const P0 = Pl.pos;
      if (S.roachRun) {
        const dx = P0.x - r.position.x, dz = P0.z - r.position.z, d = Math.hypot(dx, dz);
        if (d < 1.25) S.roachRun = false;
        else { r.position.x += dx / d * 2.8 * dt; r.position.z += dz / d * 2.8 * dt; r.rotation.y = Math.atan2(dx, dz); }
      }
      if (S.raise) { a.armR.rotation.x = -2.6; a.armR.rotation.z = -0.3; }
      if (S.bagShake) T.bag.rotation.z = Math.sin(G.time * 40) * 0.09;
      if (S.sr) {
        S.srT += dt;
        const u = Math.min(1, S.srT / 0.4);
        S.sr.position.set(0.5 - 0.55 * u, -0.32 + 0.3 * u - (S.fallT || 0) ** 2 * 3, -0.5);
        S.sr.rotation.z = Math.sin(S.srT * 40) * 0.15 + 0.6;
        if (S.fallT !== undefined) { S.fallT += dt; if (S.fallT > 0.6) { cam.remove(S.sr); S.sr = null; } }
      }
      if (S.fly) {
        S.flyT += dt; const u = Math.min(1, S.flyT / 0.3);
        T.slipperFly.position.lerpVectors(S.flyFrom, cam.position.clone().add(this.playerFwd().clone().multiplyScalar(0.4)), u);
        T.slipperFly.rotation.x += dt * 28;
        if (u >= 1) S.fly = false;
      }
      if (S.danger && !T.caught) {
        if (S.grace > 0) S.grace -= dt;
        const hit = this.trainSwarm(dt, S.grace <= 0);
        if (Pl.pos.z < zFront(k) - 0.3) { S.danger = false; S.state = 'done'; this.trainClearAlert(); this.after(1.5, () => { T.swarm.visible = false; }); }
        else if (hit) this.trainCaught(k, 'crawler', 8, 'ТАРАҚАНДАР ЖЕҢДІ! (the cockroaches won)');
      }
    };
    S.respawn = () => { this.trainSwarmSpawn(); S.grace = 1.2; };
    yield () => !S.roachRun;
    // the apa sees it
    a.mode = 'stand'; S.raise = true; T.slipper.visible = true; this.trainFace(a);
    G.ui.big('ЕЙ, ДҮБӘРӘ!', 1.8, 'red'); G.ui.say('ЕЙ, ДҮБӘРӘ!', 'Апа', 1.8, '#f9c');
    if (!G.audio.speak('Ей, дүбәрә!', { lang: 'kk', pitch: 1.3, rate: 1.25 })) G.audio.speak('Hey, you pest!', { pitch: 1.4, rate: 1.3 });
    Pl.scare(0.4);
    yield 0.7;
    // it jumps on your face
    r.visible = false;
    S.sr = makeCockroach(); S.sr.position.set(0.5, -0.32, -0.5); S.sr.scale.setScalar(1.15); S.srT = 0; cam.add(S.sr);
    G.audio.sting(0.45); Pl.shake = 0.4; Pl.scare(0.6);
    this.collectMeme('dubara');
    yield 1.1;
    // ...so she throws her slipper at it
    S.raise = false; T.slipper.visible = false;
    S.flyFrom = T.slipper.getWorldPosition(V()); T.slipperFly.position.copy(S.flyFrom); T.slipperFly.visible = true; S.flyT = 0; S.fly = true;
    G.audio.whoosh(0.5);
    yield 0.32;
    T.slipperFly.visible = false;
    G.ui.crack(2); G.audio.thud(null, 1); G.audio.crunch(null, 0.35); Pl.shake = 1; Pl.damage(4, null, 'fear');
    G.ui.big('ТАПОЧКА!', 1.4, 'red');
    S.fallT = 0;
    this.collectMeme('slipper'); this.achieve('m_slipper');
    yield 1.4;
    this.trainKK('Ой, кешір, балам! Саған емес еді! (Oh, sorry, dear! That was not for you!)', 'Апа', '#f9c', 3, { pitch: 1.3 });
    yield 3.1;
    G.ui.say('...сөмкем... қозғалып жатыр... (...my bag... it is moving...)', 'Апа', 2.6, '#f9c');
    S.bagShake = true;
    yield 2.4;
    S.bagShake = false; T.bag.rotation.z = 0;
    this.trainSwarmSpawn();
    this.trainAlert(k, 'ТАРАҚАНДАР! АЛҒА ҚАШ!');
    G.ui.say('ТАРАҚАНДАР!!! (COCKROACHES!!!)', 'Апа', 2, '#f66');
    T.doors[k].locked = false; S.danger = true; S.grace = 0.5;
  };

  // ================================================================ WAGON 3: Зыпылдаған 25 (+ Райымбек батыр)
  P.trainScene2 = function* () {
    const G = this.G, T = this.train, Pl = G.player, k = 2, S = T.sc[k], z = T.zyp;
    this.task(function* () { yield* this.trainStop(5, 6); });
    yield () => G.time > T.paUntil && this.trainLocal() > 5.4;
    z.mode = 'stand'; S.walk = true;
    S.tick = (dt) => {
      if (S.walk) {
        const P0 = Pl.pos, d = Math.hypot(P0.x - z.root.position.x, P0.z - z.root.position.z);
        if (d > 1.05) this.trainWalk(z, P0.x, P0.z, 1.9, dt); else { z.mode = 'stare'; z.spd = 0; this.trainFace(z); }
      }
      if (S.back && this.trainWalk(z, TX - 0.6, L(k, 9.2), 1.6, dt)) { S.back = false; z.root.position.x = TX - 1.15; z.root.rotation.y = Math.PI / 2; z.mode = 'sit'; }
    };
    yield 3.0;
    const chunks = ['Сәлем-бауырым-қалайсың-жақсысың-ба-мен-жақсымын-', 'бүгін-жұмыстан-шықтым-бастық-ақымақ-айлық-жоқ-', 'несие-бар-ипотека-бар-үйленемін-той-болады-',
      'келесің-бе-келесің-ғой-бауырым-торт-болады-', 'метро-кешікті-автобус-кешікті-өмір-кешікті-', 'ал-сен-не-істейсің-мұнда-түнгі-үште-ЖАУАП-БЕР-'];
    if (!G.audio.speak(chunks.join(' ').replace(/-/g, ' '), { lang: 'kk', pitch: 1.3, rate: 3.5 })) G.audio.speak('blah blah blah blah blah blah blah blah blah answer me', { pitch: 1.3, rate: 3.5 });
    for (const ch of chunks) { G.ui.say(ch, 'Зыпылдаған 25', 0.55, '#ff8'); yield 0.55; }
    G.audio.setAmbient(0, 0.05);
    yield 1.2;
    S.walk = false;
    yield* this.lunge('pale', 8);
    G.audio.setAmbient(0.05, 1);
    this.collectMeme('zyp25');
    S.back = true; // ...and he goes back to his seat as if nothing happened
    T.doors[k].locked = false; S.state = 'done';
  };

  // ================================================================ WAGON 4: the controller and Otanbas (+ Жібек жолы)
  P.trainScene3 = function* () {
    const G = this.G, T = this.train, Pl = G.player, k = 3, S = T.sc[k], c = T.ctrl, o = T.otanbas;
    const line = (who, text, color, dur, pitch) => this.trainKK(text, who, color, dur, { pitch });
    S.tick = (dt) => {
      if (S.cWalk && this.trainWalk(c, S.cWalk[0], S.cWalk[1], S.cWalk[2], dt)) S.cWalk = null;
      if (S.oWalk && this.trainWalk(o, S.oWalk[0], S.oWalk[1], S.oWalk[2], dt)) S.oWalk = null;
      if (S.danger && !T.caught) {
        if (S.grace > 0) { S.grace -= dt; c.mode = 'stare'; this.trainFace(c); return; }
        const d = this.trainChase(c, 5.5, dt, k);
        if (Pl.pos.z < zFront(k) - 0.3) { S.danger = false; S.state = 'done'; this.trainClearAlert(); this.trainBang(k); c.mode = 'stare'; }
        else if (d < 0.95) this.trainCaught(k, 'caretaker', 10, 'ЖҮР, ТҮСЕМІЗ!');
      }
    };
    S.respawn = () => { c.root.position.set(TX + 0.3, MY, L(k, 3.0)); c.mode = 'stare'; S.grace = 1.3; };
    yield 0.8;
    // he walks to Otanbas, who sits at the back of the wagon
    S.cWalk = [TX + 0.42, L(k, 2.2), 2.2];
    yield () => !S.cWalk;
    c.mode = 'stand'; c.root.rotation.y = Math.PI / 2;
    yield 0.4;
    line('Контролер', 'Білетіңіз қайда?', '#9cf', 2.6, 0.85); yield 2.7;
    line('Отанбас', 'Менің атым Отанбас.', '#fc8', 2.6, 1.1); yield 2.7;
    line('Контролер', 'Білетіңіз бар ма?', '#9cf', 2.4, 0.85); yield 2.5;
    line('Отанбас', 'Жоқ.', '#fc8', 1.8, 1.1); yield 1.9;
    line('Контролер', 'Жүр, түсеміз.', '#9cf', 2.4, 0.85);
    this.collectMeme('otanbas');
    yield 2.2;
    // Жібек жолы: they get off together
    this.task(function* () { yield* this.trainStop(4, 4, () => S.released); });
    o.mode = 'stand';
    S.oWalk = [TX + 0.95, L(k, 3.2), 1.4]; S.cWalk = [TX + 0.4, L(k, 3.9), 1.4];
    yield () => T.phase === 'stopped' && T.sideOpen > 0.85 && !S.oWalk && !S.cWalk;
    S.oWalk = [TX + 2.9, L(k, 3.2), 1.6];
    yield () => !S.oWalk;
    T.plat.attach(o.root); o.root.rotation.y = -Math.PI / 2; o.mode = 'stare';
    // ...and then the controller turns around. To you.
    S.cWalk = [TX + 1.25, L(k, 3.2), 1.2];
    yield () => !S.cWalk;
    this.trainFace(c); c.mode = 'stare';
    yield 0.6;
    line('Контролер', '...Ал сіздің білетіңіз? (...and YOUR ticket?)', '#9cf', 2.8, 0.85); yield 3;
    if (T.hasTicket) {
      G.ui.phone('🎫 БІЛЕТ', 'METRO 404 · № 000404 · жарамды ✔ (valid)'); G.audio.beep(null, 1320, 0.1, 0.2, 'sine');
      yield 1.4;
      line('Контролер', 'Жарайды. Жолыңыз болсын. (Alright. Have a good trip.)', '#9cf', 2.8, 0.85);
      this.achieve('m_ticket'); if (this.addAura) this.addAura(300, 'honest passenger');
      yield 2;
      S.cWalk = [TX + 2.9, L(k, 3.2), 1.6];
      yield () => !S.cWalk;
      T.plat.attach(c.root); c.root.rotation.y = -Math.PI / 2; c.mode = 'stare';
      S.released = true; T.doors[k].locked = false; S.state = 'done';
    } else {
      line('Контролер', 'Жоқ па?.. Онда... (No?.. Then...)', '#9cf', 2, 0.85); yield 2.1;
      G.ui.say('ЖҮР. ТҮСЕМІЗ.', 'Контролер', 2.2, '#f44'); G.audio.speak('Жүр. Түсеміз.', { lang: 'kk', pitch: 0.3, rate: 0.7 });
      this.trainAlert(k, 'ЖҮР, ТҮСЕМІЗ! АЛҒА ҚАШ!'); this.achieve('m_noticket');
      T.doors[k].locked = false; S.danger = true; S.grace = 0.4; S.released = true;
    }
  };

  // ================================================================ WAGON 5: the wedding
  P.trainScene4 = function* () {
    const G = this.G, T = this.train, Pl = G.player, k = 4, S = T.sc[k];
    const ppl = [T.bride, T.groom, ...T.guests, T.asaba];
    S.music = G.audio.loop('music', V(TX, MY + 1.5, L(k, 8)));
    S.tick = () => {
      if (S.stare) [...ppl, T.cat].forEach((r) => this.trainFace(r));
      if (S.catClap && Math.sin(G.time * 9) > 0.97) G.audio.clap(0.25);
      if (S.allClap && Math.random() < G.dt * 14) G.audio.clap(0.45);
      if (S.music && Pl.pos.z < zFront(k) - 2) { S.music.stop(); S.music = null; }
    };
    this.trainKK('Той! Той! Құтты болсын! (A wedding! Congratulations!)', 'Қонақтар', '#fc8', 2.6, { pitch: 1.2 });
    yield () => this.trainLocal() > 6.4;
    // a hard brake: the cake flies
    this.trainJolt();
    if (S.music) { S.music.stop(); S.music = null; }
    T.cakeTiers.forEach((c, i) => {
      c.visible = false;
      const wp = c.getWorldPosition(V()), rr = c.geometry.parameters.radiusTop, hh = c.geometry.parameters.height;
      const p = G.props.spawn(cyl(rr, rr, hh, 12, c.material), wp, V(rand(-0.6, 0.6), 1.5, -1.8 - i * 0.3), { kind: 'cake', r: 0.2, thrown: false });
      this.after(25, () => G.props.remove(p));
    });
    yield 0.5; G.audio.crunch(T.cake.position, 0.8);
    ppl.forEach((r) => (r.mode = 'stare')); S.stare = true;
    G.audio.setAmbient(0, 0.1);
    yield 1.6;
    this.trainKK('...СЕН ИТЕРДІҢ БЕ?! (...did YOU push it?!)', 'Күйеу жігіт', '#fc8', 3, { pitch: 0.8 }); yield 3.1;
    this.trainKK('Үш ай бойы жинаған ақшамыз еді... (We saved for three months...)', 'Келін', '#fcc', 3, { pitch: 1.4 }); yield 3.2;
    this.collectMeme('cake');
    yield 1.2;
    // ...and then the cat starts clapping
    T.cat.mode = 'clap'; T.cat.root.position.x = TX + 0.7; S.catClap = true;
    yield 2.2;
    ppl.forEach((r) => (r.mode = 'clap')); S.allClap = true;
    G.ui.say('*the whole wedding claps. At you.*', '', 3);
    yield 4.2;
    S.allClap = false; S.catClap = false; ppl.forEach((r) => (r.mode = 'stare')); T.cat.mode = 'stare';
    G.ui.say('...браво.', 'Мысық', 2.2, '#ccc'); this.collectMeme('clap');
    yield 2.4;
    this.trainKK('Ал, қонақтар! Келесі тост — ОСЫ ЖІГІТКЕ! (Guests! The next toast — to THIS guy!)', 'Асаба', '#fd6', 3.4, { pitch: 0.9 });
    yield 2.6;
    S.stare = false; ppl.forEach((r) => (r.mode = 'dance')); G.audio.laugh(null, 0.4, 1.2);
    S.music = G.audio.loop('music', V(TX, MY + 1.5, L(k, 8)));
    this.collectMeme('asaba');
    G.audio.setAmbient(0.05, 1);
    T.doors[k].locked = false; S.state = 'done';
  };

  // ================================================================ WAGON 6: Kaspi, a phone on credit, GTA 6, the RTX seller (+ Абай)
  P.trainScene5 = function* () {
    const G = this.G, T = this.train, Pl = G.player, k = 5, S = T.sc[k], e = T.erlan, ph = T.phoneGuy, s = T.seller;
    const discPos = T.disc.getWorldPosition(V());
    S.tick = (dt) => {
      if (S.follow) {
        const d = Math.hypot(Pl.pos.x - ph.root.position.x, Pl.pos.z - ph.root.position.z);
        if (d > 1.5 && Pl.pos.z > zFront(k) + 0.8) this.trainWalk(ph, Pl.pos.x, Math.max(Pl.pos.z, zFront(k) + 0.8), 1.3, dt);
        else { ph.mode = 'stare'; ph.spd = 0; this.trainFace(ph); }
      }
      if (S.sWalk && this.trainWalk(s, S.sWalk[0], S.sWalk[1], S.sWalk[2], dt)) S.sWalk = null;
      if (!S.disc && Pl.pos.distanceTo(discPos) < 3.0 && this.lookingAt(discPos, 0.6)) {
        S.disc = true;
        T.disc.material[2].map = this.metro.discCracked; T.disc.material[2].needsUpdate = true;
        G.audio.crunch(discPos, 0.7);
        G.ui.say('...НЕЕЕЕТ! ОНЫ ОН ЖЫЛ КҮТТІМ! (...NOOO! I WAITED TEN YEARS FOR IT!)', '(from under the seat)', 3, '#f9c');
        this.collectMeme('gta6'); this.achieve('m_gta');
      }
    };
    G.audio.beep(null, 1320, 0.1, 0.2, 'sine'); G.ui.phone('Kaspi', 'Сізге 50 000 ₸ түсті 💸 (you received 50 000 ₸)');
    yield 3;
    G.audio.beep(null, 1320, 0.1, 0.2, 'sine'); G.ui.phone('Kaspi · Ерлан Б.', 'Бауырым, қате аударып жібердім 🙏 Қайтаршы өтінем (bro, wrong transfer, send it back please)');
    e.mode = 'sit'; this.trainFace(e);
    yield 3.4;
    G.audio.beep(null, 1320, 0.1, 0.2, 'sine'); G.ui.phone('Kaspi', 'Сіз 40 900 ₸ аудардыңыз → «Жылқы Т.» · Хабарлама: WHERE IS MY CART?');
    yield 3;
    this.trainKK('...бауырым, қайтарып жібер. Мен оның ағасымын. (...bro, send it back. I am his older brother.)', 'Ерлан', '#ccc', 3.4);
    this.collectMeme('kaspi');
    yield 2.4;
    // Абай: the brakes throw the phone out of his hands
    this.task(function* () { yield* this.trainStop(3, 6.5, () => S.sellerGone); });
    yield () => T.phase === 'stopped' || (T.phase === 'brake' && T.phaseT > 3.3);
    T.phoneProp.visible = false;
    const p = G.props.spawn(box(0.08, 0.015, 0.15, mat('#111')), ph.root.position.clone().setY(MY + 1.0), V(0, 1, -1.2),
      { kind: 'phone', r: 0.03, thrown: false, onLand: (pp) => { if (!pp.cr) { pp.cr = 1; G.audio.crunch(pp.pos, 0.6); } } });
    this.after(20, () => G.props.remove(p));
    yield 1.4;
    ph.mode = 'stand'; this.trainFace(ph);
    this.trainKK('...СЕН ИТЕРДІҢ! (...YOU pushed me!)', 'Жолаушы', '#ccc', 2.6); yield 2.7;
    this.trainKK('Жаңа телефон еді! НЕСИЕГЕ алғанмын! 24 айға! (A new phone! On CREDIT! For 24 months!)', 'Жолаушы', '#ccc', 3.6);
    this.collectMeme('phone'); S.follow = true;
    yield () => T.phase === 'stopped' && T.sideOpen > 0.85;
    // the RTX seller gets on
    s.act.show = true; s.root.position.set(TX + 2.9, MY, L(k, 8)); s.mode = 'stand'; S.sWalk = [TX + 0.3, L(k, 8.6), 1.6];
    yield () => !S.sWalk;
    this.trainFace(s); s.mode = 'stare';
    this.trainKK('Бауырым! RTX 4090 бес мыңға! Оригинал! (Bro! RTX 4090 for 5000! Original!)', 'Сатушы', '#fd6', 3.2); yield 3.3;
    this.trainKK('Kaspi-мен төлесең болады! Чек жоқ, бірақ сенім бар! (Kaspi is fine! No receipt, but there is trust!)', 'Сатушы', '#fd6', 3.4); yield 3.5;
    this.collectMeme('seller');
    S.sWalk = [TX + 2.9, L(k, 8), 1.6];
    yield () => !S.sWalk;
    T.plat.attach(s.root); S.sellerGone = true;
    yield () => T.phase === 'go' || T.phase === 'run';
    S.follow = false; ph.mode = 'stare';
    T.doors[k].locked = false; S.state = 'done';
  };

  // ================================================================ WAGON 7: «Қазіргі жастар...» and the aksakal
  P.trainScene6 = function* () {
    const G = this.G, T = this.train, Pl = G.player, k = 6, S = T.sc[k], ap = T.apa2, y = T.youth, ak = T.aksakal;
    S.tick = (dt) => {
      if (S.yWalk && this.trainWalk(y, S.yWalk[0], S.yWalk[1], S.yWalk[2], dt)) { S.yWalk = null; y.root.rotation.y = -Math.PI / 2; }
      if (S.hug) {
        const d = Math.hypot(Pl.pos.x - ak.root.position.x, Pl.pos.z - ak.root.position.z);
        if (d > 1.3) this.trainWalk(ak, Pl.pos.x, Pl.pos.z, 1.1, dt); else { ak.mode = 'stand'; ak.spd = 0; this.trainFace(ak); }
        ak.armL.rotation.set(-1.0, 0, 1.2); ak.armR.rotation.set(-1.0, 0, -1.2);
      }
      if (S.danger && !T.caught) {
        if (S.grace > 0) { S.grace -= dt; return; }
        const d = this.trainChase(ak, 5.6, dt, k);
        if (Pl.pos.z < zFront(k) - 0.3) { S.danger = false; S.state = 'done'; this.trainClearAlert(); this.trainBang(k); ak.mode = 'stare'; }
        else if (d < 0.95) this.trainCaught(k, 'pale', 10, 'БІЗДІКІ ЕКЕНСІҢ... (you are one of us...)');
      }
    };
    S.respawn = () => { ak.root.position.set(TX, MY, L(k, 3.0)); ak.mode = 'stare'; S.grace = 1.3; };
    this.trainKK('Қазіргі жастар... ұят жоқ. (Young people today... no shame.)', 'Апа', '#f9c', 3, { pitch: 1.2 });
    yield 2.8;
    y.mode = 'stand'; S.yWalk = [TX - 0.4, L(k, 4.6), 1.3];
    this.trainKK('...отырыңыз, апа. (...please, sit down, apa.)', 'Жігіт', '#ccc', 2.2);
    yield () => !S.yWalk;
    ap.root.position.set(TX - 1.15, MY, L(k, 2.2)); ap.root.rotation.y = Math.PI / 2; ap.mode = 'sit';
    this.collectMeme('jastar');
    // the aksakal: you have just walked past him
    yield () => this.trainLocal() > 5.4;
    ak.mode = 'stand'; ak.root.position.x = TX + 0.75; this.trainFace(ak);
    this.trainKK('Тоқта, балам. (Stop, son.)', 'Ақсақал', '#dcb', 2.2, { pitch: 0.7 }); yield 2.3;
    this.trainKK('Кімнің баласысың? (Whose son are you?)', 'Ақсақал', '#dcb', 2.4, { pitch: 0.7 }); yield 2.6;
    this.trainKK('Қай рудансың? (Which clan are you from?)', 'Ақсақал', '#dcb', 2.4, { pitch: 0.7 }); yield 2.6;
    G.ui.say('(you do not know what to say)', '', 2); yield 2.2;
    this.trainKK('Ә... БІЗДІКІ ЕКЕНСІҢ! (Ah... you are one of OURS!)', 'Ақсақал', '#dcb', 2.6, { pitch: 0.8 });
    S.hug = true; this.collectMeme('ru');
    yield 2.8;
    T.flick = 1.4; G.audio.infrasound(4, 0.5);
    G.ui.say('Біздің ру... МЕТРОДАН ЕШҚАШАН ШЫҚПАЙДЫ. (Our clan... NEVER leaves the metro.)', 'Ақсақал', 3.2, '#f44');
    G.audio.speak('Біздің ру... метродан ешқашан шықпайды.', { lang: 'kk', pitch: 0.2, rate: 0.75 });
    yield 1.6;
    S.hug = false;
    this.trainAlert(k, 'ҚАШ!'); T.doors[k].locked = false; S.danger = true; S.grace = 0.3;
  };

  // ================================================================ WAGON 8: Remember November (+ Туннель 404)
  P.trainScene7 = function* () {
    const G = this.G, T = this.train, Pl = G.player, k = 7, S = T.sc[k], b = T.bear;
    G.audio.beep(null, 660, 0.3, 0.2, 'triangle');
    G.ui.say('Келесі бекет — Т̷у̷ннель 4̷0̷4̷.', '📢 Пойыз', 3, '#f88'); G.audio.speak('Next station: tunnel. four. zero. four.', { pitch: 0.5, rate: 0.8 }); G.audio.infrasound(4, 0.5);
    T.paUntil = G.time + 3;
    yield 2.4;
    this.task(function* () { yield* this.trainStop(2, 2, () => S.bearDone, true); });
    yield () => T.phase === 'stopped';
    T.dark = true; G.audio.beep(null, 55, 0.6, 0.3, 'sawtooth'); Pl.scare(0.3);
    G.ui.say('...remember... november...', '(a whisper)', 3, '#9cf');
    for (const d of [6.5, 4.2, 2.2]) {
      yield 1.2;
      b.act.show = true; b.root.position.set(TX, MY, Math.max(zFront(k) + 0.6, Pl.pos.z - d)); b.mode = 'stare'; this.trainFace(b);
      T.flash = 1.3; Pl.scare(0.25); G.audio.beep(null, 110, 0.15, 0.15, 'square');
      yield 1.3;
      b.act.show = false;
    }
    yield 0.6;
    yield* this.lunge('pale', 10);
    T.dark = false; this.collectMeme('bear'); S.bearDone = true;
    yield () => T.phase === 'go' || T.phase === 'run';
    T.doors[k].locked = false; S.state = 'done';
  };

  // ================================================================ WAGON 9: the rap battle (+ Шексіз бекет ∞)
  P.trainScene8 = function* () {
    const G = this.G, T = this.train, Pl = G.player, k = 8, S = T.sc[k], leo = T.leo, kc = T.karate;
    const lines = ['Йо! Мен — барыс, Алатаудан түстім!', 'Пойызда жүрсің бе? Білетің қайда, інім?', 'Ақшаң жоқ па? Kaspi-ге аудар, бауырым!', 'Бұл — пойыз, бұл — менің ауданым!'];
    S.beat = G.audio.loop('hiphop', V(TX, MY + 1, L(k, 1.8)));
    S.walks = [];
    S.tick = (dt) => {
      if (S.beat) S.beat.setPos(leo.root.getWorldPosition(V()).setY(MY + 1));
      S.walks.forEach((w, i) => { if (w && this.trainWalk(T.crew[i], w[0], w[1], w[2], dt)) S.walks[i] = null; });
      if (S.face) [leo, ...T.crew].forEach((r) => this.trainFace(r));
      if (S.kc) {
        S.kc.t += dt;
        const u = Math.min(1, S.kc.t / 0.42), to = G.camera.position.clone().add(this.playerFwd().clone().multiplyScalar(0.6)).setY(MY);
        kc.root.position.lerpVectors(S.kc.from, to, u); kc.root.position.y = MY + Math.sin(u * Math.PI) * 0.8;
        this.trainFace(kc); kc.legL.rotation.x = -1.6; kc.legR.rotation.x = 0.4; kc.armL.rotation.x = -1.2;
        if (u >= 1) {
          S.kc = null; kc.act.show = false;
          G.ui.crack(3); G.audio.thud(null, 1); G.audio.crunch(null, 0.7); G.audio.sting(0.5);
          Pl.shake = 1; Pl.scare(0.7); Pl.damage(6, null, 'fear');
          this.collectMeme('karate'); this.achieve('m_karate');
        }
      }
      if (S.danger && !T.caught) {
        if (S.grace > 0) { S.grace -= dt; return; }
        let near = this.trainChase(leo, 6.4, dt, k);
        T.crew.forEach((r, i) => { near = Math.min(near, this.trainChase(r, 5.8 + i * 0.15, dt, k)); });
        if (Pl.pos.z < zFront(k) - 0.3) { S.danger = false; S.state = 'done'; this.trainClearAlert(); this.trainBang(k); [leo, ...T.crew].forEach((r) => (r.mode = 'stare')); }
        else if (near < 0.95) this.trainCaught(k, 'leopard', 12, 'ҰСТАДЫҚ! ЕНДІ РЭП ТЫҢДА! (got you! now listen to the rap!)');
      }
    };
    S.respawn = () => {
      leo.root.position.set(TX, MY, L(k, 1.2)); leo.mode = 'stare';
      T.crew.forEach((r, i) => { r.root.position.set(TX - 0.6 + i * 0.4, MY, L(k, 1.6 + (i % 2) * 0.6)); r.mode = 'stare'; });
      S.grace = 1.3;
    };
    this.trainKK(lines[0], 'Барыс MC', '#fd6', 2.6, { rate: 1.2 }); yield 2.8;
    this.task(function* () { yield* this.trainStop(1, 5, () => S.crewIn); });
    this.trainKK(lines[1], 'Барыс MC', '#fd6', 2.6, { rate: 1.2 });
    yield () => T.phase === 'stopped' && T.sideOpen > 0.85;
    // a Karate Cat flies in through the open doors
    kc.act.show = true; kc.root.position.set(TX + 2.8, MY, L(k, 8)); S.kc = { t: 0, from: kc.root.position.clone() };
    G.ui.big('ХИИИИЯ!', 1.4, 'red'); G.audio.speak('Hiiiya!', { pitch: 1.6, rate: 1.4 });
    yield () => !S.kc;
    yield 1.0;
    // the 67 crew gets on through the back door
    T.crew.forEach((r, i) => { r.act.show = true; r.mode = 'stand'; r.root.position.set(TX + 2.8 + i * 0.3, MY, L(k, 3.0 + (i % 2) * 0.5)); });
    S.walks = T.crew.map((r, i) => [TX - 0.6 + i * 0.4, L(k, 2.0 + (i % 2) * 0.7), 1.7]);
    yield () => S.walks.every((w) => !w);
    S.crewIn = true;
    for (let i = 2; i < 4; i++) {
      this.trainKK(lines[i], 'Барыс MC', '#fd6', 2.4, { rate: 1.2 }); leo.mode = 'rap'; T.crew.forEach((r) => (r.mode = 'stand')); yield 2.6;
      G.ui.say('six... SEVEN! 6️⃣7️⃣', '67 Crew', 1.8, '#9f6'); T.crew.forEach((r) => (r.mode = 'sixseven')); G.audio.speak('six seven', { pitch: 1.1 }); yield 2.0;
    }
    this.collectMeme('bars'); this.collectMeme('crew67');
    yield () => T.phase === 'go' || T.phase === 'run';
    leo.mode = 'stare'; T.crew.forEach((r) => (r.mode = 'stare')); S.face = true;
    this.trainKK('Ей... сен кімсің? Қай ауданнансың? (Hey... who are you? Which district are you from?)', 'Барыс MC', '#fd6', 2.8, { pitch: 0.8 }); yield 2.6;
    if (S.beat) { S.beat.stop(); S.beat = null; }
    G.ui.say('ҰСТА ОНЫ!!! (GET HIM!!!)', 'Барыс MC', 2, '#f44');
    S.face = false;
    this.trainAlert(k, 'ҚАШ!'); T.doors[k].locked = false; S.danger = true; S.grace = 0.3;
  };

  // ================================================================ WAGON 10: the head wagon and the driver's cab
  P.trainScene9 = function* () {
    const G = this.G, T = this.train, Pl = G.player, k = 9, S = T.sc[k], dk = T.dark9;
    const face = faceTextures('pale')[0];
    for (const ad of T.ads9) { yield 0.28; ad.material.map = face; G.audio.click(); }
    this.collectMeme('posters'); Pl.scare(0.3);
    G.ui.say('(the adverts... are looking at you)', '', 2.4);
    yield () => this.trainLocal() > 6;
    G.ui.say('Келесі бекет... ...', '📢 Пойыз', 2, '#9cf'); yield 2.1;
    G.ui.say('...ЖЕР БЕТІ. ЖЕР БЕТІ. ЖЕР. БЕТІ.', '📢 Пойыз', 2.6, '#f88'); G.audio.speak('Surface. Surface. Surface.', { pitch: 0.15, rate: 0.5 });
    yield 2;
    // the darkness eats the wagon from the back
    dk.visible = true; dk.position.set(TX, MY, L(k, 0.4));
    S.tick = (dt) => {
      if (!S.danger || T.caught) return;
      if (S.grace > 0) { S.grace -= dt; return; }
      dk.position.z -= 3.5 * dt;
      T.darkEyes.forEach((e) => (e.visible = Math.random() > 0.1));
      if (Math.random() < dt * 2) G.audio.reverseWhisper(dk.position.clone().setY(MY + 1.6), 0.3);
      if (Pl.pos.z < zFront(k) - 0.3) { S.danger = false; S.state = 'done'; this.trainClearAlert(); this.trainBang(k); }
      else if (dk.position.z < Pl.pos.z + 0.8) this.trainCaught(k, 'crawler', 10, 'ҚАРАҢҒЫЛЫҚ ЖЕТІП АЛДЫ. (the dark caught you)');
    };
    S.respawn = () => { dk.position.set(TX, MY, L(k, 0.4)); S.grace = 1.2; };
    this.trainAlert(k, 'ҚАРАҢҒЫЛЫҚ! АЛҒА ҚАШ!');
    T.doors[k].locked = false; S.danger = true; S.grace = 0;
    this.after(0.6, () => {
      G.ui.say('ОЙЛАШЫ!!!', '(from the dark)', 2, '#f44');
      if (!G.audio.speak('Ойлашы!', { lang: 'kk', pitch: 0.4 })) G.audio.bigScream(0.4);
      this.collectMeme('oylashy');
    });
  };

  P.trainCabTask = function* () {
    const G = this.G, T = this.train, Pl = G.player, dr = T.driver;
    T.inCab = true;
    yield () => Pl.pos.z < CAB0 - 1.1;
    // the driver turns around
    let t = 0;
    while (t < 0.45) { t += G.dt; dr.rotation.y = Math.PI * (1 - Math.min(1, t / 0.45)); yield 0; }
    G.ui.say('СЕН КЕШІКТІҢ. (YOU ARE LATE.)', 'Жүргізуші', 2.2, '#ffd040'); G.audio.speak('You are late.', { pitch: 0.1, rate: 0.7 });
    yield 0.4;
    yield* this.lunge('caretaker', 6);
    dr.visible = false; // ...and the seat is empty. There was never a driver.
    this.collectMeme('manager');
    yield 1.4;
    // ahead in the tunnel: the last wagon of a train. YOUR train.
    T.tail.visible = true; T.tail.position.z = CAB1 - 48; T.tailTo = CAB1 - 13;
    G.ui.say('(ahead in the tunnel: the last wagon of a train... and in its back window, the horse waves at you.)', '', 4.4);
    this.collectMeme('tail'); Pl.scare(0.5); G.audio.infrasound(5, 0.5);
    yield 4.6;
    this.trainPA('Жер беті. Соңғы бекет. Пойыз әрі қарай жүрмейді. (The Surface. Last stop. This train terminates here.)', 'The Surface. Last stop. This train terminates here.');
    T.stopsDone[0] = true;
    yield 3.4;
    this.achieve('m_train');
    yield* this.trainExitTask();
  };

  /** Out of the train: the exit hall of the old corridor, then the escalator (chapter 19). */
  P.trainExitTask = function* () {
    const G = this.G, T = this.train, M = this.metro, Pl = G.player;
    G.ui.fade(1, 0.5); yield 0.6;
    if (M.trainSnd) { M.trainSnd.stop(); M.trainSnd = null; }
    T.on = false; T.group.visible = false; M.trainDone = true;
    M.root.visible = true; M.active = true; M.level = 0; M.freshStart = true; M.busy = false;
    M.buzz = G.audio.loop('buzz', null);
    this.metroNewLoop();
    Pl.pos.set(0, MY, 3); Pl.vel.set(0, 0, 0); Pl.yaw = 0; Pl.pitch = 0;
    yield 0.3; G.ui.fade(0, 1);
    G.ui.big('ЖЕР БЕТІ ↑', 2.4, 'green');
    G.ui.toast('The exit hall. Walk forward to the escalator ↑');
  };

  // ================================================================ hooks into the metro chapters
  const origMetro = P.updateMetro;
  P.updateMetro = function (dt) {
    const T = this.train;
    if (this.G.map === 'metro' && T && T.on) { if (this.metro.intro) this.updateIntro(dt); else this.updateTrain(dt); return; }
    origMetro.call(this, dt);
  };

  const origTrans = P.metroTransition;
  P.metroTransition = function* (direction) {
    const G = this.G, M = this.metro;
    if (G.map === 'metro' && M.trainDone && direction === 'back') { // the exit hall has no way back into the train
      G.player.pos.x = -3.4; G.player.vel.set(0, 0, 0);
      if (G.time - (M.noBackT || -9) > 4) { M.noBackT = G.time; G.ui.toast('Артқа жол жоқ. (There is no way back.)'); }
      return;
    }
    yield* origTrans.call(this, direction);
  };

  P.prepareMetroBackdrop = function () {
    const G = this.G, M = this.metro, T = this.train, L0 = G.lighting, h = M.wagonHorse;
    L0.moon.visible = false; L0.hemi.intensity = 0.5; L0.fog.color.set('#07080a'); L0.fog.density = 0.026;
    M.root.visible = false; M.wagon.visible = false; M.hud.classList.add('hidden');
    T.group.visible = true;
    for (let k = 0; k < 4; k++) { const d = T.doors[k]; d.open = 1; d.leaf.position.x = TX + 1.05; }
    T.wagons.forEach((w, k) => (w.group.visible = k < 5));
    for (const a of T.actors) { a.root.visible = a.show && a.k < 5; if (a.root.visible) for (let i = 0; i < 3; i++) pose(a.rig, a.rig.mode || 'stand', 1, 0, 0); }
    M.paper.visible = false;
    h.root.visible = true; h.root.rotation.set(0, 0, 0);
    for (let i = 0; i < 3; i++) pose(h, 'stare', 1, 0, 0);
  };

  /** Behind the METRO 404 title card: a slow walk down the long train; the horse is always 16 m ahead. */
  P.metroBackdrop = function (t) {
    const G = this.G, M = this.metro, T = this.train, cam = G.camera, h = M.wagonHorse;
    const z = L(0, 1.5) - ((t * 0.6) % 34);
    cam.position.set(TX + Math.sin(t * 0.4) * 0.12, MY + 1.6 + Math.sin(t * 1.3) * 0.02, z);
    cam.rotation.set(-0.02, Math.sin(t * 0.17) * 0.1, 0);
    M.light.position.set(cam.position.x, MY + 2.25, z); M.light.intensity = 6; M.light.color.setHex(0xf0f4ff);
    M.wagonLight.position.set(TX, MY + 2.2, z - 9); M.wagonLight.intensity = 4; M.wagonLight.color.setHex(0xf0f4ff);
    for (const b of T.tlights) { b.position.z += VMAX * 0.016; if (b.position.z > z + 30) b.position.z -= 104; else if (b.position.z < z - 74) b.position.z += 104; }
    h.root.position.set(TX + 0.2, MY, z - 16);
  };

  // the death screen and the end screen know about the train
  const origDeath = P.metroDeathReport;
  P.metroDeathReport = function () {
    const r = origDeath.call(this), T = this.train, M = this.metro;
    if (T && !M.trainDone) r.stats = `Reached wagon ${T.k + 1}/10 · ${WNAME[T.k]} · Time ${fmt(this.G.time - (this.metroMapStart || 0))} · Caught ${M.mistakes}× · Memes this run ${M.runMemes.size}`;
    return r;
  };
  const origWin = P.metroMapWin;
  P.metroMapWin = function () {
    origWin.call(this);
    const T = this.train, M = this.metro;
    $('end-stats').textContent = `Time ${fmt(this.G.time - (this.metroMapStart || 0))} · Caught ${M.mistakes}× · Wagons 10/10 · 🎫 ${T.hasTicket ? 'with a ticket' : 'no ticket'} · Memes this run ${M.runMemes.size}`;
  };

  // the escalator parade also knows the people from the train
  const origFig = P.makeParadeFigure;
  P.makeParadeFigure = function (id) {
    const alias = { horse: 'x_horse', crew67: 'x_crew67', buddy: 'x_buddy' };
    if (alias[id]) return { ...origFig.call(this, alias[id]), id };
    const make = { otanbas: makeController, ru: makeAksakal, dubara: () => makeApa('#7a2050', '#d84a8a'), slipper: () => makeApa('#7a2050', '#d84a8a'), jastar: () => makeApa('#3a5a8a', '#e0c040') }[id];
    if (!make) return origFig.call(this, id);
    const rig = make();
    this.metro.esc.group.add(rig.root);
    return { id, rig, root: rig.root, mode: 'wave', lift: 0 };
  };
}
