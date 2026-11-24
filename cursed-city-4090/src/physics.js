// Simple rigid "prop" physics: gravity, bouncing, spin, wall collisions, hits on NPCs.
import * as THREE from 'three';
import { makeBrick } from './characters.js';
import { rand } from './util.js';

export class Props {
  constructor(G) { this.G = G; this.list = []; }

  /** o: { r, kind, thrown, bounce, onHit(prop, npc), onRest(prop), owner } */
  spawn(mesh, pos, vel, o = {}) {
    mesh.position.copy(pos);
    this.G.scene.add(mesh);
    const p = {
      mesh, pos: mesh.position, vel: vel.clone(),
      ang: new THREE.Vector3(rand(-8, 8), rand(-8, 8), rand(-8, 8)),
      r: o.r || 0.15, kind: o.kind || 'thing', thrown: o.thrown ?? true,
      bounce: o.bounce ?? 0.35, onHit: o.onHit, onRest: o.onRest, onLand: o.onLand,
      rest: 0, rested: false, alive: true, owner: o.owner, ignore: o.ignore,
    };
    this.list.push(p);
    return p;
  }

  spawnBrick(from, vel) {
    const G = this.G;
    return this.spawn(makeBrick(), from, vel, {
      kind: 'brick', r: 0.12,
      onRest: (p) => {
        // thrown bricks can be picked up again
        const it = G.world.addInteract({
          pos: () => p.pos, r: 2, label: 'Pick up brick',
          act: () => { G.player.bricks++; this.remove(p); G.world.removeInteract(it); },
        });
        p.interact = it;
      },
    });
  }

  remove(p) {
    p.alive = false;
    this.G.scene.remove(p.mesh);
    if (p.interact) this.G.world.removeInteract(p.interact);
    const i = this.list.indexOf(p); if (i >= 0) this.list.splice(i, 1);
  }

  update(dt) {
    const G = this.G, W = G.world;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      if (p.held) continue;
      if (p.rested) continue;
      p.vel.y -= 18 * G.gravityScale * dt;
      p.pos.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += p.ang.x * dt; p.mesh.rotation.y += p.ang.y * dt; p.mesh.rotation.z += p.ang.z * dt;
      const floor = W.floorAt(p.pos.x, p.pos.z, p.pos.y);
      let onFloor = false;
      if (p.pos.y - p.r <= floor) {
        p.pos.y = floor + p.r;
        if (p.vel.y < -2.5) {
          G.audio.thud(p.pos, Math.min(0.6, -p.vel.y * 0.05));
          if (p.onLand) p.onLand(p);
        }
        p.vel.y = -p.vel.y * p.bounce;
        if (Math.abs(p.vel.y) < 0.8) p.vel.y = 0;
        p.vel.x *= 0.82; p.vel.z *= 0.82; p.ang.multiplyScalar(0.7);
        onFloor = true;
        p.thrown = p.thrown && Math.hypot(p.vel.x, p.vel.z) > 5;
      }
      const hit = W.resolve(p.pos, p.r, 0.3);
      if (hit) { p.vel.x *= -0.4; p.vel.z *= -0.4; G.audio.clank(p.pos, 0.25); }
      // hit NPCs
      const sp = p.vel.length();
      if (p.thrown && sp > 5) {
        for (const n of G.npcs) {
          if (n.removed || n.hidden || n === p.ignore || n.attached) continue;
          const rr = n.radius + p.r + (n.kind === 'robot' ? 0.6 : 0.1);
          const top = n.pos.y + (n.kind === 'robot' ? 3.8 : 2.0);
          if (p.pos.y < n.pos.y || p.pos.y > top) continue;
          if (Math.hypot(n.pos.x - p.pos.x, n.pos.z - p.pos.z) > rr) continue;
          G.audio.thud(p.pos, 0.9);
          if (p.kind === 'brick' || p.kind === 'rtx') G.audio.clank(p.pos, 0.3);
          n.hitBy(p.vel, 4.5);
          if (p.onHit) p.onHit(p, n);
          G.director.onPropHit(p, n);
          p.vel.set(-p.vel.x * 0.15, 2, -p.vel.z * 0.15);
          p.thrown = false;
          break;
        }
      }
      if (onFloor && sp < 0.35) {
        p.rest += dt;
        if (p.rest > 0.3) { p.rested = true; p.vel.set(0, 0, 0); if (p.onRest) p.onRest(p); }
      } else p.rest = 0;
      if (p.pos.y < -60) this.remove(p);
    }
  }
}
