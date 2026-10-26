// 玩家：第一人称行走 + 视角 + 双竿外观（台钓竿：长细无轮；路亚竿：短粗带纺车轮）+ 船钓
import * as THREE from '../lib/three.module.js';
import { clamp } from './util.js?v=16';
import { createAngler, createHandModel } from './angler.js?v=18';

const EYE = 1.62;
const DONGHU = { x: 63, z: 25 }; // 东湖中心（出生在其岸线）
const _rightGrip = new THREE.Vector3(), _leftGrip = new THREE.Vector3();
const _camOrigin = new THREE.Vector3(), _camDesired = new THREE.Vector3();

export class Player {
  constructor(camera, terrain) {
    this.cam = camera;
    this.terrain = terrain;
    // 自动找东湖岸线立足点，面朝深水
    const shore = terrain.findShore(DONGHU.x, DONGHU.z, 80);
    this.pos = new THREE.Vector3(shore.x, 0, shore.z);
    this.pos.y = terrain.heightAt(this.pos.x, this.pos.z);
    this.yaw = 0; this.pitch = -0.1;
    this.walkT = 0;
    this.bend = 0;
    this.rodPitch = 0.61;              // 竿角（弧度）：3/4/5 三档
    this.onBoat = false;
    this.underwater = false;
    this._bendTarget = { k: 0, side: 0 };
    this.fishingPhase = 'idle';
    this.reeling = false;
    this.action = null;
    this.actionT = 0;
    this.reelT = 0;
    this._actionPose = { x: 0, z: 0, lean: 0, roll: 0 };
    // 面向深水方向
    const d = new THREE.Vector3(shore.tx - this.pos.x, 0, shore.tz - this.pos.z).normalize();
    this.yaw = Math.atan2(-d.x, -d.z);
    this.rig = { float: this._makeRig('float'), lure: this._makeRig('lure') };
    this.cam.add(this.rig.float.root, this.rig.lure.root);
    this.setRodStyle('float');
    this._buildBoat();
    this.view = 'first';
    this.body = this._buildBody();
    this.body.visible = false;
    terrain.scene.add(this.body);
  }
  _buildBoat() {
    const g = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a5c34, roughness: 0.9, flatShading: true });
    const woodDark = new THREE.MeshStandardMaterial({ color: 0x5c3c22, roughness: 0.95, flatShading: true });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 3.4), wood);
    hull.position.y = 0.18;
    g.add(hull);
    const inner = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.22, 2.7), woodDark);
    inner.position.y = 0.36;
    g.add(inner);
    // 船头（楔形）
    const bow = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.2, 4), wood);
    bow.rotation.x = Math.PI / 2;
    bow.rotation.y = Math.PI / 4;
    bow.position.set(0, 0.3, -2.0);
    g.add(bow);
    // 船舷
    for (const sx of [-0.72, 0.72]) {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 3.2), woodDark);
      side.position.set(sx, 0.42, 0);
      g.add(side);
    }
    // 钓鱼座：座面 1.0m，配合髋膝弯曲使靴底落在船内地板
    const seatPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.5, 6), woodDark);
    seatPost.position.set(0, 0.65, 0.12);
    g.add(seatPost);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.12, 0.58), wood);
    seat.position.set(0, 0.94, 0.12);
    g.add(seat);
    // 船桨
    const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 5), woodDark);
    oar.rotation.set(0.5, 0, 0.35);
    oar.position.set(0.85, 0.35, 0.4);
    g.add(oar);
    g.visible = false;
    this.boat = g;
    this.terrainScene = null; // main 注入
  }
  attachBoat(scene) { this.terrainScene = scene; scene.add(this.boat); }
  _hand() {
    const g = new THREE.Group();
    const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x51708f, roughness: 0.95, flatShading: true });
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.28, 8), sleeveMat);
    sleeve.rotation.set(0.65, 0, -0.35);
    sleeve.position.set(0.08, -0.10, 0.18);
    g.add(sleeve);
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd8a077, roughness: 0.8, flatShading: true });
    const hand = createHandModel('right', skinMat);
    hand.rotation.x = 0.65;
    hand.position.set(0, -0.015, -0.02);
    g.add(hand);
    g.position.set(0, -0.035, 0.025);
    return g;
  }
  // style: 'float' 台钓竿（长细、无轮、绕线板）/ 'lure' 路亚竿（短粗、纺车轮）
  _makeRig(style) {
    const isFloat = style === 'float';
    const root = new THREE.Group();
    root.position.set(isFloat ? 0.26 : 0.30, isFloat ? -0.27 : -0.30, isFloat ? -0.55 : -0.52);
    root.rotation.set(-0.38, -0.14, 0.12);
    const mat = new THREE.MeshStandardMaterial({ color: isFloat ? 0x5a2020 : 0x1e3a2a, roughness: 0.6, flatShading: true });
    const metal = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.3 });
    // 竿把
    const buttLen = isFloat ? 0.5 : 0.34;
    const butt = new THREE.Mesh(new THREE.CylinderGeometry(isFloat ? 0.011 : 0.015, 0.017, buttLen, 6), mat);
    butt.rotation.x = Math.PI / 2;
    butt.position.z = -buttLen / 2;
    root.add(butt);
    // 竿身分节嵌套（受力时逐节弯曲成弧线）
    const N = isFloat ? 5 : 3;
    const SEG = isFloat ? 0.30 : 0.24;
    const RAD = isFloat
      ? [0.0105, 0.0085, 0.0068, 0.0052, 0.0038, 0.0026]   // 台钓竿：细长
      : [0.0150, 0.0120, 0.0092, 0.0065, 0.0045];          // 路亚竿：短粗
    const segs = [];
    let parent = root;
    for (let i = 0; i < N; i++) {
      const seg = new THREE.Group();
      seg.position.z = -(i === 0 ? buttLen : SEG);
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(RAD[i + 1], RAD[i], SEG, 5), mat);
      tube.rotation.x = Math.PI / 2;
      tube.position.z = -SEG / 2;
      seg.add(tube);
      const guide = new THREE.Mesh(new THREE.TorusGeometry(0.010, 0.0018, 4, 8), metal);
      guide.position.z = -SEG + 0.03;
      guide.rotation.y = Math.PI / 2;
      seg.add(guide);
      parent.add(seg);
      segs.push(seg);
      parent = seg;
    }
    const tip = new THREE.Object3D();
    tip.position.z = -SEG;
    parent.add(tip);
    if (isFloat) {
      // 绕线板（台钓无轮）
      const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.055, 8), new THREE.MeshStandardMaterial({ color: 0x223038, metalness: 0.5, roughness: 0.5 }));
      spool.rotation.z = Math.PI / 2;
      spool.position.set(0.0, -0.028, -0.07);
      root.add(spool);
    } else {
      // 纺车轮：线杯 + 机身 + 摇臂
      const reelMat = new THREE.MeshStandardMaterial({ color: 0x2c343c, metalness: 0.7, roughness: 0.35 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.045, 0.032), reelMat);
      body.position.set(0.02, -0.075, 0.02);
      root.add(body);
      const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.035, 10), metal);
      spool.rotation.z = Math.PI / 2;
      spool.position.set(0.05, -0.055, -0.02);
      root.add(spool);
      const knobArm = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.05, 5), reelMat);
      knobArm.rotation.set(1.2, 0, 0.6);
      knobArm.position.set(0.02, -0.105, 0.05);
      root.add(knobArm);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 5), reelMat);
      knob.position.set(0.045, -0.125, 0.065);
      root.add(knob);
    }
    const fpHand = this._hand();
    root.add(fpHand);
    const rightGrip = new THREE.Object3D();
    rightGrip.name = 'rightGrip';
    rightGrip.position.set(0, -0.035, 0.025);
    root.add(rightGrip);
    const leftGrip = new THREE.Object3D();
    leftGrip.name = 'leftGrip';
    leftGrip.position.set(0, 0, isFloat ? -0.28 : -0.24);
    root.add(leftGrip);
    // 第一人称时竿挂相机上的偏移；第三人称时挂到人物身上的偏移
    root.position.set(isFloat ? 0.26 : 0.30, isFloat ? -0.27 : -0.30, isFloat ? -0.55 : -0.52);
    return { root, segs, tip, fpHand, rightGrip, leftGrip, fpOffset: root.position.clone(), fpRotation: root.rotation.clone() };
  }
  setRodStyle(style) {
    this.rodStyle = style === 'lure' ? 'lure' : 'float';
    this._syncRigVisibility();
    if (this.view && this.body) this.setView(this.view); // 构造期跳过，稍后由 setView 统一挂载
  }
  _syncRigVisibility() {
    for (const style of ['float', 'lure']) {
      const rig = this.rig[style];
      rig.root.visible = !this.underwater && this.rodStyle === style;
      rig.fpHand.visible = !this.underwater && this.rodStyle === style && this.view !== 'third';
    }
  }
  setUnderwater(active) {
    this.underwater = !!active;
    this._syncRigVisibility();
  }
  // 第三人称人物由独立米制模型构建，保持脚底原点与面向 -Z 的场景约定
  _buildBody() {
    this.angler = createAngler();
    return this.angler.group;
  }
  // 视角切换：first = 竿挂相机；third = 竿挂人物、相机背后环绕
  setView(v) {
    this.view = v === 'third' ? 'third' : 'first';
    const rig = this.rig[this.rodStyle];
    if (this.view === 'first') {
      this.body.visible = false;
      this.cam.add(rig.root);
      rig.root.position.copy(rig.fpOffset);
      rig.root.rotation.copy(rig.fpRotation);
    } else {
      this.body.visible = true;
      this.body.add(rig.root);
      rig.root.position.set(0.16, 1.12, -0.14);
    }
    this._syncRigVisibility();
  }
  _poseHands() {
    const rig = this.rig[this.rodStyle];
    this.body.updateMatrixWorld(true);
    rig.rightGrip.getWorldPosition(_rightGrip);
    rig.leftGrip.getWorldPosition(_leftGrip);
    this.body.worldToLocal(_rightGrip);
    this.body.worldToLocal(_leftGrip);
    this.angler.poseGrip(_rightGrip, _leftGrip);
  }
  rodTipWorld(out) { return this.rig[this.rodStyle].tip.getWorldPosition(out); }
  // k: 0~1 弯曲强度；side: -1~1 鱼在左右侧的偏移（竿尖指向鱼）
  setBend(k, side = 0) { this._bendTarget = { k, side }; }
  setFishingState(phase, reeling) {
    this.fishingPhase = phase;
    this.reeling = !!reeling;
  }
  triggerAction(name) {
    this.action = name || null;
    this.actionT = 0;
  }
  _updateAction(dt) {
    const p = this._actionPose;
    p.x = 0; p.z = 0; p.lean = 0; p.roll = 0;
    if (this.reeling) {
      this.reelT += dt * 12;
      p.z += Math.sin(this.reelT) * 0.018;
      p.x += Math.sin(this.reelT * 0.5) * 0.012;
    }
    if (!this.action) return p;
    const durations = { cast: 0.65, strike: 0.32, land: 0.75 };
    this.actionT += dt;
    const progress = Math.min(1, this.actionT / (durations[this.action] || 0.5));
    const s = Math.sin(progress * Math.PI);
    if (this.action === 'cast') {
      p.x += 0.48 * s; p.z -= 0.18 * s; p.lean = -0.07 * s; p.roll = 0.04 * s;
    } else if (this.action === 'strike') {
      p.x += 0.58 * s; p.lean = -0.10 * s;
    } else if (this.action === 'land') {
      p.x -= 0.28 * s; p.lean = -0.18 * s;
    }
    if (progress >= 1) this.action = null;
    return p;
  }
  _applyBend(dt) {
    const rig = this.rig[this.rodStyle];
    const t = this._bendTarget;
    for (let i = 0; i < rig.segs.length; i++) {
      const s = rig.segs[i];
      // 各段向下前方弯（被鱼拉向水面），远端段弯得更多 → 弧线
      const perX = -0.30 * t.k * (0.55 + i * 0.22);
      const perY = 0.16 * t.side * t.k;
      s.rotation.x += (perX - s.rotation.x) * Math.min(1, dt * 8);
      s.rotation.y += (perY - s.rotation.y) * Math.min(1, dt * 8);
    }
  }
  forward(out) {
    this.cam.getWorldDirection(out);
    return out;
  }
  // 上/下船：上船需岸边前方有水（船直接推入水中）；下船需水浅（靠岸），退回岸上
  toggleBoat() {
    if (!this.onBoat) {
      const f = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const near = this.terrain.depthAt(this.pos.x + f.x * 2.5, this.pos.z + f.z * 2.5);
      if (near < 1.0) return 'need-water';
      this.onBoat = true;
      this.boat.visible = true;
      this.pos.x += f.x * 2.5;
      this.pos.z += f.z * 2.5;
      this.pos.y = 0;
      this.boat.position.set(this.pos.x, 0.02, this.pos.z);
      this.boat.rotation.y = this.yaw;
      return 'on';
    }
    const d = this.terrain.depthAt(this.pos.x, this.pos.z);
    if (d > 1.0) return 'deep';
    this.onBoat = false;
    this.boat.visible = false;
    // 退回岸上（沿船头反方向找陆地）
    const back = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    for (let s = 0; s <= 6; s += 1) {
      const px = this.pos.x + back.x * s, pz = this.pos.z + back.z * s;
      if (this.terrain.heightAt(px, pz) > 0.3) {
        this.pos.x = px; this.pos.z = pz;
        break;
      }
    }
    this.pos.y = Math.max(this.terrain.heightAt(this.pos.x, this.pos.z), 0.0);
    return 'off';
  }
  update(dt, input, allowMove) {
    // 视角
    this.yaw -= input.dx * 0.0023;
    this.pitch = clamp(this.pitch - input.dy * 0.0019, -1.25, 1.38);
    let moving = false;
    if (allowMove) {
      const speed = this.onBoat ? 2.2 : (input.isDown('ShiftLeft') || input.isDown('ShiftRight') ? 6 : 3.4);
      const f = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const r = new THREE.Vector3(-f.z, 0, f.x);
      const mv = new THREE.Vector3();
      if (input.isDown('KeyW')) mv.add(f);
      if (input.isDown('KeyS')) mv.sub(f);
      if (input.isDown('KeyA')) mv.sub(r);
      if (input.isDown('KeyD')) mv.add(r);
      if (mv.lengthSq() > 0) {
        mv.normalize().multiplyScalar(speed * dt);
        moving = true;
        this._tryMove(mv.x, mv.z);
      }
    }
    this.walkT += dt * (moving ? (this.onBoat ? 3 : (input.isDown('ShiftLeft') ? 11 : 7.5)) : 1.5);
    const running = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    const bob = moving ? Math.sin(this.walkT) * (this.onBoat ? 0.05 : 0.035) : Math.sin(this.walkT) * 0.008;
    const eye = EYE + (this.onBoat ? 0.10 : 0);
    this.cam.position.set(this.pos.x, this.pos.y + eye + bob, this.pos.z);
    this.cam.rotation.set(this.pitch, this.yaw, Math.sin(this.walkT * 0.5) * (moving ? 0.008 : 0.002), 'YXZ');
    // 人物模型同步（第三人称可见）+ 髋膝联动与持竿姿态
    const actionPose = this._updateAction(dt);
    const boatY = this.onBoat ? 0.02 + Math.sin(this.walkT) * 0.04 : 0;
    this.body.position.set(this.pos.x, this.pos.y + (this.onBoat ? 0.174 + boatY : 0), this.pos.z);
    this.body.rotation.y = this.yaw;
    this.body.rotation.x = actionPose.lean;
    this.body.rotation.z = actionPose.roll;
    this.angler.setWalk(this.walkT, moving, running, this.onBoat);
    // 船体跟随
    if (this.onBoat) {
      this.boat.position.set(this.pos.x, boatY, this.pos.z);
      this.boat.rotation.y = this.yaw;
      this.pos.y = 0;
    } else {
      this.pos.y = this.terrain.heightAt(this.pos.x, this.pos.z);
    }
    // 竿基础仰角（固定三档）+ 弯曲弧线平滑；第三人称按双手握持锚定
    const rig = this.rig[this.rodStyle];
    const base = rig.root;
    if (this.view === 'third') {
      base.rotation.set(0.18 + this.rodPitch * 0.55 + actionPose.x, 0, 0.03 + actionPose.z);
    } else {
      base.rotation.set(-(0.12 + this.rodPitch * 0.5) + actionPose.x, rig.fpRotation.y, rig.fpRotation.z + actionPose.z);
    }
    this._applyBend(dt);
    if (this.view === 'third') this._poseHands();
    // 第三人称：WoW 式机位——角色完整出镜居画面下沿，视线越过角色看向前方
    if (this.view === 'third') {
      const dist = 5.4;
      const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
      const fx = -Math.sin(this.yaw) * cp, fz = -Math.cos(this.yaw) * cp;
      // 注视点在角色前方 7m（俯仰抬降视线）
      const tx = this.pos.x + fx * 7;
      const tz = this.pos.z + fz * 7;
      const ty = this.pos.y + 1.2 + sp * 7;
      const cx = this.pos.x - fx * dist;
      const cz = this.pos.z - fz * dist;
      const cy = Math.max(ty + 1.1, this.terrain.heightAt(cx, cz) + 0.5);
      _camOrigin.set(this.pos.x, this.pos.y + (this.onBoat ? 1.0 : 1.35), this.pos.z);
      _camDesired.set(cx, cy, cz);
      const clip = this.terrain.cameraClipFraction(_camOrigin, _camDesired);
      this.cam.position.copy(_camOrigin).lerp(_camDesired, clip);
      this.cam.lookAt(tx, ty, tz);
    }
  }
  _tryMove(dx, dz) {
    if (this.onBoat) {
      const tryBoat = (nx, nz) => this.terrain.depthAt(nx, nz) > 0.7 && Math.abs(nx) < 265 && Math.abs(nz) < 265;
      if (tryBoat(this.pos.x + dx, this.pos.z + dz)) { this.pos.x += dx; this.pos.z += dz; }
      else if (tryBoat(this.pos.x + dx, this.pos.z)) this.pos.x += dx;
      else if (tryBoat(this.pos.x, this.pos.z + dz)) this.pos.z += dz;
      return;
    }
    const tryStep = (nx, nz) => {
      const h = this.terrain.heightAt(nx, nz);
      return h > 0.32 && h < 12 && Math.abs(nx) < 265 && Math.abs(nz) < 265;
    };
    if (tryStep(this.pos.x + dx, this.pos.z + dz)) { this.pos.x += dx; this.pos.z += dz; }
    else if (tryStep(this.pos.x + dx, this.pos.z)) this.pos.x += dx;
    else if (tryStep(this.pos.x, this.pos.z + dz)) this.pos.z += dz;
    this.pos.y = this.terrain.heightAt(this.pos.x, this.pos.z);
  }
}
