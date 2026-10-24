# Fauxvegas

Casino web gratuit (aucun argent réel), en HTML/CSS/JS pur — pas de build, pas de dépendances.

## Lancer le projet en local

⚠️ Depuis le découpage du code en modules JS (`js/`), **il ne faut plus ouvrir `index.html` directement** (double-clic / `file://...`) : les navigateurs bloquent le chargement des modules JS par sécurité sur le protocole `file://`, donc rien ne se passe (aucun bouton ne fonctionne, y compris "Jouer en solo").

Il faut servir le dossier via un petit serveur local, puis ouvrir l'URL `http://...` qu'il donne. Deux options simples :

**Avec Python (déjà installé sur Mac) :**
```bash
cd probability-engine   # le dossier du projet
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
3. Dans le menu de gauche : **Build → Realtime Database → Créer une base de données** → choisis une région → démarre en **mode test** (on resserre les règles à l'étape 7).
4. Retourne sur la page d'accueil du projet, clique sur **"+ Ajouter une application"** → icône **Web `</>`** pour enregistrer une appli web → donne-lui un nom → Firebase affiche un objet `firebaseConfig`.
5. Copie ces valeurs dans `js/firebaseConfig.js` (remplace chaque `TODO_REPLACE_ME`). Le champ `databaseURL` se trouve sur la page Realtime Database si Firebase ne l'a pas déjà rempli à l'étape 4.
6. **Build → Authentication → "Get started" → Sign-in method → active "Anonymous"**. Le site connecte chaque visiteur anonymement et silencieusement (aucun écran de connexion) pour que les règles ci-dessous puissent distinguer "quelqu'un qui utilise le site" d'un script qui tape l'API directement.
7. **Build → Realtime Database → onglet Règles**, remplace le contenu par :
   ```json
   {
     "rules": {
       "rooms": {
         "$roomId": {
           ".read": "auth != null",
           ".write": "auth != null"
         }
       }
     }
   }
   ```
   puis **Publier**.
8. Recharge la page — le bouton "Multijoueur" de l'accueil permet maintenant de créer ou rejoindre une salle.

**Sécurité** : ces règles empêchent de lister/lire l'ensemble des salles (il faut connaître le code exact) et bloquent les scripts qui n'ont jamais chargé le site. Elles n'empêchent pas quelqu'un qui connaît un code de salle d'écrire n'importe quoi dans cette salle-là — suffisant pour un jeu d'argent virtuel entre amis, pas une vraie isolation par joueur. Si l'enjeu change un jour (comptes utilisateurs, argent réel, etc.), il faudra des règles par joueur et une validation de schéma en plus.
