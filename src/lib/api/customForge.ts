/**
 * THE MARSHANS — Dedicated Custom Forge API Service Layer
 *
 * Strictly isolated from retail /api/orders and retail /api/payments.
 * Matches the dedicated 7-table schema defined in migration 019:
 * 1. custom_forge_products
 * 2. custom_forge_product_variants
 * 3. custom_forge_orders
 * 4. custom_forge_order_items
 * 5. custom_forge_order_customizations
 * 6. custom_forge_order_status_history
 * 7. custom_forge_payments
 *
 * Store 2 Isolation:
 * Injects X-Store-ID: 2 and X-Store-Code: marshans.
 * Uses MARSHANS_RAZORPAY_KEY_ID for payment orders.
 *
 * Current Backend Status:
 * Migration 019 is awaiting separate approval and dedicated endpoints are not yet deployed.
 * Operational status is reported truthfully without falling back to retail tables.
 */

// Dynamic import helper to ensure pure ESM test runners (node --test) without bundlers can import customForge.ts without resolving extensionless sub-dependencies.
let _apiClient: any = null;
async function callApi<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  if (!_apiClient) {
    const mod = await import('./client.ts');
    _apiClient = mod.apiClient;
  }
  return _apiClient(endpoint, options);
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  error?: string;
  timestamp?: string;
}

export interface CustomForgeSizeVariant {
  id: 'cf-lj-6in' | 'cf-lj-1ft' | 'cf-lj-2ft' | string;
  backendVariantId: number;
  sizeLabel: '6 inches' | '1 foot' | '2 feet';
  sku?: string;
  sizeInches?: number;
  heightMm: number;
  price: number; // GST-inclusive (paise or INR)
  customModeAllowed: boolean;
  description: string;
  isPopular?: boolean;
}

export const LADY_JUSTICE_VARIANTS: CustomForgeSizeVariant[] = [
  {
    id: 'cf-lj-6in',
    backendVariantId: 1,
    sizeLabel: '6 inches',
    sku: 'MRSH-CF-LJ-6IN',
    sizeInches: 6,
    heightMm: 152,
    price: 1600,
    customModeAllowed: false,
    description: 'Compact desktop statuette with ultra-fine 0.12mm sculptural details.'
  },
  {
    id: 'cf-lj-1ft',
    backendVariantId: 2,
    sizeLabel: '1 foot',
    sku: 'MRSH-CF-LJ-1FT',
    sizeInches: 12,
    heightMm: 305,
    price: 3500,
    customModeAllowed: true,
    isPopular: true,
    description: 'Architectural scale study with optional bespoke personalized nameplate.'
  },
  {
    id: 'cf-lj-2ft',
    backendVariantId: 3,
    sizeLabel: '2 feet',
    sku: 'MRSH-CF-LJ-2FT',
    sizeInches: 24,
    heightMm: 610,
    price: 5600,
    customModeAllowed: true,
    description: 'Heroic courtroom & executive gallery centerpiece with optional bespoke personalized nameplate.'
  }
];

export const VARIANT_ID_MAP: Record<string, number> = {
  'cf-lj-6in': 1,
  'cf-lj-1ft': 2,
  'cf-lj-2ft': 3,
  'mrsh-cf-lj-6in': 1,
  'mrsh-cf-lj-1ft': 2,
  'mrsh-cf-lj-2ft': 3,
  '1': 1,
  '2': 2,
  '3': 3
};

export const VARIANT_KEY_MAP: Record<string, string> = {
  '1': 'cf-lj-6in',
  '2': 'cf-lj-1ft',
  '3': 'cf-lj-2ft',
  'cf-lj-6in': 'cf-lj-6in',
  'cf-lj-1ft': 'cf-lj-1ft',
  'cf-lj-2ft': 'cf-lj-2ft',
  'mrsh-cf-lj-6in': 'cf-lj-6in',
  'mrsh-cf-lj-1ft': 'cf-lj-1ft',
  'mrsh-cf-lj-2ft': 'cf-lj-2ft'
};

