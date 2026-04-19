import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

console.log(`
╔════════════════════════════════════════════════════════════╗
║         🔍 DIAGNOSTIC CONFIGURATION NETTHEX SERVER         ║
╚════════════════════════════════════════════════════════════╝
`)

// Charger les variables d'environnement
dotenv.config()

// 1. Vérifier .env
console.log('\n📝 Fichiers de configuration:')
const envExists = fs.existsSync('.env')
const envExampleExists = fs.existsSync('.env.example')

console.log(`  ✅ .env.example: ${envExampleExists ? 'TROUVÉ' : '❌ MANQUANT'}`)
console.log(`  ${envExists ? '✅' : '⚠️'} .env: ${envExists ? 'TROUVÉ' : 'MANQUANT (créer depuis .env.example)'}`)

// 2. Vérifier Firebase credentials
console.log('\n🔐 Credentials Firebase:')
const serviceAccountExists = fs.existsSync('serviceAccountKey.json')
const hasEnvVar = process.env.GOOGLE_APPLICATION_CREDENTIALS

console.log(`  ${serviceAccountExists ? '✅' : '⚠️'} serviceAccountKey.json: ${serviceAccountExists ? 'TROUVÉ' : 'MANQUANT'}`)
console.log(`  ${hasEnvVar ? '✅' : '⚠️'} GOOGLE_APPLICATION_CREDENTIALS: ${hasEnvVar ? 'DÉFINI' : 'NON DÉFINI'}`)

if (!serviceAccountExists && !hasEnvVar) {
  console.log('  ❌ Firebase Admin SDK ne pourra pas s\'authentifier')
  console.log('     → Voir https://console.firebase.google.com (Comptes de service)')
}

// 3. Vérifier variables d'environnement
console.log('\n⚙️ Variables d\'environnement chargées:')
const requiredEnvVars = ['FIREBASE_DATABASE_URL', 'PORT', 'CLIENT_URL']

requiredEnvVars.forEach(varName => {
  const value = process.env[varName]
  console.log(`  ${value ? '✅' : '❌'} ${varName}: ${value || 'NON DÉFINI'}`)
})

// 4. Vérifier les dépendances
console.log('\n📦 Dépendances npm:')
const packageJsonPath = 'package.json'
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

const requiredDeps = [
  'express',
  'socket.io',
  'cors',
  'dotenv',
  'firebase-admin',
  'concurrently'
]

const allDepsInstalled = requiredDeps.every(dep => {
  const installed = packageJson.dependencies[dep] || packageJson.devDependencies?.[dep]
  console.log(`  ${installed ? '✅' : '❌'} ${dep}: ${installed || 'NON INSTALLÉ'}`)
  return !!installed
})

// 5. Vérifier les fichiers serveur
console.log('\n📄 Fichiers serveur:')
const files = ['server.js', 'QUICK_START.md', 'SERVER_README.md', 'start-dev.bat', 'start-dev.sh']

files.forEach(file => {
  const exists = fs.existsSync(file)
  console.log(`  ${exists ? '✅' : '❌'} ${file}`)
})

// 6. Vérifier les ports
console.log('\n🔌 Ports:')
console.log(`  CLIENT_URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`)
console.log(`  SERVER PORT: ${process.env.PORT || 3001}`)

// 7. Résumé
console.log('\n' + '='.repeat(60))

if (envExists && (serviceAccountExists || hasEnvVar) && allDepsInstalled) {
  console.log('✅ CONFIGURATION COMPLÈTE - Prêt pour: npm run dev:all')
} else {
  console.log('⚠️ CONFIGURATION INCOMPLÈTE - Étapes nécessaires:')
  if (!envExists) {
    console.log('  1. Créer .env depuis .env.example')
  }
  if (!serviceAccountExists && !hasEnvVar) {
    console.log('  2. Ajouter serviceAccountKey.json de Firebase')
  }
  if (!allDepsInstalled) {
    console.log('  3. Exécuter: npm install')
  }
}

console.log('='.repeat(60) + '\n')
