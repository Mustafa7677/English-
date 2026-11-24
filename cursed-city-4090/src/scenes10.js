// Chapter 10: "нежданчик" — unexpected screamers.
// Rules: no warning silence, they hit during funny or ordinary moments, sometimes as a
// second hit right after you relaxed, and sometimes inside the UI itself.
//
//  1. Cat boss: after the joke, an "ACHIEVEMENT UNLOCKED: Secret found" pops up... and screams.
//  2. Taxi ride: something slams into the passenger window from outside.
//  3. Dancer: the second time he runs at you, he does not stop.
//  4. Laundromat: the 4th washing machine — "check it" — a face is pressed against the glass.
//  5. The friendly shopping cart: look back at it and something is sitting inside.
//  6. Bus stop: when the ghost bus leaves, one passenger stayed... right behind you.
//  7. Basement: you climbed out, you are safe... it climbed out with you.
//  8. Map (M): a red figure walks across the map towards your arrow.
//  9. Pause menu: a face slowly appears behind the menu. When you press RESUME...
// All lunges now use painted horror faces (two glitching frames) instead of box heads.
import * as THREE from 'three';
import { makeHumanoid, pose } from './characters.js';
import { ACH } from './scenes2.js';
import { rand, pick } from './util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

Object.assign(ACH, {
  nej1: ['Not A Secret', 'Trust no achievement'],
  nej2: ['Window Seat', 'Something wanted a ride'],
  nej3: ['He Did Not Stop', 'The dancer, again'],
  nej4: ['Delicate Cycle', 'Check the fourth washing machine'],
  nej5: ['Passenger', 'Look into the shopping cart'],
  nej6: ['Missed The Bus', 'Not everyone got on the bus'],
  nej7: ['Followed You Up', 'It climbed out with you'],
  nej8: ['You Are Here', 'Something on the map'],
  nej9: ['Do Not Pause', 'Resume. If you dare.'],
});

const PAL = {
  caretaker: ['#d9d6c8', '#6a665c', null], crawler: ['#a3ad97', '#36402f', null], butcher: ['#c9977a', '#4a261a', null],
  poster: ['#ece9e0', '#7c7870', '#050505'], pale: ['#e4e1d8', '#6e6a60', '#0a0a0a'], mannequin: ['#d8c4a2', '#6e5e44', null],
  dancer: ['#c99572', '#4a2e1a', '#1a1410'],
  horse: ['#9a6a3e', '#3a200e', '#140a04'], leopard: ['#e6d8a8', '#6a5a30', null], fruit: ['#e83848', '#5a0a14', null],
};

