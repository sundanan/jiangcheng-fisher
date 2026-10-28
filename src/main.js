// 主程序：装配各系统并驱动游戏循环
import * as THREE from '../lib/three.module.js';
import { Input } from './input.js?v=16';
import { GameState } from './gameState.js?v=17';
import { World, WEATHERS } from './world.js?v=16';
import { Terrain } from './terrain.js?v=18';
import { Water } from './water.js?v=16';
import { FishManager } from './fishManager.js?v=16';
import { Player } from './player.js?v=22';
import { Caster } from './casting.js?v=16';
import { FloatSession } from './floatFishing.js?v=17';
import { LureSession } from './lureFishing.js?v=16';
import { Fight } from './fight.js?v=17';
import { Cards } from './cards.js?v=16';
import { UI } from './ui.js?v=20';
import { AudioSys } from './audio.js?v=16';
import { SPECIES_BY_ID, GROUPS, speciesByGroup, SEASON_INFO } from './fishData.js?v=17';
import { RODS, LURE_RODS, LINES, REELS, LURE_REELS, FLOATS, BAITS, LURES, CHUM } from './tackleData.js?v=16';
import { GRADES, SALVAGE, UPGRADE_COST } from './cards.js?v=16';
import { SPOTS, spotAt, shorePointFor } from './spots.js?v=18';
import { clamp, rand, fmtKg } from './util.js?v=16';

// ===== 渲染基础 =====
const canvas = document.getElementById('game');
let renderer = null;
let graphicsStopped = false;
function stopGraphics(title, detail) {
  graphicsStopped = true;
  canvas.style.display = 'none';
  const root = document.getElementById('ui-root');
  root.style.pointerEvents = 'auto';
  root.innerHTML = `<div class="webgl-error" role="alert"><div class="webgl-error-card">
    <h2>${title}</h2><p>${detail}</p>
    <p>请使用支持 WebGL 的新版 Chrome、Edge 或 360 浏览器，并在浏览器设置中启用图形加速。</p>
    <button id="graphics-retry" class="big-btn" type="button">重新加载</button>
  </div></div>`;
  document.getElementById('graphics-retry').onclick = () => location.reload();
}
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    stopGraphics('3D 图形上下文已中断', '浏览器释放了图形资源，请重新加载页面恢复游戏。');
  });
} catch (e) {
  stopGraphics('当前浏览器无法运行 3D 游戏', '未能创建 WebGL 图形上下文，游戏没有启动。');
}

if (renderer) {
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xbfd4e4, 90, 260);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 900);
scene.add(camera);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ===== 系统装配 =====
const input = new Input(canvas);
const state = new GameState();
const world = new World(scene, camera);
world.realTime = true; // 时间全程与真实时间（北京时间）同步，季节按真实月份
const terrain = new Terrain(scene);
const water = new Water(scene);
const fishMan = new FishManager(scene, terrain, world);
const player = new Player(camera, terrain);
player.attachBoat(scene);
// 季节更替：树冠换色 + 提示
const CROWN_COLORS = { spring: 0x6a9a4e, summer: 0x35502e, autumn: 0xa87838, winter: 0x6a6258 };
world.onSeasonChange = (season) => {
  if (terrain.crownMat) terrain.crownMat.color.setHex(CROWN_COLORS[season] || 0x35502e);
  if (S.phase !== 'title') {
    const info = SEASON_INFO[season];
    ui.toast(`${info.icon} ${info.name}季来了——${{ spring: '鲫鲤产卵靠边，正是钓滩好时候', summer: '天热鱼早晚活跃，白天深水荫凉', autumn: '秋钓黄金季，鳊鲂鳡鱼都肥了', winter: '冬口轻，主钓鲫鳜，漂相要看得细' }[season]}`, 'good');
  }
};
const caster = new Caster(scene);
caster._depthFn = (x, z) => terrain.depthAt(x, z);
const floatS = new FloatSession(scene, terrain, fishMan);
const lureS = new LureSession(scene, terrain, fishMan);
const cards = new Cards();
const audio = new AudioSys();
let lastWeather = null;

const S = {
  phase: 'title',       // title | idle | charging | flying | floatWait | lureWait | fight | catch
  mode: 'float',
  charge: 0, chargeDir: 1,
  underCam: false,
  fight: null,
  pendingIndiv: null,
  bag: [],
  chumZones: [],
  gt: 0,
  saveTimer: 0, statTimer: 0,
  promptKey: '', tackleKey: '',
};

