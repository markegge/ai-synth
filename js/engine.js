// ai-synth — 6-operator FM engine on the Web Audio API.
//
// Pitch trick: every operator oscillator runs at (ratio * REF) Hz and is pitched
// with its `detune` param, driven by a per-voice ConstantSource holding the note
// in cents relative to A4. Because Web Audio computes
//   frequency_out = (frequency + modulation) * 2^(detune/1200)
// any FM signal summed into `frequency` scales with the note automatically, so
// the modulation index stays constant across the keyboard, and glide, pitch
// envelopes and vibrato all come for free by moving one number.

export const REF = 440;

// DX-style algorithms. Ops are numbered 1..6. m = [modulator, target] edges,
// c = carriers, fb = op with self-feedback.
export const ALGORITHMS = [
  { m: [[2, 1], [4, 3], [5, 4], [6, 5]], c: [1, 3], fb: 6 },          // 1: 2>1 + 6>5>4>3
  { m: [[2, 1], [4, 3], [5, 4], [6, 5]], c: [1, 3], fb: 2 },          // 2: same, fb on 2
  { m: [[3, 2], [2, 1], [6, 5], [5, 4]], c: [1, 4], fb: 6 },          // 3: two 3-op stacks
  { m: [[2, 1], [4, 3], [6, 5]], c: [1, 3, 5], fb: 6 },               // 4: three 2-op pairs
  { m: [[2, 1], [4, 3], [5, 3], [6, 5]], c: [1, 3], fb: 6 },          // 5: branch into 3
  { m: [[2, 1], [3, 1], [4, 1], [6, 5]], c: [1, 5], fb: 4 },          // 6: 3 mods into 1
  { m: [[6, 5], [5, 4], [4, 3], [3, 2], [2, 1]], c: [1], fb: 6 },     // 7: full 6-stack
  { m: [[2, 1], [6, 3], [6, 4], [6, 5]], c: [1, 3, 4, 5], fb: 6 },    // 8: 6 drives 3,4,5
  { m: [[3, 2], [2, 1], [6, 4], [6, 5]], c: [1, 4, 5], fb: 6 },       // 9: stack + shared mod
  { m: [[4, 3], [3, 2], [2, 1], [6, 5]], c: [1, 5], fb: 6 },          // 10: 4-stack + pair
  { m: [[2, 1]], c: [1, 3, 4, 5, 6], fb: 2 },                         // 11: pair + 4 sines
  { m: [], c: [1, 2, 3, 4, 5, 6], fb: 6 },                            // 12: organ (all carriers)
  { m: [[3, 1], [3, 2], [6, 4], [6, 5]], c: [1, 2, 4, 5], fb: 3 },    // 13: twin shared mods
  { m: [[2, 1], [3, 2], [5, 4], [6, 4]], c: [1, 4], fb: 6 },          // 14: 3-stack + Y
];

const FB_BETA = [0, 0.12, 0.25, 0.45, 0.75, 1.1, 1.6, 2.4];

export const ampOf = (L) => Math.pow(Math.max(0, L) / 99, 1.6);
export const indexOf = (L) => 13 * Math.pow(Math.max(0, L) / 99, 3);

function envAt(t, peak, a, d, s) {
  if (t <= 0) return 0;
  if (t < a) return peak * (t / a);
  return peak * s + (peak - peak * s) * Math.exp(-(t - a) / Math.max(0.001, d / 3));
}

let voiceSerial = 0;

