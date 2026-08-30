# JobMatch Engineering — v0.4.1 Hotfix

Fixes the live-search hang seen in v0.4.

## Fixes
- Source selection is now sent to the backend.
- LinkedIn selection calls Google Jobs / SerpApi only.
- Indeed selection calls Google Jobs / SerpApi only.
- Adzuna selection calls Adzuna only.
- All Sources calls both.
- Provider requests have individual timeouts.
- Partial results are returned even if one provider request times out.
- Browser request has an 18-second timeout with a visible error instead of hanging forever.
- LinkedIn/Indeed filtering happens server-side before returning results.

Existing environment variables remain unchanged:
- ADZUNA_APP_ID
- ADZUNA_APP_KEY
- ADZUNA_COUNTRY=nl
- SERPAPI_KEY

Replace the five project files and let Vercel redeploy.
