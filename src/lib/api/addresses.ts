/**
 * THE MARSHANS — Customer Delivery Addresses Service Layer
 *
 * Connects directly to backend API:
 *   GET    /api/customer/addresses
 *   POST   /api/customer/addresses
 *   PUT    /api/customer/addresses/:id
 *   DELETE /api/customer/addresses/:id
 *
 * Synchronizes with local session cache for zero-latency checkout access.
 */

import { apiClient } from './client';
import {
  getSavedAddresses,
  saveAddresses,
  type SavedAddress,
  type NewAddressInput
} from '../session/addresses';

export interface BackendAddressRow {
  id: number | string;
  user_id?: number;
  firebase_uid?: string;
  full_name: string;
  phone: string;
  address_line: string;
  city: string;
  state: string;
  pincode: string;
  is_default: number | boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Normalizes backend row to UI SavedAddress
 */
export function normalizeBackendAddress(row: BackendAddressRow, idx: number = 0): SavedAddress {
  return {
    id: String(row.id),
    label: 'Home',
    fullName: row.full_name || '',
    phone: row.phone || '',
    addressLine1: row.address_line || '',
    addressLine2: '',
    city: row.city || '',
    state: row.state || '',
    postalCode: String(row.pincode || ''),
    isDefault: Boolean(row.is_default ?? (idx === 0)),
    selected: Boolean(row.is_default)
  };
}

/**
 * Fetch all addresses from production backend database.
 * Falls back to localStorage cache if unauthenticated or network unreachable.
 */
export async function fetchCustomerAddresses(): Promise<SavedAddress[]> {
  try {
    const res = await apiClient<BackendAddressRow[]>('/customer/addresses');
    if (res && res.success && Array.isArray(res.data)) {
      const normalized = res.data.map((row, idx) => normalizeBackendAddress(row, idx));
      if (normalized.length > 0) {
        saveAddresses(normalized);
        return normalized;
      }
    }
  } catch (err) {
    console.warn('[Address Service] Backend fetch fallback to local cache:', err);
  }
  return getSavedAddresses();
}

/**
 * Add a new address to the customer's account in backend database.
 */
export async function createCustomerAddress(data: NewAddressInput): Promise<SavedAddress> {
  const pin = String(data.postalCode || '').replace(/\D/g, '');
  const cleanPhone = String(data.phone || '').replace(/\D/g, '');
  const street = [data.addressLine1, data.addressLine2].filter(Boolean).join(', ');

  try {
    const res = await apiClient<BackendAddressRow>('/customer/addresses', {
      method: 'POST',
      body: JSON.stringify({
        full_name: data.fullName,
        phone: cleanPhone,
        address_line: street,
        city: data.city,
        state: data.state,
        pincode: pin,
        is_default: data.isDefault ? 1 : 0
      })
    });

    if (res && res.success && res.data) {
      const newAddr = normalizeBackendAddress(res.data);
      const existing = getSavedAddresses();
      const updated = data.isDefault
        ? existing.map((a) => ({ ...a, isDefault: false }))
        : existing;
      const combined = [...updated, newAddr];
      saveAddresses(combined);
      return newAddr;
    }
  } catch (err) {
    console.warn('[Address Service] Backend create fallback:', err);
  }

  // Fallback to local session storage
  const { addSavedAddress } = await import('../session/addresses');
  return addSavedAddress(data);
}

/**
 * Update an existing address in the backend database.
 */
export async function updateCustomerAddress(id: string, updates: Partial<SavedAddress>): Promise<SavedAddress | null> {
  const pin = updates.postalCode ? String(updates.postalCode).replace(/\D/g, '') : undefined;
  const cleanPhone = updates.phone ? String(updates.phone).replace(/\D/g, '') : undefined;
  const street = updates.addressLine1 ? [updates.addressLine1, updates.addressLine2].filter(Boolean).join(', ') : undefined;

  const numId = parseInt(id, 10);
  const isNumeric = !isNaN(numId) && numId > 0;

  if (isNumeric) {
    try {
      const payload: Record<string, any> = {};
      if (updates.fullName) payload.full_name = updates.fullName;
      if (cleanPhone) payload.phone = cleanPhone;
      if (street) payload.address_line = street;
      if (updates.city) payload.city = updates.city;
      if (updates.state) payload.state = updates.state;
      if (pin) payload.pincode = pin;
      if (updates.isDefault !== undefined) payload.is_default = updates.isDefault ? 1 : 0;

      const res = await apiClient<BackendAddressRow>(`/customer/addresses/${numId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (res && res.success && res.data) {
        const updated = normalizeBackendAddress(res.data);
        const { updateSavedAddress: localUpdate } = await import('../session/addresses');
        localUpdate(id, updates);
        return updated;
      }
    } catch (err) {
      console.warn('[Address Service] Backend update fallback:', err);
    }
  }

  const { updateSavedAddress: localUpdate } = await import('../session/addresses');
  return localUpdate(id, updates);
}

/**
 * Delete an address from the backend database.
 */
export async function deleteCustomerAddress(id: string): Promise<boolean> {
  const numId = parseInt(id, 10);
  const isNumeric = !isNaN(numId) && numId > 0;

  if (isNumeric) {
    try {
      await apiClient(`/customer/addresses/${numId}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('[Address Service] Backend delete fallback:', err);
    }
  }

  const { deleteSavedAddress: localDelete } = await import('../session/addresses');
  localDelete(id);
  return true;
}

/**
 * Set an address as the default delivery destination.
 */
export async function setDefaultCustomerAddress(id: string): Promise<boolean> {
  return Boolean(await updateCustomerAddress(id, { isDefault: true }));
}
