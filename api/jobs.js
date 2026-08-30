export default async function handler(req, res) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    return res.status(503).json({
      error: "Live job API is not configured",
      setup: "Add ADZUNA_APP_ID and ADZUNA_APP_KEY in Vercel Environment Variables and redeploy."
    });
  }

  const country = String(req.query.country || process.env.ADZUNA_COUNTRY || "nl")
    .toLowerCase().replace(/[^a-z]/g, "").slice(0, 3);
  const where = String(req.query.where || "Netherlands").slice(0, 120);
  const age = Math.max(1, Math.min(30, Number(req.query.age || 7)));
  const perQuery = Math.max(5, Math.min(25, Number(req.query.per_query || 12)));

  const queries = [
    "mechatronics engineer",
    "integration engineer",
    "automation engineer",
    "project engineer",
    "mechanical engineer",
    "service engineer",
    "field service engineer",
    "commissioning engineer",
    "test engineer",
    "NPI engineer",
    "manufacturing engineer",
    "systems engineer"
  ];

  async function fetchQuery(q) {
    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      results_per_page: String(perQuery),
      what: q,
      where,
      max_days_old: String(age),
      sort_by: "date",
      "content-type": "application/json"
    });

    const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`;
    const response = await fetch(url, {
      headers: { "Accept": "application/json", "User-Agent": "JobMatch-Engineering/0.3" }
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { query: q, error: body?.exception || body?.error || `Provider returned ${response.status}`, results: [] };
    }

    return {
      query: q,
      results: (body.results || []).map(job => ({
        id: job.id || null,
        title: job.title || "",
        description: job.description || "",
        company: job.company?.display_name || "",
        location: job.location?.display_name || "",
        salary_min: Number(job.salary_min) || null,
        salary_max: Number(job.salary_max) || null,
        created: job.created || null,
        url: job.redirect_url || "",
        discovered_by: [q]
      }))
    };
  }

  try {
    const batches = await Promise.all(queries.map(fetchQuery));
    const successful = batches.filter(b => !b.error);
    const failures = batches.filter(b => b.error).map(b => ({ query: b.query, error: b.error }));
    const merged = successful.flatMap(b => b.results);

    const norm = s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const map = new Map();

    for (const job of merged) {
      const key = job.id
        ? `id:${job.id}`
        : `sig:${norm(job.company)}|${norm(job.title)}|${norm(job.location)}`;

      if (!map.has(key)) {
        map.set(key, job);
      } else {
        const cur = map.get(key);
        cur.discovered_by = Array.from(new Set([...(cur.discovered_by || []), ...(job.discovered_by || [])]));
        if (!cur.salary_min && job.salary_min) cur.salary_min = job.salary_min;
        if (!cur.salary_max && job.salary_max) cur.salary_max = job.salary_max;
        if ((!cur.description || cur.description.length < job.description.length) && job.description) cur.description = job.description;
        if (!cur.url && job.url) cur.url = job.url;
      }
    }

    const results = Array.from(map.values()).sort((a, b) => {
      const da = a.created ? Date.parse(a.created) : 0;
      const db = b.created ? Date.parse(b.created) : 0;
      return db - da;
    });

    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=1200");
    return res.status(200).json({
      results,
      total_raw: merged.length,
      total_unique: results.length,
      queries,
      failures
    });
  } catch (error) {
    return res.status(500).json({
      error: "Could not reach job provider",
      detail: String(error.message || error)
    });
  }
}
