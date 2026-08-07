/* ---------------------------------------------------------
   Items — consumables bought in the shop with Tickets, used
   across any game. Three kinds:

   - 'armed'   — toggle it on, it applies to the very next bet
                 you resolve (in any game), then it's spent.
   - 'buff'    — activate it once, it stays on for the rest of
                 the current casino day (state.run.buffs), reset
                 when a new day starts (see run.js's startDay()).
   - 'instant' — applied immediately at purchase, never sits in
                 the item bar (Mystery Box).
   - 'action'  — a standalone usable action, not tied to arming
                 a bet (Time Machine).

   Games call resolveArmedItemEffect() right after computing a
   bet's raw result, so every item's mechanical effect lives in
   one place instead of being duplicated per game.
   --------------------------------------------------------- */

import { state, saveState } from './state.js';
import { buildIconSVG } from './icons.js';
import { showToast, renderHeader } from './ui.js';

export const SHOP_ITEMS = [
  { id: 'chanceX3', name: 'Kit Chance x3', kind: 'armed', price: 4, icon: 'chanceX3',
    desc: "Arme-le avant un pari : 1 chance sur 3 de tripler ton gain." },
  { id: 'angelsReel', name: "Angel's Reel", kind: 'armed', price: 3, icon: 'angelsReel',
    desc: 'Si ton prochain pari est perdu, 33% de chance de récupérer ta mise.' },
  { id: 'devilsReel', name: "Devil's Reel", kind: 'armed', price: 3, icon: 'devilsReel',
    desc: 'Si ton prochain pari est gagné : 50% de chance de tripler le gain, sinon il est annulé.' },
  { id: 'goldenChip', name: 'Golden Chip', kind: 'armed', price: 4, icon: 'goldenChip',
    desc: 'Ton prochain pari est un gain garanti à 1:1, quel que soit le résultat.' },
  { id: 'taser', name: 'Taser', kind: 'armed', price: 4, icon: 'taser',
    desc: 'Double la mise maximum autorisée sur ton prochain pari.' },
  { id: 'mysteryBox', name: 'Mystery Box', kind: 'instant', price: 4, icon: 'mysteryBox',
    desc: "À l'achat : te donne immédiatement un exemplaire d'un autre objet, au hasard." },
  { id: 'timeMachine', name: 'Time Machine', kind: 'action', price: 6, icon: 'timeMachine',
    desc: 'Annule ton dernier pari et restaure ton solde à sa valeur d\'avant.' },
  { id: 'holyStatue', name: 'Holy Statue', kind: 'armed', price: 7, icon: 'holyStatue',
    desc: 'Si ton prochain pari est perdu, il est intégralement remboursé.' },
  { id: 'insurance', name: 'Insurance', kind: 'armed', price: 7, icon: 'insurance',
    desc: 'Si ton prochain pari est perdu, 25% de la mise est remboursé.' },
  { id: 'gamblersConfidence', name: "Gambler's Confidence", kind: 'buff', price: 7, icon: 'gamblersConfidence',
    buffKey: 'confidence', desc: 'Active pour la journée : tous tes gains sont augmentés de 10%.' },
  { id: 'bonusDraw', name: 'Bonus Draw', kind: 'buff', price: 8, icon: 'bonusDraw',
    buffKey: 'bonusDraw', desc: 'Active pour la journée : chaque pari profitable rapporte +1 ticket.' },
];

const MAX_BET_BASE = 500;

export function getMaxBet() {
  return state.armedItem === 'taser' ? MAX_BET_BASE * 2 : MAX_BET_BASE;
}

// Games call this right before deducting a fresh bet's stake, so the Time
// Machine has something to restore. Overwrites any previous snapshot — it
// always reflects "before the most recent bet", not a full history.
export function snapshotBeforeBet() {
  state.run.lastBetSnapshot = state.bank;
}

// Games call this while a resolution animation is in flight (e.g. the
// roulette wheel spinning) so the player can't re-arm/disarm mid-resolve.
let locked = false;
export function setItemBarLocked(v) {
  locked = v;
}

