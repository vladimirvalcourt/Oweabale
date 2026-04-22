import { readFile, writeFile } from 'fs/promises';
import { createCanvas, loadImage } from 'canvas';

async function createFavicons() {
  const imagePath = '/Users/vladimirv/Desktop/Owebale/oweable_logo_glyph_only_png_1775528452018.jpg';
  
  try {
    const image = await loadImage(imagePath);
    
    // Create 32x32 favicon
    const canvas32 = createCanvas(32, 32);
    const ctx32 = canvas32.getContext('2d');
    ctx32.drawImage(image, 0, 0, 32, 32);
    const buffer32 = canvas32.toBuffer('image/png');
    await writeFile('/Users/vladimirv/Desktop/Owebale/public/favicon-32x32.png', buffer32);
    console.log('✓ Created favicon-32x32.png');
    
    // Create 16x16 favicon
    const canvas16 = createCanvas(16, 16);
    const ctx16 = canvas16.getContext('2d');
    ctx16.drawImage(image, 0, 0, 16, 16);
    const buffer16 = canvas16.toBuffer('image/png');
    await writeFile('/Users/vladimirv/Desktop/Owebale/public/favicon-16x16.png', buffer16);
    console.log('✓ Created favicon-16x16.png');
    
    // Create 180x180 apple touch icon
    const canvas180 = createCanvas(180, 180);
    const ctx180 = canvas180.getContext('2d');
    ctx180.drawImage(image, 0, 0, 180, 180);
    const buffer180 = canvas180.toBuffer('image/png');
    await writeFile('/Users/vladimirv/Desktop/Owebale/public/apple-touch-icon.png', buffer180);
    console.log('✓ Created apple-touch-icon.png (180x180)');
    
    // Create 192x192 for PWA
    const canvas192 = createCanvas(192, 192);
    const ctx192 = canvas192.getContext('2d');
    ctx192.drawImage(image, 0, 0, 192, 192);
    const buffer192 = canvas192.toBuffer('image/png');
    await writeFile('/Users/vladimirv/Desktop/Owebale/public/icons/icon-192x192.png', buffer192);
    console.log('✓ Created icon-192x192.png');
    
    // Create 512x512 for PWA
    const canvas512 = createCanvas(512, 512);
    const ctx512 = canvas512.getContext('2d');
    ctx512.drawImage(image, 0, 0, 512, 512);
    const buffer512 = canvas512.toBuffer('image/png');
    await writeFile('/Users/vladimirv/Desktop/Owebale/public/icons/icon-512x512.png', buffer512);
    console.log('✓ Created icon-512x512.png');
    
    console.log('\n✅ All favicons created successfully!');
  } catch (error) {
    console.error('Error creating favicons:', error.message);
    process.exit(1);
  }
}

createFavicons();