// ===== UI 控制器（供面板调用） =====
const controller = {
  state, cards, bag: S.bag,
  hasSave: () => state.hasSave,
  // 面板打开时是否有进行中的作钓（用于面板顶部"已暂停"提示）
  fishingActive: () => S.phase !== 'idle' && S.phase !== 'title' && S.phase !== 'catch',
  startGame: async (cont) => {
    if (cont) state.load();
    else if (state.hasSave) {
      const ok = await ui.confirmBox('已有旧存档。开始<b>新游戏</b>将覆盖旧档（金钱、图鉴、卡册、渔护全部重置），确定吗？');
      if (!ok) return;
      state.newGame();
    }
    // 渔护与存档共用一个数组（load/newGame 后需重新绑定）
    S.bag = state.data.bag;
    controller.bag = S.bag;
    audio.init(); // 用户手势内激活音频
    ui.showHUD(true);
    S.phase = 'idle';
    ui.toast('欢迎来到江城！清晨的口最好，先抛一竿试试', 'good');
  },
  togglePanel: (name) => ui.toggle(name),
  setMode: (m) => setMode(m),
  buy: (kind, id, price) => {
    if (!state.spend(price)) { ui.toast('钱不够……先卖点鱼吧（N 渔护）', 'bad'); return; }
    const MAP = { rod: ['rods', 'rod'], lureRod: ['lureRods', 'lureRod'], line: ['lines', 'line'], reel: ['reels', 'reel'], lureReel: ['lureReels', 'lureReel'], float: ['floats', 'float'], lure: ['lures', 'lure'] };
    const [arr, eqKey] = MAP[kind];
    const val = kind === 'lure' ? String(id) : +id;
    state.buyGear(arr, val);
    state.equip(eqKey, val);
    ui.toast('入手！已自动换上', 'good');
    ui.renderPanel();
  },
  equip: (kind, id) => { state.equip(kind, id); ui.renderPanel(); },
  buyBait: (id, price) => {
    if (!state.spend(price)) { ui.toast('钱不够……', 'bad'); return; }
    state.addBait(id, 10);
    ui.toast('饵料 +10', 'good');
    ui.renderPanel();
  },
  buyChum: (price) => {
    if (!state.spend(price)) { ui.toast('钱不够……', 'bad'); return; }
    state.addChum(3);
    ui.toast('窝料 +3', 'good');
    ui.renderPanel();
  },
  claimGroup: (gid) => {
    const g = GROUPS.find((x) => x.id === gid);
    state.claimGroup(gid);
    state.earn(g.reward);
    audio.coin();
    ui.toast(`集齐「${g.name}」！奖励 ${g.reward} 元已到账`, 'good');
    ui.renderPanel();
  },
  sellBag: async () => {
    const total = S.bag.reduce((s, c) => s + c.value, 0);
    const ok = await ui.confirmBox(`全部出售 <b>${S.bag.length}</b> 尾渔获，合计 <b>¥${total}</b>，确定吗？`);
    if (!ok) return;
    state.earn(total);
    S.bag.length = 0;
    state.save();
    audio.coin();
    ui.toast(`渔获全部售出 +${total} 元`, 'good');
    ui.renderPanel();
  },
  clearBag: async () => {
    const ok = await ui.confirmBox(`放生全部 <b>${S.bag.length}</b> 尾渔获（无收益、不计放流奖励），确定吗？`);
    if (!ok) return;
    S.bag.length = 0;
    state.save();
    ui.toast('全部放回江湖', 'info');
    ui.renderPanel();
  },
  salvage: async (spId) => {
    const a = state.data.album[spId];
    if (!a) return;
    const g = Math.min(a.g, 4);
    const gain = SALVAGE[g] || 1;
    // 白卡分解=删除卡册条目，高阶卡分解=降档，均需确认
    if (g <= 1 || g >= 3) {
      const ok = await ui.confirmBox(g <= 1
        ? `分解将<b>清空「${SPECIES_BY_ID[spId].name}」的卡册条目</b>，获得 ${gain}💠 鱼珠，确定吗？`
        : `分解将使「${SPECIES_BY_ID[spId].name}」的${GRADES[g].name}卡<b>降一档</b>，获得 ${gain}💠 鱼珠，确定吗？`);
      if (!ok) return;
    }
    if (g <= 1) delete state.data.album[spId];
    else a.g = g - 1;
    state.addShards(gain);
    audio.coin();
    ui.toast(`分解 ${SPECIES_BY_ID[spId].name} 卡，获得 ${gain} 鱼珠${g <= 1 ? '（该鱼卡册已清空）' : '，卡片降档'}`, 'info');
    ui.renderPanel();
  },
  upgrade: (spId) => {
    const a = state.data.album[spId];
    if (!a) return;
    const g = Math.min(a.g, 4);
    if (g >= 4) return;
    const cost = UPGRADE_COST[g];
    if (state.shards < cost) { ui.toast(`鱼珠不够（需要 ${cost}💠），分解重复卡可获得`, 'bad'); return; }
    state.addShards(-cost);
    a.g = g + 1;
    state.save();
    audio.card();
    ui.toast(`合成成功！${SPECIES_BY_ID[spId].name} 升级为${GRADES[g + 1].name}卡`, 'good');
    ui.renderPanel();
  },
  // 地图传送
  playerPos: () => ({ x: player.pos.x, z: player.pos.z }),
  currentSpot: () => {
    if (S.phase === 'floatWait' && floatS.active) return spotAt(floatS.pos.x, floatS.pos.z);
    if (S.phase === 'lureWait' && lureS.active) return spotAt(lureS.pos.x, lureS.pos.z);
    // 未作钓：取玩家面前最近的水域钓点
    const fw = new THREE.Vector3(); player.forward(fw);
    for (let d = 6; d <= 40; d += 2) {
      const s = spotAt(player.pos.x + fw.x * d, player.pos.z + fw.z * d);
      if (s && terrain.isWater(player.pos.x + fw.x * d, player.pos.z + fw.z * d)) return s;
    }
    return null;
  },
  travel: (spotId) => {
    const spot = SPOTS.find((s) => s.id === spotId);
    if (!spot) return;
    if (S.phase !== 'idle' && S.phase !== 'floatWait' && S.phase !== 'lureWait') { ui.toast('先收竿再出发（R）', 'bad'); return; }
    const wasFishing = S.phase !== 'idle';
    resetSessions();
    const p = shorePointFor(spot, terrain);
    player.pos.set(p.x, p.y, p.z);
    player.yaw = Math.atan2(-(spot.cx - p.x), -(spot.cz - p.z));
    player.pitch = -0.12;
    player.cam.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
    audio.splash(0.6);
    ui.closePanel();
    ui.toast(`${spot.icon} 已到达 ${spot.name}——${spot.tip}`, 'good');
    if (wasFishing) ui.toast('已自动收竿，本次作钓结束', 'info');
  },
};
const ui = new UI(document.getElementById('ui-root'), controller);
// 锁定鼠标的这次点击只用于锁定，不把同一组按下/松开事件当成抛竿
for (const type of ['mousedown', 'mouseup']) {
  canvas.addEventListener(type, (e) => {
    if (e.button === 0 && document.pointerLockElement !== canvas) e.stopImmediatePropagation();
  }, true);
}
canvas.addEventListener('click', () => {
  if (S.phase !== 'title' && !ui.panelOpen && S.phase !== 'catch') input.requestLock();
});

