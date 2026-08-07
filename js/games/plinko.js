/* ---------------------------------------------------------
   Plinko — a ball falls through 8 rows of pegs into one of 9
   slots. Each row is an independent 50/50 bounce, so the landing
   slot follows a binomial distribution: the center slots are by
   far the most likely (and pay the least), the edges are rare
   (and pay the most) — see docs/game-research.md §5: "la balle
   privilégie le centre... préférez plusieurs petits paris."
   --------------------------------------------------------- */

import { state, saveState, formatMoney } from '../state.js';
import { showToast, renderHeader, switchTab } from '../ui.js';
import { renderItemBar, setItemBarLocked, getMaxBet, snapshotBeforeBet, resolveArmedItemEffect } from '../items.js';
import { playWin, playLevelUp } from '../audio.js';

const CHIP_VALUES = [10, 25, 100, 500];
const ROWS = 8;
const SLOT_COUNT = ROWS + 1;
const MULT_BY_DIST = [0.3, 1.5, 3, 8, 24]; // indexed by distance from the center slot

let betAmount = CHIP_VALUES[0];
let dropping = false;

export function mount() {
  document.getElementById('plinkoView').classList.remove('hidden');
  renderChipSelector();
  renderItemBar('plinkoItemBar');
  renderSlots();
  renderPegs();
}

export function unmount() {
  document.getElementById('plinkoView').classList.add('hidden');
}

function renderChipSelector() {
  const wrap = document.getElementById('plinkoChipSelector');
  wrap.innerHTML = '';
  CHIP_VALUES.forEach(v => {
    const btn = document.createElement('button');
    btn.className = 'chip-btn v' + v + (v === betAmount ? ' selected' : '');
    btn.textContent = '$' + v;
    btn.disabled = dropping;
    btn.addEventListener('click', () => {
      betAmount = Math.min(v, getMaxBet());
      renderChipSelector();
      document.getElementById('plinkoBetValue').textContent = betAmount;
    });
    wrap.appendChild(btn);
  });
}

function multiplierForSlot(slot) {
  const dist = Math.abs(slot - (SLOT_COUNT - 1) / 2);
  return MULT_BY_DIST[Math.round(dist)];
}

function renderPegs() {
  const wrap = document.getElementById('plinkoPegs');
  wrap.innerHTML = '';
  for (let row = 0; row < ROWS; row++) {
    const rowEl = document.createElement('div');
    rowEl.className = 'plinko-peg-row';
    for (let p = 0; p <= row; p++) {
      const peg = document.createElement('div');
      peg.className = 'plinko-peg';
      rowEl.appendChild(peg);
    }
    wrap.appendChild(rowEl);
  }
}

function renderSlots() {
  const wrap = document.getElementById('plinkoSlots');
  wrap.innerHTML = '';
  for (let i = 0; i < SLOT_COUNT; i++) {
    const slot = document.createElement('div');
    slot.className = 'plinko-slot';
    slot.id = 'plinkoSlot' + i;
    slot.textContent = '×' + multiplierForSlot(i);
    wrap.appendChild(slot);
  }
}

document.getElementById('plinkoDropBtn').addEventListener('click', drop);

function drop() {
  if (dropping) return;
  if (!state.run.active) {
    showToast("Commence la journée dans l'onglet Banque avant de miser.");
    switchTab('bank');
    return;
  }
  if (state.bank < betAmount) {
    showToast('Solde insuffisant pour cette mise.');
    return;
  }

  snapshotBeforeBet();
  const bet = betAmount;
  state.bank -= bet;
  renderHeader();
  saveState();
  setItemBarLocked(true);
  dropping = true;
  renderChipSelector();
  document.getElementById('plinkoDropBtn').disabled = true;
  document.getElementById('plinkoResult').textContent = 'La bille tombe...';

  let slot = 0;
  for (let i = 0; i < ROWS; i++) {
    if (Math.random() < 0.5) slot += 1;
  }

  const ball = document.getElementById('plinkoBall');
  ball.classList.remove('hidden');
  ball.style.transition = 'none';
  ball.style.left = '50%';
  ball.style.top = '0%';
  // Force layout so the transition below actually animates from this reset state.
  void ball.offsetWidth;

  const finalPercent = ((slot + 0.5) / SLOT_COUNT) * 100;
  requestAnimationFrame(() => {
    ball.style.transition = 'left 1.1s cubic-bezier(0.32, 0.6, 0.4, 1), top 1.1s cubic-bezier(0.3, 0, 0.5, 1)';
    ball.style.left = finalPercent + '%';
    ball.style.top = '92%';
  });

  setTimeout(() => resolveDrop(slot, bet, ball), 1200);
}

function resolveDrop(slot, bet, ball) {
  const mult = multiplierForSlot(slot);
  const won = mult > 1;
  const winnings = Math.round(bet * mult);

  const effect = resolveArmedItemEffect({ won, betAmount: bet, winnings });
  const finalWinnings = effect.winnings;
  state.bank += finalWinnings;
  saveState();

  document.getElementById('plinkoSlot' + slot).classList.add('plinko-slot--hit');
  ball.classList.add('hidden');

  const extra = effect.messages.length ? ' ' + effect.messages.join(' ') : '';
  const gainSuffix = finalWinnings > 0 ? ` +${formatMoney(finalWinnings)}` : '';
  const message = `Case ×${mult}`;
  document.getElementById('plinkoResult').textContent = message + gainSuffix + extra;
  showToast(message + gainSuffix + extra);
  if (finalWinnings > bet) {
    playWin();
    if (effect.messages.length) playLevelUp();
  }

  dropping = false;
  setItemBarLocked(false);
  renderHeader();
  renderChipSelector();
  renderItemBar('plinkoItemBar');
  document.getElementById('plinkoDropBtn').disabled = false;
  setTimeout(() => {
    document.getElementById('plinkoSlot' + slot).classList.remove('plinko-slot--hit');
  }, 1400);
}
