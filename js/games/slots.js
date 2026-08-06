/* ---------------------------------------------------------
   Slots — 3 reels, 4 symbols (see docs/game-research.md §5).
   All 3 reels matching pays bet × the symbol's multiplier;
   anything else loses the bet. Pure luck, no player decision
   after the bet is placed — spin-and-resolve, same family as
   Roulette but with no board to interact with.
   --------------------------------------------------------- */

import { state, saveState, formatMoney } from '../state.js';
import { showToast, renderHeader, switchTab } from '../ui.js';
import { renderItemBar, setItemBarLocked, getMaxBet, snapshotBeforeBet, resolveArmedItemEffect } from '../items.js';
import { buildIconSVG } from '../icons.js';
import { playWin, playLevelUp } from '../audio.js';

const SYMBOLS = [
  { id: 'eye', mult: 0.5 },
  { id: 'ankh', mult: 1.5 },
  { id: 'scarab', mult: 2.5 },
  { id: 'lotus', mult: 3.5 },
];
const CHIP_VALUES = [10, 25, 100, 500];

let betAmount = CHIP_VALUES[0];
let spinning = false;
let reelEls = [];

export function mount() {
  document.getElementById('slotsView').classList.remove('hidden');
  reelEls = [0, 1, 2].map(i => document.getElementById(`slotsReel${i}`));
  if (!reelEls[0]) {
    const frame = document.getElementById('slotsReels');
    frame.innerHTML = [0, 1, 2].map(i => `<div class="reel" id="slotsReel${i}"></div>`).join('');
    reelEls = [0, 1, 2].map(i => document.getElementById(`slotsReel${i}`));
  }
  renderReels(SYMBOLS.map(s => s.id).slice(0, 3));
  renderChipSelector();
  renderItemBar('slotsItemBar');
}

export function unmount() {
  document.getElementById('slotsView').classList.add('hidden');
}

function renderReels(symbolIds) {
  reelEls.forEach((el, i) => {
    el.innerHTML = buildIconSVG(symbolIds[i]);
  });
}

function renderChipSelector() {
  const wrap = document.getElementById('slotsChipSelector');
  wrap.innerHTML = '';
  CHIP_VALUES.forEach(v => {
    const btn = document.createElement('button');
    btn.className = 'chip-btn v' + v + (v === betAmount ? ' selected' : '');
    btn.textContent = '$' + v;
    btn.addEventListener('click', () => {
      betAmount = Math.min(v, getMaxBet());
      renderChipSelector();
      document.getElementById('slotsBetValue').textContent = betAmount;
    });
    wrap.appendChild(btn);
  });
}

function randomSymbol() {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

document.getElementById('slotsSpinBtn').addEventListener('click', spin);

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
  document.getElementById('slotsSpinBtn').disabled = true;
  document.getElementById('slotsResult').textContent = 'Les rouleaux tournent...';

  snapshotBeforeBet();
  state.bank -= betAmount;
  renderHeader();
  saveState();

  reelEls.forEach(el => el.parentElement.classList.add('spinning'));
  const cycle = setInterval(() => renderReels([randomSymbol().id, randomSymbol().id, randomSymbol().id]), 90);

  const finalSymbols = [randomSymbol(), randomSymbol(), randomSymbol()];
  setTimeout(() => {
    clearInterval(cycle);
    reelEls.forEach(el => el.parentElement.classList.remove('spinning'));
    renderReels(finalSymbols.map(s => s.id));
    resolveSpin(finalSymbols);
  }, 1100);
}

function resolveSpin(symbols) {
  const won = symbols[0].id === symbols[1].id && symbols[1].id === symbols[2].id;
  const winnings = won ? Math.round(betAmount * (1 + symbols[0].mult)) : 0;

  const effect = resolveArmedItemEffect({ won, betAmount, winnings });
  const finalWinnings = effect.winnings;

  state.bank += finalWinnings;
  saveState();

  const extra = effect.messages.length ? ' ' + effect.messages.join(' ') : '';
  if (finalWinnings > 0) {
    document.getElementById('slotsResult').textContent = `Combinaison gagnante — +${formatMoney(finalWinnings)} !`;
    showToast(`Trois ${symbols[0].id} — Gain de ${formatMoney(finalWinnings)} !${extra}`);
    playWin();
    if (effect.messages.length) playLevelUp();
  } else {
    document.getElementById('slotsResult').textContent = 'Pas de combinaison — retente ta chance !';
    showToast(`Pas de combinaison cette fois.${extra}`);
  }

  spinning = false;
  setItemBarLocked(false);
  document.getElementById('slotsSpinBtn').disabled = false;
  renderHeader();
  renderItemBar('slotsItemBar');
}
