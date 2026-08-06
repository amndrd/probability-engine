/* ---------------------------------------------------------
   Money Wheel — the player predicts which multiplier segment
   the wheel will land on (see docs/game-research.md §5). Small
   multipliers are more frequent than big ones simply because
   they occupy more segments on the wheel, so no extra weighting
   logic is needed beyond the segment layout itself.
   --------------------------------------------------------- */

import { state, saveState, formatMoney } from '../state.js';
import { showToast, renderHeader, switchTab } from '../ui.js';
import { renderItemBar, setItemBarLocked, getMaxBet, snapshotBeforeBet, resolveArmedItemEffect } from '../items.js';
import { playWin, playLevelUp } from '../audio.js';

const SEGMENTS = [
  { mult: 1, color: '#2E7DD1' },
  { mult: 2, color: '#1FA463' },
  { mult: 1, color: '#2E7DD1' },
  { mult: 5, color: '#C43B4E' },
  { mult: 2, color: '#1FA463' },
  { mult: 10, color: '#D9A73B' },
  { mult: 3, color: '#8F2536' },
];
const TARGETS = [...new Set(SEGMENTS.map(s => s.mult))].sort((a, b) => a - b);
const ANGLE_PER = 360 / SEGMENTS.length;
const LABEL_RADIUS_CQW = 32;

const CHIP_VALUES = [10, 25, 100, 500];

let betAmount = CHIP_VALUES[0];
let selectedTarget = TARGETS[0];
let spinning = false;
let rotorRotation = 0;
let built = false;

export function mount() {
  document.getElementById('moneywheelView').classList.remove('hidden');
  if (!built) {
    renderWheel();
    built = true;
  }
  renderPicker();
  renderChipSelector();
  renderItemBar('moneywheelItemBar');
}

export function unmount() {
  document.getElementById('moneywheelView').classList.add('hidden');
}

function renderWheel() {
  const labelsWrap = document.getElementById('moneywheelLabels');
  const gradientStops = [];
  labelsWrap.innerHTML = '';
  SEGMENTS.forEach((seg, i) => {
    const angle = i * ANGLE_PER;
    gradientStops.push(`${seg.color} ${angle}deg ${angle + ANGLE_PER}deg`);
    const label = document.createElement('div');
    label.className = 'spin-wheel-label';
    label.style.transform = `rotate(${angle + ANGLE_PER / 2}deg) translateY(-${LABEL_RADIUS_CQW}cqw)`;
    label.innerHTML = `<span>×${seg.mult}</span>`;
    labelsWrap.appendChild(label);
  });
  document.getElementById('moneywheelRotor').style.background =
    `conic-gradient(from 0deg, ${gradientStops.join(', ')})`;
}

function renderPicker() {
  const wrap = document.getElementById('moneywheelPicker');
  wrap.innerHTML = TARGETS.map(t =>
    `<button class="segment-btn${t === selectedTarget ? ' selected' : ''}" data-target="${t}" type="button">×${t}</button>`
  ).join('');
  wrap.querySelectorAll('.segment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedTarget = Number(btn.dataset.target);
      renderPicker();
    });
  });
}

function renderChipSelector() {
  const wrap = document.getElementById('moneywheelChipSelector');
  wrap.innerHTML = '';
  CHIP_VALUES.forEach(v => {
    const btn = document.createElement('button');
    btn.className = 'chip-btn v' + v + (v === betAmount ? ' selected' : '');
    btn.textContent = '$' + v;
    btn.addEventListener('click', () => {
      betAmount = Math.min(v, getMaxBet());
      renderChipSelector();
      document.getElementById('moneywheelBetValue').textContent = betAmount;
    });
    wrap.appendChild(btn);
  });
}

document.getElementById('moneywheelSpinBtn').addEventListener('click', spin);

function spin() {
  if (spinning) return;
  if (!state.run.active) {
    showToast("Commence la journée dans l'onglet Banque avant de miser.");
    switchTab('bank');
    return;
  }
  if (state.bank < betAmount) {
    showToast('Solde insuffisant pour cette mise.');
    return;
  }

  spinning = true;
  setItemBarLocked(true);
  document.getElementById('moneywheelSpinBtn').disabled = true;
  document.getElementById('moneywheelResult').textContent = 'La roue tourne...';

  snapshotBeforeBet();
  state.bank -= betAmount;
  renderHeader();
  saveState();

  const idx = Math.floor(Math.random() * SEGMENTS.length);
  const segmentCenter = idx * ANGLE_PER + ANGLE_PER / 2;
  const rotorBaseline = Math.ceil(rotorRotation / 360) * 360;
  rotorRotation = rotorBaseline + 5 * 360 + ((360 - segmentCenter) % 360);

  const rotor = document.getElementById('moneywheelRotor');
  const duration = 3200;
  rotor.style.transition = `transform ${duration}ms cubic-bezier(0.13, 0.71, 0.24, 1)`;
  rotor.style.transform = `rotate(${rotorRotation}deg)`;

  setTimeout(() => resolveSpin(SEGMENTS[idx]), duration + 100);
}

function resolveSpin(segment) {
  const won = segment.mult === selectedTarget;
  const winnings = won ? Math.round(betAmount * (1 + segment.mult)) : 0;

  const effect = resolveArmedItemEffect({ won, betAmount, winnings });
  const finalWinnings = effect.winnings;

  state.bank += finalWinnings;
  saveState();

  const extra = effect.messages.length ? ' ' + effect.messages.join(' ') : '';
  if (finalWinnings > 0) {
    document.getElementById('moneywheelResult').innerHTML = `La roue s'arrête sur <strong>×${segment.mult}</strong> — gagné !`;
    showToast(`×${segment.mult} — Gain de ${formatMoney(finalWinnings)} !${extra}`);
    playWin();
    if (effect.messages.length) playLevelUp();
  } else {
    document.getElementById('moneywheelResult').innerHTML = `La roue s'arrête sur <strong>×${segment.mult}</strong> — ce n'était pas ton choix.`;
    showToast(`×${segment.mult} — Pas de chance cette fois.${extra}`);
  }

  spinning = false;
  setItemBarLocked(false);
  document.getElementById('moneywheelSpinBtn').disabled = false;
  renderHeader();
  renderItemBar('moneywheelItemBar');
}
