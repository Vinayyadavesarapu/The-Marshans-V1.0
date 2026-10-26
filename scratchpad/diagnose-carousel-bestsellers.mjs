import { spawn } from 'node:child_process';

async function diagnose() {
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9225',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=/tmp/chrome-diag'
  ], { stdio: 'ignore' });

  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9225/json/version');
      if (res.ok) {
        const data = await res.json();
        const ws = new WebSocket(data.webSocketDebuggerUrl);
        await new Promise((resolve) => { ws.onopen = resolve; });

        let reqId = 1;
        const send = (method, params = {}) => new Promise((resolve) => {
          const id = reqId++;
          const handler = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.id === id) {
              ws.removeEventListener('message', handler);
              resolve(msg.result);
            }
          };
          ws.addEventListener('message', handler);
          ws.send(JSON.stringify({ id, method, params }));
        });

        // Listen to console messages
        ws.addEventListener('message', (event) => {
          const msg = JSON.parse(event.data);
          if (msg.method === 'Runtime.consoleAPICalled') {
            console.log('[Browser Console]:', msg.params.type, msg.params.args.map(a => a.value));
          }
          if (msg.method === 'Log.entryAdded') {
            console.log('[Browser Log]:', msg.params.entry);
          }
        });

        await send('Page.enable');
        await send('Runtime.enable');
        await send('Log.enable');

        await send('Emulation.setDeviceMetricsOverride', {
          width: 1440,
          height: 900,
          deviceScaleFactor: 1,
          mobile: false
        });

        console.log('[Navigating to http://localhost:4323/]');
        await send('Page.navigate', { url: 'http://localhost:4323/' });
        await new Promise((r) => setTimeout(r, 2500));

        const state1 = await send('Runtime.evaluate', {
          expression: `(() => {
            const showcase = document.querySelector('#home-showcase, .mh-show');
            const bestSellers = document.querySelector('#home-best-sellers, .home-best-sellers');
            const astroIslands = Array.from(document.querySelectorAll('astro-island')).map(el => ({
              component: el.getAttribute('component-url'),
              client: el.getAttribute('client'),
              ssr: el.getAttribute('ssr'),
              props: el.getAttribute('props')
            }));

            return {
              scrollY: window.scrollY,
              showcase: showcase ? {
                id: showcase.id,
                className: showcase.className,
                offsetHeight: showcase.offsetHeight,
                offsetTop: showcase.offsetTop,
                rect: showcase.getBoundingClientRect(),
                computedOpacity: window.getComputedStyle(showcase).opacity,
                computedVisibility: window.getComputedStyle(showcase).visibility,
                computedDisplay: window.getComputedStyle(showcase).display,
                cardCount: showcase.querySelectorAll('.mh-card').length,
                innerHtmlEmpty: showcase.innerHTML.trim() === ''
              } : null,
              bestSellers: bestSellers ? {
                id: bestSellers.id,
                offsetHeight: bestSellers.offsetHeight
              } : null,
              astroIslands
            };
          })()`,
          returnByValue: true
        });

        console.log('\n--- State on Initial Load (scrollY: 0) ---');
        console.log(JSON.stringify(state1.result?.value, null, 2));

        // Now scroll to 900
        await send('Runtime.evaluate', {
          expression: `window.scrollTo({ top: 900, behavior: 'instant' });`
        });
        await new Promise((r) => setTimeout(r, 800));

        const state2 = await send('Runtime.evaluate', {
          expression: `(() => {
            const showcase = document.querySelector('#home-showcase, .mh-show');
            const cards = showcase ? Array.from(showcase.querySelectorAll('.mh-card')).map(c => {
              const cs = window.getComputedStyle(c);
              const rect = c.getBoundingClientRect();
              return {
                title: c.querySelector('.mh-card__name')?.textContent.trim(),
                opacity: cs.opacity,
                visibility: cs.visibility,
                display: cs.display,
                transform: cs.transform,
                rect: { top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height }
              };
            }) : [];

            return {
              scrollY: window.scrollY,
              showcaseClass: showcase?.className,
              showcaseRect: showcase?.getBoundingClientRect(),
              cards
            };
          })()`,
          returnByValue: true
        });

        console.log('\n--- State after scrolling to 900 ---');
        console.log(JSON.stringify(state2.result?.value, null, 2));

        ws.close();
        chromeProc.kill('SIGKILL');
        return;
      }
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 200));
  }
}

diagnose().catch(console.error);
