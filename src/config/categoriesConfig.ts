export interface CategoryMeta {
  slug: string;
  name: string;
  title: string;
  tagline: string;
  description: string;
  color: string;
  bgGradient: string;
  heroImage: string;
  badges?: string[];
}

export const CATEGORIES_CONFIG: Record<string, CategoryMeta> = {
  'lumo': {
    slug: 'lumo',
    name: 'LUMO',
    title: 'AMBIENT LUMINOUS SCULPTURES',
    tagline: 'Light, Lattice, and Optical Physics',
    description: 'Lumo explores the intersection of precision 3D-printed translucent resins, organic gyroid infills, and warm 2700K diffusion. Each lamp is designed as an architectural centerpiece for calm spaces.',
    color: '#0284c7',
    bgGradient: '#0a0a0a',
    heroImage: '/assets/categories/lumo/hero.webp'
  },
  'fandom-tribe': {
    slug: 'fandom-tribe',
    name: 'FANDOM TRIBE',
    title: 'HIGH-DETAIL COLLECTIBLE STATUES',
    tagline: 'Articulated Mechanical Figures & Desktop Monoliths',
    description: 'Engineered for dedicated collectors and mechanical enthusiasts. Every figure features custom-toleranced friction ball joints, multi-tone polymer shells, and zero visible seamlines.',
    color: '#9333ea',
    bgGradient: '#0a0a0a',
    heroImage: '/assets/categories/fandom/hero.webp'
  },
  'minitales': {
    slug: 'minitales',
    name: 'MINI TALES',
    title: 'POCKET WORLDS & MINIATURES',
    tagline: 'Desktop Dioramas with Concealed Light Channels',
    description: 'Dense, intricate miniature worlds captured inside compact display cubes. Designed with micro-conduits for concealed fiber optic and LED illumination.',
    color: '#be123c',
    bgGradient: '#0a0a0a',
    heroImage: '/assets/categories/mini-tales/hero.webp'
  },
  'utility-co': {
    slug: 'utility-co',
    name: 'UTILITY CO.',
    title: 'MODULAR DESK ENGINEERING',
    tagline: 'Precision Keycaps, Docks & Cable Architects',
    description: 'Functional objects made beautiful. Resin artisan keycaps with MX stem compatibility, magnetic desktop routing systems, and weighted headphone cradles.',
    color: '#15803d',
    bgGradient: '#0a0a0a',
    heroImage: '/assets/categories/utility-co/hero.webp'
  },
  'darshanam': {
    slug: 'darshanam',
    name: 'DARSHANAM',
    title: 'SACRED CULTURAL ARCHITECTURE',
    tagline: 'Historically Grounded Temple Shrines & Vedic Motifs',
    description: 'Faith and heritage recreated with architectural fidelity. Multi-tiered Dravidian gopurams, sanctum shrines, and sacred geometric mandalas rendered with 0.12mm stone-finish polymers.',
    color: '#b45309',
    bgGradient: '#0a0a0a',
    heroImage: '/assets/categories/darshanam/hero.webp'
  },
  'custom-3d': {
    slug: 'custom-3d',
    name: 'CUSTOM FORGE',
    title: 'ON-DEMAND 3D FABRICATION',
    tagline: 'Precision Additive Manufacturing from Your CAD & Mesh Files',
    description: 'Upload your 3D digital model, configure material density and post-cured surface finish, and receive an instant automated manufacturing quote.',
    color: '#4338ca',
    bgGradient: '#0a0a0a',
    heroImage: '/assets/categories/custom-forge/hero.webp'
  },
  'custom-forge': {
    slug: 'custom-forge',
    name: 'CUSTOM FORGE',
    title: 'ON-DEMAND 3D FABRICATION',
    tagline: 'Precision Additive Manufacturing from Your CAD & Mesh Files',
    description: 'Upload your 3D digital model, configure material density and post-cured surface finish, and receive an instant automated manufacturing quote.',
    color: '#4338ca',
    bgGradient: '#0a0a0a',
    heroImage: '/assets/categories/custom-forge/hero.webp'
  }
};

export function getCategoryMeta(slug: string): CategoryMeta {
  const clean = slug.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return CATEGORIES_CONFIG[clean] || {
    slug: clean,
    name: clean.toUpperCase(),
    title: `${clean.toUpperCase()} COLLECTION`,
    tagline: 'Precision 3D Printed Artifacts',
    description: 'Discover precision additive manufacturing artifacts designed and fabricated by THE MARSHANS.',
    color: '#18181b',
    bgGradient: '#0a0a0a',
    heroImage: `/assets/categories/${clean}/hero.webp`
  };
}
