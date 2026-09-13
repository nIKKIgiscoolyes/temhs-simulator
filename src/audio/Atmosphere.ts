/** Original low-level procedural ambience; no recordings or cloud voices. */
export class Atmosphere {
  private context?: AudioContext;
  private master?: GainNode;
  private air?: GainNode;
  private movement?: GainNode;
  private nextStep = 0;
  enabled = false;
  async toggle() {
    if (!this.context) {
      const ctx = new AudioContext();
      this.context = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(ctx.destination);
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate),
        data = buffer.getChannelData(0);
      let seed = 73;
      for (let i = 0; i < data.length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        data[i] = (seed / 4294967296 - 0.5) * 0.25;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 350;
      this.air = ctx.createGain();
      this.air.gain.value = 0.035;
      source.connect(filter).connect(this.air).connect(this.master);
      source.start();
      this.movement = ctx.createGain();
      this.movement.gain.value = 0.008;
      const high = ctx.createBiquadFilter();
      high.type = "bandpass";
      high.frequency.value = 1100;
      high.Q.value = 0.6;
      source.connect(high).connect(this.movement).connect(this.master);
    }
    this.enabled = !this.enabled;
    await this.context.resume();
    this.master!.gain.setTargetAtTime(
      this.enabled ? 0.7 : 0,
      this.context.currentTime,
      0.2,
    );
    return this.enabled;
  }
  update(underground: boolean, passage: boolean, walking: boolean) {
    if (!this.context || !this.enabled) return;
    const t = this.context.currentTime;
    this.air!.gain.setTargetAtTime(underground ? 0.06 : 0.022, t, 0.8);
    this.movement!.gain.setTargetAtTime(passage ? 0.045 : 0.006, t, 0.8);
    if (walking && t > this.nextStep) {
      this.nextStep = t + 0.43;
      this.tone(100, 0.025, 0.035);
    }
  }
  bell() {
    if (this.enabled) {
      this.tone(660, 0.5, 0.035);
      setTimeout(() => this.tone(880, 0.6, 0.025), 180);
    }
  }
  private tone(frequency: number, duration: number, volume: number) {
    if (!this.context || !this.master) return;
    const t = this.context.currentTime,
      osc = this.context.createOscillator(),
      gain = this.context.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + duration);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }
}
