import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p) => readFileSync(resolve(p), 'utf8');
const src = read('src/components/home/HomeCategoryDiscovery.astro');
const css = src.match(/<style>([\s\S]*)<\/style>/)[1];
const script = src.match(/<script>([\s\S]*)<\/script>/)[1];

test('homepage contains Coming Soon hero and Lady Justice featured section with other sections removed', () => {
  const home = read('src/pages/index.astro');
  const heroIdx = home.indexOf('hero-coming-soon-section');
  const ladyIdx = home.indexOf('featured-lady-section');
  assert.ok(heroIdx > -1, 'hero-coming-soon-section present');
  assert.ok(ladyIdx > -1, 'featured-lady-section present');
  assert.ok(heroIdx < ladyIdx, 'Coming Soon hero is placed above Lady Justice section');
  assert.ok(!home.includes('home-hero-section'), 'old hero section removed');
  assert.ok(!home.includes('what-we-do-section'), 'what-we-do section removed');
  assert.ok(!home.includes('industrial-section'), 'industrial section removed');
});

test('six collections with their existing routes, short copy and no product data', () => {
  const expected = {
    lumo: '/categories/lumo', 'fandom-tribe': '/categories/fandom-tribe', minitales: '/categories/minitales',
    'utility-co': '/categories/utility-co', darshanam: '/categories/darshanam', 'custom-forge': '/custom-3d'
  };
  for (const [slug, href] of Object.entries(expected)) {
    assert.match(src, new RegExp(`slug: '${slug}', name: '[^']+', href: '${href.replace(/\//g, '\\/')}'`), `${slug} → ${href}`);
  }
  assert.equal((src.match(/\{ slug: '/g) || []).length, 6);
  assert.doesNotMatch(src, /price|₹|addToCart|wishlist|stock|ProductCard/i, 'not a product carousel');
});

test('artwork: replaceable transparent PNGs from one folder, contained and bottom-aligned, reserved size, lazy', () => {
  for (const slug of ['lumo', 'fandom-tribe', 'minitales', 'utility-co', 'darshanam', 'custom-forge']) {
    const file = resolve(`public/assets/home/category-discovery/${slug}.png`);
    assert.ok(existsSync(file), `${slug}.png exists`);
    assert.equal(readFileSync(file).readUInt8(25), 6, `${slug}.png is RGBA (colour type 6)`);
  }
  assert.match(src, /const ASSET_DIR = '\/assets\/home\/category-discovery';/);
  assert.match(src, /src=\{`\$\{ASSET_DIR\}\/\$\{cat\.slug\}\.png`\}/, 'paths derive from one folder + slug');
  assert.match(src, /width="800"\s*height="600"\s*loading="lazy"/);
  assert.match(css, /\.hd__art img \{[^}]*object-fit: contain;[^}]*object-position: 50% 100%;/, 'any artwork fits and stands on the floor');
  assert.doesNotMatch(css.match(/\.hd__art \{[^}]*\}/)[0], /background/, 'no background baked into the artwork box');
});

test('composition: a corridor of arched worlds — featured, two receding, one passing the camera — not identical cards', () => {
  for (const pos of ["'0'", "'1'", "'2'", "'ahead'", "'behind'"]) {
    assert.match(css, new RegExp(`\\.hd__world\\[data-pos=${pos}\\] \\{[^}]*transform:`), `position ${pos} is placed by transform`);
  }
  assert.match(css, /\.hd__world\[data-pos='behind'\] \{[^}]*scale\(1\.\d+\)[^}]*opacity: 0;/, 'the passed world grows past the camera and dissolves');
  assert.match(css, /\.hd__frame \{[^}]*border-radius: 999px 999px/, 'each world is an arched niche');
  assert.match(css, /color-mix\(in srgb, rgb\(var\(--rgb\)\)/, 'tinted by its own category colour');
  assert.match(src, /data-pos=\{posOf\(i\)\}/, 'initial positions are server-rendered (no flash before JS)');
  assert.match(script, /arch\.dataset\.pos = posOf\(i\)/);
});

test('motion: GPU-only transitions between discrete positions, eased camera, masked type, tinted light', () => {
  assert.match(css, /\.is-ready \.hd__world \{\s*transition: transform [\d.]+s var\(--ease-camera\), opacity/);
  assert.doesNotMatch(css.match(/\.is-ready \.hd__world \{[^}]*\}/)[0], /left|width|top|height/, 'no layout properties animate');
  assert.match(css, /\.hd__mask \{[^}]*overflow: hidden;/, 'type wipes through masks');
  assert.match(css, /translate3d\(0, calc\(100% \+ 0\.3em\), 0\)/, 'hidden lines clear the mask padding (no peeking)');
  assert.match(css, /@property --world \{[^}]*syntax: '<color>';/, 'the room light can transition between world colours');
  assert.match(script, /root\.style\.setProperty\('--world'/, 'light follows the featured world');
  assert.match(script, /requestAnimationFrame\(\(\) => requestAnimationFrame\(\(\) => root\.classList\.add\('is-ready'\)\)\)/, 'no transition on first paint');
  assert.doesNotMatch(src, /from 'react'|framer-motion|gsap/, 'no animation library');
});

test('autoplay and pausing: progress line is the timer; hover, focus, button, off-screen and hidden tabs pause it', () => {
  assert.match(script, /addEventListener\('animationend'[\s\S]*?\[data-tick-fill\][\s\S]*?step\(1\)/);
  assert.match(css, /\[data-paused\] \.hd__tick\.is-active \.hd__tick-fill \{\s*animation-play-state: paused;/, 'pause beats the animation shorthand');
  const pausedAt = css.indexOf('[data-paused] .hd__tick.is-active .hd__tick-fill');
  assert.ok(pausedAt > css.indexOf('.hd__tick.is-active .hd__tick-fill {'), 'paused rule is declared after the animation');
  assert.match(script, /pointerenter[\s\S]*?pointerType === 'mouse'[\s\S]*?pause\('hover', true\)/);
  assert.match(script, /focusin[\s\S]*?pause\('focus', true\)/);
  assert.match(script, /visibilitychange[\s\S]*?pause\('hidden', document\.hidden\)/);
  assert.match(script, /IntersectionObserver[\s\S]*?pause\('offscreen', !entry\.isIntersecting\)/);
  assert.match(src, /data-discovery-pause aria-pressed="false"/);
  assert.match(script, /copy\.setAttribute\('aria-live', paused \? 'polite' : 'off'\)/, 'announces only when not rotating');
});

test('controls and accessibility: prev / next, rail, arrow keys, only the featured slide is reachable', () => {
  assert.match(src, /data-discovery-step="-1" aria-label="Previous world"/);
  assert.match(src, /data-discovery-step="1" aria-label="Next world"/);
  assert.match(src, /aria-roledescription="carousel"/);
  assert.match(src, /aria-roledescription="slide"/);
  assert.match(src, /inert=\{i === 0 \? undefined : true\}/);
  assert.match(script, /slide\.inert = !on;/);
  assert.match(src, /class="hd__stage" data-discovery-stage aria-hidden="true"/, 'decorative arches are hidden from assistive tech');
  assert.match(script, /'ArrowRight'[\s\S]*?closest\('\.hd__controls, \.hd__rail'\)/, 'arrow keys only on the carousel controls');
  assert.match(css, /\.hd__btn:focus-visible/);
});

test('swipe without hijacking vertical scrolling; reduced motion has no autoplay or camera moves', () => {
  assert.match(css, /\.hd__stage \{[^}]*touch-action: pan-y;/);
  assert.match(css, /\.hd__copy \{[^}]*touch-action: pan-y;/);
  assert.doesNotMatch(script, /passive: false/, 'all pointer listeners are passive');
  assert.equal((script.match(/preventDefault/g) || []).length, 1, 'only the arrow keys on its own controls');
  assert.match(script, /Math\.abs\(e\.clientX - sx\) > 40\) step/);
  assert.match(script, /prefers-reduced-motion: reduce/);
  assert.match(script, /'animationend'[\s\S]*?!reduceMotion\.matches/, 'no auto-advance for reduced motion');
  const reduced = css.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*)\}\s*$/)[1];
  assert.match(reduced, /\.is-ready \.hd__world \{\s*transition: opacity/, 'worlds cross-fade instead of travelling');
  assert.match(reduced, /animation: none;/);
});

test('Lady Justice is positioned on the homepage as the sole featured section', () => {
  const home = read('src/pages/index.astro');
  const ladyIdx = home.indexOf('featured-lady-section');
  assert.ok(ladyIdx > -1, 'featured-lady-section is present');
});

test('navbar sits inside the carousel scene: section pulled up behind the sticky navbar', () => {
  const header = read('src/components/Header.astro');
  const section = css.match(/\n  \.hd \{([^}]*)\}/)[1];
  assert.match(section, /margin-top: calc\(-1 \* var\(--site-nav-h, 88px\)\);/, 'scene starts behind the navbar (no strip, no gap)');
  assert.match(section, /padding: calc\(var\(--site-nav-h, 88px\) \+/, 'scene content starts below the navbar');
  assert.match(section, /background: var\(--cream\);/);
  assert.match(section, /--cream: #f6eee4;/, 'the page cream, continuous with the hero hand-off and New Arrivals');
  assert.match(header, /--site-nav-h: 88px;[\s\S]*max-width: 640px[\s\S]*--site-nav-h: 72px;/, 'one source for the navbar height');
  assert.match(header, /z-index: 50;/, 'navbar stays above the scene');
});
