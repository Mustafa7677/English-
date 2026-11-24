// Lighting & atmosphere: moon, fog, street-lamp light pool (N real lights for the nearest lamps),
// special lights, and mood transitions (normal -> horror red -> finale green).
import * as THREE from 'three';

export const MOODS = {
  normal: { fog: new THREE.Color('#0b100d'), amb: new THREE.Color('#4a5a6a'), ambI: 0.85, moon: new THREE.Color('#7088a8'), moonI: 0.35 },
  horror: { fog: new THREE.Color('#1a0505'), amb: new THREE.Color('#5a2a2a'), ambI: 0.45, moon: new THREE.Color('#a03030'), moonI: 0.25 },
  finale: { fog: new THREE.Color('#0a2a06'), amb: new THREE.Color('#3a7a2a'), ambI: 0.7, moon: new THREE.Color('#76ff03'), moonI: 0.45 },
};

export class Lighting {
  constructor(G) {
    this.G = G;
    const scene = G.scene;
    this.fog = new THREE.FogExp2(MOODS.normal.fog.clone(), 0.032);
    scene.fog = this.fog;
    scene.background = this.fog.color;
    this.hemi = new THREE.HemisphereLight(MOODS.normal.amb.clone(), 0x141410, MOODS.normal.ambI);
    scene.add(this.hemi);
    this.moon = new THREE.DirectionalLight(MOODS.normal.moon.clone(), MOODS.normal.moonI);
    this.moon.position.set(30, 60, 20);
    this.moon.shadow.camera.left = -40; this.moon.shadow.camera.right = 40;
    this.moon.shadow.camera.top = 40; this.moon.shadow.camera.bottom = -40;
    this.moon.shadow.camera.far = 150;
    scene.add(this.moon); scene.add(this.moon.target);
    this.pool = [];
    this.mood = 'normal';
    this.moodT = 1;
    this.from = null;
    this.timer = 0;
    // fixed special lights
    this.special = [];
  }

  addSpecial(color, intensity, distance, pos) {
    const l = new THREE.PointLight(color, intensity, distance, 1.6);
    l.position.copy(pos); this.G.scene.add(l);
    l.userData.base = intensity;
    this.special.push(l);
    return l;
  }

  configure(q) {
    // q: { lampLights, shadows, shadowSize, fogDensity }
    for (const l of this.pool) this.G.scene.remove(l);
    this.pool = [];
    for (let i = 0; i < q.lampLights; i++) {
      const l = new THREE.PointLight(0xffd890, 0, 16, 1.7);
      this.G.scene.add(l); this.pool.push(l);
    }
    this.moon.castShadow = q.shadows;
    this.moon.shadow.mapSize.set(q.shadowSize, q.shadowSize);
    if (this.moon.shadow.map) { this.moon.shadow.map.dispose(); this.moon.shadow.map = null; }
    this.baseDensity = q.fogDensity;
    this.fog.density = q.fogDensity;
    this.timer = 0;
  }

  setMood(name, seconds = 4) {
    const m = MOODS[name];
    this.from = { fog: this.fog.color.clone(), amb: this.hemi.color.clone(), ambI: this.hemi.intensity, moon: this.moon.color.clone(), moonI: this.moon.intensity };
    this.to = m; this.mood = name; this.moodT = 0; this.moodDur = seconds;
  }

  nearestLitDist(p) {
    let best = 1e9;
    for (const l of this.G.world.lamps) {
      if (l.state === 'off') continue;
      const d = Math.hypot(l.pos.x - p.x, l.pos.z - p.z);
      if (d < best) best = d;
    }
    return best;
  }

  update(dt) {
    const G = this.G, P = G.player.pos;
    // shadow camera follows the player
    this.moon.position.set(P.x + 30, 60, P.z + 20);
    this.moon.target.position.set(P.x, 0, P.z);
    // mood blend
    if (this.moodT < 1) {
      this.moodT = Math.min(1, this.moodT + dt / this.moodDur);
      const t = this.moodT, f = this.from, m = this.to;
      this.fog.color.copy(f.fog).lerp(m.fog, t);
      this.hemi.color.copy(f.amb).lerp(m.amb, t);
      this.hemi.intensity = f.ambI + (m.ambI - f.ambI) * t;
      this.moon.color.copy(f.moon).lerp(m.moon, t);
      this.moon.intensity = f.moonI + (m.moonI - f.moonI) * t;
    }
    // assign pooled point lights to the nearest lit lamps (twice a second)
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 0.5;
      const lamps = G.world.lamps.filter((l) => l.state !== 'off')
        .map((l) => ({ l, d: (l.pos.x - P.x) ** 2 + (l.pos.z - P.z) ** 2 }))
        .sort((a, b) => a.d - b.d);
      this.pool.forEach((light, i) => {
        const e = lamps[i];
        if (e && e.d < 55 * 55) {
          light.position.copy(e.l.pos);
          light.color.set(e.l.state === 'red' ? 0xff2010 : 0xffd890);
          light.userData.lamp = e.l;
          light.intensity = 14;
        } else { light.intensity = 0; light.userData.lamp = null; }
      });
    }
    for (const light of this.pool) {
      const l = light.userData.lamp;
      if (l) light.intensity = l.bulb.material === G.world.bulbOff ? 0 : 14;
    }
  }
}
