#!/usr/bin/env node
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 32;
const OUTPUT_SIZE = 512;

const BREAD_PALETTE = {
  crust: '#8B4513', crustLight: '#A0522D', crustDark: '#5C2E0A',
  inside: '#F5DEB3', insideLight: '#FAEBD7', insideDark: '#DEB887',
  bg: '#0a0a0a',
  glitch1: '#00ffff', glitch2: '#ff00ff', glitch3: '#ff0000',
  eye: '#ff3333', eyeGlow: '#ff0000', static: '#333333',
};

function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
}

function drawBreadLoaf(ctx, p, rng) {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Main body
  ctx.fillStyle = p.crust;
  ctx.fillRect(7, 12, 18, 12);
  ctx.fillRect(8, 10, 16, 2);
  ctx.fillRect(9, 8, 14, 2);
  ctx.fillRect(10, 7, 12, 1);
  ctx.fillRect(8, 24, 16, 1);

  // Inner crumb
  ctx.fillStyle = p.inside;
  ctx.fillRect(9, 13, 14, 10);
  ctx.fillRect(10, 11, 12, 2);

  // Texture
  ctx.fillStyle = p.insideDark;
  for (let i = 0; i < 8; i++) {
    ctx.fillRect(10 + Math.floor(rng() * 12), 13 + Math.floor(rng() * 9), 1, 1);
  }

  // Crust shading
  ctx.fillStyle = p.crustDark;
  ctx.fillRect(7, 23, 18, 1);
  ctx.fillRect(7, 12, 1, 12);
  ctx.fillRect(24, 12, 1, 12);

  // X eyes
  ctx.fillStyle = p.eye;
  ctx.fillRect(12, 15, 1, 1); ctx.fillRect(14, 15, 1, 1);
  ctx.fillRect(13, 16, 1, 1);
  ctx.fillRect(12, 17, 1, 1); ctx.fillRect(14, 17, 1, 1);
  ctx.fillRect(18, 15, 1, 1); ctx.fillRect(20, 15, 1, 1);
  ctx.fillRect(19, 16, 1, 1);
  ctx.fillRect(18, 17, 1, 1); ctx.fillRect(20, 17, 1, 1);

  // Wide grin with teeth
  ctx.fillStyle = '#000000';
  ctx.fillRect(12, 20, 9, 1);
  ctx.fillRect(13, 21, 7, 1);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(14, 20, 1, 1);
  ctx.fillRect(16, 20, 1, 1);
  ctx.fillRect(18, 20, 1, 1);
}

