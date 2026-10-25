// 遛鱼：张力 / 放线 / 耐力 / 冲刺 / 跳水 / 抄网
import * as THREE from '../lib/three.module.js';
import { clamp, lerp, rand } from './util.js?v=16';
import { makeLine } from './casting.js?v=16';

export class Fight {
  // opts: {terrain, fishMan, player, scene, fish(鱼对象含sp/view/lenCm), weight, tackle:{strength, reel, rodPower}, onEnd(result), onHud(data)}
  constructor(opts) {
    Object.assign(this, opts);
    this.d = Math.min(opts.startDist || 22, 42);          // 鱼离玩家距离
    this.theta = Math.atan2(-this.player.pos.z + 0, -this.player.pos.x + 0) + rand(0, Math.PI * 2);
    // 让鱼初始方向大致远离玩家（取玩家朝向前方）
    const fw = new THREE.Vector3(); this.player.forward(fw);
    this.theta = Math.atan2(fw.z, fw.x) + rand(-0.7, 0.7);
    this.stamina = clamp(38 + this.weight * 7 * this.fish.sp.power, 25, 260);
    this.staminaMax = this.stamina;
    this.tension = 0;               // 0..1（相对线强度的比例）
    this.overT = 0;                 // 超限计时
    this.surging = false;
    this.surgeT = 0; this.nextSurge = rand(0.6, 1.6);
    this.elapsed = 0;
    this.slackT = 0;
    this.landWindow = 0;
    this.jumpT = 0;
    this.done = false;
    this.line = makeLine(this.scene);
    this.fish.state = 'fight';
    this.fishMan.splash(this._fishXZ(), 1.2);
    this._tip = new THREE.Vector3();
  }
  _fishXZ(out) {
    out = out || new THREE.Vector3();
    return out.set(
      this.player.pos.x + Math.cos(this.theta) * this.d,
      0,
      this.player.pos.z + Math.sin(this.theta) * this.d
    );
  }
  update(dt, reeling) {
    if (this.done) return;
    this.elapsed += dt;
    const sp = this.fish.sp;
    const p = sp.power;
    // 长时间遛鱼，鱼逐渐力竭（防拖沓）
    const fatigue = this.elapsed > 75 ? 1.6 : 1;

    // 冲刺调度
    if (!this.surging) {
      this.nextSurge -= dt;
      if (this.nextSurge <= 0 && this.stamina > 8) {
        this.surging = true;
        this.surgeT = rand(1.0, 2.2);
        this.fishMan.splash(this._fishXZ(), 0.9 + this.weight * 0.02);
        // 跳水（大鱼浅水区）
        if (this.weight > 1.2 && Math.random() < 0.3) this.jumpT = 0.8;
      }
    } else {
      this.surgeT -= dt;
      this.stamina -= (6.5 + this.weight * 0.7 * p) * fatigue * dt;
      if (this.surgeT <= 0 || this.stamina <= 0) {
        this.surging = false;
        this.nextSurge = rand(2.2, 5.0) * (this.stamina < 30 ? 2.2 : 1);
      }
    }
    // 鱼游动方向：冲刺时大幅变向，平时绕圈
    const turn = this.surging ? rand(-2.5, 2.5) * dt : 0.9 * dt;
    this.theta += turn;

    const exhausted = this.stamina <= 0;
    // 张力与距离（收线有效率高回报：冲刺时也可收线但张力暴涨，形成"泵刺"节奏）
    if (reeling) {
      this.slackT = 0;
      if (this.surging) {
        this.d = Math.max(1.2, this.d - 0.6 * this.tackle.reel * dt);
        this.tension += (0.42 + this.weight * 0.06 * p) * dt;
      } else {
        const gain = this.tackle.reel * 1.4 * (exhausted ? 2.2 : 1) * this.tackle.rodPower;
        this.d = Math.max(1.2, this.d - gain * dt);
        this.tension += (0.18 + this.weight * 0.03 * p) * (exhausted ? 0.6 : 1) * dt;
      }
      this.stamina -= 4.5 * dt;
    } else {
      this.tension -= 0.5 * dt;
      if (this.surging) {
        const run = (1.8 + p * 0.6) * dt;
        this.d = Math.min(this.d + run, 55);
        this.stamina -= 2.2 * dt;
      } else {
        this.d = Math.min(this.d + 0.06 * dt, 55);
        this.slackT += dt;
        if (!exhausted && this.slackT > 9 && Math.random() < 0.25 * dt * 10) {
          this._end(false, '线太松，钩子拉直了……跑鱼');
          return;
        }
      }
      if (exhausted) this.stamina = Math.min(this.staminaMax, this.stamina + 0.4 * dt);
    }
    this.tension = clamp(this.tension, 0, 1.35);
    // 断线判定
    if (this.tension >= 1) {
      this.overT += dt;
      if (this.overT > 0.75) { this._end(false, '啪——线断了！'); return; }
    } else this.overT = Math.max(0, this.overT - dt * 1.5);

    // 抄网窗口
    const canLand = (exhausted || this.weight < 0.25) && this.d < 2.4;
    if (canLand) {
      this.landWindow += dt;
      if (this.landWindow > 3.2) { // 错过窗口，鱼再挣扎
        this.landWindow = 0;
        this.stamina = Math.min(this.staminaMax, this.stamina + 18);
        this.d = Math.min(this.d + 2, 40);
        this.nextSurge = 0.2;
      }
    } else this.landWindow = 0;

    // 视觉：鱼位置 + 钓线 + 竿弯（竿尖被拉向鱼的方向，多段弧线）
    const fp = this._fishXZ();
    const depthHere = this.terrain.depthAt(fp.x, fp.z);
    let fy = -clamp(depthHere * 0.45, 0.3, 2.2);
    if (this.jumpT > 0) {
      this.jumpT -= dt;
      const jk = 1 - this.jumpT / 0.8;
      fy = Math.sin(jk * Math.PI) * 1.2;
      if (this.jumpT <= 0) { this.fishMan.splash(fp, 1.4); this.tension = Math.min(this.tension + 0.12, 1.3); }
    }
    this.fish.view.position.set(fp.x, fy, fp.z);
    this.fish.view.rotation.y = -this.theta + Math.PI / 2;
    this.player.rodTipWorld(this._tip);
    this.line.set(this._tip, this.fish.view.position, clamp(0.35 - this.tension * 0.34, 0.01, 0.35));
    // 竿弯方向：鱼在视线左右 → 竿尖侧偏，向下前弯
    const fw = this._fwv || (this._fwv = new THREE.Vector3());
    this.player.forward(fw);
    const fishX = Math.cos(this.theta), fishZ = Math.sin(this.theta);
    const signed = Math.atan2(fw.x * fishZ - fw.z * fishX, fw.x * fishX + fw.z * fishZ);
    this.player.setBend(clamp(this.tension, 0.15, 1), clamp(signed / 1.4, -1, 1));

    this.onHud({
      tension: clamp(this.tension, 0, 1),
      danger: this.tension >= 1,
      stamina: clamp(this.stamina / this.staminaMax, 0, 1),
      dist: this.d,
      canLand,
      surging: this.surging,
    });
  }
  land() {
    if (this.done) return false;
    const canLand = (this.stamina <= 0 || this.weight < 0.25) && this.d < 2.4;
    if (canLand) { this._end(true); return true; }
    return false;
  }
  _end(ok, reason) {
    this.done = true;
    this.line.hide();
    this.player.setBend(0);
    this.onHud(null);
    this.onEnd({ ok, reason, fish: this.fish, weight: this.weight });
  }
}
