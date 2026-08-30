const PROFILE = {
  categories: {
    "Mechanical Design": ["mechanical design","solidworks","siemens nx","autocad","cad","machine design","fixture","tooling","mechanism","3d modelling"],
    "Mechatronics": ["mechatronics","mechatronic","system integration","integration engineer","multidisciplinary","electromechanical","complex machinery"],
    "Machine Vision": ["machine vision","vision system","vision","sensopart","camera","inspection","image processing","quality inspection"],
    "Field / Service": ["field service","field engineer","commissioning","troubleshooting","customer site","service engineer","sat","installation","maintenance","technical support"],
    "PLC / Automation": ["plc","beckhoff","twincat","siemens s7","tia portal","automation","ethercat","vfd","servo","motion control","scada","mitsubishi"],
    "Robotics": ["robotics","robot","abb","fanuc","mitsubishi robot","robotic cell","gripper"],
    "Project / NPI": ["project management","project engineer","npi","requirements engineering","fat","sat","validation","industrialization","stakeholder","project leadership","new product introduction"],
    "Manufacturing": ["cnc","3d printing","rapid prototyping","manufacturing","lean","kaizen","poka-yoke","production engineering","reverse engineering"]
  },
  evidence: {
    "beckhoff":"Field-service troubleshooting, machine retrofit and Beckhoff automation experience.",
    "twincat":"Beckhoff/TwinCAT diagnostic and automation exposure.",
    "siemens s7":"Industrial automation experience with Siemens S7.",
    "plc":"PLC troubleshooting/programming across industrial automation projects.",
    "servo":"Servo systems, drives, motors and motion-control troubleshooting.",
    "machine vision":"Vision-system experience including SensoPart and automated inspection.",
    "sensopart":"Grundfos final-QC station using bottom-mounted SensoPart vision.",
    "solidworks":"CAD / mechanical engineering workflow experience.",
    "siemens nx":"CAD / mechanical engineering workflow experience.",
    "robotics":"ABB, Fanuc and Mitsubishi robotics experience.",
    "abb":"Industrial robotics experience.",
    "fanuc":"Industrial robotics experience.",
    "rapid prototyping":"R&D rapid prototyping and fixture/tooling development.",
    "commissioning":"International field commissioning and machine validation experience.",
    "troubleshooting":"Cross-domain mechanical/electrical/automation root-cause troubleshooting.",
    "fat":"Requirements engineering and FAT/SAT project exposure.",
    "sat":"Requirements engineering and FAT/SAT project exposure.",
    "retrofit":"Industrial machine modernization covering mechanics, electrical and controls.",
    "reliability":"Reliability improvement, maintenance concepts and root-cause investigations.",
    "project management":"Multidisciplinary project coordination plus Project Management Master's in progress."
  },
  skills: ["Beckhoff","TwinCAT","Siemens S7","Mitsubishi GX Works","ABB","Fanuc","SensoPart","Machine Vision","Servo Systems","VFD","EtherCAT","SolidWorks","Siemens NX","AutoCAD","CAD/CAM","PLC","SCADA","ROS2","C","CNC","3D Printing","Rapid Prototyping","Reverse Engineering","FAT","SAT","Requirements Engineering","Lean","Kaizen","Poka-Yoke","Field Service","Commissioning","Troubleshooting","Retrofit","Reliability"],
  projects: [
    {name:"BMW Multi-Variant Assembly Cell",path:"projects/bmw-multi-variant-assembly-cell.html",desc:"Robotics, rapid prototyping, vision inspection and multi-variant automation.",tags:["robotics","machine vision","rapid prototyping","automation","mechanical design","fixture","industry 4.0"]},
    {name:"Grundfos Final QC Test Station",path:"projects/grundfos-final-qc-test-station.html",desc:"Multi-variant final inspection using SensoPart vision and precision sensors.",tags:["machine vision","sensopart","inspection","test engineering","sensors","automation"]},
    {name:"Industrial Machine Retrofit",path:"projects/industrial-machine-retrofit.html",desc:"Mechanical, electrical and control-system retrofit / reliability assessment.",tags:["retrofit","beckhoff","servo","ethercat","reliability","mechanical","electrical","troubleshooting"]},
    {name:"IPC / HMI Reliability Investigation",path:"projects/ipc-hmi-reliability-investigation.html",desc:"Cross-domain root-cause analysis of industrial touchscreen reliability.",tags:["beckhoff","hmi","troubleshooting","root cause","field service","electrical","software"]},
    {name:"Visual Parts Identification System",path:"projects/visual-parts-identification-system.html",desc:"Poka-yoke visual compatibility standard for spare-parts management.",tags:["poka-yoke","lean","warehouse","standardization","maintenance"]},
    {name:"Maintenance in the Box",path:"projects/maintenance-in-the-box.html",desc:"Aftermarket maintenance concept combining spares, modules and lifecycle planning.",tags:["maintenance","aftermarket","reliability","service","planning"]},
    {name:"Diagnostic Test Station Concept",path:"projects/diagnostic-test-station-concept.html",desc:"Standardized diagnostic platform for repeatable component pass/fail testing.",tags:["diagnostics","testing","standardization","beckhoff","concept development"]}
  ]
};

