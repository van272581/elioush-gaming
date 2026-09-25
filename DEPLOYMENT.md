# Deploiement Elioush Gaming

## 1. Authentifier Firebase

Depuis ce dossier :

```powershell
firebase.cmd login
```

Puis verifier le projet :

```powershell
firebase.cmd use elioush-gaming
```

## 2. Deployer les regles et les fonctions

```powershell
firebase.cmd deploy --only firestore:rules,firestore:indexes --project elioush-gaming
firebase.cmd deploy --only functions --project elioush-gaming
```

## MCT de moderation

Le webhook `processAdminCommand` accepte uniquement une requete `POST` avec le header `x-admin-webhook-secret`.
Le corps JSON doit contenir :

```json
{
	"email": "createur@example.com",
	"action": "approuve",
	"message": "Publication validee"
}
```

Mots-cles reconnus : `approuve`, `approuvé`, `approved`, `refuse`, `refusé`, `refused`, `a revoir`, `à revoir` et `review`.
Une approbation cree le document `mods`, passe la soumission a `approved`, ajoute un `auditLogs` et attribue le role `creator` au compte lie.
Le statut est ensuite visible en temps reel dans l'espace du createur.

Le webhook ne modifie pas `script.js`. Il met a jour Firestore, ce qui permet au site deja deploye de refleter la publication sans recompiler ni ecraser le code frontend.

## 3. Configurer les secrets serveur

La cle Steam et les secrets des webhooks ne doivent jamais etre places dans le frontend.

```powershell
firebase.cmd functions:config:set steam.key="VOTRE_CLE_STEAM" admin.webhook_secret="SECRET_LONG_ET_ALEATOIRE" discord.webhook_secret="AUTRE_SECRET_LONG_ET_ALEATOIRE"
```

Ajouter aussi le secret OAuth Discord côté serveur :

```powershell
firebase.cmd functions:config:set discord.client_secret="CLIENT_SECRET_DISCORD"
```

URL de callback à déclarer dans Discord Developer Portal :

```text
https://us-central1-elioush-gaming.cloudfunctions.net/discordOAuthCallback
```

Redeployer ensuite les fonctions.

## 4b. Webhook Discord

Configurer le webhook Discord pour appeler l'URL de la fonction `discordCommunityWebhook` en POST avec le header `x-discord-webhook-secret`.
Le corps peut contenir `title`, `content`, `author`, `embeds`, `attachments` et les champs communautaires suivants : `eventStatus`, `statusTone`, `playersOnline`, `playersTarget`, `convoyOrder`, `eventLink`, `eventLinkLabel`, `profileLink` et `profileInstruction`.
Les messages sont publies dans la categorie `divers` avec un maximum de quatre images HTTPS. `profileLink` doit etre l'URL d'hebergement du fichier `.rar` du profil convoi ; le bouton n'apparait que lorsqu'une URL HTTPS valide est fournie.

## 4. Creer le premier administrateur

## 4a. OAuth Discord

Configuration publique actuelle :

```text
DISCORD_GUILD_ID=1384877980215541810
DISCORD_PLAYER_ROLE_ID=1389207663279345725
DISCORD_MANAGER_ROLE_ID=1389214534358794300
DISCORD_CLIENT_ID=1546124600214032535
```

Le Client Secret Discord reste prive. Il devra etre stocke dans la configuration serveur Firebase, jamais dans `firebase-config.js` ou un fichier frontend. La redirection OAuth devra utiliser l'URL HTTPS de la Cloud Function de callback, puis cette URL devra etre declaree dans Discord Developer Portal.

Le premier compte doit etre cree avec l'inscription normale. Ensuite, attribuer la custom claim `admin: true` depuis un environnement serveur de confiance utilisant Firebase Admin SDK. Ne jamais faire cette operation depuis le navigateur.

Apres attribution, l'administrateur doit se deconnecter puis se reconnecter pour actualiser son jeton Firebase.

## 5. Deploiement Netlify

- Connecter le depot GitHub a Netlify.
- Publier le dossier racine comme site statique.
- Ne pas exposer les fichiers de credentials Firebase Admin.
- Utiliser HTTPS et ajouter le domaine Netlify autorise dans Firebase Authentication.
- Mettre a jour l'URL Steam dans `js/auth.js` et `functions-index.js` si le domaine final change.
