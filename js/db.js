/* ===================================================
   ELIOUSH GAMING — db.js  (Firebase Firestore)
   Remplace l'ancienne version localStorage
   =================================================== */

import { db, auth } from "../firebase-config.js";
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc,
  query, where, orderBy, serverTimestamp, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/* ===================================================
   SEED DATA — Mods de départ publiés une seule fois
   =================================================== */
export const SEED_MODS = [
  {
    id: "seed_0",
    title: "Scania G8 Collection Ivoirienne",
    cat: "peintures",
    desc: "Pack de Peintures Ivoiriennes pour Bus G8 1200 6x2 de Fabio Contier\n\nCaractéristiques :\n• Livrées inspirées des principales compagnies ivoiriennes de transport\n• Plusieurs peintures fidèlement reproduites\n• Compatible avec le bus G8 1200 6x2 de Fabio Contier\n• Apporte davantage de réalisme et d'immersion\n\nPeintures incluses :\n• SBTA\n• UTB 40 Ans\n• UTB Exclusive\n• UTB Executive\n• ESIF\n• TSR\n• Océan Transport\n• Khalil Transport\n• Léopard Transport\n\nInstallation :\n• Téléchargez le fichier du mod\n• Placez le fichier .scs dans : Documents\\Euro Truck Simulator 2\\mod\n• Lancez Euro Truck Simulator 2\n• Activez le mod dans le Gestionnaire de mods\n• Achetez ou modifiez votre bus G8 1200 6x2 de Fabio Contier puis sélectionnez la peinture souhaitée\n\nConseil de placement :\n• Placez ce mod au-dessus du mod principal du bus pour éviter les conflits\n\nPriorité recommandée :\n↑ Pack Peintures Ivoiriennes G8 1200 6x2\n↑ Mod du Bus G8 1200 6x2 Fabio Contier\n↓ Autres mods\n\nAuteur : VANO",
    images: [
      "./assets/STA 1.jpg",
      "https://i.postimg.cc/VkbYgrdF/227300-20.jpg",
      "https://i.postimg.cc/hGw4mR4z/Ocean-Trans-front.jpg",
      "https://i.postimg.cc/Y0xwb57j/UTB-Exclu-front.jpg"
    ],
    links: [{ type: "mediafire", label: "MediaFire", url: "https://rekonise.com/3fcmodskinsg8scania6x2-wea59" }],
    author: "Elioush", version: "1.50.x", status: "approved",
    date: "2026-01-15", downloads: 0
  },
  {
    id: "seed_1",
    title: "Mascarello R8 – Édition Spéciale",
    cat: "peintures",
    desc: "Peintures personnalisées du bus Mascarello R8 de Leo Gaer pvh, accessible au garage du jeu. Inclut les livrées UTB et INTERCITY.",
    images: ["./assets/mascarello R8 UTB 2 front.png", "./assets/mascarello R8 INTERCITY.png"],
    links: [{ type: "mediafire", label: "MediaFire", url: "#" }],
    author: "Elioush", version: "1.50.x", status: "approved",
    date: "2026-02-03", downloads: 0
  },
  {
    id: "seed_2",
    title: "Scania G7 – Édition Spéciale",
    cat: "vehicules",
    desc: "Mod Bus Scania G7 1200 de Fabio Contier. Haute qualité extérieure et intérieure avec son moteur authentique.",
    images: ["./assets/Indenmonium front.png", "./assets/Indenmonium side.png"],
    links: [{ type: "mediafire", label: "MediaFire", url: "#" }],
    author: "Elioush", version: "1.49.x", status: "approved",
    date: "2026-02-18", downloads: 0
  },
  {
    id: "seed_3",
    title: "Mercedes-AMG GLE 63S Pack",
    cat: "vehicules",
    desc: "Mod véhicules Mercedes GLE 63S compatible 1.58.x\n\nCaractéristiques :\n• Extérieur et intérieur de très haute qualité\n• 3 options de couleur intérieure\n• Tableau de bord HQ UI avec vitesse numérique\n• GPS HQ\n• Vitesse maximale : 300 km/h\n\nConcessionnaires > Access Mod > AMG\nAuteur : Gaza",
    images: [
      "https://ets2.lt/wp-content/uploads/2026/02/1-28-750x428.jpg",
      "https://ets2.lt/wp-content/uploads/2026/02/03-750x829.jpg"
    ],
    links: [
      { type: "routesync", label: "RouteSync", url: "https://rekonise.com/gle-63s-pack-jxch8" },
      { type: "mediafire", label: "MediaFire", url: "https://rekonise.com/gle-63s-pack-jxch8" }
    ],
    author: "Gaza", version: "1.58.x", status: "approved",
    date: "2026-03-10", downloads: 0
  }
];

