/**
 * THE MARSHANS — Categories Service Layer (Production Mode)
 *
 * Connects directly to live backend API at https://api.chipakk.shop/api/categories
 * Injects X-Store-ID: 2 and X-Store-Code: marshans.
 */

import { apiClient } from './client';

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  active: boolean;
  product_count?: number;
  color?: string;
  experience_code?: string;
}

// Normalize backend category slugs to standard frontend slugs
export function normalizeCategorySlug(rawSlug: string): string {
  const clean = String(rawSlug || '').toLowerCase().trim();
  if (clean === 'fandom') return 'fandom-tribe';
  if (clean === 'mini-tales') return 'minitales';
  if (clean === 'custom') return 'custom-3d';
  return clean;
}

// Convert frontend slug to backend slug
export function toBackendCategorySlug(frontendSlug: string): string {
  const clean = String(frontendSlug || '').toLowerCase().trim();
  if (clean === 'fandom-tribe') return 'fandom';
  if (clean === 'minitales') return 'mini-tales';
  if (clean === 'custom-3d') return 'custom';
  return clean;
}

export async function getCategories(): Promise<Category[]> {
  const res = await apiClient<{ categories: any[]; count: number }>('/categories');

  if (res && res.success && res.data && Array.isArray(res.data.categories)) {
    return res.data.categories.map((cat: any) => {
      const slug = normalizeCategorySlug(cat.slug || cat.name);
      return {
        id: cat.id,
        name: cat.name,
        slug,
        description: cat.description || '',
        image_url: cat.image_url || `/assets/categories/cat-${slug}.svg`,
        active: Boolean(cat.active),
        product_count: typeof cat.product_count === 'number' ? cat.product_count : 0,
        color: cat.color || '#18181b',
        experience_code: cat.experience?.experience_code || 'normal'
      };
    });
  }

  return [];
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const categories = await getCategories();
  const normalized = normalizeCategorySlug(slug);
  return (
    categories.find(
      (c) =>
        c.slug === normalized ||
        toBackendCategorySlug(c.slug) === toBackendCategorySlug(slug)
    ) || null
  );
}
