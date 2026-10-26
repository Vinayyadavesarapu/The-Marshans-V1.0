import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const TARGET_URL = 'http://localhost:4323/';
const VIEWPORTS = [
  { name: '1920x1080', width: 1920, height: 1080, mobile: false },
  { name: '1440x900', width: 1440, height: 900, mobile: false },
  { name: '1366x768', width: 1366, height: 768, mobile: false },
  { name: '1280x800', width: 1280, height: 800, mobile: false },
  { name: '390x844', width: 390, height: 844, mobile: true },
  { name: '375x812', width: 375, height: 812, mobile: true },
  { name: '360x800', width: 360, height: 800, mobile: true },
  { name: '430x932', width: 430, height: 932, mobile: true },
];

async function launchChrome() {
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9224',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=/tmp/chrome-nav-audit'
  ], { stdio: 'ignore' });

  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9224/json/version');
      if (res.ok) {
        const data = await res.json();
        return { proc: chromeProc, wsUrl: data.webSocketDebuggerUrl };
      }
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Chrome remote debugging port not available');
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

async function inspectAll() {
  const { proc, wsUrl } = await launchChrome();
  const summary = {};

  try {
    const newTabRes = await fetch('http://127.0.0.1:9224/json/new', { method: 'PUT' });
    const tabData = await newTabRes.json();
    const client = new CDPClient(tabData.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('DOM.enable');

    for (const vp of VIEWPORTS) {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.mobile ? 2 : 1,
        mobile: vp.mobile
      });
      await client.send('Emulation.setTouchEmulationEnabled', { enabled: vp.mobile });
      await client.send('Page.navigate', { url: TARGET_URL });
      await new Promise((r) => setTimeout(r, 1500));

      // Scroll to navbar
      await client.send('Runtime.evaluate', {
        expression: `window.scrollTo({ top: window.innerHeight, behavior: 'instant' });`,
        awaitPromise: true
      });
      await new Promise((r) => setTimeout(r, 400));

      const res = await client.send('Runtime.evaluate', {
        expression: `(() => {
          const nav = document.querySelector('.navbar--pill');
          const logoBadge = document.querySelector('.navbar--pill .navbar-logo-badge');
          const links = Array.from(document.querySelectorAll('.navbar--pill .nav-link')).map(l => ({
            text: l.textContent.trim(),
            rect: { w: Math.round(l.getBoundingClientRect().width), h: Math.round(l.getBoundingClientRect().height) },
            visible: l.offsetWidth > 0 && l.offsetHeight > 0
          }));
          const rightBtns = Array.from(document.querySelectorAll('.navbar--pill .navbar-right > *')).map(b => ({
            tag: b.tagName,
            cls: b.className,
            rect: { w: Math.round(b.getBoundingClientRect().width), h: Math.round(b.getBoundingClientRect().height) },
            visible: b.offsetWidth > 0
          }));

          const showcase = document.querySelector('.mh-show');
          const showcaseCards = Array.from(document.querySelectorAll('.mh-show .mh-card')).map(c => {
            const r = c.getBoundingClientRect();
            return {
              title: c.querySelector('.mh-card__name')?.textContent.trim(),
              w: Math.round(r.width),
              h: Math.round(r.height),
              left: Math.round(r.left),
              right: Math.round(r.right),
              top: Math.round(r.top)
            };
          });

          // Check horizontal overflow
          const docScrollW = document.documentElement.scrollWidth;
          const docClientW = document.documentElement.clientWidth;

          return {
            docOverflow: docScrollW > docClientW ? { scrollW: docScrollW, clientW: docClientW } : null,
            navbar: {
              found: !!nav,
              w: nav ? nav.offsetWidth : 0,
              h: nav ? nav.offsetHeight : 0,
              logoBadge: logoBadge ? { w: logoBadge.offsetWidth, h: logoBadge.offsetHeight } : null,
              linksCount: links.length,
              linksVisible: links.filter(l => l.visible).length,
              links: links,
              rightActionsCount: rightBtns.length,
              rightActions: rightBtns
            },
            showcase: {
              found: !!showcase,
              w: showcase ? showcase.offsetWidth : 0,
              cards: showcaseCards
            }
          };
        })()`,
        returnByValue: true
      });

      summary[vp.name] = res.result?.value;
    }

    client.close();
  } finally {
    proc.kill('SIGKILL');
  }

  console.log(JSON.stringify(summary, null, 2));
}

inspectAll().catch(console.error);
