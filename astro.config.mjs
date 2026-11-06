// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LAUNCH_MODE, isCustomForgeOnly } from './src/config/launchMode.ts';
import { generateHtaccessContent } from './src/lib/server/htaccessGenerator.ts';

function marshansHtaccessIntegration() {
  return {
    name: 'marshans-htaccess-integration',
    hooks: {
      // @ts-ignore
      'astro:build:done': ({ dir }) => {
        try {
          const content = generateHtaccessContent(LAUNCH_MODE);
          const distDir = fileURLToPath(dir);
          fs.writeFileSync(path.join(distDir, '.htaccess'), content, 'utf8');
        } catch (err) {
          console.warn('Could not update dist/.htaccess:', err);
        }
      }
    }
  };
}

// https://astro.build/config
export default defineConfig({
  site: 'https://themarshans.shop',
  integrations: [
    react(),
    marshansHtaccessIntegration(),
    sitemap({
      filter: (page) => {
        // Additional launch-mode exclusions: hide inaccessible retail pages from launch sitemap
        if (isCustomForgeOnly(LAUNCH_MODE)) {
          if (page.includes('/categories/')) return false;
          if (page.includes('/shop')) return false;
          if (page.includes('/product/') && !page.includes('/product/lady-justice')) return false;
        }

        return (
          !page.includes('/account') &&
          !page.includes('/checkout') &&
          !page.includes('/order-confirmation') &&
          !page.includes('/cart') &&
          !page.includes('/login') &&
          !page.includes('/register') &&
          page !== 'https://themarshans.shop/product/'
        );
      }
    })
  ]
});
