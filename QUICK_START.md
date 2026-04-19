# ⚡ Démarrage Rapide - Socket.io Server

## 1️⃣ Installation (Une seule fois)

```bash
npm install express socket.io cors dotenv firebase-admin concurrently
```

## 2️⃣ Configuration Firebase

### Créer le fichier `.env`

Copier `.env.example` → `.env` et remplir:

```bash
cp .env.example .env
```

Ensuite, ouvrir `.env` et configurer:

```env
PORT=3001
CLIENT_URL=http://localhost:5173
FIREBASE_DATABASE_URL=https://YOUR-PROJECT.firebaseio.com
```

### Ajouter les credentials Firebase

**Option A (Recommandée - Locale):**

1. Aller sur [Firebase Console](https://console.firebase.google.com)
2. Projet → Paramètres ⚙️ → Onglet "Comptes de service"
3. Cliquer "Générer une nouvelle clé privée"
4. Enregistrer le fichier JSON à la racine: **`serviceAccountKey.json`**

**Option B (Variables d'environnement):**

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/serviceAccountKey.json
```

## 3️⃣ Démarrage

### Mode complet (Client + Serveur) ⭐ RECOMMANDÉ

```bash
npm run dev:all
```

Ou sur Windows:
```bash
start-dev.bat
```

Cela ouvre automatiquement:
- 🎨 Client: http://localhost:5173
- 🚀 Serveur: http://localhost:3001

### Serveur seul

```bash
npm run server
```

### Client seul

```bash
npm run dev
```

## ✅ Vérifier que ça marche

1. Ouvrir le client: http://localhost:5173
2. Ouvrir les DevTools (F12)
3. Onglet Console
4. Vous devriez voir: `✅ Connecté au serveur socket.io`
5. Aller à un groupe et envoyer un message
6. Le message doit apparaître immédiatement ✨

## 🐛 Dépannage

| Problème | Solution |
|----------|----------|
| Port 3001 occupé | `lsof -i :3001` puis tuer le process |
| Credentials Firebase manquants | Placer `serviceAccountKey.json` à la racine |
| Messages non reçus | Vérifier DevTools → Network → WS (Socket.io) |
| Erreur de CORS | Vérifier `CLIENT_URL` dans `.env` |

## 📊 Logs du serveur

Quand tout marche, vous devriez voir:

```
╔════════════════════════════════════════════════════════════╗
║          🚀 SERVEUR SOCKET.IO DÉMARRÉ AVEC SUCCÈS         ║
╠════════════════════════════════════════════════════════════╣
║  📡 Adresse: http://localhost:3001                         ║
║  🔗 CORS: http://localhost:5173                           ║
║  🗄️  Firebase: https://your-project.firebaseio.com  ║
╚════════════════════════════════════════════════════════════╝
```

## 📱 Test rapide

Envoyer un message depuis le chat → Le serveur devrait logger:

```
💬 Nouveau message dans group-123 de Jean: Hello everyone...
```

Et tous les clients doivent le recevoir en temps réel! 🎉

## 🎯 Commandes utiles

```bash
# Vérifier que le serveur répond
curl http://localhost:3001/health

# Voir les ports utilisés
lsof -i :3001    # Port serveur
lsof -i :5173    # Port Vite

# Redémarrer
npm run dev:all   # (Arrêter avec CTRL+C puis relancer)
```

## 📚 Fichiers importants

```
netthex_app/
├── server.js                    ← Serveur principal
├── .env                         ← Configuration (crée depuis .env.example)
├── serviceAccountKey.json       ← Credentials Firebase (à ajouter)
├── start-dev.bat                ← Démarrage Windows
├── start-dev.sh                 ← Démarrage macOS/Linux
└── SERVER_README.md             ← Documentation complète
```

## ✨ Prochaines étapes

Une fois que le serveur fonctionne:

1. ✅ Tester l'envoi de messages en temps réel
2. ✅ Vérifier les indicateurs de saisie
3. ✅ Ajouter authentification JWT (sécurité)
4. ✅ Configurer le rate limiting
5. ✅ Déployer sur un serveur (Railway, Heroku, etc.)

---

**Besoin d'aide?** Voir `SERVER_README.md` pour la documentation complète.
