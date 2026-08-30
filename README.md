# JobMatch Engineering — v0.4

Main fixes requested:
- Minimum match is now a real display filter.
- English-only is a visible Find Jobs switch.
- Salary is always shown:
  - provider salary when available
  - salary extracted from the vacancy description when recognizable
  - otherwise "Salary: not disclosed"
- Match scoring now gives substantial weight to the actual job title, so relevant engineering jobs no longer default to ~20%.
- Optional Google Jobs source via SerpApi.
- Google Jobs results can expose listings whose `via` / apply option is LinkedIn or Indeed.
- Source filter: All / LinkedIn / Indeed / Google Jobs / Adzuna.

## Existing Adzuna configuration
- ADZUNA_APP_ID
- ADZUNA_APP_KEY
- ADZUNA_COUNTRY=nl

## Optional Google Jobs / LinkedIn / Indeed visibility
Create a SerpApi account and add this Vercel environment variable:
- SERPAPI_KEY

Then redeploy.

JobMatch does not scrape LinkedIn or Indeed directly. It consumes Google Jobs structured results and surfaces the source/apply option returned by that provider.

## Update
Replace the files in your existing GitHub repository with this package and commit.
Vercel should redeploy automatically.
