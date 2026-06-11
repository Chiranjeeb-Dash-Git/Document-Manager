import * as admin from 'firebase-admin';

// Initialize the Firebase Admin SDK lazily so that a missing/invalid
// FIREBASE_SERVICE_ACCOUNT_KEY does not throw at module load time (which would
// crash the entire serverless function for every route). Instead the error is
// surfaced only when the database/storage is actually used, where route-level
// try/catch turns it into a clean JSON error response.

function ensureApp(): void {
  if (admin.apps.length) return;

  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!key) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add the Firebase service account JSON to the environment.'
    );
  }

  const serviceAccount = JSON.parse(key) as admin.ServiceAccount & { private_key?: string };
  // Fix private key newlines if they are double-escaped (common when stored as an env var).
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET || 'document-manager-fa2e2.firebasestorage.app',
  });
}

export function getDb(): admin.firestore.Firestore {
  ensureApp();
  return admin.firestore();
}

export function getBucket() {
  ensureApp();
  return admin.storage().bucket();
}

function lazyProxy<T extends object>(resolve: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      const real = resolve() as unknown as Record<PropertyKey, unknown>;
      const value = real[prop];
      return typeof value === 'function'
        ? (value as (...args: unknown[]) => unknown).bind(real)
        : value;
    },
  });
}

// Preserve the existing `db` / `bucket` import API while staying lazy.
export const db: admin.firestore.Firestore = lazyProxy(getDb);
export const bucket: ReturnType<typeof getBucket> = lazyProxy(getBucket);
