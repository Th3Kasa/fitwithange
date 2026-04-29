# FitWithAnge — One-Time Setup Guide

Your website is live and the code is ready. To turn on real client data and video-call scheduling,
you need to set up two free services: Calendly (for the discovery-call booking widget) and Supabase
(for storing client enquiries securely). Both are free for the volume this site will see.
Total time: ~20 minutes.

---

## Part 1 — Calendly (≈5 min)

1. Go to https://calendly.com → click **"Sign up free"** → create an account with your business email.

2. After signing in, click your profile picture (top-right) → **Profile Settings** → scroll to
   **Time Zone** → select **Australia/Sydney**. This automatically handles the AEST/AEDT daylight
   saving switch for you — you never have to change it manually.

3. On your Calendly home screen, click **"Create Event Type"** → choose **"One-on-One"**.

4. Fill in the event details:
   - **Event name:** `Discovery Call`
   - **Duration:** `30 min`
   - **Location:** select **Google Meet** — Calendly will pop up a prompt asking you to link your
     Google account. Click through and approve it. Once linked, every booking will automatically
     generate a unique Google Meet link for that call.

5. Set your availability: in the **"When can people book this event?"** section, set the days to
   **Monday through Friday** and the hours to **9:00 AM – 4:00 PM**.

6. Click the **"Invitee Questions"** tab → click **"Add new question"** and add the following four
   questions **in this exact order** (the website fills these in automatically based on position):

   1. **Phone number** — type: Short Answer — mark as **Required**
   2. **Instagram handle** — type: Short Answer — mark as **Optional**
   3. **What goals are you wanting to achieve?** — type: Multiple Lines — mark as **Required**
   4. **What's stopping you from achieving these goals?** — type: Multiple Lines — mark as **Required**

   > These four questions match the slots the website pre-fills when a client clicks "Book a
   > Discovery Call" after filling out the qualifying form. The order matters — don't rearrange them.

7. Click **Save**. Then click the **"Share"** button → copy the link. It will look like:
   `https://calendly.com/your-username/discovery-call`

8. Open the file `enquire.html` in your code editor (or send the link to whoever maintains the
   site) and find this line near the bottom of the file:

   ```js
   const CALENDLY_URL = 'https://calendly.com/REPLACE-WITH-ANGE-USERNAME/discovery-call';
   ```

   Replace the placeholder URL with the link you copied in step 7, so it looks like:

   ```js
   const CALENDLY_URL = 'https://calendly.com/angelina-smith/discovery-call';
   ```

9. Save the file and push to GitHub. Vercel will automatically redeploy the site in about 1 minute.

**✅ Done. Test it:** Open the live site, click any "Book a Discovery Call" button, fill in the
qualifying form, and confirm the Calendly scheduling widget appears on the next step.

---

## Part 2 — Supabase (≈10 min)

Supabase is the database where client enquiries are stored, and it also handles your admin login.

1. Go to https://supabase.com → click **"Start your project"** → sign in with your GitHub or Google
   account (either works).

2. Click **"New Project"** and fill in:
   - **Name:** `fitwithange`
   - **Database Password:** click "Generate a password" and **save this password in your password
     manager** (e.g. Apple Keychain, 1Password, or just a secure note). You will rarely need it but
     it's unrecoverable if lost.
   - **Region:** select **ap-southeast-2 (Sydney)** for the fastest response times from Australia.
   - **Plan:** Free

   Click **"Create new project"**.

3. Wait approximately 2 minutes while Supabase provisions your project. You will see a loading
   screen — just leave the tab open until it finishes.

4. **Run the database schema** — this creates the table that stores enquiries and sets up the
   security rules:
   - In the left sidebar, click **SQL Editor**
   - Click **"New query"**
   - Open the file `supabase/schema.sql` from this repository, select all of its contents, and
     copy them
   - Paste into the SQL Editor text area
   - Click **"Run"**

   You should see: **"Success. No rows returned."** — that means it worked.

   > The schema file is safe to re-run at any time. If you accidentally run it twice, nothing
   > breaks — it checks before creating anything.