class Voice {
  constructor(part, midi, vel, t) {
    const ctx = part.ctx;
    const p = part.patch;
    const alg = ALGORITHMS[p.alg] || ALGORITHMS[0];
    this.part = part;
    this.ctx = ctx;
    this.t0 = t;
    this.midi = midi;
    this.released = false;
    this.id = ++voiceSerial;

    const ops = p.ops;
    const mute = part.muted || [];
    const lvl = (i) => (mute[i] ? 0 : ops[i].level * (part.bright ?? 1) ** (alg.c.includes(i + 1) ? 0 : 1));
    // Which ops actually sound: carriers with level, plus modulators feeding them.
    const active = new Array(6).fill(false);
    alg.c.forEach((c) => { if (lvl(c - 1) > 0) active[c - 1] = true; });
    for (let pass = 0; pass < 6; pass++) {
      alg.m.forEach(([s, d]) => { if (active[d - 1] && lvl(s - 1) > 0) active[s - 1] = true; });
    }
    const nCar = Math.max(1, alg.c.filter((c) => active[c - 1]).length);

    this.out = ctx.createGain();
    this.out.connect(part.voiceBus);
    this.pitch = ctx.createConstantSource();
    this.base = this.centsFor(midi);
    const pe = p.pitchEnv || [0, 0.05];
    this.pitch.offset.setValueAtTime(this.base + (pe[0] || 0), t);
    if (pe[0]) this.pitch.offset.setTargetAtTime(this.base, t, Math.max(0.002, pe[1] / 3));

    const velAmp = 0.35 + 0.65 * vel;
    const velMod = 0.65 + 0.35 * vel;
    const atk = part.atkScale ?? 1;
    const rel = part.relScale ?? 1;

    this.nodes = [];
    this.envs = [];
    this.oscs = [];
    const oscByOp = [];
    for (let i = 0; i < 6; i++) {
      if (!active[i]) continue;
      const op = ops[i];
      const osc = ctx.createOscillator();
      osc.frequency.value = op.ratio * REF;
      osc.detune.value = op.det || 0;
      this.pitch.connect(osc.detune);
      part.vib.connect(osc.detune);
      oscByOp[i] = osc;
      this.oscs.push(osc);
    }
    for (let i = 0; i < 6; i++) {
      if (!active[i]) continue;
      const op = ops[i];
      const osc = oscByOp[i];
      const g = ctx.createGain();
      g.gain.value = 0;
      osc.connect(g);
      this.nodes.push(g);
      const isCar = alg.c.includes(i + 1);
      let peak;
      if (isCar) {
        peak = ampOf(lvl(i)) * velAmp / Math.sqrt(nCar);
        g.connect(this.out);
      } else {
        peak = indexOf(lvl(i)) * op.ratio * REF * velMod;
        alg.m.forEach(([s, d]) => { if (s === i + 1 && active[d - 1]) g.connect(oscByOp[d - 1].frequency); });
      }
      const e = { param: g.gain, peak, a: Math.max(0.001, op.a * atk), d: Math.max(0.005, op.d), s: op.s, r: Math.max(0.005, op.r * rel) };
      this.envs.push(e);
      // Self-feedback (needs a delay in the loop — one render quantum).
      if (alg.fb === i + 1 && p.fb > 0) {
        const fg = ctx.createGain();
        fg.gain.value = 0;
        const dl = ctx.createDelay(0.01);
        dl.delayTime.value = 0;
        osc.connect(fg); fg.connect(dl); dl.connect(osc.frequency);
        this.nodes.push(fg, dl);
        this.envs.push({ ...e, param: fg.gain, peak: FB_BETA[p.fb | 0] * op.ratio * REF });
      }
    }
    for (const e of this.envs) {
      e.param.setValueAtTime(0, t);
      e.param.linearRampToValueAtTime(e.peak, t + e.a);
      e.param.setTargetAtTime(e.peak * e.s, t + e.a, e.d / 3);
    }
    this.pitch.start(t);
    this.oscs.forEach((o) => o.start(t));
    // Safety: a voice with sustain is stopped by release(); purely decaying voices
    // (s == 0 everywhere) are auto-stopped after they fade out.
    if (this.envs.length && this.envs.every((e) => e.s === 0)) {
      const end = Math.max(...this.envs.map((e) => e.a + e.d * 2.5));
      this.autoEnd = t + end;
      this.stopAt(t + end + 0.05);
    }
    if (!this.oscs.length) this.stopAt(t + 0.01);
  }

  centsFor(midi) {
    return (midi - 69) * 100 + (this.part.tuneCents || 0);
  }

  glideTo(midi, t, glide) {
    this.midi = midi;
    this.base = this.centsFor(midi);
    const o = this.pitch.offset;
    o.cancelScheduledValues(t);
    if (glide > 0) o.setTargetAtTime(this.base, t, glide / 3);
    else o.setValueAtTime(this.base, t);
  }