const DEFAULT_PREFS={salary:60000,location:"Netherlands",match:70,country:"nl",excluded:"food processing, fish processing, seafood processing",english:true};
const state={
  current:null,
  jobs:JSON.parse(localStorage.getItem("jobmatch_jobs")||"[]"),
  prefs:{...DEFAULT_PREFS,...JSON.parse(localStorage.getItem("jobmatch_prefs")||"{}")},
  searchResults:[],
  autoTimer:null
};

const $=id=>document.getElementById(id);
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const norm=s=>(s||"").toLowerCase().replace(/[–—]/g,"-").replace(/\s+/g," ").trim();
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
const fmtSalary=(min,max)=>{
  if(!min&&!max)return"Salary not listed";
  const f=v=>new Intl.NumberFormat("en-NL",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(v);
  return min&&max?`${f(min)}–${f(max)}`:f(min||max);
};

function scoreCategory(text,terms){
  let weighted=0;
  terms.forEach(t=>{
    const k=norm(t);
    if(text.includes(k)) weighted += k.includes(" ")?1.5:1;
  });
  if(weighted===0) return 28;
  return clamp(Math.round(38 + weighted*12),28,100);
}

function roleAffinity(title){
  const t=norm(title);
  const rules=[
    [/mechatronic/,98],
    [/integration engineer|system integration/,96],
    [/automation engineer|controls engineer|control engineer/,95],
    [/field service engineer|service engineer/,95],
    [/commissioning engineer/,94],
    [/application engineer/,93],
    [/reliability engineer|maintenance engineer/,92],
    [/test engineer|verification engineer|validation engineer/,91],
    [/systems engineer|system engineer/,90],
    [/project engineer/,89],
    [/\bnpi\b|new product introduction/,89],
    [/manufacturing engineer|production engineer|industrialization engineer/,87],
    [/mechanical engineer|machine engineer|mechanical design engineer/,87]
  ];
  for(const [rx,score] of rules){ if(rx.test(t)) return score; }
  if(/\bengineer\b/.test(t)) return 72;
  return 50;
}

function parseSalaryText(text){
  const s=String(text||"").replace(/\u00a0/g," ");
  const annual=[
    /€\s?(\d{2,3})[.,]?(\d{3})?\s*(?:-|–|to)\s*€?\s?(\d{2,3})[.,]?(\d{3})?\s*(?:per year|a year|\/year|annually|p\.?a\.?)?/i,
    /€\s?(\d{2,3})\s?k\s*(?:-|–|to)\s*€?\s?(\d{2,3})\s?k/i,
    /(\d{2,3})\s?k\s*(?:-|–|to)\s*(\d{2,3})\s?k\s*(?:eur|euro|€)/i
  ];
  for(const rx of annual){
    const m=s.match(rx); if(!m) continue;
    if(rx===annual[0]){
      const a=Number(String(m[1])+(m[2]||"000"));
      const b=Number(String(m[3])+(m[4]||"000"));
      if(a>=25000&&b>=25000)return{min:a,max:b,source:"description"};
    } else {
      const a=Number(m[1])*1000,b=Number(m[2])*1000;
      if(a>=25000&&b>=25000)return{min:a,max:b,source:"description"};
    }
  }
  const monthly=s.match(/€\s?([\d.,]{4,7})\s*(?:-|–|to)\s*€?\s?([\d.,]{4,7})\s*(?:per month|a month|\/month|p\/m|pm)/i);
  if(monthly){
    const p=x=>Number(String(x).replace(/\./g,"").replace(",","."));
    const a=p(monthly[1])*12,b=p(monthly[2])*12;
    if(a>=25000&&b>=25000)return{min:Math.round(a),max:Math.round(b),source:"description"};
  }
  return null;
}

function sourceKind(job){
  const src=norm(job.source_name||job.via||job.provider||"");
  if(src.includes("linkedin"))return"linkedin";
  if(src.includes("indeed"))return"indeed";
  if(src.includes("adzuna"))return"adzuna";
  if(src.includes("google"))return"google";
  return job.provider==="Adzuna"?"adzuna":"google";
}


function detectLanguage(text){
  const dutchWords=["ervaring met","wij zoeken","je bent","jij bent","beheersing van","nederlandse taal","goede beheersing","werkervaring","functie","opleiding","vereisten","wat ga je doen"];
  const englishWords=["we are looking","you will","requirements","experience with","responsibilities","what you will do","preferred","required","qualifications"];
  const d=dutchWords.filter(x=>text.includes(x)).length;
  const e=englishWords.filter(x=>text.includes(x)).length;
  return d>e+1?"Dutch":e>d?"English":"Unknown";
}

function dutchMandatory(text){
  return /(dutch|nederlands|nederlandse taal).{0,60}(required|mandatory|must|fluent|native|c1|b2|vereist|verplicht)|(?:required|mandatory|must|fluent).{0,50}(dutch|nederlands)/i.test(text);
}

function extractRequirements(raw){
  const text=norm(raw);
  const sentences=raw.split(/[\n•]+|(?<=[.!?])\s+/).map(s=>s.trim()).filter(s=>s.length>12);
  const must=[], preferred=[], nice=[];
  sentences.forEach(s=>{
    const n=norm(s);
    if(/must|required|mandatory|essential|shall|minimum|you have|we require|vereist|verplicht/.test(n)) must.push(s);
    else if(/preferred|preferably|advantage|plus|desirable|nice to have|pré|pre/.test(n)) preferred.push(s);
    else if(/experience|knowledge|familiar|skill|background|degree|education/.test(n)) nice.push(s);
  });
  const short=x=>x.slice(0,8).map(v=>v.length>180?v.slice(0,177)+"…":v);
  return {must:short(must),preferred:short(preferred),nice:short(nice)};
}

function buildEvidence(text){
  const found=[];
  Object.entries(PROFILE.evidence).forEach(([k,v])=>{
    if(text.includes(k)) found.push({skill:k,evidence:v});
  });
  return found.slice(0,10);
}

function detectRisks(text,salaryMin=null){
  const risks=[];
  if(dutchMandatory(text)) risks.push("Dutch appears to be mandatory — major fit risk.");
  else if(text.includes("dutch")||text.includes("nederlands")) risks.push("Dutch is mentioned; verify whether it is preferred or mandatory.");
  if(text.includes("tia portal")) risks.push("TIA Portal is requested; current profile has stronger Siemens S7 than explicit TIA evidence.");
  if(/5\+?\s*years.*project|senior project|project lead|project manager/.test(text)) risks.push("Senior project-leadership requirement may need stronger direct evidence.");
  if(/master.?s degree|required master|msc required/.test(text)) risks.push("Verify whether a completed Master's degree is mandatory.");
  if(salaryMin && state.prefs.salary && salaryMin<state.prefs.salary) risks.push(`Listed minimum salary is below your configured €${state.prefs.salary.toLocaleString()} target.`);
  return risks.slice(0,5);
}

function excludedHit(text){
  return state.prefs.excluded.split(",").map(x=>norm(x)).filter(Boolean).find(x=>text.includes(x));
}

function projectScore(project,text){
  let hits=0;
  project.tags.forEach(t=>{if(text.includes(norm(t)))hits++});
  return clamp(48+hits*10,48,98);
}

function scoreJob(raw,meta={}){
  const text=norm(raw);
  const title=meta.title||meta.role||"";

  const categoryScores={};
  Object.entries(PROFILE.categories).forEach(([cat,terms])=>{
    categoryScores[cat]=scoreCategory(text,terms);
  });

  const weights={
    "Mechanical Design":1.08,
    "Mechatronics":1.25,
    "Machine Vision":.88,
    "Field / Service":1.08,
    "PLC / Automation":1.22,
    "Robotics":.8,
    "Project / NPI":.98,
    "Manufacturing":.78
  };

  let ws=0,wt=0;
  Object.entries(categoryScores).forEach(([k,v])=>{
    ws += v*weights[k];
    wt += weights[k];
  });

  const skillScore=Math.round(ws/wt);
  const evidence=buildEvidence(text);
  const evidenceScore=clamp(50 + evidence.length*5,50,96);
  const roleScore=roleAffinity(title);

  // v0.4.2 calibration:
  // title/role family dominates initial suitability;
  // description/skills refine the result rather than destroying it.
  let overall=Math.round(
    roleScore*0.62 +
    skillScore*0.23 +
    evidenceScore*0.15
  );

  // Extra boost when the vacancy clearly mentions several engineering areas
  // that exist in the profile.
  const strongCategories=Object.values(categoryScores).filter(v=>v>=65).length;
  if(strongCategories>=4) overall += 5;
  else if(strongCategories>=2) overall += 3;

  // High-value profile overlaps.
  const highValue=[
    "beckhoff","plc","commissioning","troubleshooting","machine vision",
    "servo","solidworks","siemens nx","robotics","fat","sat","retrofit",
    "field service","requirements engineering"
  ];
  const hvHits=highValue.filter(k=>text.includes(k)).length;
  overall += Math.min(6, hvHits);

  const language=detectLanguage(text);
  if(dutchMandatory(text)) overall -= 24;
  else if(language==="Dutch") overall -= 10;

  const ex=excludedHit(text);
  if(ex) overall -= 35;

  if(meta.salary_min && state.prefs.salary && meta.salary_min<state.prefs.salary*.80){
    overall -= 4;
  }

  overall=clamp(overall,10,98);

  const projects=PROFILE.projects
    .map(p=>({...p,score:projectScore(p,text)}))
    .sort((a,b)=>b.score-a.score);

  const high=Object.entries(categoryScores)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,4)
    .map(x=>x[0]);

  return {
    overall,
    categoryScores,
    projects,
    high,
    risks:detectRisks(text,meta.salary_min),
    requirements:extractRequirements(raw),
    evidence,
    language,
    excluded:ex,
    roleScore,
    skillScore,
    evidenceScore
  };
}

