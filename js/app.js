import { Engine, ALGORITHMS } from './engine.js';
import { PRESETS, clonePatch, findPreset } from './presets.js';
import { SONGS } from './songs.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const noteName = (m) => NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const pad3 = (n) => String(n).padStart(3, '0');

// ---------------------------------------------------------------- keyboard layout
const KEY_LOW = 53; // F3 at octave 0
const WHITE_OFF = [0, 2, 4, 6, 7, 9, 11]; // F G A B C D E (semitones from F)
const WHITES = Array.from({ length: 16 }, (_, i) => 12 * Math.floor(i / 7) + WHITE_OFF[i % 7]);
const BLACK_AFTER = [0, 1, 2, 4, 5, 7, 8, 9, 11, 12, 14];
const BLACK_FN = ['OP1', 'OP2', 'OP3', 'OP4', 'OP5', 'OP6', 'MT', 'GLO', 'MONO', 'POLY', ''];
const BLACKS = BLACK_AFTER.map((i, k) => ({ off: WHITES[i] + 1, x: 40 + 62 * i + 31, fn: BLACK_FN[k] }));
const KEY_RANGE = 27; // F..G inclusive
const QWERTY = {
  KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyR: 5, KeyF: 6, KeyG: 7, KeyY: 8, KeyH: 9, KeyU: 10,
  KeyJ: 11, KeyK: 12, KeyO: 13, KeyL: 14, KeyP: 15, Semicolon: 16, BracketLeft: 17, Quote: 18,
};

// ---------------------------------------------------------------- state
const USER_KEY = 'ai-synth-user-patches';
let userPatches = [];
try { userPatches = JSON.parse(localStorage.getItem(USER_KEY) || '[]'); } catch (e) { userPatches = []; }
const bank = () => PRESETS.concat(userPatches);

