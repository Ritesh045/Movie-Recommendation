"""
backend/utils.py
Helper Utilities & Serialization Functions.

Provides model caching/pickling functions, star rating rendering, string normalization,
and metric conversion utilities.
"""

import os
import pickle
import numpy as np


def save_pickle(obj, filepath: str):
    """Saves a Python object to disk using pickle."""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'wb') as f:
        pickle.dump(obj, f, protocol=pickle.HIGHEST_PROTOCOL)
    print(f"[SUCCESS] Saved model binary to {filepath}")


def load_pickle(filepath: str):
    """Loads a pickled Python object from disk."""
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Model file not found at {filepath}")
    with open(filepath, 'rb') as f:
        return pickle.load(f)


def format_star_rating(rating: float) -> str:
    """
    Converts a numeric rating (0.0 to 5.0) into a star representation.
    Example: 4.3 -> "★★★★☆ 4.3"
    """
    if rating is None or np.isnan(rating) or rating == 0:
        return "☆☆☆☆☆ N/A"
    
    full_stars = int(round(rating))
    full_stars = max(0, min(5, full_stars))
    empty_stars = 5 - full_stars
    
    star_str = "★" * full_stars + "☆" * empty_stars
    return f"{star_str} {rating:.1f}"


def format_similarity_badge(score: float) -> str:
    """Formats similarity decimal score (0.0 - 1.0) as a percentage string badge."""
    pct = max(0.0, min(100.0, score * 100.0))
    return f"{pct:.1f}% Match"


def get_genre_color(genre: str) -> str:
    """Returns a curated dark-mode compatible badge color per genre."""
    genre_colors = {
        "action": "#E50914",
        "adventure": "#FF9900",
        "animation": "#9B51E0",
        "children": "#2F80ED",
        "comedy": "#F2C94C",
        "crime": "#EB5757",
        "documentary": "#27AE60",
        "drama": "#BB6BD9",
        "fantasy": "#6FCF97",
        "film-noir": "#4F4F4F",
        "horror": "#828282",
        "musical": "#F2994A",
        "mystery": "#56CCF2",
        "romance": "#FF6B81",
        "sci-fi": "#00D2D3",
        "thriller": "#EE5253",
        "war": "#8395A7",
        "western": "#C8D6E5"
    }
    g_key = genre.strip().lower().replace(" ", "")
    return genre_colors.get(g_key, "#6C757D")
