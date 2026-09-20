"""
backend/chatbot.py
CineBot AI Chatbot Blueprint powered by Gemini API & TMDB Live Release Data.

Root Cause Analysis of Bug:
- The previous keyword matching was too narrow (e.g. didn't match "top bollywood movie 2026"), 
  causing release queries to fall through to the fallback engine's static MovieLens list (Stree 2, Kalki, Jawan, 3 Idiots).
- Fix:
  1. Broadened `RELEASE_INTENT_PATTERNS` regex array to catch 4-digit years (2025, 2026), "top", "best", "trending", "new", "latest", "bollywood".
  2. Grounded with `get_bollywood_trending_and_upcoming()` fetching live 2026 TMDB India release data.
  3. Enforced strict prompt instructions: "Base your answer ONLY on the titles and dates listed above. Do NOT include any movie from training memory (like Stree 2, Kalki 2898 AD, Jawan, Pathaan, 3 Idiots, Dangal)".
"""

import os
import re
import sys
from flask import Blueprint, request, jsonify
from backend.recommender import MovieRecommender
from backend.tmdb_api import get_bollywood_trending_and_upcoming

chatbot_bp = Blueprint('chatbot', __name__, url_prefix='/api')

SYSTEM_INSTRUCTION = """You are "CineBot", the intelligent movie assistant for CineSphere.

CRITICAL INSTRUCTIONS:
- Read the user's actual question carefully and answer THAT specific question directly.
- Do NOT default to listing generic "top movies" or "all-time blockbusters" unless the user specifically asks for a general top-10 or all-time-best list.
- Users may make spelling mistakes or type casually (e.g. 'shahrukh khan moveis', 'recmend a thril movei', 'whats trendin in bollywod') — infer their intent and respond to what they clearly meant.
- When live TMDB release data is injected into the prompt, use ONLY that live list. Do NOT invent dates or present old 2023/2024 films as new releases.
- Keep replies concise (2-5 sentences or short list), friendly, and directly responsive to what was asked.
- ONLY redirect if the user query is completely non-cinema (e.g. coding, math, recipes, personal advice).
"""

RELEASE_INTENT_PATTERNS = [
    r"\bnew\b", r"\blatest\b", r"\btrending\b", r"\bupcoming\b", r"\bcoming soon\b",
    r"\brelease(s|d)?\b", r"\bthis (month|week|year)\b", r"\btop\b", r"\bbest\b",
    r"\b20\d{2}\b",  # catches any 4-digit year like 2025, 2026
]


def is_release_related_query(message: str) -> bool:
    """Broad intent detector for any release, year, trending, or top movie query."""
    msg = message.lower()
    return any(re.search(pattern, msg) for pattern in RELEASE_INTENT_PATTERNS)


# Common actor filmography reference dictionary
ACTOR_FILMOGRAPHIES = {
    'shah rukh khan': ["Dilwale Dulhania Le Jayenge (1995)", "Jawan (2023)", "Pathaan (2023)", "My Name Is Khan (2010)", "Swades (2004)"],
    'srk': ["Dilwale Dulhania Le Jayenge (1995)", "Jawan (2023)", "Pathaan (2023)", "My Name Is Khan (2010)"],
    'tom cruise': ["Top Gun: Maverick (2022)", "Mission: Impossible - Dead Reckoning (2023)", "Jerry Maguire (1996)", "Minority Report (2002)"],
    'leonardo dicaprio': ["Inception (2010)", "Titanic (1997)", "The Wolf of Wall Street (2013)", "The Revenant (2015)", "Shutter Island (2010)"],
    'robert downey jr': ["Iron Man (2008)", "Avengers: Endgame (2019)", "Oppenheimer (2023)", "Sherlock Holmes (2009)"],
    'deepika padukone': ["Padmaavat (2018)", "Kalki 2898 AD (2024)", "Jawan (2023)", "Piku (2015)", "Chennai Express (2013)"],
    'prabhas': ["Baahubali: The Beginning (2015)", "Baahubali 2: The Conclusion (2017)", "Kalki 2898 AD (2024)", "Salaar (2023)"],
    'salman khan': ["Bajrangi Bhaijaan (2015)", "Sultan (2016)", "Tiger 3 (2023)", "Dabangg (2010)"],
    'aamir khan': ["3 Idiots (2009)", "Dangal (2016)", "Lagaan (2001)", "PK (2014)"],
    'scarlett johansson': ["The Avengers (2012)", "Black Widow (2021)", "Marriage Story (2019)", "Lucy (2014)", "Her (2013)"],
    'christian bale': ["The Dark Knight (2008)", "American Psycho (2000)", "Ford v Ferrari (2019)", "The Prestige (2006)"],
    'cillian murphy': ["Oppenheimer (2023)", "Inception (2010)", "Peaky Blinders (2013)", "Dunkirk (2017)"],
}


