// 地形：按 8 大钓点的真实地理位置建模（长江/汉江/府河河道 + 梁子湖/汤逊湖/东湖/后官湖湖盆）
// 经纬度 → 世界坐标：x = (lng-114.30)*640, z = (30.55-lat)*640
import * as THREE from '../lib/three.module.js';
import { fbm, smoothstep, rand } from './util.js?v=16';
import { SPOTS, shorePointFor } from './spots.js?v=18';

export const WORLD_SIZE = 560;

const P = (lng, lat) => [(lng - 114.30) * 640, (30.55 - lat) * 640];

// 河道折线（世界坐标）
const RIVERS = [
  { pts: [[114.18, 30.46], [114.30, 30.55], [114.42, 30.63], [114.52, 30.70]].map((p) => P(p[0], p[1])), hw: 30, depth: 9 },  // 长江
  { pts: [[113.90, 30.62], [114.10, 30.60], [114.27, 30.56]].map((p) => P(p[0], p[1])), hw: 15, depth: 7 },                   // 汉江
  { pts: [[114.02, 30.68], [114.14, 30.66], [114.22, 30.62]].map((p) => P(p[0], p[1])), hw: 14, depth: 5 },                   // 府河
];
// 湖盆椭圆
const LAKES = [
  { cx: 186, cz: 122, rx: 72, ry: 48, rot: 0.5, depth: 8 },    // 梁子湖
  { cx: 60, cz: 105, rx: 48, ry: 30, rot: 0.2, depth: 8 },     // 汤逊湖
  { cx: 63, cz: 25, rx: 50, ry: 32, rot: -0.35, depth: 7 },    // 东湖
  { cx: -179, cz: 38, rx: 64, ry: 38, rot: 0.3, depth: 7 },    // 后官湖
];

function distToPolyline(px, pz, pts) {
  let best = 1e9;
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i][0], az = pts[i][1], bx = pts[i + 1][0], bz = pts[i + 1][1];
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
    const d = Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
    if (d < best) best = d;
  }
  return best;
}

// 水面流速强度（河道近=1，湖泊≈0）
export function flowFactor(x, z) {
  let f = 0;
  for (const r of RIVERS) {
    f = Math.max(f, smoothstep(r.hw + 10, r.hw - 10, distToPolyline(x, z, r.pts)));
  }
  return f;
}

