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
  let score=18, hits=0;
  terms.forEach(t=>{
    const k=norm(t);
    if(text.includes(k)){hits++;score+=k.includes(" ")?16:11}
  });
  return clamp(Math.round(score),18,100);
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
  const categoryScores={};
  Object.entries(PROFILE.categories).forEach(([cat,terms])=>categoryScores[cat]=scoreCategory(text,terms));
  const weights={"Mechanical Design":1.08,"Mechatronics":1.25,"Machine Vision":.88,"Field / Service":1.08,"PLC / Automation":1.22,"Robotics":.8,"Project / NPI":.98,"Manufacturing":.78};
  let ws=0,wt=0;Object.entries(categoryScores).forEach(([k,v])=>{ws+=v*weights[k];wt+=weights[k]});
  let overall=Math.round(ws/wt);

  const evidence=buildEvidence(text);
  overall=Math.round(overall*.84+clamp(45+evidence.length*5,45,95)*.16);

  const language=detectLanguage(text);
  if(state.prefs.english){
    if(language==="Dutch") overall-=12;
    if(dutchMandatory(text)) overall-=22;
  }
  const ex=excludedHit(text);
  if(ex) overall-=25;
  if(meta.salary_min && state.prefs.salary && meta.salary_min<state.prefs.salary) overall-=5;
  overall=clamp(overall,10,98);

  const projects=PROFILE.projects.map(p=>({...p,score:projectScore(p,text)})).sort((a,b)=>b.score-a.score);
  const high=Object.entries(categoryScores).sort((a,b)=>b[1]-a[1]).slice(0,4).map(x=>x[0]);
  return {overall,categoryScores,projects,high,risks:detectRisks(text,meta.salary_min),requirements:extractRequirements(raw),evidence,language,excluded:ex};
}

function analyze(){
  const raw=$("jobText").value.trim();
  if(!raw){alert("Paste a job description first.");return;}
  const score=scoreJob(raw);
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
  const q=$("searchQuery").value.trim(), where=$("searchLocation").value.trim();
  const age=$("searchAge").value, count=$("searchCount").value;
  if(!q){showNotice("Enter a role or keyword.",true);return;}
  $("findJobsBtn").disabled=true;$("findJobsBtn").textContent="Searching…";
  showNotice("Searching latest vacancies and scoring them against your profile…");
  try{
    const params=new URLSearchParams({q,where,age,count,country:state.prefs.country});
    const res=await fetch(`/api/jobs?${params}`);
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||"Job API request failed");
    $("apiState").textContent="Live API connected";
    $("apiState").style.color="#42d469";
    state.searchResults=(data.results||[]).map(j=>decorateFeedJob(j)).filter(j=>!j.filteredOut).sort((a,b)=>b.match-a.match);
    renderSearchResults();
    showNotice(`Loaded ${data.results?.length||0} live jobs; ${state.searchResults.length} passed your local filters.`);
  }catch(e){
    $("apiState").textContent="API setup needed";
    $("apiState").style.color="#ffb42b";
    showNotice(`${e.message}. Add ADZUNA_APP_ID and ADZUNA_APP_KEY in Vercel Environment Variables, then redeploy. You can use “Load Demo Feed” meanwhile.`,true);
  }finally{
    $("findJobsBtn").disabled=false;$("findJobsBtn").textContent="Search & Score Jobs";
  }
}

function decorateFeedJob(j){
  const raw=[j.title,j.description,j.company,j.location].filter(Boolean).join("\n");
  const scored=scoreJob(raw,j);
  const salary=fmtSalary(j.salary_min,j.salary_max);
  const filteredOut=Boolean(scored.excluded)||(state.prefs.english&&scored.language==="Dutch"&&dutchMandatory(norm(raw)))||(j.salary_min&&state.prefs.salary&&j.salary_min<state.prefs.salary*.82);
  return {...j,...scored,match:scored.overall,salary,filteredOut};
}

function renderSearchResults(){
  $("resultCount").textContent=`${state.searchResults.length} jobs`;
  $("jobResults").innerHTML=state.searchResults.length?state.searchResults.map((j,i)=>`
    <div class="job-result">
      <div class="job-score ${scoreClass(j.match)}">${j.match}%</div>
      <div>
        <h4>${esc(j.title)}</h4>
        <div class="meta">${esc(j.company||"Unknown company")} · ${esc(j.location||"Netherlands")} · ${esc(j.salary)} · ${esc(j.language)}</div>
        <p>${esc((j.description||"").slice(0,260))}${(j.description||"").length>260?"…":""}</p>
      </div>
      <div class="job-actions">
        <button class="primary small-btn" onclick="analyzeFeed(${i})">Analyze</button>
        <button class="ghost small-btn" onclick="saveFeed(${i})">Save</button>
        ${j.url?`<button class="ghost small-btn" onclick="window.open('${esc(j.url)}','_blank','noopener')">Open</button>`:""}
      </div>
    </div>`).join(""):`<p class="muted">No jobs passed your current filters.</p>`;
}
window.analyzeFeed=i=>{
  const j=state.searchResults[i];if(!j)return;
  state.current={company:j.company||"Unknown company",role:j.title,location:j.location||"",salary:j.salary,source:j.url||"",text:j.description||j.title,...scoreJob(j.description||j.title,j),analyzed:new Date().toISOString()};
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
    {title:"Mechatronics Integration Engineer",company:"Demo High-Tech Systems",location:"Eindhoven, Netherlands",salary_min:68000,salary_max:78000,url:"",created:new Date().toISOString(),description:"English working environment. Integration of complex mechatronic machinery. Commissioning, troubleshooting, Beckhoff PLC, servo motion, machine vision, FAT and SAT. SolidWorks or Siemens NX and robotics experience preferred."},
    {title:"Automation Project Engineer",company:"Demo Motion BV",location:"Utrecht, Netherlands",salary_min:65000,salary_max:74000,url:"",created:new Date().toISOString(),description:"Project engineering for industrial automation. PLC, Siemens S7, servo drives, commissioning, requirements engineering and customer support. TIA Portal preferred. Dutch is a plus, English required."},
    {title:"Senior Machine Engineer",company:"Demo Manufacturing",location:"Rotterdam, Netherlands",salary_min:72000,salary_max:82000,url:"",created:new Date().toISOString(),description:"Mechanical machine design, CAD, SolidWorks, reliability, retrofit, supplier coordination and prototype validation. Five years experience in multidisciplinary machine projects required."}
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
  $("searchLocation").value=state.prefs.location;
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
