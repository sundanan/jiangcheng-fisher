// 装备与消耗品数据

export const RODS = [ // 台钓竿（len=竿长，配齐竿线 len+0.4m，最远抛距≈竿+线）
  { id: 0, name: '竹木台钓竿 5.4米', len: 5.4, power: 1.0,  price: 0,    desc: '5.4 米经典长度，配齐竿线 5.8 米' },
  { id: 1, name: '玻璃钢竿 5.7米',   len: 5.7, power: 1.1,  price: 300,  desc: '5.7 米，皮实耐造，平民神器' },
  { id: 2, name: '碳素综合竿 6.3米', len: 6.3, power: 1.25, price: 900,  desc: '6.3 米，轻挺顺手，大小通杀' },
  { id: 3, name: '大物鲤竿 7.2米',   len: 7.2, power: 1.45, price: 2500, desc: '7.2 米长节竿，腰力浑厚' },
  { id: 4, name: '竞技黑拉竿 8.1米', len: 8.1, power: 1.6,  price: 6000, desc: '8.1 米，飞磕神器，指哪打哪' },
];
export const LURE_RODS = [ // 路亚竿（短竿+线杯，抛距受竿调性与线杯共同限制）
  { id: 0, name: '直柄竿 1.98米', len: 1.98, cast: 20, power: 1.0,  price: 0,    desc: '1.98 米入门套装，配 30 米线杯' },
  { id: 1, name: 'M调 2.08米',    len: 2.08, cast: 28, power: 1.15, price: 400,  desc: '2.08 米泛用调性，手感清晰' },
  { id: 2, name: 'MH调 2.24米',   len: 2.24, cast: 36, power: 1.3,  price: 1200, desc: '2.24 米，硬挺有力，巨物不怕' },
  { id: 3, name: '雷强H 2.4米',   len: 2.4,  cast: 44, power: 1.5,  price: 3000, desc: '2.4 米重雷竿，把黑鱼拔出草洞' },
  { id: 4, name: '远投XXH 2.7米', len: 2.7,  cast: 55, power: 1.65, price: 6800, desc: '2.7 米远投杆，把饵打进鱼群正中间' },
];
export const LINES = [ // len=线杯缠线长度（路亚抛距受其限制；台钓用齐竿线不受此限制）
  { id: 0, name: '普通尼龙线', strength: 2.4, len: 30,  price: 0,    desc: '30 米线杯 · 2.4kg 拉力' },
  { id: 1, name: '加强尼龙线', strength: 4.0, len: 60,  price: 200,  desc: '60 米线杯 · 4.0kg 拉力' },
  { id: 2, name: '高碳氟线',   strength: 6.2, len: 100, price: 600,  desc: '100 米线杯 · 6.2kg 拉力，隐形于水' },
  { id: 3, name: 'PE编织线',   strength: 9.5, len: 150, price: 1800, desc: '150 米线杯 · 9.5kg 拉力，大物终结者' },
];
export const REELS = [
  { id: 0, name: '简易轮',     reel: 0.9, price: 0,    desc: '收线 0.9m/s' },
  { id: 1, name: '旋压轮',     reel: 1.2, price: 350,  desc: '收线 1.2m/s' },
  { id: 2, name: '精密卸力轮', reel: 1.6, price: 1000, desc: '收线 1.6m/s，卸力顺滑' },
  { id: 3, name: '竞技高速轮', reel: 2.1, price: 2600, desc: '收线 2.1m/s' },
];
export const LURE_REELS = [
  { id: 0, name: '纺车轮 1000 型', reel: 1.0, price: 0,    desc: '收线 1.0m/s' },
  { id: 1, name: '纺车轮 2500 型', reel: 1.3, price: 300,  desc: '收线 1.3m/s' },
  { id: 2, name: '水滴轮',         reel: 1.7, price: 900,  desc: '收线 1.7m/s，抛投精准' },
  { id: 3, name: '远投轮',         reel: 2.2, price: 2400, desc: '收线 2.2m/s' },
];
export const FLOATS = [
  { id: 0, name: '普通塑料漂', sens: 1.0,  price: 0,   desc: '信号清晰度 100%' },
  { id: 1, name: '纳米漂',     sens: 1.15, price: 150, desc: '信号清晰度 115%' },
  { id: 2, name: '芦苇竞技漂', sens: 1.32, price: 500, desc: '信号清晰度 132%，口口分明' },
];

export const BAITS = [
  { id: 'worm',      name: '蚯蚓', price: 20, desc: '万能饵，黄颡鲶鱼黄鳝的最爱' },
  { id: 'bloodworm', name: '红虫', price: 30, desc: '冬春利器，小鱼也馋' },
  { id: 'corn',      name: '玉米', price: 15, desc: '大物素饵，鲤草鳊通吃' },
  { id: 'wheat',     name: '麦粒', price: 15, desc: '鲴类和鳊鲂的心头好' },
  { id: 'pellet',    name: '商品饵', price: 25, desc: '广谱型，什么鱼都想尝尝' },
  { id: 'paste',     name: '拉饵(雾化)', price: 40, desc: '雾化诱鱼，鲢鳙专用思路' },
];

export const LURES = [
  { id: 'minnow', name: '米诺',       price: 180, depth: 1, desc: '模仿受伤小鱼，匀速收线，翘嘴鳡鱼杀手' },
  { id: 'spoon',  name: '亮片',       price: 80,  depth: 2, desc: '旋转反光，泛用型拟饵，新手首选' },
  { id: 'vib',    name: 'VIB',        price: 260, depth: 2, desc: '震动感强烈，深水搜索神器' },
  { id: 'texas',  name: '德州软虫',   price: 220, depth: 3, desc: '贴底慢跳，鳜鱼鲶鱼克星' },
  { id: 'frog',   name: '雷蛙',       price: 300, depth: 0, desc: '水面系，草洞打黑利器' },
  { id: 'jig',    name: '小铁板',     price: 340, depth: 2, desc: '远投深水，全层搜索' },
  { id: 'micro',  name: '微物亮片',   price: 120, depth: 1, desc: '马口白条小鲌通杀' },
];

export const CHUM = { name: '窝料', price: 40, duration: 150, radius: 8 };

// 出售价格：稀有度 × 体重共同决定，大个体额外加成
export function sellPrice(sp, weight, pct) {
  const base = Math.pow(2, sp.rarity) * 2.2 * Math.pow(Math.max(weight, 0.01), 1.05) + sp.rarity * 10;
  return Math.round(base * (pct >= 0.9 ? 1.3 : 1));
}
// 装备分（稀有鱼的上鱼门槛）
export function gearScore(equipped, rodList) {
  return rodList[equipped.rod !== undefined ? equipped.rod : 0].id + equipped.line * 1.5 + equipped.reel;
}
export function rarityGate(rarity, score) {
  if (rarity >= 5) return score >= 7;
  if (rarity >= 4) return score >= 5;
  return true;
}
