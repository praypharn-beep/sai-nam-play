// เสียงของเกมสายน้ำจากภูผีปอบ — สังเคราะห์ทั้งหมดด้วย Web Audio API
// ไม่มีไฟล์เสียง ไม่ต้องดาวน์โหลด เล่นได้ออฟไลน์ และไม่มีปัญหาลิขสิทธิ์
//
// ส่วนข้อมูล (SOUNDS, MELODY, soundDuration) เป็น pure ทดสอบใน Node ได้
// ตัว AudioContext อยู่ใน method ของ GameAudio เท่านั้น การ import โมดูลนี้
// จึงไม่ต้องมีเบราว์เซอร์ และเทสต์รันผ่าน node --test ได้

// --- ข้อมูลเสียง ทดสอบได้ ---

// เอฟเฟกต์แต่ละอย่างเป็นลิสต์ของ "เสียงย่อย" หนึ่งเสียงย่อยคือออสซิลเลเตอร์
// หนึ่งตัวหรือเสียงซ่า (noise) หนึ่งก้อน พร้อมซองเสียงสั้น ๆ
//   wave  = รูปคลื่น (sine/square/triangle)  ถ้าไม่ระบุใช้ sine
//   f0    = ความถี่เริ่ม (Hz)
//   f1    = ความถี่จบ ถ้าต่างจาก f0 จะกวาดความถี่
//   noise = true คือเสียงซ่าแทนออสซิลเลเตอร์
//   dur   = ความยาว (วินาที)
//   gain  = ความดังยอด (0..1)
//   at    = เริ่มช้าลงกี่วินาทีจากตอนสั่งเล่น ใช้ต่อโน้ตเป็นทำนองสั้น ๆ
export const SOUNDS = {
  jump: [{ wave: "square", f0: 420, f1: 760, dur: 0.14, gain: 0.20 }],
  land: [
    { wave: "sine", f0: 200, f1: 90, dur: 0.10, gain: 0.22 },
    { noise: true, dur: 0.06, gain: 0.10 },
  ],
  step: [{ noise: true, dur: 0.035, gain: 0.05 }],
  talk: [{ wave: "square", f0: 380, f1: 380, dur: 0.05, gain: 0.10 }],
  correct: [
    { wave: "sine", f0: 523, f1: 523, dur: 0.10, gain: 0.18, at: 0.0 },
    { wave: "sine", f0: 659, f1: 659, dur: 0.10, gain: 0.18, at: 0.10 },
    { wave: "sine", f0: 784, f1: 784, dur: 0.16, gain: 0.18, at: 0.20 },
  ],
  wrong: [{ wave: "square", f0: 220, f1: 150, dur: 0.20, gain: 0.16 }],
  pickup: [{ wave: "triangle", f0: 660, f1: 990, dur: 0.10, gain: 0.16 }],
  plant: [
    { wave: "sine", f0: 300, f1: 540, dur: 0.16, gain: 0.16 },
    { noise: true, dur: 0.05, gain: 0.05, at: 0.02 },
  ],
  splash: [
    { noise: true, dur: 0.26, gain: 0.16 },
    { wave: "sine", f0: 500, f1: 200, dur: 0.20, gain: 0.08 },
  ],
  win: [
    { wave: "triangle", f0: 523, f1: 523, dur: 0.12, gain: 0.18, at: 0.0 },
    { wave: "triangle", f0: 659, f1: 659, dur: 0.12, gain: 0.18, at: 0.12 },
    { wave: "triangle", f0: 784, f1: 784, dur: 0.12, gain: 0.18, at: 0.24 },
    { wave: "triangle", f0: 1046, f1: 1046, dur: 0.30, gain: 0.20, at: 0.36 },
  ],
};

export const SOUND_NAMES = Object.keys(SOUNDS);

