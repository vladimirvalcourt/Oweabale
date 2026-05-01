import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const publicDir = join(__dirname, '..', 'public');

async function convertImages() {
  const images = [
    { input: 'hero-dashboard-premium.png', output: 'hero-dashboard-premium.webp', quality: 85 },
    { input: 'hero-loop-poster.jpg', output: 'hero-loop-poster.webp', quality: 85 },
  ];

  for (const img of images) {
    const inputPath = join(publicDir, img.input);
    const outputPath = join(publicDir, img.output);

    if (!fs.existsSync(inputPath)) {
      console.log(`⚠️  Skipping ${img.input} - file not found`);
      continue;
    }

    try {
      await sharp(inputPath)
        .webp({ quality: img.quality })
        .toFile(outputPath);

      const originalSize = fs.statSync(inputPath).size;
      const newSize = fs.statSync(outputPath).size;
      const reduction = ((originalSize - newSize) / originalSize * 100).toFixed(1);

      console.log(`✅ ${img.input} → ${img.output}`);
      console.log(`   Original: ${(originalSize / 1024).toFixed(1)} KB`);
      console.log(`   WebP: ${(newSize / 1024).toFixed(1)} KB`);
      console.log(`   Reduction: ${reduction}%\n`);
    } catch (error) {
      console.error(`❌ Failed to convert ${img.input}:`, error.message);
    }
  }
}

convertImages().catch(console.error);
