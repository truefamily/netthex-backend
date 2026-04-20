import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, 'public');

// SVG to PNG conversion function
async function generateIcons() {
  try {
    const svgPath = path.join(publicDir, 'favicon.svg');
    const svgBuffer = fs.readFileSync(svgPath);

    console.log('🎨 Génération des icônes PWA...');

    // 1. Icon 192x192
    console.log('Création: icon-192.png');
    await sharp(svgBuffer, { density: 192 })
      .png()
      .resize(192, 192, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .toFile(path.join(publicDir, 'icon-192.png'));

    // 2. Icon 192x192 Maskable (avec padding pour safe zone)
    console.log('Création: icon-192-maskable.png');
    await sharp(svgBuffer, { density: 192 })
      .png()
      .resize(115, 115, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .extend({
        top: 38,
        bottom: 39,
        left: 38,
        right: 39,
        background: { r: 2, g: 23, b: 42, alpha: 1 } // slate-950
      })
      .toFile(path.join(publicDir, 'icon-192-maskable.png'));

    // 3. Icon 512x512
    console.log('Création: icon-512.png');
    await sharp(svgBuffer, { density: 512 })
      .png()
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .toFile(path.join(publicDir, 'icon-512.png'));

    // 4. Icon 512x512 Maskable (avec padding pour safe zone)
    console.log('Création: icon-512-maskable.png');
    await sharp(svgBuffer, { density: 512 })
      .png()
      .resize(307, 307, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .extend({
        top: 102,
        bottom: 103,
        left: 102,
        right: 103,
        background: { r: 2, g: 23, b: 42, alpha: 1 } // slate-950
      })
      .toFile(path.join(publicDir, 'icon-512-maskable.png'));

    console.log('✅ Icônes PWA générées avec succès!');
    console.log('📁 Fichiers créés:');
    console.log('   - icon-192.png');
    console.log('   - icon-192-maskable.png');
    console.log('   - icon-512.png');
    console.log('   - icon-512-maskable.png');
  } catch (error) {
    console.error('❌ Erreur lors de la génération des icônes:', error);
    process.exit(1);
  }
}

generateIcons();