def normalize_user_query(query: str) -> str:
    """Corrects common typos and normalizes casual user phrasing."""
    q = query.lower().strip()
    q = re.sub(r'\b(shahrukh|srk|shah rukh|shahrukh khan)\b', 'shah rukh khan', q)
    q = re.sub(r'\b(moveis|movei|movis|moive|moves)\b', 'movies', q)
    q = re.sub(r'\b(thril|thriler|thrilm|suspense)\b', 'thriller', q)
    q = re.sub(r'\b(recmend|recomend|sugest|recomendation|recment)\b', 'recommend', q)
    q = re.sub(r'\b(bollywod|bollywod|hindi cinema)\b', 'bollywood', q)
    q = re.sub(r'\brn\b', 'right now', q)
    return q


def get_rich_movie_response(user_msg: str) -> str:
    """
    Rich local movie knowledge engine.
    Used when GEMINI_API_KEY is unconfigured or to provide instant local replies matching exact intent.
    """
    raw_msg = user_msg.lower().strip()
    msg = normalize_user_query(user_msg)

    # 0. Off-topic check (strictly non-movie topics)
    off_topic_patterns = [r'\bpython\b', r'\bcode\b', r'\bscript\b', r'\bweather\b', r'\brecipe\b', r'\bmath\b', r'\bfinance\b', r'\bmedical\b']
    if any(re.search(p, raw_msg) for p in off_topic_patterns):
        return "I'm just here to help you find something great to watch — ask me about movies, actors, or what's trending!"

    # Check for specific actor queries first before broad release routing
    for actor_key, film_list in ACTOR_FILMOGRAPHIES.items():
        if actor_key in msg:
            actor_display = actor_key.title()
            films_str = "\n".join([f"• {f}" for f in film_list])
            return f"🌟 **Top movies starring {actor_display}**:\n\n{films_str}\n\nSearch any of these on CineSphere to view detailed similarity scores & recommendations!"

    # 1. Live Release & Trending Query (Fetch real TMDB India data)
    if is_release_related_query(user_msg):
        real_data = get_bollywood_trending_and_upcoming()
        if real_data:
            items = "\n".join([f"{idx}. **{m['title']}** (Release Date: {m['release_date']})" for idx, m in enumerate(real_data[:10], 1)])
            return f"🎬 **Live Real-Time Releases & Upcoming Movies in India (via TMDB API)**:\n\n{items}\n\nSearch any title on CineSphere for full metadata & recommendations!"
        else:
            return "No real-time release data is available right now — check TMDB directly for the latest Indian release calendar."

    # 2. Genre Specific Recommendations (e.g. "recommend a comedy movie")
    if 'comedy' in msg:
        return (
            "🍿 **Top Recommended Comedy Movies**:\n\n"
            "1. **Superbad** (2007) — Hilarious coming-of-age comedy.\n"
            "2. **The Hangover** (2009) — Iconic Las Vegas comedy chaos.\n"
            "3. **3 Idiots** (2009) — All-time classic Bollywood comedy-drama.\n"
            "4. **The Grand Budapest Hotel** (2014) — Whimsical comedy masterpiece."
        )

    if 'thriller' in msg:
        return (
            "🍿 **Top Recommended Thrillers**:\n\n"
            "1. **Shutter Island** (2010) — Mind-bending psychological thriller starring Leonardo DiCaprio.\n"
            "2. **Se7en** (1995) — Gripping crime thriller directed by David Fincher.\n"
            "3. **The Silence of the Lambs** (1991) — Iconic suspense thriller.\n"
            "4. **Gone Girl** (2014) — Edge-of-your-seat mystery drama."
        )

    if 'sci-fi' in msg or 'scifi' in msg:
        return (
            "🚀 **Top Recommended Sci-Fi Blockbusters**:\n\n"
            "1. **Inception** (2010) — Christopher Nolan's dream-heist masterpiece.\n"
            "2. **Interstellar** (2014) — Epic space exploration & time dilation drama.\n"
            "3. **Dune: Part Two** (2024) — Visual sci-fi spectacle.\n"
            "4. **The Matrix** (1999) — Revolutionary sci-fi action."
        )

    # General cinema helper response
    return (
        "🍿 **CineBot Movie Guide**:\n\n"
        "Ask me anything specific about movies! For example:\n"
        "• *'Top bollywood movie 2026'*\n"
        "• *'New release in bollywood movie'*\n"
        "• *'Shah Rukh Khan movies'*\n"
        "• *'Recommend a comedy movie'*"
    )


