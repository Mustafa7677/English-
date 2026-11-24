// Chapter 8: boss fight, dynamic music, rain & lightning, fake-out scares, minimap (M),
// difficulty and persistent achievements / best score.
import * as THREE from 'three';
import { makeHumanoid, makeRTX } from './characters.js';
import { ACH } from './scenes2.js';
import { DEATHS } from './scenes3.js';
import { mat, basic, box, rand, pick, angleWrap } from './util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

Object.assign(ACH, {
  bossKill: ['Unplugged', 'Defeat the giant NVIDIA Guard-Bot'],
  golden: ['Golden Sample', 'Take the GOLDEN 4090'],
  storm: ['Lightning Never Lies', 'See the giant in the lightning'],
  fake: ['It Was Nothing', 'Survive a scare that never came'],
  map: ['Cartographer', 'Open the map'],
});
Object.assign(DEATHS, {
  gpu: ['Hit by a flying graphics card.', 'At least it was a high-end one.'],
});

const LANDMARKS = [
  ['NVIDIA', 31, -38, '#76ff03'], ['KINDERGARTEN', -30, -31, '#ff5050'], ['MARKET', -33, 30, '#ff8080'],
  ['GYM', 18, 82, '#ffb040'], ['LAUNDRY', 42, 82, '#9cf'], ['GAS', 36, 30, '#ff8a00'], ['WC', 12.5, 46, '#9cf'],
  ['TAXI', -6, 48, '#e0c000'], ['BUS', 9, -45, '#8af'], ['GATE', 0, -110, '#fff'],
];

const loadJSON = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const saveJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } };

