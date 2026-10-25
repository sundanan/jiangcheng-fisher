// 集卡系统：个体评分、四档卡牌（白/蓝/紫/橙）、分解与合成
import { RARITY } from './fishData.js?v=16';
import { FishSnapshot } from './fish.js?v=16';
import { sellPrice } from './tackleData.js?v=16';
import { lerp, clamp } from './util.js?v=16';

export const GRADES = [
  null,
  { name: '普通', color: '#e8ecf0', bg: 'linear-gradient(160deg,#3a4148,#23282e)' },   // 白卡
  { name: '稀有', color: '#4d9de0', bg: 'linear-gradient(160deg,#24405e,#152741)' },   // 蓝卡
  { name: '史诗', color: '#b06ae0', bg: 'linear-gradient(160deg,#45285e,#2a1a3d)' },   // 紫卡
  { name: '传说', color: '#e8a838', bg: 'linear-gradient(160deg,#5e4418,#3d2c0e)' },   // 橙卡
];
// 分解所得 / 升级花费（鱼珠）
export const SALVAGE = [0, 1, 3, 8, 20];
export const UPGRADE_COST = [0, 5, 12, 30];

// 体长-体重换算系数：体长(cm) = K × 体重(kg)^(1/3)，按体型原型标定
export const BODY_K = {
  carp: 36, crucian: 32, predator: 34, bream: 38, minnow: 34, bitterling: 36,
  gudgeon: 34, bronze: 34, loach: 42, catfish: 36, mandarin: 38, snakehead: 36,
  eel: 62, puffer: 42, silver: 60, sturgeon: 46, knife: 55,
};

export class Cards {
  constructor() {
    this.snap = new FishSnapshot();
  }
  // 抽取一个个体：先抽体重（偏小分布），体长按异速生长公式换算
  rollIndividual(sp) {
    const pct = Math.pow(Math.random(), 2.2);
    const weight = lerp(sp.w[0], sp.w[1], pct);
    const K = BODY_K[sp.body] || 34;
    const len = clamp(K * Math.cbrt(weight), sp.len * 0.3, sp.len);
    return { sp, weight, len, pct };
  }
  // 四档评级按固定概率：1% 橙 / 5% 紫 / 30% 蓝 / 其余白 —— 同一种鱼四色卡都可能出
  gradeOf(sp, pct, release = false) {
    if (release && sp.prot) return 4; // 放流纪念卡 = 传说橙卡
    const r = Math.random();
    if (r < 0.01) return 4;
    if (r < 0.06) return 3;
    if (r < 0.36) return 2;
    return 1;
  }
  isBig(pct) { return pct >= 0.95; }
  valueOf(sp, weight, pct, release = false) {
    if (release && sp.prot) return sp.id === 'zhonghuaxun' ? 3000 : 300;
    return sellPrice(sp, weight, pct);
  }
  imageOf(sp) { return this.snap.capture(sp); }
}
