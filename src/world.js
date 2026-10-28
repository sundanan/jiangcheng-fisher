// 天空、昼夜循环、天气系统、雨
import * as THREE from '../lib/three.module.js';
import { clamp, lerp, rand, choice } from './util.js?v=16';
import { periodOf, SEASON_BITE } from './fishData.js?v=17';

// 昼夜颜色关键帧 [小时, 天顶色, 地平线色, 阳光色, 阳光强度, 环境强度, 雾色]
const SKY_KEYS = [
  [0.0,  0x0a1026, 0x141b30, 0x8aa0c8, 0.05, 0.16, 0x0c1220],
  [5.0,  0x1a2340, 0x3a3550, 0xd8a878, 0.25, 0.28, 0x202840],
  [6.5,  0x4a6a9a, 0xe89858, 0xffc890, 0.90, 0.52, 0x8898b0],
  [9.0,  0x7ab3e8, 0xcfe4f4, 0xfff4e0, 1.25, 0.72, 0xbfd4e4],
  [15.0, 0x6aa8e0, 0xc8ddf0, 0xffeecc, 1.20, 0.70, 0xb8cee0],
  [18.0, 0x6078a8, 0xe8a060, 0xffb070, 0.80, 0.48, 0x98a0b8],
  [19.5, 0x2a3560, 0x9a5a48, 0xe89060, 0.30, 0.28, 0x3a4058],
  [21.0, 0x101830, 0x1c2440, 0x92a8d0, 0.08, 0.18, 0x141c30],
  [24.0, 0x0a1026, 0x141b30, 0x8aa0c8, 0.05, 0.16, 0x0c1220],
];

export const WEATHERS = {
  clear:  { name: '晴',   icon: '☀️', bite: 1.0,  wave: 0.07, dim: 0 },
  cloudy: { name: '多云', icon: '⛅', bite: 1.15, wave: 0.10, dim: 0.35 },
  rain:   { name: '小雨', icon: '🌧️', bite: 1.35, wave: 0.14, dim: 0.6 },
  front:  { name: '雷雨前', icon: '⛈️', bite: 1.55, wave: 0.17, dim: 0.75 },
};

const PERIOD_BITE = { dawn: 1.6, day: 1.0, dusk: 1.7, night: 0.8 };

