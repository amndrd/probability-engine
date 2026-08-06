/* ---------------------------------------------------------
   Wheel of Fortune — no player decision after the bet (see
   docs/game-research.md §5): the wheel lands on a multiplier
   and it's applied automatically. Mostly small losses/partial
   refunds, a rare jackpot — distinct from Money Wheel, where
   the player predicts the segment instead of it being blind.
   --------------------------------------------------------- */

import { state, saveState, formatMoney } from '../state.js';
import { showToast, renderHeader, switchTab } from '../ui.js';
import { renderItemBar, setItemBarLocked, getMaxBet, snapshotBeforeBet, resolveArmedItemEffect } from '../items.js';
import { playWin, playLevelUp } from '../audio.js';

const SEGMENTS = [
  { mult: 0, color: '#1e1e1e' },
  { mult: 0.5, color: '#2E7DD1' },
  { mult: 0, color: '#1e1e1e' },
  { mult: 0.5, color: '#2E7DD1' },
  { mult: 1, color: '#4E6358' },
  { mult: 0.5, color: '#2E7DD1' },
  { mult: 2, color: '#1FA463' },
  { mult: 0, color: '#1e1e1e' },
  { mult: 3, color: '#D9A73B' },
  { mult: 5, color: '#C43B4E' },
];
const ANGLE_PER = 360 / SEGMENTS.length;
const LABEL_RADIUS_CQW = 32;

const CHIP_VALUES = [10, 25, 100, 500];

let betAmount = CHIP_VALUES[0];
let spinning = false;
let rotorRotation = 0;
let built = false;

export function mount() {
  document.getElementById('wheeloffortuneView').classList.remove('hidden');
  if (!built) {
    renderWheel();
    built = true;
  }
  renderChipSelector();
  renderItemBar('wheeloffortuneItemBar');
}

export function unmount() {
  document.getElementById('wheeloffortuneView').classList.add('hidden');
}

function renderWheel() {
  const labelsWrap = document.getElementById('wheeloffortuneLabels');
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
  document.getElementById('wheeloffortuneRotor').style.background =
    `conic-gradient(from 0deg, ${gradientStops.join(', ')})`;
}

function renderChipSelector() {
  const wrap = document.getElementById('wheeloffortuneChipSelector');
  wrap.innerHTML = '';
  CHIP_VALUES.forEach(v => {
    const btn = document.createElement('button');
    btn.className = 'chip-btn v' + v + (v === betAmount ? ' selected' : '');
    btn.textContent = '$' + v;
    btn.addEventListener('click', () => {
      betAmount = Math.min(v, getMaxBet());
      renderChipSelector();
      document.getElementById('wheeloffortuneBetValue').textContent = betAmount;
    });
    wrap.appendChild(btn);
  });
}

document.getElementById('wheeloffortuneSpinBtn').addEventListener('click', spin);

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
  document.getElementById('wheeloffortuneSpinBtn').disabled = true;
  document.getElementById('wheeloffortuneResult').textContent = 'La roue tourne...';

  snapshotBeforeBet();
  state.bank -= betAmount;
  renderHeader();
  saveState();

  const idx = Math.floor(Math.random() * SEGMENTS.length);
  const segmentCenter = idx * ANGLE_PER + ANGLE_PER / 2;
  const rotorBaseline = Math.ceil(rotorRotation / 360) * 360;
  rotorRotation = rotorBaseline + 5 * 360 + ((360 - segmentCenter) % 360);

  const rotor = document.getElementById('wheeloffortuneRotor');
  const duration = 3200;
  rotor.style.transition = `transform ${duration}ms cubic-bezier(0.13, 0.71, 0.24, 1)`;
  rotor.style.transform = `rotate(${rotorRotation}deg)`;

  setTimeout(() => resolveSpin(SEGMENTS[idx]), duration + 100);
}

function resolveSpin(segment) {
  const won = segment.mult > 1;
  const winnings = Math.round(betAmount * segment.mult);

  const effect = resolveArmedItemEffect({ won, betAmount, winnings });
  const finalWinnings = effect.winnings;

  state.bank += finalWinnings;
  saveState();

  const extra = effect.messages.length ? ' ' + effect.messages.join(' ') : '';
  if (finalWinnings > betAmount) {
    document.getElementById('wheeloffortuneResult').innerHTML = `La roue s'arrête sur <strong>×${segment.mult}</strong> !`;
    showToast(`×${segment.mult} — Gain de ${formatMoney(finalWinnings)} !${extra}`);
    playWin();
    if (effect.messages.length) playLevelUp();
  } else if (finalWinnings > 0) {
    document.getElementById('wheeloffortuneResult').innerHTML = `La roue s'arrête sur <strong>×${segment.mult}</strong> — mise partiellement récupérée.`;
    showToast(`×${segment.mult} — ${formatMoney(finalWinnings)} récupérés.${extra}`);
  } else {
    document.getElementById('wheeloffortuneResult').innerHTML = `La roue s'arrête sur <strong>×0</strong> — perdu.`;
    showToast(`Pas de chance cette fois.${extra}`);
  }

  spinning = false;
  setItemBarLocked(false);
  document.getElementById('wheeloffortuneSpinBtn').disabled = false;
  renderHeader();
  renderItemBar('wheeloffortuneItemBar');
}
