// 鱼种数据：参考长江中游（武汉江段及通江湖泊）真实鱼类区系整理（57 种）
// zones: lake 湖泊静水 / river 江河流水
// layer: upper 上层 / mid 中层 / bottom 下层 / benthic 底栖贴底
// hours: dawn 晨(5-8) / day 昼(8-17) / dusk 暮(17-20) / night 夜(20-5)
// baits: 台钓饵料偏好权重；lures: 路亚拟饵偏好权重（掠食鱼）

export const GROUPS = [
  { id: 'bigFour',   name: '四大家鱼',      icon: '🐋', reward: 400 },
  { id: 'crucian',   name: '鲤与鲫',        icon: '🐟', reward: 200 },
  { id: 'culter',    name: '鲌类 · 路亚明星', icon: '🦈', reward: 600 },
  { id: 'bream',     name: '鳊鲂类',        icon: '🎋', reward: 300 },
  { id: 'xu',        name: '鲴类',          icon: '🍂', reward: 300 },
  { id: 'chen',      name: '䱗条类',        icon: '✨', reward: 200 },
  { id: 'bitterling',name: '鳑鲏 · 观赏',   icon: '🌈', reward: 250 },
  { id: 'gudgeon',   name: '鮈类',          icon: '🪨', reward: 350 },
  { id: 'machako',   name: '马口与鱲',      icon: '💙', reward: 250 },
  { id: 'loach',     name: '鳅类',          icon: '🌀', reward: 300 },
  { id: 'bagrid',    name: '鲿科 · 黄颡类', icon: '🌙', reward: 350 },
  { id: 'catfish',   name: '鲶类',          icon: '🌑', reward: 300 },
  { id: 'mandarin',  name: '鳜类',          icon: '🏆', reward: 400 },
  { id: 'snakehead', name: '鳢科 · 财鱼',   icon: '🐉', reward: 300 },
  { id: 'goby',      name: '塘鳢 · 斗鱼',   icon: '🪸', reward: 250 },
  { id: 'special',   name: '特殊类',        icon: '🫧', reward: 300 },
  { id: 'migratory', name: '洄游名贵',      icon: '💠', reward: 800 },
  { id: 'protected', name: '保护与外来',    icon: '🛡️', reward: 1200 },
];

export const RARITY = [
  null,
  { name: '常见', color: '#9aa5ad', short: 'C' },
  { name: '优良', color: '#5fb85f', short: 'B' },
  { name: '稀有', color: '#4d9de0', short: 'A' },
  { name: '名贵', color: '#b06ae0', short: 'S' },
  { name: '传说', color: '#e8a838', short: 'SS' },
];

export const LAYERS = { upper: '上层', mid: '中层', bottom: '下层', benthic: '底栖' };

const D = ['dawn', 'day', 'dusk'];           // 常见昼行
const DN = ['dawn', 'dusk', 'night'];        // 晨昏夜
const ALL = ['dawn', 'day', 'dusk', 'night'];

