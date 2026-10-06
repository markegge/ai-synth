// ai-synth songs.
// Each song: { title, bpm, parts: {key: {preset, show}}, notes: [[beat, dur, midi, vel, part]], length, sections }

// ---------------------------------------------------------------------------
// 1. BUDDY'S JAM — transcribed from a phone recording of a live improvisation.
// 81 BPM, F minor. A sequenced TIMBALI groove (low hit on every beat, high
// timbale hits on the 16ths) runs throughout; a mono FM bass enters at bar 13,
// drops out for bars 19-20, and then cycles a 4-bar phrase to the end:
//   F (pickup Eb-F) | C | Eb (pickup F-Bb) | Bb ... A#-G#-G quarter-note triplet.
// Bass data: [beat, length in beats, MIDI note], from pitch tracking (pyin)
// quantised to a 16th grid. The final F is an added resolution (the recording
// cuts off mid-phrase).
const BUDDY_BASS = [[52.0,1.92,29],[54.0,0.92,29],[55.0,0.5,29],[55.5,0.25,39],[55.75,0.25,41],[56.0,0.92,36],[57.0,0.92,36],[58.0,0.92,36],[59.0,1.0,36],[60.0,1.92,39],[62.0,0.92,39],[63.0,0.5,39],[63.5,0.25,41],[63.75,0.25,34],[64.0,0.92,36],[65.0,1.0,36],[66,0.667,46],[66.667,0.667,44],[67.333,0.667,43],[68.0,1.92,39],[70.0,0.92,39],[71.0,0.5,39],[71.5,0.25,41],[71.75,0.25,34],[72.0,0.92,36],[73.0,1.0,36],[74,0.667,46],[74.667,0.667,44],[75.333,0.667,43],[84.0,3.5,29],[87.5,0.25,39],[87.75,0.25,41],[88.0,1.92,36],[90.0,0.92,36],[91.0,1.0,36],[92.0,0.92,39],[93.0,0.92,39],[94.0,0.92,39],[95.0,0.5,39],[95.5,0.25,41],[95.75,2.25,34],[98,0.667,46],[98.667,0.667,44],[99.333,0.667,43],[100.0,3.5,29],[103.5,0.25,39],[103.75,0.25,41],[104.0,0.92,36],[105.0,0.92,36],[106.0,0.92,36],[107.0,1.0,36],[108.0,0.92,39],[109.0,2.5,39],[111.5,0.25,41],[111.75,2.25,34],[114,0.667,46],[114.667,0.667,44],[115.333,0.667,43],[116.0,3.5,29],[119.5,0.25,39],[119.75,0.25,41],[120.0,4.0,36],[124.0,1.92,39],[126.0,1.5,39],[127.5,0.25,41],[127.75,2.25,34],[130,0.667,46],[130.667,0.667,44],[131.333,0.667,43],[132.0,3.5,29],[135.5,0.25,39],[135.75,0.25,41],[136.0,4.0,36],[140.0,1.92,39],[142.0,1.5,39],[143.5,0.25,41],[143.75,2.25,34],[146,0.667,46],[146.667,0.667,44],[147.333,0.667,43],[148.0,3.5,29],[151.5,0.25,39],[151.75,0.25,41],[152.0,4.0,36],[156.0,3.5,39],[159.5,0.25,41],[159.75,2.25,34],[162,0.667,46],[162.667,0.667,44],[163.333,0.667,43],[164.0,3.5,29],[167.5,0.25,39],[167.75,0.25,41],[168.0,2.92,36],[171.0,1.0,36],[172.0,0.92,39],[173.0,2.5,39],[175.5,0.25,41],[175.75,2.25,34],[178,0.667,46],[178.667,0.667,44],[179.333,0.667,43],[180.0,3.5,29],[183.5,0.25,39],[183.75,0.25,41],[184.0,4.0,36],[188.0,3.5,39],[191.5,0.25,41],[191.75,2.25,34],[194,0.667,46],[194.667,0.667,44],[195.333,0.667,43],[196.0,3.5,29],[199.5,0.25,39],[199.75,0.25,41],[200.0,1.92,36],[202.0,2.0,36],[204.0,1.92,39],[206.0,0.92,39],[207.0,0.5,39],[207.5,0.25,41],[207.75,2.25,34],[210,0.667,46],[210.667,0.667,44],[211.333,0.667,43],[212.0,3.5,29],[215.5,0.25,39],[215.75,0.25,41],[216.0,4.0,36],[220.0,3.5,39],[223.5,0.25,41],[223.75,2.25,34],[226,0.667,46],[226.667,0.667,44],[227.333,0.667,43],[228.0,3.5,29],[231.5,0.25,39],[231.75,0.25,41],[232.0,4.0,36],[236.0,0.92,39],[237.0,2.5,39],[239.5,0.25,41],[239.75,2.25,34],[242,0.667,46],[242.667,0.667,44],[243.333,0.667,43],[244.0,2.92,29],[247.0,0.5,29],[247.5,0.5,41],[248.0,4.0,36],[252.0,1.92,39],[254.0,1.5,39],[255.5,0.25,41],[255.75,2.0,34],[258,4,29]];

