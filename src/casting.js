// 抛竿弹道 + 钓线渲染
import * as THREE from '../lib/three.module.js';
import { clamp, waveY } from './util.js?v=16';

// 一根可更新的钓线（两点 + 下垂）
export function makeLine(scene) {
  const N = 14;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xe8f4f8, transparent: true, opacity: 0.75 }));
  line.frustumCulled = false;
  line.visible = false;
  scene.add(line);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), mid = new THREE.Vector3(), p = new THREE.Vector3();
  return {
    obj: line,
    set(pA, pB, sag = 0.4) {
      a.copy(pA); b.copy(pB);
      mid.copy(a).add(b).multiplyScalar(0.5);
      mid.y -= a.distanceTo(b) * sag;
      const arr = geo.attributes.position.array;
      for (let i = 0; i < N; i++) {
        const t = i / (N - 1);
        // 二次贝塞尔：P = (1-t)²A + 2(1-t)t M + t² B
        const w0 = (1 - t) * (1 - t), w1 = 2 * (1 - t) * t, w2 = t * t;
        p.set(
          w0 * a.x + w1 * mid.x + w2 * b.x,
          w0 * a.y + w1 * mid.y + w2 * b.y,
          w0 * a.z + w1 * mid.z + w2 * b.z
        );
        arr[i * 3] = p.x; arr[i * 3 + 1] = p.y; arr[i * 3 + 2] = p.z;
      }
      geo.attributes.position.needsUpdate = true;
      line.visible = true;
    },
    hide() { line.visible = false; },
  };
}

export class Caster {
  constructor(scene) {
    this.scene = scene;
    this.active = null;
    this.trail = makeLine(scene);
    this._last = new THREE.Vector3();
  }
  // power 0..1，rodCast 最远抛距（含竿尖高度的精确弹道解）
  launch(from, dir, power, rodCast, water, onLand, onFail) {
    const d = dir.clone().normalize();
    const horiz = Math.hypot(d.x, d.z);
    const elev = clamp(Math.atan2(d.y, horiz), 0.15, 1.1);
    const yaw = Math.atan2(d.z, d.x);
    const dist = Math.pow(power, 1.35) * rodCast;
    // 解：落点水平距离恰为 dist。飞行时间 t = sqrt(2(h + D·tanθ)/g)，水平速度 = D/t
    const g = 13.2;
    const h = Math.max(0.5, from.y);
    const t = Math.sqrt(Math.max(0.05, 2 * (h + dist * Math.tan(elev)) / g));
    const vh = dist / t;
    this.active = {
      p: from.clone(),
      v: new THREE.Vector3(Math.cos(yaw) * vh, vh * Math.tan(elev), Math.sin(yaw) * vh),
      onLand, onFail, water,
    };
  }
  get flying() { return !!this.active; }
  update(dt, t, rodTip, waveAmp) {
    if (!this.active) { this.trail.hide(); return; }
    const a = this.active;
    a.v.y -= 13.2 * dt;
    a.p.addScaledVector(a.v, dt);
    this.trail.set(rodTip, a.p, 0.05);
    if (a.p.y <= waveY(a.p.x, a.p.z, t, waveAmp) + 0.05 || a.p.y < 0 || Math.abs(a.p.x) > 235 || Math.abs(a.p.z) > 235) {
      this.active = null;
      this.trail.hide();
      const depth = this.waterDepth(a.p.x, a.p.z);
      if (depth > 0.25) a.onLand(a.p.clone());
      else a.onFail('饵落在岸上了，看准水面再抛');
    }
  }
  waterDepth(x, z) { return this._depthFn ? this._depthFn(x, z) : 0; }
}
