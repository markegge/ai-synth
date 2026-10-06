// ai-synth preset bank — all original patches.
// op(ratio, level 0-99, attack s, decay s, sustain 0-1, release s, detune cents)
const op = (ratio, level, a = 0.005, d = 0.5, s = 0.8, r = 0.3, det = 0) => ({ ratio, level, a, d, s, r, det });
const off = () => op(1, 0);

const P = (name, alg, fb, ops, extra = {}) => ({
  name, alg, fb, ops,
  pitchEnv: [0, 0.05], mono: false, glide: 0,
  lfo: { rate: 5, pitch: 0, amp: 0, wave: 'sine' },
  fx: { chorus: 0.1, delay: 0.05, reverb: 0.15 },
  gain: 0.8,
  ...extra,
});

export const PRESETS = [
  P('GLASS PIANO', 4, 0, [
    op(1, 99, 0.002, 1.8, 0, 0.5), op(14, 58, 0.001, 0.4, 0, 0.3),
    op(1, 92, 0.002, 2.5, 0, 0.6, 4), op(1, 70, 0.002, 1.5, 0.1, 0.4),
    op(1, 0), op(1, 0),
  ], { fx: { chorus: 0.4, delay: 0.08, reverb: 0.2 } }),

  P('SOLID BASS', 0, 4, [
    op(1, 99, 0.002, 0.6, 0.6, 0.08), op(1, 74, 0.002, 0.25, 0.35, 0.08),
    op(0.5, 85, 0.002, 0.8, 0.7, 0.08), op(1, 60, 0.002, 0.3, 0.2, 0.08),
    op(1, 0), op(1, 0),
  ], { mono: true, glide: 0.03, fx: { chorus: 0, delay: 0, reverb: 0.03 } }),

  // Matched to the bass in the improvisation: mellow 1:1 FM, organ-like sustain, legato glide.
  P('BUDDY BASS', 0, 0, [
    op(1, 99, 0.05, 0.4, 1, 0.07), op(1, 48, 0.04, 0.6, 0.85, 0.08),
    op(2, 64, 0.05, 0.5, 0.9, 0.07), op(1, 30, 0.03, 0.3, 0.6, 0.08),
    op(1, 0), op(1, 0),
  ], { mono: true, glide: 0.045, gain: 0.95, fx: { chorus: 0.05, delay: 0, reverb: 0.08 } }),

  P('BRASS SECTION', 2, 3, [
    op(1, 99, 0.06, 0.6, 0.85, 0.25), op(1, 80, 0.09, 0.8, 0.7, 0.25),
    op(1, 70, 0.12, 0.5, 0.8, 0.2), op(1, 99, 0.06, 0.6, 0.85, 0.25, 7),
    op(1, 78, 0.1, 0.8, 0.7, 0.25, -6), op(1, 55, 0.12, 0.5, 0.8, 0.2),
  ], { lfo: { rate: 5.2, pitch: 6, amp: 0, wave: 'sine' }, fx: { chorus: 0.25, delay: 0.1, reverb: 0.25 } }),

  P('BELL TOWER', 3, 0, [
    op(1, 99, 0.001, 4, 0, 2.5), op(3.5, 72, 0.001, 3, 0, 2),
    op(1, 90, 0.001, 3.5, 0, 2.2, 3), op(1.41, 66, 0.001, 2.5, 0, 2),
    op(2, 70, 0.001, 2.5, 0, 1.8), op(5.19, 50, 0.001, 1, 0, 1),
  ], { fx: { chorus: 0.2, delay: 0.2, reverb: 0.45 } }),

  P('WARM PAD', 7, 1, [
    op(1, 92, 0.9, 2, 0.85, 1.8, -7), op(1, 55, 1.2, 2, 0.8, 1.8),
    op(0.5, 70, 0.6, 2, 0.9, 1.6), op(1, 92, 1.0, 2, 0.85, 1.8, 7),
    op(2, 50, 1.4, 2, 0.7, 1.8), op(1, 40, 1.4, 2, 0.6, 1.8, 3),
  ], { lfo: { rate: 0.4, pitch: 4, amp: 0.05, wave: 'triangle' }, fx: { chorus: 0.6, delay: 0.1, reverb: 0.5 }, gain: 0.6 }),

  // Big analog-style pad used by "Neon Circuit".
  P('GRID PAD', 7, 2, [
    op(1, 90, 1.4, 2, 0.9, 2.2), op(1, 58, 1.8, 3, 0.75, 2.2),
    op(1, 88, 1.2, 2, 0.9, 2.2, -9), op(1, 88, 1.3, 2, 0.9, 2.2, 9),
    op(0.5, 82, 1.0, 2, 0.95, 2.2, 2), op(1, 45, 1.6, 2, 0.7, 2.2),
  ], { lfo: { rate: 0.25, pitch: 3, amp: 0, wave: 'sine' }, fx: { chorus: 0.7, delay: 0.12, reverb: 0.6 }, gain: 0.45 }),

  P('PLUCK ARP', 3, 2, [
    op(1, 99, 0.001, 0.35, 0, 0.15), op(2, 70, 0.001, 0.18, 0, 0.12),
    op(1, 85, 0.001, 0.45, 0, 0.15, 6), op(3, 62, 0.001, 0.12, 0, 0.1),
    op(1, 0), op(1, 0),
  ], { fx: { chorus: 0.2, delay: 0.3, reverb: 0.25 }, gain: 0.55 }),

  P('CYCLE LEAD', 0, 5, [
    op(1, 99, 0.01, 0.8, 0.85, 0.25), op(1, 70, 0.02, 1.2, 0.7, 0.25),
    op(2, 70, 0.01, 0.8, 0.8, 0.25, 5), op(1, 64, 0.03, 0.8, 0.6, 0.25),
    op(1, 48, 0.03, 0.6, 0.5, 0.25), op(1, 40, 0.03, 0.5, 0.5, 0.25),
  ], { mono: true, glide: 0.06, lfo: { rate: 5.5, pitch: 9, amp: 0, wave: 'sine' }, fx: { chorus: 0.2, delay: 0.3, reverb: 0.35 }, gain: 0.55 }),

  P('DRAWBAR ORGAN', 11, 2, [
    op(1, 92, 0.005, 0.1, 1, 0.06), op(2, 80, 0.005, 0.1, 1, 0.06),
    op(3, 70, 0.005, 0.1, 1, 0.06), op(4, 66, 0.005, 0.1, 1, 0.06),
    op(0.5, 88, 0.005, 0.1, 1, 0.06), op(6, 45, 0.001, 0.08, 0, 0.05),
  ], { lfo: { rate: 6.5, pitch: 5, amp: 0.1, wave: 'sine' }, fx: { chorus: 0.5, delay: 0, reverb: 0.2 }, gain: 0.55 }),

  P('MARIMBA', 3, 0, [
    op(1, 99, 0.001, 0.6, 0, 0.3), op(4, 60, 0.001, 0.08, 0, 0.05),
    op(1, 80, 0.001, 0.3, 0, 0.2), op(10, 48, 0.001, 0.03, 0, 0.03), op(1, 0), op(1, 0),
  ], { fx: { chorus: 0, delay: 0.1, reverb: 0.25 } }),

  P('KICK', 0, 0, [
    op(1, 99, 0.001, 0.45, 0, 0.1), op(1.5, 55, 0.001, 0.05, 0, 0.05),
    op(1, 0), op(1, 0), op(1, 0), op(1, 0),
  ], { pitchEnv: [2400, 0.07], gain: 1.0, fx: { chorus: 0, delay: 0, reverb: 0.04 } }),

  P('SNARE', 1, 7, [
    op(1, 85, 0.001, 0.18, 0, 0.1), op(1, 85, 0.001, 0.25, 0, 0.1),
    op(2.71, 92, 0.001, 0.22, 0, 0.12), op(4.37, 99, 0.001, 0.3, 0, 0.12),
    op(7.13, 99, 0.001, 0.3, 0, 0.12), op(11.3, 99, 0.001, 0.3, 0, 0.12),
  ], { pitchEnv: [600, 0.03], gain: 0.7, fx: { chorus: 0, delay: 0.03, reverb: 0.18 } }),

  P('HI HAT', 1, 6, [
    op(1, 0), op(1, 0),
    op(6.1, 92, 0.001, 0.05, 0, 0.04), op(9.43, 99, 0.001, 0.06, 0, 0.04),
    op(13.7, 99, 0.001, 0.06, 0, 0.04), op(17.2, 99, 0.001, 0.06, 0, 0.04),
  ], { gain: 0.32, fx: { chorus: 0.1, delay: 0, reverb: 0.06 } }),

  // Percussive FM tom/timbale. The slow modulator (ratio ~0.087) puts an ~8 Hz
  // sideband comb on the low hits, which is what the recording's drum shows.
  P('TIMBALI', 3, 3, [
    op(1, 99, 0.001, 0.95, 0, 0.35), op(0.087, 62, 0.001, 1.2, 0, 0.4),
    op(1, 70, 0.001, 0.1, 0, 0.08), op(3.5, 64, 0.001, 0.03, 0, 0.03),
    op(1.5, 70, 0.001, 0.5, 0, 0.2), op(1.5, 55, 0.001, 0.08, 0, 0.05),
  ], { pitchEnv: [700, 0.03], gain: 0.9, fx: { chorus: 0, delay: 0.04, reverb: 0.12 } }),

  P('FUNK CLAV', 0, 4, [
    op(1, 99, 0.001, 0.5, 0.2, 0.06), op(3, 78, 0.001, 0.3, 0.2, 0.05),
    op(1, 80, 0.001, 0.4, 0.2, 0.06, 5), op(5, 60, 0.001, 0.2, 0, 0.05), op(1, 0), op(1, 0),
  ], { fx: { chorus: 0.3, delay: 0.05, reverb: 0.1 } }),

  P('STRING MACHINE', 3, 1, [
    op(1, 88, 0.35, 1, 0.9, 0.9, -10), op(1, 60, 0.4, 1.5, 0.8, 0.9),
    op(1, 88, 0.35, 1, 0.9, 0.9, 10), op(1, 58, 0.45, 1.5, 0.8, 0.9), op(1, 0), op(1, 0),
  ], { lfo: { rate: 5, pitch: 7, amp: 0, wave: 'triangle' }, fx: { chorus: 0.8, delay: 0.05, reverb: 0.4 }, gain: 0.6 }),

  // Plucky octave bass for the 16th-note ostinato in "Neon Circuit".
  P('PULSE BASS', 0, 5, [
    op(1, 99, 0.002, 0.25, 0.35, 0.06), op(1, 72, 0.002, 0.14, 0.25, 0.05),
    op(0.5, 92, 0.002, 0.35, 0.5, 0.06), op(1, 62, 0.002, 0.1, 0.1, 0.05), op(1, 0), op(1, 0),
  ], { mono: true, glide: 0, gain: 0.8, fx: { chorus: 0, delay: 0, reverb: 0.04 } }),

  P('METAL WORKS', 7, 5, [
    op(1, 99, 0.001, 1.5, 0, 0.8), op(1.41, 80, 0.001, 1.2, 0, 0.7),
    op(2.23, 75, 0.001, 1, 0, 0.7), op(3.17, 70, 0.001, 0.8, 0, 0.6),
    op(4.51, 66, 0.001, 0.6, 0, 0.5), op(7.2, 60, 0.001, 0.4, 0, 0.4),
  ], { fx: { chorus: 0.2, delay: 0.25, reverb: 0.4 } }),

  P('HOLLOW VOX', 5, 0, [
    op(1, 95, 0.25, 1, 0.85, 0.6), op(1, 50, 0.3, 1, 0.8, 0.6),
    op(3, 40, 0.3, 1, 0.8, 0.6), op(5, 30, 0.3, 1, 0.7, 0.6), op(1, 85, 0.25, 1, 0.85, 0.6, 8), op(2, 45, 0.3, 1, 0.8, 0.6),
  ], { lfo: { rate: 4.6, pitch: 8, amp: 0, wave: 'sine' }, fx: { chorus: 0.5, delay: 0.1, reverb: 0.45 }, gain: 0.6 }),

  P('NYLON HARP', 3, 0, [
    op(1, 99, 0.001, 1.6, 0, 0.6), op(3, 50, 0.001, 0.5, 0, 0.3),
    op(2, 70, 0.001, 1.2, 0, 0.5, 4), op(5, 35, 0.001, 0.2, 0, 0.1), op(1, 0), op(1, 0),
  ], { fx: { chorus: 0.3, delay: 0.2, reverb: 0.35 } }),

  P('WOBBLER', 0, 6, [
    op(1, 99, 0.005, 0.5, 0.9, 0.1), op(1, 82, 0.005, 0.5, 0.9, 0.1),
    op(0.5, 90, 0.005, 0.5, 0.9, 0.1), op(1, 60, 0.005, 0.5, 0.9, 0.1), op(1, 0), op(1, 0),
  ], { mono: true, glide: 0.08, lfo: { rate: 3, pitch: 0, amp: 0.7, wave: 'triangle' }, fx: { chorus: 0.1, delay: 0.15, reverb: 0.1 } }),

  P('AIR FLUTE', 0, 0, [
    op(1, 96, 0.12, 0.5, 0.9, 0.25), op(1, 40, 0.15, 0.5, 0.7, 0.25),
    op(2, 30, 0.1, 0.4, 0.6, 0.2), op(9.7, 40, 0.01, 0.1, 0.1, 0.1), op(1, 0), op(1, 0),
  ], { mono: true, glide: 0.04, lfo: { rate: 5, pitch: 10, amp: 0.08, wave: 'sine' }, fx: { chorus: 0.2, delay: 0.15, reverb: 0.4 }, gain: 0.7 }),

  P('SCANNER', 6, 7, [
    op(1, 92, 0.01, 2, 0.5, 0.6), op(0.25, 70, 0.5, 3, 0.6, 0.8),
    op(5.5, 60, 0.01, 1, 0.3, 0.5), op(1.01, 66, 0.01, 1, 0.5, 0.5),
    op(1, 80, 0.01, 1, 0.8, 0.6, 12), op(3, 55, 0.6, 1, 0.6, 0.6),
  ], { lfo: { rate: 0.2, pitch: 30, amp: 0, wave: 'triangle' }, fx: { chorus: 0.4, delay: 0.35, reverb: 0.5 }, gain: 0.55 }),
];

export function clonePatch(p) { return JSON.parse(JSON.stringify(p)); }
export function findPreset(name) {
  const p = PRESETS.find((x) => x.name === name);
  if (!p) throw new Error('missing preset ' + name);
  return clonePatch(p);
}