function buddysJam() {
  const notes = [];
  const END = 260;
  for (let b = 0; b < END; b++) {
    notes.push([b, 0.9, 42, 0.9, 'drum']);                 // low hit on the beat
    notes.push([b + 0.5, 0.2, 83, 0.2, 'drum']);          // high timbale on the "and"
    if (b >= 20) notes.push([b + 0.25, 0.2, 73, 0.12, 'drum']); // ghost 16th from bar 5
  }
  for (const [s, d, m] of BUDDY_BASS) notes.push([s, d, m, 0.85, 'bass']);
  return {
    title: "BUDDY'S JAM",
    bpm: 81,
    delay: { time: 0.5556, fb: 0.25 },
    parts: { drum: { preset: 'TIMBALI', show: true }, bass: { preset: 'BUDDY BASS', show: true } },
    notes, length: END + 2,
    sections: [[0, 'GROOVE'], [52, 'BASS IN'], [76, 'BREAK'], [84, 'JAM'], [256, 'OUTRO']],
  };
}

// ---------------------------------------------------------------------------
// 2. NEON CIRCUIT — an original composition (style homage only: pulsing
// sequenced bass, big pads, driving 16ths, minor-key cinematic arc).
// 116 BPM, D minor, 72 bars (~2:29).
const CH = {
  Dm: { root: 38, tones: [0, 3, 7], pad: [50, 57, 62, 65] },
  Bb: { root: 34, tones: [0, 4, 7], pad: [46, 53, 62, 65] },
  Gm: { root: 31, tones: [0, 3, 7], pad: [43, 50, 58, 62] },
  A: { root: 33, tones: [0, 4, 7], pad: [45, 52, 61, 64] },
  Asus: { root: 33, tones: [0, 5, 7], pad: [45, 52, 62, 64] },
  Eb: { root: 39, tones: [0, 4, 7], pad: [51, 58, 62, 67] },
  Dsus: { root: 38, tones: [0, 2, 7], pad: [50, 57, 62, 64] },
};
const PROG_A = ['Dm', 'Dm', 'Bb', 'Bb', 'Gm', 'Gm', 'Asus', 'A'];
const PROG_B = ['Gm', 'Gm', 'Eb', 'Eb', 'Bb', 'Bb', 'A', 'A'];
const OUTRO = ['Dm', 'Dm', 'Bb', 'Bb', 'Gm', 'Dsus', 'Dm', 'Dm'];