const RATIOS = [0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const ARP_MODES = ['OFF', 'UP', 'DOWN', 'UP/DN', 'RANDOM', 'ORDER'];
const ARP_RATES = [['1/4', 1], ['1/8', 0.5], ['1/8T', 1 / 3], ['1/16', 0.25], ['1/32', 0.125]];
const WAVES = ['sine', 'triangle', 'square', 'sawtooth'];
const SONG_CHOICES = ['PATTERN'].concat(SONGS.map((s) => s.title));

const startIndex = PRESETS.findIndex((p) => p.name === 'TIMBALI');
const state = {
  page: 'home', op: 0, presetIndex: startIndex, patch: clonePatch(PRESETS[startIndex]), edited: false,
  octave: 0, transpose: 0, tune: 0, master: 0.8, tempo: 120,
  bright: 1, atk: 1, rel: 1,
  arp: { mode: 0, lastMode: 1, rate: 3, oct: 1, gate: 0.6 },
  seq: {
    steps: [53, null, 65, 53, 60, null, 63, 65, 53, null, 68, 67, 63, null, 60, 58], len: 16, gate: 0.5, pos: 0, rec: false, recPos: 0,
  },
  song: 1, playing: false, shift: false,
  popup: null, muted: [false, false, false, false, false, false],
};

let engine = null;
let kb = null; // keyboard Part

function ensureAudio() {
  if (!engine) {
    engine = new Engine();
    kb = engine.part(state.patch);
    applyPartSettings(kb);
    engine.setMaster(state.master);
    engine.setDelay(60 / state.tempo * 0.75, 0.35);
    // iOS unlock: play one silent sample inside the gesture.
    const b = engine.ctx.createBuffer(1, 1, engine.ctx.sampleRate);
    const s = engine.ctx.createBufferSource(); s.buffer = b; s.connect(engine.ctx.destination); s.start(0);
    setInterval(tick, 25);
    markDirty();
  }
  if (engine.ctx.state !== 'running') engine.ctx.resume();
  return engine;
}
['pointerdown', 'keydown', 'touchend'].forEach((ev) => document.addEventListener(ev, (e) => {
  if (ev === 'keydown' && (e.metaKey || e.ctrlKey || e.altKey)) return;
  ensureAudio();
}, { capture: true }));

function applyPartSettings(part) {
  part.bright = state.bright; part.atkScale = state.atk; part.relScale = state.rel;
  part.tuneCents = state.tune; part.muted = state.muted;
  part.setPatch(state.patch);
}
function patchChanged(soft = true) {
  state.edited = soft;
  if (kb) applyPartSettings(kb);
  markDirty();
}
function loadPreset(i) {
  const b = bank();
  state.presetIndex = ((i % b.length) + b.length) % b.length;
  state.patch = clonePatch(b[state.presetIndex]);
  state.muted = [false, false, false, false, false, false];
  state.edited = false;
  if (kb) { kb.allOff(); applyPartSettings(kb); }
  showPopup('PRESET', presetLabel());
  markDirty();
}
const presetLabel = () => `${pad3(state.presetIndex + 1)} ${state.patch.name}${state.edited ? '*' : ''}`;

// ---------------------------------------------------------------- params / pages
const num = (l, min, max, step, get, set, fmt) => ({ l, type: 'num', min, max, step, get, set, fmt: fmt || ((v) => (+v).toFixed(step < 1 ? 2 : 0)) });
const logp = (l, min, max, get, set, fmt) => ({ l, type: 'log', min, max, get, set, fmt });
const en = (l, opts, get, set) => ({ l, type: 'enum', opts, get, set, fmt: (v) => opts[v] });
const sec = (v) => (v < 1 ? Math.round(v * 1000) + 'ms' : v.toFixed(2) + 's');
const curOp = () => state.patch.ops[state.op];

const PAGES = {
  home: { tab: 'HOME', knobs: [
    num('BRIGHT', 0.3, 1.6, 0.02, () => state.bright, (v) => { state.bright = v; patchChanged(state.edited); }, (v) => Math.round(v * 100) + '%'),
    logp('ATTACK', 0.1, 10, () => state.atk, (v) => { state.atk = v; patchChanged(state.edited); }, (v) => 'x' + v.toFixed(2)),
    logp('RELEASE', 0.1, 10, () => state.rel, (v) => { state.rel = v; patchChanged(state.edited); }, (v) => 'x' + v.toFixed(2)),
    num('TEMPO', 40, 220, 1, () => state.tempo, (v) => { state.tempo = v; if (engine) engine.setDelay(60 / v * 0.75, 0.35); }, (v) => v + 'bpm'),
  ] },
  edit: { tab: 'OSC', knobs: [
    { l: 'RATIO', type: 'enum', opts: RATIOS, get: () => nearestRatio(curOp().ratio), set: (i) => { curOp().ratio = RATIOS[i]; patchChanged(); }, fmt: (i) => (curOp().ratio).toFixed(curOp().ratio % 1 ? 3 : 2) },
    num('DETUNE', -50, 50, 1, () => curOp().det || 0, (v) => { curOp().det = v; patchChanged(); }, (v) => (v > 0 ? '+' : '') + v + 'c'),
    num('LEVEL', 0, 99, 1, () => curOp().level, (v) => { curOp().level = v; patchChanged(); }),
    num('FEEDBK', 0, 7, 1, () => state.patch.fb, (v) => { state.patch.fb = v; patchChanged(); }),
  ] },
  env: { tab: 'ENV', knobs: [
    logp('ATTACK', 0.001, 4, () => curOp().a, (v) => { curOp().a = v; patchChanged(); }, sec),
    logp('DECAY', 0.01, 8, () => curOp().d, (v) => { curOp().d = v; patchChanged(); }, sec),
    num('SUSTAIN', 0, 1, 0.01, () => curOp().s, (v) => { curOp().s = v; patchChanged(); }, (v) => Math.round(v * 100) + '%'),
    logp('RELEASE', 0.01, 8, () => curOp().r, (v) => { curOp().r = v; patchChanged(); }, sec),
  ] },
  lfo: { tab: 'LFO', knobs: [
    logp('RATE', 0.05, 20, () => state.patch.lfo.rate, (v) => { state.patch.lfo.rate = v; patchChanged(); }, (v) => v.toFixed(2) + 'Hz'),
    num('PITCH', 0, 100, 1, () => state.patch.lfo.pitch, (v) => { state.patch.lfo.pitch = v; patchChanged(); }, (v) => v + 'c'),
    num('AMP', 0, 1, 0.01, () => state.patch.lfo.amp, (v) => { state.patch.lfo.amp = v; patchChanged(); }, (v) => Math.round(v * 100) + '%'),
    en('WAVE', ['SIN', 'TRI', 'SQR', 'SAW'], () => Math.max(0, WAVES.indexOf(state.patch.lfo.wave)), (i) => { state.patch.lfo.wave = WAVES[i]; patchChanged(); }),
  ] },
  fx: { tab: 'FX', knobs: [
    num('CHORUS', 0, 1, 0.01, () => state.patch.fx.chorus, (v) => { state.patch.fx.chorus = v; patchChanged(); }, (v) => Math.round(v * 100) + '%'),
    num('DELAY', 0, 1, 0.01, () => state.patch.fx.delay, (v) => { state.patch.fx.delay = v; patchChanged(); }, (v) => Math.round(v * 100) + '%'),
    num('REVERB', 0, 1, 0.01, () => state.patch.fx.reverb, (v) => { state.patch.fx.reverb = v; patchChanged(); }, (v) => Math.round(v * 100) + '%'),
    num('LEVEL', 0.1, 1.2, 0.01, () => state.patch.gain ?? 0.8, (v) => { state.patch.gain = v; patchChanged(); }, (v) => Math.round(v * 100) + '%'),
  ] },
  arp: { tab: 'ARP', knobs: [
    en('MODE', ARP_MODES, () => state.arp.mode, (i) => { state.arp.mode = i; if (i) state.arp.lastMode = i; arpModeChanged(); }),
    en('RATE', ARP_RATES.map((r) => r[0]), () => state.arp.rate, (i) => { state.arp.rate = i; }),
    num('OCTAVE', 1, 3, 1, () => state.arp.oct, (v) => { state.arp.oct = v; }),
    num('GATE', 0.1, 1, 0.01, () => state.arp.gate, (v) => { state.arp.gate = v; }, (v) => Math.round(v * 100) + '%'),
  ] },
  seq: { tab: 'SEQ', knobs: [
    num('LENGTH', 1, 16, 1, () => state.seq.len, (v) => { state.seq.len = v; }),
    num('TEMPO', 40, 220, 1, () => state.tempo, (v) => { state.tempo = v; }, (v) => v + 'bpm'),
    num('GATE', 0.1, 1, 0.01, () => state.seq.gate, (v) => { state.seq.gate = v; }, (v) => Math.round(v * 100) + '%'),
    en('SONG', SONG_CHOICES, () => state.song, (i) => selectSong(i)),
  ] },
  glo: { tab: 'GLOBAL', knobs: [
    logp('GLIDE', 0.001, 1, () => Math.max(0.001, state.patch.glide || 0.001), (v) => { state.patch.glide = v <= 0.0011 ? 0 : v; patchChanged(); }, (v) => (v <= 0.0011 ? 'OFF' : sec(v))),
    en('VOICE', ['POLY', 'MONO'], () => (state.patch.mono ? 1 : 0), (i) => { setMono(!!i); }),
    num('TRANSP', -12, 12, 1, () => state.transpose, (v) => { state.transpose = v; }, (v) => (v > 0 ? '+' : '') + v),
    num('TUNE', -50, 50, 1, () => state.tune, (v) => { state.tune = v; patchChanged(state.edited); }, (v) => (v > 0 ? '+' : '') + v + 'c'),
  ] },
};
function nearestRatio(r) {
  let best = 0;
  RATIOS.forEach((x, i) => { if (Math.abs(x - r) < Math.abs(RATIOS[best] - r)) best = i; });
  return best;
}
function setMono(m) {
  if (kb) kb.allOff();
  state.patch.mono = m;
  patchChanged();
  showPopup('VOICE', m ? 'MONO' : 'POLY');
}

// normalized 0..1 position for knob artwork
function norm(p) {
  const v = p.get();
  if (p.type === 'enum') return p.opts.length > 1 ? v / (p.opts.length - 1) : 0;
  if (p.type === 'log') return Math.log(v / p.min) / Math.log(p.max / p.min);
  return (v - p.min) / (p.max - p.min);
}
function nudge(p, dn, acc) {
  // dn: normalized delta (1 = full travel). Enum params accumulate detents.
  if (p.type === 'enum') {
    acc.v += dn * Math.max(8, p.opts.length * 1.2);
    let i = p.get();
    while (acc.v >= 1) { i++; acc.v -= 1; }
    while (acc.v <= -1) { i--; acc.v += 1; }
    i = clamp(i, 0, p.opts.length - 1);
    if (i !== p.get()) p.set(i);
  } else if (p.type === 'log') {
    const v = Math.exp(clamp(Math.log(p.get()) + dn * Math.log(p.max / p.min), Math.log(p.min), Math.log(p.max)));
    p.set(v);
  } else {
    acc.v += dn * (p.max - p.min);
    const steps = Math.trunc(acc.v / p.step);
    if (steps) {
      acc.v -= steps * p.step;
      const v = clamp(Math.round((p.get() + steps * p.step) / p.step) * p.step, p.min, p.max);
      p.set(+v.toFixed(4));
    }
  }
  showPopup(p.l, p.fmt(p.get()));
}

// fixed knobs
const FIXED = {
  master: num('MASTER', 0, 1, 0.01, () => state.master, (v) => { state.master = v; if (engine) engine.setMaster(v); }, (v) => Math.round(v * 100) + '%'),
  presets: { l: 'PRESET', type: 'enum', get opts() { return bank(); }, get: () => state.presetIndex, set: (i) => loadPreset(i), fmt: () => presetLabel() },
  algorithm: { l: 'ALGORITHM', type: 'enum', opts: ALGORITHMS, get: () => state.patch.alg, set: (i) => { state.patch.alg = i; patchChanged(); state.algPopup = performance.now(); }, fmt: (i) => 'ALG ' + (i + 1) },
  select: { l: 'OPERATOR', type: 'enum', opts: [1, 2, 3, 4, 5, 6], get: () => state.op, set: (i) => selectOp(i), fmt: (i) => 'OP' + (i + 1) },
};
function knobParam(name) {
  if (FIXED[name]) return FIXED[name];
  const k = +name.slice(1) - 1;
  return PAGES[state.page].knobs[k];
}
function selectOp(i) {
  state.op = clamp(i, 0, 5);
  if (!['edit', 'env'].includes(state.page)) state.page = 'edit';
  markDirty();
}

// ---------------------------------------------------------------- build keyboard DOM
const keyEls = new Map(); // offset -> [elements]
function buildKeys(container, whiteCount, geom) {
  const add = (off, el) => { if (!keyEls.has(off)) keyEls.set(off, []); keyEls.get(off).push(el); };
  for (let i = 0; i < whiteCount; i++) {
    const el = document.createElement('div');
    el.className = 'key white';
    geom.white(el, i);
    el.dataset.off = WHITES[i];
    container.appendChild(el);
    add(WHITES[i], el);
  }
  BLACKS.forEach((b, k) => {
    const wi = BLACK_AFTER[k];
    if (wi >= whiteCount - 1) return;
    const el = document.createElement('div');
    el.className = 'key black';
    geom.black(el, wi);
    el.dataset.off = b.off;
    if (b.fn) { el.dataset.fn = b.fn; el.innerHTML = `<span>${b.fn}</span>`; }
    container.appendChild(el);
    add(b.off, el);
  });
  container.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('.key');
    if (!el) return;
    e.preventDefault();
    const src = 'p' + e.pointerId;
    pointerKey(src, el);
    const move = (ev) => {
      if (ev.pointerId !== e.pointerId) return;
      const t = document.elementFromPoint(ev.clientX, ev.clientY);
      const k = t && t.closest && t.closest('.key');
      if (k && k !== activePtr.get(src)?.el && container.contains(k)) { liveOff(src); pointerKey(src, k); }
    };
    const up = (ev) => {
      if (ev.pointerId !== e.pointerId) return;
      liveOff(src); activePtr.delete(src);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  });
}
const activePtr = new Map();
function pointerKey(src, el) {
  activePtr.set(src, { el });
  if (state.shift && el.dataset.fn) { keyFunction(el.dataset.fn); return; }
  liveOn(src, KEY_LOW + state.octave * 12 + +el.dataset.off);
}

