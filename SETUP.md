# Setting up PRISM's services

PRISM works without any keys: the landing page, the demo workspace and analysis of public repositories all run as-is. Three services unlock the rest. Set them up locally first, then on Vercel.

Everything goes in a file called `.env.local` in the project folder (copy `.env.example`). It's ignored by git, so your keys are never committed. After changing it, stop `npm run dev` and start it again.

Open **http://localhost:3000/app/setup** at any time. It checks each service live and shows a green status when it works.

---

## 1. GitHub sign-in (about 3 minutes)

1. Go to **github.com → your avatar → Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Fill in:
   - **Application name:** `PRISM (local)`
   - **Homepage URL:** `http://localhost:3000`
   - **Authorization callback URL:** `http://localhost:3000/api/auth/callback` (the Setup page shows the exact value with a Copy button)
3. Click **Register application**.
4. Copy the **Client ID** into `GITHUB_CLIENT_ID`.
5. Click **Generate a new client secret** and copy it into `GITHUB_CLIENT_SECRET`. GitHub shows it only once.
6. Create `AUTH_SECRET` by running this and pasting the output:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

**What PRISM asks GitHub for:** only your public profile at first. To analyze private repositories, PRISM asks separately ("Allow private repositories"), which requests GitHub's `repo` scope. GitHub has no read-only option for private repos on OAuth apps, but PRISM only ever reads.

**For production:** a GitHub OAuth app has one callback URL, so create a second app for your live site with the callback `https://YOUR-SITE.vercel.app/api/auth/callback`.

## 2. Database: Supabase (about 5 minutes)

1. Go to **supabase.com**, sign in, and click **New project**.
2. Name it `prism`, choose a strong **database password** (save it somewhere safe) and the region closest to you. Wait for it to finish setting up.
3. Click **Connect** at the top of the project page, then choose **Transaction pooler**.
4. Copy the connection string. It looks like `postgresql://postgres.abcd:[YOUR-PASSWORD]@aws-0-region.pooler.supabase.com:6543/postgres`.
5. Replace `[YOUR-PASSWORD]` with your database password and put the whole string in `DATABASE_URL`.

PRISM creates its two tables (`prism_users`, `prism_analyses`) automatically the first time it connects. If you prefer, paste `supabase/schema.sql` into **SQL Editor → New query → Run** instead. Row Level Security is switched on with no policies, so Supabase's public API can't read the tables; only PRISM's server can.

## 3. Claude (about 3 minutes)

1. Go to **console.anthropic.com** and sign in.
2. Open **Billing** and add credit. The API is pay-as-you-go and separate from a Claude.ai subscription.
3. Open **API Keys → Create Key**, name it `prism`, and copy it into `ANTHROPIC_API_KEY`. It's shown only once.

PRISM uses `claude-sonnet-5-5` at high effort and sends only the analysis facts (finding titles, file paths, metrics), never your source code. Each repository commit is reviewed once and then cached, so revisiting a page costs nothing. You can set a monthly spend limit in the Anthropic Console under **Limits**.

### Free alternative: Google Gemini

No payment needed. Go to **aistudio.google.com/apikey**, sign in with a Google account, click **Create API key** and put it in `GEMINI_API_KEY`. PRISM uses it only when `ANTHROPIC_API_KEY` is empty. The free tier has daily request limits, which is plenty for personal use. PRISM tries `gemini-3.5-flash`, then `gemini-3.6-flash`, then `gemini-3.8-flash`, moving on when one is busy or retired. Optionally set `GEMINI_MODEL` to try a model of your choice first.

## 4. Optional: GitHub token

Signed-out visitors analyze public repos through GitHub's anonymous limit of 60 requests per hour (each analysis uses 2). For more, create a fine-grained token at **github.com/settings/tokens** with **Public repositories (read-only)** and put it in `GITHUB_TOKEN`.

---

## Check it

1. Restart the dev server: stop it, then run `npm run dev`.
2. Open `http://localhost:3000/app/setup`. Every card should be green.
3. Click **Test: sign in with GitHub** and approve PRISM.
4. Open **Your repositories** in the sidebar and analyze one. It appears under **History**, and Claude's summary streams into the Overview.

## Going live on Vercel

1. In your Vercel project: **Settings → Environment Variables**. Add the same names, but use the **production** GitHub OAuth app's Client ID and secret, and a new `AUTH_SECRET`.
2. Optionally set `APP_URL` to your site's address (for example `https://prism-yourname.vercel.app`).
3. Redeploy (**Deployments → ⋯ → Redeploy**). Environment changes only apply to new deployments.
4. Open `/app/setup` on the live site to confirm.

## If something's wrong

- **"The sign-in link expired or didn't match":** start sign-in again from the same address you registered (for example, don't mix `localhost` and `127.0.0.1`).
- **"redirect_uri is not associated with this application"** on GitHub: the callback URL in the OAuth app must exactly match the one shown on the Setup page.
- **Database "Can't connect":** check the password inside `DATABASE_URL`, and that you used the Transaction pooler string (port 6543).
- **No Claude summary:** check the key on the Setup page and that your Anthropic account has credit. The server log says why a call failed.
