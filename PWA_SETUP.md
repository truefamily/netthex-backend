# Configuration PWA (Progressive Web App)

Netthex est maintenant configuré comme une PWA, ce qui permet aux utilisateurs d'installer l'app comme une application mobile native.

## ✅ Ce qui est activé

- ✅ Service Worker pour le cache et le fonctionnement offline
- ✅ Manifest.json avec tous les métadonnées
- ✅ Support iOS avec métadonnées Apple
- ✅ Support Android avec icônes adaptées
- ✅ Icônes maskable pour les appareils modernes
- ✅ Shortcuts pour accès rapide aux pages principales

## 📱 Tester l'installation

### Sur Chrome/Edge (Ordinateur)
1. Ouvre l'app: http://localhost:5174
2. L'app devrait être installable (demande d'installation)
3. Clique sur l'icône d'installation ou dans le menu (⋮ → "Installer Netthex")

### Sur Android
1. Ouvre l'app dans Chrome Mobile
2. Appuie sur le menu ⋮ en haut à droite
3. Clique sur "Installer l'app"
4. L'app s'ajoute à l'écran d'accueil

### Sur iOS
1. Ouvre l'app dans Safari
2. Appuie sur Partager (↗️)
3. Sélectionne "Sur l'écran d'accueil"
4. L'app s'ajoute comme raccourci

## 🎨 Générer les icônes PWA

Les icônes doivent être placées dans le dossier `/public/`:

### Icônes requises

```
/public/
├── icon-192.png          (192x192 pixels)
├── icon-192-maskable.png (192x192 pixels avec padding)
├── icon-512.png          (512x512 pixels)
└── icon-512-maskable.png (512x512 pixels avec padding)
```

### Comment générer les icônes

**Option 1: En ligne (rapide)**
1. Visite https://www.pwabuilder.com/imageGenerator
2. Télécharge ton logo PNG
3. Télécharge les icônes générées
4. Place-les dans `/public/`

**Option 2: Avec ImageMagick**
```bash
# Redimensionne et ajoute du padding pour maskable
convert logo.png -resize 192x192 -background transparent -gravity center -extent 192x192 icon-192-maskable.png
convert logo.png -resize 512x512 -background transparent -gravity center -extent 512x512 icon-512-maskable.png

# Version normale
convert icon-192-maskable.png -flatten icon-192.png
convert icon-512-maskable.png -flatten icon-512.png
```

**Option 3: Avec Figma ou Adobe Express**
1. Crée des carrés 192x192 et 512x512
2. Exporte en PNG
3. Ajoute le padding si nécessaire (80px de chaque côté pour les maskables)

## 🔧 Personnaliser la PWA

Tous les paramètres sont dans `/public/manifest.json`:

```json
{
  "name": "Netthex - Communautés Connectées",
  "short_name": "Netthex",
  "description": "...",
  "theme_color": "#0f172a",
  "background_color": "#ffffff"
}
```

## 📍 Où ajouter le bouton d'installation

Le composant `InstallPWAButton` peut être ajouté dans la Navbar:

```jsx
import InstallPWAButton from '../components/InstallPWAButton'

export default function Navbar() {
  return (
    <nav>
      {/* ... autres éléments ... */}
      <InstallPWAButton />
    </nav>
  )
}
```

## 🔄 Service Worker

Le Service Worker (`/public/service-worker.js`):
- Cache les assets statiques
- Utilise Network First pour les APIs
- Permet le fonctionnement offline
- Supporte les appareils sans connexion

## ⚙️ Configuration Vite

Vite sert automatiquement les fichiers du dossier `/public`, donc pas de configuration supplémentaire nécessaire.

## 🚀 Avant la production

1. **Générer les icônes PWA** (voir section ci-dessus)
2. **Tester sur vraie connexion HTTPS** (obligatoire pour PWA)
3. **Vérifier sur Android et iOS** avec les appareils réels
4. **Valider avec PWA Builder**: https://www.pwabuilder.com/

## 📚 Ressources

- [Web.dev - Building PWAs](https://web.dev/progressive-web-apps/)
- [MDN - Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [PWA Builder](https://www.pwabuilder.com/)
- [Manifest Generator](https://www.pwabuilder.com/generate)
