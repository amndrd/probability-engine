/* ---------------------------------------------------------
   Roulette — migrated as-is from the original app.js, wrapped
   behind the mount()/unmount() interface games/engine.js expects.

   Note: this module deliberately does not import run.js or
   engine.js (see docs/web-architecture.md's dependency rule) —
   it only reads state.run directly to gate betting, and leaves
   bank-tab/millionaire refreshes to run.js's own polling loop.
   --------------------------------------------------------- */

import { state, saveState, formatMoney } from '../state.js';
import { showToast, renderHeader, switchTab, updateChallengeProgress, renderChallenge } from '../ui.js';
import { renderItemBar, setItemBarLocked, getMaxBet, snapshotBeforeBet, resolveArmedItemEffect } from '../items.js';
import { playWin, playLevelUp } from '../audio.js';

const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const CHIP_VALUES = [10, 25, 100, 500];
const WHEEL_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];

let currentBets = {};
let selectedChip = CHIP_VALUES[0];
let spinning = false;

const BET_DEFS = {}; // key -> { numbers: Set, multiplier }

function buildBetDefs() {
  const all = Array.from({ length: 37 }, (_, i) => i); // 0..36
  for (let n = 1; n <= 36; n++) {
    BET_DEFS['straight_' + n] = { numbers: new Set([n]), multiplier: 35 };
  }
  BET_DEFS['red'] = { numbers: new Set([...RED_NUMBERS]), multiplier: 1 };
  BET_DEFS['black'] = { numbers: new Set(all.filter(n => n !== 0 && !RED_NUMBERS.has(n))), multiplier: 1 };
  BET_DEFS['even'] = { numbers: new Set(all.filter(n => n !== 0 && n % 2 === 0)), multiplier: 1 };
  BET_DEFS['odd'] = { numbers: new Set(all.filter(n => n % 2 === 1)), multiplier: 1 };
  BET_DEFS['low'] = { numbers: new Set(all.filter(n => n >= 1 && n <= 18)), multiplier: 1 };
  BET_DEFS['high'] = { numbers: new Set(all.filter(n => n >= 19 && n <= 36)), multiplier: 1 };
  BET_DEFS['dozen1'] = { numbers: new Set(all.filter(n => n >= 1 && n <= 12)), multiplier: 2 };
  BET_DEFS['dozen2'] = { numbers: new Set(all.filter(n => n >= 13 && n <= 24)), multiplier: 2 };
  BET_DEFS['dozen3'] = { numbers: new Set(all.filter(n => n >= 25 && n <= 36)), multiplier: 2 };
}
buildBetDefs();

/* ---------------------- Mount / unmount ---------------------- */

export function mount() {
  document.getElementById('rouletteView').classList.remove('hidden');
  renderBoard();
  fitRouletteView();
}

export function unmount() {
  document.getElementById('rouletteView').classList.add('hidden');
}

function fitRouletteView() {
  const view = document.getElementById('rouletteView');
  if (view.classList.contains('hidden')) return;
  const mainEl = view.closest('main');
  const bottomPad = mainEl ? parseFloat(getComputedStyle(mainEl).paddingBottom) || 0 : 0;
  const top = view.getBoundingClientRect().top;
  const available = window.innerHeight - top - bottomPad - 8;
  view.style.height = Math.max(available, 480) + 'px';
}
window.addEventListener('resize', fitRouletteView);

/* ---------------------- Board ---------------------- */

function renderChipSelector() {
  const wrap = document.getElementById('chipSelector');
  wrap.innerHTML = '';
  CHIP_VALUES.forEach(v => {
    const btn = document.createElement('button');
    btn.className = 'chip-btn v' + v + (v === selectedChip ? ' selected' : '');
    btn.textContent = '$' + v;
    btn.addEventListener('click', () => {
      selectedChip = v;
      renderChipSelector();
    });
    wrap.appendChild(btn);
  });
}

function renderBoard() {
  renderWheel();
  const board = document.getElementById('board');
  board.innerHTML = '';

  // zero
  board.appendChild(makeCell('zero', '0', 'straight_0'));

  // number grid: row1 top (3,6,...36), row2 (2,5,...35), row3 bottom (1,4,...34)
  for (let row = 0; row < 3; row++) {
    for (let col = 1; col <= 12; col++) {
      const n = col * 3 - row;
      const colorClass = RED_NUMBERS.has(n) ? 'num-red' : 'num-black';
      board.appendChild(makeCell(colorClass, String(n), 'straight_' + n));
    }
  }

  // dozens row
  const dozens = [
    ['1ère 12', 'dozen1', '2 / 6'],
    ['2ème 12', 'dozen2', '6 / 10'],
    ['3ème 12', 'dozen3', '10 / 14'],
  ];
  dozens.forEach(([label, key, colSpan]) => {
    const cell = makeCell('dozen', label, key);
    cell.style.gridColumn = colSpan;
    board.appendChild(cell);
  });

  // outside bets row
  const outside = [
    ['1-18', 'low', '2 / 4'],
    ['PAIR', 'even', '4 / 6'],
    ['ROUGE', 'red', '6 / 8'],
    ['NOIR', 'black', '8 / 10'],
    ['IMPAIR', 'odd', '10 / 12'],
    ['19-36', 'high', '12 / 14'],
  ];
  outside.forEach(([label, key, colSpan]) => {
    const cell = makeCell('outside', label, key);
    cell.style.gridColumn = colSpan;
    if (key === 'red') cell.style.background = 'var(--red)';
    if (key === 'black') cell.style.background = '#1b1b1b';
    board.appendChild(cell);
  });

  renderChipSelector();
  renderBetAmounts();
  renderBetTotal();
  renderHistory();
  renderItemBar();
}

