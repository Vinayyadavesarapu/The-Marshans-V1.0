// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://themarshans.shop',
  integrations: [
    react(),
    sitemap({
      filter: (page) =>
        !page.includes('/account') &&
        !page.includes('/checkout') &&
        !page.includes('/order-confirmation')
    })
  ]
});

