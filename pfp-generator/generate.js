const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 32;
const OUTPUT_SIZE = 512;

const PALETTES = [
  { bg: '#0a0a0a', primary: '#00ffff', secondary: '#ff00ff', accent: '#ffffff', name: 'Cyan' },
  { bg: '#0a0a0a', primary: '#ff00ff', secondary: '#00ff00', accent: '#ffff00', name: 'Magenta' },
  { bg: '#0a0a0a', primary: '#00ff00', secondary: '#00ffff', accent: '#ffffff', name: 'Matrix' },
  { bg: '#0a0a0a', primary: '#ff3333', secondary: '#ff00ff', accent: '#ffffff', name: 'Red' },
  { bg: '#0a0a0a', primary: '#ffffff', secondary: '#666666', accent: '#00ffff', name: 'Ghost' },
];

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function generatePFP(seed) {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  
  // Seeded random
  let s = seed;
  const random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  
  const palette = PALETTES[Math.floor(random() * PALETTES.length)];
  
  // Background
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, SIZE, SIZE);
  
  // Static noise
  for (let i = 0; i < 100; i++) {
    const x = Math.floor(random() * SIZE);
    const y = Math.floor(random() * SIZE);
    const alpha = random() * 0.15;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillRect(x, y, 1, 1);
  }
  
  // Head shape
  const headType = Math.floor(random() * 4);
  ctx.fillStyle = palette.primary;
  
  if (headType === 0) {
    // Rounded organic
    for (let y = 7; y < 26; y++) {
      for (let x = 7; x < 25; x++) {
        const dx = x - 16, dy = y - 15;
        if (dx*dx/64 + dy*dy/81 < 1 + random() * 0.3) {
          if (random() > 0.05) ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  } else if (headType === 1) {
    // Angular block
    ctx.fillRect(9, 7, 14, 18);
    ctx.fillRect(7, 9, 18, 14);
    // Cut corners
    ctx.fillStyle = palette.bg;
    ctx.fillRect(7, 7, 3, 3);
    ctx.fillRect(22, 7, 3, 3);
    ctx.fillRect(7, 22, 3, 3);
    ctx.fillRect(22, 22, 3, 3);
  } else if (headType === 2) {
    // Skull-ish
    ctx.fillRect(8, 6, 16, 14);
    ctx.fillRect(10, 20, 12, 5);
    ctx.fillRect(12, 25, 8, 3);
    // Eye sockets dark
    ctx.fillStyle = palette.bg;
    ctx.fillRect(10, 10, 4, 5);
    ctx.fillRect(18, 10, 4, 5);
  } else {
    // Fragmented
    for (let i = 0; i < 40; i++) {
      const x = 8 + Math.floor(random() * 16);
      const y = 6 + Math.floor(random() * 20);
      const size = 1 + Math.floor(random() * 3);
      ctx.fillRect(x, y, size, size);
    }
  }
  
  // Eyes
  ctx.fillStyle = palette.secondary;
  const eyeStyle = Math.floor(random() * 5);
  
  if (eyeStyle === 0) {
    // Bright dots
    ctx.fillRect(11, 12, 3, 3);
    ctx.fillRect(18, 12, 3, 3);
  } else if (eyeStyle === 1) {
    // Horizontal slits
    ctx.fillRect(10, 13, 4, 2);
    ctx.fillRect(18, 13, 4, 2);
  } else if (eyeStyle === 2) {
    // Vertical slits
    ctx.fillRect(12, 11, 2, 4);
    ctx.fillRect(19, 11, 2, 4);
  } else if (eyeStyle === 3) {
    // Single scanner bar
    ctx.fillRect(9, 13, 14, 2);
  } else {
    // X eyes (dead/glitch)
    ctx.fillRect(11, 11, 1, 1); ctx.fillRect(13, 13, 1, 1);
    ctx.fillRect(13, 11, 1, 1); ctx.fillRect(11, 13, 1, 1);
    ctx.fillRect(18, 11, 1, 1); ctx.fillRect(20, 13, 1, 1);
    ctx.fillRect(20, 11, 1, 1); ctx.fillRect(18, 13, 1, 1);
  }
  
  // Mouth (sometimes)
  if (random() > 0.5) {
    ctx.fillStyle = random() > 0.5 ? palette.secondary : palette.bg;
    const mouthType = Math.floor(random() * 3);
    if (mouthType === 0) {
      ctx.fillRect(13, 19, 6, 1);
    } else if (mouthType === 1) {
      ctx.fillRect(12, 19, 2, 2);
      ctx.fillRect(18, 19, 2, 2);
    } else {
      ctx.fillRect(14, 18, 4, 3);
    }
  }
  
  // Glitch lines
  const glitchAmount = Math.floor(random() * 6);
  for (let i = 0; i < glitchAmount; i++) {
    const y = Math.floor(random() * SIZE);
    const shift = Math.floor((random() - 0.5) * 8);
    const height = 1 + Math.floor(random() * 2);
    
    const imgData = ctx.getImageData(0, y, SIZE, height);
    const shifted = ctx.createImageData(SIZE, height);
    
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < SIZE; px++) {
        const srcX = (px - shift + SIZE) % SIZE;
        const srcIdx = (py * SIZE + srcX) * 4;
        const dstIdx = (py * SIZE + px) * 4;
        shifted.data[dstIdx] = imgData.data[srcIdx];
        shifted.data[dstIdx + 1] = imgData.data[srcIdx + 1];
        shifted.data[dstIdx + 2] = imgData.data[srcIdx + 2];
        shifted.data[dstIdx + 3] = imgData.data[srcIdx + 3];
      }
    }
    ctx.putImageData(shifted, 0, y);
  }
  
  // Color channel split (RGB glitch)
  if (random() > 0.6) {
    const imgData = ctx.getImageData(0, 0, SIZE, SIZE);
    for (let i = 0; i < imgData.data.length; i += 4) {
      if (random() > 0.95) {
        imgData.data[i] = Math.min(255, imgData.data[i] + 100);
      }
      if (random() > 0.95) {
        imgData.data[i + 2] = Math.min(255, imgData.data[i + 2] + 100);
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }
  
  // Scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let y = 0; y < SIZE; y += 2) {
    ctx.fillRect(0, y, SIZE, 1);
  }
  
  // Scale up
  const outputCanvas = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const outCtx = outputCanvas.getContext('2d');
  outCtx.imageSmoothingEnabled = false;
  outCtx.drawImage(canvas, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  
  return { canvas: outputCanvas, palette: palette.name };
}

// Generate samples
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

const samples = [
  { seed: 0, name: 'agent-0-ay' },
  { seed: 42, name: 'agent-1' },
  { seed: 1337, name: 'agent-2' },
  { seed: 9999, name: 'agent-3' },
  { seed: 777, name: 'agent-4' },
  { seed: 2026, name: 'agent-5' },
  { seed: 69, name: 'agent-6' },
  { seed: 420, name: 'agent-7' },
];

console.log('Generating AGNT PFPs...\n');

samples.forEach(({ seed, name }) => {
  const { canvas, palette } = generatePFP(seed);
  const filename = `${name}.png`;
  const filepath = path.join(outputDir, filename);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filepath, buffer);
  console.log(`✓ ${filename} (${palette})`);
});

console.log(`\nDone! Check ${outputDir}/`);
