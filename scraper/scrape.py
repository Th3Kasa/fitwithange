"""
scrape.py — Instagram profile scraper for FitWithAnge.
Uses httpx with HTTP/2 (2026-compliant) for no-login public profile scraping.

LEGAL NOTICE: Intended for the account owner to export their own public content.

WHAT THIS FETCHES WITHOUT LOGIN:
  - Profile bio, name, external URL, follower count, post count
  - Last 12 posts (images, captions, likes, dates) — Instagram's no-login cap
  - Profile picture (full size)

WHAT REQUIRES LOGIN (not supported in this version):
  - Stories, highlights, tagged posts, post history beyond 12 posts

USAGE:
  python scrape.py
  python scrape.py --username fitwith_ange --output-dir ./output
"""

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Optional

try:
    import httpx
except ImportError:
    print("[error] httpx not installed. Run: pip install httpx[http2]")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

IG_WEB_APP_ID = "936619743392459"

HEADERS = {
    "x-ig-app-id": IG_WEB_APP_ID,
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def log(prefix: str, message: str) -> None:
    safe = message.encode("ascii", errors="replace").decode("ascii")
    print(f"[{prefix}] {safe}", flush=True)


def save_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, default=str, ensure_ascii=False)


def download_image(client: httpx.Client, url: str, dest: Path) -> bool:
    """Download image bytes to dest. Returns True on success."""
    if not url or dest.exists():
        return dest.exists()
    try:
        resp = client.get(url, headers={"Referer": "https://www.instagram.com/"})
        resp.raise_for_status()
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(resp.content)
        return True
    except Exception as exc:
        log("warn", f"Could not download {dest.name}: {exc}")
        return False


# ---------------------------------------------------------------------------
# Profile fetch
# ---------------------------------------------------------------------------

