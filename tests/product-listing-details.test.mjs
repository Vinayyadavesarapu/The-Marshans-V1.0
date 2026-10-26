import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadModule, installBrowser } from './helpers/load.mjs';

test('1. Missing stock data is treated as unknown, never 0 or OutOfStock', async () => {
  installBrowser();
  const { formatBackendProduct } = await loadModule('src/lib/api/products.ts');

  // Product without stock field from backend
  const pNoStock = formatBackendProduct({
    id: 101,
    name: 'Ambient Sphere',
    price: 1999
  });
  assert.equal(pNoStock.stock, undefined, 'Missing stock must be undefined, not defaulted to 0');

  // Product with explicit numeric stock
  const pWithStock = formatBackendProduct({
    id: 102,
    name: 'Mini Temple',
    price: 2499,
    stock: 5
  });
  assert.equal(pWithStock.stock, 5, 'Explicit numeric stock must be preserved');

  // Product with explicit 0 stock
  const pZeroStock = formatBackendProduct({
    id: 103,
    name: 'Desk Dock',
    price: 899,
    stock: 0
  });
  assert.equal(pZeroStock.stock, 0, 'Explicit 0 stock must be preserved');
});

test('2. Unsupported sorting options (Best Sellers, Customer Rating, Featured Drops) are removed', () => {
  const collectionSortContent = readFileSync(resolve('src/components/react/collection/CollectionSort.tsx'), 'utf8');
  assert.equal(collectionSortContent.includes('Featured Drops'), false, 'Featured Drops must be removed from sort options');
  assert.equal(collectionSortContent.includes('Best Sellers'), false, 'Best Sellers must be removed from sort options');
  assert.equal(collectionSortContent.includes('Customer Rating'), false, 'Customer Rating must be removed from sort options');
  assert.match(collectionSortContent, /Price: Low to High/, 'Price: Low to High must be supported');
  assert.match(collectionSortContent, /Price: High to Low/, 'Price: High to Low must be supported');
  assert.match(collectionSortContent, /Alphabetical: A to Z/, 'Alphabetical: A to Z must be supported');

  const shopCatalogContent = readFileSync(resolve('src/components/react/ShopCatalog.jsx'), 'utf8');
  assert.equal(shopCatalogContent.includes('<option value="featured">'), false, 'Featured must be removed from ShopCatalog sort');
  assert.equal(shopCatalogContent.includes('<option value="bestseller">'), false, 'Bestseller must be removed from ShopCatalog sort');
  // /shop renders the shared CollectionSort (checked above), so its handler must cover those values
  assert.match(shopCatalogContent, /<CollectionSort sortBy=\{sortBy\}/, 'ShopCatalog must use the shared sort control');
  assert.match(shopCatalogContent, /sortBy === 'price-asc'/, 'price-asc must be handled');
  assert.match(shopCatalogContent, /sortBy === 'price-desc'/, 'price-desc must be handled');
});

test('3. Cart payloads have no made-up material/finish values', () => {
  const cardContent = readFileSync(resolve('src/components/react/ProductCard.tsx'), 'utf8');
  assert.equal(cardContent.includes("'Standard PLA+'"), false, 'Must not invent Standard PLA+ fallback');
  assert.equal(cardContent.includes("'Studio Finish'"), false, 'Must not invent Studio Finish fallback');

  const showcaseContent = readFileSync(resolve('src/components/home/HomeShowcase.tsx'), 'utf8');
  assert.equal(showcaseContent.includes("'Standard PLA+'"), false, 'Must not invent Standard PLA+ fallback in HomeShowcase');
  assert.equal(showcaseContent.includes("'Studio Finish'"), false, 'Must not invent Studio Finish fallback in HomeShowcase');
});