function analyze(){
  const raw=$("jobText").value.trim();
  if(!raw){alert("Paste a job description first.");return;}
  const score=scoreJob(raw,{title:$("roleInput").value.trim()});
  state.current={
    company:$("companyInput").value.trim()||"Unknown company",
    role:$("roleInput").value.trim()||"Untitled role",
    location:$("locationInput").value.trim(),
    salary:$("salaryInput").value.trim(),
    source:$("sourceInput").value.trim(),
    text:raw,...score,analyzed:new Date().toISOString()
  };
  renderCurrent();showView("dashboard");
}

function renderCurrent(){
  const c=state.current;if(!c)return;
  $("jobTitle").textContent=c.role;
  $("jobCompany").textContent=[c.company,c.location].filter(Boolean).join(" · ");
  $("overallScore").textContent=c.overall+"%";
  const clr=c.overall>=80?"#42d469":c.overall>=65?"#ffb42b":"#e55252";
  $("ring").style.background=`conic-gradient(${clr} ${c.overall*3.6}deg,#223341 0deg)`;
  $("matchLabel").textContent=c.overall>=85?"Excellent Match":c.overall>=75?"Strong Match":c.overall>=60?"Possible Match":"Weak Match";
  $("matchLabel").style.background=c.overall>=75?"#173d24":c.overall>=60?"#4a3515":"#4a1c1c";
  $("categories").innerHTML=Object.entries(c.categoryScores).map(([k,v])=>{
    const color=v>=80?"#42d469":v>=60?"#ffb42b":"#e55252";
    return `<div class="category"><label>${k}</label><div class="bar"><span style="width:${v}%;background:${color}"></span></div><div class="pct" style="color:${color}">${v}%</div></div>`
  }).join("");
  $("whyFit").textContent=`Strongest alignment: ${c.high.slice(0,3).join(", ")}. Detected vacancy language: ${c.language}. ${c.evidence.length} profile evidence points were mapped.`;
  $("gaps").innerHTML=(c.risks.length?c.risks:["No obvious hard blocker detected. Verify mandatory education, language and certification requirements manually."]).map(x=>`<li>${esc(x)}</li>`).join("");
  $("highlights").innerHTML=c.projects.slice(0,4).map(p=>`<li>${esc(p.name)}</li>`).join("");
  $("projectRecommendations").innerHTML=c.projects.slice(0,3).map(projectCard).join("");
  $("openSourceBtn").disabled=!c.source;
  $("openSourceBtn").onclick=()=>c.source&&window.open(c.source,"_blank","noopener");
  renderRequirements(c);renderTracker();renderInsights();renderStats();
}

