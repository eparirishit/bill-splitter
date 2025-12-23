/**
 * Script to generate PWA icons from SVG source
 * 
 * This script requires sharp to be installed:
 * npm install --save-dev sharp
 * 
 * Usage: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('Error: sharp is not installed. Please run: npm install --save-dev sharp');
  process.exit(1);
}

const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');
const svgPath = path.join(iconsDir, 'icon.svg');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Check if SVG exists
if (!fs.existsSync(svgPath)) {
  console.error(`Error: SVG icon not found at ${svgPath}`);
  process.exit(1);
}

async function generateIcons() {
  console.log('Generating PWA icons...');
  
  const svgBuffer = fs.readFileSync(svgPath);
  
  for (const size of iconSizes) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    
    try {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Generated ${outputPath}`);
    } catch (error) {
      console.error(`✗ Failed to generate ${outputPath}:`, error.message);
    }
  }
  
  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