function makeCell(cls, label, key) {
  const cell = document.createElement('div');
  cell.className = 'cell ' + cls;
  cell.dataset.key = key;
  cell.innerHTML = `<span>${label}</span>`;
  cell.addEventListener('click', () => placeBet(key));
  return cell;
}

function placeBet(key) {
  if (spinning) return;
  if (!state.run.active) {
    showToast("Commence la journée dans l'onglet Banque avant de miser.");
    switchTab('bank');
    return;
  }
  if (state.bank < selectedChip) {
    showToast('Solde insuffisant pour cette mise.');
    return;
  }
  const nextAmount = (currentBets[key] || 0) + selectedChip;
  if (nextAmount > getMaxBet()) {
    showToast(`Mise maximum atteinte sur cette case (${formatMoney(getMaxBet())}).`);
    return;
  }
  if (Object.keys(currentBets).length === 0) snapshotBeforeBet();
  state.bank -= selectedChip;
  currentBets[key] = nextAmount;
  renderHeader();
  renderBetAmounts();
  renderBetTotal();
  saveState();
}

function renderBetAmounts() {
  document.querySelectorAll('#board .cell').forEach(cell => {
    const existing = cell.querySelector('.bet-chip');
    if (existing) existing.remove();
    const key = cell.dataset.key;
    const amt = currentBets[key];
    if (amt) {
      const chip = document.createElement('div');
      chip.className = 'bet-chip';
      chip.textContent = '$' + (amt >= 1000 ? Math.round(amt / 1000) + 'k' : amt);
      cell.appendChild(chip);
    }
  });
}

function renderBetTotal() {
  const total = Object.values(currentBets).reduce((a, b) => a + b, 0);
  document.getElementById('betTotal').textContent = total.toLocaleString('en-US');
  document.getElementById('spinBtn').disabled = total === 0 || spinning;
}

function clearBets() {
  if (spinning) return;
  const total = Object.values(currentBets).reduce((a, b) => a + b, 0);
  state.bank += total;
  currentBets = {};
  renderHeader();
  renderBetAmounts();
  renderBetTotal();
  saveState();
}

document.getElementById('clearBetsBtn').addEventListener('click', clearBets);
document.getElementById('spinBtn').addEventListener('click', spin);

function renderHistory() {
  const wrap = document.getElementById('history');
  wrap.innerHTML = '';
  state.history.slice(-10).reverse().forEach(n => {
    const chip = document.createElement('div');
    chip.className = 'history-chip ' + colorOf(n);
    chip.textContent = n;
    wrap.appendChild(chip);
  });
}

function colorOf(n) {
  if (n === 0) return 'green';
  return RED_NUMBERS.has(n) ? 'red' : 'black';
}

const WHEEL_ANGLE_PER = 360 / WHEEL_ORDER.length;
const WHEEL_NUMBER_RADIUS_CQW = 35.2381; // 148px on the 420px reference wheel — scales with wheel-stage's own size
let rotorRotation = 0;
let ballRotation = 0;

function renderWheel() {
  const labelsWrap = document.getElementById('wheelLabels');
  if (labelsWrap.dataset.built) return;
  labelsWrap.innerHTML = '';
  const gradientStops = [];

  WHEEL_ORDER.forEach((num, i) => {
    const angle = i * WHEEL_ANGLE_PER;
    const color = num === 0 ? 'var(--good)' : (RED_NUMBERS.has(num) ? 'var(--red)' : '#161616');
    gradientStops.push(`${color} ${angle}deg ${angle + WHEEL_ANGLE_PER}deg`);

    const label = document.createElement('div');
    label.className = 'wheel-label';
    label.style.transform = `rotate(${angle}deg) translateY(-${WHEEL_NUMBER_RADIUS_CQW}cqw)`;
    label.innerHTML = `<span>${num}</span>`;
    labelsWrap.appendChild(label);
  });

  document.getElementById('wheelRotor').style.background =
    `conic-gradient(from ${-WHEEL_ANGLE_PER / 2}deg, ${gradientStops.join(', ')})`;
  labelsWrap.dataset.built = '1';
}

