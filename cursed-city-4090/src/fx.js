// Post-processing (bloom, film grain, chromatic aberration, vignette, grading) and a pooled particle system.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const FilmShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: 0.025 },
    uAberr: { value: 0.0012 }, uFear: { value: 0 }, uTint: { value: new THREE.Vector3(0.92, 1.04, 0.96) },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uGrain, uAberr, uFear; uniform vec3 uTint; varying vec2 vUv;
    float rnd(vec2 c){ return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 d = vUv - 0.5;
      float ab = uAberr * (1.0 + uFear * 5.0);
      vec3 c = vec3(texture2D(tDiffuse, vUv + d * ab * 10.0).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - d * ab * 10.0).b);
      c *= uTint;                                                    // teal-ish night grade
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(l), c, 1.0 - uFear * 0.45);                      // fear drains colour
      c += (rnd(vUv * 900.0 + uTime) - 0.5) * (uGrain + uFear * 0.04); // film grain
      c *= 0.96 + 0.04 * sin(vUv.y * 900.0);                         // faint scanlines
      float v = smoothstep(0.95, 0.25, length(d) * (1.0 + uFear * 0.6));
      c *= mix(0.45, 1.0, v);                                        // vignette
      gl_FragColor = vec4(c, 1.0);
    }`,
};

export class FX {
  constructor(G) {
    this.G = G;
    const { renderer, scene, camera } = G;
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.75, 0.45, 0.55);
    this.composer.addPass(this.bloom);
    // grade/grain run after the sRGB output conversion, so the grain stays subtle in the shadows
    this.composer.addPass(new OutputPass());
    this.film = new ShaderPass(FilmShader);
    this.composer.addPass(this.film);
    this.enabled = true;
    this.initParticles();
  }

  setEnabled(on) { this.enabled = on; }
  resize() {
    const r = this.G.renderer;
    this.composer.setPixelRatio(r.getPixelRatio());
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  render(dt) {
    const G = this.G;
    this.updateParticles(dt);
    if (!this.enabled) { G.renderer.render(G.scene, G.camera); return; }
    const u = this.film.uniforms;
    u.uTime.value = (u.uTime.value + dt) % 100;
    u.uFear.value = G.player ? G.player.fear : 0;
    const mood = G.lighting.mood;
    u.uTint.value.set(...(mood === 'horror' ? [1.08, 0.9, 0.88] : mood === 'finale' ? [0.9, 1.1, 0.88] : [0.92, 1.04, 0.96]));
    this.bloom.strength = mood === 'finale' ? 1.0 : 0.75;
    this.composer.render(dt);
  }

  // ---------------------------------------------------------------- particles
  initParticles() {
    const N = this.N = 500;
    this.pos = new Float32Array(N * 3).fill(-9999);
    this.col = new Float32Array(N * 3);
    this.vel = new Float32Array(N * 3);
    this.life = new Float32Array(N);
    this.grav = new Float32Array(N);
    this.next = 0;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.points = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.14, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false }));
    this.points.frustumCulled = false;
    this.G.scene.add(this.points);
  }

  /** Emit `n` particles at `p`. kind: 'dust' | 'spark' | 'blood' (comic red confetti) | 'confetti' */
  emit(p, n = 12, kind = 'dust') {
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const k = this.next; this.next = (this.next + 1) % this.N;
      const sp = kind === 'spark' ? 6 : kind === 'confetti' ? 5 : 2.2;
      this.pos[k * 3] = p.x + (Math.random() - 0.5) * 0.3;
      this.pos[k * 3 + 1] = p.y + Math.random() * 0.3;
      this.pos[k * 3 + 2] = p.z + (Math.random() - 0.5) * 0.3;
      this.vel[k * 3] = (Math.random() - 0.5) * sp;
      this.vel[k * 3 + 1] = Math.random() * sp * (kind === 'dust' ? 0.5 : 1);
      this.vel[k * 3 + 2] = (Math.random() - 0.5) * sp;
      this.life[k] = kind === 'dust' ? 0.9 + Math.random() * 0.6 : 0.5 + Math.random() * 0.6;
      this.grav[k] = kind === 'dust' ? -0.6 : 9;
      if (kind === 'spark') c.setHSL(0.1 + Math.random() * 0.06, 1, 0.6);
      else if (kind === 'confetti') c.setHSL(Math.random(), 0.9, 0.6);
      else if (kind === 'green') c.setHSL(0.27, 1, 0.55);
      else c.setHSL(0.1, 0.1, 0.45 + Math.random() * 0.2);
      this.col[k * 3] = c.r; this.col[k * 3 + 1] = c.g; this.col[k * 3 + 2] = c.b;
    }
  }

  updateParticles(dt) {
    let any = false;
    for (let k = 0; k < this.N; k++) {
      if (this.life[k] <= 0) continue;
      any = true;
      this.life[k] -= dt;
      if (this.life[k] <= 0) { this.pos[k * 3 + 1] = -9999; continue; }
      this.vel[k * 3 + 1] -= this.grav[k] * dt;
      const drag = Math.max(0, 1 - dt * 2);
      this.vel[k * 3] *= drag; this.vel[k * 3 + 2] *= drag;
      this.pos[k * 3] += this.vel[k * 3] * dt;
      const fl = this.pos[k * 3 + 1] < -10 ? -19.98 : 0.02;
      this.pos[k * 3 + 1] = Math.max(fl, this.pos[k * 3 + 1] + this.vel[k * 3 + 1] * dt);
      this.pos[k * 3 + 2] += this.vel[k * 3 + 2] * dt;
    }
    if (any || this._wasAny) {
      this.points.geometry.attributes.position.needsUpdate = true;
      this.points.geometry.attributes.color.needsUpdate = true;
    }
    this._wasAny = any;
  }
}
