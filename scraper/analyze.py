"""
analyze.py — Analyses scraped Instagram data and produces output/analysis.json
with insights useful for building the FitWithAnge website.

Run after scrape.py:
    python analyze.py [--output-dir ./output]
"""

import argparse
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def log(message: str) -> None:
    """Print a prefixed log line."""
    print(f"[analyze] {message}", flush=True)


def load_json(path: Path) -> dict:
    """Load a JSON file; return empty dict on error."""
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except Exception as exc:
        log(f"WARNING: Could not read {path}: {exc}")
        return {}


def load_all_posts(posts_dir: Path) -> list[dict]:
    """Load every post JSON file from *posts_dir*."""
    posts = []
    if not posts_dir.exists():
        return posts
    for json_file in sorted(posts_dir.glob("*.json")):
        data = load_json(json_file)
        if data:
            posts.append(data)
    return posts


# ---------------------------------------------------------------------------
# Analysis functions
# ---------------------------------------------------------------------------

def top_hashtags(posts: list[dict], n: int = 20) -> list[dict]:
    """Return the *n* most-used hashtags with counts."""
    counter: Counter = Counter()
    for post in posts:
        for tag in post.get("hashtags", []):
            counter[tag.lower().lstrip("#")] += 1
    return [{"hashtag": f"#{tag}", "count": cnt} for tag, cnt in counter.most_common(n)]


def top_mentions(posts: list[dict], n: int = 10) -> list[dict]:
    """Return the *n* most-mentioned accounts."""
    counter: Counter = Counter()
    for post in posts:
        for mention in post.get("mentions", []):
            counter[mention.lower().lstrip("@")] += 1
    return [{"account": f"@{acct}", "count": cnt} for acct, cnt in counter.most_common(n)]


# Keywords mapped to fitness niches for caption analysis
NICHE_KEYWORDS: dict[str, list[str]] = {
    "strength": [
        "strength", "strong", "lift", "lifting", "weights", "barbell",
        "deadlift", "squat", "bench", "powerlifting", "gains",
    ],
    "weight_loss": [
        "weight loss", "fat loss", "cut", "cutting", "shred", "lean",
        "calorie", "deficit", "transform", "before and after",
    ],
    "mindset": [
        "mindset", "motivation", "discipline", "consistency", "believe",
        "mental", "focus", "mindful", "positive", "confidence",
    ],
    "nutrition": [
        "nutrition", "protein", "meal", "food", "diet", "macros",
        "eating", "calories", "healthy", "recipe",
    ],
    "cardio_fitness": [
        "cardio", "hiit", "run", "running", "treadmill", "endurance",
        "fitness", "workout", "training", "exercise",
    ],
    "personal_training": [
        "personal trainer", "pt", "coach", "coaching", "client",
        "online coaching", "programme", "results",
    ],
    "lifestyle": [
        "lifestyle", "balance", "self care", "wellness", "health",
        "journey", "progress", "habit",
    ],
}


def inferred_niche(posts: list[dict]) -> list[dict]:
    """
    Analyse caption text to infer the most prominent content niches.
    Returns a ranked list with keyword hit counts.
    """
    all_captions = " ".join(
        (post.get("caption") or "").lower() for post in posts
    )
    scores: dict[str, int] = {}
    for niche, keywords in NICHE_KEYWORDS.items():
        score = sum(all_captions.count(kw) for kw in keywords)
        if score > 0:
            scores[niche] = score

    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return [{"niche": niche, "keyword_hits": hits} for niche, hits in ranked]


def posting_cadence(posts: list[dict]) -> dict:
    """
    Calculate average posts per week and the most active day of the week.
    """
    if not posts:
        return {"avg_posts_per_week": 0, "most_active_day": None}

    dates: list[datetime] = []
    day_counter: Counter = Counter()

    for post in posts:
        raw = post.get("date_utc")
        if not raw:
            continue
        try:
            dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            dates.append(dt)
            day_counter[dt.strftime("%A")] += 1
        except ValueError:
            pass

    if not dates:
        return {"avg_posts_per_week": 0, "most_active_day": None}

    dates.sort()
    span_days = max((dates[-1] - dates[0]).days, 1)
    weeks = span_days / 7
    avg_per_week = round(len(dates) / weeks, 2)
    most_active = day_counter.most_common(1)[0][0] if day_counter else None

    return {
        "avg_posts_per_week": avg_per_week,
        "most_active_day": most_active,
        "day_breakdown": dict(day_counter.most_common()),
    }


# Patterns that suggest a testimonial / client-transformation post
TESTIMONIAL_PATTERNS = [
    r"\bclient\b",
    r"\bclient of the week\b",
    r"\bmy client\b",
    r"\btransform",
    r"\bprogress\b",
    r"\bbefore.{0,20}after\b",
    r"\bresults\b",
    r"\bsuccess stor",
    r"\btestimonial\b",
    r"\bshout.?out\b",
    r"\bproud of\b",
]

_TESTIMONIAL_RE = re.compile(
    "|".join(TESTIMONIAL_PATTERNS), re.IGNORECASE
)