function spin() {
  if (spinning) return;
  const total = Object.values(currentBets).reduce((a, b) => a + b, 0);
  if (total === 0) return;

  spinning = true;
  setItemBarLocked(true);
  document.getElementById('spinBtn').disabled = true;
  document.getElementById('clearBetsBtn').disabled = true;
  document.getElementById('wheelResult').textContent = 'La bille tourne...';

  const winningNumber = Math.floor(Math.random() * 37);
  const idx = WHEEL_ORDER.indexOf(winningNumber);
  const pocketAngle = idx * WHEEL_ANGLE_PER;

  const rotor = document.getElementById('wheelRotor');
  const ballTrack = document.getElementById('ballTrack');

  // The wheel itself stops at a random orientation each time — the ball,
  // not a fixed pointer, is what marks the winning pocket.
  const restAngle = Math.random() * 360;
  const rotorBaseline = Math.ceil(rotorRotation / 360) * 360;
  rotorRotation = rotorBaseline + 4 * 360 + restAngle;

  const finalPocketAngle = ((pocketAngle + rotorRotation) % 360 + 360) % 360;
  const ballBaseline = Math.floor(ballRotation / 360) * 360;
  ballRotation = ballBaseline - 7 * 360 + finalPocketAngle;

  const spinDuration = 4200;
  rotor.style.transition = `transform ${spinDuration}ms cubic-bezier(0.13, 0.71, 0.24, 1)`;
  ballTrack.style.transition = `transform ${spinDuration}ms cubic-bezier(0.1, 0.6, 0.18, 1)`;
  rotor.style.transform = `rotate(${rotorRotation}deg)`;
  ballTrack.style.transform = `rotate(${ballRotation}deg)`;

  setTimeout(() => resolveSpin(winningNumber), spinDuration + 100);
}

function resolveSpin(winningNumber) {
  const color = colorOf(winningNumber);
  document.getElementById('wheelResult').innerHTML =
    `Numéro <strong>${winningNumber}</strong> — ${labelForColor(color)}`;

  const totalStaked = Object.values(currentBets).reduce((a, b) => a + b, 0);
  let winnings = 0;
  let anyWin = false;
  Object.entries(currentBets).forEach(([key, amount]) => {
    const def = BET_DEFS[key];
    if (def && def.numbers.has(winningNumber)) {
      winnings += amount * (def.multiplier + 1);
      anyWin = true;
    }
  });

  const effect = resolveArmedItemEffect({ won: anyWin, betAmount: totalStaked, winnings });
  winnings = effect.winnings;

  state.bank += winnings;
  state.history.push(winningNumber);
  if (state.history.length > 50) state.history = state.history.slice(-50);

  updateChallengeProgress(anyWin);
  highlightWinners(winningNumber);

  const extra = effect.messages.length ? ' ' + effect.messages.join(' ') : '';
  if (winnings > 0) {
    showToast(`Numéro ${winningNumber} (${labelForColor(color)}) — Gain de ${formatMoney(winnings)} !${extra}`);
    playWin();
    if (effect.messages.length) playLevelUp();
  } else {
    showToast(`Numéro ${winningNumber} (${labelForColor(color)}) — Pas de chance cette fois.${extra}`);
  }

  currentBets = {};
  spinning = false;
  setItemBarLocked(false);
  document.getElementById('clearBetsBtn').disabled = false;

  saveState();
  renderHeader();
  renderBetAmounts();
  renderBetTotal();
  renderHistory();
  renderHistoryTab();
  renderChallenge();
  renderItemBar();

  setTimeout(() => {
    document.querySelectorAll('#board .cell.winner').forEach(c => c.classList.remove('winner'));
  }, 1400);
}

function labelForColor(c) {
  return c === 'red' ? 'Rouge' : c === 'black' ? 'Noir' : 'Zéro';
}

function highlightWinners(winningNumber) {
  document.querySelectorAll('#board .cell').forEach(cell => {
    const def = BET_DEFS[cell.dataset.key];
    if (def && def.numbers.has(winningNumber) && def.numbers.size <= 18) {
      cell.classList.add('winner');
    } else if (cell.dataset.key === 'straight_' + winningNumber) {
      cell.classList.add('winner');
    }
  });
}

/* ---------------------- History tab ---------------------- */

export function renderHistoryTab() {
  const grid = document.getElementById('historyGrid');
  if (!grid) return;
  if (!state.history.length) {
    grid.innerHTML = '<div class="history-empty">Aucun tirage pour l\'instant — lance la roulette !</div>';
    return;
  }
  grid.innerHTML = state.history.slice().reverse().map(n =>
    `<div class="history-entry ${colorOf(n)}">${n}</div>`
  ).join('');
}
