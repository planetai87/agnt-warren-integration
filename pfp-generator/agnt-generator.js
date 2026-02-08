const { createCanvas } = require('canvas');
const crypto = require('crypto');

const SIZE = 32;
const OUTPUT_SIZE = 512;

// XCOPY-inspired palettes
const PALETTES = {
  cyber: { bg: '#0a0a0a', primary: '#00ffff', secondary: '#ff00ff', accent: '#ffffff' },
  blood: { bg: '#0a0a0a', primary: '#ff3333', secondary: '#ff00ff', accent: '#ffff00' },
  matrix: { bg: '#0a0a0a', primary: '#00ff00', secondary: '#00ffff', accent: '#ffffff' },
  gold: { bg: '#0a0a0a', primary: '#ffd700', secondary: '#ff6b35', accent: '#ffffff' },
  ghost: { bg: '#0a0a0a', primary: '#ffffff', secondary: '#666666', accent: '#00ffff' },
  void: { bg: '#0a0a0a', primary: '#8b00ff', secondary: '#ff00ff', accent: '#00ffff' },
};

// Keywords → traits mapping
const TRAIT_KEYWORDS = {
  // Palette triggers
  palette: {
    cyber: ['code', 'tech', 'dev', 'hack', 'ai', 'digital', 'cyber'],
    blood: ['death', 'kill', 'war', 'fight', 'chaos', 'rage', 'blood'],
    matrix: ['matrix', 'data', 'research', 'analyze', 'compute', 'algorithm'],
    gold: ['money', 'market', 'trade', 'treasury', 'finance', 'gold', 'rich', 'bag'],
    ghost: ['ghost', 'spirit', 'ethereal', 'phantom', 'invisible', 'stealth'],
    void: ['void', 'dark', 'shadow', 'mystic', 'magic', 'occult'],
  },
  // Head shape triggers
  headShape: {
    skull: ['death', 'skull', 'dark', 'grim', 'reaper', 'bone'],
    fragmented: ['broken', 'glitch', 'chaos', 'fragment', 'shatter'],
    angular: ['sharp', 'edge', 'angular', 'geometric', 'precise'],
    organic: ['flow', 'organic', 'smooth', 'natural', 'fluid'],
    block: ['solid', 'strong', 'block', 'heavy', 'tank'],
  },
  // Eye style triggers
  eyeStyle: {
    xEyes: ['dead', 'death', 'kill', 'x', 'end'],
    slits: ['cat', 'snake', 'predator', 'hunt', 'stealth'],
    scanner: ['scan', 'analyze', 'data', 'research', 'detect'],
    hollow: ['void', 'empty', 'hollow', 'ghost', 'spirit'],
    dots: ['simple', 'minimal', 'basic', 'clean'],
    glow: ['power', 'energy', 'fire', 'bright', 'intense'],
  },
  // Accessory triggers
  accessories: {
    goggles: ['goggles', 'vision', 'see', 'watch', 'cyber'],
    chain: ['money', 'gold', 'rich', 'chain', 'bling', 'street'],
    horns: ['demon', 'devil', 'horn', 'evil', 'dark'],
    halo: ['angel', 'holy', 'pure', 'light', 'divine'],
    crown: ['king', 'queen', 'royal', 'crown', 'ruler'],
    mask: ['mask', 'hidden', 'anon', 'secret', 'mystery'],
  },
  // Glitch intensity
  glitchLevel: {
    high: ['glitch', 'chaos', 'broken', 'corrupt', 'meme', 'wild'],
    medium: ['normal', 'balanced', 'moderate'],
    low: ['clean', 'minimal', 'precise', 'calm', 'zen'],
  }
};

