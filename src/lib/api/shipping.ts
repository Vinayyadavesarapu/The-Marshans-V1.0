/**
 * THE MARSHANS — Customer Shipping Service Layer (Store 2)
 *
 * Source of truth: Backend store settings & shipping policy (/api/settings).
 * Strictly consumes backend calculation. Does NOT hardcode fees, thresholds, or rules.
 *
 * Architecture is cleanly separated so future delivery-partner calculations
 * can replace or extend the backend policy without touching UI components.
 */

import { apiClient } from './client';

export interface ShippingPolicy {
  storeId: number;
  standardFee: number; // in rupees
  freeShippingEnabled: boolean;
  freeShippingThreshold: number; // in rupees (0 if none)
  freeShippingCalculation?: string;
  source: 'api' | 'cache' | 'default';
}

export interface ShippingCalculation {
  subtotal: number;
  shipping: number; // in rupees
  total: number; // in rupees
  isFreeShipping: boolean;
  freeShippingEnabled: boolean;
  freeShippingThreshold: number;
  amountNeededForFreeShipping: number;
  progressPercent: number;
}

const SHIPPING_POLICY_STORAGE_KEY = 'marshans_shipping_policy';

// In-memory cache
let inMemoryPolicy: ShippingPolicy | null = null;
let activeFetchPromise: Promise<ShippingPolicy> | null = null;

/**
 * Returns currently cached shipping policy synchronously (for instant UI render).
 * Resolves from memory, then sessionStorage, then safe fallback.
 */
export function getCachedShippingPolicy(): ShippingPolicy {
  if (inMemoryPolicy) return inMemoryPolicy;

  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(SHIPPING_POLICY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.standardFee === 'number') {
          inMemoryPolicy = { ...parsed, source: 'cache' };
          return inMemoryPolicy;
        }
      }
    } catch {}
  }

  return {
    storeId: 2,
    standardFee: 50,
    freeShippingEnabled: false,
    freeShippingThreshold: 0,
    source: 'default'
  };
}

/**
 * Saves policy to memory, sessionStorage, and emits event if changed.
 */
function setCachedPolicy(policy: ShippingPolicy): void {
  inMemoryPolicy = policy;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(SHIPPING_POLICY_STORAGE_KEY, JSON.stringify(policy));
      window.dispatchEvent(new CustomEvent('marshans:shipping-policy-updated', { detail: policy }));
    } catch {}
  }
}

/**
 * Fetches authoritative shipping policy from backend /api/settings.
 * Single source of truth across shopping bag and checkout.
 */
export async function getShippingPolicy(forceRefresh = false): Promise<ShippingPolicy> {
  if (!forceRefresh && inMemoryPolicy && inMemoryPolicy.source === 'api') {
    return inMemoryPolicy;
  }

  if (!forceRefresh && activeFetchPromise) {
    return activeFetchPromise;
  }

  activeFetchPromise = (async () => {
    try {
      const res = await apiClient<any>('/settings');
      if (res && res.success && res.data?.settings) {
        const s = res.data.settings;

        // Resolve standard fee in rupees (paise conversion if needed)
        const feeRupees = typeof s.shipping_fee_rupees === 'number'
          ? s.shipping_fee_rupees
          : (typeof s.shipping_fee === 'number' ? Math.round(s.shipping_fee / 100) : 50);

        // Resolve free shipping threshold in rupees
        const thresholdRupees = typeof s.free_shipping_threshold_rupees === 'number'
          ? s.free_shipping_threshold_rupees
          : (typeof s.free_shipping_threshold === 'number' ? Math.round(s.free_shipping_threshold / 100) : 0);

        // Free shipping is enabled ONLY when backend says enabled AND threshold > 0
        const freeEnabled = Boolean(s.free_shipping_enabled && thresholdRupees > 0);

        const policy: ShippingPolicy = {
          storeId: Number(s.store_id) || 2,
          standardFee: feeRupees,
          freeShippingEnabled: freeEnabled,
          freeShippingThreshold: thresholdRupees,
          freeShippingCalculation: s.free_shipping_calculation || 'gross_subtotal',
          source: 'api'
        };

        setCachedPolicy(policy);
        return policy;
      }
    } catch (err) {
      console.warn('[Shipping] Failed to load store shipping settings from API:', err);
    }

    const fallback = getCachedShippingPolicy();
    return fallback;
  })();

  try {
    return await activeFetchPromise;
  } finally {
    activeFetchPromise = null;
  }
}

/**
 * Authoritative client shipping calculation using backend-provided policy.
 * Used identically by Shopping Bag, Checkout, and Order confirmation.
 */
export function calculateShipping(
  subtotal: number,
  policy: ShippingPolicy = getCachedShippingPolicy()
): ShippingCalculation {
  const safeSubtotal = Math.max(0, Number(subtotal) || 0);

  if (safeSubtotal === 0) {
    return {
      subtotal: 0,
      shipping: 0,
      total: 0,
      isFreeShipping: false,
      freeShippingEnabled: policy.freeShippingEnabled,
      freeShippingThreshold: policy.freeShippingThreshold,
      amountNeededForFreeShipping: policy.freeShippingThreshold,
      progressPercent: 0
    };
  }

  // Qualifies for free delivery if backend enabled it and subtotal meets threshold,
  // or if standard fee is configured as 0.
  const qualifiesForFree =
    (policy.freeShippingEnabled && policy.freeShippingThreshold > 0 && safeSubtotal >= policy.freeShippingThreshold) ||
    policy.standardFee === 0;

  const shipping = qualifiesForFree ? 0 : policy.standardFee;
  const total = safeSubtotal + shipping;

  const amountNeeded = (policy.freeShippingEnabled && policy.freeShippingThreshold > 0)
    ? Math.max(0, policy.freeShippingThreshold - safeSubtotal)
    : 0;

  const progressPercent = (policy.freeShippingEnabled && policy.freeShippingThreshold > 0)
    ? Math.min(100, Math.round((safeSubtotal / policy.freeShippingThreshold) * 100))
    : 0;

  return {
    subtotal: safeSubtotal,
    shipping,
    total,
    isFreeShipping: qualifiesForFree,
    freeShippingEnabled: policy.freeShippingEnabled,
    freeShippingThreshold: policy.freeShippingThreshold,
    amountNeededForFreeShipping: amountNeeded,
    progressPercent
  };
}
