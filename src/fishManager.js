// 鱼群管理：按水域/时段维持鱼口种群，游动 AI，进窝咬钩调度，水花特效
import * as THREE from '../lib/three.module.js';
import { SPECIES, SPECIES_BY_ID, isSpeciesActive, layerMatch, periodOf, seasonFactor, hourFactor } from './fishData.js?v=16';
import { spotFactor } from './spots.js?v=16';
import { buildFishView, tickFishShaders } from './fish.js?v=16';
import { rand, randInt, choice, clamp, lerp } from './util.js?v=16';

const POP = { 1: 4, 2: 3, 3: 1, 4: 1 }; // 每种鱼的数量（r5 只事件生成）

export class FishManager {
  constructor(scene, terrain, world) {
    this.scene = scene; this.terrain = terrain; this.world = world;
    this.fishes = [];
    this.splashes = [];
    this._splashPool = [];
    this._lastPeriod = null;
    this._initSplashes();
    this.refresh();
  }
  _initSplashes() {
    const geo = new THREE.RingGeometry(0.8, 1.0, 24);
    geo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xdff2f8, transparent: true, opacity: 0, depthWrite: false }));
      m.visible = false; m.renderOrder = 6;
      this.scene.add(m);
      this._splashPool.push(m);
    }
  }
  splash(pos, size = 1) {
    const m = this._splashPool.find((x) => !x.visible) || this._splashPool[0];
    m.visible = true;
    m.position.set(pos.x, 0.06, pos.z);
    m.scale.setScalar(size * 0.4);
    m.material.opacity = 0.85;
    this.splashes.push({ m, t: 0, life: 1.1, size });
  }
  _updateSplashes(dt) {
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i];
      s.t += dt;
      const k = s.t / s.life;
      s.m.scale.setScalar(lerp(s.size * 0.4, s.size * 2.4, k));
      s.m.material.opacity = 0.85 * (1 - k);
      if (k >= 1) { s.m.visible = false; this.splashes.splice(i, 1); }
    }
  }

  refresh() {
    // 按当前时段重建种群（夜行鱼夜晚出现）；正在进窝/咬钩/上钩的鱼必须保留
    const period = periodOf(this.world.hour);
    if (period === this._lastPeriod) return;
    this._lastPeriod = period;
    const keep = [];
    for (const f of this.fishes) {
      if (f.state === 'approach' || f.state === 'hover' || f.state === 'fight') keep.push(f);
      else if (f.view.parent) f.view.parent.remove(f.view);
    }
    this.fishes = keep;
    for (const sp of SPECIES) {
      if (sp.rarity >= 5) continue; // 中华鲟：事件生成
      if (!isSpeciesActive(sp, this.world.hour)) continue;
      if (sp.rarity === 4 && Math.random() < 0.45) continue;
      const cur = keep.filter((f) => f.sp.id === sp.id).length;
      const n = Math.max(0, (POP[sp.rarity] || 1) - cur);
      for (let i = 0; i < n; i++) this._spawnOne(sp);
    }
  }
  _spawnOne(sp) {
    const zone = choice(sp.zones);
    const p = this.randomWaterPoint(zone);
    if (!p) return;
    const lenCm = this.rollLen(sp);
    const view = buildFishView(sp, lenCm);
    view.position.copy(p);
    this.scene.add(view);
    this.fishes.push({
      sp, view, lenCm,
      pos: p.clone(),
      dir: rand(0, Math.PI * 2),
      speed: rand(0.25, 0.9) * (sp.body === 'predator' ? 1.6 : 1),
      state: 'wander', timer: rand(2, 6),
      zone, interest: 0, onArrive: null, target: null,
      vy: 0,
    });
  }
  rollLen(sp) { // 体重偏小分布 → 体长
    const pct = Math.pow(Math.random(), 2.1);
    const w = lerp(sp.w[0], sp.w[1], pct);
    const wMax = sp.w[1];
    const len = sp.len * Math.cbrt(w / wMax);
    return Math.max(len, sp.len * 0.18);
  }
  randomWaterPoint(zone) {
    for (let i = 0; i < 40; i++) {
      const x = rand(-265, 265), z = rand(-265, 265);
      if (this.terrain.zoneAt(x, z) !== zone) continue;
      const d = this.terrain.depthAt(x, z);
      if (d > 0.8) return new THREE.Vector3(x, 0, z);
    }
    // 兜底：湖心
    return new THREE.Vector3(-95, 0, 25);
  }
  targetY(fish, x, z) {
    const depth = this.terrain.depthAt(x, z);
    const frac = { upper: 0.25, mid: 0.55, bottom: 0.85, benthic: 0.92 }[fish.sp.layer];
    let y = -clamp(depth * frac, 0.25, 7.5);
    if (fish.sp.layer === 'benthic') y = Math.min(y, -depth + 0.18);
    return y;
  }

  update(dt, t, camera) {
    this.refresh();
    tickFishShaders(t);
    this._updateSplashes(dt);
    const camPos = camera.position;
    for (const f of this.fishes) {
      const distCam = f.pos.distanceTo(camPos);
      if (f.state === 'fight') { f.view.visible = distCam < 90; continue; }
      f.timer -= dt;
      let speed = f.speed;
      if (f.state === 'wander') {
        if (f.timer <= 0) { f.dir += rand(-1.4, 1.4); f.timer = rand(2, 7); }
        // 群游小鱼同向微调
        if (f.sp.body === 'minnow') f.dir += Math.sin(t * 0.3 + f.pos.x * 0.1) * 0.008;
      } else if (f.state === 'approach' && f.target) {
        const dx = f.target.x - f.pos.x, dz = f.target.z - f.pos.z;
        const want = Math.atan2(dz, dx);
        let dd = want - f.dir;
        while (dd > Math.PI) dd -= Math.PI * 2;
        while (dd < -Math.PI) dd += Math.PI * 2;
        f.dir += clamp(dd, -3 * dt, 3 * dt);
        speed = f.approachSpeed || 1.8;
        if (Math.hypot(dx, dz) < 0.7) {
          f.state = 'hover'; f.timer = 14;
          const cb = f.onArrive; f.onArrive = null;
          if (cb) cb(f);
        }
      } else if (f.state === 'hover' && f.target) {
        f.dir += 1.6 * dt;
        speed = 0.35;
        if (f.timer <= 0) this.dismiss(f);
      } else if (f.state === 'leave') {
        speed = 1.6;
        if (f.timer <= 0) { f.state = 'wander'; f.timer = rand(2, 6); }
      }
      // 移动（进窝/逗留的鱼奔饵心切，不受浅水限制）
      let nx = f.pos.x + Math.cos(f.dir) * speed * dt;
      let nz = f.pos.z + Math.sin(f.dir) * speed * dt;
      const rushing = f.state === 'approach' || f.state === 'leave';
      let nd = this.terrain.depthAt(nx, nz);
      if (!rushing && (nd < 0.35 || this.terrain.zoneAt(nx, nz) === 'land' || Math.abs(nx) > 265 || Math.abs(nz) > 265)) {
        f.dir += Math.PI * rand(0.7, 1.3);
      } else {
        f.pos.x = nx; f.pos.z = nz;
      }
      // 进窝/逗留的鱼跟随钩饵深度，其余按自身水层
      const ty = (f.state === 'approach' || f.state === 'hover') && f.target
        ? Math.max(f.target.y, -7.5)
        : this.targetY(f, f.pos.x, f.pos.z);
      f.pos.y += clamp(ty - f.pos.y, -1.2 * dt, 1.2 * dt) + Math.sin(t * 0.7 + f.pos.x) * 0.0015;
      // 应用到视图（超远的鱼隐藏）
      f.view.visible = distCam < 150;
      if (f.view.visible) {
        f.view.position.copy(f.pos);
        f.view.rotation.y = -f.dir + Math.PI / 2;
      }
    }
  }
  // 让一条鱼游向钩点
  approach(sp, target, onArrive, opts = {}) {
    let fish = null;
    let best = 1e9;
    for (const f of this.fishes) {
      if (f.sp.id !== sp.id || (f.state !== 'wander' && f.state !== 'leave')) continue;
      const d = f.pos.distanceTo(target);
      if (d < best) { best = d; fish = f; }
    }
    if (!fish || best > 18) { // 太远/没有 → 在钩饵附近找深水现生成一条
      const p = new THREE.Vector3();
      let placed = false;
      for (let k = 0; k < 10 && !placed; k++) {
        const ang = rand(0, Math.PI * 2) + k * 0.63;
        const r = opts.near ? rand(4, 7) : rand(7, 11);
        p.set(target.x + Math.cos(ang) * r, target.y || -1, target.z + Math.sin(ang) * r);
        if (this.terrain.depthAt(p.x, p.z) > 1.0) placed = true;
      }
      if (!placed) p.set(target.x + 2, target.y || -1, target.z + 2);
      const lenCm = this.rollLen(sp);
      const view = buildFishView(sp, lenCm);
      this.scene.add(view);
      fish = { sp, view, lenCm, pos: p.clone(), dir: Math.atan2(target.z - p.z, target.x - p.x), speed: rand(0.3, 0.8), state: 'wander', timer: 99, zone: choice(sp.zones), interest: 0, onArrive: null, target: null, vy: 0 };
      this.fishes.push(fish);
    }
    fish.state = 'approach';
    fish.target = opts.live ? target : target.clone();
    fish.onArrive = onArrive;
    fish.approachSpeed = opts.speed || (1.5 + sp.rarity * 0.15);
    return fish;
  }
  dismiss(fish) {
    if (fish.state === 'fight') return;
    fish.state = 'leave';
    fish.timer = rand(4, 8);
    fish.target = null;
    fish.interest = 0;
  }
  // 钓获移除
  remove(fish) {
    const i = this.fishes.indexOf(fish);
    if (i >= 0) this.fishes.splice(i, 1);
    if (fish.view.parent) fish.view.parent.remove(fish.view);
  }
  // 路亚攻击用：直接把鱼导向拟饵（活引用，追踪移动中的饵）
  lureFish(sp, target, onArrive, speed) {
    return this.approach(sp, target, onArrive, { speed, live: true });
  }

  // ===== 咬钩鱼种抽选 =====
  pickFloatSpecies(ctx) {
    // ctx: {zone, depthRatio, baitId, gearScore, chum, protEnabled}
    const hour = this.world.hour;
    const pool = [];
    for (const sp of SPECIES) {
      if (!sp.zones.includes(ctx.zone)) continue;
      const baitW = sp.baits[ctx.baitId] || 0;
      if (baitW <= 0) continue;
      const lm = layerMatch(sp, ctx.depthRatio);
      if (lm <= 0.05) continue;
      if (sp.prot && !ctx.protOK) continue;
      // 时段不活跃 → 概率降为 15%（不是钓不到）
      let w = baitW * lm * (5 - sp.rarity + 1) * seasonFactor(sp, this.world.season) * spotFactor(sp, ctx.spot) * hourFactor(sp, hour);
      if (sp.rarity === 4) w *= 0.45 * (ctx.gearScore >= 5 ? 1 : 0.15);
      if (sp.rarity === 5) w *= 0.12 * (ctx.gearScore >= 7 ? 1 : 0);
      if (ctx.chum) w *= 1.6;
      if (sp.alien) w *= 1.2;
      if (w > 0) pool.push([sp, w]);
    }
    return this._weightedChoice(pool);
  }
  pickFakeSpecies(ctx) { // 小杂鱼闹窝
    const hour = this.world.hour;
    const pool = [];
    for (const sp of SPECIES) {
      if (!sp.zones.includes(ctx.zone)) continue;
      if ((sp.baits[ctx.baitId] || 0) <= 0) continue;
      if (sp.w[1] < 0.5) pool.push([sp, 3 * hourFactor(sp, hour)]);
    }
    return this._weightedChoice(pool);
  }
  pickLureSpecies(ctx) {
    // ctx: {zone, lureId, speed, depthRatio, gearScore, spot}
    const hour = this.world.hour;
    const pool = [];
    for (const sp of SPECIES) {
      if (!sp.zones.includes(ctx.zone)) continue;
      const lw = sp.lures[ctx.lureId] || 0;
      if (lw <= 0) continue;
      // 速度匹配：伏击型(鳜/鲶)爱慢饵，追击型(鲌/鳡)爱快饵
      let sf = 1;
      if (['mandarin', 'catfish'].includes(sp.body)) sf = ctx.speed < 1.7 ? 1.5 : 0.45;
      else if (sp.body === 'predator') sf = ctx.speed > 2.0 ? 1.4 : 0.75;
      if (sp.body === 'snakehead') sf = ctx.speed < 1.5 ? 1.3 : 0.8;
      // 时段概率拟合（非活跃时段 ×0.15）
      let w = lw * sf * (5 - sp.rarity + 1) * seasonFactor(sp, this.world.season) * spotFactor(sp, ctx.spot) * hourFactor(sp, hour);
      if (sp.rarity === 4) w *= 0.4 * (ctx.gearScore >= 5 ? 1 : 0.1);
      if (sp.rarity === 5) w *= 0.1 * (ctx.gearScore >= 7 ? 1 : 0);
      if (w > 0) pool.push([sp, w]);
    }
    return this._weightedChoice(pool);
  }
  _weightedChoice(pool) {
    const total = pool.reduce((s, [, w]) => s + w, 0);
    if (total <= 0) return null;
    let r = Math.random() * total;
    for (const [sp, w] of pool) { r -= w; if (r <= 0) return sp; }
    return pool[pool.length - 1][0];
  }
  // 附近可被拟饵吸引的掠食鱼（已存在于场上的）
  predatorsNear(pos, radius) {
    return this.fishes.filter((f) => {
      if (f.state !== 'wander' && f.state !== 'leave') return false;
      if (Object.keys(f.sp.lures).length === 0) return false;
      return f.pos.distanceTo(pos) < radius;
    });
  }
  countBySpecies() {
    const m = {};
    for (const f of this.fishes) m[f.sp.id] = (m[f.sp.id] || 0) + 1;
    return m;
  }
}
