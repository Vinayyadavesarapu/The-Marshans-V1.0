/**
 * THE MARSHANS — Categories Service Layer (Production Mode)
 *
 * Connects directly to live backend API at https://api.chipakk.shop/api/categories
 * Injects X-Store-ID: 2 and X-Store-Code: marshans.
 *
 * Frontend category routes (/categories/fandom-tribe, /categories/minitales, ...) are presentation URLs.
 * The live Store 2 category (and its id) is the source of truth: routes are resolved against
 * /api/categories and products are filtered by product.category_id.
 */

import { apiClient } from './client';
import { CATEGORIES_CONFIG } from '../../config/categoriesConfig';

export interface Category {
  id: number;
  name: string;
  slug: string; // frontend route slug
  backend_slug: string; // slug exactly as returned by /api/categories
  description: string;
  image_url: string;
  active: boolean;
  product_count?: number;
  color?: string;
  experience_code?: string;
}

const compact = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const firstToken = (s: string) => String(s || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)[0] || '';

/**
 * How well a frontend route slug matches a backend category (same approach as the CHIPAKK catalog matcher):
 *   2 = same slug or name ignoring case/punctuation ("minitales" ~ "mini-tales", "lumo" ~ "LUMO")
 *   1 = the route's leading word is the backend category ("fandom-tribe" -> "fandom", "custom-forge" -> "custom")
 *   0 = no match
 */
function routeMatchScore(routeSlug: string, backendSlug: string, backendName: string): number {
  const route = compact(routeSlug);
  if (!route) return 0;
  if (route === compact(backendSlug) || route === compact(backendName)) return 2;
  const lead = firstToken(routeSlug);
  if (lead && (lead === compact(backendSlug) || lead === compact(backendName))) return 1;
  return 0;
}

/**
 * Resolves a frontend route slug to the real backend category. Returns null when no active category
 * matches, or when the best match is ambiguous.
 */
export function resolveBackendCategory(routeSlug: string, categories: Category[]): Category | null {
  let best: Category | null = null;
  let bestScore = 0;
  let tie = false;
  for (const cat of categories) {
    if (!cat.active) continue;
    const score = routeMatchScore(routeSlug, cat.backend_slug, cat.name);
    if (score > bestScore) {
      best = cat;
      bestScore = score;
      tie = false;
    } else if (score > 0 && score === bestScore) {
      tie = true;
    }
  }
  return best && !tie ? best : null;
}

/**
 * Maps a backend category slug/name to the frontend route slug used for links (breadcrumbs, badges).
 * Uses the same matcher as resolveBackendCategory; falls back to the backend slug itself.
 */
export function normalizeCategorySlug(rawSlug: string, rawName: string = ''): string {
  const clean = String(rawSlug || '').toLowerCase().trim();
  let route = '';
  let bestScore = 0;
  for (const key of Object.keys(CATEGORIES_CONFIG)) {
    const score = routeMatchScore(key, clean, rawName);
    if (score > bestScore) {
      route = key;
      bestScore = score;
    }
  }
  return route || clean;
}

let categoriesRequest: Promise<Category[] | null> | null = null;

/**
 * Live Store 2 categories. Resolves to null when the API could not be reached, so callers can tell
 * "no categories" apart from "request failed". Successful responses are reused for the page lifetime.
 */
export function fetchCategories(): Promise<Category[] | null> {
  if (!categoriesRequest) {
    categoriesRequest = apiClient<{ categories: any[]; count: number }>('/categories').then((res) => {
      if (res && res.success && res.data && Array.isArray(res.data.categories)) {
        return res.data.categories.map((cat: any) => {
          const backendSlug = String(cat.slug || '').toLowerCase().trim();
          const slug = normalizeCategorySlug(backendSlug, cat.name);
          return {
            id: Number(cat.id),
            name: cat.name,
            slug,
            backend_slug: backendSlug,
            description: cat.description || '',
            image_url: cat.image_url || `/assets/categories/cat-${slug}.svg`,
            active: cat.active === undefined ? true : Boolean(cat.active),
            product_count: typeof cat.product_count === 'number' ? cat.product_count : 0,
            color: cat.color || '#18181b',
            experience_code: cat.experience?.experience_code || 'normal'
          };
        });
      }
      categoriesRequest = null; // do not cache failures
      return null;
    });
  }
  return categoriesRequest;
}

export async function getCategories(): Promise<Category[]> {
  return (await fetchCategories()) || [];
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  return resolveBackendCategory(slug, await getCategories());
}
