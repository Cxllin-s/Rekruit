const APP_STORAGE_KEY = "rekruit_app_data_v4";
const AUTH_STORAGE_KEY = "rekruit_auth_v1";

const STAGES = ["Applied", "Screened", "Interview 1", "Interview 2", "Offer", "Placed", "Rejected"];
const JOB_STATUSES = ["Draft", "Active", "On Hold", "Closed"];
const ROLES = ["Super Admin", "Company Admin", "Recruiter", "Hiring Manager", "Finance / HR"];

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
const nowIso = () => new Date().toISOString();

function getInitialData() {
  return { jobs: [], candidates: [], interviews: [], activity: [], users: [], companies: [], applications: [] };
}

function normalizeData(parsed) {
  const d = parsed || {};
  return {
    jobs: Array.isArray(d.jobs) ? d.jobs : [],
    candidates: Array.isArray(d.candidates) ? d.candidates : [],
    interviews: Array.isArray(d.interviews) ? d.interviews : [],
    activity: Array.isArray(d.activity) ? d.activity : [],
    users: Array.isArray(d.users) ? d.users : [],
    companies: Array.isArray(d.companies) ? d.companies : [],
    applications: Array.isArray(d.applications) ? d.applications : []
  };
}

function loadData() {
  const raw = localStorage.getItem(APP_STORAGE_KEY);
  if (!raw) return saveAndReturn(getInitialData());
  try { return normalizeData(JSON.parse(raw)); }
  catch { return saveAndReturn(getInitialData()); }
}
const saveData = (data) => localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(data));
const saveAndReturn = (data) => (saveData(data), data);

