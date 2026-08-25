/** Tiny procedural sound engine (no assets, WebAudio only). */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  ensure() {
    if (this.ctx) return;
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
  }

  resume() {
    this.ensure();
    void this.ctx?.resume();
  }

  private env(dur: number, peak = 1) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(this.master!);
    return g;
  }

  private noise(dur: number, peak: number, filterHz: number, type: BiquadFilterType = "lowpass") {
    const ctx = this.ctx!;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = filterHz;
    src.connect(f).connect(this.env(dur, peak));
    src.start();
  }

  private tone(freq: number, dur: number, type: OscillatorType = "square", peak = 0.5, to?: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (to) o.frequency.exponentialRampToValueAtTime(to, ctx.currentTime + dur);
    o.connect(this.env(dur, peak));
    o.start();
    o.stop(ctx.currentTime + dur + 0.05);
  }

  play(name: string) {
    this.ensure();
    if (!this.ctx || this.ctx.state !== "running") return;
    switch (name) {
      case "shot":
        this.noise(0.12, 0.6, 2600);
        this.tone(180, 0.09, "square", 0.25, 60);
        break;
      case "dry":
        this.tone(90, 0.05, "square", 0.15);
        break;
      case "reload":
        this.noise(0.08, 0.25, 1200);
        break;
      case "swing":
        this.noise(0.16, 0.28, 900, "bandpass");
        break;
      case "melee_hit":
        this.noise(0.14, 0.5, 500);
        this.tone(140, 0.1, "sawtooth", 0.2, 70);
        break;
      case "hitmark":
        this.tone(1400, 0.04, "sine", 0.18);
        break;
      case "kill":
        this.tone(300, 0.18, "triangle", 0.3, 120);
        this.noise(0.2, 0.3, 700);
        break;
      case "stagger":
        this.tone(700, 0.12, "square", 0.2, 220);
        break;
      case "tackle":
        this.noise(0.3, 0.55, 350);
        this.tone(80, 0.25, "sawtooth", 0.3, 40);
        break;
      case "dodge":
        this.noise(0.2, 0.22, 1600, "highpass");
        break;
      case "hurt":
        this.tone(220, 0.2, "sawtooth", 0.35, 90);
        break;
      case "lava":
        this.noise(0.5, 0.4, 300);
        break;
      case "pickup":
        this.tone(660, 0.07, "sine", 0.25);
        this.tone(990, 0.09, "sine", 0.2);
        break;
      case "wave":
        this.tone(110, 0.5, "sawtooth", 0.3, 220);
        break;
      case "buff":
        this.tone(520, 0.1, "sine", 0.25);
        this.tone(780, 0.14, "sine", 0.25);
        this.tone(1040, 0.2, "sine", 0.2);
        break;
      case "down":
        this.tone(200, 0.8, "sawtooth", 0.35, 50);
        break;
      case "revive":
        this.tone(300, 0.4, "sine", 0.3, 800);
        break;
      case "geyser":
        this.noise(0.7, 0.5, 500);
        break;
      case "spit":
        this.tone(400, 0.14, "square", 0.18, 900);
        break;
    }
  }
}
