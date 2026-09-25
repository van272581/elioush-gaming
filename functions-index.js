const functions = require('firebase-functions');
const admin = require('firebase-admin');
const OpenID = require('openid'); // Pour valider la réponse OpenID Steam
const axios = require('axios'); // Pour interroger l'API Web de Steam
const crypto = require('crypto');

// Initialise l'Admin SDK de Firebase
admin.initializeApp();
const db = admin.firestore(); // Initialise Firestore

const DISCORD_COMMUNITY = Object.freeze({
    guildId: '1384877980215541810',
    playerRoleId: '1389207663279345725',
    managerRoleId: '1389214534358794300',
    clientId: '1546124600214032535'
});
const DISCORD_OAUTH_REDIRECT = 'https://us-central1-elioush-gaming.cloudfunctions.net/discordOAuthCallback';
const SITE_LOGIN_URL = 'https://van272581.github.io/elioush-gaming/login.html';

function isAdminContext(context) {
    return context.auth?.token?.admin === true;
}

function getDiscordConfig() {
    return {
        clientSecret: functions.config().discord?.client_secret || '',
        redirectUri: DISCORD_OAUTH_REDIRECT
    };
}

function normalizeModerationAction(action) {
    const value = String(action || '').trim().toLowerCase();
    if (['approuvé', 'approuve', 'approved'].includes(value)) return 'approved';
    if (['refusé', 'refuse', 'refused'].includes(value)) return 'refused';
    if (value.startsWith('a revoir') || value.startsWith('à revoir') || value.startsWith('review')) return 'review';
    return null;
}

