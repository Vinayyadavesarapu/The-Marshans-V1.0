/**
 * THE MARSHANS — Shared Firebase Customer Authentication (chipakk-77b99)
 *
 * Safe client-side Firebase Auth handling.
 * Shares the exact same customer identity ecosystem with CHIPAKK.
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { clearMarshansCustomerCache } from '../session/cache';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  type Auth,
  type User
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY || "AIzaSyB_0DEb67iAWglUi9a1XCbyOTQ6g2eVDzY",
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN || "chipakk-77b99.firebaseapp.com",
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID || "chipakk-77b99",
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET || "chipakk-77b99.firebasestorage.app",
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "869954620444",
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID || "1:869954620444:web:d12ace45869ad233ace3d9",
  measurementId: import.meta.env.PUBLIC_FIREBASE_MEASUREMENT_ID || "G-EQBMDTE656"
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function getFirebaseClient(): { app: FirebaseApp; auth: Auth } {
  if (typeof window === 'undefined') {
    throw new Error('Firebase Auth is only accessible in browser environment');
  }

  if (!app) {
    app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    auth = getAuth(app);
  }

  return { app, auth: auth! };
}

export async function loginWithEmail(email: string, pass: string): Promise<User> {
  const { auth } = getFirebaseClient();
  const credential = await signInWithEmailAndPassword(auth, email, pass);
  return credential.user;
}

export async function registerWithEmail(email: string, pass: string): Promise<User> {
  const { auth } = getFirebaseClient();
  const credential = await createUserWithEmailAndPassword(auth, email, pass);
  return credential.user;
}

export async function logoutCustomer(): Promise<void> {
  const { auth } = getFirebaseClient();
  await signOut(auth);
  // The cached cart and saved address are not keyed by user: wipe them so the next customer on this browser
  // never sees them. Runs only after Firebase sign-out succeeded.
  clearMarshansCustomerCache();
}

export async function sendResetPassword(email: string): Promise<void> {
  const { auth } = getFirebaseClient();
  await sendPasswordResetEmail(auth, email);
}

export async function loginWithGoogle(): Promise<User> {
  const { auth } = getFirebaseClient();
  const provider = new GoogleAuthProvider();
  const res = await signInWithPopup(auth, provider);
  return res.user;
}

export function subscribeToAuth(cb: (user: User | null) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  try {
    const { auth } = getFirebaseClient();
    return onAuthStateChanged(auth, cb);
  } catch (err) {
    console.warn('[Firebase Auth] Initialization deferred:', err);
    return () => {};
  }
}

export async function getCurrentIdToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const { auth } = getFirebaseClient();
    if (!auth.currentUser) return null;
    return await auth.currentUser.getIdToken();
  } catch {
    return null;
  }
}

export const onAuthStateChange = subscribeToAuth;
export const logOut = logoutCustomer;

