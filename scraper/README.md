# FitWithAnge — Instagram Scraping Toolkit

> **LEGAL / ToS DISCLAIMER**
>
> Instagram's Terms of Service prohibit automated scraping by third parties.
> **This toolkit is intended solely for use by the account owner (Angelina) to
> export and back up her own content.** You accept full responsibility for how
> you use it. Do not run it aggressively (tight delays, many requests) or you
> risk getting the account rate-limited or flagged. Consider using a secondary
> Instagram account for the `--login` credential, never your main account.
> Use at your own risk.

---

## What this toolkit does

| Script | Purpose |
|--------|---------|
| `scrape.py` | Downloads profile metadata, posts, stories, highlights, tagged posts |
| `analyze.py` | Reads scraped data → produces `output/analysis.json` with insights |
| `inject.py` | Copies assets into the website and generates a replacement guide |

---

## Setup

**Requirements:** Python 3.10 or newer.

```bash
# From inside the scraper/ folder:
pip install -r requirements.txt
```

Or use the convenience wrappers which handle the venv automatically:

- **Windows:** `run.bat`
- **Mac / Linux:** `bash run.sh`

---

## Quick start — public, no login needed

Gets: bio, profile picture, posts (images, captions, hashtags, likes, comment counts), external link.

```bash
python scrape.py
```

This fetches up to 200 posts from `@fitwith_ange` and writes everything to `./output/`.

Common options:

```bash
python scrape.py --max-posts 50          # limit to 50 posts
python scrape.py --skip-videos           # skip video downloads (saves space/time)
python scrape.py --delay 3.0             # slower = safer (default 1.5s)
python scrape.py --output-dir ./my_data  # custom output folder
```

---

## Full mode — with login (stories, highlights, tagged posts)

```bash
python scrape.py --login your_ig_username
```

You will be prompted for a password (not echoed). The session is saved to
`sessions/session-<username>` so subsequent runs skip re-authentication.

> **Risks:** Instagram may send a verification email/SMS or trigger a
> "Suspicious login" checkpoint. **Use a secondary / burner account if
> possible, not Angelina's main account.** If a checkpoint fires, open the
> Instagram app and confirm the login from there, then retry.

---

## Full workflow

```
1. python scrape.py          # collect raw data
2. python analyze.py         # derive insights
3. python inject.py          # copy assets + generate REPLACEMENTS.md
4. Review ../REPLACEMENTS.md # check every suggestion manually
5. python inject.py --apply  # (optional) auto-replace safe HTML tokens
```

Or run everything in one shot:

```bash
# Windows
run.bat

# Mac / Linux
bash run.sh
```

---

## What works without login

- Profile metadata (name, bio, external URL, follower/following counts)
- Profile picture (full size)
- All public posts: images, carousels, videos, captions, hashtags, mentions,
  likes, comment counts, location tags, post dates
- External link from bio

## What requires `--login`

- Stories (only active ones, expire after 24 h)
- Highlight reels
- Tagged posts (posts where Angelina has been tagged by others)
- Full follower/following lists (not implemented — rarely useful for a website)

---

## Output structure

```
output/
├── profile.json          ← profile metadata
├── profile_pic.jpg       ← full-size profile picture
├── analysis.json         ← derived insights (produced by analyze.py)
├── posts/
│   ├── <shortcode>.json  ← per-post metadata
│   ├── <shortcode>_0.jpg ← post media
│   └── …
├── highlights/           ← (requires login)
│   └── <title>/
│       ├── metadata.json
│       └── *.jpg / *.mp4
├── stories/              ← (requires login)
│   ├── <id>.json
│   └── *.jpg / *.mp4
└── tagged/               ← (requires login, limited to 50)
    └── <shortcode>.json
```

After `inject.py` runs, the website directory gains:

```
assets/
├── img/
│   ├── angelina.jpg         ← profile picture
│   └── gallery/
│       ├── g1.jpg … g12.jpg ← top engaging post images
└── data/
    └── instagram.json       ← feed JSON for the live grid widget
REPLACEMENTS.md              ← token substitution checklist
```

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `401 / QueryReturnedBadRequestException` | Rate-limited or session expired | Wait 24 h, then retry |
| `checkpoint_required` | Instagram wants identity verification | Open the IG app, confirm "that was me", then retry |
| `LoginRequiredException` | Profile is private or feature needs auth | Add `--login` |
| `ConnectionException` | Too many requests / slow network | Increase `--delay` (try `--delay 5`) |
| `ProfileNotExistsException` | Username typo or account deleted | Check `--username` spelling |
| `BadCredentialsException` | Wrong password | Re-check credentials; delete stale session file |
| Session file stale | Saved session invalidated by IG | Delete `sessions/session-<user>` and re-login |

---

## Drop-in Instagram feed widget

`instagram_feed.html` is a self-contained HTML + CSS + JS snippet.
Paste the section between the CUT markers into `index.html` wherever you
want the 12-post grid to appear. It reads `assets/data/instagram.json`
(generated by `inject.py`) — no API key or server-side code needed.

---

## REPLACEMENTS.md guide

After running `inject.py`, open `../REPLACEMENTS.md`. It maps every
`[REPLACE: ...]` placeholder in the HTML to a suggested value sourced from
the Instagram data. Tokens marked **✅** are safe for auto-apply;
tokens marked **⚠️** need your manual review first.

To apply the safe tokens automatically:

```bash
python inject.py --apply
```

This edits the `.html` files in the parent directory in-place and prints a
summary of every substitution made.

---

## Security notes

- `sessions/` is listed in `.gitignore` — never commit session files.
- Passwords are entered via `getpass` and are never written to disk.
- No API keys or external services are used.

---

## File index

| File | Description |
|------|-------------|
| `scrape.py` | Main scraper |
| `analyze.py` | Data analysis |
| `inject.py` | Website asset injection |
| `instagram_feed.html` | Drop-in feed widget |
| `requirements.txt` | Python dependencies |
| `run.bat` | One-command pipeline (Windows) |
| `run.sh` | One-command pipeline (Mac/Linux) |
| `README.md` | This file |
| `sessions/` | Saved login sessions (git-ignored) |
| `output/` | Scraped data (git-ignored) |