// Lead phrases: [beat-in-phrase, length, MIDI]
const PH1 = [ // over PROG_B
  [0, 2, 74], [2, 1, 70], [3, 1, 72], [4, 3, 74], [7, 1, 77],
  [8, 2, 79], [10, 1, 77], [11, 1, 75], [12, 4, 74],
  [16, 1.5, 77], [17.5, 0.5, 75], [18, 1, 74], [19, 1, 70], [20, 2, 72], [22, 2, 74],
  [24, 2, 76], [26, 2, 73], [28, 4, 69],
];
const PH2 = [ // over PROG_A
  [0, 1, 69], [1, 1, 74], [2, 1, 76], [3, 1, 77], [4, 2, 76], [6, 1, 74], [7, 1, 69],
  [8, 1, 70], [9, 1, 74], [10, 1, 77], [11, 1, 82], [12, 3, 81], [15, 1, 77],
  [16, 2, 79], [18, 1, 74], [19, 1, 70], [20, 2, 72], [22, 2, 70],
  [24, 1, 69], [25, 1, 73], [26, 1, 76], [27, 1, 79], [28, 4, 76],
];
const PH3 = [ // climax over PROG_B
  [0, 1, 79], [1, 1, 81], [2, 2, 82], [4, 3, 86], [7, 1, 84],
  [8, 2, 82], [10, 2, 79], [12, 2, 87], [14, 2, 86],
  [16, 1, 86], [17, 1, 84], [18, 1, 82], [19, 1, 81], [20, 2, 82], [22, 2, 77],
  [24, 1, 76], [25, 1, 79], [26, 1, 82], [27, 1, 85], [28, 4, 81],
];
// diatonic third below in D minor (C# over the A chord)
function thirdBelow(m, chord) {
  const scale = chord === 'A' || chord === 'Asus' ? [2, 4, 5, 7, 9, 10, 1] : [2, 4, 5, 7, 9, 10, 0];
  let x = m - 1, steps = 0;
  while (steps < 2) { if (scale.includes(((x % 12) + 12) % 12)) steps++; if (steps < 2) x--; }
  return x;
}