buildKeys($('#keybed'), 16, {
  white: (el, i) => { el.style.left = (40 + 62 * i) + 'px'; },
  black: (el, i) => { el.style.left = (40 + 62 * i + 31) + 'px'; },
});
[3, 6, 10, 13].forEach((i) => {
  const d = document.createElement('div'); d.className = 'dot'; d.style.left = (40 + 62 * i + 31) + 'px';
  $('#keybed').appendChild(d);
});
// Phone keyboard: first 10 whites (F3..A4), percentage geometry.
const BIGN = 10;
buildKeys($('#bigkeys'), BIGN, {
  white: (el, i) => { el.style.left = `calc(${(i / BIGN) * 100}% + 3px)`; el.style.width = `calc(${100 / BIGN}% - 6px)`; },
  black: (el, i) => { el.style.left = `calc(${((i + 0.5) / BIGN) * 100}% + 5px)`; el.style.width = `calc(${100 / BIGN}% - 10px)`; },
});

// keyboard map in help
(() => {
  const order = Object.entries(QWERTY).sort((a, b) => a[1] - b[1]);
  const html = order.map(([code, off]) => {
    const isBlack = [1, 3, 5, 8, 10, 13, 15, 17].includes(off);
    const key = code.replace('Key', '').replace('Semicolon', ';').replace('BracketLeft', '[').replace('Quote', "'");
    return `<div class="${isBlack ? 'b' : 'w'}"><b>${key}</b>${NAMES[(off + 5) % 12]}</div>`;
  }).join('');
  $('#kmap').innerHTML = html;
})();

// ---------------------------------------------------------------- key lights
const lightCount = new Map();
function lightKey(midi, on, cls) {
  let off = midi - (KEY_LOW + state.octave * 12);
  if (cls === 'song') { while (off < 0) off += 12; while (off >= KEY_RANGE) off -= 12; }
  const els = keyEls.get(off);
  if (!els) return;
  const k = off + cls;
  const c = (lightCount.get(k) || 0) + (on ? 1 : -1);
  lightCount.set(k, Math.max(0, c));
  els.forEach((el) => el.classList.toggle(cls, c > 0));
}
function clearLights(cls) {
  for (const k of [...lightCount.keys()]) if (k.endsWith(cls)) lightCount.delete(k);
  $$('.key.' + cls).forEach((el) => el.classList.remove(cls));
}

// ---------------------------------------------------------------- live notes
const held = new Map();
let lastNote = null;
function liveOn(src, midi, vel = 0.8, raw = false) {
  ensureAudio();
  if (held.has(src)) liveOff(src);
  const m = midi + state.transpose;
  lastNote = m;
  if (state.seq.rec) recordStep(m);
  if (state.arp.mode) {
    arpHeld.push({ src, midi: m, order: arpSerial++ });
    held.set(src, { midi, arp: true });
    if (arpNext == null) { arpNext = engine.ctx.currentTime + 0.005; arpIdx = 0; }
  } else {
    const id = kb.noteOn(m, vel);
    held.set(src, { midi, id });
  }
  lightKey(midi + (raw ? 0 : 0), true, 'on');
  markDirty();
}
function liveOff(src) {
  const h = held.get(src);
  if (!h) return;
  held.delete(src);
  if (h.arp) {
    const i = arpHeld.findIndex((a) => a.src === src);
    if (i >= 0) arpHeld.splice(i, 1);
  } else if (kb) kb.noteOff(h.id);
  lightKey(h.midi, false, 'on');
}
function releaseAllLive() {
  for (const src of [...held.keys()]) liveOff(src);
}

// ---------------------------------------------------------------- arpeggiator
let arpHeld = [];
let arpSerial = 0;
let arpNext = null;
let arpIdx = 0;
function arpModeChanged() {
  releaseAllLive();
  arpHeld = []; arpNext = null;
  $('[data-btn="arp"]').classList.toggle('lit', !!state.arp.mode);
  markDirty();
}
function arpSequence() {
  const notes = state.arp.mode === 5 ? arpHeld.slice().sort((a, b) => a.order - b.order) : arpHeld.slice().sort((a, b) => a.midi - b.midi);
  const base = notes.map((n) => n.midi);
  let seq = [];
  for (let o = 0; o < state.arp.oct; o++) seq = seq.concat(base.map((m) => m + 12 * o));
  if (state.arp.mode === 2) seq.reverse();
  if (state.arp.mode === 3 && seq.length > 2) seq = seq.concat(seq.slice(1, -1).reverse());
  return seq;
}
function serviceArp(now, horizon) {
  if (!state.arp.mode || arpNext == null) return;
  if (!arpHeld.length) { arpNext = null; return; }
  const step = ARP_RATES[state.arp.rate][1] * 60 / state.tempo;
  while (arpNext < horizon) {
    const seq = arpSequence();
    if (!seq.length) break;
    const m = state.arp.mode === 4 ? seq[Math.floor(Math.random() * seq.length)] : seq[arpIdx % seq.length];
    arpIdx++;
    const t = Math.max(arpNext, now);
    const id = kb.noteOn(m, 0.8, t);
    kb.noteOff(id, t + step * state.arp.gate);
    queueVis(t, m, true, 'on', step * state.arp.gate);
    arpNext += step;
  }
}

