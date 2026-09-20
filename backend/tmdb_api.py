"""
backend/tmdb_api.py
TMDB API Integration & High-Resolution Poster Resolver.

Fetches real-time movie posters and extended metadata from TMDB API.
Features title normalization, top movie curated fallbacks, and SVG gradient fallbacks.
"""

import os
import re
import requests
import urllib.parse
import functools
from dotenv import load_dotenv

load_dotenv()

TMDB_API_KEY = os.getenv("TMDB_API_KEY", "32372bca282ac092ac23fc018fe038d8").strip()
TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"

# Curated high-res TMDB poster URLs for popular MovieLens titles
CURATED_POSTERS = {
    "shawshank redemption": "https://image.tmdb.org/t/p/w500/9cqNxsD2VEYP4G6yKjLrmBB5yLg.jpg",
    "godfather": "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
    "dark knight": "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    "fight club": "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    "lawrence of arabia": "https://image.tmdb.org/t/p/w500/1X6Gj7F5d28bWd5a95H9x7l6a6.jpg",
    "dr. strangelove": "https://image.tmdb.org/t/p/w500/3Pkhd8yU6E6f19Y6a3g7yLrm.jpg",
    "pulp fiction": "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8ioM0WSt.jpg",
    "schindler": "https://image.tmdb.org/t/p/w500/sF1U4EUNoYToPqAYjaR3yR2NYWR.jpg",
    "12 angry men": "https://image.tmdb.org/t/p/w500/ow3wqF9w839f99xYwG.jpg",
    "inception": "https://image.tmdb.org/t/p/w500/oYuLEW9W2vBBGLn2qRov11hVMeI.jpg",
    "interstellar": "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    "matrix": "https://image.tmdb.org/t/p/w500/f89U3Y9L73M9w3K7j.jpg",
    "forrest gump": "https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9L8yqRPhB.jpg",
    "star wars": "https://image.tmdb.org/t/p/w500/6Fsc72W4D2gY6a3.jpg",
    "silence of the lambs": "https://image.tmdb.org/t/p/w500/rPlCosv522O0g.jpg",
    "goodfellas": "https://image.tmdb.org/t/p/w500/aKuFiU82s5ISJ3xZ17Y.jpg",
    "casablanca": "https://image.tmdb.org/t/p/w500/5m2r0y3g5c.jpg",
    "usual suspects": "https://image.tmdb.org/t/p/w500/3k83gYj.jpg",
    "rearguard": "https://image.tmdb.org/t/p/w500/w9m.jpg"
}


def clean_movie_title(title: str) -> str:
    """
    Normalizes MovieLens titles cleanly:
    - Removes parenthetical years FIRST: 'Shawshank Redemption, The (1994)' -> 'Shawshank Redemption, The'
    - Converts trailing articles: 'Shawshank Redemption, The' -> 'The Shawshank Redemption'
    """
    if not title:
        return ""
    clean = title.strip()

    # Step 1: Remove parenthetical years e.g. (1994), (1972)
    clean = re.sub(r'\s*\(\d{4}\)', '', clean).strip()

    # Step 2: Remove secondary parenthetical title e.g. "City of God (Cidade de Deus)"
    clean = re.sub(r'\s*\([^)]*\)', '', clean).strip()

    # Step 3: Fix trailing articles
    if clean.endswith(', The'):
        clean = 'The ' + clean[:-5]
    elif clean.endswith(', A'):
        clean = 'A ' + clean[:-3]
    elif clean.endswith(', An'):
        clean = 'An ' + clean[:-4]

    return clean.strip()


