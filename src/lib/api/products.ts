/**
 * THE MARSHANS — Products Service Layer (Production Mode)
 *
 * Connects directly to the live backend API at https://api.chipakk.shop/api/products
 * Injects X-Store-ID: 2 and X-Store-Code: marshans.
 * Uses authoritative paise-based money model from backend.
 * Zero dummy / mock / fallback data.
 */

import { apiClient } from './client';
import { fetchCategories, normalizeCategorySlug, resolveBackendCategory } from './categories';
import { resolveImageUrl } from '../utils/media';

export interface ProductImage {
  id: number;
  product_id?: number;
  image_url: string;
  is_primary?: boolean | number;
  sort_order?: number;
}

export interface ProductMaterial {
  id: string | number;
  name: string;
  description?: string;
  price_modifier?: number;
}

export interface ProductColorOption {
  id?: string | number;
  name: string;
  value: string; // Hex color code or CSS color
  price_modifier?: number;
  image_url?: string;
}

export interface ProductSizeOption {
  id?: string | number;
  name: string;
  dimensions?: string;
  price_modifier?: number;
}

export interface ProductFinishingOption {
  id: string | number;
  name: string;
  description?: string;
  price_modifier?: number;
}

export interface Product {
  id: number;
  admin_product_id: string;
  category_id: number;
  category_name: string;
  category_slug: string;
  name: string;
  slug: string;
  sku: string;
  short_description?: string | null;
  description: string;
  price: number; // In Rupees for presentation (converted from backend paise)
  compare_at_price?: number; // In Rupees for presentation
  primary_image_url: string;
  images: ProductImage[];
  video_url?: string | null;
  view_360_url?: string | null;
  colors?: ProductColorOption[];
  sizes?: ProductSizeOption[];
  materials?: ProductMaterial[];
  finishing_options?: ProductFinishingOption[];
  dimensions_mm?: string | null;
  weight_grams?: number | null;
  rating?: number;
  review_count?: number;
  stock: number;
  is_best_seller: boolean;
  featured: boolean;
  tags: string[];
  effective_experience?: string;
  highlights?: string[];
  specifications?: Record<string, string>;
  shipping_info?: string;
}

/**
 * Fetch products from production Store 2 backend.
 * `ok` is true only when the live API answered, so callers can replace build-time data even with an empty list.
 * `category_slug` is a frontend route slug; it is resolved to the live backend category id.
 */
