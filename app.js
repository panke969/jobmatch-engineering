const PROFILE = {
  categories: {
    "Mechanical Design": ["mechanical design","solidworks","siemens nx","autocad","cad","machine design","fixture","tooling","mechanism"],
    "Mechatronics": ["mechatronics","mechatronic","system integration","integration engineer","multidisciplinary","electromechanical"],
    "Machine Vision": ["machine vision","vision system","vision","sensopart","camera","inspection","image processing"],
    "Field / Service": ["field service","field engineer","commissioning","troubleshooting","customer site","service engineer","sat","installation","maintenance"],
    "PLC / Automation": ["plc","beckhoff","twincat","siemens s7","tia portal","automation","ethercat","vfd","servo","motion control","scada","mitsubishi"],
    "Robotics": ["robotics","robot","abb","fanuc","mitsubishi robot","robotic cell","gripper"],
    "Project / NPI": ["project management","project engineer","npi","requirements engineering","fat","sat","validation","industrialization","stakeholder","project leadership"],
    "Manufacturing": ["cnc","3d printing","rapid prototyping","manufacturing","lean","kaizen","poka-yoke","production engineering"]
  },
  skills: ["Beckhoff","TwinCAT","Siemens S7","Mitsubishi GX Works","ABB","Fanuc","SensoPart","Machine Vision","Servo Systems","VFD","EtherCAT","SolidWorks","Siemens NX","AutoCAD","CAD/CAM","PLC","SCADA","ROS2","C","CNC","3D Printing","Rapid Prototyping","Reverse Engineering","FAT","SAT","Requirements Engineering","Lean","Kaizen","Poka-Yoke","Field Service","Commissioning","Troubleshooting","Retrofit","Reliability"],
  projects: [
    {name:"BMW Multi-Variant Assembly Cell",desc:"Robotics, rapid prototyping, vision inspection and multi-variant automation.",tags:["robotics","machine vision","rapid prototyping","automation","mechanical design","fixture","industry 4.0"]},
    {name:"Grundfos Final QC Test Station",desc:"Multi-variant final inspection using SensoPart vision and precision sensors.",tags:["machine vision","sensopart","inspection","test engineering","sensors","automation"]},
    {name:"Industrial Machine Retrofit",desc:"Mechanical, electrical and control-system retrofit / reliability assessment.",tags:["retrofit","beckhoff","servo","ethercat","reliability","mechanical","electrical","troubleshooting"]},
    {name:"IPC / HMI Reliability Investigation",desc:"Cross-domain root-cause analysis of industrial touchscreen reliability.",tags:["beckhoff","hmi","troubleshooting","root cause","field service","electrical","software"]},
    {name:"Visual Parts Identification System",desc:"Poka-yoke visual compatibility standard for spare-parts management.",tags:["poka-yoke","lean","warehouse","standardization","maintenance"]},
    {name:"Maintenance in the Box",desc:"Aftermarket maintenance concept combining spares, modules and lifecycle planning.",tags:["maintenance","aftermarket","reliability","service","planning"]},
    {name:"Diagnostic Test Station Concept",desc:"Standardized diagnostic platform for repeatable component pass/fail testing.",tags:["diagnostics","testing","standardization","beckhoff","concept development"]}
  ]
};

const state = {
  current: null,
  jobs: JSON.parse(localStorage.getItem("jobmatch_jobs") || "[]")
};

const $ = id => document.getElementById(id);
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const norm=s=>(s||"").toLowerCase().replace(/[–—]/g,"-");

function containsAny(text, arr){ return arr.some(k=>text.includes(k)); }

function scoreCategory(text, terms){
  let hits=0, strong=0;
  terms.forEach(t=>{
    const n=norm(t);
    if(text.includes(n)){hits++; strong += n.includes(" ") ? 1.2 : 1;}
  });
  if(!hits) return 15;
  return clamp(Math.round(38 + strong*13), 15, 100);
}

function detectRisks(text){
  const risks=[];
  if(text.includes("dutch") || text.includes("nederlands")) risks.push("Dutch language may be required or preferred.");
  if(text.includes("tia portal") && !norm(PROFILE.skills.join(" ")).includes("tia portal")) risks.push("Siemens TIA Portal is explicitly requested; profile currently lists Siemens S7 rather than strong TIA Portal evidence.");
  if(/5\+?\s*years.*project|senior project|project lead/.test(text)) risks.push("Project-leadership seniority may need stronger evidence in the CV.");
  if(text.includes("master") && !text.includes("in progress")) risks.push("Check whether a completed Master's degree is mandatory.");
  if(text.includes("dutch driving licence")) risks.push("Verify the specific driving-licence requirement.");
  return risks.slice(0,4);
}