export function extendDirector8(D) {
  const P = D.prototype;
  const origInit = P.init;
  P.init = function () { origInit.call(this); this.initChapter8(); };
  const origUpdate = P.update;
  P.update = function (dt) { origUpdate.call(this, dt); this.updateChapter8(dt); };
  const origAchieve = P.achieve;
  P.achieve = function (id) {
    const had = this.ach && this.ach[id];
    origAchieve.call(this, id);
    if (!had && this.ach && this.ach[id]) { const all = loadJSON('cc4090-ach', {}); all[id] = 1; saveJSON('cc4090-ach', all); }
  };
  const origScore = P.scoreAndRank;
  P.scoreAndRank = function (won) {
    const r = origScore.call(this, won);
    if (this.goldenTaken) r.score += 5000;
    if (this.boss && this.boss.dead) r.score += 3000;
    const best = loadJSON('cc4090-best', null);
    if (!best || r.score > best.score) saveJSON('cc4090-best', { score: r.score, rank: r.rank });
    return r;
  };
  const origHit = P.onPropHit;
  P.onPropHit = function (p, n) {
    origHit.call(this, p, n);
    if (n === this.robot && n.mem.boss && p.kind === 'brick') { n.stun = 2.5; this.damageBoss(8); }
  };
  const origFinale = P.startFinale;
  P.startFinale = function () {
    const was = this.finale;
    origFinale.call(this);
    if (!was && this.finale) {
      const W = this.G.world;
      for (const [x, z] of [[4, -20], [-4, -40], [4, -60], [-4, -80], [10, -12], [-10, 10], [24, -8], [0, -98]]) this.spawnBrickPile(V(x, 0, z));
      this.G.ui.toast('Brick piles appeared. Stun the boss with bricks, then KICK it!');
    }
  };

  P.initChapter8 = function () {
    const G = this.G;
    this.boss = { hp: 100, phase: 1, throwT: 4, waveT: 8, dead: false };
    this.wx = { rain: false, next: rand(200, 300), t: 0, strikeT: 0 };
    this.fakeNext = rand(110, 160);
    this.mapOn = false; this.mapT = 0;
    // lightning light + the giant you only see in the flash
    this.lightning = new THREE.DirectionalLight(0xdfe8ff, 0); this.lightning.position.set(-40, 80, -30); G.scene.add(this.lightning);
    const giant = makeHumanoid({ faceless: true, skin: '#000', shirt: '#000', pants: '#000', scale: 1, hair: 'long', hairColor: '#000' });
    giant.root.traverse((m) => { if (m.isMesh) m.material = basic('#020202', { fog: false }); });
    giant.root.scale.setScalar(7); giant.root.visible = false; G.scene.add(giant.root); this.stormGiant = giant;
    // rain streaks around the camera
    const N = this.rainN = 1400;
    const pos = new Float32Array(N * 6);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rain = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x9fb4c8, transparent: true, opacity: 0.45 }));
    this.rain.frustumCulled = false; this.rain.visible = false; G.scene.add(this.rain);
    this.rainDrops = new Float32Array(N * 3);
    // menu: persistent stats
    const ach = loadJSON('cc4090-ach', {}), best = loadJSON('cc4090-best', null);
    const el = document.getElementById('menu-stats');
    if (el) el.textContent = `🏆 ${Object.keys(ach).length} / ${Object.keys(ACH).length} achievements` + (best ? ` · Best: ${best.score} (${best.rank})` : '');
    this.initMinimap();
  };

  P.spawnBrickPile = function (pos) {
    const G = this.G, W = G.world;
    const grp = new THREE.Group(); grp.position.copy(pos);
    for (let i = 0; i < 4; i++) grp.add(box(0.22, 0.1, 0.11, mat('#7a3020'), rand(-0.2, 0.2), 0.05 + (i > 2 ? 0.1 : 0), rand(-0.2, 0.2)));
    G.scene.add(grp);
    const it = W.addInteract({ pos: pos.clone().setY(0.4), r: 2.2, label: 'Take bricks (throw with R)', act: () => { G.player.bricks += 3; G.scene.remove(grp); W.removeInteract(it); G.ui.toast('+3 bricks'); } });
  };

  // ================================================================ BOSS FIGHT
  P.damageBoss = function (n) {
    const G = this.G, B = this.boss, r = this.robot;
    if (B.dead || !r.mem.boss) return;
    B.hp = Math.max(0, B.hp - n);
    G.audio.clank(r.pos.clone().setY(4), 1);
    if (G.fx) G.fx.emit(r.pos.clone().setY(4), 24, 'spark');
    document.getElementById('bossbar').classList.add('hit'); setTimeout(() => document.getElementById('bossbar').classList.remove('hit'), 150);
    if (Math.random() < 0.5) r.say(pick(['ERROR 404: DIGNITY NOT FOUND.', 'WARRANTY VOID.', 'CRITICAL DAMAGE. INITIATING TANTRUM.', 'OUCH.EXE']), 2, true);
    if (B.hp <= 0) this.defeatBoss();
  };

  P.updateBoss = function (dt) {
    const G = this.G, B = this.boss, r = this.robot, bar = document.getElementById('bossbar');
    const active = this.finale && r && r.mem.boss && !B.dead && !r.hidden && !this.ended;
    if (!active || r.distToPlayer() > 70) { bar.classList.add('hidden'); return; }
    bar.classList.remove('hidden');
    document.getElementById('bossfill').style.width = `${B.hp}%`;
    const phase = B.hp > 66 ? 1 : B.hp > 33 ? 2 : 3;
    if (phase !== B.phase) {
      B.phase = phase;
      G.ui.big(phase === 2 ? 'PHASE 2: GPU BARRAGE' : 'PHASE 3: FRAMERATE APOCALYPSE', 3, 'red');
      r.say(phase === 2 ? 'DEPLOYING SPARE GRAPHICS CARDS.' : 'DOWNCLOCKING... REALITY.', 3, true);
      G.audio.vineBoom(1);
    }
    document.getElementById('bosslabel').textContent = `NVIDIA GUARD-BOT · PHASE ${B.phase}`;
    const d = r.distToPlayer(), Pl = G.player;
    if (B.phase >= 2 && !(r.stun > 0)) {
      B.throwT -= dt;
      if (B.throwT <= 0 && d < 38 && !Pl.hiding && !Pl.inVehicle) {
        B.throwT = B.phase === 3 ? 2.4 : 3.8;
        const from = r.pos.clone().setY(r.pos.y + 6);
        const lead = Pl.vel.clone().multiplyScalar(0.6);
        const tgt = Pl.pos.clone().add(lead);
        const T = 1.2, g = 18 * G.gravityScale;
        const vel = V((tgt.x - from.x) / T, (tgt.y - from.y + 0.5 * g * T * T) / T, (tgt.z - from.z) / T);
        const card = makeRTX(1.8);
        const D2 = this;
        const p = G.props.spawn(card, from, vel, {
          kind: 'gpu', r: 0.25, thrown: true, ignore: r,
          onLand: (pp) => {
            if (pp.boomed) return; pp.boomed = true;
            if (G.fx) G.fx.emit(pp.pos, 20, 'spark');
            G.audio.clank(pp.pos, 0.8);
            if (pp.pos.distanceTo(Pl.pos.clone().setY(pp.pos.y)) < 1.4) Pl.damage(10, pp.pos, 'gpu');
            D2.after(6, () => G.props.remove(pp));
          },
        });
        G.audio.whoosh(0.4);
        r.anim = 'punch';
      }
    }
    if (B.phase === 3) {
      B.waveT -= dt;
      if (B.waveT <= 0 && d < 40) {
        B.waveT = 9;
        G.timeScale = 0.45;
        G.ui.big('FPS: 1', 2, 'red'); G.ui.glitch(1); G.audio.vineBoom(1);
        setTimeout(() => { G.timeScale = 1; G.ui.glitch(0); }, 2200);
      }
    }
  };

  P.defeatBoss = function () {
    const G = this.G, B = this.boss, r = this.robot;
    B.dead = true; this.eventsSeen++;
    r.ai = 'none'; r.hostile = false; r.stun = 999;
    G.timeScale = 1;
    document.getElementById('bossbar').classList.add('hidden');
    G.ui.big('BOSS DEFEATED', 4, 'green');
    r.say('...THE MORE YOU BUY... THE MORE YOU... sav...', 3, true);
    G.audio.sting(0.6); G.audio.choir(3);
    this.achieve('bossKill');
    const D2 = this;
    this.task(function* () {
      let t = 0;
      while (t < 1) { t = Math.min(1, t + G.dt / 1.2); r.rig.body.rotation.x = -t * t * Math.PI / 2; yield 0; }
      G.audio.thud(r.pos, 1); G.audio.clank(r.pos, 1); G.player.shake = 1;
      if (G.fx) { G.fx.emit(r.pos.clone().setY(2), 60, 'spark'); G.fx.emit(r.pos.clone().setY(1), 40, 'dust'); G.fx.emit(r.pos.clone().setY(3), 30, 'green'); }
      yield 1.5;
      const card = makeRTX(1.4);
      card.traverse((m) => { if (m.isMesh) m.material = mat('#e0c020', { emissive: '#806000' }); });
      const pos = r.pos.clone().setY(1.2);
      D2.hide(r);
      const p = G.props.spawn(card, pos, V(0, 6, 0), { kind: 'golden', r: 0.2, thrown: false });
      p.onRest = (pp) => {
        if (pp.interact) return;
        pp.interact = G.world.addInteract({ pos: () => pp.pos.clone().setY(pp.pos.y + 0.3), r: 2.4, label: 'Take the GOLDEN 4090', act: () => {
          G.props.remove(pp); D2.goldenTaken = true; D2.achieve('golden');
          G.ui.big('GOLDEN 4090 (+5000 SCORE)', 3, 'green'); G.audio.choir(2);
          if (D2.buddy && !D2.buddy.removed) D2.buddy.say('Is it... is it real gold? Can it run Minecraft?', 3);
        } });
      };
    });
  };

  // ================================================================ DYNAMIC MUSIC
  P.updateMusic = function () {
    const G = this.G, Pl = G.player, a = G.audio;
    if (!a.mus) { if (a.ok) a.startMusic(); return; }
    let near = 0;
    for (const t of this.threats()) { const d = Math.hypot(t.x - Pl.pos.x, t.z - Pl.pos.z); if (d < 25) near = Math.max(near, 1 - d / 25); }
    const quiet = this.horrorRunning || this.c7 && (this.c7.basementDark) || Pl.hiding;
    a.setMusic({
      pad: this.ended ? 0.6 : quiet ? 0 : this.finale ? 0.4 : 1,
      pulse: this.ended ? 0 : Math.max(near, this.finale ? 0.6 : 0),
      dread: this.ended ? 0 : this.horrorRunning ? 1 : this.horror ? 0.6 : Pl.fear > 0.6 ? 0.4 : 0,
      arp: this.finale && !this.ended ? 1 : 0,
    });
  };

  // ================================================================ RAIN & LIGHTNING
  P.updateWeather = function (dt) {
    const G = this.G, W = this.wx, cam = G.camera, Pl = G.player;
    W.next -= dt;
    if (!W.rain && W.next <= 0 && !this.horrorRunning && !this.ended) {
      W.rain = true; W.t = 0; W.strikeT = rand(3, 6);
      this.rain.visible = true;
      for (let i = 0; i < this.rainN; i++) { this.rainDrops[i * 3] = rand(-25, 25); this.rainDrops[i * 3 + 1] = rand(0, 22); this.rainDrops[i * 3 + 2] = rand(-25, 25); }
      W.sound = G.audio.loop('rain', null);
      G.lighting.fog.density = G.lighting.baseDensity * 1.35;
      G.ui.say('Breaking news: it is raining. Nobody knows why. There are no clouds in 4090 City.', '📻 4090 FM', 4, '#fc6');
    }
    if (W.rain) {
      W.t += dt;
      const pos = this.rain.geometry.attributes.position.array, drops = this.rainDrops;
      const ox = cam.position.x, oz = cam.position.z, floor = Pl.inBasement() ? 99 : 0;
      for (let i = 0; i < this.rainN; i++) {
        drops[i * 3 + 1] -= 24 * dt;
        if (drops[i * 3 + 1] < 0) { drops[i * 3 + 1] += 22; drops[i * 3] = rand(-25, 25); drops[i * 3 + 2] = rand(-25, 25); }
        const x = ox + drops[i * 3], y = drops[i * 3 + 1] + floor, z = oz + drops[i * 3 + 2];
        pos[i * 6] = x; pos[i * 6 + 1] = y; pos[i * 6 + 2] = z;
        pos[i * 6 + 3] = x + 0.08; pos[i * 6 + 4] = y + 0.6; pos[i * 6 + 5] = z;
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
      W.strikeT -= dt;
      if (W.strikeT <= 0) { W.strikeT = rand(6, 14); this.lightningStrike(); }
      if (W.t > 95 || this.horrorRunning || this.ended) {
        W.rain = false; W.next = rand(260, 380); this.rain.visible = false;
        if (W.sound) { W.sound.stop(); W.sound = null; }
        G.lighting.fog.density = G.lighting.baseDensity;
      }
    }
    // flash decay
    if (this.lightning.intensity > 0) this.lightning.intensity = Math.max(0, this.lightning.intensity - dt * 18);
    this.stormGiant.root.visible = this.lightning.intensity > 0.6 && this.giantShown;
  };

  P.lightningStrike = function () {
    const G = this.G, Pl = G.player;
    if (Pl.inBasement()) return;
    const flash = (k) => { this.lightning.intensity = 5 * k; };
    flash(1); setTimeout(() => flash(0.7), 160);
    // sometimes a giant figure stands in the flash, far away, looking at you
    this.giantShown = this.calm() && Math.random() < 0.4;
    if (this.giantShown) {
      const f = this.playerFwd(), side = V(f.z, 0, -f.x), dist = rand(55, 80);
      const p = Pl.pos.clone().addScaledVector(f, dist).addScaledVector(side, rand(-15, 15));
      let y = 0;
      for (const c of G.world.colliders) if (c.enabled && c.maxY > 4 && p.x > c.minX && p.x < c.maxX && p.z > c.minZ && p.z < c.maxZ) y = Math.max(y, c.maxY);
      const g = this.stormGiant.root;
      g.position.set(p.x, y, p.z); g.rotation.y = Math.atan2(Pl.pos.x - p.x, Pl.pos.z - p.z);
      Pl.scare(0.3);
      this.achieve('storm');
      if (this.buddy && !this.buddy.removed && Math.random() < 0.5) this.after(2.5, () => this.buddy.say('...did you see that? Tell me you did not see that.', 3));
    }
    const delay = rand(400, 1800);
    setTimeout(() => G.audio.thunder(0.9), delay);
  };

  // ================================================================ FAKE-OUT SCARES
  P.updateFakeScares = function (dt) {
    const G = this.G, Pl = G.player;
    this.fakeNext -= dt;
    if (this.fakeNext > 0 || this.horrorRunning || this.ended || Pl.inVehicle || Pl.hiding || G.time < 60) return;
    this.fakeNext = rand(130, 200);
    const kind = this._forcedKind || pick(['steps', 'phone', 'whisper', 'flash', 'knock']);
    this._forcedKind = null;
    const D2 = this;
    this.task(function* () {
      const f = D2.playerFwd().clone();
      if (kind === 'steps') {
        for (let i = 0; i < 7; i++) { const d = 9 - i * 1.15; G.audio.thud(Pl.pos.clone().addScaledVector(f, -d).setY(Pl.pos.y + 0.1), 0.25 + i * 0.05); yield 0.55; }
        Pl.scare(0.3);
        yield 3;
        if (D2.buddy && !D2.buddy.removed) D2.buddy.say('...that was not me. Was it you? It was not me.', 3);
      } else if (kind === 'phone') {
        G.audio.phoneBuzz();
        G.ui.say("📱 Unknown number: 'turn around'", '*your phone buzzes*', 4);
        Pl.scare(0.25);
        yield 7;
        G.audio.phoneBuzz();
        G.ui.say("📱 Unknown number: 'jk lol. or am i'", '*your phone buzzes again*', 4);
      } else if (kind === 'whisper') {
        G.audio.speak('psst... hey... behind you...', { pitch: 0.3, rate: 0.6, volume: 0.5 });
        G.ui.say('psst... hey... behind you...', '(a whisper)', 3, '#888');
        Pl.scare(0.3);
      } else if (kind === 'flash') {
        D2.blackout = 2.6;
        const br = G.audio.loop('breath', Pl.pos.clone().addScaledVector(f, -1.2).setY(Pl.pos.y + 1.6));
        Pl.scare(0.35);
        yield 2.6;
        br.stop();
      } else {
        let best = null, bd = 40;
        for (const c of G.world.colliders) { if (!c.enabled || c.maxY < 4) continue; const wx = Math.max(c.minX, Math.min(c.maxX, Pl.pos.x)), wz = Math.max(c.minZ, Math.min(c.maxZ, Pl.pos.z)); const d = Math.hypot(wx - Pl.pos.x, wz - Pl.pos.z); if (d < bd && d > 3) { bd = d; best = V(wx, 1.5, wz); } }
        if (best) { for (let i = 0; i < 3; i++) { G.audio.thud(best, 0.9); yield 0.45; } Pl.scare(0.25); }
        yield 3;
        const n = D2.humans().find((x) => !x.rd && !x.hidden && x.distToPlayer() < 20);
        if (n) n.say('...who knocks at 3 AM?', 2.5);
      }
      D2.achieve('fake');
      // ...and sometimes the real one comes later, when you have relaxed
      if (Math.random() < 0.3) {
        yield rand(9, 16);
        if (!D2.horrorRunning && !G.player.hiding && G.state === 'play') D2.jumpscare(pick(['pale', 'mannequin', 'ghost']));
      }
    });
  };

  // ================================================================ MINIMAP (M)
  P.initMinimap = function () {
    const c = document.getElementById('minimap');
    if (!c) return;
    const bg = document.createElement('canvas'); bg.width = bg.height = 220;
    const ctx = bg.getContext('2d');
    const m = (v) => 10 + ((v + 112) / 224) * 200;
    ctx.fillStyle = 'rgba(5,10,5,0.85)'; ctx.fillRect(0, 0, 220, 220);
    ctx.fillStyle = '#1a1f1a'; ctx.fillRect(10, 10, 200, 200);
    ctx.fillStyle = '#3a3d38';
    for (const r of [-60, 0, 60]) { ctx.fillRect(m(r) - 3, 10, 6, 200); ctx.fillRect(10, m(r) - 3, 200, 6); }
    ctx.fillStyle = '#2a2e2a';
    for (const col of this.G.world.colliders) { if (col.maxY < 4 || col.minY < -5 && col.maxY < 0) continue; if (col.minY < -10) continue; ctx.fillRect(m(col.minX), m(col.minZ), Math.max(1, m(col.maxX) - m(col.minX)), Math.max(1, m(col.maxZ) - m(col.minZ))); }
    ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    for (const [name, x, z, col] of LANDMARKS) { ctx.fillStyle = col; ctx.fillText(name, m(x), m(z) + 3); }
    ctx.strokeStyle = '#76ff03'; ctx.strokeRect(10.5, 10.5, 199, 199);
    this.mapBg = bg; this.mapCtx = c.getContext('2d'); this.mapM = m;
  };

  P.updateMinimap = function (dt) {
    const G = this.G, Pl = G.player, c = document.getElementById('minimap');
    if (G.input.hit('KeyM')) { this.mapOn = !this.mapOn; c.classList.toggle('hidden', !this.mapOn); this.achieve('map'); }
    if (!this.mapOn || !this.mapCtx) return;
    this.mapT -= dt; if (this.mapT > 0) return; this.mapT = 0.12;
    const ctx = this.mapCtx, m = this.mapM;
    ctx.clearRect(0, 0, 220, 220); ctx.drawImage(this.mapBg, 0, 0);
    for (const g of G.world.generators) { ctx.fillStyle = g.on ? '#40ff40' : '#ff3030'; ctx.fillRect(m(g.pos.x) - 3, m(g.pos.z) - 3, 6, 6); }
    ctx.fillStyle = '#ff2020';
    for (const t of this.threats()) ctx.fillRect(m(t.x) - 1.5, m(t.z) - 1.5, 3, 3);
    const obj = this.objectiveTarget && this.objectiveTarget();
    if (obj) { ctx.fillStyle = '#76ff03'; ctx.save(); ctx.translate(m(obj.pos.x), m(obj.pos.z)); ctx.rotate(Math.PI / 4); ctx.fillRect(-4, -4, 8, 8); ctx.restore(); }
    if (this.buddy && !this.buddy.removed) { ctx.fillStyle = '#7f7'; ctx.beginPath(); ctx.arc(m(this.buddy.pos.x), m(this.buddy.pos.z), 2.5, 0, 7); ctx.fill(); }
    const px = m(Pl.pos.x), pz = m(Pl.pos.z);
    ctx.save(); ctx.translate(px, pz); ctx.rotate(-Pl.yaw); ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(4, 4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill(); ctx.restore();
  };

  P.updateChapter8 = function (dt) {
    this.updateMusic();
    if (this.ended) return;
    this.updateBoss(dt);
    this.updateWeather(dt);
    this.updateFakeScares(dt);
    this.updateMinimap(dt);
  };
}