export async function getProducts(params: {
  search?: string;
  category_id?: string | number;
  category_slug?: string;
  is_best_seller?: boolean;
  featured?: boolean;
  limit?: number;
  offset?: number;
} = {}): Promise<{ products: Product[]; total: number; ok: boolean }> {
  let categoryId: number | null = params.category_id ? Number(params.category_id) : null;
  if (params.category_slug) {
    const categories = await fetchCategories();
    if (!categories) return { products: [], total: 0, ok: false };
    const category = resolveBackendCategory(params.category_slug, categories);
    if (!category) return { products: [], total: 0, ok: true };
    categoryId = category.id;
  }

  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (categoryId !== null) query.set('category_id', String(categoryId));
  if (params.is_best_seller) query.set('is_best_seller', '1');
  if (params.featured) query.set('featured', '1');
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));

  const endpoint = `/products${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await apiClient<{ products: any[]; total: number }>(endpoint);

  if (res && res.success && res.data && Array.isArray(res.data.products)) {
    let formatted = res.data.products.map(formatBackendProduct);

    // Enforce the category on each product's own category_id from the API response
    if (categoryId !== null) {
      formatted = formatted.filter((p) => p.category_id === categoryId);
      return { products: formatted, total: formatted.length, ok: true };
    }

    return {
      products: formatted,
      total: typeof res.data.total === 'number' ? res.data.total : formatted.length,
      ok: true
    };
  }

  // Backend offline / error: callers keep whatever they already show
  return { products: [], total: 0, ok: false };
}

export const fetchProducts = getProducts;

/**
 * Fetch a single product by ID or slug from production Store 2 backend.
 * Resolves null when the live API confirms the product does not exist; throws when the API is unreachable.
 */
export async function getProductByIdOrSlug(idOrSlug: string | number): Promise<Product | null> {
  const clean = String(idOrSlug).trim();
  if (!clean) return null;

  // 1. Try direct lookup via backend /products/:idOrSlug
  const res = await apiClient<any>(`/products/${encodeURIComponent(clean)}`);
  if (res && res.success && res.data) {
    return formatBackendProduct(res.data);
  }

  // 2. Fallback: If not found directly (e.g. backend queried slug vs id), search active catalog
  const listRes = await getProducts({ limit: 100 });
  if (!listRes.ok) {
    throw new Error(res?.error || 'Product API unreachable');
  }
  const match = listRes.products.find(
    (p) =>
      p.slug === clean ||
      p.admin_product_id === clean ||
      p.sku === clean ||
      String(p.id) === clean
  );
  return match || null;
}

/**
 * Normalizes backend MariaDB Store 2 product data to frontend Product interface.
 * Converts authoritative paise money values to rupees for display.
 */
export function formatBackendProduct(raw: any): Product {
  const primaryImg = resolveImageUrl(raw.primary_image_url || raw.lumo_light_image || '', '');

  const images: ProductImage[] =
    Array.isArray(raw.images) && raw.images.length > 0
      ? raw.images.map((img: any) => ({
          id: img.id || 1,
          image_url: resolveImageUrl(img.image_url || raw.primary_image_url || raw.lumo_light_image || '', '/assets/placeholders/product-placeholder.svg'),
          is_primary: Boolean(img.is_primary),
          sort_order: img.sort_order || 0
        }))
      : primaryImg
      ? [
          {
            id: 1,
            image_url: primaryImg,
            is_primary: true
          }
        ]
      : [];

  // Authoritative paise-to-rupees conversion for Marshans Store 2 (100 paise = 1 INR)
  const rawPricePaise = Number(raw.price) || 0;
  const displayPrice = rawPricePaise / 100;

  const rawComparePricePaise = raw.compare_at_price ? Number(raw.compare_at_price) : undefined;
  const displayComparePrice = rawComparePricePaise !== undefined ? rawComparePricePaise / 100 : undefined;

  const catSlug = normalizeCategorySlug(raw.category_slug || raw.category_name || 'general', raw.category_name);

  // Format materials with paise modifier conversion if present
  const materials: ProductMaterial[] | undefined = Array.isArray(raw.materials)
    ? raw.materials.map((m: any) => ({
        id: m.id || m.name,
        name: m.name,
        description: m.description,
        price_modifier: m.price_modifier ? Number(m.price_modifier) / 100 : 0
      }))
    : undefined;

  // Format finishes with paise modifier conversion if present
  const finishing_options: ProductFinishingOption[] | undefined = Array.isArray(raw.finishing_options)
    ? raw.finishing_options.map((f: any) => ({
        id: f.id || f.name,
        name: f.name,
        description: f.description,
        price_modifier: f.price_modifier ? Number(f.price_modifier) / 100 : 0
      }))
    : undefined;

  // Format colors
  const colors: ProductColorOption[] | undefined = Array.isArray(raw.colors)
    ? raw.colors.map((c: any) => ({
        id: c.id,
        name: c.name,
        value: c.value || c.color_code || '#000000',
        price_modifier: c.price_modifier ? Number(c.price_modifier) / 100 : 0,
        image_url: c.image_url ? resolveImageUrl(c.image_url) : undefined
      }))
    : undefined;

  // Format sizes
  const sizes: ProductSizeOption[] | undefined = Array.isArray(raw.sizes)
    ? raw.sizes.map((s: any) => ({
        id: s.id,
        name: s.name,
        dimensions: s.dimensions,
        price_modifier: s.price_modifier ? Number(s.price_modifier) / 100 : 0
      }))
    : undefined;

  const raw360 = raw.view_360_url || raw.lumo_light_360_url || null;
  const resolved360 = raw360 ? resolveImageUrl(raw360) : null;

  return {
    id: raw.id,
    admin_product_id: raw.admin_product_id || `MAR-${raw.id}`,
    category_id: raw.category_id != null ? Number(raw.category_id) : 0,
    category_name: raw.category_name || 'General',
    category_slug: catSlug,
    name: raw.name || `Product ${raw.id}`,
    slug: raw.slug || (raw.name ? raw.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : `product-${raw.id}`),
    sku: raw.sku || `SKU-${raw.id}`,
    short_description: raw.short_description || null,
    description: raw.description || '',
    price: displayPrice,
    compare_at_price: displayComparePrice,
    primary_image_url: primaryImg || (images[0]?.image_url ?? '/assets/placeholders/product-placeholder.svg'),
    images,
    video_url: raw.video_url || null,
    view_360_url: resolved360,
    colors,
    sizes,
    materials,
    finishing_options,
    dimensions_mm: raw.dimensions_mm || null,
    weight_grams: raw.weight_grams ? Number(raw.weight_grams) : null,
    rating: raw.rating !== undefined && raw.rating !== null ? Number(raw.rating) : undefined,
    review_count: raw.review_count !== undefined && raw.review_count !== null ? Number(raw.review_count) : undefined,
    stock: typeof raw.stock === 'number' ? raw.stock : 0,
    is_best_seller: Boolean(raw.is_best_seller),
    featured: Boolean(raw.featured),
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    effective_experience: raw.effective_experience || raw.experience_code,
    highlights: Array.isArray(raw.highlights) ? raw.highlights : undefined,
    specifications: raw.specifications && typeof raw.specifications === 'object' ? raw.specifications : undefined,
    shipping_info: raw.shipping_info || undefined
  };
}