async function moderateSubmission(submissionId, action, statusMsg, adminUid) {
    const status = normalizeModerationAction(action);
    if (!status) throw new Error('Unknown moderation action.');

    const submissionRef = db.collection('submissions').doc(submissionId);
    let submission;

    await db.runTransaction(async transaction => {
        const snapshot = await transaction.get(submissionRef);
        if (!snapshot.exists) throw new Error('Submission not found.');
        submission = snapshot.data();

        if (submission.status !== 'pending') {
            throw new Error('Submission has already been processed.');
        }

        if (status === 'approved') {
            const links = [];
            if (submission.dl1Link) links.push({ type: submission.dl1Type || 'mediafire', label: submission.dl1Type || 'MediaFire', url: submission.dl1Link });
            if (submission.dl2Link) links.push({ type: submission.dl2Type || 'autre', label: submission.dl2Type || 'Autre', url: submission.dl2Link });

            const modRef = db.collection('mods').doc();
            transaction.create(modRef, {
                submissionId,
                authorUid: submission.uid || null,
                title: submission.title,
                cat: submission.cat,
                desc: submission.desc,
                images: submission.images || [],
                links,
                author: submission.author,
                version: submission.version,
                status: 'approved',
                downloads: 0,
                date: new Date().toISOString().split('T')[0],
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        transaction.update(submissionRef, {
            status,
            statusMsg: statusMsg || status,
            processedBy: adminUid || 'webhook',
            processedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const auditRef = db.collection('auditLogs').doc();
        transaction.set(auditRef, {
            action: `submission_${status}`,
            submissionId,
            adminUid: adminUid || 'webhook',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
    });

    if (submission.uid && status === 'approved') {
        const userRecord = await admin.auth().getUser(submission.uid);
        await admin.auth().setCustomUserClaims(submission.uid, {
            ...userRecord.customClaims,
            creator: true
        });
        await db.collection('users').doc(submission.uid).set({
            role: userRecord.customClaims?.admin === true ? 'admin' : 'creator',
            creatorVerified: true,
            creatorVerifiedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }

    return { ...submission, status, statusMsg: statusMsg || status };
}

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

// Génère une URL OAuth Discord liée au compte Firebase actuellement connecté.
exports.createDiscordOAuthUrl = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Connexion au site requise.');
    }

    const { clientSecret, redirectUri } = getDiscordConfig();
    if (!clientSecret) {
        throw new functions.https.HttpsError('failed-precondition', 'Client Secret Discord non configure.');
    }

    const state = crypto.randomBytes(32).toString('hex');
    await db.collection('discordOAuthStates').doc(state).set({
        uid: context.auth.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 10 * 60 * 1000)
    });

    const params = new URLSearchParams({
        client_id: DISCORD_COMMUNITY.clientId,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: 'identify guilds.members.read',
        state,
        prompt: 'consent'
    });
    return { url: `https://discord.com/oauth2/authorize?${params.toString()}` };
});

// Callback OAuth : vérifie l'appartenance au serveur et les rôles Discord.
exports.discordOAuthCallback = functions.https.onRequest(async (req, res) => {
    const code = String(req.query.code || '').trim();
    const state = String(req.query.state || '').trim();
    if (!code || !state) return res.redirect(`${SITE_LOGIN_URL}?discord=invalid`);

    try {
        const stateRef = db.collection('discordOAuthStates').doc(state);
        const stateSnapshot = await stateRef.get();
        if (!stateSnapshot.exists) return res.redirect(`${SITE_LOGIN_URL}?discord=expired`);
        const stateData = stateSnapshot.data();
        await stateRef.delete();
        if (!stateData.expiresAt || stateData.expiresAt.toMillis() < Date.now()) {
            return res.redirect(`${SITE_LOGIN_URL}?discord=expired`);
        }

        const { clientSecret, redirectUri } = getDiscordConfig();
        if (!clientSecret) return res.redirect(`${SITE_LOGIN_URL}?discord=not_configured`);

        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
            client_id: DISCORD_COMMUNITY.clientId,
            client_secret: clientSecret,
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri
        }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        const accessToken = tokenResponse.data.access_token;
        const discordHeaders = { Authorization: `Bearer ${accessToken}` };
        const [profileResponse, memberResponse] = await Promise.all([
            axios.get('https://discord.com/api/users/@me', { headers: discordHeaders }),
            axios.get(`https://discord.com/api/users/@me/guilds/${DISCORD_COMMUNITY.guildId}/member`, { headers: discordHeaders })
        ]);

        const discordUser = profileResponse.data;
        const roleIds = memberResponse.data?.roles || [];
        const communityRole = roleIds.includes(DISCORD_COMMUNITY.managerRoleId)
            ? 'manager'
            : (roleIds.includes(DISCORD_COMMUNITY.playerRoleId) ? 'player' : 'member');
        const userRecord = await admin.auth().getUser(stateData.uid);
        await admin.auth().setCustomUserClaims(stateData.uid, {
            ...userRecord.customClaims,
            discordVerified: true,
            communityRole
        });
        await db.collection('users').doc(stateData.uid).set({
            discordUserId: discordUser.id,
            discordUsername: discordUser.global_name || discordUser.username,
            discordVerified: true,
            communityRole,
            role: communityRole === 'manager' ? 'manager' : (communityRole === 'player' ? 'player' : 'member'),
            discordVerifiedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        return res.redirect(`${SITE_LOGIN_URL}?discord=verified&communityRole=${communityRole}`);
    } catch (error) {
        console.error('discordOAuthCallback:', error.response?.data || error.message);
        return res.redirect(`${SITE_LOGIN_URL}?discord=not_member`);
    }
});

// Modération depuis un tableau de bord authentifié.
exports.moderateSubmission = functions.https.onCall(async (data, context) => {
    if (!isAdminContext(context)) {
        throw new functions.https.HttpsError('permission-denied', 'Accès administrateur requis.');
    }

    const submissionId = String(data?.submissionId || '').trim();
    const action = data?.action;
    const statusMsg = String(data?.statusMsg || '').trim();
    if (!submissionId || !normalizeModerationAction(action)) {
        throw new functions.https.HttpsError('invalid-argument', 'Soumission ou action invalide.');
    }

    try {
        return await moderateSubmission(submissionId, action, statusMsg, context.auth.uid);
    } catch (error) {
        console.error('moderateSubmission:', error);
        throw new functions.https.HttpsError('failed-precondition', error.message);
    }
});

// Vérifie ou retire le statut créateur depuis un compte administrateur.
exports.verifyCreator = functions.https.onCall(async (data, context) => {
    if (!isAdminContext(context)) {
        throw new functions.https.HttpsError('permission-denied', 'Accès administrateur requis.');
    }

    const uid = String(data?.uid || '').trim();
    const verified = data?.verified === true;
    if (!uid) throw new functions.https.HttpsError('invalid-argument', 'UID utilisateur requis.');

    try {
        const userRecord = await admin.auth().getUser(uid);
        const claims = { ...userRecord.customClaims, creator: verified };
        await admin.auth().setCustomUserClaims(uid, claims);
        await db.collection('users').doc(uid).set({
            role: claims.admin === true ? 'admin' : (verified ? 'creator' : 'member'),
            creatorVerified: verified,
            creatorVerifiedAt: verified ? admin.firestore.FieldValue.serverTimestamp() : null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        return { uid, verified };
    } catch (error) {
        console.error('verifyCreator:', error);
        throw new functions.https.HttpsError('internal', 'Impossible de mettre à jour le créateur.');
    }
});

// Comptabilise un téléchargement sans autoriser le navigateur à modifier un mod.
exports.registerDownload = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Connexion requise pour télécharger.');
    }
    const modId = String(data?.modId || '').trim();
    const requestedTitle = String(data?.modTitle || '').trim();
    if (!modId) {
        throw new functions.https.HttpsError('invalid-argument', 'Identifiant du mod requis.');
    }

    const modRef = db.collection('mods').doc(modId);
    const statsRef = db.collection('downloadStats').doc(modId);
    const downloadRef = context.auth
        ? db.collection('users').doc(context.auth.uid).collection('downloads').doc()
        : null;

    try {
        let downloadCount = 0;
        await db.runTransaction(async transaction => {
            const modSnapshot = await transaction.get(modRef);
            if (!modSnapshot.exists || modSnapshot.data().status !== 'approved') {
                if (downloadRef && requestedTitle) {
                    const statsSnapshot = await transaction.get(statsRef);
                    downloadCount = (statsSnapshot.exists ? statsSnapshot.data().downloads || 0 : 0) + 1;
                    transaction.set(statsRef, {
                        modId,
                        title: requestedTitle,
                        downloads: downloadCount,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                    transaction.set(downloadRef, {
                        modId,
                        modTitle: requestedTitle,
                        source: String(data?.source || 'external-link').slice(0, 40),
                        downloadedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    return;
                }
                throw new functions.https.HttpsError('not-found', 'Mod indisponible.');
            }

            transaction.update(modRef, {
                downloads: admin.firestore.FieldValue.increment(1),
                lastDownloadedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            if (downloadRef) {
                transaction.set(downloadRef, {
                    modId,
                    modTitle: requestedTitle || modSnapshot.data().title || '',
                    downloadedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        });

        if (downloadCount > 0) return { downloads: downloadCount };
        const updated = await modRef.get();
        return { downloads: updated.data()?.downloads || 0 };
    } catch (error) {
        if (error instanceof functions.https.HttpsError) throw error;
        console.error('registerDownload:', error);
        throw new functions.https.HttpsError('internal', 'Téléchargement non enregistré.');
    }
});

// Publie une annonce Discord validee dans la categorie Divers.
exports.discordCommunityWebhook = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed.' });
    }

    const webhookSecret = functions.config().discord?.webhook_secret || null;
    const suppliedSecret = req.get('x-discord-webhook-secret');
    if (!webhookSecret || suppliedSecret !== webhookSecret) {
        return res.status(403).json({ error: 'Unauthorized webhook.' });
    }

    const payload = req.body || {};
    const content = String(payload.content || payload.message || '').trim();
    const embeds = Array.isArray(payload.embeds) ? payload.embeds : [];
    const attachments = Array.isArray(payload.attachments) ? payload.attachments : [];
    const imageUrls = [
        ...embeds.map(embed => embed.image?.url || embed.thumbnail?.url),
        ...attachments.map(attachment => attachment.url)
    ].filter(url => /^https?:\/\//i.test(String(url || ''))).slice(0, 4);

    if (!content && imageUrls.length === 0) {
        return res.status(400).json({ error: 'Empty community post.' });
    }

    try {
        const ref = await db.collection('mods').add({
            title: String(payload.title || 'Actualite communautaire Elioush Gaming').slice(0, 120),
            cat: 'divers',
            desc: content.slice(0, 5000),
            images: imageUrls,
            links: [{ type: 'autre', label: 'Discord', url: 'https://discord.gg/tWKmrx3mBQ' }],
            author: String(payload.author || 'Elioush Gaming').slice(0, 80),
            version: 'Communautaire',
            status: 'approved',
            downloads: 0,
            community: {
                eventStatus: String(payload.eventStatus || 'Information communautaire').slice(0, 120),
                statusTone: ['live', 'pending', 'closed', 'info'].includes(payload.statusTone) ? payload.statusTone : 'info',
                playersOnline: Number.isFinite(Number(payload.playersOnline)) ? Math.max(0, Number(payload.playersOnline)) : 0,
                playersTarget: Number.isFinite(Number(payload.playersTarget)) ? Math.max(0, Number(payload.playersTarget)) : 0,
                convoyOrder: Array.isArray(payload.convoyOrder) ? payload.convoyOrder.map(item => String(item).slice(0, 160)).slice(0, 12) : [],
                eventLink: /^https?:\/\//i.test(payload.eventLink || '') ? payload.eventLink : '',
                eventLinkLabel: String(payload.eventLinkLabel || "Voir l'evenement").slice(0, 80),
                profileLink: /^https?:\/\//i.test(payload.profileLink || '') ? payload.profileLink : '',
                profileInstruction: String(payload.profileInstruction || '').slice(0, 1200)
            },
            date: new Date().toISOString().split('T')[0],
            source: 'discord-webhook',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return res.status(201).json({ success: true, id: ref.id });
    } catch (error) {
        console.error('discordCommunityWebhook:', error);
        return res.status(500).json({ error: 'Community post could not be published.' });
    }
});

// --- Endpoint admin pour traiter les commandes d'approbation depuis un webhook ou service e-mail ---
exports.processAdminCommand = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    const adminSecret = functions.config().admin?.webhook_secret || null;
    const suppliedSecret = req.get('x-admin-webhook-secret');

    if (!adminSecret || !suppliedSecret || suppliedSecret !== adminSecret) {
        return res.status(403).json({ error: 'Unauthorized. Invalid secret.' });
    }

    const email = (req.body?.email || '').trim().toLowerCase();
    const action = (req.body?.action || '').trim().toLowerCase();
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

        const result = await moderateSubmission(docRef.id, action, message, 'webhook');
        return res.status(200).json({ success: true, status: result.status, statusMsg: result.statusMsg });
    } catch (error) {
        console.error('processAdminCommand:', error);
        return res.status(500).json({ error: error.message || 'Internal server error.' });
    }
});
