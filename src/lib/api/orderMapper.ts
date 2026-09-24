/**
 * THE MARSHANS — backend order -> UI order mapping.
 *
 * The backend (GET /orders, GET /orders/:id) is the source of truth and keeps its own field names
 * (total_price_rupees, fulfillment_status, items[].unit_price_rupees, shipping_address.address/pincode, ...).
 * This layer converts that shape into what the Marshans UI components read (total_amount, status, items[].price,
 * shipping_address.postal_code, ...). Backend fields are never renamed to suit the frontend.
 */

export interface OrderItem {
  id: number | string;
  product_id: number | string | null;
  name: string;
  product_name: string;
  sku?: string;
  quantity: number;
  /** Unit price in rupees. */
  price: number;
  /** Line total in rupees. */
  total_price: number;
  image_url: string;
  material: string;
  finishing: string;
}

export interface Order {
  id: number | string;
  order_number: string;
  store_id?: number;
  customer_id?: number;
  customer_email: string;
  customer_phone?: string;
  /** Order total in rupees. */
  total_amount: number;
  subtotal: number;
  shipping_amount: number;
  discount_amount: number;
  /** Human-readable fulfillment status, e.g. "Ready To Ship". */
  status: string;
  payment_status?: string;
  payment_method?: string;
  courier?: string;
  tracking_no?: string;
  shipping_address: {
    name?: string;
    phone?: string;
    line1?: string;
    line2?: string;
    city: string;
    state: string;
    postal_code?: string;
    postalCode?: string;
    country?: string;
  };
  items: OrderItem[];
  created_at: string;
}

export interface OrdersPage {
  orders: Order[];
  total: number;
  limit: number;
  offset: number;
}

const DEFAULT_STATUS = 'Order Placed';

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value);
}

/**
 * Rupee value of a money field. The backend already sends `<field>_rupees` (store 2 stores paise, store 1 stores
 * rupees); when it is absent, fall back to the raw column using the same store rule the backend uses.
 */
function rupees(rawObj: Record<string, any>, field: string, storeId: number | undefined): number {
  const converted = num(rawObj[`${field}_rupees`]);
  if (converted !== null) return converted;
  const raw = num(rawObj[field]);
  if (raw === null) return 0;
  return storeId === 2 ? Math.round(raw / 100) : raw;
}

/** "READY_TO_SHIP" / "quality check" -> "Ready To Ship" / "Quality Check". */
export function formatFulfillmentStatus(raw: unknown): string {
  const text = str(raw).replace(/[_\s]+/g, ' ').trim();
  if (!text) return DEFAULT_STATUS;
  return text
    .toLowerCase()
    .split(' ')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function parseJsonObject(value: unknown): Record<string, any> {
  if (value && typeof value === 'object') return value as Record<string, any>;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {}
  }
  return {};
}

export function normalizeOrderItem(raw: any, storeId?: number): OrderItem {
  const item = raw && typeof raw === 'object' ? raw : {};
  const options = parseJsonObject(item.variant_options);
  const name = str(item.product_name) || str(item.name) || 'Artifact';

  return {
    id: item.id ?? '',
    product_id: item.marshans_product_id ?? item.product_id ?? null,
    name,
    product_name: name,
    sku: item.sku ? str(item.sku) : undefined,
    quantity: num(item.quantity) ?? 1,
    price: rupees(item, 'unit_price', storeId),
    total_price: rupees(item, 'total_price', storeId),
    image_url: str(item.img || item.product_image || item.image_url),
    material: str(options.material),
    finishing: str(options.finishing || options.finish)
  };
}

export function normalizeOrder(raw: any): Order {
  const order = raw && typeof raw === 'object' ? raw : {};
  const storeId = num(order.store_id) ?? undefined;
  const ship = parseJsonObject(order.shipping_address);
  const postalCode = str(ship.pincode || ship.postal_code || ship.postalCode);

  return {
    id: order.id ?? '',
    order_number: str(order.order_number) || String(order.id ?? ''),
    store_id: storeId,
    customer_id: num(order.customer_id) ?? undefined,
    customer_email: str(order.customer_email) || str(ship.email),
    customer_phone: str(order.customer_phone) || str(ship.phone) || undefined,
    total_amount: rupees(order, 'total_price', storeId),
    subtotal: rupees(order, 'subtotal', storeId),
    shipping_amount: rupees(order, 'shipping_charge', storeId),
    discount_amount: rupees(order, 'discount_total', storeId),
    status: formatFulfillmentStatus(order.fulfillment_status),
    payment_status: order.payment_status ? str(order.payment_status) : undefined,
    payment_method: order.payment_method ? str(order.payment_method) : undefined,
    courier: order.courier ? str(order.courier) : undefined,
    tracking_no: order.tracking_no ? str(order.tracking_no) : undefined,
    shipping_address: {
      name: ship.name ? str(ship.name) : undefined,
      phone: ship.phone ? str(ship.phone) : undefined,
      line1: str(ship.address || ship.line1),
      line2: str(ship.line2),
      city: str(ship.city),
      state: str(ship.state),
      postal_code: postalCode,
      postalCode,
      country: str(ship.country) || 'India'
    },
    items: (Array.isArray(order.items) ? order.items : []).map((i: any) => normalizeOrderItem(i, storeId)),
    created_at: str(order.created_at)
  };
}

/** Accepts the backend envelope `{ total, limit, offset, orders }` (or a bare array) and returns UI orders. */
export function normalizeOrdersResponse(data: any): OrdersPage {
  const list: any[] = Array.isArray(data) ? data : Array.isArray(data?.orders) ? data.orders : [];
  const orders = list.map(normalizeOrder);
  return {
    orders,
    total: num(data?.total) ?? orders.length,
    limit: num(data?.limit) ?? orders.length,
    offset: num(data?.offset) ?? 0
  };
}
