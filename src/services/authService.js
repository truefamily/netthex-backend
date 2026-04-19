import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  updateProfile,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth, database } from './firebaseConfig'
import { ref, set, get, update } from 'firebase/database'

const getPersistence = (rememberMe) =>
  rememberMe ? browserLocalPersistence : browserSessionPersistence

const normalizeEmail = (email) => email.trim().toLowerCase()

const normalizeUsername = (username) => username.trim().replace(/\s+/g, ' ')

const buildUserProfile = ({ uid, email, username }) => ({
  uid,
  email,
  username,
  createdAt: new Date().toISOString(),
  avatar: '',
})

const toUserMessage = (error) => {
  switch (error?.code) {
    case 'auth/invalid-email':
      return 'Adresse e-mail invalide.'
    case 'auth/missing-password':
      return 'Le mot de passe est requis.'
    case 'auth/weak-password':
      return 'Le mot de passe doit contenir au moins 6 caracteres.'
    case 'auth/email-already-in-use':
      return 'Cette adresse e-mail est deja utilisee.'
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Identifiants invalides.'
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Reessaie dans quelques minutes.'
    case 'auth/network-request-failed':
      return 'Connexion reseau impossible. Verifie ta connexion.'
    default:
      return 'Une erreur est survenue. Reessaie.'
  }
}

const createUserProfileRecord = async (user, { email, username }) => {
  const profile = buildUserProfile({
    uid: user.uid,
    email,
    username,
  })

  await set(ref(database, `users/${user.uid}`), profile)
  return profile
}

// Inscription
export const signUp = async (email, password, username, options = {}) => {
  let userCredential = null

  try {
    await setPersistence(auth, getPersistence(options.rememberMe))

    const sanitizedEmail = normalizeEmail(email)
    const sanitizedUsername = normalizeUsername(username)
    userCredential = await createUserWithEmailAndPassword(auth, sanitizedEmail, password)
    const user = userCredential.user

    await updateProfile(user, {
      displayName: sanitizedUsername,
    })

    const profile = await createUserProfileRecord(user, {
      email: sanitizedEmail,
      username: sanitizedUsername,
    })

    return {
      user,
      profile,
    }
  } catch (error) {
    if (userCredential?.user) {
      try {
        await deleteUser(userCredential.user)
      } catch {
        // Ignore rollback failures and surface the original signup error.
      }
    }

    throw new Error(toUserMessage(error))
  }
}

// Connexion
export const logIn = async (email, password, options = {}) => {
  try {
    await setPersistence(auth, getPersistence(options.rememberMe))

    const sanitizedEmail = normalizeEmail(email)
    const userCredential = await signInWithEmailAndPassword(auth, sanitizedEmail, password)
    return userCredential.user
  } catch (error) {
    throw new Error(toUserMessage(error))
  }
}

// Déconnexion
export const logOut = async () => {
  try {
    await signOut(auth)
  } catch {
    throw new Error('Impossible de se deconnecter pour le moment.')
  }
}

export const updateUserAvatar = async (avatar) => {
  const user = auth.currentUser
  const sanitizedAvatar = avatar?.trim()

  if (!user) {
    throw new Error('Utilisateur non connecte.')
  }

  if (!sanitizedAvatar) {
    throw new Error('Ajoute une photo de profil avant de continuer.')
  }

  try {
    await updateProfile(user, {
      photoURL: sanitizedAvatar,
    })

    await update(ref(database, `users/${user.uid}`), {
      avatar: sanitizedAvatar,
      updatedAt: new Date().toISOString(),
    })

    return sanitizedAvatar
  } catch {
    throw new Error("Impossible d'enregistrer la photo de profil.")
  }
}

// Obtenir les données utilisateur
export const getUserData = async (uid) => {
  try {
    const userRef = ref(database, `users/${uid}`)
    const snapshot = await get(userRef)
    return snapshot.val()
  } catch {
    throw new Error('Impossible de recuperer le profil utilisateur.')
  }
}

// Observer l'état d'authentification
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback)
}
