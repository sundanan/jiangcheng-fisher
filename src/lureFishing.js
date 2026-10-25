// 路亚：拟饵泳姿、收线、攻击窗口
import * as THREE from '../lib/three.module.js';
import { clamp, lerp, rand, waveY } from './util.js?v=16';
import { makeLine } from './casting.js?v=16';
import { LURES } from './tackleData.js?v=16';

const LURE_COLORS = {
  minnow: 0x9ac8e8, spoon: 0xd8b040, vib: 0x8a95a0, texas: 0xc05868, frog: 0x5a8a3a, jig: 0x70a8c8, micro: 0xc0d0e0,
};

export class LureSession {
  constructor(scene, terrain, fishMan) {
    this.scene = scene; this.terrain = terrain; this.fishMan = fishMan;
    this.line = makeLine(scene);
    this.group = new THREE.Group();
    this.group.visible = false;
    this.scene.add(this.group);
    this._lureMesh = null;
    this.onHint = () => {};
    this.onMiss = () => {};
    this.active = false;
    this.speedIdx = 2;         // 收线速度档 0..4
    this.rippleT = 0;
  }
  _meshFor(lureId) {
    if (this._lureMesh) this.group.remove(this._lureMesh);
    const c = LURE_COLORS[lureId] || 0xaaaaaa;
    const mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.35, metalness: 0.5, flatShading: true });
    let m;
    if (lureId === 'minnow') {
      m = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.09, 6), mat);
      body.rotation.z = Math.PI / 2;
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.03, 6), mat);
      head.rotation.z = -Math.PI / 2; head.position.x = 0.06;
      m.add(body, head);
    } else if (lureId === 'texas') {
      m = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.09, 3, 6), mat);
      m.rotation.z = Math.PI / 2;
    } else if (lureId === 'frog') {
      m = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.025, 7, 6), mat);
      body.scale.set(1, 0.75, 1.25);
      m.add(body);
    } else {
      m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.02), mat);
    }
    m.rotation.order = 'YXZ';
    this.group.add(m);
    this._lureMesh = m;
    return m;
  }
  start(point, lureId) {
    this.lureId = lureId;
    this.lureDef = LURES.find((l) => l.id === lureId);
    this.pos = point.clone();
    this.state = 'water';
    this.sinkT = 0;
    this.attackFish = null;
    this.strikeOK = false;
    this.windowT = 0; this.winLen = 0;
    this.atkTick = rand(1.5, 3);
    this.twitchT = 0;
    this._meshFor(lureId);
    this.group.visible = true;
    this.group.position.copy(this.pos);
    this.active = true;
    this.fishMan.splash(this.pos, 0.8);
  }
  get retrievingDone() { return this.state === 'done'; }
  update(dt, t, ctx, rodTip, waveAmp) {
    if (!this.active) return;
    const mesh = this._lureMesh;
    // 攻击动画：拟饵被鱼带跑
    if (this.attackFish && this.strikeOK) {
      this.windowT += dt;
      this.pos.x += rand(-1, 1) * 0.5 * dt;
      this.pos.z += rand(-1, 1) * 0.5 * dt;
      mesh.rotation.z = Math.sin(t * 30) * 0.7;
      this.group.position.copy(this.pos);
      this.line.set(rodTip, this.pos, 0.02);
      if (this.windowT > this.winLen) {
        const f = this.attackFish;
        this.attackFish = null; this.strikeOK = false;
        this.fishMan.dismiss(f);
        this.onMiss('一口没打住，鱼跑了');
      }
      return;
    }
    // 收线
    let moved = false;
    if (ctx.reeling) {
      const speed = 1.0 + this.speedIdx * 0.55;
      const spd = speed * (this.twitchT > 0 ? 2.1 : 1);
      const dx = ctx.playerPos.x - this.pos.x, dz = ctx.playerPos.z - this.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 2.6) {
        this.state = 'done';
      } else {
        this.pos.x += (dx / dist) * spd * dt;
        this.pos.z += (dz / dist) * spd * dt;
        moved = true;
        // 侧向摆动泳姿
        const perpX = -dz / dist, perpZ = dx / dist;
        const wob = Math.sin(t * (8 + this.speedIdx * 2)) * (this.lureId === 'texas' ? 0.02 : 0.06);
        this.pos.x += perpX * wob * spd * dt * 8;
        this.pos.z += perpZ * wob * spd * dt * 8;
      }
    }
    if (ctx.twitch) this.twitchT = 0.38;
    this.twitchT = Math.max(0, this.twitchT - dt);
    // 深度
    const waterDepth = this.terrain.depthAt(this.pos.x, this.pos.z);
    let ty;
    if (this.lureDef.depth === 0) ty = waveY(this.pos.x, this.pos.z, t, waveAmp);
    else if (this.lureDef.depth === 1) ty = -clamp(waterDepth * 0.35, 0.4, 1.1);
    else if (this.lureDef.depth === 2) ty = -clamp(waterDepth * 0.55, 1.0, 2.4);
    else ty = -Math.max(0.12, waterDepth - 0.18);
    this.pos.y += clamp(ty - this.pos.y, -3 * dt, 3 * dt);
    this.group.position.copy(this.pos);
    const dirYaw = Math.atan2(
      ctx.playerPos.z - this.pos.z || Math.sin(t),
      ctx.playerPos.x - this.pos.x || Math.cos(t)
    );
    this.group.rotation.y = -dirYaw;
    mesh.rotation.z = Math.sin(t * 12) * 0.25;
    this.line.set(rodTip, this.pos, moved ? 0.04 : 0.25);
    // 水面尾迹
    if (this.lureDef.depth === 0) {
      this.rippleT -= dt;
      if (this.rippleT <= 0 && moved) { this.rippleT = 0.4; this.fishMan.splash(this.pos, 0.4); }
    }
    // 攻击抽选
    if (this.state === 'water' && !this.attackFish) {
      this.atkTick -= dt;
      if (this.atkTick <= 0) {
        this.atkTick = rand(1.6, 3.0);
        const speed = 1.0 + this.speedIdx * 0.55;
        const roll = Math.random();
        const p = 0.50 * ctx.biteRate;
        if (roll < p) {
          const sp = this.fishMan.pickLureSpecies({
            zone: this.terrain.zoneAt(this.pos.x, this.pos.z),
            lureId: this.lureId, speed, gearScore: ctx.gearScore,
          });
          if (sp) this._attack(sp);
        }
      }
    }
  }
  _attack(sp) {
    this.fishMan.lureFish(sp, this.pos, (fish) => {
      if (!this.active || this.state !== 'water') return;
      this.attackFish = fish;
      this.strikeOK = true;
      this.windowT = 0;
      this.winLen = 0.75 + Math.min(sp.w[1], 8) * 0.03;
      this.fishMan.splash(this.pos, 0.6 + Math.min(sp.w[1], 8) * 0.05);
      this.onHint('一口！—— 起竿！');
    }, 2.4 + sp.rarity * 0.2);
  }
  strike() {
    if (this.strikeOK && this.attackFish) {
      const f = this.attackFish;
      const center = Math.max(0, 1 - Math.abs(this.windowT - this.winLen * 0.4) / (this.winLen * 0.9));
      const prob = clamp(0.66 + center * 0.3, 0.5, 0.97);
      this.attackFish = null; this.strikeOK = false;
      if (Math.random() < prob) return f;
      this.onMiss('刺早了，脱钩了');
      return null;
    }
    return 'empty';
  }
  end() {
    this.active = false;
    this.group.visible = false;
    this.line.hide();
    if (this.attackFish) { this.fishMan.dismiss(this.attackFish); this.attackFish = null; }
    this.state = 'done';
  }
}
