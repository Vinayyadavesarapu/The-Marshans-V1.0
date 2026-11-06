import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadModule, installBrowser } from './helpers/load.mjs';

const product = (id, extra = {}) => ({ id, name: `P${id}`, slug: `p${id}`, price: 100, category_slug: 'lumo', is_best_seller: false, featured: false, ...extra });

test('carousel uses the featured flag, never best-seller claims (falls back to New Arrivals)', async () => {
  installBrowser();
  const { pickShowcase } = await loadModule('src/components/home/HomeShowcase.tsx');
  const unflagged = [1, 2, 3, 4, 5, 6, 7].map((id) => product(id));
  const none = pickShowcase(unflagged);
  assert.equal(none.mode, 'new');
  assert.deepEqual(none.items.map((p) => p.id), [1, 2, 3, 4, 5], 'newest five, API order, max 5');

  const flagged = pickShowcase([product(1), product(2, { is_best_seller: true }), product(3, { featured: true }), product(4)]);
  assert.equal(flagged.mode, 'featured');
  assert.deepEqual(flagged.items.map((p) => p.id), [3], 'only featured products; best sellers belong to their own section');
  assert.deepEqual(pickShowcase([]).items, []);
});

test('Best Sellers shows only products flagged is_best_seller and nothing otherwise', async () => {
  installBrowser();
  const { pickBestSellers } = await loadModule('src/components/home/HomeBestSellers.tsx');
  assert.deepEqual(pickBestSellers([product(1), product(2), product(3, { featured: true })]), [], 'no flags → section hidden');
  assert.deepEqual(pickBestSellers([product(1, { is_best_seller: true }), product(2), product(3, { is_best_seller: true })]).map((p) => p.id), [1, 3]);
});

test('showcase desktop order puts the lead product in the centre and fans the rest outward', async () => {
  installBrowser();
  const { desktopOrder } = await loadModule('src/components/home/HomeShowcase.tsx');
  assert.deepEqual(desktopOrder(5), [3, 2, 4, 1, 5]);
  assert.deepEqual(desktopOrder(3), [2, 1, 3]);
  assert.deepEqual(desktopOrder(1), [1]);
});

test('hero uses optimized media only, keeps video lazy, and respects reduced motion', () => {
  const hero = readFileSync(resolve('src/components/HeroIntro.astro'), 'utf8');
  assert.doesNotMatch(hero, /hero-video\.mp4|cloud-home-(primary|secondary)\.png/, 'never references the 96 MB / 18 MB originals');
  assert.match(hero, /preload="none"/, 'video is not preloaded');
  assert.match(hero, /fetchpriority="high"/, 'first visible poster is prioritised');
  assert.match(hero, /prefers-reduced-motion: reduce/, 'reduced-motion handling present');
  assert.match(hero, /mh-will-play/, 'poster choice decided before first paint');
  for (const f of ['hero-1080.mp4', 'hero-720.mp4', 'hero-start-1920.webp', 'hero-start-960.webp', 'hero-poster-1920.webp',
    'hero-poster-960.webp', 'cloud-primary-800.webp', 'cloud-primary-1600.webp', 'cloud-secondary-1200.webp', 'cloud-secondary-2400.webp']) {
    const p = resolve('public/assets/hero/home/optimized', f);
    assert.ok(existsSync(p), `${f} exists`);
    const limit = f.endsWith('.mp4') ? 7 * 1024 * 1024 : 300 * 1024;
    assert.ok(statSync(p).size < limit, `${f} stays under ${limit} bytes`);
  }
  for (const f of ['cloud-primary-800.webp', 'cloud-secondary-2400.webp']) {
    const bytes = readFileSync(resolve('public/assets/hero/home/optimized', f));
    assert.ok(bytes.includes(Buffer.from('ALPH')), `${f} keeps its alpha channel`);
  }
});