function toggleArmedItem(itemId) {
  if (locked) return;
  if (state.armedItem === itemId) {
    state.armedItem = null;
  } else {
    if ((state.items[itemId] || 0) <= 0) {
      showToast("Tu n'as aucun exemplaire de cet objet — achètes-en un à la Boutique !");
      return;
    }
    state.armedItem = itemId;
  }
  saveState();
  renderItemBar();
}

function activateBuff(itemId) {
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) return;
  if (!state.run.active) {
    showToast('Commence ta journée avant d\'activer un objet.');
    return;
  }
  if (state.run.buffs[item.buffKey]) return;
  if ((state.items[itemId] || 0) <= 0) {
    showToast("Tu n'as aucun exemplaire de cet objet — achètes-en un à la Boutique !");
    return;
  }
  state.items[itemId] -= 1;
  state.run.buffs[item.buffKey] = true;
  saveState();
  renderItemBar();
  showToast(`${item.name} activé pour la journée !`);
}

export function useTimeMachine() {
  if (locked) return;
  if ((state.items.timeMachine || 0) <= 0) {
    showToast("Tu n'as aucune Time Machine — achètes-en une à la Boutique !");
    return;
  }
  if (state.run.lastBetSnapshot === null) {
    showToast('Aucun pari récent à annuler.');
    return;
  }
  state.bank = state.run.lastBetSnapshot;
  state.run.lastBetSnapshot = null;
  state.items.timeMachine -= 1;
  saveState();
  renderHeader();
  renderItemBar();
  showToast('Time Machine : dernier pari annulé !');
}

// Called by a game once it has applied (or rolled for) an armed item's
// effect, to spend the charge and clear the arming.
export function consumeArmedItem(itemId) {
  state.items[itemId] = Math.max(0, (state.items[itemId] || 0) - 1);
  if (state.armedItem === itemId) state.armedItem = null;
}

// The generic effect resolver — every game calls this right after computing
// its raw result, instead of coding its own item logic. `winnings` is the
// gross amount the bet would pay out before any item touches it (0 if lost).
export function resolveArmedItemEffect({ won, betAmount, winnings }) {
  const messages = [];
  let finalWinnings = winnings;

  // Day-long buff: +10% on every winning bet.
  if (state.run.buffs.confidence && finalWinnings > 0) {
    finalWinnings = Math.round(finalWinnings * 1.1);
    messages.push("Gambler's Confidence : +10% de gain.");
  }

  // Single-use armed item, consumed on this bet regardless of outcome.
  const armed = state.armedItem;
  if (armed) {
    switch (armed) {
      case 'chanceX3':
        if (finalWinnings > 0 && Math.random() < 1 / 3) {
          finalWinnings *= 3;
          messages.push('Kit Chance x3 : gain triplé !');
        }
        break;
      case 'angelsReel':
        if (!won && Math.random() < 1 / 3) {
          finalWinnings = betAmount;
          messages.push("Angel's Reel : mise remboursée !");
        }
        break;
      case 'devilsReel':
        if (won) {
          if (Math.random() < 0.5) {
            finalWinnings *= 3;
            messages.push("Devil's Reel : gain triplé !");
          } else {
            finalWinnings = 0;
            messages.push("Devil's Reel : le diable reprend tout...");
          }
        }
        break;
      case 'goldenChip':
        finalWinnings = betAmount;
        messages.push('Golden Chip : gain garanti !');
        break;
      case 'holyStatue':
        if (!won) {
          finalWinnings = betAmount;
          messages.push('Holy Statue : perte annulée.');
        }
        break;
      case 'insurance':
        if (!won) {
          finalWinnings = Math.round(betAmount * 0.25);
          messages.push('Insurance : 25% de la mise remboursé.');
        }
        break;
      case 'taser':
        // Its effect (raised max bet, see getMaxBet()) already applied at
        // bet placement — nothing left to do here but spend the charge.
        break;
      default:
        break;
    }
    consumeArmedItem(armed);
  }

  // Day-long buff: ticket refund on every profitable bet.
  if (state.run.buffs.bonusDraw && finalWinnings > betAmount) {
    state.tickets += 1;
    messages.push('Bonus Draw : +1 ticket.');
  }

  return { winnings: finalWinnings, messages };
}

