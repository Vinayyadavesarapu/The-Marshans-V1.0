/**
 * THE MARSHANS — browser-side cached customer data.
 *
 * These keys hold per-customer data on a shared browser. They are NOT tied to a Firebase uid, so they must be wiped
 * on logout or the next person to sign in on the same device would see the previous customer's cart and address.
 * Only Marshans customer keys live here; unrelated site state (e.g. the home-intro flag) is never touched.
 */

export const CART_CACHE_KEY = 'marshans_cart_cache_v1';
export const SAVED_ADDRESS_KEY = 'marshans_saved_address_v1';
export const PENDING_CART_ITEM_KEY = 'marshans_pending_cart_item';

export function clearMarshansCustomerCache(): void {
  if (typeof window === 'undefined') return;

  try { window.localStorage.removeItem(CART_CACHE_KEY); } catch {}
  try { window.localStorage.removeItem(SAVED_ADDRESS_KEY); } catch {}
  try { window.sessionStorage.removeItem(PENDING_CART_ITEM_KEY); } catch {}

  // Let any mounted cart badge / cart view drop its in-memory count.
  try {
    window.dispatchEvent(new CustomEvent('marshans:cart-updated', { detail: { items: [], count: 0 } }));
  } catch {}
}