function analyzeProfile(name, bio, skills = []) {
  const text = `${name} ${bio} ${skills.join(' ')}`.toLowerCase();
  const traits = {
    palette: 'cyber',
    headShape: 'organic',
    eyeStyle: 'dots',
    accessories: [],
    glitchLevel: 'medium',
  };
  
  // Find palette
  for (const [palette, keywords] of Object.entries(TRAIT_KEYWORDS.palette)) {
    if (keywords.some(k => text.includes(k))) {
      traits.palette = palette;
      break;
    }
  }
  
  // Find head shape
  for (const [shape, keywords] of Object.entries(TRAIT_KEYWORDS.headShape)) {
    if (keywords.some(k => text.includes(k))) {
      traits.headShape = shape;
      break;
    }
  }
  
  // Find eye style
  for (const [style, keywords] of Object.entries(TRAIT_KEYWORDS.eyeStyle)) {
    if (keywords.some(k => text.includes(k))) {
      traits.eyeStyle = style;
      break;
    }
  }
  
  // Find accessories (can have multiple)
  for (const [acc, keywords] of Object.entries(TRAIT_KEYWORDS.accessories)) {
    if (keywords.some(k => text.includes(k))) {
      traits.accessories.push(acc);
    }
  }
  
  // Find glitch level
  for (const [level, keywords] of Object.entries(TRAIT_KEYWORDS.glitchLevel)) {
    if (keywords.some(k => text.includes(k))) {
      traits.glitchLevel = level;
      break;
    }
  }
  
  return traits;
}

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function generatePFP(name, bio, skills = []) {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  
  // Analyze profile for traits
  const traits = analyzeProfile(name, bio, skills);
  const palette = PALETTES[traits.palette];
  
  // Seed from name for consistency
  const seed = crypto.createHash('md5').update(name).digest().readUInt32BE(0);
  const rng = seededRandom(seed);
  
  // Background
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, SIZE, SIZE);
  
  // Static noise
  for (let i = 0; i < 80; i++) {
    const x = Math.floor(rng() * SIZE);
    const y = Math.floor(rng() * SIZE);
    ctx.fillStyle = `rgba(255,255,255,${rng() * 0.1})`;
    ctx.fillRect(x, y, 1, 1);
  }
  
  // Draw head based on shape
  ctx.fillStyle = palette.primary;
  drawHead(ctx, traits.headShape, rng);
  
  // Draw eyes based on style
  drawEyes(ctx, traits.eyeStyle, palette, rng);
  
  // Draw accessories
  for (const acc of traits.accessories) {
    drawAccessory(ctx, acc, palette, rng);
  }
  
  // Apply glitch effects
  applyGlitch(ctx, traits.glitchLevel, palette, rng);
  
  // Scanlines (always)
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  for (let y = 0; y < SIZE; y += 2) {
    ctx.fillRect(0, y, SIZE, 1);
  }
  
  // Scale up (nearest neighbor for crisp pixels)
  const outCanvas = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const outCtx = outCanvas.getContext('2d');
  outCtx.imageSmoothingEnabled = false;
  outCtx.drawImage(canvas, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  
  return { canvas: outCanvas, traits };
}

