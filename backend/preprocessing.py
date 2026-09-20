"""
backend/preprocessing.py
Data Ingestion, Cleaning, & Feature Engineering Pipeline.

This module automatically fetches the official MovieLens dataset (ml-latest-small),
extracts raw files, cleans metadata, generates rich movie feature corpora ('tags' column),
and prepares processed datasets for TF-IDF content filtering and SVD collaborative filtering.
"""

import os
import re
import zipfile
import urllib.request
import pandas as pd
import numpy as np

# Define directory paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DATA_DIR = os.path.join(BASE_DIR, "data", "raw")
PROCESSED_DATA_DIR = os.path.join(BASE_DIR, "data", "processed")

MOVIELENS_URL = "https://files.grouplens.org/datasets/movielens/ml-latest-small.zip"


def ensure_directories():
    """Ensure data directories exist."""
    os.makedirs(RAW_DATA_DIR, exist_ok=True)
    os.makedirs(PROCESSED_DATA_DIR, exist_ok=True)


def download_and_extract_movielens():
    """
    Downloads and extracts the MovieLens ml-latest-small dataset if not present locally.
    Contains ~100,000 ratings across ~9,700 movies.
    """
    ensure_directories()
    movies_path = os.path.join(RAW_DATA_DIR, "movies.csv")
    ratings_path = os.path.join(RAW_DATA_DIR, "ratings.csv")

    if os.path.exists(movies_path) and os.path.exists(ratings_path):
        print("[INFO] Raw MovieLens dataset already exists in data/raw/")
        return

    print(f"[INFO] Downloading MovieLens ml-latest-small dataset from {MOVIELENS_URL}...")
    zip_path = os.path.join(RAW_DATA_DIR, "ml-latest-small.zip")
    
    try:
        req = urllib.request.Request(
            MOVIELENS_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req) as response, open(zip_path, 'wb') as out_file:
            out_file.write(response.read())
        
        print("[INFO] Extracting dataset archive...")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            for member in zip_ref.namelist():
                filename = os.path.basename(member)
                if filename in ["movies.csv", "ratings.csv", "tags.csv", "links.csv"]:
                    source = zip_ref.open(member)
                    target_path = os.path.join(RAW_DATA_DIR, filename)
                    with open(target_path, "wb") as target:
                        target.write(source.read())
                    source.close()
        
        # Safely remove zip file after zip_ref context block closes
        if os.path.exists(zip_path):
            try:
                os.remove(zip_path)
            except Exception:
                pass
            
        print("[SUCCESS] Dataset downloaded and extracted successfully to data/raw/")
    except Exception as e:
        print(f"[ERROR] Failed to download dataset: {e}")
        raise e


def clean_title_and_year(title_str):
    """
    Extracts release year from title string e.g., 'Toy Story (1995)' -> ('Toy Story', 1995).
    """
    if not isinstance(title_str, str):
        return str(title_str), None
    
    match = re.search(r'^(.*?)\s*\((\d{4})\)\s*$', title_str.strip())
    if match:
        clean_title = match.group(1).strip()
        year = int(match.group(2))
        return clean_title, year
    return title_str.strip(), None


