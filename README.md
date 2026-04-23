# Netthex

Application sociale temps reel construite avec React, Vite, Firebase Realtime Database et un backend Express/Socket.IO.

## Stack

- Frontend: React 19, React Router, Tailwind CSS, Vite
- Backend: Express 5, Socket.IO, Firebase Admin
- Donnees: Firebase Authentication, Realtime Database, Storage
- Media: Cloudinary

## Fonctionnalites principales

- Authentification et profil utilisateur
- Groupes, posts, discussions et invitations
- Messagerie privee et conversations de groupe
- Notifications temps reel
- PWA avec service worker et installation locale

## Demarrage local

1. Installer les dependances:

```bash
npm install
```

2. Creer `.env` a partir de `.env.example` puis renseigner les vraies valeurs.

3. Configurer les credentials Firebase Admin via `FIREBASE_SERVICE_ACCOUNT_JSON` ou `GOOGLE_APPLICATION_CREDENTIALS`. `serviceAccountKey.json` reste possible uniquement en local et ne doit jamais etre versionne.

4. Lancer frontend + backend:

```bash
npm run dev:all
```

Le frontend tourne par defaut sur `http://localhost:5173` et l API sur `http://localhost:3001`.

## Scripts utiles

- `npm run dev` : frontend Vite
- `npm run server` : backend Express
- `npm run dev:all` : frontend + backend
- `npm run lint` : verification ESLint
- `npm run test` : tests Node
- `npm run build` : build production frontend
- `npm run preview` : preview du build

## Variables d environnement

Voir [`.env.example`](./.env.example) pour la liste complete.

Variables critiques:

- `VITE_API_KEY`
- `VITE_AUTH_DOMAIN`
- `VITE_PROJECT_ID`
- `VITE_STORAGE_BUCKET`
- `VITE_MESSAGING_SENDER_ID`
- `VITE_APP_ID`
- `FIREBASE_DATABASE_URL`
- `VITE_CLOUDINARY_CLOUD_NAME`
- `VITE_CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `GOOGLE_APPLICATION_CREDENTIALS` ou `FIREBASE_SERVICE_ACCOUNT_JSON`

## Qualite

Le projet inclut maintenant:

- un lint partage frontend/backend
- une base de tests utilitaires via `node --test`
- une CI GitHub Actions sur `lint`, `test` et `build`

## Securite

- Ne jamais versionner `.env`
- Ne jamais versionner `serviceAccountKey.json`
- Utiliser `.env.example` uniquement comme gabarit sans secrets reels
- Les uploads Cloudinary doivent passer par une signature backend, pas par des presets publics
- Si une cle Admin a deja ete exposee, la revoquer et en generer une nouvelle avant tout deploiement

## Docs complementaires

- [`QUICK_START.md`](./QUICK_START.md)
- [`SERVER_README.md`](./SERVER_README.md)
- [`FIREBASE_ADMIN_SETUP.md`](./FIREBASE_ADMIN_SETUP.md)
- [`PWA_SETUP.md`](./PWA_SETUP.md)
- [`SECURITY_FLOW_PSEUDOCODE.md`](./SECURITY_FLOW_PSEUDOCODE.md)
