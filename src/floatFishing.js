// 台钓：浮漂、调漂深度、漂相动画与咬钩调度
import * as THREE from '../lib/three.module.js';
import { clamp, lerp, rand, waveY } from './util.js?v=16';
import { makeLine } from './casting.js?v=16';

// 漂相：名称 / 窗口开启时刻 / 窗口时长 / 描述
const PATTERNS = {
  lift: { name: '顶漂', at: 0.55, win: 0.95, hint: '顶漂！送口了——起竿！' },
  dip:  { name: '顿口', at: 0.26, win: 0.8,  hint: '顿口！有力一下——起竿！' },
  sink: { name: '黑漂', at: 0.48, win: 1.15, hint: '黑漂！拖走了——起竿！' },
  walk: { name: '走漂', at: 0.6,  win: 1.4,  hint: '走漂！往边上拉——起竿！' },
  nibble: { name: '闹窝', at: 9, win: 0, hint: '' },
};

function choosePattern(sp) {
  // 真口永远不给 nibble（那是假口专用，窗口为 0）；小鱼用顿口/顶漂
  if (sp.w[1] < 0.6) return Math.random() < 0.6 ? 'dip' : 'lift';
  if (sp.group === 'xu' || sp.group === 'gudgeon') return Math.random() < 0.6 ? 'walk' : 'dip';
  if ((sp.layer === 'bottom' || sp.layer === 'benthic') && sp.w[1] > 2) return 'sink';
  if (sp.layer === 'upper') return 'dip';
  return Math.random() < 0.5 ? 'lift' : 'dip';
}

