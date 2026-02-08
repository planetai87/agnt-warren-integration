#!/usr/bin/env node
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 32;
const OUTPUT_SIZE = 512;

// Breadio palette - warm bread tones + glitch accents
const BREAD_PALETTE = {
  crust: '#8B4513',
  crustLight: '#A0522D',
  crustDark: '#5C2E0A',
  inside: '#F5DEB3',
  insideLight: '#FAEBD7',
  insideDark: '#DEB887',
  bg: '#0a0a0a',
  glitch1: '#00ffff',
  glitch2: '#ff00ff',
  glitch3: '#ff0000',
  eye: '#ff3333',
  eyeGlow: '#ff0000',
  static: '#333333',
};

function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
}

function drawBreadLoaf(ctx, p, rng, variant) {
  // Clear
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // === BREAD BODY (loaf shape) ===
  // Main body - rectangular loaf
  ctx.fillStyle = p.crust;
  ctx.fillRect(7, 12, 18, 12); // main body
  
  // Top dome of bread
  ctx.fillStyle = p.crust;
  ctx.fillRect(8, 10, 16, 2);
  ctx.fillRect(9, 8, 14, 2);
  ctx.fillRect(10, 7, 12, 1);
  
  // Bottom
  ctx.fillRect(8, 24, 16, 1);

  // Inner bread color (the "crumb")
  ctx.fillStyle = p.inside;
  ctx.fillRect(9, 13, 14, 10);
  ctx.fillRect(10, 11, 12, 2);
  
  // Bread texture spots
  ctx.fillStyle = p.insideDark;
  for (let i = 0; i < 8; i++) {
    const x = 10 + Math.floor(rng() * 12);
    const y = 13 + Math.floor(rng() * 9);
    ctx.fillRect(x, y, 1, 1);
  }

  // Crust detail/shading
  ctx.fillStyle = p.crustDark;
  ctx.fillRect(7, 23, 18, 1);
  ctx.fillRect(7, 12, 1, 12);
  ctx.fillRect(24, 12, 1, 12);

  // === FACE ===
  if (variant === 0) {
    // Angry pixel eyes - red squares
    ctx.fillStyle = p.eye;
    ctx.fillRect(12, 15, 3, 2);
    ctx.fillRect(18, 15, 3, 2);
    // Pupils
    ctx.fillStyle = '#000000';
    ctx.fillRect(13, 15, 1, 1);
    ctx.fillRect(19, 15, 1, 1);
    // Angry brow
    ctx.fillStyle = p.crustDark;
    ctx.fillRect(11, 14, 4, 1);
    ctx.fillRect(18, 14, 4, 1);
    // Jagged mouth
    ctx.fillStyle = '#000000';
    ctx.fillRect(13, 19, 1, 1);
    ctx.fillRect(14, 20, 1, 1);
    ctx.fillRect(15, 19, 1, 1);
    ctx.fillRect(16, 20, 1, 1);
    ctx.fillRect(17, 19, 1, 1);
    ctx.fillRect(18, 20, 1, 1);
    ctx.fillRect(19, 19, 1, 1);
  } else if (variant === 1) {
    // X eyes (dead/chaotic)
    ctx.fillStyle = p.eye;
    ctx.fillRect(12, 15, 1, 1); ctx.fillRect(14, 15, 1, 1);
    ctx.fillRect(13, 16, 1, 1);
    ctx.fillRect(12, 17, 1, 1); ctx.fillRect(14, 17, 1, 1);
    ctx.fillRect(18, 15, 1, 1); ctx.fillRect(20, 15, 1, 1);
    ctx.fillRect(19, 16, 1, 1);
    ctx.fillRect(18, 17, 1, 1); ctx.fillRect(20, 17, 1, 1);
    // Wide grin
    ctx.fillStyle = '#000000';
    ctx.fillRect(12, 20, 9, 1);
    ctx.fillRect(13, 21, 7, 1);
    // Teeth
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(14, 20, 1, 1);
    ctx.fillRect(16, 20, 1, 1);
    ctx.fillRect(18, 20, 1, 1);
  } else if (variant === 2) {
    // Glowing single eye (cyclops bread)
    ctx.fillStyle = p.eyeGlow;
    ctx.fillRect(14, 15, 4, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(15, 16, 2, 1);
    ctx.fillStyle = '#000000';
    ctx.fillRect(15, 16, 1, 1);
    // Stitched mouth
    ctx.fillStyle = '#000000';
    for (let x = 12; x <= 20; x += 2) {
      ctx.fillRect(x, 20, 1, 1);
    }
    ctx.fillStyle = p.crustDark;
    for (let x = 13; x <= 19; x += 2) {
      ctx.fillRect(x, 20, 1, 1);
    }
  } else {
    // Hollow eyes (void bread)
    ctx.fillStyle = '#000000';
    ctx.fillRect(11, 14, 4, 4);
    ctx.fillRect(18, 14, 4, 4);
    // Tiny glowing pupils
    ctx.fillStyle = p.glitch1;
    ctx.fillRect(12, 16, 1, 1);
    ctx.fillRect(20, 16, 1, 1);
    // No mouth - just a crack
    ctx.fillStyle = '#000000';
    ctx.fillRect(15, 20, 3, 1);
    ctx.fillRect(14, 21, 1, 1);
    ctx.fillRect(18, 21, 1, 1);
  }
}

function addGlitchEffects(ctx, rng, p, intensity) {
  // Horizontal scan lines
  for (let y = 0; y < SIZE; y += 2) {
    if (rng() < 0.3) {
      ctx.fillStyle = `rgba(0,0,0,0.15)`;
      ctx.fillRect(0, y, SIZE, 1);
    }
  }

  // Glitch displacement - shift random horizontal strips
  const imageData = ctx.getImageData(0, 0, SIZE, SIZE);
  const data = imageData.data;
  
  for (let i = 0; i < intensity; i++) {
    const y = Math.floor(rng() * SIZE);
    const shift = Math.floor(rng() * 6) - 3;
    if (shift === 0) continue;
    
    const row = new Uint8ClampedArray(SIZE * 4);
    for (let x = 0; x < SIZE; x++) {
      const srcX = ((x - shift) + SIZE) % SIZE;
      const srcIdx = (y * SIZE + srcX) * 4;
      const dstIdx = x * 4;
      row[dstIdx] = data[srcIdx];
      row[dstIdx + 1] = data[srcIdx + 1];
      row[dstIdx + 2] = data[srcIdx + 2];
      row[dstIdx + 3] = data[srcIdx + 3];
    }
    for (let x = 0; x < SIZE; x++) {
      const idx = (y * SIZE + x) * 4;
      data[idx] = row[x * 4];
      data[idx + 1] = row[x * 4 + 1];
      data[idx + 2] = row[x * 4 + 2];
      data[idx + 3] = row[x * 4 + 3];
    }
  }
  ctx.putImageData(imageData, 0, 0);

  // Color channel glitch blocks
  for (let i = 0; i < 3; i++) {
    if (rng() < 0.5) {
      const x = Math.floor(rng() * SIZE);
      const y = Math.floor(rng() * SIZE);
      const w = 2 + Math.floor(rng() * 6);
      const h = 1 + Math.floor(rng() * 2);
      ctx.fillStyle = [p.glitch1, p.glitch2, p.glitch3][Math.floor(rng() * 3)];
      ctx.globalAlpha = 0.3 + rng() * 0.4;
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1;
    }
  }

  // Static noise
  for (let i = 0; i < 15; i++) {
    const x = Math.floor(rng() * SIZE);
    const y = Math.floor(rng() * SIZE);
    ctx.fillStyle = rng() > 0.5 ? '#ffffff' : p.static;
    ctx.globalAlpha = 0.2 + rng() * 0.3;
    ctx.fillRect(x, y, 1, 1);
    ctx.globalAlpha = 1;
  }
}

function addXCOPYVibes(ctx, rng, p) {
  // Drip effect from bottom of bread
  for (let i = 0; i < 3; i++) {
    const x = 10 + Math.floor(rng() * 12);
    const len = 2 + Math.floor(rng() * 4);
    ctx.fillStyle = p.glitch2;
    ctx.globalAlpha = 0.5;
    for (let dy = 0; dy < len; dy++) {
      if (25 + dy < SIZE) {
        ctx.fillRect(x, 25 + dy, 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  }

  // Floating particles
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(rng() * SIZE);
    const y = Math.floor(rng() * 8);
    ctx.fillStyle = [p.glitch1, p.glitch2, p.inside][Math.floor(rng() * 3)];
    ctx.globalAlpha = 0.4 + rng() * 0.4;
    ctx.fillRect(x, y, 1, 1);
    ctx.globalAlpha = 1;
  }
}

// Generate variants
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

const variants = [
  { name: 'angry', variant: 0, seed: 42, glitch: 5 },
  { name: 'chaotic', variant: 1, seed: 137, glitch: 8 },
  { name: 'cyclops', variant: 2, seed: 256, glitch: 4 },
  { name: 'void', variant: 3, seed: 666, glitch: 10 },
  { name: 'chaotic-alt', variant: 1, seed: 999, glitch: 12 },
  { name: 'angry-glitched', variant: 0, seed: 1337, glitch: 15 },
];

variants.forEach(({ name, variant, seed, glitch }) => {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const rng = seededRng(seed);

  drawBreadLoaf(ctx, BREAD_PALETTE, rng, variant);
  addGlitchEffects(ctx, rng, BREAD_PALETTE, glitch);
  addXCOPYVibes(ctx, rng, BREAD_PALETTE);

  // Scale up with nearest-neighbor
  const outCanvas = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const outCtx = outCanvas.getContext('2d');
  outCtx.imageSmoothingEnabled = false;
  outCtx.drawImage(canvas, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  const filename = `breadio-${name}.png`;
  fs.writeFileSync(path.join(outputDir, filename), outCanvas.toBuffer('image/png'));
  console.log(`Generated: ${filename}`);
});

console.log('\nDone! Check output/ for Breadio PFPs');
