/* ---------------------------------------------------------
   Audio — synthesized 8-bit beeps (no audio files).
   Reads state.muted, so it must be imported after state.js is
   available; kept dependency-light by taking a `muted` getter.
   --------------------------------------------------------- */

import { state } from './state.js';

let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function beep({ freq = 440, duration = 0.07, type = 'square', volume = 0.14, delay = 0 } = {}) {
  if (state.muted) return;
  const ctx = getAudioCtx();
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export function playClick() {
  beep({ freq: 880, duration: 0.05, volume: 0.12 });
}

export function playChip() {
  beep({ freq: 660, duration: 0.035, volume: 0.13 });
  beep({ freq: 990, duration: 0.05, volume: 0.1, delay: 0.03 });
}

export function playWin() {
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
    beep({ freq, duration: 0.12, volume: 0.13, delay: i * 0.09 })
  );
}

export function playLevelUp() {
  [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) =>
    beep({ freq, duration: 0.14, volume: 0.14, delay: i * 0.1 })
  );
}