export class World {
  constructor(scene, camera) {
    this.scene = scene; this.camera = camera;
    this.realTime = true;       // 时间全程与真实时间（北京时间）同步，季节按真实月份
    this.hour = 6.6;            // （realTime 下每帧由真实时钟覆盖）
    this.dayLength = 600;
    this.totalHours = 6.6;      // 累计小时（用于季节）
    this.daysPerSeason = 2;     // 一季 = 2 游戏天（20 分钟真实）
    this._season = null;
    this.weather = 'clear';
    this.weatherTimer = rand(90, 160);
    this.flashT = 0;

    // 天空穹顶
    this.skyU = { uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunColor: { value: new THREE.Color() } };
    const skyMat = new THREE.ShaderMaterial({
      uniforms: this.skyU, side: THREE.BackSide, depthWrite: false,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSun; uniform vec3 uSunColor;
        varying vec3 vDir;
        void main(){
          float h = clamp(vDir.y, 0.0, 1.0);
          vec3 col = mix(uHorizon, uTop, pow(h, 0.55));
          float d = max(dot(normalize(vDir), normalize(uSun)), 0.0);
          col += uSunColor * (pow(d, 400.0) * 1.2 + pow(d, 8.0) * 0.16);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(600, 24, 14), skyMat);
    scene.add(this.sky);

    // 星星
    const starPos = [];
    for (let i = 0; i < 520; i++) {
      const a = rand(0, Math.PI * 2), e = Math.acos(rand(0.05, 1));
      const r = 580;
      starPos.push(r * Math.cos(a) * Math.sin(e), r * Math.cos(e), r * Math.sin(a) * Math.sin(e));
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xcfe0ff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0 });
    this.stars = new THREE.Points(starGeo, this.starMat);
    scene.add(this.stars);

    // 光照
    this.sun = new THREE.DirectionalLight(0xffffff, 1.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -160; sc.right = 160; sc.top = 160; sc.bottom = -160; sc.far = 500;
    scene.add(this.sun); scene.add(this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xbfd8e8, 0x4a5240, 0.6);
    scene.add(this.hemi);

    // 雨（线段）
    const RAIN_N = 900;
    const rp = new Float32Array(RAIN_N * 6);
    this.rainDrops = [];
    for (let i = 0; i < RAIN_N; i++) {
      const x = rand(-30, 30), y = rand(0, 30), z = rand(-30, 30);
      rp[i * 6] = x; rp[i * 6 + 1] = y; rp[i * 6 + 2] = z;
      rp[i * 6 + 3] = x + 0.1; rp[i * 6 + 4] = y - 0.7; rp[i * 6 + 5] = z;
      this.rainDrops.push({ x, y, z });
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    this.rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xa8c8e0, transparent: true, opacity: 0.5 }));
    this.rain.visible = false;
    this.rain.frustumCulled = false;
    scene.add(this.rain);

    // 输出给水面的当前状态
    this.skyColor = new THREE.Color();
    this.sunColor = new THREE.Color();
    this.sunDir = new THREE.Vector3(0, 1, 0);
    this._c1 = new THREE.Color(); this._c2 = new THREE.Color(); this._c3 = new THREE.Color(); this._c4 = new THREE.Color();
    this.update(0);
  }
  _skyLerp(hour) {
    let k0 = SKY_KEYS[0], k1 = SKY_KEYS[SKY_KEYS.length - 1];
    for (let i = 0; i < SKY_KEYS.length - 1; i++) {
      if (hour >= SKY_KEYS[i][0] && hour <= SKY_KEYS[i + 1][0]) { k0 = SKY_KEYS[i]; k1 = SKY_KEYS[i + 1]; break; }
    }
    const t = (hour - k0[0]) / Math.max(0.001, k1[0] - k0[0]);
    return { k0, k1, t };
  }
  update(dt) {
    if (this.realTime) {
      // 与真实时间同步：从系统时钟推导武汉时间（UTC+8），季节按真实月份
      const now = Date.now();
      const bj = new Date(now + (8 * 3600 + new Date(now).getTimezoneOffset() * 60) * 1000);
      this.hour = bj.getHours() + bj.getMinutes() / 60 + bj.getSeconds() / 3600;
      const month = bj.getMonth(); // 0-11
      const season = (month >= 2 && month <= 4) ? 'spring' : (month >= 5 && month <= 7) ? 'summer' : (month >= 8 && month <= 10) ? 'autumn' : 'winter';
      if (season !== this._season) {
        this._season = season;
        if (this.onSeasonChange) this.onSeasonChange(season);
      }
    } else {
      const dh = (dt * 24) / this.dayLength;
      this.hour = (this.hour + dh) % 24;
      this.totalHours += dh;
      // 季节
      const day = Math.floor(this.totalHours / 24);
      const si = Math.floor(day / this.daysPerSeason) % 4;
      const season = ['spring', 'summer', 'autumn', 'winter'][si];
      if (season !== this._season) {
        this._season = season;
        if (this.onSeasonChange) this.onSeasonChange(season);
      }
    }
    // 天气机（同步到武汉实时天气时锁定，不再随机）
    this.weatherTimer -= dt;
    if (this.weatherTimer <= 0) {
      this.weatherTimer = rand(100, 200);
      if (!this.realWeather) this.weather = choice(Object.keys(WEATHERS));
    }
    const W = WEATHERS[this.weather];
    const { k0, k1, t } = this._skyLerp(this.hour);
    const mixHex = (a, b) => this._c1.setHex(a).lerp(this._c2.setHex(b), t).clone();
    let top = mixHex(k0[1], k1[1]);
    let hor = mixHex(k0[2], k1[2]);
    let sunC = mixHex(k0[3], k1[3]);
    const sunI = lerp(k0[4], k1[4], t) * (1 - W.dim * 0.8);
    const ambI = lerp(k0[5], k1[5], t) * (1 - W.dim * 0.4);
    let fogC = mixHex(k0[6], k1[6]);
    // 天气压暗
    const gray = new THREE.Color(0x5a636e);
    top.lerp(gray, W.dim * 0.55); hor.lerp(gray, W.dim * 0.5); fogC.lerp(gray, W.dim * 0.5);

    // 太阳方向
    const sa = ((this.hour - 6) / 12) * Math.PI;
    const elev = Math.sin(sa);
    if (elev > -0.08) {
      this.sunDir.set(Math.cos(sa) * 0.85, Math.max(elev, 0.06), 0.35).normalize();
      this.sun.color.copy(sunC);
      this.sun.intensity = Math.max(sunI, 0.02);
    } else { // 夜晚月光
      this.sunDir.set(-Math.cos(sa) * 0.6, 0.5, 0.3).normalize();
      this.sun.color.setHex(0x9cb8e8);
      this.sun.intensity = 0.22;
    }
    // 雷雨前闪电
    if (this.weather === 'front') {
      this.flashT -= dt;
      if (this.flashT <= 0) { this.flashT = rand(4, 12); this._flash = 0.35; }
    }
    if (this._flash > 0) { this._flash -= dt; this.hemi.intensity = ambI + this._flash * 3; }
    else this.hemi.intensity = ambI;

    this.skyU.uTop.value.copy(top);
    this.skyU.uHorizon.value.copy(hor);
    this.skyU.uSun.value.copy(this.sunDir);
    this.skyU.uSunColor.value.copy(sunC).multiplyScalar(this.weather === 'clear' ? 1 : 0.25);
    this.skyColor.copy(hor);
    this.sunColor.copy(sunC);
    this.starMat.opacity = clamp((0.25 - elev) * 4, 0, 1) * (1 - W.dim);

    this.scene.fog.color.copy(fogC);
    const baseFog = this.weather === 'rain' ? 170 : 260;
    this.scene.fog.far = lerp(this.scene.fog.far || baseFog, baseFog, 0.02);
    this.scene.fog.near = (this.scene.fog.far || baseFog) * 0.35;

    // 雨粒子跟随相机
    this.rain.visible = this.weather === 'rain';
    if (this.rain.visible) {
      const cp = this.camera.position;
      const arr = this.rain.geometry.attributes.position.array;
      for (let i = 0; i < this.rainDrops.length; i++) {
        const d = this.rainDrops[i];
        d.y -= dt * 21;
        if (d.y < -4) { d.y = rand(16, 28); d.x = rand(-30, 30); d.z = rand(-30, 30); }
        arr[i * 6] = cp.x + d.x; arr[i * 6 + 1] = cp.y + d.y - 8; arr[i * 6 + 2] = cp.z + d.z;
        arr[i * 6 + 3] = cp.x + d.x + 0.12; arr[i * 6 + 4] = cp.y + d.y - 8.7; arr[i * 6 + 5] = cp.z + d.z;
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
    }
  }
  get season() { return this._season || 'spring'; }
  get nightFactor() { return clamp((0.15 - Math.sin(((this.hour - 6) / 12) * Math.PI)) * 3, 0, 1); }
  get waveAmp() { return WEATHERS[this.weather].wave; }
  get biteFactor() {
    return PERIOD_BITE[periodOf(this.hour)] * WEATHERS[this.weather].bite * SEASON_BITE[this.season];
  }
  get biteStars() { // 1~5 星渔情
    const v = this.biteFactor;
    return clamp(Math.round(v * 2.6), 1, 5);
  }
  get timeText() {
    const h = Math.floor(this.hour), m = Math.floor((this.hour - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}
