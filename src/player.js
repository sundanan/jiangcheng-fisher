// 玩家：第一人称行走 + 视角 + 双竿外观（台钓竿：长细无轮；路亚竿：短粗带纺车轮）+ 船钓
import * as THREE from '../lib/three.module.js';
import { clamp } from './util.js?v=16';

const EYE = 1.62;
const DONGHU = { x: 63, z: 25 }; // 东湖中心（出生在其岸线）

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
    this._bendTarget = { k: 0, side: 0 };
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
    const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x3a4a5c, roughness: 0.95, flatShading: true });
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.062, 0.38, 7), sleeveMat);
    sleeve.rotation.set(0.55, 0, -0.5);
    sleeve.position.set(0.10, -0.115, 0.17);
    g.add(sleeve);
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd8a077, roughness: 0.8, flatShading: true });
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), skinMat);
    palm.scale.set(0.9, 1, 1.2);
    palm.position.set(0.008, -0.028, -0.01);
    g.add(palm);
    for (let i = 0; i < 3; i++) {
      const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.034, 3, 5), skinMat);
      finger.rotation.set(0.3, 0, 1.35);
      finger.position.set(-0.02 - i * 0.004, -0.024 + i * 0.014, -0.014 + i * 0.03);
      g.add(finger);
    }
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.01, 0.036, 3, 5), skinMat);
    thumb.rotation.set(0.2, 0, 0.9);
    thumb.position.set(0.03, -0.02, 0.036);
    g.add(thumb);
    g.position.set(0, -0.06, 0.06);
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
    root.add(this._hand());
    // 第一人称时竿挂相机上的偏移；第三人称时挂到人物身上的偏移
    root.position.set(isFloat ? 0.26 : 0.30, isFloat ? -0.27 : -0.30, isFloat ? -0.55 : -0.52);
    return { root, segs, tip, fpOffset: root.position.clone() };
  }
  setRodStyle(style) {
    this.rodStyle = style === 'lure' ? 'lure' : 'float';
    this.rig.float.root.visible = this.rodStyle === 'float';
    this.rig.lure.root.visible = this.rodStyle === 'lure';
    if (this.view && this.body) this.setView(this.view); // 构造期跳过，稍后由 setView 统一挂载
  }
  // 构建 third-person 职业钓手形象（面向 -Z）：防晒服+马甲+偏光镜+背后抄网+腰包
  _buildBody() {
    const g = new THREE.Group();
    const jacket = new THREE.MeshStandardMaterial({ color: 0x51708f, roughness: 0.95, flatShading: true });   // 蓝灰防晒服
    const vest = new THREE.MeshStandardMaterial({ color: 0x33506b, roughness: 0.95, flatShading: true });     // 深色钓鱼马甲
    const pants = new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.95, flatShading: true });
    const boot = new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 1, flatShading: true });
    const skin = new THREE.MeshStandardMaterial({ color: 0xd8a077, roughness: 0.8, flatShading: true });
    const hat = new THREE.MeshStandardMaterial({ color: 0x35502e, roughness: 1, flatShading: true });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1c2024, roughness: 0.6, flatShading: true });
    const stripe = new THREE.MeshStandardMaterial({ color: 0xd8d8c8, roughness: 0.9, flatShading: true });    // 反光条
    // 两段式肢体：从 from 到 to 的圆柱
    const limb = (from, to, r, mat) => {
      const dir = new THREE.Vector3().subVectors(to, from);
      const len = Math.max(0.02, dir.length());
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.85, len, 6), mat);
      m.position.copy(from).addScaledVector(dir, 0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      g.add(m);
      return m;
    };
    // 腿（带髋关节组，行走摆动用）
    this._legs = [];
    for (const sx of [-0.12, 0.12]) {
      const hip = new THREE.Group();
      hip.position.set(sx, 0.74, 0);
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.4, 0.165), pants);
      thigh.position.y = -0.2;
      hip.add(thigh);
      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.15), pants);
      shin.position.y = -0.55;
      hip.add(shin);
      const bootM = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.12, 0.27), boot);
      bootM.position.set(0, -0.76, -0.05);
      hip.add(bootM);
      g.add(hip);
      this._legs.push(hip);
    }
    // 躯干：防晒服 + 马甲 + 口袋 + 反光条
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.58, 0.28), jacket);
    torso.position.y = 1.03;
    g.add(torso);
    const vestM = new THREE.Mesh(new THREE.BoxGeometry(0.49, 0.46, 0.31), vest);
    vestM.position.y = 1.08;
    g.add(vestM);
    for (const px of [-0.13, 0.13]) {  // 马甲口袋
      const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.02), vest);
      pocket.position.set(px, 1.05, -0.17);
      g.add(pocket);
    }
    const zip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.44, 0.015), dark);
    zip.position.set(0, 1.08, -0.165);
    g.add(zip);
    const reflect = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.315), stripe); // 背部反光条
    reflect.position.y = 1.24;
    g.add(reflect);
    // 头：脖子 + 头 + 棒球帽 + 偏光镜
    limb(new THREE.Vector3(0, 1.3, 0), new THREE.Vector3(0, 1.42, 0), 0.055, skin);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.145, 8, 7), skin);
    head.position.y = 1.52;
    g.add(head);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.165, 0.1, 8), hat);
    cap.position.y = 1.645;
    g.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.022, 0.2), hat);
    brim.position.set(0, 1.61, -0.2);
    g.add(brim);
    const glasses = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.05, 0.03), dark); // 偏光钓鱼镜
    glasses.position.set(0, 1.54, -0.115);
    g.add(glasses);
    // 双臂两段式（后手握竿把，前手扶竿身）
    const rs = new THREE.Vector3(0.28, 1.3, 0.02), re = new THREE.Vector3(0.24, 1.06, -0.2), rh = new THREE.Vector3(0.2, 1.12, -0.42);
    limb(rs, re, 0.055, jacket);
    limb(re, rh, 0.048, jacket);
    const rHand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), skin);
    rHand.position.copy(rh);
    g.add(rHand);
    const ls = new THREE.Vector3(-0.28, 1.3, 0.02), le = new THREE.Vector3(-0.16, 1.12, -0.3), lh = new THREE.Vector3(0.1, 1.24, -0.56);
    limb(ls, le, 0.055, jacket);
    limb(le, lh, 0.048, jacket);
    const lHand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), skin);
    lHand.position.copy(lh);
    g.add(lHand);
    // 背后抄网（手柄斜背 + 网圈 + 网兜）
    const nb0 = new THREE.Vector3(-0.22, 1.38, 0.2), nb1 = new THREE.Vector3(0.2, 0.78, 0.26);
    limb(nb0, nb1, 0.022, boot);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.018, 5, 10), new THREE.MeshStandardMaterial({ color: 0x8a8a85, roughness: 0.7, metalness: 0.3 }));
    rim.position.copy(nb1);
    rim.rotation.x = 0.4;
    rim.rotation.z = -0.5;
    g.add(rim);
    const pouch = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 8), new THREE.MeshStandardMaterial({ color: 0x3d4a42, roughness: 1, flatShading: true }));
    pouch.position.set(nb1.x + 0.06, nb1.y - 0.22, nb1.z + 0.04);
    pouch.rotation.z = -0.4;
    g.add(pouch);
    // 腰间鱼护包
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.24, 0.13), vest);
    bag.position.set(-0.3, 0.86, 0.02);
    bag.rotation.z = 0.12;
    g.add(bag);
    return g;
  }
  // 视角切换：first = 竿挂相机；third = 竿挂人物、相机背后环绕
  setView(v) {
    this.view = v === 'third' ? 'third' : 'first';
    const rig = this.rig[this.rodStyle];
    if (this.view === 'first') {
      this.body.visible = false;
      this.cam.add(rig.root);
      rig.root.position.copy(rig.fpOffset);
    } else {
      this.body.visible = true;
      this.body.add(rig.root);
      rig.root.position.set(0.24, 1.18, -0.5);
    }
  }
  rodTipWorld(out) { return this.rig[this.rodStyle].tip.getWorldPosition(out); }
  // k: 0~1 弯曲强度；side: -1~1 鱼在左右侧的偏移（竿尖指向鱼）
  setBend(k, side = 0) { this._bendTarget = { k, side }; }
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
    const bob = moving ? Math.sin(this.walkT) * (this.onBoat ? 0.05 : 0.035) : Math.sin(this.walkT) * 0.008;
    const eye = EYE + (this.onBoat ? 0.35 : 0);
    this.cam.position.set(this.pos.x, this.pos.y + eye + bob, this.pos.z);
    this.cam.rotation.set(this.pitch, this.yaw, Math.sin(this.walkT * 0.5) * (moving ? 0.008 : 0.002), 'YXZ');
    // 人物模型同步（第三人称可见）+ 行走摆腿/摆臂
    this.body.position.set(this.pos.x, this.pos.y + (this.onBoat ? 0.42 : 0), this.pos.z);
    this.body.rotation.y = this.yaw;
    if (this._legs && this.view === 'third') {
      const swing = moving && !this.onBoat ? Math.sin(this.walkT) * 0.5 : 0;
      this._legs[0].rotation.x = swing;
      this._legs[1].rotation.x = -swing;
    }
    // 船体跟随
    if (this.onBoat) {
      this.boat.position.set(this.pos.x, 0.02 + Math.sin(this.walkT) * 0.04, this.pos.z);
      this.boat.rotation.y = this.yaw;
      this.pos.y = 0;
    } else {
      this.pos.y = this.terrain.heightAt(this.pos.x, this.pos.z);
    }
    // 竿基础仰角（固定三档）+ 弯曲弧线平滑
    const base = this.rig[this.rodStyle].root;
    base.rotation.x = -(0.12 + this.rodPitch * 0.5);
    this._applyBend(dt);
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
      this.cam.position.set(cx, cy, cz);
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
