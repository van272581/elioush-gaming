const functions = require('firebase-functions');
const admin = require('firebase-admin');
const OpenID = require('openid'); // Pour valider la réponse OpenID Steam
const axios = require('axios'); // Pour interroger l'API Web de Steam

// Initialise l'Admin SDK de Firebase
admin.initializeApp();
const db = admin.firestore(); // Initialise Firestore

// Configurez le "Relying Party" pour OpenID
// ⚠️ IMPORTANT : cette URL doit CORRESPONDRE EXACTEMENT à SITE_BASE_URL + '/login.html'
// défini dans js/auth.js côté frontend (GitHub Pages, pas Firebase Hosting).
// Exemple : 'https://van272581.github.io/elioush-gaming/login.html'
const relyingParty = new OpenID.RelyingParty(
    'https://van272581.github.io/elioush-gaming/login.html', // Doit correspondre EXACTEMENT au frontend
    null, // Realm. Si null, il sera déduit du return_to.
    true, // Stateless pour simplifier, mais false est plus sécurisé avec gestion de session
    false, // Strict mode
    [] // Extensions OpenID
);

// Cloud Function pour gérer l'authentification Steam
exports.steamAuth = functions.https.onCall(async (data, context) => {
    // Le 'data' contient les paramètres OpenID renvoyés par Steam à votre frontend
    const idToken = data.idToken || null;
    const steamResponse = { ...data };
    delete steamResponse.idToken;

    let steamId = null;
    let authenticatedUid = null;

    // --- 1. Valider le jeton Firebase existant (si l'utilisateur est déjà connecté) ---
    if (idToken) {
        try {
            const decoded = await admin.auth().verifyIdToken(idToken);
            authenticatedUid = decoded.uid;
        } catch (tokenError) {
            console.warn("Jeton Firebase invalide ou expiré pour le lien Steam:", tokenError.message);
            authenticatedUid = null;
        }
    }

    // --- 2. Valider la réponse OpenID avec Steam ---
    try {
        const result = await new Promise((resolve, reject) => {
            relyingParty.verifyAssertion(steamResponse, (error, result) => {
                if (error) reject(error);
                else resolve(result);
            });
        });

        if (!result || !result.authenticated) {
            throw new functions.https.HttpsError('unauthenticated', 'Authentification Steam échouée ou non valide.');
        }

        // Extrait l'ID Steam (64-bit Steam ID) de l'URL du profil OpenID
        const claimedIdMatch = result.claimedIdentifier.match(/\d+$/);
        if (!claimedIdMatch) {
            throw new functions.https.HttpsError('invalid-argument', 'ID Steam introuvable dans la réponse.');
        }
        steamId = claimedIdMatch[0];

    } catch (error) {
        console.error("Erreur de validation OpenID Steam:", error);
        throw new functions.https.HttpsError('unauthenticated', `Erreur lors de la vérification Steam: ${error.message}`);
    }

    // --- 3. Gérer l'utilisateur dans Firebase Authentication et Firestore ---
    let firebaseUid;
    let customToken;

    try {
        const usersRef = db.collection('users');

        if (authenticatedUid) {
            // Lier Steam au compte Firebase existant de l'utilisateur connecté.
            firebaseUid = authenticatedUid;

            const userRecord = await admin.auth().getUser(firebaseUid);
            const existingDoc = await usersRef.doc(firebaseUid).get();
            const existingSteamId = existingDoc.exists ? existingDoc.data().steamId : null;

            if (existingSteamId && existingSteamId !== steamId) {
                throw new functions.https.HttpsError('already-exists', 'Ce compte est déjà lié à un autre SteamID.');
            }

            // Récupérer le nom Steam si possible
            let steamProfileName = userRecord.displayName || `SteamUser_${steamId}`;
            try {
                const steamApiKey = functions.config().steam.key;
                if (steamApiKey) {
                    const steamProfileUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${steamApiKey}&steamids=${steamId}`;
                    const profileResponse = await axios.get(steamProfileUrl);
                    if (profileResponse.data && profileResponse.data.response && profileResponse.data.response.players && profileResponse.data.response.players.length > 0) {
                        steamProfileName = profileResponse.data.response.players[0].personaname;
                    }
                }
            } catch (profileError) {
                console.warn("Impossible de récupérer le nom de profil Steam :", profileError.message);
            }

            const updateData = {
                steamId: steamId,
                steamProfile: {
                    id: steamId,
                    displayName: steamProfileName,
                    linkedAt: admin.firestore.FieldValue.serverTimestamp()
                },
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            if (userRecord.email) updateData.email = userRecord.email;
            if (!existingDoc.exists) updateData.createdAt = admin.firestore.FieldValue.serverTimestamp();

            await usersRef.doc(firebaseUid).set(updateData, { merge: true });

        } else {
            const snapshot = await usersRef.where('steamId', '==', steamId).limit(1).get();
            if (!snapshot.empty) {
                firebaseUid = snapshot.docs[0].id;
            } else {
                let steamProfileName = `SteamUser_${steamId}`;
                try {
                    const steamApiKey = functions.config().steam.key;
                    if (steamApiKey) {
                        const steamProfileUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${steamApiKey}&steamids=${steamId}`;
                        const profileResponse = await axios.get(steamProfileUrl);
                        if (profileResponse.data && profileResponse.data.response && profileResponse.data.response.players && profileResponse.data.response.players.length > 0) {
                            steamProfileName = profileResponse.data.response.players[0].personaname;
                        }
                    }
                } catch (profileError) {
                    console.warn("Impossible de récupérer le nom de profil Steam :", profileError.message);
                }

                const newUser = await admin.auth().createUser({
                    displayName: steamProfileName,
                });
                firebaseUid = newUser.uid;

                await usersRef.doc(firebaseUid).set({
                    steamId: steamId,
                    displayName: steamProfileName,
                    steamProfile: {
                        id: steamId,
                        displayName: steamProfileName,
                        linkedAt: admin.firestore.FieldValue.serverTimestamp()
                    },
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        }

        customToken = await admin.auth().createCustomToken(firebaseUid, { steamId: steamId });

    } catch (error) {
        console.error("Erreur de gestion utilisateur Firebase:", error);
        throw new functions.https.HttpsError('internal', `Erreur lors de la création du jeton Firebase: ${error.message}`);
    }

    // --- 4. (Facultatif) Récupérer des infos supplémentaires de l'API Steam et les stocker ---
    try {
        const steamApiKey = functions.config().steam.key; 
        if (steamApiKey) {
            const steamApiUrl = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${steamApiKey}&steamid=${steamId}&format=json&include_appinfo=1&include_played_free_games=1`;
            const gamesResponse = await axios.get(steamApiUrl);
            const ownedGames = gamesResponse.data?.response?.games || [];

            await db.collection('users').doc(firebaseUid).update({
                steamProfile: {
                    id: steamId,
                    gamesOwned: ownedGames.map(game => ({
                        appid: game.appid,
                        name: game.name,
                        playtime_forever: game.playtime_forever
                    })),
                },
                lastSteamSync: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true }); 
        } else {
            console.warn("Clé API Steam non configurée. Impossible de récupérer les données supplémentaires.");
        }
    } catch (apiError) {
        console.error("Erreur lors de la récupération ou du stockage des données Steam supplémentaires:", apiError);
    }
    
    return { token: customToken };
});

// --- Endpoint admin pour traiter les commandes d'approbation depuis un webhook ou service e-mail ---
exports.processAdminCommand = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    const adminSecret = functions.config().admin?.webhook_secret || null;
    const secret = req.body?.secret || req.query?.secret || null;

    if (adminSecret && secret !== adminSecret) {
        return res.status(403).json({ error: 'Unauthorized. Invalid secret.' });
    }

    const email = (req.body?.email || req.query?.email || '').trim().toLowerCase();
    const action = (req.body?.action || req.query?.action || '').trim().toLowerCase();
    const message = req.body?.message || req.body?.statusMsg || '';

    if (!email || !action) {
        return res.status(400).json({ error: 'Missing email or action.' });
    }

    try {
        const submissionsQuery = db.collection('submissions')
            .where('email', '==', email)
            .where('status', '==', 'pending')
            .orderBy('submittedAt', 'desc')
            .limit(1);

        const snap = await submissionsQuery.get();
        if (snap.empty) {
            return res.status(404).json({ error: 'No pending submission found for this email.' });
        }

        const docRef = snap.docs[0].ref;
        const sub = snap.docs[0].data();

        let status = 'pending';
        let statusMsg = message || '';

        if (action === 'approuvé' || action === 'approuve' || action === 'approved') {
            status = 'approved';
            statusMsg = statusMsg || 'approved';
            const linksList = [];
            if (sub.dl1Link) linksList.push({ type: sub.dl1Type || 'mediafire', label: sub.dl1Type || 'MediaFire', url: sub.dl1Link });
            if (sub.dl2Link) linksList.push({ type: sub.dl2Type || 'autre', label: sub.dl2Type || 'Autre', url: sub.dl2Link });

            await db.collection('mods').add({
                title: sub.title,
                cat: sub.cat,
                desc: sub.desc,
                images: sub.images || [],
                links: linksList,
                author: sub.author,
                version: sub.version,
                status: 'approved',
                downloads: 0,
                date: new Date().toISOString().split('T')[0],
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

        } else if (action === 'refusé' || action === 'refuse' || action === 'refused') {
            status = 'refused';
            statusMsg = statusMsg || 'refused';
        } else if (action.startsWith('a revoir') || action.startsWith('à revoir') || action.startsWith('review')) {
            status = 'review';
            statusMsg = statusMsg || action;
        } else {
            return res.status(400).json({ error: 'Unknown action. Use approuvé, refusé or à revoir.' });
        }

        await docRef.update({ status, statusMsg, processedAt: admin.firestore.FieldValue.serverTimestamp() });

        return res.status(200).json({ success: true, status, statusMsg });
    } catch (error) {
        console.error('processAdminCommand:', error);
        return res.status(500).json({ error: error.message || 'Internal server error.' });
    }
});
