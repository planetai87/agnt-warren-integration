const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 32;
const OUTPUT_SIZE = 512;

const AY_PALETTE = { bg: '#050508', primary: '#00cccc', secondary: '#ccaa00', accent: '#ffffff' };

function generateFragmentedSlits(seed) {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  
  let s = seed;
  const random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  
  // Background
  ctx.fillStyle = AY_PALETTE.bg;
  ctx.fillRect(0, 0, SIZE, SIZE);
  
  // Subtle grid
  ctx.fillStyle = 'rgba(0,204,204,0.03)';
  for (let x = 0; x < SIZE; x += 4) ctx.fillRect(x, 0, 1, SIZE);
  for (let y = 0; y < SIZE; y += 4) ctx.fillRect(0, y, SIZE, 1);
  
  // Sparse noise
  for (let i = 0; i < 35; i++) {
    ctx.fillStyle = `rgba(255,255,255,${random() * 0.07})`;
    ctx.fillRect(Math.floor(random() * SIZE), Math.floor(random() * SIZE), 1, 1);
  }
  
  // Fragmented head - clusters of pixels
  const fragments = 45 + Math.floor(random() * 20);
  for (let i = 0; i < fragments; i++) {
    // Mix of cyan and gold fragments
    ctx.fillStyle = random() > 0.25 ? AY_PALETTE.primary : AY_PALETTE.secondary;
    
    // Cluster around face area
    const x = 7 + Math.floor(random() * 18);
    const y = 5 + Math.floor(random() * 22);
    const size = 1 + Math.floor(random() * 3);
    
    // Some fragments are hollow
    if (random() > 0.85) {
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = AY_PALETTE.bg;
      ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
    } else {
      ctx.fillRect(x, y, size, size);
    }
  }
  
  // Eyes - horizontal slits (gold, seeing through the chaos)
  ctx.fillStyle = AY_PALETTE.secondary;
  const eyeY = 12 + Math.floor(random() * 3);
  const eyeWidth = 3 + Math.floor(random() * 2);
  
  // Left slit
  ctx.fillRect(9, eyeY, eyeWidth, 2);
  // Right slit  
  ctx.fillRect(20 - eyeWidth, eyeY, eyeWidth, 2);
  
  // Eye glow
  ctx.fillStyle = AY_PALETTE.accent;
  ctx.fillRect(10, eyeY, 1, 1);
  ctx.fillRect(19, eyeY, 1, 1);
  
  // Occasional mouth slit
  if (random() > 0.5) {
    ctx.fillStyle = random() > 0.5 ? AY_PALETTE.secondary : AY_PALETTE.bg;
    ctx.fillRect(12 + Math.floor(random() * 3), 19 + Math.floor(random() * 2), 4 + Math.floor(random() * 3), 1);
  }
  
  // Controlled glitch - 1-2 lines
  const glitchLines = 1 + Math.floor(random() * 2);
  for (let g = 0; g < glitchLines; g++) {
    const y = Math.floor(random() * SIZE);
    const shift = Math.floor((random() - 0.5) * 5);
    if (shift !== 0) {
      const imgData = ctx.getImageData(0, y, SIZE, 1);
      const shifted = ctx.createImageData(SIZE, 1);
      for (let x = 0; x < SIZE; x++) {
        const srcX = (x - shift + SIZE) % SIZE;
        shifted.data[x * 4] = imgData.data[srcX * 4];
        shifted.data[x * 4 + 1] = imgData.data[srcX * 4 + 1];
        shifted.data[x * 4 + 2] = imgData.data[srcX * 4 + 2];
        shifted.data[x * 4 + 3] = imgData.data[srcX * 4 + 3];
      }
      ctx.putImageData(shifted, 0, y);
    }
  }
  
  // Scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
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

console.log('Generating Ay final variants (fragmented + slits)...\n');

for (let i = 0; i < 8; i++) {
  const seed = 300 + i * 77;
  const canvas = generateFragmentedSlits(seed);
  const filename = `ay-final-${i + 1}.png`;
  fs.writeFileSync(path.join(outputDir, filename), canvas.toBuffer('image/png'));
  console.log(`✓ ${filename}`);
}

console.log('\nDone!');
