// Chapter 19: two truly separate maps, and METRO 404 as a complete game of its own.
//
// SEPARATE MAPS: only the chosen map is ever built. On 4090 CITY the metro does not exist at all (a stub
// object), on METRO 404 the city does not exist at all (a minimal world: no streets, no citizens, no city
// scripts). Each map has its own link (?map=city / ?map=metro), its own title card and its own end screens.
//
// METRO 404, the full game:
//  INTRO     You wake up in the last train at 03:33. The horse commuter lowers his newspaper. Lights out.
//            When they come back, everyone is gone. Only the newspaper is left: "SEE A MEME — TURN BACK".
//  STATIONS  Each of the 5 stations has its own look: Райымбек батыр (warm tiles, gold ram-horn ornament,
//            the batyr medallion), Жібек жолы (blue and gold, a camel caravan frieze, lanterns), Абай (white
//            marble, two lines of Abai's poem), Туннель 404 (raw concrete, cables, graffiti, a stuttering red
//            emergency light), Шексіз бекет ∞ (black walls full of stars, floating dust, thick fog).
//  HARDER    Deeper stations: memes appear more often, monsters run faster, warnings are shorter, less light.
//  MEME BOOK 24 memes (18 meme-screamers in the corridor + 6 train events), saved between runs. J opens it.
//  FINALE    The exit hall, then a long escalator to the surface. Every meme you met this run rides down
//            past you on the other side (don't look back...). At the top: the light. And then:
//            "📢 Келесі бекет — Райымбек батыр."
import * as THREE from 'three';
import { makeHumanoid, pose, randomLook } from './characters.js';
import { ACH, makeShopCart } from './scenes2.js';
import { paintManager } from './scenes11.js';
import { mat, basic, box, cyl, canvasTex, rand, pick } from './util.js';

const MY = -120, WX = 40, WZ0 = -29, WZ1 = -11;               // corridor floor height, the train wagon
const EX = -40, ESC_TOP = -30, ESC_RISE = 12, ESC_END = -40.6; // the escalator hall (bottom landing z 0..4.6)
const SLOPE = ESC_RISE / -ESC_TOP;
const NAMES = { 5: 'Райымбек батыр', 4: 'Жібек жолы', 3: 'Абай', 2: 'Туннель 404', 1: 'Шексіз бекет ∞', 0: 'Жер беті' };
// [chance that a loop has a meme, monster speed + warning speed]
const DIFF = { 5: [0.5, 0.86], 4: [0.58, 0.93], 3: [0.64, 1], 2: [0.71, 1.08], 1: [0.78, 1.16], 0: [0, 1] };
const THEMES = {
  5: { floor: '#8a6a50', ceil: '#d8c8a8', panel: '#ffe6b0', light: 0xffd8a0, li: 9.5, fog: '#1a1208', density: 0.02 },
  4: { floor: '#56688a', ceil: '#24366a', panel: '#dce8ff', light: 0xd6e2ff, li: 9, fog: '#08101e', density: 0.021 },
  3: { floor: '#a09e96', ceil: '#e8e6e0', panel: '#ffffff', light: 0xfff2e6, li: 10, fog: '#141412', density: 0.018 },
  2: { floor: '#4e4a46', ceil: '#34322f', panel: '#ff9a70', light: 0xff8058, li: 6.5, fog: '#180806', density: 0.027, flicker: true },
  1: { floor: '#16141f', ceil: '#07060d', panel: '#c4b4ff', light: 0xb4a4ff, li: 5, fog: '#05030c', density: 0.036 },
  0: { floor: '#aab0aa', ceil: '#eaeeea', panel: '#f4fff4', light: 0xf0fff0, li: 11, fog: '#0e1412', density: 0.016 },
};

export const MEMES = [
  ['x_horse', '🐴', 'Horse commuter', 'Ат-жолаушы'], ['x_crew67', '6️⃣7️⃣', '67 Crew', 'Алпыс жеті'],
  ['x_buddy', '🧢', 'Buddy?', 'Бадди?'], ['x_cart', '🛒', 'Friendly cart', 'Дос арба'],
  ['x_bananas', '🍌', 'Banana monkey', 'Банан маймыл'], ['x_posters', '🖼️', 'Meme posters', 'Мем-постерлер'],
  ['x_door', '🚪', 'ЗАНЯТО!', 'Бос емес'], ['x_faceless', '📦', 'RTX for 5000 ₸', 'Арзан RTX'],
  ['x_announcer', '📢', 'The announcer', 'Хабарлаушы'], ['manager', '👔', 'The Manager', 'Менеджер'],
  ['bars', '🐆', 'Барыс MC', 'Рэпер барыс'], ['karate', '🥋', 'Karate Cat', 'Каратэ мысық'],
  ['oylashy', '🗣️', 'Ойлашы!', 'Қараңғыдан'], ['coderot', '🤖', 'Code Rot', 'Код шірігі'],
  ['bluti', '🍓', 'Bluti Fruti', 'Блути Фрути'], ['dad', '🦘', 'The Dad???', 'Кенгуру әке'],
  ['dubara', '🪳', 'Әй, дүбәра!', 'Тарақан'], ['gta6', '💿', 'GTA 6', 'Он жыл күттім'],
  ['clap', '🐈', 'Clapping cat', 'Шапалақ мысық'], ['bear', '🐻', 'Remember November', 'Ақ аю'],
  ['cake', '🎂', 'Wedding cake', 'Той торты'], ['kaspi', '💸', 'Wrong Kaspi transfer', 'Қате аударым'],
  ['phone', '📱', 'Dropped phone', 'Несие телефон'], ['zyp25', '⏩', 'Зыпылдаған 25', 'Зыпылдақ'],
].map(([id, e, n, kz]) => ({ id, e, n, kz }));
const MEME_BY_ID = Object.fromEntries(MEMES.map((m) => [m.id, m]));

Object.assign(ACH, {
  m_book: ['Meme Historian', 'Find all 24 memes of METRO 404'],
  m_twist: ['Next Station...', 'Reach the top of the escalator'],
  m_lookback: ['Do Not Look Back', 'Look back on the escalator'],
});

const loadJSON = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const saveJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } };
const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const $ = (id) => document.getElementById(id);

/** How many memes are in the meme book (saved between runs). */
export function memeBookCount() { const b = loadJSON('cc4090-memes', {}); return MEMES.filter((m) => b[m.id]).length; }

/** The meme book as a grid of cells; memes met in this run are highlighted. */
export function memeGridHTML(runSet) {
  const book = loadJSON('cc4090-memes', {});
  return MEMES.map((m) => {
    const found = !!book[m.id], now = !!(runSet && runSet.has(m.id));
    return `<div class="mcell${found ? ' found' : ''}${now ? ' now' : ''}"><span class="me">${found ? m.e : '❔'}</span><b>${found ? m.n : '???'}</b><small>${found ? m.kz : ''}</small></div>`;
  }).join('');
}

/** Text for the map cards and the main menu (best results, meme book). */
export function mapCardStats() {
  const best = loadJSON('cc4090-best', null), metro = loadJSON('cc4090-metro', null), ach = loadJSON('cc4090-ach', {});
  const n = memeBookCount();
  return {
    city: best ? `Best: ${best.score} · ${best.rank}` : 'Not played yet',
    metro: `${metro ? `Escaped in ${fmt(metro.time)} · caught ${metro.mistakes}×` : 'Not escaped yet'} · 📒 ${n}/${MEMES.length} memes`,
    menu: `🏆 ${Object.keys(ach).filter((k) => ACH[k]).length} / ${Object.keys(ACH).length} achievements · 📒 METRO meme book ${n}/${MEMES.length}`,
  };
}