// ---------------------------------------------------------------- step sequencer
function recordStep(m) {
  const s = state.seq;
  s.steps[s.recPos] = m;
  s.recPos = (s.recPos + 1) % s.len;
  showPopup('STEP ' + (s.recPos === 0 ? s.len : s.recPos), noteName(m));
}
function recordRest() {
  const s = state.seq;
  s.steps[s.recPos] = null;
  s.recPos = (s.recPos + 1) % s.len;
  showPopup('STEP ' + (s.recPos === 0 ? s.len : s.recPos), 'REST');
}

// ---------------------------------------------------------------- transport
const tr = { mode: null, t0: 0, i: 0, events: [], song: null, parts: {}, nextStep: 0, step: 0 };
const vis = [];
function queueVis(t, midi, on, cls, dur, part) {
  vis.push({ t, midi, on: true, cls, part });
  if (dur != null) vis.push({ t: t + dur, midi, on: false, cls, part });
}

function selectSong(i) {
  const was = state.playing;
  if (was) stop();
  state.song = i;
  $$('#songpills .pill').forEach((p, k) => p.setAttribute('aria-checked', String(k === i)));
  markDirty();
}

function play(startBeat = 0) {
  ensureAudio();
  if (state.playing) return;
  const ctx = engine.ctx;
  state.playing = true;
  tr.t0 = ctx.currentTime + 0.12;
  if (state.song === 0) {
    tr.mode = 'seq'; tr.nextStep = tr.t0; tr.step = 0;
  } else {
    const song = SONGS[state.song - 1];
    tr.mode = 'song'; tr.song = song; tr.i = 0;
    tr.parts = {};
    for (const [k, def] of Object.entries(song.parts)) {
      const p = Object.assign(findPreset(def.preset), def.override || {});
      tr.parts[k] = engine.part(p);
    }
    engine.setDelay(song.delay.time, song.delay.fb);
    const ev = [];
    song.notes.forEach((n, idx) => { ev.push({ t: n[0], type: 0, n, idx }); ev.push({ t: n[0] + n[1], type: 1, n, idx }); });
    ev.sort((a, b) => a.t - b.t || a.type - b.type || a.idx - b.idx);
    tr.events = ev;
    tr.t0 -= startBeat * 60 / song.bpm;
    tr.i = ev.findIndex((e) => e.t >= startBeat && e.type === 0);
    if (tr.i < 0) tr.i = ev.length;
    tr.ids = new Map();
    tr.meters = Object.fromEntries(Object.keys(song.parts).map((k) => [k, 0]));
  }
  updateTransportUI();
  markDirty();
}
function stop() {
  if (!state.playing) return;
  state.playing = false;
  if (tr.mode === 'song') {
    Object.values(tr.parts).forEach((p) => p.dispose());
    tr.parts = {};
    if (engine) engine.setDelay(60 / state.tempo * 0.75, 0.35);
  }
  if (kb && tr.mode === 'seq') kb.allOff();
  tr.mode = null;
  vis.length = 0;
  clearLights('song');
  if (tr.seqLit) { clearLights('on'); tr.seqLit = false; for (const h of held.values()) lightKey(h.midi, true, 'on'); }
  updateTransportUI();
  markDirty();
}
function togglePlay() { if (state.playing) stop(); else play(); }

function tick() {
  if (!engine) return;
  const ctx = engine.ctx;
  const now = ctx.currentTime;
  const horizon = now + 0.15;
  serviceArp(now, horizon);
  if (!state.playing) return;
  if (tr.mode === 'song') {
    const song = tr.song;
    const spb = 60 / song.bpm;
    while (tr.i < tr.events.length) {
      const e = tr.events[tr.i];
      const t = tr.t0 + e.t * spb;
      if (t > horizon) break;
      const n = e.n;
      const part = tr.parts[n[4]];
      if (e.type === 0) {
        tr.ids.set(e.idx, part.noteOn(n[2], n[3], Math.max(t, now)));
        const show = song.parts[n[4]].show;
        vis.push({ t, midi: n[2], on: true, cls: show ? 'song' : null, part: n[4] });
      } else {
        const id = tr.ids.get(e.idx);
        if (id != null) part.noteOff(id, Math.max(t, now));
        tr.ids.delete(e.idx);
        const show = song.parts[n[4]].show;
        if (show) vis.push({ t, midi: n[2], on: false, cls: 'song', part: n[4] });
      }
      tr.i++;
    }
    if (tr.i >= tr.events.length && now > tr.t0 + song.length * spb) stop();
  } else if (tr.mode === 'seq') {
    const stepDur = 0.25 * 60 / state.tempo;
    while (tr.nextStep < horizon) {
      const s = state.seq;
      const idx = tr.step % s.len;
      const m = s.steps[idx];
      const t = tr.nextStep;
      if (m != null) {
        const mm = m + state.octave * 12 + state.transpose;
        const id = kb.noteOn(mm, 0.8, t);
        kb.noteOff(id, t + stepDur * s.gate);
        vis.push({ t, midi: m + state.octave * 12, on: true, cls: 'on', seq: true });
        vis.push({ t: t + stepDur * s.gate, midi: m + state.octave * 12, on: false, cls: 'on', seq: true });
      }
      vis.push({ t, step: idx });
      tr.step++;
      tr.nextStep += stepDur;
    }
  }
}

function updateTransportUI() {
  $('[data-btn="play"]').classList.toggle('lit', state.playing);
  const bp = $('#bigplay');
  bp.classList.toggle('playing', state.playing);
  bp.innerHTML = state.playing ? '&#9632;' : '&#9654;';
  bp.setAttribute('aria-label', state.playing ? 'Stop' : 'Play');
  $('#nowplaying').textContent = state.playing ? `Playing: ${SONG_CHOICES[state.song]}` : `Stopped. Selected: ${SONG_CHOICES[state.song]}`;
}

// ---------------------------------------------------------------- buttons
function keyFunction(fn) {
  if (fn.startsWith('OP')) { selectOp(+fn.slice(2) - 1); showPopup('OPERATOR', fn); return; }
  if (fn === 'MT') {
    state.muted[state.op] = !state.muted[state.op];
    patchChanged(state.edited);
    showPopup('OP' + (state.op + 1), state.muted[state.op] ? 'MUTED' : 'ON');
    return;
  }
  if (fn === 'GLO') { state.patch.glide = state.patch.glide ? 0 : 0.08; patchChanged(); showPopup('GLIDE', state.patch.glide ? sec(state.patch.glide) : 'OFF'); return; }
  if (fn === 'MONO') setMono(true);
  if (fn === 'POLY') setMono(false);
}

