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

   Security note: Test mode leaves the database readable/writable by
   anyone with the URL — fine for playing with friends who only have
   the room code, but if this site is ever deployed somewhere public,
   tighten the Realtime Database rules (Build → Realtime Database →
   Rules) before relying on it for anything you'd mind a stranger
   reading or wiping.
   --------------------------------------------------------- */

export const FIREBASE_CONFIG = {
  apiKey: 'TODO_REPLACE_ME',
  authDomain: 'TODO_REPLACE_ME',
  databaseURL: 'TODO_REPLACE_ME',
  projectId: 'TODO_REPLACE_ME',
  storageBucket: 'TODO_REPLACE_ME',
  messagingSenderId: 'TODO_REPLACE_ME',
  appId: 'TODO_REPLACE_ME',
};

export function isFirebaseConfigured() {
  return Object.values(FIREBASE_CONFIG).every(v => v && !String(v).startsWith('TODO_'));
}