def preprocess_data():
    """
    Main preprocessing execution pipeline:
    1. Loads raw movies, ratings, tags, and links CSVs.
    2. Computes aggregate ratings statistics (mean rating, vote count).
    3. Cleans titles, genres, and synthesizes movie feature corpora ('tags').
    4. Saves processed datasets to data/processed/.
    """
    download_and_extract_movielens()
    
    movies_file = os.path.join(RAW_DATA_DIR, "movies.csv")
    ratings_file = os.path.join(RAW_DATA_DIR, "ratings.csv")
    tags_file = os.path.join(RAW_DATA_DIR, "tags.csv")
    links_file = os.path.join(RAW_DATA_DIR, "links.csv")

    print("[INFO] Reading raw CSV data files...")
    movies_df = pd.read_csv(movies_file)
    ratings_df = pd.read_csv(ratings_file)
    tags_df = pd.read_csv(tags_file) if os.path.exists(tags_file) else pd.DataFrame()
    links_df = pd.read_csv(links_file) if os.path.exists(links_file) else pd.DataFrame()

    print(f"[INFO] Initial movies count: {len(movies_df)}, ratings count: {len(ratings_df)}")

    # 1. Clean Title and Release Year
    cleaned_titles = []
    years = []
    for title in movies_df['title']:
        c_title, year = clean_title_and_year(title)
        cleaned_titles.append(c_title)
        years.append(year)

    movies_df['clean_title'] = cleaned_titles
    movies_df['year'] = years
    movies_df['year_display'] = movies_df['year'].apply(lambda y: f"({int(y)})" if pd.notnull(y) else "")

    # 2. Process Genres
    # Replace '(no genres listed)' with empty string
    movies_df['genres_list'] = movies_df['genres'].apply(
        lambda g: [] if g == '(no genres listed)' or pd.isna(g) else g.split('|')
    )
    movies_df['genres_clean'] = movies_df['genres_list'].apply(lambda gl: " ".join([g.lower().replace("-", "") for g in gl]))

    # 3. Aggregate User Tags per Movie
    if not tags_df.empty:
        user_tags = tags_df.groupby('movieId')['tag'].apply(
            lambda t_series: " ".join([str(t).lower() for t in t_series.dropna()])
        ).reset_index()
        user_tags.rename(columns={'tag': 'user_tags'}, inplace=True)
        movies_df = pd.merge(movies_df, user_tags, on='movieId', how='left')
        movies_df['user_tags'] = movies_df['user_tags'].fillna('')
    else:
        movies_df['user_tags'] = ''

    # 4. Merge TMDB/IMDB IDs if links present
    if not links_df.empty:
        movies_df = pd.merge(movies_df, links_df[['movieId', 'tmdbId', 'imdbId']], on='movieId', how='left')
        movies_df['tmdbId'] = movies_df['tmdbId'].fillna(0).astype(int)

    # 5. Compute Rating Statistics per Movie
    rating_stats = ratings_df.groupby('movieId').agg(
        avg_rating=('rating', 'mean'),
        vote_count=('rating', 'count')
    ).reset_index()
    
    movies_df = pd.merge(movies_df, rating_stats, on='movieId', how='left')
    movies_df['avg_rating'] = movies_df['avg_rating'].fillna(0.0).round(2)
    movies_df['vote_count'] = movies_df['vote_count'].fillna(0).astype(int)

    # 6. Build Rich Feature Corpus ("tags") for TF-IDF Vectorizer
    # Combines cleaned title, genres, user tags, and synthetic overview keywords
    corpus_list = []
    for idx, row in movies_df.iterrows():
        title_words = row['clean_title'].lower()
        genres_str = row['genres_clean']
        user_tag_str = row['user_tags']
        year_str = str(int(row['year'])) if pd.notnull(row['year']) else ""
        
        # Combine into unified feature document
        doc = f"{title_words} {genres_str} {user_tag_str} {year_str}".strip()
        corpus_list.append(doc)

    movies_df['corpus'] = corpus_list

    # Ensure processed directory exists
    os.makedirs(PROCESSED_DATA_DIR, exist_ok=True)

    # Save processed files
    processed_movies_path = os.path.join(PROCESSED_DATA_DIR, "movies_processed.csv")
    processed_ratings_path = os.path.join(PROCESSED_DATA_DIR, "ratings_processed.csv")

    movies_df.to_csv(processed_movies_path, index=False)
    ratings_df.to_csv(processed_ratings_path, index=False)

    print(f"[SUCCESS] Saved processed movies to {processed_movies_path}")
    print(f"[SUCCESS] Saved processed ratings to {processed_ratings_path}")
    
    return movies_df, ratings_df


if __name__ == "__main__":
    preprocess_data()
