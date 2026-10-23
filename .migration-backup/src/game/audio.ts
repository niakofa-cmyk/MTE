export class AudioBus {
  ctx: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  muted = false;
  private drone: { osc: OscillatorNode; osc2: OscillatorNode; gain: GainNode } | null = null;

  ensure() {
    if (!this.ctx) {
      const ctx = new AudioContext();
      this.ctx = ctx;
      const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.noise = buffer;
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc.type = "sine";
      osc2.type = "sine";
      osc.frequency.value = 55;
      osc2.frequency.value = 82.5;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 220;
      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc2.start();
      this.drone = { osc, osc2, gain };
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setPressure(p: number) {
    if (!this.drone || !this.ctx || this.muted) return;
    const target = 0.012 + p * 0.03;
    this.drone.gain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.4);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.drone && this.ctx) {
      this.drone.gain.gain.setTargetAtTime(this.muted ? 0 : 0.015, this.ctx.currentTime, 0.05);
    }
    return this.muted;
  }

  private burst(freq: number, q: number, gain: number, duration: number, thump?: number) {
    if (this.muted) return;
    this.ensure();
    const ctx = this.ctx;
    const noise = this.noise;
    if (!ctx || !noise) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = q;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(ctx.destination);
    src.start(t);
    src.stop(t + duration + 0.02);
    if (thump) {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(thump, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, thump * 0.45), t + duration);
      const og = ctx.createGain();
      og.gain.setValueAtTime(gain * 0.45, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.connect(og);
      og.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + duration);
    }
  }

  private tone(freq: number, duration: number, gain: number, type: OscillatorType = "sine") {
    if (this.muted) return;
    this.ensure();
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  }

  gun(kind: string) {
    if (kind === "smg") this.burst(1800, 0.7, 0.09, 0.05, 140);
    else if (kind === "needles") this.burst(2200, 1.4, 0.035, 0.04, 90);
    else if (kind === "shotgun") this.burst(420, 0.5, 0.22, 0.16, 90);
    else if (kind === "slug") this.burst(280, 0.45, 0.26, 0.2, 70);
    else if (kind === "rail") this.burst(2400, 2.4, 0.12, 0.12, 320);
    else if (kind === "lmg") this.burst(900, 0.8, 0.12, 0.07, 110);
    else if (kind === "pistol") this.burst(1400, 1.1, 0.1, 0.06, 180);
    else this.burst(1100, 0.9, 0.12, 0.07, 130);
  }

  hit(head: boolean) {
    if (head) {
      this.tone(880, 0.07, 0.06, "square");
      this.tone(1320, 0.09, 0.04, "square");
    } else this.tone(640, 0.05, 0.045, "square");
  }

  hurt() {
    this.burst(180, 0.6, 0.16, 0.18, 70);
  }

  pickup() {
    this.tone(520, 0.08, 0.05);
    this.tone(780, 0.12, 0.04);
  }

  breach() {
    this.burst(240, 0.4, 0.24, 0.28, 60);
  }

  orbital() {
    this.burst(80, 0.35, 0.32, 0.6, 46);
    this.tone(220, 0.4, 0.1, "sawtooth");
    this.burst(1600, 1.8, 0.07, 0.22, 240);
  }

  ui() {
    this.tone(660, 0.05, 0.04);
  }

  zone() {
    this.tone(140, 0.12, 0.05, "sawtooth");
  }

  empty() {
    this.tone(180, 0.04, 0.04, "square");
  }

  foot() {
    this.burst(200, 0.4, 0.03, 0.04);
  }
}