function addActivity(data, text) { data.activity.unshift({ id: uid(), text, createdAt: nowIso() }); data.activity = data.activity.slice(0, 120); }
function escapeHtml(v) { return String(v || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function formatDateTime(v) { if (!v) return "-"; const d = new Date(v); return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`; }

function getAuth() { try { return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || "null"); } catch { return null; } }
function setAuth(email) { localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ email, loggedInAt: Date.now(), role: "Super Admin" })); }
function clearAuth() { localStorage.removeItem(AUTH_STORAGE_KEY); }

(function navAndAuth() {
  const page = (location.pathname.split("/").pop() || "login.html").toLowerCase();
  const publicPages = new Set(["login.html", "public-jobs.html", "apply.html", "index.html"]);
  const auth = getAuth();
  if (!publicPages.has(page) && !auth) return void (location.href = "login.html");
  if (page === "login.html" && auth) return void (location.href = "dashboard.html");

  document.querySelectorAll("[data-nav]").forEach((a) => ((a.getAttribute("href") || "").toLowerCase() === page) && a.classList.add("active"));
  document.querySelectorAll("[data-logout]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); clearAuth(); location.href = "login.html"; }));
})();

(function loginPage() {
  const form = document.querySelector("[data-login-form]"); if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "").trim();
    if (!email || !password) return showFlash("Please enter email and password.", "danger");
    setAuth(email); location.href = "dashboard.html";
const STORAGE_KEY = "rekruit_demo_data_v1";

function defaultData() {
  return {
    jobs: [
      { id: uid(), title: "Senior Accountant", client: "BluePeak Holdings", location: "Johannesburg", status: "Active" },
      { id: uid(), title: "HR Administrator", client: "WestCape Logistics", location: "Cape Town", status: "Active" }
    ],
    candidates: [
      { id: uid(), name: "Nthabiseng M.", email: "nthabiseng@example.com", location: "Cape Town", stage: "Applied", skills: "Excel, Payroll" },
      { id: uid(), name: "Providence K.", email: "providence@example.com", location: "Johannesburg", stage: "Screened", skills: "IFRS, Reporting" },
      { id: uid(), name: "Tatenda H.", email: "tatenda@example.com", location: "Pretoria", stage: "Interview", skills: "Sage, Audit" }
    ]
  };
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = defaultData();
    saveData(seeded);
    return seeded;
  }

  try {
    return JSON.parse(raw);
  } catch {
    const seeded = defaultData();
    saveData(seeded);
    return seeded;
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

(function activeNav() {
  const path = (location.pathname.split("/").pop() || "").toLowerCase();
  document.querySelectorAll("[data-nav]").forEach((a) => {
    if ((a.getAttribute("href") || "").toLowerCase() === path) a.classList.add("active");
  });
})();

(function dashboardPage() {
  const jobsBody = document.querySelector("[data-jobs-body]"); if (!jobsBody) return;
  const candidatesBody = document.querySelector("[data-dashboard-candidates-body]");
  const interviewsBody = document.querySelector("[data-interviews-body]");
  const activityBody = document.querySelector("[data-activity-body]");
  const data = loadData();
  const jobForm = document.querySelector("[data-job-form]");
  const candidateForm = document.querySelector("[data-quick-candidate-form]");
  const interviewForm = document.querySelector("[data-interview-form]");

  const setKpi = (k,v)=>{const el=document.querySelector(`[data-kpi="${k}"]`); if(el) el.textContent=v;};
  const jobName = (id)=> (data.jobs.find(j=>j.id===id)||{}).title || "Unassigned";

  function renderJobs(){
    if(!data.jobs.length){ jobsBody.innerHTML='<tr><td colspan="6" class="muted">No jobs yet. Create your first job.</td></tr>'; return; }
    jobsBody.innerHTML=data.jobs.map(j=>`<tr><td>${escapeHtml(j.title)}</td><td>${escapeHtml(j.client)}</td><td>${escapeHtml(j.location)}</td><td><span class="badge ${j.status==='Active'?'ok':'warn'}">${escapeHtml(j.status)}</span></td><td>${data.candidates.filter(c=>c.jobId===j.id).length}</td><td class="actions-cell"><button class="btn small" data-edit-job="${j.id}">Edit</button><button class="btn small danger" data-delete-job="${j.id}">Delete</button><a class="btn small" href="public-jobs.html">Live Link</a></td></tr>`).join('');
  }
  function renderKPIs(){
    setKpi('open-jobs', data.jobs.filter(j=>j.status==='Active').length);
    setKpi('total-jobs', data.jobs.length);
    setKpi('candidates', data.candidates.length);
    setKpi('placements', data.candidates.filter(c=>c.stage==='Placed').length);
  }
  function renderCandidates(){
    if(!candidatesBody) return;
    if(!data.candidates.length){ candidatesBody.innerHTML='<tr><td colspan="5" class="muted">No candidates yet.</td></tr>'; return; }
    candidatesBody.innerHTML=data.candidates.slice(0,8).map(c=>`<tr><td><a class="link" href="candidate-profile.html?id=${c.id}">${escapeHtml(c.name)}</a></td><td>${escapeHtml(c.email)}</td><td>${escapeHtml(c.location)}</td><td>${escapeHtml(c.stage)}</td><td>${escapeHtml(jobName(c.jobId))}</td></tr>`).join('');
  }
  function renderInterviews(){
    if(!interviewsBody) return;
    if(!data.interviews.length){ interviewsBody.innerHTML='<tr><td colspan="6" class="muted">No interviews scheduled.</td></tr>'; return; }
    interviewsBody.innerHTML=data.interviews.sort((a,b)=>new Date(a.when)-new Date(b.when)).slice(0,8).map(i=>{const c=data.candidates.find(x=>x.id===i.candidateId);return `<tr><td>${escapeHtml((c||{}).name||'Deleted')}</td><td>${escapeHtml(jobName(i.jobId))}</td><td>${formatDateTime(i.when)}</td><td>${escapeHtml(i.mode)}</td><td>${escapeHtml(i.interviewer)}</td><td class="actions-cell"><button class="btn small danger" data-delete-interview="${i.id}">Delete</button></td></tr>`}).join('');
  }
  function renderActivity(){
    if(!activityBody) return;
    activityBody.innerHTML = data.activity.length ? data.activity.slice(0,10).map(a=>`<li><span>${escapeHtml(a.text)}</span><small>${formatDateTime(a.createdAt)}</small></li>`).join('') : '<li class="muted left">No activity yet.</li>';
  }
  function refreshInterviewOptions(){
    if(!interviewForm) return;
    const c=interviewForm.querySelector('[name=candidateId]'); const j=interviewForm.querySelector('[name=jobId]');
    if(c) c.innerHTML=['<option value="">Select candidate</option>'].concat(data.candidates.map(x=>`<option value="${x.id}">${escapeHtml(x.name)}</option>`)).join('');
    if(j) j.innerHTML=['<option value="">Optional job</option>'].concat(data.jobs.map(x=>`<option value="${x.id}">${escapeHtml(x.title)}</option>`)).join('');
  }
  function renderAll(){ renderKPIs(); renderJobs(); renderCandidates(); renderInterviews(); renderActivity(); refreshInterviewOptions(); }

  document.querySelector('[data-open-job-form]')?.addEventListener('click',()=>jobForm?.classList.toggle('hidden'));
  document.querySelector('[data-open-candidate-form]')?.addEventListener('click',()=>candidateForm?.classList.toggle('hidden'));

  jobForm?.addEventListener('submit',(e)=>{e.preventDefault(); const fd=new FormData(jobForm); const title=String(fd.get('title')||'').trim(); if(!title) return; data.jobs.unshift({id:uid(), title, client:String(fd.get('client')||'').trim(), location:String(fd.get('location')||'').trim(), status:String(fd.get('status')||'Draft'), salaryRange:String(fd.get('salaryRange')||''), employmentType:String(fd.get('employmentType')||'Permanent'), requiredSkills:String(fd.get('requiredSkills')||'')}); addActivity(data,`Created job: ${title}`); saveData(data); jobForm.reset(); jobForm.classList.add('hidden'); renderAll(); showFlash('Job added.');});

  candidateForm?.addEventListener('submit',(e)=>{e.preventDefault(); const fd=new FormData(candidateForm); const name=String(fd.get('name')||'').trim(); const email=String(fd.get('email')||'').trim(); if(!name||!email) return; data.candidates.unshift({id:uid(), name, email, phone:String(fd.get('phone')||''), location:String(fd.get('location')||''), stage:String(fd.get('stage')||'Applied'), skills:String(fd.get('skills')||''), notes:'', jobId:String(fd.get('jobId')||''), idPassport:'', nationality:'', workPermit:'', beeStatus:'', eeCategory:''}); addActivity(data,`Added candidate: ${name}`); saveData(data); candidateForm.reset(); candidateForm.classList.add('hidden'); renderAll(); showFlash('Candidate added.');});

  interviewForm?.addEventListener('submit',(e)=>{e.preventDefault(); const fd=new FormData(interviewForm); const candidateId=String(fd.get('candidateId')||''); const when=String(fd.get('when')||''); if(!candidateId||!when) return showFlash('Candidate and date required','danger'); data.interviews.unshift({id:uid(), candidateId, jobId:String(fd.get('jobId')||''), when, mode:String(fd.get('mode')||'Virtual'), interviewer:String(fd.get('interviewer')||'TBD')}); addActivity(data,'Interview scheduled'); saveData(data); interviewForm.reset(); renderAll(); showFlash('Interview scheduled.');});

  jobsBody.addEventListener('click',(e)=>{const d=e.target.closest('[data-delete-job]'); if(d){const id=d.dataset.deleteJob; data.jobs=data.jobs.filter(j=>j.id!==id); data.candidates=data.candidates.map(c=>c.jobId===id?{...c,jobId:''}:c); addActivity(data,'Deleted job'); saveData(data); renderAll(); return;} const ed=e.target.closest('[data-edit-job]'); if(!ed) return; const j=data.jobs.find(x=>x.id===ed.dataset.editJob); if(!j) return; const t=prompt('Job title',j.title); if(t===null) return; j.title=t.trim()||j.title; saveData(data); addActivity(data,`Updated job: ${j.title}`); renderAll();});

  interviewsBody?.addEventListener('click',(e)=>{const b=e.target.closest('[data-delete-interview]'); if(!b) return; data.interviews=data.interviews.filter(i=>i.id!==b.dataset.deleteInterview); saveData(data); addActivity(data,'Deleted interview'); renderAll();});

  renderAll();
})();

(function usersPage(){
  const body=document.querySelector('[data-users-body]'); const form=document.querySelector('[data-user-form]'); if(!body||!form) return;
  const data=loadData();
  function render(){ body.innerHTML = data.users.length ? data.users.map(u=>`<tr><td>${escapeHtml(u.name)}</td><td>${escapeHtml(u.email)}</td><td>${escapeHtml(u.role)}</td><td><span class="badge ok">Active</span></td><td class="actions-cell"><button class="btn small danger" data-delete-user="${u.id}">Delete</button></td></tr>`).join('') : '<tr><td colspan="5" class="muted">No users yet.</td></tr>'; }
  form.addEventListener('submit',(e)=>{e.preventDefault(); const fd=new FormData(form); const role=String(fd.get('role')||'Recruiter'); data.users.unshift({id:uid(),name:String(fd.get('name')||'').trim(),email:String(fd.get('email')||'').trim(),role:ROLES.includes(role)?role:'Recruiter'}); addActivity(data,'Created user'); saveData(data); form.reset(); render(); showFlash('User added.');});
  body.addEventListener('click',(e)=>{const b=e.target.closest('[data-delete-user]'); if(!b) return; data.users=data.users.filter(u=>u.id!==b.dataset.deleteUser); saveData(data); addActivity(data,'Deleted user'); render();});
  render();
})();

(function companiesPage(){
  const body=document.querySelector('[data-companies-body]'); const form=document.querySelector('[data-company-form]'); if(!body||!form) return;
  const data=loadData();
  function render(){ body.innerHTML = data.companies.length ? data.companies.map(c=>`<tr><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.industry)}</td><td>${escapeHtml(c.location)}</td><td>${escapeHtml(c.contact||'-')}</td><td><span class="badge ${c.status==='Active'?'ok':'warn'}">${escapeHtml(c.status)}</span></td><td class="actions-cell"><button class="btn small danger" data-delete-company="${c.id}">Delete</button></td></tr>`).join('') : '<tr><td colspan="6" class="muted">No companies yet.</td></tr>'; }
  form.addEventListener('submit',(e)=>{e.preventDefault(); const fd=new FormData(form); const name=String(fd.get('name')||'').trim(); if(!name) return; data.companies.unshift({id:uid(),name,industry:String(fd.get('industry')||''),location:String(fd.get('location')||''),contact:String(fd.get('contact')||''),billing:String(fd.get('billing')||''),status:String(fd.get('status')||'Active'),notes:String(fd.get('notes')||'')}); addActivity(data,`Created company: ${name}`); saveData(data); form.reset(); render(); showFlash('Company saved.');});
  body.addEventListener('click',(e)=>{const b=e.target.closest('[data-delete-company]'); if(!b) return; data.companies=data.companies.filter(c=>c.id!==b.dataset.deleteCompany); saveData(data); addActivity(data,'Deleted company'); render();});
  render();
})();

(function candidatesPage(){
  const body=document.querySelector('[data-candidates-body]'); const form=document.querySelector('[data-candidate-form]'); const search=document.querySelector('[data-candidate-search]'); const assign=document.querySelector('[data-candidate-job]'); if(!body||!form||!search) return;
  const data=loadData();
  const jobOptions=(sel='')=>['<option value="">Unassigned</option>'].concat(data.jobs.map(j=>`<option value="${j.id}" ${sel===j.id?'selected':''}>${escapeHtml(j.title)}</option>`)).join('');
  const stageSelect=(c)=>`<select class="input" data-stage-select="${c.id}">${STAGES.map(s=>`<option ${c.stage===s?'selected':''}>${s}</option>`).join('')}</select>`;
  const jobSelect=(c)=>`<select class="input" data-job-select="${c.id}">${jobOptions(c.jobId||'')}</select>`;
  function render(){assign && (assign.innerHTML=jobOptions()); const q=search.value.trim().toLowerCase(); const rows=data.candidates.filter(c=>[c.name,c.email,c.location,c.skills,c.phone,c.idPassport,c.nationality].join(' ').toLowerCase().includes(q)); body.innerHTML = rows.length ? rows.map(c=>`<tr><td><a class="link" href="candidate-profile.html?id=${c.id}">${escapeHtml(c.name)}</a></td><td>${escapeHtml(c.email)}</td><td>${escapeHtml(c.phone||'-')}</td><td>${escapeHtml(c.location)}</td><td>${stageSelect(c)}</td><td>${jobSelect(c)}</td><td>${escapeHtml(c.skills||'-')}</td><td class="actions-cell"><button class="btn small danger" data-delete-candidate="${c.id}">Delete</button></td></tr>`).join('') : '<tr><td colspan="8" class="muted">No candidates found.</td></tr>'; }
  form.addEventListener('submit',(e)=>{e.preventDefault(); const fd=new FormData(form); const name=String(fd.get('name')||'').trim(); const email=String(fd.get('email')||'').trim(); if(!name||!email) return; data.candidates.unshift({id:uid(),name,email,phone:String(fd.get('phone')||''),location:String(fd.get('location')||''),stage:String(fd.get('stage')||'Applied'),skills:String(fd.get('skills')||''),notes:String(fd.get('notes')||''),jobId:String(fd.get('jobId')||''),idPassport:'',nationality:'',workPermit:'',beeStatus:'',eeCategory:''}); addActivity(data,`Added candidate: ${name}`); saveData(data); form.reset(); render(); showFlash('Candidate added.');});
  search.addEventListener('input',render);
  body.addEventListener('change',(e)=>{const s=e.target.closest('[data-stage-select]'); if(s){const c=data.candidates.find(x=>x.id===s.dataset.stageSelect); if(!c) return; c.stage=s.value; addActivity(data,`Moved ${c.name} to ${c.stage}`); saveData(data); return;} const j=e.target.closest('[data-job-select]'); if(j){const c=data.candidates.find(x=>x.id===j.dataset.jobSelect); if(!c) return; c.jobId=j.value; saveData(data);} });
  body.addEventListener('click',(e)=>{const b=e.target.closest('[data-delete-candidate]'); if(!b) return; data.candidates=data.candidates.filter(c=>c.id!==b.dataset.deleteCandidate); data.applications=data.applications.filter(a=>a.candidateId!==b.dataset.deleteCandidate); saveData(data); addActivity(data,'Deleted candidate'); render();});
  render();
})();

(function candidateProfile(){
  const wrap=document.querySelector('[data-candidate-profile]'); if(!wrap) return;
  const data=loadData(); const id=new URLSearchParams(location.search).get('id')||''; const c=data.candidates.find(x=>x.id===id);
  if(!c){wrap.innerHTML='<div class="card form"><h1>Candidate not found</h1></div>';return;}
  const events=data.activity.filter(a=>a.text.includes(c.name)).slice(0,8);
  wrap.innerHTML=`<div class="card form"><h1>${escapeHtml(c.name)}</h1><p>${escapeHtml(c.email)} • ${escapeHtml(c.phone||'No phone')}</p><div class="grid grid-2"><div class="field"><label>ID / Passport</label><input class="input" data-prof-field="idPassport" value="${escapeHtml(c.idPassport||'')}"/></div><div class="field"><label>Nationality</label><input class="input" data-prof-field="nationality" value="${escapeHtml(c.nationality||'')}"/></div><div class="field"><label>Work permit status</label><input class="input" data-prof-field="workPermit" value="${escapeHtml(c.workPermit||'')}"/></div><div class="field"><label>BEE status</label><input class="input" data-prof-field="beeStatus" value="${escapeHtml(c.beeStatus||'')}"/></div></div><div class="field"><label>EE category</label><input class="input" data-prof-field="eeCategory" value="${escapeHtml(c.eeCategory||'')}"/></div><div class="field"><label>Notes</label><textarea class="input" rows="5" data-prof-field="notes">${escapeHtml(c.notes||'')}</textarea></div><div class="field"><label>Activity</label><ul class="activity-list">${events.length?events.map(a=>`<li><span>${escapeHtml(a.text)}</span><small>${formatDateTime(a.createdAt)}</small></li>`).join(''):'<li class="muted left">No activity yet.</li>'}</ul></div><div class="actions"><button class="btn primary" data-save-profile>Save Profile</button><a class="btn" href="candidates.html">Back</a></div></div>`;
  wrap.querySelector('[data-save-profile]')?.addEventListener('click',()=>{wrap.querySelectorAll('[data-prof-field]').forEach(el=>{c[el.dataset.profField]=el.value.trim();}); addActivity(data,`Updated profile: ${c.name}`); saveData(data); showFlash('Profile updated.');});
})();

(function pipelinePage(){
  const cols=document.querySelectorAll('[data-col]'); if(!cols.length) return; const data=loadData();
  function render(){ cols.forEach(col=>{const stage=col.dataset.stage; const zone=col.querySelector('[data-zone]'); const list=data.candidates.filter(c=>c.stage===stage); zone.innerHTML=list.length?list.map(c=>`<div class="cardlet" id="${c.id}" draggable="true" data-card><div class="name">${escapeHtml(c.name)}</div><div class="meta"><span>${escapeHtml(c.location)}</span><span>${escapeHtml(c.skills||'No skills')}</span></div></div>`).join(''):'<div class="muted small-note">No candidates</div>'; col.querySelector('[data-count]').textContent=`${list.length} candidate(s)`;}); document.querySelectorAll('[data-card]').forEach(card=>card.addEventListener('dragstart',e=>e.dataTransfer.setData('text/plain',card.id))); }
  document.querySelectorAll('[data-zone]').forEach(zone=>{zone.addEventListener('dragover',e=>{e.preventDefault(); zone.classList.add('drag-over');}); zone.addEventListener('dragleave',()=>zone.classList.remove('drag-over')); zone.addEventListener('drop',e=>{e.preventDefault(); zone.classList.remove('drag-over'); const id=e.dataTransfer.getData('text/plain'); const stage=zone.closest('[data-stage]')?.dataset.stage; const c=data.candidates.find(x=>x.id===id); if(!c||!stage) return; c.stage=stage; addActivity(data,`Moved ${c.name} to ${stage}`); saveData(data); render();});}); render();
})();

(function publicJobsPage(){
  const body=document.querySelector('[data-public-jobs-body]'); if(!body) return; const data=loadData();
  const live=data.jobs.filter(j=>j.status==='Active');
  body.innerHTML = live.length ? live.map(j=>`<tr><td>${escapeHtml(j.title)}</td><td>${escapeHtml(j.client||'Company')}</td><td>${escapeHtml(j.location||'-')}</td><td>${escapeHtml(j.employmentType||'Permanent')}</td><td>${escapeHtml(j.salaryRange||'Negotiable')}</td><td><a class="btn small primary" href="apply.html?job=${j.id}">Apply</a></td></tr>`).join('') : '<tr><td colspan="6" class="muted">No live vacancies currently.</td></tr>';
})();

(function applyPage(){
  const form=document.querySelector('[data-public-apply-form]'); if(!form) return; const data=loadData();
  const jobId=new URLSearchParams(location.search).get('job')||'';
  form.addEventListener('submit',(e)=>{e.preventDefault(); const fd=new FormData(form); const name=String(fd.get('name')||'').trim(); const email=String(fd.get('email')||'').trim(); if(!name||!email) return; let candidate=data.candidates.find(c=>c.email.toLowerCase()===email.toLowerCase()); const isDuplicate=Boolean(candidate); if(!candidate){candidate={id:uid(),name,email,phone:String(fd.get('phone')||''),location:String(fd.get('location')||''),stage:'Applied',skills:String(fd.get('skills')||''),notes:'Applied via public job link',jobId,cvLink:String(fd.get('cvLink')||''),idPassport:'',nationality:'',workPermit:'',beeStatus:'',eeCategory:''}; data.candidates.unshift(candidate);} else {candidate.stage='Applied'; if(jobId) candidate.jobId=jobId;}
    data.applications.unshift({id:uid(),jobId,candidateId:candidate.id,source:'Public Job Link',status:'Applied',createdAt:nowIso(),isDuplicate});
    addActivity(data,`${isDuplicate?'Duplicate':'New'} application from ${candidate.name}`); saveData(data); showFlash('Application submitted successfully.'); form.reset();
  const jobsBody = document.querySelector("[data-jobs-body]");
  if (!jobsBody) return;

  const data = loadData();
  const form = document.querySelector("[data-job-form]");

  function badge(status) {
    const cls = status === "Active" ? "ok" : "warn";
    return `<span class="badge ${cls}">${status}</span>`;
  }

  function render() {
    jobsBody.innerHTML = data.jobs.map((job) => `
      <tr>
        <td>${job.title}</td>
        <td>${job.client}</td>
        <td>${job.location}</td>
        <td>${badge(job.status)}</td>
        <td><button class="btn small danger" data-delete-job="${job.id}">Delete</button></td>
      </tr>
    `).join("");

    const stageCount = (stage) => data.candidates.filter((c) => c.stage === stage).length;
    setKpi("open-jobs", data.jobs.filter((j) => j.status === "Active").length);
    setKpi("candidates", data.candidates.length);
    setKpi("interview", stageCount("Interview"));
    setKpi("offer", stageCount("Offer"));
  }

  function setKpi(name, value) {
    const el = document.querySelector(`[data-kpi="${name}"]`);
    if (el) el.textContent = value;
  }

  document.querySelector("[data-open-job-form]")?.addEventListener("click", () => {
    form.classList.toggle("hidden");
  });

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    data.jobs.unshift({
      id: uid(),
      title: fd.get("title"),
      client: fd.get("client"),
      location: fd.get("location"),
      status: "Active"
    });
    saveData(data);
    form.reset();
    form.classList.add("hidden");
    render();
  });

  jobsBody.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-delete-job]");
    if (!btn) return;
    data.jobs = data.jobs.filter((j) => j.id !== btn.dataset.deleteJob);
    saveData(data);
    render();
  });

  render();
})();

(function candidatesPage() {
  const body = document.querySelector("[data-candidates-body]");
  const form = document.querySelector("[data-candidate-form]");
  if (!body || !form) return;

  const data = loadData();

  function stageSelect(candidate) {
    const stages = ["Applied", "Screened", "Interview", "Offer", "Placed", "Rejected"];
    return `<select class="input" data-stage-select="${candidate.id}">${stages
      .map((s) => `<option ${candidate.stage === s ? "selected" : ""}>${s}</option>`)
      .join("")}</select>`;
  }

  function render() {
    body.innerHTML = data.candidates.map((c) => `
      <tr>
        <td>${c.name}</td>
        <td>${c.email}</td>
        <td>${c.location}</td>
        <td>${stageSelect(c)}</td>
        <td>${c.skills || "-"}</td>
        <td><button class="btn small danger" data-delete-candidate="${c.id}">Delete</button></td>
      </tr>
    `).join("");
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    data.candidates.unshift({
      id: uid(),
      name: fd.get("name"),
      email: fd.get("email"),
      location: fd.get("location"),
      stage: fd.get("stage"),
      skills: fd.get("skills")
    });
    saveData(data);
    form.reset();
    render();
  });

  body.addEventListener("change", (e) => {
    const select = e.target.closest("[data-stage-select]");
    if (!select) return;
    const candidate = data.candidates.find((c) => c.id === select.dataset.stageSelect);
    if (!candidate) return;
    candidate.stage = select.value;
    saveData(data);
  });

  body.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-delete-candidate]");
    if (!btn) return;
    data.candidates = data.candidates.filter((c) => c.id !== btn.dataset.deleteCandidate);
    saveData(data);
    render();
  });

  render();
})();

(function pipelinePage() {
  const cols = document.querySelectorAll("[data-col]");
  if (!cols.length) return;

  const data = loadData();
  const zones = document.querySelectorAll("[data-zone]");

  function card(candidate) {
    return `<div class="cardlet" id="${candidate.id}" draggable="true" data-card>
      <div class="name">${candidate.name}</div>
      <div class="meta"><span>${candidate.location}</span><span>${candidate.skills || "Generalist"}</span></div>
    </div>`;
  }

  function render() {
    cols.forEach((col) => {
      const stage = col.dataset.stage;
      const zone = col.querySelector("[data-zone]");
      const list = data.candidates.filter((c) => c.stage === stage);
      zone.innerHTML = list.map(card).join("");
      const count = col.querySelector("[data-count]");
      if (count) count.textContent = `${list.length} candidate(s)`;
    });

    attachDragHandlers();
  }

  function attachDragHandlers() {
    document.querySelectorAll("[data-card]").forEach((el) => {
      el.addEventListener("dragstart", (e) => e.dataTransfer.setData("text/plain", el.id));
    });
  }

  zones.forEach((zone) => {
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.classList.add("drag-over");
    });

    zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));

    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("drag-over");
      const id = e.dataTransfer.getData("text/plain");
      const candidate = data.candidates.find((c) => c.id === id);
      const stage = zone.closest("[data-stage]")?.dataset.stage;
      if (!candidate || !stage) return;
      candidate.stage = stage;
      saveData(data);
      render();
    });
  });
})();

(function settingsPage(){
  const reset=document.querySelector('[data-reset-all]'); const exportBtn=document.querySelector('[data-export]'); const imp=document.querySelector('[data-import-file]'); if(!reset||!exportBtn||!imp) return;
  const data=loadData();
  exportBtn.addEventListener('click',()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`rekruit-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url); showFlash('Backup exported.');});
  imp.addEventListener('change',async()=>{const file=(imp.files||[])[0]; if(!file) return; try{const parsed=normalizeData(JSON.parse(await file.text())); addActivity(parsed,'Imported backup data'); saveData(parsed); showFlash('Backup imported. Refreshing...'); setTimeout(()=>location.reload(),400);}catch{showFlash('Invalid backup file.','danger');}});
  reset.addEventListener('click',()=>{localStorage.removeItem(APP_STORAGE_KEY); showFlash('All records cleared.'); setTimeout(()=>location.reload(),250);});
})();

