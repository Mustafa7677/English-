// Chapter 11: THE NOCLIP ZONE.
// A glitching wall in the alley south of the supermarket lets you clip out of the city into an
// endless-feeling yellow maze of humming fluorescent lights (inspired by the "liminal space" genre).
// THE MANAGER, a flat grinning face with its own loud chase music (nextbot-style), hunts you
// through the corridors using real pathfinding. Crouch under the tall office desks to hide.
// Every so often the lights die... and it gets faster. Find the glowing EXIT.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ACH } from './scenes2.js';
import { DEATHS } from './scenes3.js';
import { mat, basic, box, facadeBox, canvasTex, textTex, rand, pick } from './util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const N = 9, CELL = 8, Y = -60, ORG = -36; // 9x9 cells of 8 m, centred under the city
const cellCenter = (i, j) => V(ORG + i * CELL + CELL / 2, Y, ORG + j * CELL + CELL / 2);
const cellOf = (p) => [Math.max(0, Math.min(N - 1, Math.floor((p.x - ORG) / CELL))), Math.max(0, Math.min(N - 1, Math.floor((p.z - ORG) / CELL)))];
const GLITCH_WALL = V(-30, 0, 89);

Object.assign(ACH, {
  noclip: ['No-Clipped', 'Escape the Noclip Zone'],
  manager: ['Mandatory Overtime', 'Get caught by The Manager'],
  desk: ['Work From Under The Desk', 'Hide from The Manager'],
});
Object.assign(DEATHS, { manager: ['Caught by The Manager.', 'Your overtime will be unpaid.'] });

