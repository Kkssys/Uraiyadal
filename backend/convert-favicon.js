const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Create frontend/public directory if it doesn't exist
const publicDir = path.join(__dirname, '../frontend/public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Source image path (update with your actual path)
const sourceImage = path.join(__dirname, '../Gemini_Generated_Image_6zmnl86zmnl86zmn-removebg-preview.png');

// Define all required icon sizes (ratio-based)
const sizes = [
  { size: 16, name: 'favicon-48x48.png' },
  { size: 32, name: 'favicon-48x48.png' },
  { size: 48, name: 'favicon-48x48.png' },
  { size: 64, name: 'favicon-64x64.png' },
  { size: 96, name: 'favicon-96x96.png' },
  { size: 128, name: 'favicon-128x128.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'favicon-192x192.png' },
  { size: 256, name: 'favicon-256x256.png' },
  { size: 384, name: 'favicon-384x384.png' },
  { size: 512, name: 'favicon-512x512.png' }
];

// App logo sizes (for different parts of the app)
const appLogoSizes = [
  { size: 32, name: 'logo-32x32.png', folder: 'logo-small' },
  { size: 48, name: 'logo-48x48.png', folder: 'logo-medium' },
  { size: 64, name: 'logo-64x64.png', folder: 'logo-large' },
  { size: 80, name: 'logo-80x80.png', folder: 'logo-loading' },
  { size: 120, name: 'logo-120x120.png', folder: 'logo-xl' }
];

async function convertImages() {
  try {
    // Check if source image exists
    if (!fs.existsSync(sourceImage)) {
      console.error('❌ Source image not found at:', sourceImage);
      console.log('Please update the sourceImage path to your actual image location');
      return;
    }

    console.log('🖼️ Converting favicon images...');

    // Generate favicon sizes
    for (const { size, name } of sizes) {
      await sharp(sourceImage)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(path.join(publicDir, name));
      console.log(`✅ Generated ${name} (${size}x${size})`);
    }

    // Generate app logos
    for (const { size, name } of appLogoSizes) {
      await sharp(sourceImage)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(path.join(publicDir, name));
      console.log(`✅ Generated ${name} (${size}x${size})`);
    }

    // Also create a SVG version for better scaling
    console.log('✅ All favicon sizes generated successfully!');
    console.log(`📁 Location: ${publicDir}`);
  } catch (error) {
    console.error('❌ Error converting images:', error);
  }
}

convertImages();