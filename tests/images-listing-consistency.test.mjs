import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadModule, installBrowser } from './helpers/load.mjs';

const read = (p) => readFileSync(resolve(p), 'utf8');

test('Product cards show the whole product on white with reserved image space', () => {
  const card = read('src/components/react/ProductCard.tsx');
  const stage = card.match(/\.marshans-image-stage \{[^}]*\}/)[0];
  const img = card.match(/\.marshans-product-img \{[^}]*\}/)[0];
  assert.match(stage, /aspect-ratio:\s*1 \/ 1\.05/);
  assert.match(stage, /background:\s*#ffffff/);
  assert.match(img, /object-fit:\s*contain/);
  assert.doesNotMatch(img, /object-fit:\s*cover/);
  assert.match(card, /width=\{600\}\s*height=\{630\}/);
  assert.match(card, /decoding="async"/);
});

test('Product detail gallery contains images instead of cropping them', () => {
  const view = read('src/components/react/ProductMasterView.tsx');
  const active = view.match(/\.gallery-active-image \{[^}]*\}/)[0];
  const thumb = view.match(/\.thumb-img \{[^}]*\}/)[0];
  assert.match(active, /object-fit:\s*contain/);
  assert.match(thumb, /object-fit:\s*contain/);
  assert.match(view, /className="gallery-active-image"\s*width=\{800\}\s*height=\{840\}/);
});

test('/shop and category pages share one listing grid and the same search/sort controls', () => {
  const shop = read('src/components/react/ShopCatalog.jsx');
  const collection = read('src/components/react/collection/CollectionProductGrid.tsx');
  for (const src of [shop, collection]) {
    assert.match(src, /<ProductListingGrid products=\{/);
  }
  assert.match(shop, /<CollectionSearch[\s\S]*?<CollectionSort/);
  // Category chips and URL params stay on /shop
  assert.match(shop, /params\.get\('category'\)/);
  assert.match(shop, /params\.get\('q'\)/);
  assert.match(shop, /className=\{`cat-pill/);
});

test('Misleading category banners are replaced; other artwork keeps its ratio', async () => {
  installBrowser();
  const { CATEGORIES_CONFIG } = await loadModule('src/config/categoriesConfig.ts');
  // The old LUMO / Darshanam / Utility Co. artwork advertised products and prices that are not in the catalogue
  for (const slug of ['lumo', 'darshanam', 'utility-co']) {
    const meta = CATEGORIES_CONFIG[slug];
    assert.ok(meta.heroOverlay, `${slug} renders a text-free plate with name/title only`);
    assert.doesNotMatch(meta.heroImage, /\/hero\.webp$/, `${slug} no longer uses the misleading artwork`);
    if (meta.heroImage) {
      assert.ok(existsSync(resolve('public' + meta.heroImage)), `${meta.heroImage} exists`);
      assert.ok(meta.heroImageSize?.width && meta.heroImageSize?.height);
    }
  }
  for (const slug of ['fandom-tribe', 'minitales', 'custom-forge']) {
    assert.ok(CATEGORIES_CONFIG[slug].heroImageSize, `${slug} reserves its banner size`);
  }
  // Homepage hero assets are untouched by the category banner work
  assert.ok(existsSync(resolve('public/assets/hero/lumo/lumo-day-bg.png')));
  assert.ok(existsSync(resolve('public/assets/hero/darshanam/darshanam-bg.png')));
});

test('Category hero overlay shows only the configured name and title (no taglines or claims)', () => {
  const hero = read('src/components/react/collection/CollectionHero.tsx');
  assert.match(hero, /\{category\.name\}/);
  assert.match(hero, /\{category\.title\}/);
  assert.doesNotMatch(hero, /category\.(tagline|description|badges)/);
});

test('Product pages: companion grid is shared and page styles reach the React island', () => {
  const page = read('src/components/react/ProductDetailPage.tsx');
  assert.match(page, /<ProductListingGrid products=\{relatedProducts\}/);
  // Scoped Astro styles never match markup rendered by the React island, so both product routes use global page styles
  for (const route of ['src/pages/product/[slug].astro', 'src/pages/product/index.astro']) {
    assert.match(read(route), /<style is:global>/, `${route} styles must be global`);
  }
});
