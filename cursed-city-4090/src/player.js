// First-person controller: walk/run/crouch/jump, stamina, health, fear, flashlight, interact, throw.
import * as THREE from 'three';
import { clamp, lerp } from './util.js';
import { makeRTX } from './characters.js';

export class Player {
  constructor(G) {
    this.G = G;
    this.pos = new THREE.Vector3(0, 0, 14);
    this.vel = new THREE.Vector3();
    this.yaw = 0; // facing -z
    this.pitch = 0;
    this.height = 1.65;
    this.curHeight = 1.65;
    this.radius = 0.35;
    this.grounded = true;
    this.stamina = 100;
    this.exhausted = false;
    this.health = 100;
    this.fear = 0;
    this.battery = 100;
    this.flashOn = false;
    this.bricks = 2;
    this.hasRTX = false;
    this.inVehicle = null;
    this.locked = false; // cutscene lock
    this.lookLocked = false;
    this.noise = 6;
    this.shake = 0;
    this.bob = 0;
    this.stepDist = 0;
    this.lastHit = -10;
    this.dead = false;
    this.knock = new THREE.Vector3();
    this.hiding = null;
    this.hideT = 0;
    this.energy = 0;
    this.lastKiller = null;

    const cam = G.camera;
    cam.rotation.order = 'YXZ';
    // flashlight
    this.flash = new THREE.SpotLight(0xfff1d0, 0, 38, 0.48, 0.45, 1.4);
    this.flash.position.set(0.25, -0.2, 0);
    this.flash.target.position.set(0, -0.3, -5);
    cam.add(this.flash); cam.add(this.flash.target);
    // first-person RTX view model
    this.viewRTX = makeRTX(0.38);
    this.viewRTX.position.set(0.3, -0.26, -0.55);
    this.viewRTX.rotation.set(0.25, -0.35, 0.35);
    this.viewRTX.visible = false;
    this.viewRTX.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.material = m.material.clone(); m.material.depthTest = false; m.renderOrder = 999; } });
    cam.add(this.viewRTX);
    // kick leg view model
    this.leg = new THREE.Group();
    const legM = new THREE.MeshBasicMaterial({ color: 0x2b2f3a, depthTest: false });
    const shoeM = new THREE.MeshBasicMaterial({ color: 0x151515, depthTest: false });
    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.18), legM); shin.position.y = -0.35;
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.34), shoeM); shoe.position.set(0, -0.7, -0.1);
    this.leg.add(shin, shoe); this.leg.traverse((m) => { m.renderOrder = 998; });
    this.leg.position.set(0.12, -0.9, -0.35); this.leg.visible = false;
    cam.add(this.leg);
    this.kickT = 0;
    G.scene.add(cam);
  }

  setShadows(on) { this.flash.castShadow = on; this.flash.shadow.mapSize.set(512, 512); }

  inBasement() { return this.pos.y < -10; }

  teleport(p, yaw) {
    this.pos.copy(p); this.vel.set(0, 0, 0);
    if (yaw !== undefined) this.yaw = yaw;
    this.G.audio.thud(null, 0.3);
    this.G.ui.fade(1, 0.01);
    setTimeout(() => this.G.ui.fade(0, 0.6), 60);
  }

  damage(amount, fromPos, source) {
    if (this.dead || this.G.state !== 'play' || this.G.godMode || this.hiding) return;
    if (source) this.lastKiller = source;
    this.health -= amount;
    this.lastHit = this.G.time;
    this.fear = Math.min(1, this.fear + amount / 60);
    this.shake = Math.max(this.shake, 0.4);
    this.G.ui.hurt(amount);
    this.G.audio.thud(null, 0.6);
    if (fromPos) {
      const d = new THREE.Vector3(this.pos.x - fromPos.x, 0, this.pos.z - fromPos.z).normalize();
      this.knock.addScaledVector(d, Math.min(14, amount * 0.6));
      this.vel.y = Math.max(this.vel.y, 2.5);
    }
    if (this.health <= 0) { this.health = 0; this.dead = true; this.G.gameOver(); }
  }

  scare(amount) { this.fear = Math.min(1, this.fear + amount); }

  update(dt) {
    const G = this.G, I = G.input, cam = G.camera;
    // ---- look ----
    if (!this.lookLocked) {
      const s = 0.0022 * I.sensitivity;
      this.yaw -= I.mdx * s;
      this.pitch = clamp(this.pitch - I.mdy * s, -1.45, 1.45);
    }

    if (this.inVehicle) { this.updateInVehicle(dt); return; }
    if (this.hiding) { this.updateHiding(dt); return; }

    // ---- move ----
    let fx = 0, fz = 0;
    if (!this.locked) {
      if (I.is('KeyW', 'ArrowUp')) fz -= 1;
      if (I.is('KeyS', 'ArrowDown')) fz += 1;
      if (I.is('KeyA', 'ArrowLeft')) fx -= 1;
      if (I.is('KeyD', 'ArrowRight')) fx += 1;
    }
    const moving = fx !== 0 || fz !== 0;
    const crouch = !this.locked && I.is('ControlLeft', 'ControlRight', 'KeyC');
    const wantSprint = !this.locked && I.is('ShiftLeft', 'ShiftRight') && moving && !crouch && fz <= 0;
    if (this.stamina < 3) this.exhausted = true;
    if (this.exhausted && this.stamina > 30) this.exhausted = false;
    const sprint = wantSprint && !this.exhausted;
    let speed = crouch ? 2.0 : sprint ? 7.6 : 4.0;
    if (this.sigma > 0) this.sigma -= dt;
    if (this.energy > 0) { this.energy -= dt; speed *= 1.25; this.stamina = 100; this.exhausted = false; }
    if (this.hasRTX) speed *= 0.97;
    this.stamina = clamp(this.stamina + (sprint ? -17 : moving ? 8 : 14) * dt, 0, 100);
    this.noise = sprint ? 22 : crouch ? 2.5 : moving ? 9 : 3;

    const len = Math.hypot(fx, fz) || 1;
    fx /= len; fz /= len;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const wx = fx * cos + fz * sin, wz = -fx * sin + fz * cos;
    const accel = this.grounded ? 14 : 3;
    this.vel.x = lerp(this.vel.x, wx * speed * (moving ? 1 : 0), Math.min(1, accel * dt));
    this.vel.z = lerp(this.vel.z, wz * speed * (moving ? 1 : 0), Math.min(1, accel * dt));

    // jump + gravity
    if (!this.locked && I.hit('Space') && this.grounded && !crouch) { this.vel.y = 6; this.grounded = false; }
    this.vel.y -= 19 * G.gravityScale * dt;

    this.pos.x += (this.vel.x + this.knock.x) * dt;
    this.pos.z += (this.vel.z + this.knock.z) * dt;
    this.pos.y += this.vel.y * dt;
    this.knock.multiplyScalar(Math.max(0, 1 - 6 * dt));
    const floor = G.world.floorAt(this.pos.x, this.pos.z, this.pos.y + 0.5);
    if (this.pos.y <= floor) {
      if (!this.grounded && this.vel.y < -7) { G.audio.thud(null, 0.4); this.shake = Math.max(this.shake, 0.15); }
      this.pos.y = floor; this.vel.y = 0; this.grounded = true;
    } else if (this.pos.y > floor + 0.05) this.grounded = false;
    G.world.resolve(this.pos, this.radius, this.curHeight);
    // keep inside the city unless the gate is open
    const lim = 111.3;
    this.pos.x = clamp(this.pos.x, -lim, lim);
    if (this.pos.z > lim) this.pos.z = lim;
    if (this.pos.z < -lim && (G.world.gate.open < 0.7 || Math.abs(this.pos.x) > 5.5)) this.pos.z = -lim;

    // footsteps + head bob
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (this.grounded && hs > 0.5) {
      this.stepDist += hs * dt;
      this.bob += hs * dt * 2.2;
      const stride = sprint ? 2.4 : 1.8;
      if (this.stepDist > stride) { this.stepDist = 0; G.audio.step(crouch ? 0.08 : sprint ? 0.3 : 0.18); }
    }

    // ---- flashlight ----
    if (!this.locked && I.hit('KeyF')) { this.flashOn = !this.flashOn; G.audio.beep(null, 1800, 0.03, 0.15, 'square'); G.director.onFlashlight(this.flashOn); }
    if (this.flashOn) this.battery = Math.max(0, this.battery - dt * 0.55);
    let fi = this.flashOn && this.battery > 0 ? 38 * (0.35 + 0.65 * Math.min(1, this.battery / 25)) : 0;
    if (this.flashOn && (this.battery < 15 || G.director.flashFlicker > 0) && Math.random() < 0.15) fi *= 0.1;
    if (G.director.blackout > 0) fi = 0;
    this.flash.intensity = fi;

    // ---- throw ----
    if (!this.locked && I.hit('KeyR', 'Mouse2')) this.throwBrick();
    this.kickCd = Math.max(0, (this.kickCd || 0) - dt);
    if (!this.locked && I.hit('Mouse0')) this.kick();
    this.updateKickLeg(dt);
    // ---- interact ----
    this.updateInteract();

    // ---- health regen & fear ----
    if (G.time - this.lastHit > 6) this.health = Math.min(100, this.health + dt * 2.5);
    this.updateFear(dt);

    this.curHeight = lerp(this.curHeight, crouch ? 1.0 : this.height, Math.min(1, dt * 10));
    this.applyCamera(dt);
  }

  applyCamera(dt) {
    const cam = this.G.camera;
    this.shake = Math.max(0, this.shake - dt);
    const sh = this.shake * this.shake * 0.6 + this.fear * this.fear * 0.008;
    const bobY = Math.sin(this.bob * 2) * 0.045, bobX = Math.cos(this.bob) * 0.03;
    cam.position.set(
      this.pos.x + Math.cos(this.yaw) * bobX + (Math.random() - 0.5) * sh,
      this.pos.y + this.curHeight + bobY + (Math.random() - 0.5) * sh,
      this.pos.z - Math.sin(this.yaw) * bobX + (Math.random() - 0.5) * sh);
    cam.rotation.set(this.pitch, this.yaw, (Math.random() - 0.5) * sh * 0.3);
    this.viewRTX.visible = this.hasRTX && !this.inVehicle;
    if (this.viewRTX.visible) this.viewRTX.position.y = -0.26 + Math.sin(this.bob * 2) * 0.012;
  }

  updateInVehicle(dt) {
    const v = this.inVehicle, cam = this.G.camera;
    const seat = v.seatWorld();
    this.pos.set(seat.x, seat.y - 1.1, seat.z);
    this.noise = 0;
    cam.position.copy(seat);
    this.shake = Math.max(0, this.shake - dt);
    const sh = this.shake * this.shake * 0.5;
    cam.position.x += (Math.random() - 0.5) * sh; cam.position.y += (Math.random() - 0.5) * sh;
    cam.rotation.set(this.pitch, this.yaw, 0);
    this.viewRTX.visible = false;
    this.updateInteract();
    this.updateFear(dt);
  }

  updateHiding(dt) {
    const cam = this.G.camera, d = this.hiding;
    this.pitch = clamp(this.pitch, -0.35, 0.25);
    this.noise = 0;
    this.flash.intensity = 0;
    this.pos.set(d.pos.x, 0, d.pos.z);
    cam.position.set(d.pos.x, 1.08, d.pos.z);
    cam.rotation.set(this.pitch, this.yaw, 0);
    this.viewRTX.visible = false;
    this.health = Math.min(100, this.health + dt * 4);
    this.updateInteract();
    this.updateFear(dt);
  }

  drinkEnergy() {
    const G = this.G;
    this.energy = 15; this.stamina = 100;
    G.audio.whoosh(0.4);
    setTimeout(() => G.audio.laugh(null, 0.2, 0.5), 900);
    G.ui.say(['*BURP* ...I can see sounds now.', '*BURP* My heart is doing a drum solo.', '*BURP* I could outrun a horse. Probably.'][Math.floor(Math.random() * 3)], 'You', 3, '#76ff03');
    G.ui.toast('BRAINROT ENERGY: +25% speed, endless stamina for 15 s');
  }

  kick() {
    const G = this.G;
    if (this.kickCd > 0 || this.hiding || this.inVehicle || this.stamina < 8) return;
    this.kickCd = 0.55; this.kickT = 0.32; this.stamina -= 10;
    const sig = this.sigma > 0 ? 2 : 1;
    const f = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    let hit = false;
    for (const n of G.npcs) {
      if (n.removed || n.hidden || n.attached || n.frozen) continue;
      const dx = n.pos.x - this.pos.x, dz = n.pos.z - this.pos.z, d = Math.hypot(dx, dz);
      const reach = n.kind === 'robot' ? n.radius + 1.3 : 2.1;
      if (d > reach || Math.abs(n.pos.y - this.pos.y) > 1.5 || (dx * f.x + dz * f.z) / (d || 1) < 0.45) continue;
      hit = true;
      if (n.kind === 'robot') {
        G.audio.clank(n.pos.clone().setY(1.5), 1); this.shake = 0.35; this.damage(3, null, 'robot');
        if (G.fx) G.fx.emit(n.pos.clone().setY(1), 16, 'spark');
        n.stun = Math.max(n.stun || 0, n.mem.boss ? 0.2 : 0.8);
      } else {
        if (n.rd) { n.rd.vx += f.x * 8; n.rd.vz += f.z * 8; n.rd.vy += 4; n.rd.air = true; n.rd.phase = 'fall'; n.rd.tiltVel += 4; }
        else { n.stopScriptIfInterruptible(); n.fallFrom({ dir: f, power: (n.hostile ? 9 : 8) * sig, up: 4 * sig, spin: 4 * sig, lie: n.hostile ? 1.6 : 2.2 }); }
        if (n.mem.awake && n.hostile) n.mem.until = Math.min(n.mem.until || 0, G.time + 6);
        G.audio.thud(n.pos.clone().setY(1.2), 1);
        if (G.fx) G.fx.emit(n.pos.clone().setY(1.1), 14, 'dust');
        G.freezeT = 0.07; this.shake = Math.max(this.shake, 0.3);
      }
      G.director.onKick(n);
    }
    for (const p of G.props.list) {
      const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d > 1.9 || (dx * f.x + dz * f.z) / (d || 1) < 0.4) continue;
      p.rested = false; p.rest = 0; p.thrown = true;
      p.vel.set(f.x * 13, 5, f.z * 13); p.ang.set(10, 6, 8);
      G.audio.clank(p.pos, 0.4); hit = true;
    }
    const T = G.director.toilet;
    if (T && T.state === 'chase' && T.pos.distanceTo(this.pos) < 2.3) { T.state = 'slip'; T.timer = 0; T.vel.set(f.x * 12, 0, f.z * 12); G.ui.say('*YEET*', '', 1); hit = true; }
    if (!hit) G.audio.whoosh(0.2);
    this.noise = 14;
  }

  updateKickLeg(dt) {
    if (this.kickT > 0) {
      this.kickT -= dt;
      const k = 1 - Math.max(0, this.kickT) / 0.32; // 0 -> 1
      const swing = Math.sin(Math.min(1, k) * Math.PI);
      this.leg.visible = true;
      this.leg.rotation.x = -0.2 - swing * 1.5;
      this.leg.position.set(0.12, -0.9 + swing * 0.35, -0.35 - swing * 0.25);
    } else this.leg.visible = false;
  }

  throwBrick() {
    const G = this.G;
    if (this.bricks <= 0) { G.ui.toast('No bricks. Find a brick pile.'); return; }
    this.bricks--;
    const dir = new THREE.Vector3(); G.camera.getWorldDirection(dir);
    const from = G.camera.position.clone().addScaledVector(dir, 0.6);
    G.props.spawnBrick(from, dir.multiplyScalar(19).add(new THREE.Vector3(0, 3, 0)));
    G.audio.whoosh(0.25);
    this.noise = 15;
  }

  updateInteract() {
    const G = this.G;
    if (this.locked && !this.inVehicle) { G.ui.prompt(null); this.focus = null; return; }
    const cam = G.camera;
    const dir = new THREE.Vector3(); cam.getWorldDirection(dir);
    let best = null, bestScore = 1e9;
    const v = new THREE.Vector3();
    for (const it of G.world.interactables) {
      if (it.enabled && !it.enabled(G)) continue;
      const p = typeof it.pos === 'function' ? it.pos() : it.pos;
      v.subVectors(p, cam.position);
      const d = v.length();
      if (d > it.r) continue;
      const dot = v.normalize().dot(dir);
      if (dot < 0.55 && d > 1.2) continue;
      const score = d * (1.6 - dot);
      if (score < bestScore) { bestScore = score; best = it; }
    }
    this.focus = best;
    if (best) {
      const label = typeof best.label === 'function' ? best.label(G) : best.label;
      G.ui.prompt(`[E] ${label}`);
      if (G.input.hit('KeyE')) best.act(G);
    } else G.ui.prompt(null);
  }

  updateFear(dt) {
    const G = this.G;
    // darkness: distance to the nearest lit lamp
    let lit = G.lighting.nearestLitDist(this.pos);
    let target = 0.08;
    if (lit > 12 && !this.flashOn) target += 0.25;
    if (G.director.horror) target += 0.25;
    if (this.inBasement()) target += 0.15;
    for (const t of G.director.threats()) {
      const d = Math.hypot(t.x - this.pos.x, t.z - this.pos.z);
      if (d < 18) target += (18 - d) / 18 * 0.35;
    }
    target = Math.min(1, target);
    this.fear += (target - this.fear) * Math.min(1, dt * (target > this.fear ? 0.6 : 0.25));
    if (this.hiding) target = Math.max(0, target - 0.35);
    if (this.fear > 0.97) { this.health -= dt * 0.8; this.lastKiller = 'fear'; } // pure terror hurts
    if (this.health <= 0 && !this.dead) { this.dead = true; G.gameOver(); }
  }
}
