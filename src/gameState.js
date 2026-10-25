// 存档与玩家资产（localStorage）
const SAVE_KEY = 'jiangcheng_diaoke_v1';

export class GameState {
  constructor() {
    this.data = this._fresh();
    this.hasSave = !!localStorage.getItem(SAVE_KEY);
  }
  _fresh() {
    return {
      ver: 1,
      money: 300,
      // 装备：index 表示档位（tackleData 里的序号）
      equipped: { rod: 0, lureRod: 0, line: 0, reel: 0, lureReel: 0, float: 0, lure: 'spoon', bait: 'worm' },
      owned: {
        rods: [0], lureRods: [0], lines: [0], reels: [0], lureReels: [0], floats: [0],
        lures: ['spoon'],
      },
      baits: { worm: 10, pellet: 10 },
      chum: 2,
      shards: 0,               // 鱼珠（分解卡牌所得，用于合成升卡）
      // 图鉴 dex[speciesId] = {n, bw(最大重), bl(最大长), bm(钓法), at(时间戳)}
      dex: {},
      // 卡册 album[speciesId] = {g(品质1-4), w, l, m, d, big(巨物)}
      album: {},
      achv: [],                // 已达成成就 id
      groupsClaimed: [],
      stats: { catches: 0, released: 0, monsters: 0, earned: 0, snapped: 0, misses: 0 },
    };
  }
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        this.data = Object.assign(this._fresh(), JSON.parse(raw));
        // 旧档卡牌品质（1-5）压缩到四档
        for (const k of Object.keys(this.data.album)) {
          const a = this.data.album[k];
          if (a.g > 4) a.g = 4;
        }
      }
    } catch (e) { console.warn('存档损坏，重新开始', e); }
  }
  save() { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); }

  get money() { return this.data.money; }
  canAfford(p) { return this.data.money >= p; }
  spend(p) {
    if (!this.canAfford(p)) return false;
    this.data.money -= p; this.save(); return true;
  }
  earn(m) { this.data.money += m; this.data.stats.earned += m; this.save(); }

  equip(kind, val) { this.data.equipped[kind] = val; this.save(); }
  own(kindArr, idx) { return this.data.owned[kindArr].includes(idx); }
  buyGear(kindArr, idx) {
    this.data.owned[kindArr].push(idx);
    this.data.owned[kindArr].sort((a, b) => a - b);
    this.save();
  }
  addBait(id, n) {
    this.data.baits[id] = (this.data.baits[id] || 0) + n;
    if (this.data.baits[id] <= 0) delete this.data.baits[id];
    this.save();
  }
  consumeBait(id) {
    if (!this.data.baits[id]) return false;
    this.addBait(id, -1);
    return true;
  }
  addChum(n) { this.data.chum += n; this.save(); }
  get shards() { return this.data.shards; }
  addShards(n) { this.data.shards = Math.max(0, this.data.shards + n); this.save(); }
  hasAchv(id) { return this.data.achv.includes(id); }
  grantAchv(id) {
    if (!this.data.achv.includes(id)) {
      this.data.achv.push(id);
      this.save();
      return true;
    }
    return false;
  }

  // 记录一次钓获（图鉴 + 卡册由 cards.js 评分后调用）
  recordCatch(sp, weight, length, method) {
    const d = this.data.dex;
    const prev = d[sp.id];
    const first = !prev;
    const record = !prev || weight > prev.bw;
    if (!prev) d[sp.id] = { n: 1, bw: weight, bl: length, bm: method, at: Date.now() };
    else {
      prev.n++;
      if (weight > prev.bw) { prev.bw = weight; prev.bl = length; prev.bm = method; }
    }
    this.data.stats.catches++;
    this.save();
    return { first, record };
  }
  setAlbum(spId, card) {
    const cur = this.data.album[spId];
    if (!cur || card.g > cur.g || (card.g === cur.g && card.w > cur.w)) {
      this.data.album[spId] = card;
      this.save();
    }
  }
  claimGroup(gid) {
    if (!this.data.groupsClaimed.includes(gid)) {
      this.data.groupsClaimed.push(gid);
      this.save();
    }
  }
}
