/**
 * THE MARSHANS — post-login redirect guard.
 *
 * `/login?redirect=<x>` must only ever send the customer to a page on THIS site. Anything else (absolute URLs,
 * protocol-relative `//host`, `javascript:`, backslash tricks that browsers normalise into `//host`, control characters
 * that browsers strip before parsing) falls back to the account page.
 */

export const DEFAULT_REDIRECT = '/account';

// A fixed, non-routable origin used only to prove the value resolves to a same-origin path.
const PROBE_ORIGIN = 'https://redirect-guard.invalid';

export function getSafeRedirect(raw: unknown, fallback: string = DEFAULT_REDIRECT): string {
  if (typeof raw !== 'string') return fallback;

  const value = raw.trim();
  if (!value) return fallback;

  // Must be a rooted path: "/x" only. "//host" is protocol-relative, "x" / "https:" / "javascript:" are not paths.
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;

  // "/\host" is normalised to "//host" by browsers; tab/CR/LF are stripped by URL parsers ("/\t/host" -> "//host").
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return fallback;

  try {
    const url = new URL(value, PROBE_ORIGIN);
    if (url.origin !== PROBE_ORIGIN) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
