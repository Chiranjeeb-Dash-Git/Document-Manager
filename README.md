<div align="center">
  <img src="https://raw.githubusercontent.com/Chiranjeeb-Dash-Git/Document-Manager/main/frontend/public/favicon.svg" alt="Document Manager Logo" width="120" />

  # 📑 Document Manager & Tools Hub

  <p><strong>The ultimate all-in-one suite for document management, electronic signing, and image processing.</strong></p>

  [![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)](https://expressjs.com/)
  
</div>

<br />

## ✨ Key Features

🚀 **Comprehensive Dashboard**  
Manage your documents with an intuitive, glassmorphism-inspired UI. Features real-time statistics, recent activity, and easy access to all your tools.

✍️ **E-Signature Studio**  
Sign PDFs natively in your browser! Supports drawing signatures, typing with beautiful cursive fonts (Caveat, Pacifico, etc.), or uploading your own signature image. Supports saving completed PDFs directly to your device.

🔏 **Public Document Signing**  
Share secure links for clients to sign documents. Features a split-pane viewer so clients can review the document on the left and input their details on the right. Scales smoothly even with thousands of signers!

🛡️ **Safe Folder (Biometric/PIN Protected)**  
Store your most sensitive files in an encrypted, hidden vault. Requires PIN re-authentication to access. Upload securely with one click.

📸 **Passport Photo Generator (AI-Powered)**  
Instantly create print-ready passport photos. 
* Uses **@imgly/background-removal (Neural Net)** to automatically strip complex backgrounds directly in your browser.
* Instantly preview different background colors (White, Sky Blue, Red, etc.).
* Supports sizes for **12+ Countries** (India, USA, Schengen, UK, etc.).
* Download single photos or a **4×6 inch Print Sheet** with cut-guides.

🖼️ **Universal Image Converter**  
Convert between any image format (JPG, PNG, WEBP, HEIC/HEIF) completely offline with a slick, drag-and-drop interface.

---

## 🏗️ Architecture

The project is structured as a full-stack monorepo:

* `/frontend` - React + Vite + Tailwind CSS (The UI)
* `/backend` - Node.js + Express (The API server)

---

## 🚀 Deployment Guide (Vercel)

Your project is completely ready to be deployed to Vercel! Follow these simple steps:

### 1. Deploy the Frontend (Vercel)
Since this is a full-stack app inside a single GitHub repo, you just need to tell Vercel where the frontend lives.

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New → Project**.
2. Import this repository (`Chiranjeeb-Dash-Git/Document-Manager`).
3. ⚠️ **CRITICAL STEP**: In the "Configure Project" screen, look for **Root Directory** and click `Edit`. Select the `frontend` folder.
4. Framework Preset should automatically detect **Vite**.
5. Click **Deploy**.

*Vercel will now automatically build and host your frontend beautifully!*

### 2. Deploy the Backend (Render or Railway)
Vercel is great for the frontend, but your backend uses Node.js/Express with local file uploads (`/uploads` folder), which requires a persistent server rather than Vercel's serverless functions.

1. Go to [Render.com](https://render.com/) or [Railway.app](https://railway.app/).
2. Create a new **Web Service**.
3. Connect this GitHub repo.
4. **Root Directory**: `backend`
5. **Build Command**: `npm install && npm run build`
6. **Start Command**: `npm start`
7. Set your environment variables (like your frontend URL to allow CORS).
8. Once deployed, update the `frontend/.env` (or Vercel environment variables) to point `VITE_API_URL` to your new live backend URL!

---

## 💻 Local Development

To run this project locally on your machine:

**1. Start the Backend**
```bash
cd backend
npm install
npm run dev
```

**2. Start the Frontend**
```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:5173` and communicate with the backend on `http://localhost:5000`.

---
*Built with ❤️ for modern document management.*