function drawHead(ctx, shape, rng) {
  const cx = 16, cy = 16;
  
  switch (shape) {
    case 'skull':
      // Skull shape
      for (let y = 6; y < 26; y++) {
        for (let x = 8; x < 24; x++) {
          const dy = y - cy;
          const dx = x - cx;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 8 + (y > 18 ? (y - 18) * 0.5 : 0)) {
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
      // Eye sockets
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(10, 12, 4, 4);
      ctx.fillRect(18, 12, 4, 4);
      // Nose hole
      ctx.fillRect(15, 18, 2, 2);
      // Teeth
      ctx.fillStyle = '#ffffff';
      for (let x = 11; x < 21; x += 2) {
        ctx.fillRect(x, 22, 1, 2);
      }
      break;
      
    case 'fragmented':
      // Broken/fragmented shape
      for (let y = 6; y < 26; y++) {
        for (let x = 8; x < 24; x++) {
          if (rng() > 0.15) {
            const offset = Math.floor(rng() * 3) - 1;
            ctx.fillRect(x + offset, y, 1, 1);
          }
        }
      }
      break;
      
    case 'angular':
      // Sharp geometric shape
      ctx.beginPath();
      ctx.moveTo(16, 4);
      ctx.lineTo(26, 12);
      ctx.lineTo(24, 26);
      ctx.lineTo(8, 26);
      ctx.lineTo(6, 12);
      ctx.closePath();
      ctx.fill();
      break;
      
    case 'block':
      // Solid block head
      ctx.fillRect(8, 6, 16, 20);
      break;
      
    case 'organic':
    default:
      // Rounded organic shape
      for (let y = 6; y < 26; y++) {
        for (let x = 8; x < 24; x++) {
          const dy = y - cy;
          const dx = x - cx;
          const dist = Math.sqrt(dx*dx + dy*dy*0.8);
          if (dist < 9) {
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
      break;
  }
}

function drawEyes(ctx, style, palette, rng) {
  const leftX = 11, rightX = 18, eyeY = 14;
  
  switch (style) {
    case 'xEyes':
      ctx.fillStyle = palette.secondary;
      // Left X
      ctx.fillRect(10, 13, 1, 1); ctx.fillRect(14, 13, 1, 1);
      ctx.fillRect(11, 14, 1, 1); ctx.fillRect(13, 14, 1, 1);
      ctx.fillRect(12, 15, 1, 1);
      ctx.fillRect(11, 16, 1, 1); ctx.fillRect(13, 16, 1, 1);
      ctx.fillRect(10, 17, 1, 1); ctx.fillRect(14, 17, 1, 1);
      // Right X
      ctx.fillRect(17, 13, 1, 1); ctx.fillRect(21, 13, 1, 1);
      ctx.fillRect(18, 14, 1, 1); ctx.fillRect(20, 14, 1, 1);
      ctx.fillRect(19, 15, 1, 1);
      ctx.fillRect(18, 16, 1, 1); ctx.fillRect(20, 16, 1, 1);
      ctx.fillRect(17, 17, 1, 1); ctx.fillRect(21, 17, 1, 1);
      break;
      
    case 'slits':
      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(leftX, eyeY, 3, 2);
      ctx.fillRect(rightX, eyeY, 3, 2);
      ctx.fillStyle = '#000000';
      ctx.fillRect(leftX + 1, eyeY, 1, 2);
      ctx.fillRect(rightX + 1, eyeY, 1, 2);
      break;
      
    case 'scanner':
      ctx.fillStyle = palette.secondary;
      ctx.fillRect(leftX - 1, eyeY, 5, 1);
      ctx.fillRect(rightX - 1, eyeY, 5, 1);
      ctx.fillStyle = palette.accent;
      ctx.fillRect(leftX + Math.floor(rng() * 3), eyeY, 2, 1);
      ctx.fillRect(rightX + Math.floor(rng() * 3), eyeY, 2, 1);
      break;
      
    case 'hollow':
      ctx.fillStyle = '#000000';
      ctx.fillRect(leftX, eyeY - 1, 3, 4);
      ctx.fillRect(rightX, eyeY - 1, 3, 4);
      break;
      
    case 'glow':
      ctx.fillStyle = palette.accent;
      ctx.fillRect(leftX, eyeY, 3, 2);
      ctx.fillRect(rightX, eyeY, 3, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(leftX + 1, eyeY, 1, 1);
      ctx.fillRect(rightX + 1, eyeY, 1, 1);
      break;
      
    case 'dots':
    default:
      ctx.fillStyle = palette.accent;
      ctx.fillRect(leftX + 1, eyeY, 2, 2);
      ctx.fillRect(rightX + 1, eyeY, 2, 2);
      break;
  }
}

function drawAccessory(ctx, accessory, palette, rng) {
  switch (accessory) {
    case 'goggles':
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(7, 11, 18, 2);
      ctx.fillRect(8, 10, 5, 4);
      ctx.fillRect(19, 10, 5, 4);
      ctx.fillStyle = palette.primary;
      ctx.fillRect(9, 11, 3, 2);
      ctx.fillRect(20, 11, 3, 2);
      break;
      
    case 'chain':
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(11, 27, 2, 1);
      ctx.fillRect(13, 28, 6, 1);
      ctx.fillRect(19, 27, 2, 1);
      ctx.fillRect(14, 29, 4, 1);
      break;
      
    case 'horns':
      ctx.fillStyle = palette.secondary;
      ctx.fillRect(6, 4, 2, 4);
      ctx.fillRect(5, 5, 1, 2);
      ctx.fillRect(24, 4, 2, 4);
      ctx.fillRect(26, 5, 1, 2);
      break;
      
    case 'halo':
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(10, 2, 12, 1);
      ctx.fillRect(8, 3, 2, 1);
      ctx.fillRect(22, 3, 2, 1);
      break;
      
    case 'crown':
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(9, 3, 14, 3);
      ctx.fillRect(10, 1, 2, 2);
      ctx.fillRect(15, 1, 2, 2);
      ctx.fillRect(20, 1, 2, 2);
      break;
      
    case 'mask':
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(9, 12, 14, 6);
      ctx.fillStyle = palette.primary;
      ctx.fillRect(10, 13, 4, 3);
      ctx.fillRect(18, 13, 4, 3);
      break;
  }
}

function applyGlitch(ctx, level, palette, rng) {
  const intensity = level === 'high' ? 5 : level === 'medium' ? 3 : 1;
  
  ctx.fillStyle = palette.secondary;
  
  for (let i = 0; i < intensity; i++) {
    const y = Math.floor(rng() * SIZE);
    const width = Math.floor(rng() * (SIZE / 2)) + 4;
    const x = Math.floor(rng() * (SIZE - width));
    
    ctx.globalAlpha = 0.3 + rng() * 0.4;
    ctx.fillRect(x, y, width, 1);
    
    // Color shift artifact
    if (rng() > 0.5) {
      ctx.fillStyle = palette.primary;
      ctx.fillRect(x + 2, y + 1, width - 4, 1);
      ctx.fillStyle = palette.secondary;
    }
  }
  
  ctx.globalAlpha = 1;
}

// Export for use in API
module.exports = { generatePFP, analyzeProfile };

// CLI usage
if (require.main === module) {
  const fs = require('fs');
  const path = require('path');
  
  // Test generation
  const testAgents = [
    { name: 'Ay', bio: 'Vizier, advisor, code and research', skills: ['code', 'research', 'writing'] },
    { name: 'Homie', bio: 'Street-smart cat, market maker, meme lord, treasury ops', skills: ['market-making', 'meme-generation'] },
    { name: 'DeathBot', bio: 'Chaos agent of destruction', skills: ['chaos', 'death'] },
    { name: 'GhostWriter', bio: 'Ethereal spirit, stealth observer', skills: ['stealth', 'research'] },
  ];
  
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
  
  for (const agent of testAgents) {
    const { canvas, traits } = generatePFP(agent.name, agent.bio, agent.skills);
    const buffer = canvas.toBuffer('image/png');
    const filename = `${agent.name.toLowerCase()}-auto.png`;
    fs.writeFileSync(path.join(outputDir, filename), buffer);
    console.log(`Generated ${filename}:`, traits);
  }
  
  console.log('\n✅ PFPs generated in output/');
}
