// 程序化低多边形鱼：按体型原型生成，顶点着色 + 顶点着色器摆尾
import * as THREE from '../lib/three.module.js';

// 体型原型：H 体高/体长, W 体宽/体长, dorsal 背鳍高, tail 尾鳍长, snout 吻部拉伸, headBig 头部放大
export const BODY_PRESETS = {
  carp:       { H: 0.30, W: 0.16, dorsal: 0.55, dorsalLen: 0.3, tail: 0.22 },
  crucian:    { H: 0.38, W: 0.20, dorsal: 0.62, dorsalLen: 0.28, tail: 0.20 },
  predator:   { H: 0.22, W: 0.12, dorsal: 0.35, dorsalLen: 0.18, tail: 0.24, snout: 1.12 },
  bream:      { H: 0.44, W: 0.18, dorsal: 0.65, dorsalLen: 0.3, tail: 0.18 },
  minnow:     { H: 0.20, W: 0.10, dorsal: 0.32, dorsalLen: 0.16, tail: 0.22 },
  bitterling: { H: 0.36, W: 0.15, dorsal: 0.58, dorsalLen: 0.25, tail: 0.18 },
  gudgeon:    { H: 0.22, W: 0.12, dorsal: 0.38, dorsalLen: 0.2, tail: 0.20 },
  bronze:     { H: 0.24, W: 0.15, dorsal: 0.38, dorsalLen: 0.2, tail: 0.20, snout: 1.1 },
  loach:      { H: 0.13, W: 0.09, dorsal: 0.22, dorsalLen: 0.55, tail: 0.15 },
  catfish:    { H: 0.20, W: 0.18, dorsal: 0.20, dorsalLen: 0.12, tail: 0.26, snout: 1.05, headBig: 1.3 },
  mandarin:   { H: 0.36, W: 0.20, dorsal: 0.85, dorsalLen: 0.42, tail: 0.22 },
  snakehead:  { H: 0.19, W: 0.13, dorsal: 0.50, dorsalLen: 0.6, tail: 0.24, snout: 1.05 },
  goby:       { H: 0.26, W: 0.16, dorsal: 0.38, dorsalLen: 0.22, tail: 0.18, headBig: 1.25 },
  eel:        { H: 0.09, W: 0.06, dorsal: 0.28, dorsalLen: 0.8, tail: 0.06 },
  puffer:     { H: 0.55, W: 0.42, dorsal: 0.12, dorsalLen: 0.1, tail: 0.15, snout: 0.65 },
  silver:     { H: 0.12, W: 0.06, dorsal: 0.12, dorsalLen: 0.1, tail: 0.16 },
  sturgeon:   { H: 0.20, W: 0.14, dorsal: 0.28, dorsalLen: 0.15, tail: 0.30, snout: 1.3 },
  knife:      { H: 0.15, W: 0.06, dorsal: 0.10, dorsalLen: 0.2, tail: 0.22, snout: 0.85 },
};

// 摆尾参数（频率/幅度）按体型微调
const SWIM = {
  loach: [9, 0.16], eel: [8, 0.2], knife: [10, 0.14], silver: [13, 0.08],
  catfish: [5, 0.1], puffer: [6, 0.05], sturgeon: [3.5, 0.06], default: [6.5, 0.1],
};

const geoCache = new Map();
const matCache = new Map();
const shaderRegistry = []; // 所有已编译摆尾材质，供统一推进 uTime

function bodyProfile(t) { // t: 0 尾 → 1 头
  return Math.pow(Math.max(Math.sin(Math.PI * Math.pow(t, 0.62)), 0), 0.82);
}

