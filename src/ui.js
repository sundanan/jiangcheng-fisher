// 全部 DOM UI：HUD、面板（图鉴/卡册/成就/商店/渔护/帮助）、开卡动画
import { SPECIES, GROUPS, RARITY, LAYERS, speciesByGroup, SPECIES_BY_ID, seasonPrefName } from './fishData.js?v=17';
import { RODS, LURE_RODS, LINES, REELS, LURE_REELS, FLOATS, BAITS, LURES, CHUM } from './tackleData.js?v=16';
import { GRADES, SALVAGE, UPGRADE_COST } from './cards.js?v=16';
import { SPOTS, worldToMap } from './spots.js?v=18';
import { fmtKg, fmtCm, fmtMoney } from './util.js?v=16';

const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

// 里程碑成就：check(stats, data)
const ACHIEVEMENTS = [
  { id: 'first', name: '第一竿', icon: '🎣', desc: '钓起第一条鱼', check: (s) => s.catches >= 1 },
  { id: 'ten', name: '连竿十尾', icon: '🔟', desc: '累计钓获 10 尾', check: (s) => s.catches >= 10 },
  { id: 'fifty', name: '渔翁', icon: '👴', desc: '累计钓获 50 尾', check: (s) => s.catches >= 50 },
  { id: 'hundred', name: '百鱼斩', icon: '💯', desc: '累计钓获 100 尾', check: (s) => s.catches >= 100 },
  { id: 'purple', name: '紫气东来', icon: '🟣', desc: '获得第一张史诗紫卡', check: (s, d) => Object.values(d.album).some((a) => a.g >= 3) },
  { id: 'orange', name: '传说之卡', icon: '🟠', desc: '获得第一张传说橙卡', check: (s, d) => Object.values(d.album).some((a) => a.g >= 4) },
  { id: 'group', name: '集卡入门', icon: '📖', desc: '集齐任意一个类群图鉴', check: (s, d) => GROUPS.some((g) => speciesByGroup(g.id).every((sp) => d.album[sp.id])) },
  { id: 'monsters3', name: '巨物猎人', icon: '🏆', desc: '钓起 3 尾巨物（≥95% 极限体型）', check: (s) => s.monsters >= 3 },
  { id: 'release5', name: '放流卫士', icon: '🛡️', desc: '放流 5 尾保护鱼', check: (s) => s.released >= 5 },
  { id: 'sturgeon', name: '长江之灵', icon: '🐋', desc: '钓到并放流中华鲟', check: (s, d) => !!d.album['zhonghuaxun'] },
  { id: 'rich', name: '富甲一方', icon: '💰', desc: '累计收入 10000 元', check: (s) => s.earned >= 10000 },
  { id: 'snap3', name: '线又断了', icon: '💔', desc: '断线 3 次（痛，但也是经历）', check: (s) => s.snapped >= 3 },
  { id: 'allfish', name: '江城图鉴大师', icon: '👑', desc: '集齐全部 64 种鱼', check: (s, d) => Object.keys(d.dex).length >= SPECIES.length },
  { id: 'orange10', name: '鎏金卡册', icon: '✨', desc: '卡册集齐 10 张橙卡', check: (s, d) => Object.values(d.album).filter((a) => a.g >= 4).length >= 10 },
];