/* ===================================================
   COLLECTIONS Firestore
   mods/          — mods approuvés
   submissions/   — soumissions en attente
   comments/      — commentaires par modId
   users/         — profils utilisateurs
   =================================================== */

// ---- MODS ----

/** Récupère tous les mods approuvés (une seule fois) */
export async function getApprovedMods() {
  try {
    const q = query(collection(db, "mods"), where("status", "==", "approved"), orderBy("date", "desc"));
    const snap = await getDocs(q);
    if (snap.empty) {
      // Premier lancement : on seed la base
      await seedMods();
      return SEED_MODS;
    }
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("getApprovedMods:", err);
    return SEED_MODS; // fallback
  }
}

/** Écoute les mods en temps réel (callback appelé à chaque changement) */
export function listenApprovedMods(callback) {
  const q = query(collection(db, "mods"), where("status", "==", "approved"), orderBy("date", "desc"));
  return onSnapshot(q, snap => {
    const mods = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(mods.length > 0 ? mods : SEED_MODS);
  }, err => {
    console.error("listenApprovedMods:", err);
    callback(SEED_MODS);
  });
}

/** Seed initial des mods de base */
async function seedMods() {
  for (const mod of SEED_MODS) {
    const { id, ...data } = mod;
    await addDoc(collection(db, "mods"), { ...data, createdAt: serverTimestamp() });
  }
}

/** Ajoute un nouveau mod (appelé par le processAdminKeyword) */
export async function addMod(modData) {
  try {
    const ref = await addDoc(collection(db, "mods"), {
      ...modData,
      status: "approved",
      downloads: 0,
      date: new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp()
    });
    return { id: ref.id, ...modData };
  } catch (err) {
    console.error("addMod:", err);
    return null;
  }
}

/** Incrémente le compteur de téléchargements */
export async function incrementDownload(modId) {
  try {
    const ref = doc(db, "mods", String(modId));
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const current = snap.data().downloads || 0;
      await updateDoc(ref, { downloads: current + 1 });
      return current + 1;
    }
  } catch (err) {
    // Fallback localStorage
    const key = `eg_dl_${modId}`;
    const n = parseInt(localStorage.getItem(key) || '0') + 1;
    localStorage.setItem(key, n);
    return n;
  }
  return 0;
}

/** Récupère le nombre de téléchargements (sync fallback) */
export function getDownloadsLocal(modId) {
  return parseInt(localStorage.getItem(`eg_dl_${modId}`) || '0');
}

// ---- SUBMISSIONS (soumissions en attente) ----

/** Enregistre une nouvelle soumission */
export async function addPendingSubmission(data) {
  try {
    const ref = await addDoc(collection(db, "submissions"), {
      ...data,
      status: "pending",
      statusMsg: "",
      submittedAt: serverTimestamp()
    });
    return { id: ref.id, ...data, status: "pending" };
  } catch (err) {
    console.error("addPendingSubmission:", err);
    // Fallback localStorage
    const subs = JSON.parse(localStorage.getItem('eg_submissions') || '[]');
    const sub = { ...data, status: 'pending', statusMsg: '', submittedAt: new Date().toISOString() };
    subs.push(sub);
    localStorage.setItem('eg_submissions', JSON.stringify(subs));
    return sub;
  }
}
// ... (votre code existant) ...

