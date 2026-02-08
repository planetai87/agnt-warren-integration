#!/usr/bin/env node
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 32;
const OUTPUT_SIZE = 512;

const P = {
  crust: '#8B4513', crustLight: '#A0522D', crustDark: '#5C2E0A',
  inside: '#F5DEB3', insideLight: '#FAEBD7', insideDark: '#DEB887',
  bg: '#0a0a0a',
  glitch1: '#00ffff', glitch2: '#ff00ff', glitch3: '#ff3333',
  eye: '#ff3333', static: '#222222',
};

function rngFactory(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

function drawBread(ctx, rng) {
  ctx.fillStyle = P.bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Crust body
  ctx.fillStyle = P.crust;
  ctx.fillRect(7, 12, 18, 12);
  ctx.fillRect(8, 10, 16, 2);
  ctx.fillRect(9, 8, 14, 2);
  ctx.fillRect(10, 7, 12, 1);
  ctx.fillRect(8, 24, 16, 1);

  // Crumb
  ctx.fillStyle = P.inside;
  ctx.fillRect(9, 13, 14, 10);
  ctx.fillRect(10, 11, 12, 2);

  // Crumb texture
  ctx.fillStyle = P.insideDark;
  for (let i = 0; i < 10; i++) {
    ctx.fillRect(10 + Math.floor(rng() * 12), 13 + Math.floor(rng() * 9), 1, 1);
  }

  // Crust edges
  ctx.fillStyle = P.crustDark;
  ctx.fillRect(7, 23, 18, 1);
  ctx.fillRect(7, 12, 1, 12);
  ctx.fillRect(24, 12, 1, 12);
  ctx.fillRect(9, 7, 1, 1);
  ctx.fillRect(22, 7, 1, 1);

  // X eyes
  ctx.fillStyle = P.eye;
  ctx.fillRect(12, 15, 1, 1); ctx.fillRect(14, 15, 1, 1);
  ctx.fillRect(13, 16, 1, 1);
  ctx.fillRect(12, 17, 1, 1); ctx.fillRect(14, 17, 1, 1);
  ctx.fillRect(18, 15, 1, 1); ctx.fillRect(20, 15, 1, 1);
  ctx.fillRect(19, 16, 1, 1);
  ctx.fillRect(18, 17, 1, 1); ctx.fillRect(20, 17, 1, 1);

  // Grin
  ctx.fillStyle = '#000000';
  ctx.fillRect(12, 20, 9, 1);
  ctx.fillRect(13, 21, 7, 1);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(14, 20, 1, 1);
  ctx.fillRect(16, 20, 1, 1);
  ctx.fillRect(18, 20, 1, 1);
}

function glitchPass(ctx, rng, level) {
  // Scanlines
  for (let y = 0; y < SIZE; y += 2) {
    ctx.fillStyle = `rgba(0,0,0,0.12)`;
    ctx.fillRect(0, y, SIZE, 1);
  }

  // Horizontal displacement (controlled)
  const imgData = ctx.getImageData(0, 0, SIZE, SIZE);
  const d = imgData.data;
  const orig = new Uint8ClampedArray(d);

  const numShifts = 3 + level * 2;
  for (let i = 0; i < numShifts; i++) {
    const y = Math.floor(rng() * SIZE);
    const shift = (rng() > 0.5 ? 1 : -1) * (1 + Math.floor(rng() * (1 + level)));
    for (let x = 0; x < SIZE; x++) {
      const srcX = ((x - shift) + SIZE) % SIZE;
      const di = (y * SIZE + x) * 4;
      const si = (y * SIZE + srcX) * 4;
      d[di] = orig[si]; d[di+1] = orig[si+1]; d[di+2] = orig[si+2]; d[di+3] = orig[si+3];
    }
  }

  // Subtle RGB offset (only 1px, partial opacity via blend)
  if (level >= 2) {
    for (let y = 0; y < SIZE; y++) {
      if (rng() < 0.25) {
        for (let x = 0; x < SIZE; x++) {
          const idx = (y * SIZE + x) * 4;
          const rSrc = (y * SIZE + ((x + 1) % SIZE)) * 4;
          const bSrc = (y * SIZE + ((x - 1 + SIZE) % SIZE)) * 4;
          // Blend 30% shifted channel
          d[idx] = Math.round(d[idx] * 0.7 + orig[rSrc] * 0.3);
          d[idx + 2] = Math.round(d[idx + 2] * 0.7 + orig[bSrc + 2] * 0.3);
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Glitch accent blocks (fewer, on-palette)
  const blocks = 2 + level;
  for (let i = 0; i < blocks; i++) {
    const x = Math.floor(rng() * SIZE);
    const y = Math.floor(rng() * SIZE);
    const w = 1 + Math.floor(rng() * 4);
    ctx.fillStyle = [P.glitch1, P.glitch2][Math.floor(rng() * 2)];
    ctx.globalAlpha = 0.15 + rng() * 0.2;
    ctx.fillRect(x, y, w, 1);
    ctx.globalAlpha = 1;
  }

  // Static dots
  const dots = 10 + level * 5;
  for (let i = 0; i < dots; i++) {
    ctx.fillStyle = rng() > 0.6 ? '#ffffff' : P.static;
    ctx.globalAlpha = 0.1 + rng() * 0.25;
    ctx.fillRect(Math.floor(rng() * SIZE), Math.floor(rng() * SIZE), 1, 1);
    ctx.globalAlpha = 1;
  }

  // Drip/melt from bottom
  for (let i = 0; i < 2 + level; i++) {
    const x = 9 + Math.floor(rng() * 14);
    const len = 2 + Math.floor(rng() * 4);
    ctx.fillStyle = [P.glitch2, P.crustDark][Math.floor(rng() * 2)];
    ctx.globalAlpha = 0.5;
    for (let dy = 0; dy < len && 24 + dy < SIZE; dy++) {
      ctx.fillRect(x, 24 + dy, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  // Floating particles above
  for (let i = 0; i < 3 + level; i++) {
    ctx.fillStyle = [P.glitch1, P.glitch2, P.inside][Math.floor(rng() * 3)];
    ctx.globalAlpha = 0.3 + rng() * 0.4;
    ctx.fillRect(Math.floor(rng() * SIZE), Math.floor(rng() * 6), 1, 1);
    ctx.globalAlpha = 1;
  }
}

const outputDir = path.join(__dirname, 'output');

// 3 levels: mild, medium, heavy
const variants = [
  { name: 'v2-mild-a', seed: 137, level: 1 },
  { name: 'v2-mild-b', seed: 303, level: 1 },
  { name: 'v2-med-a', seed: 420, level: 2 },
  { name: 'v2-med-b', seed: 808, level: 2 },
  { name: 'v2-heavy-a', seed: 1337, level: 3 },
  { name: 'v2-heavy-b', seed: 2026, level: 3 },
];

variants.forEach(({ name, seed, level }) => {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const rng = rngFactory(seed);

  drawBread(ctx, rng);
  glitchPass(ctx, rng, level);

  const out = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const oc = out.getContext('2d');
  oc.imageSmoothingEnabled = false;
  oc.drawImage(canvas, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  const fn = `breadio-${name}.png`;
  fs.writeFileSync(path.join(outputDir, fn), out.toBuffer('image/png'));
  console.log(`Generated: ${fn}`);
});
