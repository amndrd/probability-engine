/* ---------------------------------------------------------
   Blackjack — Deal, then Hit/Stand/Double against the dealer.
   Dealer stands on any 17+. Natural 21 on the first two cards
   pays 3:2. See docs/game-research.md §5 for the reference rules.
   --------------------------------------------------------- */

import { state, saveState, formatMoney } from '../state.js';
import { showToast, renderHeader, switchTab } from '../ui.js';
import { renderItemBar, setItemBarLocked, getMaxBet, snapshotBeforeBet, resolveArmedItemEffect } from '../items.js';
import { playWin, playLevelUp } from '../audio.js';
import { drawCard, buildCardEl, blackjackValue } from './cards.js';

const CHIP_VALUES = [10, 25, 100, 500];

let betAmount = CHIP_VALUES[0];
let currentBet = 0; // locked in once dealt — doubles if the player doubles down
let playerHand = [];
let dealerHand = [];
let dealerHoleCardHidden = false;
let phase = 'betting'; // 'betting' | 'playing' | 'resolved'

export function mount() {
  document.getElementById('blackjackView').classList.remove('hidden');
  renderChipSelector();
  renderItemBar('blackjackItemBar');
  renderHands();
  renderActions();
}

export function unmount() {
  document.getElementById('blackjackView').classList.add('hidden');
}

function renderChipSelector() {
  const wrap = document.getElementById('blackjackChipSelector');
  wrap.innerHTML = '';
  CHIP_VALUES.forEach(v => {
    const btn = document.createElement('button');
    btn.className = 'chip-btn v' + v + (v === betAmount ? ' selected' : '');
    btn.textContent = '$' + v;
    btn.disabled = phase !== 'betting';
    btn.addEventListener('click', () => {
      betAmount = Math.min(v, getMaxBet());
      renderChipSelector();
      document.getElementById('blackjackBetValue').textContent = betAmount;
    });
    wrap.appendChild(btn);
  });
}

function renderHands() {
  const dealerWrap = document.getElementById('blackjackDealerHand');
  const playerWrap = document.getElementById('blackjackPlayerHand');
  dealerWrap.innerHTML = '';
  playerWrap.innerHTML = '';

  dealerHand.forEach((card, i) => {
    const hidden = dealerHoleCardHidden && i === 1;
    dealerWrap.appendChild(buildCardEl(card, hidden));
  });
  playerHand.forEach(card => playerWrap.appendChild(buildCardEl(card, false)));

  document.getElementById('blackjackDealerTotal').textContent =
    dealerHand.length ? (dealerHoleCardHidden ? '?' : blackjackValue(dealerHand)) : '';
  document.getElementById('blackjackPlayerTotal').textContent =
    playerHand.length ? blackjackValue(playerHand) : '';
}

function renderActions() {
  const canDouble = phase === 'playing' && playerHand.length === 2 && state.bank >= currentBet;
  document.getElementById('blackjackDealBtn').classList.toggle('hidden', phase !== 'betting');
  document.getElementById('blackjackHitBtn').classList.toggle('hidden', phase !== 'playing');
  document.getElementById('blackjackStandBtn').classList.toggle('hidden', phase !== 'playing');
  document.getElementById('blackjackDoubleBtn').classList.toggle('hidden', phase !== 'playing');
  document.getElementById('blackjackDoubleBtn').disabled = !canDouble;
}

document.getElementById('blackjackDealBtn').addEventListener('click', deal);
document.getElementById('blackjackHitBtn').addEventListener('click', hit);
document.getElementById('blackjackStandBtn').addEventListener('click', stand);
document.getElementById('blackjackDoubleBtn').addEventListener('click', doubleDown);

