/**
 * THE MARSHANS — Orders Service Layer (Production Mode)
 *
 * Connects directly to live backend API at https://api.chipakk.shop/api/orders
 * Injects X-Store-ID: 2, X-Store-Code: marshans, and Bearer token automatically.
 * Zero fake orders, zero synthetic order numbers.
 */

import { apiClient } from './client';
import {
  normalizeOrder,
  normalizeOrdersResponse,
  type Order,
  type OrdersPage
} from './orderMapper';

export type { Order, OrderItem, OrdersPage } from './orderMapper';

export interface OrdersQuery {
  limit?: number;
  offset?: number;
}

/**
 * Backend list endpoint: GET /orders (auth + X-Store-ID: 2 scope it to THIS customer's store-2 orders).
 * There is no /orders/my-orders route; that path is matched by /orders/:id and 404s.
 */
export function buildOrdersPath(query: OrdersQuery = {}): string {
  const params: string[] = [];
  if (Number.isInteger(query.limit) && (query.limit as number) > 0) params.push(`limit=${query.limit}`);
  if (Number.isInteger(query.offset) && (query.offset as number) >= 0) params.push(`offset=${query.offset}`);
  return params.length ? `/orders?${params.join('&')}` : '/orders';
}

/**
 * Fetch one page of the authenticated customer's order history, normalized for the UI.
 */
export async function getOrdersPage(query: OrdersQuery = {}): Promise<OrdersPage> {
  try {
    const res = await apiClient<any>(buildOrdersPath(query));
    if (res && res.success && res.data) {
      return normalizeOrdersResponse(res.data);
    }
  } catch (err) {
    console.error('Failed to retrieve customer orders:', err);
  }
  return { orders: [], total: 0, limit: 0, offset: 0 };
}

export async function getCustomerOrders(query: OrdersQuery = {}): Promise<Order[]> {
  return (await getOrdersPage(query)).orders;
}

export async function getOrders(query: OrdersQuery = {}): Promise<OrdersPage> {
  return getOrdersPage(query);
}

/**
 * Fetch single order by ID or order number from production backend (ownership + store enforced server-side)
 */
export async function getOrderById(orderId: string | number): Promise<Order | null> {
  const clean = String(orderId).trim();
  if (!clean) return null;

  try {
    const res = await apiClient<any>(`/orders/${encodeURIComponent(clean)}`);
    if (res && res.success && res.data) {
      return normalizeOrder(res.data);
    }
  } catch (err) {
    console.error('Failed to retrieve order by ID:', err);
  }
  return null;
}

/**
 * Submit order to production backend.
 * Returns authoritative backend result only.
 */
export async function createOrder(orderPayload: any): Promise<{
  success: boolean;
  orderId?: number | string;
  orderNumber?: string;
  error?: string;
}> {
  try {
    const res = await apiClient<{ id: number; order_number: string }>('/orders', {
      method: 'POST',
      body: JSON.stringify(orderPayload)
    });

    if (res && res.success && res.data) {
      return {
        success: true,
        orderId: res.data.id,
        orderNumber: res.data.order_number || String(res.data.id)
      };
    }

    return {
      success: false,
      error: res.error || 'Server rejected order creation. Please verify your payment details and try again.'
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Unable to connect to order processing server.'
    };
  }
}