test('one shared navbar on every page: the homepage hero renders above the same Header', () => {
  const hero = readFileSync(resolve('src/components/HeroIntro.astro'), 'utf8');
  const header = readFileSync(resolve('src/components/Header.astro'), 'utf8');
  const layout = readFileSync(resolve('src/layouts/Layout.astro'), 'utf8');
  const home = readFileSync(resolve('src/pages/index.astro'), 'utf8');
  assert.doesNotMatch(hero, /MarshansNavbar/, 'the hero no longer mounts its own navbar copy');
  assert.match(header, /<MarshansNavbar client:load \/>/);
  assert.match(layout, /<slot name="before-header" \/>\s*\{!hideHeader && <Header \/>\}/, 'hero slot sits directly before the shared header');
  assert.match(home, /<HeroIntro slot="before-header" \/>/);
  assert.doesNotMatch(home, /hideHeader/, 'the homepage uses the shared header');
});

function mp4Boxes(buf) {
  const boxes = [];
  for (let i = 0; i + 8 <= buf.length;) {
    let size = buf.readUInt32BE(i);
    const type = buf.toString('latin1', i + 4, i + 8);
    if (size === 1) size = Number(buf.readBigUInt64BE(i + 8));
    boxes.push(type);
    if (size < 8) break;
    i += size;
  }
  return boxes;
}

test('hero videos are video-only, fast-start (moov before mdat) and small', () => {
  for (const [f, max] of [['hero-1080.mp4', 2.2 * 1024 * 1024], ['hero-720.mp4', 1.1 * 1024 * 1024]]) {
    const buf = readFileSync(resolve('public/assets/hero/home/optimized', f));
    const boxes = mp4Boxes(buf);
    assert.ok(boxes.indexOf('moov') !== -1 && boxes.indexOf('moov') < boxes.indexOf('mdat'), `${f}: moov precedes mdat (${boxes})`);
    const moov = buf.subarray(buf.indexOf('moov'));
    assert.equal(moov.includes(Buffer.from('soun')), false, `${f}: no audio track`);
    assert.ok(buf.length < max, `${f}: ${buf.length} bytes < ${max}`);
  }
});

test('hero hand-off: stays in the document, scrolls to the navbar once on video end, never locks scrolling', () => {
  const hero = readFileSync(resolve('src/components/HeroIntro.astro'), 'utf8');
  assert.doesNotMatch(hero, /is-retired|display: none;\s*\}\s*\n\s*\.hero-navbar-section:focus/, 'hero is never removed from the document');
  assert.match(hero, /video\.addEventListener\('ended', \(\) => \{ if \(!fellBack\) advanceToNavbar\(\); \}, \{ once: true \}\)/, 'hand-off only on ended');
  assert.match(hero, /if \(advanced \|\| sealed\(\)\) return;\s*advanced = true;/, 'hand-off runs at most once per page load');
  assert.match(hero, /if \(window\.scrollY > 8\) return;\s*glideTo\(navTargetTop\(\)\);/, 'no automatic scroll once the visitor has moved away');
  assert.match(hero, /if \(reduceMotion\) \{ window\.scrollTo\(\{ top, behavior: 'auto' \}\); return; \}/, 'instant for reduced motion');
  assert.match(hero, /addEventListener\(type, stop, \{ passive: true \}\)/, 'glide is interruptible via passive input listeners');
  assert.doesNotMatch(hero, /\bloop\b/, 'video never loops');
  assert.match(hero, /history\.scrollRestoration = 'manual'/, 'refresh restarts at the hero');
  assert.doesNotMatch(hero, /passive: false/, 'no non-passive (blocking) input listeners');
  assert.equal((hero.match(/preventDefault\(\)/g) || []).length, 1, 'only the cue link replaces its own jump');
  assert.match(hero, /class="mh-hero__cue" href="#site-navbar"/, 'accessible continue link without JavaScript');
  assert.match(hero, /<h1 id="home-hero-title"[^>]*>[\s\S]*?<\/h1>\s*\n\s*<section class="mh-hero"/);
});

