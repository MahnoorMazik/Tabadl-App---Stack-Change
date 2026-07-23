// Simple script to create placeholder PWA icons from favicon
const fs = require('fs');
const path = require('path');

const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
const faviconPath = path.join(__dirname, '..', 'public', 'favicon.png');

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
  console.log('Created public/icons directory');
}

// Check if favicon exists
if (!fs.existsSync(faviconPath)) {
  console.error('Error: favicon.png not found in public/ directory');
  process.exit(1);
}

// Copy favicon to all icon sizes (as placeholders)
console.log('Creating placeholder icons from favicon.png...');
iconSizes.forEach(size => {
  const destPath = path.join(iconsDir, `icon-${size}x${size}.png`);
  fs.copyFileSync(faviconPath, destPath);
  console.log(`  ✓ Created icon-${size}x${size}.png`);
});

console.log('\n✅ Placeholder icons created successfully!');
console.log('Note: These are placeholders. Replace with properly sized icons for production.');
console.log('You can use tools like:');
console.log('  - https://realfavicongenerator.net/');
console.log('  - https://www.pwabuilder.com/imageGenerator');
console.log('  - ImageMagick: magick convert favicon.png -resize ${size}x${size} public/icons/icon-${size}x${size}.png');
