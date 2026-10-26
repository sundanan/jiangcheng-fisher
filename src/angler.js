// 职业钓手：米制成人比例、程序化低模、髋膝与肩肘关节、双手握竿 IK
import * as THREE from '../lib/three.module.js';

export const ANGLER_METRICS = Object.freeze({
  height: 1.75,
  headHeight: 0.23,
  eyeHeight: 1.62,
  shoulderWidth: 0.48,
  hipHeight: 0.91,
  thighLength: 0.42,
  shinLength: 0.40,
  upperArmLength: 0.30,
  foreArmLength: 0.27,
  handLength: 0.17,
  footLength: 0.27,
});

const DOWN = new THREE.Vector3(0, -1, 0);
const _target = new THREE.Vector3();
const _wrist = new THREE.Vector3();
const _toTarget = new THREE.Vector3();
const _axis = new THREE.Vector3();
const _pole = new THREE.Vector3();
const _bend = new THREE.Vector3();
const _elbow = new THREE.Vector3();
const _upperDir = new THREE.Vector3();
const _foreDir = new THREE.Vector3();
const _qFore = new THREE.Quaternion();
const _qParentInv = new THREE.Quaternion();

function material(color, roughness = 0.9, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, flatShading: true, ...extra });
}

function addMesh(parent, geometry, mat, name, position, scale) {
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.name = name;
  mesh.castShadow = true;
  if (position) mesh.position.copy(position);
  if (scale) mesh.scale.copy(scale);
  parent.add(mesh);
  return mesh;
}

// 椭圆截面放样：比盒体更接近人体躯干，同时保留低多边形轮廓
function loft(parent, rings, mat, name, segments = 10) {
  const positions = [];
  const indices = [];
  for (const ring of rings) {
    for (let j = 0; j < segments; j++) {
      const a = j / segments * Math.PI * 2;
      positions.push(Math.cos(a) * ring.rx, ring.y, Math.sin(a) * ring.rz + (ring.z || 0));
    }
  }
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * segments + j;
      const b = (i + 1) * segments + j;
      const an = i * segments + (j + 1) % segments;
      const bn = (i + 1) * segments + (j + 1) % segments;
      indices.push(a, b, bn, a, bn, an);
    }
  }
  const bottom = positions.length / 3;
  positions.push(0, rings[0].y, rings[0].z || 0);
  const top = positions.length / 3;
  const last = rings[rings.length - 1];
  positions.push(0, last.y, last.z || 0);
  for (let j = 0; j < segments; j++) {
    const next = (j + 1) % segments;
    indices.push(bottom, j, next);
    indices.push(top, (rings.length - 1) * segments + next, (rings.length - 1) * segments + j);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return addMesh(parent, geometry, mat, name);
}

function segment(parent, length, topRadius, bottomRadius, mat, name, depthScale = 0.9) {
  const mesh = addMesh(parent, new THREE.CylinderGeometry(bottomRadius, topRadius, length, 8), mat, name);
  mesh.position.y = -length / 2;
  mesh.scale.z = depthScale;
  return mesh;
}

function jointBall(parent, radius, mat, name, scale) {
  return addMesh(parent, new THREE.SphereGeometry(radius, 8, 6), mat, name, null, scale);
}

