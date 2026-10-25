// 钓点系统：参考武汉真实水系划分（长江武汉段、汉江口、梁子湖、东湖、汤逊湖、后官湖、府河湿地）
// weights: { speciesId: 上鱼概率倍率 }，default 为未列出鱼种的兜底倍率
export const SPOTS = [
  {
    id: 'liangzi', name: '梁子湖', icon: '🐟', zone: 'lake',
    cx: 186, cz: 122, r: 75, lng: 114.59, lat: 30.36,
    desc: '武昌鱼的正宗原产地（江夏大水面），鳜鱼青鱼藏深潭，秋钓黄金位。',
    weights: { wuchang: 4, guiyu: 2.5, qingyu: 2.5, gan: 2, sanjiao: 2, changchunbian: 1.5, dayan: 1.5, default: 0.6 },
    tip: '玉米/麦粒钓底鳊鲂，德州软虫跳底鳜鱼',
  },
  {
    id: 'donghu', name: '东湖', icon: '🌳', zone: 'lake',
    cx: 63, cz: 25, r: 46, lng: 114.39, lat: 30.55,
    desc: '城中名湖，磨山脚下听涛岸边。翘嘴炸水、鲫鲤成群，新手友好。',
    weights: { qiaozui: 2, ji: 1.6, li: 1.6, wuchang: 1.5, guiyu: 1.5, wuqie: 1.3, caoyu: 1.2, default: 0.7 },
    tip: '蚯蚓钓鲫起步，米诺快收搜翘嘴',
  },
  {
    id: 'tangxun', name: '汤逊湖', icon: '🏘️', zone: 'lake',
    cx: 60, cz: 105, r: 48, lng: 114.36, lat: 30.42,
    desc: '江夏城中大湖，鱼肥水阔，鲫鲤鳊管够，傍晚大弯子出翘嘴。',
    weights: { ji: 2, li: 2, wuchang: 1.5, qiaozui: 1.5, caoyu: 1.5, huangsang: 1.3, yong: 1.2, default: 0.7 },
    tip: '打窝守鲤鲫，亮片米诺傍晚翘嘴',
  },
  {
    id: 'houguan', name: '后官湖', icon: '🦆', zone: 'lake',
    cx: -179, cz: 38, r: 60, lng: 114.02, lat: 30.49,
    desc: '蔡甸湖畔湿地，水草密、障碍多——鳜鱼黑鱼的家园。',
    weights: { guiyu: 2, wuqie: 2, ji: 1.5, huangsang: 1.6, bangui: 1.5, tunian: 1.3, jiazhou: 1.2, default: 0.6 },
    tip: '雷蛙打草洞黑鱼，德州跳底鳜鱼',
  },
  {
    id: 'fuhhe', name: '府河湿地', icon: '🌿', zone: 'lake',
    cx: -112, cz: -70, r: 38, lng: 114.14, lat: 30.66,
    desc: '东西湖府河浅滩，芦苇荡里黄颡成群，夏夜黄鳝泥鳅的天下。',
    weights: { huangsang: 2.5, wuqie: 2, ji: 2, niqiu: 1.6, huangshan: 1.6, zhonghuapangpi: 2, gaotipangpi: 1.6, daoqi: 1.4, default: 0.5 },
    tip: '夜钓挂蚯蚓守黄颡，浅滩拖雷蛙',
  },
  {
    id: 'hanjiangkou', name: '汉江口', icon: '⚖️', zone: 'river',
    cx: -21, cz: -7, r: 24, lng: 114.27, lat: 30.56,
    desc: '汉江入长江的交汇口（龙王庙），流水铧尖。江团（长吻鮠）的招牌钓场，洄游鱼必经之路。',
    weights: { jiangtuan: 3, gan: 2, daoyu: 2, qiaozui: 1.5, manli: 1.5, bangui: 1.3, washi: 1.4, tongyu: 1.3, default: 0.4 },
    tip: '夜钓蚯蚓底守江团，洄游季（春）守刀鱼',
  },
  {
    id: 'qingshan', name: '青山江段', icon: '🏗️', zone: 'river',
    cx: 63, cz: -51, r: 24, lng: 114.39, lat: 30.64,
    desc: '长江武汉段北岸（青山江滩），码头石堆下藏着铜鱼和大口鲶，水流湍急出大家伙。',
    weights: { tongyu: 2.5, qiaozui: 2, gan: 2, jiangtuan: 2, dakounian: 1.6, washi: 1.8, sheju: 1.5, niqiu: 1.4, default: 0.4 },
    tip: '重坠挂蚯蚓守铜鱼鲶鱼，铁板搜鳡鱼',
  },
  {
    id: 'hanyang', name: '汉阳江段', icon: '🌉', zone: 'river',
    cx: -28, cz: 19, r: 24, lng: 114.26, lat: 30.52,
    desc: '长江大桥上下游（汉阳江滩），回水湾缓流区。夜钓鲶鱼黄颡的老码头。',
    weights: { dakounian: 2, tunian: 1.6, huangsang: 1.5, gan: 1.5, qiaozui: 1.5, li: 1.4, washi: 1.4, daoyu: 1.2, default: 0.4 },
    tip: '夜钓大饵守鲶，白天亮片翘嘴',
  },
];

// 落点 → 钓点（小圆优先匹配；未命中返回 null = 野生水域，用默认分布）
export function spotAt(x, z) {
  let best = null, bestScore = 1e9;
  for (const s of SPOTS) {
    const d = Math.hypot(x - s.cx, z - s.cz);
    if (d <= s.r) {
      const score = d / s.r;
      if (score < bestScore) { best = s; bestScore = score; }
    }
  }
  return best;
}
// 上鱼概率倍率
export function spotFactor(sp, spot) {
  if (!spot) return 1;
  return spot.weights[sp.id] ?? spot.weights.default ?? 0.6;
}
// 找钓点圆内的岸边站立点（略高于水面、邻近深水）
export function shorePointFor(spot, terrain) {
  let best = null, bestScore = -1e9;
  for (let i = 0; i < 400; i++) {
    const a = (i / 400) * Math.PI * 2 + i * 0.618;
    const rr = Math.sqrt((i % 100) / 100) * spot.r * 0.95;
    const x = spot.cx + Math.cos(a) * rr, z = spot.cz + Math.sin(a) * rr;
    const h = terrain.heightAt(x, z);
    if (h > 0.38 && h < 3.5) {
      // 面向圆心方向的水越深越好
      const depth = terrain.depthAt(spot.cx, spot.cz);
      const score = depth - h * 0.3 - Math.hypot(x - spot.cx, z - spot.cz) * 0.01;
      if (score > bestScore) { bestScore = score; best = { x, z, y: h }; }
    }
  }
  return best || { x: spot.cx + spot.r * 0.9, z: spot.cz, y: terrain.heightAt(spot.cx + spot.r * 0.9, spot.cz) || 1 };
}
// 世界坐标 → 地图 SVG 坐标
export function worldToMap(x, z, W = 900, H = 560) {
  return { mx: (x + 230) / 460 * W, my: (z + 230) / 460 * H };
}
