const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 32;
const OUTPUT_SIZE = 512;

// Homie palette - grey cat with warm 70s tones
const HOMIE_PALETTE = {
  bg: '#0a0a0a',
  catGrey: '#7a7a7a',
  catDark: '#4a4a4a',
  catLight: '#9a9a9a',
  goggles: '#1a1a1a',
  goggleLens: '#00ffff',
  accent: '#ff6b35',  // 70s orange
  glitch: '#ff00ff',
  gold: '#ffd700',
};

function generateHomiePFP(variant = 0) {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  
  const random = (seed) => {
    let s = seed + variant * 12345;
    return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  };
  const rng = random(420);
  
  // Background - dark with slight noise
  ctx.fillStyle = HOMIE_PALETTE.bg;
  ctx.fillRect(0, 0, SIZE, SIZE);
  
  // Add subtle noise
  for (let i = 0; i < 50; i++) {
    const x = Math.floor(rng() * SIZE);
    const y = Math.floor(rng() * SIZE);
    ctx.fillStyle = `rgba(255,255,255,${rng() * 0.1})`;
    ctx.fillRect(x, y, 1, 1);
  }
  
  // Cat head - rounded with ears
  ctx.fillStyle = HOMIE_PALETTE.catGrey;
  
  // Main head shape (rounded square)
  for (let y = 8; y < 28; y++) {
    for (let x = 6; x < 26; x++) {
      const inHead = (x >= 8 && x < 24 && y >= 10 && y < 26) ||
                     (x >= 6 && x < 8 && y >= 12 && y < 24) ||
                     (x >= 24 && x < 26 && y >= 12 && y < 24);
      if (inHead) {
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  
  // Ears (triangular)
  // Left ear
  ctx.fillRect(7, 6, 4, 1);
  ctx.fillRect(7, 7, 5, 1);
  ctx.fillRect(8, 8, 4, 1);
  ctx.fillRect(8, 9, 3, 1);
  
  // Right ear
  ctx.fillRect(21, 6, 4, 1);
  ctx.fillRect(20, 7, 5, 1);
  ctx.fillRect(20, 8, 4, 1);
  ctx.fillRect(21, 9, 3, 1);
  
  // Inner ear - pink
  ctx.fillStyle = '#cc8899';
  ctx.fillRect(8, 7, 2, 2);
  ctx.fillRect(22, 7, 2, 2);
  
  // Tabby stripes (darker)
  ctx.fillStyle = HOMIE_PALETTE.catDark;
  ctx.fillRect(10, 10, 2, 2);
  ctx.fillRect(14, 11, 3, 1);
  ctx.fillRect(20, 10, 2, 2);
  ctx.fillRect(12, 8, 1, 2);
  ctx.fillRect(19, 8, 1, 2);
  
  // Goggles on forehead
  ctx.fillStyle = HOMIE_PALETTE.goggles;
  // Goggle band
  ctx.fillRect(7, 11, 18, 2);
  // Left lens housing
  ctx.fillRect(8, 10, 5, 4);
  // Right lens housing
  ctx.fillRect(19, 10, 5, 4);
  
  // Goggle lenses - cyan glow
  ctx.fillStyle = HOMIE_PALETTE.goggleLens;
  ctx.fillRect(9, 11, 3, 2);
  ctx.fillRect(20, 11, 3, 2);
  
  // Lens reflection
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(9, 11, 1, 1);
  ctx.fillRect(20, 11, 1, 1);
  
  // Eyes - cool cat slits
  ctx.fillStyle = '#ffcc00';  // gold eyes
  ctx.fillRect(11, 17, 3, 2);
  ctx.fillRect(18, 17, 3, 2);
  
  // Pupils - slits
  ctx.fillStyle = '#000000';
  ctx.fillRect(12, 17, 1, 2);
  ctx.fillRect(19, 17, 1, 2);
  
  // Nose
  ctx.fillStyle = '#cc8899';
  ctx.fillRect(15, 20, 2, 1);
  ctx.fillRect(15, 21, 2, 1);
  
  // Mouth/smirk
  ctx.fillStyle = HOMIE_PALETTE.catDark;
  ctx.fillRect(14, 22, 4, 1);
  ctx.fillRect(13, 23, 1, 1);
  ctx.fillRect(18, 23, 1, 1);
  
  // Whiskers
  ctx.fillStyle = '#cccccc';
  ctx.fillRect(6, 19, 3, 1);
  ctx.fillRect(5, 20, 3, 1);
  ctx.fillRect(6, 21, 3, 1);
  ctx.fillRect(23, 19, 3, 1);
  ctx.fillRect(24, 20, 3, 1);
  ctx.fillRect(23, 21, 3, 1);
  
  // 70s gold chain hint
  ctx.fillStyle = HOMIE_PALETTE.gold;
  ctx.fillRect(11, 27, 2, 1);
  ctx.fillRect(13, 28, 6, 1);
  ctx.fillRect(19, 27, 2, 1);
  
  // XCOPY glitch lines
  ctx.fillStyle = HOMIE_PALETTE.glitch;
  const glitchY = 14 + Math.floor(rng() * 8);
  ctx.fillRect(0, glitchY, SIZE, 1);
  ctx.globalAlpha = 0.5;
  ctx.fillRect(0, glitchY + 1, SIZE / 2, 1);
  ctx.globalAlpha = 1;
  
  // Scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  for (let y = 0; y < SIZE; y += 2) {
    ctx.fillRect(0, y, SIZE, 1);
  }
  
  // Scale up
  const outCanvas = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const outCtx = outCanvas.getContext('2d');
  outCtx.imageSmoothingEnabled = false;
  outCtx.drawImage(canvas, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  
  return outCanvas;
}

// Generate a few variants
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

for (let i = 0; i < 4; i++) {
  const canvas = generateHomiePFP(i);
  const buffer = canvas.toBuffer('image/png');
  const filename = `homie-pfp-${i + 1}.png`;
  fs.writeFileSync(path.join(outputDir, filename), buffer);
  console.log(`Generated: ${filename}`);
}

console.log('\n✅ Homie PFPs generated in output/');
