// The city: roads, buildings, landmarks, lamps, doors, colliders and interactables.
import * as THREE from 'three';
import { mat, basic, box, cyl, facadeBox, canvasTex, textTex, rand, pick, clamp } from './util.js';
import { makeHumanoid, makeChair, makeToilet, makeRTX } from './characters.js';

export const HALF = 112;
export const ROADS = [-60, 0, 60];
const RW = 6; // half road width

export class World {
  constructor(G) {
    this.G = G;
    this.group = new THREE.Group();
    this.colliders = [];
    this.lamps = [];
    this.doors = [];
    this.interactables = [];
    this.buildings = [];
    this.dumpsters = [];
    this.generators = [];
    this.chairs = [];
    this.mannequinSpots = [];
    this.spots = {};
    this.shake = 0;
    this._tmp = new THREE.Vector3();
    G.scene.add(this.group);
    this.build();
  }

  // ---------- collision ----------
  addCollider(minX, maxX, minZ, maxZ, minY = -1, maxY = 50, extra = {}) {
    const c = { minX, maxX, minZ, maxZ, minY, maxY, enabled: true, ...extra };
    this.colliders.push(c);
    return c;
  }
  /** Collider for an axis-aligned box mesh centered at (x,y,z). */
  solid(mesh, w, h, d) {
    const p = mesh.position;
    return this.addCollider(p.x - w / 2, p.x + w / 2, p.z - d / 2, p.z + d / 2, p.y - h / 2, p.y + h / 2);
  }

  floorAt(x, z, y) { return y < -40 ? -60 : y < -10 ? -20 : 0; }