  release(tr) {
    if (this.released) return;
    this.released = true;
    tr = Math.max(tr, this.ctx.currentTime);
    if (this.autoEnd && tr >= this.autoEnd) return;
    let maxR = 0.01;
    for (const e of this.envs) {
      const v = envAt(tr - this.t0, e.peak, e.a, e.d, e.s);
      e.param.cancelScheduledValues(tr);
      e.param.setValueAtTime(v, tr);
      e.param.setTargetAtTime(0, tr, e.r / 4);
      maxR = Math.max(maxR, e.r);
    }
    this.stopAt(tr + maxR * 1.6 + 0.05);
  }

  stopAt(t) {
    if (this.stopping && this.stopping <= t) return;
    this.stopping = t;
    const first = this.oscs[0];
    try { this.pitch.stop(t); } catch (e) { /* already stopped */ }
    this.oscs.forEach((o) => { try { o.stop(t); } catch (e) { /* noop */ } });
    const done = () => this.cleanup();
    if (first) first.onended = done; else this.pitch.onended = done;
  }

  cleanup() {
    if (this.dead) return;
    this.dead = true;
    const part = this.part;
    this.oscs.forEach((o) => { try { part.vib.disconnect(o.detune); } catch (e) { /* noop */ } o.disconnect(); });
    this.nodes.forEach((n) => n.disconnect());
    this.pitch.disconnect();
    this.out.disconnect();
    part.voices.delete(this);
  }
}

// A Part is one patch with its own voices, LFO and effect sends.
export class Part {
  constructor(engine, patch) {
    this.engine = engine;
    this.ctx = engine.ctx;
    const ctx = this.ctx;
    this.voiceBus = ctx.createGain();
    this.amp = ctx.createGain();
    this.level = ctx.createGain();
    this.voiceBus.connect(this.amp);
    this.amp.connect(this.level);
    this.level.connect(engine.dry);
    this.sendCho = ctx.createGain(); this.level.connect(this.sendCho); this.sendCho.connect(engine.choIn);
    this.sendDly = ctx.createGain(); this.level.connect(this.sendDly); this.sendDly.connect(engine.dlyIn);
    this.sendRev = ctx.createGain(); this.level.connect(this.sendRev); this.sendRev.connect(engine.revIn);
    this.lfo = ctx.createOscillator();
    this.vib = ctx.createGain();
    this.trem = ctx.createGain();
    this.lfo.connect(this.vib);
    this.lfo.connect(this.trem);
    this.trem.connect(this.amp.gain);
    this.lfo.start();
    this.voices = new Set();
    this.stack = [];
    this.monoVoice = null;
    this.idMap = new Map();
    this.nextId = 1;
    this.muted = [false, false, false, false, false, false];
    this.bright = 1; this.atkScale = 1; this.relScale = 1; this.tuneCents = 0;
    this.setPatch(patch);
  }

  setPatch(p) {
    this.patch = p;
    const t = this.ctx.currentTime;
    const lfo = p.lfo || { rate: 5, pitch: 0, amp: 0, wave: 'sine' };
    this.lfo.type = lfo.wave || 'sine';
    this.lfo.frequency.setTargetAtTime(lfo.rate || 5, t, 0.02);
    this.vib.gain.setTargetAtTime(lfo.pitch || 0, t, 0.02);
    const ad = Math.min(1, lfo.amp || 0);
    this.amp.gain.setTargetAtTime(1 - ad / 2, t, 0.02);
    this.trem.gain.setTargetAtTime(ad / 2, t, 0.02);
    const fx = p.fx || {};
    this.sendCho.gain.setTargetAtTime(fx.chorus || 0, t, 0.02);
    this.sendDly.gain.setTargetAtTime(fx.delay || 0, t, 0.02);
    this.sendRev.gain.setTargetAtTime(fx.reverb || 0, t, 0.02);
    this.level.gain.setTargetAtTime(p.gain ?? 0.8, t, 0.02);
  }

  noteOn(midi, vel = 0.8, t = this.ctx.currentTime) {
    const id = this.nextId++;
    const p = this.patch;
    if (!p.mono) {
      const v = new Voice(this, midi, vel, t);
      this.voices.add(v);
      this.idMap.set(id, v);
      return id;
    }
    this.stack.push({ id, midi });
    if (this.monoVoice && !this.monoVoice.released) {
      this.monoVoice.glideTo(midi, t, p.glide || 0);
    } else {
      const v = new Voice(this, midi, vel, t);
      this.voices.add(v);
      this.monoVoice = v;
    }
    return id;
  }

