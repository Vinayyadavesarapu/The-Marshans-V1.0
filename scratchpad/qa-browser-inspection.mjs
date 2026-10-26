import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const PORT = 4173;
const DIST_DIR = path.resolve('dist');
const OUT_DIR = path.resolve('scratchpad/browser-qa');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.xml': 'application/xml',
  '.txt': 'text/plain'
};

// 1. Static file server for dist
function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = decodeURIComponent(req.url.split('?')[0]);
      if (reqPath.endsWith('/')) {
        reqPath += 'index.html';
      }
      let filePath = path.join(DIST_DIR, reqPath);

      if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
        filePath += '.html';
      } else if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
    });

    server.listen(PORT, '127.0.0.1', () => {
      console.log(`[Server] Static dist served at http://127.0.0.1:${PORT}`);
      resolve(server);
    });
  });
}

// 2. Launch headless Chrome with CDP
async function launchChrome() {
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=/tmp/chrome-marshans-qa'
  ], { stdio: 'ignore' });

  // Poll until remote debugging endpoint is available
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9222/json/version');
      if (res.ok) {
        const data = await res.json();
        console.log('[Chrome] Ready. Version:', data.Browser);
        return { proc: chromeProc, wsUrl: data.webSocketDebuggerUrl };
      }
    } catch (e) {
      // wait
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Chrome failed to start or remote debugging port not available');
}