export class FloatSession {
  constructor(scene, terrain, fishMan) {
    this.scene = scene; this.terrain = terrain; this.fishMan = fishMan;
    this.line = makeLine(scene);
    this._buildBobber();
    // 回调（由 main 赋值）
    this.onHint = () => {};
    this.onMiss = () => {};
    this.active = false;
  }
  _buildBobber() {
    const g = new THREE.Group();
    const red = new THREE.MeshStandardMaterial({ color: 0xff2a1a, roughness: 0.4 });
    const white = new THREE.MeshStandardMaterial({ color: 0xf8f5ee, roughness: 0.5 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.06, 0.22, 8), red);
    const belly = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.038, 0.14, 8), white);
    belly.position.y = -0.17;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.34, 6), white);
    stem.position.y = 0.27;
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 5), new THREE.MeshStandardMaterial({ color: 0xff8828, emissive: 0x883300, emissiveIntensity: 0.6 }));
    tip.position.y = 0.45;
    g.add(body, belly, stem, tip);
    g.visible = false;
    this.scene.add(g);
    this.bobber = g;
  }
  start(point, depth) {
    this.pos = point.clone(); this.pos.y = 0;
    this.waterDepth = this.terrain.depthAt(this.pos.x, this.pos.z);
    this.depth = clamp(depth, 0.4, Math.max(0.5, this.waterDepth - 0.05));
    this.state = 'settle'; this.settleT = 0;
    this.biteTick = rand(2, 4);
    this.noBiteT = 0;             // 连续没口计时（提示用）
    this.noBiteHinted = false;
    this.pending = null;       // 正在进窝的鱼
    this.anim = null;          // 漂相动画
    this.strikeOK = false;
    this.missed = false;
    this.bobber.visible = true;
    this.bobber.position.copy(this.pos);
    this.active = true;
    this.fishMan.splash(this.pos, 0.7);
  }
  setDepth(d) {
    this.depth = clamp(d, 0.4, Math.max(0.5, this.waterDepth - 0.05));
  }
  get isBottom() { return this.depth >= this.waterDepth - 0.12; }
  hookPos(out) {
    out = out || new THREE.Vector3();
    return out.set(this.pos.x, -Math.min(this.depth, this.waterDepth - 0.08), this.pos.z);
  }
  depthRatio() { return this.waterDepth > 0 ? Math.min(this.depth, this.waterDepth) / this.waterDepth : 1; }

  update(dt, t, ctx, rodTip, waveAmp) {
    if (!this.active) return;
    // 漂的竖立过程
    if (this.state === 'settle') {
      this.settleT += dt;
      const k = clamp(this.settleT / 1.1, 0, 1);
      this.bobber.rotation.z = (1 - k) * 1.35;
      this.bobber.position.y = waveY(this.pos.x, this.pos.z, t, waveAmp) - (1 - k) * 0.08;
      if (k >= 1) this.state = 'wait';
      this.line.set(rodTip, this.bobberTop(), 0.05);
      return;
    }
    // 漂相动画
    let offY = 0;
    if (this.anim) {
      const a = this.anim;
      a.t += dt;
      const at = a.t;
      if (a.pattern === 'nibble') offY = Math.sin(at * 24) * 0.045 * (at < 1.5 ? 1 : 0.2);
      else if (a.pattern === 'lift') offY = clamp(at / 0.5, 0, 1) * 0.3;
      else if (a.pattern === 'dip') offY = -clamp(at / 0.22, 0, 1) * (0.16 + Math.sin(at * 6) * 0.03 * (at > 0.3 ? 1 : 0));
      else if (a.pattern === 'sink') offY = -clamp(at / 0.5, 0, 1) * 1.15;
      else if (a.pattern === 'walk') {
        const wk = clamp(at / 1.4, 0, 1);
        this.pos.x += Math.cos(a.walkDir) * 0.75 * dt;
        this.pos.z += Math.sin(a.walkDir) * 0.75 * dt;
        offY = -wk * 0.1;
      }
      // 窗口
      if (!a.fake && !this.strikeOK && at >= PATTERNS[a.pattern].at) {
        this.strikeOK = true;
        this.windowT = 0;
        this.onHint(PATTERNS[a.pattern].hint);
      }
      if (this.strikeOK) {
        this.windowT += dt;
        if (this.windowT > this.winLen) this._miss('鱼吐钩跑了……');
      }
      if (!a.fake && at > PATTERNS[a.pattern].at + this.winLen + 0.4) this._miss('错失良机');
      // 假口（小杂鱼）自然结束，不吞饵
      if (a.fake && at > 2.4) this._miss('小杂鱼闹窝，漂乱颤——饵还在', false);
    } else if (this.state === 'wait') {
      // 咬钩抽选
      this.biteTick -= dt;
      this.noBiteT += dt;
      if (!this.noBiteHinted && this.noBiteT > 22) {
        this.noBiteHinted = true;
        this.onHint('这个钓深和时段没什么口——滚轮调漂 / Z X 换饵试试');
      }
      if (this.biteTick <= 0 && !this.pending) {
        this.biteTick = rand(1.6, 3.2);
        const roll = Math.random();
        const pReal = 0.42 * ctx.biteRate;
        const pFake = 0.12;
        if (roll < pReal) {
          const sp = this.fishMan.pickFloatSpecies(ctx);
          if (sp) this._summon(sp, false);
        } else if (roll < pReal + pFake) {
          const sp = this.fishMan.pickFakeSpecies(ctx);
          if (sp) this._summon(sp, true);
        }
      }
    }
    // 漂浮动
    const bob = Math.sin(t * 1.7 + this.pos.x) * 0.018 + Math.sin(t * 0.9 + this.pos.z) * 0.012;
    this.bobber.position.set(this.pos.x, waveY(this.pos.x, this.pos.z, t, waveAmp) + 0.02 + offY + bob, this.pos.z);
    this.bobber.rotation.z = this.anim ? Math.sin(t * 18) * (this.anim.pattern === 'nibble' ? 0.18 : 0.1) : Math.sin(t * 1.2) * 0.04;
    this.line.set(rodTip, this.bobberTop(), 0.06);
  }
  bobberTop(out) {
    out = out || new THREE.Vector3();
    out.copy(this.bobber.position); out.y += 0.45;
    return out;
  }
  _summon(sp, fake) {
    const hook = this.hookPos();
    this.noBiteT = 0; this.noBiteHinted = false;
    this.pending = this.fishMan.approach(sp, hook, (fish) => {
      if (!this.active || this.pending !== fish) return;
      // 到位 → 开始漂相
      const pattern = fake ? 'nibble' : choosePattern(sp);
      this.anim = { pattern, t: 0, fake, sp, walkDir: rand(0, Math.PI * 2) };
      this.winLen = fake ? 0 : PATTERNS[pattern].win * (1 + (sp.power || 1) * 0.07);
      this.strikeOK = false; this.windowT = 0;
      // 小水花：鱼咬口
      if (!fake) this.fishMan.splash(this.pos, 0.5);
    }, { near: fake, speed: fake ? 2.4 : 1.9 + sp.rarity * 0.12 });
  }
  // 返回 null=没中(空竿)，返回 fish 对象=中鱼
  strike() {
    if (!this.active) return null;
    if (this.anim && this.strikeOK && !this.anim.fake && this.pending) {
      // 命中率：窗口中心更稳
      const center = Math.max(0, 1 - Math.abs(this.windowT - this.winLen * 0.45) / (this.winLen * 0.9));
      const sp = this.anim.sp;
      const prob = clamp(0.62 + center * 0.3 + (this.sensBonus || 0), 0.45, 0.97);
      const hit = Math.random() < prob;
      const fish = this.pending;
      this._cleanup();
      if (hit) return fish;
      this.onMiss('空军！刺晚了半拍');
      return null;
    }
    // 无口乱提竿
    if (this.anim && this.anim.fake) { this._miss('是条小杂鱼，扑了个空'); return 'empty'; }
    return 'empty';
  }
  _miss(msg, eatBait = true) {
    if (this.missed) return;
    this.missed = true;
    this._cleanup();
    this.onMiss(msg, eatBait);
  }
  _cleanup() {
    if (this.pending) { this.fishMan.dismiss(this.pending); this.pending = null; }
    this.anim = null; this.strikeOK = false;
    this.missed = false;
    this.state = 'wait';
    this.biteTick = rand(2, 5);
  }
  end() {
    this.active = false;
    this.bobber.visible = false;
    this.line.hide();
    if (this.pending) { this.fishMan.dismiss(this.pending); this.pending = null; }
    this.anim = null;
  }
}
