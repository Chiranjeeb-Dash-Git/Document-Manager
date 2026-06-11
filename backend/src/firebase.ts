import * as admin from 'firebase-admin';
import type { Bucket } from '@google-cloud/storage';

let initialized = false;

function parseServiceAccountKey(raw: string): admin.ServiceAccount {
  let key = raw.trim();

  if (
    (key.startsWith("'") && key.endsWith("'")) ||
    (key.startsWith('"') && key.endsWith('"'))
  ) {
    key = key.slice(1, -1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(key);
  } catch {
    try {
      parsed = JSON.parse(Buffer.from(key, 'base64').toString('utf8'));
    } catch {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_KEY is invalid. Paste the full Firebase service account JSON in Vercel environment variables.'
      );
    }
  }

  const serviceAccount = parsed as admin.ServiceAccount & { private_key?: string };
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }

  return serviceAccount;
}

function initializeFirebase(): void {
  if (initialized || admin.apps.length > 0) {
    initialized = true;
    return;
  }

  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!key) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add your Firebase service account JSON to Vercel environment variables.'
    );
  }

  const serviceAccount = parseServiceAccountKey(key);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'document-manager-fa2e2.firebasestorage.app',
  });

  initialized = true;
  console.log('Firebase Admin initialized successfully.');
}

export function getDb(): admin.firestore.Firestore {
  initializeFirebase();
  return admin.firestore();
}

export function getBucket(): Bucket {
  initializeFirebase();
  return admin.storage().bucket();
}

function createLazyProxy<T extends object>(getInstance: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      const instance = getInstance();
      const value = (instance as Record<string | symbol, unknown>)[prop];
      return typeof value === 'function'
        ? (value as (...args: unknown[]) => unknown).bind(instance)
        : value;
    },
  });
}

export const db = createLazyProxy(getDb);
export const bucket = createLazyProxy(getBucket);
