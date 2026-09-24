/**
 * THE MARSHANS — Customer Media & Image Resolution Utility
 *
 * Resolves relative /uploads/... paths from the production backend to the
 * authoritative API media upload host (e.g. https://api.chipakk.shop/uploads/...).
 * Preserves existing absolute URLs and local static frontend assets.
 */

import { siteConfig } from '../config/site';

export const DEFAULT_PRODUCT_PLACEHOLDER = '/assets/placeholders/product-placeholder.svg';

/**
 * Returns the backend media base origin without any /api suffix.
 * e.g. "https://api.chipakk.shop/api" -> "https://api.chipakk.shop"
 */
export function getMediaBaseUrl(): string {
  const apiBase = siteConfig.apiBaseUrl || 'https://api.chipakk.shop/api';
  return apiBase.replace(/\/api\/?$/, '').replace(/\/$/, '');
}

/**
 * Resolves a product or asset image path to a fully qualified URL:
 * - Null / undefined / empty -> returns fallback
 * - Absolute URLs (http://, https://, //) -> returned unchanged
 * - Data URLs (data:) or Blob URLs (blob:) -> returned unchanged
 * - Local static frontend assets (/assets/...) -> returned unchanged
 * - Relative upload paths (/uploads/... or uploads/...) -> prepends backend media host
 */
export function resolveImageUrl(
  url?: string | null,
  fallback: string = DEFAULT_PRODUCT_PLACEHOLDER
): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return fallback;
  }

  const trimmed = url.trim();

  // Already absolute or browser protocol
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  // Local frontend static assets
  if (trimmed.startsWith('/assets/') || trimmed.startsWith('assets/')) {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }

  // Relative upload paths from backend
  const mediaBase = getMediaBaseUrl();
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${mediaBase}${cleanPath}`;
}
