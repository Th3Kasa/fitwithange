# FitWithAnge — Website

Personal trainer website for **Angelina Farag** (@fitwith_ange).
Pure HTML/CSS/vanilla JS — no build step, no npm, deploys by drag-and-drop.

---

## ⚠️ ASSUMPTIONS — Please Verify

Before going live, confirm or correct the following assumptions baked into the site:

| Assumption | Token to find | Location |
|---|---|---|
| **Niche:** Women's strength training & body transformation (online + in-person hybrid) | — | All copy |
| Your email address | `[REPLACE: email address]` | All pages, footer |
| Your phone number | `[REPLACE: phone number]` | All pages, footer |
| Your location / city | `[REPLACE: location]` | contact.html, JSON-LD |
| Your street address | `[REPLACE: street address]` | index.html JSON-LD |
| Your certifications (×5 slots) | `[REPLACE: cert 1]` … `[REPLACE: cert 5]` | about.html |
| Client names in testimonials (×9) | `[REPLACE: client name]` | testimonials.html, index.html, book.html |
| Before/after photos | `[REPLACE: before/after photos]` | testimonials.html |
| Professional photo of Angelina | `[REPLACE: photo of Angelina]` | about.html, index.html |
| All service prices | `[REPLACE: price]` | services.html |
| Calendly scheduling URL | `[REPLACE: calendly-url]` | book.html |
| Formspree form ID | `[REPLACE: formspree-id]` | book.html, contact.html |
| TikTok profile URL | `[REPLACE: tiktok URL]` | All footers |
| Facebook profile URL | `[REPLACE: facebook URL]` | All footers |
| Google Maps embed URL | `[REPLACE: google maps embed URL]` | contact.html |
| OG/share image | `og-image.jpg` | All `<meta og:image>` tags |

**Quick find-and-replace:** Open the folder in VS Code and use **Ctrl+Shift+H** (Find in Files) to locate and replace every `[REPLACE: ...]` token across all files at once.

---

## 🚀 Deployment — Three Free Options

All three hosts are completely free for static sites. No server required.

### Option 1: GitHub Pages (recommended for version control)

