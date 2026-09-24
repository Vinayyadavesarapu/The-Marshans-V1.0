/**
 * THE MARSHANS — Production Cart Service Layer (Store 2)
 *
 * Connects directly to backend /api/cart with X-Store-ID: 2 and Bearer token.
 * Business Rule: Unauthenticated users CANNOT add items to cart.
 * Backend database is the single authoritative source of pricing & cart items.
 */

import { apiClient } from './client';
import { getFirebaseClient } from '../firebase/client';
import { CART_CACHE_KEY, PENDING_CART_ITEM_KEY } from '../session/cache';

export interface CartItem {
  id: string; // Cart item ID from backend database
  productId: number;
  marshansProductId?: number;
  name: string;
  slug: string;
  sku: string;
  price: number;
  quantity: number;
  imageUrl: string;
  categoryName?: string;
  material?: string;
  finishing?: string;
  options?: Record<string, any>;
}

export interface CartSummary {
  itemCount: number;
  subtotal: number;
  shipping: number;
  total: number;
  isFreeShipping: boolean;
}

const STORAGE_CACHE_KEY = CART_CACHE_KEY;

/**
 * Check if customer is currently authenticated in Firebase client
 */
export function isCustomerAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const { auth } = getFirebaseClient();
    return Boolean(auth && auth.currentUser);
  } catch {
    return false;
  }
}

/**
 * Get cached cart items for instant local UI rendering
 */
export function getLocalCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalCart(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(items));
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    window.dispatchEvent(new CustomEvent('marshans:cart-updated', { detail: { items, count } }));
  } catch (err) {
    console.error('Failed to save cart cache:', err);
  }
}

/**
 * Fetch authoritative cart from backend /api/cart
 */
export async function getBackendCart(): Promise<{ items: CartItem[]; subtotal: number; count: number }> {
  if (!isCustomerAuthenticated()) {
    saveLocalCart([]);
    return { items: [], subtotal: 0, count: 0 };
  }

  try {
    const res = await apiClient<any>('/cart');
    if (res && res.success && res.data) {
      const rawItems = res.data.items || [];
      const items: CartItem[] = rawItems.map((row: any) => ({
        id: String(row.id),
        productId: Number(row.marshans_product_id || row.product_id),
        marshansProductId: Number(row.marshans_product_id),
        name: row.product_name || 'Artifact',
        slug: row.sku || `item-${row.id}`,
        sku: row.sku || '',
        price: Number(row.unit_price) || 0,
        quantity: Number(row.quantity) || 1,
        imageUrl: row.image_url || '/assets/placeholders/product-placeholder.svg',
        material: row.options_snapshot?.material || '',
        finishing: row.options_snapshot?.finishing || '',
        options: row.options_snapshot || {}
      }));

      saveLocalCart(items);
      const subtotal = Number(res.data.subtotal) || items.reduce((s, it) => s + (it.price * it.quantity), 0);
      const count = Number(res.data.total_items) || items.reduce((s, it) => s + it.quantity, 0);
      return { items, subtotal, count };
    }
  } catch (err) {
    console.warn('Backend cart retrieval notice:', err);
  }

  const cached = getLocalCart();
  const subtotal = cached.reduce((s, it) => s + (it.price * it.quantity), 0);
  const count = cached.reduce((s, it) => s + it.quantity, 0);
  return { items: cached, subtotal, count };
}

/**
 * Add Item to Cart:
 * STRICT BUSINESS RULE:
 * If customer is NOT authenticated, returns requiresLogin: true and preserves pending item.
 */
export async function addToCart(item: {
  productId: number;
  name?: string;
  slug?: string;
  sku?: string;
  price?: number;
  quantity?: number;
  imageUrl?: string;
  material?: string;
  finishing?: string;
  options?: Record<string, any>;
}): Promise<{ success: boolean; requiresLogin?: boolean; error?: string; cart?: any }> {
  // 1. Enforce Authentication Requirement
  if (!isCustomerAuthenticated()) {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(PENDING_CART_ITEM_KEY, JSON.stringify(item));
      } catch {}
    }
    return {
      success: false,
      requiresLogin: true,
      error: 'Please sign in to add collectibles to your shopping bag.'
    };
  }

  // 2. Authenticated: Submit to live backend cart API
  try {
    const payload = {
      product_id: item.productId,
      quantity: item.quantity || 1,
      options: item.options || {
        material: item.material,
        finishing: item.finishing
      }
    };

    const res = await apiClient<any>('/cart/items', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res && res.success) {
      await getBackendCart();
      return { success: true, cart: res.data };
    }

    return {
      success: false,
      error: res?.error || 'Failed to add item to your bag on the server.'
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Unable to connect to cart server.'
    };
  }
}

/**
 * Update item quantity via backend PATCH /api/cart/items/:id
 */
export async function updateCartQuantity(cartItemId: string, delta: number, currentQty?: number): Promise<boolean> {
  const current = getLocalCart();
  const existing = current.find(item => item.id === cartItemId);
  const actualQty = typeof currentQty === 'number' ? currentQty : (existing ? existing.quantity : 1);
  const newQty = actualQty + delta;
  if (newQty <= 0) {
    return await removeFromCart(cartItemId);
  }

  try {
    const res = await apiClient<any>(`/cart/items/${encodeURIComponent(cartItemId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity: newQty })
    });

    if (res && res.success) {
      await getBackendCart();
      return true;
    }
  } catch (err) {
    console.error('Update cart item error:', err);
  }

  // Optimistic fallback for local display
  const fallbackItems = getLocalCart();
  const updated = fallbackItems.map(item => item.id === cartItemId ? { ...item, quantity: newQty } : item);
  saveLocalCart(updated);
  return true;
}

/**
 * Remove item from backend DELETE /api/cart/items/:id
 */
export async function removeFromCart(cartItemId: string): Promise<boolean> {
  try {
    const res = await apiClient<any>(`/cart/items/${encodeURIComponent(cartItemId)}`, {
      method: 'DELETE'
    });

    if (res && res.success) {
      await getBackendCart();
      return true;
    }
  } catch (err) {
    console.error('Remove cart item error:', err);
  }

  const current = getLocalCart();
  const updated = current.filter(item => item.id !== cartItemId);
  saveLocalCart(updated);
  return true;
}

/**
 * Clear cart via backend DELETE /api/cart
 */
export async function clearCart(): Promise<void> {
  try {
    await apiClient('/cart', {
      method: 'DELETE'
    });
  } catch {}
  saveLocalCart([]);
}

import { calculateShipping, getCachedShippingPolicy, getShippingPolicy, type ShippingPolicy, type ShippingCalculation } from './shipping';

export { getShippingPolicy, getCachedShippingPolicy, calculateShipping };
export type { ShippingPolicy, ShippingCalculation };

/**
 * Calculate cart summary metrics using authoritative backend shipping policy
 */
export function getCartSummary(
  items: CartItem[] = getLocalCart(),
  policy?: ShippingPolicy
): CartSummary {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  if (items.length === 0) {
    return {
      itemCount: 0,
      subtotal: 0,
      shipping: 0,
      total: 0,
      isFreeShipping: false
    };
  }

  const calc = calculateShipping(subtotal, policy || getCachedShippingPolicy());

  return {
    itemCount,
    subtotal: calc.subtotal,
    shipping: calc.shipping,
    total: calc.total,
    isFreeShipping: calc.isFreeShipping
  };
}

export function getCartCount(): number {
  return getLocalCart().reduce((sum, item) => sum + item.quantity, 0);
}
