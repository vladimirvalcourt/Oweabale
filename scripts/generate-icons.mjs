/**
 * Plain JS version for direct node execution (no ts-node needed)
 * Run: node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC_SVG = path.join(ROOT, 'public', 'favicon.svg');
const OUT_DIR = path.join(ROOT, 'public', 'icons');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const MASKABLE = new Set([192, 512]);

fs.mkdirSync(OUT_DIR, { recursive: true });
const svgBuffer = fs.readFileSync(SRC_SVG);

for (const size of SIZES) {
  const out = path.join(OUT_DIR, `icon-${size}x${size}.png`);
  if (MASKABLE.has(size)) {
    const logoSize = Math.round(size * 0.8);
    const pad = Math.round((size - logoSize) / 2);
    const logo = await sharp(svgBuffer).resize(logoSize, logoSize).png().toBuffer();
    await sharp({
      create: { width: size, height: size, channels: 4, background: { r: 10, g: 10, b: 10, alpha: 1 } },
    }).composite([{ input: logo, top: pad, left: pad }]).png().toFile(out);
    console.log(`✓ icon-${size}x${size}.png (maskable)`);
  } else {
    await sharp(svgBuffer).resize(size, size).png().toFile(out);
    console.log(`✓ icon-${size}x${size}.png`);
  }
}

// apple-touch-icon at 180x180
const appleOut = path.join(ROOT, 'public', 'apple-touch-icon-pwa.png');
const logoSize = Math.round(180 * 0.8);
const pad = Math.round((180 - logoSize) / 2);
const logo = await sharp(svgBuffer).resize(logoSize, logoSize).png().toBuffer();
await sharp({
  create: { width: 180, height: 180, channels: 4, background: { r: 10, g: 10, b: 10, alpha: 1 } },
}).composite([{ input: logo, top: pad, left: pad }]).png().toFile(appleOut);
console.log('✓ apple-touch-icon-pwa.png');
console.log('\n✅ All icons generated.');
