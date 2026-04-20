# Configuration Firebase Admin - Guide de Setup

## Pourquoi Firebase Admin est nécessaire?

Le serveur Node.js utilise Firebase Admin SDK pour:
- Vérifier les tokens d'authentification
- Accéder à la base de données Realtime Database en tant qu'admin
- Gérer les données directement sans les restrictions de sécurité client

## Installation des credentials

### Étape 1: Créer une clé de service Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Sélectionnez votre projet
3. Allez dans **Project Settings** (engrenage en haut à gauche)
4. Cliquez sur l'onglet **Service Accounts**
5. Cliquez sur **Generate New Private Key**
6. Téléchargez le fichier JSON

### Étape 2: Configurer la variable d'environnement

**Option A: Avec le fichier JSON (Recommandé pour le développement)**

1. Placez le fichier JSON dans votre projet (ex: `serviceAccountKey.json`)
2. Ajoutez à votre `.env`:
```
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
```

**IMPORTANT**: Ajoutez `serviceAccountKey.json` à votre `.gitignore` pour ne pas exposer vos credentials!

```bash
echo "serviceAccountKey.json" >> .gitignore
```

### Étape 3: Vérifier la configuration

Testez que tout fonctionne en démarrant le serveur:
```bash
npm run dev
# ou
node server.js
```

Vous devriez voir:
```
✓ Firebase Admin initialisé avec service account
```

## Sécurité

⚠️ **IMPORTANT**:
- N'exposez JAMAIS votre `serviceAccountKey.json` publiquement
- Ne commitez JAMAIS le fichier JSON dans git
- Pour la production, utilisez des secrets sécurisés (GitHub Secrets, Vercel Env, etc.)

## Dépannage

### Erreur: "GOOGLE_APPLICATION_CREDENTIALS not set"
→ Assurez-vous que la variable d'env est correctement configurée et que le chemin du fichier est bon

### Erreur: "Cannot find module 'firebase-admin'"
→ Installez les dépendances:
```bash
npm install
```

### Erreur: "Permission denied"
→ Vérifiez que le fichier JSON existe et que vous avez les droits de lecture

## Variables d'environnement requises

```env
# Firebase Admin
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json

# Base de données
FIREBASE_DATABASE_URL=https://votre_app-default-rtdb.firebaseio.com

# Client URL (doit correspondre à votre client)
CLIENT_URL=http://localhost:5174

# Port du serveur
PORT=3001
```
