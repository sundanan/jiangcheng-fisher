// 通用数学/工具函数
export const TAU = Math.PI * 2;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// 确定性值噪声
function hash2(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
export function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, oct = 4) {
  let v = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) {
    v += amp * vnoise(x * f, y * f);
    f *= 2.03; amp *= 0.5;
  }
  return v; // 约 0..1
}

// 波浪高度函数（水面着色器与 JS 侧共用同一套常数，保证漂随波起伏）
export function waveY(x, z, t, amp) {
  return amp * (Math.sin(x * 0.5 + t * 1.3) + Math.sin(z * 0.4 + t * 1.05) + Math.sin((x + z) * 0.23 + t * 0.7)) / 3;
}

export const fmtKg = (w) => (w >= 1 ? w.toFixed(2) + ' kg' : (w * 1000).toFixed(0) + ' g');
export const fmtCm = (l) => (l >= 1 ? l.toFixed(1) + ' cm' : (l * 100).toFixed(1) + ' cm');
export const fmtMoney = (m) => '¥' + Math.floor(m).toLocaleString('zh-CN');