function renderRequirements(c){
  if(!c)return;
  const grp=(title,arr)=>`<div class="req-group"><h4>${title}</h4>${arr.length?arr.map(x=>`<div class="req-item"><span>${esc(x)}</span></div>`).join(""):`<p class="muted">None confidently detected.</p>`}</div>`;
  $("requirementsPanel").innerHTML=grp("Must-have",c.requirements.must)+grp("Preferred",c.requirements.preferred)+grp("Other signals",c.requirements.nice);
  $("evidencePanel").innerHTML=c.evidence.length?c.evidence.map(e=>`<div class="evidence-item"><b>${esc(e.skill)}</b><span>${esc(e.evidence)}</span></div>`).join(""):`<p class="muted">No direct evidence mapping detected from the current text.</p>`;
}

function projectCard(p){
  return `<div class="project"><h4>${esc(p.name)}</h4><div class="match">${p.score}% relevance</div><p>${esc(p.desc)}</p><div class="tags">${p.tags.slice(0,4).map(t=>`<span class="tag">${esc(t)}</span>`).join("")}</div></div>`;
}

function saveCurrent(){
  if(!state.current){alert("Analyze a job first.");return;}
  const c=state.current;
  addTracker({company:c.company,role:c.role,location:c.location,salary:c.salary,match:c.overall,status:"Saved",next:"Apply",source:c.source,text:c.text});
  alert("Saved to Job Tracker.");
}
function addTracker(data){
  const dup=state.jobs.find(j=>norm(j.company)===norm(data.company)&&norm(j.role)===norm(data.role)&&norm(j.source||"")===norm(data.source||""));
  if(dup)return dup;
  const item={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()),saved:new Date().toLocaleDateString(),...data};
  state.jobs.unshift(item);persist();renderTracker();renderInsights();renderStats();return item;
}
function persist(){localStorage.setItem("jobmatch_jobs",JSON.stringify(state.jobs));}