// Each game view has its own item-bar element (they can't share one DOM id),
// so every game's mount() calls renderItemBar('itsContainerId').
export function renderItemBar(containerId = 'itemBar') {
  const bar = document.getElementById(containerId);
  if (!bar) return;
  bar.innerHTML = SHOP_ITEMS.filter(item => {
    if (item.kind === 'instant') return false;
    // Only show what the player actually has something to do with — an
    // unowned item just clutters the bar with permanently disabled (0)
    // buttons. A buff still shows once active even after its charge is
    // spent, since it stays in effect for the rest of the day.
    const owned = state.items[item.id] || 0;
    if (item.kind === 'buff') return owned > 0 || state.run.buffs[item.buffKey];
    return owned > 0;
  }).map(item => {
    const owned = state.items[item.id] || 0;

    if (item.kind === 'buff') {
      const active = state.run.buffs[item.buffKey];
      const disabled = active || owned === 0;
      return `
        <button class="item-btn${active ? ' buff-active' : ''}" data-item="${item.id}" data-kind="buff" type="button" ${disabled ? 'disabled' : ''}>
          <span class="item-btn-icon icon-svg">${buildIconSVG(item.icon)}</span>
          <span class="item-btn-label">${item.name}${active ? ' — actif' : ` (${owned})`}</span>
        </button>`;
    }

    if (item.kind === 'action') {
      const disabled = owned === 0 || state.run.lastBetSnapshot === null;
      return `
        <button class="item-btn" data-item="${item.id}" data-kind="action" type="button" ${disabled ? 'disabled' : ''}>
          <span class="item-btn-icon icon-svg">${buildIconSVG(item.icon)}</span>
          <span class="item-btn-label">${item.name} (${owned})</span>
        </button>`;
    }

    const armed = state.armedItem === item.id;
    const disabled = owned === 0 && !armed;
    return `
      <button class="item-btn${armed ? ' armed' : ''}" data-item="${item.id}" data-kind="armed" type="button" ${disabled ? 'disabled' : ''}>
        <span class="item-btn-icon icon-svg">${buildIconSVG(item.icon)}</span>
        <span class="item-btn-label">${item.name} (${owned})${armed ? ' — armé' : ''}</span>
      </button>`;
  }).join('');

  bar.querySelectorAll('.item-btn').forEach(btn => {
    const id = btn.dataset.item;
    const kind = btn.dataset.kind;
    btn.addEventListener('click', () => {
      if (kind === 'buff') activateBuff(id);
      else if (kind === 'action') useTimeMachine();
      else toggleArmedItem(id);
    });
  });
}

function grantRandomItem(excludeId) {
  const pool = SHOP_ITEMS.filter(i => i.id !== excludeId && i.kind !== 'instant');
  const picked = pool[Math.floor(Math.random() * pool.length)];
  state.items[picked.id] = (state.items[picked.id] || 0) + 1;
  return picked;
}

export function renderShop() {
  const grid = document.getElementById('shopGrid');
  if (!grid) return;
  grid.innerHTML = '';
  SHOP_ITEMS.forEach(item => {
    const owned = state.items[item.id] || 0;
    const card = document.createElement('div');
    card.className = 'shop-card';
    card.innerHTML = `
      <div class="item-icon icon-svg">${buildIconSVG(item.icon)}</div>
      <div><strong>${item.name}</strong></div>
      <div class="item-desc">${item.desc}</div>
      <div class="price"><span class="inline-icon icon-svg">${buildIconSVG('ticket')}</span> ${item.price}</div>
      ${item.kind !== 'instant' ? `<div class="owned-count">Possédés : ${owned}</div>` : ''}
    `;
    const btn = document.createElement('button');
    btn.textContent = 'Acheter';
    btn.className = 'buy';
    btn.disabled = state.tickets < item.price;
    btn.addEventListener('click', () => {
      if (state.tickets < item.price) return;
      state.tickets -= item.price;
      if (item.kind === 'instant') {
        const won = grantRandomItem(item.id);
        showToast(`Mystery Box ouverte : ${won.name} !`, 3200);
      } else {
        state.items[item.id] = (state.items[item.id] || 0) + 1;
        showToast(`${item.name} acheté !`);
      }
      saveState();
      renderHeader();
      renderShop();
      renderItemBar();
    });
    card.appendChild(btn);
    grid.appendChild(card);
  });
}
