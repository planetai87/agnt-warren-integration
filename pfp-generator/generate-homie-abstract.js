const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 32;
const OUTPUT_SIZE = 512;

// Homie palette - grey cat with cyan goggles, 70s warmth
const PALETTE = {
  bg: '#0a0a0a',
  grey1: '#4a4a4a',
  grey2: '#6a6a6a', 
  grey3: '#8a8a8a',
  cyan: '#00ffff',
  cyanDark: '#008888',
  orange: '#ff6b35',
  gold: '#ffd700',
  magenta: '#ff00ff',
  pink: '#cc8899',  // inner ear / nose hint
};

function generateHomieAbstract(variant = 0) {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  
  // Seeded random
  const random = (seed) => {
    let s = seed + variant * 7777;
    return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  };
  const rng = random(420);
  
  // Dark background
  ctx.fillStyle = PALETTE.bg;
  ctx.fillRect(0, 0, SIZE, SIZE);
  
  // Subtle grid noise
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(rng() * SIZE);
    const y = Math.floor(rng() * SIZE);
    ctx.fillStyle = `rgba(255,255,255,${rng() * 0.05})`;
    ctx.fillRect(x, y, 1, 1);
  }
  
  // Abstract block placement - suggesting a form without being literal
  const blocks = [];
  
  // Core mass - grey blocks in center suggesting head shape
  const greys = [PALETTE.grey1, PALETTE.grey2, PALETTE.grey3];
  for (let i = 0; i < 25; i++) {
    const x = 8 + Math.floor(rng() * 16);
    const y = 8 + Math.floor(rng() * 18);
    const w = 1 + Math.floor(rng() * 4);
    const h = 1 + Math.floor(rng() * 3);
    blocks.push({ x, y, w, h, color: greys[Math.floor(rng() * greys.length)] });
  }
  
  // Ear hints - triangular-ish blocks at top
  // Left ear area
  blocks.push({ x: 7 + Math.floor(rng() * 2), y: 4 + Math.floor(rng() * 2), w: 2, h: 3, color: PALETTE.grey2 });
  blocks.push({ x: 8 + Math.floor(rng() * 2), y: 5, w: 2, h: 2, color: PALETTE.grey3 });
  blocks.push({ x: 9, y: 6, w: 1, h: 1, color: PALETTE.pink }); // inner ear hint
  
  // Right ear area
  blocks.push({ x: 22 + Math.floor(rng() * 2), y: 4 + Math.floor(rng() * 2), w: 2, h: 3, color: PALETTE.grey2 });
  blocks.push({ x: 21 + Math.floor(rng() * 2), y: 5, w: 2, h: 2, color: PALETTE.grey3 });
  blocks.push({ x: 22, y: 6, w: 1, h: 1, color: PALETTE.pink }); // inner ear hint
  
  // Goggle cyan - the key identifier, scattered but recognizable
  // Left goggle area
  blocks.push({ x: 9 + Math.floor(rng() * 2), y: 11 + Math.floor(rng() * 2), w: 3, h: 2, color: PALETTE.cyan });
  blocks.push({ x: 10, y: 12, w: 2, h: 1, color: PALETTE.cyanDark });
  blocks.push({ x: 8 + Math.floor(rng() * 2), y: 13, w: 2, h: 1, color: PALETTE.cyan });
  
  // Right goggle area
  blocks.push({ x: 19 + Math.floor(rng() * 2), y: 11 + Math.floor(rng() * 2), w: 3, h: 2, color: PALETTE.cyan });
  blocks.push({ x: 20, y: 12, w: 2, h: 1, color: PALETTE.cyanDark });
  blocks.push({ x: 21 + Math.floor(rng() * 2), y: 13, w: 2, h: 1, color: PALETTE.cyan });
  
  // Goggle band hint - dark line
  blocks.push({ x: 12 + Math.floor(rng() * 2), y: 12, w: 6, h: 1, color: PALETTE.grey1 });
  
  // Gold chain / 70s accent - bottom area
  blocks.push({ x: 12 + Math.floor(rng() * 3), y: 24 + Math.floor(rng() * 2), w: 3, h: 1, color: PALETTE.gold });
  blocks.push({ x: 14 + Math.floor(rng() * 2), y: 25, w: 4, h: 1, color: PALETTE.gold });
  blocks.push({ x: 16 + Math.floor(rng() * 2), y: 26, w: 2, h: 1, color: PALETTE.orange });
  
  // Orange 70s accents scattered
  for (let i = 0; i < 3; i++) {
    const x = 6 + Math.floor(rng() * 20);
    const y = 15 + Math.floor(rng() * 10);
    blocks.push({ x, y, w: 1 + Math.floor(rng() * 2), h: 1, color: PALETTE.orange });
  }
  
  // Whisker hints - thin grey lines extending
  blocks.push({ x: 4 + Math.floor(rng() * 2), y: 17 + Math.floor(rng() * 2), w: 3, h: 1, color: PALETTE.grey3 });
  blocks.push({ x: 5, y: 19, w: 2, h: 1, color: PALETTE.grey2 });
  blocks.push({ x: 25 + Math.floor(rng() * 2), y: 17 + Math.floor(rng() * 2), w: 3, h: 1, color: PALETTE.grey3 });
  blocks.push({ x: 26, y: 19, w: 2, h: 1, color: PALETTE.grey2 });
  
  // Shuffle and draw blocks
  blocks.sort(() => rng() - 0.5);
  for (const block of blocks) {
    ctx.fillStyle = block.color;
    ctx.fillRect(block.x, block.y, block.w, block.h);
  }
  
  // XCOPY glitch line
  ctx.fillStyle = PALETTE.magenta;
  const glitchY = 10 + Math.floor(rng() * 12);
  ctx.globalAlpha = 0.7;
  ctx.fillRect(0, glitchY, SIZE, 1);
  ctx.globalAlpha = 0.4;
  ctx.fillRect(Math.floor(rng() * 8), glitchY + 1, SIZE / 2, 1);
  ctx.globalAlpha = 1;
  
  // Scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  for (let y = 0; y < SIZE; y += 2) {
    ctx.fillRect(0, y, SIZE, 1);
  }
  
  // Scale up crisp
  const outCanvas = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const outCtx = outCanvas.getContext('2d');
  outCtx.imageSmoothingEnabled = false;
  outCtx.drawImage(canvas, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  
  return outCanvas;
}

// Generate variants
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

for (let i = 0; i < 6; i++) {
  const canvas = generateHomieAbstract(i);
  const buffer = canvas.toBuffer('image/png');
  const filename = `homie-abstract-${i + 1}.png`;
  fs.writeFileSync(path.join(outputDir, filename), buffer);
  console.log(`Generated: ${filename}`);
}

console.log('\n✅ Abstract Homie PFPs generated!');