function deal() {
  if (phase !== 'betting') return;
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
  currentBet = betAmount;
  state.bank -= currentBet;
  renderHeader();
  saveState();
  setItemBarLocked(true);

  playerHand = [drawCard(), drawCard()];
  dealerHand = [drawCard(), drawCard()];
  dealerHoleCardHidden = true;
  phase = 'playing';
  document.getElementById('blackjackResult').textContent = 'À toi de jouer : tirer ou rester ?';
  renderHands();
  renderChipSelector();
  renderActions();

  const playerBJ = blackjackValue(playerHand) === 21;
  const dealerBJ = blackjackValue(dealerHand) === 21;
  if (playerBJ || dealerBJ) {
    dealerHoleCardHidden = false;
    resolveRound(playerBJ && !dealerBJ ? 'blackjack' : (playerBJ && dealerBJ ? 'push' : 'dealer'));
  }
}

function hit() {
  if (phase !== 'playing') return;
  playerHand.push(drawCard());
  renderHands();
  renderActions();
  const total = blackjackValue(playerHand);
  if (total > 21) {
    dealerHoleCardHidden = false;
    resolveRound('bust');
  } else if (total === 21) {
    stand();
  }
}

function stand() {
  if (phase !== 'playing') return;
  dealerHoleCardHidden = false;
  playDealer();
}

function doubleDown() {
  if (phase !== 'playing' || playerHand.length !== 2) return;
  if (state.bank < currentBet) {
    showToast('Solde insuffisant pour doubler.');
    return;
  }
  state.bank -= currentBet;
  currentBet *= 2;
  renderHeader();
  saveState();
  playerHand.push(drawCard());
  renderHands();
  const total = blackjackValue(playerHand);
  if (total > 21) {
    dealerHoleCardHidden = false;
    resolveRound('bust');
  } else {
    dealerHoleCardHidden = false;
    playDealer();
  }
}

function playDealer() {
  renderHands();
  const step = () => {
    if (blackjackValue(dealerHand) < 17) {
      dealerHand.push(drawCard());
      renderHands();
      setTimeout(step, 500);
    } else {
      const playerTotal = blackjackValue(playerHand);
      const dealerTotal = blackjackValue(dealerHand);
      if (dealerTotal > 21 || playerTotal > dealerTotal) resolveRound('player');
      else if (dealerTotal > playerTotal) resolveRound('dealer');
      else resolveRound('push');
    }
  };
  setTimeout(step, 500);
}

function resolveRound(outcome) {
  let winnings = 0;
  let resultText = '';
  let won = false;

  switch (outcome) {
    case 'blackjack':
      winnings = Math.round(currentBet * 2.5);
      won = true;
      resultText = 'Blackjack ! Gain 3:2.';
      break;
    case 'bust':
      winnings = 0;
      resultText = 'Tu as dépassé 21 — perdu.';
      break;
    case 'dealer':
      winnings = 0;
      resultText = 'Le croupier gagne.';
      break;
    case 'push':
      winnings = currentBet;
      resultText = 'Égalité — mise remboursée.';
      break;
    case 'player':
    default:
      winnings = currentBet * 2;
      won = true;
      resultText = blackjackValue(dealerHand) > 21 ? 'Le croupier dépasse 21 — tu gagnes !' : 'Tu bats le croupier !';
      break;
  }

  const effect = resolveArmedItemEffect({ won, betAmount: currentBet, winnings });
  const finalWinnings = effect.winnings;
  state.bank += finalWinnings;
  saveState();

  const extra = effect.messages.length ? ' ' + effect.messages.join(' ') : '';
  const gainSuffix = finalWinnings > 0 ? ` +${formatMoney(finalWinnings)}` : '';
  document.getElementById('blackjackResult').textContent = resultText + gainSuffix + extra;
  showToast(`${resultText}${gainSuffix}${extra}`);
  if (finalWinnings > currentBet) {
    playWin();
    if (effect.messages.length) playLevelUp();
  }

  phase = 'betting';
  currentBet = 0;
  setItemBarLocked(false);
  renderHeader();
  renderActions();
  renderChipSelector();
  renderItemBar('blackjackItemBar');
}