// ===== 各阶段切换 =====
function setMode(m) {
  if (S.phase !== 'idle') return;
  S.mode = m;
  player.setRodStyle(m === 'lure' ? 'lure' : 'float');
  resetSessions();
}
function resetSessions() {
  floatS.end();
  lureS.end();
  caster.active = null;
  caster.trail.hide();
  player.setBend(0);
  player.triggerAction(null);
  S.fight = null;
  S.underCam = false;
  player.setUnderwater(false);
  ui.underwater(false);
  ui.setFight(null);
  ui.setCharge(null);
  ui.biteHint(null);
  if (S.phase !== 'title') S.phase = 'idle';
}

// 台钓默认钓深：离底
function defaultDepth() { return 2.0; } // 已改为默认钓底，此函数保留作兼容

floatS.onHint = (t) => { ui.biteHint(t); audio.bite(); };
floatS.onMiss = (msg, eatBait = true) => {
  ui.toast(msg, 'bad');
  audio.fail();
  state.data.stats.misses++;
  if (eatBait) consumeBaitAfterEvent();
};
lureS.onHint = (t) => { ui.biteHint(t); audio.bite(); };
lureS.onMiss = (msg) => { ui.toast(msg, 'bad'); audio.fail(); state.data.stats.misses++; };

function consumeBaitAfterEvent() {
  if (S.mode !== 'float') return;
  state.consumeBait(state.data.equipped.bait);
  if (!state.data.baits[state.data.equipped.bait]) {
    ui.toast('饵用完了！按 B 去商店补货', 'bad');
    resetSessions();
  }
}

// ===== 装备数值 =====
function rodStats() {
  const eq = state.data.equipped;
  const isFloat = S.mode === 'float';
  const rodList = isFloat ? RODS : LURE_RODS;
  const reelList = isFloat ? REELS : LURE_REELS;
  const rodId = isFloat ? eq.rod : eq.lureRod;
  const reelId = isFloat ? eq.reel : eq.lureReel;
  const rod = rodList[rodId], reel = reelList[reelId], line = LINES[eq.line];
  // 台钓：齐竿线（竿长+0.4m）决定最远抛距；路亚：竿调性与线杯长度共同限制
  const lineLen = isFloat ? +(rod.len + 0.4).toFixed(1) : line.len;
  const castMax = isFloat ? +(rod.len + 0.4).toFixed(1) : Math.min(rod.cast, line.len - 2);
  return {
    rod, reel, line,
    score: rod.id + line.id * 1.5 + reel.id,
    lineLen, castMax,
  };
}

