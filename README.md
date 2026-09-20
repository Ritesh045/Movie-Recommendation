# 🎬 CineSphere — Netflix-Style Hybrid Movie Recommendation System

**CineSphere** is a full-stack **Netflix-style** movie streaming & recommendation web application. It combines a **React 18 (Vite) + Bootstrap** frontend with a **Flask REST API** backend, powered by a **Hybrid Machine Learning Recommendation Engine** (Content-Based TF-IDF Cosine Similarity + Collaborative SVD Latent Factor Matrix Factorization).

---

## 📌 Features

- **Netflix-Style Dark UI**: Built with `#141414` dark styling, glowing `#e50914` accents, auto-swiping hero banner carousel, horizontal poster carousels with Top 10 rank overlays (`#1`–`#10`), and original Netflix footer.
- **JWT Authentication & 3D Glassmorphism Login**: Secure SQLite `users.db` storage, salted password hashing, regex email validation, minimum 6-character password rules, JWT token issuance, protected routes, and interactive 3D perspective tilt/flip card UI (`/login`).
- **CineBot AI Chatbot (Gemini API)**: Floating glassmorphism chat widget (`ChatWidget.jsx`) powered server-side by Google Gemini API (`POST /api/chat`). Features strict system-instruction scope locking to movie topics & site assistance, catalog grounding using live dataset titles, `Flask-Limiter` rate limiting (~10 req/min), typing animation, and quick-reply chips. Client-side security guarantees `GEMINI_API_KEY` is never exposed in browser network requests.
- **RESTful API Architecture**: Decoupled Flask backend serving clean JSON payloads with server-side poster resolution and caching.
- **Hybrid Recommendation Engine**: Combines content metadata features (genres, keywords, titles) with user rating behavior patterns (MovieLens 100k dataset).
- **Dynamic Algorithm Toggling**: Switch between **Hybrid Engine (60/40)**, **Content-Based Only**, and **Collaborative Only** in real time, with interactive $\alpha$ weight blending controls.
- **Explainable AI (XAI)**: Displays an explicit *"Why Recommended?"* breakdown card detailing shared genres, plot theme overlaps, and component scores.
- **Search & Autocomplete**: Real-time debounced title and genre search with instant results.

---

## 📐 System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        REACT FRONTEND (Vite / Client)                  │
│   Home Page • Search Grid • Movie Detail • Poster Carousels • Controls  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST API (Port 5000)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       FLASK BACKEND REST API (app.py)                  │
│     CORS Middleware • Request Handlers • TMDB Poster Resolver          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      HYBRID RECOMMENDER ENGINE                         │
│  ┌───────────────────────────────┐   ┌──────────────────────────────┐  │
│  │ Content-Based Filtering       │   │ Collaborative Filtering      │  │
│  │ TF-IDF Vectorizer + Cosine    │   │ SVD Latent Matrix            │  │
│  └───────────────────────────────┘   └──────────────────────────────┘  │
│                   Score = α · S_content + (1 - α) · S_collab           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🔌 REST API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check & model status |
| `GET` | `/api/movies/trending?limit=12` | Top rated & trending movies |
| `GET` | `/api/movies/search?q=query` | Title & metadata autocompletion search |
| `GET` | `/api/movies/<id>` | Single movie details payload |
| `GET` | `/api/movies/genre/<genre_name>` | Movies filtered by genre category |
| `GET` | `/api/recommendations/<id>?mode=hybrid&content_weight=0.6` | Ranked hybrid recommendations |

---

## 📁 Project Structure

```
movie/
├── README.md                             # Documentation & setup guide
├── requirements.txt                      # Flask, flask-cors, scikit-learn, pandas
├── .env.example                          # TMDB API Key configuration sample
├── .gitignore                            # Git ignore rules
├── train.py                              # ML pipeline execution script
│
├── backend/
│   ├── app.py                            # Flask REST API entrypoint
│   ├── recommender.py                    # Hybrid recommendation engine
│   ├── preprocessing.py                  # Dataset downloader & feature builder
│   ├── tmdb_api.py                       # Poster resolver & gradient fallback generator
│   └── utils.py                          # Serialization & formatting helpers
│
├── client/                               # React 18 (Vite) Frontend
│   ├── package.json                      # Dependencies (React, Bootstrap, Axios, Lucide)
│   ├── vite.config.js                    # Vite configuration
│   ├── index.html                        # Base HTML
│   └── src/
│       ├── main.jsx                      # React DOM entrypoint
│       ├── App.jsx                       # React Router & main layout
│       ├── api.js                        # Centralized Axios API client
│       ├── pages/
│       │   ├── Home.jsx                  # Hero banner & poster carousels
│       │   ├── MovieDetail.jsx           # Movie details & hybrid recs
│       │   └── Search.jsx                # Search page grid
│       ├── components/
│       │   ├── Navbar.jsx                # Sticky dark navbar with search input
│       │   ├── HeroBanner.jsx            # Featured backdrop hero banner
│       │   ├── MovieRow.jsx              # Horizontal poster carousel row
│       │   ├── MovieCard.jsx             # Poster card with hover-scale zoom
│       │   ├── RecommendationModeToggle.jsx # Hybrid mode toggle buttons
│       │   ├── LoadingSpinner.jsx        # Netflix red spinning loader
│       │   └── Footer.jsx                # Capstone footer
│       └── styles/
│           ├── theme.css                 # Dark theme variables (#141414)
│           └── components.css            # Component animations & overlay styles
│
├── data/
│   ├── raw/                              # Original MovieLens CSVs
│   └── processed/                        # Processed data
│
└── models/                               # Precomputed pickled binaries (*.pkl)
```

---

## 🚀 Setup & Execution Guide

### 1. Backend Setup & Run

1. Open terminal and navigate to project root `Movie/`:
   ```bash
   pip install -r requirements.txt
   ```
2. Run ML model training (downloads dataset & precomputes models):
   ```bash
   python train.py
   ```
3. Launch Flask REST API server (Port 5000):
   ```bash
   python backend/app.py
   ```

### 2. Frontend Setup & Run (Separate Terminal)

1. Open a new terminal tab/window and navigate to `client/`:
   ```bash
   cd client
   npm install
   ```
2. Launch React development server (Port 3000):
   ```bash
   npm start
   # or: npm run dev
   ```
3. Open your browser at: **`http://localhost:3000`**

---

## 📜 Credits & Citation
- **MovieLens (ml-latest-small)**: F. Maxwell Harper and Joseph A. Konstan. 2015. The MovieLens Datasets: ACM Transactions on Interactive Intelligent Systems.
- **TMDB API**: Metadata and posters provided by [The Movie Database](https://www.themoviedb.org/).