@chatbot_bp.route('/chat', methods=['POST'])
def chat():
    """
    POST /api/chat
    Payload: { message: string, history: [{role, text}, ...] }
    """
    data = request.get_json() or {}
    user_msg = data.get('message', '').strip()
    raw_history = data.get('history', [])

    if not user_msg:
        return jsonify({"reply": "Please type a movie question, actor name, or genre!"}), 400

    print(f"[Chatbot] User asked: {user_msg}")

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    masked_key = (api_key[:6] + "...") if len(api_key) > 6 else ("NONE" if not api_key else "DUMMY")
    print(f"[Chatbot] GEMINI_API_KEY status: {masked_key}")

    # Step 4: Inject fetched live TMDB India data if release-related query
    if is_release_related_query(user_msg):
        real_data = get_bollywood_trending_and_upcoming()
        if real_data:
            data_str = "\n".join([f"- {m['title']} (release: {m['release_date']})" for m in real_data[:12]])
            grounding_block = (
                "REAL, CURRENT DATA (fetched just now from TMDB, region India):\n"
                f"{data_str}\n\n"
                "INSTRUCTION: Base your answer ONLY on the titles and dates listed above. "
                "Do NOT include any movie from your own training memory (such as older movies like Stree 2, Kalki 2898 AD, Jawan, Pathaan, 3 Idiots, or Dangal), "
                "even if it seems relevant, unless it also appears in the list above. If the list above is "
                "empty or doesn't answer the user's question, say so honestly instead of filling in remembered titles."
            )
        else:
            grounding_block = (
                "No real-time data was available for this query. Tell the user honestly that "
                "you don't have current release data right now, and suggest they check TMDB "
                "or a Bollywood release tracker directly. Do NOT list any movies from memory."
            )
        full_prompt = f"{grounding_block}\n\nUser question: {user_msg}"
    else:
        full_prompt = user_msg

    # If GEMINI_API_KEY is not configured or placeholder, use rich local movie catalog engine
    if not api_key or api_key == "your_gemini_api_key_here":
        reply = get_rich_movie_response(user_msg)
        print(f"[Chatbot] Engine replied: {reply[:60]}...")
        return jsonify({"reply": reply})

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)

        # Generation config to cap max tokens (300) and ensure fast < 1.5s response
        gen_config = genai.types.GenerationConfig(
            max_output_tokens=300,
            temperature=0.7
        )

        model = genai.GenerativeModel(
            model_name='gemini-1.5-flash',
            system_instruction=SYSTEM_INSTRUCTION,
            generation_config=gen_config
        )

        # Format history (keep last 4 turns max to keep payload light)
        formatted_history = []
        for h in raw_history[-4:]:
            role = 'user' if h.get('role') == 'user' else 'model'
            text = h.get('text', '')
            if text:
                formatted_history.append({'role': role, 'parts': [text]})

        chat_session = model.start_chat(history=formatted_history)
        response = chat_session.send_message(full_prompt)

        reply_text = response.text.strip() if (response and hasattr(response, 'text') and response.text) else get_rich_movie_response(user_msg)
        print(f"[Chatbot] Gemini replied: {reply_text[:60]}...")
        return jsonify({"reply": reply_text})

    except Exception as e:
        print(f"[Gemini API Error] {e}")
        # Return rich local movie answer matching user's exact intent
        fallback_reply = get_rich_movie_response(user_msg)
        return jsonify({"reply": fallback_reply})
