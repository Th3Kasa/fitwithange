"""
inject.py — Injects Instagram-sourced assets and data into the FitWithAnge website.

Actions:
  1. Copies profile_pic.jpg → ../assets/img/angelina.jpg
  2. Copies top-12 engaging post images → ../assets/img/gallery/g1.jpg … g12.jpg
  3. Generates ../assets/data/instagram.json (latest 12 posts feed)
  4. Writes ../REPLACEMENTS.md — find-and-replace guide for HTML tokens
  5. With --apply: performs safe token replacements across ../*.html

Run after analyze.py:
    python inject.py [--output-dir ./output] [--apply]
"""

import argparse
import json
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def log(message: str) -> None:
    """Print a prefixed log line."""
    print(f"[inject] {message}", flush=True)


def load_json(path: Path) -> dict:
    """Load JSON file; return empty dict on failure."""
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except Exception as exc:
        log(f"WARNING: Could not load {path}: {exc}")
        return {}


def ensure_dir(path: Path) -> None:
    """Create directory tree if it does not already exist."""
    path.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# Step 1 — Copy profile picture
# ---------------------------------------------------------------------------

def copy_profile_pic(output_dir: Path, assets_img_dir: Path) -> Optional[Path]:
    """Copy output/profile_pic.jpg → assets/img/angelina.jpg."""
    src = output_dir / "profile_pic.jpg"
    if not src.exists():
        log("WARNING: profile_pic.jpg not found — skipping profile pic copy.")
        return None

    ensure_dir(assets_img_dir)
    dest = assets_img_dir / "angelina.jpg"
    shutil.copy2(src, dest)
    log(f"Profile pic copied → {dest}")
    return dest


# ---------------------------------------------------------------------------
# Step 2 — Copy gallery images
# ---------------------------------------------------------------------------

def collect_top_image_paths(
    output_dir: Path,
    analysis: dict,
    n: int = 12,
) -> list[Path]:
    """
    Find local image files for the top-engaging posts.
    Returns up to *n* existing image Paths.
    """
    posts_dir = output_dir / "posts"
    top_posts = analysis.get("top_engaging_posts", [])
    found: list[Path] = []

    for post in top_posts:
        if len(found) >= n:
            break
        shortcode = post.get("shortcode", "")
        if not shortcode:
            continue
        # Look for _0.jpg first, then any jpg for this shortcode
        for candidate in sorted(posts_dir.glob(f"{shortcode}_*.jpg")):
            found.append(candidate)
            break  # take first image per post

    # If we still need more, fall back to newest posts by scanning all jpgs
    if len(found) < n:
        all_jpgs = sorted(posts_dir.glob("*_0.jpg"))
        for jpg in reversed(all_jpgs):
            if len(found) >= n:
                break
            if jpg not in found:
                found.append(jpg)

    return found[:n]


def copy_gallery_images(
    output_dir: Path,
    analysis: dict,
    assets_gallery_dir: Path,
) -> list[Path]:
    """Copy top-12 images to assets/img/gallery/g1.jpg … g12.jpg."""
    ensure_dir(assets_gallery_dir)
    images = collect_top_image_paths(output_dir, analysis, n=12)
    copied: list[Path] = []

    for i, src in enumerate(images, start=1):
        dest = assets_gallery_dir / f"g{i}.jpg"
        try:
            shutil.copy2(src, dest)
            copied.append(dest)
            log(f"Gallery image {i}/12 copied → {dest.name}")
        except Exception as exc:
            log(f"WARNING: Could not copy {src.name}: {exc}")

    log(f"Gallery: {len(copied)} images copied.")
    return copied


# ---------------------------------------------------------------------------
# Step 3 — Generate instagram.json feed file
# ---------------------------------------------------------------------------

