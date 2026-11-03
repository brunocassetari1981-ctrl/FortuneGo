// Web Audio API Synthesizer for FortuneGo — agora com música de fundo e efeitos de rolagem
class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private bgGain: GainNode | null = null;
  private bgOscs: OscillatorNode[] = [];
  private bgTimer: number | null = null;
  private reelTickTimer: number | null = null;

  constructor() {}

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (!val) this.stopBackground();
  }
  public isEnabled(): boolean { return this.enabled; }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = (window as unknown as { AudioContext: typeof AudioContext }).AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  public playTick(pitch: number = 440) {
    if (!this.enabled) return;
    try {
      this.initCtx(); if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(pitch, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(pitch * 0.5, this.ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(); osc.stop(this.ctx.currentTime + 0.05);
    } catch {}
  }

  public playDiceRoll() {
    if (!this.enabled) return;
    try {
      this.initCtx(); if (!this.ctx) return;
      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(150 + Math.random() * 200, this.ctx.currentTime);
          gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);
          osc.connect(gain); gain.connect(this.ctx.destination);
          osc.start(); osc.stop(this.ctx.currentTime + 0.06);
        }, i * 60);
      }
    } catch {}
  }

  public playCoin() {
    if (!this.enabled) return;
    try {
      this.initCtx(); if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, this.ctx.currentTime);
      osc.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(); osc.stop(this.ctx.currentTime + 0.3);
    } catch {}
  }

  public playWinFanfare() {
    if (!this.enabled) return;
    try {
      this.initCtx(); if (!this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
          gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
          osc.connect(gain); gain.connect(this.ctx.destination);
          osc.start(); osc.stop(this.ctx.currentTime + 0.35);
        }, idx * 110);
      });
    } catch {}
  }

  public playCascadeSwell(streak: number) {
    if (!this.enabled) return;
    try {
      this.initCtx(); if (!this.ctx) return;
      const baseFreq = 440 * Math.pow(1.15, Math.min(streak, 8));
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, this.ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(); osc.stop(this.ctx.currentTime + 0.35);
    } catch {}
  }

  public playChestOpen() {
    if (!this.enabled) return;
    try {
      this.initCtx(); if (!this.ctx) return;
      const notes = [330, 440, 554.37, 659.25];
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
          gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
          osc.connect(gain); gain.connect(this.ctx.destination);
          osc.start(); osc.stop(this.ctx.currentTime + 0.2);
        }, idx * 70);
      });
    } catch {}
  }

  public playLevelUp() {
    if (!this.enabled) return;
    try {
      this.initCtx(); if (!this.ctx) return;
      const chord = [440, 554.37, 659.25, 880];
      chord.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);
        gain.gain.setValueAtTime(0.15, this.ctx!.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + 0.8);
        osc.connect(gain); gain.connect(this.ctx!.destination);
        osc.start(); osc.stop(this.ctx!.currentTime + 0.8);
      });
    } catch {}
  }

  // === Novos efeitos de slot rolagem ===

  public startReelSpinTicks() {
    if (!this.enabled) return;
    this.stopReelTicks();
    let pitch = 880;
    this.reelTickTimer = window.setInterval(() => {
      this.playTick(pitch);
      pitch = Math.max(320, pitch * 0.985);
    }, 58);
  }
  public stopReelTicks() {
    if (this.reelTickTimer) { clearInterval(this.reelTickTimer); this.reelTickTimer = null; }
  }
  public playReelStop(reelIndex: number) {
    if (!this.enabled) return;
    this.playTick(620 - reelIndex * 45);
    // leve thump de parada
    try {
      this.initCtx(); if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(); osc.stop(this.ctx.currentTime + 0.12);
    } catch {}
  }
  public playWinLine() {
    if (!this.enabled) return;
    this.playCoin();
    setTimeout(() => this.playTick(880), 80);
  }
  public vibrate(pattern: number | number[]) {
    if ('vibrate' in navigator) try { navigator.vibrate(pattern); } catch {}
  }

  // === Música de fundo oriental / festiva ===

  public playBackground() {
    if (!this.enabled) return;
    this.stopBackground();
    try {
      this.initCtx(); if (!this.ctx) return;
      const ctx = this.ctx;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.085, ctx.currentTime);
      master.connect(ctx.destination);
      this.bgGain = master;

      // Melodia pentatônica (C D E G A) — loop alegre oriental
      const baseMelody = [261.63, 293.66, 329.63, 392.00, 440.00, 392.00, 329.63, 293.66]; // C D E G A
      const bassNotes = [130.81, 146.83, 164.81, 130.81]; // C2 D2 E2
      let step = 0;

      const playStep = () => {
        if (!this.ctx || !this.bgGain) return;
        const now = ctx.currentTime;
        // melodia
        const freq = baseMelody[step % baseMelody.length];
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        // leve vibrato
        osc.frequency.linearRampToValueAtTime(freq * 1.01, now + 0.18);
        g.gain.setValueAtTime(0.22, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
        osc.connect(g); g.connect(master);
        osc.start(now); osc.stop(now + 0.42);

        // baixo suave a cada 2 passos
        if (step % 2 === 0) {
          const bf = bassNotes[Math.floor(step/2) % bassNotes.length];
          const bOsc = ctx.createOscillator();
          const bG = ctx.createGain();
          bOsc.type = 'sine';
          bOsc.frequency.setValueAtTime(bf, now);
          bG.gain.setValueAtTime(0.12, now);
          bG.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          bOsc.connect(bG); bG.connect(master);
          bOsc.start(now); bOsc.stop(now + 0.6);
        }

        step++;
      };

      // Toca imediatamente e agenda loop
      playStep();
      this.bgTimer = window.setInterval(playStep, 420);

      // Fade in
      master.gain.setValueAtTime(0, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.085, ctx.currentTime + 1.2);
    } catch {}
  }

  public stopBackground() {
    if (this.bgTimer) { clearInterval(this.bgTimer); this.bgTimer = null; }
    const previousGain = this.bgGain;
    this.bgGain = null;
    if (previousGain && this.ctx) {
      try { previousGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.25); } catch {}
      setTimeout(() => {
        previousGain.disconnect();
        this.bgOscs.forEach(o => { try { o.stop(); o.disconnect(); } catch {} });
        this.bgOscs = [];
      }, 300);
    }
  }

  // Grande vitória com fanfarra oriental
  public playBigWinSequence() {
    if (!this.enabled) return;
    const seq = [392.00, 493.88, 587.33, 659.25, 783.99, 880.00, 1046.50];
    seq.forEach((f, i) => setTimeout(() => this.playTick(f * 1.5), i * 85));
    setTimeout(() => this.playWinFanfare(), 700);
    this.vibrate([80, 40, 80, 40, 120]);
  }
}

export const sound = new SoundManager();
