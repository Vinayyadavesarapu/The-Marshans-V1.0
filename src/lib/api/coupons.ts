/**
 * THE MARSHANS — Customer Coupon Integration Service
 *
 * Connects directly to live backend API at https://api.chipakk.shop/api/coupons/validate
 * Injects X-Store-ID: 2 and Bearer token automatically via client.ts.
 * Manages coupon session state, discount calculations, and client persistence.
 */

import { apiClient } from './client';

export interface ValidatedCoupon {
  id: number | string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  discountRupees: number;
  minOrderValueRupees: number;
  maxDiscountAmountRupees?: number | null;
}

const APPLIED_COUPON_STORAGE_KEY = 'marshans_applied_coupon';

/**
 * Normalizes any coupon data shape (camelCase, snake_case, backend response, or partial session object)
 * into a type-safe, validated ValidatedCoupon contract with guaranteed numbers.
 */
export function normalizeCoupon(raw: any): ValidatedCoupon | null {
  if (!raw || typeof raw !== 'object') return null;
  const code = String(raw.code || '').trim().toUpperCase();
  if (!code) return null;

  const rawType = String(raw.discountType || raw.discount_type || 'percent').toLowerCase();
  const isPercent = rawType.includes('percent');
  const discountType: 'percent' | 'fixed' = isPercent ? 'percent' : 'fixed';

  const discountValue = Number(raw.discountValue ?? raw.discount_value) || 0;

  // Resolve discount in rupees accurately, checking all possible field names
  let discountRupees = Number(
    raw.discountRupees ??
    raw.discount_rupees ??
    raw.discount_value_rupees ??
    raw.discount ??
    raw.discount_amount ??
    0
  );
  if (isNaN(discountRupees) || discountRupees < 0) discountRupees = 0;

  // If fixed discount and discountRupees was not populated directly, resolve from discountValue
  if (!isPercent && discountRupees === 0 && discountValue > 0) {
    discountRupees = discountValue > 10000 ? Math.round(discountValue / 100) : discountValue;
  }

  // Resolve minimum order spend in rupees (protecting against paise values > 10000)
  let minOrderVal = Number(
    raw.minOrderValueRupees ??
    raw.min_order_value_rupees ??
    0
  );
  if (minOrderVal === 0 && (raw.minOrderValue !== undefined || raw.min_order_value !== undefined)) {
    const rawMin = Number(raw.minOrderValue ?? raw.min_order_value) || 0;
    minOrderVal = rawMin > 10000 ? Math.round(rawMin / 100) : rawMin;
  }
  if (isNaN(minOrderVal) || minOrderVal < 0) minOrderVal = 0;

  // Resolve maximum discount ceiling in rupees
  let maxDiscount: number | null = null;
  const rawMax = raw.maxDiscountAmountRupees !== undefined ? raw.maxDiscountAmountRupees : raw.max_discount_amount_rupees;
  if (rawMax !== undefined && rawMax !== null) {
    maxDiscount = Number(rawMax);
    if (isNaN(maxDiscount) || maxDiscount <= 0) maxDiscount = null;
  } else if (raw.max_discount_amount !== undefined && raw.max_discount_amount !== null) {
    const numMax = Number(raw.max_discount_amount);
    maxDiscount = numMax > 10000 ? Math.round(numMax / 100) : numMax;
    if (isNaN(maxDiscount) || maxDiscount <= 0) maxDiscount = null;
  }

  return {
    id: raw.id ?? code,
    code,
    discountType,
    discountValue,
    discountRupees,
    minOrderValueRupees: minOrderVal,
    maxDiscountAmountRupees: maxDiscount
  };
}

/**
 * Retrieve active customer coupon from browser session
 */
export function getAppliedCoupon(): ValidatedCoupon | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(APPLIED_COUPON_STORAGE_KEY) || localStorage.getItem(APPLIED_COUPON_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return normalizeCoupon(parsed);
  } catch {}
  return null;
}

/**
 * Save active customer coupon to browser session and notify listeners
 */
export function saveAppliedCoupon(coupon: ValidatedCoupon | null): void {
  if (typeof window === 'undefined') return;
  try {
    const normalized = normalizeCoupon(coupon);
    if (normalized) {
      const serialized = JSON.stringify(normalized);
      sessionStorage.setItem(APPLIED_COUPON_STORAGE_KEY, serialized);
      localStorage.setItem(APPLIED_COUPON_STORAGE_KEY, serialized);
      window.dispatchEvent(new CustomEvent('marshans:coupon-updated', { detail: normalized }));
    } else {
      sessionStorage.removeItem(APPLIED_COUPON_STORAGE_KEY);
      localStorage.removeItem(APPLIED_COUPON_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('marshans:coupon-updated', { detail: null }));
    }
  } catch {}
}

/**
 * Remove active customer coupon
 */
export function clearAppliedCoupon(): void {
  saveAppliedCoupon(null);
}

/**
 * Validate coupon code against current cart subtotal via authoritative backend endpoint
 * POST /api/coupons/validate
 */
export async function validateCouponApi(
  code: string,
  subtotalRupees: number
): Promise<{ success: boolean; coupon?: ValidatedCoupon; error?: string }> {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) {
    return { success: false, error: 'Please enter a coupon code.' };
  }

  try {
    const res = await apiClient<any>('/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({
        code: cleanCode,
        subtotal_in_rupees: Math.max(0, Math.round(Number(subtotalRupees) || 0))
      })
    });

    if (res && res.success && res.data) {
      const validated = normalizeCoupon({
        ...res.data,
        code: cleanCode
      });
      if (validated) {
        return { success: true, coupon: validated };
      }
    }

    return {
      success: false,
      error: res?.error || 'Invalid or inactive coupon code.'
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Unable to validate coupon code. Please try again.'
    };
  }
}

/**
 * Calculate rupee discount amount from an authoritative validated coupon and gross subtotal.
 * Always returns a non-negative finite integer, capped at gross subtotal.
 */
export function calculateCouponDiscount(coupon: ValidatedCoupon | null, subtotalRupees: number): number {
  const norm = normalizeCoupon(coupon);
  const subtotal = Math.max(0, Math.round(Number(subtotalRupees) || 0));
  if (!norm || subtotal <= 0) return 0;
  if (norm.minOrderValueRupees > 0 && subtotal < norm.minOrderValueRupees) return 0;

  let discount = 0;
  if (norm.discountType === 'percent') {
    discount = Math.round((subtotal * norm.discountValue) / 100);
  } else {
    discount = Math.round(norm.discountRupees);
  }

  if (norm.maxDiscountAmountRupees !== null && norm.maxDiscountAmountRupees !== undefined && discount > norm.maxDiscountAmountRupees) {
    discount = norm.maxDiscountAmountRupees;
  }

  if (isNaN(discount) || !isFinite(discount) || discount < 0) return 0;
  return Math.min(Math.round(discount), subtotal);
}
