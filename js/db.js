/* ===================================================
   ELIOUSH GAMING — db.js  (Firebase Firestore)
   Remplace l'ancienne version localStorage
   =================================================== */

import { db, auth, authReady, functions } from "../firebase-config.js";
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc,
  query, where, orderBy, serverTimestamp, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut, onAuthStateChanged, signInWithPopup, GoogleAuthProvider,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js";

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
      "./assets/UTB Exclu front.jpg",
      "./assets/SBTA3.jpg",
      "./assets/ETV side.png",
      "./assets/Ocean Trans front.jpg"
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
    title: "UTB Bus Marcopolo G7 Skins UTB 6x2",
    cat: "peintures",
    desc: "MARCOPOLO G7 1200 6x2 - PACK DE SKINS UTB & FLIXBUS\n\nDESCRIPTION DU MOD\nUn classique des routes ivoiriennes et internationales arrive dans Euro Truck Simulator 2 avec des livrees soignees et fidele a l'esprit des compagnies representees.\n\nIMPORTANT / COMPATIBILITE\nCe pack de skins necessite le modele 3D de base Bus Marcopolo G7 1200 6x2 Paradiso. Le modele est a obtenir sur le site de Fabio Contier ou une plateforme officielle de mods de bus.\n\nCOMPATIBILITE CHASSIS\n- Scania 6x2.\n- Mercedes 6x2.\n- Volvo 6x2 et 8x2.\n- Support multi-chassis selon le modele de base.\n\nSKINS INCLUS\n- UTB Standard - Union des Transports de Bouake.\n- UTB 40eme Anniversaire - edition speciale.\n- Flixbus.\n- INDEMONIUM, el nofe YouTube.\n\nINFORMATIONS\nTaille : 7,205 Mo.\nPublie le : 25 juillet 2025.\nCompatibilite annoncee : 1.x.x.\n\nCREDITS\nAuteur du bus et modele 3D : Fabio Contier.\nSkins edites par : VANO.\nWorkshop Steam : https://steamcommunity.com/sharedfiles/filedetails/?id=3534645465\nMode passagers pour la carte de base : https://steamcommunity.com/sharedfiles/filedetails/?id=2416700155\nDiscord : van225_61038.\n\nBonne route et roulez prudemment !",
    images: ["./assets/utb_g7.jpg", "./assets/Indenmonium side.png", "./assets/utb40ans.jpg", "./assets/g7_flixbus.jpg"],
    links: [
      { type: "workshop", label: "Ouvrir le Workshop Steam", url: "https://steamcommunity.com/sharedfiles/filedetails/?id=3534645465" },
      { type: "autre", label: "Modele 3D Fabio Contier", url: "https://fabiocontier.com/en/search?type=product&q=g7+1200" }
    ],
    workshopSubscribers: 32,
    workshopSubscribersCheckedAt: "2026-09-25",
    author: "VANO", version: "1.x.x", status: "approved",
    date: "2026-09-25", downloads: 0
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
  },
  {
    id: "seed_4",
    title: "Mercedes-Benz MP6 - Edition Vano",
    cat: "vehicules",
    desc: "Mercedes-Benz MP6 prepare pour les trajets longue distance sur Euro Truck Simulator 2. Cette edition propose une silhouette fidele, une presentation soignee et une experience de conduite adaptee aux convois de la communaute Elioush Gaming.\n\nCARACTERISTIQUES\n- Modele MP6 avec vues avant, laterale et arriere.\n- Finition visuelle propre pour une presentation premium.\n- Compatible avec les versions recentes d'Euro Truck Simulator 2, selon la version du mod de base.\n- Ideal pour les convois, captures d'ecran et trajets regionaux.\n\nINSTALLATION\nPlacez le fichier .scs dans le dossier Documents\\Euro Truck Simulator 2\\mod, puis activez-le depuis le Gestionnaire de mods. Respectez la priorite du mod de base lorsque cela est necessaire.\n\nAuteur : Vano",
    images: ["./assets/MP6_front.jpg", "./assets/MP6_side.jpg", "./assets/MP6_back.jpg"],
    links: [{ type: "mediafire", label: "MediaFire", url: "#" }],
    author: "Vano", version: "1.58.x", status: "approved",
    date: "2026-09-24", downloads: 0
  },
  {
    id: "seed_5",
    title: "Traffic Bus - Compagnies Ivoiriennes",
    cat: "vehicules",
    desc: "Pack de trafic AI mettant a l'honneur des bus Neoplan Tourliner habilles aux couleurs de compagnies de transport de Cote d'Ivoire. Il apporte une ambiance locale et plus de realisme aux routes d'Euro Truck Simulator 2.\n\nCREDITS\n- Modele de base AI Traffic : MAN / Neoplan Tourliner par HVT.\n- Peintre des skins : Vano.\n- Outil de developpement : Mod Studio 2.\n\nCOMPAGNIES REPRESENTEES\nOcean Transport, Rahimo, Le Labelle Transport, Utrako, Art Luxury, Citadine, Khalil Transport, AT Transport, UTB Exclu, UTB, Chonco, TSR, CTE, S.B.T.A VIP, AVS, SBTA et Abass Transport.\n\nINSTALLATION\nCopiez le fichier .scs dans Documents\\Euro Truck Simulator 2\\mod, activez le pack dans le Gestionnaire de mods et placez-le selon la priorite recommandee par le mod de base. Merci de respecter le travail de l'auteur et les credits de creation.\n\nBonne route sur Euro Truck Simulator 2 !",
    images: ["./assets/traffic_HVT_babi.png", "./assets/traffic_pack.png", "./assets/traffic_yango.png"],
    links: [{ type: "mediafire", label: "MediaFire", url: "#" }],
    author: "Vano", version: "1.58.x", status: "approved",
    date: "2026-09-24", downloads: 0
  },
  {
    id: "seed_6",
    title: "The Land Down Under - Carte autonome",
    cat: "cartes",
    desc: "The Land Down Under est une carte autonome pour Euro Truck Simulator 2. Elle fonctionne avec son propre module et demande un profil dedie : elle n'est pas compatible avec les autres cartes et les sauvegardes de la carte vanilla.\n\nINSTALLATION\n1. Consultez le manuel fourni avec l'archive : The Land Down Under Manual.\n2. Installez les fichiers de la carte dans le dossier mod d'Euro Truck Simulator 2 et respectez l'ordre de chargement indique dans le manuel.\n3. Creez un nouveau profil exclusivement pour The Land Down Under, puis selectionnez le module de la carte lorsque le jeu le demande.\n4. Ne chargez pas une sauvegarde provenant d'une autre carte.\n\nCOMPATIBILITE\n- Verifiez la description de la mise a jour pour connaitre la version ETS2 prise en charge.\n- La carte n'est pas compatible avec les autres cartes ou leurs modules.\n- Les mods de remorques et camions doivent etre verifies individuellement ; certaines compatibilites peuvent dependre d'une future version ETS2.\n\nAIDE\nPour toute question, installation bloquee ou probleme en jeu, demandez de l'aide sur le serveur Discord : https://discord.gg/nRY84BENeV\n\nPage de telechargement : modsfile.com",
    images: ["./assets/LDU1.png", "./assets/LUD2.jpeg", "./assets/LUD3.jpeg", "./assets/LUD4.png"],
    links: [
      { type: "autre", label: "Telecharger la carte (.rar)", url: "https://modsfile.com/pb6jpwoibju4/The_Land_Down_Under_v1.0.rar.html" },
      { type: "discord", label: "Aide Discord", url: "https://discord.gg/nRY84BENeV" }
    ],
    author: "Rob Viguurs", version: "1.60.x", status: "approved",
    date: "2026-09-24", downloads: 0
  },
  {
    id: "seed_8",
    title: "Ural-M - Camion tout-terrain",
    cat: "vehicules",
    desc: "Ural-M est un camion tout-terrain polyvalent conçu pour les trajets exigeants et les convois communautaires sur Euro Truck Simulator 2.\n\nCARACTERISTIQUES\n- 2 cabines.\n- 2 chassis : 6x4 et 6x6.\n- 6 moteurs de 400 a 510 ch.\n- 12 boites de vitesses : 6, 8, 12 et 16 rapports selon la configuration.\n- 1 interieur.\n- 3 couleurs de carrosserie avec finition metallisee selon la peinture utilisee.\n- Cadre de chassis inclus.\n\nINSTALLATION\nTelechargez le fichier .scs, placez-le dans Documents\\Euro Truck Simulator 2\\mod, puis activez-le dans le Gestionnaire de mods. Verifiez la compatibilite avec votre version ETS2 et respectez l'ordre de chargement recommande par l'auteur.\n\nCREDITS\nLacoste 36, Alex Kaiser et Valera Rusakov.\n\nBonne route et prudence sur les pistes !",
    images: ["./assets/ural_truck1.png", "./assets/ural_truck2.png", "./assets/ural_truck3.png", "./assets/ural_truck4.png"],
    links: [{ type: "mediafire", label: "Telecharger Ural-M", url: "https://www.mediafire.com/file/kyxxbjtevqs7p6m/Ural-M.scs/file" }],
    author: "Lacoste 36, Alex Kaiser, Valera Rusakov", version: "1.58.x", status: "approved",
    date: "2026-09-24", downloads: 0
  },
  {
    id: "seed_7",
    title: "Elioush Gaming - Convois et actualites Discord",
    cat: "divers",
    desc: "Retrouvez les activites du serveur Elioush Gaming : annonces de convois, photos partagees par la communaute, rendez-vous evenementiels et informations importantes.\n\nCette rubrique est reservee a la vie du groupe : aucune archive de mod n'est telechargee ici. Les liens servent uniquement a rejoindre Discord, consulter l'evenement ou obtenir le profil de convoi.",
    images: ["./assets/traffic_pack.png"],
    links: [{ type: "discord", label: "Rejoindre Discord", url: "https://discord.gg/tWKmrx3mBQ", external: true }],
    community: {
      eventStatus: "Convoi en preparation",
      statusTone: "pending",
      playersOnline: 0,
      playersTarget: 20,
      convoyOrder: [
        "Bus G8 - ouvreur",
        "Bus MP6 - groupe principal",
        "Traffic Bus ivoiriens - fermeture"
      ],
      eventLink: "https://discord.gg/tWKmrx3mBQ",
      eventLinkLabel: "Voir l'evenement Discord",
      profileLink: "",
      profileInstruction: "Profil convoi avec ordres de bus G8 a extraire dans le repertoire indique par l'archive, puis a activer en jeu. Une fois active, ouvrez Euro Truck Simulator 2, choisissez votre profil dans la liste des profils crees et selectionnez-le avant de rejoindre le convoi."
    },
    author: "Elioush Gaming", version: "Communautaire", status: "approved",
    date: "2026-09-24", downloads: 0
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

/** Incrémente le compteur de téléchargements */
export async function incrementDownload(modId, modTitle = '', source = 'external-link') {
  try {
    const callable = httpsCallable(functions, 'registerDownload');
    const result = await callable({ modId: String(modId), modTitle, source });
    return result.data?.downloads || 0;
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
    throw err;
  }
}

/** Récupère le nombre de téléchargements d'un mod depuis Firestore */
export async function getDownloads(modId) { // Nouvelle fonction
  try {
    const ref = doc(db, "mods", String(modId));
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data().downloads || 0;
    }
    const statsSnap = await getDoc(doc(db, "downloadStats", String(modId)));
    if (statsSnap.exists()) return statsSnap.data().downloads || 0;
  } catch (err) {
    console.error("getDownloads:", err);
  }
  return getDownloadsLocal(modId); // Fallback en cas d'erreur Firestore
}