function renderTracker(){
  const rows=state.jobs;
  $("trackerPreview").innerHTML=rows.slice(0,4).map(j=>`<tr><td>${esc(j.company)}</td><td>${esc(j.role)}</td><td class="${scoreClass(j.match)}">${j.match}%</td><td><span class="status">${esc(j.status)}</span></td><td>${esc(j.next)}</td></tr>`).join("")||`<tr><td colspan="5" class="muted">No saved jobs yet.</td></tr>`;
  $("trackerFull").innerHTML=rows.map(j=>`<tr><td>${esc(j.company)}</td><td>${esc(j.role)}</td><td class="${scoreClass(j.match)}">${j.match}%</td><td>${esc(j.salary||"—")}</td><td><select onchange="updateStatus('${j.id}',this.value)">${["Saved","Applied","Interview","Offer","Rejected","Closed"].map(s=>`<option ${s===j.status?"selected":""}>${s}</option>`).join("")}</select></td><td><input value="${esc(j.next)}" onchange="updateNext('${j.id}',this.value)"></td><td>${j.source?`<a href="${esc(j.source)}" target="_blank" rel="noopener">Open</a>`:"—"}</td><td>${esc(j.saved)}</td><td><button class="remove-btn" onclick="removeJob('${j.id}')">×</button></td></tr>`).join("")||`<tr><td colspan="9" class="muted">No saved jobs yet.</td></tr>`;
}
const scoreClass=v=>v>=75?"score-good":v>=60?"score-med":"score-low";
window.updateStatus=(id,v)=>{const j=state.jobs.find(x=>x.id===id);if(j){j.status=v;persist();renderTracker();renderStats();}};
window.updateNext=(id,v)=>{const j=state.jobs.find(x=>x.id===id);if(j){j.next=v;persist();}};
window.removeJob=id=>{state.jobs=state.jobs.filter(x=>x.id!==id);persist();renderTracker();renderInsights();renderStats();};

function renderStats(){
  $("statTracked").textContent=state.jobs.length;
  $("statStrong").textContent=state.jobs.filter(j=>j.match>=state.prefs.match).length;
  $("statApplied").textContent=state.jobs.filter(j=>["Applied","Interview","Offer"].includes(j.status)).length;
  $("statInterview").textContent=state.jobs.filter(j=>j.status==="Interview").length;
}

function renderInsights(){
  const source=state.jobs.map(j=>norm(j.text)).join(" ");
  const terms=["Project Management","Beckhoff","Machine Vision","Siemens S7","TIA Portal","Robotics","Commissioning","Dutch","SolidWorks","FAT / SAT"];
  const html=terms.map(t=>{
    const needles=t==="FAT / SAT"?["fat","sat"]:[norm(t)];
    let jobsWith=0;
    state.jobs.forEach(j=>{const tx=norm(j.text);if(needles.some(n=>tx.includes(n)))jobsWith++});
    const pct=state.jobs.length?Math.round(jobsWith/state.jobs.length*100):0;
    return `<div class="insight"><div class="insight-row"><span>${esc(t)}</span><span>${pct}%</span></div><div class="bar"><span style="width:${pct}%"></span></div></div>`;
  }).join("");
  $("marketInsights").innerHTML=html;
  $("fullInsights").innerHTML=html||`<p class="muted">Save jobs to build insights.</p>`;
}

