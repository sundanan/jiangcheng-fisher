// 键鼠输入：指针锁定视角 + 按键/滚轮状态采集
export class Input {
  constructor(domElement) {
    this.dom = domElement;
    this.keys = new Set();          // 持续按住的键盘键
    this.mouseHeld = new Set();     // 持续按住的鼠标键 ('LMB'/'RMB')
    this.justPressed = new Set();   // 本帧刚按下（含 'LMU'/'RMU' 松开）
    this.dx = 0; this.dy = 0;       // 鼠标增量（仅指针锁定时）
    this.wheel = 0;                 // 滚轮增量（本帧累计）
    this.locked = false;
    document.addEventListener('keydown', (e) => {
      if (!e.repeat) this.justPressed.add(e.code);
      this.keys.add(e.code);
      if (['Space', 'Tab'].includes(e.code)) e.preventDefault();
    });
    document.addEventListener('keyup', (e) => this.keys.delete(e.code));
    document.addEventListener('mousemove', (e) => {
      if (this.locked) { this.dx += e.movementX; this.dy += e.movementY; }
    });
    document.addEventListener('mousedown', (e) => {
      const code = e.button === 0 ? 'LMB' : e.button === 2 ? 'RMB' : null;
      if (code) { this.mouseHeld.add(code); this.justPressed.add(code); }
    });
    document.addEventListener('mouseup', (e) => {
      const code = e.button === 0 ? 'LMB' : e.button === 2 ? 'RMB' : null;
      if (code) {
        this.mouseHeld.delete(code);
        this.justPressed.add(code === 'LMB' ? 'LMU' : 'RMU');
      }
    });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); }, { passive: true });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.dom;
      if (!this.locked) { this.keys.clear(); this.mouseHeld.clear(); }
    });
    // 窗口失焦时清空按键，避免"卡键"
    window.addEventListener('blur', () => { this.keys.clear(); this.mouseHeld.clear(); });
  }
  requestLock() {
    if (!this.locked) this.dom.requestPointerLock();
  }
  isDown(code) {
    if (code === 'LMB' || code === 'RMB') return this.mouseHeld.has(code);
    return this.keys.has(code);
  }
  justDown(code) { return this.justPressed.has(code); }
  endFrame() {
    this.justPressed.clear();
    this.dx = 0; this.dy = 0; this.wheel = 0;
  }
}
