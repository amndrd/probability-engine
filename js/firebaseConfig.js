/* ---------------------------------------------------------
   Firebase project config — REQUIRED for multiplayer to work.
   Solo mode never touches this file and works fine without it.

   How to get real values (5 minutes, free) :
   1. Go to https://console.firebase.google.com/ and sign in with any
      Google account.
   2. "Add project" → give it any name (e.g. "fauxvegas") → you can
      skip Google Analytics → Create project.
   3. In the left sidebar: Build → Realtime Database → Create Database
      → pick any region → start in "Test mode" (open read/write while
      you're building this — lock it down later if you ever make the
      site public, see the note below).
   4. Back on the project Overview page, click the "</>" (Web) icon to
      register a web app → give it any nickname → Firebase shows you a
      `firebaseConfig` object. Copy its values into FIREBASE_CONFIG below.
   5. The Realtime Database's URL (shown on the Realtime Database page,
      looks like https://<project>-default-rtdb.<region>.firebasedatabase.app)
      goes in `databaseURL` below if it isn't already filled in by step 4.
   6. Build → Authentication → "Get started" → Sign-in method → enable
      "Anonymous". The site signs every visitor in anonymously and
      silently (no login screen) so the database rules below can tell
      "someone using the site" apart from a script hitting the REST API
      directly.
   7. Build → Realtime Database → Rules tab → replace the contents with:
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
      → Publish. This blocks listing/reading the whole `rooms` collection
      (you need the exact room code to read anything) and requires the
      silent anonymous sign-in from step 6, which stops casual scripts
      that never load the site at all. It does NOT stop someone who has
      a room code from writing anything to that room — fine for a
      play-money game between friends, not a substitute for real access
      control if the stakes ever change.
   --------------------------------------------------------- */

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyB6nRe0oNA5exUQ4eivI7X3k-N9Kvrv0XA',
  authDomain: 'fauxvegas-cf524.firebaseapp.com',
  databaseURL: 'https://fauxvegas-cf524-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'fauxvegas-cf524',
  storageBucket: 'fauxvegas-cf524.firebasestorage.app',
  messagingSenderId: '1012685158797',
  appId: '1:1012685158797:web:73b095d4bc0822064f65c4',
};

export function isFirebaseConfigured() {
  return Object.values(FIREBASE_CONFIG).every(v => v && !String(v).startsWith('TODO_'));
}
