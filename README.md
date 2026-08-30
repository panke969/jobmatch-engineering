# JobMatch Engineering — v0.2

Functional Vercel-ready Job Matching System.

## What works now
- Manual vacancy analysis
- Weighted engineering match score
- Must-have / preferred / other-requirement extraction
- Evidence mapping from CV/portfolio profile
- Dutch-language risk penalty
- Salary-target penalty
- Excluded-industry filtering
- Portfolio project recommendations
- Job Tracker with editable statuses and next actions
- Local browser persistence
- Tracker JSON export/import
- Market-insight aggregation
- Live job search through a Vercel serverless API
- Automatic scoring/filtering of live results
- Optional 30-minute refresh while the page is open

## Live job search setup
The serverless endpoint uses Adzuna as the job-data provider.

1. Create an Adzuna developer account and obtain `app_id` and `app_key`.
2. In Vercel open:
   Project → Settings → Environment Variables
3. Add:
   - `ADZUNA_APP_ID`
   - `ADZUNA_APP_KEY`
   - optional `ADZUNA_COUNTRY=nl`
4. Redeploy the Vercel project.

Do NOT add these credentials to `app.js`, GitHub, or any client-side file.

If the provider does not support the configured country code for your account/market,
change the country in JobMatch Settings to a supported market or use another provider in `/api/jobs.js`.

## Deploy update
Replace the existing GitHub repo contents with the files in this package, commit, and push.
Vercel should redeploy automatically.

## Next phase
- Persistent cloud database instead of localStorage
- Scheduled background discovery
- Deduplication across multiple providers/company career pages
- Better semantic/AI scoring
- Tailored CV and cover-letter generation
- Notifications for high-match vacancies
