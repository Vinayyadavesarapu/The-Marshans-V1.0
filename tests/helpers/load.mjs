/**
 * Test harness: bundles the REAL shipped Marshans modules (src/**\/*.ts) with the project's own esbuild and imports
 * the result, so tests exercise the actual code -- not a copy of it. Only the Firebase SDK is stubbed (recording
 * calls) and a minimal browser (window/localStorage/sessionStorage/fetch) is installed per test.
 */
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const FIREBASE_APP_STUB = `
  export function getApps() { return globalThis.__fb.apps; }
  export function initializeApp(cfg) { const a = { name: 'stub-app', cfg }; globalThis.__fb.apps.push(a); globalThis.__fb.calls.push('initializeApp'); return a; }
`;
const FIREBASE_AUTH_STUB = `
  export function getAuth() { return globalThis.__fb.auth; }
  export async function signOut(auth) {
    globalThis.__fb.calls.push('signOut');
    if (globalThis.__fb.signOutError) throw globalThis.__fb.signOutError;
    auth.currentUser = null;
  }
  export async function signInWithEmailAndPassword() { globalThis.__fb.calls.push('signIn'); }
  export async function createUserWithEmailAndPassword() {}
  export async function sendPasswordResetEmail() {}
  export function onAuthStateChanged(auth, cb) { globalThis.__fb.listeners.push(cb); return () => {}; }
  export class GoogleAuthProvider {}
  export async function signInWithPopup() {}
`;

const firebaseStubPlugin = {
  name: 'firebase-stub',
  setup(b) {
    b.onResolve({ filter: /^firebase\/(app|auth)$/ }, (args) => ({ path: args.path, namespace: 'fb-stub' }));
    b.onLoad({ filter: /.*/, namespace: 'fb-stub' }, (args) => ({
      contents: args.path === 'firebase/app' ? FIREBASE_APP_STUB : FIREBASE_AUTH_STUB,
      loader: 'js'
    }));
  }
};

let counter = 0;

/** Bundle + import a module relative to the Marshans project root (e.g. 'src/lib/api/orders.ts'). */
export async function loadModule(relPath) {
  const result = await build({
    entryPoints: [path.join(ROOT, relPath)],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    target: 'node22',
    logLevel: 'silent',
    define: { 'import.meta.env': '{}' },
    plugins: [firebaseStubPlugin]
  });
  const code = `${result.outputFiles[0].text}\n//# unique=${++counter}-${Math.random()}`;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

function makeStorage(map) {
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    key: (i) => [...map.keys()][i] ?? null,
    get length() { return map.size; }
  };
}

/**
 * Installs a minimal browser + Firebase state. Returns handles for assertions.
 *   user: { uid, token } -> auth.currentUser with getIdToken(); null = signed out.
 */
export function installBrowser({ user = { uid: 'uidA', token: 'tokA' }, search = '' } = {}) {
  const local = new Map();
  const session = new Map();
  const events = [];
  const win = {
    localStorage: makeStorage(local),
    sessionStorage: makeStorage(session),
    dispatchEvent: (e) => { events.push(e); return true; },
    addEventListener() {},
    removeEventListener() {},
    location: { search, hostname: 'themarshans.shop', href: 'https://themarshans.shop/' }
  };
  const def = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  def('window', win);
  def('localStorage', win.localStorage);
  def('sessionStorage', win.sessionStorage);

  globalThis.__fb = {
    apps: [],
    calls: [],
    listeners: [],
    signOutError: null,
    auth: { currentUser: user ? { uid: user.uid, getIdToken: async () => user.token } : null }
  };
  return { local, session, events, win, fb: globalThis.__fb };
}

/** Replaces global fetch with a recorder. `handler(url, init)` -> { status, body }. */
export function installFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const headers = {};
    for (const [k, v] of Object.entries(init.headers || {})) headers[k.toLowerCase()] = v;
    calls.push({ url: String(url), method: init.method || 'GET', headers, body: init.body });
    const { status = 200, body = null } = await handler(String(url), init, headers);
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
  return calls;
}
