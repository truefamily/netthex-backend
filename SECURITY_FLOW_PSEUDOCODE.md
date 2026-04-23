# Flow securise Netthex (pseudo-code)

## 1. Inscription

```text
START signUp(email, password, username)
  normaliser email + username
  verifier mot de passe fort
  creer utilisateur Firebase Auth
  mettre a jour displayName
  envoyer e-mail de verification
  creer /users/{uid} dans Realtime Database avec:
    status = pending_verification
    email
    username
    createdAt
    updatedAt
    lastVerificationEmailSentAt
  rediriger vers /auth/verify-email
END
```

## 2. Connexion

```text
START logIn(email, password)
  authentifier avec Firebase Auth
  reload utilisateur Firebase

  IF emailVerified = false THEN
    retourner requiresEmailVerification = true
    rediriger vers /auth/verify-email
    STOP
  ENDIF

  synchroniser /users/{uid}.status = active
  verifier que le compte n est pas blocked ou deleted
  charger profil applicatif
  ouvrir application
END
```

## 3. Verification d acces API / Socket

```text
FOR every API request OR socket connection
  lire Bearer token Firebase
  verifier token cote backend

  IF token invalide ou expire THEN
    refuser avec 401
    STOP
  ENDIF

  IF email_verified != true THEN
    refuser avec 403
    STOP
  ENDIF

  lire /users/{uid}/status

  IF status in [blocked, deleted] THEN
    refuser avec 403
    STOP
  ENDIF

  autoriser la suite du traitement
END
```

## 4. Realtime Database Rules

```text
DEFAULT:
  .read = false
  .write = false

FOR protected collections
  autoriser seulement si:
    auth != null
    auth.token.email_verified == true
    /users/{auth.uid}/status == active

FOR /users/{uid}
  autoriser creation initiale avec status = pending_verification
  autoriser activation seulement apres email verified
  refuser champs non declares
END
```

## 5. Upload image signe Cloudinary

```text
START uploadToCloudinary(file, uploadType)
  verifier type MIME + taille max cote front
  appeler POST /api/uploads/sign avec uploadType

  BACKEND:
    verifier token + statut compte
    resoudre policy uploadType
    construire folder = netthex/{type}/{uid}
    generer public_id
    signer params Cloudinary avec CLOUDINARY_API_SECRET
    retourner apiKey + timestamp + folder + publicId + signature

  FRONT:
    envoyer fichier directement a Cloudinary avec params signes
    recuperer secure_url
    enregistrer secure_url seulement dans la base
END
```

## 6. Messagerie privee

```text
START sendDirectMessage(senderId, recipientId, content)
  verifier utilisateur authentifie
  verifier senderId == uid du token
  verifier senderId != recipientId
  lister groupes communs entre sender et recipient

  IF aucun groupe commun THEN
    refuser avec 403
    STOP
  ENDIF

  creer ou mettre a jour directConversations/{conversationId}
  enregistrer directMessages/{conversationId}/{messageId}
  memoriser sharedGroupIds dans la conversation
END
```

## 7. Typing et messages groupe

```text
FOR every group message OR typing event
  verifier appartenance au groupe cote backend
  ignorer authorName envoye par le client
  utiliser seulement l identite connue du serveur
  enregistrer timestamp genere par le serveur
END
```

## 8. Resume de defense

```text
Client:
  validation UX
  redirections de verification
  aucun secret Cloudinary

Rules Firebase:
  dernier filet de securite sur la base

Backend:
  verification forte du token
  blocage comptes non verifies / desactives
  signature d upload
  controles d autorisation metier
```
