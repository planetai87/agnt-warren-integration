#!/usr/bin/env node
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 32;
const OUTPUT_SIZE = 512;

// === PALETTES ===
const PALETTES = {
  cyber: {
    bg: '#0a0a0a', bgAlt: '#0d1117', primary: '#00ffff', secondary: '#ff00ff',
    dark: '#1a1a1a', light: '#ffffff', accent: '#00ff88', glitch: '#ff00ff'
  },
  gold: {
    bg: '#0a0808', bgAlt: '#12100a', primary: '#ffd700', secondary: '#ff6b35',
    dark: '#2a1a0a', light: '#fff8dc', accent: '#ffaa00', glitch: '#ff00ff'
  },
  ghost: {
    bg: '#0a0a0f', bgAlt: '#0f0f14', primary: '#e0e0e0', secondary: '#8888aa',
    dark: '#2a2a3a', light: '#ffffff', accent: '#aabbcc', glitch: '#ff00ff'
  },
  void: {
    bg: '#050510', bgAlt: '#0a0818', primary: '#8800ff', secondary: '#4400aa',
    dark: '#1a0a2a', light: '#cc88ff', accent: '#ff00aa', glitch: '#00ffff'
  },
  blood: {
    bg: '#0a0505', bgAlt: '#100808', primary: '#ff0000', secondary: '#880000',
    dark: '#2a0a0a', light: '#ff8888', accent: '#ff4444', glitch: '#ffffff'
  },
  matrix: {
    bg: '#000a00', bgAlt: '#001000', primary: '#00ff00', secondary: '#008800',
    dark: '#002200', light: '#88ff88', accent: '#00ff44', glitch: '#ff00ff'
  },
  grey: {
    bg: '#0a0a0a', bgAlt: '#101010', primary: '#7a7a7a', secondary: '#4a4a4a',
    dark: '#2a2a2a', light: '#9a9a9a', accent: '#00ffff', glitch: '#ff00ff'
  }
};

// === HEAD SHAPES ===
const HEAD_SHAPES = {
  organic: (ctx, rng, p) => {
    // Rounded, flowing blocks
    for (let i = 0; i < 25; i++) {
      const x = 8 + Math.floor(rng() * 16);
      const y = 8 + Math.floor(rng() * 16);
      const w = 2 + Math.floor(rng() * 4);
      const h = 1 + Math.floor(rng() * 3);
      ctx.fillStyle = [p.primary, p.secondary, p.dark][Math.floor(rng() * 3)];
      ctx.fillRect(x, y, w, h);
    }
  },
  angular: (ctx, rng, p) => {
    // Sharp, geometric blocks
    for (let i = 0; i < 20; i++) {
      const x = 6 + Math.floor(rng() * 20);
      const y = 6 + Math.floor(rng() * 18);
      const size = 1 + Math.floor(rng() * 3);
      ctx.fillStyle = [p.primary, p.secondary][Math.floor(rng() * 2)];
      ctx.fillRect(x, y, size, size);
    }
  },
  fragmented: (ctx, rng, p) => {
    // Broken, scattered pieces
    for (let i = 0; i < 35; i++) {
      const x = 4 + Math.floor(rng() * 24);
      const y = 4 + Math.floor(rng() * 24);
      const w = 1 + Math.floor(rng() * 5);
      const h = 1 + Math.floor(rng() * 2);
      ctx.fillStyle = [p.primary, p.secondary, p.light, p.dark][Math.floor(rng() * 4)];
      ctx.fillRect(x, y, w, h);
    }
  },
  skull: (ctx, rng, p) => {
    // Skull-like form
    ctx.fillStyle = p.light;
    ctx.fillRect(10, 8, 12, 14);
    ctx.fillStyle = p.dark;
    ctx.fillRect(11, 10, 4, 4); // left eye socket
    ctx.fillRect(17, 10, 4, 4); // right eye socket
    ctx.fillRect(14, 16, 4, 2); // nose
    ctx.fillRect(12, 20, 8, 2); // teeth line
    // Add fragmentation
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = rng() > 0.5 ? p.primary : p.bg;
      ctx.fillRect(8 + Math.floor(rng() * 16), 6 + Math.floor(rng() * 18), 2, 1);
    }
  },
  block: (ctx, rng, p) => {
    // Solid, heavy blocks
    ctx.fillStyle = p.primary;
    ctx.fillRect(8, 8, 16, 16);
    ctx.fillStyle = p.secondary;
    ctx.fillRect(10, 10, 12, 12);
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = p.dark;
      ctx.fillRect(8 + Math.floor(rng() * 16), 8 + Math.floor(rng() * 16), 3, 2);
    }
  }
};

