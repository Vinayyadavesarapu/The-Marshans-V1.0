/**
 * THE MARSHANS — API Client Layer
 *
 * Connects to live backend API at https://api.chipakk.shop/api
 * Injects X-Store-ID: 2 and X-Store-Code: marshans automatically.
 */

import { siteConfig } from '../config/site';
import { getCurrentIdToken } from '../firebase/client';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  error?: string;
  timestamp?: string;
}

/**
 * The backend sends errors as `{ success:false, error:{ message, statusCode } }`. Callers (and React components that
 * render the error) expect a plain string, so always reduce it to one -- rendering the raw object crashes React.
 */
export function extractErrorMessage(data: any, fallback: string): string {
  if (!data) return fallback;
  const err = data.error;
  if (typeof err === 'string' && err.trim()) return err;
  if (err && typeof err === 'object' && typeof err.message === 'string' && err.message.trim()) return err.message;
  if (typeof data.message === 'string' && data.message.trim()) return data.message;
  return fallback;
}

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const baseUrl = siteConfig.apiBaseUrl.replace(/\/$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'X-Store-ID': String(siteConfig.storeId),
    'X-Store-Code': siteConfig.storeCode,
    ...(options.headers as Record<string, string> || {})
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Inject Firebase Auth ID token if authenticated
  try {
    const token = await getCurrentIdToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (err) {
    // Session token retrieval failure fallback
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        success: false,
        error: extractErrorMessage(data, `Request failed with status ${res.status}`),
        data: (data && data.data) || null
      };
    }

    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network connection failed',
      data: null as any
    };
  }
}
