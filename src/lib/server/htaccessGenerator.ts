/**
 * THE MARSHANS — Hostinger Apache / LiteSpeed .htaccess Generator
 *
 * Automatically generates the .htaccess rules based on LAUNCH_MODE.
 *
 * Guarantees:
 * - Temporary 302 redirects during launch mode (never 301).
 * - Zero redirect loops (exempts /custom-3d, /product/lady-justice, assets).
 * - Preserves existing unrelated rules (such as the /product/:slug static rewrite handler).
 * - Completely removes launch redirects when LAUNCH_MODE is set to 'RETAIL'.
 */

import { type LaunchMode, isCustomForgeOnly } from '../../config/launchMode.ts';

export function generateHtaccessContent(mode: LaunchMode): string {
  const isLaunch = isCustomForgeOnly(mode);

  const launchRules = isLaunch
    ? `  # =========================================================================
  # THE MARSHANS — CUSTOM FORGE LAUNCH MODE REDIRECTS (Temporary HTTP 302)
  # Automatically generated based on LAUNCH_MODE = 'CUSTOM_FORGE_ONLY'.
  # Switching LAUNCH_MODE to 'RETAIL' removes this entire block automatically.
  # Note: Bare root / serves the fresh homepage and is NOT redirected.
  # =========================================================================

  # 1. Custom-3d route -> /product/lady-justice/
  RewriteRule ^custom-3d/?$ /product/lady-justice/ [R=302,L]
  RewriteRule ^shop/?$ /product/lady-justice/ [R=302,L]

  # 3. Retail category pages -> /product/lady-justice/
  RewriteRule ^categories/.*$ /product/lady-justice/ [R=302,L]

  # 4. Retail product detail pages (except lady-justice) -> /product/lady-justice/
  RewriteRule ^product/(?!lady-justice)[^/]+/?$ /product/lady-justice/ [R=302,L]
`
    : `  # [RETAIL MODE ACTIVE] — Launch redirects omitted. Full retail storefront operational.
`;

  return `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

${launchRules}
  # =========================================================================
  # BASELINE STATIC ROUTING (Preserved in both modes)
  # =========================================================================

  # Serve existing physical files and directories directly
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # Route /product/:slug to the static runtime product handler /product/?slug=:slug
  RewriteRule ^product/([^/]+)/?$ /product/?slug=$1 [L,QSA]
</IfModule>
`;
}
