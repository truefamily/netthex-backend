# 🚀 Serveur Socket.io - Netthex

Serveur Node.js/Express avec Socket.io pour la communication en temps réel dans Netthex.

## 📋 Installation

### 1. Installer les dépendances serveur

```bash
npm install express socket.io cors dotenv firebase-admin concurrently
```

### 2. Configurer les variables d'environnement

Créer un fichier `.env` à la racine du projet:

```env
PORT=3001
CLIENT_URL=http://localhost:5173

# Firebase Admin SDK
FIREBASE_DATABASE_URL=https://votre-project.firebaseio.com
```

### 3. Authentification Firebase Admin

Le serveur utilise **Firebase Admin SDK** pour accéder à la base de données. Trois options:

#### Option A: Variables d'environnement (Recommandé)
```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
```

#### Option B: Service Account JSON
1. Aller sur [Firebase Console](https://console.firebase.google.com)
2. Projet → Paramètres → Onglet "Comptes de service"
3. Cliquer "Générer une nouvelle clé privée"
4. Enregistrer le fichier JSON à la racine: `serviceAccountKey.json`
5. Le serveur le charge automatiquement

#### Option C: Production (Google Cloud)
Le serveur détecte automatiquement les credentials d'une instance Google Cloud.

## 🎯 Démarrage

### Mode développement (Client + Serveur)

```bash
npm run dev:all
```

Cela démarre:
- 🎨 Client (Vite): `http://localhost:5173`
- 🚀 Serveur Socket.io: `http://localhost:3001`

### Mode serveur uniquement

```bash
npm run server
```

### Mode client uniquement

```bash
npm run dev
```

## 📡 Événements Socket.io

### Client → Serveur

#### `message:send`
Envoyer un message au groupe
```javascript
socket.emit('message:send', {
  groupId: 'group-123',
  content: 'Hello world',
  authorId: 'user-456',
  authorName: 'Jean',
  timestamp: '2026-04-17T10:30:00Z'
})
```

#### `group:join`
Rejoindre un groupe
```javascript
socket.emit('group:join', {
  groupId: 'group-123',
  userId: 'user-456',
  userName: 'Jean'
})
```

#### `group:leave`
Quitter un groupe
```javascript
socket.emit('group:leave', {
  groupId: 'group-123',
  userId: 'user-456'
})
```

#### `typing:send`
Indicateur de saisie
```javascript
socket.emit('typing:send', {
  groupId: 'group-123',
  userId: 'user-456',
  userName: 'Jean',
  isTyping: true
})
```

### Serveur → Client (Événements à écouter)

#### `message:new`
Réception d'un nouveau message
```javascript
socket.on('message:new', (message) => {
  // { id, groupId, content, authorId, authorName, timestamp }
})
```

#### `group:members`
Mise à jour des utilisateurs en ligne
```javascript
socket.on('group:members', (data) => {
  // { groupId, onlineUsers: [{userId, userName}, ...] }
})
```

#### `typing:update`
Mise à jour des indicateurs de saisie
```javascript
socket.on('typing:update', (data) => {
  // { groupId, typingUsers: {userId: userName, ...} }
})
```

#### `group:messages-count`
Nombre total de messages dans le groupe
```javascript
socket.on('group:messages-count', (data) => {
  // { groupId, count: 42 }
})
```

## 🏗️ Architecture

### Flux de message

```
Client 1                      Serveur Socket.io              Firebase
   │                               │                             │
   ├─ message:send ──────────────→ │                             │
   │                               ├─ Valider message            │
   │                               ├─ Compter messages ─────────→ │
   │                               │ (getSnapshot)               │
   │ ← message:new ────────────────┤ ← Nombre total ─────────────┤
   │                               │ ← group:messages-count ──────┤
   │                               │                             │
Client 2                           │ ← message:new ────────────→ │
   │ ← message:new ────────────────┤
   │
```

### Gestion des groupes

- **Utilisateurs en ligne**: Suivi via `groupUsers[groupId][userId]`
- **Indicateurs de saisie**: Nettoyage auto après 3 secondes
- **Persistence**: Messages sauvegardés en Firebase via le client
- **Déconnexion**: Cleanup automatique lors de la perte de connexion

## 🐛 Dépannage

### "Connection refused on localhost:3001"
- Vérifier que le serveur est bien démarré: `npm run server`
- Vérifier que le port 3001 n'est pas utilisé: `lsof -i :3001`
- Vérifier la variable `VITE_SOCKET_URL` dans le client

### "Firebase credentials not found"
- Ajouter `GOOGLE_APPLICATION_CREDENTIALS` en variables d'environnement
- Ou placer `serviceAccountKey.json` à la racine du projet

### Messages non reçus en temps réel
- Vérifier la connexion Socket.io: Ouvrir DevTools → Network → WS
- Vérifier que le client émet `message:send`
- Vérifier les logs du serveur

### "Invalid Firebase URL"
- Vérifier `FIREBASE_DATABASE_URL` dans `.env`
- Format correct: `https://project-id.firebaseio.com`

## 📊 Monitoring

### Logs du serveur

```
✅ Utilisateur connecté: user-123 (Socket: abc123def456)
👥 user-123 a rejoint le groupe group-456
💬 Nouveau message dans group-456 de Jean: Hello everyone...
👋 user-123 a quitté le groupe group-456
❌ Utilisateur déconnecté: user-123 (Socket: abc123def456)
```

### Endpoint de santé

```bash
curl http://localhost:3001/health
# { "status": "OK", "message": "Serveur Socket.io actif" }
```

## 🔐 Sécurité

### À implémenter en production

1. **Authentification** - Vérifier les JWT tokens
2. **Autorisation** - Vérifier que l'utilisateur est membre du groupe
3. **Validation** - Sanitizer les données reçues
4. **Rate limiting** - Limiter les messages par utilisateur
5. **Chiffrement** - Messages en HTTPS/WSS

Exemple de middleware d'authentification:

```javascript
io.use((socket, next) => {
  const token = socket.handshake.auth.token
  
  if (!verifyToken(token)) {
    return next(new Error('Authentication failed'))
  }
  
  next()
})
```

## 📝 Variables de contrôle

Dans `server.js`:

```javascript
const groupUsers = {}      // { groupId: { userId: { socketId, userName } } }
const typingUsers = {}     // { groupId: { userId: { userName, timeout } } }
```

## 🚀 Prochaines étapes

- [ ] Ajouter authentification JWT
- [ ] Implémenter rate limiting
- [ ] Ajouter persistance des typing indicators en Redis
- [ ] Métriques et monitoring (Prometheus)
- [ ] Déploiement sur Heroku/Railway
- [ ] Tests unitaires avec Jest + Socket.io test client

## 📄 Licence

MIT
