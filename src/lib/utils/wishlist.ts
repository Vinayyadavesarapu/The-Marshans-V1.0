/**
 * THE MARSHANS — Customer Wishlist Management Utility
 *
 * Persists wishlisted products in browser localStorage so customers
 * retain their saved artifacts across reloads and navigation.
 */

export const WISHLIST_STORAGE_KEY = 'marshans_wishlist_v1';

export function getWishlist(): Array<number | string> {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isItemInWishlist(idOrSlug: number | string): boolean {
  if (typeof window === 'undefined' || idOrSlug == null) return false;
  const list = getWishlist();
  const target = String(idOrSlug);
  return list.some((item) => String(item) === target);
}

export function toggleWishlistItem(idOrSlug: number | string): boolean {
  if (typeof window === 'undefined' || idOrSlug == null) return false;
  try {
    const list = getWishlist();
    const target = String(idOrSlug);
    const exists = list.some((item) => String(item) === target);
    let updated: Array<number | string>;
    if (exists) {
      updated = list.filter((item) => String(item) !== target);
    } else {
      updated = [...list, idOrSlug];
    }
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('marshans:wishlist-updated', { detail: { items: updated } }));
    return !exists;
  } catch {
    return false;
  }
}
