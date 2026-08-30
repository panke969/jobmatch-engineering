export default async function handler(req, res) {
  // Server-side only: never expose these keys in the browser bundle.
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    return res.status(503).json({
      error: "Live job API is not configured",
      setup: "Add ADZUNA_APP_ID and ADZUNA_APP_KEY in Vercel Environment Variables and redeploy."
    });
  }

  const q = String(req.query.q || "mechatronics engineer").slice(0, 120);
  const where = String(req.query.where || "Netherlands").slice(0, 120);
  const country = String(req.query.country || process.env.ADZUNA_COUNTRY || "nl").toLowerCase().replace(/[^a-z]/g,"").slice(0,3);
  const count = Math.max(1, Math.min(50, Number(req.query.count || 20)));
  const age = Math.max(1, Math.min(30, Number(req.query.age || 7)));

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: String(count),
    what: q,
    where,
    max_days_old: String(age),
    sort_by: "date",
    "content-type": "application/json"
  });

  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`;

  try {
    const response = await fetch(url, {
      headers: { "Accept": "application/json", "User-Agent": "JobMatch-Engineering/0.2" }
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json({
        error: body?.exception || body?.error || `Job provider returned ${response.status}`,
        provider_status: response.status
      });
    }

    const results = (body.results || []).map(job => ({
      id: job.id || null,
      title: job.title || "",
      description: job.description || "",
      company: job.company?.display_name || "",
      location: job.location?.display_name || "",
      salary_min: Number(job.salary_min) || null,
      salary_max: Number(job.salary_max) || null,
      created: job.created || null,
      url: job.redirect_url || ""
    }));

    res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=1800");
    return res.status(200).json({ count: body.count || results.length, results });
  } catch (error) {
    return res.status(500).json({ error: "Could not reach job provider", detail: String(error.message || error) });
  }
}