test('4. Product card and navigation links use /product/<slug>/', () => {
  const cardContent = readFileSync(resolve('src/components/react/ProductCard.tsx'), 'utf8');
  assert.match(cardContent, /`\/product\/\$\{encodeURIComponent\(product\.slug \|\| String\(product\.id\)\)\}\/`/, 'ProductCard must link to /product/<slug>/');

  const showcaseContent = readFileSync(resolve('src/components/home/HomeShowcase.tsx'), 'utf8');
  assert.match(showcaseContent, /`\/product\/\$\{encodeURIComponent\(p\.slug \|\| String\(p\.id\)\)\}\/`/, 'HomeShowcase must link to /product/<slug>/');

  const searchContent = readFileSync(resolve('src/components/react/SearchModal.jsx'), 'utf8');
  assert.match(searchContent, /`\/product\/\$\{encodeURIComponent\(item\.slug \|\| item\.id\)\}\/`/, 'SearchModal must link to /product/<slug>/');
});

test('5. Product detail route has canonical URL and omits availability when stock is unknown', () => {
  const slugAstroContent = readFileSync(resolve('src/pages/product/[slug].astro'), 'utf8');
  assert.match(slugAstroContent, /https:\/\/themarshans\.shop\/product\/\$\{product\.slug\}\//, 'Canonical URL must use trailing slash');
  assert.match(slugAstroContent, /hasKnownStock/, 'Must check hasKnownStock before setting availability');
  assert.match(slugAstroContent, /productDescription/, 'Must provide fallback meta description');
  assert.equal(slugAstroContent.includes('aggregateRating'), false, 'Must not emit fake aggregateRating schema');
});

test('6. Sitemap excludes cart, login, register, and bare fallback route', () => {
  const configContent = readFileSync(resolve('astro.config.mjs'), 'utf8');
  assert.match(configContent, /!page\.includes\('\/cart'\)/, 'cart must be excluded from sitemap');
  assert.match(configContent, /!page\.includes\('\/login'\)/, 'login must be excluded from sitemap');
  assert.match(configContent, /!page\.includes\('\/register'\)/, 'register must be excluded from sitemap');
  assert.match(configContent, /page !== 'https:\/\/themarshans\.shop\/product\/'/, 'bare /product/ fallback must be excluded from sitemap');
});

test('7. getStaticPaths in [slug].astro throws clear error when product fetch fails', () => {
  const slugAstroContent = readFileSync(resolve('src/pages/product/[slug].astro'), 'utf8');
  assert.match(slugAstroContent, /if \(!ok\) \{/, 'Must verify API fetch was successful');
  assert.match(slugAstroContent, /throw new Error\(/, 'Must throw error if API call failed to prevent silent drop');
});

test('8. False "Free Shipping on orders above ₹999" claim is removed', () => {
  const masterContent = readFileSync(resolve('src/components/react/ProductMasterView.tsx'), 'utf8');
  assert.equal(masterContent.includes('Free Shipping'), false, 'Free Shipping head must be removed from ProductMasterView');
  assert.equal(masterContent.includes('orders above ₹999'), false, 'orders above ₹999 must be removed from ProductMasterView');
  assert.match(masterContent, /Standard Delivery/, 'Standard Delivery must be displayed');
  assert.match(masterContent, /₹50 flat rate across India/, '₹50 flat rate must be displayed');

  const actionsContent = readFileSync(resolve('src/components/react/ProductDetailActions.jsx'), 'utf8');
  assert.equal(actionsContent.includes('Free Shipping'), false, 'Free Shipping head must be removed from ProductDetailActions');
  assert.equal(actionsContent.includes('orders above ₹999'), false, 'orders above ₹999 must be removed from ProductDetailActions');
  assert.match(actionsContent, /Standard Delivery/, 'Standard Delivery must be displayed');
  assert.match(actionsContent, /₹50 flat rate across India/, '₹50 flat rate must be displayed');
});

test('9. ProductCard does not nest interactive buttons inside anchors', () => {
  const cardContent = readFileSync(resolve('src/components/react/ProductCard.tsx'), 'utf8');

  // Verify root is an article or div, NOT an anchor tag
  assert.match(cardContent, /<article className=\{`marshans-product-card-wrap/, 'Card wrapper must be an article');
  assert.equal(cardContent.includes('<a className="marshans-card-anchor"'), false, 'Outer anchor wrapping entire card must be removed');

  // Verify wishlist and cart buttons are independent buttons not inside <a>
  assert.match(cardContent, /<a href=\{productHref\} className="marshans-image-link"/, 'Image has its own anchor');
  assert.match(cardContent, /<a href=\{productHref\} className="marshans-title-link"/, 'Title has its own anchor');
  assert.match(cardContent, /<button[^>]*className=\{`marshans-wishlist-btn/, 'Wishlist is an independent button');
  assert.match(cardContent, /<button[^>]*className=\{`marshans-cart-action-btn/, 'Cart is an independent button');
});

test('10. Product detail enforces quantity limits and provides feedback', () => {
  const masterContent = readFileSync(resolve('src/components/react/ProductMasterView.tsx'), 'utf8');
  assert.match(masterContent, /const maxQty = typeof product\.stock === 'number' && product\.stock > 0 \? Math\.min\(10, product\.stock\) : 10;/, 'Max quantity must be capped at 10 or stock');
  assert.match(masterContent, /setQtyFeedback\(`Maximum limit of \$\{maxQty\} units reached`\);/, 'Provides feedback when quantity limit is hit');
  assert.match(masterContent, /qty-feedback-banner/, 'Feedback banner element rendered in DOM');

  const actionsContent = readFileSync(resolve('src/components/react/ProductDetailActions.jsx'), 'utf8');
  assert.match(actionsContent, /const maxQty = typeof product\.stock === 'number' && product\.stock > 0 \? Math\.min\(10, product\.stock\) : 10;/, 'Max quantity must be capped at 10 or stock in actions');
  assert.match(actionsContent, /setQtyFeedback\(`Maximum limit of \$\{maxQty\} units reached`\);/, 'Provides feedback when quantity limit is hit in actions');
});

test('11. Customer claims verification: sub-micron removed and return policy aligned', () => {
  const shopContent = readFileSync(resolve('src/pages/shop.astro'), 'utf8');
  assert.equal(shopContent.includes('sub-micron'), false, 'sub-micron claim must be removed from /shop');
  assert.match(shopContent, /0\.12mm layer precision/, '0.12mm layer precision must be used');

  const seoContent = readFileSync(resolve('src/components/SEO.astro'), 'utf8');
  assert.equal(seoContent.includes('sub-micron'), false, 'sub-micron claim must be removed from SEO');

  const masterContent = readFileSync(resolve('src/components/react/ProductMasterView.tsx'), 'utf8');
  assert.equal(masterContent.includes('7-day return policy'), false, 'Unqualified 7-day return policy claim must be removed');
  assert.match(masterContent, /7-Day Support/, '7-Day Support headline must be used');
  assert.match(masterContent, /Defect & transit coverage/, 'Defect & transit coverage subtitle must be used');

  const actionsContent = readFileSync(resolve('src/components/react/ProductDetailActions.jsx'), 'utf8');
  assert.equal(actionsContent.includes('7-day return policy'), false, 'Unqualified 7-day return policy claim must be removed from actions');
  assert.match(actionsContent, /7-Day Support/, '7-Day Support headline must be used');
  assert.match(actionsContent, /Defect & transit coverage/, 'Defect & transit coverage subtitle must be used');
});

test('12. Category banners: desktop height is constrained without distortion', () => {
  const heroContent = readFileSync(resolve('src/components/react/collection/CollectionHero.tsx'), 'utf8');
  assert.match(heroContent, /max-height: min\(480px, 45vh\);/, 'Fandom and category banner desktop height constrained to max 480px / 45vh');
  assert.match(heroContent, /object-fit: cover;/, 'Banner preserves aspect ratio via object-fit: cover');
});