5. **Get your API keys** — these let the website talk to your database:
   - In the left sidebar, click the **gear icon** (Project Settings) at the very bottom
   - Click **API** in the sub-menu
   - Copy these two values and keep them handy for the next step:
     - **Project URL** — looks like `https://abcdefgh.supabase.co`
     - **anon public** key — a long string starting with `eyJ...`

   > These two values are safe to put in the website code. The security rules you ran in step 4
   > make sure that visitors can only submit new enquiries — they cannot read or delete anything.
   > See the [Security model](#appendix--security-model-in-plain-english) section at the bottom
   > for a full plain-English explanation.

6. Open the file `js/supabase-client.js` and replace the two placeholder lines at the top:

   ```js
   const SUPABASE_URL      = 'https://REPLACE-WITH-PROJECT-ID.supabase.co';
   const SUPABASE_ANON_KEY = 'REPLACE-WITH-ANON-KEY';
   ```

   with your actual values from step 5, so they look like:

   ```js
   const SUPABASE_URL      = 'https://abcdefgh.supabase.co';
   const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
   ```

7. **Create your admin login** — this is the account you use to sign in to `admin.html`:
   - Left sidebar → **Authentication** → **Users**
   - Click **"Add user"** → **"Create new user"**
   - Enter your email address and a strong password
   - Check **"Auto Confirm User"** (this skips the email confirmation step)
   - Click **"Create User"**

8. Save `js/supabase-client.js` and push to GitHub. Vercel will auto-deploy in ~1 minute.

**✅ Test it:**
- Open `https://fitwithange.vercel.app/admin.html` and sign in with the email and password from
  step 7. You should see an empty enquiries table.
- Open `enquire.html`, fill out and submit a test enquiry.
- Refresh the admin page — the enquiry should appear immediately.

---

## Part 3 — Day-to-day workflow

Once everything is wired up, here is what happens automatically:

- A client clicks **"Book Discovery Call"** anywhere on the site → fills in the qualifying form →
  picks a time slot in the Calendly widget → both you and the client receive a calendar invite with
  a Google Meet link for the call.
- Their answers and contact details appear instantly in **`admin.html` → Enquiries** — no email
  forwarding, no manual data entry.
- In the admin panel you can:
  - **Search and filter** enquiries by name, date, or status
  - **Update the status** of each enquiry: Pending → Confirmed → Archived
  - **Add private notes** to any enquiry (e.g. "Great fit — send program options", "Follow up
    Monday") — notes are only visible to you
  - **Export everything to CSV** for use in Excel or Google Sheets

---

## Part 4 — Maintenance

- **Backups:** Click "Export CSV" in the admin panel once a month as a personal backup copy.
  Supabase free tier takes automatic daily backups, but point-in-time restore is a paid feature
  only. The CSV export is your safety net.

- **Resetting your admin password:** Supabase → **Authentication** → **Users** → click your user
  → click **"Send password recovery"**. You will receive a reset email.

- **Free-tier limits (Supabase):** 500 MB database storage (enough for roughly 500,000 enquiries),
  50,000 monthly active users, 5 GB data transfer per month. You will not come close to these.

- **Custom email domain on Calendly** (e.g. booking links that show your domain instead of
  `calendly.com`): this is a paid Calendly feature at ~$10/month. Not needed right now — skip it
  until it matters to you.

---

## Part 5 — Troubleshooting

**"Backend not configured" banner is showing on the site**
The API keys have not been pasted into `js/supabase-client.js`, or the file was not pushed to
GitHub after editing. Check the file, save it, and push again.

**Login to admin.html fails**
The admin user has not been created in Supabase yet. Go back to Part 2, step 7 and create the
user. Make sure "Auto Confirm User" was checked.

**Enquiries table is empty after submitting a test form**
1. Submit a test enquiry from `enquire.html`.
2. In Supabase, go to **Table Editor** → click the **enquiries** table.
3. If the row is there: the data is in the database but the admin page is not fetching it correctly
   — open your browser's developer console (press F12) and look for error messages.
4. If the row is not there: the form submission is not reaching Supabase. Press F12 → click the
   **Network** tab → resubmit the form and look for a request to `/rest/v1/enquiries`. If it shows
   a red error, the URL or API key in `js/supabase-client.js` is likely incorrect.

**Calendly widget shows "Scheduler coming soon" instead of real booking slots**
The `CALENDLY_URL` in `enquire.html` still contains the original `REPLACE-WITH-ANGE-USERNAME`
placeholder text. Go back to Part 1, step 8 and paste in your real Calendly link.

---

## Appendix — Security model in plain English

The Supabase database has **Row Level Security (RLS)** turned on. Think of it as a set of rules
written directly into the database that control who can do what:

- **Anyone** visiting the site can **submit a new enquiry** — this is how the contact form works.
- **Only you** (a logged-in admin) can **read, edit, or delete** enquiries.
- A visitor cannot see other visitors' enquiries, even if they open the browser developer tools and
  inspect the JavaScript.

The `anon` key you paste into `js/supabase-client.js` is **public by design** — it just tells
Supabase which project to talk to, the same way a business address tells the post office where to
deliver a letter. Without RLS it would be a security problem; with RLS in place, it is simply a
routing key. The actual protection sits at the database level, not in the JavaScript.