function setOctave(o) {
  releaseAllLive();
  state.octave = clamp(o, -3, 3);
  $('[data-btn="octdown"]').classList.toggle('lit', state.octave < 0);
  $('[data-btn="octup"]').classList.toggle('lit', state.octave > 0);
  clearLights('song');
  showPopup('OCTAVE', (state.octave > 0 ? '+' : '') + state.octave);
}

function savePatch() {
  const p = clonePatch(state.patch);
  const base = p.name.replace(/\*$/, '').replace(/^U\d+ /, '');
  p.name = `U${userPatches.length + 1} ${base}`.slice(0, 16);
  userPatches.push(p);
  try { localStorage.setItem(USER_KEY, JSON.stringify(userPatches)); } catch (e) { /* storage may be blocked */ }
  state.presetIndex = PRESETS.length + userPatches.length - 1;
  state.patch = clonePatch(p);
  state.edited = false;
  showPopup('SAVED', `${pad3(state.presetIndex + 1)} ${p.name}`);
}

let selDownAt = 0;
let selUsed = false;
function onButton(name, down) {
  if (name === 'sel') {
    if (down) { state.shift = true; selDownAt = performance.now(); selUsed = false; }
    else {
      state.shift = false;
      if (!selUsed && performance.now() - selDownAt < 400) {
        if (state.seq.rec) recordRest(); else { selectOp((state.op + 1) % 6); showPopup('OPERATOR', 'OP' + (state.op + 1)); }
      }
    }
    markDirty();
    return;
  }
  if (!down) return;
  if (state.shift) selUsed = true;
  switch (name) {
    case 'octdown': setOctave(state.octave - 1); break;
    case 'octup': setOctave(state.octave + 1); break;
    case 'home': case 'fx': case 'env': case 'lfo': case 'edit': case 'glo': case 'seq':
      state.page = name; break;
    case 'arp':
      state.arp.mode = state.arp.mode ? 0 : state.arp.lastMode;
      state.page = 'arp';
      arpModeChanged();
      showPopup('ARP', ARP_MODES[state.arp.mode]);
      break;
    case 'rec':
      state.seq.rec = !state.seq.rec;
      if (state.seq.rec) { state.seq.recPos = 0; state.page = 'seq'; }
      $('[data-btn="rec"]').classList.toggle('lit', state.seq.rec);
      showPopup('STEP REC', state.seq.rec ? 'ON' : 'OFF');
      break;
    case 'play': togglePlay(); break;
    case 'save': savePatch(); break;
    default: break;
  }
  markDirty();
}
$$('[data-btn]').forEach((b) => {
  const name = b.dataset.btn;
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.classList.add('down'); onButton(name, true); });
  const up = () => { if (b.classList.contains('down')) { b.classList.remove('down'); onButton(name, false); } };
  b.addEventListener('pointerup', up);
  b.addEventListener('pointerleave', up);
  b.addEventListener('pointercancel', up);
  b.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); e.stopPropagation(); onButton(name, true); if (name === 'sel') onButton(name, false); } });
});

// ---------------------------------------------------------------- knobs
const knobAcc = {};
$$('.knob').forEach((el) => {
  const name = el.dataset.knob;
  knobAcc[name] = { v: 0 };
  let lastY = null;
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    lastY = e.clientY;
    el.focus({ preventScroll: true });
  });
  el.addEventListener('pointermove', (e) => {
    if (lastY == null) return;
    const s = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--s')) || 1;
    const dy = (lastY - e.clientY) / s;
    lastY = e.clientY;
    const p = knobParam(name);
    if (p) nudge(p, dy / 220, knobAcc[name]);
    markDirty();
  });
  const end = () => { lastY = null; knobAcc[name].v = 0; };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = knobParam(name);
    if (p) nudge(p, -Math.sign(e.deltaY) * (p.type === 'enum' ? 1 / Math.max(8, p.opts.length * 1.2) + 0.001 : 0.02), knobAcc[name]);
    markDirty();
  }, { passive: false });
  el.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault(); e.stopPropagation();
    const p = knobParam(name);
    const dir = e.key === 'ArrowUp' ? 1 : -1;
    if (p) nudge(p, dir * (p.type === 'enum' ? 1 / Math.max(8, p.opts.length * 1.2) + 0.001 : 0.02), knobAcc[name]);
    knobAcc[name].v = 0;
    markDirty();
  });
  el.addEventListener('dblclick', () => {
    if (!/^k\d$/.test(name)) return;
    const p = knobParam(name);
    if (p && p.type !== 'enum') {
      const def = { BRIGHT: 1, ATTACK: 1, RELEASE: 1, TEMPO: 120, DETUNE: 0, TRANSP: 0, TUNE: 0 }[p.l];
      if (def != null && PAGES[state.page].tab !== 'ENV') { p.set(def); showPopup(p.l, p.fmt(p.get())); markDirty(); }
    }
  });
});
function updateKnobs() {
  $$('.knob').forEach((el) => {
    const p = knobParam(el.dataset.knob);
    let n = p ? norm(p) : 0;
    if (el.dataset.knob === 'presets') n = state.presetIndex / Math.max(1, bank().length - 1);
    el.style.setProperty('--a', (-135 + 270 * clamp(n, 0, 1)) + 'deg');
    if (p) el.setAttribute('aria-valuetext', `${p.l} ${p.fmt(p.get())}`);
  });
}

// ---------------------------------------------------------------- QWERTY + MIDI
window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  if (e.key === 'Shift') { state.shift = true; markDirty(); return; }
  if (e.repeat) { if (QWERTY[e.code] != null || e.code === 'Space') e.preventDefault(); return; }
  if (e.code === 'Space') { e.preventDefault(); togglePlay(); return; }
  if (e.code === 'KeyZ') { setOctave(state.octave - 1); return; }
  if (e.code === 'KeyX') { setOctave(state.octave + 1); return; }
  if (e.code === 'ArrowLeft') { e.preventDefault(); loadPreset(state.presetIndex - 1); return; }
  if (e.code === 'ArrowRight') { e.preventDefault(); loadPreset(state.presetIndex + 1); return; }
  const off = QWERTY[e.code];
  if (off == null) return;
  e.preventDefault();
  if (state.shift) {
    const b = BLACKS.find((x) => x.off === off);
    if (b && b.fn) { keyFunction(b.fn); markDirty(); }
    return;
  }
  liveOn('k' + e.code, KEY_LOW + state.octave * 12 + off);
});
window.addEventListener('keyup', (e) => {
  if (e.key === 'Shift') { state.shift = false; markDirty(); return; }
  if (QWERTY[e.code] != null) liveOff('k' + e.code);
});
window.addEventListener('blur', () => { releaseAllLive(); state.shift = false; });