// === EYE STYLES ===
const EYE_STYLES = {
  dots: (ctx, rng, p) => {
    ctx.fillStyle = p.light;
    ctx.fillRect(11, 14, 2, 2);
    ctx.fillRect(19, 14, 2, 2);
  },
  slits: (ctx, rng, p) => {
    ctx.fillStyle = p.accent;
    ctx.fillRect(10, 14, 4, 2);
    ctx.fillRect(18, 14, 4, 2);
    ctx.fillStyle = p.bg;
    ctx.fillRect(12, 14, 1, 2);
    ctx.fillRect(20, 14, 1, 2);
  },
  scanner: (ctx, rng, p) => {
    ctx.fillStyle = p.accent;
    ctx.fillRect(9, 14, 6, 1);
    ctx.fillRect(17, 14, 6, 1);
    ctx.fillStyle = p.light;
    ctx.fillRect(10 + Math.floor(rng() * 4), 14, 1, 1);
    ctx.fillRect(18 + Math.floor(rng() * 4), 14, 1, 1);
  },
  hollow: (ctx, rng, p) => {
    ctx.fillStyle = p.bg;
    ctx.fillRect(10, 13, 4, 4);
    ctx.fillRect(18, 13, 4, 4);
  },
  xEyes: (ctx, rng, p) => {
    ctx.fillStyle = p.light;
    ctx.fillRect(10, 13, 1, 1); ctx.fillRect(13, 13, 1, 1);
    ctx.fillRect(11, 14, 2, 1);
    ctx.fillRect(10, 15, 1, 1); ctx.fillRect(13, 15, 1, 1);
    ctx.fillRect(18, 13, 1, 1); ctx.fillRect(21, 13, 1, 1);
    ctx.fillRect(19, 14, 2, 1);
    ctx.fillRect(18, 15, 1, 1); ctx.fillRect(21, 15, 1, 1);
  },
  glow: (ctx, rng, p) => {
    ctx.fillStyle = p.accent;
    ctx.fillRect(9, 13, 5, 3);
    ctx.fillRect(18, 13, 5, 3);
    ctx.fillStyle = p.light;
    ctx.fillRect(11, 14, 2, 1);
    ctx.fillRect(20, 14, 2, 1);
  }
};

// === ACCESSORIES ===
const ACCESSORIES = {
  goggles: (ctx, rng, p) => {
    ctx.fillStyle = p.dark;
    ctx.fillRect(7, 11, 18, 2);
    ctx.fillRect(8, 10, 5, 4);
    ctx.fillRect(19, 10, 5, 4);
    ctx.fillStyle = p.accent;
    ctx.fillRect(9, 11, 3, 2);
    ctx.fillRect(20, 11, 3, 2);
  },
  chain: (ctx, rng, p) => {
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(12 + Math.floor(rng() * 2), 25, 2, 1);
    ctx.fillRect(13, 26, 6, 1);
    ctx.fillRect(18 + Math.floor(rng() * 2), 25, 2, 1);
  },
  horns: (ctx, rng, p) => {
    ctx.fillStyle = p.secondary;
    ctx.fillRect(6, 4, 2, 6);
    ctx.fillRect(5, 5, 1, 4);
    ctx.fillRect(24, 4, 2, 6);
    ctx.fillRect(26, 5, 1, 4);
  },
  halo: (ctx, rng, p) => {
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(10, 3, 12, 1);
    ctx.fillRect(9, 4, 1, 1);
    ctx.fillRect(22, 4, 1, 1);
  },
  crown: (ctx, rng, p) => {
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(10, 4, 12, 3);
    ctx.fillRect(11, 2, 2, 2);
    ctx.fillRect(15, 1, 2, 3);
    ctx.fillRect(19, 2, 2, 2);
  },
  mask: (ctx, rng, p) => {
    ctx.fillStyle = p.dark;
    ctx.fillRect(8, 12, 16, 8);
    ctx.fillStyle = p.accent;
    ctx.fillRect(10, 14, 3, 2);
    ctx.fillRect(19, 14, 3, 2);
  },
  ears: (ctx, rng, p) => {
    ctx.fillStyle = p.primary;
    ctx.fillRect(7, 5, 4, 4);
    ctx.fillRect(8, 6, 3, 3);
    ctx.fillRect(21, 5, 4, 4);
    ctx.fillRect(21, 6, 3, 3);
    ctx.fillStyle = '#cc8899';
    ctx.fillRect(8, 6, 2, 2);
    ctx.fillRect(22, 6, 2, 2);
  }
};

