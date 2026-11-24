// NPC controller: generator-based scripts, steering with obstacle avoidance, perception,
// ragdoll-style physical falls (ballistic body + inverted-pendulum tipping + floppy limbs).
import * as THREE from 'three';
import { pose } from './characters.js';
import { rand, angleWrap, lerp, clamp } from './util.js';

const UP = new THREE.Vector3(0, 1, 0);

/** Script actions (yield these from a generator function*). */
export const A = {
  wait: (t, anim = 'idle', o = {}) => ({ type: 'wait', t, anim, ...o }),
  anim: (name, t, o = {}) => ({ type: 'wait', t, anim: name, ...o }),
  move: (x, z, speed = 1.6, anim = null, o = {}) => ({ type: 'move', x, z, speed, anim, ...o }),
  moveTo: (v, speed = 1.6, anim = null, o = {}) => ({ type: 'move', x: v.x, z: v.z, speed, anim, ...o }),
  chase: (dur, speed = 6, o = {}) => ({ type: 'chase', dur, speed, ...o }),
  flee: (dur, speed = 6.5, o = {}) => ({ type: 'flee', dur, speed, ...o }),
  fall: (dir = 'forward', power = 3, o = {}) => ({ type: 'fall', dir, power, ...o }),
  face: (target = 'player', t = 0.4, anim = 'idle') => ({ type: 'face', target, t, anim }),
  say: (text, o = {}) => ({ type: 'say', text, ...o }),
  until: (fn, anim = 'idle', timeout = 1e9, o = {}) => ({ type: 'until', fn, anim, timeout, ...o }),
  call: (fn) => ({ type: 'call', fn }),
};

export class NPC {
  constructor(G, rig, o = {}) {
    this.G = G;
    this.rig = rig;
    this.root = rig.root;
    this.pos = rig.root.position;
    if (o.pos) this.pos.copy(o.pos);
    this.name = o.name || 'Citizen';
    this.color = o.color || '#ccc';
    this.heading = o.heading || 0;
    this.root.rotation.y = this.heading;
    this.speed = 0;
    this.anim = o.anim || 'idle';
    this.ai = o.ai || 'wander';
    this.mem = {};
    this.radius = o.radius || 0.35;
    this.height = o.height || 1.9;
    this.voice = o.voice || { pitch: rand(0.7, 1.3), rate: 1.05 };
    this.damage = o.damage || 7;
    this.hitCd = 0;
    this.script = null; this.cur = null;
    this.rd = null;
    this.frozen = false; this.attached = false; this.floating = false;
    this.special = !!o.special;
    this.runSpeed = o.runSpeed || rand(5.2, 6.4);
    this.walkSpeed = o.walkSpeed || rand(1.3, 1.9);
    this.kind = o.kind || 'human';
    this.removed = false;
    this.lod = 0;
    this.floatPhase = Math.random() * 6;
    G.scene.add(this.root);
  }

  // ----- scripting -----
  run(genFn, ...args) {
    this.script = genFn(this, this.G, ...args);
    this.cur = null;
    this.advance();
    return this;
  }
  stopScript() { this.script = null; this.cur = null; }
  advance() {
    let guard = 0;
    while (this.script && guard++ < 20) {
      const r = this.script.next();
      if (r.done) { this.script = null; this.cur = null; return; }
      this.cur = r.value; this.cur.el = 0;
      if (this.cur.type === 'fall') { this.fallFrom(this.cur); return; }
      if (this.cur.type === 'say') { this.say(this.cur.text, this.cur.dur, this.cur.loud); continue; }
      if (this.cur.type === 'call') { this.cur.fn(this); continue; }
      return;
    }
  }

  say(text, dur = 2.4, loud = false) {
    const G = this.G;
    const d = this.distToPlayer();
    if (d > (loud ? 120 : 45)) return;
    G.ui.say(text, this.name, dur, this.color);
    G.audio.speak(text, { ...this.voice, volume: clamp(1.2 - d / 50, 0.2, 1) });
  }

  // ----- helpers -----
  distToPlayer() { const p = this.G.player.pos; return Math.hypot(p.x - this.pos.x, p.z - this.pos.z); }
  forward(v = new THREE.Vector3()) { return v.set(Math.sin(this.heading), 0, Math.cos(this.heading)); }
  turnTo(angle, dt, rate = 10) {
    const d = angleWrap(angle - this.heading);
    this.heading += clamp(d, -rate * dt, rate * dt);
    this.root.rotation.y = this.heading;
  }
  faceNow(x, z) { this.heading = Math.atan2(x - this.pos.x, z - this.pos.z); this.root.rotation.y = this.heading; }
  facePlayer() { const p = this.G.player.pos; this.faceNow(p.x, p.z); }