$('#midibtn').addEventListener('click', async () => {
  const btn = $('#midibtn');
  if (!navigator.requestMIDIAccess) { btn.textContent = 'MIDI: not supported'; return; }
  try {
    const access = await navigator.requestMIDIAccess();
    const hook = () => {
      let n = 0;
      access.inputs.forEach((inp) => {
        n++;
        inp.onmidimessage = (msg) => {
          const [st, d1, d2] = msg.data;
          const cmd = st & 0xf0;
          if (cmd === 0x90 && d2 > 0) liveOn('m' + d1, d1, d2 / 127);
          else if (cmd === 0x80 || (cmd === 0x90 && d2 === 0)) liveOff('m' + d1);
          else if (cmd === 0xb0 && d1 === 1) { state.patch.lfo.pitch = Math.round(d2 / 127 * 60); patchChanged(); }
        };
      });
      btn.textContent = n ? `MIDI: ${n} input${n > 1 ? 's' : ''}` : 'MIDI: no inputs';
      btn.classList.toggle('on', n > 0);
    };
    hook();
    access.onstatechange = hook;
  } catch (err) {
    btn.textContent = 'MIDI: blocked';
  }
});

// ---------------------------------------------------------------- songs UI
SONG_CHOICES.forEach((name, i) => {
  const b = document.createElement('button');
  b.className = 'pill';
  b.setAttribute('role', 'radio');
  b.setAttribute('aria-checked', String(i === state.song));
  b.textContent = name;
  b.addEventListener('click', () => { ensureAudio(); selectSong(i); });
  $('#songpills').appendChild(b);
});
$('#bigplay').addEventListener('click', () => { ensureAudio(); togglePlay(); });

// ---------------------------------------------------------------- popups / LCD
function showPopup(label, value) {
  state.popup = { label, value, t: performance.now() };
  markDirty();
}
let dirty = true;
function markDirty() { dirty = true; }

const lcd = $('#lcd');
const g = lcd.getContext('2d');
const W = 207, H = 214;
const INK = '#1c2633';
const INK2 = 'rgba(28,38,51,0.55)';
const LCD_BG = '#b9c7d8';
const TAB = '#e6ecf3';
function resizeLCD() {
  const s = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--s')) || 1;
  const k = Math.min(4, Math.max(1, s * (window.devicePixelRatio || 1)));
  lcd.width = Math.round(W * k); lcd.height = Math.round(H * k);
  g.setTransform(k, 0, 0, k, 0, 0);
  markDirty();
}
const font = (px, w = 500) => `${w} ${px}px 'IBM Plex Mono', ui-monospace, Menlo, monospace`;
function text(s, x, y, px = 12, w = 500, color = INK, align = 'left') {
  g.font = font(px, w); g.fillStyle = color; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(s, x, y);
}
function rrect(x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

function algLayout(ai) {
  const alg = ALGORITHMS[ai];
  const mods = (o) => alg.m.filter(([, d]) => d === o).map(([s]) => s);
  const placed = {};
  let col = 0;
  const place = (o, row) => {
    if (placed[o]) return placed[o].x;
    const ms = mods(o).filter((m) => !placed[m]);
    let x;
    if (!ms.length) { x = col; col += 1; placed[o] = { x, row }; return x; }
    placed[o] = { x: 0, row };
    const xs = ms.map((m) => place(m, row + 1));
    x = (Math.min(...xs) + Math.max(...xs)) / 2;
    placed[o].x = x;
    return x;
  };
  alg.c.slice().sort((a, b) => a - b).forEach((c) => place(c, 0));
  for (let o = 1; o <= 6; o++) if (!placed[o]) place(o, 0);
  return { placed, cols: col, rows: Math.max(...Object.values(placed).map((p) => p.row)) + 1, alg };
}
function drawAlg(ai, x0, y0, w, h, highlight = -1) {
  const { placed, cols, rows, alg } = algLayout(ai);
  const bs = Math.min(20, w / Math.max(cols, 1) - 4, h / rows - 6);
  const cx = (p) => x0 + (cols === 1 ? w / 2 : (p.x + 0.5) * (w / cols));
  const cy = (p) => y0 + h - (p.row + 0.5) * (h / rows);
  g.strokeStyle = INK; g.lineWidth = 1.2;
  alg.m.forEach(([s, d]) => {
    const a = placed[s], b = placed[d];
    g.beginPath(); g.moveTo(cx(a), cy(a) + bs / 2);
    if (a.x === b.x || Math.abs(a.row - b.row) === 1) g.lineTo(cx(b), cy(b) - bs / 2);
    else { g.lineTo(cx(a), cy(b) - bs / 2 - 4); g.lineTo(cx(b), cy(b) - bs / 2 - 4); g.lineTo(cx(b), cy(b) - bs / 2); }
    g.stroke();
  });
  // carrier bus
  const cs = alg.c.map((c) => placed[c]);
  const by = y0 + h + 4;
  g.beginPath();
  cs.forEach((p) => { g.moveTo(cx(p), cy(p) + bs / 2); g.lineTo(cx(p), by); });
  if (cs.length > 1) { g.moveTo(Math.min(...cs.map(cx)), by); g.lineTo(Math.max(...cs.map(cx)), by); }
  g.stroke();
  // feedback loop
  const f = placed[alg.fb];
  if (f && state.patch.fb > 0) {
    g.beginPath(); g.moveTo(cx(f) + bs / 2, cy(f)); g.lineTo(cx(f) + bs / 2 + 4, cy(f));
    g.lineTo(cx(f) + bs / 2 + 4, cy(f) - bs / 2 - 3); g.lineTo(cx(f), cy(f) - bs / 2 - 3); g.lineTo(cx(f), cy(f) - bs / 2); g.stroke();
  }
  for (let o = 1; o <= 6; o++) {
    const p = placed[o];
    const x = cx(p) - bs / 2, y = cy(p) - bs / 2;
    const hl = o - 1 === highlight;
    const muted = state.muted[o - 1];
    rrect(x, y, bs, bs, 3);
    g.fillStyle = hl ? INK : (alg.c.includes(o) ? TAB : LCD_BG);
    g.fill(); g.stroke();
    text(muted ? 'x' : String(o), cx(p), cy(p) + 4, 11, 600, hl ? LCD_BG : INK, 'center');
  }
}

function drawEnv(op, x, y, w, h) {
  const a = op.a, d = op.d, s = op.s, r = op.r;
  const total = a + d * 1.5 + 0.4 + r;
  const sx = w / total;
  g.strokeStyle = INK; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(x, y + h);
  g.lineTo(x + a * sx, y);
  const steps = 24;
  for (let i = 1; i <= steps; i++) {
    const t = (d * 1.5) * i / steps;
    const v = s + (1 - s) * Math.exp(-t / (d / 3));
    g.lineTo(x + (a + t) * sx, y + h - v * h);
  }
  const sv = s + (1 - s) * Math.exp(-4.5);
  g.lineTo(x + (a + d * 1.5 + 0.4) * sx, y + h - sv * h);
  for (let i = 1; i <= steps; i++) {
    const t = r * i / steps;
    g.lineTo(x + (a + d * 1.5 + 0.4 + t) * sx, y + h - sv * h * Math.exp(-t / (r / 4)));
  }
  g.stroke();
}

let scopeBuf = null;
function drawScope(x, y, w, h) {
  g.strokeStyle = INK2; g.lineWidth = 1;
  g.beginPath(); g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2); g.stroke();
  if (!engine) return;
  const an = engine.analyser;
  if (!scopeBuf) scopeBuf = new Float32Array(an.fftSize);
  an.getFloatTimeDomainData(scopeBuf);
  let start = 0;
  for (let i = 1; i < scopeBuf.length / 2; i++) if (scopeBuf[i - 1] < 0 && scopeBuf[i] >= 0) { start = i; break; }
  g.strokeStyle = INK; g.lineWidth = 1.4; g.beginPath();
  const n = 400;
  for (let i = 0; i < n; i++) {
    const v = scopeBuf[start + i] || 0;
    const px = x + (i / n) * w, py = y + h / 2 - clamp(v * 1.6, -1, 1) * h / 2;
    if (i) g.lineTo(px, py); else g.moveTo(px, py);
  }
  g.stroke();
}