// ===== 打窝 =====
function dropChum() {
  if (state.data.chum <= 0) { ui.toast('没有窝料了，商店有售', 'bad'); return; }
  const fw = new THREE.Vector3(); player.forward(fw);
  for (let d = 4; d <= 28; d += 1.2) {
    const x = player.pos.x + fw.x * d, z = player.pos.z + fw.z * d;
    if (terrain.isWater(x, z) && terrain.depthAt(x, z) > 0.4) {
      state.addChum(-1);
      S.chumZones.push({ x, z, until: S.gt + CHUM.duration });
      fishMan.splash(new THREE.Vector3(x, 0, z), 1.0);
      ui.toast('打窝成功！附近鱼群会被引来', 'good');
      return;
    }
  }
  ui.toast('面前没有可打窝的水面', 'bad');
}
function inChumZone(p) {
  return S.chumZones.some((c) => S.gt < c.until && Math.hypot(p.x - c.x, p.z - c.z) < CHUM.radius);
}

// ===== 抛竿（方向沿竿：水平朝向 + 固定竿角） =====
function doCast(power) {
  const st = rodStats();
  player.forward(_fw);
  _fw.y = 0; _fw.normalize();
  const e = player.rodPitch;
  const dir = new THREE.Vector3(_fw.x * Math.cos(e), Math.sin(e), _fw.z * Math.cos(e));
  audio.cast();
  caster.launch(_tip.clone(), dir, power, st.castMax, null,
    (p) => {
      fishMan.splash(p, 0.8);
      audio.splash(0.9);
        if (S.mode === 'float') {
          state.consumeBait(state.data.equipped.bait);
          // 默认钓底（最通用的入门钓法），最深 6m
          const wd = terrain.depthAt(p.x, p.z);
          floatS.start(p, Math.min(Math.max(wd - 0.12, 0.4), 6));
          floatS.sensBonus = (FLOATS[state.data.equipped.float].sens - 1) * 0.25;
          S.phase = 'floatWait';
        } else {
          lureS.start(p, state.data.equipped.lure);
          S.phase = 'lureWait';
        }
      },
    (msg) => { ui.toast(msg, 'bad'); S.phase = 'idle'; }
  );
  player.triggerAction('cast');
  S.phase = 'flying';
}

// ===== 钓获结算 =====
function beginFight(fish, startPos) {
  player.triggerAction('strike');
  const st = rodStats();
  const indiv = cards.rollIndividual(fish.sp);
  S.pendingIndiv = indiv;
  const dist = Math.max(6, Math.min(startPos.distanceTo(player.pos), 40));
  if (S.mode === 'float') floatS.end(); else lureS.end();
  caster.trail.hide();
  S.fight = new Fight({
    scene, terrain, fishMan, player, fish,
    weight: indiv.weight,
    startDist: dist,
    tackle: { strength: st.line.strength, reel: st.reel.reel, rodPower: st.rod.power },
    onHud: (d) => ui.setFight(d),
    onEnd: (res) => {
      S.fight = null;
      ui.setFight(null);
      player.setBend(0);
      if (!res.ok) {
        state.data.stats.snapped += res.reason.includes('断') ? 1 : 0;
        fishMan.dismiss(fish);
        ui.toast(res.reason, 'bad');
        if (res.reason.includes('断')) audio.snap(); else audio.fail();
        state.save();
        S.phase = 'idle';
      } else {
        resolveCatch(fish);
      }
    },
  });
  S.phase = 'fight';
  audio.hook();
  ui.toast('中鱼！稳住——右键收线，张力高就松手', 'good');
}

