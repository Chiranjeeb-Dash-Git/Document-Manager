<div align="center">
  <img src="https://raw.githubusercontent.com/Chiranjeeb-Dash-Git/Document-Manager/main/frontend/public/favicon.svg" alt="Document Manager Logo" width="120" />

  # 📑 Document Manager & Tools Hub

  <p><strong>The ultimate all-in-one suite for secure document management, electronic signing, and image processing.</strong></p>

  [![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)](https://expressjs.com/)
  [![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
  
  <br />
  
  [![Live Demo](https://img.shields.io/badge/Live_Demo-00F2FF?style=for-the-badge&logo=vercel&logoColor=black)](https://document-manager-frontend-production.up.railway.app/)
</div>

<br />

## ✨ Key Features & Capabilities

### ✍️ E-Signature Studio & Mobile Signing
Sign PDFs natively in your browser using an advanced toolset.
- **Draw, Type, or Upload**: Support for smooth mouse drawing, beautiful cursive fonts (Caveat, Pacifico), or image-based signatures.
- **📱 Cross-Device QR Signing**: Scan a dynamically generated QR code with your mobile phone to seamlessly draw your signature on your touchscreen. The signature is instantly transferred back to your desktop in real-time using secure WebSockets/polling!
- **Download & Share**: Generate the final merged PDF directly on your device.

### 🔏 Public Document Signing & Audit Trails
Share secure links for clients to sign documents remotely.
- **Split-Pane Viewer**: Clients review the document on the left while securely inputting their details and signature on the right.
- **Audit Logging**: Tracks Signer Name, Govt ID, Timestamp, and IP Address.
- **Verified Signer ID Cards**: Click on any signature in the dashboard to view a beautiful ID card verifying the signer's identity and uploaded Government ID!

### 🛡️ Secure Vault (PIN Protected)
Store your most sensitive files in an encrypted, hidden vault.
- **Biometric/PIN Authentication**: Requires a 4-digit cryptographic PIN to unlock the vault for the active session.
- **Custom React PDF Viewer**: Bypasses browser `X-Frame-Options` restrictions to securely render encrypted documents via Data URIs without exposing them to cross-origin risks.

### 💾 Persistent Cloud Storage (Firebase Fallback)
Ensures your documents are never lost, even across server restarts.
- Primary local storage coupled with an **automated Firebase Storage fallback**. If the ephemeral backend server spins down, the application will transparently stream missing PDFs directly from the cloud.

### 📸 AI Passport Photo Generator
Instantly create print-ready passport photos using cutting-edge edge-AI.
- Uses **@imgly/background-removal (Neural Net)** to completely remove complex backgrounds entirely in your browser (No API costs!).
- Pre-configured dimensions for **12+ Countries** (India, USA, Schengen, UK, etc.).
- Generate single photos or a **4×6 inch Print Sheet** with precise cut-guides.

### 🖼️ Universal Image Converter
Convert between any image format (JPG, PNG, WEBP, HEIC/HEIF) completely offline with a slick, drag-and-drop glassmorphism interface.

---

## 🏗️ Architecture

The project is structured as a full-stack decoupled monorepo:

* `/frontend` - React + Vite + Tailwind CSS + Framer Motion (The UI)
* `/backend` - Node.js + Express + Firebase Admin (The API server)

---

## 🚀 Deployment Guide

This project is configured for split deployment: a serverless frontend and a stateful persistent backend.

### 1. Deploy the Frontend (Netlify / Vercel)
1. Import this repository to your hosting provider.
2. Set the **Root Directory** to `frontend`.
3. Set the build command to `npm run build` and output directory to `dist`.
4. Add Environment Variable: `VITE_API_URL=https://your-backend-url.up.railway.app/api`

### 2. Deploy the Backend (Railway / Render)
1. Create a new Web Service in [Railway.app](https://railway.app/).
2. Set the **Root Directory** to `backend`.
3. Build Command: `npm install && npm run build`
4. Start Command: `npm start`
5. Ensure the following Environment Variables are configured:
   - `JWT_SECRET`
   - `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON string)
   - `FIREBASE_STORAGE_BUCKET`

---

## 💻 Local Development

To run this project locally on your machine:

**1. Clone & Install Dependencies**
```bash
git clone https://github.com/Chiranjeeb-Dash-Git/Document-Manager.git
```

**2. Start the Backend Server**
```bash
cd backend
npm install
npm run dev
```

**3. Start the Frontend Application**
```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:5173` and instantly communicate with the backend on `http://localhost:5000`.

---
<div align="center">
  <i>Built with ❤️ for modern, secure document management.</i>
</div>
