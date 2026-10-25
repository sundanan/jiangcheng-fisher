// 程序化音效：Web Audio 合成，无任何音频素材
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
    this.ambient = null;
    this.rainNode = null;
    this.reelTimer = 0;
  }
  // 需用户手势后调用（点击开始游戏时）
  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);
    this._startAmbient();
  }
  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.55;
  }
  _noiseBuffer(sec = 1) {
    const n = this.ctx.sampleRate * sec;
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) { // 粉噪声
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
    return buf;
  }
  _startAmbient() {
    // 环境水声：低通粉噪声微循环
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer(3);
    src.loop = true;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 420;
    const g = this.ctx.createGain(); g.gain.value = 0.05;
    src.connect(lp).connect(g).connect(this.master);
    src.start();
    this.ambient = g;
    // 雨声层（默认静音，下雨时淡入）
    const rsrc = this.ctx.createBufferSource();
    rsrc.buffer = this._noiseBuffer(2);
    rsrc.loop = true;
    const rhp = this.ctx.createBiquadFilter();
    rhp.type = 'highpass'; rhp.frequency.value = 1400;
    const rg = this.ctx.createGain(); rg.gain.value = 0;
    rsrc.connect(rhp).connect(rg).connect(this.master);
    rsrc.start();
    this.rainNode = rg;
  }
  setRain(on) {
    if (!this.rainNode) return;
    this.rainNode.gain.linearRampToValueAtTime(on ? 0.14 : 0, this.ctx.currentTime + 1.5);
  }
  _env(gain, t0, a, peak, dur) {
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + a);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }
  _tone(freq, dur, peak = 0.2, type = 'sine', t0 = null, slideTo = null) {
    if (!this.ctx) return;
    const t = t0 ?? this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = this.ctx.createGain();
    this._env(g, t, 0.012, peak, dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  }
  _noiseHit(dur, peak, filterFreq, type = 'lowpass') {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer(Math.max(0.3, dur));
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    this._env(g, t, 0.008, peak, dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t); src.stop(t + dur + 0.05);
  }
  cast() { this._noiseHit(0.35, 0.18, 900, 'bandpass'); }           // 抛竿破空
  splash(big = 1) {                                                   // 落水扑通
    this._tone(240 * big, 0.18, 0.22, 'sine', null, 90);
    this._noiseHit(0.22, 0.15 * big, 1200);
  }
  bite() { this._tone(880, 0.1, 0.16, 'triangle'); this._tone(1320, 0.14, 0.14, 'triangle', this.ctx ? this.ctx.currentTime + 0.09 : 0); }  // 漂相提示
  hook() { this._tone(330, 0.12, 0.2, 'square'); this._tone(495, 0.2, 0.18, 'square', this.ctx ? this.ctx.currentTime + 0.1 : 0); }         // 中鱼
  reelTick() { this._noiseHit(0.03, 0.05, 2600, 'highpass'); }       // 收线棘轮
  snap() { this._noiseHit(0.3, 0.3, 3200, 'highpass'); this._tone(180, 0.25, 0.2, 'sawtooth', null, 60); }  // 断线
  card() {                                                            // 开卡
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [523, 659, 784, 1046].forEach((f, i) => this._tone(f, 0.35, 0.12, 'triangle', t + i * 0.09));
  }
  coin() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._tone(988, 0.08, 0.1, 'square', t);
    this._tone(1319, 0.18, 0.1, 'square', t + 0.08);
  }
  fail() { this._tone(220, 0.3, 0.14, 'sine', null, 140); }
}
