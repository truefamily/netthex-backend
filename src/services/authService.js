import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth, database } from './firebaseConfig'
import { ref, set, get, update } from 'firebase/database'
import {
  checkUsernameAvailabilityApi,
  resolveLoginIdentifierApi,
} from './apiService'
import {
  isEmailLike,
  normalizeEmail,
  normalizeUsername,
  normalizeUsernameLookup,
} from '../shared/authIdentifiers'

const getPersistence = (rememberMe = true) =>
  rememberMe ? browserLocalPersistence : browserSessionPersistence

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
const PASSWORD_ERROR_MESSAGE =
  'Le mot de passe doit contenir au moins 8 caracteres, une majuscule, une minuscule et un chiffre.'
const AUTH_NOTICE_STORAGE_KEY = 'netthex.auth.notice'
const ACCOUNT_STATUS = {
  ACTIVE: 'active',
  PENDING_VERIFICATION: 'pending_verification',
  BLOCKED: 'blocked',
  DELETED: 'deleted',
}

const getNowIso = () => new Date().toISOString()

const persistAuthNotice = (message) => {
  if (typeof window === 'undefined' || !message) {
    return
  }

  window.sessionStorage.setItem(AUTH_NOTICE_STORAGE_KEY, message)
}

const clearPersistedAuthNotice = () => {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.removeItem(AUTH_NOTICE_STORAGE_KEY)
}

const getActionCodeSettings = () => {
  if (typeof window === 'undefined' || !window.location?.origin) {
    return undefined
  }

  return {
    url: new URL('/auth', window.location.origin).toString(),
    handleCodeInApp: false,
  }
}

const ensureStrongPassword = (password) => {
  if (!PASSWORD_PATTERN.test(password)) {
    throw new Error(PASSWORD_ERROR_MESSAGE)
  }
}

const buildUserProfile = ({ uid, email, username }) => {
  const timestamp = getNowIso()

  return {
    uid,
    email,
    username,
    usernameLowercase: normalizeUsernameLookup(username),
    status: ACCOUNT_STATUS.PENDING_VERIFICATION,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastVerificationEmailSentAt: timestamp,
    avatar: '',
    coverPhoto: '',
    birthDate: '',
    origin: '',
    location: '',
  }
}

const ensureUsernameAvailable = async (username) => {
  const sanitizedUsername = normalizeUsername(username)

  if (!sanitizedUsername) {
    throw new Error('Pseudo requis.')
  }

  const result = await checkUsernameAvailabilityApi({
    username: sanitizedUsername,
  })

  if (!result?.available) {
    throw new Error('Ce pseudo est deja utilise.')
  }
}

const resolveLoginEmail = async (identifier) => {
  const sanitizedIdentifier = String(identifier || '').trim()

  if (!sanitizedIdentifier) {
    throw new Error('Adresse e-mail ou pseudo requis.')
  }

  if (isEmailLike(sanitizedIdentifier)) {
    return normalizeEmail(sanitizedIdentifier)
  }

  try {
    const result = await resolveLoginIdentifierApi({
      identifier: sanitizedIdentifier,
    })

    if (!result?.email) {
      throw new Error('Identifiants invalides.')
    }

    return normalizeEmail(result.email)
  } catch (error) {
    if (error?.status === 404) {
      throw new Error('Identifiants invalides.')
    }

    if (error?.status === 429) {
      throw new Error('Trop de tentatives. Reessaie dans quelques minutes.')
    }

    throw error
  }
}

const getAccountStatus = (profile) => String(profile?.status || '').trim().toLowerCase()

const getDisabledAccountMessage = (status) => {
  if (status === ACCOUNT_STATUS.DELETED) {
    return 'Ce compte a ete supprime.'
  }

  return 'Compte desactive. Contacte un administrateur si besoin.'
}

const assertAccountIsAllowed = async (uid) => {
  if (!uid) {
    return null
  }

  let profile = null

  try {
    const profileRef = ref(database, `users/${uid}`)
    const snapshot = await get(profileRef)
    profile = snapshot.val() || null
  } catch (error) {
    const isCurrentPendingUser =
      auth.currentUser?.uid === uid && auth.currentUser?.emailVerified !== true

    if (isCurrentPendingUser) {
      return null
    }

    throw error
  }

  const status = getAccountStatus(profile)

  if (status === ACCOUNT_STATUS.BLOCKED || status === ACCOUNT_STATUS.DELETED) {
    const message = getDisabledAccountMessage(status)
    persistAuthNotice(message)
    await signOut(auth)
    throw new Error(message)
  }

  return profile
}

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
    case 'auth/user-disabled':
      return 'Ce compte a ete desactive.'
    case 'auth/network-request-failed':
      return 'Connexion reseau impossible. Verifie ta connexion.'
    case 'auth/missing-email':
      return "L'adresse e-mail est requise."
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

const syncVerifiedUserProfile = async (user) => {
  if (!user?.uid || !user.emailVerified) {
    return
  }

  await user.getIdToken(true)

  await update(ref(database, `users/${user.uid}`), {
    status: ACCOUNT_STATUS.ACTIVE,
    updatedAt: getNowIso(),
  })
}

const sendVerificationEmailToUser = async (user) => {
  if (!user) {
    throw new Error('Utilisateur non connecte.')
  }

  await sendEmailVerification(user, getActionCodeSettings())
}