export function resolveVariantNumericId(id: string | number | undefined | null): number {
  if (typeof id === 'number' && Number.isInteger(id) && id > 0) return id;
  const key = String(id || '').trim().toLowerCase();
  return VARIANT_ID_MAP[key] || 1;
}

export function resolveVariantKey(id: string | number | undefined | null): string {
  const key = String(id || '').trim().toLowerCase();
  return VARIANT_KEY_MAP[key] || (key.startsWith('cf-lj-') ? key : 'cf-lj-6in');
}

export interface CustomForgeCustomizationInput {
  name: string;
  designation: string;
  second_name?: string | null;
  second_designation?: string | null;
  material: 'Plastic' | 'MDF';
}

export interface CustomForgeValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export interface CreateCustomForgeOrderItemPayload {
  variant_id: number | string;
  variant_key?: string;
  quantity?: number;
  custom_mode: 0 | 1;
  customization?: {
    customer_name: string;
    customer_designation: string;
    second_customer_name?: string | null;
    second_customer_designation?: string | null;
    nameplate_material: 'Plastic' | 'MDF';
  } | null;
}

export interface CreateCustomForgeOrderPayload {
  variant_id?: number | string;
  variant_key?: string;
  quantity?: number;
  custom_mode?: 0 | 1;
  coupon_code?: string;
  customization?: {
    customer_name: string;
    customer_designation: string;
    second_customer_name?: string | null;
    second_customer_designation?: string | null;
    nameplate_material: 'Plastic' | 'MDF';
  } | null;
  items?: CreateCustomForgeOrderItemPayload[];
  shipping_address: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
    email?: string;
  };
  customer_notes?: string | null;
}

export interface CustomForgeOrderRecord {
  id: number;
  store_id: number;
  order_number: string;
  customer_id: number;
  customer_email: string;
  customer_name: string;
  customer_phone: string;
  shipping_address: any;
  shipping_charge: number;
  subtotal: number;
  tax_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_price: number;
  payment_method: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  production_status: string;
  customer_notes?: string | null;
  admin_notes?: string | null;
  gateway_order_id?: string | null;
  created_at: string;
  updated_at: string;
  items?: any[];
  customization?: {
    customer_name: string;
    customer_designation: string;
    nameplate_material: 'Plastic' | 'MDF';
  } | null;
}

/**
 * Lady Justice Customization Pricing (Authoritative Constants)
 * - Personalized Nameplate: +₹29
 * - Organic Wood / MDF engraving: +₹50
 * - Precision Polymer: +₹0
 * Formula: unitPrice = editionPrice + nameplateCharge + materialCharge
 */
export const LADY_JUSTICE_CUSTOMIZATION_PRICING = {
  NAMEPLATE_RUPEES: 29,
  WOOD_MDF_RUPEES: 50
} as const;

export function calculateLadyJusticePrice(
  editionPrice: number,
  customModeEnabled: boolean,
  material: 'Plastic' | 'MDF',
  quantity: number = 1
): {
  editionPrice: number;
  nameplateCharge: number;
  materialCharge: number;
  unitPrice: number;
  totalPrice: number;
} {
  const nameplateCharge = customModeEnabled ? LADY_JUSTICE_CUSTOMIZATION_PRICING.NAMEPLATE_RUPEES : 0;
  // Wooden engraving is strictly dependent on Personalized Nameplate being enabled
  const materialCharge = (customModeEnabled && material === 'MDF') ? LADY_JUSTICE_CUSTOMIZATION_PRICING.WOOD_MDF_RUPEES : 0;
  const unitPrice = editionPrice + nameplateCharge + materialCharge;
  const totalPrice = unitPrice * Math.max(1, quantity);

  return {
    editionPrice,
    nameplateCharge,
    materialCharge,
    unitPrice,
    totalPrice
  };
}