export class Terrain {
  constructor(scene) {
    this.scene = scene;
    this.heightAt = this._h;
    this._buildMesh();
    const defaultShore = this.findShore(63, 25, 80);
    this.clearZones = [
      { x: defaultShore.x, z: defaultShore.z, r: 10 },
      ...SPOTS.map((spot) => {
        const p = shorePointFor(spot, this);
        return { x: p.x, z: p.z, r: 10 };
      }),
    ];
    this.treeColliders = [];
    this._buildVegetation();
  }
  _h(x, z) {
    let h = 3.0 + fbm(x * 0.02 + 7, z * 0.02 + 3, 4) * 2.4;
    for (const r of RIVERS) {
      const d = distToPolyline(x, z, r.pts);
      h -= r.depth * smoothstep(r.hw + 16, r.hw - 8, d);
    }
    for (const l of LAKES) {
      const dx = x - l.cx, dz = z - l.cz;
      const cos = Math.cos(l.rot), sin = Math.sin(l.rot);
      const ex = (dx * cos + dz * sin) / l.rx;
      const ez = (-dx * sin + dz * cos) / l.ry;
      const e = Math.hypot(ex, ez);
      h -= l.depth * smoothstep(1.02, 0.88, e);
    }
    h += (fbm(x * 0.06 + 40, z * 0.06, 3) - 0.5) * 1.0;
    return h;
  }
  depthAt(x, z) { return Math.max(0, -this._h(x, z)); }
  isWater(x, z) { return this._h(x, z) < -0.12; }
  zoneAt(x, z) {
    for (const r of RIVERS) {
      if (distToPolyline(x, z, r.pts) < r.hw + 6) return 'river';
    }
    for (const l of LAKES) {
      const dx = x - l.cx, dz = z - l.cz;
      const cos = Math.cos(l.rot), sin = Math.sin(l.rot);
      const ex = (dx * cos + dz * sin) / l.rx;
      const ez = (-dx * sin + dz * cos) / l.ry;
      if (Math.hypot(ex, ez) < 1.05) return 'lake';
    }
    return 'land';
  }
  // 在 (cx,cz) 附近找一块"岸上有立足点、沿面向 5.8m 抛距内有水"的岸线
  findShore(cx, cz, maxR = 90) {
    for (let r = 12; r <= maxR; r += 4) {
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2 + r * 0.7;
        const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
        if (this._h(x, z) < 0.5 || this._h(x, z) > 6) continue;
        const cos = Math.cos(a), sin = Math.sin(a);
        let ok = true;
        for (const d of [2, 3.5, 5, 5.8]) {
          if (this.depthAt(cx + cos * (r + d), cz + sin * (r + d)) < 0.3) { ok = false; break; }
        }
        if (ok) return { x, z, tx: cx + cos * (r + 5), tz: cz + sin * (r + 5) };
      }
    }
    return { x: cx, z: cz, tx: cx, tz: cz };
  }
  _buildMesh() {
    const seg = 190;
    const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const posA = geo.attributes.position;
    const colors = new Float32Array(posA.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < posA.count; i++) {
      const x = posA.getX(i), z = posA.getZ(i);
      const h = this._h(x, z);
      posA.setY(i, h);
      const nz = fbm(x * 0.05 + 99, z * 0.05, 3);
      if (h < -1.5) c.setHex(0x4a4438);
      else if (h < -0.5) c.setHex(0x6a5f4a);
      else if (h < 0.55) c.setHex(0xc2b28a);
      else if (h < 1.4) c.setHex(0x9aa06a);
      else c.setHex(nz > 0.55 ? 0x5f8044 : 0x4e6e3a);
      if (h > 4.4) c.lerp(new THREE.Color(0x8a8a82), 0.5);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }
  _inClearZone(x, z, margin = 0) {
    return this.clearZones.some((zone) => Math.hypot(x - zone.x, z - zone.z) < zone.r + margin);
  }
  _buildVegetation() {
    const reedGeo = new THREE.ConeGeometry(0.16, 2.6, 4, 1, true);
    const reedMat = new THREE.MeshStandardMaterial({ color: 0x7a8a4e, roughness: 1, flatShading: true });
    const reeds = [];
    for (let i = 0; i < 2600; i++) {
      const x = rand(-265, 265), z = rand(-265, 265);
      const h = this._h(x, z);
      if (h > -0.7 && h < 0.5 && this.isWaterNear(x, z)) reeds.push([x, Math.max(h, -0.6), z]);
    }
    const reedMesh = new THREE.InstancedMesh(reedGeo, reedMat, reeds.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    reeds.forEach(([x, y, z], i) => {
      p.set(x, y + 1.2, z);
      q.setFromEuler(new THREE.Euler(rand(-0.16, 0.16), rand(0, 6.28), rand(-0.16, 0.16)));
      const sc = rand(0.7, 1.4); s.set(sc, sc, sc);
      m.compose(p, q, s);
      reedMesh.setMatrixAt(i, m);
    });
    this.scene.add(reedMesh);

    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.3, 2.4, 5);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 1, flatShading: true });
    const crownGeo = new THREE.ConeGeometry(2.2, 5.2, 6);
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x35502e, roughness: 1, flatShading: true });
    const trees = [];
    for (let i = 0; i < 900; i++) {
      const x = rand(-265, 265), z = rand(-265, 265);
      if (this._h(x, z) > 1.6 && fbm(x * 0.03 + 5, z * 0.03, 3) > 0.55 && !this._inClearZone(x, z)) trees.push([x, this._h(x, z), z]);
      if (trees.length >= 130) break;
    }
    const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, trees.length);
    const crownMesh = new THREE.InstancedMesh(crownGeo, crownMat, trees.length);
    trunkMesh.castShadow = crownMesh.castShadow = true;
    trees.forEach(([x, y, z], i) => {
      const sc = rand(0.8, 1.8);
      this.treeColliders.push({
        x, y, z, scale: sc,
        trunkTop: y + 2.4 * sc,
        trunkRadius: 0.3 * sc,
        crownBottom: y + 1.8 * sc,
        crownTop: y + 7 * sc,
        crownRadius: 2.2 * sc,
      });
      p.set(x, y + 1.2 * sc, z); q.identity(); s.set(sc, sc, sc);
      m.compose(p, q, s); trunkMesh.setMatrixAt(i, m);
      p.set(x, y + (2.4 + 2.0) * sc, z);
      m.compose(p, q, s); crownMesh.setMatrixAt(i, m);
    });
    this.scene.add(trunkMesh, crownMesh);

    const rockGeo = new THREE.DodecahedronGeometry(0.7, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a8a85, roughness: 1, flatShading: true });
    const rocks = [];
    for (let i = 0; i < 600; i++) {
      const x = rand(-265, 265), z = rand(-265, 265);
      const h = this._h(x, z);
      if (h > -0.3 && h < 0.9 && !this._inClearZone(x, z, -5.5)) rocks.push([x, h, z]);
      if (rocks.length >= 90) break;
    }
    const rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, rocks.length);
    rocks.forEach(([x, y, z], i) => {
      p.set(x, y + 0.15, z);
      q.setFromEuler(new THREE.Euler(rand(0, 3), rand(0, 3), rand(0, 3)));
      const sc = rand(0.4, 1.3); s.set(sc, sc * 0.7, sc);
      m.compose(p, q, s);
      rockMesh.setMatrixAt(i, m);
    });
    this.scene.add(rockMesh);
  }
  // 第三人称相机杆从人物头部向后采样，返回不穿地形/树干/树冠的最近安全比例
  cameraClipFraction(from, to, padding = 0.28) {
    const steps = 24;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t;
      const z = from.z + (to.z - from.z) * t;
      if (y < this._h(x, z) + padding) return Math.max(0.22, t - 0.08);
      for (const tree of this.treeColliders) {
        const dx = x - tree.x, dz = z - tree.z;
        const d2 = dx * dx + dz * dz;
        if (d2 > (tree.crownRadius + padding) ** 2) continue;
        if (y >= tree.y && y <= tree.trunkTop + padding && d2 < (tree.trunkRadius + padding) ** 2) return Math.max(0.22, t - 0.08);
        if (y >= tree.crownBottom - padding && y <= tree.crownTop + padding) {
          const k = Math.max(0, Math.min(1, (y - tree.crownBottom) / (tree.crownTop - tree.crownBottom)));
          const r = tree.crownRadius * (1 - k) + padding;
          if (d2 < r * r) return Math.max(0.22, t - 0.08);
        }
      }
    }
    return 1;
  }
  isWaterNear(x, z) {
    return this.isWater(x + 1.5, z) || this.isWater(x - 1.5, z) || this.isWater(x, z + 1.5) || this.isWater(x, z - 1.5);
  }
}