function showFlash(message, type='ok'){
  let flash=document.querySelector('[data-flash]');
  if(!flash){flash=document.createElement('div'); flash.setAttribute('data-flash',''); flash.className='flash'; document.body.appendChild(flash);} 
  flash.textContent=message; flash.className=`flash ${type}`; flash.classList.add('show'); clearTimeout(showFlash.timer); showFlash.timer=setTimeout(()=>flash.classList.remove('show'),2200);
}

(function applicationsPage(){
  const body=document.querySelector('[data-applications-body]');
  const search=document.querySelector('[data-application-search]');
  if(!body||!search) return;
  const data=loadData();

  function candidateById(id){ return data.candidates.find(c=>c.id===id); }
  function jobById(id){ return data.jobs.find(j=>j.id===id); }

  function render(){
    const q=search.value.trim().toLowerCase();
    const rows=data.applications.filter(a=>{
      const c=candidateById(a.candidateId)||{};
      const j=jobById(a.jobId)||{};
      return [c.name,c.email,j.title,a.source,a.status].join(' ').toLowerCase().includes(q);
    });

    if(!rows.length){ body.innerHTML='<tr><td colspan="7" class="muted">No applications found.</td></tr>'; return; }

    body.innerHTML=rows.map(a=>{
      const c=candidateById(a.candidateId)||{};
      const j=jobById(a.jobId)||{};
      const duplicateCount=data.applications.filter(x=>x.candidateId===a.candidateId).length;
      const dupBadge=duplicateCount>1?'<span class="badge danger">Duplicate</span>':'';
      return `<tr>
        <td>${escapeHtml(c.name||'Unknown')} ${dupBadge}</td>
        <td>${escapeHtml(c.email||'-')}</td>
        <td>${escapeHtml(j.title||'Unassigned')}</td>
        <td>${formatDateTime(a.createdAt)}</td>
        <td>${escapeHtml(a.source||'Direct')}</td>
        <td><select class="input" data-app-status="${a.id}"><option ${a.status==='Applied'?'selected':''}>Applied</option><option ${a.status==='Screening'?'selected':''}>Screening</option><option ${a.status==='Interview'?'selected':''}>Interview</option><option ${a.status==='Offer'?'selected':''}>Offer</option><option ${a.status==='Rejected'?'selected':''}>Rejected</option></select></td>
        <td class="actions-cell"><button class="btn small" data-convert-app="${a.id}">Open Candidate</button></td>
      </tr>`;
    }).join('');
  }

  search.addEventListener('input',render);
  body.addEventListener('change',(e)=>{
    const s=e.target.closest('[data-app-status]'); if(!s) return;
    const app=data.applications.find(a=>a.id===s.dataset.appStatus); if(!app) return;
    app.status=s.value;
    const c=data.candidates.find(x=>x.id===app.candidateId);
    if(c && s.value==='Interview') c.stage='Interview 1';
    if(c && s.value==='Offer') c.stage='Offer';
    if(c && s.value==='Rejected') c.stage='Rejected';
    addActivity(data,`Application status updated to ${app.status}`);
    saveData(data);
  });

  body.addEventListener('click',(e)=>{
    const b=e.target.closest('[data-convert-app]'); if(!b) return;
    const app=data.applications.find(a=>a.id===b.dataset.convertApp); if(!app) return;
    location.href=`candidate-profile.html?id=${app.candidateId}`;
  });

  render();
})();