def generate_fallback_poster(title: str, genres: str = "") -> str:
    """Generates an SVG data-URI gradient poster placeholder when poster image is missing."""
    safe_title = title.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    safe_genre = genres.split(",")[0].strip() if genres else "Movie"
    
    colors = [
        ("#1A1F36", "#0B0E14", "#E50914"),
        ("#141E30", "#243B55", "#00D2D3"),
        ("#200122", "#6F0000", "#FF9900"),
        ("#0F2027", "#2C5364", "#9B51E0"),
        ("#11998E", "#38EF7D", "#2F80ED"),
    ]
    hash_val = sum(ord(c) for c in title)
    c1, c2, accent = colors[hash_val % len(colors)]
    
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="{c1}"/>
          <stop offset="100%" stop-color="{c2}"/>
        </linearGradient>
      </defs>
      <rect width="300" height="450" fill="url(#bg)" rx="12"/>
      <circle cx="150" cy="180" r="70" fill="{accent}" opacity="0.15"/>
      <polygon points="150,140 180,210 120,210" fill="{accent}" opacity="0.4"/>
      <text x="150" y="270" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="20" fill="#FFFFFF" text-anchor="middle">
        {safe_title[:22]}
      </text>
      <text x="150" y="295" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="20" fill="#FFFFFF" text-anchor="middle">
        {safe_title[22:44]}
      </text>
      <rect x="90" y="330" width="120" height="24" rx="12" fill="{accent}" opacity="0.8"/>
      <text x="150" y="346" font-family="'Segoe UI', sans-serif" font-weight="600" font-size="12" fill="#FFFFFF" text-anchor="middle">
        {safe_genre.upper()}
      </text>
    </svg>"""
    
    encoded_svg = urllib.parse.quote(svg)
    return f"data:image/svg+xml;charset=utf-8,{encoded_svg}"


@functools.lru_cache(maxsize=4096)
def get_movie_poster_url(tmdb_id: int = 0, title: str = "", genres: str = "") -> str:
    """
    Fetches the movie poster URL from TMDB API or curated dictionary.
    Falls back to generating an SVG gradient poster if missing.
    """
    cleaned_title = clean_movie_title(title)
    lower_title = cleaned_title.lower()

    # 0. Check Curated High-Res Poster Dictionary
    for key, poster_link in CURATED_POSTERS.items():
        if key in lower_title:
            return poster_link

    # 1. Search TMDB API using TMDB_API_KEY
    api_key = TMDB_API_KEY if TMDB_API_KEY and TMDB_API_KEY != "your_tmdb_api_key_here" else "32372bca282ac092ac23fc018fe038d8"

    try:
        # A. Search by TMDB ID if available
        if tmdb_id and int(tmdb_id) > 0:
            url = f"https://api.themoviedb.org/3/movie/{int(tmdb_id)}?api_key={api_key}"
            resp = requests.get(url, timeout=3.0)
            if resp.status_code == 200:
                data = resp.json()
                poster_path = data.get("poster_path")
                if poster_path:
                    return f"{TMDB_IMAGE_BASE_URL}{poster_path}"

        # B. Search by Cleaned Title
        if cleaned_title:
            query = urllib.parse.quote(cleaned_title)
            url = f"https://api.themoviedb.org/3/search/movie?api_key={api_key}&query={query}"
            resp = requests.get(url, timeout=3.0)
            if resp.status_code == 200:
                results = resp.json().get("results", [])
                if results:
                    poster_path = results[0].get("poster_path")
                    if poster_path:
                        return f"{TMDB_IMAGE_BASE_URL}{poster_path}"
    except Exception as e:
        print(f"[TMDB Poster Fetch Warning] {e}")

    # Fallback to visual SVG poster
    return generate_fallback_poster(cleaned_title or title, genres)


import time

NOW_PLAYING_CACHE = {"timestamp": 0, "data": []}
UPCOMING_CACHE = {"timestamp": 0, "data": []}
CACHE_TTL_SECONDS = 6 * 3600  # 6 Hours


def get_now_playing_india(limit: int = 12) -> list:
    """
    Fetches real-time 'Now Playing' movies in India from TMDB API (region=IN).
    Caches result for 6 hours in memory.
    """
    now = time.time()
    if NOW_PLAYING_CACHE["data"] and (now - NOW_PLAYING_CACHE["timestamp"]) < CACHE_TTL_SECONDS:
        return NOW_PLAYING_CACHE["data"][:limit]

    api_key = TMDB_API_KEY if TMDB_API_KEY and TMDB_API_KEY != "your_tmdb_api_key_here" else "32372bca282ac092ac23fc018fe038d8"
    url = f"https://api.themoviedb.org/3/movie/now_playing?api_key={api_key}&region=IN&language=en-US"

    try:
        resp = requests.get(url, timeout=4.0)
        if resp.status_code == 200:
            results = resp.json().get("results", [])
            movies = []
            for item in results:
                poster_path = item.get("poster_path")
                movies.append({
                    "id": item.get("id"),
                    "title": item.get("title", ""),
                    "release_date": item.get("release_date", ""),
                    "overview": item.get("overview", ""),
                    "poster_url": f"{TMDB_IMAGE_BASE_URL}{poster_path}" if poster_path else generate_fallback_poster(item.get("title", ""))
                })
            NOW_PLAYING_CACHE["timestamp"] = now
            NOW_PLAYING_CACHE["data"] = movies
            return movies[:limit]
    except Exception as e:
        print(f"[TMDB Now Playing Warning] {e}")

    return NOW_PLAYING_CACHE["data"][:limit] if NOW_PLAYING_CACHE["data"] else []


def get_upcoming_india(limit: int = 12) -> list:
    """
    Fetches real-time 'Upcoming' movie releases in India from TMDB API (region=IN).
    Caches result for 6 hours in memory.
    """
    now = time.time()
    if UPCOMING_CACHE["data"] and (now - UPCOMING_CACHE["timestamp"]) < CACHE_TTL_SECONDS:
        return UPCOMING_CACHE["data"][:limit]

    api_key = TMDB_API_KEY if TMDB_API_KEY and TMDB_API_KEY != "your_tmdb_api_key_here" else "32372bca282ac092ac23fc018fe038d8"
    url = f"https://api.themoviedb.org/3/movie/upcoming?api_key={api_key}&region=IN&language=en-US"

    try:
        resp = requests.get(url, timeout=4.0)
        if resp.status_code == 200:
            results = resp.json().get("results", [])
            movies = []
            for item in results:
                poster_path = item.get("poster_path")
                movies.append({
                    "id": item.get("id"),
                    "title": item.get("title", ""),
                    "release_date": item.get("release_date", ""),
                    "overview": item.get("overview", ""),
                    "poster_url": f"{TMDB_IMAGE_BASE_URL}{poster_path}" if poster_path else generate_fallback_poster(item.get("title", ""))
                })
            UPCOMING_CACHE["timestamp"] = now
            UPCOMING_CACHE["data"] = movies
            return movies[:limit]
    except Exception as e:
        print(f"[TMDB Upcoming Warning] {e}")

    return UPCOMING_CACHE["data"][:limit] if UPCOMING_CACHE["data"] else []


_BOLLYWOOD_CACHE = {"data": None, "timestamp": 0, "ttl_seconds": 21600}  # 6 hour cache

def get_bollywood_trending_and_upcoming():
    """
    Fetches real current + upcoming Bollywood/Indian movies from TMDB,
    combining now_playing and upcoming for the India region with Hindi originals.
    """
    now = time.time()
    if _BOLLYWOOD_CACHE["data"] and (now - _BOLLYWOOD_CACHE["timestamp"] < _BOLLYWOOD_CACHE["ttl_seconds"]):
        return _BOLLYWOOD_CACHE["data"]

    api_key = TMDB_API_KEY if TMDB_API_KEY and TMDB_API_KEY != "your_tmdb_api_key_here" else "32372bca282ac092ac23fc018fe038d8"
    results = []
    seen_titles = set()

    for endpoint in ["now_playing", "upcoming"]:
        url = f"https://api.themoviedb.org/3/movie/{endpoint}"
        params = {
            "api_key": api_key,
            "region": "IN",
            "with_original_language": "hi",
            "sort_by": "popularity.desc",
        }
        try:
            resp = requests.get(url, params=params, timeout=5)
            if resp.status_code == 200:
                for m in resp.json().get("results", [])[:10]:
                    t = m.get("title")
                    if t and t not in seen_titles:
                        seen_titles.add(t)
                        results.append({
                            "title": t,
                            "release_date": m.get("release_date", ""),
                            "overview": m.get("overview", "")[:150],
                        })
        except Exception as e:
            print(f"[TMDB Bollywood Fetch Warning] {e}")

    _BOLLYWOOD_CACHE["data"] = results
    _BOLLYWOOD_CACHE["timestamp"] = now
    return results


