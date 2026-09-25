# Migration Supabase Elioush Gaming

## Phase d'essai

Firebase reste le backend actif pendant la migration. Le fichier `schema.sql` prepare uniquement la structure Supabase et ses politiques RLS.

## Installation

1. Creer un projet Supabase.
2. Ouvrir **SQL Editor**.
3. Executer `supabase/schema.sql`.
4. Activer les fournisseurs Auth souhaites : Email, Google et Discord OAuth si disponible.
5. Ajouter le domaine GitHub Pages ou Netlify dans **Authentication > URL Configuration**.

## Variables publiques frontend

Elles pourront etre placees dans la configuration frontend apres creation du projet :

```text
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre-cle-anon
```

La cle `anon` peut apparaitre dans le frontend uniquement avec RLS activee.

## Secrets serveur

Ne jamais publier :

```text
SUPABASE_SERVICE_ROLE_KEY
DISCORD_CLIENT_SECRET
DISCORD_BOT_TOKEN
```

Ces secrets devront etre places dans Netlify Functions ou Supabase Edge Functions.

## Migration des donnees Firebase

La migration devra etre executee cote serveur avec :

- un compte de service Firebase ou un export Firestore ;
- la cle `service_role` Supabase ;
- un script de transformation controle ;
- une verification des totaux avant bascule.

Les mots de passe Firebase ne sont pas exportables en clair. Les utilisateurs devront utiliser la reinitialisation de mot de passe Supabase, ou se reconnecter via Google/Discord.

Commande de migration, a executer uniquement depuis un environnement de confiance :

```powershell
$env:SUPABASE_URL="https://votre-projet.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="CLE_PRIVEE_SUPABASE"
$env:FIREBASE_SERVICE_ACCOUNT_JSON=(Get-Content .\firebase-service-account.json -Raw)
npm run migrate:supabase
```

Le fichier `firebase-service-account.json` ne doit jamais etre committe. Le script est relancable : ses identifiants deterministes evitent les doublons. Il cree les comptes Supabase Auth par email sans mot de passe, puis les utilisateurs doivent utiliser la reinitialisation de mot de passe.

## Bascule

1. Executer le schema.
2. Migrer les donnees.
3. Comparer les comptes, mods, soumissions, commentaires et historiques.
4. Tester les trois roles : `member`, `player`, `manager`.
5. Adapter le frontend avec `@supabase/supabase-js`.
6. Tester les fonctions serveur.
7. Publier sur GitHub/Netlify.
8. Conserver Firebase en sauvegarde pendant la periode d'essai.
9. Supprimer Firebase uniquement apres validation.
