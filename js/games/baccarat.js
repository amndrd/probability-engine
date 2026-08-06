/* ---------------------------------------------------------
   Baccarat — bet on Player, Banker, or Tie; closest to 9 wins
   (see docs/game-research.md §5). Simplified from real baccarat:
   just the two starting cards per side, no third-card draw rule
   — keeps it a clean single decision + reveal like the other spin
   games, rather than a multi-step tableau.
   --------------------------------------------------------- */

import { state, saveState, formatMoney } from '../state.js';
import { showToast, renderHeader, switchTab } from '../ui.js';
import { renderItemBar, setItemBarLocked, getMaxBet, snapshotBeforeBet, resolveArmedItemEffect } from '../items.js';
import { playWin, playLevelUp } from '../audio.js';
import { drawCard, buildCardEl, baccaratValue } from './cards.js';

const CHIP_VALUES = [10, 25, 100, 500];
const SIDES = [
  { id: 'player', label: 'Joueur' },
  { id: 'banker', label: 'Banquier' },
  { id: 'tie', label: 'Égalité' },
];

let betAmount = CHIP_VALUES[0];
let selectedSide = 'player';
let dealing = false;

export function mount() {
  document.getElementById('baccaratView').classList.remove('hidden');
  renderPicker();
  renderChipSelector();
  renderItemBar('baccaratItemBar');
  document.getElementById('baccaratPlayerHand').innerHTML = '';
  document.getElementById('baccaratBankerHand').innerHTML = '';
  document.getElementById('baccaratPlayerTotal').textContent = '';
  document.getElementById('baccaratBankerTotal').textContent = '';
}

export function unmount() {
  document.getElementById('baccaratView').classList.add('hidden');
}

function renderPicker() {
  const wrap = document.getElementById('baccaratPicker');
  wrap.innerHTML = SIDES.map(s =>
    `<button class="segment-btn${s.id === selectedSide ? ' selected' : ''}" data-side="${s.id}" type="button" ${dealing ? 'disabled' : ''}>${s.label}</button>`
  ).join('');
  wrap.querySelectorAll('.segment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedSide = btn.dataset.side;
      renderPicker();
    });
  });
}

function renderChipSelector() {
  const wrap = document.getElementById('baccaratChipSelector');
  wrap.innerHTML = '';
  CHIP_VALUES.forEach(v => {
    const btn = document.createElement('button');
    btn.className = 'chip-btn v' + v + (v === betAmount ? ' selected' : '');
    btn.textContent = '$' + v;
    btn.disabled = dealing;
    btn.addEventListener('click', () => {
      betAmount = Math.min(v, getMaxBet());
      renderChipSelector();
      document.getElementById('baccaratBetValue').textContent = betAmount;
    });
    wrap.appendChild(btn);
  });
}

document.getElementById('baccaratDealBtn').addEventListener('click', deal);

function deal() {
  if (dealing) return;
  if (!state.run.active) {
    showToast("Commence la journée dans l'onglet Banque avant de miser.");
    switchTab('bank');
    return;
  }
  if (state.bank < betAmount) {
    showToast('Solde insuffisant pour cette mise.');
    return;
  }

  dealing = true;
  setItemBarLocked(true);
  renderPicker();
  renderChipSelector();
  document.getElementById('baccaratDealBtn').disabled = true;
  document.getElementById('baccaratResult').textContent = 'Distribution...';

  snapshotBeforeBet();
  state.bank -= betAmount;
  renderHeader();
  saveState();

  const playerHand = [drawCard(), drawCard()];
  const bankerHand = [drawCard(), drawCard()];

  const playerWrap = document.getElementById('baccaratPlayerHand');
  const bankerWrap = document.getElementById('baccaratBankerHand');
  playerWrap.innerHTML = '';
  bankerWrap.innerHTML = '';

  setTimeout(() => {
    playerWrap.appendChild(buildCardEl(playerHand[0]));
    bankerWrap.appendChild(buildCardEl(bankerHand[0]));
  }, 300);
  setTimeout(() => {
    playerWrap.appendChild(buildCardEl(playerHand[1]));
    bankerWrap.appendChild(buildCardEl(bankerHand[1]));
    document.getElementById('baccaratPlayerTotal').textContent = baccaratValue(playerHand);
    document.getElementById('baccaratBankerTotal').textContent = baccaratValue(bankerHand);
  }, 700);
  setTimeout(() => resolveDeal(playerHand, bankerHand), 1400);
}

function resolveDeal(playerHand, bankerHand) {
  const playerPts = baccaratValue(playerHand);
  const bankerPts = baccaratValue(bankerHand);
  const outcome = playerPts > bankerPts ? 'player' : bankerPts > playerPts ? 'banker' : 'tie';

  let winnings = 0;
  if (selectedSide === outcome) {
    if (outcome === 'tie') winnings = betAmount * 9;
    else if (outcome === 'banker') winnings = Math.round(betAmount * 1.95);
    else winnings = betAmount * 2;
  } else if (outcome === 'tie') {
    // Bet on Player or Banker but it lands on a tie: standard baccarat push.
    winnings = betAmount;
  }
  const won = winnings > betAmount;

  const effect = resolveArmedItemEffect({ won, betAmount, winnings });
  const finalWinnings = effect.winnings;
  state.bank += finalWinnings;
  saveState();

  const outcomeLabel = SIDES.find(s => s.id === outcome).label;
  const extra = effect.messages.length ? ' ' + effect.messages.join(' ') : '';
  let resultText;
  if (finalWinnings > betAmount) resultText = `${outcomeLabel} gagne (${Math.max(playerPts, bankerPts)}) — +${formatMoney(finalWinnings)} !`;
  else if (finalWinnings > 0) resultText = `${outcomeLabel} gagne (${Math.max(playerPts, bankerPts)}) — mise remboursée.`;
  else resultText = `${outcomeLabel} gagne (${outcome === 'tie' ? playerPts : Math.max(playerPts, bankerPts)}) — perdu.`;

  document.getElementById('baccaratResult').textContent = resultText + extra;
  showToast(resultText + extra);
  if (finalWinnings > betAmount) {
    playWin();
    if (effect.messages.length) playLevelUp();
  }

  dealing = false;
  setItemBarLocked(false);
  document.getElementById('baccaratDealBtn').disabled = false;
  renderHeader();
  renderPicker();
  renderChipSelector();
  renderItemBar('baccaratItemBar');
}
