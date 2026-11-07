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
  base_price?: number;
  nameplate_charge?: number;
  material_charge?: number;
  image_url: string;
  material: string;
  nameplate_material?: string;
  finishing: string;
  customization?: {
    name?: string;
    designation?: string;
    material?: string;
    status?: string;
  } | null;
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
  coupon_code?: string;
  /** Human-readable fulfillment status, e.g. "Ready To Ship". */
  status: string;
  payment_status?: string;
  payment_method?: string;
  gateway_order_id?: string;
  transaction_id?: string;
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
  const customData = item.customization || options.nameplate || null;
  const isCustom = Boolean(customData && (customData.name || item.custom_mode_enabled));
  const rawMat = str(options.material || item.material || item.nameplate_material || customData?.material);
  const isMdf = /mdf/i.test(rawMat) || /wood/i.test(rawMat);

  const unitPrice = rupees(item, 'unit_price', storeId);
  const explicitNameplate = num(options.nameplate_charge ?? item.nameplate_charge);
  const explicitMaterial = num(options.material_charge ?? item.material_charge);

  let nameplateCharge = 0;
  let materialCharge = 0;
  let basePrice = unitPrice;

  if (explicitNameplate !== null && explicitNameplate !== undefined) {
    nameplateCharge = explicitNameplate;
    materialCharge = explicitMaterial ?? 0;
    basePrice = Math.max(0, unitPrice - nameplateCharge - materialCharge);
  } else if (isCustom && (unitPrice === 3529 || unitPrice === 3579 || unitPrice === 5629 || unitPrice === 5679)) {
    nameplateCharge = 29;
    materialCharge = isMdf ? 50 : 0;
    basePrice = Math.max(0, unitPrice - nameplateCharge - materialCharge);
  }

  return {
    id: item.id ?? '',
    product_id: item.marshans_product_id ?? item.product_id ?? null,
    name,
    product_name: name,
    sku: item.sku ? str(item.sku) : undefined,
    quantity: num(item.quantity) ?? 1,
    price: unitPrice,
    total_price: rupees(item, 'total_price', storeId),
    base_price: basePrice,
    nameplate_charge: nameplateCharge > 0 ? nameplateCharge : undefined,
    material_charge: materialCharge > 0 ? materialCharge : undefined,
    image_url: str(item.img || item.product_image || item.image_url),
    material: rawMat,
    nameplate_material: str(item.nameplate_material || customData?.material || (isMdf ? 'MDF' : (isCustom ? 'Plastic' : ''))),
    finishing: str(options.finishing || options.finish || options.size || item.size_label || item.finishing),
    customization: customData
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
    coupon_code: order.coupon_code ? str(order.coupon_code) : undefined,
    status: formatFulfillmentStatus(order.fulfillment_status || order.production_status || order.status),
    payment_status: order.payment_status ? str(order.payment_status) : undefined,
    payment_method: order.payment_method ? str(order.payment_method) : undefined,
    gateway_order_id: order.gateway_order_id ? str(order.gateway_order_id) : undefined,
    transaction_id: str(order.transaction_id || order.gateway_payment_id || order.gateway_order_id) || undefined,
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
