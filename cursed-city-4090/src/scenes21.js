// Chapter 21: METRO 404, the meme train.
// Kazakh TikTok memes come alive in the long train. Each meme does what happens in its original video; only the
// place moves into the metro. Every main meme has its own wagon and its own "stage" in the middle of the wagon:
// you walk in, you see it from 6 m away, the people face you, the aisle stays free. A scene starts when you come
// close, plays once, and afterwards the people just sit there like normal passengers. Every door opens both ways.
// (The horror between the memes, the faceless night conductor, is chapter 22.)
//
//   1  the last wagon (intro)            7  Таста, газель айдайсың · Ауыр-ауыр    13 Туннель 404 (chapter 22)
//   2  Ей, дүбәрә! · Шлабра              8  Жумайсынба                            14 Чай поставьте
//   3  Зыпылдаған 25 (Райымбек батыр)    9  Ойлашы · Әкет, әкет · Әшейін сән ғой   15 Галасубуй · Баха, звандама маған · Көк пакет Айген
//   4  Отанбас (Жібек жолы)              10 Дебит тищ теңге                       16 Мощный и сочный лагман
//   5  Той · Қайттық Шауілдірге · Чиви қайда?   11 AI-әже                         17 Ибұңқұ-ибұңқұ (Шексіз бекет ∞)
//   6  Kaspi · Цунбятрм · Түрі такси ұстап кетті · Қол қойдым (Абай: Пескаблок)   18 570 теңге бердім · Барыс MC
//   12 Геодезическая 12 · Қораға кірдік
//   then: the driver's cab, the exit hall, the escalator... and Акополексус at the station's outer entrance.
import * as THREE from 'three';
import { makeHumanoid, pose, randomLook } from './characters.js';
import { ACH } from './scenes2.js';
import { MEMES, txt } from './scenes19.js';
import { TRAIN, makeApa } from './scenes20.js';
import { mat, basic, box, cyl, rand } from './util.js';

const { MY, TX, WL, WP, NW, CAB0, CAB1 } = TRAIN;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const zFront = (k) => -k * WP - WL;
const L = (k, l) => -k * WP - l; // world z of a point l metres into wagon k
const EX = -40, ESC_TOP = -30, ESC_RISE = 12, ESC_END = -40.6; // the escalator hall (chapter 19)
export const WNAME = ['Соңғы вагон', 'Ей, дүбәрә! · Шлабра', 'Зыпылдаған 25', 'Отанбас', 'Той', 'Kaspi', 'Таста, газель айдайсың', 'Жумайсынба',
  'Ойлашы', 'Дебит тищ теңге', 'AI-әже', 'Геодезическая 12', 'Туннель 404', 'Чай поставьте', 'Баха, звандама маған', 'Мощный и сочный лагман',
  'Ибұңқұ-ибұңқұ', '570 теңге · Барыс MC'];
const STOP_AT = { 2: 5, 5: 3, 16: 1 }; // wagon → station (Жібек жолы comes with Otanbas, Туннель 404 with chapter 22)
const STATIONS = { 5: 'Райымбек батыр', 4: 'Жібек жолы', 3: 'Абай', 2: 'Туннель 404', 1: 'Шексіз бекет ∞', 0: 'Жер беті' };
const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const $ = (id) => document.getElementById(id);

MEMES.splice(0, MEMES.length, ...[
  ['horse', '🐴', 'Horse commuter', 'Ат-жолаушы'], ['dubara', '🪳', 'Ей, дүбәрә!', 'Тарақан'], ['shlabra', '🧹', 'Шлабра', 'Тазалаушы'],
  ['zyp25', '⏩', 'Зыпылдаған 25', 'Зыпылдақ'], ['buddy', '🧢', 'Buddy on the bench', 'Бадди'], ['otanbas', '🎫', 'Менің атым Отанбас', 'Контролер'],
  ['dad', '🦘', 'The Dad???', 'Кенгуру'], ['cake', '🎂', 'Wedding cake', 'Той торты'], ['shauildir', '😳', 'Қайттық Шауілдірге', 'Ұят-ай'],
  ['clap', '🐈', 'Clapping cat', 'Шапалақ мысық'], ['asaba', '🎤', 'Next toast', 'Асаба'], ['chivi', '🫖', 'Чиви қайда?', 'Шайпұл'],
  ['kaspi', '💸', 'Wrong Kaspi transfer', 'Қате аударым'], ['tsunbyatrm', '💬', 'Цунбятрм', 'Түсінбедім'], ['phone', '📱', 'Phone on credit', 'Несие'],
  ['taksi', '🚕', 'Түрі такси ұстап кетті', 'Ыңғайсыз'], ['qolqoidym', '🤷', 'Қол қойдым', 'Қол сілтеу'],
  ['peskablok', '🧱', 'Пескаблок лақтыру', 'Пескаблок'], ['gazel', '🚐', 'Таста, газель айдайсың', 'Әке'], ['auyr', '😩', 'Ауыр-ауыр', 'Қиын'],
  ['jumaisynba', '🫗', 'Жумайсынба', 'Шәйнек'], ['oylashy', '🧥', 'Ойлашы', 'Киім сатушы'], ['aket', '👂', 'Әкет, әкет', 'Қызық'],
  ['asheiin', '😎', 'Әшейін сән ғой', 'Оңай'], ['debit', '📺', 'Дебит тищ теңге', '9000 ₸'], ['aiaje', '👵', 'AI-әже', 'Әжелер рэпі'],
  ['geodez', '📞', 'Геодезическая 12', 'Полиция'], ['saspa', '🤝', 'Саспа, бауырым', 'Саспа'], ['qoragha', '🐑', 'Қораға кірдік', 'Болмады'],
  ['chai', '🍵', 'Чай поставьте', 'Әке'], ['galasubui', '🎙️', 'Галасубуй', 'Голосовой'], ['baha', '☎️', 'Баха, звандама маған', 'Баха'],
  ['aigen', '🛍️', 'Көк пакет Айген', 'Көк пакет'], ['lagman', '🍜', 'Мощный и сочный лагман', 'Лағман'], ['ibunqu', '🎵', 'Ибұңқұ-ибұңқұ', 'Ән'],
  ['t570', '🎙️', '570 теңге бердім', 'Сұхбат'], ['bars', '🐆', 'Барыс MC', 'Рэпер барыс'], ['crew67', '6️⃣7️⃣', '67 Crew', 'Алпыс жеті'],
  ['tail', '♾️', 'Your own train, ahead', 'Өз пойызың'], ['akopoleksus', '🌨️', 'Акополексус', 'Буран'],
].map(([id, e, n, kz]) => ({ id, e, n, kz })));

Object.assign(ACH, { m_memetrain: ['Meme Train', 'See every meme in the long train'] });

// ---------------------------------------------------------------- props and looks
function labelTex(text, bg, fg, w = 256, h = 64, size = 40) {
  return txt(w, h, (ctx) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let s = size; do { ctx.font = `bold ${s}px Arial`; s -= 2; } while (ctx.measureText(text).width > w - 12 && s > 10);
    ctx.fillText(text, w / 2, h / 2 + 2);
  });
}
function makeKettle() {
  const g = new THREE.Group(), m = mat('#c8ccd0');
  g.add(cyl(0.09, 0.11, 0.16, 10, m, 0, 0, 0), box(0.04, 0.03, 0.12, m, 0, 0.03, 0.12, false), box(0.03, 0.12, 0.03, mat('#222'), 0, 0.12, -0.02, false));
  return g;
}
function makePoints(n, color, size) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.85, depthWrite: false }));
  p.frustumCulled = false; p.visible = false;
  return p;
}
const phoneProp = () => box(0.08, 0.15, 0.015, mat('#111', { emissive: '#223' }), 0, -0.75, 0.08);
function addMouth(r) { r.mouth = box(0.085, 0.016, 0.012, basic('#2a0808'), 0, 0.088, 0.174, false); r.head.add(r.mouth); return r; }
function addMustache(r, c = '#1a1410') { r.head.add(box(0.13, 0.026, 0.02, mat(c), 0, 0.118, 0.175, false)); return r; }
function addChefHat(r) { r.head.add(cyl(0.17, 0.15, 0.08, 10, mat('#ffffff'), 0, 0.38, 0), cyl(0.2, 0.17, 0.2, 10, mat('#ffffff'), 0, 0.52, 0)); return r; }
function addVeil(r) {
  const v = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.9), new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
  v.position.set(0, 0.0, -0.2); r.head.add(v, box(0.3, 0.05, 0.3, mat('#f4f0e0'), 0, 0.37, 0, false)); return r;
}
function addFlatCap(r, c) { r.head.add(box(0.36, 0.08, 0.36, mat(c), 0, 0.36, -0.01, false), box(0.3, 0.025, 0.14, mat(c), 0, 0.33, 0.2, false)); return r; }
function addStripes(r, c = '#ffffff') { for (const a of [r.armL, r.armR]) for (const s of [-1, 1]) a.add(box(0.014, 0.62, 0.014, mat(c), s * 0.066, -0.42, 0, false)); return r; }
function addChain(r) { const m = mat('#e8c040', { emissive: '#3a2a00' }); r.spine.add(box(0.22, 0.025, 0.02, m, 0, 0.34, 0.15, false), box(0.06, 0.06, 0.02, m, 0, 0.27, 0.16, false)); return r; }
function addShades(r) { r.head.add(box(0.3, 0.06, 0.03, basic('#050505'), 0, 0.22, 0.18, false)); return r; }
function addSlickHair(r) { r.head.add(box(0.34, 0.06, 0.36, mat('#0a0a0a', { emissive: '#101010' }), 0, 0.35, -0.01, false)); return r; }
function gradeBookTex() { // a university grade book, open: "3 2 2"
  return txt(128, 96, (ctx) => {
    ctx.fillStyle = '#f4f0e4'; ctx.fillRect(0, 0, 128, 96); ctx.fillStyle = '#1a3a8a'; ctx.fillRect(62, 0, 4, 96);
    ctx.fillStyle = '#222'; ctx.font = 'bold 11px Arial'; ctx.fillText('СЫНАҚ КІТАПШАСЫ', 4, 14);
    ctx.font = '10px monospace'; ['Матем.   3', 'Физика   2', 'Тарих    2', 'Ағылшын  3'].forEach((t, i) => ctx.fillText(t, 70, 26 + i * 16));
    ctx.fillStyle = '#c01010'; ctx.font = 'bold 26px Arial'; ctx.fillText('2', 20, 70);
  });
}

