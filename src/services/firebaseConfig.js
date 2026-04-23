import { initializeApp } from 'firebase/app'
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth'
import { getDatabase } from 'firebase/database'
import { getStorage } from 'firebase/storage'
import { getRequiredClientEnv } from '../config/clientEnv'

// Configuration Firebase
const firebaseConfig = {
  apiKey: getRequiredClientEnv('VITE_API_KEY'),
  authDomain: getRequiredClientEnv('VITE_AUTH_DOMAIN'),
  databaseURL: `https://${getRequiredClientEnv('VITE_PROJECT_ID')}-default-rtdb.firebaseio.com`,
  projectId: getRequiredClientEnv('VITE_PROJECT_ID'),
  storageBucket: getRequiredClientEnv('VITE_STORAGE_BUCKET'),
  messagingSenderId: getRequiredClientEnv('VITE_MESSAGING_SENDER_ID'),
  appId: getRequiredClientEnv('VITE_APP_ID'),
}

// Initialiser Firebase
const app = initializeApp(firebaseConfig)

// Services Firebase
export const auth = getAuth(app)
export const database = getDatabase(app)
export const storage = getStorage(app)
export const initializeAuthPersistence = () => setPersistence(auth, browserLocalPersistence)

export default app