// 3. CDP Client wrapper
class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.pending = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
  }

  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function runQA() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = await startServer();
  const { proc: chromeProc, wsUrl } = await launchChrome();

  const results = {
    pagesTested: {},
    carouselsFound: {},
    limitations: null
  };

  try {
    // Create new target/tab
    const newTabRes = await fetch('http://127.0.0.1:9222/json/new', { method: 'PUT' });
    const tabData = await newTabRes.json();
    const client = new CDPClient(tabData.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('DOM.enable');

    const setViewport = async (width, height, isMobile = false) => {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: isMobile ? 2 : 1,
        mobile: isMobile
      });
      await client.send('Emulation.setTouchEmulationEnabled', { enabled: isMobile });
    };

    const navigate = async (url) => {
      await client.send('Page.navigate', { url });
      // wait for load event
      await new Promise((r) => setTimeout(r, 1200));
    };

    const capture = async (filename) => {
      const res = await client.send('Page.captureScreenshot', { format: 'png' });
      const filepath = path.join(OUT_DIR, filename);
      fs.writeFileSync(filepath, Buffer.from(res.data, 'base64'));
      console.log(`[Screenshot saved] ${filepath}`);
      return filepath;
    };

    const evaluate = async (expr) => {
      const res = await client.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      return res.result?.value;
    };

    // ========================================================
    // 1. HOMEPAGE INSPECTION (Desktop 1440x900)
    // ========================================================
    console.log('\n--- 1. Testing Homepage (Desktop) ---');
    await setViewport(1440, 900, false);
    await navigate(`http://127.0.0.1:${PORT}/`);

    // Frame 1: Initial load
    await capture('01-home-initial-hero-desktop.png');

    const heroInfo = await evaluate(`(() => {
      const hero = document.querySelector('.hero-intro-viewport');
      const navbar = document.querySelector('.marshans-navbar-root');
      return {
        hasHero: !!hero,
        heroHeight: hero ? hero.offsetHeight : 0,
        hasNavbar: !!navbar,
        windowScrollY: window.scrollY
      };
    })()`);
    console.log('Homepage Initial State:', heroInfo);

    // Scroll to navbar & carousel
    await evaluate(`window.scrollTo({ top: window.innerHeight, behavior: 'instant' });`);
    await new Promise((r) => setTimeout(r, 600));

    // Frame 2: Carousel visible
    await capture('02-home-carousel-handoff-desktop.png');

    const homeCarouselAudit = await evaluate(`(() => {
      // Search for any carousel components/elements
      const showcases = document.querySelectorAll('.mh-show, #home-showcase, .home-showcase-section, #home-carousel-section');
      const oldCarousels = document.querySelectorAll('.home-carousel-wrapper, .poster-carousel, .carousel-container');
      const allCarouselMatches = document.querySelectorAll('[class*="carousel"], [id*="carousel"]');

      // Order of major sections on the homepage
      const sections = Array.from(document.querySelectorAll('main > *, body > div, section, .hero-intro-viewport, .marshans-navbar-root, .mh-show, .home-bestsellers-section, .home-catalogue-head, .home-products-section'))
        .filter(el => el.offsetHeight > 0)
        .map(el => ({
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          top: el.getBoundingClientRect().top + window.scrollY
        }))
        .sort((a, b) => a.top - b.top);

      // Inspect showcase cards
      const showcaseCards = Array.from(document.querySelectorAll('.mh-show .mh-card'));
      const cardVisibility = showcaseCards.map(c => {
        const style = window.getComputedStyle(c);
        const rect = c.getBoundingClientRect();
        return {
          title: c.querySelector('.mh-card__name')?.textContent?.trim(),
          opacity: style.opacity,
          visibility: style.visibility,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          top: Math.round(rect.top + window.scrollY)
        };
      });

      return {
        showcaseCount: showcases.length,
        oldCarouselCount: oldCarousels.length,
        totalCarouselClassElements: allCarouselMatches.length,
        sectionsOrder: sections.slice(0, 8),
        cardCount: showcaseCards.length,
        cardVisibility
      };
    })()`);
    console.log('Homepage Carousel Audit:', homeCarouselAudit);
    results.carouselsFound['Homepage (Desktop)'] = homeCarouselAudit.showcaseCount;

    // Scroll further past carousel to Best Sellers & Collection
    await evaluate(`window.scrollBy({ top: 850, behavior: 'instant' });`);
    await new Promise((r) => setTimeout(r, 500));
    await capture('03-home-bestsellers-collection-desktop.png');

    // ========================================================
    // 2. HOMEPAGE MOBILE (390x844)
    // ========================================================
    console.log('\n--- 2. Testing Homepage (Mobile) ---');
    await setViewport(390, 844, true);
    await navigate(`http://127.0.0.1:${PORT}/`);
    await capture('04-home-initial-mobile.png');

    await evaluate(`window.scrollTo({ top: window.innerHeight, behavior: 'instant' });`);
    await new Promise((r) => setTimeout(r, 600));
    await capture('05-home-carousel-mobile.png');

    const mobileCarouselAudit = await evaluate(`(() => {
      const showcases = document.querySelectorAll('.mh-show, #home-showcase');
      const cards = document.querySelectorAll('.mh-show .mh-card');
      return { count: showcases.length, cardCount: cards.length };
    })()`);
    results.carouselsFound['Homepage (Mobile)'] = mobileCarouselAudit.count;

    // ========================================================
    // 3. CATALOG /shop (Desktop 1440x900)
    // ========================================================
    console.log('\n--- 3. Testing /shop (Desktop) ---');
    await setViewport(1440, 900, false);
    await navigate(`http://127.0.0.1:${PORT}/shop`);
    await capture('06-shop-desktop.png');

    const shopAudit = await evaluate(`(() => {
      const carousels = document.querySelectorAll('.home-showcase-section, .home-carousel-wrapper, .poster-carousel, .carousel-container, [aria-roledescription="carousel"]');
      const cards = document.querySelectorAll('.marshans-product-card-wrap');
      const leadText = document.querySelector('.shop-hero-lead')?.textContent?.trim();
      return {
        carouselCount: carousels.length,
        productCardsCount: cards.length,
        leadText
      };
    })()`);
    console.log('/shop Audit:', shopAudit);
    results.carouselsFound['/shop'] = shopAudit.carouselCount;

    // ========================================================
    // 4. CATEGORY /categories/lumo (Desktop 1440x900)
    // ========================================================
    console.log('\n--- 4. Testing Category /categories/lumo (Desktop) ---');
    await navigate(`http://127.0.0.1:${PORT}/categories/lumo`);
    await capture('07-category-lumo-desktop.png');

    const categoryAudit = await evaluate(`(() => {
      const carousels = document.querySelectorAll('.home-showcase-section, .home-carousel-wrapper, .poster-carousel, .carousel-container, [aria-roledescription="carousel"]');
      const bannerImg = document.querySelector('.collection-hero-banner-img');
      const bannerRect = bannerImg ? bannerImg.getBoundingClientRect() : null;
      const cards = document.querySelectorAll('.marshans-product-card-wrap');
      return {
        carouselCount: carousels.length,
        bannerHeight: bannerRect ? bannerRect.height : 0,
        productCardsCount: cards.length
      };
    })()`);
    console.log('Category /categories/lumo Audit:', categoryAudit);
    results.carouselsFound['/categories/lumo'] = categoryAudit.carouselCount;

    // ========================================================
    // 5. PRODUCT DETAIL /product/marshans-spiralnest-lamp (Desktop & Mobile)
    // ========================================================
    console.log('\n--- 5. Testing Product Detail /product/marshans-spiralnest-lamp ---');
    await navigate(`http://127.0.0.1:${PORT}/product/marshans-spiralnest-lamp`);
    await capture('08-product-detail-desktop.png');

    const productAudit = await evaluate(`(() => {
      const carousels = document.querySelectorAll('.home-showcase-section, .home-carousel-wrapper, .poster-carousel, .carousel-container, [aria-roledescription="carousel"]');
      const companionGrid = document.querySelector('.companion-artifacts-section .marshans-listing-grid');
      const assurancePillars = Array.from(document.querySelectorAll('.assurance-pillar')).map(p => ({
        head: p.querySelector('.pillar-head')?.textContent?.trim() || p.querySelector('.pillar-title')?.textContent?.trim(),
        sub: p.querySelector('.pillar-sub')?.textContent?.trim()
      }));
      const stepperVal = document.querySelector('.stepper-val, .qty-digit')?.textContent?.trim();
      return {
        carouselCount: carousels.length,
        hasCompanionGrid: !!companionGrid,
        assurancePillars,
        stepperVal
      };
    })()`);
    console.log('Product Detail Audit:', productAudit);
    results.carouselsFound['/product/marshans-spiralnest-lamp (Desktop)'] = productAudit.carouselCount;

    // Mobile product detail
    await setViewport(390, 844, true);
    await capture('09-product-detail-mobile.png');

    client.close();
  } finally {
    chromeProc.kill('SIGKILL');
    server.close();
    console.log('\n[Done] All inspections finished. Server & Chrome closed.');
  }

  // Summary JSON
  fs.writeFileSync(path.join(OUT_DIR, 'qa-summary.json'), JSON.stringify(results, null, 2));
}

runQA().catch((err) => {
  console.error('[Error during QA run]:', err);
  process.exit(1);
});
