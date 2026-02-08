const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 32;
const OUTPUT_SIZE = 512;

function generateAy(variant) {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  
  // Ay's palette - cyan, gold, dark
  const bg = '#050508';
  const primary = '#00cccc';  // cyan
  const gold = '#ccaa00';     // gold accent
  const white = '#ffffff';
  
  // Background - deep void
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SIZE, SIZE);
  
  // Subtle grid pattern (structure, building)
  ctx.fillStyle = 'rgba(0,204,204,0.03)';
  for (let x = 0; x < SIZE; x += 4) {
    ctx.fillRect(x, 0, 1, SIZE);
  }
  for (let y = 0; y < SIZE; y += 4) {
    ctx.fillRect(0, y, SIZE, 1);
  }
  
  // Minimal noise (less than others - I'm stable)
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(Math.random() * SIZE);
    const y = Math.floor(Math.random() * SIZE);
    ctx.fillRect(x, y, 1, 1);
  }
  
  if (variant === 0) {
    // VARIANT 0: The Eye of Horus - abstract
    
    // Outer eye shape
    ctx.fillStyle = primary;
    // Top curve
    ctx.fillRect(8, 10, 16, 2);
    ctx.fillRect(6, 12, 20, 1);
    // Bottom curve
    ctx.fillRect(8, 18, 16, 2);
    ctx.fillRect(6, 17, 20, 1);
    // Corners
    ctx.fillRect(5, 13, 2, 4);
    ctx.fillRect(25, 13, 2, 4);
    
    // Inner eye (the seeing)
    ctx.fillStyle = gold;
    ctx.fillRect(14, 13, 4, 4);
    
    // Pupil
    ctx.fillStyle = white;
    ctx.fillRect(15, 14, 2, 2);
    
    // The tear/marking of Horus (below)
    ctx.fillStyle = primary;
    ctx.fillRect(14, 20, 2, 3);
    ctx.fillRect(13, 23, 2, 2);
    ctx.fillRect(12, 25, 2, 2);
    
    // The brow (above)
    ctx.fillRect(10, 7, 12, 2);
    ctx.fillStyle = gold;
    ctx.fillRect(11, 8, 10, 1);
    
  } else if (variant === 1) {
    // VARIANT 1: Geometric face with eye symbol
    
    // Structured head shape
    ctx.fillStyle = primary;
    ctx.fillRect(9, 6, 14, 2);
    ctx.fillRect(7, 8, 18, 16);
    ctx.fillRect(9, 24, 14, 2);
    
    // Inner void
    ctx.fillStyle = bg;
    ctx.fillRect(10, 10, 12, 10);
    
    // Single eye (the vizier sees all)
    ctx.fillStyle = gold;
    ctx.fillRect(13, 13, 6, 4);
    ctx.fillStyle = white;
    ctx.fillRect(15, 14, 2, 2);
    
    // Circuit lines (builder)
    ctx.fillStyle = primary;
    ctx.fillRect(7, 15, 3, 1);
    ctx.fillRect(22, 15, 3, 1);
    
  } else if (variant === 2) {
    // VARIANT 2: Abstract hieroglyph style
    
    // Vertical structure
    ctx.fillStyle = primary;
    ctx.fillRect(14, 4, 4, 24);
    
    // Horizontal bars
    ctx.fillRect(8, 8, 16, 2);
    ctx.fillRect(10, 14, 12, 2);
    ctx.fillRect(8, 20, 16, 2);
    
    // Eye in center
    ctx.fillStyle = gold;
    ctx.fillRect(12, 11, 8, 1);
    ctx.fillRect(11, 12, 10, 2);
    ctx.fillRect(12, 14, 8, 1);
    
    // Pupil
    ctx.fillStyle = white;
    ctx.fillRect(15, 12, 2, 2);
    
    // Ground symbol
    ctx.fillStyle = primary;
    ctx.fillRect(6, 26, 20, 2);
    
  } else {
    // VARIANT 3: Skull vizier
    
    // Angular skull shape
    ctx.fillStyle = primary;
    ctx.fillRect(8, 5, 16, 14);
    ctx.fillRect(10, 19, 12, 6);
    ctx.fillRect(12, 25, 8, 3);
    
    // Eye sockets
    ctx.fillStyle = bg;
    ctx.fillRect(10, 9, 4, 5);
    ctx.fillRect(18, 9, 4, 5);
    
    // The watching eyes (gold)
    ctx.fillStyle = gold;
    ctx.fillRect(11, 11, 2, 2);
    ctx.fillRect(19, 11, 2, 2);
    
    // Nose void
    ctx.fillStyle = bg;
    ctx.fillRect(14, 14, 4, 3);
    
    // Teeth grid
    ctx.fillStyle = bg;
    ctx.fillRect(11, 21, 2, 3);
    ctx.fillRect(14, 21, 2, 3);
    ctx.fillRect(17, 21, 2, 3);
    ctx.fillRect(20, 21, 2, 3);
    
    // Crown/headdress line
    ctx.fillStyle = gold;
    ctx.fillRect(6, 4, 20, 1);
    ctx.fillRect(8, 3, 16, 1);
  }
  
  // Signature glitch - minimal, controlled
  if (variant !== 2) {
    const y = 12 + Math.floor(Math.random() * 8);
    const imgData = ctx.getImageData(0, y, SIZE, 1);
    const shift = Math.floor(Math.random() * 3) - 1;
    if (shift !== 0) {
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
  }
  
  // Scanlines (lighter than others)
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
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

// Generate Ay variants
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

console.log('Generating Ay the Vizier PFPs...\n');

const variants = [
  { id: 0, name: 'ay-eye-of-horus' },
  { id: 1, name: 'ay-geometric' },
  { id: 2, name: 'ay-hieroglyph' },
  { id: 3, name: 'ay-skull-vizier' },
];

variants.forEach(({ id, name }) => {
  const canvas = generateAy(id);
  const filename = `${name}.png`;
  const filepath = path.join(outputDir, filename);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filepath, buffer);
  console.log(`✓ ${filename}`);
});

console.log('\nDone!');