def fetch_profile(client: httpx.Client, username: str) -> Optional[dict]:
    """
    Fetch public profile data via Instagram's web_profile_info endpoint.
    Returns the raw 'user' dict or None.
    """
    url = f"https://www.instagram.com/api/v1/users/web_profile_info/?username={username}"
    headers = {**HEADERS, "Referer": f"https://www.instagram.com/{username}/"}

    try:
        resp = client.get(url, headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            return data.get("data", {}).get("user") or data.get("graphql", {}).get("user")
        elif resp.status_code == 401:
            log("error", "401 Unauthorized — Instagram requires login for this endpoint.")
            log("error", "Try again later or use a cookies.txt (see scraper README).")
        elif resp.status_code == 429:
            log("error", "429 Rate Limited — wait ~1 hour before retrying.")
        else:
            log("warn", f"Profile endpoint returned {resp.status_code}")
    except httpx.HTTPError as exc:
        log("error", f"HTTP error fetching profile: {exc}")
    return None


def parse_profile(user: dict) -> dict:
    """Extract clean profile metadata from the raw user dict."""
    return {
        "username": user.get("username", ""),
        "full_name": user.get("full_name", ""),
        "biography": user.get("biography", ""),
        "external_url": user.get("external_url", ""),
        "followers": user.get("edge_followed_by", {}).get("count", 0),
        "followees": user.get("edge_follow", {}).get("count", 0),
        "posts_count": user.get("edge_owner_to_timeline_media", {}).get("count", 0),
        "profile_pic_url": user.get("profile_pic_url_hd") or user.get("profile_pic_url", ""),
        "is_business": user.get("is_business_account", False),
        "business_category": user.get("business_category_name", ""),
        "is_verified": user.get("is_verified", False),
        "userid": user.get("id", ""),
    }


# ---------------------------------------------------------------------------
# Posts (last 12, no-login cap)
# ---------------------------------------------------------------------------

def parse_posts(user: dict) -> list[dict]:
    """Extract post data from the profile's timeline media edges."""
    edges = (
        user.get("edge_owner_to_timeline_media", {}).get("edges", [])
        or user.get("edge_felix_video_timeline", {}).get("edges", [])
    )
    posts = []
    for edge in edges:
        node = edge.get("node", {})
        shortcode = node.get("shortcode", "")
        typename = node.get("__typename", "GraphImage")

        # Collect media URLs
        media_urls = []
        if typename == "GraphSidecar":
            for e in node.get("edge_sidecar_to_children", {}).get("edges", []):
                n = e.get("node", {})
                media_urls.append(n.get("video_url") or n.get("display_url", ""))
        elif typename == "GraphVideo":
            media_urls.append(node.get("video_url", ""))
        else:
            media_urls.append(node.get("display_url", ""))

        caption_edges = node.get("edge_media_to_caption", {}).get("edges", [])
        caption = caption_edges[0].get("node", {}).get("text", "") if caption_edges else ""

        posts.append({
            "shortcode": shortcode,
            "url": f"https://www.instagram.com/p/{shortcode}/",
            "thumbnail_url": node.get("display_url", ""),
            "date_utc": node.get("taken_at_timestamp", 0),
            "caption": caption,
            "hashtags": [w[1:] for w in caption.split() if w.startswith("#")],
            "likes": node.get("edge_liked_by", {}).get("count", 0)
                     or node.get("edge_media_preview_like", {}).get("count", 0),
            "comments_count": node.get("edge_media_to_comment", {}).get("count", 0),
            "is_video": typename == "GraphVideo",
            "typename": {
                "GraphImage": "image",
                "GraphVideo": "video",
                "GraphSidecar": "carousel",
            }.get(typename, "image"),
            "media_urls": media_urls,
        })
    return posts


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Scrape public Instagram profile (no login, HTTP/2).")
    parser.add_argument("--username", default="fitwith_ange")
    parser.add_argument("--output-dir", default="./output")
    parser.add_argument("--delay", type=float, default=1.5,
                        help="Seconds between requests (default: 1.5)")
    parser.add_argument("--skip-images", action="store_true",
                        help="Skip downloading post images (saves bandwidth)")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    log("scrape", f"Target  : @{args.username}")
    log("scrape", f"Output  : {output_dir.resolve()}")
    log("scrape", "Using httpx HTTP/2 (no login required)")

    # Build HTTP/2 client
    with httpx.Client(http2=True, timeout=30, follow_redirects=True) as client:

        # 1. Fetch profile
        log("scrape", "Fetching profile …")
        user_raw = fetch_profile(client, args.username)

        if not user_raw:
            log("error", "Could not fetch profile. Possible causes:")
            log("error", "  • Your IP is rate-limited (wait 1 hour)")
            log("error", "  • Instagram changed their endpoint (check for scrape.py updates)")
            log("error", "  • No internet connection")
            sys.exit(1)

        profile = parse_profile(user_raw)
        save_json(output_dir / "profile.json", profile)
        log("scrape", f"OK Profile saved — {profile['full_name']} (@{profile['username']})")
        log("scrape", f"  Bio      : {profile['biography'][:80]}{'…' if len(profile['biography']) > 80 else ''}")
        log("scrape", f"  Followers: {profile['followers']}")
        log("scrape", f"  Posts    : {profile['posts_count']}")
        log("scrape", f"  Ext URL  : {profile['external_url'] or '(none)'}")

        # 2. Download profile picture
        if profile["profile_pic_url"]:
            time.sleep(args.delay)
            dest = output_dir / "profile_pic.jpg"
            if download_image(client, profile["profile_pic_url"], dest):
                log("scrape", f"OK Profile picture → {dest}")

        # 3. Parse posts (last 12 — Instagram's no-login cap)
        posts = parse_posts(user_raw)
        log("scrape", f"OK Found {len(posts)} posts (Instagram caps at 12 without login)")

        posts_dir = output_dir / "posts"
        posts_dir.mkdir(exist_ok=True)

        for i, post in enumerate(posts, 1):
            save_json(posts_dir / f"{post['shortcode']}.json", post)

            if not args.skip_images and post["thumbnail_url"]:
                time.sleep(args.delay)
                dest = posts_dir / f"{post['shortcode']}_0.jpg"
                download_image(client, post["thumbnail_url"], dest)

            log("scrape", f"  [{i}/{len(posts)}] {post['shortcode']} "
                          f"({post['typename']}) — {post['likes']} likes — "
                          f"{post['caption'][:50].replace(chr(10),' ')}…")

        # 4. Save feed JSON for the website widget
        feed = [
            {
                "shortcode": p["shortcode"],
                "url": p["url"],
                "thumbnail": f"posts/{p['shortcode']}_0.jpg",
                "caption": p["caption"][:120],
                "likes": p["likes"],
                "date": p["date_utc"],
            }
            for p in posts
        ]
        save_json(output_dir / "feed.json", feed)

    print()
    print("=" * 55)
    print("  SCRAPE COMPLETE")
    print("=" * 55)
    print(f"  Profile    : {output_dir / 'profile.json'}")
    print(f"  Profile pic: {output_dir / 'profile_pic.jpg'}")
    print(f"  Posts      : {len(posts)} (JSON + images in output/posts/)")
    print(f"  Feed widget: {output_dir / 'feed.json'}")
    print("=" * 55)
    print()
    print("Next steps:")
    print("  python analyze.py    — hashtags, niche, top posts")
    print("  python inject.py     — copy assets into website")
    print()
    print("NOTE: Without login, Instagram caps at the last 12 posts.")
    print("For full post history, use cookies.txt (see README).")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[scrape] Interrupted.")
        sys.exit(0)
    except Exception as exc:
        log("scrape", f"Fatal: {exc}")
        sys.exit(1)