/** Récupère le statut d'une soumission par compte */
export async function getSubmissionStatus(uid) {
  try {
    const q = query(collection(db, "submissions"), where("uid", "==", uid), orderBy("submittedAt", "desc"));
    const snap = await getDocs(q);
    if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
  } catch (err) {
    console.error("getSubmissionStatus:", err);
  }
  return null;
}

/** Écoute le statut d'une soumission en temps réel */
export function listenSubmissionStatus(uid, callback) {
  const q = query(collection(db, "submissions"), where("uid", "==", uid), orderBy("submittedAt", "desc"));
  return onSnapshot(q, snap => {
    if (!snap.empty) callback({ id: snap.docs[0].id, ...snap.docs[0].data() });
  });
}

/** Récupère toutes les soumissions rattachées à un compte créateur */
export async function getUserSubmissions(uid) {
  try {
    const q = query(collection(db, "submissions"), where("uid", "==", uid), orderBy("submittedAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("getUserSubmissions:", err);
    return [];
  }
}

/** Écoute en temps réel toutes les soumissions rattachées à un compte créateur
    (statut mis à jour instantanément dans l'espace membre dès qu'un admin valide/refuse) */
export function listenUserSubmissions(uid, callback) {
  const q = query(collection(db, "submissions"), where("uid", "==", uid), orderBy("submittedAt", "desc"));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
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
    await authReady;
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      email,
      name: name || email.split('@')[0],
      steamId: steamId || null,
      discordVerified: false,
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
    await authReady;
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  } catch (err) {
    console.error("loginUser:", err);
    throw err;
  }
}

/** Connexion Google avec session persistante dans le navigateur. */
export async function loginWithGoogle() {
  await authReady;
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  const profileRef = doc(db, "users", cred.user.uid);
  const profile = await getDoc(profileRef);
  if (!profile.exists()) {
    await setDoc(profileRef, {
      uid: cred.user.uid,
      email: cred.user.email || '',
      name: cred.user.displayName || cred.user.email?.split('@')[0] || 'Membre',
      photoURL: cred.user.photoURL || null,
      discordVerified: false,
      role: "member",
      joined: serverTimestamp()
    });
  }
  return cred.user;
}

/** Demande au serveur une URL OAuth Discord pour vérifier les rôles. */
export async function createDiscordOAuthUrl() {
  await authReady;
  const callable = httpsCallable(functions, 'createDiscordOAuthUrl');
  const result = await callable();
  return result.data.url;
}

/** Envoie le lien Firebase de réinitialisation du mot de passe. */
export async function sendPasswordReset(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) throw new Error('EMAIL_REQUIRED');
  await authReady;
  await sendPasswordResetEmail(auth, normalizedEmail);
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

/** Appelle la modération protégée par les custom claims Firebase. */
export async function moderateSubmission(submissionId, action, statusMsg = '') {
  const callable = httpsCallable(functions, 'moderateSubmission');
  const result = await callable({ submissionId, action, statusMsg });
  return result.data;
}

/** Accorde ou retire le statut créateur via une Cloud Function admin. */
export async function verifyCreator(uid, verified) {
  const callable = httpsCallable(functions, 'verifyCreator');
  const result = await callable({ uid, verified });
  return result.data;
}

/** Récupère l'historique de téléchargements d'un utilisateur, du plus récent au plus ancien */
export async function getUserDownloadHistory(uid) {
  try {
    const q = query(collection(db, "users", uid, "downloads"), orderBy("downloadedAt", "desc"));
    const snap = await getDocs(q);
    const grouped = new Map();
    snap.docs.forEach(download => {
      const data = download.data();
      const modId = String(data.modId || download.id);
      const existing = grouped.get(modId);
      const date = data.downloadedAt;
      if (existing) {
        existing.downloadCount += 1;
        if (!existing.downloadedAt && date) existing.downloadedAt = date;
      } else {
        grouped.set(modId, {
          id: download.id,
          modId,
          modTitle: data.modTitle || modId,
          downloadCount: 1,
          downloadedAt: date || null
        });
      }
    });
    return [...grouped.values()];
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
  incrementDownload,
  getDownloadsLocal,
  getDownloads,
  addPendingSubmission,
  getSubmissionStatus,
  listenSubmissionStatus,
  getUserSubmissions,
  listenUserSubmissions,
  getComments,
  listenComments,
  addComment,
  registerUser,
  loginUser,
  loginWithEmail: loginUser,
  loginWithGoogle,
  createDiscordOAuthUrl,
  sendPasswordReset,
  logoutUser,
  onUserStateChange,
  getUserProfile,
  linkSteamIdToCurrentUser,
  updateUserProfile,
  moderateSubmission,
  verifyCreator,
  getUserDownloadHistory,
  watchSubmissionStatus: listenSubmissionStatus
};

export default DB;

