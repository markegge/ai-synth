# ai-synth

A browser-based 6-operator FM synthesizer, drawn and played entirely in the page. No build step, no dependencies: plain HTML, CSS and JavaScript on the Web Audio API.

**Play it live: https://markegge.github.io/ai-synth/**

ai-synth is an independent web homage to a small hardware FM synth. The artwork, patches, code and the original song are all new; it is not affiliated with any manufacturer.

## What's inside

- **6-operator FM engine.** Per-operator frequency ratio, detune, level and ADSR envelope; 14 DX-style algorithms (stacks, branches, shared modulators, an all-carrier organ) with operator self-feedback; pitch envelope; mono/poly with legato glide; octave shift, transpose and fine tune.
- **LFO** for vibrato and tremolo (sine, triangle, square, saw).
- **FX**: chorus, tempo delay and reverb, as per-patch sends.
- **Arpeggiator** (up, down, up/down, random, as-played; 1/4 to 1/32; 1-3 octaves) and a **16-step sequencer** with step recording.
- **24 original presets**, including `TIMBALI`, a percussive FM tom/timbale.
- **A live LCD** that shows the preset, an oscilloscope, the algorithm diagram, envelopes, the step grid, song progress and whatever parameter you are turning.
- Mouse, touch, computer keyboard and **Web MIDI** input. Works on phones (there's a large keyboard strip at phone width; audio unlocks on the first tap).

## How to play

Tap any key, or press a letter, to power on the audio.

| Keys | Notes |
|---|---|
| `A` `S` `D` `F` `G` `H` `J` `K` `L` `;` `'` | white keys F G A B C D E F G A B |
| `W` `E` `R` `Y` `U` `O` `P` `[` | black keys F# G# A# C# D# F# G# A# |
| `Z` / `X` | octave down / up |
| `Space` | play / stop |
| `←` / `→` | previous / next preset |
| `↑` / `↓` | turn the focused knob |
| `Shift` + upper-row key | the function printed on that key: OP1-OP6 select an operator, MT mutes it, GLO toggles glide, MONO/POLY set voice mode (holding the SEL button does the same on touch screens) |

The panel:

- **PRESETS**, **ALGORITHM**, **SELECT** (operator) and **MASTER** knobs. Drag up/down, scroll, or focus and use the arrow keys.
- **EDIT**, **ENV**, **LFO**, **FX**, **GLO** and **HOME** pages put four parameters on KNOB1-4. The LCD labels them.
- **ARP** toggles the arpeggiator. **SEQ** shows the step pattern. **REC** step-records from the keys (tap SEL for a rest).
- **PLAY/STOP** plays the song picked under the instrument, or the step pattern when PATTERN is selected.
- **SAVE** keeps your edited patch in this browser.

## The songs

**Buddy's Jam** is a reproduction of a friend's three-minute improvisation on the hardware, transcribed from a phone video. The audio was pitch-tracked (librosa pYIN) and onset-analysed, quantised to a 16th-note grid at the measured 81 BPM, and checked by rendering the transcription and comparing its chroma against the recording. A sequenced `TIMBALI` groove runs throughout, with a mono FM bass in F minor that gets its glide from legato playing. The final F is an added resolution, because the recording cuts off mid-phrase.

**Neon Circuit** is an original composition in D minor at 116 BPM, about 2:30 long. It's a style homage to 1980s/2010s sci-fi film synth scores: a pulsing sequenced octave bass, big detuned pads, 16th-note arpeggios, a gliding lead and a minor-key build, breakdown and climax. It does not quote any existing melody, riff or progression.

## Running locally

Any static file server works, for example:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Files: `index.html`, `css/style.css`, `js/engine.js` (FM engine), `js/presets.js`, `js/songs.js`, `js/app.js` (UI, sequencer, input).

On iPhone, Web Audio follows the ring/silent switch. If you hear nothing, flip it off silent.