def testimonial_candidates(posts: list[dict]) -> list[dict]:
    """
    Return posts whose captions suggest client transformations or testimonials.
    """
    candidates = []
    for post in posts:
        caption = post.get("caption") or ""
        if _TESTIMONIAL_RE.search(caption):
            candidates.append({
                "shortcode": post.get("shortcode"),
                "post_url": post.get("url"),
                "date_utc": post.get("date_utc"),
                "caption_preview": caption[:300].replace("\n", " "),
                "likes": post.get("likes", 0),
            })
    # Sort by likes descending
    candidates.sort(key=lambda x: x.get("likes", 0), reverse=True)
    return candidates


def extract_locations(posts: list[dict]) -> list[str]:
    """Return a sorted list of distinct location strings found across posts."""
    locs = set()
    for post in posts:
        loc = post.get("location")
        if loc and str(loc).strip():
            locs.add(str(loc).strip())
    return sorted(locs)


_URL_RE = re.compile(r"https?://[^\s\"'>]+")


def extract_external_links(profile: dict, posts: list[dict]) -> list[str]:
    """Extract URLs from the bio and post captions."""
    links: set[str] = set()

    # Bio link
    bio_url = profile.get("external_url")
    if bio_url:
        links.add(bio_url)

    # Caption links
    bio_text = profile.get("biography") or ""
    for url in _URL_RE.findall(bio_text):
        links.add(url)

    for post in posts:
        caption = post.get("caption") or ""
        for url in _URL_RE.findall(caption):
            links.add(url)

    return sorted(links)


def top_engaging_posts(posts: list[dict], n: int = 10) -> list[dict]:
    """Return the top *n* posts by likes."""
    sorted_posts = sorted(posts, key=lambda p: p.get("likes", 0), reverse=True)
    results = []
    for post in sorted_posts[:n]:
        results.append({
            "shortcode": post.get("shortcode"),
            "post_url": post.get("url"),
            "date_utc": post.get("date_utc"),
            "likes": post.get("likes", 0),
            "comments_count": post.get("comments_count", 0),
            "caption_preview": (post.get("caption") or "")[:200].replace("\n", " "),
            "thumbnail_url": post.get("thumbnail_url"),
            "typename": post.get("typename"),
            "is_video": post.get("is_video", False),
        })
    return results


def bio_summary(profile: dict) -> list[str]:
    """Return the biography split into individual non-empty lines."""
    bio = profile.get("biography") or ""
    return [line.strip() for line in bio.splitlines() if line.strip()]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(
        description="Analyse scraped Instagram output and produce analysis.json.",
    )
    parser.add_argument(
        "--output-dir", default="./output",
        help="Directory containing scrape.py output (default: ./output)",
    )
    return parser.parse_args()


def main() -> None:
    """Run all analyses and write output/analysis.json."""
    args = parse_args()
    output_dir = Path(args.output_dir)

    if not output_dir.exists():
        log(f"ERROR: Output directory '{output_dir}' does not exist. Run scrape.py first.")
        raise SystemExit(1)

    log(f"Reading data from {output_dir.resolve()} …")

    profile = load_json(output_dir / "profile.json")
    posts = load_all_posts(output_dir / "posts")

    log(f"Profile loaded: @{profile.get('username', '(unknown)')}")
    log(f"Posts loaded  : {len(posts)}")

    if not posts:
        log("WARNING: No posts found. Run scrape.py first to collect post data.")

    log("Computing top hashtags …")
    hashtags = top_hashtags(posts)

    log("Computing top mentions …")
    mentions = top_mentions(posts)

    log("Inferring niche from captions …")
    niche = inferred_niche(posts)

    log("Calculating posting cadence …")
    cadence = posting_cadence(posts)

    log("Finding testimonial candidates …")
    testimonials = testimonial_candidates(posts)

    log("Extracting locations …")
    locations = extract_locations(posts)

    log("Extracting external links …")
    ext_links = extract_external_links(profile, posts)

    log("Ranking top engaging posts …")
    top_posts = top_engaging_posts(posts)

    log("Summarising bio …")
    bio = bio_summary(profile)

    analysis: dict[str, Any] = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "posts_analysed": len(posts),
        "top_hashtags": hashtags,
        "top_mentions": mentions,
        "inferred_niche": niche,
        "posting_cadence": cadence,
        "testimonial_candidates": testimonials,
        "locations": locations,
        "external_links": ext_links,
        "top_engaging_posts": top_posts,
        "bio_summary": bio,
    }

    out_path = output_dir / "analysis.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(analysis, fh, indent=2, ensure_ascii=False, default=str)

    log(f"Analysis written → {out_path.resolve()}")
    print()
    print("=" * 60)
    print("  ANALYSIS COMPLETE")
    print("=" * 60)
    print(f"  Posts analysed          : {len(posts)}")
    print(f"  Top hashtag             : {hashtags[0]['hashtag'] if hashtags else 'n/a'}")
    print(f"  Inferred top niche      : {niche[0]['niche'] if niche else 'n/a'}")
    print(f"  Avg posts/week          : {cadence.get('avg_posts_per_week', 0)}")
    print(f"  Testimonial candidates  : {len(testimonials)}")
    print(f"  Top engaging post likes : {top_posts[0]['likes'] if top_posts else 0}")
    print("=" * 60)
    print()
    print("Next step:  python inject.py")
    print()


if __name__ == "__main__":
    main()
