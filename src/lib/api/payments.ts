/**
 * THE MARSHANS — Customer Payment Service Layer (Razorpay Integration)
 *
 * Interacts with backend payment endpoints:
 *   POST /api/payments/create  -> Authoritative Razorpay order initiation
 *   POST /api/payments/verify  -> Cryptographic signature verification
 *   GET  /api/payments/status  -> Payment status query
 *
 * Enforces:
 * - Public key only in the browser (RAZORPAY_KEY_SECRET never in frontend)
 * - Authoritative backend totals and paise calculations
 * - Idempotent, safe payment state handling
 */

import { apiClient } from './client';

export interface PaymentOrderInitResult {
  success: boolean;
  already_paid?: boolean;
  key_id?: string;
  gateway_order_id?: string;
  amount?: number; // amount in paise
  currency?: string;
  order_id?: number | string;
  order_number?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  checkout_config_id?: string;
  error?: string;
}

export interface PaymentVerificationPayload {
  order_id: number | string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface PaymentVerificationResult {
  success: boolean;
  payment_status?: string;
  order_id?: number | string;
  order_number?: string;
  error?: string;
}

/**
 * Dynamically loads the official Razorpay Standard Checkout SDK into the DOM
 */
export function loadRazorpayCheckoutScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      return resolve(false);
    }
    if ((window as any).Razorpay) {
      return resolve(true);
    }

    const existingScript = document.querySelector('script[src*="checkout.razorpay.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Create or reuse a Razorpay Gateway Order via authoritative backend API
 */
export async function createPaymentOrder(orderId: number | string): Promise<PaymentOrderInitResult> {
  const numId = Number(orderId);
  if (!Number.isInteger(numId) || numId <= 0) {
    return { success: false, error: 'A valid order ID is required to initiate payment.' };
  }

  try {
    const res = await apiClient<any>('/payments/create', {
      method: 'POST',
      body: JSON.stringify({ order_id: numId })
    });

    if (res && res.success && res.data) {
      return {
        success: true,
        already_paid: Boolean(res.data.already_paid),
        key_id: res.data.key_id,
        gateway_order_id: res.data.gateway_order_id,
        amount: res.data.amount,
        currency: res.data.currency || 'INR',
        order_id: res.data.order_id || numId,
        order_number: res.data.order_number,
        checkout_config_id: res.data.checkout_config_id,
        prefill: res.data.prefill
      };
    }

    return {
      success: false,
      error: res?.error || 'Unable to initialize secure payment session.'
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Payment initiation failed due to a network error.'
    };
  }
}

/**
 * Verify Razorpay cryptographic signature on backend
 */
export async function verifyPaymentSignature(payload: PaymentVerificationPayload): Promise<PaymentVerificationResult> {
  try {
    const res = await apiClient<any>('/payments/verify', {
      method: 'POST',
      body: JSON.stringify({
        order_id: Number(payload.order_id),
        razorpay_order_id: payload.razorpay_order_id,
        razorpay_payment_id: payload.razorpay_payment_id,
        razorpay_signature: payload.razorpay_signature
      })
    });

    if (res && res.success && res.data) {
      return {
        success: true,
        payment_status: res.data.payment_status || 'paid',
        order_id: res.data.order_id || payload.order_id,
        order_number: res.data.order_number
      };
    }

    return {
      success: false,
      error: res?.error || 'Payment verification failed. Please contact customer support.'
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Payment signature verification encountered a server error.'
    };
  }
}