function resolveCatch(fish) {
  const { sp, weight, len, pct } = S.pendingIndiv;
  const rel = !!sp.prot;
  const grade = cards.gradeOf(sp, pct, rel);
  const big = cards.isBig(pct);
  const value = cards.valueOf(sp, weight, pct, rel);
  const img = cards.imageOf(sp);
  const method = S.mode === 'float' ? '台钓' : '路亚·' + LURES.find((l) => l.id === state.data.equipped.lure).name;
  const rec = state.recordCatch(sp, weight, len, method);
  if (big) state.data.stats.monsters++;
  // 重复且未破纪录的卡 → 自动分解成鱼珠
  const cur = state.data.album[sp.id];
  const dupCard = !rel && cur && (grade < Math.min(cur.g, 4) || (grade === Math.min(cur.g, 4) && weight <= cur.w));
  state.setAlbum(sp.id, { g: grade, w: +weight.toFixed(3), l: +len.toFixed(1), m: method, d: new Date().toLocaleDateString(), big: big ? 1 : 0 });
  if (dupCard) {
    state.addShards(SALVAGE[grade]);
    setTimeout(() => ui.toast(`重复卡自动分解 +${SALVAGE[grade]}💠 鱼珠（卡册保留最佳）`, 'info'), 1400);
  }
  if (rel) state.data.stats.released++;
  fishMan.remove(fish);
  state.save();
  // 成就检查
  const newAchv = ui.checkAchievements();
  for (const a of newAchv) setTimeout(() => ui.toast(`🏅 达成成就【${a.name}】`, 'good'), 1600 + newAchv.indexOf(a) * 900);
  // 类群集齐检查
  const grp = GROUPS.find((g) => g.id === sp.group);
  const collected = speciesByGroup(sp.group).every((s) => state.data.dex[s.id]);
  if (collected && rec.first) ui.toast(`🎉 集齐「${grp.name}」！打开图鉴领取奖励`, 'good');
  S.phase = 'catch';
  ui.biteHint(null);
  audio.card();
  ui.showCatch({
    sp, weight, len, grade, big, value, img, method,
    time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    release: rel, first: rec.first, record: rec.record,
  }, () => {
    if (rel) {
      state.earn(value);
      ui.toast(`已放流 ${sp.name}，奖励 ${value} 元 + 纪念卡入册`, 'good');
    } else {
      S.bag.push({ sp, weight, len, value, img, big });
    }
    state.save();
    S.phase = 'idle';
  });
}

// ===== 武汉实时时间与天气同步 =====
let wuhanSyncTimer = 0;
async function syncWuhan() {
  // 时间由 world 每帧按真实时钟（UTC+8）同步；这里只拉取 Open-Meteo 实时天气（武汉 30.59N, 114.31E，免 key）
  try {
    const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=30.59&longitude=114.31&current_weather=true', { signal: AbortSignal.timeout(6000) });
    if (r.ok) {
      const j = await r.json();
      const code = j.current_weather.weathercode;
      const wx = code <= 1 ? 'clear' : code <= 48 ? 'cloudy' : code <= 67 ? 'rain' : 'front';
      world.weather = wx;
      world.realWeather = true;   // 真实天气锁定，禁用随机天气机
      const names = { clear: '晴', cloudy: '多云', rain: '雨', front: '雷雨' };
      ui.toast(`已同步武汉实时天气：${names[wx]}（时间与真实同步）`, 'info');
    }
  } catch (e) { /* 网络不可用则维持游戏内天气机 */ }
}
syncWuhan();
// 启动数据校验：钓点权重引用的鱼种必须存在于鱼种库
for (const s of SPOTS) {
  for (const k of Object.keys(s.weights)) {
    if (k !== 'default' && !SPECIES_BY_ID[k]) console.warn(`[数据校验] 钓点 ${s.id} 引用了不存在的鱼种 ID：${k}`);
  }
}
// 离开/刷新页面时兜底保存（渔护、金钱等均已入档）
addEventListener('pagehide', () => { if (S.phase !== 'title') state.save(); });
// ===== 主循环 =====
const clock = new THREE.Clock();
let t = 0;
const _fw = new THREE.Vector3(), _tip = new THREE.Vector3();