export class UI {
  constructor(root, game) {
    this.root = root;
    this.game = game;      // 由 main 注入的控制器（提供数据与动作）
    this.panel = null;
    this.dexGroup = 'bigFour';
    this.shopTab = 'rods';
    this._photoCache = new Map(); // speciesId → 真实照片 URL | null
    this._build();
    // 鱼卡图片三级回退：本地照片包 → 维基百科 → 3D 快照
    window.__fishImgErr = (img) => {
      img.onerror = null;
      const sp = SPECIES_BY_ID[img.dataset.photoSp];
      if (!sp) return;
      this.fetchRealPhoto(sp).then((url) => {
        if (url) {
          img.onerror = () => { img.onerror = null; img.src = this.game.cards.imageOf(sp); };
          img.src = url;
        } else {
          img.src = this.game.cards.imageOf(sp);
        }
      });
    };
  }
  // 真实鱼照：中文维基百科 REST API；失败回退 3D 快照
  async fetchRealPhoto(sp) {
    if (this._photoCache.has(sp.id)) return this._photoCache.get(sp.id);
    let url = null;
    try {
      const name = sp.name.replace(/（.*）/, '');
      const r = await fetch('https://zh.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(name), { signal: AbortSignal.timeout(5000) });
      if (r.ok) {
        const j = await r.json();
        url = (j.originalimage && j.originalimage.source) || (j.thumbnail && j.thumbnail.source) || null;
      }
    } catch (e) { /* 网络不可用则保持 3D 快照 */ }
    this._photoCache.set(sp.id, url);
    return url;
  }
  fishImgHtml(sp, cls = '') {
    // 本地照片包优先（lib/photos/{id}.jpg，可运行 fetch-photos.ps1 生成），失败走 __fishImgErr 回退链
    return `<img class="${cls}" src="./lib/photos/${sp.id}.jpg" data-photo-sp="${sp.id}" loading="lazy" alt="${esc(sp.name)}" onerror="window.__fishImgErr&&window.__fishImgErr(this)">`;
  }
  _applyFishPhotos(container) {
    // 本地照片直接由 <img> 加载；此处仅给 showCatch 大图等特殊场景尝试维基在线图
    container.querySelectorAll('img[data-photo-sp]').forEach(async (img) => {
      if (img.dataset.photoSp.startsWith('!')) return;
      const sp = SPECIES_BY_ID[img.dataset.photoSp];
      if (!sp || img.dataset.stage === 'wiki') return;
    });
  }
  _build() {
    this.root.innerHTML = `
    <div id="title-screen">
      <div class="title-box">
        <div class="game-title">江城钓客</div>
        <div class="game-sub">武汉江湖 3D 垂钓模拟 · 台钓 / 路亚 · 64 种鱼</div>
        <div class="title-btns">
          <button id="btn-continue" style="display:none">继续垂钓</button>
          <button id="btn-start">开始垂钓</button>
        </div>
        <div class="title-help">
          WASD 走动 · 鼠标视角 · <b>左键长按抛竿</b> · 漂相出现时<b>左键起竿</b> · 右键收线 · 滚轮调漂/变速<br>
          台钓看漂相起竿；路亚收线诱鱼攻击。钓到保护鱼（胭脂鱼/中华鲟/长薄鳅/刀鲚）请放流！
        </div>
      </div>
    </div>
    <div id="hud" style="display:none">
      <div id="status-bar">
        <span id="st-money">¥0</span>
        <span id="st-season"></span>
        <span id="st-spot">📍</span>
        <span id="st-time">06:00</span>
        <span id="st-weather">☀️ 晴</span>
        <span id="st-bite" title="渔情指数">渔情 ★★★</span>
      </div>
      <div id="btn-bar">
        <button data-panel="map">地图 M</button>
        <button data-panel="dex">图鉴 Tab</button>
        <button data-panel="album">卡册 C</button>
        <button data-panel="achv">成就 J</button>
        <button data-panel="shop">商店 B</button>
        <button data-panel="bag">渔护 N</button>
        <button data-panel="help">帮助 H</button>
      </div>
      <div id="bite-hint"></div>
      <div id="toasts"></div>
      <div id="center-group">
        <div id="prompt"></div>
        <div id="charge-wrap"><div id="charge-bar"></div><span id="charge-text">蓄力</span></div>
        <div id="fight-wrap">
          <div class="fbar"><label>张力</label><div class="ftrack"><div id="tension-bar"></div></div></div>
          <div class="fbar"><label>耐力</label><div class="ftrack"><div id="stamina-bar"></div></div></div>
          <div id="fight-info">距离 12m</div>
        </div>
      </div>
      <div id="tackle-bar">
        <div id="mode-tabs">
          <button data-mode="float">台钓 <i>1</i></button>
          <button data-mode="lure">路亚 <i>2</i></button>
        </div>
        <div id="tackle-line1">
          <span id="tk-bait"><b>◄ Z</b> <span id="tk-bait-name">蚯蚓</span> ×<span id="tk-bait-n">10</span> <b>X ►</b></span>
          <span id="tk-chum">窝料 ×<span id="tk-chum-n">2</span> <i>(G 打窝)</i></span>
        </div>
        <div id="tk-gear"></div>
        <div id="tk-depth"></div>
      </div>
      <div id="lock-hint">点击画面锁定视角 · Esc 释放鼠标</div>
    </div>
    <div id="panel" style="display:none"><div id="panel-box"><div id="panel-head"></div><div id="panel-body"></div></div></div>
    <div id="catch-overlay" style="display:none"></div>
    <div id="underwater-tint" style="display:none"></div>
    <div id="flash"></div>`;

    this.$ = (sel) => this.root.querySelector(sel);
    this.root.querySelectorAll('#btn-bar button').forEach((b) => {
      b.onclick = () => this.game.togglePanel(b.dataset.panel);
    });
    this.$('#btn-start').onclick = () => this.game.startGame(false);
    this.$('#btn-continue').onclick = () => this.game.startGame(true);
    if (this.game.hasSave()) {
      // 有旧档：继续垂钓为主按钮，"新游戏"降次级并需二次确认（确认逻辑在 controller）
      this.$('#btn-continue').style.display = '';
      this.$('#btn-start').textContent = '新游戏';
      this.$('#btn-start').classList.add('secondary');
    }
    this.root.querySelectorAll('#mode-tabs button').forEach((b) => {
      b.onclick = () => this.game.setMode(b.dataset.mode);
    });
  }
  showHUD(v) { this.$('#hud').style.display = v ? 'block' : 'none'; this.$('#title-screen').style.display = v ? 'none' : 'flex'; }

  // 通用二次确认弹窗（返回 Promise<boolean>）
  confirmBox(html) {
    return new Promise((res) => {
      const el = document.createElement('div');
      el.className = 'confirm-mask';
      el.innerHTML = `<div class="confirm-card"><p>${html}</p>
        <div class="cf-btns"><button class="cf-yes">确认</button><button class="cf-no">取消</button></div></div>`;
      this.root.appendChild(el);
      el.querySelector('.cf-yes').onclick = () => { el.remove(); res(true); };
      el.querySelector('.cf-no').onclick = () => { el.remove(); res(false); };
    });
  }
  toast(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    this.$('#toasts').appendChild(el);
    setTimeout(() => el.classList.add('out'), 2600);
    setTimeout(() => el.remove(), 3100);
  }
  setPrompt(html) { this.$('#prompt').innerHTML = html || ''; }
  setCharge(v) {
    const w = this.$('#charge-wrap');
    if (v == null) { w.style.display = 'none'; return; }
    w.style.display = 'block';
    this.$('#charge-bar').style.width = (v * 100).toFixed(1) + '%';
    this.$('#charge-text').textContent = v > 0.85 ? '满力！' : '蓄力 ' + Math.round(v * 100) + '%';
  }
  setFight(d) {
    const w = this.$('#fight-wrap');
    if (!d) { w.style.display = 'none'; return; }
    w.style.display = 'block';
    const tb = this.$('#tension-bar');
    tb.style.width = Math.min(100, d.tension * 100) + '%';
    tb.className = d.danger ? 'danger' : d.tension > 0.75 ? 'warn' : '';
    this.$('#stamina-bar').style.width = (d.stamina * 100) + '%';
    this.$('#fight-info').innerHTML =
      `${d.surging ? '💨 <b>鱼在冲刺！松手放线！</b> · ' : ''}距离 ${d.dist.toFixed(1)}m` +
      (d.canLand ? ' · <b class="land">靠岸了！按 F 抄鱼！</b>' : '');
  }
  setDepthInfo(t) { this.$('#tk-depth').innerHTML = t || ''; }
  biteHint(t) {
    const el = this.$('#bite-hint');
    if (!t) { el.classList.remove('show'); return; }
    el.textContent = t;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }
  updateStatus(s) {
    this.$('#st-money').textContent = fmtMoney(s.money);
    this.$('#st-season').textContent = s.seasonIcon + ' ' + s.seasonName;
    this.$('#st-spot').textContent = s.spotName ? '📍' + s.spotName : '📍野钓';
    this.$('#st-time').textContent = '🕐 ' + s.time;
    this.$('#st-weather').textContent = s.weatherIcon + ' ' + s.weatherName;
    this.$('#st-bite').textContent = '渔情 ' + '★'.repeat(s.bite) + '☆'.repeat(5 - s.bite);
  }
  setTackle(cfg) {
    this.root.querySelectorAll('#mode-tabs button').forEach((b) => b.classList.toggle('active', b.dataset.mode === cfg.mode));
    const baitEl = this.$('#tk-bait');
    if (cfg.mode === 'float') {
      baitEl.style.display = '';
      this.$('#tk-bait-name').textContent = cfg.baitName;
      this.$('#tk-bait-n').textContent = cfg.baitCount;
      baitEl.classList.toggle('lack', cfg.baitCount <= 0);
    } else baitEl.style.display = cfg.lureName ? '' : 'none';
    if (cfg.mode === 'lure') {
      this.$('#tk-bait-name').textContent = cfg.lureName;
      this.$('#tk-bait-n').textContent = cfg.lureCount !== undefined ? cfg.lureCount : '∞';
      baitEl.classList.toggle('lack', false);
    }
    this.$('#tk-chum-n').textContent = cfg.chumCount;
    this.$('#tk-chum').classList.toggle('lack', cfg.chumCount <= 0);
    const gear = cfg.mode === 'float'
      ? `竿 <b>${cfg.rodLen}m</b> · 齐竿线 <b>${cfg.lineLen}m</b>`
      : `竿 <b>${cfg.rodLen}m</b> · 线杯 <b>${cfg.lineLen}m</b>`;
    this.$('#tk-gear').innerHTML = gear;
  }
  flash() {
    const f = this.$('#flash');
    f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
  }
  underwater(v) { this.$('#underwater-tint').style.display = v ? 'block' : 'none'; }

  // ===== 钓获开卡 =====
  showCatch(data, onDone) {
    const G = GRADES[data.grade];
    const release = data.release;
    const ov = this.$('#catch-overlay');
    ov.style.display = 'flex';
    document.exitPointerLock && document.exitPointerLock(); // 恢复鼠标指针，便于点击按钮
    const badges = [
      data.first ? '<span class="badge first">首获！</span>' : '',
      data.record ? '<span class="badge rec">新纪录</span>' : '',
      data.big ? '<span class="badge big">巨物</span>' : '',
      release ? '<span class="badge rel">放流纪念</span>' : '',
    ].join('');
    ov.innerHTML = `
      <div class="catch-stage">
        ${data.first ? '<div class="first-banner">🐟 新鱼种收录！图鉴 +1</div>' : ''}
        <div class="fishcard g${data.grade} ${data.big ? 'big' : ''}">
          <div class="fc-grade">${G.name}卡</div>
          <img src="./lib/photos/${data.sp.id}.jpg" data-photo-sp="${data.sp.id}" onerror="window.__fishImgErr&&window.__fishImgErr(this)" alt="">
          <div class="fc-name">${esc(data.sp.name)}</div>
          <div class="fc-latin">${esc(data.sp.latin)}</div>
          <div class="fc-stats">${fmtKg(data.weight)} · ${fmtCm(data.len)}</div>
          <div class="fc-meta">${esc(data.method)} · ${data.time}</div>
          <div class="fc-badges">${badges}</div>
        </div>
        <div class="catch-value">${release ? '🛡️ 保护鱼种 · 放流奖励 ' + fmtMoney(data.value) : '价值约 ' + fmtMoney(data.value)}</div>
        <div class="catch-btns">
          ${release
            ? '<button id="btn-release" class="big-btn">🙏 放流（必须）</button>'
            : '<button id="btn-keep" class="big-btn">收入渔护</button>'}
        </div>
      </div>`;
    this.flash();
    this._applyFishPhotos(ov);
    const close = () => { ov.style.display = 'none'; onDone(); };
    const btn = ov.querySelector(release ? '#btn-release' : '#btn-keep');
    btn.onclick = close;
  }

  // ===== 面板 =====
  openPanel(name) {
    this.panel = name;
    this.$('#panel').style.display = 'flex';
    this.renderPanel();
    document.exitPointerLock && document.exitPointerLock();
  }
  closePanel() {
    this.panel = null;
    this.$('#panel').style.display = 'none';
  }
  toggle(name) { if (this.panel === name) this.closePanel(); else this.openPanel(name); }
  get panelOpen() { return !!this.panel; }

  _map(body) {
    const cur = this.game.currentSpot ? this.game.currentSpot() : null;
    body.innerHTML = `
      <div class="map-wrap">
        <div class="map-left">
          <div id="realmap">正在加载武汉真实地图…</div>
          <div class="map-fallback" id="svgmap">${this._svgMapHtml()}</div>
        </div>
        <div class="map-list">
          ${this._mapListHtml()}
        </div>
      </div>`;
    this._bindMapList(body);
    this._tryRealMap(body, cur);
  }
  _svgMapHtml() {
    const player = this.game.playerPos ? this.game.playerPos() : { x: 0, z: 0 };
    const cur = this.game.currentSpot ? this.game.currentSpot() : null;
    const pm = worldToMap(player.x, player.z);
    const lakeBodies = [
      { cx: -150, cz: 60, rx: 150, ry: 92 },
      { cx: -95, cz: 112, rx: 120, ry: 70 },
      { cx: -40, cz: -30, rx: 105, ry: 66 },
      { cx: -160, cz: -42, rx: 92, ry: 60 },
      { cx: -15, cz: -38, rx: 70, ry: 44 },
    ].map((b) => {
      const m = worldToMap(b.cx, b.cz);
      return `<ellipse cx="${m.mx}" cy="${m.my}" rx="${b.rx / 460 * 900}" ry="${b.ry / 460 * 560}" fill="#1d4a56" stroke="#2a6070" stroke-width="1.5"/>`;
    }).join('');
    const river = 'M640,0 C670,120 630,240 665,340 C695,440 655,520 680,560 L860,560 C820,460 845,300 815,180 C795,90 815,40 800,0 Z';
    const hanjiang = 'M120,300 C220,270 330,330 450,320 C520,315 580,325 655,330';
    const labelDy = { houguan: -14, donghu: -12, fuhhe: 18, tangxun: 18, liangzi: 20 };
    const pins = SPOTS.map((s) => {
      const m = worldToMap(s.cx, s.cz);
      const on = cur && cur.id === s.id;
      return `<g class="map-pin ${on ? 'on' : ''}" data-spot="${s.id}">
        <circle cx="${m.mx}" cy="${m.my}" r="${on ? 13 : 9}"/>
        <text x="${m.mx + 14}" y="${m.my + (labelDy[s.id] || 4)}">${s.name}</text>
      </g>`;
    }).join('');
    return `
      <svg class="wuhan-map" viewBox="0 0 900 560">
        <rect width="900" height="560" fill="#1c2632"/>
        ${lakeBodies}
        <path d="${river}" fill="#20505c"/>
        <path d="${hanjiang}" stroke="#20505c" stroke-width="16" fill="none" stroke-linecap="round"/>
        <text x="742" y="80" fill="#6a8a9a" font-size="19" font-weight="700" writing-mode="vertical" letter-spacing="8">长 江</text>
        <text x="285" y="292" fill="#6a8a9a" font-size="15" font-weight="700" letter-spacing="6">汉 江</text>
        <g class="map-player"><circle cx="${pm.mx}" cy="${pm.my}" r="6"/><text x="${pm.mx + 9}" y="${pm.my - 7}">🎣你</text></g>
        ${pins}
      </svg>`;
  }
  _mapListHtml() {
    const cur = this.game.currentSpot ? this.game.currentSpot() : null;
    return SPOTS.map((s) => {
      const feats = Object.entries(s.weights).filter(([k]) => k !== 'default')
        .sort((a, b) => b[1] - a[1]).slice(0, 4)
        .map(([k, v]) => `<span class="fish-chip">${SPECIES_BY_ID[k]?.name || k}×${v}</span>`).join('');
      const on = cur && cur.id === s.id;
      return `<div class="map-spot ${on ? 'on' : ''}" data-spot="${s.id}">
        <div class="ms-head"><span class="ms-icon">${s.icon}</span><b>${s.name}</b>
          <span class="ms-zone">${s.zone === 'river' ? '江河流水' : '湖泊静水'}</span>
          ${on ? '<span class="ms-cur">● 当前</span>' : ''}</div>
        <div class="ms-desc">${esc(s.desc)}</div>
        <div class="ms-fish">${feats}<span class="fish-chip dim">其余×${s.weights.default ?? 1}</span></div>
        <div class="ms-tip">💡 ${esc(s.tip)}</div>
        <button class="ms-go" data-go="${s.id}">${on ? '再次前往' : '前往作钓'}</button>
      </div>`;
    }).join('') + `<div class="map-note">地图：高德瓦片（需联网，离线自动切换示意图）。未标注水域为野生钓位。上鱼概率 = 钓点 × 季节 × 时段 × 水层 × 饵料 连续拟合。</div>`;
  }
  _bindMapList(body) {
    body.querySelectorAll('[data-go]').forEach((b) => b.onclick = () => this.game.travel(b.dataset.go));
    body.querySelectorAll('.map-pin').forEach((g) => {
      g.style.cursor = 'pointer';
      g.onclick = () => this.game.travel(g.dataset.spot);
    });
  }
  async _tryRealMap(body, cur) {
    const realEl = body.querySelector('#realmap');
    const svgEl = body.querySelector('#svgmap');
    const fail = () => { realEl.style.display = 'none'; svgEl.style.display = 'block'; };
    try {
      if (!window.L) {
        await new Promise((res, rej) => {
          const css = document.createElement('link');
          css.rel = 'stylesheet';
          css.href = './lib/leaflet.css';
          document.head.appendChild(css);
          const s = document.createElement('script');
          s.src = './lib/leaflet.js';
          s.onload = res; s.onerror = rej;
          document.head.appendChild(s);
          setTimeout(rej, 6000);
        });
      }
      const L = window.L;
      if (this._leafletMap) { this._leafletMap.remove(); this._leafletMap = null; }
      svgEl.style.display = 'none';
      realEl.style.display = 'block';
      const map = L.map(realEl, { center: [30.53, 114.31], zoom: 10 });
      this._leafletMap = map;
      let okTiles = 0;
      const tileLayer = L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
        subdomains: '1234', maxZoom: 17, minZoom: 9, attribution: '© 高德地图',
      }).addTo(map);
      tileLayer.on('tileload', () => { okTiles++; });
      // 瓦片也连不上（全离线）→ 3.2 秒后回退示意图
      setTimeout(() => { if (okTiles < 2) fail(); }, 3200);
      for (const s of SPOTS) {
        const on = cur && cur.id === s.id;
        const icon = L.divIcon({
          className: '',
          html: `<div class="real-pin ${on ? 'on' : ''}"><span class="rp-dot"></span><span class="rp-name">${s.icon}${s.name}</span></div>`,
          iconSize: [0, 0],
        });
        L.marker([s.lat, s.lng], { icon }).on('click', () => this.game.travel(s.id)).addTo(map);
      }
      // 玩家位置（世界坐标 → 经纬度线性映射，示意）
      const p = this.game.playerPos ? this.game.playerPos() : { x: 0, z: 0 };
      const plng = 113.95 + (p.x + 230) / 460 * 0.7;
      const plat = 30.75 - (p.z + 230) / 460 * 0.5;
      const pIcon = L.divIcon({ className: '', html: `<div class="real-player">🎣你</div>`, iconSize: [0, 0] });
      L.marker([plat, plng], { icon: pIcon, zIndexOffset: 900 }).addTo(map);
      setTimeout(() => map.invalidateSize(), 80);
    } catch (e) { fail(); }
  }

  renderPanel() {
    const head = this.$('#panel-head'), body = this.$('#panel-body');
    const titles = { map: '🗺️ 钓鱼地图 · 武汉江湖', dex: '📖 鱼类图鉴', album: '🃏 我的卡册', achv: '🏅 成就', shop: '🛒 渔具商店', bag: '🧺 渔护（本局渔获）', help: '❓ 帮助 · 操作' };
    const pausedTag = (this.game.fishingActive && this.game.fishingActive())
      ? '<span class="paused-tag">⏸ 作钓已暂停，关闭面板继续</span>' : '';
    head.innerHTML = `<span>${titles[this.panel]}${pausedTag}</span><button id="panel-close">✕ 关闭 (Esc)</button>`;
    head.querySelector('#panel-close').onclick = () => this.closePanel();
    if (this.panel === 'map') this._map(body);
    else if (this.panel === 'dex') this._dex(body);
    else if (this.panel === 'album') this._album(body);
    else if (this.panel === 'achv') this._achv(body);
    else if (this.panel === 'shop') this._shop(body);
    else if (this.panel === 'bag') this._bag(body);
    else this._help(body);
    this._applyFishPhotos(body);
  }

  _miniCard(sp, opts = {}) {
    const dex = this.game.state.data.dex[sp.id];
    const got = !!dex;
    const R = RARITY[sp.rarity];
    if (!got) {
      return `<div class="mini-card locked" title="${esc(sp.name)}">
        <div class="mc-img">🐟</div>
        <div class="mc-name">？？？</div>
        <div class="mc-sub">${R.name}</div>
      </div>`;
    }
    const album = this.game.state.data.album[sp.id];
    const g = album ? Math.min(album.g, 4) : 1;
    return `<div class="mini-card g${g}" data-sp="${sp.id}" title="${esc(sp.name)} ${esc(sp.desc)}">
      <div class="mc-grade">${GRADES[g].name}</div>
      ${this.fishImgHtml(sp)}
      <div class="mc-name">${esc(sp.name)}</div>
      <div class="mc-sub">最大 ${fmtKg(dex.bw)} ×${dex.n}</div>
    </div>`;
  }
  _dex(body) {
    const dex = this.game.state.data.dex;
    const total = SPECIES.length, got = Object.keys(dex).length;
    const g = GROUPS.find((x) => x.id === this.dexGroup);
    const list = speciesByGroup(this.dexGroup);
    const gotN = list.filter((s) => dex[s.id]).length;
    const complete = gotN === list.length;
    const claimed = this.game.state.data.groupsClaimed.includes(this.dexGroup);
    body.innerHTML = `
      <div class="dex-wrap">
        <div class="dex-side">
          <div class="dex-total">收录 ${got} / ${total}</div>
          ${GROUPS.map((gr) => {
            const n = speciesByGroup(gr.id).filter((s) => dex[s.id]).length;
            const tot = speciesByGroup(gr.id).length;
            return `<div class="dex-g ${gr.id === this.dexGroup ? 'on' : ''}" data-g="${gr.id}">
              <span>${gr.icon} ${gr.name}</span><span class="dex-p">${n}/${tot}</span></div>`;
          }).join('')}
        </div>
        <div class="dex-main">
          <div class="dex-head">
            <b>${g.icon} ${g.name}</b>
            <span>${gotN}/${list.length}</span>
            ${complete && !claimed ? `<button id="btn-claim" data-gid="${g.id}">领取集齐奖励 ${fmtMoney(g.reward)}</button>` : ''}
            ${complete && claimed ? '<span class="claimed">✅ 已集齐</span>' : ''}
          </div>
          <div class="card-grid">${list.map((s) => this._miniCard(s)).join('')}</div>
          <div class="dex-tip">鱼种简介：点击卡片查看详情</div>
        </div>
      </div>`;
    body.querySelectorAll('.dex-g').forEach((el) => {
      el.onclick = () => { this.dexGroup = el.dataset.g; this.renderPanel(); };
    });
    const claim = body.querySelector('#btn-claim');
    if (claim) claim.onclick = () => this.game.claimGroup(claim.dataset.gid);
    body.querySelectorAll('.mini-card[data-sp]').forEach((el) => {
      el.onclick = () => this._detail(SPECIES_BY_ID[el.dataset.sp]);
    });
  }
  _detail(sp) {
    const dex = this.game.state.data.dex[sp.id];
    const R = RARITY[sp.rarity];
    const zoneNames = sp.zones.map((z) => (z === 'lake' ? '湖泊' : '江河')).join('、');
    const baitNames = Object.keys(sp.baits).map((b) => BAITS.find((x) => x.id === b)?.name).filter(Boolean).join('、');
    const lureNames = Object.keys(sp.lures).map((b) => LURES.find((x) => x.id === b)?.name).filter(Boolean).join('、');
    const gVal = dex ? Math.min(this.game.state.data.album[sp.id]?.g || 1, 4) : 1;
    const html = `
      <div class="detail-box">
        <div class="detail-card g${gVal}">
          ${this.fishImgHtml(sp)}
          <div>${esc(sp.name)}</div>
        </div>
        <div class="detail-info">
          <h3>${esc(sp.name)} <small>${esc(sp.latin)}</small></h3>
          <p>${esc(sp.desc)}</p>
          <table>
            <tr><td>稀有度</td><td style="color:${R.color}">${R.name}</td><td>水域</td><td>${zoneNames}</td></tr>
            <tr><td>水层</td><td>${LAYERS[sp.layer]}</td><td>体重范围</td><td>${fmtKg(sp.w[0])} ~ ${fmtKg(sp.w[1])}</td></tr>
            <tr><td>季节</td><td>${seasonPrefName(sp)}</td><td>最佳时段</td><td>${sp.hours.map(h => ({ dawn: '晨', day: '昼', dusk: '暮', night: '夜' }[h])).join('/')}（其他时段口轻）</td></tr>
            <tr><td>台钓用饵</td><td>${baitNames || '—（掠食鱼，请用路亚）'}</td><td>路亚拟饵</td><td>${lureNames || '—'}</td></tr>
            ${dex ? `<tr><td>个人纪录</td><td>${fmtKg(dex.bw)} · ${fmtCm(dex.bl)}</td><td>累计</td><td>${dex.n} 尾</td></tr>` : '<tr><td colspan="4" style="color:#888">尚未钓获 —— 保持钓获即可点亮图鉴</td></tr>'}
            ${sp.prot ? '<tr><td colspan="4" style="color:#e08030">🛡️ 保护鱼种：钓获必须放流，放流有奖励与纪念卡</td></tr>' : ''}
          </table>
          <button id="detail-back">← 返回</button>
        </div>
      </div>`;
    const body = this.$('#panel-body');
    body.innerHTML = html;
    body.querySelector('#detail-back').onclick = () => this.renderPanel();
  }
  _album(body) {
    const st = this.game.state.data;
    const album = st.album;
    const ids = Object.keys(album);
    body.innerHTML = `
      <div class="album-head">
        <span>🃏 卡册 <b>${ids.length}</b> 种 · 每种保留最佳卡 · 白→蓝→紫→橙</span>
        <span class="shard-box">💠 鱼珠 <b>${st.shards}</b></span>
      </div>
      <div class="album-tip">钓到重复且未破纪录的卡会<b>自动分解成鱼珠</b>；鱼珠可把卡册中的卡<b>合成升档</b>，也可手动分解换珠。</div>
      <div class="card-grid big">
        ${GROUPS.map((g) => {
          const got = speciesByGroup(g.id).filter((s) => album[s.id]);
          if (!got.length) return '';
          return `<div class="album-group"><div class="album-gtitle">${g.icon} ${g.name}</div>
            <div class="card-grid">${got.map((s) => {
              const a = album[s.id];
              const g4 = Math.min(a.g, 4);
              return `<div class="mini-card g${g4}">
                <div class="mc-grade">${GRADES[g4].name}${a.big ? ' · 巨物' : ''}</div>
                ${this.fishImgHtml(s)}
                <div class="mc-name">${esc(s.name)}</div>
                <div class="mc-sub">${fmtKg(a.w)}</div>
                <div class="mc-btns">
                  <button class="card-btn sal" data-sal="${s.id}" title="分解得 ${SALVAGE[g4]} 鱼珠">分解+${SALVAGE[g4]}💠</button>
                  ${g4 < 4 ? `<button class="card-btn up" data-up="${s.id}" title="消耗 ${UPGRADE_COST[g4]} 鱼珠升档">升级-${UPGRADE_COST[g4]}💠</button>` : '<span class="card-btn max">MAX</span>'}
                </div>
              </div>`;
            }).join('')}</div></div>`;
        }).join('') || '<div class="empty-tip">还没有卡片，去钓第一条鱼吧！</div>'}
      </div>`;
    body.querySelectorAll('[data-sal]').forEach((b) => b.onclick = () => this.game.salvage(b.dataset.sal));
    body.querySelectorAll('[data-up]').forEach((b) => b.onclick = () => this.game.upgrade(b.dataset.up));
  }

  _achv(body) {
    const st = this.game.state.data;
    const done = ACHIEVEMENTS.filter((a) => st.achv.includes(a.id)).length;
    body.innerHTML = `
      <div class="achv-head">🏅 成就 <b>${done}</b> / ${ACHIEVEMENTS.length} · 💠 鱼珠 <b>${st.shards}</b></div>
      <div class="achv-grid">
        ${ACHIEVEMENTS.map((a) => {
          const got = st.achv.includes(a.id);
          return `<div class="achv-badge ${got ? 'on' : ''}">
            <div class="ab-icon">${got ? a.icon : '🔒'}</div>
            <div class="ab-name">${esc(a.name)}</div>
            <div class="ab-desc">${esc(a.desc)}</div>
          </div>`;
        }).join('')}
      </div>
      <div class="achv-fish-title">📊 鱼种成就 · 集卡与单尾纪录</div>
      <div class="achv-fish">
        ${GROUPS.map((g) => {
          const list = speciesByGroup(g.id);
          const gotN = list.filter((s) => st.album[s.id]).length;
          return `<div class="achv-group">
            <div class="album-gtitle">${g.icon} ${g.name} <span class="dex-p">${gotN}/${list.length}</span></div>
            <table class="achv-tb">
              ${list.map((s) => {
                const a = st.album[s.id], d = st.dex[s.id];
                const gz = a ? Math.min(a.g, 4) : 0;
                return `<tr class="${a ? '' : 'none'}">
                  <td>${esc(s.name)}</td>
                  <td>${a ? `<span class="card-tag g${gz}t">${GRADES[gz].name}</span>` : '<span class="nocard">未集卡</span>'}</td>
                  <td>${d ? `单尾最大 ${fmtKg(d.bw)}` : '—'}</td>
                </tr>`;
              }).join('')}
            </table>
          </div>`;
        }).join('')}
      </div>`;
  }
  // 成就检查（main 在钓获/结算后调用），返回新达成的成就
  checkAchievements() {
    const st = this.game.state.data;
    const fresh = [];
    for (const a of ACHIEVEMENTS) {
      if (st.achv.includes(a.id)) continue;
      if (a.check(st.stats, st)) {
        st.achv.push(a.id);
        fresh.push(a);
      }
    }
    if (fresh.length) this.game.state.save();
    return fresh;
  }
  _shop(body) {
    const st = this.game.state.data;
    const eq = st.equipped;
    const ownedChk = (list, arr) => list.map((item) => ({ ...item, owned: arr.includes(item.id) }));
    const TABS = [
      ['rods', '台钓竿'], ['lureRods', '路亚竿'], ['lines', '鱼线'], ['reels', '台钓轮'],
      ['lureReels', '路亚轮'], ['floats', '浮漂'], ['lures', '拟饵'], ['baits', '饵料窝料'],
    ];
    const tabsHtml = TABS.map(([id, name]) => `<button data-tab="${id}" class="${this.shopTab === id ? 'on' : ''}">${name}</button>`).join('');
    let rows = '';
    const row = (o, kind, label, extra = '') => `
      <div class="shop-row">
        <div class="sr-info"><b>${esc(o.name)}</b><span>${esc(o.desc || '')}</span>${extra}</div>
        <div class="sr-act">${o.owned
          ? (eq[kind] === o.id ? '<span class="equipped">使用中</span>' : `<button data-eq="${kind}" data-id="${o.id}">装备</button>`)
          : `<button data-buy="${kind}" data-id="${o.id}" data-price="${o.price}">${fmtMoney(o.price)} 购买</button>`}</div>
      </div>`;
    const t = this.shopTab;
    if (t === 'rods') rows = ownedChk(RODS, st.owned.rods).map((o) => row(o, 'rod', '', `<span class="sr-len">竿长 ${o.len} 米 · 齐竿线 ${(o.len + 0.4).toFixed(1)} 米</span>`)).join('');
    else if (t === 'lureRods') rows = ownedChk(LURE_RODS, st.owned.lureRods).map((o) => row(o, 'lureRod', '', `<span class="sr-len">竿长 ${o.len} 米 · 抛距上限 ${o.cast} 米</span>`)).join('');
    else if (t === 'lines') rows = ownedChk(LINES, st.owned.lines).map((o) => row(o, 'line', '', `<span class="sr-len">拉力 ${o.strength}kg · 线杯 ${o.len}m${o.owned && eq.line !== o.id ? `（当前 ${LINES[eq.line].strength}kg）` : ''}</span>`)).join('');
    else if (t === 'reels') rows = ownedChk(REELS, st.owned.reels).map((o) => row(o, 'reel')).join('');
    else if (t === 'lureReels') rows = ownedChk(LURE_REELS, st.owned.lureReels).map((o) => row(o, 'lureReel')).join('');
    else if (t === 'floats') rows = ownedChk(FLOATS, st.owned.floats).map((o) => row(o, 'float')).join('');
    else if (t === 'lures') rows = LURES.map((o) => {
      const owned = st.owned.lures.includes(o.id);
      return `<div class="shop-row">
        <div class="sr-info"><b>${esc(o.name)}</b><span>${esc(o.desc)}</span></div>
        <div class="sr-act">${owned
          ? (eq.lure === o.id ? '<span class="equipped">挂饵中</span>' : `<button data-eq="lure" data-id="${o.id}">换上</button>`)
          : `<button data-buy="lure" data-id="${o.id}" data-price="${o.price}">${fmtMoney(o.price)} 购买</button>`}</div>
      </div>`;
    }).join('');
    else {
      rows = BAITS.map((b) => `
        <div class="shop-row">
          <div class="sr-info"><b>${esc(b.name)}</b><span>${esc(b.desc)} · 持有 ${st.baits[b.id] || 0}</span></div>
          <div class="sr-act"><button data-bait="${b.id}" data-price="${b.price}">${fmtMoney(b.price)} ×10</button></div>
        </div>`).join('') + `
        <div class="shop-row">
          <div class="sr-info"><b>${CHUM.name}</b><span>打入窝点聚鱼 ${CHUM.duration}s · 持有 ${st.chum}</span></div>
          <div class="sr-act"><button data-chum="1" data-price="${CHUM.price}">${fmtMoney(CHUM.price)} ×3</button></div>
        </div>`;
    }
    body.innerHTML = `
      <div class="shop-tabs">${tabsHtml}</div>
      <div class="shop-money">余额 <b>${fmtMoney(st.money)}</b></div>
      <div class="shop-list">${rows}</div>`;
    body.querySelectorAll('.shop-tabs button').forEach((b) => b.onclick = () => { this.shopTab = b.dataset.tab; this.renderPanel(); });
    body.querySelectorAll('[data-buy]').forEach((b) => b.onclick = () => this.game.buy(b.dataset.buy, b.dataset.id, +b.dataset.price));
    body.querySelectorAll('[data-eq]').forEach((b) => b.onclick = () => this.game.equip(b.dataset.eq, isNaN(+b.dataset.id) ? b.dataset.id : +b.dataset.id));
    body.querySelectorAll('[data-bait]').forEach((b) => b.onclick = () => this.game.buyBait(b.dataset.bait, +b.dataset.price));
    const cc = body.querySelector('[data-chum]');
    if (cc) cc.onclick = () => this.game.buyChum(+cc.dataset.price);
  }
  _bag(body) {
    const bag = this.game.bag;
    const total = bag.reduce((s, c) => s + c.value, 0);
    body.innerHTML = `
      <div class="bag-head">本局渔获 <b>${bag.length}</b> 尾 · 总价值 <b>${fmtMoney(total)}</b>
        <button id="bag-sell" ${bag.length ? '' : 'disabled'}>全部出售</button>
        <button id="bag-clear" ${bag.length ? '' : 'disabled'}>放生全部(不计奖励)</button>
      </div>
      <div class="bag-list">
        ${bag.length ? bag.slice().reverse().map((c) => `
          <div class="bag-row">
            <img src="${c.img}">
            <span class="br-name">${esc(c.sp.name)}${c.big ? ' 🏆' : ''}</span>
            <span>${fmtKg(c.weight)}</span>
            <span class="br-val">${fmtMoney(c.value)}</span>
          </div>`).join('') : '<div class="empty-tip">渔护空空如也……空军也是钓鱼的一部分</div>'}
      </div>`;
    const sell = body.querySelector('#bag-sell');
    if (sell && bag.length) sell.onclick = () => this.game.sellBag();
    const cl = body.querySelector('#bag-clear');
    if (cl && bag.length) cl.onclick = () => this.game.clearBag();
  }
  _help(body) {
    body.innerHTML = `
      <div class="help-cols">
        <div>
          <h3>🎣 基本操作</h3>
          <table class="help-tb">
            <tr><td>WASD / Shift</td><td>走动 / 跑</td></tr>
            <tr><td>Q / E</td><td>左 / 右转向</td></tr>
            <tr><td>Z / X</td><td>换饵 / 换拟饵（前一个 / 后一个）</td></tr>
            <tr><td>鼠标</td><td>视角（点击画面锁定）</td></tr>
            <tr><td>Esc</td><td>释放鼠标 / 关闭面板</td></tr>
            <tr><td>左键长按→松开</td><td>蓄力抛竿</td></tr>
            <tr><td>左键（漂相/攻击时）</td><td>起竿刺鱼</td></tr>
            <tr><td>右键</td><td>收线（路亚/遛鱼）</td></tr>
            <tr><td>滚轮</td><td>台钓调漂深 / 路亚收线速度</td></tr>
            <tr><td>空格</td><td>路亚抽竿（跳停诱鱼）</td></tr>
            <tr><td>F</td><td>抄鱼入护（鱼靠岸提示时）</td></tr>
            <tr><td>1 / 2</td><td>台钓 / 路亚</td></tr>
            <tr><td>3 / 4 / 5</td><td>竿角三档：低 / 中 / 高（决定抛距与风线高度）</td></tr>
            <tr><td>T</td><td>上船 / 下船（船钓：划到水里任意位置下竿）</td></tr>
            <tr><td>G</td><td>朝瞄准处打窝（聚鱼）</td></tr>
            <tr><td>V</td><td>第一 / 第三人称视角切换</td></tr><tr><td>I</td><td>台钓等待时：潜入水下看鱼</td></tr>
            <tr><td>R</td><td>收竿回岸</td></tr>
            <tr><td>M</td><td>钓鱼地图 · 八大钓点传送</td></tr>
            <tr><td>U</td><td>静音开关</td></tr>
            <tr><td>Tab/B/C/N/J/H</td><td>图鉴/商店/卡册/渔护/成就/帮助</td></tr>
          </table>
        </div>
        <div>
          <h3>💡 钓鱼要诀</h3>
          <ul class="help-ul">
            <li><b>台钓</b>：调好钓深（滚轮）→ 抛竿 → 等<b>漂相</b>。顶漂/顿口/黑漂/走漂都是真口，窗口只有约 1 秒；漂轻微抖动多是小白条闹窝。蚯蚓钓黄颡鲫鱼，玉米钓鲤草，拉饵钓浅可上鲢鳙。</li>
            <li><b>路亚</b>：拟饵决定水层与对象鱼。翘嘴鳡鱼爱快收，鳜鱼鲶鱼要慢拖+空格抽停，黑鱼用雷蛙打水面。攻击窗口极短，看到"一口！"立即左键。</li>
            <li><b>遛鱼</b>：张力条快满时<b>松开右键放线</b>，鱼不冲时再收。耐力耗尽、距离 2.4m 内按 F 抄鱼。线越粗（拉力 kg 越高）越耐拉，线断=跑鱼，好线是保命符。</li>
            <li><b>渔情</b>：清晨黄昏 ★★★★★，雨前鱼开口；打窝聚鱼提口。<b>四季鱼情</b>：春钓滩（鲫鲤产卵爆发）、夏钓早晚（高温鱼活跃）、秋钓深（黄金季鳊鲂肥）、冬口轻（主钓鲫鳜）。稀有大物需要装备分达标。</li>
            <li><b>集卡</b>：四档按固定概率掉落——<b>橙 1% / 紫 5% / 蓝 30% / 白 64%</b>，同一种鱼四色卡都可能出；钓到重复未破纪录的卡自动分解成<b>鱼珠</b>，鱼珠可在卡册里把心仪的卡<b>合成升档</b>。</li>
            <li><b>装备差异</b>：<b>台钓</b>默认 5.4 米竿配齐竿线 5.8 米（最远抛距≈竿+线，长竿才抛得远）；<b>路亚</b>默认 1.98 米短竿配 30 米线杯（抛距受竿调性与线杯长度共同限制）。切换钓法（1/2）时手持竿会随之更换。</li>
            <li><b>放流</b>：胭脂鱼、中华鲟、长薄鳅是国家保护动物，刀鲚长江禁渔禁捕，钓到都必须放流，奖励丰厚还有专属橙卡纪念。</li>
          </ul>
        </div>
      </div>`;
  }
}
