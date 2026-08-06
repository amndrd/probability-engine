# Fauxvegas

Casino web gratuit (aucun argent réel), en HTML/CSS/JS pur — pas de build, pas de dépendances.

## Lancer le projet en local

⚠️ Depuis le découpage du code en modules JS (`js/`), **il ne faut plus ouvrir `index.html` directement** (double-clic / `file://...`) : les navigateurs bloquent le chargement des modules JS par sécurité sur le protocole `file://`, donc rien ne se passe (aucun bouton ne fonctionne, y compris "Jouer en solo").

Il faut servir le dossier via un petit serveur local, puis ouvrir l'URL `http://...` qu'il donne. Deux options simples :

**Avec Python (déjà installé sur Mac) :**
```bash
cd /Users/amandindardenne/Desktop/casino
python3 -m http.server 8000
```
puis ouvre [http://localhost:8000](http://localhost:8000) dans ton navigateur.

**Avec l'extension "Live Server" de VS Code :**
si tu ouvres le dossier dans VS Code, installe l'extension "Live Server", puis clic droit sur `index.html` → "Open with Live Server".

Dans les deux cas, un rechargement de page (Cmd+R) fonctionne normalement une fois que tu es sur une URL `http://localhost:...` — c'est uniquement l'ouverture initiale en `file://` qui pose problème.

## Configurer Firebase pour le multijoueur

Le mode solo fonctionne sans rien configurer. Le mode **multijoueur** (banque partagée en temps réel entre joueurs) a besoin d'un projet Firebase gratuit — sans ça, le bouton "Créer une salle" affichera une erreur claire au lieu de planter, et le solo continue de fonctionner normalement.

1. Va sur [console.firebase.google.com](https://console.firebase.google.com/) et connecte-toi avec n'importe quel compte Google.
2. **"Ajouter un projet"** → donne-lui n'importe quel nom (ex. `fauxvegas`) → tu peux désactiver Google Analytics → **Créer le projet**.
3. Dans le menu de gauche : **Build → Realtime Database → Créer une base de données** → choisis une région → démarre en **mode test** (lecture/écriture ouvertes le temps de développer — voir la note de sécurité ci-dessous avant de déployer le site publiquement).
4. Retourne sur la page d'accueil du projet, clique sur l'icône **`</>`  (Web)** pour enregistrer une appli web → donne-lui un nom → Firebase affiche un objet `firebaseConfig`.
5. Copie ces valeurs dans `js/firebaseConfig.js` (remplace chaque `TODO_REPLACE_ME`). Le champ `databaseURL` se trouve sur la page Realtime Database si Firebase ne l'a pas déjà rempli à l'étape 4.
6. Recharge la page — le bouton "Multijoueur" de l'accueil permet maintenant de créer ou rejoindre une salle.

**Sécurité** : le mode test laisse la base de données lisible/modifiable par quiconque connaît l'URL — très bien pour jouer entre amis qui n'ont que le code de salle, mais si ce site est un jour déployé publiquement, resserre les règles (Build → Realtime Database → Règles) avant d'y stocker quoi que ce soit qui te dérangerait de voir lu ou effacé par un inconnu.
