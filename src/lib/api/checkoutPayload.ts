/**
 * THE MARSHANS — checkout form -> POST /orders payload.
 *
 * Matches the EXISTING backend contract (server/services/orderService.js createCustomerOrder):
 *   shipping_address: { name, phone, address, city, state, pincode }   (all required)
 *   items:            [{ product_id, quantity }]
 *   payment_method
 *
 * The backend is authoritative for prices, totals, tax, shipping and the store: it re-reads every product price from
 * its own catalogue and takes the store from the X-Store-ID header, so this payload deliberately carries NO prices,
 * totals or product names. (An item with a `name` but no `product_id` is treated by the backend as a custom sticker
 * and rejected for THE MARSHANS, which is why `product_id` must always be present.)
 */

import { siteConfig } from '../config/site';

export interface CheckoutFormValues {
  email: string;
  phone: string;
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
}

export interface CheckoutCartItem {
  productId: number;
  marshansProductId?: number;
  quantity: number;
}

export interface OrderPayload {
  store_id: number;
  payment_method: string;
  shipping_address: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    email?: string;
  };
  items: Array<{ product_id: number; quantity: number }>;
}

export class CheckoutPayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CheckoutPayloadError';
  }
}

export function buildOrderPayload(
  form: CheckoutFormValues,
  cartItems: CheckoutCartItem[],
  paymentMethod: string
): OrderPayload {
  const items = (cartItems || []).map((item) => {
    const productId = Number(item.marshansProductId || item.productId);
    const quantity = Number(item.quantity);
    if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(quantity) || quantity <= 0) {
      throw new CheckoutPayloadError('An item in your bag is no longer valid. Please refresh your bag and try again.');
    }
    return { product_id: productId, quantity };
  });

  if (items.length === 0) {
    throw new CheckoutPayloadError('Your shopping bag is empty.');
  }

  const line1 = (form.addressLine1 || '').trim();
  const line2 = (form.addressLine2 || '').trim();
  const email = (form.email || '').trim();

  return {
    store_id: siteConfig.storeId,
    payment_method: paymentMethod,
    shipping_address: {
      name: (form.fullName || '').trim(),
      phone: (form.phone || '').trim(),
      address: line2 ? `${line1}, ${line2}` : line1,
      city: (form.city || '').trim(),
      state: (form.state || '').trim(),
      pincode: (form.postalCode || '').trim(),
      country: 'India',
      ...(email ? { email } : {})
    },
    items
  };
}
