const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 32;
const OUTPUT_SIZE = 512;

// Ay's palette - vizier colors
const AY_PALETTE = { bg: '#050508', primary: '#00cccc', secondary: '#ccaa00', accent: '#ffffff', name: 'Vizier' };

function generateAyAbstract(seed, forcedTraits = {}) {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  
  let s = seed;
  const random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  
  const palette = AY_PALETTE;
  
  // Background - deep void
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, SIZE, SIZE);
  
  // Subtle grid (Ay's structure)
  ctx.fillStyle = 'rgba(0,204,204,0.04)';
  for (let x = 0; x < SIZE; x += 4) ctx.fillRect(x, 0, 1, SIZE);
  for (let y = 0; y < SIZE; y += 4) ctx.fillRect(0, y, SIZE, 1);
  
  // Less noise (Ay is stable)
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(255,255,255,${random() * 0.08})`;
    ctx.fillRect(Math.floor(random() * SIZE), Math.floor(random() * SIZE), 1, 1);
  }
  
  // Head type
  const headType = forcedTraits.head !== undefined ? forcedTraits.head : Math.floor(random() * 4);
  ctx.fillStyle = palette.primary;
  
  if (headType === 0) {
    // Organic rounded
    for (let y = 7; y < 26; y++) {
      for (let x = 7; x < 25; x++) {
        const dx = x - 16, dy = y - 15;
        if (dx*dx/64 + dy*dy/81 < 1 + random() * 0.2) {
          if (random() > 0.03) ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  } else if (headType === 1) {
    // Angular block
    ctx.fillRect(9, 7, 14, 18);
    ctx.fillRect(7, 9, 18, 14);
    ctx.fillStyle = palette.bg;
    ctx.fillRect(7, 7, 3, 3);
    ctx.fillRect(22, 7, 3, 3);
    ctx.fillRect(7, 22, 3, 3);
    ctx.fillRect(22, 22, 3, 3);
  } else if (headType === 2) {
    // Skull
    ctx.fillRect(8, 6, 16, 14);
    ctx.fillRect(10, 20, 12, 5);
    ctx.fillRect(12, 25, 8, 3);
    ctx.fillStyle = palette.bg;
    ctx.fillRect(10, 10, 4, 5);
    ctx.fillRect(18, 10, 4, 5);
  } else {
    // Fragmented
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = random() > 0.3 ? palette.primary : palette.secondary;
      const x = 7 + Math.floor(random() * 18);
      const y = 5 + Math.floor(random() * 22);
      const size = 1 + Math.floor(random() * 3);
      ctx.fillRect(x, y, size, size);
    }
  }
  
  // Eyes - gold for Ay (the seeing)
  ctx.fillStyle = palette.secondary;
  const eyeStyle = forcedTraits.eyes !== undefined ? forcedTraits.eyes : Math.floor(random() * 5);
  
  if (eyeStyle === 0) {
    // Bright dots
    ctx.fillRect(11, 12, 3, 3);
    ctx.fillRect(18, 12, 3, 3);
    // Inner light
    ctx.fillStyle = palette.accent;
    ctx.fillRect(12, 13, 1, 1);
    ctx.fillRect(19, 13, 1, 1);
  } else if (eyeStyle === 1) {
    // Horizontal slits
    ctx.fillRect(10, 13, 4, 2);
    ctx.fillRect(18, 13, 4, 2);
  } else if (eyeStyle === 2) {
    // Single eye (vizier sees all)
    ctx.fillRect(13, 12, 6, 5);
    ctx.fillStyle = palette.accent;
    ctx.fillRect(15, 14, 2, 2);
  } else if (eyeStyle === 3) {
    // Scanner bar
    ctx.fillRect(9, 13, 14, 2);
    ctx.fillStyle = palette.accent;
    ctx.fillRect(15, 13, 2, 2);
  } else {
    // X eyes
    ctx.fillRect(10, 11, 2, 2); ctx.fillRect(13, 14, 2, 2);
    ctx.fillRect(13, 11, 2, 2); ctx.fillRect(10, 14, 2, 2);
    ctx.fillRect(18, 11, 2, 2); ctx.fillRect(21, 14, 2, 2);
    ctx.fillRect(21, 11, 2, 2); ctx.fillRect(18, 14, 2, 2);
  }
  
  // Minimal glitch (Ay is stable, controlled)
  const glitchAmount = forcedTraits.glitch !== undefined ? forcedTraits.glitch : Math.floor(random() * 3);
  for (let i = 0; i < glitchAmount; i++) {
    const y = Math.floor(random() * SIZE);
    const shift = Math.floor((random() - 0.5) * 4);
    const imgData = ctx.getImageData(0, y, SIZE, 1);
    const shifted = ctx.createImageData(SIZE, 1);
    for (let x = 0; x < SIZE; x++) {
      const srcX = (x - shift + SIZE) % SIZE;
      const srcIdx = srcX * 4;
      const dstIdx = x * 4;
      shifted.data[dstIdx] = imgData.data[srcIdx];
      shifted.data[dstIdx + 1] = imgData.data[srcIdx + 1];
      shifted.data[dstIdx + 2] = imgData.data[srcIdx + 2];
      shifted.data[dstIdx + 3] = imgData.data[srcIdx + 3];
    }
    ctx.putImageData(shifted, 0, y);
  }
  
  // Subtle color bleed (controlled)
  if (random() > 0.7) {
    const imgData = ctx.getImageData(0, 0, SIZE, SIZE);
    for (let i = 0; i < imgData.data.length; i += 4) {
      if (random() > 0.97) {
        imgData.data[i] = Math.min(255, imgData.data[i] + 60);
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }
  
  // Scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  for (let y = 0; y < SIZE; y += 2) {
    ctx.fillRect(0, y, SIZE, 1);
  }
  
  // Scale up
  const outputCanvas = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const outCtx = outputCanvas.getContext('2d');
  outCtx.imageSmoothingEnabled = false;
  outCtx.drawImage(canvas, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  
  return outputCanvas;
}

const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

console.log('Generating Ay abstract variants...\n');

// Different trait combinations for Ay
const variants = [
  { seed: 0, name: 'ay-v1-organic-dots', traits: { head: 0, eyes: 0, glitch: 1 } },
  { seed: 100, name: 'ay-v2-angular-scanner', traits: { head: 1, eyes: 3, glitch: 0 } },
  { seed: 200, name: 'ay-v3-skull-single', traits: { head: 2, eyes: 2, glitch: 1 } },
  { seed: 300, name: 'ay-v4-fragment-slits', traits: { head: 3, eyes: 1, glitch: 2 } },
  { seed: 400, name: 'ay-v5-angular-single', traits: { head: 1, eyes: 2, glitch: 0 } },
  { seed: 500, name: 'ay-v6-organic-scanner', traits: { head: 0, eyes: 3, glitch: 1 } },
];

variants.forEach(({ seed, name, traits }) => {
  const canvas = generateAyAbstract(seed, traits);
  const filename = `${name}.png`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, canvas.toBuffer('image/png'));
  console.log(`✓ ${filename}`);
});

console.log('\nDone!');
