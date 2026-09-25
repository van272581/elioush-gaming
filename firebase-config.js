/* ===================================================
   ELIOUSH GAMING — firebase-config.js
   
   INSTRUCTIONS :
   1. Va sur https://console.firebase.google.com
   2. Crée un projet "elioush-gaming"
   3. Clique sur l'icône </> (Web app)
   4. Copie les valeurs de ton projet dans les champs ci-dessous
   5. Active Firestore Database (mode production)
   6. Active Authentication > Email/Password + Anonymous
   =================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js";

const firebaseConfig = {
  apiKey: "AIzaSyBiFDdNHDvJ5QUlkIuUEc4SxAdpH6f7K5M",
  authDomain: "elioush-gaming.firebaseapp.com",
  projectId: "elioush-gaming",
  storageBucket: "elioush-gaming.firebasestorage.app",
  messagingSenderId: "323820528570",
  appId: "1:323820528570:web:3b69ed7e8c11dafb647383"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);
export const authReady = setPersistence(auth, browserLocalPersistence);