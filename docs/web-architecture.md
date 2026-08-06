# Architecture technique — adaptation web de *Gamble With Your Friends*

> Ce document part de [`docs/game-research.md`](./game-research.md) (les mécaniques du jeu original) et du code existant de **Fauxvegas** (`index.html`, `app.js`, `styles.css`) pour définir comment adapter fidèlement le jeu en version web solo d'abord, multijoueur ensuite.

---

## 1. Philosophie d'adaptation : ce qu'on garde, ce qu'on transpose, ce qu'on coupe

GWYF est un jeu 3D à la première personne, avec exploration physique d'un casino, ramassage d'objets à la main, chat vocal de proximité, cutscenes (limousine, coups de fil au prêteur). Rien de tout ça n'a de sens sur un site web — mais **aucun de ces éléments n'est la mécanique de jeu**, ce sont des habillages. Le vrai jeu, c'est : *une banque commune, un quota chronométré, des machines de casino, des objets qui modifient les règles, une économie à deux monnaies, une pénalité qui fait mal, une fin qui dépend d'un choix.* C'est ça qu'on adapte à 100%.

| Élément original | Traitement web |
|---|---|
| Exploration 3D du casino, déplacement à pied | **Coupé.** Remplacé par le carrousel de jeux déjà existant dans Fauxvegas (`renderGameList()` / `openGame()`) — cliquer sur une carte = "aller à la table". |
| Ramassage physique des objets achetés | **Coupé.** Un objet acheté est immédiatement dans l'inventaire, utilisable depuis la barre d'objets (`itemBar`, déjà prototypée). |
| Trajet en limousine, coups de fil au prêteur | **Transposé** en flavor text dans des modales (transition "Départ pour le Casino", bilan de fin de journée) — coût de dev quasi nul, garde la saveur narrative. |
| Chat vocal de proximité | **Reporté à la phase multijoueur** (hors scope tant que le mode solo n'est pas solide). |
| Pénalité "partie du corps" réaliste | **À trancher plus tard** (cf. §7) — mais l'architecture prévoit un point d'extension modulaire dès maintenant pour ne pas bloquer le reste. |
| Banque partagée temps réel | **Reportée à la phase multijoueur.** Non implémentée maintenant, mais le modèle d'état est conçu pour ne pas devoir être réécrit quand on l'ajoutera (cf. §8). |
| Quota chronométré, étages, objets, tickets, fins multiples | **Cœur du travail** — repris fidèlement, détaillé ci-dessous. |

---

## 2. Ce qui existe déjà et sur quoi s'appuyer

Fauxvegas a déjà, sans le savoir, posé une bonne partie des fondations GWYF :

- **`state.level` + `state.levelTarget`** (`app.js:544-557`) ≈ déjà un système "objectif à atteindre pour progresser", très proche d'un quota.
- **`GAMES`** (`app.js:500-507`) liste déjà Roulette (jouable), Blackjack, Slots, Baccarat, Poker, Craps — **5 des 16 jeux de GWYF sont déjà dans la liste**, il ne manque que de coder leur logique.
- **`SHOP_ITEMS`** + `state.items` + le pattern "objet armé" (`renderItemBar()`, `app.js:1002-1026`) ≈ déjà l'embryon du système d'objets de GWYF.
- **`CHALLENGE_TEMPLATES`** (défi du jour) ≈ équivalent des défis du Loan Shark qui rapportent des récompenses bonus.
- Système de pixel-icônes générique (`buildPixelIconSVG`) réutilisable pour toutes les nouvelles icônes (jeux, objets, étages, fins).
- Bouton "Multijoueur — bientôt" déjà présent sur l'écran d'accueil (`index.html:39`) : c'est littéralement l'emplacement prévu pour brancher le mode coop plus tard.

**Conséquence :** on ne repart pas de zéro, on **étend** ces systèmes plutôt que de les remplacer.

---

## 3. Structure du code

Le fichier `app.js` fait déjà 1560 lignes avec un seul jeu. Avec 16 jeux + boucle de run + objets + tickets, un seul fichier devient ingérable. On découpe en **modules ES natifs**, sans bundler (le projet reste 100% statique, déployable tel quel — c'est cohérent avec l'esprit actuel du repo) :

```
casino/
├── index.html
├── styles.css
└── js/
    ├── main.js          — bootstrap, wiring des écrans/onglets, imports
    ├── state.js          — modèle d'état, load/save (remplace le bloc state.js actuel)
    ├── audio.js           — beep/playClick/playWin... (copié tel quel)
    ├── icons.js            — PIXEL_ICON_GRIDS + buildPixelIconSVG (copié tel quel)
    ├── ui.js                — toast, modales génériques, tabs
    ├── run.js                — boucle "journée de casino" : timer, quota, étages, bilan
    ├── items.js                — catalogue d'objets + application des effets
    ├── tickets.js                — monnaie meta : gains/dépenses
    ├── endings.js                  — choix final + 3 fins
    └── games/
        ├── engine.js               — interface commune à tous les mini-jeux
        ├── roulette.js              — logique actuelle, déplacée telle quelle
        ├── slots.js
        ├── blackjack.js
        ├── baccarat.js
        ├── poker.js
        ├── craps.js
        ├── moneywheel.js
        ├── wheeloffortune.js
        ├── crash.js
        ├── duckrace.js
        ├── dragontower.js
        ├── minesweeper.js
        ├── plinko.js
        ├── keno.js
        ├── penguincross.js
        └── hilo.js
```

`index.html` charge un seul point d'entrée : `<script type="module" src="js/main.js"></script>`.

### Interface commune des mini-jeux (`games/engine.js`)

Chaque jeu exporte un objet avec la même forme, pour que le carrousel, la barre d'objets et le moteur de run puissent traiter n'importe quel jeu sans cas particulier :

```js
export default {
  id: 'blackjack',
  name: 'Blackjack',
  icon: 'blackjack',
  family: 'strategic',       // 'luck' | 'hybrid' | 'strategic' — cf. game-research.md §5
  mount(container, ctx) {},   // construit le DOM du jeu dans la vue dédiée
  unmount() {},                 // nettoyage
  onItemUse(itemId) {},          // hook pour les objets utilisables sur ce jeu
};
```

C'est une généralisation directe du pattern déjà utilisé pour la Roulette (`openGame()` / `renderBoard()`), qui devient `roulette.mount()`.

---

## 4. La boucle de jeu : "Journée de Casino"

C'est **la mécanique la plus importante à reproduire fidèlement** (cf. `game-research.md §3`). On remplace le grind libre actuel par un mode **Run** structuré :

1. **Lobby** (écran déjà existant, enrichi) : bilan de la dette, boutique d'objets (payée en **Tickets**, pas en $ — voir §6), boutique de cosmétiques, bouton "Commencer la journée".
2. **Journée chronométrée** : lancement d'un **timer de 5 minutes** (`run.js`), affiché en HUD permanent à côté du solde. Le joueur peut jouer librement à n'importe quel jeu débloqué de l'étage courant pendant ce temps.
3. **Objectif** : faire dépasser le **quota du jour** à la banque avant la fin du timer.
4. **Bilan de fin de journée** (modale) :
   - Quota atteint → bonus de Tickets (+ bonus supplémentaire si largement dépassé), passage au jour suivant.
   - Quota raté → déclenchement de la pénalité (§7).
5. Le **quota grimpe à chaque nouvelle journée réussie**, et de nouvelles machines se débloquent au fur et à mesure que le **niveau** augmente (voir §5 — pas de porte par étage, un déblocage machine par machine).
6. Une fois le niveau requis pour l'étage 4 atteint et la dette remboursée → écran de **choix final** puis l'une des **3 fins** (§9).

Ce mode **remplace** l'ancien système "grind libre → valider au guichet quand prêt" : le côté "libre" reste (on choisit quels jeux jouer pendant les 5 minutes), mais la pression du chrono + quota — l'élément central de tension du jeu original — est maintenant réelle.

---

## 5. Les étages et le déblocage des machines

Contrairement au jeu original (où changer d'étage demande de traverser physiquement un décor 3D et implique donc des paliers rigides "3 jours par étage"), la version web n'a pas cette contrainte. On garde le principe de progression par étages thématiques, mais **le déblocage se fait machine par machine, au niveau requis** — exactement le pattern déjà en place dans `GAMES` (`unlockLevel`) — plutôt que par lot figé à la fin d'un étage. Plus fluide pour un joueur solo : une nouvelle machine tous les 1-2 niveaux plutôt que 3-6 d'un coup.

L'étage reste un **habillage visuel** (thème de décor/couleurs qui change) déterminé par le niveau du joueur, mais l'accès à chaque jeu ne dépend que de son propre `unlockLevel` individuel.

| Étage (habillage visuel) | Thème | Jeux qui s'y débloquent progressivement | Complexité de dev |
|---|---|---|---|
| **1 — Fondation** | Néon Vegas | Roulette *(déjà fait)*, Slots, Money Wheel, Wheel of Fortune | Faible — toutes en "miser puis résoudre au hasard" |
| **2 — Premier défi** | Speakeasy clandestin | Blackjack, Baccarat, Duck Race | Moyenne — logique de cartes + course simple |
| **3 — Tournant critique** | Salle VIP | Poker (1P), Craps (Street Craps), Crash | Moyenne/haute — décisions du joueur en cours de partie, Crash en temps réel |
| **4 — Le règlement final** | Penthouse du boss | Dragon Tower, Mine Sweeper, Plinko, Keno, Penguin Cross, HiLo | Haute — UI de grille/plateau custom pour chacun |

Chaque jeu garde un `unlockLevel` précis (comme aujourd'hui dans `GAMES`), réparti pour respecter cet ordre — l'étage affiché à l'écran est simplement dérivé du niveau courant (ex. niveaux 1-5 → étage 1, 6-10 → étage 2, etc., seuils à ajuster une fois le rythme de progression testé).

---

## 6. Les deux monnaies : Solde ($) et Tickets

Le jeu original sépare strictement l'argent misé (banque) de la monnaie meta (Tickets). Fauxvegas actuel confond les deux (`SHOP_ITEMS` s'achète directement en `$`). On corrige ça — c'est fidèle à l'original et ça évite qu'un joueur "achète sa victoire" avec ses gains bruts :

- **`state.bank`** *(renommage de `state.balance`)* : l'argent misé aux tables pendant une journée. Repart d'une base fixe à chaque nouvelle run/partie.
- **`state.tickets`** *(nouveau)* : monnaie meta, gagnée en réussissant le quota (+ bonus de dépassement) et via les défis du jour. Dépensée dans :
  - la **boutique d'objets** (consommables de la journée en cours),
  - la **boutique de cosmétiques** (permanents, look du personnage/de la table).

---

## 7. Les objets

10 objets de `game-research.md §6` sont directement adaptables au solo (effets qui ne dépendent pas d'un coéquipier) ; les objets sociaux (Camera, Microphone) et liés au corps (Quota Gun) sont **repoussés à la phase multijoueur**.

| Objet | Coût (tickets) | Effet adapté | Statut |
|---|---|---|---|
| Angel's Reel | 3 | Après une perte, un tirage bonus avec chance de récupérer la mise. | v1 |
| Devil's Reel | 3 | Triple le dernier gain, ou le perd entièrement (pari à haute variance). | v1 |
| Golden Chip | 4 | Un all-in gratuit, sans risque, sur la table de son choix. | v1 |
| Taser | 4 | Augmente temporairement la mise max autorisée sur une table. | v1 |
| Mystery Box | 4 | Objet aléatoire parmi les autres. | v1 |
| Time Machine | 6 | Annule le dernier résultat défavorable (une fois par journée). | v1 |
| Holy Statue | 7 | Empêche toute perte pendant une fenêtre de temps courte. | v1 |
| Insurance | 7 | Réduit le montant des pertes de ~25% pendant sa durée. | v1 |
| Gambler's Confidence | 7 | Buff passif de profit sur toute la journée. | v1 |
| Bonus Draw | 8 | Rembourse 1 ticket à chaque profit réalisé. | v1 |
| Camera, Microphone | — | Effets sociaux (photographier/booster un coéquipier). | Reporté (multi) |
| Quota Gun, Stake Holder | — | Liés au système de parties du corps / mise partagée. | Reporté (lié à §8 et à la décision en §9 |

Reprend le pattern "objet armé" déjà en place (`renderItemBar()`), généralisé à tous les jeux via `onItemUse()` de l'interface commune (§3).

---

## 8. Multijoueur (non implémenté maintenant — juste préparé)

Pas de travail sur cette partie tant que le solo n'est pas solide, mais deux règles à respecter dès maintenant dans le code pour ne pas avoir à tout réécrire plus tard :

1. **Toute mutation d'état passe par des fonctions dédiées** dans `state.js`/`run.js` (jamais de `state.bank += x` éparpillé dans les modules de jeux) — le jour où la banque devient partagée, on ne change que *ce que fait* la fonction de sauvegarde (`saveState()` : `localStorage` → sync réseau), pas *qui l'appelle*.
2. **L'état reste un seul objet sérialisable en JSON** (déjà le cas) — condition nécessaire pour être synchronisable tel quel par n'importe quel backend temps réel choisi plus tard (Firebase, Supabase, WebSocket... à décider le moment venu).

Le choix technique du backend n'est **pas à trancher aujourd'hui**, comme convenu.

---

## 9. Pénalité d'échec de quota

**Décision reportée**, comme convenu — mais un point d'extension est prévu dès maintenant pour ne pas bloquer le reste de l'architecture :

```js
// run.js
function onQuotaFailed() {
  applyFailurePenalty(); // implémentation à définir plus tard (items.js / penalty.js)
}
```

Quand la décision sera prise (reprendre le concept "partie du corps" en pixel-art stylisé, ou une version plus soft type "gages"), il suffira d'écrire le contenu de `applyFailurePenalty()` sans toucher au reste de la boucle de run.

---

## 10. Les 3 fins

Après l'étage 4 et la dette remboursée : écran de choix (fidèle à `game-research.md §11`) avec deux options claires, puis une des 3 modales de fin (réutilise le pattern des modales `levelUpModal`/`millionaireModal` déjà existant) :

- **Payer la dette et arrêter** → *« …And They Lived Happily After »* (bonne fin).
- **Double ou rien** → animation de pile ou face → gagné : *« Let It Ride! »* (bonne fin) / perdu : *« End of the Line »* (mauvaise fin).

---

## 11. Feuille de route proposée

| Phase | Contenu | Statut |
|---|---|---|
| **0** | Ce document | ✅ |
| **1 — Fondations de la boucle** | Refonte du state (`bank`/`tickets`), quota + étages dans `run.js`, découpage modulaire du code, Roulette migrée dans `games/roulette.js`. Le chrono de 5 min prévu ici a finalement été retiré à la demande de l'utilisateur (voir historique) — la journée n'a plus de limite de temps. | ✅ |
| **2 — Étage 1** | Slots, Money Wheel, Wheel of Fortune + généralisation de la barre d'objets + catalogue d'objets étendu en boutique (payée en tickets) | ✅ |
| **3 — Étage 2** | Blackjack, Baccarat. **Duck Race a été omis par erreur** — pas construit, pas retiré consciemment, à rattraper si on veut les 16 jeux au complet. | ⚠️ partiel (2/3) |
| **4 — Étage 3** | Poker, Craps, Crash | ✅ |
| **5 — Étage 4** | Dragon Tower, Mine Sweeper, Plinko, Keno, Penguin Cross, HiLo + écran de choix final + 3 fins | ✅ |
| **6 — Multijoueur** (effort séparé, plus tard) | Banque partagée temps réel, chat/coordination, objets sociaux, décision finale sur la pénalité de quota | pas commencé |

15 des 16 jeux originaux sont maintenant jouables (il manque Duck Race, cf. ci-dessus). Chaque phase est jouable et testable de bout en bout indépendamment des autres.