test('hero seal after hand-off: hidden + inert without layout change, passive scroll floor, refresh resets', () => {
  const hero = readFileSync(resolve('src/components/HeroIntro.astro'), 'utf8');
  assert.match(hero, /\.mh-hero\.is-sealed \{\s*visibility: hidden;/, 'sealed hero keeps its layout box (visibility, not display)');
  assert.doesNotMatch(hero, /is-sealed[^{]*\{[^}]*display: none/, 'never removed from layout');
  assert.match(hero, /hero\.setAttribute\('inert', ''\)/, 'sealed hero leaves the tab order and accessibility tree');
  assert.equal((hero.match(/addEventListener\('scroll'/g) || []).length, 1, 'exactly one (passive) scroll handler');
  assert.match(hero, /addEventListener\('scroll', onScroll, \{ passive: true \}\)/);
  assert.match(hero, /if \(window\.scrollY >= navTargetTop\(\) - 1\) \{ seal\(\); return; \}/, 'seals at the hero boundary, however it is reached');
  assert.doesNotMatch(hero, /\barmed\b|\barm\(\)/, 'no video-dependent arming');
  assert.match(hero, /if \(!returning\) sessionStorage\.removeItem\('mh-hero-sealed'\)/, 'fresh load / refresh restarts the hero');
});

test('homepage navbar: original pill structure in flat neutral colours (no green, gradients, blur or shadows)', () => {
  const nav = readFileSync(resolve('src/components/react/MarshansNavbar.tsx'), 'utf8');
  const pill = nav.slice(nav.indexOf('PILL NAVBAR (every page)'), nav.indexOf('`}</style>'));
  assert.ok(pill.length > 500, 'pill block found');
  assert.match(pill, /\.navbar--pill \.nav-links-list \{[^}]*border-radius: 999px;[^}]*background: var\(--surface\);/, 'links sit in one rounded pill');
  assert.match(pill, /\.navbar--pill \.header-user-btn,\s*\.navbar--pill \.user-avatar-btn \{[^}]*border-radius: 999px;/, 'sign-in keeps its pill shape');
  assert.match(pill, /\.navbar--pill \.navbar-container \{[^}]*background: transparent;/, 'no outer bar');
  assert.doesNotMatch(pill, /backdrop-filter|linear-gradient|radial-gradient/, 'no glass / gradients');
  assert.doesNotMatch(pill, /box-shadow:\s*(?=\S)(?!none)[^;]+;/, 'no shadows');
  assert.doesNotMatch(pill, /#2b5e3c|#3c7a4d|#5b9466|#2f6b45|rgba\((24, 58, 35|31, 61, 43|36, 84, 53)/i, 'no green');
});

test('navbar: one transparent sticky wrapper, no full-width background, visually static', () => {
  const hero = readFileSync(resolve('src/components/HeroIntro.astro'), 'utf8');
  const header = readFileSync(resolve('src/components/Header.astro'), 'utf8');
  const nav = readFileSync(resolve('src/components/react/MarshansNavbar.tsx'), 'utf8');
  const pill = nav.slice(nav.indexOf('PILL NAVBAR (every page)'), nav.indexOf('`}</style>'));
  const wrapper = header.match(/\.site-header-sticky \{([^}]*)\}/)[1];
  assert.match(wrapper, /position: sticky;/);
  assert.match(wrapper, /top: 0;/);
  assert.match(wrapper, /background: transparent;/, 'no full-width colour behind the navbar');
  assert.doesNotMatch(hero, /is-docked|position:\s*(fixed|sticky)/, 'the hero never docks anything itself');
  assert.match(pill, /\.navbar--pill \{[^}]*position: static;[^}]*background: transparent;/, 'the bar is static inside the sticky wrapper and transparent');
  assert.doesNotMatch(pill, /position:\s*(fixed|sticky)/, 'exactly one sticky element (the wrapper)');
  assert.doesNotMatch(nav, /transition:\s*(?!none)[a-z]/, 'no transitions anywhere in the navbar');
  assert.doesNotMatch(nav, /animation:|@keyframes/, 'no navbar animations');
  assert.doesNotMatch(nav, /is-scrolled|addEventListener\('scroll'/, 'nothing changes with scroll position');
  assert.match(pill, /:focus-visible[\s\S]*?outline: 2px solid/, 'keyboard focus indicators remain');
});

test('hero base rule: full-screen edge-to-edge box', () => {
  const hero = readFileSync(resolve('src/components/HeroIntro.astro'), 'utf8');
  const rule = hero.match(/\n  \.mh-hero \{([^}]*)\}/);
  assert.ok(rule, 'base .mh-hero rule exists');
  assert.match(rule[1], /height: 100svh;/);
  assert.match(rule[1], /width: 100%;/);
  assert.match(rule[1], /overflow: hidden;/);
  assert.match(rule[1], /border-radius: 0;/);
});
