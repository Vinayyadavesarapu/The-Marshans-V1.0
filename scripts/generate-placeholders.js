import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

// Helper to write file
function write(subpath, content) {
  const full = path.join(root, subpath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('Created:', subpath);
}

// 1. Logo
write('public/assets/branding/logo/marshans-logo.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 60" width="400" height="60">
  <text x="0" y="44" font-family="'Bebas Neue', Impact, sans-serif" font-size="46" font-weight="900" letter-spacing="4" fill="#111111">THE MARSHANS</text>
  <circle cx="280" cy="20" r="5" fill="#e11d48"/>
</svg>`);

// 2. Favicon SVG & PNG placeholder
write('public/assets/branding/favicon/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="14" fill="#111111"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="'Bebas Neue', Impact, sans-serif" font-size="40" fill="#ffffff">M</text>
  <circle cx="48" cy="18" r="4" fill="#e11d48"/>
</svg>`);

// 3. Mascot Placeholder
write('public/assets/mascot/mascot-placeholder.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <rect width="200" height="200" rx="28" fill="#f4f4f5"/>
  <circle cx="100" cy="85" r="45" fill="#e4e4e7" stroke="#d4d4d8" stroke-width="3"/>
  <circle cx="85" cy="80" r="6" fill="#18181b"/>
  <circle cx="115" cy="80" r="6" fill="#18181b"/>
  <path d="M 85 105 Q 100 120 115 105" stroke="#18181b" stroke-width="4" fill="none" stroke-linecap="round"/>
  <rect x="70" y="140" width="60" height="36" rx="18" fill="#e11d48"/>
  <text x="100" y="162" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="700" fill="#ffffff" letter-spacing="1">MARSHAN</text>
</svg>`);

// 4. Carousel Posters (100vw x 100vh / 1920x1080)
const posters = [
  { file: 'poster-1.svg', title: 'LUMO LIGHT SCULPTURES', sub: 'RADIANT AMBIENCE — DUAL AESTHETIC', bg: '#0d1117', text: '#ffffff', accent: '#38bdf8' },
  { file: 'poster-2.svg', title: 'FANDOM TRIBE ARTIFACTS', sub: 'HIGH-DETAIL COLLECTIBLES & STATUES', bg: '#18181b', text: '#ffffff', accent: '#fb7185' },
  { file: 'poster-3.svg', title: 'DARSHANAM SACRED SERIES', sub: 'HERITAGE ARCHITECTURE & DEVOTIONAL PRECISION', bg: '#1c1917', text: '#ffffff', accent: '#f59e0b' },
  { file: 'poster-4.svg', title: 'UTILITY CO. ESSENTIALS', sub: 'PRECISION FUNCTIONAL ENGINEERING', bg: '#0f172a', text: '#ffffff', accent: '#10b981' }
];

posters.forEach(p => {
  write(`public/assets/carousel/home/${p.file}`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
    <defs>
      <radialGradient id="grad" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stop-color="${p.accent}" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="${p.bg}" stop-opacity="1"/>
      </radialGradient>
    </defs>
    <rect width="1920" height="1080" fill="${p.bg}"/>
    <rect width="1920" height="1080" fill="url(#grad)"/>
    <g opacity="0.08" stroke="#ffffff" stroke-width="1">
      <line x1="0" y1="270" x2="1920" y2="270"/>
      <line x1="0" y1="540" x2="1920" y2="540"/>
      <line x1="0" y1="810" x2="1920" y2="810"/>
      <line x1="480" y1="0" x2="480" y2="1080"/>
      <line x1="960" y1="0" x2="960" y2="1080"/>
      <line x1="1440" y1="0" x2="1440" y2="1080"/>
    </g>
    <circle cx="960" cy="460" r="180" fill="${p.accent}" opacity="0.15" filter="blur(30px)"/>
    <text x="960" y="520" text-anchor="middle" font-family="'Bebas Neue', Impact, sans-serif" font-size="110" font-weight="900" letter-spacing="8" fill="${p.text}">${p.title}</text>
    <text x="960" y="580" text-anchor="middle" font-family="'Manrope', sans-serif" font-size="22" font-weight="600" letter-spacing="4" fill="${p.accent}">${p.sub}</text>
    <text x="960" y="640" text-anchor="middle" font-family="'Manrope', sans-serif" font-size="14" font-weight="600" letter-spacing="3" fill="#a1a1aa">THE MARSHANS • DISCOVERY ARCHIVE</text>
  </svg>`);
});

// 5. Product Thumbnails
const products = [
  { id: 1, name: 'Lumo Apex Lantern', cat: 'LUMO', price: '₹2,499', bg: '#f8fafc', color: '#0284c7' },
  { id: 2, name: 'Cyber Samurai Bust', cat: 'FANDOM', price: '₹3,999', bg: '#faf5ff', color: '#9333ea' },
  { id: 3, name: 'Kailash Monolith Shrine', cat: 'DARSHANAM', price: '₹4,499', bg: '#fffbeb', color: '#b45309' },
  { id: 4, name: 'Hex Modular Desk Dock', cat: 'UTILITY CO.', price: '₹1,299', bg: '#f0fdf4', color: '#15803d' },
  { id: 5, name: 'Pocket Chrono Golem', cat: 'MINITALES', price: '₹899', bg: '#fff1f2', color: '#be123c' },
  { id: 6, name: 'Vortex Ambient Sphere', cat: 'LUMO', price: '₹2,899', bg: '#f0f9ff', color: '#0369a1' },
  { id: 7, name: 'Aero Headphone Cradle', cat: 'UTILITY CO.', price: '₹1,699', bg: '#f1f5f9', color: '#334155' },
  { id: 8, name: 'Gilded Temple Gopuram', cat: 'DARSHANAM', price: '₹5,299', bg: '#fefce8', color: '#ca8a04' }
];