function heavyGlitch(ctx, rng, p) {
  // === SCAN LINES (more frequent) ===
  for (let y = 0; y < SIZE; y++) {
    if (rng() < 0.4) {
      ctx.fillStyle = `rgba(0,0,0,${0.1 + rng() * 0.2})`;
      ctx.fillRect(0, y, SIZE, 1);
    }
  }

  // === HEAVY DISPLACEMENT ===
  const imageData = ctx.getImageData(0, 0, SIZE, SIZE);
  const data = imageData.data;
  const copy = new Uint8ClampedArray(data);

  // Shift more rows, bigger offsets
  for (let y = 0; y < SIZE; y++) {
    if (rng() < 0.35) {
      const shift = Math.floor(rng() * 8) - 4;
      if (shift === 0) continue;
      for (let x = 0; x < SIZE; x++) {
        const srcX = ((x - shift) + SIZE) % SIZE;
        const dstIdx = (y * SIZE + x) * 4;
        const srcIdx = (y * SIZE + srcX) * 4;
        data[dstIdx] = copy[srcIdx];
        data[dstIdx + 1] = copy[srcIdx + 1];
        data[dstIdx + 2] = copy[srcIdx + 2];
        data[dstIdx + 3] = copy[srcIdx + 3];
      }
    }
  }

  // === RGB CHANNEL SPLIT ===
  // Offset red channel left, blue channel right
  const split = 1 + Math.floor(rng() * 2);
  const finalData = new Uint8ClampedArray(data);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const idx = (y * SIZE + x) * 4;
      // Red from left
      const rxSrc = ((x + split) % SIZE);
      const rIdx = (y * SIZE + rxSrc) * 4;
      finalData[idx] = data[rIdx]; // R from shifted
      // Blue from right
      const bxSrc = ((x - split + SIZE) % SIZE);
      const bIdx = (y * SIZE + bxSrc) * 4;
      finalData[idx + 2] = data[bIdx + 2]; // B from shifted
    }
  }
  for (let i = 0; i < finalData.length; i++) data[i] = finalData[i];

  ctx.putImageData(imageData, 0, 0);

  // === GLITCH BLOCKS (bigger, more) ===
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(rng() * SIZE);
    const y = Math.floor(rng() * SIZE);
    const w = 2 + Math.floor(rng() * 8);
    const h = 1 + Math.floor(rng() * 3);
    ctx.fillStyle = [p.glitch1, p.glitch2, p.glitch3][Math.floor(rng() * 3)];
    ctx.globalAlpha = 0.2 + rng() * 0.35;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
  }

  // === STATIC NOISE (more) ===
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(rng() * SIZE);
    const y = Math.floor(rng() * SIZE);
    ctx.fillStyle = rng() > 0.5 ? '#ffffff' : p.static;
    ctx.globalAlpha = 0.15 + rng() * 0.35;
    ctx.fillRect(x, y, 1, 1);
    ctx.globalAlpha = 1;
  }

  // === DRIP/MELT effect ===
  for (let i = 0; i < 5; i++) {
    const x = 9 + Math.floor(rng() * 14);
    const len = 3 + Math.floor(rng() * 5);
    ctx.fillStyle = [p.glitch2, p.crust, p.inside][Math.floor(rng() * 3)];
    ctx.globalAlpha = 0.4 + rng() * 0.3;
    for (let dy = 0; dy < len; dy++) {
      if (24 + dy < SIZE) ctx.fillRect(x, 24 + dy, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  // === FLOATING PARTICLES ===
  for (let i = 0; i < 8; i++) {
    const x = Math.floor(rng() * SIZE);
    const y = Math.floor(rng() * 7);
    ctx.fillStyle = [p.glitch1, p.glitch2, p.inside, p.eye][Math.floor(rng() * 4)];
    ctx.globalAlpha = 0.3 + rng() * 0.5;
    ctx.fillRect(x, y, 1, 1);
    ctx.globalAlpha = 1;
  }

  // === CORRUPTION BARS ===
  for (let i = 0; i < 2; i++) {
    const y = Math.floor(rng() * SIZE);
    const h = 1;
    ctx.fillStyle = [p.glitch1, p.glitch2][Math.floor(rng() * 2)];
    ctx.globalAlpha = 0.15;
    ctx.fillRect(0, y, SIZE, h);
    ctx.globalAlpha = 1;
  }
}

const outputDir = path.join(__dirname, 'output');
const variants = [
  { name: 'abstract-1', seed: 137 },
  { name: 'abstract-2', seed: 420 },
  { name: 'abstract-3', seed: 808 },
  { name: 'abstract-4', seed: 1337 },
  { name: 'abstract-5', seed: 2026 },
  { name: 'abstract-6', seed: 6969 },
];

variants.forEach(({ name, seed }) => {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const rng = seededRng(seed);

  drawBreadLoaf(ctx, BREAD_PALETTE, rng);
  heavyGlitch(ctx, rng, BREAD_PALETTE);

  const outCanvas = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const outCtx = outCanvas.getContext('2d');
  outCtx.imageSmoothingEnabled = false;
  outCtx.drawImage(canvas, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  const filename = `breadio-${name}.png`;
  fs.writeFileSync(path.join(outputDir, filename), outCanvas.toBuffer('image/png'));
  console.log(`Generated: ${filename}`);
});