export const SPECIES = [
  // ================= 四大家鱼 =================
  { id: 'qingyu', name: '青鱼', latin: 'Mylopharyngodon piceus', group: 'bigFour', zones: ['lake', 'river'], layer: 'bottom', hours: ['day', 'dusk'],
    baits: { corn: 1, pellet: 2, paste: 1.5 }, lures: {}, w: [1.5, 68], len: 140, power: 2.6, rarity: 2, body: 'carp',
    col: { back: 0x23313d, belly: 0xd8dde2, fin: 0x2c3e46 }, pattern: 'none',
    desc: '底层大物，爱吃螺蛳，俗称"螺蛳青"。中钩后沉猛有力，是湖区钓大物的主要目标。' },
  { id: 'caoyu', name: '草鱼', latin: 'Ctenopharyngodon idella', group: 'bigFour', zones: ['lake'], layer: 'mid', hours: D,
    baits: { corn: 3, wheat: 2, pellet: 1.5, paste: 1 }, lures: {}, w: [1, 32], len: 110, power: 2.2, rarity: 2, body: 'carp',
    col: { back: 0x4a5d33, belly: 0xe8e6d4, fin: 0x5a6b3a }, pattern: 'none', scaleGrid: true,
    desc: '典型的草食性鱼，玉米麦粒是它的最爱，冲击起来一头向外不回头。' },
  { id: 'lian', name: '鲢', latin: 'Hypophthalmichthys molitrix', group: 'bigFour', zones: ['lake', 'river'], layer: 'upper', hours: ['day'],
    baits: { paste: 3, pellet: 1.5 }, lures: {}, w: [1.5, 18], len: 105, power: 2.0, rarity: 2, body: 'carp',
    col: { back: 0x6f7d86, belly: 0xf2f5f7, fin: 0x8a97a0 }, pattern: 'none',
    desc: '滤食性上层鱼，钓鲢鳙讲究雾化，钓浮挂拉饵方有口。' },
  { id: 'yong', name: '鳙', latin: 'Aristichthys nobilis', group: 'bigFour', zones: ['lake', 'river'], layer: 'upper', hours: ['day'],
    baits: { paste: 3, pellet: 1.5 }, lures: {}, w: [2, 42], len: 115, power: 2.4, rarity: 2, body: 'carp',
    col: { back: 0x3d4550, belly: 0xe8e3d8, fin: 0x555e6a }, pattern: 'spots',
    desc: '胖头鱼，头大占体长三分之一，湖中大鳙冲劲十足。' },

  // ================= 鲤与鲫 =================
  { id: 'li', name: '鲤', latin: 'Cyprinus carpio', group: 'crucian', zones: ['lake', 'river'], layer: 'bottom', hours: DN,
    baits: { corn: 3, pellet: 2, worm: 1.5, wheat: 1.5 }, lures: {}, w: [0.8, 26], len: 100, power: 2.4, rarity: 2, body: 'carp',
    col: { back: 0x6b4a26, belly: 0xe8d9b8, fin: 0x7a5228 }, pattern: 'scaleGrid', whiskersNear: true,
    desc: '最受钓友喜爱的对象鱼之一，拱底觅食，黑漂代表它来了。' },
  { id: 'ji', name: '鲫', latin: 'Carassius auratus', group: 'crucian', zones: ['lake'], layer: 'bottom', hours: DN,
    baits: { worm: 3, bloodworm: 2.5, pellet: 2, wheat: 1.5, paste: 1.5 }, lures: {}, w: [0.04, 1.8], len: 32, power: 0.9, rarity: 1, body: 'crucian',
    col: { back: 0x707c5a, belly: 0xe6e2c8, fin: 0x8a8f60 }, pattern: 'none',
    desc: '入门第一鱼，送漂是它的招牌动作，一年四季都可钓。' },

  // ================= 鲌类 =================
  { id: 'qiaozui', name: '翘嘴鲌', latin: 'Culter alburnus', group: 'culter', zones: ['lake', 'river'], layer: 'upper', hours: ['dawn', 'day', 'dusk'],
    baits: {}, lures: { minnow: 3, vib: 2.5, jig: 2, spoon: 1.5 }, w: [0.5, 13], len: 105, power: 2.8, rarity: 3, body: 'predator',
    col: { back: 0x5b6d78, belly: 0xf5f8fa, fin: 0x9db4c0 }, pattern: 'none',
    desc: '路亚明星鱼。清晨傍晚在湾子炸水捕食小鱼，米诺快速收线最能激发它的攻击欲。' },
  { id: 'menggu', name: '蒙古鲌', latin: 'Chanodichthys mongolicus', group: 'culter', zones: ['lake', 'river'], layer: 'mid', hours: ['dawn', 'dusk'],
    baits: {}, lures: { spoon: 2, micro: 2, minnow: 1.5, jig: 1.5 }, w: [0.3, 5], len: 60, power: 1.8, rarity: 3, body: 'predator',
    col: { back: 0x60646e, belly: 0xeef0f2, fin: 0xd08a6a }, pattern: 'none',
    desc: '红尾鲌，尾鳍橙红，常成群巡游追捕餐条。' },
  { id: 'nijiantou', name: '拟尖头鲌', latin: 'Culter oxycephaloides', group: 'culter', zones: ['river'], layer: 'mid', hours: ['dawn', 'dusk'],
    baits: {}, lures: { minnow: 2, jig: 1.5 }, w: [0.4, 3.5], len: 55, power: 1.6, rarity: 3, body: 'predator',
    col: { back: 0x4f5a66, belly: 0xeceff1, fin: 0x93a5b3 }, pattern: 'none',
    desc: '江流中的尖嘴掠食者，头背显著隆起。' },
  { id: 'hongqi', name: '红鳍原鲌', latin: 'Cultrichthys erythropterus', group: 'culter', zones: ['lake'], layer: 'upper', hours: ['dawn', 'dusk'],
    baits: {}, lures: { micro: 2, spoon: 1.5 }, w: [0.1, 1.2], len: 30, power: 0.8, rarity: 2, body: 'predator',
    col: { back: 0x6b7078, belly: 0xf0f0f0, fin: 0xe07a5a }, pattern: 'none',
    desc: '小型鲌，臀鳍与尾鳍下叶泛红，水草边常见。' },
  { id: 'gan', name: '鳡', latin: 'Elopichthys bambusa', group: 'culter', zones: ['river', 'lake'], layer: 'mid', hours: ['day', 'dusk'],
    baits: {}, lures: { minnow: 3, vib: 2.5, jig: 2.5, spoon: 2 }, w: [2, 58], len: 180, power: 3.2, rarity: 4, body: 'predator',
    col: { back: 0x3e4c55, belly: 0xf3f5f4, fin: 0xd8b06a }, pattern: 'none',
    desc: '"水老虎"，长江流域顶级掠食者，一口能吞下半斤的鱼。中它的竿子要抱紧。' },

  // ================= 鳊鲂类 =================
  { id: 'wuchang', name: '团头鲂（武昌鱼）', latin: 'Megalobrama amblycephala', group: 'bream', zones: ['lake'], layer: 'mid', hours: DN,
    baits: { wheat: 2.5, pellet: 2, corn: 1.5, worm: 1 }, lures: {}, w: [0.3, 4.2], len: 45, power: 1.4, rarity: 2, body: 'bream',
    col: { back: 0x4f5b52, belly: 0xe9ece4, fin: 0x6a7568 }, pattern: 'stripes',
    desc: '"才饮长沙水，又食武昌鱼"。梁子湖名牌，身形侧扁如菱。' },
  { id: 'sanjiao', name: '三角鲂', latin: 'Megalobrama terminalis', group: 'bream', zones: ['lake', 'river'], layer: 'bottom', hours: DN,
    baits: { corn: 2, pellet: 2, wheat: 1.5 }, lures: {}, w: [0.5, 6.5], len: 55, power: 1.7, rarity: 3, body: 'bream',
    col: { back: 0x454f57, belly: 0xe6e9ea, fin: 0x5d6870 }, pattern: 'stripes',
    desc: '比团头鲂更偏流水，头背面呈三角形，江中劲道更足。' },

  // ================= 鲴类 =================
  { id: 'yingu', name: '银鲴', latin: 'Xenocypris argentea', group: 'xu', zones: ['lake'], layer: 'bottom', hours: ['day'],
    baits: { wheat: 2.5, pellet: 2, paste: 1.5 }, lures: {}, w: [0.05, 1.1], len: 30, power: 0.9, rarity: 1, body: 'gudgeon',
    col: { back: 0x5f6a5e, belly: 0xf0f2ea, fin: 0xd8c26a }, pattern: 'none',
    desc: '刮食性底栖小鱼，腹鳍臀鳍泛黄，江段优势种之一，成群进窝。' },
  { id: 'huangwei', name: '黄尾鲴', latin: 'Xenocypris davidi', group: 'xu', zones: ['lake'], layer: 'bottom', hours: ['dawn', 'dusk'],
    baits: { wheat: 2.5, pellet: 2 }, lures: {}, w: [0.1, 2.4], len: 40, power: 1.2, rarity: 2, body: 'gudgeon',
    col: { back: 0x565f52, belly: 0xecebe0, fin: 0xd4a83c }, pattern: 'none',
    desc: '尾鳍杏黄，翻搅水底泥沙觅食藻类，钓底常见。' },

  // ================= 䱗条类 =================
  { id: 'baitiao', name: '䱗（白条）', latin: 'Hemiculter leucisculus', group: 'chen', zones: ['lake', 'river'], layer: 'upper', hours: ['day'],
    baits: { worm: 1, pellet: 1, paste: 1.5, bloodworm: 1 }, lures: {}, w: [0.008, 0.25], len: 18, power: 0.3, rarity: 1, body: 'minnow',
    col: { back: 0x707c85, belly: 0xf5f7f8, fin: 0xb8c4cc }, pattern: 'none',
    desc: '水皮小霸王，抢饵第一名。漂乱动多半是它在捣乱，但拉白条也很快活。' },
  { id: 'yinpiao', name: '银飘鱼', latin: 'Pseudolaubuca sinensis', group: 'chen', zones: ['lake'], layer: 'upper', hours: ['day'],
    baits: { worm: 1, paste: 1.5 }, lures: {}, w: [0.015, 0.35], len: 22, power: 0.35, rarity: 1, body: 'minnow',
    col: { back: 0x7c8890, belly: 0xf8fafa, fin: 0xc2ced6 }, pattern: 'none',
    desc: '身薄如刀光，随波飘游，出水即亮。' },

  // ================= 鳑鲏 =================
  { id: 'zhonghuapangpi', name: '中华鳑鲏', latin: 'Rhodeus sinensis', group: 'bitterling', zones: ['lake'], layer: 'benthic', hours: ['day'],
    baits: { worm: 1, paste: 1 }, lures: {}, w: [0.004, 0.05], len: 8, power: 0.2, rarity: 1, body: 'bitterling',
    col: { back: 0x7a8898, belly: 0xf0e8e0, fin: 0xe08a9a }, pattern: 'none', colorFancy: true,
    desc: '发色期婚姻色艳丽，靠河蚌繁殖，原生鱼圈的心头好。' },
  { id: 'gaotipangpi', name: '高体鳑鲏', latin: 'Rhodeus ocellatus', group: 'bitterling', zones: ['lake'], layer: 'benthic', hours: ['day'],
    baits: { worm: 1, paste: 1 }, lures: {}, w: [0.004, 0.06], len: 8, power: 0.2, rarity: 1, body: 'bitterling',
    col: { back: 0x8a7a98, belly: 0xf2e8ea, fin: 0xe07aa0 }, pattern: 'none', colorFancy: true,
    desc: '体高侧扁，繁殖季雄鱼披上紫蓝虹彩。' },

  // ================= 鮈类 =================
  { id: 'tongyu', name: '铜鱼', latin: 'Coreius heterodon', group: 'gudgeon', zones: ['river'], layer: 'bottom', hours: ['dawn', 'night'],
    baits: { worm: 2.5, pellet: 1.5 }, lures: {}, w: [0.2, 4.5], len: 55, power: 1.8, rarity: 3, body: 'bronze',
    col: { back: 0x6a5d3a, belly: 0xe8dfc8, fin: 0x8a7a4a }, pattern: 'none',
    desc: '古铜色圆筒身，长江中游江段优势种，俗称"金鳅"，流水石头缝里藏身。' },
  { id: 'changwen', name: '长吻鮈', latin: 'Rhinogobio typus', group: 'gudgeon', zones: ['river'], layer: 'bottom', hours: ['dawn', 'dusk'],
    baits: { worm: 2 }, lures: {}, w: [0.05, 0.9], len: 28, power: 0.5, rarity: 2, body: 'gudgeon',
    col: { back: 0x60665a, belly: 0xe2e2d2, fin: 0x7e8468 }, pattern: 'spots',
    desc: '吻部尖长，用唇在石缝间搜刮食物。' },
  { id: 'yinji', name: '银鮈', latin: 'Squalidus argentatus', group: 'gudgeon', zones: ['lake', 'river'], layer: 'bottom', hours: ['day'],
    baits: { worm: 2, bloodworm: 1.5 }, lures: {}, w: [0.008, 0.15], len: 12, power: 0.25, rarity: 1, body: 'gudgeon',
    col: { back: 0x808a90, belly: 0xf4f6f6, fin: 0xb4bec4 }, pattern: 'none',
    desc: '闪着银光的小鮈，近岸沙底成群。' },
  { id: 'maisui', name: '麦穗鱼', latin: 'Pseudorasbora parva', group: 'gudgeon', zones: ['lake'], layer: 'benthic', hours: ['day'],
    baits: { worm: 2, paste: 1 }, lures: {}, w: [0.004, 0.1], len: 10, power: 0.2, rarity: 1, body: 'gudgeon',
    col: { back: 0x6e7862, belly: 0xe6e6d8, fin: 0x8a927a }, pattern: 'stripes',
    desc: '岸边最常见的"万年小杂鱼"，护卵期身上出彩虹色。' },
  { id: 'huaquan', name: '华鳈', latin: 'Sarcocheilichthys sinensis', group: 'gudgeon', zones: ['lake'], layer: 'benthic', hours: ['day'],
    baits: { worm: 2, pellet: 1 }, lures: {}, w: [0.03, 0.5], len: 22, power: 0.45, rarity: 2, body: 'gudgeon',
    col: { back: 0x5a6268, belly: 0xdfe2da, fin: 0x8a9298 }, pattern: 'stripes',
    desc: '体侧四块大黑斑，老钓友叫它"火烧"。' },
  { id: 'heiqian', name: '黑鳍鳈', latin: 'Sarcocheilichthys nigripinnis', group: 'gudgeon', zones: ['river'], layer: 'benthic', hours: ['day'],
    baits: { worm: 2, bloodworm: 1 }, lures: {}, w: [0.02, 0.35], len: 18, power: 0.4, rarity: 2, body: 'gudgeon',
    col: { back: 0x525a66, belly: 0xdadde2, fin: 0x4a5058 }, pattern: 'stripes',
    desc: '鳍缘墨黑，发色期体侧带橘红，喜欢流水碎石底。' },

  // ================= 马口与鱲 =================
  { id: 'makou', name: '马口鱼', latin: 'Opsariichthys bidens', group: 'machako', zones: ['river', 'lake'], layer: 'upper', hours: ['dawn', 'dusk'],
    baits: {}, lures: { micro: 3, spoon: 1.5 }, w: [0.03, 0.4], len: 25, power: 0.7, rarity: 2, body: 'predator',
    col: { back: 0x5a6f8a, belly: 0xf0f2ee, fin: 0xe0a04a }, pattern: 'stripes', colorFancy: true,
    desc: '口裂奇大如马嘴，微物路亚的启蒙鱼。繁殖期雄鱼蓝彩横纹极为艳丽。' },
  { id: 'kuanqilai', name: '宽鳍鱲', latin: 'Zacco platypus', group: 'machako', zones: ['river'], layer: 'upper', hours: ['dawn', 'dusk'],
    baits: {}, lures: { micro: 3 }, w: [0.02, 0.3], len: 20, power: 0.6, rarity: 2, body: 'predator',
    col: { back: 0x6a8a9a, belly: 0xf2f0e8, fin: 0xe07a5a }, pattern: 'stripes', colorFancy: true,
    desc: '溪哥，鳍宽体艳，成群在流水滩上抢落水昆虫。' },

  // ================= 鳅类 =================
  { id: 'niqiu', name: '泥鳅', latin: 'Misgurnus anguillicaudatus', group: 'loach', zones: ['lake'], layer: 'benthic', hours: ['night'],
    baits: { worm: 2.5, bloodworm: 2 }, lures: {}, w: [0.01, 0.2], len: 22, power: 0.4, rarity: 1, body: 'loach',
    col: { back: 0x5d5a48, belly: 0xd8d2b8, fin: 0x7a765c }, pattern: 'spots',
    desc: '"水中人参"，淤泥里拱食，夜里最活跃。' },
  { id: 'huaqi', name: '中华花鳅', latin: 'Cobitis sinensis', group: 'loach', zones: ['lake'], layer: 'benthic', hours: ['day', 'night'],
    baits: { worm: 2, bloodworm: 1.5 }, lures: {}, w: [0.004, 0.05], len: 12, power: 0.2, rarity: 1, body: 'loach',
    col: { back: 0x8a7d5a, belly: 0xe0dac2, fin: 0xa09272 }, pattern: 'spots',
    desc: '身上一串黑斑如花瓣，沙底浅水处藏身。' },
  { id: 'zibo', name: '紫薄鳅', latin: 'Leptobotia taeniops', group: 'loach', zones: ['river'], layer: 'bottom', hours: ['dusk', 'night'],
    baits: { worm: 1.5 }, lures: {}, w: [0.1, 1.2], len: 28, power: 0.9, rarity: 3, body: 'loach',
    col: { back: 0x5a4a6a, belly: 0xd8d0e0, fin: 0x7a6a8a }, pattern: 'stripes',
    desc: '紫褐色横纹的江鳅，流水石缝中的隐士。' },
  { id: 'changbo', name: '长薄鳅', latin: 'Leptobotia elongata', group: 'loach', zones: ['river'], layer: 'bottom', hours: ['night'],
    baits: { worm: 1 }, lures: {}, w: [0.5, 3.5], len: 45, power: 1.6, rarity: 4, body: 'loach',
    col: { back: 0x6a4a3a, belly: 0xe0d2c2, fin: 0x8a6a5a }, pattern: 'stripes',
    desc: '鳅中巨物，体侧深色宽带纹，长江稀有鱼种，钓到是运气。' },

  // ================= 鲿科 =================
  { id: 'huangsang', name: '黄颡鱼（黄辣丁）', latin: 'Pelteobagrus fulvidraco', group: 'bagrid', zones: ['lake', 'river'], layer: 'bottom', hours: ['dusk', 'night'],
    baits: { worm: 3, bloodworm: 2.5 }, lures: { texas: 0.5 }, w: [0.05, 1.2], len: 25, power: 1.0, rarity: 1, body: 'catfish',
    col: { back: 0x6a5a2e, belly: 0xe8dca8, fin: 0x8a7a3e }, pattern: 'spots', whiskers: true,
    desc: '黄骨丁、嘎鱼都是它。背鳍胸鳍带硬刺，抓的时候要小心，夜钓挂蚯蚓必中。' },
  { id: 'washi', name: '瓦氏黄颡鱼', latin: 'Pelteobagrus vachellii', group: 'bagrid', zones: ['river'], layer: 'bottom', hours: ['dusk', 'night'],
    baits: { worm: 3 }, lures: { texas: 0.8 }, w: [0.2, 2.6], len: 40, power: 1.6, rarity: 2, body: 'catfish',
    col: { back: 0x5e5030, belly: 0xe4d8a8, fin: 0x7c6c40 }, pattern: 'none', whiskers: true,
    desc: '长江中游优势种，比黄颡更大更凶，江钓夜口的常客。' },
  { id: 'jiangtuan', name: '长吻鮠（江团）', latin: 'Leiocassis longirostris', group: 'bagrid', zones: ['river'], layer: 'bottom', hours: ['night'],
    baits: { worm: 2 }, lures: { texas: 1.5 }, w: [0.5, 12], len: 90, power: 2.6, rarity: 3, body: 'catfish',
    col: { back: 0x4e5866, belly: 0xe4e8ec, fin: 0x6a7482 }, pattern: 'none', whiskers: true,
    desc: '鮰鱼，无鳞少刺肥美，江中石碓里的大户，钓一条够吹半年。' },
  { id: 'wusuli', name: '乌苏里拟鲿', latin: 'Pseudobagrus ussuriensis', group: 'bagrid', zones: ['river'], layer: 'bottom', hours: ['night'],
    baits: { worm: 2 }, lures: { texas: 0.5 }, w: [0.2, 2], len: 35, power: 1.2, rarity: 3, body: 'catfish',
    col: { back: 0x4a4e42, belly: 0xdcdcd0, fin: 0x646856 }, pattern: 'none', whiskers: true,
    desc: '体细长的拟鲿，须长过头部，夜行性强。' },

  // ================= 鲶类 =================
  { id: 'tunian', name: '土鲶', latin: 'Silurus asotus', group: 'catfish', zones: ['lake', 'river'], layer: 'bottom', hours: ['night'],
    baits: { worm: 2 }, lures: { texas: 1.5, vib: 1 }, w: [0.3, 9], len: 80, power: 2.6, rarity: 2, body: 'catfish',
    col: { back: 0x3e4438, belly: 0xd4d8ca, fin: 0x565e4a }, pattern: 'none', whiskers: true, headBig: 1.2,
    desc: '本地胡子鲶，黄昏后靠边捕食，软虫慢拖最易上。' },
  { id: 'dakounian', name: '大口鲶', latin: 'Silurus meridionalis', group: 'catfish', zones: ['river'], layer: 'bottom', hours: ['night'],
    baits: { worm: 1 }, lures: { texas: 2.5, vib: 1.5 }, w: [1, 22], len: 120, power: 3.0, rarity: 3, body: 'catfish',
    col: { back: 0x363c34, belly: 0xd0d4c6, fin: 0x4e5646 }, pattern: 'none', whiskers: true, headBig: 1.3,
    desc: '口裂到眼后，长江夜色下的伏击者，中钩后死沉死沉往障碍里钻。' },

  // ================= 鳜类 =================
  { id: 'guiyu', name: '翘嘴鳜', latin: 'Siniperca chuatsi', group: 'mandarin', zones: ['lake'], layer: 'bottom', hours: ['dawn', 'dusk'],
    baits: {}, lures: { texas: 3, vib: 2, minnow: 1.5 }, w: [0.3, 9], len: 80, power: 2.4, rarity: 3, body: 'mandarin',
    col: { back: 0x4a5a3e, belly: 0xe4e8d8, fin: 0x8a9a70 }, pattern: 'spots',
    desc: '桂花鱼。藏在水底乱石结构旁伏击，德州软虫跳底慢搜是正解。' },
  { id: 'dayan', name: '大眼鳜', latin: 'Siniperca knerii', group: 'mandarin', zones: ['lake'], layer: 'bottom', hours: ['dawn', 'dusk'],
    baits: {}, lures: { texas: 2.5, vib: 1.5 }, w: [0.2, 3.5], len: 40, power: 1.6, rarity: 2, body: 'mandarin',
    col: { back: 0x56614a, belly: 0xe0e4d4, fin: 0x84926e }, pattern: 'spots',
    desc: '眼睛大、体形长，深水湖湾的伏击手。' },
  { id: 'bangui', name: '斑鳜', latin: 'Siniperca scherzeri', group: 'mandarin', zones: ['river'], layer: 'bottom', hours: ['dawn', 'dusk', 'night'],
    baits: {}, lures: { texas: 2.5, vib: 2 }, w: [0.3, 5.5], len: 50, power: 2.0, rarity: 3, body: 'mandarin',
    col: { back: 0x3e4a42, belly: 0xd8e0d4, fin: 0x6e7c68 }, pattern: 'stripes',
    desc: '身上是横纹不是斑点，江里石头缝的住户，比翘嘴鳜更值钱。' },

  // ================= 鳢科 =================
  { id: 'wuqie', name: '乌鳢（财鱼）', latin: 'Channa argus', group: 'snakehead', zones: ['lake'], layer: 'benthic', hours: ['dawn', 'day', 'dusk'],
    baits: {}, lures: { frog: 3, texas: 2 }, w: [0.4, 11], len: 90, power: 2.8, rarity: 2, body: 'snakehead',
    col: { back: 0x2e382e, belly: 0xc8ccc0, fin: 0x3e483c }, pattern: 'stripes',
    desc: '湖北人叫财鱼，煲汤一绝。雷蛙扔进草洞，"轰"的一声炸水最是刺激。' },

  // ================= 塘鳢·斗鱼 =================
  { id: 'shatangli', name: '沙塘鳢（土憨巴）', latin: 'Odontobutis obscura', group: 'goby', zones: ['lake'], layer: 'benthic', hours: ['dawn', 'dusk'],
    baits: { worm: 2.5, bloodworm: 1.5 }, lures: {}, w: [0.02, 0.35], len: 18, power: 0.4, rarity: 2, body: 'goby',
    col: { back: 0x5a5248, belly: 0xd8d2c4, fin: 0x746a5c }, pattern: 'spots',
    desc: '呆头呆脑趴在石头上，虎头虎脑，老武汉的下酒菜。' },
  { id: 'douyu', name: '圆尾斗鱼', latin: 'Macropodus chinensis', group: 'goby', zones: ['lake'], layer: 'benthic', hours: ['day'],
    baits: { worm: 1.5 }, lures: {}, w: [0.003, 0.03], len: 7, power: 0.15, rarity: 1, body: 'goby',
    col: { back: 0x5a6a7a, belly: 0xd0d8e0, fin: 0x5a8aa0 }, pattern: 'stripes', colorFancy: true,
    desc: '稻田沟渠里的小武士，尾圆如扇，斗性十足。' },
  { id: 'xiahu', name: '子陵吻鰕虎', latin: 'Rhinogobius giurinus', group: 'goby', zones: ['lake', 'river'], layer: 'benthic', hours: ['day'],
    baits: { worm: 1.5, bloodworm: 1 }, lures: {}, w: [0.002, 0.03], len: 7, power: 0.12, rarity: 1, body: 'goby',
    col: { back: 0x6a7262, belly: 0xd4d8cc, fin: 0x8a9282 }, pattern: 'spots',
    desc: '腹鳍吸成吸盘，贴着石头一路"爬行"觅食。' },
  { id: 'huangyou', name: '黄黝鱼', latin: 'Hypseleotris swinhonis', group: 'goby', zones: ['lake'], layer: 'benthic', hours: ['day'],
    baits: { worm: 1.5 }, lures: {}, w: [0.003, 0.04], len: 8, power: 0.14, rarity: 1, body: 'goby',
    col: { back: 0x7a7a5a, belly: 0xe0e0c8, fin: 0x9a9a72 }, pattern: 'stripes',
    desc: '通体黄褐的小塘鳢，水草丛里的常住户。' },

  // ================= 特殊类 =================
  { id: 'huangshan', name: '黄鳝', latin: 'Monopterus albus', group: 'special', zones: ['lake'], layer: 'benthic', hours: ['night'],
    baits: { worm: 3 }, lures: {}, w: [0.1, 1.8], len: 85, power: 1.2, rarity: 2, body: 'eel',
    col: { back: 0x5a5a2e, belly: 0xd8d29a, fin: 0x6a6a3a }, pattern: 'spots',
    desc: '洞居夜行，伏天大鳝最肥。上钩后会在水底打桩，要有耐心。' },
  { id: 'daoqi', name: '中华刺鳅（刀鳅）', latin: 'Mastacembelus aculeatus', group: 'special', zones: ['lake'], layer: 'benthic', hours: ['night'],
    baits: { worm: 2.5 }, lures: {}, w: [0.05, 0.6], len: 35, power: 0.6, rarity: 2, body: 'eel',
    col: { back: 0x4e5a46, belly: 0xcfd4c0, fin: 0x66745c }, pattern: 'stripes',
    desc: '背鳍前一排硬刺，像把小锯子，抓它千万别握手心。' },
  { id: 'xinyu', name: '太湖新银鱼', latin: 'Neosalanx taihuensis', group: 'special', zones: ['lake'], layer: 'upper', hours: ['dawn', 'night'],
    baits: { bloodworm: 2 }, lures: {}, w: [0.002, 0.01], len: 7, power: 0.1, rarity: 2, body: 'silver',
    col: { back: 0xaebcc4, belly: 0xf8fbfc, fin: 0xd8e4e8 }, pattern: 'none',
    desc: '通体晶莹如玉簪，春天集群在敞水区产卵。' },
  { id: 'dayinxinyu', name: '大银鱼', latin: 'Protosalanx hyalocranius', group: 'special', zones: ['lake'], layer: 'upper', hours: ['night'],
    baits: { bloodworm: 2 }, lures: {}, w: [0.005, 0.025], len: 15, power: 0.15, rarity: 3, body: 'silver',
    col: { back: 0xa0b2c0, belly: 0xf6fafc, fin: 0xd0dee6 }, pattern: 'none',
    desc: '银鱼中的巨人，头部透明能看见脑。' },

  // ================= 洄游名贵 =================
  { id: 'daoyu', name: '刀鲚（长江刀鱼）', latin: 'Coilia nasus', group: 'migratory', zones: ['river'], layer: 'mid', hours: ['dawn'],
    baits: { paste: 1.5 }, lures: { micro: 1.5 }, w: [0.05, 0.4], len: 40, power: 0.8, rarity: 4, body: 'knife',
    col: { back: 0x8a9aa8, belly: 0xf8fafc, fin: 0xd0dce4 }, pattern: 'none',
    desc: '"长江三鲜"之首，身薄如刀，清明前最金贵。如今可遇不可求。' },
  { id: 'hetun', name: '暗纹东方鲀（河豚）', latin: 'Takifugu fasciatus', group: 'migratory', zones: ['river'], layer: 'bottom', hours: ['dawn', 'dusk'],
    baits: { worm: 2 }, lures: {}, w: [0.2, 1.8], len: 30, power: 1.0, rarity: 4, body: 'puffer',
    col: { back: 0x5a6a5e, belly: 0xeceee6, fin: 0xd8b06a }, pattern: 'spots',
    desc: '拼死吃河豚的"豚"。受惊会鼓成球，背上的刺摸不得。' },
  { id: 'manli', name: '日本鳗鲡', latin: 'Anguilla japonica', group: 'migratory', zones: ['river'], layer: 'bottom', hours: ['night'],
    baits: { worm: 3 }, lures: {}, w: [0.2, 3.5], len: 100, power: 1.8, rarity: 4, body: 'eel',
    col: { back: 0x3c4a44, belly: 0xe2e6dc, fin: 0x54625a }, pattern: 'none',
    desc: '玻璃苗变银鳗，千里洄游产卵的传奇。夜钓江河有时会撞上。' },

  // ================= 保护与外来 =================
  { id: 'yanzhiyu', name: '胭脂鱼', latin: 'Myxocyprinus asiaticus', group: 'protected', zones: ['river', 'lake'], layer: 'mid', hours: ['day'],
    baits: { pellet: 1, worm: 1 }, lures: {}, w: [1, 32], len: 110, power: 2.6, rarity: 4, body: 'carp',
    col: { back: 0x8a4a52, belly: 0xf0dede, fin: 0xc06a72 }, pattern: 'stripes', prot: true,
    desc: '国家二级保护动物，"一帆风顺"。幼鱼背鳍高耸如帆。钓获请立即放流！' },
  { id: 'zhonghuaxun', name: '中华鲟', latin: 'Acipenser sinensis', group: 'protected', zones: ['river'], layer: 'bottom', hours: ['day'],
    baits: {}, lures: { vib: 0.5 }, w: [5, 220], len: 320, power: 3.4, rarity: 5, body: 'sturgeon',
    col: { back: 0x3e4854, belly: 0xe4e8ec, fin: 0x5a6470 }, pattern: 'none', prot: true,
    desc: '国家一级保护动物，长江活化石，1.4亿年的历史。钓到是缘分，放流是本分！' },
  { id: 'jiazhou', name: '大口黑鲈（加州鲈）', latin: 'Micropterus salmoides', group: 'protected', zones: ['lake'], layer: 'mid', hours: ['day', 'dusk'],
    baits: {}, lures: { texas: 3, minnow: 2, vib: 1.5 }, w: [0.3, 6], len: 60, power: 2.2, rarity: 2, body: 'mandarin',
    col: { back: 0x3e4a3a, belly: 0xdce4d4, fin: 0x5e6e58 }, pattern: 'stripes', alien: true,
    desc: '外来定居种，路亚主角。护巢期凶得很，倒钓软虫轻轻一抖就是一口。' },
  { id: 'taiyangyu', name: '蓝鳃太阳鱼', latin: 'Lepomis macrochirus', group: 'protected', zones: ['lake'], layer: 'benthic', hours: ['day'],
    baits: { worm: 2.5, pellet: 1 }, lures: { micro: 1 }, w: [0.05, 0.6], len: 22, power: 0.6, rarity: 2, body: 'bream',
    col: { back: 0x4a6a7a, belly: 0xe8c86a, fin: 0x5a8a9a }, pattern: 'stripes', colorFancy: true, alien: true,
    desc: '外来种，鳃盖后一块"耳朵"蓝得发亮，贪吃好钓，小朋友的最爱。' },
  { id: 'chawei', name: '斑点叉尾鮰', latin: 'Ictalurus punctatus', group: 'protected', zones: ['lake', 'river'], layer: 'bottom', hours: ['dusk', 'night'],
    baits: { worm: 2.5, pellet: 2 }, lures: { texas: 1 }, w: [0.5, 12], len: 95, power: 2.4, rarity: 2, body: 'catfish',
    col: { back: 0x4a5058, belly: 0xdadfe4, fin: 0x646c76 }, pattern: 'spots', whiskers: true, alien: true,
    desc: '引进养殖后逃逸定居的"沟鲶"，湖库夜钓大物池的常客。' },
];