function projectScore(project,text){
  let hits=0;
  project.tags.forEach(t=>{if(text.includes(norm(t))) hits++});
  return clamp(45 + hits*10,45,98);
}

function analyze(){
  const raw=$("jobText").value.trim();
  if(!raw){ alert("Paste a job description first."); return; }
  const text=norm(raw);
  const categoryScores={};
  Object.entries(PROFILE.categories).forEach(([cat,terms])=> categoryScores[cat]=scoreCategory(text,terms));

  // Weighted toward engineering core; language / non-core limitations emerge through risk section.
  const weights={"Mechanical Design":1.1,"Mechatronics":1.3,"Machine Vision":0.9,"Field / Service":1.1,"PLC / Automation":1.25,"Robotics":0.85,"Project / NPI":1.0,"Manufacturing":0.8};
  let ws=0, wsum=0;
  Object.entries(categoryScores).forEach(([k,v])=>{ws+=v*weights[k];wsum+=weights[k]});
  let overall=Math.round(ws/wsum);

  // Reward vacancy/profile keyword density, but do not let keyword stuffing dominate.
  const skillHits=PROFILE.skills.filter(s=>text.includes(norm(s))).length;
  overall=clamp(Math.round(overall*0.82 + clamp(50+skillHits*4,50,94)*0.18),20,98);

  const projects=PROFILE.projects.map(p=>({...p,score:projectScore(p,text)})).sort((a,b)=>b.score-a.score);
  const high=Object.entries(categoryScores).sort((a,b)=>b[1]-a[1]).slice(0,4).map(x=>x[0]);
  const risks=detectRisks(text);
  const fit=`Strongest alignment is in ${high.slice(0,3).join(", ")}. The role overlaps with hands-on engineering, system integration and practical machine-development experience.`;

  state.current={
    company:$("companyInput").value.trim()||"Unknown company",
    role:$("roleInput").value.trim()||"Untitled role",
    location:$("locationInput").value.trim(),
    salary:$("salaryInput").value.trim(),
    text:raw, overall, categoryScores, projects, high, risks,
    analyzed:new Date().toISOString()
  };
  renderCurrent();
  showView("dashboard");
}

function renderCurrent(){
  const c=state.current;
  if(!c) return;
  $("jobTitle").textContent=c.role;
  $("jobCompany").textContent=[c.company,c.location].filter(Boolean).join(" · ");
  $("overallScore").textContent=c.overall+"%";
  $("ring").style.background=`conic-gradient(${c.overall>=80?"#42d469":c.overall>=65?"#ffb42b":"#e55252"} ${c.overall*3.6}deg,#223341 0deg)`;
  $("matchLabel").textContent=c.overall>=85?"Excellent Match":c.overall>=75?"Strong Match":c.overall>=60?"Possible Match":"Weak Match";
  $("matchLabel").style.background=c.overall>=75?"#173d24":c.overall>=60?"#4a3515":"#4a1c1c";
  $("categories").innerHTML=Object.entries(c.categoryScores).map(([k,v])=>{
    const color=v>=80?"#42d469":v>=60?"#ffb42b":"#e55252";
    return `<div class="category"><label>${k}</label><div class="bar"><span style="width:${v}%;background:${color}"></span></div><div class="pct" style="color:${color}">${v}%</div></div>`
  }).join("");
  $("whyFit").textContent=`Strongest alignment is in ${c.high.slice(0,3).join(", ")}. This vacancy overlaps with your multidisciplinary engineering and hands-on machine experience.`;
  $("gaps").innerHTML=(c.risks.length?c.risks:["No obvious hard blocker detected from the current text. Verify mandatory education, language and certification requirements manually."]).map(x=>`<li>${x}</li>`).join("");
  $("highlights").innerHTML=c.projects.slice(0,4).map(p=>`<li>${p.name}</li>`).join("");
  $("projectRecommendations").innerHTML=c.projects.slice(0,3).map(projectCard).join("");
  renderTracker();
  renderInsights();
}

function projectCard(p){
  return `<div class="project"><h4>${p.name}</h4><div class="match">${p.score}% relevance</div><p>${p.desc}</p><div class="tags">${p.tags.slice(0,4).map(t=>`<span class="tag">${t}</span>`).join("")}</div></div>`;
}

function saveCurrent(){
  if(!state.current){ alert("Analyze a job first."); return; }
  const c=state.current;
  const item={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),company:c.company,role:c.role,location:c.location,salary:c.salary,match:c.overall,status:"Saved",next:"Apply",saved:new Date().toLocaleDateString(),text:c.text};
  state.jobs.unshift(item);
  persist();
  renderTracker();
  alert("Saved to Job Tracker.");
}