function cylinderBetween(parent, from, to, radius, mat, name, segments = 8) {
  const direction = new THREE.Vector3().subVectors(to, from);
  const mesh = addMesh(parent, new THREE.CylinderGeometry(radius, radius, direction.length(), segments), mat, name);
  mesh.position.copy(from).addScaledVector(direction, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}

export function createHandModel(side, skin) {
  const hand = new THREE.Group();
  hand.name = side === 'right' ? 'rightHand' : 'leftHand';
  jointBall(hand, 1, skin, 'palm', new THREE.Vector3(0.041, 0.058, 0.026)).position.y = -0.052;
  for (let i = 0; i < 4; i++) {
    const finger = addMesh(hand, new THREE.CapsuleGeometry(0.0075, 0.042 - i * 0.002, 3, 5), skin, `finger${i + 1}`);
    finger.position.set(-0.025 + i * 0.016, -0.112 + Math.abs(1.5 - i) * 0.003, -0.014);
    finger.rotation.x = -0.72;
  }
  const thumb = addMesh(hand, new THREE.CapsuleGeometry(0.009, 0.038, 3, 5), skin, 'thumb');
  thumb.position.set(side === 'right' ? -0.039 : 0.039, -0.061, -0.006);
  thumb.rotation.set(-0.35, 0, side === 'right' ? -0.8 : 0.8);
  return hand;
}

function buildHand(wrist, side, skin) {
  const hand = createHandModel(side, skin);
  wrist.add(hand);
  return hand;
}

function buildArm(body, side, shoulderY, mats, joints) {
  const sign = side === 'right' ? 1 : -1;
  const shoulder = new THREE.Group();
  shoulder.name = `${side}Shoulder`;
  shoulder.position.set(sign * 0.174, shoulderY, 0);
  body.add(shoulder);
  jointBall(shoulder, 1, mats.jacket, 'deltoid', new THREE.Vector3(0.066, 0.074, 0.062));
  segment(shoulder, ANGLER_METRICS.upperArmLength, 0.061, 0.047, mats.jacket, 'upperArm');
  const elbow = new THREE.Group();
  elbow.name = `${side}Elbow`;
  elbow.position.y = -ANGLER_METRICS.upperArmLength;
  shoulder.add(elbow);
  jointBall(elbow, 1, mats.jacket, 'elbow', new THREE.Vector3(0.048, 0.05, 0.044));
  segment(elbow, ANGLER_METRICS.foreArmLength, 0.047, 0.032, mats.jacket, 'foreArm');
  const wrist = new THREE.Group();
  wrist.name = `${side}Wrist`;
  wrist.position.y = -ANGLER_METRICS.foreArmLength;
  elbow.add(wrist);
  const cuff = addMesh(wrist, new THREE.CylinderGeometry(0.032, 0.034, 0.045, 8), mats.jacket, 'cuff');
  cuff.position.y = -0.012;
  const hand = buildHand(wrist, side, mats.skin);
  const arm = { shoulder, elbow, wrist, hand, side, sign };
  joints[side] = arm;
  return arm;
}

function buildLeg(body, side, mats) {
  const sign = side === 'right' ? 1 : -1;
  const hip = new THREE.Group();
  hip.name = `${side}Hip`;
  hip.position.set(sign * 0.095, ANGLER_METRICS.hipHeight, 0);
  body.add(hip);
  segment(hip, ANGLER_METRICS.thighLength, 0.086, 0.061, mats.pants, 'thigh', 0.95);
  const knee = new THREE.Group();
  knee.name = `${side}Knee`;
  knee.position.y = -ANGLER_METRICS.thighLength;
  hip.add(knee);
  jointBall(knee, 1, mats.pants, 'knee', new THREE.Vector3(0.061, 0.064, 0.056));
  segment(knee, ANGLER_METRICS.shinLength, 0.059, 0.037, mats.pants, 'shin', 0.92);
  const ankle = new THREE.Group();
  ankle.name = `${side}Ankle`;
  ankle.position.y = -ANGLER_METRICS.shinLength;
  knee.add(ankle);
  const sole = addMesh(ankle, new THREE.BoxGeometry(0.12, 0.025, ANGLER_METRICS.footLength), mats.boot, 'bootSole');
  sole.position.set(0, -0.0775, -0.05);
  jointBall(ankle, 1, mats.boot, 'bootUpper', new THREE.Vector3(0.058, 0.055, 0.125)).position.set(0, -0.035, -0.045);
  const cuff = addMesh(ankle, new THREE.CylinderGeometry(0.043, 0.05, 0.09, 8), mats.boot, 'bootCuff');
  cuff.position.y = 0.005;
  return { hip, knee, ankle, side };
}

function aimArm(arm, palmTarget, poleHint) {
  const L1 = ANGLER_METRICS.upperArmLength;
  const L2 = ANGLER_METRICS.foreArmLength;
  const shoulderPos = arm.shoulder.position;
  _target.copy(palmTarget);
  _toTarget.subVectors(_target, shoulderPos);
  const palmDistance = _toTarget.length();
  _axis.copy(_toTarget).normalize();
  // 竿上的锚点对应掌心而非腕口，腕部目标按手掌长度回退并迭代一次
  _wrist.copy(_target).addScaledVector(_axis, -0.052);
  let rawDistance = 0;
  for (let iteration = 0; iteration < 2; iteration++) {
    _toTarget.subVectors(_wrist, shoulderPos);
    rawDistance = _toTarget.length();
    const distance = THREE.MathUtils.clamp(rawDistance, Math.abs(L1 - L2) + 0.001, L1 + L2 - 0.001);
    _axis.copy(_toTarget).normalize();
    const cosAngle = THREE.MathUtils.clamp((L1 * L1 + distance * distance - L2 * L2) / (2 * L1 * distance), -1, 1);
    const angle = Math.acos(cosAngle);
    _pole.copy(poleHint).addScaledVector(_axis, -poleHint.dot(_axis));
    if (_pole.lengthSq() < 0.0001) _pole.set(arm.sign, -0.2, 0.2).addScaledVector(_axis, -_axis.x * arm.sign);
    _pole.normalize();
    _elbow.copy(shoulderPos).addScaledVector(_axis, L1 * cosAngle).addScaledVector(_pole, L1 * Math.sin(angle));
    _upperDir.subVectors(_elbow, shoulderPos).normalize();
    _bend.copy(shoulderPos).addScaledVector(_axis, distance);
    _foreDir.subVectors(_bend, _elbow).normalize();
    arm.shoulder.quaternion.setFromUnitVectors(DOWN, _upperDir);
    _qFore.setFromUnitVectors(DOWN, _foreDir);
    _qParentInv.copy(arm.shoulder.quaternion).invert();
    arm.elbow.quaternion.copy(_qParentInv).multiply(_qFore);
    arm.wrist.quaternion.identity();
    if (iteration === 0) {
      _bend.copy(_wrist).addScaledVector(_foreDir, 0.052);
      _bend.subVectors(_target, _bend);
      _wrist.add(_bend);
    }
  }
  _bend.copy(_wrist).addScaledVector(_foreDir, 0.052);
  return { palmDistance, wristDistance: rawDistance, palmError: _bend.distanceTo(_target), reachable: rawDistance <= L1 + L2 };
}

export function createAngler() {
  const body = new THREE.Group();
  body.name = 'realisticAngler';
  body.userData.metrics = ANGLER_METRICS;
  const mats = {
    jacket: material(0x51708f, 0.95),
    vest: material(0x33506b, 0.95),
    pants: material(0x3a4048, 0.95),
    boot: material(0x2a2622, 1),
    skin: material(0xd8a077, 0.8),
    hat: material(0x35502e, 1),
    dark: material(0x1c2024, 0.6),
    stripe: material(0xd8d8c8, 0.9),
    net: material(0x5a6a60, 1, { side: THREE.DoubleSide, wireframe: true, transparent: true, opacity: 0.68, depthWrite: false }),
    metal: material(0x8a8a85, 0.7, { metalness: 0.3 }),
  };
  const joints = { left: null, right: null, legs: [] };

  // 骨盆、腰部、胸廓与肩部采用不同截面，不再用同一长方体代替躯干
  loft(body, [
    { y: 0.84, rx: 0.145, rz: 0.10 },
    { y: 0.93, rx: 0.17, rz: 0.115 },
    { y: 1.02, rx: 0.155, rz: 0.105 },
  ], mats.pants, 'pelvis');
  loft(body, [
    { y: 0.96, rx: 0.155, rz: 0.105 },
    { y: 1.08, rx: 0.148, rz: 0.105 },
    { y: 1.20, rx: 0.17, rz: 0.118 },
    { y: 1.34, rx: 0.197, rz: 0.12 },
    { y: 1.41, rx: 0.198, rz: 0.108 },
    { y: 1.46, rx: 0.105, rz: 0.078 },
  ], mats.jacket, 'torso');
  loft(body, [
    { y: 1.00, rx: 0.163, rz: 0.116 },
    { y: 1.12, rx: 0.158, rz: 0.116 },
    { y: 1.26, rx: 0.183, rz: 0.13 },
    { y: 1.37, rx: 0.207, rz: 0.128 },
    { y: 1.405, rx: 0.194, rz: 0.116 },
  ], mats.vest, 'fishingVest');
  loft(body, [
    { y: 1.295, rx: 0.194, rz: 0.137 },
    { y: 1.322, rx: 0.198, rz: 0.136 },
  ], mats.stripe, 'reflectiveBand');
  for (const x of [-0.105, 0.105]) {
    const pocket = addMesh(body, new THREE.BoxGeometry(0.09, 0.105, 0.018), mats.vest, 'vestPocket');
    pocket.position.set(x, 1.145, -0.124);
    const flap = addMesh(body, new THREE.BoxGeometry(0.094, 0.018, 0.022), mats.dark, 'pocketFlap');
    flap.position.set(x, 1.194, -0.127);
  }
  const zipper = addMesh(body, new THREE.BoxGeometry(0.012, 0.37, 0.012), mats.dark, 'zipper');
  zipper.position.set(0, 1.19, -0.137);

  const neck = addMesh(body, new THREE.CylinderGeometry(0.048, 0.057, 0.105, 8), mats.skin, 'neck');
  neck.position.set(0, 1.485, 0);
  const collar = addMesh(body, new THREE.TorusGeometry(0.066, 0.014, 5, 10), mats.jacket, 'collar');
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 1.455;
  loft(body, [
    { y: 1.515, rx: 0.025, rz: 0.035, z: -0.012 },
    { y: 1.545, rx: 0.06, rz: 0.065, z: -0.006 },
    { y: 1.60, rx: 0.076, rz: 0.082 },
    { y: 1.665, rx: 0.079, rz: 0.084, z: 0.004 },
    { y: 1.715, rx: 0.064, rz: 0.066, z: 0.008 },
    { y: 1.745, rx: 0.018, rz: 0.022, z: 0.008 },
  ], mats.skin, 'head', 10);
  for (const sign of [-1, 1]) {
    jointBall(body, 1, mats.skin, 'ear', new THREE.Vector3(0.014, 0.024, 0.012)).position.set(sign * 0.078, 1.615, 0.004);
  }
  const nose = addMesh(body, new THREE.ConeGeometry(0.016, 0.042, 5), mats.skin, 'nose');
  nose.rotation.x = -Math.PI / 2;
  nose.position.set(0, 1.605, -0.091);
  for (const x of [-0.034, 0.034]) {
    const lens = addMesh(body, new THREE.BoxGeometry(0.055, 0.031, 0.01), mats.dark, 'polarizedLens');
    lens.position.set(x, 1.632, -0.081);
  }
  const bridge = addMesh(body, new THREE.BoxGeometry(0.018, 0.006, 0.009), mats.dark, 'glassesBridge');
  bridge.position.set(0, 1.635, -0.087);
  for (const sign of [-1, 1]) {
    cylinderBetween(body, new THREE.Vector3(sign * 0.061, 1.635, -0.077), new THREE.Vector3(sign * 0.079, 1.635, 0.015), 0.004, mats.dark, 'glassesArm', 5);
  }
  const cap = addMesh(body, new THREE.SphereGeometry(1, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), mats.hat, 'capCrown');
  cap.scale.set(0.087, 0.068, 0.093);
  cap.position.set(0, 1.69, 0.008);
  const capBand = addMesh(body, new THREE.CylinderGeometry(0.087, 0.087, 0.024, 10), mats.hat, 'capBand');
  capBand.scale.z = 1.07;
  capBand.position.set(0, 1.69, 0.008);
  const brim = addMesh(body, new THREE.CylinderGeometry(0.09, 0.09, 0.012, 12), mats.hat, 'capBrim');
  brim.scale.z = 0.82;
  brim.position.set(0, 1.684, -0.102);

  joints.legs.push(buildLeg(body, 'left', mats), buildLeg(body, 'right', mats));
  buildArm(body, 'left', 1.405, mats, joints);
  buildArm(body, 'right', 1.405, mats, joints);

  // 斜背抄网与腰间鱼护包保留原角色的职业识别轮廓
  const netStart = new THREE.Vector3(-0.16, 1.39, 0.14);
  const netEnd = new THREE.Vector3(0.17, 0.86, 0.21);
  cylinderBetween(body, netStart, netEnd, 0.014, mats.boot, 'landingNetHandle');
  const rim = addMesh(body, new THREE.TorusGeometry(0.15, 0.012, 5, 12), mats.metal, 'landingNetRim');
  rim.position.copy(netEnd);
  rim.rotation.set(0.3, 0, -0.45);
  const net = addMesh(body, new THREE.CylinderGeometry(0.142, 0.025, 0.28, 10, 5, true), mats.net, 'landingNetPouch');
  net.position.set(netEnd.x + 0.035, netEnd.y - 0.18, netEnd.z + 0.025);
  net.rotation.z = -0.35;
  const bag = addMesh(body, new THREE.BoxGeometry(0.15, 0.19, 0.11), mats.vest, 'fishBag');
  bag.position.set(-0.215, 0.96, 0.015);
  bag.rotation.z = 0.1;
  const buckle = addMesh(body, new THREE.BoxGeometry(0.045, 0.025, 0.012), mats.dark, 'bagBuckle');
  buckle.position.set(-0.215, 0.985, -0.047);

  const model = {
    group: body,
    joints,
    metrics: ANGLER_METRICS,
    lastGrip: { right: null, left: null },
    setWalk(walkT, moving, running, onBoat) {
      if (onBoat) {
        for (const leg of joints.legs) {
          leg.hip.rotation.x = 1.25;
          leg.knee.rotation.x = -1.05;
          leg.ankle.rotation.x = -0.20;
        }
        return;
      }
      const amount = moving ? Math.sin(walkT) * (running ? 0.46 : 0.34) : 0;
      for (let i = 0; i < joints.legs.length; i++) {
        const leg = joints.legs[i];
        const swing = i === 0 ? amount : -amount;
        leg.hip.rotation.x = swing;
        leg.knee.rotation.x = -Math.max(0, swing) * 0.72;
        leg.ankle.rotation.x = -(leg.hip.rotation.x + leg.knee.rotation.x) * 0.72;
      }
    },
    poseGrip(rightPalm, leftPalm) {
      model.lastGrip.right = aimArm(joints.right, rightPalm, new THREE.Vector3(0.9, -0.55, 0.25));
      model.lastGrip.left = aimArm(joints.left, leftPalm, new THREE.Vector3(-0.9, -0.45, 0.2));
      return model.lastGrip;
    },
  };
  return model;
}