function drawLCD(now) {
  g.fillStyle = LCD_BG; g.fillRect(0, 0, W, H);
  // header
  const playingSong = state.playing && tr.mode === 'song';
  const head = playingSong ? `S${state.song} ${tr.song.title}` : presetLabel();
  text(head.slice(0, 19), 8, 19, 13, 600);
  // battery
  g.strokeStyle = INK; g.lineWidth = 1; g.strokeRect(W - 22, 8, 14, 8); g.fillStyle = INK; g.fillRect(W - 8, 10, 2, 4);
  g.fillRect(W - 20, 10, 3, 4); g.fillRect(W - 16, 10, 3, 4); g.fillRect(W - 12, 10, 3, 4);
  g.fillStyle = INK; g.fillRect(6, 26, W - 12, 1);

  const page = PAGES[state.page];
  const bodyY = 32, bodyH = 128;

  if (performance.now() - (state.algPopup || 0) < 1300) {
    text('ALGORITHM ' + (state.patch.alg + 1), W / 2, bodyY + 14, 12, 600, INK, 'center');
    drawAlg(state.patch.alg, 14, bodyY + 22, W - 28, bodyH - 34, state.op);
  } else if (playingSong) {
    drawSongPage(bodyY, now);
  } else {
    drawPage(state.page, bodyY, bodyH);
  }

  // tab + knob cells
  const ty = 166;
  g.fillStyle = INK; g.fillRect(6, ty - 4, W - 12, 1);
  const cw = (W - 12) / 4;
  page.knobs.forEach((p, i) => {
    const x = 6 + i * cw;
    text(p.l, x + cw / 2, ty + 10, 9, 600, INK2, 'center');
    text(String(p.fmt(p.get())).slice(0, 7), x + cw / 2, ty + 24, 10.5, 600, INK, 'center');
    if (i) { g.fillStyle = INK2; g.fillRect(x, ty + 1, 1, 26); }
  });
  rrect(8, ty + 32, 62, 13, 4); g.fillStyle = TAB; g.fill(); g.strokeStyle = INK; g.lineWidth = 1; g.stroke();
  text(page.tab, 39, ty + 42, 9.5, 600, INK, 'center');
  const flags = [state.patch.mono ? 'MONO' : 'POLY', state.arp.mode ? 'ARP' : '', state.octave ? 'OCT' + (state.octave > 0 ? '+' : '') + state.octave : '', state.shift ? 'SHIFT' : '', state.seq.rec ? 'REC' : ''].filter(Boolean).join(' ');
  text(flags, W - 8, ty + 42, 9, 600, INK, 'right');

  // popup
  if (state.popup && performance.now() - state.popup.t < 1100) {
    const pw = W - 40, ph = 48, px = 20, py = 70;
    rrect(px, py, pw, ph, 6); g.fillStyle = INK; g.fill();
    text(state.popup.label, W / 2, py + 18, 10, 600, '#c9d6e6', 'center');
    text(String(state.popup.value).slice(0, 18), W / 2, py + 38, 14, 600, '#f2f6fb', 'center');
  }
}

function drawPage(name, y, h) {
  const op = curOp();
  if (name === 'home') {
    drawScope(8, y + 6, W - 16, 64);
    drawAlg(state.patch.alg, 8, y + 82, 90, 36, -1);
    text('ALG ' + (state.patch.alg + 1), 106, y + 92, 11, 600);
    text(state.patch.mono ? `MONO  GL ${state.patch.glide ? sec(state.patch.glide) : 'OFF'}` : 'POLY 8+', 106, y + 106, 9.5, 500);
    text(engine ? (lastNote != null ? 'NOTE ' + noteName(lastNote) : 'READY') : 'TAP A KEY', 106, y + 120, 9.5, 600);
  } else if (name === 'edit' || name === 'env') {
    text('OP' + (state.op + 1) + (state.muted[state.op] ? ' MUTE' : ''), 8, y + 16, 15, 600);
    const isCar = ALGORITHMS[state.patch.alg].c.includes(state.op + 1);
    text(isCar ? 'CARRIER' : 'MODULATOR', 8, y + 30, 9, 600, INK2);
    drawAlg(state.patch.alg, 100, y + 4, 96, 44, state.op);
    if (name === 'edit') {
      text('RATIO ' + op.ratio.toFixed(op.ratio % 1 ? 3 : 2), 8, y + 70, 11, 500);
      text('DETUNE ' + (op.det || 0) + 'c', 8, y + 86, 11, 500);
      text('LEVEL', 8, y + 104, 11, 500);
      g.strokeStyle = INK; g.strokeRect(60, y + 95, W - 70, 10);
      g.fillStyle = INK; g.fillRect(60, y + 95, (W - 70) * op.level / 99, 10);
      text('FEEDBACK ' + state.patch.fb, 8, y + 122, 11, 500);
    } else {
      drawEnv(op, 10, y + 62, W - 20, 60);
    }
  } else if (name === 'lfo') {
    const l = state.patch.lfo;
    g.strokeStyle = INK; g.lineWidth = 1.5; g.beginPath();
    const t = performance.now() / 1000;
    for (let i = 0; i <= 120; i++) {
      const ph = (i / 120) * 3 + t * Math.min(l.rate, 6) * 0.3;
      const f = ph % 1;
      let v = Math.sin(ph * 2 * Math.PI);
      if (l.wave === 'triangle') v = 1 - 4 * Math.abs(f - 0.5);
      if (l.wave === 'square') v = f < 0.5 ? 1 : -1;
      if (l.wave === 'sawtooth') v = 2 * f - 1;
      const px = 10 + i / 120 * (W - 20), py = y + 40 - v * 26;
      if (i) g.lineTo(px, py); else g.moveTo(px, py);
    }
    g.stroke();
    text(`RATE ${l.rate.toFixed(2)}Hz`, 8, y + 92, 11);
    text(`VIBRATO ${l.pitch}c  TREM ${Math.round(l.amp * 100)}%`, 8, y + 108, 10);
  } else if (name === 'fx') {
    const fx = state.patch.fx;
    [['CHORUS', fx.chorus], ['DELAY', fx.delay], ['REVERB', fx.reverb], ['LEVEL', (state.patch.gain ?? 0.8) / 1.2]].forEach(([l, v], i) => {
      const yy = y + 14 + i * 28;
      text(l, 8, yy + 9, 11, 600);
      g.strokeStyle = INK; g.strokeRect(74, yy, W - 84, 11);
      g.fillStyle = INK; g.fillRect(74, yy, (W - 84) * v, 11);
    });
  } else if (name === 'arp') {
    text(state.arp.mode ? 'ARP ' + ARP_MODES[state.arp.mode] : 'ARP OFF', 8, y + 22, 16, 600);
    text(`${ARP_RATES[state.arp.rate][0]}  x${state.arp.oct} OCT  ${state.tempo}BPM`, 8, y + 42, 10.5);
    const notes = arpHeld.map((a) => noteName(a.midi)).join(' ');
    text(notes ? 'HELD ' + notes.slice(0, 22) : (state.arp.mode ? 'HOLD KEYS TO ARP' : 'PRESS ARP TO START'), 8, y + 66, 10);
    for (let i = 0; i < 16; i++) {
      const on = arpNext != null && (arpIdx - 1) % 16 === i;
      g.fillStyle = on ? INK : INK2;
      g.fillRect(8 + i * 12, y + 92, 9, on ? 14 : 6);
    }
  } else if (name === 'seq') {
    const s = state.seq;
    text(s.rec ? `REC STEP ${s.recPos + 1}` : (state.playing && tr.mode === 'seq' ? 'PLAYING' : 'PATTERN'), 8, y + 14, 11, 600);
    text(SONG_CHOICES[state.song].slice(0, 13), W - 8, y + 14, 9.5, 600, INK2, 'right');
    const cw = (W - 16) / 8;
    for (let i = 0; i < 16; i++) {
      const cx = 8 + (i % 8) * cw, cy = y + 24 + Math.floor(i / 8) * 48;
      const m = s.steps[i];
      const active = (state.playing && tr.mode === 'seq' && tr.curStep === i) || (s.rec && s.recPos === i);
      rrect(cx + 1, cy, cw - 3, 42, 3);
      g.fillStyle = active ? INK : (i < s.len ? TAB : 'rgba(0,0,0,0.06)');
      g.fill();
      g.strokeStyle = INK2; g.stroke();
      text(String(i + 1), cx + cw / 2 - 1, cy + 12, 8, 600, active ? LCD_BG : INK2, 'center');
      text(m == null ? '-' : noteName(m), cx + cw / 2 - 1, cy + 30, 8.5, 600, active ? LCD_BG : INK, 'center');
    }
  } else if (name === 'glo') {
    text('GLOBAL', 8, y + 18, 15, 600);
    text(`VOICE  ${state.patch.mono ? 'MONO' : 'POLY'}`, 8, y + 44, 11);
    text(`GLIDE  ${state.patch.glide ? sec(state.patch.glide) : 'OFF'}`, 8, y + 60, 11);
    text(`TRANSPOSE ${state.transpose}  TUNE ${state.tune}c`, 8, y + 76, 11);
    text(`OCTAVE ${state.octave}  MASTER ${Math.round(state.master * 100)}%`, 8, y + 92, 11);
    text(engine ? `SR ${engine.ctx.sampleRate}` : 'AUDIO OFF', 8, y + 108, 11);
  }
}