export function extendDirector21(D) {
  const P = D.prototype;

  // ================================================================ BUILD: the people of the meme train
  const origActors = P.buildTrainActors;
  P.buildTrainActors = function () {
    origActors.call(this);
    const G = this.G, T = this.train, g = T.group, W = G.world;
    const A = (rig, k) => { g.add(rig.root); rig.act = { rig, root: rig.root, k, show: true }; T.actors.push(rig.act); return addMouth(rig); };
    const H = (o, k) => A(makeHumanoid(o), k);
    const C = T.cast = {};
    [T.apa, T.zyp, T.otanbas, T.ctrl, T.bride, T.groom, ...T.guests, T.asaba, T.erlan, T.phoneGuy, ...T.bg2, ...T.crew].forEach(addMouth);
    addVeil(T.bride); T.groom.spine.add(box(0.05, 0.05, 0.02, mat('#e04060'), 0.1, 0.32, 0.16, false));
    addMustache(T.asaba); addFlatCap(T.otanbas, '#2a2a2a');
    // the apa's plaid bag goes next to her new seat
    const bz = L(1, 2.5), nz = L(1, 5.7);
    const bc = W.colliders.find((c) => Math.abs(c.minX - (TX + 0.27)) < 0.01 && Math.abs((c.minZ + c.maxZ) / 2 - bz) < 0.05);
    if (bc) { bc.minZ += nz - bz; bc.maxZ += nz - bz; }
    T.bag.position.z = nz;
    // 2: Шлабра — the cleaner, her mop, her bucket
    C.cleaner = H({ skin: '#d0a880', shirt: '#2a6a8a', pants: '#2a3a4a', outfit: 'plain', hair: 'bun', hairColor: '#3a2a1a', fat: 1.15 }, 1);
    C.cleaner.spine.add(box(0.4, 0.5, 0.03, mat('#e8e8e0'), 0, 0.12, 0.14, false));
    C.mop = new THREE.Group();
    C.mop.add(cyl(0.018, 0.018, 1.35, 6, mat('#a07a40'), 0, 0.68, 0), box(0.42, 0.07, 0.12, mat('#d8d8d0'), 0, 0.03, 0, false));
    const ml = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.09), new THREE.MeshBasicMaterial({ map: labelTex('ШЛАБРА', '#ffe040', '#111'), side: THREE.DoubleSide }));
    ml.position.set(0, 0.6, 0.025); C.mop.add(ml); g.add(C.mop);
    T.wagons[1].group.add(cyl(0.16, 0.13, 0.3, 10, mat('#2a6ad8'), TX - 0.8, MY + 0.15, L(1, 14.4)));
    // 5: the wedding waiter
    C.waiter = H({ shirt: '#f2f2f2', pants: '#111', outfit: 'shirt', hair: 'short', skin: '#c8966e' }, 4);
    C.waiter.spine.add(box(0.36, 0.42, 0.04, mat('#151515'), 0, 0.22, 0.13, false), box(0.12, 0.04, 0.02, mat('#111'), 0, 0.4, 0.16, false));
    C.tray = new THREE.Group(); C.tray.add(cyl(0.16, 0.16, 0.02, 10, mat('#b0b0b0'), 0, 0, 0), cyl(0.06, 0.07, 0.12, 8, mat('#e8e0d0'), 0, 0.07, 0));
    C.tray.position.set(0, -0.82, 0.12); C.waiter.armR.add(C.tray);
    // 6: Түрі такси ұстап кетті
    C.taksi = H({ ...randomLook(), outfit: 'jacket' }, 5);
    // 7: Таста, газель айдайсың — a father (moustache, glasses, the grade book) and his grown-up son, a student
    C.father = addMustache(H({ skin: '#c89a78', shirt: '#4a4a5a', pants: '#2a2a30', outfit: 'jacket', hair: 'short', hairColor: '#666', glasses: true, fat: 1.2 }, 6), '#555');
    C.book = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.012), [mat('#1a3a8a'), mat('#1a3a8a'), mat('#1a3a8a'), mat('#1a3a8a'), new THREE.MeshBasicMaterial({ map: gradeBookTex() }), mat('#1a3a8a')]);
    C.book.position.set(0, -0.8, 0.12); C.father.armR.add(C.book);
    C.son = H({ outfit: 'hoodie', shirt: '#5a8a5a', hair: 'buzz', skin: '#d2a37a' }, 6);
    C.son.spine.add(box(0.34, 0.4, 0.16, mat('#2a2a3a'), 0, 0.2, -0.2, false));
    C.friend = H({ ...randomLook(), outfit: 'shirt' }, 6);
    // 8: Жумайсынба — a black leather jacket, slicked hair, a kettle, a shampoo bottle
    C.juma = addSlickHair(H({ outfit: 'jacket', shirt: '#0e0e10', pants: '#1a1a22', hair: 'none', skin: '#d0a07a' }, 7));
    C.juma.spine.add(box(0.44, 0.02, 0.3, mat('#1a1a1a', { emissive: '#181818' }), 0, 0.46, 0, false));
    C.kettle = makeKettle(); C.kettle.position.set(0, -0.8, 0.1); C.juma.armR.add(C.kettle);
    C.shampoo = new THREE.Group(); C.shampoo.add(cyl(0.045, 0.05, 0.2, 8, mat('#3a8ad8'), 0, 0, 0), box(0.07, 0.07, 0.003, basic('#ffffff'), 0, 0, 0.05, false));
    C.shampoo.position.set(0, -0.82, 0.08); C.juma.armL.add(C.shampoo);
    C.water = makePoints(60, 0x9cd8ff, 0.035); g.add(C.water);
    // 9: Ойлашы — the clothes seller with his rack and his sign
    C.seller = H({ outfit: 'shirt', shirt: '#c0a060', pants: '#2a2a2a', hair: 'short', skin: '#c8966e', hat: 'cap', capColor: '#1a1a1a' }, 8);
    C.jacket = box(0.42, 0.55, 0.06, mat('#6a3a1a'), 0, -0.85, 0.12, false); C.seller.armR.add(C.jacket);
    C.rack = new THREE.Group();
    C.rack.add(box(0.04, 1.6, 0.04, mat('#888'), 0, 0.8, -0.6, false), box(0.04, 1.6, 0.04, mat('#888'), 0, 0.8, 0.6, false), box(0.04, 0.04, 1.24, mat('#888'), 0, 1.6, 0, false));
    ['#2a2a6a', '#6a1a1a', '#1a5a2a', '#d0d0c8'].forEach((c, i) => C.rack.add(box(0.1, 0.7, 0.42, mat(c), 0, 1.22, -0.45 + i * 0.3, false)));
    const rs = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.26), new THREE.MeshBasicMaterial({ map: labelTex('КИІМ · ARZAN', '#c02020', '#fff'), side: THREE.DoubleSide }));
    rs.position.set(0, 1.85, 0); rs.rotation.y = -Math.PI / 2; C.rack.add(rs);
    C.rack.position.set(TX + 0.85, MY, L(8, 9.6)); T.wagons[8].group.add(C.rack);
    W.addCollider(TX + 0.75, TX + 0.95, L(8, 9.6) - 0.62, L(8, 9.6) + 0.62, MY - 1, MY + 2);
    C.listener = H({ ...randomLook(), outfit: 'hoodie' }, 8);
    // 10: Дебит тищ теңге on the wagon screen
    const tc = document.createElement('canvas'); tc.width = 256; tc.height = 144; C.tvCtx = tc.getContext('2d'); C.tvTex = new THREE.CanvasTexture(tc);
    C.tv = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.65), new THREE.MeshBasicMaterial({ map: C.tvTex }));
    C.tv.position.set(TX - 1.53, MY + 1.45, L(9, 8)); C.tv.rotation.y = Math.PI / 2; T.wagons[9].group.add(C.tv);
    this.drawTv('idle', 0);
    // 11: AI grandmas: scarves, sunglasses, gold chains
    C.aje1 = addChain(addShades(A(makeApa('#8a2a6a', '#f0d040'), 10)));
    C.aje2 = addChain(addShades(A(makeApa('#2a4a8a', '#ffffff'), 10)));
    // 12: Геодезическая 12
    C.caller = H({ ...randomLook(), outfit: 'jacket', hat: 'cap', capColor: '#3a3a3a' }, 11); C.caller.armR.add(phoneProp());
    C.calm = H({ ...randomLook(), outfit: 'shirt' }, 11);
    // 14: Чай поставьте
    C.chaiDad = addMustache(addFlatCap(H({ skin: '#c8966e', shirt: '#6a5a4a', pants: '#2a2a2a', outfit: 'jacket', hair: 'short', hairColor: '#888', fat: 1.15 }, 13), '#3a3226'), '#777');
    C.chaiDad.armR.add(phoneProp());
    // 15: Галасубуй · Баха (a black tracksuit with white stripes, the blue bag)
    C.galas = H({ ...randomLook(), outfit: 'hoodie' }, 14); C.galas.armR.add(phoneProp());
    C.baha = addStripes(H({ outfit: 'hoodie', shirt: '#151518', pants: '#151518', hair: 'buzz', skin: '#c8966e' }, 14));
    C.baha.armR.add(phoneProp());
    C.bag = box(0.3, 0.36, 0.14, mat('#2a6ad8'), 0, -0.95, 0.02); C.baha.armL.add(C.bag);
    // 16: Мощный и сочный лагман: a chef's hat, an apron, a ladle, a stove with a wok
    C.cook = addChefHat(H({ outfit: 'tshirt', shirt: '#f0f0f0', pants: '#2a2a2a', hair: 'short', fat: 1.3, skin: '#c8966e' }, 15));
    C.cook.spine.add(box(0.38, 0.5, 0.03, mat('#ffffff'), 0, 0.1, 0.14, false));
    C.ladle = new THREE.Group(); C.ladle.add(cyl(0.012, 0.012, 0.45, 5, mat('#888'), 0, 0.1, 0), cyl(0.05, 0.04, 0.04, 8, mat('#888'), 0, -0.13, 0));
    C.ladle.position.set(0, -0.85, 0.12); C.cook.armR.add(C.ladle);
    C.stove = new THREE.Group();
    C.stove.add(box(0.5, 0.75, 0.5, mat('#5a4a3a'), 0, 0.37, 0, false), box(0.36, 0.08, 0.36, mat('#333'), 0, 0.79, 0, false),
      cyl(0.3, 0.22, 0.16, 12, mat('#2a2a2a'), 0, 0.93, 0), cyl(0.26, 0.26, 0.02, 12, mat('#e0b040'), 0, 1.0, 0));
    C.stove.position.set(TX + 0.78, MY, L(15, 9.0)); T.wagons[15].group.add(C.stove);
    W.addCollider(TX + 0.53, TX + 1.03, L(15, 9.0) - 0.25, L(15, 9.0) + 0.25, MY - 1, MY + 1);
    C.steam = makePoints(50, 0xf0f0f0, 0.06); g.add(C.steam);
    // 17: Ибұңқұ-ибұңқұ
    C.singer = H({ ...randomLook(), outfit: 'tshirt', shirt: '#e0e0e0' }, 16);
    // 18: 570 теңге бердім — a street interview (a TV-channel cube on the mic), and Барыс MC
    C.journo = H({ suit: true, shirt: '#3a3a5a', pants: '#2a2a3a', hair: 'long', hairColor: '#2a1a10', skin: '#e0b898' }, 17);
    C.journo.armR.add(cyl(0.025, 0.02, 0.22, 6, mat('#222'), 0, -0.85, 0.1), box(0.07, 0.07, 0.07, mat('#c02020'), 0, -0.98, 0.1, false));
    C.cam = H({ outfit: 'jacket', shirt: '#333', pants: '#222', hair: 'short', hat: 'cap', capColor: '#222' }, 17);
    C.cam.spine.add(box(0.2, 0.22, 0.42, mat('#1a1a1a'), 0.22, 0.62, 0.1, false), cyl(0.06, 0.06, 0.1, 8, mat('#111'), 0.22, 0.62, 0.36));
    C.guest570 = H({ ...randomLook(), outfit: 'jacket' }, 17);
    // ordinary passengers, so no wagon looks empty
    C.bg = [[9, 1, 6.2, 'sit'], [9, 1, 10.6, 'sleep'], [11, -1, 5, 'sit'], [12, -1, 4.6, 'sleep'], [12, 1, 6.6, 'sleep'], [12, -1, 10.4, 'sleep'],
      [13, 1, 5.2, 'sit'], [14, -1, 11.6, 'sleep'], [15, -1, 5.4, 'sit'], [16, 1, 5, 'sleep'], [17, -1, 14.6, 'sit'], [1, -1, 10.2, 'sleep'], [8, -1, 14.2, 'sit']]
      .map(([k, side, l, mode]) => ({ r: H({ ...randomLook(), outfit: ['jacket', 'hoodie', 'shirt', 'tshirt'][Math.floor(Math.random() * 4)] }, k), k, side, l, mode }));
    C.saspaGuy = C.bg[12].r; C.tunnelPax = [C.bg[3].r, C.bg[4].r, C.bg[5].r];
    // on the Абай platform: Пескаблок лақтыру
    C.builder = addMouth(makeHumanoid({ outfit: 'jacket', shirt: '#e07020', pants: '#2a3a5a', hat: 'cap', capColor: '#e0c020', skin: '#c8966e' }));
    C.block = box(0.39, 0.19, 0.19, mat('#8a8a84'), 0, 0, 0); C.block.visible = false;
    T.plat.add(C.builder.root, C.block); C.builder.root.visible = false;
    // at the station's outer entrance (the top of the escalator): Акополексус
    const E = this.metro.esc;
    C.girl = addMouth(makeHumanoid({ hair: 'long', hairColor: '#2a1a10', outfit: 'jacket', shirt: '#e6e6f0', pants: '#2a2a3a', skin: '#e0b898' }));
    C.girl.head.add(box(0.36, 0.1, 0.36, mat('#d04060'), 0, 0.36, 0, false)); // a knitted hat
    C.girl.armR.add(phoneProp());
    C.girl.root.position.set(EX + 0.9, MY + ESC_RISE, ESC_END + 1.7); C.girl.root.rotation.y = -2.0; E.group.add(C.girl.root);
    C.snow = makePoints(320, 0xffffff, 0.05); E.group.add(C.snow);
    C.talkers = [T.apa, T.zyp, T.otanbas, T.ctrl, T.bride, T.groom, ...T.guests, T.asaba, T.erlan, T.phoneGuy, T.leo, ...T.crew,
      C.cleaner, C.waiter, C.taksi, C.father, C.son, C.friend, C.juma, C.seller, C.listener, C.aje1, C.aje2, C.caller, C.calm,
      C.chaiDad, C.galas, C.baha, C.cook, C.singer, C.journo, C.cam, C.guest570, C.builder, C.girl, ...C.bg.map((b) => b.r)];
    // standing performers are solid: you walk around them, not through them
    [C.cleaner, C.waiter, C.juma, C.seller, C.aje1, C.aje2, C.baha, C.cook, C.journo, C.cam, C.guest570, T.ctrl, T.bride, T.groom, T.guests[0], T.asaba, T.leo]
      .forEach((r) => (r.solid = true));
    this.buildMemeScenes();
  };

  /** Where everyone is when they are not performing: [rig, 'sit' | 'stand', side or x, wagon, l, rotation, pose].
   *  The stage of every wagon is in its middle; standing people keep to one side so the aisle stays free. */
  P.memeHomes = function () {
    const T = this.train, C = T.cast;
    return [
      [T.apa, 'sit', 1, 1, 6.4], [C.cleaner, 'stand', TX - 0.6, 1, 13.2, 0],
      [T.zyp, 'sit', -1, 2, 9.6], [T.bg2[0], 'sit', 1, 2, 5.6, 0, 'sleep'], [T.bg2[1], 'sit', -1, 2, 14],
      [T.otanbas, 'sit', 1, 3, 6.2], [T.ctrl, 'stand', TX + 0.3, 3, 13.4, 0],
      [T.bride, 'stand', TX + 0.6, 4, 5.4, Math.PI, 'dance'], [T.groom, 'stand', TX + 0.6, 4, 6.3, 0, 'dance'],
      [T.guests[0], 'stand', TX + 0.6, 4, 10.6, 0, 'dance'], [T.guests[1], 'sit', -1, 4, 11.2],
      [T.asaba, 'stand', TX + 0.6, 4, 12.2, 0], [T.cat, 'sit', 1, 4, 14.6], [C.waiter, 'stand', TX - 0.6, 4, 13.4, 0],
      [T.erlan, 'sit', 1, 5, 6.0], [T.phoneGuy, 'sit', -1, 5, 6.6], [C.taksi, 'sit', 1, 5, 10.4],
      [C.father, 'sit', 1, 6, 9.6], [C.son, 'sit', 1, 6, 10.5], [C.friend, 'sit', -1, 6, 10.2],
      [C.juma, 'stand', TX + 0.6, 7, 8.5, 0],
      [C.seller, 'stand', TX + 0.5, 8, 8.4, 0], [C.listener, 'sit', -1, 8, 9.2],
      [C.aje1, 'stand', TX + 0.6, 10, 7.6, 0], [C.aje2, 'stand', TX + 0.6, 10, 8.6, 0],
      [C.caller, 'sit', 1, 11, 9.4], [C.calm, 'sit', 1, 11, 10.3],
      [C.chaiDad, 'sit', -1, 13, 9.4],
      [C.galas, 'sit', 1, 14, 5.6], [C.baha, 'stand', TX + 0.6, 14, 10, 0],
      [C.cook, 'stand', TX + 0.15, 15, 8.4, 0], [C.singer, 'sit', -1, 16, 9.4],
      [C.journo, 'stand', TX - 0.6, 17, 5.6, 0.5], [C.cam, 'stand', TX + 0.65, 17, 4.6, -0.3], [C.guest570, 'stand', TX + 0.6, 17, 7.0, -0.4],
      [T.leo, 'stand', TX + 0.55, 17, 11.6, 0, 'rap'],
      ...T.crew.map((r, i) => [r, 'stand', TX + (i % 2 ? 0.85 : -0.85), 17, 13.2 + Math.floor(i / 2) * 1.1, 0]),
      ...C.bg.map((b) => [b.r, 'sit', b.side, b.k, b.l, 0, b.mode]),
    ];
  };

  P.memeHome = function ([r, mode, a, k, l, ry = 0, m2]) {
    if (r.root.parent !== this.train.group) this.train.group.attach(r.root);
    if (mode === 'sit') { r.root.position.set(TX + a * 1.15, MY, L(k, l)); r.root.rotation.set(0, -a * Math.PI / 2, 0); r.mode = m2 || 'sit'; }
    else { r.root.position.set(a, MY, L(k, l)); r.root.rotation.set(0, ry, 0); r.mode = m2 || 'stand'; }
    r.spd = 0; r.gesture = null;
    if (r.act) { r.act.show = true; r.act.k = k; }
  };

  const origReset = P.resetTrain;
  P.resetTrain = function () {
    origReset.call(this);
    const T = this.train, C = T.cast;
    if (!C) return;
    // the chapter 20 chases are gone; the horror of the night train is chapter 22
    for (const r of [T.bear, T.karate, T.aksakal, T.apa2, T.youth, T.seller]) r.act.show = false;
    T.dark9.visible = false; T.ticket.visible = false; T.ticketOut = false; T.disc.visible = false;
    T.doors.forEach((d) => { d.locked = false; d.passed = false; d.force = undefined; });
    for (const h of this.memeHomes()) this.memeHome(h);
    for (const r of C.talkers) { r.talkUntil = 0; r.gesture = null; }
    C.mop.visible = true; C.water.visible = false; C.steam.visible = false; C.snow.visible = false;
    C.builder.root.visible = false; C.block.visible = false;
    C.girl.root.visible = true;
    this.drawTv('idle', 0);
    T.mscenes.forEach((s) => { s.played = false; });
    T.mBusy = null; T.cabDone = false;
  };

  // ================================================================ talking: subtitles, a moving mouth, a voice in 3D space
  P.mSay = function (rig, who, text, color = '#fff', dur) {
    const G = this.G;
    dur = dur || Math.max(1.9, Math.min(5.2, text.replace(/\s*\(.*\)\s*$/, '').length * 0.075 + 0.8));
    if (!rig) { G.ui.say(text, who, dur, color); return dur + 0.2; }
    const head = rig.head.getWorldPosition(V()), d = head.distanceTo(G.camera.position);
    rig.talkUntil = G.time + dur; rig.tts = false;
    if (d < 14) {
      G.ui.say(text, who, dur, color);
      try { speechSynthesis.cancel(); } catch (e) { /* no speech */ }
      rig.tts = G.audio.speak(text.replace(/\s*\(.*\)\s*$/, ''), { lang: 'kk', volume: Math.max(0.15, 1 - d / 14), pitch: rig.voice || 1, rate: rig.rate || 1 });
    }
    return dur + 0.25;
  };

  P.memeTick = function (dt) {
    const G = this.G, T = this.train, C = T.cast;
    for (const r of C.talkers) {
      if (!r.root.visible) continue;
      const on = r.talkUntil > G.time;
      if (r.mouth) r.mouth.scale.y = on ? 1 + 3.2 * Math.abs(Math.sin(G.time * 17 + r.root.id)) : 1;
      if (on) {
        r.head.rotation.x += Math.sin(G.time * 7 + r.root.id) * 0.06;
        if (!r.tts && (r.blipT = (r.blipT || 0) - dt) <= 0) { // no voice in this browser: a soft babble from where they stand
          r.blipT = rand(0.08, 0.14);
          G.audio.beep(r.head.getWorldPosition(V()), (r.voiceHz || 190) * rand(0.85, 1.25), 0.05, 0.05, 'triangle');
        }
      }
      if (r.gesture) r.gesture(r, G.time);
    }
    // the cleaner never stops mopping
    C.mop.visible = C.cleaner.root.visible;
    if (C.cleaner.root.visible) {
      const c = C.cleaner, s = Math.sin(G.time * 2.4);
      c.armL.rotation.x = c.armR.rotation.x = -0.9 + s * 0.25;
      C.mop.position.set(c.root.position.x + s * 0.35, MY, c.root.position.z + 0.55); C.mop.rotation.set(-0.35, 0, s * 0.25);
    }
  };

  /** Standing people are solid: push the player out of them. */
  P.memePush = function (curK) {
    const Pl = this.G.player, T = this.train;
    for (const a of T.actors) {
      const r = a.rig;
      if (!r.solid || !a.root.visible || a.k !== curK || a.root.parent !== T.group) continue;
      const p = a.root.position, dx = Pl.pos.x - p.x, dz = Pl.pos.z - p.z, d = Math.hypot(dx, dz), R = 0.6;
      if (d < R && d > 1e-4) { Pl.pos.x = p.x + dx / d * R; Pl.pos.z = p.z + dz / d * R; }
    }
  };

  P.drawTv = function (mode, t) {
    const C = this.train.cast, c = C.tvCtx;
    if (mode === 'idle') {
      c.fillStyle = '#0a1a3a'; c.fillRect(0, 0, 256, 144); c.fillStyle = '#9cf'; c.textAlign = 'center'; c.font = 'bold 26px Arial'; c.fillText('METRO 404', 128, 66);
      c.font = '14px Arial'; c.fillText('Абайлаңыз, есіктер жабылады', 128, 96);
    } else {
      const k = Math.floor(t * 4) % 2;
      c.fillStyle = k ? '#ffd020' : '#e02040'; c.fillRect(0, 0, 256, 144); c.fillStyle = k ? '#111' : '#fff'; c.textAlign = 'center';
      c.font = 'bold 30px Impact, Arial'; c.fillText('ДЕБИТ ТИЩ ТЕҢГЕ', 128, 58);
      c.font = 'bold 44px Impact, Arial'; c.fillText('9 000 ₸', 128 + Math.sin(t * 9) * 6, 110);
    }
    C.tvTex.needsUpdate = true;
  };

  // ================================================================ the scenes (a stage in the middle of every wagon)
  P.buildMemeScenes = function () {
    const T = this.train;
    const S = (id, k, l, r, gen) => ({ id, k, anchor: V(TX, MY, L(k, l)), r, gen, played: false });
    T.mscenes = [
      S('dubara', 1, 6.4, 6, this.mDubara), S('shlabra', 1, 13.2, 3.4, this.mShlabra),
      S('zyp25', 2, 9.6, 6, this.mZyp),
      S('otanbas', 3, 6.2, 6.2, this.mOtanbas),
      S('wedding', 4, 6.8, 6.4, this.mWedding),
      S('kaspi', 5, 6.3, 6, this.mKaspi),
      S('gazel', 6, 10, 6.4, this.mGazel),
      S('jumaisynba', 7, 8.5, 6.2, this.mJuma),
      S('oylashy', 8, 8.4, 6.2, this.mOylashy),
      S('debit', 9, 8, 6.2, this.mDebit),
      S('aiaje', 10, 8.1, 6.4, this.mAiaje),
      S('geodez', 11, 9.8, 6.2, this.mGeodez),
      S('chai', 13, 9.4, 6.2, this.mChai),
      S('galasubui', 14, 5.6, 3.4, this.mGalas), S('baha', 14, 10, 5, this.mBaha),
      S('lagman', 15, 8.6, 6.2, this.mLagman),
      S('ibunqu', 16, 9.4, 5, this.mIbunqu),
      S('t570', 17, 6.2, 6, this.mT570), S('bars', 17, 11.6, 4.6, this.mBars),
    ];
  };

  // 2 — a cockroach runs out from under the seat: «Ей, дүбәрә!»
  P.mDubara = function* () {
    const G = this.G, T = this.train, a = T.apa, r = T.roach;
    r.visible = true; r.position.set(TX + 1.1, MY + 0.01, L(1, 5.4));
    let t = 0;
    while (t < 1.2) { t += G.dt; r.position.x -= 1.1 * G.dt; r.position.z += 1.2 * G.dt; r.rotation.y = Math.atan2(-1.1, 1.2); yield 0; }
    a.mode = 'stand'; this.trainFace(a);
    G.ui.big('ЕЙ, ДҮБӘРӘ!', 1.8, 'red');
    yield this.mSay(a, 'Апа', 'ЕЙ, ДҮБӘРӘ!', '#f9c', 1.8);
    G.audio.thud(r.position.clone(), 0.7);
    t = 0;
    while (t < 0.9) { t += G.dt; r.position.x -= 2.6 * G.dt; r.position.z += 0.4 * G.dt; r.rotation.y = Math.atan2(-2.6, 0.4); yield 0; }
    r.visible = false;
    this.collectMeme('dubara');
    a.mode = 'sit'; a.root.rotation.y = -Math.PI / 2;
  };

  // 2 — the cleaner's mop says «Шлабра»
  P.mShlabra = function* () {
    const C = this.train.cast;
    yield this.mSay(C.cleaner, 'Тазалаушы', 'Шлабра...', '#bdf', 1.8);
    this.collectMeme('shlabra');
  };

  // 3 — he talks so fast you cannot follow
  P.mZyp = function* () {
    const G = this.G, z = this.train.zyp;
    z.mode = 'stand'; this.trainFace(z); z.rate = 2.6; z.voice = 1.3;
    const chunks = ['Сәлем-бауырым-қалайсың-жақсысың-ба-мен-жақсымын-', 'бүгін-жұмыстан-шықтым-бастық-айлық-жоқ-', 'несие-бар-ипотека-бар-той-болады-',
      'метро-кешікті-автобус-кешікті-өмір-кешікті-', 'ал-сен-қалайсың-бауырым-'];
    z.talkUntil = G.time + chunks.length * 0.6;
    z.tts = !!G.audio.speak(chunks.join(' ').replace(/-/g, ' '), { lang: 'kk', pitch: 1.3, rate: 3.5 });
    for (const ch of chunks) { if (z.root.position.distanceTo(G.camera.position) < 14) G.ui.say(ch, 'Зыпылдаған 25', 0.6, '#ff8'); yield 0.6; }
    this.collectMeme('zyp25');
    yield 0.6;
    z.mode = 'sit'; z.root.rotation.y = Math.PI / 2;
  };

  // 4 — «Білетіңіз қайда?» «Менің атым Отанбас.» «Білетіңіз бар ма?» «Жоқ.» «Жүр, түсеміз.»
  P.mOtanbas = function* () {
    const G = this.G, T = this.train, c = T.ctrl, o = T.otanbas;
    while (!this.trainWalk(c, TX + 0.4, L(3, 6.2), 2.2, G.dt)) yield 0;
    c.mode = 'stand'; c.root.rotation.y = Math.PI / 2; c.voice = 0.85; o.voice = 1.1;
    yield 0.3;
    yield this.mSay(c, 'Контролер', 'Білетіңіз қайда?', '#9cf');
    yield this.mSay(o, 'Отанбас', 'Менің атым Отанбас.', '#fc8');
    yield this.mSay(c, 'Контролер', 'Білетіңіз бар ма?', '#9cf');
    yield this.mSay(o, 'Отанбас', 'Жоқ.', '#fc8', 1.6);
    yield this.mSay(c, 'Контролер', 'Жүр, түсеміз.', '#9cf');
    this.collectMeme('otanbas');
    // Жібек жолы: they get off together, through the door at 8 m
    let off = false;
    this.task(function* () { yield* this.trainStop(4, 5, () => off); });
    o.mode = 'stand';
    yield () => T.phase === 'stopped' && T.sideOpen > 0.85;
    while (!this.trainWalk(o, TX + 0.95, L(3, 8), 1.6, G.dt)) { this.trainWalk(c, TX + 0.3, L(3, 7.2), 1.4, G.dt); yield 0; }
    while (!this.trainWalk(o, TX + 2.9, L(3, 8), 1.6, G.dt)) yield 0;
    T.plat.attach(o.root); o.mode = 'stand';
    while (!this.trainWalk(c, TX + 0.95, L(3, 8.2), 1.6, G.dt)) yield 0;
    while (!this.trainWalk(c, TX + 2.9, L(3, 8.4), 1.6, G.dt)) yield 0;
    T.plat.attach(c.root); c.mode = 'stand';
    off = true;
  };

  // 5 — the wedding: the cake, «Қайттық Шауілдірге», the clapping cat, the toast, «Чиви қайда?»
  P.mWedding = function* () {
    const G = this.G, T = this.train, C = T.cast;
    const ppl = [T.bride, T.groom, ...T.guests, T.asaba];
    this.trainJolt();
    if (T.weddingMusic) { T.weddingMusic.stop(); T.weddingMusic = null; }
    T.weddingQuiet = true;
    T.cakeTiers.forEach((c, i) => {
      c.visible = false;
      const wp = c.getWorldPosition(V()), rr = c.geometry.parameters.radiusTop, hh = c.geometry.parameters.height;
      const p = G.props.spawn(cyl(rr, rr, hh, 12, c.material), wp, V(rand(-0.6, 0.6), 1.5, -1.8 - i * 0.3), { kind: 'cake', r: 0.2, thrown: false });
      this.after(25, () => G.props.remove(p));
    });
    yield 0.5; G.audio.crunch(T.cake.position, 0.8);
    ppl.forEach((r) => { r.mode = 'stare'; this.trainFace(r); });
    yield 1.2;
    yield this.mSay(T.groom, 'Күйеу жігіт', '...СЕН ИТЕРДІҢ БЕ?! (...did YOU push it?!)', '#fc8');
    yield this.mSay(T.bride, 'Келін', 'Үш ай бойы жинаған ақшамыз еді... (We saved for three months...)', '#fcc');
    this.collectMeme('cake');
    yield this.mSay(T.guests[1], 'Қонақ', 'Ұят-ай... Қайттық Шауілдірге! (What a shame... we are going back to Shauildir!)', '#ccc');
    this.collectMeme('shauildir');
    T.cat.mode = 'clap';
    let t = 0; while (t < 2) { t += G.dt; if (Math.sin(G.time * 9) > 0.97) G.audio.clap(0.25); yield 0; }
    ppl.forEach((r) => (r.mode = 'clap'));
    t = 0; while (t < 3.6) { t += G.dt; ppl.forEach((r) => this.trainFace(r)); if (Math.random() < G.dt * 14) G.audio.clap(0.45); yield 0; }
    ppl.forEach((r) => (r.mode = 'stare')); T.cat.mode = 'stare';
    G.ui.say('...браво.', 'Мысық', 2.2, '#ccc'); this.collectMeme('clap');
    yield 2.4;
    yield this.mSay(T.asaba, 'Асаба', 'Ал, қонақтар! Келесі тост — ОСЫ ЖІГІТКЕ! (Guests! The next toast — to THIS guy!)', '#fd6');
    this.collectMeme('asaba');
    ppl.forEach((r) => (r.mode = 'dance')); G.audio.laugh(null, 0.4, 1.2);
    T.weddingQuiet = false;
    // the waiter has served the tea... and wants his tip
    const w = C.waiter;
    while (!this.trainWalk(w, TX - 0.2, T.groom.root.position.z - 0.6, 1.4, G.dt)) yield 0;
    w.mode = 'stand'; w.root.rotation.y = Math.atan2(T.groom.root.position.x - w.root.position.x, T.groom.root.position.z - w.root.position.z);
    yield this.mSay(w, 'Даяшы', 'Шай дайын. (The tea is ready.)', '#eee');
    yield this.mSay(w, 'Даяшы', 'Чиви қайда? (Where is the tip?)', '#eee');
    this.collectMeme('chivi');
    yield 1;
    this.memeHome([w, 'stand', TX - 0.6, 4, 13.4, 0]);
    T.cat.mode = 'sit';
  };

  // 6 — Kaspi, «Цунбятрм», the phone on credit, «Түрі такси ұстап кетті», «Қол қойдым»
  P.mKaspi = function* () {
    const G = this.G, T = this.train, C = T.cast, e = T.erlan, ph = T.phoneGuy;
    G.audio.beep(null, 1320, 0.1, 0.2, 'sine'); G.ui.phone('Kaspi', 'Сізге 50 000 ₸ түсті 💸 (you received 50 000 ₸)');
    yield 3;
    G.audio.beep(null, 1320, 0.1, 0.2, 'sine'); G.ui.phone('Kaspi · Ерлан Б.', 'Бауырым, қате аударып жібердім 🙏 Қайтаршы өтінем (bro, wrong transfer, please send it back)');
    yield 3.2;
    G.audio.beep(null, 1320, 0.1, 0.2, 'sine'); G.ui.phone('Kaspi', 'Сіз 40 900 ₸ аудардыңыз → «Жылқы Т.» · Хабарлама: WHERE IS MY CART?');
    yield 3;
    this.collectMeme('kaspi');
    // he does not understand what just happened, and types it to his friend
    e.gesture = (r) => { r.armR.rotation.x = -1.1; r.head.rotation.x = 0.4; };
    G.audio.beep(e.head.getWorldPosition(V()), 1500, 0.05, 0.12, 'square');
    G.ui.phone('Ерлан → досы', 'цунбятрм');
    this.collectMeme('tsunbyatrm');
    yield 3.2;
    e.gesture = null;
    // the train lurches and the phone flies out of his hands
    yield 0.8;
    this.trainJolt();
    T.phoneProp.visible = false;
    const p = G.props.spawn(box(0.08, 0.015, 0.15, mat('#111')), ph.root.position.clone().setY(MY + 1.0), V(0.6, 1, -0.4),
      { kind: 'phone', r: 0.03, thrown: false, onLand: (pp) => { if (!pp.cr) { pp.cr = 1; G.audio.crunch(pp.pos, 0.6); } } });
    this.after(20, () => G.props.remove(p));
    yield 1.3;
    ph.mode = 'stand'; this.trainFace(ph);
    yield this.mSay(ph, 'Жолаушы', 'Жаңа телефон еді! НЕСИЕГЕ алғанмын! 24 айға! (A new phone! On CREDIT! For 24 months!)', '#ccc');
    this.collectMeme('phone');
    yield this.mSay(C.taksi, 'Жолаушы', 'Түрі такси ұстап кетті... (his face, like a taxi just ran him over...)', '#cdb');
    this.collectMeme('taksi');
    yield this.mSay(ph, 'Жолаушы', '...Қол қойдым. (...I give up.)', '#ccc', 2.2);
    this.collectMeme('qolqoidym');
    this.memeHome([ph, 'sit', -1, 5, 6.6]);
  };

  // Абай platform — Пескаблок лақтыру
  P.mPeskablok = function* () {
    const G = this.G, T = this.train, C = T.cast, b = C.builder, bl = C.block;
    b.root.visible = true; b.root.position.set(TX + 5.2, MY, 2); b.root.rotation.set(0, -Math.PI / 2 - 0.4, 0); b.mode = 'stand';
    bl.visible = true;
    let t = 0;
    while (t < 1.2) { t += G.dt; pose(b, 'windup', G.dt, G.time, 0); bl.position.copy(b.root.position).add(V(0.25, 1.5 + Math.sin(t * 3) * 0.1, 0.3)); yield 0; }
    const from = bl.position.clone(), to = V(TX + 3.4, MY + 0.1, -3.5);
    t = 0;
    while (t < 0.7) {
      t += G.dt; const u = Math.min(1, t / 0.7);
      bl.position.lerpVectors(from, to, u); bl.position.y += Math.sin(u * Math.PI) * 1.4; bl.rotation.x += G.dt * 9;
      pose(b, 'punch', G.dt, G.time, 0); yield 0;
    }
    bl.rotation.set(0, 0.3, 0);
    G.audio.thud(bl.getWorldPosition(V()), 1); G.audio.crunch(bl.getWorldPosition(V()), 0.5);
    this.collectMeme('peskablok');
    yield 1.5;
    b.mode = 'stand';
  };

  // 7 — «Таста, газель айдайсың»: a father sees his son's grades
  P.mGazel = function* () {
    const C = this.train.cast, f = C.father, s = C.son;
    f.voice = 0.8; s.voice = 1.15;
    f.gesture = (r, t) => { r.armR.rotation.x = -1.4 + Math.sin(t * 5) * 0.25; };
    yield this.mSay(f, 'Әке', 'Мынау не?! Сессияда тағы үш пен екі! (What is this?! Threes and twos in the session again!)', '#fb8');
    yield this.mSay(s, 'Ұлы', 'Әке, сессия қиын болды... (Dad, the session was hard...)', '#bdf');
    yield this.mSay(C.friend, 'Досы', 'Ауыр-ауыр... (Tough, tough...)', '#ccc', 2);
    this.collectMeme('auyr');
    f.gesture = (r, t) => { r.armR.rotation.x = -2.4 + Math.sin(t * 9) * 0.3; };
    yield this.mSay(f, 'Әке', 'Оқымасаң... ТАСТА, ГАЗЕЛЬ АЙДАЙСЫҢ! (If you will not study... QUIT, you will drive a Gazelle!)', '#fb8');
    this.collectMeme('gazel');
    f.gesture = null;
  };

  // 8 — «Жумайсынба»: a man in a black leather jacket, dandruff, a shampoo, a kettle
  P.mJuma = function* () {
    const G = this.G, C = this.train.cast, j = C.juma;
    j.voice = 0.9;
    j.gesture = (r) => { r.armL.rotation.x = -1.3; };
    yield this.mSay(j, 'Жігіт', 'Қайызғақ па? Иығыңа қарашы, бауырым. (Dandruff? Look at your shoulders, bro.)', '#ddd');
    yield this.mSay(j, 'Жігіт', 'Жумайсынба?! Мына шампунь — қайызғаққа қарсы! (Don\'t you wash?! This shampoo fights dandruff!)', '#ddd');
    j.gesture = (r, t) => { r.armR.rotation.x = -2.7; r.armR.rotation.z = 0.35; C.kettle.rotation.x = 1.2 + Math.sin(t * 3) * 0.15; r.armL.rotation.x = -2.5; };
    C.water.visible = true;
    const pos = C.water.geometry.attributes.position, head = () => j.head.getWorldPosition(V());
    for (let i = 0; i < 60; i++) { const h = head(); pos.setXYZ(i, h.x + rand(-0.12, 0.12), h.y + rand(0.2, 0.6), h.z + rand(-0.12, 0.12)); }
    C.pour = G.audio.loop('rain', head());
    let t = 0;
    while (t < 3.2) {
      t += G.dt; const h = head();
      for (let i = 0; i < 60; i++) { let y = pos.getY(i) - G.dt * rand(1.6, 2.6); if (y < MY + 0.05) y = h.y + 0.55; pos.setXYZ(i, h.x + rand(-0.14, 0.14), y, h.z + rand(-0.14, 0.14)); }
      pos.needsUpdate = true; yield 0;
    }
    if (C.pour) { C.pour.stop(); C.pour = null; }
    C.water.visible = false;
    j.gesture = (r) => { r.armL.rotation.x = -1.3; };
    yield this.mSay(j, 'Жігіт', 'Міне! Жумайсынба? (There! Don\'t you wash?)', '#ddd');
    this.collectMeme('jumaisynba');
    j.gesture = null; C.kettle.rotation.x = 0;
  };

  // 9 — «Ойлашы»: the clothes seller imagines life for you
  P.mOylashy = function* () {
    const C = this.train.cast, s = C.seller;
    s.voice = 1.05;
    s.gesture = (r, t) => { r.armR.rotation.x = -1.2 + Math.sin(t * 2) * 0.1; };
    yield this.mSay(s, 'Сатушы', 'Ойлашы... тойға барасың. Үстіңде — осы күртеше. (Imagine... you go to a wedding, wearing this jacket.)', '#fd8');
    yield this.mSay(C.listener, 'Жолаушы', 'Әкет, әкет! (Go on, go on!)', '#ccc', 2);
    this.collectMeme('aket');
    yield this.mSay(s, 'Сатушы', 'Ойлашы... бастығыңмен кездесесің. Ол сенен көзін ала алмайды. (Imagine... you meet your boss. He cannot take his eyes off you.)', '#fd8');
    yield this.mSay(s, 'Сатушы', 'Ойлашы... қалыңдығыңның әкесімен танысасың. Ол: «Мына жігіт — нағыз азамат!» (Imagine... you meet your bride\'s father. He says: what a man!)', '#fd8');
    this.collectMeme('oylashy');
    yield this.mSay(s, 'Сатушы', 'Кию оңай. Әшейін сән ғой! (Wearing it is easy. It is just style!)', '#fd8');
    this.collectMeme('asheiin');
    s.gesture = null;
  };

  // 10 — the wagon screen plays the «Дебит тищ теңге» advert and its song
  P.mDebit = function* () {
    const G = this.G, C = this.train.cast;
    const song = G.audio.loop('music', C.tv.getWorldPosition(V()));
    let t = 0, last = -1;
    while (t < 9) {
      t += G.dt; this.drawTv('ad', t);
      if (Math.floor(t / 3) !== last) { last = Math.floor(t / 3); G.ui.say('🎵 Дебит тищ теңге... тоғыз мың теңге! 🎵', '📺 Жарнама', 2.6, '#fd6'); }
      yield 0;
    }
    song.stop(); this.drawTv('idle', 0);
    this.collectMeme('debit');
  };

  // 11 — AI grandmas rap and advertise
  P.mAiaje = function* () {
    const G = this.G, C = this.train.cast, a1 = C.aje1, a2 = C.aje2;
    const beat = G.audio.loop('hiphop', a1.root.getWorldPosition(V()).setY(MY + 1.2));
    a1.mode = a2.mode = 'rap'; a1.voice = 1.4; a2.voice = 1.3;
    yield this.mSay(a1, 'AI-әже', 'Йо! Біз — әжелер, рэп оқимыз! (Yo! We are grandmas, we rap!)', '#f9c');
    yield this.mSay(a2, 'AI-әже', 'Бауырсақ, құрт, ірімшік — бәрі арзан, бәрі тәтті! (Baursak, kurt, cheese: cheap and sweet!)', '#9cf');
    a1.mode = a2.mode = 'dance';
    yield this.mSay(a1, 'AI-әже', 'Жазыл, лайк бас, немереңе айт! (Subscribe, like, tell your grandchild!)', '#f9c');
    beat.stop();
    this.collectMeme('aiaje');
    a1.mode = a2.mode = 'stand';
  };

  // 12 — «Геодезическая 12»: he calls the police and explains the address again and again
  P.mGeodez = function* () {
    const C = this.train.cast, c = C.caller;
    c.voice = 1.05;
    c.gesture = (r) => { r.armR.rotation.x = -2.2; r.armR.rotation.z = -0.5; };
    yield this.mSay(c, 'Жолаушы', 'Алло, полиция? Мекенжайым — Геодезическая 12. (Hello, police? My address is Geodezicheskaya 12.)', '#cdf');
    yield this.mSay(c, 'Жолаушы', 'Жоқ... Ге-о-де-зи-чес-ка-я. Он екі! (No... Ge-o-de-zi-ches-ka-ya. Twelve!)', '#cdf');
    yield this.mSay(c, 'Жолаушы', 'ГЕОДЕЗИЧЕСКАЯ 12! Иә, иә, он екі! (GEODEZICHESKAYA 12! Yes, yes, twelve!)', '#cdf');
    this.collectMeme('geodez');
    yield this.mSay(C.calm, 'Көршісі', 'Қазір келеді, бауырым. (They are coming, bro.)', '#ccc', 2);
    yield this.mSay(c, 'Жолаушы', '...трубканы қойып тастады. Қораға кірдік. (...they hung up. Well, that went wrong.)', '#cdf');
    this.collectMeme('qoragha');
    c.gesture = null;
  };

  // 14 — «Чай поставьте»: every message gets the same answer
  P.mChai = function* () {
    const G = this.G, C = this.train.cast, d = C.chaiDad;
    d.voice = 0.85;
    d.gesture = (r) => { r.armR.rotation.x = -1.1; r.head.rotation.x = 0.35; };
    for (const msg of ['Әке, қайдасыз? (Dad, where are you?)', 'Үйге қашан келесіз? (When are you coming home?)', 'Нан алып келіңізші (Can you buy some bread?)']) {
      G.audio.beep(d.head.getWorldPosition(V()), 1320, 0.08, 0.15, 'sine');
      if (d.root.position.distanceTo(G.camera.position) < 14) G.ui.phone('💬 Отбасы чаты', msg);
      yield 2.3;
      yield this.mSay(d, 'Әке', 'Чай поставьте.', '#fb8', 1.9);
    }
    this.collectMeme('chai');
    d.gesture = null;
  };

  // 15 — «Галасубуй»: send a voice message
  P.mGalas = function* () {
    const C = this.train.cast;
    C.galas.gesture = (r) => { r.armR.rotation.x = -1.6; };
    yield this.mSay(C.galas, 'Жолаушы', 'Жазып отырма, галасубуй жібер! (Stop typing, send a voice message!)', '#cdb');
    this.collectMeme('galasubui');
    C.galas.gesture = null;
  };

  // 15 — «Баха, звандама маған» and the blue bag, «Көк пакет Айген»
  P.mBaha = function* () {
    const C = this.train.cast, b = C.baha;
    b.voice = 0.95;
    b.gesture = (r) => { r.armR.rotation.x = -2.2; r.armR.rotation.z = -0.5; };
    yield this.mSay(b, 'Жігіт', 'Баха, звандама маған! (Baha, don\'t call me!)', '#f98');
    this.collectMeme('baha');
    b.gesture = (r, t) => { r.armR.rotation.x = -2.2; r.armR.rotation.z = -0.5; r.armL.rotation.x = -0.9 + Math.sin(t * 6) * 0.3; };
    yield this.mSay(b, 'Жігіт', 'Көк пакет... Айген... (The blue bag... Aigen...)', '#f98');
    this.collectMeme('aigen');
    yield this.mSay(b, 'Жігіт', 'Звандама! (Don\'t call!)', '#f98', 1.8);
    b.gesture = null;
  };

  // 16 — «Мощный и сочный лагман»
  P.mLagman = function* () {
    const C = this.train.cast, c = C.cook;
    c.voice = 0.9;
    c.gesture = (r, t) => { r.armR.rotation.x = -1.0 + Math.sin(t * 6) * 0.35; r.armR.rotation.z = Math.cos(t * 6) * 0.25; };
    C.steam.visible = true;
    const pos = C.steam.geometry.attributes.position, sp = C.stove.position;
    for (let i = 0; i < 50; i++) pos.setXYZ(i, sp.x + rand(-0.2, 0.2), MY + 1.0 + rand(0, 1.0), sp.z + rand(-0.2, 0.2));
    c.cooking = (dt) => { for (let i = 0; i < 50; i++) { let y = pos.getY(i) + dt * rand(0.4, 0.8); if (y > MY + 2.2) y = MY + 1.02; pos.setXYZ(i, sp.x + rand(-0.2, 0.2), y, sp.z + rand(-0.2, 0.2)); } pos.needsUpdate = true; };
    yield this.mSay(c, 'Аспаз', 'Қарашы, бауырым... (Look, bro...)', '#fd8', 2);
    yield this.mSay(c, 'Аспаз', 'Мощный и сочный лагман! (A powerful and juicy lagman!)', '#fd8');
    yield this.mSay(c, 'Аспаз', 'Мощный... и сочный! (Powerful... and juicy!)', '#fd8');
    this.collectMeme('lagman');
    c.gesture = (r, t) => { r.armR.rotation.x = -1.0 + Math.sin(t * 3) * 0.2; };
  };

  // 17 — «Ибұңқұ-ибұңқұ»: a few lines of the song
  P.mIbunqu = function* () {
    const G = this.G, C = this.train.cast, s = C.singer;
    s.voice = 1.2;
    s.gesture = (r, t) => { r.head.rotation.z = Math.sin(t * 5) * 0.2; };
    const notes = [392, 440, 392, 330, 392, 440, 494, 440];
    for (let rep = 0; rep < 2; rep++) {
      s.talkUntil = G.time + 2.4;
      if (s.root.position.distanceTo(G.camera.position) < 14) G.ui.say('🎵 Ибұңқұ-ибұңқұ... 🎵', 'Жолаушы', 2.4, '#fc8');
      for (const n of notes) { G.audio.beep(s.head.getWorldPosition(V()), n, 0.25, 0.12, 'triangle'); yield 0.3; }
    }
    this.collectMeme('ibunqu');
    s.gesture = null;
  };

  // 18 — «570 теңге бердім»: a street interview, in the train
  P.mT570 = function* () {
    const C = this.train.cast, j = C.journo, g = C.guest570;
    j.gesture = (r) => { r.armR.rotation.x = -1.4; r.armR.rotation.z = -0.4; };
    yield this.mSay(j, 'Тілші', 'Не болды, айтып беріңізші? (What happened, can you tell us?)', '#cdf');
    g.gesture = (r, t) => { r.armL.rotation.x = -1.0 + Math.sin(t * 4) * 0.4; };
    yield this.mSay(g, 'Жолаушы', '570 теңге бердім! (I gave 570 tenge!)', '#fd8');
    yield this.mSay(g, 'Жолаушы', 'Иә. Бес жүз жетпіс теңге бердім! (Yes. Five hundred seventy tenge!)', '#fd8');
    yield this.mSay(j, 'Тілші', 'Түсінікті. Рахмет. (I see. Thank you.)', '#cdf', 2);
    this.collectMeme('t570');
    j.gesture = null; g.gesture = null;
  };

  // 18 — Барыс MC raps, the 67 crew answers
  P.mBars = function* () {
    const G = this.G, T = this.train, leo = T.leo;
    const beat = G.audio.loop('hiphop', leo.root.getWorldPosition(V()).setY(MY + 1));
    const lines = ['Йо! Мен — барыс, Алатаудан түстім!', 'Пойызда жүрсің бе? Мемдерді көрдің бе, інім?', 'Бұл — пойыз, бұл — менің ауданым!'];
    leo.voice = 0.8;
    for (const l of lines) {
      leo.mode = 'rap'; yield this.mSay(leo, 'Барыс MC', l, '#fd6');
      T.crew.forEach((r) => (r.mode = 'sixseven')); G.ui.say('six... SEVEN! 6️⃣7️⃣', '67 Crew', 1.6, '#9f6'); yield 1.8;
      T.crew.forEach((r) => (r.mode = 'stand'));
    }
    beat.stop();
    this.collectMeme('bars'); this.collectMeme('crew67');
    leo.mode = 'stand';
  };

  // the station's outer entrance — «Акополексус»: she films the blizzard and cannot say "апокалипсис"
  P.mAkopoleksus = function* () {
    const G = this.G, C = this.train.cast, g = C.girl;
    g.voice = 1.35;
    g.gesture = (r) => { r.armR.rotation.x = -1.9; };
    yield this.mSay(g, 'Қыз', 'Ой, қараңдаршы... буран! (Oh, look... a blizzard!)', '#f9c');
    yield this.mSay(g, 'Қыз', 'Бұл... апока... акополексус! (This is... apoca... akopoleksus!)', '#f9c');
    yield this.mSay(g, 'Қыз', 'Акапалепсис... жоқ... АКОПОЛЕКСУС! (Akapalepsis... no... AKOPOLEKSUS!)', '#f9c');
    G.audio.laugh(g.head.getWorldPosition(V()), 0.3, 1.6);
    this.collectMeme('akopoleksus');
  };

  // ================================================================ per frame: free walking, scenes on approach
  P.updateTrain = function (dt) {
    const G = this.G, T = this.train, Pl = G.player;
    const curK = Math.max(0, Math.min(NW - 1, Math.floor(-Pl.pos.z / WP)));
    const l = -Pl.pos.z - curK * WP;
    if (curK > T.k) T.k = curK;
    this.trainOutside(dt);
    this.trainLights(dt, curK);
    this.memeDoors(dt);
    this.trainActors(dt, curK);
    this.trainPlatformTick(dt);
    this.memeTick(dt);
    this.memePush(curK);
    const C = T.cast;
    if (C.cook.cooking && C.cook.root.visible) C.cook.cooking(dt);
    // the train stops at the stations on the way
    const lvl = STOP_AT[curK];
    if (lvl !== undefined && !T.stopsDone[lvl] && l > 1.5) this.task(function* () { yield* this.trainStop(lvl, 6); });
    // the wedding music plays while you are in that wagon
    if (curK === 4 && !T.weddingMusic && !T.weddingQuiet) T.weddingMusic = G.audio.loop('music', V(TX, MY + 1.5, L(4, 8)));
    if (curK !== 4 && T.weddingMusic) { T.weddingMusic.stop(); T.weddingMusic = null; }
    // a meme starts when you come close (one at a time, and only once)
    if (!T.mBusy) {
      for (const s of T.mscenes) {
        if (s.played || s.k !== curK) continue;
        if (Math.hypot(Pl.pos.x - s.anchor.x, Pl.pos.z - s.anchor.z) < s.r) {
          s.played = true; T.mBusy = s;
          this.task(function* () { yield* s.gen.call(this); if (T.mBusy === s) T.mBusy = null; if (T.mscenes.every((x) => x.played)) this.achieve('m_memetrain'); });
          break;
        }
      }
    }
    if (!T.cabDone && Pl.pos.z < CAB0 - 1.1) { T.cabDone = true; this.task(this.memeCabTask); }
    this.trainHud(curK);
  };

  /** Every door opens when you come close, from either side, and closes when you walk away.
   *  d.force (1 / 0) overrides that for a moment (chapter 22). */
  P.memeDoors = function (dt) {
    const G = this.G, T = this.train, Pl = G.player;
    for (const d of T.doors) {
      const dz = Pl.pos.z - (zFront(d.k) - 0.09), near = Math.abs(dz) < 1.9 && Math.abs(Pl.pos.x - TX) < 1.3;
      const t = d.force !== undefined ? d.force : near ? 1 : 0;
      if (t !== d.target) { d.target = t; if (t) G.audio.whoosh(0.12); }
      d.open += (d.target - d.open) * Math.min(1, dt * 7);
      d.leaf.position.x = TX + 1.05 * d.open;
      d.col.enabled = d.open < 0.55;
    }
  };

  P.trainHud = function (curK) {
    const T = this.train, M = this.metro;
    if (this.G.frame % 6) return;
    const next = [5, 4, 3, 2, 1, 0].find((v) => !T.stopsDone[v]);
    const at = T.plat.visible && T.phase !== 'run' ? `Бекет: ${STATIONS[T.platLvl]}` : `Келесі бекет: ${STATIONS[next ?? 0]}`;
    const left = T.mscenes.filter((s) => s.k === curK && !s.played).length;
    M.hud.innerHTML = `<b>METRO 404 · ВАГОН ${curK + 1}/${NW} · ${T.inCab ? 'Жүргізуші кабинасы' : WNAME[curK]}</b>` +
      `<br><small>${at} · ${left ? `${left} meme${left > 1 ? 's' : ''} ahead: walk up to them` : 'walk on, forward or back'} · J: meme book</small>`;
  };

  /** The driver's cab (chapter 22 adds the driver himself). */
  P.memeCabTask = function* () {
    const G = this.G, T = this.train;
    T.inCab = true;
    G.ui.say('(the driver\'s seat is empty. Nobody is driving this train.)', '', 3.4);
    yield 3.6;
    yield* this.memeTail();
  };

  P.memeTail = function* () {
    const G = this.G, T = this.train;
    T.tail.visible = true; T.tail.position.z = CAB1 - 48; T.tailTo = CAB1 - 13;
    G.ui.say('(ahead in the tunnel: the last wagon of a train... and in its back window, the horse waves at you.)', '', 4.4);
    this.collectMeme('tail'); G.audio.infrasound(5, 0.4);
    yield 4.6;
    this.trainPA('Жер беті. Соңғы бекет. Пойыз әрі қарай жүрмейді. (The Surface. Last stop. This train terminates here.)', 'The Surface. Last stop. This train terminates here.');
    T.stopsDone[0] = true;
    yield 3.4;
    this.achieve('m_train');
    yield* this.trainExitTask();
  };

  // ================================================================ the intro without a ticket or rules about running
  P.introVanish = function () {
    const M = this.metro, T = this.train;
    T.sleepers.forEach((r) => (r.act.show = false));
    M.wagonHorse.root.visible = false;
    T.group.add(M.paper); M.paper.visible = true; M.paper.material.map = T.memeRulesTex || (T.memeRulesTex = txt(256, 192, (ctx) => {
      ctx.fillStyle = '#e8e2cc'; ctx.fillRect(0, 0, 256, 192); ctx.textAlign = 'center';
      ctx.fillStyle = '#a00'; ctx.font = 'bold 24px Georgia, serif'; ctx.fillText('4090 TIMES', 128, 32);
      ctx.fillStyle = '#111'; ctx.font = 'bold 21px Arial'; ctx.fillText('МЕТРОДА МЕМДЕР', 128, 70); ctx.fillText('ТІРІЛІП КЕТТІ!', 128, 98);
      ctx.fillStyle = '#a00'; ctx.font = 'bold 15px Arial'; ctx.fillText('...және бетсіз кондуктор', 128, 132);
      ctx.fillStyle = '#111'; ctx.font = '12px monospace'; ctx.fillText('memes came alive... and the', 128, 156); ctx.fillText('faceless conductor', 128, 172);
    }));
    M.paper.position.set(TX + 1.3, MY + 0.84, L(0, 5)); M.paper.rotation.set(0, -Math.PI / 2, 0); M.paper.rotateX(-0.25);
  };

  const origIntro = P.metroIntroTask;
  P.metroIntroTask = function* () {
    const G = this.G, T = this.train;
    T.hasTicket = true; // (chapter 20 would remind you about a ticket: there is no ticket any more)
    const toast = G.ui.toast.bind(G.ui);
    G.ui.toast = (text) => { if (!/RED LIGHT|ticket/.test(text)) toast(text); };
    try { yield* origIntro.call(this); } finally { G.ui.toast = toast; }
    T.doors.forEach((d) => (d.locked = false));
    G.ui.toast('The memes came alive in the long train. Walk up to them: each one plays once. Walk freely, forward or back.');
  };

  // the top of the escalator: «Акополексус» happens at the doors before you step outside
  const origEsc = P.updateEscalator;
  P.updateEscalator = function (dt) {
    origEsc.call(this, dt);
    const G = this.G, T = this.train, C = T.cast, E = this.metro.esc, Pl = G.player;
    if (!C) return;
    this.memeTick(dt);
    const pos = C.snow.geometry.attributes.position;
    if (!C.snow.visible) {
      C.snow.visible = true;
      for (let i = 0; i < 320; i++) pos.setXYZ(i, EX + rand(-1.3, 1.3), MY + ESC_RISE + rand(0, 2.6), ESC_END + rand(0.05, 1.4));
    }
    for (let i = 0; i < 320; i++) {
      let x = pos.getX(i) + dt * rand(2.5, 4.5), y = pos.getY(i) - dt * rand(0.3, 0.8);
      if (x > EX + 1.3) x = EX - 1.3; if (y < MY + ESC_RISE) y = MY + ESC_RISE + 2.6;
      pos.setXYZ(i, x, y, pos.getZ(i));
    }
    pos.needsUpdate = true;
    if (!E.riding && !T.girlStarted && Pl.pos.z < ESC_TOP - 1.5) { T.girlStarted = true; this.task(function* () { yield* this.mAkopoleksus(); T.girlDone = true; }); }
  };
  const origTwist = P.surfaceTwistTask;
  P.surfaceTwistTask = function* () {
    const T = this.train;
    yield () => T.girlDone;
    yield* origTwist.call(this);
  };

  // Пескаблок on the Абай platform: when the doors open there
  const origStop = P.trainStop;
  P.trainStop = function* (lvl, hold, holdUntil, quiet) {
    if (lvl === 3) this.task(function* () { yield () => this.train.platLvl === 3 && this.train.phase === 'stopped' && this.train.sideOpen > 0.8; yield* this.mPeskablok(); });
    yield* origStop.call(this, lvl, hold, holdUntil, quiet);
  };

  // the end screens describe the meme train
  const origDeath = P.metroDeathReport;
  P.metroDeathReport = function () {
    const r = origDeath.call(this), T = this.train, M = this.metro;
    if (T && !M.trainDone) r.stats = `Reached wagon ${T.k + 1}/${NW} · ${WNAME[T.k]} · Time ${fmt(this.G.time - (this.metroMapStart || 0))} · Memes this run ${M.runMemes.size}`;
    return r;
  };
  const origWin = P.metroMapWin;
  P.metroMapWin = function () {
    origWin.call(this);
    const M = this.metro;
    $('end-stats').textContent = `Time ${fmt(this.G.time - (this.metroMapStart || 0))} · Wagons ${NW}/${NW} · Memes seen ${M.runMemes.size}/${MEMES.length} · Caught ${M.mistakes}×`;
  };
}