/** Paint a horror face (transparent background). variant 1 = glitched/stretched frame. */
function paintFace(kind, variant) {
  const W = 512, H = 640, c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const [light, darkC, hair] = PAL[kind] || PAL.pale;
  const mouthH = variant ? 150 : 120;
  ctx.save(); ctx.translate(W / 2, H / 2 - 30);
  // head silhouette with a long jaw
  ctx.beginPath();
  ctx.ellipse(0, -40, 175, 215, 0, Math.PI, 0);
  ctx.bezierCurveTo(175, 120, 120, 300, 0, 320);
  ctx.bezierCurveTo(-120, 300, -175, 120, -175, -40);
  ctx.closePath();
  const g = ctx.createRadialGradient(0, -30, 20, 0, 10, 300); g.addColorStop(0, light); g.addColorStop(1, darkC);
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  // skin texture + veins
  for (let i = 0; i < 5000; i++) { ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.08})`; ctx.fillRect(rand(-180, 180), rand(-260, 320), 2, 2); }
  ctx.strokeStyle = 'rgba(70,20,60,0.35)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 26; i++) {
    const a = rand(0, Math.PI * 2), r = 200;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.bezierCurveTo(rand(-120, 120), rand(-150, 200), rand(-100, 100), rand(-100, 150), rand(-60, 60), rand(-60, 120)); ctx.stroke();
  }
  // eye sockets — deep black holes
  const eyes = kind === 'crawler' ? [[-70, -50, 62], [70, -50, 62], [-40, -150, 26], [40, -150, 26], [0, -110, 20]] : [[-72, -50, 70], [72, -50, 70]];
  for (const [x, y, r] of eyes) {
    const eg = ctx.createRadialGradient(x, y, 2, x, y, r); eg.addColorStop(0, 'rgba(0,0,0,1)'); eg.addColorStop(0.55, 'rgba(0,0,0,0.97)'); eg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = eg; ctx.beginPath(); ctx.ellipse(x, y, r, r * (variant ? 1.25 : 1.05), 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = kind === 'crawler' ? '#ff2a1a' : '#ffffff';
    ctx.beginPath(); ctx.arc(x + (variant ? -6 : 8), y - 6, Math.max(2, r * 0.07), 0, Math.PI * 2); ctx.fill();
    // black tears
    ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(x - 6, y + r * 0.6); ctx.bezierCurveTo(x - 10, y + 80, x + 6, y + 120, x - 4, y + 170 + rand(0, 60)); ctx.stroke();
  }
  // nose slits
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.beginPath(); ctx.ellipse(-12, 40, 6, 14, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(12, 40, 6, 14, -0.3, 0, Math.PI * 2); ctx.fill();
  // huge mouth
  const my = 150 + (variant ? 15 : 0);
  const mg = ctx.createRadialGradient(0, my, 10, 0, my, 110); mg.addColorStop(0, '#000'); mg.addColorStop(0.8, '#120000'); mg.addColorStop(1, '#4a0a0a');
  ctx.fillStyle = mg; ctx.beginPath(); ctx.ellipse(0, my, 82, mouthH, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d8d0a8';
  for (let i = 0; i < 13; i++) {
    if (Math.random() < 0.12) continue;
    const x = -70 + i * 11.6, top = my - mouthH * Math.sqrt(Math.max(0, 1 - (x / 82) ** 2)) + 4, len = rand(18, 40);
    ctx.beginPath(); ctx.moveTo(x - 5, top); ctx.lineTo(x + 5, top); ctx.lineTo(x + rand(-2, 2), top + len); ctx.fill();
    const bot = my + mouthH * Math.sqrt(Math.max(0, 1 - (x / 82) ** 2)) - 4, blen = rand(14, 34);
    ctx.beginPath(); ctx.moveTo(x - 5, bot); ctx.lineTo(x + 5, bot); ctx.lineTo(x + rand(-2, 2), bot - blen); ctx.fill();
  }
  // cracks
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) { let x = rand(-120, 120), y = rand(-220, -120); ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 6; k++) { x += rand(-18, 18); y += rand(10, 30); ctx.lineTo(x, y); } ctx.stroke(); }
  ctx.restore();
  // hair
  if (hair) {
    ctx.fillStyle = hair;
    ctx.beginPath(); ctx.ellipse(0, -170, 190, 110, 0, Math.PI, 0); ctx.fill();
    for (let i = 0; i < 40; i++) { const x = rand(-200, 200); if (Math.abs(x) < 95 && Math.random() < 0.75) continue; ctx.fillRect(x, -200, rand(6, 14), rand(250, 480)); }
  }
  ctx.restore();
  // edge darkening
  const vg = ctx.createRadialGradient(W / 2, H / 2, 150, W / 2, H / 2, 380); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
  // glitch slices on the second frame
  if (variant) for (let i = 0; i < 9; i++) { const y = Math.floor(rand(0, H - 30)), h = Math.floor(rand(6, 28)); const img = ctx.getImageData(0, y, W, h); ctx.clearRect(0, y, W, h); ctx.putImageData(img, Math.floor(rand(-40, 40)), y); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const faceCache = {};
export function faceTextures(kind) { return faceCache[kind] || (faceCache[kind] = [paintFace(kind, 0), paintFace(kind, 1)]); }

export function extendDirector10(D) {
  const P = D.prototype;
  const origInit = P.init;
  P.init = function () { origInit.call(this); this.initChapter10(); };
  const origUpdate = P.update;
  P.update = function (dt) { origUpdate.call(this, dt); if (!this.ended) this.updateChapter10(dt); };

  // ---------------------------------------------------------------- the new lunge (painted faces)
  P.lunge = function* (kind, dmg = 0) {
    const G = this.G, Pl = G.player, cam = G.camera;
    if (Pl.hiding || G.state !== 'play') return;
    const [t1, t2] = faceTextures(kind);
    const m = new THREE.MeshBasicMaterial({ map: t1, transparent: true, depthTest: false, depthWrite: false, fog: false });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.25), m); plane.renderOrder = 1001;
    plane.position.set(rand(-0.1, 0.1), 0.02, -3.4); plane.scale.setScalar(0.3);
    cam.add(plane);
    G.audio.bigScream(1); G.audio.sting(0.6);
    G.ui.hurt(30); G.ui.glitch(1); Pl.shake = 1.2; Pl.scare(1);
    this.zoomTo(48, 0.9);
    let t = 0, swap = 0;
    while (t < 0.9) {
      t += G.dt; swap -= G.dt;
      const k = Math.min(1, t / 0.11);
      plane.position.z = -3.4 + (3.4 - 0.92) * k * k;
      plane.scale.setScalar(0.3 + 0.7 * k + Math.sin(t * 60) * 0.02);
      plane.position.x = (Math.random() - 0.5) * 0.05 * k; plane.position.y = 0.02 + (Math.random() - 0.5) * 0.05 * k;
      plane.rotation.z = (Math.random() - 0.5) * 0.12;
      if (swap <= 0) { swap = rand(0.03, 0.08); m.map = m.map === t1 ? t2 : t1; }
      plane.visible = t < 0.25 || Math.random() > 0.15;
      yield 0;
    }
    cam.remove(plane); plane.geometry.dispose(); m.dispose();
    G.ui.glitch(0);
    if (dmg) Pl.damage(dmg, null, kind === 'caretaker' ? 'ghost' : 'fear');
    this.blackout = Math.max(this.blackout, 0.2);
    G.audio.tinnitus(3.5);
    this.repeat(5, 0.4, () => G.audio.heartbeat(0.8));
    if (this.stats) this.stats.scares++;
  };
  P.scareNow = function (kind, ach, dmg = 0) {
    this.task(function* () { yield* this.lunge(kind, dmg); if (ach) this.achieve(ach); });
  };

  // ---------------------------------------------------------------- 3. dancer: the second time he does not stop
  const origDancer = P.dancerAI;
  P.dancerAI = function (n, dt) {
    const before = n.mem.state;
    origDancer.call(this, n, dt);
    if (before === 'dance' && n.mem.state === 'run') {
      this.c10.dance = (this.c10.dance || 0) + 1;
      if (this.c10.dance === 2) {
        n.stopScript();
        const D2 = this, G = this.G;
        n.run(function* (nn) {
          yield { type: 'face', target: 'player', t: 0.2, anim: 'stare' };
          yield { type: 'wait', t: 0.6, anim: 'stare', look: 'player' };
          yield { type: 'chase', dur: 4, speed: 15, reach: 1.2, anim: 'run' };
          yield { type: 'call', fn: () => { D2.scareNow('dancer', 'nej3', 8); nn.mem.state = 'dance'; nn.mem.cool = G.time + 120; } };
          yield { type: 'move', x: G.world.spots.dancer.x, z: G.world.spots.dancer.z, speed: 1.5, anim: 'walk', timeout: 30 };
        });
      }
    }
  };

  P.initChapter10 = function () {
    const G = this.G, W = G.world;
    this.c10 = { prevBasement: false, mapT: 0, catAt: 0 };
    // paint the faces ahead of time so the first scare does not hitch
    setTimeout(() => ['pale', 'crawler', 'caretaker', 'mannequin', 'butcher', 'poster', 'dancer', 'horse', 'leopard', 'fruit'].forEach(faceTextures), 4000);
    // 4. the fourth washing machine
    const w4 = W.washers[3];
    W.addInteract({
      pos: w4.front.clone().setY(0.8), r: 2.4, label: 'Check the washing machine',
      enabled: () => this.c6 && this.c6.laundryVisited && !this.c10.washer,
      act: () => { this.c10.washer = true; G.audio.clank(w4.g.position, 0.3); this.scareNow('crawler', 'nej4', 6); },
    });
    // 9. the pause menu (a face slowly appears behind the menu; RESUME releases it)
    const pf = document.createElement('canvas'); pf.width = 512; pf.height = 640; pf.id = 'pauseface';
    document.getElementById('pause').prepend(pf);
    const origLock = G.input.onLockChange;
    G.input.onLockChange = (locked) => {
      origLock(locked);
      if (!locked && G.state === 'paused' && G.time > 420 && !this.c10.pause && !this.ended) {
        this.c10.pauseArmed = setTimeout(() => {
          if (G.state !== 'paused') return;
          const img = faceTextures('pale')[0].image;
          pf.getContext('2d').drawImage(img, 0, 0);
          pf.classList.add('show');
          this.c10.pauseShown = true;
        }, 5000);
      }
      if (locked && this.c10.pauseShown && !this.c10.pause) {
        this.c10.pause = true; this.c10.pauseShown = false;
        pf.classList.remove('show');
        setTimeout(() => this.scareNow('pale', 'nej9'), 350);
      } else if (locked) clearTimeout(this.c10.pauseArmed);
    };
  };

  // ---------------------------------------------------------------- 8. the map
  const origMap = P.updateMinimap;
  P.updateMinimap = function (dt) {
    origMap.call(this, dt);
    const G = this.G, c = this.c10;
    if (!this.mapOn || c.map || G.time < 300 || !this.mapCtx) { if (!this.mapOn) c.mapT = 0; return; }
    c.mapT += dt;
    if (c.mapT < 1.2) return;
    const Pl = G.player, m = this.mapM;
    if (!c.mapFrom) { const a = rand(0, Math.PI * 2); c.mapFrom = V(Pl.pos.x + Math.cos(a) * 45, 0, Pl.pos.z + Math.sin(a) * 45); }
    const p = Math.min(1, (c.mapT - 1.2) / 3.2);
    const x = c.mapFrom.x + (Pl.pos.x - c.mapFrom.x) * p, z = c.mapFrom.z + (Pl.pos.z - c.mapFrom.z) * p;
    const ctx = this.mapCtx;
    ctx.fillStyle = '#ff1010';
    ctx.beginPath(); ctx.arc(m(x), m(z) - 6, 3, 0, 7); ctx.fill(); ctx.fillRect(m(x) - 2, m(z) - 3, 4, 8);
    ctx.font = 'bold 8px monospace'; ctx.fillText('?', m(x) + 5, m(z) - 6);
    if (p >= 1) {
      c.map = true; this.mapOn = false; document.getElementById('minimap').classList.add('hidden');
      this.scareNow('pale', 'nej8', 5);
    }
  };

  // ---------------------------------------------------------------- per-frame triggers
  P.updateChapter10 = function (dt) {
    const G = this.G, Pl = G.player, c = this.c10, W = G.world;
    if (G.state !== 'play') return;

    // 1. cat boss: a fake achievement screams at you
    if (!c.cat && this.ach && this.ach.catboss && this.cat && this.cat.distToPlayer() < 18) {
      if (!c.catAt) c.catAt = G.time + rand(7, 11);
      else if (G.time > c.catAt) {
        c.cat = true;
        G.ui.achievement('SECRET FOUND', 'You found the secret ending. Look closer.');
        G.audio.beep(null, 1046, 0.12, 0.15, 'triangle');
        this.after(1.8, () => this.scareNow('pale', 'nej1'));
      }
    }

    // 2. taxi: something slams into the passenger window
    const T = this.taxi;
    if (!c.taxi && Pl.inVehicle === T && T.crashed && T.state === 'driving' && T.group.position.x > 22) {
      c.taxi = true;
      G.audio.thud(T.group.position.clone().setY(1.4), 1.2); G.audio.clank(T.group.position.clone().setY(1.4), 0.8);
      Pl.shake = 0.8;
      this.scareNow('caretaker', 'nej2', 0);
    }

    // 5. the friendly shopping cart
    const pc = this.petCart;
    if (!c.cart && pc && pc.state === 'follow') {
      c.cartFollow = (c.cartFollow || 0) + dt;
      const seen = this.lookingAt(pc.g.position.clone().setY(0.8), 0.6);
      c.cartUnseen = seen ? 0 : (c.cartUnseen || 0) + dt;
      if (c.cartFollow > 20 && c.cartUnseen > 2.5 && !c.cartRig) {
        const r = c.cartRig = makeHumanoid({ mannequin: true, eyesGlow: '#ff1010', scale: 0.8 });
        for (let i = 0; i < 3; i++) pose(r, 'sitground', 1, 0, 0);
        r.head.rotation.x = -0.7; r.root.position.set(0, 0.55, 0.05); pc.g.add(r.root);
      }
      if (c.cartRig && seen && pc.g.position.distanceTo(Pl.pos) < 6) {
        c.cart = true;
        this.after(0.45, () => { this.scareNow('mannequin', 'nej5', 4); });
        this.after(1.5, () => { pc.g.remove(c.cartRig.root); });
      }
    }

    // 6. bus stop: one passenger stayed behind
    if (!c.bus && this.bus && this.bus.state === 'leave' && Pl.pos.distanceTo(W.spots.bench) < 14 && !c.busMan) {
      const f = this.playerFwd();
      const p = Pl.pos.clone().addScaledVector(f, -1.3);
      const n = c.busMan = this.addNPC(makeHumanoid({ mannequin: true, eyesGlow: '#ff2020' }), { pos: p, ai: 'stare', name: 'Passenger' });
      n.mem.noHorror = true; n.facePlayer(); c.busT = G.time;
    }
    if (c.busMan && !c.bus) {
      if (this.lookingAt(c.busMan.pos.clone().setY(1.6), 0.55)) {
        c.bus = true; this.scareNow('mannequin', 'nej6', 5);
        const n = c.busMan; this.after(0.9, () => { this.hide(n); n.remove(); });
      } else if (G.time - c.busT > 25) { c.bus = true; this.hide(c.busMan); c.busMan.remove(); }
    }

    // 7. basement: it climbed out with you
    const inB = Pl.inBasement();
    if (c.prevBasement && !inB && this.c7 && this.c7.crawler && !c.ladder) {
      c.ladder = true;
      this.after(0.7, () => this.scareNow('crawler', 'nej7', 6));
    }
    c.prevBasement = inB;
  };
}
