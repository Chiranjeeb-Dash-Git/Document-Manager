import * as admin from 'firebase-admin';

// Initialize the Firebase Admin SDK
// You must set the FIREBASE_SERVICE_ACCOUNT_KEY environment variable
// with the base64 encoded JSON key, or the path to the JSON file.

try {
  if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      // Parse the JSON string
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      
      // Fix private key newlines if they are double-escaped
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'document-manager-fa2e2.firebasestorage.app'
      });
      console.log('Firebase Admin initialized successfully.');
    } else {
      console.warn('FIREBASE_SERVICE_ACCOUNT_KEY is not set. Database operations will fail.');
    }
  }
} catch (error) {
  console.error('Firebase Admin initialization error:', error);
}

export const db = admin.firestore();
export const bucket = admin.storage().bucket();