function buildGeometry(sp) {
  const P = BODY_PRESETS[sp.body] || BODY_PRESETS.carp;
  const N = 14, R = 10;
  const pos = [], col = [];
  const cBack = new THREE.Color(sp.col.back), cBelly = new THREE.Color(sp.col.belly), cFin = new THREE.Color(sp.col.fin);
  const snout = P.snout || 1;
  const hash = (x, y) => { const n = Math.sin(x * 91.7 + y * 47.3) * 43758.5; return n - Math.floor(n); };

  const pushVert = (x, y, z, c) => { pos.push(x, y, z); col.push(c.r, c.g, c.b); };

  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const prof = bodyProfile(t);
    let h = P.H * prof, w = P.W * Math.pow(prof, 1.15);
    if (P.headBig) { const hb = 1 + (P.headBig - 1) * Math.min(1, Math.max(0, (t - 0.6) / 0.4)); h *= hb; w *= hb; }
    // 吻部拉伸：头部 x 前移
    const x = -0.5 + t + (t > 0.8 ? (t - 0.8) * 1.25 * (snout - 1) : 0) * 0.5;
    for (let j = 0; j <= R; j++) {
      const a = (j / R) * Math.PI * 2;
      const sy = Math.sin(a), cz = Math.cos(a);
      const px = x, py = h * 0.5 * sy, pz = w * 0.5 * cz;
      // 背深腹浅
      let c = cBelly.clone().lerp(cBack, THREE.MathUtils.smoothstep(sy, -0.55, 0.55));
      // 花纹
      if (sp.pattern === 'stripes' && sy > 0.05 && Math.sin(t * Math.PI * 8) > 0.35) c.multiplyScalar(0.7);
      if (sp.pattern === 'spots' && sy > 0.05 && hash(Math.floor(t * 26), Math.floor(j / 2)) > 0.72) c.multiplyScalar(0.66);
      if (sp.pattern === 'scaleGrid' && sy > 0 && (Math.floor(t * 22) + Math.floor(j / 2)) % 2 === 0) c.multiplyScalar(0.9);
      // 婚姻色/艳丽种的体侧虹彩
      if (sp.colorFancy && Math.abs(sy) < 0.45 && t > 0.3) c.lerp(cFin, 0.3);
      pushVert(px, py, pz, c);
    }
  }
  const idx = [];
  for (let i = 0; i < N - 1; i++) {
    for (let j = 0; j < R; j++) {
      const a = i * (R + 1) + j, b = a + R + 1;
      idx.push(a, b, b + 1, a, b + 1, a + 1);
    }
  }
  const tri = (p1, p2, p3, c, alpha = 1) => {
    const base = pos.length / 3;
    const cc = c.clone().multiplyScalar(alpha);
    pushVert(...p1, cc); pushVert(...p2, cc); pushVert(...p3, cc);
    idx.push(base, base + 1, base + 2);
  };
  const hAt = (t) => P.H * bodyProfile(t) * (P.headBig && t > 0.6 ? P.headBig : 1);
  const xAt = (t) => -0.5 + t + (t > 0.8 ? (t - 0.8) * 1.25 * ((P.snout || 1) - 1) : 0) * 0.5;

  // 尾鳍（叉形）
  const tx = xAt(0), th = hAt(0);
  const fc = cFin;
  tri([tx + 0.04, th * 0.5, 0], [tx - P.tail, th * 1.35, 0], [tx - P.tail * 0.62, 0, 0], fc, 1);
  tri([tx + 0.04, -th * 0.5, 0], [tx - P.tail, -th * 1.05, 0], [tx - P.tail * 0.62, 0, 0], fc, 1);
  // 背鳍
  if (P.dorsal > 0.15) {
    const x0 = xAt(0.62), x1 = xAt(0.62 + P.dorsalLen);
    const steps = 4;
    for (let s = 0; s < steps; s++) {
      const ta = 0.62 + P.dorsalLen * (s / steps), tb = 0.62 + P.dorsalLen * ((s + 1) / steps);
      const ha = hAt(ta) * 0.5, hb = hAt(tb) * 0.5;
      const dh = P.dorsal * (1 - s / steps) * P.H;
      tri([xAt(ta), ha, 0], [xAt(ta), ha + dh, 0], [xAt(tb), hb, 0], fc, 0.95);
      tri([xAt(ta), ha + dh, 0], [xAt(tb), hb + P.dorsal * (1 - (s + 1) / steps) * P.H, 0], [xAt(tb), hb, 0], fc, 0.95);
    }
  }
  // 臀鳍
  { const x0 = xAt(0.18); tri([x0, -hAt(0.18) * 0.5, 0], [xAt(0.08), -hAt(0.18) * 0.5 - P.H * 0.3, 0], [xAt(0.08), -hAt(0.08) * 0.5, 0], fc, 0.9); }
  // 胸鳍一对
  { const t = 0.68, x = xAt(t), hh = hAt(t) * 0.5, ww = P.W * bodyProfile(t) * 0.5;
    for (const s of [1, -1]) {
      tri([x, -hh * 0.3, s * ww], [x - P.tail * 0.9, -hh * 0.75, s * (ww + P.H * 0.55)], [x - P.tail * 1.1, -hh * 0.55, s * ww * 0.8], fc, 0.85);
    } }
  // 须（黄颡/鲶/叉尾鮰）
  if (sp.whiskers) {
    const t = 0.97, x = xAt(t), hh = hAt(t) * 0.5, ww = P.W * bodyProfile(t) * 0.5;
    for (const s of [1, -1]) {
      tri([x, hh * 0.3, s * ww], [x - 0.34, -hh * 0.9, s * (ww + 0.03)], [x - 0.3, -hh * 0.75, s * ww], cFin, 0.6);
      tri([x, -hh * 0.4, s * ww], [x - 0.22, -hh * 1.1, s * ww], [x - 0.2, -hh * 0.7, s * (ww + 0.03)], cFin, 0.6);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function getGeometry(sp) {
  if (!geoCache.has(sp.id)) geoCache.set(sp.id, buildGeometry(sp));
  return geoCache.get(sp.id);
}

function getMaterial(sp) {
  if (matCache.has(sp.id)) return matCache.get(sp.id);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.25, flatShading: true });
  const [freq, amp] = SWIM[sp.body] || SWIM.default;
  mat.userData.fishFreq = freq; mat.userData.fishAmp = amp;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = { value: 0 };
    sh.uniforms.uAmp = { value: amp };
    sh.uniforms.uFreq = { value: freq };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime; uniform float uAmp; uniform float uFreq;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float bd = clamp(0.5 - position.x, 0.0, 1.0);
        float phase = uTime * uFreq + (1.0 - bd) * 2.4;
        transformed.z += sin(phase) * uAmp * bd * bd;`);
    mat.userData.shader = sh;
    shaderRegistry.push(sh);
  };
  matCache.set(sp.id, mat);
  return mat;
}

// 每帧推进所有鱼材质的摆尾时间
export function tickFishShaders(t) {
  for (const sh of shaderRegistry) if (sh.uniforms.uTime) sh.uniforms.uTime.value = t;
}

// 生成一条鱼的世界视图（group 缩放到实际体长）
export function buildFishView(sp, lenCm) {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(getGeometry(sp), getMaterial(sp));
  mesh.castShadow = false;
  group.add(mesh);
  // 眼睛
  const eyeG = new THREE.SphereGeometry(0.022, 6, 5);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x101418 });
  const P = BODY_PRESETS[sp.body] || BODY_PRESETS.carp;
  const wAt = P.W * bodyProfile(0.88) * 0.5, hAt2 = P.H * bodyProfile(0.88) * 0.5;
  for (const s of [1, -1]) {
    const eye = new THREE.Mesh(eyeG, eyeM);
    eye.position.set(xAtP(P, 0.88), hAt2 * 0.25, s * wAt * 0.92);
    group.add(eye);
  }
  group.scale.setScalar(lenCm / 100);
  return group;
}
function xAtP(P, t) { return -0.5 + t + (t > 0.8 ? (t - 0.8) * 1.25 * ((P.snout || 1) - 1) : 0) * 0.5; }

// 卡面快照：独立小渲染器把鱼渲染成图片
export class FishSnapshot {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setSize(320, 400);
    this.scene = new THREE.Scene();
    const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(2, 3, 2); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x9ec8e8, 1.1); rim.position.set(-2.5, 0.5, -2); this.scene.add(rim);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    this.cam = new THREE.PerspectiveCamera(30, 320 / 400, 0.01, 20);
    this.cam.position.set(1.62, 0.62, 1.5);
    this.cam.lookAt(0.05, 0, 0);
    this.cache = new Map();
  }
  capture(sp) {
    if (this.cache.has(sp.id)) return this.cache.get(sp.id);
    const holder = new THREE.Group();
    const mesh = new THREE.Mesh(getGeometry(sp), getMaterial(sp));
    holder.add(mesh);
    holder.rotation.y = -0.62;
    holder.rotation.z = 0.06;
    this.scene.add(holder);
    this.renderer.render(this.scene, this.cam);
    const url = this.renderer.domElement.toDataURL('image/png');
    this.scene.remove(holder);
    this.cache.set(sp.id, url);
    return url;
  }
}
