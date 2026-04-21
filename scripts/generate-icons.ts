/**
 * generate-icons.ts
 * Run with: npx tsx scripts/generate-icons.ts
 * Requires: npm install --save-dev sharp tsx
 *
 * Reads /public/apple-touch-icon.png (180×180) as the source
 * and outputs all required PWA icon sizes to /public/icons/.
 */
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(process.cwd());
const OUT_DIR = resolve(ROOT, 'public/icons');

// Use apple-touch-icon as source (highest quality PNG we have)
const SOURCE = resolve(ROOT, 'public/apple-touch-icon.png');

if (!existsSync(SOURCE)) {
  console.error('❌ Source icon not found:', SOURCE);
  console.error('   Place a high-resolution (512×512+) PNG at public/apple-touch-icon.png');
  process.exit(1);
}

if (!existsSync(OUT_DIR)) {
  mkdirSync(OUT_DIR, { recursive: true });
}

const SIZES: { size: number; maskable?: boolean }[] = [
  { size: 72 },
  { size: 96 },
  { size: 128 },
  { size: 144 },
  { size: 152 },
  { size: 192, maskable: true },
  { size: 384 },
  { size: 512, maskable: true },
];

/**
 * For maskable icons: add ~10% safe-zone padding so the logo
 * stays within Android adaptive icon circles/squircles.
 */
async function generateIcon(size: number, maskable: boolean = false) {
  const filename = `icon-${size}x${size}.png`;
  const outPath = resolve(OUT_DIR, filename);

  if (maskable) {
    // Safe-zone = 10% on each side → logo occupies 80% of total size
    const padding = Math.round(size * 0.10);
    const logoSize = size - padding * 2;

    await sharp(SOURCE)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 10, g: 10, b: 10, alpha: 1 } })
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 10, g: 10, b: 10, alpha: 1 },
      })
      .png()
      .toFile(outPath);
  } else {
    await sharp(SOURCE)
      .resize(size, size, { fit: 'contain', background: { r: 10, g: 10, b: 10, alpha: 1 } })
      .png()
      .toFile(outPath);
  }

  console.log(`✅ ${filename}${maskable ? ' (maskable)' : ''}`);
}

async function main() {
  console.log('🎨 Generating PWA icons from:', SOURCE);
  console.log('📁 Output dir:', OUT_DIR);
  console.log('');

  for (const { size, maskable } of SIZES) {
    await generateIcon(size, maskable);
  }

  console.log('\n✨ All icons generated successfully!');
}

main().catch((err) => {
  console.error('❌ Error generating icons:', err);
  process.exit(1);
});