export const SPECIES_BY_ID = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

// ================= 季节鱼情（按真实习性整理） =================
const SEASON_TABLES = {
  all:     { spring: 1.0, summer: 1.0, autumn: 1.0, winter: 0.7 },
  spawner: { spring: 1.5, summer: 0.9, autumn: 0.8, winter: 0.4 },
  summer:  { spring: 0.8, summer: 1.4, autumn: 1.0, winter: 0.3 },
  warm:    { spring: 0.9, summer: 1.3, autumn: 1.2, winter: 0.3 },
  autumn:  { spring: 0.9, summer: 1.0, autumn: 1.5, winter: 0.4 },
  winter:  { spring: 0.9, summer: 0.4, autumn: 1.0, winter: 1.5 },
  spring:  { spring: 1.6, summer: 0.6, autumn: 0.5, winter: 0.2 },
  cool:    { spring: 1.2, summer: 0.8, autumn: 1.2, winter: 0.8 },
};
const SEASON_PREF = {
  qingyu: 'autumn', caoyu: 'warm', lian: 'summer', yong: 'summer',
  li: 'spawner', ji: 'winter',
  qiaozui: 'autumn', menggu: 'warm', nijiantou: 'summer', hongqi: 'summer', gan: 'warm',
  wuchang: 'autumn', sanjiao: 'autumn',
  yingu: 'cool', huangwei: 'summer',
  baitiao: 'summer', yinpiao: 'summer',
  zhonghuapangpi: 'spawner', gaotipangpi: 'spawner',
  tongyu: 'autumn', changwen: 'cool', yinji: 'all', maisui: 'summer', huaquan: 'cool', heiqian: 'cool',
  makou: 'spring', kuanqilai: 'spring',
  niqiu: 'summer', huaqi: 'all', zibo: 'autumn', changbo: 'autumn',
  huangsang: 'summer', washi: 'summer', jiangtuan: 'autumn', wusuli: 'cool',
  tunian: 'summer', dakounian: 'summer',
  guiyu: 'spring', dayan: 'autumn', bangui: 'cool',
  wuqie: 'summer',
  shatangli: 'spring', douyu: 'summer', xiahu: 'summer', huangyou: 'summer',
  huangshan: 'summer', daoqi: 'summer',
  xinyu: 'spring', dayinxinyu: 'winter',
  daoyu: 'spring', hetun: 'spring', manli: 'autumn',
  yanzhiyu: 'all', zhonghuaxun: 'autumn',
  jiazhou: 'spring', taiyangyu: 'summer', chawei: 'summer',
};
export const SEASON_BITE = { spring: 1.15, summer: 1.0, autumn: 1.25, winter: 0.6 };
export const SEASON_INFO = {
  spring: { name: '春', icon: '🌱' }, summer: { name: '夏', icon: '☀️' },
  autumn: { name: '秋', icon: '🍂' }, winter: { name: '冬', icon: '❄️' },
};
export function seasonFactor(sp, season) {
  const t = SEASON_TABLES[SEASON_PREF[sp.id] || 'all'] || SEASON_TABLES.all;
  return t[season] ?? 1;
}
export function seasonPrefName(sp) {
  const p = SEASON_PREF[sp.id] || 'all';
  const names = { all: '四季可钓', spawner: '春季产卵期爆发', summer: '盛夏活跃', warm: '暖季活跃', autumn: '秋肥黄金期', winter: '耐寒·冬季可钓', spring: '春季窗口期', cool: '春秋凉爽期' };
  return names[p] || '四季可钓';
}

export const periodOf = (hour) => {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
};
export const PERIOD_NAME = { dawn: '清晨', day: '白天', dusk: '黄昏', night: '夜晚' };
export const isSpeciesActive = (sp, hour) => sp.hours.includes(periodOf(hour));
// 时段概率拟合：不在活跃时段的鱼不是钓不到，只是咬钩率大降（×0.15）
export function hourFactor(sp, hour) {
  return sp.hours.includes(periodOf(hour)) ? 1 : 0.15;
}

// 钓深与水层的匹配度（概率拟合：错层不是钓不到，是概率低）
export function layerMatch(sp, depthRatio) {
  const r = depthRatio;
  if (sp.layer === 'upper') return r <= 0.38 ? 1 : r <= 0.55 ? 0.35 : 0.12;
  if (sp.layer === 'mid') return (r >= 0.3 && r <= 0.72) ? 1 : (r >= 0.18 && r <= 0.85) ? 0.35 : 0.12;
  if (sp.layer === 'bottom') return r >= 0.62 ? 1 : r >= 0.45 ? 0.35 : 0.12;
  return r >= 0.8 ? 1 : r >= 0.6 ? 0.3 : 0.08;
}

export function speciesByGroup(gid) { return SPECIES.filter((s) => s.group === gid); }
