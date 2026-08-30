export default async function handler(req, res) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  const serpKey = process.env.SERPAPI_KEY;

  const requestedSource = String(req.query.source || "all").toLowerCase();
  const wantsAdzuna = requestedSource === "all" || requestedSource === "adzuna";
  const wantsGoogle = ["all","google","linkedin","indeed"].includes(requestedSource);

  if (wantsAdzuna && (!appId || !appKey) && !wantsGoogle) {
    return res.status(503).json({ error: "Adzuna is not configured." });
  }
  if (wantsGoogle && !serpKey && !wantsAdzuna) {
    return res.status(503).json({ error: "SERPAPI_KEY is not configured." });
  }
  if ((!appId || !appKey) && !serpKey) {
    return res.status(503).json({
      error: "No live job provider is configured",
      setup: "Configure Adzuna and/or SERPAPI_KEY in Vercel Environment Variables."
    });
  }

  const country = String(req.query.country || process.env.ADZUNA_COUNTRY || "nl")
    .toLowerCase().replace(/[^a-z]/g, "").slice(0, 3);
  const where = String(req.query.where || "Netherlands").slice(0, 120);
  const age = Math.max(1, Math.min(30, Number(req.query.age || 7)));
  const perQuery = Math.max(5, Math.min(15, Number(req.query.per_query || 10)));

  // Broad enough for engineering discovery, but intentionally kept compact for fast serverless execution.
  const adzunaQueries = [
    "mechatronics engineer",
    "automation engineer",
    "integration engineer",
    "field service engineer",
    "project engineer",
    "mechanical engineer",
    "commissioning engineer",
    "test engineer"
  ];

  const googleQueries = [
    "mechatronics automation engineer",
    "integration systems engineer",
    "field service commissioning engineer",
    "project mechanical test engineer"
  ];

  async function fetchWithTimeout(url, options={}, timeoutMs=7000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {...options, signal: controller.signal});
    } finally {
      clearTimeout(timeout);
    }
  }

  async function fetchAdzuna(q) {
    if (!wantsAdzuna || !appId || !appKey) return { provider:"Adzuna", query:q, results:[] };

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

    try {
      const response = await fetchWithTimeout(
        `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`,
        {headers:{"Accept":"application/json","User-Agent":"JobMatch-Engineering/0.4.1"}},
        6500
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.exception || body?.error || `HTTP ${response.status}`);

      return {
        provider:"Adzuna",
        query:q,
        results:(body.results || []).map(job => ({
          id:job.id?`adzuna:${job.id}`:null,
          title:job.title||"",
          description:job.description||"",
          company:job.company?.display_name||"",
          location:job.location?.display_name||"",
          salary_min:Number(job.salary_min)||null,
          salary_max:Number(job.salary_max)||null,
          salary_text:"",
          created:job.created||null,
          url:job.redirect_url||"",
          provider:"Adzuna",
          source_name:"Adzuna",
          via:"Adzuna",
          discovered_by:[q]
        }))
      };
    } catch (e) {
      return {provider:"Adzuna",query:q,error:e.name==="AbortError"?"timeout":String(e.message||e),results:[]};
    }
  }

  function postedAtToDate(posted) {
    if (!posted) return null;
    const s=String(posted).toLowerCase();
    const n=parseInt(s,10);
    const now=Date.now();
    if(/hour/.test(s)&&Number.isFinite(n))return new Date(now-n*3600000).toISOString();
    if(/day/.test(s)&&Number.isFinite(n))return new Date(now-n*86400000).toISOString();
    if(/week/.test(s)&&Number.isFinite(n))return new Date(now-n*7*86400000).toISOString();
    if(/today|just posted/.test(s))return new Date().toISOString();
    return null;
  }

  function matchesRequestedSource(job) {
    if (requestedSource === "all" || requestedSource === "google") return true;
    const options = Array.isArray(job.apply_options) ? job.apply_options : [];
    const hay = [
      job.via || "",
      ...options.map(o => o.title || "")
    ].join(" ").toLowerCase();
    if (requestedSource === "linkedin") return hay.includes("linkedin");
    if (requestedSource === "indeed") return hay.includes("indeed");
    return true;
  }

  async function fetchGoogleJobs(q) {
    if (!wantsGoogle || !serpKey) return {provider:"Google Jobs",query:q,results:[]};

    const params = new URLSearchParams({
      engine:"google_jobs",
      q,
      location:where,
      hl:"en",
      gl:country==="nl"?"nl":country,
      api_key:serpKey
    });

    try {
      const response = await fetchWithTimeout(
        `https://serpapi.com/search.json?${params}`,
        {headers:{"Accept":"application/json","User-Agent":"JobMatch-Engineering/0.4.1"}},
        7500
      );
      const body = await response.json().catch(() => ({}));
      if(!response.ok || body.error) throw new Error(body.error || `HTTP ${response.status}`);

      const now=Date.now(), maxAgeMs=age*86400000;

      const results=(body.jobs_results||[])
        .filter(matchesRequestedSource)
        .map(job=>{
          const options=Array.isArray(job.apply_options)?job.apply_options:[];
          const linkedin=options.find(o=>/linkedin/i.test(o.title||""));
          const indeed=options.find(o=>/indeed/i.test(o.title||""));
          const chosen =
            requestedSource==="linkedin" ? linkedin :
            requestedSource==="indeed" ? indeed :
            linkedin || indeed || options[0] || null;

          const via=job.via || chosen?.title || "Google Jobs";
          const posted=job.detected_extensions?.posted_at || "";
          const created=postedAtToDate(posted);
          const salaryText=job.detected_extensions?.salary ||
            (Array.isArray(job.extensions)?job.extensions.find(x=>/€|\beur\b|salary/i.test(String(x))):"") || "";

          return {
            id:job.job_id?`google:${job.job_id}`:null,
            title:job.title||"",
            description:job.description||"",
            company:job.company_name||"",
            location:job.location||"",
            salary_min:null,
            salary_max:null,
            salary_text:salaryText,
            created,
            url:chosen?.link || job.share_link || "",
            provider:"Google Jobs",
            source_name: requestedSource==="linkedin" && linkedin ? "LinkedIn" :
                         requestedSource==="indeed" && indeed ? "Indeed" : via,
            via,
            apply_options:options.map(o=>({title:o.title||"",link:o.link||""})),
            discovered_by:[q]
          };
        })
        .filter(job=>!job.created || (now-Date.parse(job.created))<=maxAgeMs);

      return {provider:"Google Jobs",query:q,results};
    } catch (e) {
      return {provider:"Google Jobs",query:q,error:e.name==="AbortError"?"timeout":String(e.message||e),results:[]};
    }
  }

  try {
    const tasks=[];
    if(wantsAdzuna && appId && appKey) tasks.push(...adzunaQueries.map(fetchAdzuna));
    if(wantsGoogle && serpKey) tasks.push(...googleQueries.map(fetchGoogleJobs));

    const settled=await Promise.all(tasks);
    const failures=settled.filter(b=>b.error).map(b=>({provider:b.provider,query:b.query,error:b.error}));
    const merged=settled.flatMap(b=>b.results||[]);

    const norm=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
    const map=new Map();

    for(const job of merged){
      const signature=`sig:${norm(job.company)}|${norm(job.title)}|${norm(job.location)}`;
      const key=(job.company||job.title)?signature:(job.id||Math.random().toString());

      if(!map.has(key)){
        map.set(key,job);
      }else{
        const cur=map.get(key);
        cur.discovered_by=Array.from(new Set([...(cur.discovered_by||[]),...(job.discovered_by||[])]));
        if(!cur.salary_min&&job.salary_min)cur.salary_min=job.salary_min;
        if(!cur.salary_max&&job.salary_max)cur.salary_max=job.salary_max;
        if(!cur.salary_text&&job.salary_text)cur.salary_text=job.salary_text;
        if((!cur.description||cur.description.length<job.description.length)&&job.description)cur.description=job.description;

        const curPreferred=/linkedin|indeed/i.test(cur.source_name||"");
        const newPreferred=/linkedin|indeed/i.test(job.source_name||"");
        if((!cur.url||(!curPreferred&&newPreferred))&&job.url){
          cur.url=job.url;
          cur.source_name=job.source_name;
          cur.via=job.via;
          cur.provider=job.provider;
        }
      }
    }

    const results=Array.from(map.values()).sort((a,b)=>{
      const da=a.created?Date.parse(a.created):0;
      const db=b.created?Date.parse(b.created):0;
      return db-da;
    });

    const providers=[];
    if(wantsAdzuna&&appId&&appKey)providers.push("Adzuna");
    if(wantsGoogle&&serpKey)providers.push("Google Jobs");

    res.setHeader("Cache-Control","s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({
      results,
      total_raw:merged.length,
      total_unique:results.length,
      providers,
      failures,
      partial:failures.length>0
    });
  } catch(error) {
    return res.status(500).json({
      error:"Could not reach job providers",
      detail:String(error.message||error)
    });
  }
}