function frame() {
  if (graphicsStopped) return;
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  t += dt;
  S.gt += dt;

  world.update(dt);

  if (S.phase === 'title') {
    // 标题环绕镜头
    const a = t * 0.06;
    camera.position.set(63 + Math.cos(a) * 150, 30, 25 + Math.sin(a) * 150);
    camera.lookAt(63, 0, 25);
    fishMan.update(dt, t, camera);
    water.update(t, world.waveAmp, world.skyColor, world.sunDir, world.sunColor, world.sun.intensity, world.nightFactor);
    input.endFrame();
    renderer.render(scene, camera);
    return;
  }

  const panelOpen = ui.panelOpen;
  const catchOpen = S.phase === 'catch';
  const playing = !panelOpen && !catchOpen;
  const locked = input.locked;
  const reelingNow = input.isDown('RMB') && !panelOpen && !catchOpen && (S.phase === 'fight' || S.phase === 'lureWait');
  const eq = state.data.equipped;
  const st = rodStats();

  // 玩家更新（视角总是允许；移动仅 idle 或船上作钓时——后者不得划离漂/饵超过线长）
  player.setFishingState(S.phase, reelingNow);
  const anchor = S.phase === 'floatWait' && floatS.active ? floatS.pos
    : S.phase === 'lureWait' && lureS.active ? lureS.pos : null;
  let allowMove = playing && (S.phase === 'idle' || (player.onBoat && !!anchor));
  if (allowMove && anchor && Math.hypot(player.pos.x - anchor.x, player.pos.z - anchor.z) > st.lineLen + 1.5) allowMove = false;
  player.update(dt, input, allowMove);
  player.rodTipWorld(_tip);
  // Q/E 左右转向（持续按住）
  if (playing) {
    if (input.isDown('KeyQ')) player.yaw += 1.7 * dt;
    if (input.isDown('KeyE')) player.yaw -= 1.7 * dt;
    // 竿角三档（3 低 / 4 中 / 5 高）
    if (input.justDown('Digit3')) { player.rodPitch = 0.26; ui.toast('竿角：低（抛近，风线低伏）', 'info'); }
    else if (input.justDown('Digit4')) { player.rodPitch = 0.61; ui.toast('竿角：中（标准抛距）', 'info'); }
    else if (input.justDown('Digit5')) { player.rodPitch = 1.05; ui.toast('竿角：高（钓草头/荡送）', 'info'); }
  }

  // ===== 阶段逻辑 =====
  if (playing) {
    // 面板热键（不占用钓鱼状态）
    if (input.justDown('Tab')) ui.toggle('dex');
    else if (input.justDown('KeyM') && S.phase !== 'title') ui.toggle('map');
    else if (input.justDown('KeyB')) ui.toggle('shop');
    else if (input.justDown('KeyC')) ui.toggle('album');
    else if (input.justDown('KeyJ')) ui.toggle('achv');
    else if (input.justDown('KeyN')) ui.toggle('bag');
    else if (input.justDown('KeyH')) ui.toggle('help');
    else if (input.justDown('KeyV') && S.phase !== 'title') {
      player.setView(player.view === 'first' ? 'third' : 'first');
      S.underCam = false;
      player.setUnderwater(false);
      ui.underwater(false);
      ui.toast(player.view === 'third' ? '\u7b2c\u4e09\u4eba\u79f0\u89c6\u89d2' : '\u7b2c\u4e00\u4eba\u79f0\u89c6\u89d2', 'info');
    }

    if (input.justDown('KeyT') && S.phase === 'idle') {
      const r = player.toggleBoat();
      if (r === 'on') ui.toast('上船！WASD 划到水里任意位置下竿', 'good');
      else if (r === 'off') ui.toast('已靠岸下船', 'info');
      else if (r === 'deep') ui.toast('水太深无法下船，划到岸边浅水再按 T', 'bad');
      else ui.toast('面前没有可上船的水面，面向水边再按 T', 'bad');
    }
    if (S.phase === 'idle') {
      if (input.justDown('Digit1')) setMode('float');
      else if (input.justDown('Digit2')) setMode('lure');
      else if (input.justDown('KeyZ') || input.justDown('KeyX')) cycleBait(input.justDown('KeyX') ? 1 : -1);
      else if (input.justDown('KeyG')) dropChum();
      else if (input.justDown('KeyU')) {
        audio.setMuted(!audio.muted);
        ui.toast(audio.muted ? '🔇 已静音（U 恢复）' : '🔊 声音开启', 'info');
      }
      if (input.justDown('LMB') && locked) {
        const eq = state.data.equipped;
        if (S.mode === 'float') {
          if (!state.data.baits[eq.bait]) { ui.toast('没有饵了！按 B 打开商店买饵', 'bad'); }
          else { S.phase = 'charging'; S.charge = 0; S.chargeDir = 1; }
        } else {
          S.phase = 'charging'; S.charge = 0; S.chargeDir = 1;
        }
      }
    } else if (S.phase === 'charging') {
      S.charge += S.chargeDir * dt * 0.85;
      if (S.charge >= 1) { S.charge = 1; S.chargeDir = -1; }
      if (S.charge <= 0) { S.charge = 0; S.chargeDir = 1; }
      ui.setCharge(S.charge);
      if (input.justDown('LMU')) {
        ui.setCharge(null);
        doCast(S.charge);
      }
    } else if (S.phase === 'flying') {
      // 弹道更新在下方统一执行
    } else if (S.phase === 'floatWait') {
      if (input.wheel) {
        floatS.setDepth(floatS.depth + input.wheel * 0.25);
      }
      if (input.justDown('KeyI')) {
        if (player.view !== 'first') player.setView('first');
        S.underCam = !S.underCam;
        player.setUnderwater(S.underCam);
        ui.underwater(S.underCam);
      }
      if (input.justDown('KeyR')) { ui.toast('收竿回岸', 'info'); resetSessions(); }
      if (input.justDown('LMB') && locked) {
        const res = floatS.strike();
        if (res === 'empty') { /* 乱提竿，无事发生 */ ui.toast('提前了……漂还没动呢', 'info'); }
        else if (res === null) { consumeBaitAfterEvent(); }
        else if (res) beginFight(res, floatS.pos);
      }
    } else if (S.phase === 'lureWait') {
      if (input.wheel) lureS.speedIdx = clamp(lureS.speedIdx - input.wheel, 0, 4);
      if (input.justDown('KeyR')) { lureS.end(); S.phase = 'idle'; ui.toast('收回拟饵', 'info'); }
      if (input.justDown('LMB') && locked) {
        const res = lureS.strike();
        if (res === 'empty') ui.toast('没有攻击，收线再等等', 'info');
        else if (res === null) { /* miss handled */ }
        else beginFight(res, lureS.pos);
      }
    } else if (S.phase === 'fight') {
      if (input.justDown('KeyF')) {
        if (S.fight.land()) player.triggerAction('land');
        else ui.toast('还不到抄鱼时机！先把鱼遛乏', 'info');
      }
    }
  } else if (panelOpen) {
    // 面板内：Esc 或同键关闭，按其他面板键直接切换
    const pk = input.justDown('Tab') ? 'dex' : input.justDown('KeyM') ? 'map'
      : input.justDown('KeyB') ? 'shop' : input.justDown('KeyC') ? 'album'
      : input.justDown('KeyJ') ? 'achv' : input.justDown('KeyN') ? 'bag'
      : input.justDown('KeyH') ? 'help' : null;
    if (input.justDown('Escape')) ui.closePanel();
    else if (pk) { if (ui.panel === pk) ui.closePanel(); else ui.openPanel(pk); }
  }

  // ===== 会话更新 =====
  // 面板打开时作钓会话整体暂停（等口/刺鱼窗口/遛鱼计时冻结），环境动画继续
  const sessionPaused = panelOpen;
  const waveAmp = world.waveAmp;

  // 天气 → 雨声
  if (world.weather !== lastWeather) {
    lastWeather = world.weather;
    audio.setRain(world.weather === 'rain');
  }
  // 收线棘轮声
  if (reelingNow) {
    audio.reelTimer = (audio.reelTimer || 0) - dt;
    if (audio.reelTimer <= 0) { audio.reelTimer = 0.17; audio.reelTick(); }
  }

  if (S.phase === 'flying') {
    caster.update(dt, t, _tip, waveAmp);
  }
  if (S.phase === 'floatWait' && floatS.active && !sessionPaused) {
    const zone = terrain.zoneAt(floatS.pos.x, floatS.pos.z);
    floatS.update(dt, t, {
      zone,
      depthRatio: floatS.depthRatio(),
      baitId: eq.bait,
      gearScore: st.score,
      spot: spotAt(floatS.pos.x, floatS.pos.z),
      chum: inChumZone(floatS.pos),
      protOK: true,
      biteRate: world.biteFactor * (inChumZone(floatS.pos) ? 1.5 : 1),
    }, _tip, waveAmp);
  }
  if (S.phase === 'lureWait' && lureS.active && !sessionPaused) {
    lureS.update(dt, t, {
      reeling: input.isDown('RMB') && !panelOpen && !catchOpen,
      twitch: input.justDown('Space') && !panelOpen,
      playerPos: player.pos,
      spot: spotAt(lureS.pos.x, lureS.pos.z),
      biteRate: world.biteFactor,
      gearScore: st.score,
    }, _tip, waveAmp);
    if (lureS.state === 'done') { lureS.end(); S.phase = 'idle'; }
  }
  if (S.phase === 'fight' && S.fight && !sessionPaused) {
    S.fight.update(dt, input.isDown('RMB') && !panelOpen && !catchOpen);
  }

  // 窝点过期
  S.chumZones = S.chumZones.filter((c) => c.until > S.gt);

  // 水下视角
  if (S.underCam && S.phase === 'floatWait' && floatS.active) {
    const hp = floatS.hookPos();
    const a = t * 0.22;
    camera.position.set(hp.x + Math.cos(a) * 2.8, Math.min(hp.y + 0.45, -0.3), hp.z + Math.sin(a) * 2.8);
    camera.lookAt(floatS.pos.x, hp.y * 0.5, floatS.pos.z);
    scene.fog.color.setHex(0x1a4638);
    scene.fog.near = 0.3; scene.fog.far = 16;
  }

  fishMan.update(dt, t, camera);
  water.update(t, waveAmp, world.skyColor, world.sunDir, world.sunColor, world.sun.intensity, world.nightFactor);

  // ===== HUD =====
  S.statTimer -= dt;
  if (S.statTimer <= 0) {
    S.statTimer = 0.5;
    const W = WEATHERS[world.weather];
    const SI = SEASON_INFO[world.season];
    const spot = controller.currentSpot();
    ui.updateStatus({ money: state.data.money, time: world.timeText, weatherIcon: W.icon, weatherName: W.name, bite: world.biteStars, seasonIcon: SI.icon, seasonName: SI.name, spotName: spot ? spot.name : '' });
  }
  updatePrompt();
  updateTackleBar();

  // 锁定提示
  document.getElementById('lock-hint').style.display =
    (playing && !locked && S.phase !== 'title') ? 'block' : 'none';

  // 定时存档 + 周期刷新武汉实时天气
  S.saveTimer -= dt;
  if (S.saveTimer <= 0) { S.saveTimer = 20; state.save(); }
  wuhanSyncTimer -= dt;
  if (wuhanSyncTimer <= 0) { wuhanSyncTimer = 600; syncWuhan(); }

  input.endFrame();
  renderer.render(scene, camera);
}

