import { SAVED_ADDRESS_KEY } from './cache';

export type AddressLabel = 'Home' | 'Work' | 'Other';

export interface SavedAddress {
  id: string;
  label: AddressLabel;
  isDefault: boolean;
  selected?: boolean;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
}

export type NewAddressInput = Omit<SavedAddress, 'id'>;

/**
 * Normalizes any existing saved address state (including legacy single-object format)
 * into a structured array of SavedAddress objects.
 */
export function getSavedAddresses(): SavedAddress[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(SAVED_ADDRESS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!parsed) return [];

    // If already stored as an array of addresses
    if (Array.isArray(parsed)) {
      return parsed.map((item, idx) => ({
        id: item.id || `addr_${idx + 1}`,
        label: (item.label === 'Work' || item.label === 'Other' || item.label === 'Home') ? item.label : 'Home',
        isDefault: Boolean(item.isDefault ?? (idx === 0)),
        selected: Boolean(item.selected),
        fullName: item.fullName || '',
        phone: item.phone || '',
        addressLine1: item.addressLine1 || '',
        addressLine2: item.addressLine2 || '',
        city: item.city || '',
        state: item.state || '',
        postalCode: item.postalCode || ''
      }));
    }

    // If legacy single-object address exists
    if (typeof parsed === 'object' && (parsed.fullName || parsed.addressLine1 || parsed.city || parsed.phone)) {
      const legacyAddress: SavedAddress = {
        id: 'addr_default',
        label: 'Home',
        isDefault: true,
        selected: true,
        fullName: parsed.fullName || '',
        phone: parsed.phone || '',
        addressLine1: parsed.addressLine1 || '',
        addressLine2: parsed.addressLine2 || '',
        city: parsed.city || '',
        state: parsed.state || '',
        postalCode: parsed.postalCode || ''
      };
      saveAddresses([legacyAddress]);
      return [legacyAddress];
    }

    return [];
  } catch {
    return [];
  }
}

/**
 * Persists the addresses array to localStorage and notifies listeners.
 */
export function saveAddresses(addresses: SavedAddress[]): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(SAVED_ADDRESS_KEY, JSON.stringify(addresses));
    window.dispatchEvent(new CustomEvent('marshans:addresses-updated', { detail: addresses }));
  } catch (err) {
    console.error('Failed to save addresses to storage:', err);
  }
}

/**
 * Retrieves the currently active address for checkout or default display:
 * 1. An address explicitly marked as selected.
 * 2. The address marked as default.
 * 3. The first address in the saved list.
 */
export function getActiveAddress(): SavedAddress | null {
  const addresses = getSavedAddresses();
  if (addresses.length === 0) return null;

  return addresses.find((a) => a.selected) ||
         addresses.find((a) => a.isDefault) ||
         addresses[0] ||
         null;
}

/**
 * Adds a new address to the saved addresses list.
 */
export function addSavedAddress(data: NewAddressInput): SavedAddress {
  const addresses = getSavedAddresses();
  const id = `addr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const isDefault = addresses.length === 0 || Boolean(data.isDefault);

  const updatedList = addresses.map((a) => ({
    ...a,
    isDefault: isDefault ? false : a.isDefault,
    selected: false
  }));

  const newAddress: SavedAddress = {
    ...data,
    id,
    label: (data.label === 'Work' || data.label === 'Other') ? data.label : 'Home',
    isDefault,
    selected: true,
    addressLine2: data.addressLine2 || ''
  };

  updatedList.push(newAddress);
  saveAddresses(updatedList);
  return newAddress;
}

/**
 * Updates an existing address.
 */
export function updateSavedAddress(id: string, updates: Partial<SavedAddress>): SavedAddress | null {
  const addresses = getSavedAddresses();
  const targetIndex = addresses.findIndex((a) => a.id === id);
  if (targetIndex === -1) return null;

  const willBeDefault = updates.isDefault ?? addresses[targetIndex].isDefault;

  const updatedList = addresses.map((a) => {
    if (a.id === id) {
      return {
        ...a,
        ...updates,
        isDefault: willBeDefault
      };
    }
    return {
      ...a,
      isDefault: willBeDefault ? false : a.isDefault
    };
  });

  saveAddresses(updatedList);
  return updatedList[targetIndex];
}

/**
 * Deletes an address by ID. If the deleted address was default, marks the first remaining as default.
 */
export function deleteSavedAddress(id: string): void {
  const addresses = getSavedAddresses();
  const filtered = addresses.filter((a) => a.id !== id);

  if (filtered.length > 0 && !filtered.some((a) => a.isDefault)) {
    filtered[0].isDefault = true;
  }

  saveAddresses(filtered);
}

/**
 * Sets the default address.
 */
export function setDefaultAddress(id: string): void {
  const addresses = getSavedAddresses();
  const updatedList = addresses.map((a) => ({
    ...a,
    isDefault: a.id === id
  }));

  saveAddresses(updatedList);
}

/**
 * Sets the actively selected address for the current session/checkout.
 */
export function selectAddress(id: string): void {
  const addresses = getSavedAddresses();
  const updatedList = addresses.map((a) => ({
    ...a,
    selected: a.id === id
  }));

  saveAddresses(updatedList);
}
