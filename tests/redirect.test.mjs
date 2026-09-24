/** /login?redirect=<x> must only ever land on a same-site path (open-redirect guard), and keep the checkout flow. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadModule, ROOT } from './helpers/load.mjs';

const { getSafeRedirect } = await loadModule('src/lib/auth/safeRedirect.ts');

test('valid same-origin paths are allowed', () => {
  assert.equal(getSafeRedirect('/account'), '/account');
  assert.equal(getSafeRedirect('/checkout'), '/checkout');
  assert.equal(getSafeRedirect('/account/orders'), '/account/orders');
  assert.equal(getSafeRedirect('/shop?category=lumo'), '/shop?category=lumo');
  assert.equal(getSafeRedirect('/product/lumo-orb#reviews'), '/product/lumo-orb#reviews');
  assert.equal(getSafeRedirect('  /cart  '), '/cart');
});

test('the checkout flow is preserved: /login?redirect=/checkout returns to /checkout', () => {
  const param = new URLSearchParams('?redirect=/checkout').get('redirect');
  assert.equal(getSafeRedirect(param), '/checkout');
  const encoded = new URLSearchParams('?redirect=%2Fcheckout').get('redirect');
  assert.equal(getSafeRedirect(encoded), '/checkout');
});

test('absolute http/https URLs are rejected', () => {
  for (const v of ['https://evil.example', 'http://evil.example/x', 'HTTPS://EVIL.EXAMPLE', 'https:evil.example', 'ftp://evil.example', 'evil.example/path']) {
    assert.equal(getSafeRedirect(v), '/account', v);
  }
});

test('protocol-relative //host is rejected', () => {
  for (const v of ['//evil.example', '//evil.example/x', '///evil.example', '  //evil.example']) assert.equal(getSafeRedirect(v), '/account', v);
});

test('javascript:/data:/vbscript: schemes are rejected', () => {
  for (const v of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', 'data:text/html,<script>1</script>', 'vbscript:x']) {
    assert.equal(getSafeRedirect(v), '/account', v);
  }
});

test('browser-normalization tricks are rejected: backslashes, and tab/CR/LF that URL parsers strip', () => {
  for (const v of ['/\\evil.example', '\\\\evil.example', '/\\/evil.example', '/\t/evil.example', '/\n/evil.example', '/\r/evil.example', '/ok\u0000', '/a\\b']) {
    assert.equal(getSafeRedirect(v), '/account', JSON.stringify(v));
  }
});

test('missing / empty / non-string values fall back to /account', () => {
  for (const v of [null, undefined, '', '   ', 42, {}, [], true]) assert.equal(getSafeRedirect(v), '/account');
});

test('a custom fallback is honored for invalid input, and never for valid input', () => {
  assert.equal(getSafeRedirect('https://evil.example', '/'), '/');
  assert.equal(getSafeRedirect('/cart', '/'), '/cart');
});

test('LoginForm.jsx routes the redirect param through the guard (no raw param navigation)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/components/react/LoginForm.jsx'), 'utf8');
  assert.ok(src.includes("getSafeRedirect(params.get('redirect'))"));
  assert.ok(!/params\.get\('redirect'\)\s*\|\|/.test(src), 'raw `params.get("redirect") ||` navigation must be gone');
  assert.match(src, /window\.location\.href = getRedirect\(\)/);
});