// === BACKGROUND STYLES ===
const BG_STYLES = {
  solid: (ctx, rng, p) => {
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, SIZE, SIZE);
  },
  noise: (ctx, rng, p) => {
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(255,255,255,${rng() * 0.08})`;
      ctx.fillRect(Math.floor(rng() * SIZE), Math.floor(rng() * SIZE), 1, 1);
    }
  },
  gradient: (ctx, rng, p) => {
    for (let y = 0; y < SIZE; y++) {
      const t = y / SIZE;
      ctx.fillStyle = t < 0.5 ? p.bg : p.bgAlt;
      ctx.fillRect(0, y, SIZE, 1);
    }
  },
  grid: (ctx, rng, p) => {
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = p.bgAlt;
    for (let x = 0; x < SIZE; x += 4) {
      ctx.fillRect(x, 0, 1, SIZE);
    }
    for (let y = 0; y < SIZE; y += 4) {
      ctx.fillRect(0, y, SIZE, 1);
    }
  }
};

// === MAIN GENERATOR ===
function generatePFP(options = {}) {
  const {
    name = 'agent',
    palette = 'cyber',
    headShape = 'organic',
    eyeStyle = 'dots',
    accessories = [],
    glitchLevel = 'medium',
    bgStyle = 'noise',
    variant = 0
  } = options;

  const p = PALETTES[palette] || PALETTES.cyber;
  
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  
  // Seeded RNG
  const seed = hashCode(name) + variant * 7777;
  let s = seed;
  const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };

  // Background
  (BG_STYLES[bgStyle] || BG_STYLES.noise)(ctx, rng, p);

  // Head shape
  (HEAD_SHAPES[headShape] || HEAD_SHAPES.organic)(ctx, rng, p);

  // Eyes
  (EYE_STYLES[eyeStyle] || EYE_STYLES.dots)(ctx, rng, p);

  // Accessories
  for (const acc of accessories) {
    if (ACCESSORIES[acc]) ACCESSORIES[acc](ctx, rng, p);
  }

  // Glitch line
  const glitchIntensity = { low: 0.3, medium: 0.6, high: 1.0 }[glitchLevel] || 0.6;
  if (rng() < glitchIntensity) {
    ctx.fillStyle = p.glitch;
    const glitchY = 8 + Math.floor(rng() * 16);
    ctx.globalAlpha = 0.7;
    ctx.fillRect(0, glitchY, SIZE, 1);
    ctx.globalAlpha = 0.4;
    ctx.fillRect(Math.floor(rng() * 8), glitchY + 1, SIZE / 2, 1);
    ctx.globalAlpha = 1;
  }

  // Scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
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

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// === CLI ===
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    name: 'agent',
    palette: 'cyber',
    headShape: 'organic',
    eyeStyle: 'dots',
    accessories: [],
    glitchLevel: 'medium',
    bgStyle: 'noise',
    variants: 4,
    output: './output'
  };

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const val = args[i + 1];
    if (key === 'accessories') {
      options.accessories = val.split(',');
    } else if (key === 'variants') {
      options.variants = parseInt(val);
    } else {
      options[key] = val;
    }
  }

  if (!fs.existsSync(options.output)) fs.mkdirSync(options.output, { recursive: true });

  for (let v = 0; v < options.variants; v++) {
    const canvas = generatePFP({ ...options, variant: v });
    const filename = `${options.name}-pfp-${v + 1}.png`;
    fs.writeFileSync(path.join(options.output, filename), canvas.toBuffer('image/png'));
    console.log(`Generated: ${filename}`);
  }

  console.log(`\n✅ ${options.variants} PFPs generated in ${options.output}/`);
}

module.exports = { generatePFP, PALETTES, HEAD_SHAPES, EYE_STYLES, ACCESSORIES, BG_STYLES };
