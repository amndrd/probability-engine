# Recherche : *Gamble With Your Friends* — document de référence

> Objectif de ce document : servir de base de conception pour une **version web** reprenant les principes, fonctionnalités, niveaux, machines et systèmes du jeu *Gamble With Your Friends* (TEAM GWYF / TENSTACK). Compilé à partir de la page de référence fournie (games.gg) et de guides/wikis communautaires. Les chiffres exacts (coûts en tickets, pourcentages, timings) proviennent de guides tiers et peuvent varier légèrement selon la version du jeu — à traiter comme des **ordres de grandeur fiables**, pas des valeurs officielles gravées dans le marbre.

---

## 1. Fiche d'identité

| | |
|---|---|
| **Titre** | Gamble With Your Friends |
| **Studio** | TEAM GWYF |
| **Éditeur** | TENSTACK |
| **Plateformes** | Steam (Windows), Android |
| **Sortie** | 1er mai 2026 |
| **Joueurs** | 1 à 6, coopératif en ligne |
| **Durée de vie** | ~2-3 heures pour une run complète (3 fins possibles) |
| **Genres** | Aventure, simulation, gestion de ressources, comédie |
| **Vue** | Première personne |
| **Prix** | ~7,79€ (+ bundles jusqu'à -35%) |
| **Accueil** | Très positif (~88% sur ~10 000+ avis) |

**Pitch officiel** : *"An online 1-6 player co-op casino crawler where you and your friends share one bank account and one massive debt."*

Le jeu se présente comme le premier **"casino crawler" coopératif** : un mélange d'aventure, de simulation et de stratégie où l'on progresse à travers une tour de casino corrompue, dirigée en sous-main par un usurier (*loan shark*), en devant rembourser une dette de plus en plus lourde.

---

## 2. Concept central : la banque partagée

Le pilier absolu du jeu est le **compte bancaire unique et partagé** entre tous les joueurs de l'équipe.

- Il n'y a **pas de solde individuel** : quand un joueur mise, c'est l'argent de toute l'équipe qui est engagé. (uniquement en multiplayer concernant la version web)
- Une victoire d'un joueur profite à tout le monde ; une perte pénalise tout le monde.
- Cette contrainte transforme un jeu de hasard solitaire en un **problème de coordination sociale** : qui a le droit de miser, combien, sur quelle table, avec quel objet en réserve.
- Le jeu insiste sur la communication vocale de proximité pour négocier ces décisions en temps réel.
- Conséquence directe : la pire chose que puisse faire une équipe est de **miser en silence, chacun de son côté**, sans consensus — c'est la cause n°1 d'échec citée dans les guides.

**Pour la version web**, ce principe est LE système fondateur à reproduire : un état de banque global partagé entre tous les participants d'une session/room, avec verrous ou confirmations sociales avant les grosses mises.

---

## 3. La boucle de gameplay (game loop)

Le déroulé d'une "journée" de casino suit toujours la même structure :

1. **Lobby / QG d'équipe** (entre les runs)
   - Espace social commun (avec mini-activités type panier de basket).
   - Boutique d'objets (achats avec les *Tickets*).
   - Boutique de cosmétiques permanents.
   - Vérification collective des achats et de la stratégie du jour.
2. **Départ vers le casino** (en limousine, dans le jeu original) — transition scénarisée vers l'étage courant.
3. **Journée de casino chronométrée** : un minuteur de **5 minutes** démarre.
   - Objectif : faire grimper la banque commune au-dessus du **quota** fixé par l'usurier avant la fin du temps.
   - Les joueurs se répartissent librement sur les différentes machines/tables de l'étage.
4. **Fin de journée / bilan**
   - Si le **quota est atteint ou dépassé** → bonus de Tickets (environ +17% observé en cas de dépassement), montée en dette/étage suivant.
   - Si le **quota est manqué** → conséquence punitive : l'usurier prélève une **partie du corps** d'un joueur (ou pire).
5. **Retour au lobby**, achats/ajustements, et nouvelle journée — avec un quota généralement plus élevé.
6. Répétition sur **4 étages** jusqu'au choix final et à l'une des **3 fins**.

### Le quota et la dette

- Départ typique : ~1 000 $ en banque pour un quota de ~1 200 $ (ordre de grandeur, jour 1).
- Le quota grimpe à chaque nouvelle journée / nouvel étage → pression économique croissante.
- Dépasser largement le quota rapporte un bonus visible en Tickets.
- Rater le quota déclenche une scène de punition (perte d'une partie du corps, mise en scène dramatique/humoristique).
- Au dernier étage, l'objectif devient le **remboursement total de la dette collective**, qui débloque le choix de fin.

**Pour la version web**, ce cycle *lobby → session chronométrée avec objectif → bilan → progression* est la structure de boucle à répliquer (peut se transposer en "manches" plutôt qu'en jours réels).

---

## 4. Les 4 étages (floors) du casino

Le casino est une tour à gravir, divisée en 4 étages thématiques, débloqués progressivement à mesure que l'équipe s'enrichit (et s'endette). Un repère de progression communément cité : Étage 1 = jours 1-3, Étage 2 = jours 4-6, Étage 3 = jours 7-9, Étage 4 = jours 10-12 (les bornes exactes varient selon les runs, mais la logique "3 journées par étage" revient souvent).

| Étage | Thème / rôle | Caractéristiques |
|---|---|---|
| **1 — Fondation** | Mise en jambe | Dette faible, temps confortable. Sert à construire le socle de bankroll. Les guides insistent : ne pas sur-miser malgré l'impression de faible enjeu, une erreur ici plombe toute la suite. |
| **2 — Premier défi** | Montée en variance | Les jeux proposés deviennent plus volatils, les résultats peuvent basculer fortement. Idéalement, l'équipe a acheté ses premiers objets et stabilisé sa banque à la fin de cet étage. |
| **3 — Tournant critique** | Les objets deviennent décisifs | *"This is where items matter."* Les consommables économisés depuis le début peuvent compenser un mauvais début de run s'ils sont utilisés au bon moment. |
| **4 — Le règlement de comptes final** | Difficulté maximale | Dette la plus lourde. Le but est de rembourser la dette collective en totalité, ce qui débloque le choix final de fin de partie. |

Chaque étage a probablement sa propre palette visuelle/thème de casino (à définir librement pour la version web : ex. "Néon Vegas", "Speakeasy clandestin", "Casino flottant", "Penthouse VIP du boss").

---

## 5. Les jeux de casino (16 machines/mini-jeux)

Le jeu propose **16 jeux de casino distincts**, répartis en 3 grandes familles selon la part de stratégie qu'ils autorisent : **pur hasard**, **hybrides (hasard + optimisation de motifs)**, et **stratégiques (vraies décisions)**.

### 5.1 Tableau récapitulatif

| # | Jeu | Famille | Mécanique résumée | Stratégie / conseil clé |
|---|---|---|---|---|
| 1 | **Roulette** | Hybride | Pari sur une couleur (rouge/noir, ~50/50, faible gain) ou un numéro précis (risqué, gros gain). | Miser sur les couleurs pour un usage "sûr", à garder comme solution de dernier recours pour doubler sa mise. |
| 2 | **Wheel of Fortune** | Pur hasard | Roue à sections avec petits remboursements sur certaines sections perdantes. | Aucune décision stratégique possible : mises minimales répétées. |
| 3 | **Money Wheel** | Pur hasard | Choix d'une couleur associée à un multiplicateur (jusqu'à x10). | Miser petit et souvent sur les couleurs fréquentes (vert/bleu), ou tenter gros sur un multiplicateur élevé selon l'appétit au risque. |
| 4 | **Blackjack** | Stratégique | Approcher 21 sans dépasser, contre le croupier. | Règle simple : rester ("stand") à 15+, tirer ("hit") en dessous, doubler la mise à 20 si le croupier n'a pas 21 affiché. Le jeu le plus favorable à une vraie stratégie. |
| 5 | **Baccarat** | Stratégique | Parier sur qui (joueur/banquier) se rapprochera le plus de 9, ou sur une égalité. | Garder une prédiction cohérente et augmenter progressivement la mise jusqu'à un gain. |
| 6 | **1P Poker** (vidéo poker) | Stratégique | 4 cartes de départ à conserver/relancer selon les paires/combos possibles, puis tirage complémentaire. | Chercher au minimum une paire dès le premier tirage. |
| 7 | **Penguin Cross** | Hybride | Faire progresser un pingouin sur la glace ; plus il avance, plus le multiplicateur grimpe (façon "tour du risque"). | Petites mises en début de partie pour sécuriser la progression, possibilité de "revenir en arrière" après une perte précoce. |
| 8 | **Keno** | Hybride | Sélection de plusieurs tuiles/numéros avant le tirage ; des "diamants" révèlent les numéros gagnants. | Garder la même sélection de tuiles d'une partie à l'autre plutôt que de changer sans cesse. |
| 9 | **Crash** (façon "Aviator") | Hybride | Une fusée/courbe grimpe en direct, le joueur doit encaisser avant l'explosion ; plus on attend, plus le multiplicateur (et le risque) grandit. | Encaisser fréquemment à un multiplicateur modeste (≥1.5x) plutôt que viser un gros multiplicateur au risque de tout perdre. |
| 10 | **Dragon Tower** | Hybride | Choisir des tuiles en montant une tour, en évitant les "yeux de dragon" pièges ; chaque étage franchi augmente le multiplicateur. | Viser un palier raisonnable (~x3) ou le jackpot complet plutôt que de s'arrêter au milieu. |
| 11 | **Plinko** | Hybride | Lâcher des billes dans un plateau à picots ; elles retombent dans des cases à multiplicateurs (de x1.2 à x24), le centre étant statistiquement favorisé et donc peu rémunérateur. | Multiplier les petites mises plutôt qu'une seule grosse, en espérant des billes qui dévient vers les bords (meilleurs multiplicateurs). |
| 12 | **Duck Race** | Pur hasard | Course de 4 canards, pari sur le vainqueur. | Résultat imprévisible ; rester fidèle à un canard "porte-bonheur" plutôt que changer de choix à chaque manche. |
| 13 | **Slots** (machine à sous) | Pur hasard | Alignement de symboles ; combinaisons à multiplicateurs croissants (ex. œil = x0.5, ankh = x1.5, scarabée = x2.5, lotus = x3.5, combo complet ≈ x10). | 100% aléatoire : privilégier des mises minimales répétées. |
| 14 | **HiLo** | Pur hasard | Réglage d'un cadran puis pari sur le fait qu'une flèche/aiguille en mouvement s'arrêtera plus haut ou plus bas qu'un seuil. | Jeu jugé parmi les plus imprévisibles/difficiles du jeu ; à éviter en début de run. |
| 15 | **Street Craps** | Stratégique | Jeu de dés de rue : un premier lancer peut gagner/perdre immédiatement selon la combinaison, sinon un "point" est établi et il faut le relancer avant un 7. | Considéré comme "le meilleur jeu du casino" par les guides : cotes favorables si on comprend la condition de défaite. |
| 16 | **Mine Sweeper** (démineur) | Hybride | Grille façon démineur classique : le joueur choisit le nombre de mines (plus il y en a, plus le multiplicateur potentiel est élevé) puis révèle des cases une à une. | Encaisser tôt dès que profitable ; adapter le nombre de mines à la profondeur qu'on ose atteindre. |

### 5.2 Logique de conception à retenir

- **Chaque jeu a un profil de risque/volatilité différent** — c'est ce qui crée la variété stratégique malgré la simplicité de chaque mini-jeu pris isolément.
- Les jeux "purs hasard" (Slots, Wheel of Fortune, Money Wheel, Duck Race, HiLo, Keno) servent de mises "sûres" à faible enjeu cognitif, jouables sans réflexion collective longue.
- Les jeux "stratégiques" (Blackjack, Baccarat, 1P Poker, Street Craps) demandent une vraie prise de décision (tirer/rester, doubler, suivre un pattern) — ce sont les meilleurs candidats pour "optimiser" son edge.
- Les jeux "hybrides" (Roulette, Penguin Cross, Crash, Dragon Tower, Plinko, Mine Sweeper) combinent hasard et gestion du risque en temps réel (savoir quand s'arrêter/encaisser).
- Un item ou une machine peuvent être **exploitables via sauvegarde/rechargement** dans le jeu original (Duck Race, Dragon Tower, Mine Sweeper) — à volontairement **exclure** d'une version web équitable, sauf si l'on veut reproduire ce défaut comme un easter egg.

---

## 6. Les objets/items (économie de run)

Le jeu propose **15 objets achetables**, avec un coût en **Tickets** allant de 3 à 8. Ce sont des consommables qui modifient les probabilités, protègent contre les pertes, ou boostent les gains — le vrai levier stratégique par-dessus la couche de hasard des jeux.

### 6.1 Tableau des objets

| Objet | Coût (tickets) | Effet |
|---|---|---|
| **Angel's Reel** | 3 | Après une perte, donne un tirage supplémentaire avec une chance de récupérer l'intégralité de la somme perdue. |
| **Devil's Reel** | 3 | Permet de tripler le dernier gain — ou de tout reperdre en cas d'échec (pari risqué à haute variance). |
| **Golden Chip** | 4 | Offre un **all-in gratuit** (sans risque) sur une table à forte valeur. |
| **Taser** | 4 | Augmente la mise maximale autorisée sur une table (utilisation via un clavier/pavé à la table). |
| **Mystery Box** | 4 | Objet aléatoire surprise. |
| **Quota Gun** | 5 | Permet de payer ~33% du quota en "visant" une partie du corps (mécanique d'urgence liée au système body parts). |
| **Drink** | 5 | Boost de profit simple et direct. |
| **Microphone** | 6 | Effet d'aura sociale : buff aux joueurs à proximité (ex. lors d'une performance/animation). |
| **Camera** | 6 | Prendre en photo un joueur en train de gagner pour lui octroyer un profit supplémentaire. |
| **Stake Holder** | 6 | Objet lié à la gestion des mises (détail précis non confirmé par les sources, probablement partage/assurance de mise). |
| **Time Machine** ("Rewind") | 6 | Revenir en arrière dans le temps pour annuler un résultat défavorable récent (~60 secondes). |
| **Holy Statue** | 7 | Empêche toute perte à proximité pendant son activation — l'un des meilleurs objets "défensifs" pour débuter, car il donne un plan simple à toute l'équipe. |
| **Insurance** | 7 | Réduit le montant des pertes (environ -25% observé). |
| **Gambler's Confidence** | 7 | Buff offensif passif (revenu/穏 gains boostés dans la durée). |
| **Bonus Draw** | 8 | Rembourse un Ticket à chaque profit réalisé par l'équipe — investissement rentable sur la durée d'une run. |

### 6.2 Règles d'usage importantes

- Les objets achetés en boutique doivent être **physiquement récupérés** par un joueur avant le départ pour le casino — un achat non récupéré est perdu.
- **Une seule stratégie d'objets à la fois** est recommandée : ne pas multiplier des objets aux effets concurrents.
- Le **spawn/l'offre d'objets en boutique est aléatoire** et change chaque jour/étage — la stratégie doit s'adapter à ce qui est disponible, pas suivre un plan figé.
- Combo réputé efficace pour un démarrage solide : **Taser + Golden Chip** (mise max augmentée + all-in gratuit).
- Ordre de priorité conseillé aux débutants : Holy Statue (protection nearby) > Golden Chip (all-in gratuit) > Time Machine (annuler une erreur) > Taser (mise max) > Drink/Gambler's Confidence (boost de profit) > Insurance (réduction de perte) > Angel's Reel (retour sur perte) > Bonus Draw (économie long terme).

---

## 7. Les Tickets (monnaie meta)

Les **Tickets** sont la monnaie "meta" du jeu, distincte de l'argent de la banque commune misé au casino.

### 7.1 Comment les obtenir

1. **Réussir le quota du jour** → gain de Tickets, avec bonus si le quota est dépassé.
2. **Défis du Loan Shark** (l'usurier propose des objectifs bonus) → récompense en Tickets.
3. **Objets dédiés** comme le *Bonus Draw*, qui rapporte un Ticket par profit réalisé.
4. **Vente de parties du corps** au *Body Shredder* — solution d'urgence extrême.

### 7.2 Comment les dépenser

- **Boutique d'objets** (près du terrain de jeu / dans une remorque) : achats **temporaires**, à renouveler à chaque nouvelle journée/run.
- **Boutique de cosmétiques** (dans le lobby/QG) : achats **permanents** (vêtements, coiffures, accessoires) qui restent débloqués définitivement pour l'hôte de la partie.
- **Machine de restauration du corps** (voir section 8) : payer pour retrouver un membre perdu.

---

## 8. Le système des parties du corps (économie d'urgence)

Mécanique originale et centrale de l'identité comique/horrifique du jeu.

- Quand l'équipe **échoue au quota**, l'usurier prélève une **partie du corps** d'un joueur en guise de "paiement" (yeux, bouche, jambe, etc.).
- Chaque partie du corps peut être **volontairement sacrifiée** via l'objet *Quota Gun* ou au *Body Shredder*, en échange d'environ **33% du quota** ou de Tickets — un joker de dernier recours, à activer avec le consentement du joueur concerné.
- **Conséquences fonctionnelles réelles** : un membre manquant affecte le gameplay du joueur concerné (ex. perte partielle de vue si un œil manque, perte de communication si la bouche manque, mobilité réduite si une jambe manque).
- **Récupération** : une machine dédiée, située près du téléphone qui sert à appeler le prêteur, permet de "réparer" le corps :
  1. Se rendre à la machine.
  2. Ouvrir la cabine.
  3. Placer le corps à l'intérieur.
  4. Choisir la ou les parties à restaurer.
  5. Payer en Tickets.
- Cela crée un **vrai dilemme économique** : sacrifier un membre sauve la run à court terme, mais coûte des Tickets à long terme pour le réparer — un système à double tranchant qui pousse à la négociation d'équipe plutôt qu'à la décision individuelle.

---

## 9. Multijoueur & coopération

- **1 à 6 joueurs**, en ligne, coopératif.
- Les joueurs distants peuvent jouer ensemble sans être physiquement réunis.
- **Chat vocal de proximité** : on entend les coéquipiers proches de soi dans l'espace de jeu, ce qui encourage la coordination locale sur chaque table plutôt qu'un simple chat global.
- La contrainte de la **banque partagée** (section 2) rend la coordination non optionnelle : toute mise engage le groupe entier.
- Le jeu insiste sur l'aspect social : négociation en temps réel de "qui mise, combien, sur quoi", avec des dérives comiques possibles si la communication échoue.

---

## 10. Lobby / QG d'équipe & personnalisation

- Entre les runs, l'équipe dispose d'un **espace commun de type QG/hangout**, avec :
  - une petite activité récréative (ex. panier de basket) ;
  - la boutique d'objets ;
  - la boutique de cosmétiques.
- **Cosmétiques permanents** : cheveux, hauts/vêtements, chapeaux, accessoires — achetés avec les Tickets, débloqués définitivement pour l'hôte de la partie.
- Personnalisation de l'apparence du personnage jouable : un vrai éventail d'options visuelles est mis en avant par les retours joueurs comme un point fort inattendu.
- Ambiance et NPCs : un usurier/loan shark en figure centrale antagoniste, et des personnages secondaires de type "croupiers", décrits avec un ton **humoristique et un peu louche** (ex. figurants "à la barbichette discrète", personnages "border-line" façon petite pègre de casino).

---

## 11. Les 3 fins (endings)

Le choix final se déroule au sommet de la tour, à la fin de l'étage 4, une fois la dette totale remboursée.

- Le joueur/l'équipe doit choisir entre **deux directions symboliques** : partir à droite pour **payer la dette et arrêter de jouer**, ou partir à gauche pour tenter un ultime pari **double ou rien** (pile ou face).
- Détail notable : le résultat du pile ou face final n'est pas déterminé au moment où la pièce retombe, mais **au moment où l'équipe se réveille le dernier jour** — un twist purement narratif/humoristique sur le déterminisme du hasard.

| Fin | Condition | Nature |
|---|---|---|
| **« …And They Lived Happily After »** | Rembourser la dette et choisir d'arrêter de jouer (aller "à droite"). | Bonne fin — l'équipe recommence une nouvelle vie, libre de dettes et de stress. |
| **« Let It Ride! »** | Choisir le double ou rien ("à gauche") et **gagner** le pile ou face final. | Bonne fin, plus "folle"/jackpot. |
| **« End of the Line »** | Choisir le double ou rien et **perdre** le pile ou face final. | Mauvaise fin. |

---

## 12. Style et ambiance

- **Vue à la première personne**, exploration physique du casino (déplacement, interaction avec les objets/machines comme dans un jeu type *Lethal Company*/*Content Warning*).
- Ton **comique et satirique** sur l'univers du jeu d'argent, avec des enjeux qui basculent volontairement dans l'absurde (parties du corps, usurier caricatural).
- Bande-son originale, ambiance sonore de casino.
- Tags Steam dominants : Multijoueur, Coopération en ligne, Jeux de hasard, Comédie, Physique, Vue à la première personne, Aventure, Exploration, Gestion de ressources.

---

## 13. Stratégies générales relevées dans les guides

- **Avant d'entrer au casino** : vérifier collectivement les Tickets disponibles, se mettre d'accord sur les achats, désigner une seule stratégie d'objets, confirmer que les objets achetés ont bien été récupérés physiquement, désigner un joueur "chronométreur".
- **Pendant la journée** : aucune mise significative sans validation d'équipe ; privilégier au départ des jeux simples et bien compris (Roulette, Blackjack) ; éviter en première run les jeux les plus volatils/mal compris (Crash, HiLo, Plinko, Poker).
- **Savoir s'arrêter** : cesser de jouer dès que le quota est atteint, que le temps presse, ou que l'équipe n'a plus de filet de sécurité (objets défensifs épuisés).
- **Erreurs fréquentes à éviter** : dépenses de Tickets non concertées, mises sérieuses sur un jeu inconnu de tous, plusieurs joueurs qui misent en simultané sans coordination, "course-poursuite" après une perte (chasing losses).
- Les objets ne sont pas juste des boosts : ils **structurent la stratégie de l'équipe** (ex. Holy Statue "donne un plan simple", Golden Chip "donne un plan clair de casino").

---

## 14. Pistes de transposition pour la version web

Éléments-clés à absolument conserver pour rester fidèle à l'esprit du jeu (à discuter/prioriser ensemble) :

1. **Banque partagée en temps réel** entre tous les joueurs connectés à une même room — c'est le cœur du concept, pas un simple casino solo.
2. **Boucle "manche chronométrée avec quota à atteindre"**, plutôt qu'un casino sans fin — crée la tension et le rythme.
3. **Progression par étages/niveaux** avec dette croissante et déblocage progressif de nouveaux jeux/machines.
4. **Bibliothèque de mini-jeux variés** couvrant les 3 familles (pur hasard / hybride / stratégique) pour équilibrer accessibilité et profondeur — prioriser un sous-ensemble réaliste au départ (ex. Slots, Roulette, Blackjack, Crash, Plinko, Dragon Tower, Mine Sweeper, Duck Race, Money Wheel) puis étendre.
5. **Objets/consommables** qui modifient les règles de mise (protection contre la perte, all-in gratuit, boost de gain, annulation de résultat) — le vrai levier de "stratégie d'équipe".
6. **Monnaie meta (Tickets)** séparée de l'argent misé, pour acheter objets et cosmétiques, créant une double boucle économique (court terme = banque, long terme = tickets).
7. **Mécanique de risque/pénalité en cas d'échec du quota** — à adapter (le concept "parties du corps" est très spécifique/gore-comique ; une version web peut le réinterpréter avec un système de "gages" ou "pénalités" plus léger si besoin).
8. **Multi-fins** en fin de progression pour donner un objectif narratif à la session complète.
9. **Communication/coordination sociale** comme mécanique de jeu à part entière (chat, votes de mise, confirmations avant gros paris).

---

## 15. Sources

- [games.gg/fr — page de référence fournie](https://games.gg/fr/gamble-with-your-friends/)
- [Steam — Gamble With Your Friends](https://store.steampowered.com/app/3892270/Gamble_With_Your_Friends/)
- [TheGamer — How To Play Every Game In Gamble With Your Friends](https://www.thegamer.com/gamble-with-your-friends-casino-games-floors-unlock-guide/)
- [TheGamer — How To Get More Tickets](https://www.thegamer.com/gamble-with-your-friends-tickets-obtain-spend-guide/)
- [TheGamer — Complete Customization Guide](https://www.thegamer.com/gamble-with-your-friends-customization-outfits-accessories-guide/)
- [games.gg — Every Casino Game in Gamble With Your Friends](https://games.gg/gamble-with-your-friends/guides/every-casino-game-in-gamble-with-your-friends/)
- [games.gg — Beginner's Guide](https://games.gg/gamble-with-your-friends/guides/gamble-with-your-friends-beginners-guide/)
- [games.gg — Items Breakdown](https://games.gg/gamble-with-your-friends/guides/gamble-with-your-friends-items-breakdown/)
- [Destructoid — All Casino Games and How To Win](https://www.destructoid.com/all-casino-games-in-gamble-with-your-friends-and-how-to-win/)
- [Destructoid — All Items and What They Do](https://www.destructoid.com/all-items-in-gamble-with-your-friends-and-what-they-do/)
- [Whisper of the House — Beginner Guide](https://www.whisperofthehouse.com/gamble-with-your-friends/beginner-guide)
- [Whisper of the House — Tickets, Items, and Body Parts Guide](https://www.whisperofthehouse.com/gamble-with-your-friends/tickets-items-body-parts)
- [WiseGuyGaming — Every Item & Their Effects](https://wiseguygaming.com/gamble-with-your-friends-every-item-their-effects/)
- [WiseGuyGaming — Endings Guide](https://wiseguygaming.com/gamble-with-your-friends-endings-guide-all-endings-explained/)
- [GameBrief — Tips Guide, All Floors](https://www.gamebrief.net/blog/gamble-with-your-friends-tips-guide-all-floors)
- [Deltia's Gaming — All Endings Explained](https://deltiasgaming.com/gamble-with-your-friends-all-endings-explained/)
- [GamerBlurb — How to Get Your Body Back](https://gamerblurb.com/articles/gamble-with-your-friends-how-to-get-your-body-back)
- [gamblewithyourfriends.net — Items Guide](https://gamblewithyourfriends.net/items/)

> Note méthodologique : ces informations proviennent de guides communautaires publiés autour de la sortie du jeu (1er mai 2026) et non de la documentation officielle du développeur. Certains détails numériques (coûts exacts, pourcentages, timings précis) peuvent différer légèrement de la version finale/patchée du jeu. À vérifier/ajuster si des divergences sont constatées en jouant au jeu original.