// Inscription
export const signUp = async (email, password, username, options = {}) => {
  let userCredential = null
  let profileCreated = false

  try {
    clearPersistedAuthNotice()
    await setPersistence(auth, getPersistence(options.rememberMe))

    const sanitizedEmail = normalizeEmail(email)
    const sanitizedUsername = normalizeUsername(username)
    await ensureUsernameAvailable(sanitizedUsername)
    ensureStrongPassword(password)
    userCredential = await createUserWithEmailAndPassword(auth, sanitizedEmail, password)
    const user = userCredential.user

    await updateProfile(user, {
      displayName: sanitizedUsername,
    })

    const profile = await createUserProfileRecord(user, {
      email: sanitizedEmail,
      username: sanitizedUsername,
    })
    profileCreated = true

    let verificationEmailSent = true

    try {
      await sendVerificationEmailToUser(user)
    } catch {
      verificationEmailSent = false
      persistAuthNotice(
        "Ton compte a ete cree, mais le premier e-mail de verification n'a pas pu etre envoye. Utilise le bouton de renvoi sur l'ecran suivant.",
      )
    }

    return {
      user,
      profile,
      requiresEmailVerification: true,
      verificationEmailSent,
    }
  } catch (error) {
    if (userCredential?.user && !profileCreated) {
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
    clearPersistedAuthNotice()
    await setPersistence(auth, getPersistence(options.rememberMe))

    const sanitizedEmail = await resolveLoginEmail(email)
    const userCredential = await signInWithEmailAndPassword(auth, sanitizedEmail, password)
    await reload(userCredential.user)

    const refreshedUser = auth.currentUser || userCredential.user

    if (refreshedUser.emailVerified) {
      await syncVerifiedUserProfile(refreshedUser)
    }

    await assertAccountIsAllowed(refreshedUser.uid)

    return {
      user: refreshedUser,
      requiresEmailVerification: !refreshedUser.emailVerified,
    }
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

export const updateUserProfileDetails = async ({
  username,
  avatar,
  coverPhoto,
  birthDate,
  origin,
  location,
}) => {
  const user = auth.currentUser
  const normalizedUsername = normalizeUsername(username || user?.displayName || '')
  const normalizedOrigin = origin?.trim() || ''
  const normalizedLocation = location?.trim() || ''

  if (!user) {
    throw new Error('Utilisateur non connecte.')
  }

  if (normalizedUsername.length < 2) {
    throw new Error('Le nom doit contenir au moins 2 caracteres.')
  }

  try {
    const currentUsername = normalizeUsername(user.displayName || '')

    if (normalizedUsername !== currentUsername) {
      await ensureUsernameAvailable(normalizedUsername)
    }

    await updateProfile(user, {
      displayName: normalizedUsername,
      photoURL: avatar?.trim() || '',
    })

    const updates = {
      username: normalizedUsername,
      usernameLowercase: normalizeUsernameLookup(normalizedUsername),
      avatar: avatar?.trim() || '',
      coverPhoto: coverPhoto?.trim() || '',
      birthDate: birthDate || '',
      origin: normalizedOrigin,
      location: normalizedLocation,
      updatedAt: new Date().toISOString(),
    }

    await update(ref(database, `users/${user.uid}`), updates)

    return {
      uid: user.uid,
      email: user.email || '',
      ...updates,
    }
  } catch (error) {
    throw new Error(error?.message || 'Impossible de mettre a jour le profil.')
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

export const refreshCurrentUser = async () => {
  const user = auth.currentUser

  if (!user) {
    return null
  }

  await reload(user)

  const refreshedUser = auth.currentUser || user

  if (refreshedUser.emailVerified) {
    await syncVerifiedUserProfile(refreshedUser)
  }

  await assertAccountIsAllowed(refreshedUser.uid)

  return refreshedUser
}

export const resendVerificationEmail = async () => {
  const refreshedUser = await refreshCurrentUser()

  if (!refreshedUser) {
    throw new Error('Utilisateur non connecte.')
  }

  if (refreshedUser.emailVerified) {
    return {
      alreadyVerified: true,
      user: refreshedUser,
    }
  }

  await sendVerificationEmailToUser(refreshedUser)
  await update(ref(database, `users/${refreshedUser.uid}`), {
    lastVerificationEmailSentAt: getNowIso(),
    updatedAt: getNowIso(),
  })

  return {
    alreadyVerified: false,
    user: refreshedUser,
  }
}

export const requestPasswordReset = async (email) => {
  try {
    const sanitizedEmail = normalizeEmail(email)

    if (!sanitizedEmail) {
      throw new Error("L'adresse e-mail est requise.")
    }

    await sendPasswordResetEmail(auth, sanitizedEmail, getActionCodeSettings())
  } catch (error) {
    if (error?.code === 'auth/user-not-found') {
      return
    }

    throw new Error(error instanceof Error && !error.code ? error.message : toUserMessage(error))
  }
}

export const consumeAuthNotice = () => {
  if (typeof window === 'undefined') {
    return ''
  }

  const message = window.sessionStorage.getItem(AUTH_NOTICE_STORAGE_KEY) || ''
  clearPersistedAuthNotice()
  return message
}

// Observer l'état d'authentification
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback)
}
