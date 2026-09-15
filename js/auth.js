import { auth, functions, db } from '../firebase-config.js';
import { getIdToken, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const currentLang = localStorage.getItem('eg_lang') || 'fr';

async function getCurrentSteamLinkToken() {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await getIdToken(user, true);
  } catch (err) {
    console.warn('Impossible de récupérer le jeton d’utilisateur pour la liaison Steam :', err);
    return null;
  }
}

// ⚠️ À METTRE À JOUR : l'URL de base de votre site une fois publié sur GitHub Pages.
// Exemple : "https://van272581.github.io/elioush-gaming" (sans slash final)
// Cette même valeur doit aussi être mise à jour dans functions/index.js (côté serveur).
const SITE_BASE_URL = 'https://van272581.github.io/elioush-gaming';

// --- Fonction pour initier la connexion Steam ---
export async function signInWithSteam() {
  // On renvoie Steam directement vers login.html (un vrai fichier statique),
  // ce qui évite d'avoir besoin d'une réécriture serveur "/auth-callback"
  // (GitHub Pages ne supporte pas les réécritures côté serveur).
  const returnToUrl = encodeURIComponent(`${SITE_BASE_URL}/login.html`);
  const realmUrl = encodeURIComponent(`${SITE_BASE_URL}/`);

  const currentToken = await getCurrentSteamLinkToken();
  if (currentToken) {
    localStorage.setItem('eg_steam_link_token', currentToken);
  }
  
  const steamLoginUrl = `https://steamcommunity.com/openid/login?openid.ns=http://specs.openid.net/auth/2.0&openid.mode=checkid_setup&openid.return_to=${returnToUrl}&openid.realm=${realmUrl}&openid.identity=http://specs.openid.net/auth/2.0/identifier_select&openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select`;
  
  window.location.href = steamLoginUrl;
}

// --- Fonction pour gérer le retour de l'authentification Steam ---
export async function handleSteamCallback() {
  // 1. Récupérer tous les paramètres de l'URL renvoyés par Steam
  const urlParams = new URLSearchParams(window.location.search);
  const steamResponse = {};
  for (const [key, value] of urlParams.entries()) {
    steamResponse[key] = value;
  }

  // Si aucun paramètre OpenID n'est présent, ce n'est pas un retour d'authentification Steam
  // ou si Steam a signalé une annulation/erreur
  if (!steamResponse['openid.claimed_id'] || steamResponse['openid.mode'] === 'cancel') {
    console.log("Pas un retour d'authentification Steam valide ou annulation.");
    // Rediriger l'utilisateur vers une page neutre ou la page de connexion
    window.location.href = '/login';
    return;
  }

  try {
    // 2. Appeler votre Cloud Function pour valider la réponse Steam et obtenir un jeton Firebase
    // Nom de votre fonction HTTPS Callable
    const storedToken = localStorage.getItem('eg_steam_link_token');
    if (storedToken) {
      steamResponse.idToken = storedToken;
      localStorage.removeItem('eg_steam_link_token');
    }

    const steamAuthCallable = httpsCallable(functions, 'steamAuth');
    const result = await steamAuthCallable(steamResponse);
    const firebaseCustomToken = result.data.token;

    if (firebaseCustomToken) {
      // 3. Se connecter à Firebase Authentication avec le jeton personnalisé
      await signInWithCustomToken(auth, firebaseCustomToken);
      console.log("Connecté à Firebase via Steam !");
      // Rediriger l'utilisateur vers la page principale ou le tableau de bord
      window.location.href = '/dashboard'; 
    } else {
      console.error("Aucun jeton Firebase personnalisé reçu de la Cloud Function.");
      window.location.href = '/login?error=steam_auth_failed';
    }

  } catch (error) {
    console.error("Erreur lors de l'authentification Steam/Firebase:", error);
    // Gérer l'erreur (ex: afficher un message à l'utilisateur)
    window.location.href = '/login?error=steam_auth_error';
  }
}

async function displaySteamLinkStatus(user) {
  const statusEl = document.getElementById('steamLinkStatus');
  if (!statusEl) return;
  if (!user) {
    statusEl.style.display = 'none';
    statusEl.textContent = '';
    return;
  }

  try {
    const profileSnap = await getDoc(doc(db, 'users', user.uid));
    const profile = profileSnap.exists() ? profileSnap.data() : null;
    const steamInfoEl = document.getElementById('steamLinkInfo');
    const steamIdEl = document.getElementById('steamIdValue');
    const steamNameEl = document.getElementById('steamNameValue');

    if (profile && profile.steamId) {
      statusEl.style.display = 'block';
      statusEl.className = 'steam-link-status success';
      statusEl.textContent = currentLang === 'fr'
        ? `Steam déjà lié : ${profile.steamProfile?.displayName || profile.steamId}`
        : `Steam already linked: ${profile.steamProfile?.displayName || profile.steamId}`;

      if (steamInfoEl && steamIdEl && steamNameEl) {
        steamInfoEl.classList.remove('hidden');
        steamIdEl.textContent = profile.steamId;
        steamNameEl.textContent = profile.steamProfile?.displayName || 'N/A';
      }
    } else {
      statusEl.style.display = 'block';
      statusEl.className = 'steam-link-status info';
      statusEl.textContent = currentLang === 'fr'
        ? 'Compte connecté, mais Steam n’est pas encore lié.'
        : 'Logged in, but Steam is not yet linked.';

      if (steamInfoEl) {
        steamInfoEl.classList.add('hidden');
      }
    }
  } catch (error) {
    console.warn('Impossible de lire le statut Steam:', error);
    statusEl.style.display = 'block';
    statusEl.className = 'steam-link-status error';
    statusEl.textContent = currentLang === 'fr'
      ? 'Impossible de vérifier le lien Steam pour le moment.'
      : 'Unable to verify Steam linkage right now.';
  }
}

// --- Gestionnaire de l'état d'authentification Firebase (optionnel, mais bonne pratique) ---
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("Utilisateur Firebase connecté:", user.uid);
    await displaySteamLinkStatus(user);
  } else {
    console.log("Aucun utilisateur Firebase connecté.");
    await displaySteamLinkStatus(null);
  }
});