async function findJobs(){
  const where=$("searchLocation").value.trim()||state.prefs.location||"Netherlands";
  const age=$("searchAge").value||"7";
  const highlightFrom=clamp(Number($("searchMinMatch").value)||70,0,100);
  const englishOnly=$("searchEnglishOnly").checked;
  const sourceFilter=$("searchSource").value;

  $("findJobsBtn").disabled=true;
  $("findJobsBtn").textContent="Finding latest jobs…";
  $("apiState").textContent="Connecting…";
  $("apiState").style.color="#ffb42b";
  $("jobResults").innerHTML=`<p class="muted">Loading live vacancies…</p>`;
  $("resultCount").textContent="—";

  showNotice(
    sourceFilter==="linkedin"
      ? "Searching Google Jobs for vacancies surfaced from LinkedIn…"
      : sourceFilter==="indeed"
      ? "Searching Google Jobs for vacancies surfaced from Indeed…"
      : sourceFilter==="adzuna"
      ? "Searching Adzuna…"
      : "Searching available live job sources, deduplicating and applying language/source filters…"
  );

  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),18000);

  try{
    const params=new URLSearchParams({
      where,
      age,
      country:state.prefs.country,
      per_query:"10",
      source:sourceFilter
    });

    const res=await fetch(`/api/jobs?${params}`,{signal:controller.signal});
    clearTimeout(timer);

    const data=await res.json();
    if(!res.ok)throw new Error(data.error||"Job API request failed");

    const providerText=(data.providers||[]).join(" + ")||"Live feed";
    $("apiState").textContent=`${providerText} connected`;
    $("apiState").style.color="#42d469";

    const decorated=(data.results||[]).map(j=>decorateFeedJob(j));

    // IMPORTANT: score is no longer a display filter.
    // Only hard exclusions, language and selected source can remove a job.
    state.searchResults=decorated
      .filter(j=>!j.filteredOut)
      .filter(j=>!englishOnly || j.language==="English")
      .filter(j=>sourceFilter==="all" || sourceFilter==="google" || sourceKind(j)===sourceFilter)
      .map(j=>({...j,recommended:j.match>=highlightFrom,highlightFrom}))
      .sort((a,b)=>{
        // Recommended jobs first, then combined rank score.
        if(a.recommended!==b.recommended)return a.recommended?-1:1;
        return b.rankScore-a.rankScore;
      });

    renderSearchResults();

    const recommendedCount=state.searchResults.filter(j=>j.recommended).length;
    $("filterSummary").textContent=
      `${recommendedCount} recommended ≥${highlightFrom}% · `+
      `${englishOnly?"English only":"all languages"} · `+
      `${sourceFilter==="all"?"all sources":sourceFilter}`;

    const failCount=(data.failures||[]).length;
    const partial=data.partial?" Partial provider results were returned.":"";
    showNotice(
      `Found ${data.total_unique||data.results?.length||0} unique live jobs before language/source filters. `+
      `${state.searchResults.length} are displayed; ${recommendedCount} are highlighted as recommended.${partial}`+
      `${failCount?` ${failCount} provider request(s) timed out or failed.`:""}`
    );
  }catch(e){
    clearTimeout(timer);
    state.searchResults=[];
    renderSearchResults();
    $("apiState").textContent=e.name==="AbortError"?"Search timed out":"API problem";
    $("apiState").style.color="#ff7777";
    showNotice(
      e.name==="AbortError"
        ? "The live search took longer than 18 seconds. Try one source at a time or redeploy the latest backend patch."
        : `${e.message}. Check the latest Vercel Function log for /api/jobs.`,
      true
    );
  }finally{
    $("findJobsBtn").disabled=false;
    $("findJobsBtn").textContent="Refresh Latest Jobs";
  }
}

function decorateFeedJob(j){
  const raw=[j.title,j.description,j.company,j.location].filter(Boolean).join("\n");
  const parsedSalary=(!j.salary_min&&!j.salary_max)?parseSalaryText([j.salary_text,j.description].filter(Boolean).join(" ")):null;
  const salaryMin=j.salary_min||parsedSalary?.min||null;
  const salaryMax=j.salary_max||parsedSalary?.max||null;
  const scored=scoreJob(raw,{...j,title:j.title,salary_min:salaryMin,salary_max:salaryMax});
  const salary=fmtSalary(salaryMin,salaryMax);

  const createdMs=j.created?Date.parse(j.created):0;
  const ageHours=createdMs?Math.max(0,(Date.now()-createdMs)/3600000):999;
  const freshness=ageHours<=24?100:ageHours<=72?85:ageHours<=168?70:50;

  let salaryScore=55;
  if(salaryMax){
    salaryScore=clamp(Math.round((salaryMax/Math.max(state.prefs.salary||60000,1))*70),40,100);
  }else if(salaryMin){
    salaryScore=clamp(Math.round((salaryMin/Math.max(state.prefs.salary||60000,1))*70),40,100);
  }

  const rankScore=Math.round(scored.overall*.72 + freshness*.20 + salaryScore*.08);

  const filteredOut=
    Boolean(scored.excluded) ||
    (salaryMax && state.prefs.salary && salaryMax<state.prefs.salary*.72);

  return {
    ...j,
    ...scored,
    salary_min:salaryMin,
    salary_max:salaryMax,
    salary,
    salaryParsed:Boolean(parsedSalary),
    freshness,
    rankScore,
    ageHours,
    filteredOut
  };
}