// ทำนองคลอเบา ๆ สเกลเพนทาโทนิก โทนบ้านทุ่งสดใส ไม่ใช่เพลงมาริโอ
// lead/bass เป็นความถี่ (Hz) โดย 0 คือหยุดพัก วนซ้ำหนึ่งวลี
export const MELODY = {
  step: 0.26,
  lead: [523, 659, 784, 659, 880, 784, 659, 0, 587, 784, 659, 587, 523, 0, 392, 0],
  bass: [131, 0, 131, 0, 196, 0, 196, 0, 220, 0, 220, 0, 196, 0, 131, 0],
  gain: 0.045,
};

// ความยาวรวมของเอฟเฟกต์หนึ่งชื่อ (วินาที) ชื่อที่ไม่รู้จักได้ 0
export function soundDuration(name) {
  const voices = SOUNDS[name];
  if (!voices) return 0;
  return voices.reduce((max, v) => Math.max(max, (v.at || 0) + v.dur), 0);
}

// --- เอนจินเสียงจริง ใช้ในเบราว์เซอร์ ---

export function createGameAudio() {
  return new GameAudio();
}

class GameAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this._noiseBuf = null;
    this._musicOn = false;
    this._timer = null;
    this._nextNote = 0;
    this._noteIdx = 0;
  }

  // ต้องเรียกจาก user gesture (คลิก/กดปุ่ม) เพื่อผ่านกฎ autoplay ของเบราว์เซอร์
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return;
    }
    const AC =
      typeof window !== "undefined" &&
      (window.AudioContext || window.webkitAudioContext);
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(this.ctx.destination);
  }

  setMuted(m) {
    this.muted = !!m;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.9;
    return this.muted;
  }

  toggleMute() {
    return this.setMuted(!this.muted);
  }

  play(name) {
    if (!this.ctx || this.muted) return;
    const voices = SOUNDS[name];
    if (!voices) return;
    const now = this.ctx.currentTime;
    for (const v of voices) this._voice(v, now + (v.at || 0));
  }

  _voice(v, t) {
    const g = this.ctx.createGain();
    g.connect(this.master);
    const peak = Math.max(0.0002, v.gain || 0.15);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + v.dur);

    let src;
    if (v.noise) {
      src = this.ctx.createBufferSource();
      src.buffer = this._noise();
      const lp = this.ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 1800;
      src.connect(lp);
      lp.connect(g);
    } else {
      src = this.ctx.createOscillator();
      src.type = v.wave || "sine";
      src.frequency.setValueAtTime(v.f0, t);
      if (v.f1 && v.f1 !== v.f0) {
        src.frequency.exponentialRampToValueAtTime(Math.max(1, v.f1), t + v.dur);
      }
      src.connect(g);
    }
    src.start(t);
    src.stop(t + v.dur + 0.02);
  }

  _noise() {
    if (this._noiseBuf) return this._noiseBuf;
    const len = Math.floor(this.ctx.sampleRate * 0.3);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this._noiseBuf = buf;
    return buf;
  }

  startMusic() {
    if (!this.ctx || this._musicOn) return;
    this._musicOn = true;
    this._noteIdx = 0;
    this._nextNote = this.ctx.currentTime + 0.12;
    this._timer = setInterval(() => this._schedule(), 25);
  }

  stopMusic() {
    this._musicOn = false;
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  _schedule() {
    if (!this.ctx || !this._musicOn) return;
    const ahead = this.ctx.currentTime + 0.12;
    const n = MELODY.lead.length;
    while (this._nextNote < ahead) {
      const i = this._noteIdx % n;
      const lead = MELODY.lead[i];
      const bass = MELODY.bass[i];
      if (lead) {
        this._voice(
          { wave: "triangle", f0: lead, f1: lead, dur: MELODY.step * 0.9, gain: MELODY.gain },
          this._nextNote,
        );
      }
      if (bass) {
        this._voice(
          { wave: "sine", f0: bass, f1: bass, dur: MELODY.step * 0.95, gain: MELODY.gain },
          this._nextNote,
        );
      }
      this._nextNote += MELODY.step;
      this._noteIdx++;
    }
  }
}