function persist(){localStorage.setItem("jobmatch_jobs",JSON.stringify(state.jobs));}

function renderTracker(){
  const preview=$("trackerPreview"), full=$("trackerFull");
  const rows=state.jobs.length?state.jobs:[];
  preview.innerHTML=rows.slice(0,4).map(j=>`<tr><td>${esc(j.company)}</td><td>${esc(j.role)}</td><td class="${j.match>=75?"score-good":"score-med"}">${j.match}%</td><td><span class="status">${esc(j.status)}</span></td><td>${esc(j.next)}</td></tr>`).join("") || `<tr><td colspan="5" class="muted">No saved jobs yet.</td></tr>`;
  full.innerHTML=rows.map(j=>`<tr><td>${esc(j.company)}</td><td>${esc(j.role)}</td><td class="${j.match>=75?"score-good":"score-med"}">${j.match}%</td><td>${esc(j.salary||"—")}</td><td><select onchange="updateStatus('${j.id}',this.value)">${["Saved","Applied","Interview","Offer","Rejected","Closed"].map(s=>`<option ${s===j.status?"selected":""}>${s}</option>`).join("")}</select></td><td><input value="${esc(j.next)}" onchange="updateNext('${j.id}',this.value)"></td><td>${j.saved}</td><td><button class="remove-btn" onclick="removeJob('${j.id}')">×</button></td></tr>`).join("") || `<tr><td colspan="8" class="muted">No saved jobs yet.</td></tr>`;
}
window.updateStatus=(id,v)=>{const j=state.jobs.find(x=>x.id===id);if(j){j.status=v;persist();renderTracker();}};
window.updateNext=(id,v)=>{const j=state.jobs.find(x=>x.id===id);if(j){j.next=v;persist();}};
window.removeJob=id=>{state.jobs=state.jobs.filter(x=>x.id!==id);persist();renderTracker();renderInsights();};

function renderInsights(){
  const source=state.jobs.map(j=>norm(j.text)).join(" ");
  const terms=["Project Management","Beckhoff","Machine Vision","Siemens S7","TIA Portal","Robotics","Commissioning","Dutch"];
  const html=terms.map(t=>{
    const needle=norm(t), count=source.split(needle).length-1;
    const pct=state.jobs.length?clamp(Math.round((count/state.jobs.length)*35),5,100):0;
    return `<div class="insight"><div class="insight-row"><span>${t}</span><span>${pct}%</span></div><div class="bar"><span style="width:${pct}%"></span></div></div>`;
  }).join("");
  $("marketInsights").innerHTML=html || `<p class="muted">Save jobs to build market insights.</p>`;
}

function showView(id){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(v=>v.classList.toggle("active",v.dataset.view===id));
  $(id).classList.add("active");
  if(id==="tracker") renderTracker();
}
document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
$("newMatchBtn").onclick=()=>showView("matcher");
$("openMatcherBtn").onclick=()=>showView("matcher");
$("analyzeBtn").onclick=analyze;
$("reanalyzeBtn").onclick=()=>state.current?analyze():showView("matcher");
$("saveJobBtn").onclick=saveCurrent;
$("clearTrackerBtn").onclick=()=>{if(confirm("Clear all saved jobs?")){state.jobs=[];persist();renderTracker();renderInsights();}};
$("copySummaryBtn").onclick=()=>{
  if(!state.current) return;
  const c=state.current;
  navigator.clipboard.writeText(`${c.role} @ ${c.company}\nMatch: ${c.overall}%\nStrong areas: ${c.high.join(", ")}\nProjects: ${c.projects.slice(0,3).map(p=>p.name).join(", ")}`);
};
$("loadSampleBtn").onclick=()=>{
  $("companyInput").value="Example Automation Company";
  $("roleInput").value="Mechatronics Integration Engineer";
  $("locationInput").value="Eindhoven, Netherlands";
  $("salaryInput").value="€65–75k";
  $("jobText").value=`We are seeking a Mechatronics Integration Engineer for complex automated machinery. The role includes mechanical design, system integration, commissioning, troubleshooting, PLC automation, Beckhoff or Siemens S7, servo and motion control, machine vision, FAT/SAT and collaboration with project engineering. Experience with SolidWorks or Siemens NX, robotics and rapid prototyping is preferred. Dutch is preferred but English is the working language. TIA Portal experience is a plus.`;
};
$("skillsCloud").innerHTML=PROFILE.skills.map(s=>`<span class="skill-chip">${s}</span>`).join("");
$("allProjects").innerHTML=PROFILE.projects.map(p=>projectCard({...p,score:100})).join("");
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));}
renderTracker();renderInsights();