/** Récupère le nombre de téléchargements d'un mod depuis Firestore */
export async function getDownloads(modId) { // Nouvelle fonction
  try {
    const ref = doc(db, "mods", String(modId));
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data().downloads || 0;
    }
  } catch (err) {
    console.error("getDownloads:", err);
  }
  return getDownloadsLocal(modId); // Fallback en cas d'erreur Firestore
}

/** Récupère le statut d'une soumission par email */
export async function getSubmissionStatus(email) {
  try {
    const q = query(collection(db, "submissions"), where("email", "==", email), orderBy("submittedAt", "desc"));
    const snap = await getDocs(q);
    if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
  } catch (err) {
    // Fallback localStorage
    const subs = JSON.parse(localStorage.getItem('eg_submissions') || '[]');
    return subs.filter(s => s.email === email).pop() || null;
  }
  return null;
}

/** Écoute le statut d'une soumission en temps réel */
export function listenSubmissionStatus(email, callback) {
  const q = query(collection(db, "submissions"), where("email", "==", email), orderBy("submittedAt", "desc"));
  return onSnapshot(q, snap => {
    if (!snap.empty) callback({ id: snap.docs[0].id, ...snap.docs[0].data() });
  });
}

/**
 * Traite le mot-clé admin (approuvé / refusé / à revoir)
 * Appelé depuis l'URL ?admin_action=approuvé&email=xxx&token=ELIOUSH_ADMIN
 */
export async function processAdminKeyword(keyword, email) {
  try {
    const q = query(collection(db, "submissions"), where("email", "==", email), where("status", "==", "pending"));
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const docRef = snap.docs[0].ref;
    const sub = snap.docs[0].data();
    const kw = keyword.trim().toLowerCase();

    let status = "pending";
    let statusMsg = "";

    if (kw === "approuvé" || kw === "approuve") {
      status = "approved";
      statusMsg = "approved";

      // Construction des liens
      const linksList = [];
      if (sub.dl1Link) linksList.push({ type: sub.dl1Type || "mediafire", label: sub.dl1Type || "MediaFire", url: sub.dl1Link });
      if (sub.dl2Link) linksList.push({ type: sub.dl2Type || "autre", label: sub.dl2Type || "Autre", url: sub.dl2Link });

      // Publication automatique dans Firestore
      await addMod({
        title: sub.title,
        cat: sub.cat,
        desc: sub.desc,
        images: sub.images || [],
        links: linksList,
        author: sub.author,
        version: sub.version
      });

    } else if (kw === "refusé" || kw === "refuse") {
      status = "refused";
      statusMsg = "refused";
    } else if (kw.startsWith("a revoir") || kw.startsWith("à revoir")) {
      status = "review";
      statusMsg = keyword;
    }

    await updateDoc(docRef, { status, statusMsg, processedAt: serverTimestamp() });
    return { ...sub, status, statusMsg };

  } catch (err) {
    console.error("processAdminKeyword:", err);
    return null;
  }
}

// ---- COMMENTS ----

/** Récupère les commentaires d'un mod */
export async function getComments(modId) {
  try {
    const q = query(collection(db, "comments"), where("modId", "==", String(modId)), orderBy("createdAt", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("getComments:", err);
    return [];
  }
}

/** Écoute les commentaires en temps réel */
export function listenComments(modId, callback) {
  const q = query(collection(db, "comments"), where("modId", "==", String(modId)), orderBy("createdAt", "asc"));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, err => { console.error("listenComments:", err); callback([]); });
}

/** Ajoute un commentaire */
export async function addComment(modId, comment) {
  try {
    const newComment = {
      modId: String(modId),
      author: comment.author,
      email: comment.email,
      body: comment.body,
      avatar: comment.author.charAt(0).toUpperCase(),
      date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
      createdAt: serverTimestamp()
    };
    const ref = await addDoc(collection(db, "comments"), newComment);
    return { id: ref.id, ...newComment };
  } catch (err) {
    console.error("addComment:", err);
    return null;
  }
}

// ---- USERS / AUTH ----

/** Inscription email + mot de passe */
export async function registerUser(email, password, name, steamId = null) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      email,
      name: name || email.split('@')[0],
      steamId: steamId || null,
      discordVerified: false,
      accountActivated: false,
      activationState: "pending",
      role: "member",
      joined: serverTimestamp()
    });
    return cred.user;
  } catch (err) {
    console.error("registerUser:", err);
    throw err;
  }
}