products.forEach(p => {
  write(`public/assets/products/thumbnails/product-${p.id}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
    <rect width="600" height="600" fill="${p.bg}"/>
    <circle cx="300" cy="270" r="160" fill="${p.color}" opacity="0.12"/>
    <g transform="translate(200, 170)">
      <polygon points="100,20 180,70 180,170 100,220 20,170 20,70" fill="${p.color}" opacity="0.85" stroke="#ffffff" stroke-width="4"/>
      <polygon points="100,20 180,70 100,120 20,70" fill="${p.color}" opacity="0.5"/>
      <line x1="100" y1="120" x2="100" y2="220" stroke="#ffffff" stroke-width="3" opacity="0.6"/>
    </g>
    <text x="300" y="470" text-anchor="middle" font-family="'Bebas Neue', Impact, sans-serif" font-size="34" letter-spacing="2" fill="#18181b">${p.name.toUpperCase()}</text>
    <text x="300" y="505" text-anchor="middle" font-family="'Manrope', sans-serif" font-size="14" font-weight="700" letter-spacing="2" fill="${p.color}">${p.cat}</text>
    <text x="300" y="540" text-anchor="middle" font-family="'Manrope', sans-serif" font-size="18" font-weight="800" fill="#09090b">${p.price}</text>
  </svg>`);
});

// 6. Category Visual Cards
const categories = [
  { slug: 'lumo', name: 'LUMO', tag: 'Luminous Sculptures', color: '#0284c7', bg: '#0369a1' },
  { slug: 'fandom-tribe', name: 'FANDOM TRIBE', tag: 'Pop Culture Collectibles', color: '#9333ea', bg: '#7e22ce' },
  { slug: 'darshanam', name: 'DARSHANAM', tag: 'Sacred Architecture', color: '#b45309', bg: '#92400e' },
  { slug: 'utility-co', name: 'UTILITY CO.', tag: 'Functional Engineering', color: '#15803d', bg: '#166534' },
  { slug: 'minitales', name: 'MINITALES', tag: 'Pocket Dioramas', color: '#be123c', bg: '#9f1239' },
  { slug: 'custom-3d', name: 'CUSTOM 3D', tag: 'On-Demand Printing', color: '#4338ca', bg: '#3730a3' }
];

categories.forEach(c => {
  write(`public/assets/categories/cat-${c.slug}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <rect width="800" height="600" fill="${c.bg}"/>
    <circle cx="400" cy="300" r="220" fill="#ffffff" opacity="0.1"/>
    <text x="400" y="280" text-anchor="middle" font-family="'Bebas Neue', Impact, sans-serif" font-size="76" letter-spacing="6" fill="#ffffff">${c.name}</text>
    <text x="400" y="340" text-anchor="middle" font-family="'Manrope', sans-serif" font-size="20" font-weight="600" letter-spacing="3" fill="rgba(255,255,255,0.85)">${c.tag}</text>
    <rect x="340" y="380" width="120" height="38" rx="19" fill="#ffffff" opacity="0.2"/>
    <text x="400" y="404" text-anchor="middle" font-family="'Manrope', sans-serif" font-size="12" font-weight="700" letter-spacing="2" fill="#ffffff">EXPLORE</text>
  </svg>`);
});

// 7. Custom 3D Hero
write('public/assets/custom-3d/hero/custom-3d-hero.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600" width="1200" height="600">
  <rect width="1200" height="600" fill="#0f172a"/>
  <g stroke="#38bdf8" stroke-width="1" opacity="0.15">
    <line x1="0" y1="150" x2="1200" y2="150"/>
    <line x1="0" y1="300" x2="1200" y2="300"/>
    <line x1="0" y1="450" x2="1200" y2="450"/>
    <line x1="300" y1="0" x2="300" y2="600"/>
    <line x1="600" y1="0" x2="600" y2="600"/>
    <line x1="900" y1="0" x2="900" y2="600"/>
  </g>
  <circle cx="600" cy="260" r="140" fill="#38bdf8" opacity="0.15" filter="blur(30px)"/>
  <text x="600" y="270" text-anchor="middle" font-family="'Bebas Neue', Impact, sans-serif" font-size="80" letter-spacing="6" fill="#ffffff">CUSTOM 3D FABRICATION</text>
  <text x="600" y="330" text-anchor="middle" font-family="'Manrope', sans-serif" font-size="18" font-weight="600" letter-spacing="3" fill="#38bdf8">PRECISION ON-DEMAND ADDITIVE MANUFACTURING</text>
</svg>`);

console.log('All placeholder assets generated successfully!');
