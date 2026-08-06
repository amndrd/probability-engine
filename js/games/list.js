/* ---------------------------------------------------------
   The game catalog — pure data, no imports, so both the carousel
   (games/engine.js) and the run loop (run.js, for unlock flavor
   text) can depend on it without creating a cycle between them.

   unlockLevel values are spread out (never shared between two
   games) so run.js's "which game just unlocked" lookup by level
   is always unambiguous. They're grouped to match floorForLevel()'s
   thresholds in run.js (floor 1 = levels 1-5, floor 2 = 6-10, floor
   3 = 11-15, floor 4 = 16+) — see docs/web-architecture.md §5.
   --------------------------------------------------------- */

export const GAMES = [
  // Floor 1 — Néon Vegas
  { id: 'roulette',      name: 'Roulette',          icon: 'roulette',      unlockLevel: 1,  playable: true },
  { id: 'moneywheel',    name: 'Money Wheel',       icon: 'moneywheel',    unlockLevel: 2,  playable: true },
  { id: 'wheeloffortune', name: 'Wheel of Fortune', icon: 'wheeloffortune', unlockLevel: 3, playable: true },
  { id: 'slots',         name: 'Machine à sous',    icon: 'slots',         unlockLevel: 4,  playable: true },
  // Floor 2 — Speakeasy clandestin
  { id: 'blackjack', name: 'Blackjack', icon: 'blackjack', unlockLevel: 6, playable: true },
  { id: 'baccarat',  name: 'Baccarat',  icon: 'baccarat',  unlockLevel: 7, playable: true },
  // Floor 3 — Salle VIP
  { id: 'poker', name: 'Poker', icon: 'poker', unlockLevel: 11, playable: true },
  { id: 'craps', name: 'Craps', icon: 'craps', unlockLevel: 12, playable: true },
  { id: 'crash', name: 'Crash', icon: 'crash', unlockLevel: 13, playable: true },
  // Floor 4 — Penthouse du boss
  { id: 'dragontower',   name: 'Dragon Tower',   icon: 'dragontower',   unlockLevel: 16, playable: true },
  { id: 'minesweeper',   name: 'Mine Sweeper',   icon: 'minesweeper',   unlockLevel: 17, playable: true },
  { id: 'plinko',        name: 'Plinko',         icon: 'plinko',        unlockLevel: 18, playable: true },
  { id: 'keno',          name: 'Keno',           icon: 'keno',          unlockLevel: 19, playable: true },
  { id: 'penguincross',  name: 'Penguin Cross',  icon: 'penguincross',  unlockLevel: 20, playable: true },
  { id: 'hilo',          name: 'HiLo',           icon: 'hilo',          unlockLevel: 21, playable: true },
];