function renderSearchResults(){
  $("resultCount").textContent=`${state.searchResults.length} jobs`;

  const ageLabel=h=>{
    if(!isFinite(h)||h>900)return"date n/a";
    if(h<24)return`${Math.max(1,Math.round(h))}h ago`;
    return`${Math.round(h/24)}d ago`;
  };

  const sourceLabel=j=>{
    const s=j.source_name||j.via||j.provider||"Job source";
    return esc(s);
  };

  const tier=j=>{
    if(j.match>=85)return{label:"STRONG MATCH",cls:"strong"};
    if(j.match>=70)return{label:"GOOD MATCH",cls:"good"};
    if(j.match>=55)return{label:"POSSIBLE",cls:"possible"};
    return{label:"LOW MATCH",cls:"low"};
  };

  $("jobResults").innerHTML=state.searchResults.length?state.searchResults.map((j,i)=>{
    const kind=sourceKind(j);
    const sourceClass=kind==="linkedin"?"source-linkedin":kind==="indeed"?"source-indeed":"";
    const t=tier(j);
    return `
    <div class="job-result ${t.cls} ${j.recommended?"recommended":""}">
      <div class="job-score ${scoreClass(j.match)}">
        ${j.match}%
        <div class="match-tier ${t.cls}">${t.label}</div>
      </div>
      <div>
        <h4>${esc(j.title)}</h4>
        <div class="meta">
          ${esc(j.company||"Unknown company")} ·
          ${esc(j.location||"Netherlands")} ·
          ${esc(j.language)} ·
          ${esc(ageLabel(j.ageHours))}
        </div>
        <div class="salary-line ${(!j.salary_min&&!j.salary_max)?"salary-missing":""}">
          ${j.salary_min||j.salary_max
            ?`Salary: ${esc(j.salary)}${j.salaryParsed?" · extracted from description":""}`
            :"Salary: not disclosed"}
        </div>
        <p>${esc((j.description||"").slice(0,300))}${(j.description||"").length>300?"…":""}</p>
        <div class="score-summary">
          <span class="source-badge ${sourceClass}">${sourceLabel(j)}</span>
          <span class="tag">ROLE ${j.roleScore}</span>
          <span class="tag">SKILLS ${j.skillScore}</span>
          <span class="tag">EVIDENCE ${j.evidenceScore}</span>
          <span class="tag">RANK ${j.rankScore}</span>
          ${(j.discovered_by||[]).slice(0,2).map(q=>`<span class="tag">${esc(q)}</span>`).join("")}
        </div>
      </div>
      <div class="job-actions">
        <button class="primary small-btn" onclick="analyzeFeed(${i})">Analyze</button>
        <button class="ghost small-btn" onclick="saveFeed(${i})">Save</button>
        ${j.url?`<button class="ghost small-btn" onclick="window.open('${esc(j.url)}','_blank','noopener')">Open</button>`:""}
      </div>
    </div>`;
  }).join(""):`<p class="muted">No jobs match the selected language/source filters. Try All sources or disable English-only.</p>`;
}

window.analyzeFeed=i=>{
  const j=state.searchResults[i];if(!j)return;
  state.current={company:j.company||"Unknown company",role:j.title,location:j.location||"",salary:j.salary,source:j.url||"",text:j.description||j.title,...scoreJob(j.description||j.title,{...j,title:j.title}),analyzed:new Date().toISOString()};
  fillMatcherFromCurrent();renderCurrent();showView("dashboard");
};
window.saveFeed=i=>{
  const j=state.searchResults[i];if(!j)return;
  addTracker({company:j.company||"Unknown company",role:j.title,location:j.location||"",salary:j.salary,match:j.match,status:"Saved",next:"Review / Apply",source:j.url||"",text:j.description||""});
};

function fillMatcherFromCurrent(){
  const c=state.current;if(!c)return;
  $("companyInput").value=c.company||"";$("roleInput").value=c.role||"";$("locationInput").value=c.location||"";$("salaryInput").value=c.salary||"";$("sourceInput").value=c.source||"";$("jobText").value=c.text||"";
}

function loadDemoFeed(){
  const demo=[
    {title:"Mechatronics Integration Engineer",company:"Demo High-Tech Systems",source_name:"LinkedIn",provider:"Google Jobs",location:"Eindhoven, Netherlands",salary_min:68000,salary_max:78000,url:"",created:new Date().toISOString(),description:"English working environment. Integration of complex mechatronic machinery. Commissioning, troubleshooting, Beckhoff PLC, servo motion, machine vision, FAT and SAT. SolidWorks or Siemens NX and robotics experience preferred."},
    {title:"Automation Project Engineer",company:"Demo Motion BV",source_name:"Indeed",provider:"Google Jobs",location:"Utrecht, Netherlands",salary_min:65000,salary_max:74000,url:"",created:new Date().toISOString(),description:"Project engineering for industrial automation. PLC, Siemens S7, servo drives, commissioning, requirements engineering and customer support. TIA Portal preferred. Dutch is a plus, English required."},
    {title:"Senior Machine Engineer",company:"Demo Manufacturing",source_name:"Adzuna",provider:"Adzuna",location:"Rotterdam, Netherlands",salary_min:72000,salary_max:82000,url:"",created:new Date().toISOString(),description:"Mechanical machine design, CAD, SolidWorks, reliability, retrofit, supplier coordination and prototype validation. Five years experience in multidisciplinary machine projects required."}
  ];
  state.searchResults=demo.map(decorateFeedJob).filter(j=>!j.filteredOut).sort((a,b)=>b.match-a.match);
  renderSearchResults();showNotice("Demo feed loaded. Live mode will use the Vercel serverless API.");
}