def build_feed_json(output_dir: Path, analysis: dict, assets_data_dir: Path) -> Path:
    """
    Generate assets/data/instagram.json with the latest 12 posts.
    Each entry: thumbnail (local asset path), caption_first_line, post_url, date.
    """
    ensure_dir(assets_data_dir)
    posts_dir = output_dir / "posts"

    # Load all posts and sort by date descending
    all_posts: list[dict] = []
    if posts_dir.exists():
        for jf in posts_dir.glob("*.json"):
            try:
                with open(jf, encoding="utf-8") as fh:
                    all_posts.append(json.load(fh))
            except Exception:
                pass

    all_posts.sort(key=lambda p: p.get("date_utc", ""), reverse=True)

    feed = []
    for i, post in enumerate(all_posts[:12], start=1):
        shortcode = post.get("shortcode", "")
        caption = post.get("caption") or ""
        first_line = caption.split("\n")[0][:140]
        # Check if a local gallery image exists for this post
        gallery_img = f"assets/img/gallery/g{i}.jpg"

        feed.append({
            "index": i,
            "thumbnail": gallery_img,
            "caption_first_line": first_line,
            "post_url": post.get("url", f"https://www.instagram.com/p/{shortcode}/"),
            "date_utc": post.get("date_utc", ""),
            "likes": post.get("likes", 0),
            "is_video": post.get("is_video", False),
            "shortcode": shortcode,
        })

    dest = assets_data_dir / "instagram.json"
    with open(dest, "w", encoding="utf-8") as fh:
        json.dump(feed, fh, indent=2, ensure_ascii=False)
    log(f"Instagram feed JSON written → {dest} ({len(feed)} posts)")
    return dest


# ---------------------------------------------------------------------------
# Step 4 — Write REPLACEMENTS.md
# ---------------------------------------------------------------------------

def write_replacements_md(
    profile: dict,
    analysis: dict,
    website_dir: Path,
) -> Path:
    """
    Write a REPLACEMENTS.md checklist mapping [REPLACE: ...] tokens
    to suggested values from the Instagram data.
    """
    bio_lines = analysis.get("bio_summary", [])
    bio_text = " | ".join(bio_lines) if bio_lines else "(see output/profile.json)"
    bio_paragraph = " ".join(bio_lines) if bio_lines else ""

    name = profile.get("full_name") or "Angelina Farag"
    username = profile.get("username") or "fitwith_ange"
    external_url = profile.get("external_url") or "(none found in bio)"
    followers = profile.get("followers", 0)

    top_hashtags = analysis.get("top_hashtags", [])
    top_niches = analysis.get("inferred_niche", [])
    niche_str = ", ".join(n["niche"] for n in top_niches[:3]) if top_niches else "fitness"
    top_post = (analysis.get("top_engaging_posts") or [{}])[0]
    testimonials = analysis.get("testimonial_candidates", [])
    locations = analysis.get("locations", [])
    loc_str = locations[0] if locations else "(not found in posts)"

    hashtag_str = ", ".join(h["hashtag"] for h in top_hashtags[:5])

    lines = [
        "# REPLACEMENTS — FitWithAnge Website Token Substitution Guide",
        "",
        "> **Auto-generated by inject.py** — Review each suggestion before applying.",
        "> Run `python inject.py --apply` to automatically replace the safe tokens marked ✅.",
        "> Tokens marked ⚠️  need your manual review before editing the HTML.",
        "",
        "---",
        "",
        "## Profile / Identity Tokens",
        "",
        f"| Token | Suggested Value | Source | Auto-apply? |",
        f"|-------|-----------------|--------|-------------|",
        f"| `[REPLACE: photo of Angelina]` | `assets/img/angelina.jpg` | Profile pic | ✅ |",
        f"| `[REPLACE: Angelina's name]` | `{name}` | IG full_name | ✅ |",
        f"| `[REPLACE: full name]` | `{name}` | IG full_name | ✅ |",
        f"| `[REPLACE: IG username]` | `@{username}` | IG username | ✅ |",
        f"| `[REPLACE: external link]` | `{external_url}` | IG bio link | ✅ |",
        f"| `[REPLACE: booking link]` | `{external_url}` | IG bio link | ⚠️ verify |",
        "",
        "## Bio / Description Tokens",
        "",
        f"| Token | Suggested Value | Source | Auto-apply? |",
        f"|-------|-----------------|--------|-------------|",
        f"| `[REPLACE: bio paragraph]` | {bio_paragraph[:200]}… | IG biography | ⚠️ review |",
        f"| `[REPLACE: bio]` | {bio_text} | IG biography | ⚠️ review |",
        f"| `[REPLACE: tagline]` | {bio_lines[0] if bio_lines else '(see bio)'} | IG bio line 1 | ⚠️ review |",
        "",
        "## Social Proof / Stats Tokens",
        "",
        f"| Token | Suggested Value | Source | Auto-apply? |",
        f"|-------|-----------------|--------|-------------|",
        f"| `[REPLACE: follower count]` | `{followers:,}` | IG followers | ✅ |",
        f"| `[REPLACE: location]` | `{loc_str}` | Post locations | ⚠️ verify |",
        "",
        "## Niche / Content Tokens",
        "",
        f"| Token | Suggested Value | Source | Auto-apply? |",
        f"|-------|-----------------|--------|-------------|",
        f"| `[REPLACE: niche]` | `{niche_str}` | Caption analysis | ⚠️ review |",
        f"| `[REPLACE: top hashtags]` | `{hashtag_str}` | Hashtag frequency | ⚠️ review |",
        "",
        "## Certification / Credentials Tokens",
        "",
        "> These were not found in the Instagram data — check Angelina's bio manually.",
        "",
        "| Token | Suggested Value | Source |",
        "|-------|-----------------|--------|",
        "| `[REPLACE: cert 1]` | *(check IG bio / about page)* | Manual |",
        "| `[REPLACE: cert 2]` | *(check IG bio / about page)* | Manual |",
        "| `[REPLACE: cert 3]` | *(check IG bio / about page)* | Manual |",
        "",
        "## Client / Testimonial Tokens",
        "",
    ]

    if testimonials:
        lines += [
            "The following posts are testimonial candidates (mentions clients/transformations):",
            "",
            "| Token | Suggested Caption | Post URL |",
            "|-------|-------------------|----------|",
        ]
        for t in testimonials[:5]:
            preview = t.get("caption_preview", "")[:120].replace("|", "\\|")
            url = t.get("post_url", "")
            lines.append(f"| `[REPLACE: client name]` | {preview}… | [{url}]({url}) |")
    else:
        lines += [
            "No testimonial posts detected automatically.",
            "Search manually in `output/posts/` for posts about client results.",
        ]

    lines += [
        "",
        "## Gallery / Media Tokens",
        "",
        "Gallery images have been copied to `assets/img/gallery/g1.jpg` through `g12.jpg`.",
        "",
        "| Token | Suggested Value |",
        "|-------|-----------------|",
    ]
    for i in range(1, 13):
        lines.append(f"| `[REPLACE: gallery image {i}]` | `assets/img/gallery/g{i}.jpg` |")

    lines += [
        "",
        "---",
        "",
        "## Full IG Bio (raw)",
        "",
        "```",
        profile.get("biography") or "(empty)",
        "```",
        "",
        "## Top Engaging Posts (for social proof / gallery selection)",
        "",
    ]

    top_posts = analysis.get("top_engaging_posts", [])
    if top_posts:
        lines.append("| # | Likes | Caption Preview | URL |")
        lines.append("|---|-------|-----------------|-----|")
        for i, p in enumerate(top_posts, 1):
            preview = (p.get("caption_preview") or "")[:80].replace("|", "\\|")
            url = p.get("post_url", "")
            likes = p.get("likes", 0)
            lines.append(f"| {i} | {likes:,} | {preview}… | [{url}]({url}) |")

    lines += ["", "---", "_Generated by inject.py — FitWithAnge scraper toolkit_", ""]

    dest = website_dir / "REPLACEMENTS.md"
    with open(dest, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))
    log(f"REPLACEMENTS.md written → {dest}")
    return dest


