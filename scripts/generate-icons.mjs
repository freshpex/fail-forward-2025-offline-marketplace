import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  const inputPath = path.join(__dirname, '../public/icons/Icon.png');
  const outputDir = path.join(__dirname, '../public/icons');

  try {
    await fs.access(outputDir);
  } catch {
    await fs.mkdir(outputDir, { recursive: true });
  }

  console.log('Generating PWA icons...');

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);

    await sharp(inputPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 245, g: 245, b: 220, alpha: 1 }
      })
      .png()
      .toFile(outputPath);

    console.log(`✓ Generated ${size}x${size} icon`);
  }

  const splashPath = path.join(__dirname, '../public/splash.png');
  await sharp(path.join(__dirname, '../public/inAppiPicture.png'))
    .resize(1242, 2688, {
      fit: 'cover',
      position: 'center'
    })
    .png()
    .toFile(splashPath);

  console.log('✓ Generated splash screen');
  console.log('✓ All icons generated successfully!');
}

generateIcons().catch(console.error);
