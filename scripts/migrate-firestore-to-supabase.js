const admin = require('firebase-admin');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Variable manquante: ${name}`);
}

if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON est requis pour lire Firestore.');
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const firestore = admin.firestore();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function timestamp(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  return new Date(value).toISOString();
}

function clean(value) {
  return value === undefined ? null : value;
}

function stableUuid(value) {
  const hex = crypto.createHash('md5').update(String(value)).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20)}`;
}

async function readCollection(name) {
  const snapshot = await firestore.collection(name).get();
  return snapshot.docs.map(document => ({ id: document.id, ...document.data() }));
}

async function upsert(table, rows, onConflict) {
  if (!rows.length) return;
  const { error } = await supabase.from(table).upsert(rows, { onConflict });
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`${table}: ${rows.length} ligne(s) migree(s)`);
}

async function findOrCreateAuthUser(email, displayName) {
  if (!email) return null;
  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw new Error(`auth.listUsers: ${listError.message}`);
  const existing = listed.users.find(user => user.email?.toLowerCase() === email.toLowerCase());
  if (existing) return existing.id;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: displayName || email.split('@')[0] }
  });
  if (error) throw new Error(`auth.createUser: ${error.message}`);
  return data.user.id;
}

async function migrate() {
  const firebaseUsers = await readCollection('users');
  const firebaseMods = await readCollection('mods');
  const firebaseSubmissions = await readCollection('submissions');
  const firebaseComments = await readCollection('comments');
  const knownModIds = new Set(firebaseMods.map(mod => String(mod.id)));

  // Les profils doivent etre crees dans Supabase Auth avant leur insertion.
  // Le script cree les comptes avec email confirme, sans mot de passe Firebase.
  // Chaque utilisateur devra definir un nouveau mot de passe via reset password.
  const profileIds = new Map();
  for (const user of firebaseUsers) {
    const email = user.email || null;
    if (email) profileIds.set(user.uid || user.id, await findOrCreateAuthUser(email, user.name || user.displayName));
  }

  const profiles = firebaseUsers.map(user => ({
    id: profileIds.get(user.uid || user.id) || stableUuid(user.uid || user.id),
    email: clean(user.email),
    display_name: clean(user.name || user.displayName),
    photo_url: clean(user.photoURL),
    community_role: ['member', 'player', 'manager'].includes(user.communityRole)
      ? user.communityRole
      : 'member',
    discord_user_id: clean(user.discordUserId),
    discord_username: clean(user.discordUsername),
    discord_verified: user.discordVerified === true,
    steam_id: clean(user.steamId),
    created_at: timestamp(user.joined || user.createdAt),
    updated_at: timestamp(user.updatedAt)
  })).filter(profile => profile.id && profile.email);

  const mods = firebaseMods.map(mod => ({
    id: stableUuid(`mod:${mod.id}`),
    legacy_id: mod.id,
    title: mod.title || 'Mod sans titre',
    category: mod.cat || 'divers',
    description: mod.desc || '',
    images: Array.isArray(mod.images) ? mod.images : [],
    download_links: Array.isArray(mod.links) ? mod.links : [],
    version: clean(mod.version),
    author_id: mod.authorUid ? (profileIds.get(mod.authorUid) || null) : null,
    status: ['pending', 'review', 'approved', 'refused'].includes(mod.status) ? mod.status : 'approved',
    downloads: Number.isInteger(mod.downloads) ? mod.downloads : 0,
    source: clean(mod.source),
    published_at: timestamp(mod.createdAt),
    created_at: timestamp(mod.createdAt),
    updated_at: timestamp(mod.updatedAt || mod.createdAt)
  }));

  await upsert('profiles', profiles, 'id');
  await upsert('mods', mods, 'id');

  const submissions = firebaseSubmissions.map(submission => ({
    id: stableUuid(`submission:${submission.id}`),
    author_id: profileIds.get(submission.uid) || null,
    title: submission.title || 'Soumission sans titre',
    category: submission.cat || 'divers',
    description: submission.desc || '',
    images: Array.isArray(submission.images) ? submission.images : [],
    download_links: [
      submission.dl1Link ? { type: submission.dl1Type || 'autre', url: submission.dl1Link } : null,
      submission.dl2Link ? { type: submission.dl2Type || 'autre', url: submission.dl2Link } : null
    ].filter(Boolean),
    version: clean(submission.version),
    status: ['pending', 'review', 'approved', 'refused'].includes(submission.status) ? submission.status : 'pending',
    status_message: clean(submission.statusMsg),
    processed_at: timestamp(submission.processedAt),
    created_at: timestamp(submission.submittedAt),
    updated_at: timestamp(submission.processedAt || submission.submittedAt)
  })).filter(submission => submission.author_id);
  await upsert('submissions', submissions, 'id');

  const comments = firebaseComments.map(comment => ({
    id: stableUuid(`comment:${comment.id}`),
    mod_id: stableUuid(`mod:${comment.modId}`),
    author_id: profileIds.get(comment.uid) || null,
    author_name: comment.author || 'Membre',
    body: comment.body || '',
    created_at: timestamp(comment.createdAt) || new Date().toISOString()
  })).filter((comment, index) => comment.body && knownModIds.has(String(firebaseComments[index].modId)));
  await upsert('comments', comments, 'id');

  const downloads = [];
  for (const user of firebaseUsers) {
    const userId = profileIds.get(user.uid || user.id);
    if (!userId) continue;
    const snapshot = await firestore.collection('users').doc(user.uid || user.id).collection('downloads').get();
    snapshot.docs.forEach(download => {
      const data = download.data();
      downloads.push({
        id: stableUuid(`download:${user.uid || user.id}:${download.id}`),
        user_id: userId,
        mod_id: data.modId ? stableUuid(`mod:${data.modId}`) : null,
        mod_title: data.modTitle || data.modId || 'Mod',
        source: data.source || 'firebase',
        downloaded_at: timestamp(data.downloadedAt) || new Date().toISOString()
      });
    });
  }
  await upsert('downloads', downloads, 'id');
  console.log('Migration terminee : verifier les totaux avant la bascule.');
}

migrate().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