# ---------------------------------------------------------------------------
# Step 5 — Optional --apply: safe token replacement across HTML
# ---------------------------------------------------------------------------

# Only these tokens are "safe" to auto-apply (non-destructive, factual values)
SAFE_REPLACEMENTS: dict[str, str] = {}  # populated at runtime from profile data


def build_safe_replacements(profile: dict) -> dict[str, str]:
    """Build the dict of safe HTML token substitutions."""
    name = profile.get("full_name") or ""
    username = profile.get("username") or ""
    external_url = profile.get("external_url") or ""
    followers = profile.get("followers", 0)

    replacements: dict[str, str] = {}

    if name:
        replacements["[REPLACE: Angelina's name]"] = name
        replacements["[REPLACE: full name]"] = name
        replacements["[REPLACE: name]"] = name

    if username:
        replacements["[REPLACE: IG username]"] = f"@{username}"

    if external_url:
        replacements["[REPLACE: external link]"] = external_url

    if followers:
        replacements["[REPLACE: follower count]"] = f"{followers:,}"

    # Profile pic src replacement (img tag src attribute)
    replacements["[REPLACE: photo of Angelina]"] = "assets/img/angelina.jpg"
    replacements["[REPLACE: profile photo]"] = "assets/img/angelina.jpg"

    return replacements