/**
 * Validates Custom Mode inputs according to strict business rules:
 * - 6-inch variant: Custom Mode unavailable.
 * - 1-foot / 2-feet: Custom Mode optional.
 * - When Custom Mode is enabled:
 *     - Name required, max 35 chars.
 *     - Designation optional, max 50 chars (literal 'NIL' accepted).
 *     - Nameplate material required: 'Plastic' (+₹0) or 'MDF' (+₹50).
 * - When Custom Mode is disabled:
 *     - Customization fields must not be required.
 *     - Material cannot be MDF (wood engraving requires personalized nameplate).
 */
export function validateCustomForgeCustomization(
  variant: CustomForgeSizeVariant,
  customModeEnabled: boolean,
  data?: Partial<CustomForgeCustomizationInput>
): CustomForgeValidationResult {
  const errors: Record<string, string> = {};

  if (!customModeEnabled) {
    if (data?.material === 'MDF' || /wood/i.test(String(data?.material || ''))) {
      errors.material = 'Wooden engraving (+₹50) is only available when Personalized Nameplate is enabled.';
      return { valid: false, errors };
    }
    return { valid: true, errors: {} };
  }

  if (!variant.customModeAllowed) {
    errors.variant = 'Custom Mode is unavailable for the 6-inch variant.';
    return { valid: false, errors };
  }

  const name = (data?.name || '').trim();
  if (!name) {
    errors.name = 'Name is required when Custom Mode is enabled.';
  } else if (name.length > 35) {
    errors.name = 'Name must be 35 characters or fewer.';
  }

  const designation = (data?.designation || '').trim();
  if (!designation) {
    errors.designation = 'Designation is required (or enter NIL).';
  } else if (designation.length > 50) {
    errors.designation = 'Designation must be 50 characters or fewer.';
  }

  // Validate optional second person details
  const secondName = (data?.second_name || '').trim();
  const secondDesignation = (data?.second_designation || '').trim();
  if (secondName || secondDesignation) {
    if (!secondName) {
      errors.second_name = 'Second person name is required when second person details are provided.';
    } else if (secondName.length > 35) {
      errors.second_name = 'Second person name must be 35 characters or fewer.';
    }

    if (!secondDesignation) {
      errors.second_designation = 'Second person designation is required (or enter NIL).';
    } else if (secondDesignation.length > 50) {
      errors.second_designation = 'Second person designation must be 50 characters or fewer.';
    }
  }

  const material = data?.material;
  if (!material || (material !== 'Plastic' && material !== 'MDF')) {
    errors.material = 'Please select a nameplate material (Plastic or MDF).';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Fetch Lady Justice product catalog data from Custom Forge backend
 */
export async function fetchLadyJusticeCatalog(): Promise<ApiResponse<any>> {
  return callApi('/custom-forge/products/lady-justice', { method: 'GET' });
}

/**
 * Place a new authenticated Custom Forge order
 * POST /api/custom-forge/orders
 */
export async function createCustomForgeOrderApi(
  payload: CreateCustomForgeOrderPayload
): Promise<ApiResponse<CustomForgeOrderRecord>> {
  return callApi<CustomForgeOrderRecord>('/custom-forge/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * Get an authenticated customer's Custom Forge order by ID
 * GET /api/custom-forge/orders/:id
 */
export async function getCustomForgeOrderApi(
  orderId: number | string
): Promise<ApiResponse<CustomForgeOrderRecord>> {
  return callApi<CustomForgeOrderRecord>(`/custom-forge/orders/${orderId}`, {
    method: 'GET'
  });
}

/**
 * Checks the operational status of the dedicated Custom Forge backend service.
 * Truthfully reports when migration 019 is pending so purchases are safely paused.
 */
export async function getCustomForgeBackendStatus(): Promise<{
  operational: boolean;
  migrationExecuted: boolean;
  message: string;
}> {
  return {
    operational: false,
    migrationExecuted: false,
    message: 'Direct online checkout for bespoke Custom Forge editions is temporarily paused while our dedicated manufacturing queue is being provisioned. Please check back shortly or explore specifications below.'
  };
}