function neonCircuit() {
  const N = [];
  const n = (beat, dur, midi, vel, part) => N.push([beat, dur, midi, vel, part]);
  const chordAt = (bar) => {
    if (bar < 8) return PROG_A[bar % 8];
    if (bar < 24) return PROG_A[bar % 8];
    if (bar < 32) return PROG_B[bar % 8];
    if (bar < 40) return PROG_A[bar % 8];
    if (bar < 48) return PROG_B[bar % 8];
    if (bar < 56) return PROG_A[bar % 8];
    if (bar < 64) return PROG_B[bar % 8];
    return OUTRO[bar - 64];
  };
  const OST = [0, 0, 12, 0, 0, 12, 0, 7, 0, 0, 12, 0, 10, 12, 7, 12];
  const ACC = [1, 0.55, 0.8, 0.55, 0.9, 0.7, 0.55, 0.7, 1, 0.55, 0.8, 0.55, 0.85, 0.75, 0.6, 0.75];

  for (let bar = 0; bar < 72; bar++) {
    const b0 = bar * 4;
    const name = chordAt(bar);
    const c = CH[name];
    const prev = bar > 0 ? chordAt(bar - 1) : null;

    // PAD: re-voice on chord change, hold for the chord's duration.
    if (name !== prev) {
      let len = 1;
      while (bar + len < 72 && chordAt(bar + len) === name) len++;
      if (bar >= 68) len = 72 - bar + 1;
      const v = bar < 8 ? 0.35 + bar * 0.05 : (bar >= 40 && bar < 48) || bar >= 48 ? 0.75 : 0.6;
      c.pad.forEach((m) => n(b0, len * 4 - 0.1, m, v, 'pad'));
      if (bar >= 48 && bar < 64) n(b0, len * 4 - 0.1, c.pad[3] + 12, 0.45, 'pad');
    }

    // BASS
    const r = c.root + (c.root < 36 ? 12 : 0);
    if (bar >= 2 && bar < 8) {
      for (let i = 0; i < 8; i++) n(b0 + i * 0.5, 0.4, r, 0.25 + (bar - 2) * 0.08 + (i % 2 ? 0 : 0.08), 'bass');
    } else if ((bar >= 8 && bar < 40) || (bar >= 48 && bar < 66)) {
      for (let i = 0; i < 16; i++) n(b0 + i * 0.25, 0.2, r + OST[i], ACC[i] * 0.85, 'bass');
    } else if (bar >= 40 && bar < 48) {
      n(b0, 1.9, r, 0.8, 'bass'); n(b0 + 2, 1.9, r + 12, 0.7, 'bass');
      if (bar >= 46) for (let i = 0; i < 8; i++) n(b0 + i * 0.5, 0.4, r, 0.6 + i * 0.04, 'bass');
    } else if (bar >= 66 && bar < 70) {
      for (let i = 0; i < 8; i++) n(b0 + i * 0.5, 0.4, r, 0.75 - (bar - 66) * 0.15 - i * 0.01, 'bass');
    }
    if (bar === 70) n(b0, 3, 38, 0.9, 'bass');

    // ARP: 16th up-down over two octaves of chord tones.
    if (bar >= 4 && bar < 66) {
      const base = c.root + 24;
      const tones = [];
      for (let o = 0; o < 2; o++) c.tones.concat([12]).forEach((t, i) => { if (!(o === 1 && i === 3)) tones.push(base + 12 * o + t); });
      tones.push(base + 24);
      const seq = tones.concat(tones.slice(1, -1).reverse());
      const step = bar < 8 ? 1 : (bar >= 40 && bar < 46) ? 0.5 : 0.25;
      const vel = bar < 8 ? 0.35 : (bar >= 40 && bar < 48) ? 0.55 : 0.5;
      for (let i = 0; i * step < 4; i++) n(b0 + i * step, step * 0.8, seq[(bar * 16 + i) % seq.length], vel * (i % 4 === 0 ? 1.15 : 1), 'arp');
      if (bar >= 56 && bar < 64) for (let i = 0; i < 8; i++) n(b0 + i * 0.5 + 0.25, 0.3, seq[(i * 3) % seq.length] + 12, 0.3, 'arp');
    }

    // DRUMS
    const full = (bar >= 16 && bar < 40) || (bar >= 48 && bar < 64);
    if ((bar >= 8 && bar < 40) || (bar >= 48 && bar < 66)) for (let i = 0; i < 4; i++) n(b0 + i, 0.3, 36, i === 0 ? 1 : 0.9, 'kick');
    if (bar >= 40 && bar < 46) n(b0, 0.3, 36, 0.8, 'kick');
    if (full) {
      n(b0 + 1, 0.2, 50, 0.85, 'snare'); n(b0 + 3, 0.2, 50, 0.9, 'snare');
      for (let i = 0; i < 16; i++) n(b0 + i * 0.25, 0.05, 90, i % 2 ? (i % 4 === 2 ? 0.75 : 0.45) : 0.3, 'hat');
    } else if (bar >= 12 && bar < 16) {
      for (let i = 0; i < 8; i++) n(b0 + i * 0.5 + 0.25 * (i % 2), 0.05, 90, 0.35 + (bar - 12) * 0.08, 'hat');
    }
    if (bar >= 46 && bar < 48) {
      const k = bar === 46 ? 8 : 16;
      for (let i = 0; i < k; i++) n(b0 + i * (4 / k), 0.1, 50, 0.35 + ((bar - 46) * 16 + i * (16 / k)) * 0.02, 'snare');
    }
    if (bar === 70) n(b0, 0.3, 36, 1, 'kick');
  }

  // LEAD
  const lead = (ph, start, shift = 0, vel = 0.75, harm = false) => ph.forEach(([b, d, m]) => {
    n(start + b, d - 0.05, m + shift, vel, 'lead');
    if (harm) {
      const bar = Math.floor((start + b) / 4);
      n(start + b, d - 0.05, thirdBelow(m + shift, chordAt(bar)), vel * 0.7, 'lead2');
    }
  });
  lead(PH1, 24 * 4, 0, 0.72);
  lead(PH2, 32 * 4, 0, 0.75);
  lead(PH2, 48 * 4, 0, 0.8, true);
  lead(PH3, 56 * 4, 0, 0.85, true);
  n(64 * 4, 7.5, 74, 0.7, 'lead');
  n(66 * 4 + 2, 1.5, 69, 0.55, 'lead');
  n(67 * 4 + 2, 9, 74, 0.5, 'lead');

  return {
    title: 'NEON CIRCUIT',
    bpm: 116,
    delay: { time: 60 / 116 * 0.75, fb: 0.38 },
    parts: {
      pad: { preset: 'GRID PAD' }, bass: { preset: 'PULSE BASS', show: true }, arp: { preset: 'PLUCK ARP' },
      lead: { preset: 'CYCLE LEAD', show: true }, lead2: { preset: 'BRASS SECTION', override: { gain: 0.35 } },
      kick: { preset: 'KICK' }, snare: { preset: 'SNARE' }, hat: { preset: 'HI HAT' },
    },
    notes: N, length: 72 * 4 + 8,
    sections: [[0, 'INTRO'], [32, 'IGNITION'], [64, 'CIRCUIT'], [96, 'PURSUIT'], [128, 'HORIZON'], [160, 'STILLNESS'], [192, 'OVERDRIVE'], [224, 'LAST LAP'], [256, 'SUNRISE']],
  };
}

export const SONGS = [buddysJam(), neonCircuit()];