(function reportsPage(){
  const total=document.querySelector('[data-report="applications"]');
  if(!total) return;
  const data=loadData();
  const interviewRate=document.querySelector('[data-report="interview-rate"]');
  const placements=document.querySelector('[data-report="placements"]');
  const duplicates=document.querySelector('[data-report="duplicates"]');
  const sourcesBody=document.querySelector('[data-report-sources]');

  const apps=data.applications.length;
  const interviewCount=data.candidates.filter(c=>['Interview 1','Interview 2','Offer','Placed'].includes(c.stage)).length;
  const placementCount=data.candidates.filter(c=>c.stage==='Placed').length;
  const emailCounts={};
  data.candidates.forEach(c=>{const k=(c.email||'').toLowerCase(); if(!k) return; emailCounts[k]=(emailCounts[k]||0)+1;});
  const dupCount=Object.values(emailCounts).filter(v=>v>1).length;

  total.textContent=String(apps);
  interviewRate.textContent=`${apps?Math.round((interviewCount/apps)*100):0}%`;
  placements.textContent=String(placementCount);
  duplicates.textContent=String(dupCount);

  const sourceMap={};
  data.applications.forEach(a=>{const s=a.source||'Unknown'; sourceMap[s]=(sourceMap[s]||0)+1;});
  const entries=Object.entries(sourceMap).sort((a,b)=>b[1]-a[1]);
  sourcesBody.innerHTML=entries.length?entries.map(([s,n])=>`<tr><td>${escapeHtml(s)}</td><td>${n}</td></tr>`).join(''):'<tr><td colspan="2" class="muted">No application source data yet.</td></tr>';
  render();
})();
