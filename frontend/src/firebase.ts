// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDPVll1fkI8IHPWEFiVBM6NZRNZq0mM6CM",
  authDomain: "document-manager-fa2e2.firebaseapp.com",
  projectId: "document-manager-fa2e2",
  storageBucket: "document-manager-fa2e2.firebasestorage.app",
  messagingSenderId: "909153022964",
  appId: "1:909153022964:web:23a1acc2a1f1de5dc6ffa1",
  measurementId: "G-QYKTVSEPYR"
};

import { getAuth } from "firebase/auth";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
const auth = getAuth(app);

export { app, analytics, auth };
