# CineSphere - Vercel & Render Deployment Guide

This guide walks you through deploying **CineSphere** with the **Frontend on Vercel** and the **Backend REST API on Render**.

---

## Architecture Summary

- **Frontend Repository Folder**: `client/`
  - Tech Stack: React 18, Vite, React Router DOM, Bootstrap
  - Hosting: **Vercel** (Static SPA with rewrites in `client/vercel.json`)
- **Backend Repository Folder**: `backend/`
  - Tech Stack: Python 3.11, Flask, Gunicorn, Pandas, Scikit-Learn, SVD, TF-IDF
  - Hosting: **Render** (Web Service running `gunicorn backend.app:app`)
  - Auto ML Training: `train.py` runs during build step (`pip install -r requirements.txt && python train.py`)

---

## Step 1: Deploy Backend REST API to Render

1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Web Service**.
2. Connect your GitHub account and select your repository: **`Ritesh045/Movie-Recommendation`**.
3. Configure the Web Service settings:
   - **Name**: `cinesphere-backend` (or any custom name)
   - **Region**: Choose the closest region to you (e.g., Singapore / Oregon / Frankfurt)
   - **Branch**: `main`
   - **Root Directory**: `.` (leave blank or enter `.`)
   - **Runtime**: `Python 3`
   - **Build Command**:
     ```bash
     pip install -r requirements.txt && python train.py
     ```
   - **Start Command**:
     ```bash
     gunicorn backend.app:app
     ```
4. Scroll to **Environment Variables** and add the following keys:
   - `TMDB_API_KEY`: Your TMDB API key (Obtain free at [themoviedb.org](https://www.themoviedb.org/settings/api))
   - `GEMINI_API_KEY`: Your Gemini AI API key (Obtain free at [aistudio.google.com](https://aistudio.google.com/))
   - `JWT_SECRET_KEY`: A random secret key string (e.g., `cinesphere-prod-jwt-secret-2026`)
   - `PYTHON_VERSION`: `3.11.8`
5. Click **Create Web Service**.
6. Render will build the app, execute `train.py` (takes ~5 seconds), and start Gunicorn.
7. Once deployed, copy your Render Service URL (e.g., `https://cinesphere-backend.onrender.com`).
8. Test the health endpoint in your browser: `https://<your-render-url>/api/health`.

---

## Step 2: Deploy Frontend to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New...** -> **Project**.
2. Import your GitHub repository: **`Ritesh045/Movie-Recommendation`**.
3. In the **Configure Project** screen:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click **Edit** and select the `client` folder.
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)
4. Expand **Environment Variables** and add:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://<your-render-url>/api` *(Replace `<your-render-url>` with your actual Render backend URL from Step 1)*
5. Click **Deploy**.
6. Vercel will build and launch your application!

---

## Step 3: Verification & Health Checklist

- [x] **Frontend Loads**: Navigate to your Vercel URL (e.g. `https://cinesphere.vercel.app`).
- [x] **CORS & API Connection**: Open Browser Console (F12) and ensure homepage trending movies load without CORS errors.
- [x] **SPA Routing**: Direct URL navigation (e.g., `/trending` or `/movie/1`) reloads smoothly without 404 errors (handled by `client/vercel.json`).
- [x] **CineBot AI**: Open CineBot modal and test sending a prompt to confirm Gemini API is responding.
- [x] **User Auth & Recommendations**: Register/Login a user, rate a movie, and test the personalized recommendations tab.

---

## Local Development Quickstart

```bash
# Terminal 1 - Start Flask REST API Backend (Port 5000)
python train.py      # Run once to train ML models locally
python backend/app.py

# Terminal 2 - Start React + Vite Client (Port 3000)
cd client
npm install
npm run dev
```
