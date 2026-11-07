/**
 * THE MARSHANS — Centralized Storefront Launch Mode Configuration
 *
 * This is the SINGLE SOURCE OF TRUTH controlling the temporary customer-facing
 * Custom Forge-only launch experience.
 *
 * Modes:
 * - 'CUSTOM_FORGE_ONLY':
 *     - Only the Custom Forge experience (Lady Justice) is publicly accessible.
 *     - Old retail routes (/shop, /categories/*, retail /product/*) redirect to /custom-3d or /product/lady-justice/.
 *     - Logo points to /custom-3d.
 *     - Main navigation shows only Custom Forge links.
 *     - Search indexes only Custom Forge pieces; retail products and suggestions are isolated.
 *     - Generated Hostinger .htaccess serves temporary 302 redirects.
 *     - Direct online checkout is safely paused until migration 019 and dedicated endpoints are deployed.
 *
 * - 'RETAIL':
 *     - Complete original storefront restored (Hero, Category Carousel, New Arrivals, The Collection).
 *     - Full 7-category navigation and logo pointing to '/'.
 *     - Full catalog search and direct retail URL access.
 *     - Clean Hostinger .htaccess without launch redirects.
 *     - Retail checkout fully operational.
 */

export type LaunchMode = 'CUSTOM_FORGE_ONLY' | 'RETAIL';

/**
 * ACTIVE LAUNCH MODE SWITCH
 * Change this single value to switch between launch mode and full retail mode.
 */
export const LAUNCH_MODE: LaunchMode = 'CUSTOM_FORGE_ONLY';

export function isCustomForgeOnly(mode: LaunchMode = LAUNCH_MODE): boolean {
  return mode === 'CUSTOM_FORGE_ONLY';
}

export interface NavItem {
  label: string;
  href: string;
}

export const RETAIL_NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'LUMO', href: '/categories/lumo' },
  { label: 'Fandom Tribe', href: '/categories/fandom-tribe' },
  { label: 'Mini Tales', href: '/categories/minitales' },
  { label: 'Utility Co.', href: '/categories/utility-co' },
  { label: 'Darshanam', href: '/categories/darshanam' },
  { label: 'Custom Forge', href: '/custom-3d' },
];

export const CUSTOM_FORGE_NAV_ITEMS: NavItem[] = [
  { label: 'Lady Justice', href: '/product/lady-justice/' },
  { label: 'Orders & Tracking', href: '/account/orders' },
];

export function getNavItems(mode: LaunchMode = LAUNCH_MODE): NavItem[] {
  return isCustomForgeOnly(mode) ? CUSTOM_FORGE_NAV_ITEMS : RETAIL_NAV_ITEMS;
}

export function getLogoHref(mode: LaunchMode = LAUNCH_MODE): string {
  return isCustomForgeOnly(mode) ? '/product/lady-justice/' : '/';
}

/**
 * Public routes permitted during CUSTOM_FORGE_ONLY mode.
 */
export const ALLOWED_LAUNCH_ROUTES = [
  '/custom-3d',
  '/product/lady-justice',
  '/product/lady-justice/',
  '/cart',
  '/checkout',
  '/login',
  '/register',
  '/account',
  '/account/orders',
  '/account/profile',
  '/order-confirmation',
  '/terms-and-conditions',
  '/refund-policy',
  '/404',
];

export function isRouteAllowed(path: string, mode: LaunchMode = LAUNCH_MODE): boolean {
  if (!isCustomForgeOnly(mode)) return true;
  const clean = path.replace(/\/+$/, '') || '/';
  return ALLOWED_LAUNCH_ROUTES.some((allowed) => {
    const allowedClean = allowed.replace(/\/+$/, '') || '/';
    return clean === allowedClean || clean.startsWith(allowedClean + '/');
  });
}

/**
 * Custom Forge search dataset for launch mode.
 * Contains only Custom Forge pieces with rich keywords so searches for
 * "Lady Justice", "statue", "sculpture", "custom forge", "law", etc. find it.
 */
export const CUSTOM_FORGE_SEARCH_PRODUCTS = [
  {
    id: 9991,
    name: 'Lady Justice',
    slug: 'lady-justice',
    sku: 'CF-LJ-01',
    category_name: 'Statues',
    category_slug: 'statues',
    price: 1600, // Starting price for 6" edition
    primary_image_url: '/assets/products/custom-forge/name plate front.png',
    description: 'A symbol of truth, fairness and justice. Thoughtfully crafted with sculptural balance, bespoke 3D printed nameplate customization, and architectural presence.',
    keywords: ['lady justice', 'justice', 'statue', 'sculpture', 'law', 'scales of justice', 'nameplate', 'advocate', 'judge', 'legal']
  }
];

export const CUSTOM_FORGE_SEARCH_SUGGESTIONS = [
  'Lady Justice',
  'Statue',
  'Nameplate Customization'
];

export const RETAIL_SEARCH_SUGGESTIONS = [
  'Lumo Lamp',
  'Fandom Statues',
  'Artisan Keycaps',
  'Mini Diorama',
  'Darshanam Temple',
  'Desk Organizer'
];