  noteOff(id, t = this.ctx.currentTime) {
    if (this.idMap.has(id)) {
      this.idMap.get(id).release(t);
      this.idMap.delete(id);
      return;
    }
    const i = this.stack.findIndex((s) => s.id === id);
    if (i < 0) return;
    const wasTop = i === this.stack.length - 1;
    this.stack.splice(i, 1);
    if (!this.monoVoice) return;
    if (!this.stack.length) {
      this.monoVoice.release(t);
      this.monoVoice = null;
    } else if (wasTop) {
      this.monoVoice.glideTo(this.stack[this.stack.length - 1].midi, t, this.patch.glide || 0);
    }
  }

  allOff(t = this.ctx.currentTime) {
    this.voices.forEach((v) => v.release(t));
    this.idMap.clear();
    this.stack = [];
    this.monoVoice = null;
  }

  dispose() {
    this.allOff();
    setTimeout(() => {
      try { this.lfo.stop(); } catch (e) { /* noop */ }
      [this.lfo, this.vib, this.trem, this.voiceBus, this.amp, this.level, this.sendCho, this.sendDly, this.sendRev].forEach((n) => n.disconnect());
    }, 4000);
  }
}

export class Engine {
  constructor() {
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC({ latencyHint: 'interactive' });
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.8;
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14;
    this.comp.knee.value = 12;
    this.comp.ratio.value = 4;
    this.comp.attack.value = 0.004;
    this.comp.release.value = 0.2;
    this.bus = ctx.createGain();
    this.bus.gain.value = 0.55;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.bus.connect(this.comp);
    this.comp.connect(this.master);
    this.master.connect(this.analyser);
    this.master.connect(ctx.destination);

    this.dry = ctx.createGain();
    this.dry.connect(this.bus);

    // Chorus: two modulated short delays panned apart.
    this.choIn = ctx.createGain();
    this.choLfo = ctx.createOscillator();
    this.choLfo.frequency.value = 0.55;
    [[0.012, -0.8, 0.0025], [0.019, 0.8, -0.0031]].forEach(([dt, pan, depth]) => {
      const d = ctx.createDelay(0.05);
      d.delayTime.value = dt;
      const g = ctx.createGain();
      g.gain.value = depth;
      this.choLfo.connect(g); g.connect(d.delayTime);
      const pn = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
      if (pn.pan) pn.pan.value = pan;
      this.choIn.connect(d); d.connect(pn); pn.connect(this.bus);
    });
    this.choLfo.start();

    // Delay with a darkening feedback loop.
    this.dlyIn = ctx.createGain();
    this.dly = ctx.createDelay(2);
    this.dlyFb = ctx.createGain();
    this.dlyLp = ctx.createBiquadFilter();
    this.dlyLp.type = 'lowpass';
    this.dlyLp.frequency.value = 3200;
    this.dlyIn.connect(this.dly);
    this.dly.connect(this.dlyLp);
    this.dlyLp.connect(this.dlyFb);
    this.dlyFb.connect(this.dly);
    this.dlyLp.connect(this.bus);
    this.setDelay(0.375, 0.35);

    // Reverb: synthetic stereo impulse response.
    this.revIn = ctx.createGain();
    this.rev = ctx.createConvolver();
    this.rev.buffer = this.makeIR(2.8);
    this.revIn.connect(this.rev);
    this.rev.connect(this.bus);
  }

  makeIR(sec) {
    const sr = this.ctx.sampleRate;
    const n = Math.floor(sr * sec);
    const buf = this.ctx.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        lp += (Math.random() * 2 - 1 - lp) * (0.55 - 0.4 * (t / sec));
        d[i] = lp * Math.exp(-t * 3.2) * (i < sr * 0.01 ? i / (sr * 0.01) : 1);
      }
    }
    return buf;
  }

  setDelay(time, fb) {
    const t = this.ctx.currentTime;
    this.dly.delayTime.setTargetAtTime(Math.min(1.9, time), t, 0.05);
    this.dlyFb.gain.setTargetAtTime(Math.min(0.85, fb), t, 0.05);
  }

  setMaster(v) {
    this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }

  part(patch) { return new Part(this, patch); }
}
