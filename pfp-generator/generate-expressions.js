const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 32;
const OUTPUT_SIZE = 512;

const AY_PALETTE = { bg: '#050508', primary: '#00cccc', secondary: '#ccaa00', accent: '#ffffff' };

function generateExpression(expression, seed) {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  
  let s = seed;
  const random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  
  // Expression parameters
  const params = {
    calm: { fragments: 30, goldRatio: 0.2, eyeWidth: 4, eyeHeight: 1, glitchLines: 0, drift: 0 },
    focused: { fragments: 45, goldRatio: 0.35, eyeWidth: 2, eyeHeight: 2, glitchLines: 1, drift: 0 },
    alert: { fragments: 55, goldRatio: 0.4, eyeWidth: 5, eyeHeight: 2, glitchLines: 1, drift: -2 },
    processing: { fragments: 60, goldRatio: 0.15, eyeWidth: 3, eyeHeight: 1, glitchLines: 2, drift: 0 },
    agitated: { fragments: 70, goldRatio: 0.5, eyeWidth: 4, eyeHeight: 2, glitchLines: 4, drift: 0 },
    melancholy: { fragments: 35, goldRatio: 0.25, eyeWidth: 3, eyeHeight: 1, glitchLines: 1, drift: 3 }
  }[expression];
  
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
  
  // Fragmented head with drift
  for (let i = 0; i < params.fragments; i++) {
    ctx.fillStyle = random() > (1 - params.goldRatio) ? AY_PALETTE.secondary : AY_PALETTE.primary;
    
    const x = 7 + Math.floor(random() * 18);
    let y = 5 + Math.floor(random() * 22);
    y += params.drift; // Apply vertical drift
    
    const size = 1 + Math.floor(random() * 3);
    
    if (random() > 0.85) {
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = AY_PALETTE.bg;
      ctx.fillRect(x + 1, y + 1, Math.max(0, size - 2), Math.max(0, size - 2));
    } else {
      ctx.fillRect(x, y, size, size);
    }
  }
  
  // Eyes - expression-specific
  ctx.fillStyle = AY_PALETTE.secondary;
  const eyeY = 12 + Math.floor(random() * 2);
  
  // Left eye
  ctx.fillRect(9, eyeY, params.eyeWidth, params.eyeHeight);
  // Right eye
  ctx.fillRect(23 - params.eyeWidth - 3, eyeY, params.eyeWidth, params.eyeHeight);
  
  // Eye glow/highlight
  ctx.fillStyle = AY_PALETTE.accent;
  ctx.fillRect(10, eyeY, 1, 1);
  ctx.fillRect(19, eyeY, 1, 1);
  
  // Glitch lines based on expression
  for (let g = 0; g < params.glitchLines; g++) {
    const y = Math.floor(random() * SIZE);
    const shift = Math.floor((random() - 0.5) * 6);
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
  
  // Scale up crisp
  const outputCanvas = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const outCtx = outputCanvas.getContext('2d');
  outCtx.imageSmoothingEnabled = false;
  outCtx.drawImage(canvas, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  
  return outputCanvas;
}

const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

const expressions = ['calm', 'focused', 'alert', 'processing', 'agitated', 'melancholy'];

console.log('Generating Ay expressions...\n');

expressions.forEach((expr, i) => {
  const canvas = generateExpression(expr, 500 + i * 33);
  const filename = `ay-${expr}.png`;
  fs.writeFileSync(path.join(outputDir, filename), canvas.toBuffer('image/png'));
  console.log(`✓ ${expr}`);
});

console.log('\nDone!');
