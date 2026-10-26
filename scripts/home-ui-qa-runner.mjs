import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const TARGET_URL = 'http://localhost:4323/';
const OUT_DIR = path.resolve('scratchpad/home-ui-qa');

const DESKTOP_VIEWPORTS = [
  { name: 'desktop-1920x1080', width: 1920, height: 1080 },
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'desktop-1366x768', width: 1366, height: 768 },
  { name: 'desktop-1280x800', width: 1280, height: 800 },
];

const MOBILE_VIEWPORTS = [
  { name: 'mobile-390x844', width: 390, height: 844 },
  { name: 'mobile-375x812', width: 375, height: 812 },
  { name: 'mobile-360x800', width: 360, height: 800 },
  { name: 'mobile-430x932', width: 430, height: 932 },
];

async function launchChrome() {
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9223',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=/tmp/chrome-home-ui-qa'
  ], { stdio: 'ignore' });

  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9223/json/version');
      if (res.ok) {
        const data = await res.json();
        console.log('[Chrome] Running. Version:', data.Browser);
        return { proc: chromeProc, wsUrl: data.webSocketDebuggerUrl };
      }
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Could not connect to Chrome debugging port');
}

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

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const { proc: chromeProc, wsUrl } = await launchChrome();

  const auditReport = {
    testedUrl: TARGET_URL,
    timestamp: new Date().toISOString(),
    desktop: {},
    mobile: {}
  };

  try {
    const newTabRes = await fetch('http://127.0.0.1:9223/json/new', { method: 'PUT' });
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

    const capture = async (filename) => {
      const res = await client.send('Page.captureScreenshot', { format: 'png' });
      const filepath = path.join(OUT_DIR, filename);
      fs.writeFileSync(filepath, Buffer.from(res.data, 'base64'));
      console.log(`  [Screenshot] ${filename}`);
      return filename;
    };

    const evaluate = async (expr) => {
      const res = await client.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      return res.result?.value;
    };

    // ========================================================
    // DESKTOP TESTING
    // ========================================================
    console.log('\n=== TESTING DESKTOP VIEWPORTS ===');
    for (const vp of DESKTOP_VIEWPORTS) {
      console.log(`\n--- Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
      await setViewport(vp.width, vp.height, false);
      await client.send('Page.navigate', { url: TARGET_URL });
      await new Promise((r) => setTimeout(r, 2000)); // wait for Astro hydration & video start

      // 1. Initial Hero view
      const heroShot = await capture(`${vp.name}-01-hero.png`);

      // Observe hero metrics
      const heroMetrics = await evaluate(`(() => {
        const hero = document.querySelector('#home-hero, .mh-hero');
        const video = document.querySelector('#home-hero video, .mh-hero video');
        const clouds = document.querySelectorAll('.hero-cloud, [class*="cloud"]');
        const title = document.querySelector('.hero-title, [class*="hero"] h1, .mh-hero h1');
        return {
          heroFound: !!hero,
          heroRect: hero ? { width: hero.offsetWidth, height: hero.offsetHeight } : null,
          videoFound: !!video,
          videoPlaying: video ? !video.paused : false,
          videoSize: video ? { width: video.videoWidth, height: video.videoHeight, elW: video.offsetWidth, elH: video.offsetHeight } : null,
          cloudCount: clouds.length,
          titleText: title ? title.textContent.trim().replace(/\\s+/g, ' ') : null,
          horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
        };
      })()`);

      // 2. Scroll to Navbar & Carousel
      await evaluate(`window.scrollTo({ top: window.innerHeight, behavior: 'instant' });`);
      await new Promise((r) => setTimeout(r, 800));
      const navCarouselShot = await capture(`${vp.name}-02-navbar-carousel.png`);

      // Inspect Navbar & Carousel
      const navCarouselMetrics = await evaluate(`(() => {
        const navbar = document.querySelector('#home-navbar, .hero-navbar-section, .marshans-navbar-root');
        const navPill = document.querySelector('.marshans-pill-container, .navbar-container');
        const navLinks = Array.from(document.querySelectorAll('.marshans-pill-nav a, .nav-link-item')).map(a => a.textContent.trim());
        const navActions = Array.from(document.querySelectorAll('.marshans-pill-actions button, .marshans-pill-actions a')).map(el => el.getAttribute('aria-label') || el.className);

        const showcase = document.querySelector('#home-showcase, .mh-show');
        const cards = Array.from(document.querySelectorAll('.mh-show .mh-card')).map(c => {
          const rect = c.getBoundingClientRect();
          const img = c.querySelector('img');
          const title = c.querySelector('.mh-card__name')?.textContent.trim();
          const price = c.querySelector('.mh-card__price')?.textContent.trim();
          return {
            title,
            price,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            imgNatural: img ? { w: img.naturalWidth, h: img.naturalHeight } : null,
            imgRendered: img ? { w: img.offsetWidth, h: img.offsetHeight } : null
          };
        });

        return {
          navbarFound: !!navbar,
          navLinks,
          navActions,
          navWrap: navPill ? navPill.scrollWidth > navPill.clientWidth : false,
          showcaseFound: !!showcase,
          cardCount: cards.length,
          cards,
          horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
        };
      })()`);

      // 3. Scroll to Best Sellers & Collection
      await evaluate(`window.scrollBy({ top: 900, behavior: 'instant' });`);
      await new Promise((r) => setTimeout(r, 600));
      const collectionShot = await capture(`${vp.name}-03-collection.png`);

      // Inspect Collection
      const collectionMetrics = await evaluate(`(() => {
        const bestSellers = document.querySelector('#home-bestsellers, .home-bestsellers-section');
        const bestSellerCards = document.querySelectorAll('.home-bestsellers-section .marshans-product-card-wrap');
        const collectionHead = document.querySelector('.home-catalogue-head');
        const collectionGrid = document.querySelector('.home-products-section');
        const collectionCards = document.querySelectorAll('.home-products-section .marshans-product-card-wrap');
        return {
          bestSellersFound: !!bestSellers,
          bestSellerCount: bestSellerCards.length,
          collectionHeadText: collectionHead ? collectionHead.textContent.trim().replace(/\\s+/g, ' ') : null,
          collectionCount: collectionCards.length,
          horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
        };
      })()`);

      // 4. Scroll to Footer
      await evaluate(`window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });`);
      await new Promise((r) => setTimeout(r, 600));
      const footerShot = await capture(`${vp.name}-04-footer.png`);

      const footerMetrics = await evaluate(`(() => {
        const footer = document.querySelector('footer, .marshans-footer, .site-footer');
        return {
          footerFound: !!footer,
          footerRect: footer ? { w: footer.offsetWidth, h: footer.offsetHeight } : null,
          horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
        };
      })()`);

      auditReport.desktop[vp.name] = {
        viewport: vp,
        screenshots: [heroShot, navCarouselShot, collectionShot, footerShot],
        hero: heroMetrics,
        navCarousel: navCarouselMetrics,
        collection: collectionMetrics,
        footer: footerMetrics
      };
    }

    // ========================================================
    // MOBILE TESTING
    // ========================================================
    console.log('\n=== TESTING MOBILE VIEWPORTS ===');
    for (const vp of MOBILE_VIEWPORTS) {
      console.log(`\n--- Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
      await setViewport(vp.width, vp.height, true);
      await client.send('Page.navigate', { url: TARGET_URL });
      await new Promise((r) => setTimeout(r, 2000));

      // 1. Mobile Hero
      const heroShot = await capture(`${vp.name}-01-hero.png`);

      const heroMetrics = await evaluate(`(() => {
        const hero = document.querySelector('#home-hero, .mh-hero');
        const video = document.querySelector('#home-hero video, .mh-hero video');
        const title = document.querySelector('.hero-title, [class*="hero"] h1, .mh-hero h1');
        return {
          heroRect: hero ? { w: hero.offsetWidth, h: hero.offsetHeight } : null,
          videoRect: video ? { w: video.offsetWidth, h: video.offsetHeight } : null,
          titleText: title ? title.textContent.trim().replace(/\\s+/g, ' ') : null,
          horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
        };
      })()`);

      // 2. Mobile Navbar & Carousel
      await evaluate(`window.scrollTo({ top: window.innerHeight, behavior: 'instant' });`);
      await new Promise((r) => setTimeout(r, 800));
      const navCarouselShot = await capture(`${vp.name}-02-navbar-carousel.png`);

      const navCarouselMetrics = await evaluate(`(() => {
        const navbar = document.querySelector('#home-navbar, .hero-navbar-section');
        const navContainer = document.querySelector('.marshans-pill-container, .navbar-container');
        const showcase = document.querySelector('#home-showcase, .mh-show');
        const row = document.querySelector('.mh-show__row');
        const cards = Array.from(document.querySelectorAll('.mh-show .mh-card')).map(c => {
          const rect = c.getBoundingClientRect();
          return {
            title: c.querySelector('.mh-card__name')?.textContent.trim(),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          };
        });

        return {
          navbarRect: navbar ? { w: navbar.offsetWidth, h: navbar.offsetHeight } : null,
          navHorizontalOverflow: navContainer ? navContainer.scrollWidth > navContainer.clientWidth : false,
          showcaseRect: showcase ? { w: showcase.offsetWidth, h: showcase.offsetHeight } : null,
          cardCount: cards.length,
          cards,
          horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
        };
      })()`);

      // 3. Mobile Collection & Footer
      await evaluate(`window.scrollBy({ top: 900, behavior: 'instant' });`);
      await new Promise((r) => setTimeout(r, 600));
      const collectionShot = await capture(`${vp.name}-03-collection.png`);

      await evaluate(`window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });`);
      await new Promise((r) => setTimeout(r, 600));
      const footerShot = await capture(`${vp.name}-04-footer.png`);

      const finalMetrics = await evaluate(`(() => {
        const collectionCards = document.querySelectorAll('.home-products-section .marshans-product-card-wrap');
        const footer = document.querySelector('footer, .marshans-footer, .site-footer');
        return {
          collectionCardCount: collectionCards.length,
          footerFound: !!footer,
          horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth
        };
      })()`);

      auditReport.mobile[vp.name] = {
        viewport: vp,
        screenshots: [heroShot, navCarouselShot, collectionShot, footerShot],
        hero: heroMetrics,
        navCarousel: navCarouselMetrics,
        collectionFooter: finalMetrics
      };
    }

    client.close();
  } finally {
    chromeProc.kill('SIGKILL');
  }

  fs.writeFileSync(path.join(OUT_DIR, 'home-ui-qa-report.json'), JSON.stringify(auditReport, null, 2));
  console.log('\n[Finished] QA metrics and screenshots saved in scratchpad/home-ui-qa/');
}

run().catch(err => {
  console.error('[QA Runner Error]:', err);
  process.exit(1);
});