  /** Push a vertical cylinder (pos = feet) out of colliders. Returns the last collider hit or null. */
  resolve(pos, r, height = 1.8) {
    let hit = null;
    const y0 = pos.y + 0.35, y1 = pos.y + height;
    for (let iter = 0; iter < 2; iter++) {
      for (const c of this.colliders) {
        if (!c.enabled || c.maxY < y0 || c.minY > y1) continue;
        if (pos.x < c.minX - r || pos.x > c.maxX + r || pos.z < c.minZ - r || pos.z > c.maxZ + r) continue;
        const cx = clamp(pos.x, c.minX, c.maxX), cz = clamp(pos.z, c.minZ, c.maxZ);
        let dx = pos.x - cx, dz = pos.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 > r * r) continue;
        if (d2 < 1e-8) { // center inside box: push along the shallowest axis
          const l = pos.x - c.minX, rr = c.maxX - pos.x, b = pos.z - c.minZ, f = c.maxZ - pos.z;
          const m = Math.min(l, rr, b, f);
          if (m === l) pos.x = c.minX - r; else if (m === rr) pos.x = c.maxX + r; else if (m === b) pos.z = c.minZ - r; else pos.z = c.maxZ + r;
        } else {
          const d = Math.sqrt(d2);
          pos.x = cx + (dx / d) * r; pos.z = cz + (dz / d) * r;
        }
        hit = c;
      }
    }
    return hit;
  }

  isFree(x, z, r = 0.5, y = 0) {
    for (const c of this.colliders) {
      if (!c.enabled || c.maxY < y + 0.3 || c.minY > y + 1.8) continue;
      if (x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r) return false;
    }
    return Math.abs(x) < HALF - 1 && Math.abs(z) < HALF - 1;
  }

  /** 2D line-of-sight test against tall colliders. */
  lineClear(ax, az, bx, bz, y = 1.5) {
    const dx = bx - ax, dz = bz - az;
    for (const c of this.colliders) {
      if (!c.enabled || c.maxY < y || c.minY > y) continue;
      let t0 = 0, t1 = 1;
      if (Math.abs(dx) < 1e-9) { if (ax < c.minX || ax > c.maxX) continue; }
      else {
        let ta = (c.minX - ax) / dx, tb = (c.maxX - ax) / dx; if (ta > tb) [ta, tb] = [tb, ta];
        t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) continue;
      }
      if (Math.abs(dz) < 1e-9) { if (az < c.minZ || az > c.maxZ) continue; }
      else {
        let ta = (c.minZ - az) / dz, tb = (c.maxZ - az) / dz; if (ta > tb) [ta, tb] = [tb, ta];
        t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) continue;
      }
      return false;
    }
    return true;
  }

  addInteract(o) { this.interactables.push(o); return o; }
  removeInteract(o) { const i = this.interactables.indexOf(o); if (i >= 0) this.interactables.splice(i, 1); }

  // ---------- textures ----------
  facadeTex(wall, win, litColor, litChance, seed = 0) {
    const t = canvasTex(128, 128, (ctx) => {
      ctx.fillStyle = wall; ctx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 600; i++) { ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.15})`; ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); }
      for (let cx = 0; cx < 4; cx++) for (let cy = 0; cy < 4; cy++) {
        const lit = Math.random() < litChance;
        ctx.fillStyle = lit ? litColor : win;
        ctx.fillRect(cx * 32 + 9, cy * 32 + 8, 14, 16);
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(cx * 32 + 15, cy * 32 + 8, 2, 16);
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  groundTex(base, speck, lines) {
    const t = canvasTex(64, 64, (ctx) => {
      ctx.fillStyle = base; ctx.fillRect(0, 0, 64, 64);
      for (let i = 0; i < 400; i++) { ctx.fillStyle = speck[i % speck.length]; ctx.fillRect(Math.random() * 64, Math.random() * 64, 1, 1); }
      if (lines) { ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.strokeRect(0, 0, 64, 64); }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  // ---------- build ----------
  build() {
    const g = this.group;
    // ground
    const groundT = this.groundTex('#1d1f1c', ['#262823', '#151613', '#2a2a26']);
    groundT.repeat.set(150, 150);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), mat('#ffffff', { map: groundT }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);

    // roads
    const roadT = canvasTex(32, 64, (ctx) => {
      ctx.fillStyle = '#232523'; ctx.fillRect(0, 0, 32, 64);
      for (let i = 0; i < 150; i++) { ctx.fillStyle = Math.random() < 0.5 ? '#2b2d2a' : '#1b1c1a'; ctx.fillRect(Math.random() * 32, Math.random() * 64, 1, 1); }
      ctx.fillStyle = '#8a8250'; ctx.fillRect(15, 6, 2, 26);
    });
    roadT.wrapS = roadT.wrapT = THREE.RepeatWrapping;
    for (const x of ROADS) {
      const len = x === 0 ? 400 : HALF * 2;
      const t = roadT.clone(); t.repeat.set(1, len / 8); t.needsUpdate = true;
      const r = new THREE.Mesh(new THREE.PlaneGeometry(12, len), mat('#ffffff', { map: t }));
      r.rotation.x = -Math.PI / 2; r.position.set(x, 0.02, x === 0 ? -88 : 0); r.receiveShadow = true; g.add(r);
    }
    for (const z of ROADS) {
      const t = roadT.clone(); t.repeat.set(1, HALF * 2 / 8); t.needsUpdate = true;
      const r = new THREE.Mesh(new THREE.PlaneGeometry(12, HALF * 2), mat('#ffffff', { map: t }));
      r.rotation.x = -Math.PI / 2; r.rotation.z = Math.PI / 2; r.position.set(0, 0.025, z); r.receiveShadow = true; g.add(r);
    }
    // sidewalk blocks
    const sideT = this.groundTex('#3a3b37', ['#44453f', '#30312d'], true);
    const intervals = [[-HALF, -66], [-54, -6], [6, 54], [66, HALF]];
    for (const [x0, x1] of intervals) for (const [z0, z1] of intervals) {
      const t = sideT.clone(); t.repeat.set((x1 - x0) / 2, (z1 - z0) / 2); t.needsUpdate = true;
      const s = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), mat('#ffffff', { map: t }));
      s.rotation.x = -Math.PI / 2; s.position.set((x0 + x1) / 2, 0.04, (z0 + z1) / 2); s.receiveShadow = true; g.add(s);
    }

    this.buildFacades();
    // residential blocks
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      if ((i === 1 || i === 2) && (j === 1 || j === 2)) continue; // landmark blocks
      const [x0, x1] = intervals[i], [z0, z1] = intervals[j];
      this.residentialBlock((x0 + x1) / 2, (z0 + z1) / 2, i === 0 && j === 1);
    }
    this.buildNvidia();
    this.buildKindergarten();
    this.buildSupermarket();
    this.buildGym();
    this.buildLaundromat();
    this.buildGasStation();
    this.buildToilet();
    this.buildBusStop();
    this.buildTaxiStand();
    this.buildBasement();
    this.buildWallsAndGate();
    this.buildLamps();
    this.buildDumpsters();
    this.buildPickups();

    // freeze static matrices for speed (dynamic objects are flagged)
    this.group.traverse((o) => { if (!o.userData.dynamic) { o.updateMatrix(); o.matrixAutoUpdate = false; } });
  }

  buildFacades() {
    this.facades = [
      mat('#ffffff', { map: this.facadeTex('#3b3632', '#111214', '#c9a85a', 0.12) }),
      mat('#ffffff', { map: this.facadeTex('#2f3430', '#0e1110', '#a8b870', 0.08) }),
      mat('#ffffff', { map: this.facadeTex('#403630', '#121010', '#d4b060', 0.15) }),
      mat('#ffffff', { map: this.facadeTex('#2b2b30', '#0c0c10', '#8090a0', 0.1) }),
    ];
    this.roofMat = mat('#1a1a1a');
  }

  building(cx, cz, w, d, h, material = pick(this.facades)) {
    const m = new THREE.Mesh(facadeBox(w, h, d), material);
    m.position.set(cx, h / 2, cz); m.castShadow = true; m.receiveShadow = true;
    m.userData.base = m.position.clone();
    this.group.add(m);
    this.group.add(box(w + 0.4, 0.4, d + 0.4, this.roofMat, cx, h + 0.2, cz));
    this.addCollider(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, -1, h);
    this.buildings.push(m);
    return m;
  }

  residentialBlock(cx, cz, hatch) {
    for (const ox of [-11, 11]) for (const oz of [-11, 11]) {
      if (cx === 30 && cz === 89 && oz === -11) continue; // gym + laundromat go here
      const w = rand(12, 16), d = rand(12, 16), h = pick([7, 10, 13, 16, 22, 28]);
      this.building(cx + ox, cz + oz, w, d, h);
    }
    // alley mannequin spots (sleeper monsters woken by Buddy)
    this.mannequinSpots.push(new THREE.Vector3(cx + rand(-2, 2), 0, cz + rand(-2, 2)));
    if (hatch) {
      const hm = box(1.4, 0.06, 1.4, mat('#3a3a32'), cx, 0.05, cz);
      this.group.add(hm);
      this.group.add(box(0.5, 0.08, 0.08, mat('#777'), cx, 0.1, cz + 0.4));
      this.spots.hatch = new THREE.Vector3(cx, 0, cz);
      this.mannequinSpots.pop();
    }
  }

  buildNvidia() {
    const cx = 31, cz = -38, w = 30, d = 24, h = 36;
    const glassT = canvasTex(64, 64, (ctx) => {
      ctx.fillStyle = '#060a06'; ctx.fillRect(0, 0, 64, 64);
      ctx.strokeStyle = '#1e5c10'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, 62, 62);
      ctx.fillStyle = 'rgba(118,255,3,0.10)'; ctx.fillRect(4, 4, 56, 56);
    });
    glassT.wrapS = glassT.wrapT = THREE.RepeatWrapping;
    const m = new THREE.Mesh(facadeBox(w, h, d, 3, 3), mat('#ffffff', { map: glassT, emissive: '#0a2a04' }));
    m.position.set(cx, h / 2, cz); m.castShadow = true; m.receiveShadow = true; m.userData.base = m.position.clone();
    this.group.add(m); this.buildings.push(m);
    this.addCollider(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, -1, h);
    const front = cz + d / 2;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(22, 5.5), basic('#ffffff', { map: textTex('NVIDIA', { w: 512, h: 128, font: 'bold 110px Arial Black, sans-serif' }) }));
    sign.position.set(cx, h - 5, front + 0.05); this.group.add(sign);
    // glowing stripes
    const g = basic('#76ff03');
    for (const x of [-13, -6, 6, 13]) this.group.add(box(0.25, h - 10, 0.1, g, cx + x, (h - 10) / 2, front + 0.06, false));
    // entrance + sliding doors
    this.group.add(box(7, 4.5, 0.2, mat('#0a0a0a', { emissive: '#103a06' }), cx, 2.25, front + 0.02, false));
    const dl = box(2.5, 4, 0.12, mat('#0f2a0a', { emissive: '#0c3006' }), cx - 1.25, 2, front + 0.15);
    const dr = box(2.5, 4, 0.12, mat('#0f2a0a', { emissive: '#0c3006' }), cx + 1.25, 2, front + 0.15);
    dl.userData.dynamic = dr.userData.dynamic = true;
    this.group.add(dl, dr);
    this.nvidiaDoors = { dl, dr, open: 0, target: 0 };
    this.spots.nvidiaDoor = new THREE.Vector3(cx, 0, front + 0.9);
    this.spots.nvidiaPlaza = new THREE.Vector3(cx, 0, -14);
    this.spots.nvidiaVictim = new THREE.Vector3(cx + 7, 0, -13);
    this.spots.nvidiaLight = new THREE.Vector3(cx, 7, -16);
    // plaza glow tiles
    for (let i = 0; i < 5; i++) this.group.add(box(1, 0.03, 1, basic('#2a7a08'), cx - 8 + i * 4, 0.06, front + 4, false));
    this.generatorAt(new THREE.Vector3(cx, 0, cz - d / 2 - 2.2), 'Behind NVIDIA HQ');
  }

  buildKindergarten() {
    const X0 = -42, X1 = -18, Z0 = -50, Z1 = -12, H = 4.2;
    const wallM = mat('#5a4f48'), inner = mat('#3c3532'), floorM = mat('#2a2220');
    const wall = (x0, x1, z0, z1, m = wallM) => {
      const w = Math.max(0.3, x1 - x0), d = Math.max(0.3, z1 - z0);
      const b = box(w, H, d, m, (x0 + x1) / 2, H / 2, (z0 + z1) / 2);
      this.group.add(b);
      this.addCollider((x0 + x1) / 2 - w / 2, (x0 + x1) / 2 + w / 2, (z0 + z1) / 2 - d / 2, (z0 + z1) / 2 + d / 2, -1, H);
    };
    // outer walls (front has the entrance at x -32..-28)
    wall(X0, -32, Z1 - 0.15, Z1 + 0.15); wall(-28, X1, Z1 - 0.15, Z1 + 0.15);
    wall(X0, X1, Z0 - 0.15, Z0 + 0.15);
    wall(X0 - 0.15, X0 + 0.15, Z0, Z1); wall(X1 - 0.15, X1 + 0.15, Z0, Z1);
    // corridor walls with doorways every 12m
    const segs = [[-12, -17.2], [-18.8, -29.2], [-30.8, -41.2], [-42.8, -50]];
    for (const [a, b] of segs) { wall(-32.15, -31.85, b, a, inner); wall(-28.15, -27.85, b, a, inner); }
    for (const z of [-24, -36]) { wall(X0, -32, z - 0.15, z + 0.15, inner); wall(-28, X1, z - 0.15, z + 0.15, inner); }
    // floor + roof
    this.group.add(box(X1 - X0, 0.1, Z1 - Z0, floorM, (X0 + X1) / 2, 0.05, (Z0 + Z1) / 2));
    const roof = box(X1 - X0 + 1, 0.4, Z1 - Z0 + 1, mat('#2a2522'), (X0 + X1) / 2, H + 0.2, (Z0 + Z1) / 2);
    this.group.add(roof);
    // faded sign + red windows
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.4), mat('#ffffff', { map: textTex('KINDERGARTEN', { w: 512, h: 80, bg: '#4a3a40', fg: '#c49ab0', font: 'bold 54px monospace', glow: false }) }));
    sign.position.set(-30, H + 0.9, Z1 + 0.2); this.group.add(sign);
    const redWin = basic('#ff2010');
    for (const x of [-39, -35, -24, -21]) this.group.add(box(1.6, 1.2, 0.05, redWin, x, 2.2, Z1 + 0.18, false));
    for (const z of [-18, -30, -42]) { this.group.add(box(0.05, 1.2, 1.6, redWin, X0 - 0.18, 2.2, z, false)); this.group.add(box(0.05, 1.2, 1.6, redWin, X1 + 0.18, 2.2, z, false)); }
    // red ceiling lights in the corridor (swappable for blackout)
    this.kgLightOn = basic('#ff1a0a'); this.kgLightOff = mat('#200');
    this.kgBulbs = [];
    for (const z of [-16, -22, -28, -34, -40, -46]) {
      const b = box(0.8, 0.08, 0.8, this.kgLightOn, -30, H - 0.1, z, false); b.userData.dynamic = true;
      this.group.add(b); this.kgBulbs.push(b);
    }
    // front double door (real, closable)
    this.makeDoor(new THREE.Vector3(-32, 0, Z1), 'x', 2, mat('#4a2a2a'), -1, 'Kindergarten door');
    this.makeDoor(new THREE.Vector3(-28, 0, Z1), 'x', -2, mat('#4a2a2a'), 1, 'Kindergarten door');
    // room doors (slam)
    this.kgRoomDoors = [
      this.makeDoor(new THREE.Vector3(-32, 0, -29.2), 'z', -1.6, mat('#3a2020'), -1, 'Door'),
      this.makeDoor(new THREE.Vector3(-28, 0, -41.2), 'z', -1.6, mat('#3a2020'), 1, 'Door'),
    ];
    // furniture: tables, chairs that move on their own, mannequins
    const tableM = mat('#4a3a2a');
    for (const [x, z] of [[-37, -18], [-23, -30], [-37, -43], [-23, -18]]) {
      const t = box(1.6, 0.08, 1, tableM, x, 0.7, z); this.group.add(t);
      this.group.add(box(0.08, 0.7, 0.08, tableM, x - 0.7, 0.35, z - 0.4), box(0.08, 0.7, 0.08, tableM, x + 0.7, 0.35, z + 0.4));
      this.addCollider(x - 0.8, x + 0.8, z - 0.5, z + 0.5, -1, 0.75);
      for (let k = 0; k < 2; k++) {
        const c = makeChair(); c.position.set(x + (k ? 1.2 : -1.2), 0, z + rand(-0.3, 0.3)); c.rotation.y = rand(0, 6);
        c.userData.dynamic = true; c.traverse((o) => (o.userData.dynamic = true));
        this.group.add(c); this.chairs.push(c);
      }
    }
    this.kgMannequins = [];
    for (const [x, z] of [[-40, -27], [-20, -45], [-40, -46]]) {
      const r = makeHumanoid({ mannequin: true, scale: 1.0 });
      r.root.position.set(x, 0, z); r.root.rotation.y = rand(0, 6);
      r.root.userData.dynamic = true; r.root.traverse((o) => (o.userData.dynamic = true));
      r.armR.rotation.x = -0.4; r.armL.rotation.z = 0.5;
      this.group.add(r.root); this.kgMannequins.push(r);
      this.addCollider(x - 0.3, x + 0.3, z - 0.3, z + 0.3, -1, 2);
    }
    // a rusty (adult) swing frame out front
    const rust = mat('#4a2e1c');
    this.group.add(box(0.12, 3, 0.12, rust, -46.5, 1.5, -6.5 - 5), box(0.12, 3, 0.12, rust, -46.5, 1.5, -6.5 - 1), box(0.12, 0.12, 4, rust, -46.5, 3, -9.5));
    const swing = new THREE.Group(); swing.position.set(-46.5, 3, -9.5); swing.userData.dynamic = true;
    swing.add(box(0.03, 2.4, 0.03, mat('#555'), 0, -1.2, -0.3), box(0.03, 2.4, 0.03, mat('#555'), 0, -1.2, 0.3), box(0.45, 0.05, 0.75, rust, 0, -2.4, 0));
    swing.traverse((m) => (m.userData.dynamic = true));
    this.group.add(swing); this.swing = swing;
    this.kg = { X0, X1, Z0, Z1, H };
    this.spots.kgEntrance = new THREE.Vector3(-30, 0, -10);
    this.spots.kgEnd = new THREE.Vector3(-30, 0, -48.5);
  }

  /** Hinged door. axis 'x' = door spans along x when closed; len signed; openDir = ±1 swing. */
  makeDoor(hinge, axis, len, material, openDir, label) {
    const pivot = new THREE.Group(); pivot.position.copy(hinge); pivot.userData.dynamic = true;
    const L = Math.abs(len), s = Math.sign(len);
    const panel = axis === 'x' ? box(L, 2.6, 0.1, material, s * L / 2, 1.3, 0) : box(0.1, 2.6, L, material, 0, 1.3, s * L / 2);
    panel.userData.dynamic = true; pivot.add(panel); this.group.add(pivot);
    const col = axis === 'x'
      ? this.addCollider(Math.min(hinge.x, hinge.x + len), Math.max(hinge.x, hinge.x + len), hinge.z - 0.12, hinge.z + 0.12, -1, 2.6, { door: true })
      : this.addCollider(hinge.x - 0.12, hinge.x + 0.12, Math.min(hinge.z, hinge.z + len), Math.max(hinge.z, hinge.z + len), -1, 2.6, { door: true });
    const center = hinge.clone(); if (axis === 'x') center.x += len / 2; else center.z += len / 2;
    const door = { pivot, col, open: false, angle: 0, target: 0, openDir, center, label };
    door.col.ref = door;
    this.doors.push(door);
    this.addInteract({ pos: center.clone().setY(1.3), r: 2.4, label: () => (door.open ? 'Close ' : 'Open ') + label, act: () => this.toggleDoor(door) });
    return door;
  }

  toggleDoor(door, force) {
    door.open = force !== undefined ? force : !door.open;
    door.target = door.open ? door.openDir * 1.6 : 0;
    if (!door.open) this.G.audio.thud(door.center, 0.9); else this.G.audio.beep(door.center, 140, 0.15, 0.08, 'sawtooth');
  }

  buildSupermarket() {
    // enterable night-shift supermarket: x -46..-20, z 20..40, entrance on the east wall (x = -20)
    const cx = -33, cz = 30, w = 26, d = 20, h = 6, X0 = cx - w / 2, X1 = cx + w / 2, Z0 = cz - d / 2, Z1 = cz + d / 2, T = 0.3;
    const facade = mat('#ffffff', { map: this.facadeTex('#4a4640', '#1a1c1a', '#d0e0d0', 0.4) });
    const wall = (x0, x1, z0, z1, y0 = 0, y1 = h, solid = true) => {
      const m = new THREE.Mesh(facadeBox(x1 - x0, y1 - y0, z1 - z0), facade);
      m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.castShadow = true; m.receiveShadow = true;
      this.group.add(m);
      if (solid) this.addCollider(x0, x1, z0, z1, y0 - 1, y1);
    };
    wall(X0, X0 + T, Z0, Z1); wall(X0, X1, Z1 - T, Z1); wall(X0, X1, Z0, Z0 + T);
    wall(X1 - T, X1, Z0, cz - 1.05); wall(X1 - T, X1, cz + 1.05, Z1); wall(X1 - T, X1, cz - 1.05, cz + 1.05, 2.5, h, false);
    // plain interior lining so the inside walls don't show the outside windows
    const lining = mat('#6e7468');
    const L = 0.04, e = T + 0.1; // keep the lining well clear of the wall (PS1 vertex snap)
    this.group.add(box(L, h, d - 2 * T, lining, X0 + e, h / 2, cz, false), box(w - 2 * T, h, L, lining, cx, h / 2, Z1 - e, false), box(w - 2 * T, h, L, lining, cx, h / 2, Z0 + e, false));
    this.group.add(box(L, h, cz - 1.05 - Z0 - T, lining, X1 - e, h / 2, (Z0 + T + cz - 1.05) / 2, false), box(L, h, Z1 - T - cz - 1.05, lining, X1 - e, h / 2, (cz + 1.05 + Z1 - T) / 2, false));
    this.group.add(box(L, h - 2.5, 2.1, lining, X1 - e, (h + 2.5) / 2, cz, false));
    this.group.add(box(w + 0.4, 0.4, d + 0.4, this.roofMat, cx, h + 0.2, cz));
    const tileT = canvasTex(32, 32, (ctx) => { ctx.fillStyle = '#9a9c90'; ctx.fillRect(0, 0, 32, 32); ctx.fillStyle = '#7d8075'; ctx.fillRect(0, 0, 16, 16); ctx.fillRect(16, 16, 16, 16); for (let i = 0; i < 60; i++) { ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(Math.random() * 32, Math.random() * 32, 1, 1); } });
    tileT.wrapS = tileT.wrapT = THREE.RepeatWrapping; tileT.repeat.set(w / 2, d / 2);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.6, d - 0.6), mat('#ffffff', { map: tileT }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(cx, 0.06, cz); floor.receiveShadow = true; this.group.add(floor);
    const front = X1;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.5), basic('#ffffff', { map: textTex('SUPER MARKET 24/7', { w: 512, h: 80, bg: '#101010', fg: '#ff4040', font: 'bold 52px monospace' }) }));
    sign.rotation.y = Math.PI / 2; sign.position.set(front + 0.06, h - 1.2, cz); this.group.add(sign);
    this.marketSign = sign;
    // push door (closable, real collider)
    const pivot = new THREE.Group(); pivot.position.set(front + 0.08, 0, cz - 1.05); pivot.userData.dynamic = true;
    const p = box(0.08, 2.4, 2.1, mat('#556b6b', { emissive: '#081010', transparent: true, opacity: 0.75 }), 0, 1.2, 1.05); p.userData.dynamic = true;
    pivot.add(p); this.group.add(pivot);
    const md = this.marketDoor = { pivot, angle: 0, target: 0, col: this.addCollider(front - 0.2, front + 0.2, cz - 1.05, cz + 1.05, -1, 2.5, { door: true }) };
    md.center = new THREE.Vector3(front, 0, cz);
    this.addInteract({ pos: new THREE.Vector3(front, 1.3, cz), r: 2.6, label: () => (md.target ? 'Close the door' : 'Push the door (it says PUSH)'),
      act: (G) => { md.target = md.target ? 0 : -1.4; if (!md.target) G.audio.thud(md.center, 0.8); } });
    // aisles: shelves with instanced products
    const metal = mat('#3a3d38'), plank = mat('#5a5d55');
    const prodGeo = new THREE.BoxGeometry(0.24, 0.3, 0.2);
    const shelfZ = [23.4, 26.7, 33.3, 36.6], SX0 = -43, SX1 = -27;
    const prods = new THREE.InstancedMesh(prodGeo, mat('#ffffff'), shelfZ.length * 3 * 2 * 30);
    const colors = ['#c03030', '#e0c030', '#3070c0', '#30a050', '#e07020', '#d0d0d0', '#8040a0', '#202020'].map((c) => new THREE.Color(c));
    const m4 = new THREE.Matrix4(); let k = 0;
    for (const z of shelfZ) {
      this.group.add(box(SX1 - SX0, 2.2, 0.15, metal, (SX0 + SX1) / 2, 1.1, z));
      for (const y of [0.35, 0.95, 1.55, 2.15]) this.group.add(box(SX1 - SX0, 0.05, 0.9, plank, (SX0 + SX1) / 2, y, z));
      this.addCollider(SX0, SX1, z - 0.45, z + 0.45, -1, 2.2);
      for (const y of [0.52, 1.12, 1.72]) for (const side of [-1, 1]) for (let i = 0; i < 30; i++) {
        if (Math.random() < 0.15) continue; // some empty spots
        m4.makeRotationY((Math.random() - 0.5) * 0.4).setPosition(SX0 + 0.3 + i * ((SX1 - SX0 - 0.6) / 29), y, z + side * 0.25);
        prods.setMatrixAt(k, m4); prods.setColorAt(k, colors[Math.floor(Math.random() * colors.length)]); k++;
      }
    }
    prods.count = k; prods.castShadow = false; prods.receiveShadow = true; this.group.add(prods);
    const aisleSign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), basic('#fff', { map: textTex('AISLE 4', { w: 128, h: 40, bg: '#123', fg: '#fff', font: 'bold 26px monospace', glow: false }) }));
    aisleSign.position.set(-35, 3.2, 35); this.group.add(aisleSign);
    // checkout counter
    const counter = box(3, 1, 0.9, mat('#3a2a2a'), -24.5, 0.5, 35); this.group.add(counter); this.solid(counter, 3, 1, 0.9);
    this.group.add(box(0.5, 0.35, 0.4, mat('#222'), -24.2, 1.18, 35), box(0.4, 0.04, 0.3, basic('#3f6'), -24.2, 1.38, 35.1, false));
    // fluorescent ceiling panels (swappable for blackouts)
    this.marketPanelOn = basic('#e8fff0'); this.marketPanelOff = mat('#1a1d1a');
    this.marketPanels = [];
    for (const z of [25, 30, 35]) for (const x of [-41, -33, -25]) {
      const b = box(2.4, 0.08, 0.5, this.marketPanelOn, x, h - 0.1, z, false); b.userData.dynamic = true;
      this.group.add(b); this.marketPanels.push(b);
    }
    this.market = { X0, X1, Z0, Z1 };
    this.spots.marketDoor = new THREE.Vector3(front + 1.0, 0, cz);
    this.spots.marketInside = new THREE.Vector3(front - 2.5, 0, cz);
    this.spots.cashier = new THREE.Vector3(-24.5, 0, 36.1);
    this.spots.roof = new THREE.Vector3(front - 0.4, h + 0.4, cz + 6);
    this.spots.marketDumpster = new THREE.Vector3(front + 1.4, 0, cz + 6);
  }

  /**
   * Generic enterable building with a doorway in the north wall (min z).
   * o: { facade, lining, floorA, floorB, sign, signBg, signFg, light }
   */
  buildRoom(cx, cz, w, d, h, o) {
    const X0 = cx - w / 2, X1 = cx + w / 2, Z0 = cz - d / 2, Z1 = cz + d / 2, T = 0.3, dx = o.doorX ?? cx, dw = 1.25;
    const wall = (x0, x1, z0, z1, y0 = 0, y1 = h, solid = true) => {
      const m = new THREE.Mesh(facadeBox(x1 - x0, y1 - y0, z1 - z0), o.facade);
      m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.castShadow = true; m.receiveShadow = true;
      this.group.add(m);
      if (solid) this.addCollider(x0, x1, z0, z1, y0 - 1, y1);
    };
    wall(X0, X0 + T, Z0, Z1); wall(X1 - T, X1, Z0, Z1); wall(X0, X1, Z1 - T, Z1);
    wall(X0, dx - dw, Z0, Z0 + T); wall(dx + dw, X1, Z0, Z0 + T); wall(dx - dw, dx + dw, Z0, Z0 + T, 2.6, h, false);
    const lin = mat(o.lining), L = 0.04, e = T + 0.1;
    this.group.add(box(L, h, d - 2 * T, lin, X0 + e, h / 2, cz, false), box(L, h, d - 2 * T, lin, X1 - e, h / 2, cz, false), box(w - 2 * T, h, L, lin, cx, h / 2, Z1 - e, false));
    this.group.add(box(dx - dw - X0 - T, h, L, lin, (X0 + T + dx - dw) / 2, h / 2, Z0 + e, false), box(X1 - T - dx - dw, h, L, lin, (dx + dw + X1 - T) / 2, h / 2, Z0 + e, false));
    this.group.add(box(2 * dw, h - 2.6, L, lin, dx, (h + 2.6) / 2, Z0 + e, false));
    this.group.add(box(w + 0.4, 0.4, d + 0.4, this.roofMat, cx, h + 0.2, cz));
    const ft = canvasTex(32, 32, (ctx) => { ctx.fillStyle = o.floorA; ctx.fillRect(0, 0, 32, 32); ctx.fillStyle = o.floorB; ctx.fillRect(0, 0, 16, 16); ctx.fillRect(16, 16, 16, 16); });
    ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(w / 2, d / 2);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.6, d - 0.6), mat('#ffffff', { map: ft }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(cx, 0.06, cz); floor.receiveShadow = true; this.group.add(floor);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.1), basic('#fff', { map: textTex(o.sign, { w: 512, h: 96, bg: o.signBg, fg: o.signFg, font: 'bold 56px monospace' }) }));
    sign.position.set(dx, 3.4, Z0 - 0.05); sign.rotation.y = Math.PI; this.group.add(sign);
    const panels = [];
    for (const px of [cx - w / 4, cx + w / 4]) for (const pz of [cz - d / 5, cz + d / 5]) {
      const b = box(2.2, 0.08, 0.45, this.marketPanelOn, px, h - 0.1, pz, false); b.userData.dynamic = true; this.group.add(b); panels.push(b);
    }
    const light = this.G.lighting.addSpecial(o.light, 7, 16, new THREE.Vector3(cx, h - 1.2, cz));
    return { X0, X1, Z0, Z1, panels, light, door: new THREE.Vector3(dx, 0, Z0 - 1.2) };
  }

  buildGym() {
    const facade = mat('#ffffff', { map: this.facadeTex('#3a3a44', '#101014', '#e0e0ff', 0.3) });
    const R = this.gym = this.buildRoom(18, 82, 18, 14, 4.5, { facade, lining: '#55585e', floorA: '#2a2a2e', floorB: '#222226', sign: '4090 GYM 24/7', signBg: '#111', signFg: '#ff3030', light: 0xf0f0ff });
    const metal = mat('#2a2a2a'), rubber = mat('#151515'), red = mat('#a02020');
    // mirror wall
    this.group.add(box(14, 2.4, 0.03, mat('#9ab0b0', { emissive: '#1a2424' }), 18, 1.6, R.Z1 - 0.34, false));
    // treadmills (facing the mirror)
    this.treadmills = [];
    for (const x of [11.6, 14]) {
      const g = new THREE.Group(); g.position.set(x, 0, 84.5);
      g.add(box(0.9, 0.18, 2.0, metal, 0, 0.09, 0));
      const belt = box(0.7, 0.02, 1.8, rubber, 0, 0.19, 0, false); g.add(belt);
      g.add(box(0.06, 1.1, 0.06, metal, -0.4, 0.7, 0.9), box(0.06, 1.1, 0.06, metal, 0.4, 0.7, 0.9), box(0.9, 0.25, 0.15, metal, 0, 1.3, 0.95));
      g.add(box(0.5, 0.15, 0.02, basic('#30ff60'), 0, 1.32, 0.87, false));
      this.group.add(g); this.treadmills.push({ g, belt, pos: new THREE.Vector3(x, 0.2, 84.3) });
      this.addCollider(x - 0.45, x + 0.45, 83.5, 85.5, -1, 0.3);
    }
    // bench press
    this.group.add(box(0.45, 0.45, 1.5, mat('#3a1a1a'), 22, 0.225, 84));
    this.group.add(box(0.06, 1.7, 0.06, metal, 21.3, 0.85, 84.7), box(0.06, 1.7, 0.06, metal, 22.7, 0.85, 84.7));
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 6), metal); bar.rotation.z = Math.PI / 2; bar.position.set(22, 1.75, 84.7); this.group.add(bar);
    for (const s of [-1, 1]) for (const k of [0, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 10), rubber); p.rotation.z = Math.PI / 2; p.position.set(22 + s * (0.85 + k * 0.08), 1.75, 84.7); this.group.add(p); }
    this.addCollider(21.75, 22.25, 83.25, 84.75, -1, 0.45);
    this.spots.skeleton = new THREE.Vector3(22, 0, 83.6);
    // dumbbell rack + posters + punching bag
    this.group.add(box(0.7, 0.9, 3.4, metal, 25.9, 0.45, 80.5)); this.addCollider(25.55, 26.25, 78.8, 82.2, -1, 0.9);
    for (let i = 0; i < 7; i++) this.group.add(box(0.35, 0.12, 0.12, rubber, 25.9, 0.96, 79 + i * 0.45));
    const poster = (t, x, z, ry) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.7), basic('#fff', { map: textTex(t, { w: 512, h: 128, bg: '#111', fg: '#ffd020', font: 'bold 44px Impact, sans-serif', glow: false }) })); p.position.set(x, 3, z); p.rotation.y = ry; this.group.add(p); };
    poster('NEVER SKIP LEG DAY', R.X0 + 0.34, 80, Math.PI / 2);
    poster('NO PAIN NO GAIN', R.X1 - 0.34, 85, -Math.PI / 2);
    poster('GAINS > SLEEP', 13, R.Z0 + 0.34, 0);
    const bag = new THREE.Group(); bag.position.set(16, 4.4, 79); bag.userData.dynamic = true;
    bag.add(box(0.03, 1.2, 0.03, metal, 0, -0.6, 0));
    const bagMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.2, 10), red); bagMesh.position.y = -1.8; bag.add(bagMesh);
    bag.traverse((m) => (m.userData.dynamic = true));
    this.group.add(bag); this.punchBag = bag;
    this.treadmills.forEach((t) => { t.g.userData.dynamic = true; t.belt.userData.dynamic = true; });
  }

  buildLaundromat() {
    const facade = mat('#ffffff', { map: this.facadeTex('#4a4a40', '#141412', '#d0e8ff', 0.5) });
    const R = this.laundry = this.buildRoom(42, 82, 18, 14, 4.2, { facade, lining: '#8a9a96', floorA: '#b8bcb0', floorB: '#3a6a8a', sign: 'LAUNDRO-MAT', signBg: '#0a2a4a', signFg: '#9cf', light: 0xe8f4ff });
    const white = mat('#e6e6e0'), glass = basic('#4a6a7a', { transparent: true, opacity: 0.75 }), ring = mat('#888');
    this.washers = [];
    for (let i = 0; i < 6; i++) {
      const x = 35.2 + i * 2.6, z = R.Z1 - 0.75;
      const g = new THREE.Group(); g.position.set(x, 0, z); g.userData.dynamic = true;
      g.add(box(0.85, 1.0, 0.75, white, 0, 0.5, 0));
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.04, 14), ring); r.rotation.x = Math.PI / 2; r.position.set(0, 0.55, -0.38); g.add(r);
      const door = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 14), glass); door.rotation.x = Math.PI / 2; door.position.set(0, 0.55, -0.39); g.add(door);
      g.add(box(0.6, 0.08, 0.02, basic(i % 2 ? '#30ff60' : '#ff3030'), 0, 0.9, -0.38, false));
      g.traverse((m) => (m.userData.dynamic = true));
      this.group.add(g);
      const col = this.addCollider(x - 0.43, x + 0.43, z - 0.38, z + 0.38, -1, 1);
      this.washers.push({ g, door, col, home: g.position.clone(), front: new THREE.Vector3(x, 0, z - 1) });
    }
    // dryers on the east wall
    this.dryers = [];
    for (const z of [79, 81.4]) {
      const x = R.X1 - 0.75;
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = -Math.PI / 2;
      g.add(box(0.85, 1.4, 0.75, white, 0, 0.7, 0));
      const d = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 14), glass); d.rotation.x = Math.PI / 2; d.position.set(0, 0.85, 0.39); g.add(d);
      this.group.add(g); this.addCollider(x - 0.38, x + 0.38, z - 0.43, z + 0.43, -1, 1.4);
      this.dryers.push({ g, pos: new THREE.Vector3(x - 0.5, 0.9, z) });
    }
    // vending machine (tips over if you shake it)
    const vm = new THREE.Group(); vm.position.set(R.X0 + 0.8, 0, 79); vm.userData.dynamic = true;
    const body = new THREE.Group(); body.position.set(0.4, 0, 0); vm.add(body); // pivot at its front-bottom edge
    body.add(box(0.8, 2.0, 0.95, mat('#b01818'), -0.4, 1.0, 0));
    body.add(box(0.03, 1.3, 0.7, basic('#5a8aa0', { transparent: true, opacity: 0.8 }), 0.005, 1.2, 0, false));
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.2), basic('#fff', { map: textTex('SNACKS', { w: 128, h: 40, bg: '#b01818', fg: '#fff', font: 'bold 28px monospace', glow: false }) }));
    lab.rotation.y = Math.PI / 2; lab.position.set(0.02, 1.85, 0); body.add(lab);
    vm.traverse((m) => (m.userData.dynamic = true));
    this.group.add(vm);
    this.vending = { g: vm, body, col: this.addCollider(R.X0 + 0.4, R.X0 + 1.2, 78.5, 79.5, -1, 2), pos: new THREE.Vector3(R.X0 + 1.4, 1.2, 79) };
    // folding table
    this.group.add(box(3, 0.08, 1.2, mat('#9a8a70'), 42, 0.85, 82)); this.addCollider(40.5, 43.5, 81.4, 82.6, -1, 0.9);
    this.group.add(box(0.06, 0.85, 0.06, mat('#555'), 40.7, 0.42, 81.5), box(0.06, 0.85, 0.06, mat('#555'), 43.3, 0.42, 82.5));
  }

  buildGasStation() {
    const concrete = mat('#4a4a46'), red = mat('#6a1a14');
    const canopy = box(16, 0.5, 10, red, 32, 5, 26); canopy.rotation.z = 0.06; canopy.rotation.x = -0.03; this.group.add(canopy);
    for (const [x, z, hh] of [[25, 22, 5], [39, 22, 5], [25, 30, 5], [39, 30, 2.2]]) {
      const p = box(0.4, hh, 0.4, concrete, x, hh / 2, z); this.group.add(p); this.solid(p, 0.4, hh, 0.4);
    }
    this.group.add(box(0.5, 0.3, 3, concrete, 40, 0.15, 31.5)); // broken pillar chunk
    for (const x of [29, 35]) {
      const p = box(0.8, 1.6, 0.6, mat('#7a7a70'), x, 0.8, 26); this.group.add(p); this.solid(p, 0.8, 1.6, 0.6);
      this.group.add(box(0.6, 0.3, 0.05, basic('#203020'), x, 1.2, 26.31, false));
    }
    this.building(47, 46, 10, 14, 4.5, mat('#ffffff', { map: this.facadeTex('#3a3a36', '#151515', '#c0d0a0', 0.25) }));
    const pole = cyl(0.15, 0.15, 8, 6, concrete, 14, 4, 14); this.group.add(pole); this.solid(pole, 0.3, 8, 0.3);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(3, 1.6, 0.3), basic('#fff', { map: textTex('GAS 4.09', { w: 256, h: 128, bg: '#300', fg: '#ff6a00', font: 'bold 60px monospace' }) }));
    sign.position.set(14, 8.5, 14); this.group.add(sign);
    this.gasSign = sign;
    for (let i = 0; i < 10; i++) this.group.add(box(rand(0.3, 1.2), rand(0.2, 0.6), rand(0.3, 1.2), concrete, rand(22, 44), 0.2, rand(32, 40)));
    this.generatorAt(new THREE.Vector3(44, 0, 34), 'Gas station');
    this.spots.dancer = new THREE.Vector3(22, 0, 18);
    this.spots.gasStop = new THREE.Vector3(57, 0, 26);
  }

  buildToilet() {
    const cx = 12.5, cz = 46, wallM = mat('#5c6a5c');
    const parts = [[cx + 0.9, cz, 0.12, 2.6, 2], [cx, cz - 0.95, 1.9, 2.6, 0.12], [cx, cz + 0.95, 1.9, 2.6, 0.12]];
    for (const [x, z, w, h, d] of parts) { const b = box(w, h, d, wallM, x, h / 2, z); this.group.add(b); this.solid(b, w, h, d); }
    this.group.add(box(2.1, 0.15, 2.1, wallM, cx, 2.65, cz));
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.4), basic('#fff', { map: textTex('WC', { w: 128, h: 40, bg: '#222', fg: '#9cf', font: 'bold 30px monospace' }) }));
    sign.rotation.y = -Math.PI / 2; sign.position.set(cx - 0.97, 2.9, cz); this.group.add(sign);
    this.toiletDoor = this.makeDoor(new THREE.Vector3(cx - 0.95, 0, cz - 0.9), 'z', 1.8, mat('#3a4a3a'), -1, 'toilet door');
    const t = makeToilet();
    t.group.position.set(cx + 0.45, 0, cz); t.group.rotation.y = -Math.PI / 2;
    t.group.userData.dynamic = true; t.group.traverse((o) => (o.userData.dynamic = true));
    this.group.add(t.group);
    this.toilet = t;
    this.spots.toilet = new THREE.Vector3(cx, 0, cz);
  }

  buildBusStop() {
    const x = 9, z = -45, glass = mat('#203030', { transparent: true, opacity: 0.6 }), metal = mat('#555');
    const back = box(0.1, 2.4, 4, glass, x + 1, 1.2, z); this.group.add(back); this.solid(back, 0.2, 2.4, 4);
    this.group.add(box(1.6, 0.1, 4.2, metal, x + 0.3, 2.45, z));
    const bench = box(0.5, 0.08, 2.6, mat('#4a3a2a'), x + 0.5, 0.45, z); bench.userData.dynamic = true; this.group.add(bench);
    this.bench = bench;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), basic('#fff', { map: textTex('BUS', { w: 64, h: 64, bg: '#0a3a6a', fg: '#fff', font: 'bold 26px monospace', glow: false }) }));
    sign.position.set(x - 0.8, 2.6, z + 2.4); sign.rotation.y = -Math.PI / 2; this.group.add(sign);
    this.group.add(cyl(0.04, 0.04, 2.6, 4, metal, x - 0.8, 1.3, z + 2.4));
    this.spots.bench = new THREE.Vector3(x + 0.5, 0, z);
  }

  buildTaxiStand() {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.5), basic('#fff', { map: textTex('TAXI', { w: 128, h: 48, bg: '#c9a100', fg: '#111', font: 'bold 34px monospace', glow: false }) }));
    sign.position.set(-7.4, 2.6, 48); sign.rotation.y = Math.PI / 2; this.group.add(sign);
    this.group.add(cyl(0.04, 0.04, 2.6, 4, mat('#555'), -7.4, 1.3, 48.7));
    this.spots.taxi = new THREE.Vector3(-3, 0, 48);
  }

  buildBasement() {
    const cx = this.spots.hatch.x, cz = this.spots.hatch.z, Y = -20;
    const wm = mat('#2e2a24');
    this.group.add(box(14, 0.4, 14, mat('#1e1c18'), cx, Y - 0.2, cz));
    this.group.add(box(14, 0.4, 14, wm, cx, Y + 4.2, cz));
    const walls = [[cx - 7, cz, 0.4, 14], [cx + 7, cz, 0.4, 14], [cx, cz - 7, 14, 0.4], [cx, cz + 7, 14, 0.4]];
    for (const [x, z, w, d] of walls) { const b = box(w, 4.4, d, wm, x, Y + 2, z); this.group.add(b); this.solid(b, w, 4.4, d); }
    this.group.add(box(0.6, 4, 0.1, mat('#555'), cx, Y + 2, cz + 6.7)); // ladder
    for (let i = 0; i < 8; i++) this.group.add(box(0.6, 0.05, 0.12, mat('#777'), cx, Y + 0.3 + i * 0.5, cz + 6.6));
    // creepy shelves & a mannequin in the corner
    for (const s of [-1, 1]) this.group.add(box(0.6, 2.2, 4, mat('#3a2e22'), cx + s * 6.3, Y + 1.1, cz - 2));
    const r = makeHumanoid({ mannequin: true }); r.root.position.set(cx + 5.5, Y, cz + 5.5); r.root.rotation.y = -2.4;
    r.root.userData.dynamic = true; r.root.traverse((o) => (o.userData.dynamic = true));
    this.group.add(r.root); this.basementMannequin = r;
    this.spots.basementSpawn = new THREE.Vector3(cx, Y, cz + 5.2);
    this.spots.basementLight = new THREE.Vector3(cx, Y + 3.5, cz);
    this.generatorAt(new THREE.Vector3(cx, Y, cz - 5), 'Hidden basement');
    this.addInteract({ pos: new THREE.Vector3(cx, 0.5, cz), r: 2.2, label: 'Open the rusty hatch', act: (G) => G.player.teleport(this.spots.basementSpawn, Math.PI) });
    this.addInteract({ pos: new THREE.Vector3(cx, Y + 1.2, cz + 6.5), r: 2.2, label: 'Climb the ladder', act: (G) => G.player.teleport(new THREE.Vector3(cx, 0, cz + 1.8), 0) });
  }

  generatorAt(pos, name) {
    const grp = new THREE.Group(); grp.position.copy(pos); grp.userData.dynamic = true;
    grp.add(box(1.6, 1.2, 1, mat('#3a4a2a'), 0, 0.6, 0));
    grp.add(cyl(0.25, 0.25, 0.9, 8, mat('#222'), 0.5, 1.35, 0));
    const lamp = box(0.2, 0.2, 0.2, basic('#ff2020'), -0.5, 1.3, 0.4, false); lamp.userData.dynamic = true; grp.add(lamp);
    const lever = box(0.08, 0.5, 0.08, mat('#999'), -0.2, 1.4, 0.45); lever.rotation.x = 0.6; lever.userData.dynamic = true; grp.add(lever);
    this.group.add(grp);
    this.addCollider(pos.x - 0.8, pos.x + 0.8, pos.z - 0.5, pos.z + 0.5, pos.y - 1, pos.y + 1.2);
    const gen = { pos, name, on: false, lamp, lever, hum: null };
    gen.interact = this.addInteract({
      pos: pos.clone().setY(pos.y + 1), r: 2.6,
      label: () => (gen.on ? 'Generator running' : 'Start generator'),
      act: (G) => G.director.startGenerator(gen),
    });
    this.generators.push(gen);
    return gen;
  }

  buildWallsAndGate() {
    const wm = mat('#2a2a28'), H = 9, T = 1;
    const seg = (x0, x1, z0, z1) => { const b = box(x1 - x0, H, z1 - z0, wm, (x0 + x1) / 2, H / 2, (z0 + z1) / 2); this.group.add(b); this.solid(b, x1 - x0, H, z1 - z0); };
    seg(-HALF - T, -6, -HALF - T, -HALF); seg(6, HALF + T, -HALF - T, -HALF);
    seg(-HALF - T, HALF + T, HALF, HALF + T);
    seg(-HALF - T, -HALF, -HALF, HALF); seg(HALF, HALF + T, -HALF, HALF);
    // gate
    const gm = mat('#3a1010', { emissive: '#150202' });
    const gl = box(6, 8, 0.6, gm, -3, 4, -HALF - 0.5), gr = box(6, 8, 0.6, gm, 3, 4, -HALF - 0.5);
    gl.userData.dynamic = gr.userData.dynamic = true;
    this.group.add(gl, gr);
    for (let i = 0; i < 5; i++) { gl.add(box(0.15, 7.6, 0.7, mat('#222'), -2.4 + i * 1.2, 0, 0)); gr.add(box(0.15, 7.6, 0.7, mat('#222'), -2.4 + i * 1.2, 0, 0)); }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.3), basic('#fff', { map: textTex('EXIT', { w: 256, h: 64, bg: '#100', fg: '#f22', font: 'bold 48px monospace' }) }));
    sign.position.set(0, 10.2, -HALF + 0.2); this.group.add(sign);
    this.group.add(box(14, 1, 1.2, wm, 0, 9.5, -HALF - 0.5));
    this.gate = { gl, gr, open: 0, target: 0, col: this.addCollider(-6, 6, -HALF - 1, -HALF, -1, 9) };
    this.spots.gate = new THREE.Vector3(0, 0, -HALF + 4);
  }

  buildLamps() {
    const poleM = mat('#2a2a2a');
    this.bulbOn = basic('#ffd890'); this.bulbOff = mat('#222'); this.bulbRed = basic('#ff2020');
    this.poolOn = basic('#fff2c0', { transparent: true, opacity: 0.09, depthWrite: false, blending: THREE.AdditiveBlending });
    this.poolRed = basic('#ff2010', { transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending });
    const poolGeo = new THREE.CircleGeometry(4.5, 14);
    const add = (x, z, armDirX, armDirZ) => {
      const pole = cyl(0.09, 0.12, 6, 5, poleM, x, 3, z); this.group.add(pole);
      const col = this.addCollider(x - 0.15, x + 0.15, z - 0.15, z + 0.15, -1, 6, { pole: true });
      const bx = x + armDirX * 1.2, bz = z + armDirZ * 1.2;
      this.group.add(box(Math.abs(armDirX) * 1.2 + 0.08, 0.08, Math.abs(armDirZ) * 1.2 + 0.08, poleM, x + armDirX * 0.6, 6, z + armDirZ * 0.6));
      const bulb = box(0.45, 0.15, 0.45, this.bulbOn, bx, 5.9, bz, false); bulb.userData.dynamic = true; this.group.add(bulb);
      const pool = new THREE.Mesh(poolGeo, this.poolOn); pool.rotation.x = -Math.PI / 2; pool.position.set(bx, 0.07, bz); pool.userData.dynamic = true;
      this.group.add(pool);
      this.lamps.push({ pos: new THREE.Vector3(bx, 5.6, bz), base: new THREE.Vector3(x, 0, z), bulb, pool, state: 'on', flicker: Math.random() < 0.18, col });
    };
    let k = 0;
    for (const r of ROADS) {
      for (let p = -104; p <= 104; p += 16) {
        if (ROADS.some((q) => Math.abs(p - q) < 9)) continue;
        const s = (k++ % 2) ? 1 : -1;
        add(r + s * 7.2, p, -s, 0);
        add(p + 3, r + s * 7.2, 0, -s);
      }
    }
  }

  setLamp(l, state) {
    l.state = state;
    l.bulb.material = state === 'on' ? this.bulbOn : state === 'red' ? this.bulbRed : this.bulbOff;
    l.pool.visible = state !== 'off';
    l.pool.material = state === 'red' ? this.poolRed : this.poolOn;
  }

  buildDumpsters() {
    const dm = mat('#1e3a22');
    const add = (x, z, rot = 0) => {
      const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = rot; grp.userData.dynamic = true;
      grp.add(box(1.8, 1.2, 1.1, dm, 0, 0.6, 0));
      const lid = box(1.85, 0.08, 1.15, mat('#132616'), 0, 1.24, 0); lid.userData.dynamic = true; grp.add(lid);
      this.group.add(grp);
      const w = rot ? 1.1 : 1.8, d = rot ? 1.8 : 1.1;
      const col = this.addCollider(x - w / 2, x + w / 2, z - d / 2, z + d / 2, -1, 1.25);
      const dmp = { group: grp, lid, pos: new THREE.Vector3(x, 0, z), col };
      this.dumpsters.push(dmp);
      return dmp;
    };
    this.crashDumpster = add(8.4, -8.4);
    this.roofDumpster = add(this.spots.marketDumpster.x, this.spots.marketDumpster.z, Math.PI / 2);
    add(-8.4, 22); add(52, -8.4); add(-52, 8.4); add(8.4, 70); add(-70, -52); add(70, 52); add(-8.4, -80); add(64, -40);
  }

  buildPickups() {
    // brick piles and flashlight batteries scattered around
    const brickM = mat('#7a3020'), batM = basic('#e0c000');
    const piles = [[4, 9], [-9, -30], [21, -10], [-16, 16], [50, 14], [-50, -14], [9, -60], [-60, 40], [60, -20], [-24, -56], [36, 56], [-36, 8]];
    for (const [x, z] of piles) {
      const grp = new THREE.Group(); grp.position.set(x + (Math.sign(x) || 1) * 0.5, 0, z); grp.userData.dynamic = true;
      for (let i = 0; i < 4; i++) grp.add(box(0.22, 0.1, 0.11, brickM, rand(-0.2, 0.2), 0.05 + (i > 2 ? 0.1 : 0), rand(-0.2, 0.2)));
      this.group.add(grp);
      const it = this.addInteract({
        pos: grp.position.clone().setY(0.4), r: 2.2, label: 'Take bricks (throw with R)',
        act: (G) => { G.player.bricks += 3; G.audio.thud(null, 0.2); this.group.remove(grp); this.removeInteract(it); G.ui.toast('+3 bricks'); },
      });
    }
    const bats = [[-4, -20], [24, 8], [-24, 50], [-70, -24], [40, -8], [0, -95], [-30, -8.5], [70, 30]];
    for (const [x, z] of bats) {
      const b = box(0.1, 0.22, 0.1, batM, x, 0.12, z, false); b.userData.dynamic = true; this.group.add(b);
      const it = this.addInteract({
        pos: b.position.clone().setY(0.4), r: 2, label: 'Take battery',
        act: (G) => { G.player.battery = Math.min(100, G.player.battery + 45); this.group.remove(b); this.removeInteract(it); G.ui.toast('Flashlight battery +45%'); },
      });
    }
  }

  update(dt, G) {
    // doors
    for (const d of this.doors) {
      d.angle += (d.target - d.angle) * Math.min(1, dt * 7);
      d.pivot.rotation.y = d.angle;
      d.col.enabled = Math.abs(d.angle) < 0.5;
    }
    const nd = this.nvidiaDoors;
    nd.open += (nd.target - nd.open) * Math.min(1, dt * 4);
    nd.dl.position.x = 31 - 1.25 - nd.open * 2.4; nd.dr.position.x = 31 + 1.25 + nd.open * 2.4;
    const md = this.marketDoor; md.angle += (md.target - md.angle) * Math.min(1, dt * 6); md.pivot.rotation.y = md.angle;
    md.col.enabled = Math.abs(md.angle) < 0.5;
    const gt = this.gate;
    gt.open += (gt.target - gt.open) * Math.min(1, dt * 0.8);
    gt.gl.position.x = -3 - gt.open * 6; gt.gr.position.x = 3 + gt.open * 6;
    gt.col.enabled = gt.open < 0.7;
    // flicker
    for (const l of this.lamps) {
      if (l.flicker && l.state !== 'off' && Math.random() < dt * 3) {
        const off = Math.random() < 0.5;
        l.bulb.material = off ? this.bulbOff : (l.state === 'red' ? this.bulbRed : this.bulbOn);
        l.pool.visible = !off;
      }
    }
    if (this.marketSign) this.marketSign.visible = Math.random() > 0.03;
    // finale: buildings shake
    if (this.shake > 0) {
      for (const b of this.buildings) {
        b.position.set(b.userData.base.x + (Math.random() - 0.5) * this.shake, b.userData.base.y, b.userData.base.z + (Math.random() - 0.5) * this.shake);
        b.updateMatrix();
      }
    }
  }
}