def apply_replacements(website_dir: Path, replacements: dict[str, str]) -> int:
    """
    Apply *replacements* across all HTML files in *website_dir*.
    Returns total number of substitutions made.
    """
    total_changes = 0
    html_files = list(website_dir.glob("*.html"))

    if not html_files:
        log("WARNING: No HTML files found in website directory.")
        return 0

    for html_file in html_files:
        try:
            original = html_file.read_text(encoding="utf-8")
        except Exception as exc:
            log(f"WARNING: Could not read {html_file.name}: {exc}")
            continue

        modified = original
        file_changes = 0

        for token, value in replacements.items():
            if token in modified:
                count = modified.count(token)
                modified = modified.replace(token, value)
                file_changes += count
                log(f"  {html_file.name}: '{token}' → '{value}' ({count}x)")

        if file_changes > 0:
            html_file.write_text(modified, encoding="utf-8")
            log(f"  Saved {html_file.name} ({file_changes} replacements)")
            total_changes += file_changes
        else:
            log(f"  {html_file.name}: no matching tokens found")

    return total_changes


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(
        description="Inject Instagram data into the FitWithAnge website.",
    )
    parser.add_argument(
        "--output-dir", default="./output",
        help="Scraper output directory (default: ./output)",
    )
    parser.add_argument(
        "--apply", action="store_true",
        help="Apply safe token replacements across website HTML files",
    )
    parser.add_argument(
        "--website-dir", default="..",
        help="Path to website root directory (default: ..)",
    )
    return parser.parse_args()


def main() -> None:
    """Run all inject steps."""
    args = parse_args()
    output_dir = Path(args.output_dir)
    website_dir = Path(__file__).parent / args.website_dir
    website_dir = website_dir.resolve()

    if not output_dir.exists():
        log(f"ERROR: Output directory '{output_dir}' does not exist. Run scrape.py first.")
        raise SystemExit(1)

    profile_path = output_dir / "profile.json"
    analysis_path = output_dir / "analysis.json"

    if not profile_path.exists():
        log("ERROR: output/profile.json not found. Run scrape.py first.")
        raise SystemExit(1)

    if not analysis_path.exists():
        log("ERROR: output/analysis.json not found. Run analyze.py first.")
        raise SystemExit(1)

    profile = load_json(profile_path)
    analysis = load_json(analysis_path)

    log(f"Website directory : {website_dir}")
    log(f"Output directory  : {output_dir.resolve()}")
    log(f"Profile           : @{profile.get('username', '(unknown)')}")

    assets_img_dir = website_dir / "assets" / "img"
    assets_gallery_dir = assets_img_dir / "gallery"
    assets_data_dir = website_dir / "assets" / "data"

    # 1. Profile picture
    copy_profile_pic(output_dir, assets_img_dir)

    # 2. Gallery images
    copy_gallery_images(output_dir, analysis, assets_gallery_dir)

    # 3. instagram.json feed
    build_feed_json(output_dir, analysis, assets_data_dir)

    # 3b. Copy profile.json → assets/data/profile.json (used by live JS stats)
    profile_src = output_dir / "profile.json"
    if profile_src.exists():
        ensure_dir(assets_data_dir)
        profile_dest = assets_data_dir / "profile.json"
        shutil.copy2(profile_src, profile_dest)
        log(f"Profile JSON copied → {profile_dest}")
    else:
        log("WARNING: output/profile.json not found — skipping assets/data/profile.json copy.")

    # 4. REPLACEMENTS.md
    write_replacements_md(profile, analysis, website_dir)

    # 5. Optional apply
    if args.apply:
        log("Applying safe token replacements to HTML files …")
        replacements = build_safe_replacements(profile)
        if not replacements:
            log("WARNING: No replacement values found in profile — nothing to apply.")
        else:
            total = apply_replacements(website_dir, replacements)
            log(f"Total substitutions applied: {total}")
    else:
        log("Skipping HTML edits (run with --apply to apply safe tokens).")

    print()
    print("=" * 60)
    print("  INJECT COMPLETE")
    print("=" * 60)
    print(f"  Assets created in : {assets_img_dir}")
    print(f"  Feed JSON         : {assets_data_dir / 'instagram.json'}")
    print(f"  Profile JSON      : {assets_data_dir / 'profile.json'}")
    print(f"  Review guide      : {website_dir / 'REPLACEMENTS.md'}")
    if args.apply:
        print("  HTML tokens applied (safe tokens only).")
    else:
        print("  Run with --apply to auto-replace safe HTML tokens.")
    print("=" * 60)
    print()
    print("Next step:  Review REPLACEMENTS.md, then optionally:")
    print("    python inject.py --apply")
    print()


if __name__ == "__main__":
    main()