  canSeePlayer(range = 30, fov = 0.35) {
    const p = this.G.player.pos;
    const dx = p.x - this.pos.x, dz = p.z - this.pos.z, d = Math.hypot(dx, dz);
    if (d > range) return false;
    const f = (Math.sin(this.heading) * dx + Math.cos(this.heading) * dz) / (d || 1);
    if (f < fov && d > 3) return false;
    return this.G.world.lineClear(this.pos.x, this.pos.z, p.x, p.z);
  }
  canHearPlayer() { return this.distToPlayer() < this.G.player.noise; }

  /** Move toward a point with obstacle avoidance. Returns collider hit (or null). */
  steer(tx, tz, speed, dt, anim = null) {
    const W = this.G.world;
    const dx = tx - this.pos.x, dz = tz - this.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.05) return null;
    const desired = Math.atan2(dx, dz);
    let best = desired;
    const look = Math.min(1.4, d);
    if (!this.mem.noAvoid && !W.isFree(this.pos.x + Math.sin(desired) * look, this.pos.z + Math.cos(desired) * look, this.radius, this.pos.y)) {
      const side = this.mem.avoid || (this.mem.avoid = Math.random() < 0.5 ? 1 : -1);
      for (const o of [0.5, 1.0, 1.5, 2.1, 2.7]) {
        let found = false;
        for (const s of [side, -side]) {
          const a = desired + o * s;
          if (W.isFree(this.pos.x + Math.sin(a) * 1.4, this.pos.z + Math.cos(a) * 1.4, this.radius, this.pos.y)) { best = a; this.mem.avoid = s; found = true; break; }
        }
        if (found) break;
      }
    } else if (Math.random() < 0.01) this.mem.avoid = 0;
    const step = Math.min(speed * dt, d);
    this.pos.x += Math.sin(best) * step;
    this.pos.z += Math.cos(best) * step;
    const hit = W.resolve(this.pos, this.radius, this.height);
    this.turnTo(best, dt, speed > 4 ? 9 : 6);
    this.speed = speed;
    this.moving = true;
    this.anim = anim || (speed > 3.5 ? 'run' : 'walk');
    this.rig.phase += dt * (2 + speed * 1.9);
    // physical comedy: running full speed into a closed door or a lamp post knocks you down
    if (hit && speed > 4.5 && (hit.door || (hit.pole && this.mem.bonkPoles))) {
      this.G.audio.thud(this.pos.clone().setY(1.5), 1);
      if (hit.pole) this.G.audio.clank(this.pos.clone().setY(1.5), 0.6);
      this.fallFrom({ dir: 'backward', power: 3.5, up: 1.5, lie: 2.5 });
    }
    return hit;
  }

  // ----- ragdoll -----
  /** Start a physical fall. a: { dir: 'forward'|'backward'|Vector3, power, up, lie, getUp, spin } */
  fallFrom(a) {
    let dir;
    if (a.dir === 'forward') dir = this.forward();
    else if (a.dir === 'backward') dir = this.forward().negate();
    else if (a.dir === 'left') dir = new THREE.Vector3(Math.cos(this.heading), 0, -Math.sin(this.heading));
    else dir = a.dir.clone().setY(0).normalize();
    if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
    const axis = new THREE.Vector3(dir.z, 0, -dir.x).applyAxisAngle(UP, -this.heading).normalize();
    const p = a.power ?? 3;
    this.rd = {
      vx: dir.x * p, vz: dir.z * p, vy: a.up || 0,
      axis, tilt: 0, tiltVel: 1.2 + p * 0.5 + (a.spin || 0),
      air: (a.up || 0) > 0.1, phase: 'fall', timer: 0, lie: a.lie ?? 2, getUp: a.getUp !== false,
      limbs: this.randLimbs(), thuds: 0,
    };
    this.speed = 0;
    if (this.G.director && this.G.director.onFall) this.G.director.onFall(this);
    if (!a.silent && Math.random() < 0.6 && this.kind === 'human') this.G.audio.scream(this.pos.clone().setY(1.6), rand(0.8, 1.3), 0.5, 0.25);
  }
  randLimbs() { return { alx: rand(-3, 0.5), arx: rand(-3, 0.5), alz: rand(0, 1.4), arz: rand(-1.4, 0), llx: rand(-1, 0.6), lrx: rand(-1, 0.6) }; }
  isDown() { return !!this.rd; }
  /** Wake a ragdoll that was told not to get up. */
  getUp() { if (this.rd && this.rd.phase === 'lie') { this.rd.getUp = true; this.rd.timer = this.rd.lie; } }

  updateRagdoll(dt) {
    const r = this.rd, G = this.G, W = G.world;
    const floor = W.floorAt(this.pos.x, this.pos.z, this.pos.y + 0.5);
    r.vy -= 18 * G.gravityScale * dt;
    this.pos.x += r.vx * dt; this.pos.z += r.vz * dt; this.pos.y += r.vy * dt;
    let grounded = false;
    if (this.pos.y <= floor) {
      this.pos.y = floor; grounded = true;
      if (r.vy < -4) { r.vy = -r.vy * 0.3; G.audio.thud(this.pos, 0.8); r.limbs = this.randLimbs(); grounded = false; if (G.fx) G.fx.emit(this.pos, 10, 'dust'); }
      else r.vy = 0;
    }
    if (grounded) { const f = Math.max(0, 1 - 4.5 * dt); r.vx *= f; r.vz *= f; r.air = false; }
    const hsp = Math.hypot(r.vx, r.vz);
    const hit = W.resolve(this.pos, this.radius, 1.2);
    if (hit && hsp > 3) { G.audio.thud(this.pos.clone().setY(1), 0.7); r.vx *= -0.3; r.vz *= -0.3; }

    if (r.phase === 'fall') {
      if (r.air) r.tilt += r.tiltVel * dt;
      else {
        r.tilt = angleWrap(r.tilt);
        const s = Math.sign(r.tilt) || 1, at = Math.abs(r.tilt), target = s * Math.PI / 2;
        if (at < Math.PI / 2) {
          r.tiltVel += s * (8.5 * Math.sin(Math.max(at, 0.15))) * dt;
          r.tilt += r.tiltVel * dt;
          if (Math.abs(r.tilt) >= Math.PI / 2) {
            r.tilt = target;
            if (Math.abs(r.tiltVel) > 1.5 && r.thuds < 2) { G.audio.thud(this.pos, 0.9); r.thuds++; r.limbs = this.randLimbs(); if (G.fx) G.fx.emit(this.pos.clone().add(this.forward().multiplyScalar(0)), 8, 'dust'); if (this.onImpact) this.onImpact(); }
            r.tiltVel = -r.tiltVel * 0.22;
          }
        } else {
          r.tiltVel += (target - r.tilt) * 40 * dt; r.tiltVel *= Math.max(0, 1 - 8 * dt); r.tilt += r.tiltVel * dt;
        }
        if (Math.abs(Math.abs(r.tilt) - Math.PI / 2) < 0.06 && Math.abs(r.tiltVel) < 0.5 && hsp < 0.4) { r.phase = 'lie'; r.timer = 0; }
      }
    } else if (r.phase === 'lie') {
      r.timer += dt;
      if (r.getUp && r.timer >= r.lie) { r.phase = 'getup'; r.t = 0; r.from = r.tilt; }
    } else if (r.phase === 'getup') {
      r.t += dt / 0.75;
      const e = r.t >= 1 ? 1 : 1 - Math.pow(1 - r.t, 3);
      r.tilt = r.from * (1 - e);
      if (r.t >= 1) {
        this.rd = null;
        this.rig.body.quaternion.identity(); this.rig.body.position.y = 0;
        if (this.cur && this.cur.type === 'fall') { this.cur = null; this.advance(); }
        return;
      }
    }
    this.rig.body.quaternion.setFromAxisAngle(r.axis, r.tilt);
    this.rig.body.position.y = Math.abs(Math.sin(r.tilt)) * 0.14;
    // floppy limbs
    const k = Math.min(1, dt * (r.air ? 14 : 6)), L = r.limbs, rg = this.rig, t = G.time;
    const fl = r.air ? Math.sin(t * 25) * 0.8 : 0;
    rg.armL.rotation.x = lerp(rg.armL.rotation.x, L.alx + fl, k); rg.armR.rotation.x = lerp(rg.armR.rotation.x, L.arx - fl, k);
    rg.armL.rotation.z = lerp(rg.armL.rotation.z, L.alz, k); rg.armR.rotation.z = lerp(rg.armR.rotation.z, L.arz, k);
    rg.legL.rotation.x = lerp(rg.legL.rotation.x, L.llx + fl * 0.5, k); rg.legR.rotation.x = lerp(rg.legR.rotation.x, L.lrx - fl * 0.5, k);
    rg.spine.rotation.x = lerp(rg.spine.rotation.x, r.phase === 'lie' ? 0.1 : 0.3, k);
    rg.head.rotation.x = lerp(rg.head.rotation.x, r.phase === 'getup' ? 0 : rand(-0.3, 0.3), k * 0.3);
  }

  /** Something hit us (thrown brick, flying RTX, ...). */
  hitBy(dirVec, power = 4) {
    if (this.kind === 'robot') { this.stun = 4.5; this.G.audio.clank(this.pos.clone().setY(3), 1); return; }
    if (this.rd || this.attached) return;
    this.stopScriptIfInterruptible();
    this.fallFrom({ dir: dirVec, power, up: 2.5, lie: 2.5, spin: 2 });
  }
  stopScriptIfInterruptible() { if (!this.mem.uninterruptible) { this.cur = null; this.script = null; } }

  // ----- per-frame -----
  update(dt) {
    if (this.removed) return;
    const G = this.G;
    this.hitCd -= dt;
    this.moving = false;
    if (this.frozen) { pose(this.rig, this.frozenPose || 'stare', dt, G.time, 0); return; }
    if (this.rd) { this.updateRagdoll(dt); return; }
    if (this.attached) { pose(this.rig, this.anim, dt, G.time, this.speed); this.rig.phase += dt * (2 + this.speed * 1.9); return; }

    if (this.script) {
      if (!this.cur) this.advance();
      if (this.cur && this.step(this.cur, dt)) { this.cur = null; this.advance(); }
    } else this.brain(dt);
    if (this.rd) return;

    if (!this.moving) this.speed = 0;
    const floor = G.world.floorAt(this.pos.x, this.pos.z, this.pos.y + 0.5);
    if (this.floating) {
      this.floatPhase += dt;
      this.pos.y = floor + 1.6 + Math.sin(this.floatPhase * 1.3) * 0.6;
      this.rig.body.rotation.z = Math.sin(this.floatPhase * 0.7) * 0.6;
      this.rig.body.rotation.x = Math.cos(this.floatPhase * 0.5) * 0.4;
    } else if (this.pos.y !== floor && !this.mem.keepY) this.pos.y = floor;
    if (this.lod === 0 || (G.frame + this.id) % 3 === 0) pose(this.rig, this.anim, this.lod ? dt * 3 : dt, G.time, this.speed);
  }

  step(a, dt) {
    const G = this.G, P = G.player.pos;
    a.el += dt;
    switch (a.type) {
      case 'wait':
        this.anim = a.anim;
        if (a.look) { const t = a.look === 'player' ? P : a.look; this.turnTo(Math.atan2(t.x - this.pos.x, t.z - this.pos.z), dt, 6); }
        return a.el >= a.t;
      case 'move': {
        const d = Math.hypot(a.x - this.pos.x, a.z - this.pos.z);
        if (d < (a.stop ?? 0.4) || a.el > (a.timeout ?? 25)) return true;
        const hit = this.steer(a.x, a.z, a.speed, dt, a.anim);
        if (hit && a.onHit && a.onHit(hit, this)) return true;
        return !!this.rd;
      }
      case 'chase': {
        const t = a.target ? a.target() : P;
        const d = Math.hypot(t.x - this.pos.x, t.z - this.pos.z);
        if (a.reach && d < a.reach) return true;
        if (d > 0.9) this.steer(t.x, t.z, a.speed, dt, a.anim);
        else { this.anim = 'idle'; this.facePlayer(); }
        return a.el >= a.dur || !!this.rd;
      }
      case 'flee': {
        const s = a.from ? a.from() : P;
        let dx = this.pos.x - s.x, dz = this.pos.z - s.z; const d = Math.hypot(dx, dz) || 1;
        this.steer(this.pos.x + (dx / d) * 6, this.pos.z + (dz / d) * 6, a.speed, dt, a.anim || 'panic');
        return a.el >= a.dur;
      }
      case 'face': {
        const t = a.target === 'player' ? P : a.target;
        this.anim = a.anim;
        this.turnTo(Math.atan2(t.x - this.pos.x, t.z - this.pos.z), dt, 8);
        return a.el >= a.t;
      }
      case 'until':
        this.anim = a.anim;
        if (a.look) { const t = a.look === 'player' ? P : a.look; this.turnTo(Math.atan2(t.x - this.pos.x, t.z - this.pos.z), dt, 6); }
        return a.fn(this) || a.el >= a.timeout;
      case 'fall': return !this.rd;
      default: return true;
    }
  }

  /** Default behaviour when no script is running. */
  brain(dt) {
    const G = this.G, m = this.mem;
    if (typeof this.ai === 'function') { this.ai(this, dt); return; }
    switch (this.ai) {
      case 'wander': {
        if (!m.target || m.timer <= 0) {
          m.timer = rand(6, 16);
          m.pause = Math.random() < 0.3 ? rand(1, 4) : 0;
          for (let i = 0; i < 8; i++) {
            const a = Math.random() * Math.PI * 2, r = rand(5, 18);
            const x = this.pos.x + Math.cos(a) * r, z = this.pos.z + Math.sin(a) * r;
            if (G.world.isFree(x, z, 0.6) && G.world.lineClear(this.pos.x, this.pos.z, x, z, 1)) { m.target = new THREE.Vector3(x, 0, z); break; }
          }
        }
        m.timer -= dt;
        if (m.pause > 0) {
          m.pause -= dt; this.anim = 'idle';
          if (this.distToPlayer() < 7) this.turnTo(Math.atan2(G.player.pos.x - this.pos.x, G.player.pos.z - this.pos.z), dt, 3);
          return;
        }
        if (m.target) {
          if (Math.hypot(m.target.x - this.pos.x, m.target.z - this.pos.z) < 0.6) { m.target = null; m.pause = rand(0.5, 3); }
          else this.steer(m.target.x, m.target.z, this.walkSpeed, dt);
        }
        return;
      }
      case 'horror': {
        const d = this.distToPlayer();
        const P = G.player.pos;
        if (G.player.inVehicle || G.player.inBasement() || G.player.hiding) { this.anim = 'stare'; this.facePlayer(); return; }
        if (d > 70) { this.steer(P.x, P.z, this.walkSpeed * 1.5, dt); return; }
        this.steer(P.x, P.z, this.runSpeed, dt, Math.random() < 0.5 ? 'run' : 'panic');
        if (Math.random() < dt * 0.035) { this.fallFrom({ dir: 'forward', power: 4.5, up: 0.5, lie: rand(0.6, 1.5) }); return; }
        if (d < 1.15 && this.hitCd <= 0) {
          this.hitCd = 2;
          G.player.damage(this.damage, this.pos, this.mem.mannequin ? 'mannequin' : 'citizen');
          this.fallFrom({ dir: 'backward', power: 3, up: 1, lie: rand(1.5, 2.5) });
        }
        return;
      }
      case 'stare':
        this.anim = 'stare'; this.facePlayer(); return;
      case 'idle': default:
        this.anim = this.mem.idleAnim || 'idle';
    }
  }

  remove() {
    this.removed = true;
    this.G.scene.remove(this.root);
  }
}