function showNotice(msg,error=false){
  const n=$("searchNotice");n.textContent=msg;n.classList.remove("hidden","error");if(error)n.classList.add("error");
}

function showView(id){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(v=>v.classList.toggle("active",v.dataset.view===id));
  $(id).classList.add("active");
  if(id==="tracker")renderTracker();
  if(id==="skills")renderInsights();
}

function exportTracker(){
  const payload={version:"0.2",exported:new Date().toISOString(),prefs:state.prefs,jobs:state.jobs};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="jobmatch-backup.json";a.click();URL.revokeObjectURL(a.href);
}
async function importTracker(file){
  try{
    const data=JSON.parse(await file.text());
    if(!Array.isArray(data.jobs))throw new Error("Invalid backup");
    state.jobs=data.jobs;if(data.prefs)state.prefs={...state.prefs,...data.prefs};persist();savePrefs(false);renderTracker();renderInsights();renderStats();alert("Backup imported.");
  }catch(e){alert("Could not import this JSON backup.");}
}

function loadPrefs(){
  $("prefSalary").value=state.prefs.salary;$("prefLocation").value=state.prefs.location;$("prefMatch").value=state.prefs.match;$("prefCountry").value=state.prefs.country;$("prefExcluded").value=state.prefs.excluded;$("prefEnglish").checked=state.prefs.english;
  $("searchLocation").value=state.prefs.location;$("searchMinMatch").value=state.prefs.match;$("searchEnglishOnly").checked=state.prefs.english;
}
function savePrefs(show=true){
  state.prefs={salary:Number($("prefSalary").value)||0,location:$("prefLocation").value.trim()||"Netherlands",match:Number($("prefMatch").value)||70,country:$("prefCountry").value.trim().toLowerCase()||"nl",excluded:$("prefExcluded").value.trim(),english:$("prefEnglish").checked};
  localStorage.setItem("jobmatch_prefs",JSON.stringify(state.prefs));loadPrefs();renderStats();if(show)alert("Preferences saved.");
}

document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
$("newMatchBtn").onclick=()=>showView("matcher");$("openMatcherBtn").onclick=()=>showView("matcher");
$("analyzeBtn").onclick=analyze;$("reanalyzeBtn").onclick=()=>state.current?(fillMatcherFromCurrent(),analyze()):showView("matcher");
$("saveJobBtn").onclick=saveCurrent;$("findJobsBtn").onclick=findJobs;$("sampleFeedBtn").onclick=loadDemoFeed;
$("savePrefsBtn").onclick=()=>savePrefs(true);$("exportTrackerBtn").onclick=exportTracker;
$("importTrackerInput").onchange=e=>e.target.files[0]&&importTracker(e.target.files[0]);
$("clearTrackerBtn").onclick=()=>{if(confirm("Clear all saved jobs?")){state.jobs=[];persist();renderTracker();renderInsights();renderStats();}};
$("copySummaryBtn").onclick=()=>{if(!state.current)return;const c=state.current;navigator.clipboard.writeText(`${c.role} @ ${c.company}\nMatch: ${c.overall}%\nStrong areas: ${c.high.join(", ")}\nProjects: ${c.projects.slice(0,3).map(p=>p.name).join(", ")}`);};
$("loadSampleBtn").onclick=()=>{
  $("companyInput").value="Example Automation Company";$("roleInput").value="Mechatronics Integration Engineer";$("locationInput").value="Eindhoven, Netherlands";$("salaryInput").value="€65–75k";$("sourceInput").value="";
  $("jobText").value=`We are seeking a Mechatronics Integration Engineer for complex automated machinery. The role includes mechanical design, system integration, commissioning, troubleshooting, PLC automation, Beckhoff or Siemens S7, servo and motion control, machine vision, FAT/SAT and collaboration with project engineering. Experience with SolidWorks or Siemens NX, robotics and rapid prototyping is preferred. Dutch is preferred but English is the working language. TIA Portal experience is a plus.`;
};
$("autoRefresh").onchange=e=>{
  if(state.autoTimer)clearInterval(state.autoTimer);
  state.autoTimer=e.target.checked?setInterval(findJobs,30*60*1000):null;
};
$("skillsCloud").innerHTML=PROFILE.skills.map(s=>`<span class="skill-chip">${esc(s)}</span>`).join("");
$("allProjects").innerHTML=PROFILE.projects.map(p=>projectCard({...p,score:100})).join("");
loadPrefs();renderTracker();renderInsights();renderStats();
