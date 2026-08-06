/* ---------------------------------------------------------
   Shared playing-card deck for Blackjack, Baccarat and Poker:
   drawing, DOM rendering, and each game's own value/ranking rules
   (a card is worth something different in each).
   --------------------------------------------------------- */

import { buildIconSVG } from '../icons.js';

export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const SUIT_ICON = { hearts: 'suit-heart', diamonds: 'suit-diamond', clubs: 'suit-club', spades: 'suit-spade' };
const RED_SUITS = new Set(['hearts', 'diamonds']);

// Single infinite shoe (drawn with replacement) — simplest possible model,
// no deck-depletion/card-counting concerns for a casual free casino.
export function drawCard() {
  return {
    rank: RANKS[Math.floor(Math.random() * RANKS.length)],
    suit: SUITS[Math.floor(Math.random() * SUITS.length)],
  };
}

export function buildCardEl(card, faceDown = false) {
  const el = document.createElement('div');
  el.className = 'playing-card' + (faceDown ? ' face-down' : '') + (!faceDown && RED_SUITS.has(card.suit) ? ' red' : '');
  if (faceDown) {
    el.innerHTML = '<div class="card-back-pattern"></div>';
    return el;
  }
  el.innerHTML = `
    <span class="card-rank card-rank--tl">${card.rank}</span>
    <span class="card-suit-icon icon-svg">${buildIconSVG(SUIT_ICON[card.suit])}</span>
    <span class="card-rank card-rank--br">${card.rank}</span>
  `;
  return el;
}

// Blackjack: 2-10 at face value, J/Q/K = 10, Ace flexes 11 → 1 to avoid busting.
export function blackjackValue(hand) {
  let total = 0;
  let aces = 0;
  hand.forEach(c => {
    if (c.rank === 'A') { total += 11; aces += 1; }
    else if (c.rank === 'J' || c.rank === 'Q' || c.rank === 'K') total += 10;
    else total += Number(c.rank);
  });
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

// Baccarat: 2-9 at face value, 10/J/Q/K = 0, Ace = 1, total kept mod 10.
// Simplified from real baccarat — no third-card draw rule, just the two
// starting cards each side, which keeps it playable without a full tableau.
export function baccaratValue(hand) {
  let total = 0;
  hand.forEach(c => {
    if (c.rank === 'A') total += 1;
    else if (c.rank === 'J' || c.rank === 'Q' || c.rank === 'K' || c.rank === '10') total += 0;
    else total += Number(c.rank);
  });
  return total % 10;
}

// Poker (5-card draw, Jacks-or-Better paytable): ranks a 5-card hand and
// returns its payout odds. `mult` follows the same convention as every
// other game's BET_DEFS/segment multiplier — total return on a win is
// betAmount * (mult + 1), 0 on a loss.
const RANK_VALUE = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14 };

export function evaluatePokerHand(hand) {
  const values = hand.map(c => RANK_VALUE[c.rank]).sort((a, b) => a - b);
  const isFlush = hand.every(c => c.suit === hand[0].suit);
  const isAceLowStraight = values.join(',') === '2,3,4,5,14';
  const isStraight = isAceLowStraight || values.every((v, i) => i === 0 || v === values[i - 1] + 1);

  const counts = {};
  values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  const countList = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const [topRank, topCount] = countList[0];
  const secondCount = countList[1] ? countList[1][1] : 0;

  if (isFlush && isStraight && !isAceLowStraight && values[0] === 10) {
    return { rank: 'royal-flush', label: 'Quinte Royale', mult: 250 };
  }
  if (isFlush && isStraight) return { rank: 'straight-flush', label: 'Quinte Flush', mult: 50 };
  if (topCount === 4) return { rank: 'four-of-a-kind', label: 'Carré', mult: 25 };
  if (topCount === 3 && secondCount === 2) return { rank: 'full-house', label: 'Full House', mult: 9 };
  if (isFlush) return { rank: 'flush', label: 'Couleur', mult: 6 };
  if (isStraight) return { rank: 'straight', label: 'Suite', mult: 4 };
  if (topCount === 3) return { rank: 'three-of-a-kind', label: 'Brelan', mult: 3 };
  if (topCount === 2 && secondCount === 2) return { rank: 'two-pair', label: 'Double Paire', mult: 2 };
  if (topCount === 2 && Number(topRank) >= 11) return { rank: 'jacks-or-better', label: 'Paire de Valets ou mieux', mult: 1 };
  return { rank: 'nothing', label: 'Rien', mult: 0 };
}