/** Pairwise NPC collisions: separation + head-on crashes knock both down. */
export function collideNPCs(list, G) {
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a.removed || a.attached || a.frozen || a.hidden || a.kind === 'robot') continue;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      if (b.removed || b.attached || b.frozen || b.hidden || b.kind === 'robot') continue;
      if (Math.abs(a.pos.y - b.pos.y) > 1.5) continue;
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, rr = a.radius + b.radius;
      const d2 = dx * dx + dz * dz;
      if (d2 > rr * rr || d2 < 1e-6) continue;
      const d = Math.sqrt(d2), push = (rr - d) / 2, nx = dx / d, nz = dz / d;
      if (!a.rd && !b.rd) {
        // closing speed along the normal
        const va = a.speed * (Math.sin(a.heading) * nx + Math.cos(a.heading) * nz);
        const vb = b.speed * (Math.sin(b.heading) * -nx + Math.cos(b.heading) * -nz);
        if (va + vb > 7.5 && !a.mem.noCrash && !b.mem.noCrash) {
          G.audio.thud(a.pos.clone().setY(1.6), 1);
          a.stopScriptIfInterruptible(); b.stopScriptIfInterruptible();
          a.fallFrom({ dir: new THREE.Vector3(-nx, 0, -nz), power: 3, up: 1.5, lie: rand(1.5, 3) });
          b.fallFrom({ dir: new THREE.Vector3(nx, 0, nz), power: 3, up: 1.5, lie: rand(1.5, 3) });
          if (G.director) G.director.onCrash(a, b);
          continue;
        }
      }
      if (!a.rd) { a.pos.x -= nx * push; a.pos.z -= nz * push; }
      if (!b.rd) { b.pos.x += nx * push; b.pos.z += nz * push; }
    }
  }
}
