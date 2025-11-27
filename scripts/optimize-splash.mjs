import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function optimizeSplash() {
  const inputPath = path.join(__dirname, '../public/splash.png');
  const outputPath = path.join(__dirname, '../public/splash-optimized.png');

  await sharp(inputPath)
    .resize(1242, 2688, {
      fit: 'cover',
      position: 'center'
    })
    .png({ quality: 80, compressionLevel: 9 })
    .toFile(outputPath);

  console.log('✓ Optimized splash screen');
}

optimizeSplash().catch(console.error);