1. Create a free account at [github.com](https://github.com)
2. Click **New repository** → name it `fitwithange` (or any name)
3. Set visibility to **Public** (required for free Pages)
4. Upload all files: drag them onto the repository page, or use Git:
   ```bash
   git init
   git add .
   git commit -m "Initial site"
   git remote add origin https://github.com/YOUR-USERNAME/fitwithange.git
   git push -u origin main
   ```
5. Go to **Settings → Pages**
6. Under "Source", select **Deploy from a branch** → branch: `main` → folder: `/ (root)`
7. Click **Save** — your site will be live at `https://YOUR-USERNAME.github.io/fitwithange/`
8. Optional: add a custom domain under Settings → Pages → Custom domain

> The `.nojekyll` file is already in the repo — it prevents GitHub from ignoring `css/` and `js/` subfolders.

---

### Option 2: Netlify (drag-and-drop, 30 seconds)

1. Go to [netlify.com](https://netlify.com) and create a free account
2. On your dashboard, scroll to the bottom: **"Want to deploy a new site without connecting to Git?"**
3. Drag the entire `FitWithAnge` folder onto the upload target
4. Netlify instantly gives you a URL like `https://random-name.netlify.app`
5. Go to **Site settings → Domain management** to add a custom domain (free)
6. Optional: connect to GitHub for auto-deploy on every push

---

### Option 3: Cloudflare Pages

1. Go to [pages.cloudflare.com](https://pages.cloudflare.com) and create a free account
2. Click **Create a project → Upload assets**
3. Name your project (e.g. `fitwithange`) and drag/drop the folder
4. Click **Deploy site** — live in seconds at `https://fitwithange.pages.dev`
5. Add a custom domain for free under the project's **Custom domains** tab

---

## 📋 Setting Up Free Third-Party Services

### Formspree (contact & booking forms)
Free tier: **50 submissions/month**. No credit card required.

1. Go to [formspree.io](https://formspree.io) and sign up free
2. Click **+ New Form**, give it a name (e.g. "FitWithAnge Bookings")
3. Copy the **Form ID** (looks like `xpwzabcd`)
4. In `book.html` and `contact.html`, replace `[REPLACE: formspree-id]` with your ID:
   ```html
   action="https://formspree.io/f/xpwzabcd"
   ```
5. Submissions arrive in your Formspree dashboard AND are emailed to you
6. For more than 50/month, upgrade to Gold ($10/mo) or use a free alternative like [Web3Forms](https://web3forms.com) (250/month free)

### Calendly (booking scheduler)
Free tier: **1 event type**, unlimited bookings.

1. Go to [calendly.com](https://calendly.com) and create a free account
2. Click **+ New Event Type** → choose **One-on-One**
3. Name it "Free Discovery Call", set duration to 20 minutes
4. Set your availability, add a Google/Outlook calendar, and save
5. Copy your scheduling link (e.g. `https://calendly.com/angelinafarag/free-discovery-call`)
6. In `book.html`, find the Calendly section and:
   - Replace `[REPLACE: calendly-url]` in the commented-out iframe with your link
   - Delete the placeholder `<div class="calendly-frame">` block
   - Uncomment the `<iframe>` tag

---

## 🔍 SEO Checklist

After going live, complete these steps to get found on Google:

### Google Search Console
1. Go to [search.google.com/search-console](https://search.google.com/search-console)
2. Click **Add property** → enter your domain
3. Verify ownership (easiest: HTML file method — upload the file to your site root)
4. Click **Sitemaps** in the left menu → enter `sitemap.xml` → Submit
5. Google will crawl and index your pages within a few days to weeks

### Google Business Profile (local SEO — very important for in-person clients)
1. Go to [business.google.com](https://business.google.com)
2. Click **Manage now** and search for "FitWithAnge"
3. If it doesn't exist, click **Add your business to Google**
4. Fill in: business name, category (Personal Trainer), location/service area, phone, website URL
5. Verify your business (usually by postcard, phone, or email)
6. Add photos, services, and your booking link — this is free and drives significant local traffic

### On-page SEO — already done for you:
- Unique `<title>` and `<meta description>` on every page
- Open Graph tags for social sharing
- Schema.org `LocalBusiness` JSON-LD on homepage
- Semantic HTML (`<article>`, `<section>`, `<nav>`, `<main>`, etc.)
- Canonical links on every page
- `sitemap.xml` with all public pages
- `robots.txt` allowing all crawlers

### Things to do once you have real content:
- Replace `og-image.jpg` with a real 1200×630px branded image (used when sharing links on social)
- Update `sitemap.xml` dates when you publish new content
- Add `icons/icon-192.png` and `icons/icon-512.png` for full PWA support (192×192 and 512×512 px, your logo on a `#d4a574` background)

---

## 📊 How to View Bookings

When clients submit the booking form on `/book.html`, their details are saved to the browser's `localStorage` under the key `fitwithange_bookings`.

**To view bookings:**

1. Navigate to `/admin.html` on your site (not linked publicly — bookmark it)
2. Enter the password: `fitwithange2026`
3. View all submissions in the sortable table
4. Use the **Export CSV** button to download a spreadsheet of all bookings
5. Click **Confirm** on a row to mark a booking as confirmed
6. Click **Delete** to remove a booking (with confirmation prompt)

**Important limitations of the admin dashboard:**

- Bookings are stored in **your browser only** on the device where the client submitted the form
- They are **not synced** to other devices or browsers
- If you clear browser data, bookings are lost — **export to CSV regularly**
- The password gate is **not cryptographically secure** — it's a convenience lock only

**For a proper backend solution** (when you outgrow localStorage):
- Connect Formspree to Airtable or Google Sheets via Zapier (free tiers available)
- Use Netlify Forms (100 submissions/month free) and view in Netlify dashboard
- Set up a free [Supabase](https://supabase.com) database with a simple API

---

## 📁 File Structure

```
FitWithAnge/
├── index.html              Homepage
├── about.html              About Angelina
├── services.html           Services & pricing
├── testimonials.html       Client results
├── blog.html               Blog index
├── book.html               Booking page (Calendly + native form)
├── contact.html            Contact form & info
├── admin.html              Password-gated booking dashboard
├── blog/
│   ├── post-1.html         "5 Beginner Strength Training Mistakes"
│   └── post-2.html         "How to Eat for Fat Loss Without Counting Calories"
├── css/
│   └── styles.css          All styles (mobile-first)
├── js/
│   ├── main.js             Nav, scroll, animations
│   ├── booking.js          Booking form handler + localStorage
│   └── admin.js            Admin dashboard logic
├── robots.txt
├── sitemap.xml
├── manifest.json           PWA manifest
├── .nojekyll               GitHub Pages config
└── README.md               This file
```

---

*Built for Angelina Farag · FitWithAnge · @fitwith_ange*