/** Connexion email + mot de passe */
export async function loginUser(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  } catch (err) {
    console.error("loginUser:", err);
    throw err;
  }
}

/** Vérifie si le compte a bien été activé via Discord */
export async function getUserActivationStatus(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return { accountActivated: false, discordVerified: false, activationState: "pending" };
    const data = snap.data();
    return {
      accountActivated: Boolean(data.accountActivated),
      discordVerified: Boolean(data.discordVerified),
      activationState: data.activationState || (data.accountActivated ? "activated" : "pending"),
      discordInvite: data.discordInvite || null
    };
  } catch (err) {
    console.error("getUserActivationStatus:", err);
    return { accountActivated: false, discordVerified: false, activationState: "pending" };
  }
}

/** Déconnexion */
export async function logoutUser() {
  await signOut(auth);
}

/** Écoute l'état de connexion */
export function onUserStateChange(callback) {
  return onAuthStateChanged(auth, callback);
}

/** Récupère le profil Firestore d'un utilisateur par uid */
export async function getUserProfile(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) return { id: snap.id, ...snap.data() };
  } catch (err) { console.error("getUserProfile:", err); }
  return null;
}

/** Lie un Steam ID au profil de l'utilisateur actuellement authentifié */
export async function linkSteamIdToCurrentUser(steamId) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Utilisateur non authentifié.');
    await updateDoc(doc(db, "users", user.uid), {
      steamId: steamId || null,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (err) {
    console.error("linkSteamIdToCurrentUser:", err);
    return false;
  }
}

/** Met à jour le profil (steamId, discordVerified…) */
export async function updateUserProfile(docId, data) {
  try {
    await updateDoc(doc(db, "users", docId), data);
  } catch (err) { console.error("updateUserProfile:", err); }
}

/** Enregistre un téléchargement dans l'historique de l'utilisateur connecté.
    Ne fait rien si personne n'est connecté (téléchargement anonyme). */
export async function recordUserDownload(modId, modTitle) {
  try {
    const user = auth.currentUser;
    if (!user) return;
    await addDoc(collection(db, "users", user.uid, "downloads"), {
      modId: String(modId),
      modTitle: modTitle || '',
      downloadedAt: serverTimestamp()
    });
  } catch (err) {
    console.error("recordUserDownload:", err);
  }
}

/** Récupère l'historique de téléchargements d'un utilisateur, du plus récent au plus ancien */
export async function getUserDownloadHistory(uid) {
  try {
    const q = query(collection(db, "users", uid, "downloads"), orderBy("downloadedAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("getUserDownloadHistory:", err);
    return [];
  }
}

// ---- Export objet DB (compatibilité avec script.js existant) ----
// ---- Export objet DB (compatibilité avec script.js existant) ----
export const DB = {
  getApprovedMods,
  listenApprovedMods,
  addMod,
  incrementDownload,
  getDownloadsLocal,
  getDownloads,
  addPendingSubmission,
  getSubmissionStatus,
  listenSubmissionStatus,
  processAdminKeyword,
  getComments,
  listenComments,
  addComment,
  registerUser,
  loginUser,
  loginWithEmail: loginUser,
  logoutUser,
  onUserStateChange,
  getUserProfile,
  linkSteamIdToCurrentUser,
  updateUserProfile,
  recordUserDownload,
  getUserDownloadHistory,
  watchSubmissionStatus: listenSubmissionStatus
};

export default DB;