function cycleBait(dirn) {
  const eq = state.data.equipped;
  if (S.mode === 'float') {
    const ids = BAITS.map((b) => b.id);
    const withStock = ids.filter((id) => state.data.baits[id] > 0);
    const pool = withStock.length ? withStock : ids;
    const i = pool.indexOf(eq.bait);
    eq.bait = pool[(i + dirn + pool.length) % pool.length];
    state.equip('bait', eq.bait);
    if (!withStock.length) ui.toast('所有饵都用完了，快去商店（B）', 'bad');
  } else {
    const owned = state.data.owned.lures.filter((x) => typeof x === 'string' && x);
    if (owned.indexOf(eq.lure) < 0) eq.lure = owned[0] || 'spoon';
    const i = owned.indexOf(eq.lure);
    eq.lure = owned[(i + dirn + owned.length) % owned.length];
    state.equip('lure', eq.lure);
  }
}

function updatePrompt() {
  let key = S.phase + '|' + (S.mode || '') + '|' + (state.data.baits[state.data.equipped.bait] > 0)
    + '|' + (S.phase === 'lureWait' ? lureS.speedIdx : '');
  let html = '';
  if (S.phase === 'idle') {
    if (S.mode === 'float') {
      html = state.data.baits[state.data.equipped.bait] > 0
        ? '<b>左键长按蓄力抛竿</b> · WASD 走动找钓位 · G 打窝 · 1/2 切换钓法'
        : '<b class="warn">没有饵料！按 B 打开商店</b>';
    } else {
      html = `<b>左键长按抛投拟饵（${LURES.find((l) => l.id === state.data.equipped.lure).name}）</b> · Z/X 换饵 · 1/2 切换钓法`;
    }
  } else if (S.phase === 'charging') html = '蓄力中……<b>松开左键抛出</b>';
  else if (S.phase === 'flying') html = '……';
  else if (S.phase === 'floatWait') {
    const bottom = floatS.isBottom ? ' · 钓底' : '';
    html = `<b>滚轮调漂</b> · 漂相一出<b>左键起竿</b> · I 潜水看鱼 · R 收竿`;
    ui.setDepthInfo(`钓深 ${floatS.depth.toFixed(1)}m / 水深 ${floatS.waterDepth.toFixed(1)}m${bottom}`);
  } else if (S.phase === 'lureWait') {
    html = `<b>右键收线</b>（滚轮变速 ${['慢', '中慢', '中', '中快', '快'][lureS.speedIdx]}） · 空格抽竿 · 攻击时<b>左键刺鱼</b> · R 收回`;
    ui.setDepthInfo(`拟饵：${LURES.find((l) => l.id === lureS.lureId)?.name || ''} · ${['水面', '上层', '中层', '底层'][lureS.lureDef?.depth ?? 2]}搜索`);
  } else if (S.phase === 'fight') html = '<b>右键收线</b> · 张力过高<b>松手放线</b> · 鱼乏靠岸按 <b>F 抄鱼</b>';
  else if (S.phase === 'catch') html = '';
  if (S.phase !== 'floatWait' && S.phase !== 'lureWait') ui.setDepthInfo('');
  if (key !== S.promptKey) { S.promptKey = key; ui.setPrompt(html); }
}

function updateTackleBar() {
  const eq = state.data.equipped;
  const bait = BAITS.find((b) => b.id === eq.bait);
  const lure = LURES.find((l) => l.id === eq.lure);
  const st = rodStats();
  const cfg = {
    mode: S.mode,
    baitName: bait ? bait.name : '—',
    baitCount: state.data.baits[eq.bait] || 0,
    lureName: lure ? lure.name : '—',
    chumCount: state.data.chum,
    rodLen: st.rod.len,
    lineLen: st.lineLen,
  };
  const key = JSON.stringify(cfg);
  if (key !== S.tackleKey) { S.tackleKey = key; ui.setTackle(cfg); }
}

// 调试/测试接口（不影响正常玩法）
window.__game = {
  S, state, ui, world, player, fishMan, floatS, lureS, cards, caster, input,
  doCast, beginFight, resolveCatch, resetSessions, SPECIES_BY_ID,
};

frame();
}