export function paintManager() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 600;
  const ctx = c.getContext('2d');
  ctx.translate(256, 280);
  // suit + tie
  ctx.fillStyle = '#1a1a22'; ctx.beginPath(); ctx.moveTo(-240, 320); ctx.lineTo(-170, 170); ctx.lineTo(170, 170); ctx.lineTo(240, 320); ctx.fill();
  ctx.fillStyle = '#eee'; ctx.beginPath(); ctx.moveTo(-50, 170); ctx.lineTo(50, 170); ctx.lineTo(0, 320); ctx.fill();
  ctx.fillStyle = '#a01010'; ctx.beginPath(); ctx.moveTo(-14, 175); ctx.lineTo(14, 175); ctx.lineTo(22, 300); ctx.lineTo(0, 320); ctx.lineTo(-22, 300); ctx.fill();
  // head
  const g = ctx.createRadialGradient(0, -30, 30, 0, 0, 220); g.addColorStop(0, '#f2e6b0'); g.addColorStop(1, '#a89a5a');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -10, 170, 200, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a1208'; ctx.beginPath(); ctx.ellipse(0, -170, 175, 70, 0, Math.PI, 0); ctx.fill(); // slicked hair
  ctx.fillRect(-175, -175, 350, 30);
  // tiny eyes
  for (const s of [-1, 1]) { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(s * 62, -60, 13, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s * 62 + 4, -64, 4, 0, 7); ctx.fill(); }
  // an enormous smile
  ctx.fillStyle = '#100'; ctx.beginPath(); ctx.moveTo(-145, 30); ctx.quadraticCurveTo(0, 230, 145, 30); ctx.quadraticCurveTo(0, 90, -145, 30); ctx.fill();
  ctx.fillStyle = '#f4f0dc';
  for (let i = 0; i < 16; i++) { const x = -125 + i * 16.6, y0 = 30 + Math.abs(x) * -0.05 + 18 - Math.abs(x) * 0.02; ctx.fillRect(x, y0 + (160 - Math.abs(x)) * 0.25, 13, 26); }
  for (let i = 0; i < 14; i++) { const x = -105 + i * 16; ctx.fillRect(x, 120 + (130 - Math.abs(x)) * 0.12 - 12, 12, 22); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function extendDirector11(D) {
  const P = D.prototype;
  const origInit = P.init;
  P.init = function () { origInit.call(this); this.initZone(); };
  const origUpdate = P.update;
  P.update = function (dt) { origUpdate.call(this, dt); if (!this.ended) this.updateZone(dt); };

  P.initZone = function () {
    const G = this.G, W = G.world;
    const Z = this.zone = { active: false, done: false, walls: null, mgr: null, lightsOut: 0, outT: 30 };
    // ---------------- maze (recursive backtracker + extra loops)
    const east = [], south = [];
    for (let i = 0; i < N; i++) { east.push(new Array(N).fill(true)); south.push(new Array(N).fill(true)); }
    const seen = new Set(['0,0']), stack = [[0, 0]];
    while (stack.length) {
      const [i, j] = stack[stack.length - 1];
      const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [i + a, j + b, a, b]).filter(([x, y]) => x >= 0 && y >= 0 && x < N && y < N && !seen.has(x + ',' + y));
      if (!opts.length) { stack.pop(); continue; }
      const [x, y, a, b] = pick(opts);
      if (a === 1) east[i][j] = false; if (a === -1) east[x][y] = false; if (b === 1) south[i][j] = false; if (b === -1) south[x][y] = false;
      seen.add(x + ',' + y); stack.push([x, y]);
    }
    for (let k = 0; k < 16; k++) { const i = Math.floor(rand(0, N - 1)), j = Math.floor(rand(0, N - 1)); if (Math.random() < 0.5) east[i][j] = false; else south[i][j] = false; }
    Z.east = east; Z.south = south;
    Z.open = (i, j, a, b) => (a === 1 ? !east[i][j] : a === -1 ? (i > 0 && !east[i - 1][j]) : b === 1 ? !south[i][j] : (j > 0 && !south[i][j - 1]));
    // ---------------- geometry
    const paper = canvasTex(64, 64, (ctx) => {
      ctx.fillStyle = '#c8b864'; ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = 'rgba(120,100,30,0.25)'; for (let x = 0; x < 64; x += 8) ctx.fillRect(x, 0, 2, 64);
      for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(90,70,20,${Math.random() * 0.12})`; ctx.fillRect(Math.random() * 64, Math.random() * 64, 3, 3); }
    });
    paper.wrapS = paper.wrapT = THREE.RepeatWrapping;
    const wallMat = mat('#ffffff', { map: paper });
    const geos = [];
    const addWall = (x0, x1, z0, z1) => {
      const w = Math.max(0.3, x1 - x0), d = Math.max(0.3, z1 - z0);
      const g = facadeBox(w, 3.8, d, 2, 3.8); g.translate((x0 + x1) / 2, Y + 1.9, (z0 + z1) / 2); geos.push(g);
      W.addCollider((x0 + x1) / 2 - w / 2, (x0 + x1) / 2 + w / 2, (z0 + z1) / 2 - d / 2, (z0 + z1) / 2 + d / 2, Y - 1, Y + 4);
    };
    const E = ORG + N * CELL;
    addWall(ORG - 0.3, ORG, ORG, E); addWall(E, E + 0.3, ORG, E); addWall(ORG, E, ORG - 0.3, ORG); addWall(ORG, E, E, E + 0.3);
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const x = ORG + (i + 1) * CELL, z = ORG + (j + 1) * CELL;
      if (i < N - 1 && east[i][j]) addWall(x - 0.15, x + 0.15, z - CELL, z);
      if (j < N - 1 && south[i][j]) addWall(x - CELL, x, z - 0.15, z + 0.15);
    }
    const walls = new THREE.Mesh(mergeGeometries(geos), wallMat); walls.receiveShadow = true; G.scene.add(walls);
    geos.forEach((g) => g.dispose());
    const carpet = canvasTex(32, 32, (ctx) => { ctx.fillStyle = '#8a7a3a'; ctx.fillRect(0, 0, 32, 32); for (let i = 0; i < 200; i++) { ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '60,50,10' : '160,140,70'},0.25)`; ctx.fillRect(Math.random() * 32, Math.random() * 32, 1, 1); } });
    carpet.wrapS = carpet.wrapT = THREE.RepeatWrapping; carpet.repeat.set(36, 36);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(N * CELL, N * CELL), mat('#ffffff', { map: carpet })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, Y + 0.01, 0); G.scene.add(floor);
    const tiles = canvasTex(32, 32, (ctx) => { ctx.fillStyle = '#d8d2b0'; ctx.fillRect(0, 0, 32, 32); ctx.strokeStyle = '#8a8468'; ctx.strokeRect(0.5, 0.5, 31, 31); });
    tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping; tiles.repeat.set(36, 36);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(N * CELL, N * CELL), mat('#ffffff', { map: tiles })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, Y + 3.8, 0); G.scene.add(ceil);
    // fluorescent panels (one merged mesh so the whole floor can black out at once)
    const pg = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (Math.random() < 0.7) { const c = cellCenter(i, j); const g = new THREE.BoxGeometry(2.2, 0.06, 0.6); g.translate(c.x + rand(-1.5, 1.5), Y + 3.75, c.z + rand(-1.5, 1.5)); pg.push(g); }
    Z.panelOn = basic('#fff6c8'); Z.panelOff = mat('#3a3828');
    Z.panels = new THREE.Mesh(mergeGeometries(pg), Z.panelOn); G.scene.add(Z.panels); pg.forEach((g) => g.dispose());
    Z.light = new THREE.PointLight(0xfff0b0, 0, 24, 1.4); G.scene.add(Z.light);
    // tall office desks to hide under (crouch)
    Z.desks = [];
    const deskM = mat('#6a6050'), legM = mat('#3a3a3a');
    for (let k = 0; k < 14; k++) {
      const i = Math.floor(rand(0, N)), j = Math.floor(rand(0, N));
      const c = cellCenter(i, j).add(V(rand(-1.5, 1.5), 0, rand(-1.5, 1.5)));
      G.scene.add(box(1.8, 0.08, 1.0, deskM, c.x, Y + 1.12, c.z));
      for (const [dx, dz] of [[-0.85, -0.45], [0.85, -0.45], [-0.85, 0.45], [0.85, 0.45]]) G.scene.add(box(0.06, 1.1, 0.06, legM, c.x + dx, Y + 0.55, c.z + dz));
      W.addCollider(c.x - 0.9, c.x + 0.9, c.z - 0.5, c.z + 0.5, Y + 1.05, Y + 1.16); // only blocks you when standing
      Z.desks.push(c);
    }
    // ---------------- start, exit (farthest cell)
    Z.start = [0, 0];
    const dist = this.zoneBFS([0, 0]);
    let far = [0, 0], fd = 0;
    for (const [k, d] of dist) if (d > fd) { fd = d; far = k.split(',').map(Number); }
    Z.exitCell = far;
    const ec = cellCenter(far[0], far[1]);
    const door = new THREE.Group(); door.position.copy(ec).add(V(0, 0, CELL / 2 - 0.35));
    door.add(box(1.3, 2.3, 0.12, mat('#5a5a5a'), 0, 1.15, 0));
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.32), basic('#fff', { map: textTex('EXIT', { w: 128, h: 48, bg: '#020', fg: '#30ff50', font: 'bold 38px monospace' }) }));
    sign.position.set(0, 2.65, -0.07); sign.rotation.y = Math.PI; door.add(sign);
    G.scene.add(door);
    Z.exitPos = door.position.clone();
    W.addInteract({ pos: Z.exitPos.clone().setY(Y + 1.2), r: 2.6, label: 'Go through the EXIT', enabled: () => Z.active, act: () => this.task(this.zoneExitTask) });
    // ---------------- the glitching wall in the alley
    const gc = document.createElement('canvas'); gc.width = 96; gc.height = 96;
    Z.glitch = { ctx: gc.getContext('2d'), tex: new THREE.CanvasTexture(gc) };
    Z.glitch.tex.magFilter = THREE.NearestFilter;
    const gw = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.2), new THREE.MeshBasicMaterial({ map: Z.glitch.tex, side: THREE.DoubleSide, transparent: true, opacity: 0.92 }));
    gw.position.copy(GLITCH_WALL).setY(1.6); G.scene.add(gw); Z.glitchMesh = gw;
    // ---------------- the Manager
    Z.mgrTex = paintManager();
    const mm = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.7), new THREE.MeshBasicMaterial({ map: Z.mgrTex, transparent: true, side: THREE.DoubleSide, fog: false }));
    mm.visible = false; G.scene.add(mm); Z.mgrMesh = mm;
  };

  P.zoneBFS = function (from) {
    const Z = this.zone, dist = new Map([[from.join(','), 0]]), q = [from];
    while (q.length) {
      const [i, j] = q.shift(), d = dist.get(i + ',' + j);
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = i + a, y = j + b;
        if (x < 0 || y < 0 || x >= N || y >= N || !Z.open(i, j, a, b) || dist.has(x + ',' + y)) continue;
        dist.set(x + ',' + y, d + 1); q.push([x, y]);
      }
    }
    return dist;
  };
  /** Next cell on the shortest path from `a` towards `b`. */
  P.zoneNext = function (a, b) {
    const dist = this.zoneBFS(b); // distances to the target
    let best = a, bd = dist.get(a.join(',')) ?? 1e9;
    for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!this.zone.open(a[0], a[1], x, y)) continue;
      const k = (a[0] + x) + ',' + (a[1] + y), d = dist.get(k);
      if (d !== undefined && d < bd) { bd = d; best = [a[0] + x, a[1] + y]; }
    }
    return best;
  };

  // ---------------------------------------------------------------- enter / exit
  P.zoneEnterTask = function* () {
    const G = this.G, Z = this.zone, Pl = G.player, L = G.lighting;
    if (Z.active) return;
    Z.active = true; Z.entering = true;
    G.ui.glitch(1); G.audio.whoosh(0.6); G.audio.crunch(null, 0.5); G.audio.beep(null, 50, 0.6, 0.3, 'square');
    G.ui.fade(1, 0.15);
    yield 0.35;
    const s = cellCenter(0, 0);
    Pl.pos.set(s.x, Y, s.z); Pl.vel.set(0, 0, 0); Pl.yaw = Math.PI;
    Z.saved = { fog: L.fog.color.clone(), density: L.fog.density, hemi: L.hemi.intensity };
    L.fog.color.set('#3c3418'); L.fog.density = 0.05; L.moon.visible = false;
    Z.buzz = G.audio.loop('buzz', null);
    G.audio.setAmbient(0.05, 0.5);
    yield 0.5;
    G.ui.fade(0, 1); G.ui.glitch(0);
    G.ui.big('NOCLIP ZONE — FLOOR 0', 3.5, 'glitch');
    G.ui.toast('Find the green EXIT. Something works overtime here. Crouch (C) under desks to hide.');
    Z.entering = false; Z.mgrIn = 16; Z.outT = 28;
    if (this.buddy && !this.buddy.removed) this.after(4, () => this.buddy.say('Where... are we? Why does the carpet feel wet? WHY IS IT ALWAYS WET?', 4));
  };

  P.zoneExitTask = function* () {
    const G = this.G, Z = this.zone, Pl = G.player, L = G.lighting;
    if (!Z.active) return;
    G.ui.glitch(1); G.audio.whoosh(0.6); G.ui.fade(1, 0.15);
    yield 0.35;
    this.zoneShutdown();
    Pl.pos.set(GLITCH_WALL.x, 0, GLITCH_WALL.z - 3); Pl.vel.set(0, 0, 0); Pl.yaw = 0;
    yield 0.3;
    G.ui.fade(0, 1); G.ui.glitch(0);
    if (!Z.done) {
      Z.done = true;
      G.ui.big('YOU CLIPPED BACK INTO REALITY', 3.5, 'green');
      this.achieve('noclip');
      if (this.addAura) this.addAura(1500, 'escaped the Noclip Zone');
      Pl.drinkEnergy();
    }
  };

  P.zoneShutdown = function () {
    const G = this.G, Z = this.zone, L = G.lighting;
    Z.active = false;
    if (Z.saved) { L.fog.color.copy(Z.saved.fog); L.fog.density = Z.saved.density; L.hemi.intensity = Z.saved.hemi; }
    L.moon.visible = true;
    if (Z.buzz) { Z.buzz.stop(); Z.buzz = null; }
    if (Z.music) { Z.music.stop(); Z.music = null; }
    Z.mgr = null; Z.mgrMesh.visible = false; Z.light.intensity = 0;
    G.audio.setAmbient(this.horror ? 0.5 : 1, 1.5);
  };

  // ---------------------------------------------------------------- per frame
  P.updateZone = function (dt) {
    const G = this.G, Z = this.zone, Pl = G.player;
    // the glitching wall
    const gd = Math.hypot(Pl.pos.x - GLITCH_WALL.x, Pl.pos.z - GLITCH_WALL.z);
    if (gd < 30 && G.frame % 3 === 0) {
      const ctx = Z.glitch.ctx;
      for (let i = 0; i < 40; i++) { ctx.fillStyle = `hsl(${rand(0, 360)},80%,${rand(20, 70)}%)`; ctx.fillRect(rand(0, 96), rand(0, 96), rand(2, 30), rand(1, 6)); }
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, 96, 96);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px monospace'; ctx.fillText(Math.random() < 0.5 ? 'NOCLIP?' : 'ERR_0x4090', rand(0, 30), rand(20, 80));
      Z.glitch.tex.needsUpdate = true;
      Z.glitchMesh.position.x = GLITCH_WALL.x + rand(-0.04, 0.04);
      if (gd < 8 && Math.random() < 0.05) G.audio.beep(GLITCH_WALL, rand(60, 2000), 0.05, 0.08, 'square');
    }
    if (!Z.active && !Z.entering && gd < 1.1 && Pl.pos.y > -1 && !Pl.inVehicle && !this.horrorRunning) this.task(this.zoneEnterTask);
    if (!Z.active || Z.entering) return;
    if (Pl.pos.y > -40) { this.zoneShutdown(); return; } // e.g. teleported out by something else

    // lights follow the player; periodic blackouts
    Z.light.position.set(Pl.pos.x, Y + 3.2, Pl.pos.z);
    Z.outT -= dt;
    if (Z.lightsOut > 0) {
      Z.lightsOut -= dt;
      if (Z.lightsOut <= 0) { Z.panels.material = Z.panelOn; G.lighting.hemi.intensity = Z.saved.hemi * 0.6; if (Z.mgr) Z.music = G.audio.loop('nextbot', Z.mgr.pos.clone().setY(Y + 1.5)); }
    } else if (Z.outT <= 0) {
      Z.outT = rand(26, 38); Z.lightsOut = 4;
      Z.panels.material = Z.panelOff; G.lighting.hemi.intensity = 0.08;
      G.audio.beep(null, 60, 0.5, 0.25, 'sawtooth');
      if (Z.music) { Z.music.stop(); Z.music = null; }
      Pl.scare(0.3);
    } else {
      G.lighting.hemi.intensity = Z.saved.hemi * 0.6;
      Z.light.intensity = 14 + (Math.random() < 0.02 ? -10 : 0);
    }
    if (Z.lightsOut > 0) Z.light.intensity = 0;

    // hidden under a desk?
    const crouched = Pl.crouching && Pl.curHeight < 1.25;
    const under = crouched && Z.desks.some((d) => Math.abs(Pl.pos.x - d.x) < 0.9 && Math.abs(Pl.pos.z - d.z) < 0.5);
    if (under && !Z.wasUnder && Z.mgr) { this.achieve('desk'); G.ui.toast('Hidden under the desk. Do not move.'); }
    Z.wasUnder = under;

    // the Manager
    if (!Z.mgr) {
      Z.mgrIn -= dt;
      if (Z.mgrIn <= 0) {
        // spawn as far as possible from the player
        const d = this.zoneBFS(cellOf(Pl.pos)); let far = [N - 1, N - 1], fd = -1;
        for (const [k, v] of d) if (v > fd) { fd = v; far = k.split(',').map(Number); }
        Z.mgr = { pos: cellCenter(far[0], far[1]), lost: 0, path: null, pathT: 0, stun: 0, wander: null };
        Z.mgrMesh.visible = true;
        Z.music = G.audio.loop('nextbot', Z.mgr.pos.clone().setY(Y + 1.5));
        G.ui.say('YOU ARE LATE.', 'THE MANAGER', 2.5, '#ffd040'); G.audio.speak('You are late.', { pitch: 0.3, rate: 0.8 });
      }
      return;
    }
    const M = Z.mgr;
    if (M.stun > 0) { M.stun -= dt; }
    else {
      const pc = cellOf(Pl.pos), mc = cellOf(M.pos);
      let target;
      if (under) { // lost you: wander
        M.lost += dt;
        if (!M.wander || M.pos.distanceTo(M.wander) < 1) { const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => Z.open(mc[0], mc[1], a, b)); const [a, b] = pick(opts); M.wander = cellCenter(mc[0] + a, mc[1] + b); }
        target = M.wander;
      } else {
        M.lost = 0; M.wander = null;
        if (pc[0] === mc[0] && pc[1] === mc[1]) target = Pl.pos.clone().setY(Y);
        else { M.pathT -= dt; if (M.pathT <= 0 || !M.next) { M.pathT = 0.35; M.next = this.zoneNext(mc, pc); } target = cellCenter(M.next[0], M.next[1]); }
      }
      const speed = (Z.lightsOut > 0 ? 9 : 6.7) * (under ? 0.5 : 1);
      const dir = target.clone().sub(M.pos).setY(0); const len = dir.length();
      if (len > 0.05) M.pos.addScaledVector(dir.divideScalar(len), Math.min(len, speed * dt));
    }
    Z.mgrMesh.position.set(M.pos.x, Y + 1.45 + Math.sin(G.time * 9) * 0.05, M.pos.z);
    Z.mgrMesh.lookAt(G.camera.position.x, Y + 1.45, G.camera.position.z);
    Z.mgrMesh.visible = Z.lightsOut <= 0 || Math.random() < 0.08;
    if (Z.music) Z.music.setPos(Z.mgrMesh.position);
    const d = Math.hypot(Pl.pos.x - M.pos.x, Pl.pos.z - M.pos.z);
    if (d < 9 && G.time - (Z.lineT || -99) > 7 && !under) {
      Z.lineT = G.time;
      const l = pick(['OVERTIME IS MANDATORY.', 'WHERE IS YOUR REPORT?', 'COME BACK. WE ARE A FAMILY HERE.', 'YOUR LUNCH BREAK IS OVER. FOREVER.']);
      G.ui.say(l, 'THE MANAGER', 2.5, '#ffd040'); G.audio.speak(l, { pitch: 0.3, rate: 0.85 });
    }
    if (d < 1.1 && M.stun <= 0 && !under) {
      M.stun = 6;
      this.achieve('manager');
      const mgrTex = Z.mgrTex;
      this.task(function* () {
        // his own face fills the screen
        const cam = G.camera, m = new THREE.MeshBasicMaterial({ map: mgrTex, transparent: true, depthTest: false, fog: false });
        const pl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.17), m); pl.renderOrder = 1001; cam.add(pl);
        G.audio.bigScream(1); G.ui.glitch(1); G.ui.hurt(30); Pl.shake = 1.2;
        let t = 0;
        while (t < 0.8) { t += G.dt; const k = Math.min(1, t / 0.1); pl.position.set((Math.random() - 0.5) * 0.04, 0, -3 + 2.1 * k * k); pl.scale.setScalar(0.4 + 0.6 * k); yield 0; }
        cam.remove(pl); G.ui.glitch(0); G.audio.tinnitus(3);
        Pl.damage(35, null, 'manager');
      });
      // he walks back to the far end of the floor
      const dd = this.zoneBFS(cellOf(Pl.pos)); let far = [N - 1, N - 1], fd = -1;
      for (const [k, v] of dd) if (v > fd) { fd = v; far = k.split(',').map(Number); }
      this.after(0.9, () => { if (Z.mgr) Z.mgr.pos.copy(cellCenter(far[0], far[1])); });
    }
  };
}
