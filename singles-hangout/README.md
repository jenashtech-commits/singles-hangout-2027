# Singles Hangout – The Waiting Room (Registration Portal)

Static site + Vercel serverless API + Upstash Redis. No sign-in for registrants; admin uses a password.

## Deploy (GitHub → Vercel)
1. Create a GitHub repo and push this folder:
   `git init && git add . && git commit -m "Initial portal" && git branch -M main && git remote add origin <your-repo-url> && git push -u origin main`
2. On vercel.com → **Add New → Project** → import the repo → Deploy (no build settings needed).
3. In the project: **Storage → Create / Connect → Upstash Redis** (free tier). This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically.
4. **Settings → Environment Variables** → add `ADMIN_PASSWORD` (a strong password).
5. **Deployments → Redeploy** so the variables take effect.

Public page: `https://<your-site>.vercel.app/` · Admin: `/admin.html`

## Notes
- Registration closes automatically after 28 Dec 2026 (edit `DEADLINE` in `api/_lib.js`).
- Assemblies and age ranges are validated on the server (`api/_lib.js`) and listed in `index.html` / `admin.html`.
- Phone numbers are only ever returned by `/api/admin` (password required).