// ---------------------------------------------------------------- painted textures
const line = (ctx, x0, y0, x1, y1) => { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); };
function wallTex(paint) { const t = canvasTex(128, 128, paint); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
function tiles(ctx, base, grout, n, jitter) {
  ctx.fillStyle = base; ctx.fillRect(0, 0, 128, 128);
  const s = 128 / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { ctx.fillStyle = `rgba(0,0,0,${Math.random() * jitter})`; ctx.fillRect(i * s, j * s, s, s); }
  ctx.strokeStyle = grout; ctx.lineWidth = 2;
  for (let i = 0; i <= 128; i += s) { line(ctx, i, 0, i, 128); line(ctx, 0, i, 128, i); }
}
// rows 83..102 of a wall texture land at 0.4–0.7 m and 2.4–2.7 m on the 3.2 m wall: a dado band and a frieze band
const B0 = 83, B1 = 102, BM = (B0 + B1) / 2;
function band(ctx, fill, edge) {
  ctx.fillStyle = fill; ctx.fillRect(0, B0, 128, B1 - B0);
  if (edge) { ctx.fillStyle = edge; ctx.fillRect(0, B0, 128, 2); ctx.fillRect(0, B1 - 2, 128, 2); }
}
/** Қошқар мүйіз (ram's horn): two horns curling out of one stem. */
function ramHorns(ctx, color, x, cy, w) {
  const h = w / 2;
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x + h, cy + 6); ctx.lineTo(x + h, cy - 1);
  ctx.bezierCurveTo(x + h, cy - 8, x + 2, cy - 8, x + 3, cy); ctx.bezierCurveTo(x + 4, cy + 4, x + 9, cy + 3, x + 8, cy - 1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + h, cy - 1);
  ctx.bezierCurveTo(x + h, cy - 8, x + w - 2, cy - 8, x + w - 3, cy); ctx.bezierCurveTo(x + w - 4, cy + 4, x + w - 9, cy + 3, x + w - 8, cy - 1); ctx.stroke();
}
/** A tiny camel silhouette, about 26 px long, standing on y = base. */
function camel(ctx, color, x, base) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(x + 13, base - 9, 8, 4, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 12, base - 13, 4, 3.5, 0, 0, 7); ctx.fill();
  ctx.fillRect(x + 19, base - 16, 3, 8); ctx.fillRect(x + 19, base - 17, 7, 3);
  for (const lx of [7, 10, 16, 19]) ctx.fillRect(x + lx, base - 6, 2, 6);
}
const WALLS = {
  5: (ctx) => { tiles(ctx, '#e6d2a8', '#9a7a4a', 8, 0.07); band(ctx, '#6a2a14', '#e8b848'); for (let x = 0; x < 128; x += 32) ramHorns(ctx, '#e8b848', x, BM, 32); },
  4: (ctx) => { tiles(ctx, '#21407e', '#c8a040', 8, 0.12); band(ctx, '#0c1a3c', '#e8c050'); for (let x = 0; x < 128; x += 32) camel(ctx, '#e8c050', x + 2, B1 - 4); },
  3: (ctx) => {
    ctx.fillStyle = '#ecebe6'; ctx.fillRect(0, 0, 128, 128);
    ctx.lineWidth = 1;
    for (let i = 0; i < 14; i++) {
      const y = Math.random() * 128;
      ctx.strokeStyle = `rgba(110,112,122,${0.15 + Math.random() * 0.25})`;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(40, y + rand(-30, 30), 80, y + rand(-30, 30), 128, y + rand(-20, 20)); ctx.stroke();
    }
    ctx.strokeStyle = '#c8c6c0'; ctx.lineWidth = 2; line(ctx, 0, 0, 128, 0); line(ctx, 64, 0, 64, B0); line(ctx, 0, 0, 0, 128);
    band(ctx, '#1e3a2e', '#d8b048');
  },
  2: (ctx) => {
    ctx.fillStyle = '#6e6c68'; ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.08})`; ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); }
    ctx.strokeStyle = 'rgba(30,28,26,0.5)'; ctx.lineWidth = 1; for (let y = 0; y < 128; y += 32) line(ctx, 0, y, 128, y);
    ctx.fillStyle = '#2a2826'; for (let y = 16; y < 128; y += 32) for (let x = 16; x < 128; x += 64) ctx.fillRect(x, y, 3, 3);
    for (let i = 0; i < 5; i++) {
      const g = ctx.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, 'rgba(40,30,20,0.35)'); g.addColorStop(1, 'rgba(40,30,20,0)');
      ctx.fillStyle = g; ctx.fillRect(Math.random() * 120, 0, rand(3, 8), 128);
    }
    for (let i = 0, x = -16; x < 144; x += 16, i++) {
      ctx.fillStyle = i % 2 ? '#e8c020' : '#151515';
      ctx.beginPath(); ctx.moveTo(x, B1); ctx.lineTo(x + 8, B0); ctx.lineTo(x + 16, B0); ctx.lineTo(x + 8, B1); ctx.fill();
    }
  },
  1: (ctx) => {
    ctx.fillStyle = '#07060e'; ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 150; i++) { ctx.fillStyle = pick(['#ffffff', '#b8c8ff', '#d8b8ff', '#8890c0']); const s = Math.random() < 0.08 ? 2 : 1; ctx.fillRect(Math.random() * 128, Math.random() * 128, s, s); }
    ctx.fillStyle = '#2a1a5a'; ctx.fillRect(0, BM - 1, 128, 2);
  },
  0: (ctx) => { tiles(ctx, '#f2f4f0', '#b8c0b8', 8, 0.04); band(ctx, '#178a3a', '#e8ffe8'); },
};

/** A canvas texture for text and pictures: pixelated up close, but still readable from far away. */
function txt(w, h, paint) {
  const t = canvasTex(w, h, paint);
  t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 4;
  return t;
}
function friezeTex(paint) { const t = canvasTex(256, 32, paint); t.wrapS = THREE.RepeatWrapping; return t; }
function fitText(ctx, text, maxW, size, font = 'Arial, sans-serif') {
  let s = size;
  do { ctx.font = `bold ${s}px ${font}`; s -= 2; } while (ctx.measureText(text).width > maxW && s > 10);
}
function medallion(ctx) { // the Raiymbek Batyr emblem: a gold ring, a batyr's helmet over crossed spears
  ctx.translate(128, 128);
  ctx.fillStyle = '#d8a838'; ctx.beginPath(); ctx.arc(0, 0, 124, 0, 7); ctx.fill();
  ctx.fillStyle = '#5a1408'; ctx.beginPath(); ctx.arc(0, 0, 112, 0, 7); ctx.fill();
  ctx.fillStyle = '#d8a838';
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; ctx.save(); ctx.rotate(a); ctx.fillRect(-4, -104, 8, 8); ctx.restore(); }
  ctx.strokeStyle = '#e8c050'; ctx.lineWidth = 5;
  for (const s of [-1, 1]) { line(ctx, -62 * s, 60, 62 * s, -70); ctx.beginPath(); ctx.moveTo(62 * s, -70); ctx.lineTo(50 * s, -56); ctx.lineTo(66 * s, -54); ctx.fill(); }
  ctx.fillStyle = '#f0c858';
  ctx.beginPath(); ctx.arc(0, 4, 44, Math.PI, 0); ctx.fill();                       // dome
  ctx.fillRect(-48, 2, 96, 10); ctx.fillRect(-4, -64, 8, 26); ctx.fillRect(-5, 10, 10, 30); // rim, spike, nose guard
  ctx.fillStyle = '#5a1408'; ctx.fillRect(-30, 14, 20, 8); ctx.fillRect(10, 14, 20, 8);    // eye slits
  ctx.fillStyle = '#f0c858'; ctx.textAlign = 'center'; ctx.font = 'bold 19px Georgia, serif'; ctx.fillText('РАЙЫМБЕК БАТЫР', 0, 78);
}
function silkMap(ctx) { // a mosaic map of the Silk Road through Kazakhstan
  ctx.fillStyle = '#0e2656'; ctx.fillRect(0, 0, 512, 280);
  ctx.strokeStyle = '#d8b048'; ctx.lineWidth = 6; ctx.strokeRect(6, 6, 500, 268);
  ctx.fillStyle = '#e8c050'; ctx.textAlign = 'center'; ctx.font = 'bold 30px Georgia, serif'; ctx.fillText('ЖІБЕК ЖОЛЫ · SILK ROAD', 256, 46);
  const pts = [[70, 210, 'Отырар'], [150, 180, 'Түркістан'], [250, 196, 'Тараз'], [350, 160, 'Алматы'], [450, 120, 'Қытай →']];
  ctx.setLineDash([8, 8]); ctx.lineWidth = 3; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.setLineDash([]);
  ctx.font = 'bold 17px Arial';
  for (const [x, y, n] of pts) { ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill(); ctx.fillText(n, x, y + 28); }
  for (let i = 0; i < 4; i++) camel(ctx, '#e8c050', 120 + i * 34, 110);
}
function abaiPlaque(ctx) { // dark granite with two gold lines of Abai's poem
  ctx.fillStyle = '#151816'; ctx.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 700; i++) { ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`; ctx.fillRect(Math.random() * 512, Math.random() * 256, 2, 2); }
  ctx.strokeStyle = '#d8b048'; ctx.lineWidth = 4; ctx.strokeRect(10, 10, 492, 236);
  ctx.fillStyle = '#e8c860'; ctx.textAlign = 'center';
  ctx.font = 'italic bold 34px Georgia, serif'; ctx.fillText('«Ғылым таппай мақтанба,', 256, 96); ctx.fillText('Орын таппай баптанба...»', 256, 146);
  ctx.font = 'bold 22px Georgia, serif'; ctx.fillText('— Абай Құнанбайұлы', 300, 206);
}
function spray(ctx, text, color, w, h, size) { // graffiti: soft-edged spray paint with drips
  ctx.font = `bold ${size}px Impact, 'Arial Black', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = color; ctx.shadowBlur = 8; ctx.fillStyle = color; ctx.fillText(text, w / 2, h / 2);
  ctx.shadowBlur = 0;
  for (let i = 0; i < 9; i++) { const x = w * 0.15 + Math.random() * w * 0.7; ctx.fillRect(x, h / 2 + size * 0.3, 2, rand(8, h / 2 - size * 0.3)); }
}
function paperTex(rules) { // the newspaper in the last train
  return txt(256, 192, (ctx) => {
    ctx.fillStyle = '#e8e2cc'; ctx.fillRect(0, 0, 256, 192);
    ctx.fillStyle = '#111'; ctx.textAlign = 'center';
    if (!rules) {
      ctx.font = 'bold 30px Georgia, serif'; ctx.fillText('4090 TIMES', 128, 34); ctx.fillRect(10, 42, 236, 3);
      ctx.font = 'bold 25px Impact, sans-serif'; ctx.fillText('METRO 404:', 128, 78); ctx.fillText('ЕШКІМ ШЫҚПАДЫ', 128, 108);
      ctx.font = '12px monospace'; ctx.fillText('(nobody got out)  · соңғы пойыз 03:33', 128, 128);
      ctx.fillStyle = '#888'; for (let y = 140; y < 184; y += 7) { ctx.fillRect(12, y, 108, 3); ctx.fillRect(136, y, 108, 3); }
    } else {
      ctx.fillStyle = '#a00'; ctx.font = 'bold 26px Georgia, serif'; ctx.fillText('ЕРЕЖЕ · RULE', 128, 38);
      ctx.fillStyle = '#111'; ctx.font = 'bold 30px Impact, sans-serif'; ctx.fillText('МЕМ КӨРСЕҢ —', 128, 84); ctx.fillText('АРТҚА ҚАЙТ!', 128, 120);
      ctx.font = 'bold 14px monospace'; ctx.fillText('SEE A MEME — TURN BACK', 128, 150); ctx.fillText('no meme — walk forward', 128, 172);
    }
  });
}
function signTex(m) { // a cardboard sign for the escalator parade
  return txt(160, 96, (ctx) => {
    ctx.fillStyle = '#c8a070'; ctx.fillRect(0, 0, 160, 96); ctx.strokeStyle = '#7a5a30'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, 156, 92);
    ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.font = '34px sans-serif'; ctx.fillText(m.e, 80, 44);
    fitText(ctx, m.n.toUpperCase(), 148, 16); ctx.fillText(m.n.toUpperCase(), 80, 78);
  });
}

export function extendDirector19(D) {
  const P = D.prototype;

  // ================================================================ SEPARATE MAPS: build only the chosen map
  const origInit = P.init;
  P.init = function () { if (this.G.map === 'metro') this.initMetroMap(); else origInit.call(this); };

  /** METRO 404 map: the minimal state the metro scripts need, then only the metro is built. */
  P.initMetroMap = function () {
    const G = this.G;
    this.ach = {}; this.stats = { falls: 0, buddyTrips: 0, scares: 0, runner: 0 };
    this.aura = 0; this.views = 0; this.photos = []; this.peels = [];
    this.baseFov = G.camera.fov; this.fovTarget = G.camera.fov;
    this.zone = { mgrTex: paintManager() };
    this.initMetro(); this.initMetro404(); this.initMetro18(); this.initMetro19();
  };

  // 4090 CITY map: the metro is not built at all (a stub keeps the shared metro hooks quiet)
  const origInitMetro = P.initMetro;
  P.initMetro = function () {
    if (this.G.map === 'metro') origInitMetro.call(this);
    else this.metro = { active: false, stub: true };
  };
  for (const name of ['initMetro404', 'initMetro18']) {
    const orig = P[name];
    P[name] = function () { if (this.G.map === 'metro') orig.call(this); };
  }
  const origFlashFace = P.maybeFlashFace;
  P.maybeFlashFace = function () { if (this.G.map !== 'metro' && origFlashFace) origFlashFace.call(this); };

  // ================================================================ METRO: build
  P.initMetro19 = function () {
    const G = this.G, M = this.metro, root = M.root;
    M.floorMesh = root.children[1]; M.floorMesh.material = M.floorMesh.material.clone();
    M.ceilMesh = M.ceil.children[0]; M.ceilMesh.material = M.ceilMesh.material.clone();
    M.themeTex = {};
    for (const k of [5, 4, 3, 2, 1, 0]) M.themeTex[k] = wallTex(WALLS[k]);
    M.runMemes = new Set(); M.runOrder = [];
    this.buildStationDecor();
    this.buildEscalator();
    this.buildIntroProps();
    // the corridor is lit by its own lamp, not by street lamps: fear comes from darkness, not from being underground
    G.lighting.nearestLitDist = () => (M.intro || M.riding || M.finale || M.light.intensity > 3 ? 0 : 99);
    // "give up" now goes back to the map select (the URL remembers the map, so a reload would restart it)
    const giveUp = G.world.interactables.find((it) => it.label === 'Give up: back to the map select');
    if (giveUp) giveUp.act = () => { location.href = `${location.pathname}?maps`; };
  };

  P.buildStationDecor = function () {
    const M = this.metro, root = M.root;
    const D = M.deco = {};
    const group = (lvl) => { const g = new THREE.Group(); g.visible = false; root.add(g); D[lvl] = g; return g; };
    const plane = (g, w, h, map, x, y, z, ry = 0, opts = {}) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map, transparent: !!opts.transparent, color: opts.color ?? 0xffffff }));
      m.position.set(x, MY + y, z); m.rotation.y = ry; g.add(m); return m;
    };
    const frieze = (g, tex) => { // a band of ornament high on both walls (between the openings)
      tex.repeat.set(47.5 / 1.6, 1);
      plane(g, 47.5, 0.3, tex, -2.465, 2.92, -22.25, Math.PI / 2);
      plane(g, 47.5, 0.3, tex, 2.465, 2.92, -17.75, -Math.PI / 2);
    };
    // 1/5 Райымбек батыр: warm tiles, gold ram horns, the batyr medallion, warm wall lamps
    {
      const g = group(5);
      frieze(g, friezeTex((ctx) => {
        ctx.fillStyle = '#4a1a0c'; ctx.fillRect(0, 0, 256, 32); ctx.fillStyle = '#e8b848'; ctx.fillRect(0, 1, 256, 2); ctx.fillRect(0, 29, 256, 2);
        for (let x = 0; x < 256; x += 32) ramHorns(ctx, '#f0c050', x, 18, 32);
      }));
      plane(g, 2, 2, txt(256, 256, medallion), 0, 1.7, -45.96, 0, { transparent: true });
      for (const z of [-9.5, -16.5, -23.5, -30.5]) g.add(box(0.1, 0.26, 0.16, basic('#ffc870'), -2.43, MY + 2.45, z, false));
    }
    // 2/5 Жібек жолы: blue and gold, a camel caravan, the Silk Road map, hanging lanterns
    {
      const g = group(4);
      frieze(g, friezeTex((ctx) => {
        ctx.fillStyle = '#0c1a3c'; ctx.fillRect(0, 0, 256, 32);
        ctx.strokeStyle = '#c8a040'; ctx.lineWidth = 1; ctx.beginPath();
        for (let x = 0; x <= 256; x += 4) ctx.lineTo(x, 28 + Math.sin(x / 256 * Math.PI * 4) * 2);
        ctx.stroke();
        for (let x = 0; x < 256; x += 64) { camel(ctx, '#e8c050', x + 6, 27); camel(ctx, '#e8c050', x + 36, 27); }
        ctx.fillStyle = '#e8c050'; ctx.fillRect(0, 1, 256, 2);
      }));
      plane(g, 2.8, 1.53, txt(512, 280, silkMap), 0, 1.75, -45.96);
      for (const z of [-8, -16, -24, -32]) {
        g.add(box(0.22, 0.32, 0.22, basic('#ffb040'), 0, MY + 2.78, z, false));
        g.add(cyl(0.012, 0.012, 0.26, 4, mat('#222'), 0, MY + 3.07, z));
      }
    }
    // 3/5 Абай: white marble, a meander frieze, a granite plaque with two lines of Abai's poem
    {
      const g = group(3);
      frieze(g, friezeTex((ctx) => {
        ctx.fillStyle = '#1e3a2e'; ctx.fillRect(0, 0, 256, 32); ctx.strokeStyle = '#d8b048'; ctx.lineWidth = 2;
        for (let x = 0; x < 256; x += 16) { ctx.beginPath(); ctx.moveTo(x, 25); ctx.lineTo(x, 8); ctx.lineTo(x + 12, 8); ctx.lineTo(x + 12, 20); ctx.lineTo(x + 5, 20); ctx.lineTo(x + 5, 14); ctx.stroke(); }
      }));
      plane(g, 3.2, 1.6, txt(512, 256, abaiPlaque), 0, 1.75, -45.96);
    }
    // 4/5 Туннель 404: cables, graffiti, puddles (the stuttering red light is in updateMetro)
    {
      const g = group(2);
      const cable = mat('#141414');
      for (const [x, y] of [[-2.44, 2.62], [-2.42, 2.74], [2.44, 2.66], [2.42, 2.8]]) g.add(box(0.05, 0.05, 47, cable, x, MY + y, -20, false));
      const graf = (text, color, x, y, z, ry, w, h, size) => plane(g, w, h, txt(256, Math.round(256 * h / w), (ctx, W, Hh) => spray(ctx, text, color, W, Hh, size)), x, y, z, ry, { transparent: true });
      graf('404', '#e02020', -2.465, 1.35, -16.6, Math.PI / 2, 1.3, 0.8, 120);
      graf('ШЫҒУ ЖОҚ', '#f0f0f0', 2.465, 1.6, -28, -Math.PI / 2, 1.6, 0.5, 46);
      graf('6 7', '#60ff40', 2.465, 1.3, -16, -Math.PI / 2, 0.9, 0.6, 80);
      graf('АРТҚА ҚАЙТ', '#ff8a20', -2.465, 1.1, -37.4, Math.PI / 2, 1.5, 0.45, 40);
      for (const [x, z, s] of [[0.6, -12, 1.2], [-0.9, -27, 0.9], [1.2, -35, 1.4]]) {
        const p = new THREE.Mesh(new THREE.CircleGeometry(0.5, 10), new THREE.MeshBasicMaterial({ color: 0x0a0c10, transparent: true, opacity: 0.75 }));
        p.rotation.x = -Math.PI / 2; p.scale.set(s, s * 0.6, 1); p.position.set(x, MY + 0.02, z); g.add(p);
      }
    }
    // 5/5 Шексіз бекет ∞: a glowing infinity sign at the end, floating dust
    {
      const g = group(1);
      plane(g, 1.8, 0.9, txt(256, 128, (ctx) => {
        ctx.fillStyle = '#05030c'; ctx.fillRect(0, 0, 256, 128); ctx.fillStyle = '#c8b0ff'; ctx.shadowColor = '#a080ff'; ctx.shadowBlur = 16;
        ctx.font = 'bold 110px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('∞', 128, 64);
      }), 0, 1.9, -45.96);
      const N = 260, pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { pos[i * 3] = rand(-2.4, 2.4); pos[i * 3 + 1] = MY + rand(0.1, 3.1); pos[i * 3 + 2] = rand(-45, 5); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      M.dust = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xc8b8ff, size: 0.035, transparent: true, opacity: 0.8, depthWrite: false }));
      M.dust.frustumCulled = false; g.add(M.dust);
    }
    // the exit hall: green EXIT signs, the light at the end of the forward passage
    {
      const g = group(0);
      const exitTex = txt(256, 64, (ctx) => {
        ctx.fillStyle = '#0a7a2a'; ctx.fillRect(0, 0, 256, 64); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 30px Arial'; ctx.fillText('ШЫҒУ ↑ EXIT', 128, 34);
      });
      for (const z of [-8, -20, -32]) { plane(g, 1.2, 0.3, exitTex, -2.465, 2.42, z, Math.PI / 2); plane(g, 1.2, 0.3, exitTex, 2.465, 2.42, z + 6, -Math.PI / 2); }
      plane(g, 3.4, 3.2, null, 7.28, 1.6, -43, -Math.PI / 2, { color: 0xf4fff0 });
    }
  };

  P.buildIntroProps = function () {
    const M = this.metro;
    const h = M.wagonHorse = makeHumanoid({ horse: true, skin: '#5a3418', suit: true, shirt: '#2a2a33', pants: '#22222a' });
    for (let k = 0; k < 3; k++) pose(h, 'sit', 1, 0, 0);
    h.root.visible = false; M.wagon.add(h.root);
    M.paperFront = paperTex(false); M.paperRules = paperTex(true);
    M.paper = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 0.54), mat('#ffffff', { map: M.paperFront, side: THREE.DoubleSide, unique: true }));
    h.root.add(M.paper);
  };

  // ================================================================ METRO: the escalator hall (the finale)
  P.buildEscalator = function () {
    const G = this.G, W = G.world, M = this.metro;
    const E = M.esc = { group: new THREE.Group(), figs: [], speed: 2.1 };
    const g = E.group; g.visible = false; G.scene.add(g);
    const len = Math.hypot(ESC_TOP, ESC_RISE), ang = Math.atan2(ESC_RISE, -ESC_TOP);
    E.yAt = (z) => (z >= 0 ? MY : z <= ESC_TOP ? MY + ESC_RISE : MY - z * SLOPE);
    const stone = mat('#4a4038'), wallM = mat('#ffffff', { map: M.themeTex[5] }), rail = mat('#1a1a1a'), steel = mat('#8a8e90'), ceilM = mat('#2a2420');
    // a slab parallel to the slope (cross-section w × h), raised yOff above the slope line
    const slab = (w, h, m, x, yOff) => { const b = box(w, h, len, m, x, MY + ESC_RISE / 2 + yOff, ESC_TOP / 2, false); b.rotation.x = ang; g.add(b); return b; };
    const stepTex = () => {
      const t = canvasTex(32, 32, (ctx) => {
        ctx.fillStyle = '#3a3c3e'; ctx.fillRect(0, 0, 32, 32); ctx.fillStyle = '#5a5e60';
        for (let x = 0; x < 32; x += 4) ctx.fillRect(x, 0, 2, 32);
        ctx.fillStyle = '#d8b020'; ctx.fillRect(0, 0, 32, 3); ctx.fillStyle = '#18191a'; ctx.fillRect(0, 28, 32, 4);
      });
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, len / 0.4); return t;
    };
    E.upTex = stepTex(); E.downTex = stepTex();
    slab(1.1, 0.06, mat('#ffffff', { map: E.upTex }), EX - 0.7, -0.01);
    slab(1.1, 0.06, mat('#ffffff', { map: E.downTex }), EX + 0.7, -0.01);
    slab(0.3, 1.0, steel, EX, 0.5);
    slab(0.14, 0.06, rail, EX - 0.12, 1.02); slab(0.14, 0.06, rail, EX + 0.12, 1.02);
    for (const s of [-1, 1]) {
      slab(0.12, 0.95, steel, EX + s * 1.32, 0.48);
      slab(0.16, 0.07, rail, EX + s * 1.32, 1.0);
      slab(0.85, 0.1, stone, EX + s * 1.82, -0.04);
      slab(0.2, 4.4, wallM, EX + s * 2.35, 2.0);
    }
    slab(4.9, 0.12, ceilM, EX, 4.1);
    // lamps on the median, every 3 m
    const lampM = basic('#ffe2a0');
    for (let z = -1.5; z > ESC_TOP + 0.5; z -= 3) {
      const y = E.yAt(z);
      g.add(cyl(0.03, 0.03, 1.1, 5, steel, EX, y + 1.55, z));
      g.add(box(0.16, 0.24, 0.16, lampM, EX, y + 2.2, z, false));
    }
    // meme adverts along the tunnel walls (tilted with the slope)
    const ads = [...(M.posterBase || []), ...(M.memePosters || [])];
    ads.forEach((tex, i) => {
      const s = i % 2 ? 1 : -1, z = -3 - i * 2.6;
      if (z < ESC_TOP + 2) return;
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.98), new THREE.MeshBasicMaterial({ map: tex }));
      p.position.set(EX + s * 2.235, E.yAt(z) + 1.75, z); p.rotation.set(ang, s < 0 ? Math.PI / 2 : -Math.PI / 2, 0); g.add(p);
    });
    // landings
    g.add(box(4.9, 0.1, 4.8, stone, EX, MY - 0.05, 2.3, false));
    g.add(box(4.9, 0.1, 10.8, stone, EX, MY + ESC_RISE - 0.05, ESC_TOP - 5.3, false));
    for (const s of [-1, 1]) {
      g.add(box(0.2, 4.4, 4.8, wallM, EX + s * 2.35, MY + 2.2, 2.3, false));
      g.add(box(0.2, 4.4, 10.8, wallM, EX + s * 2.35, MY + ESC_RISE + 2.2, ESC_TOP - 5.3, false));
    }
    g.add(box(4.9, 4.4, 0.2, wallM, EX, MY + 2.2, 4.7, false));
    g.add(box(4.9, 4.4, 0.2, wallM, EX, MY + ESC_RISE + 2.2, ESC_END - 0.1, false));
    g.add(box(4.9, 0.12, 4.8, ceilM, EX, MY + 4.2, 2.3, false));
    g.add(box(4.9, 0.12, 10.8, ceilM, EX, MY + ESC_RISE + 4.2, ESC_TOP - 5.3, false));
    // the doors to the surface: white light behind the glass
    const top = MY + ESC_RISE;
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ color: 0xfffaf0, fog: false }));
    glow.position.set(EX, top + 1.3, ESC_END + 0.03); g.add(glow);
    for (const x of [-1.36, 0, 1.36]) g.add(box(x ? 0.12 : 0.06, 2.7, 0.1, steel, EX + x, top + 1.35, ESC_END + 0.08, false));
    g.add(box(2.84, 0.12, 0.1, steel, EX, top + 2.66, ESC_END + 0.08, false));
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.5), new THREE.MeshBasicMaterial({ map: txt(256, 54, (ctx) => {
      ctx.fillStyle = '#0a7a2a'; ctx.fillRect(0, 0, 256, 54); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 26px Arial'; ctx.fillText('ЖЕР БЕТІ ↑ SURFACE', 128, 29);
    }) }));
    sign.position.set(EX, top + 3.2, ESC_END + 0.06); g.add(sign);
    E.doorLight = new THREE.PointLight(0xfff4e0, 0, 16, 1.4); E.doorLight.position.set(EX, top + 2.2, ESC_END + 2.2); G.scene.add(E.doorLight);
    // walls, the median and the balustrades are solid (the hall is far from the corridor and the wagon)
    const col = (x0, x1, z0, z1) => W.addCollider(x0, x1, z0, z1, MY - 1, MY + ESC_RISE + 5);
    col(EX - 2.6, EX - 2.25, ESC_END - 0.3, 4.9); col(EX + 2.25, EX + 2.6, ESC_END - 0.3, 4.9);
    col(EX - 2.6, EX + 2.6, 4.6, 4.9); col(EX - 2.6, EX + 2.6, ESC_END - 0.3, ESC_END);
    col(EX - 0.15, EX + 0.15, ESC_TOP, 0); col(EX - 1.38, EX - 1.26, ESC_TOP, 0); col(EX + 1.26, EX + 1.38, ESC_TOP, 0);
    // the slope is walkable
    W.floorFns.push((x, z) => (M.finale && Math.abs(x - EX) < 2.6 && z < 5 && z > ESC_END - 0.4 ? E.yAt(z) : null));
  };

  // ================================================================ METRO: station looks + difficulty
  P.applyTheme = function (lvl) {
    const M = this.metro, th = THEMES[lvl] || THEMES[5], L = this.G.lighting;
    if (!M.themeTex) return;
    M.wallMesh.material.map = M.themeTex[lvl] || M.themeTex[5];
    M.wallMesh.material.color.set('#ffffff');
    M.floorMesh.material.color.set(th.floor);
    M.ceilMesh.material.color.set(th.ceil);
    M.panelOn.color.set(th.panel);
    M.light.color.setHex(th.light);
    L.fog.color.set(th.fog); L.fog.density = th.density;
    for (const k in M.deco) M.deco[k].visible = Number(k) === lvl;
    M.theme = th; M.themeLvl = lvl;
  };

  const origReset = P.metroReset;
  P.metroReset = function () {
    origReset.call(this);
    if (this.G.map === 'metro') this.applyTheme(this.metro.level);
  };

  const origNewLoop = P.metroNewLoop;
  P.metroNewLoop = function () {
    const M = this.metro, d = DIFF[M.level] || DIFF[3];
    M.memeChance = d[0]; M.speedMul = d[1]; M.fuseMul = d[1];
    origNewLoop.call(this);
  };

  // ================================================================ METRO: the meme book
  P.collectMeme = function (id) {
    const M = this.metro, m = MEME_BY_ID[id];
    if (!m || this.G.map !== 'metro') return;
    if (!M.runMemes.has(id)) { M.runMemes.add(id); M.runOrder.push(id); }
    const book = loadJSON('cc4090-memes', {});
    if (book[id]) return;
    book[id] = 1; saveJSON('cc4090-memes', book);
    const n = memeBookCount();
    this.G.ui.toast(`📒 NEW MEME: ${m.e} ${m.n} (${n}/${MEMES.length})`);
    this.G.audio.beep(null, 1318, 0.08, 0.12, 'triangle');
    if (n >= MEMES.length) this.achieve('m_book');
  };

  P.toggleMemeBook = function () {
    const el = $('journal'), M = this.metro;
    const open = el.classList.contains('hidden');
    el.classList.toggle('hidden', !open);
    if (open) {
      el.innerHTML = `<h2>📒 MEME BOOK · МЕМ-ЖИНАҚ</h2><p class="jstats">Found <b>${memeBookCount()}</b> / ${MEMES.length} · this run <b>${M.runMemes.size}</b> · saved between runs</p>` +
        `<div class="memegrid">${memeGridHTML(M.runMemes)}</div><p class="jhint">J: close</p>`;
    }
  };

  const origTrans = P.metroTransition;
  P.metroTransition = function* (direction) {
    const G = this.G, M = this.metro;
    if (G.map === 'metro' && !M.busy) {
      if (M.anomaly) this.collectMeme(M.anomaly);
      if (M.level === 0 && direction === 'forward') { // the exit hall → the escalator
        M.busy = true;
        G.ui.fade(1, 0.3); yield 0.35;
        yield* this.escalatorTask();
        return;
      }
    }
    yield* origTrans.call(this, direction);
  };

  const origCaught = P.metroCaught;
  P.metroCaught = function (kind, dmg, msg) {
    const M = this.metro;
    if (this.G.map === 'metro' && M.active && !M.caught) { this.collectMeme(M.anomaly); M.lastCatch = M.anomaly; }
    origCaught.call(this, kind, dmg, msg);
  };

  const origWagon = P.wagonEventTask;
  P.wagonEventTask = function* () {
    const M = this.metro, ev = M.event;
    M.lastCatch = ev;
    yield* origWagon.call(this);
    this.collectMeme(ev);
  };

  // ================================================================ METRO: title-card backdrop, start, intro
  P.prepareMetroBackdrop = function () {
    const G = this.G, M = this.metro, L = G.lighting;
    L.moon.visible = false; L.hemi.intensity = 0.5;
    M.level = 5; this.metroReset();
    M.commuter.root.visible = false;
    M.hud.classList.add('hidden');
  };

  /** The slow camera move behind the METRO 404 title card: always the same horse, always 14 m ahead. */
  P.metroBackdrop = function (t) {
    const G = this.G, M = this.metro, cam = G.camera;
    const z = 3.5 - ((t * 0.55) % 30);
    cam.position.set(0.35 + Math.sin(t * 0.4) * 0.15, MY + 1.58 + Math.sin(t * 1.3) * 0.02, z);
    cam.rotation.set(-0.02, Math.sin(t * 0.17) * 0.12, 0);
    M.light.position.set(cam.position.x, MY + 2.6, cam.position.z); M.light.intensity = M.theme ? M.theme.li : 9;
    const h = M.horse;
    h.root.visible = true; h.root.position.set(1.0, MY, z - 14); h.root.rotation.y = 0;
    pose(h, 'stare', 0.016, t, 0);
  };

  P.prepareMetroMap = function () {
    this.metroMapStart = this.G.time;
    for (const id of ['compass', 'disks', 'minimap', 'bossbar', 'quest']) { const el = $(id); if (el) el.style.display = 'none'; }
  };

  P.startMetroMap = function () {
    this.prepareMetroMap();
    this.metro.horse.root.visible = false;
    this.task(this.metroIntroTask);
  };

  P.drawLed = function (text) {
    const M = this.metro, lc = M.ledCtx;
    lc.fillStyle = '#020'; lc.fillRect(0, 0, 512, 48); lc.fillStyle = '#ff9a20'; lc.textAlign = 'center'; lc.textBaseline = 'middle';
    fitText(lc, text, 500, 28); lc.fillText(text, 256, 25); M.ledTex.needsUpdate = true;
  };

  /** The last train: a few sleeping passengers and the horse commuter behind his newspaper. You sit opposite. */
  P.setupIntroWagon = function () {
    const M = this.metro, Pl = this.G.player, h = M.wagonHorse;
    M.pax.forEach((r, i) => {
      r.root.visible = i === 0 || i === 3 || i === 4;
      r.root.position.copy(r.home); r.root.rotation.y = r.home.x > WX ? -Math.PI / 2 : Math.PI / 2; r.body.rotation.set(0, 0, 0);
    });
    [M.cat, M.bear, M.bride, M.groom, ...M.guests].forEach((r) => (r.root.visible = false));
    M.cake.visible = false;
    // he sits turned towards you: the newspaper hides his face, and when it comes down he is looking right at you
    h.root.visible = true; h.root.position.set(WX + 1.15, MY, WZ1 - 5); h.root.rotation.y = Math.atan2(-1.65, -1.6);
    if (M.paper.parent !== h.root) h.root.add(M.paper);
    M.paper.material.map = M.paperFront; M.paper.visible = true;
    M.paper.position.set(0, 1.5, 0.6); M.paper.rotation.set(0, 0, 0); M.paperK = 0; M.paperDrop = false;
    M.wagonDark = false; M.wagonPanels.forEach((p) => (p.material = M.wagonPanelOn));
    this.drawLed('СОҢҒЫ ПОЙЫЗ · 03:33 · Келесі бекет: Райымбек батыр');
    Pl.pos.set(WX - 0.5, MY, WZ1 - 6.6); Pl.vel.set(0, 0, 0); Pl.yaw = Math.atan2(-(WX + 1.15 - Pl.pos.x), -(WZ1 - 5 - Pl.pos.z)); Pl.pitch = -0.04;
    Pl.height = 1.15; Pl.curHeight = 1.15; Pl.locked = true;
  };

  P.metroIntroTask = function* () {
    const G = this.G, M = this.metro, Pl = G.player;
    const wait = (s) => { const until = G.time + s; return () => M.introSkip || G.time >= until; };
    const pa = (kz, en) => {
      G.audio.beep(null, 660, 0.3, 0.2, 'triangle'); setTimeout(() => G.audio.beep(null, 523, 0.5, 0.2, 'triangle'), 320);
      G.ui.say(kz, '📢 Пойыз', 3.6, '#9cf'); G.audio.speak(en, { pitch: 1, rate: 0.95 });
    };
    G.ui.fade(1, 0.01);
    this.setupIntroWagon();
    M.intro = true; M.introSkip = false;
    $('skiphint').classList.remove('hidden');
    M.train = G.audio.loop('train', null);
    G.audio.setAmbient(0.05, 0.5);
    const scenes = function* () {
      G.ui.big('03:33', 2.6, 'clock');
      yield wait(2); if (M.introSkip) return;
      G.ui.fade(0, 2.2);
      yield wait(2.6); if (M.introSkip) return;
      pa('Құрметті жолаушылар! Бұл — соңғы пойыз. (Dear passengers, this is the last train.)', 'Dear passengers. This is the last train.');
      yield wait(4.4); if (M.introSkip) return;
      pa('Келесі бекет — Райымбек батыр. (Next station: Raiymbek Batyr.)', 'Next station: Raiymbek Batyr.');
      yield wait(3.6); if (M.introSkip) return;
      M.paperDrop = true; G.audio.whoosh(0.15);
      yield wait(1.8); if (M.introSkip) return;
      G.ui.say('...сен де адасып қалдың ба? (are you lost too?)', 'Horse', 3.4, '#e0a060'); G.audio.speak('Are you lost too?', { pitch: 0.2, rate: 0.75 });
      yield wait(3.6); if (M.introSkip) return;
      G.ui.say('Бұл метродан ешкім шыққан жоқ. Ешкім. (Nobody has ever left this metro. Nobody.)', 'Horse', 3.8, '#e0a060');
      yield wait(4); if (M.introSkip) return;
      // lights out
      M.wagonDark = true; M.wagonPanels.forEach((p) => (p.material = M.panelDark));
      G.audio.beep(null, 55, 0.7, 0.3, 'sawtooth'); G.audio.whoosh(0.5); Pl.scare(0.3);
      yield wait(1.4); if (M.introSkip) return;
      this.introVanish();
      M.wagonDark = false; M.wagonPanels.forEach((p) => (p.material = M.wagonPanelOn));
      G.audio.sting(0.35); Pl.scare(0.4); Pl.shake = 0.4;
      yield wait(1.4); if (M.introSkip) return;
      G.ui.say('(everyone is gone. The newspaper on the seat says: "SEE A MEME — TURN BACK!")', '', 4);
      yield wait(4.2); if (M.introSkip) return;
      G.audio.beep(null, 300, 0.6, 0.15, 'sawtooth');
      G.ui.say('Есіктер ашылады. (Doors opening.)', '📢 Пойыз', 2, '#9cf');
      yield wait(1.6);
    };
    yield* scenes.call(this);
    // into the station
    G.ui.fade(1, 0.35); yield 0.4;
    $('skiphint').classList.add('hidden');
    if (M.train) { M.train.stop(); M.train = null; }
    this.introVanish();
    M.intro = false; M.wagonDark = false; M.wagonPanels.forEach((p) => (p.material = M.wagonPanelOn));
    M.wagonLight.intensity = 0;
    M.paper.material.map = M.paperFront; M.paper.visible = false;
    Pl.height = 1.65; Pl.locked = false;
    yield* this.metroEnterTask();
  };

  /** Lights back on: the passengers and the horse are gone, only the newspaper is left (the rules page up). */
  P.introVanish = function () {
    const M = this.metro, h = M.wagonHorse;
    M.pax.forEach((r) => (r.root.visible = false));
    h.root.visible = false;
    M.wagon.add(M.paper); M.paper.visible = true;
    M.paper.material.map = M.paperRules;
    M.paper.position.set(WX + 1.3, MY + 0.84, WZ1 - 5); M.paper.rotation.set(0, -Math.PI / 2, 0); M.paper.rotateX(-0.25);
  };

  P.updateIntro = function (dt) {
    const G = this.G, M = this.metro, Pl = G.player, h = M.wagonHorse;
    M.light.intensity = 0;
    M.wagonLight.position.set(Pl.pos.x, MY + 2.2, Pl.pos.z);
    M.wagonLight.intensity = M.wagonDark ? 0 : Math.random() < 0.03 ? 2 : 7;
    for (const b of M.tunnelLights) { b.position.z -= 22 * dt; if (b.position.z < WZ0 - 4) b.position.z += 26; }
    Pl.shake = Math.max(Pl.shake, 0.05);
    M.pax.forEach((r) => { if (r.root.visible) pose(r, 'sleep', dt, G.time + r.home.z, 0); });
    if (h.root.visible) {
      pose(h, 'sit', dt, G.time, 0);
      if (M.paper.parent === h.root) {
        if (M.paperDrop) M.paperK = Math.min(1, M.paperK + dt / 1.4);
        const k = M.paperK * M.paperK * (3 - 2 * M.paperK);
        M.paper.position.set(0, 1.5 - 0.58 * k, 0.6 - 0.12 * k); M.paper.rotation.x = -1.25 * k;
        h.armL.rotation.x = h.armR.rotation.x = -1.3 * (1 - k) - 0.5 * k; // he holds the newspaper up, then lowers it
      }
    }
    if (!M.twist && G.input.hit('KeyE')) M.introSkip = true;
  };

  // ================================================================ METRO: the escalator finale
  P.makeParadeFigure = function (id) {
    const M = this.metro;
    let rig = null, obj = null, mode = 'wave';
    switch (id) {
      case 'x_horse': rig = makeHumanoid({ horse: true, skin: '#5a3418', suit: true, shirt: '#2a2a33', pants: '#22222a' }); break;
      case 'x_crew67': rig = makeHumanoid({ outfit: 'hoodie', hair: 'buzz' }); mode = 'sixseven'; break;
      case 'x_buddy': rig = makeHumanoid({ shirt: '#e0e0e0', pants: '#2a4a2a', hat: 'cap', capColor: '#2a8a2a', fat: 1.05, outfit: 'tshirt' }); break;
      case 'x_bananas': rig = makeHumanoid({ animal: 'monkey', skin: '#6a4020', shirt: '#6a4020', pants: '#6a4020', fat: 1.1 }); mode = 'laugh'; break;
      case 'x_faceless': rig = makeHumanoid({ suit: true, shirt: '#2a2a33', pants: '#22222a', faceless: true, skin: '#e2e0d6', hair: 'short' }); break;
      case 'bars': rig = makeHumanoid({ animal: 'leopard', skin: '#e2d2a2', outfit: 'hoodie', shirt: '#1a1a1a', pants: '#2a2a4a', hat: 'cap', capColor: '#d02020' }); mode = 'rap'; break;
      case 'karate': rig = makeHumanoid({ animal: 'cat', skin: '#d08a3a', shirt: '#f4f4f0', pants: '#f4f4f0', outfit: 'plain' }); mode = 'fight'; break;
      case 'dad': rig = makeHumanoid({ animal: 'kangaroo', skin: '#9a6a3a', shirt: '#9a6a3a', pants: '#9a6a3a', buff: true, scale: 1.45, fat: 1.15 }); mode = 'flex'; break;
      case 'clap': rig = makeHumanoid({ animal: 'cat', skin: '#222', outfit: 'jacket', shirt: '#2a2a2a', pants: '#111' }); mode = 'clap'; break;
      case 'bear': rig = makeHumanoid({ animal: 'bear', skin: '#eeece4', shirt: '#eeece4', pants: '#eeece4', fat: 1.5, scale: 1.1 }); break;
      case 'coderot': rig = makeHumanoid({ suit: true, shirt: '#2a2a33', pants: '#22222a', hair: 'short' }); mode = 'tpose'; break;
      case 'oylashy': rig = makeHumanoid({ faceless: true, skin: '#bab6aa', shirt: '#0a0a0a', pants: '#0a0a0a', hair: 'long', hairColor: '#000' }); mode = 'stare'; break;
      case 'x_cart': obj = makeShopCart(); break;
      case 'manager': obj = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.3), new THREE.MeshBasicMaterial({ map: this.zone.mgrTex, transparent: true, side: THREE.DoubleSide })); obj.userData.billboard = true; break;
      default: { // everyone else rides down holding a cardboard sign
        rig = makeHumanoid({ ...randomLook(), outfit: pick(['jacket', 'hoodie', 'shirt']) }); mode = 'carry';
        const s = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.48), new THREE.MeshBasicMaterial({ map: signTex(MEME_BY_ID[id]), side: THREE.DoubleSide }));
        s.position.set(0, 1.42, 0.45); rig.root.add(s);
      }
    }
    const root = rig ? rig.root : obj;
    M.esc.group.add(root);
    return { id, rig, root, mode, lift: obj && obj.userData.billboard ? 0.9 : 0 };
  };

  P.spawnParade = function () {
    const M = this.metro, E = M.esc;
    E.figs.forEach((f) => E.group.remove(f.root));
    let ids = M.runOrder.slice(-8);
    if (ids.length < 3) ids = [...new Set([...ids, 'x_horse', 'x_crew67', 'x_buddy'])].slice(0, 3);
    E.figs = ids.map((id, i) => ({ ...this.makeParadeFigure(id), z: ESC_TOP + 1.5 + i * 3.2 }));
    E.frozen = false; E.backT = 0;
  };

  P.escalatorTask = function* () {
    const G = this.G, M = this.metro, E = M.esc, Pl = G.player, L = G.lighting;
    M.finale = true; M.hud.classList.add('hidden');
    if (M.buzz) { M.buzz.stop(); M.buzz = null; }
    M.root.visible = false; E.group.visible = true;
    L.fog.color.set('#120e0a'); L.fog.density = 0.02;
    M.light.color.setHex(0xffe2b0);
    this.spawnParade();
    Pl.pos.set(EX - 0.7, MY, 1.8); Pl.vel.set(0, 0, 0); Pl.yaw = 0; Pl.pitch = 0.12; Pl.locked = true;
    E.riding = true;
    E.hum = G.audio.loop('hum', null);
    this.updateQuest();
    yield 0.3;
    G.ui.fade(0, 1.4);
    G.ui.big('ЖЕР БЕТІНЕ ↑', 2.4, 'green');
    this.after(2.4, () => G.ui.say('(the escalator takes you up. Every meme you met rides down past you. Do not look back.)', '', 4));
    yield () => Pl.pos.z <= ESC_TOP - 0.6;
    E.riding = false; Pl.locked = false;
    E.doorLight.intensity = 9;
    G.ui.toast('The exit. Walk into the light ↑');
    yield () => Pl.pos.z < ESC_END + 2.6;
    yield* this.surfaceTwistTask();
  };

  P.updateEscalator = function (dt) {
    const G = this.G, M = this.metro, E = M.esc, Pl = G.player;
    M.light.position.set(Pl.pos.x, Pl.pos.y + 2.4, Pl.pos.z);
    M.light.intensity = E.flick > 0 ? (Math.random() < 0.5 ? 0.5 : 7) : 7.5;
    E.flick = Math.max(0, (E.flick || 0) - dt);
    E.upTex.offset.y -= E.speed * dt / 0.4;
    if (!E.frozen) E.downTex.offset.y += 1.25 * dt / 0.4;
    if (E.riding && Pl.pos.z < 2.5 && Pl.pos.z > ESC_TOP - 1) {
      Pl.pos.z -= E.speed * dt;
      Pl.pos.x += (EX - 0.7 - Pl.pos.x) * Math.min(1, dt * 3);
    }
    // the parade rides down on the other side and turns to watch you
    E.figs.forEach((f, i) => {
      if (!E.frozen) f.z += 1.25 * dt;
      if (f.z > 4) { f.root.visible = false; return; }
      f.root.position.set(EX + 0.7, E.yAt(f.z) + f.lift, f.z);
      const near = Math.abs(f.z - Pl.pos.z) < 7 || f.z > Pl.pos.z;
      if (f.root.userData.billboard) f.root.lookAt(G.camera.position);
      else f.root.rotation.y = near ? Math.atan2(Pl.pos.x - f.root.position.x, Pl.pos.z - f.root.position.z) : 0;
      if (f.rig) pose(f.rig, E.frozen ? 'stare' : f.mode, dt, G.time + i, 0);
    });
    // do not look back
    const fwd = this.playerFwd();
    if (E.riding && !E.frozen && fwd.z > 0.55 && E.figs.some((f) => f.root.visible && f.z > Pl.pos.z)) {
      E.backT += dt;
      if (E.backT > 0.7) {
        E.frozen = true; E.flick = 1.2;
        G.audio.reverseWhisper(Pl.pos.clone().setY(Pl.pos.y + 1.6), 0.5); G.audio.infrasound(4, 0.5); Pl.scare(0.5);
        G.ui.say('(they all stopped. They are all looking at you.)', '', 3.5);
        this.achieve('m_lookback');
      }
    } else E.backT = 0;
  };

  P.surfaceTwistTask = function* () {
    const G = this.G, M = this.metro, E = M.esc, Pl = G.player;
    if (M.twist) return;
    M.twist = true; Pl.locked = true;
    const wf = $('whiteflash');
    G.audio.choir(3); G.ui.big('ЖЕР БЕТІ ↑', 2.4, 'green');
    wf.style.transition = 'opacity 1.6s'; wf.style.opacity = '1';
    this.achieve('metro'); if (!M.mistakes) this.achieve('metroPerfect'); this.achieve('m_twist');
    if (this.addAura) this.addAura(2000, 'escaped the metro');
    yield 2.2;
    G.audio.setAmbient(0, 0.5);
    if (E.hum) { E.hum.stop(); E.hum = null; }
    yield 1.2;
    // ...the chime. The same voice.
    G.audio.beep(null, 660, 0.3, 0.2, 'triangle'); setTimeout(() => G.audio.beep(null, 523, 0.5, 0.2, 'triangle'), 320);
    G.ui.say('Келесі бекет — Райымбек батыр. (Next station: Raiymbek Batyr.)', '📢 Пойыз', 3.4, '#9cf');
    G.audio.speak('Next station: Raiymbek Batyr.', { pitch: 0.9, rate: 0.95 });
    yield 1.4;
    // back in the last train: same seat, same horse, same newspaper
    M.finale = false; E.group.visible = false; E.doorLight.intensity = 0;
    this.setupIntroWagon(); M.intro = true;
    M.train = G.audio.loop('train', null);
    wf.style.transition = 'opacity 1.4s'; wf.style.opacity = '0';
    yield 2.2;
    M.paperDrop = true;
    yield 1.7;
    G.ui.say('...қайта келдің бе? (you are back?)', 'Horse', 3, '#e0a060'); G.audio.speak('You are back.', { pitch: 0.2, rate: 0.7 });
    yield 2.4;
    M.wagonDark = true; M.wagonPanels.forEach((p) => (p.material = M.panelDark));
    G.audio.sting(0.6); G.ui.fade(1, 0.15);
    yield 1.4;
    if (M.train) { M.train.stop(); M.train = null; }
    M.intro = false;
    this.metroMapWin();
  };

  P.metroMapWin = function () {
    const G = this.G, M = this.metro, t = G.time - (this.metroMapStart || 0);
    G.state = 'won';
    G.input.unlock();
    M.hud.classList.add('hidden'); G.ui.hide('hud'); $('journal').classList.add('hidden');
    for (const s of ['train', 'buzz']) if (M[s]) { M[s].stop(); M[s] = null; }
    const best = loadJSON('cc4090-metro', null);
    const better = !best || M.mistakes < best.mistakes || (M.mistakes === best.mistakes && t < best.time);
    if (better) saveJSON('cc4090-metro', { mistakes: M.mistakes, time: Math.round(t) });
    $('end-title').textContent = 'YOU ESCAPED METRO 404';
    $('end-stats').textContent = `Time ${fmt(t)} · Caught ${M.mistakes}× · Stations 5/5 · Memes this run ${M.runMemes.size}`;
    $('end-rank').textContent = `AURA ${this.aura || 0} 🗿 · 📒 ${memeBookCount()}/${MEMES.length}${better ? ' · NEW BEST!' : ''}`;
    $('end-tag').textContent = '...or did you? 📢 «Келесі бекет — Райымбек батыр.»';
    $('end-memes').innerHTML = memeGridHTML(M.runMemes);
    G.ui.fade(0, 0.6);
    G.ui.show('ending');
  };

  /** Text for the METRO 404 game-over screen. */
  P.metroDeathReport = function () {
    const G = this.G, M = this.metro, t = G.time - (this.metroMapStart || 0), k = MEME_BY_ID[M.lastCatch];
    const where = M.level === 0 ? 'the exit hall' : `${6 - M.level}/5 · ${NAMES[M.level]}`;
    return {
      title: 'YOU DIED IN METRO 404',
      cause: k ? `${k.e} ${k.n}` : 'pure terror in the dark',
      joke: pick(['Келесі бекет — ешқайда. (Next station: nowhere.)', 'The horse got his cart back.', 'Your Kaspi balance: −40 900 ₸.',
        'The 67 crew says: six... seven...', 'Next time: turn back EARLIER.', 'Mewing streak: broken. Metro streak: also broken.']),
      stats: `Reached ${where} · Time ${fmt(t)} · Caught ${M.mistakes}× · Memes this run ${M.runMemes.size}`,
      rank: `AURA ${this.aura || 0} 🗿 · 📒 ${memeBookCount()}/${MEMES.length}`,
      memes: memeGridHTML(M.runMemes),
    };
  };

  // ================================================================ METRO: per frame
  const origMetro = P.updateMetro;
  P.updateMetro = function (dt) {
    const M = this.metro;
    if (this.G.map !== 'metro') { origMetro.call(this, dt); return; }
    if (M.intro) { this.updateIntro(dt); return; }
    if (M.finale) { this.updateEscalator(dt); return; }
    origMetro.call(this, dt);
    if (!M.active || M.riding || !M.theme) return;
    if (!M.dark && !M.dark18) {
      let li = M.theme.li;
      if (M.theme.flicker) { // Tunnel 404: the emergency light stutters
        M.flk = (M.flk || 0) - dt;
        if (M.flk <= 0) { M.flk = rand(0.05, 0.4); M.flkOn = Math.random() > 0.13; }
        if (!M.flkOn) li *= 0.18;
      }
      M.light.intensity = li;
    }
    if (M.themeLvl === 1 && M.dust) { const a = M.dust.geometry.attributes.position; for (let i = 1; i < a.array.length; i += 3) { a.array[i] += dt * 0.06; if (a.array[i] > MY + 3.1) a.array[i] = MY + 0.1; } a.needsUpdate = true; }
    const lvl = M.level, dots = [5, 4, 3, 2, 1].map((l) => (l > lvl ? '●' : l === lvl ? '◉' : '○')).join(' ');
    M.hud.innerHTML = `<b>METRO 404 · ${lvl === 0 ? 'EXIT HALL · ЖЕР БЕТІНЕ ШЫҒУ' : `${6 - lvl}/5 ${NAMES[lvl]}`}</b> <span class="mdots">${dots}</span> · caught ${M.mistakes}` +
      `<br><small>${lvl === 0 ? 'Walk forward to the escalator ↑' : 'No meme → forward to the train · A MEME → turn back before it becomes a SCREAMER'} · J: meme book</small>`;
  };

  const origQuest = P.updateQuest;
  P.updateQuest = function () {
    const M = this.metro;
    if (this.G.map === 'metro' && M && M.finale) { this.G.ui.quest('<b>OBJECTIVE</b><br>Ride up to the <span class="g">surface</span>.<br><small>Do not look back.</small>'); return; }
    origQuest.call(this);
  };

  const origUpdate = P.update;
  P.update = function (dt) {
    origUpdate.call(this, dt);
    const G = this.G;
    if (G.map !== 'metro' || this.ended || G.state !== 'play') return;
    if (G.input.hit('KeyJ')) this.toggleMemeBook();
    if (G.frame % 30 === 0) { const mins = 33 + Math.floor(G.time / 60); G.ui.clock(`0${3 + Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')} AM`); }
  };
}
