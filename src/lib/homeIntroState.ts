/**
 * THE MARSHANS — HOME INTRO STATE MANAGER
 * ==========================================================
 * Manages the one-time cinematic intro state using sessionStorage
 * and Navigation Timing API.
 *
 * Rules:
 * 1. Explicit browser reload/refresh of '/' resets the intro so it replays.
 * 2. Navigation from another page (Shop, Product, Category, Cart, etc.)
 *    skips the hero video entirely, presenting navbar + carousel immediately.
 * 3. Clicking "Home" in the navbar navigates directly to /#home-carousel-section
 *    and skips the hero intro without any flash.
 * 4. Once the hero video finishes playing on landing, it marks the intro
 *    completed for the rest of the browser session.
 * ==========================================================
 */

export const HOME_INTRO_STORAGE_KEY = 'marshans_home_intro_completed';

/**
 * Checks if the current page load is an explicit browser reload/refresh
 */
export function isBrowserReload(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      const navTiming = navEntries[0] as PerformanceNavigationTiming;
      return navTiming.type === 'reload';
    }
    // Fallback for older browsers
    return (performance as any)?.navigation?.type === 1;
  } catch {
    return false;
  }
}

/**
 * Checks if the URL hash or query explicitly targets skipping the hero
 */
export function isExplicitSkipRequested(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    window.location.hash === '#home-carousel-section' ||
    window.location.hash === '#home-navbar' ||
    window.location.search.includes('skip_hero=true')
  );
}

/**
 * Determines whether the hero video should be skipped immediately on page load.
 * Returns true if:
 * - sessionStorage marks intro as already completed, AND it is NOT an explicit reload
 * - OR the URL hash targets #home-carousel-section
 * - OR referrer is internal (user came from another page on our site)
 */
export function shouldSkipHomeHero(): boolean {
  if (typeof window === 'undefined') return false;

  // If user explicitly pressed browser refresh on '/', reset and replay
  if (isBrowserReload()) {
    try {
      sessionStorage.removeItem(HOME_INTRO_STORAGE_KEY);
    } catch {}
    return false;
  }

  // If URL explicitly targets carousel/navbar, skip hero
  if (isExplicitSkipRequested()) {
    return true;
  }

  // If intro has already completed in this session, skip hero
  try {
    if (sessionStorage.getItem(HOME_INTRO_STORAGE_KEY) === 'true') {
      return true;
    }
  } catch {}

  // If user navigated here from another page within the same origin, skip hero
  if (document.referrer) {
    try {
      const refUrl = new URL(document.referrer);
      if (refUrl.origin === window.location.origin && refUrl.pathname !== '/') {
        return true;
      }
    } catch {}
  }

  return false;
}

/**
 * Mark the intro as completed in sessionStorage and dispatch event
 */
export function markHomeIntroCompleted(): void {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.setItem(HOME_INTRO_STORAGE_KEY, 'true');
  } catch {}

  window.dispatchEvent(new CustomEvent('marshans:intro-completed'));
}

/**
 * Reset intro state (e.g. for testing or fresh reloads)
 */
export function resetHomeIntroState(): void {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.removeItem(HOME_INTRO_STORAGE_KEY);
  } catch {}
}
