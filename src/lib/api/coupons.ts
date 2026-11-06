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
 * Retrieve active customer coupon from browser session
 */
export function getAppliedCoupon(): ValidatedCoupon | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(APPLIED_COUPON_STORAGE_KEY) || localStorage.getItem(APPLIED_COUPON_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.code === 'string') {
      return parsed;
    }
  } catch {}
  return null;
}

/**
 * Save active customer coupon to browser session and notify listeners
 */
export function saveAppliedCoupon(coupon: ValidatedCoupon | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (coupon) {
      const serialized = JSON.stringify(coupon);
      sessionStorage.setItem(APPLIED_COUPON_STORAGE_KEY, serialized);
      localStorage.setItem(APPLIED_COUPON_STORAGE_KEY, serialized);
    } else {
      sessionStorage.removeItem(APPLIED_COUPON_STORAGE_KEY);
      localStorage.removeItem(APPLIED_COUPON_STORAGE_KEY);
    }
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent('marshans:coupon-updated', { detail: coupon }));
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
      const data = res.data;
      const validated: ValidatedCoupon = {
        id: data.id,
        code: String(data.code || cleanCode).toUpperCase(),
        discountType: data.discount_type || 'percent',
        discountValue: Number(data.discount_value) || 0,
        discountRupees: Number(data.discount_rupees !== undefined ? data.discount_rupees : (data.discount || 0)),
        minOrderValueRupees: Number(data.min_order_value_rupees !== undefined ? data.min_order_value_rupees : 0),
        maxDiscountAmountRupees: data.max_discount_amount_rupees !== undefined && data.max_discount_amount_rupees !== null
          ? Number(data.max_discount_amount_rupees)
          : null
      };
      return { success: true, coupon: validated };
    }

    return {
      success: false,
      error: res.error || 'Invalid or inactive coupon code.'
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Unable to validate coupon code. Please try again.'
    };
  }
}

/**
 * Calculate rupee discount amount from an authoritative validated coupon and gross subtotal
 */
export function calculateCouponDiscount(coupon: ValidatedCoupon | null, subtotalRupees: number): number {
  if (!coupon || !coupon.code || subtotalRupees <= 0) return 0;
  if (coupon.minOrderValueRupees && subtotalRupees < coupon.minOrderValueRupees) return 0;

  let discount = 0;
  if (coupon.discountType === 'percent') {
    discount = Math.round((subtotalRupees * coupon.discountValue) / 100);
  } else {
    discount = Math.round(coupon.discountRupees);
  }

  if (coupon.maxDiscountAmountRupees && discount > coupon.maxDiscountAmountRupees) {
    discount = coupon.maxDiscountAmountRupees;
  }

  return Math.min(Math.max(0, discount), subtotalRupees);
}