function drawSongPage(y, now) {
  const song = tr.song;
  const ctx = engine.ctx;
  const beat = Math.max(0, (ctx.currentTime - tr.t0) * song.bpm / 60);
  let sect = song.sections[0][1];
  song.sections.forEach(([b, l]) => { if (beat >= b) sect = l; });
  text(sect, 8, y + 18, 15, 600);
  const bar = Math.floor(beat / 4) + 1, bt = Math.floor(beat % 4) + 1;
  text(`BAR ${String(bar).padStart(2, '0')}.${bt}`, W - 8, y + 18, 11, 600, INK, 'right');
  text(`${song.bpm} BPM`, 8, y + 34, 10, 500, INK2);
  const secs = Math.floor((ctx.currentTime - tr.t0)), tot = Math.floor(song.length * 60 / song.bpm);
  const fmt = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;
  text(`${fmt(secs)} / ${fmt(tot)}`, W - 8, y + 34, 10, 500, INK2, 'right');
  g.strokeStyle = INK; g.strokeRect(8, y + 40, W - 16, 6);
  g.fillStyle = INK; g.fillRect(8, y + 40, (W - 16) * clamp(beat / song.length, 0, 1), 6);
  const keys = Object.keys(song.parts);
  const cw = (W - 16) / keys.length;
  keys.forEach((k, i) => {
    const lv = tr.meters[k] || 0;
    const x = 8 + i * cw;
    const mh = 52;
    g.strokeStyle = INK2; g.strokeRect(x + 3, y + 54, cw - 6, mh);
    g.fillStyle = INK; g.fillRect(x + 3, y + 54 + mh * (1 - lv), cw - 6, mh * lv);
    text(k.toUpperCase().slice(0, 5), x + cw / 2, y + 120, 8, 600, INK, 'center');
    tr.meters[k] = lv * 0.9;
  });
}

// ---------------------------------------------------------------- animation loop
let lastBeatFlash = -1;
function frame() {
  const now = performance.now();
  if (engine) {
    const lat = (engine.ctx.outputLatency || engine.ctx.baseLatency || 0);
    const at = engine.ctx.currentTime - lat;
    vis.sort((a, b) => a.t - b.t);
    while (vis.length && vis[0].t <= at) {
      const v = vis.shift();
      if (v.step != null) { tr.curStep = v.step; dirty = true; continue; }
      if (v.part && tr.meters && v.on) tr.meters[v.part] = 1;
      if (v.cls) {
        lightKey(v.midi, v.on, v.cls);
        if (v.seq) tr.seqLit = true;
      }
      if (v.on && v.cls) lastNote = v.midi;
    }
    // LED: pulses on the beat while playing, steady glow when SEL/shift held.
    let ledOn = state.shift;
    if (state.playing) {
      const bpm = tr.mode === 'song' ? tr.song.bpm : state.tempo;
      const b = (engine.ctx.currentTime - tr.t0) * bpm / 60;
      ledOn = ledOn || (b >= 0 && b % 1 < 0.18);
      if (Math.floor(b) !== lastBeatFlash) { lastBeatFlash = Math.floor(b); }
    } else if (!state.shift) ledOn = true;
    $('#led').classList.toggle('on', ledOn);
  } else {
    $('#led').classList.toggle('on', Math.floor(now / 900) % 2 === 0);
  }
  const animated = state.page === 'home' || state.page === 'lfo' || state.playing || (state.popup && now - state.popup.t < 1200) || now - (state.algPopup || 0) < 1400 || arpNext != null;
  if (dirty || animated) {
    drawLCD(now);
    updateKnobs();
    dirty = false;
  }
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- scaling
function fit() {
  const avail = Math.min(document.documentElement.clientWidth - 32, 1180 - 32);
  const s = Math.min(1, avail / 1095);
  document.documentElement.style.setProperty('--s', s.toFixed(4));
  resizeLCD();
}
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', () => setTimeout(fit, 200));
fit();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(markDirty);
updateTransportUI();
requestAnimationFrame(frame);

// small debug hook for automated checks
window.__aiSynth = { state, play, stop, selectSong, get engine() { return engine; }, SONGS };
