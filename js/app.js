/* Rekruit Frontend Controller (full, clean, no merge-conflicts)
   - Single storage model (tenant + users + data)
   - Auth + route guard
   - Works with your existing HTML pages
   - Ready to swap localStorage calls with API later
*/

const APP_STORAGE_KEY = "rekruit_app_data_v5";
const AUTH_STORAGE_KEY = "rekruit_auth_v2";
const USER_CREDENTIALS_KEY = "rekruit_user_credentials_v2";

/** System enums **/
const STAGES = ["Applied", "Screened", "Interview 1", "Interview 2", "Offer", "Placed", "Rejected"];
const JOB_STATUSES = ["Draft", "Active", "On Hold", "Closed"];
const ROLES = ["Super Admin", "Company Admin", "Recruiter", "Hiring Manager", "Finance / HR", "Candidate"];

/** Utils **/
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const nowIso = () => new Date().toISOString();

function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function formatDateTime(v) {
  if (!v) return "-";
  const d = new Date(v);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

/** Flash **/
function showFlash(message, type = "ok") {
  let flash = document.querySelector("[data-flash]");
  if (!flash) {
    flash = document.createElement("div");
    flash.setAttribute("data-flash", "");
    flash.className = "flash";
    document.body.appendChild(flash);
  }
  flash.textContent = message;
  flash.className = `flash ${type}`;
  flash.classList.add("show");
  clearTimeout(showFlash.timer);
  showFlash.timer = setTimeout(() => flash.classList.remove("show"), 2400);
}

/** Storage (single source of truth) **/
function getInitialData() {
  return {
    tenants: [],          // {id,name,createdAt}
    users: [],            // {id,tenantId,name,email,role,createdAt}
    jobs: [],             // {id,tenantId,title,client,location,status,employmentType,salaryRange,requiredSkills,createdAt}
    candidates: [],       // {id,tenantId,name,email,phone,location,stage,skills,notes,idPassport,nationality,workPermit,beeStatus,eeCategory,jobId,createdAt}
    applications: [],     // {id,tenantId,jobId,candidateId,source,status,createdAt,isDuplicate}
    interviews: [],       // {id,tenantId,candidateId,jobId,when,mode,interviewer,createdAt}
    companies: [],        // legacy page support (if you use it)
    activity: []          // {id,tenantId,text,createdAt}
  };
}

function normalizeData(parsed) {
  const d = parsed || {};
  const base = getInitialData();
  for (const k of Object.keys(base)) base[k] = Array.isArray(d[k]) ? d[k] : base[k];
  return base;
}

function loadData() {
  const raw = localStorage.getItem(APP_STORAGE_KEY);
  if (!raw) return saveAndReturn(getInitialData());
  try { return normalizeData(JSON.parse(raw)); }
  catch { return saveAndReturn(getInitialData()); }
}
function saveData(data) {
  localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(data));
}
function saveAndReturn(data) {
  saveData(data);
  return data;
}

function addActivity(data, tenantId, text) {
  data.activity.unshift({ id: uid(), tenantId, text, createdAt: nowIso() });
  data.activity = data.activity.slice(0, 200);
}

/** Credentials store (for signup/login) **/
function loadCredentials() {
  try {
    const parsed = JSON.parse(localStorage.getItem(USER_CREDENTIALS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function saveCredentials(list) {
  localStorage.setItem(USER_CREDENTIALS_KEY, JSON.stringify(list));
}
function findCredentialByEmail(email) {
  const key = String(email || "").trim().toLowerCase();
  return loadCredentials().find((u) => String(u.email || "").toLowerCase() === key);
}

/** Auth **/
function getAuth() {
  try { return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || "null"); }
  catch { return null; }
}
function setAuth({ email, tenantId, role, userId }) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
    email,
    tenantId,
    role,
    userId,
    loggedInAt: Date.now()
  }));
}
function clearAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

/** Tenant helpers **/
function ensureTenant(data, tenantName) {
  const name = String(tenantName || "").trim();
  if (!name) return null;
  const existing = data.tenants.find(t => t.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing;
  const tenant = { id: uid(), name, createdAt: nowIso() };
  data.tenants.unshift(tenant);
  saveData(data);
  return tenant;
}

/** Nav + route guard **/
(function navAndAuth() {
  const page = (location.pathname.split("/").pop() || "login.html").toLowerCase();
  const publicPages = new Set(["login.html", "signup.html", "public-jobs.html", "apply.html", "index.html"]);

  const auth = getAuth();

  // guard private pages
  if (!publicPages.has(page) && !auth) {
    location.href = "login.html";
    return;
  }

  // already logged in
  if ((page === "login.html" || page === "signup.html") && auth) {
    location.href = "dashboard.html";
    return;
  }

  // active nav highlight
  document.querySelectorAll("[data-nav]").forEach((a) => {
    const href = (a.getAttribute("href") || "").toLowerCase();
    if (href === page) a.classList.add("active");
  });

  // logout
  document.querySelectorAll("[data-logout]").forEach((b) => {
    b.addEventListener("click", (e) => {
      e.preventDefault();
      clearAuth();
      location.href = "login.html";
    });
  });
})();

/** LOGIN **/
(function loginPage() {
  const form = document.querySelector("[data-login-form]");
  if (!form) return;

  const errorBox = document.querySelector("[data-error]");
  const okBox = document.querySelector("[data-ok]");
  const setMsg = (box, msg) => {
    if (!box) return;
    box.textContent = msg;
    box.style.display = msg ? "block" : "none";
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    setMsg(errorBox, "");
    setMsg(okBox, "");

    const fd = new FormData(form);
    const email = String(fd.get("email") || "").trim().toLowerCase();
    const password = String(fd.get("password") || "").trim();

    if (!email || !password) {
      showFlash("Please enter email and password.", "danger");
      setMsg(errorBox, "Please enter email and password.");
      return;
    }

    const account = findCredentialByEmail(email);
    if (!account || account.password !== password) {
      showFlash("Invalid credentials. Please sign up first.", "danger");
      setMsg(errorBox, "Invalid credentials. Please sign up first.");
      return;
    }

    setAuth({ email: account.email, tenantId: account.tenantId, role: account.role, userId: account.userId });
    showFlash("Welcome back.", "ok");
    location.href = "dashboard.html";
  });
})();

/** SIGNUP **/
(function signupPage() {
  const form = document.querySelector("[data-signup-form]");
  if (!form) return;

  const errorBox = document.querySelector("[data-error]");
  const okBox = document.querySelector("[data-ok]");
  const setMsg = (box, msg) => {
    if (!box) return;
    box.textContent = msg;
    box.style.display = msg ? "block" : "none";
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    setMsg(errorBox, "");
    setMsg(okBox, "");

    const fd = new FormData(form);
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim().toLowerCase();
    const company = String(fd.get("company") || "").trim();
    const role = String(fd.get("role") || "Recruiter").trim();
    const password = String(fd.get("password") || "").trim();
    const confirmPassword = String(fd.get("confirmPassword") || "").trim();

    if (!name || !email || !company || !password || !confirmPassword) {
      showFlash("Please complete all fields.", "danger");
      setMsg(errorBox, "Please complete all fields.");
      return;
    }
    if (password.length < 8) {
      showFlash("Password must be at least 8 characters.", "danger");
      setMsg(errorBox, "Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      showFlash("Passwords do not match.", "danger");
      setMsg(errorBox, "Passwords do not match.");
      return;
    }
    if (!ROLES.includes(role)) {
      showFlash("Invalid role selected.", "danger");
      setMsg(errorBox, "Invalid role selected.");
      return;
    }
    if (findCredentialByEmail(email)) {
      showFlash("Account already exists. Please login.", "danger");
      setMsg(errorBox, "Account already exists. Please login.");
      return;
    }

    const data = loadData();
    const tenant = ensureTenant(data, company);
    if (!tenant) {
      showFlash("Company name is required.", "danger");
      setMsg(errorBox, "Company name is required.");
      return;
    }

    // create user
    const userId = uid();
    data.users.unshift({ id: userId, tenantId: tenant.id, name, email, role, createdAt: nowIso() });

    addActivity(data, tenant.id, `Workspace created: ${tenant.name}`);
    addActivity(data, tenant.id, `User signed up: ${name} (${role})`);
    saveData(data);

    // store credential (frontend only for now)
    const creds = loadCredentials();
    creds.push({ id: uid(), tenantId: tenant.id, userId, name, email, password, role, createdAt: nowIso() });
    saveCredentials(creds);

    showFlash("Workspace created. Redirecting to login…", "ok");
    setMsg(okBox, "Workspace created. Redirecting to login…");

    setTimeout(() => { location.href = "login.html"; }, 600);
  });
})();

/** Shared tenant-aware data getter */
function getTenantDataOrRedirect() {
  const auth = getAuth();
  if (!auth || !auth.tenantId) {
    location.href = "login.html";
    return null;
  }
  const data = loadData();
  return { auth, data, tenantId: auth.tenantId };
}

/** DASHBOARD **/
(function dashboardPage() {
  const jobsBody = document.querySelector("[data-jobs-body]");
  if (!jobsBody) return;

  const ctx = getTenantDataOrRedirect();
  if (!ctx) return;
  const { data, tenantId } = ctx;

  const candidatesBody = document.querySelector("[data-dashboard-candidates-body]");
  const interviewsBody = document.querySelector("[data-interviews-body]");
  const activityBody = document.querySelector("[data-activity-body]");

  const jobForm = document.querySelector("[data-job-form]");
  const quickCandidateForm = document.querySelector("[data-quick-candidate-form]");
  const interviewForm = document.querySelector("[data-interview-form]");

  const tJobs = () => data.jobs.filter(j => j.tenantId === tenantId);
  const tCandidates = () => data.candidates.filter(c => c.tenantId === tenantId);
  const tInterviews = () => data.interviews.filter(i => i.tenantId === tenantId);
  const tActivity = () => data.activity.filter(a => a.tenantId === tenantId);

  const setKpi = (k, v) => {
    const el = document.querySelector(`[data-kpi="${k}"]`);
    if (el) el.textContent = String(v);
  };
  const jobName = (id) => (data.jobs.find(j => j.id === id && j.tenantId === tenantId) || {}).title || "Unassigned";

  function renderKPIs() {
    const jobs = tJobs();
    const candidates = tCandidates();
    setKpi("open-jobs", jobs.filter(j => j.status === "Active").length);
    setKpi("total-jobs", jobs.length);
    setKpi("candidates", candidates.length);
    setKpi("placements", candidates.filter(c => c.stage === "Placed").length);
  }

  function renderJobs() {
    const jobs = tJobs();
    if (!jobs.length) {
      jobsBody.innerHTML = `<tr><td colspan="6" class="muted">No jobs yet. Create your first job.</td></tr>`;
      return;
    }
    jobsBody.innerHTML = jobs.map(j => `
      <tr>
        <td>${escapeHtml(j.title)}</td>
        <td>${escapeHtml(j.client)}</td>
        <td>${escapeHtml(j.location)}</td>
        <td><span class="badge ${j.status === "Active" ? "ok" : "warn"}">${escapeHtml(j.status)}</span></td>
        <td>${tCandidates().filter(c => c.jobId === j.id).length}</td>
        <td class="actions-cell">
          <button class="btn small" data-edit-job="${j.id}">Edit</button>
          <button class="btn small danger" data-delete-job="${j.id}">Delete</button>
          <a class="btn small" href="public-jobs.html">Live Link</a>
        </td>
      </tr>
    `).join("");
  }

  function renderCandidates() {
    if (!candidatesBody) return;
    const candidates = tCandidates();
    if (!candidates.length) {
      candidatesBody.innerHTML = `<tr><td colspan="5" class="muted">No candidates yet.</td></tr>`;
      return;
    }
    candidatesBody.innerHTML = candidates.slice(0, 8).map(c => `
      <tr>
        <td><a class="link" href="candidate-profile.html?id=${c.id}">${escapeHtml(c.name)}</a></td>
        <td>${escapeHtml(c.email)}</td>
        <td>${escapeHtml(c.location)}</td>
        <td>${escapeHtml(c.stage)}</td>
        <td>${escapeHtml(jobName(c.jobId))}</td>
      </tr>
    `).join("");
  }

  function refreshInterviewOptions() {
    if (!interviewForm) return;
    const cSel = interviewForm.querySelector('[name="candidateId"]');
    const jSel = interviewForm.querySelector('[name="jobId"]');

    if (cSel) {
      cSel.innerHTML = ['<option value="">Select candidate</option>']
        .concat(tCandidates().map(x => `<option value="${x.id}">${escapeHtml(x.name)}</option>`))
        .join("");
    }
    if (jSel) {
      jSel.innerHTML = ['<option value="">Optional job</option>']
        .concat(tJobs().map(x => `<option value="${x.id}">${escapeHtml(x.title)}</option>`))
        .join("");
    }
  }

  function renderInterviews() {
    if (!interviewsBody) return;
    const interviews = tInterviews();
    if (!interviews.length) {
      interviewsBody.innerHTML = `<tr><td colspan="6" class="muted">No interviews scheduled.</td></tr>`;
      return;
    }
    interviewsBody.innerHTML = interviews
      .slice()
      .sort((a, b) => new Date(a.when) - new Date(b.when))
      .slice(0, 10)
      .map(i => {
        const c = data.candidates.find(x => x.id === i.candidateId && x.tenantId === tenantId);
        return `
          <tr>
            <td>${escapeHtml((c || {}).name || "Deleted")}</td>
            <td>${escapeHtml(jobName(i.jobId))}</td>
            <td>${formatDateTime(i.when)}</td>
            <td>${escapeHtml(i.mode)}</td>
            <td>${escapeHtml(i.interviewer)}</td>
            <td class="actions-cell"><button class="btn small danger" data-delete-interview="${i.id}">Delete</button></td>
          </tr>
        `;
      }).join("");
  }

  function renderActivity() {
    if (!activityBody) return;
    const acts = tActivity();
    activityBody.innerHTML = acts.length
      ? acts.slice(0, 10).map(a => `<li><span>${escapeHtml(a.text)}</span><small>${formatDateTime(a.createdAt)}</small></li>`).join("")
      : `<li class="muted left">No activity yet.</li>`;
  }

  function renderAll() {
    renderKPIs();
    renderJobs();
    renderCandidates();
    refreshInterviewOptions();
    renderInterviews();
    renderActivity();
  }

  document.querySelector('[data-open-job-form]')?.addEventListener("click", () => jobForm?.classList.toggle("hidden"));
  document.querySelector('[data-open-candidate-form]')?.addEventListener("click", () => quickCandidateForm?.classList.toggle("hidden"));

  jobForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(jobForm);
    const title = String(fd.get("title") || "").trim();
    if (!title) return;

    data.jobs.unshift({
      id: uid(),
      tenantId,
      title,
      client: String(fd.get("client") || "").trim(),
      location: String(fd.get("location") || "").trim(),
      status: String(fd.get("status") || "Draft"),
      employmentType: String(fd.get("employmentType") || "Permanent"),
      salaryRange: String(fd.get("salaryRange") || ""),
      requiredSkills: String(fd.get("requiredSkills") || ""),
      createdAt: nowIso()
    });

    addActivity(data, tenantId, `Created job: ${title}`);
    saveData(data);
    jobForm.reset();
    jobForm.classList.add("hidden");
    renderAll();
    showFlash("Job added.", "ok");
  });

  quickCandidateForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(quickCandidateForm);
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    if (!name || !email) return;

    data.candidates.unshift({
      id: uid(),
      tenantId,
      name,
      email,
      phone: String(fd.get("phone") || ""),
      location: String(fd.get("location") || ""),
      stage: String(fd.get("stage") || "Applied"),
      skills: String(fd.get("skills") || ""),
      notes: "",
      jobId: "",
      idPassport: "",
      nationality: "",
      workPermit: "",
      beeStatus: "",
      eeCategory: "",
      createdAt: nowIso()
    });

    addActivity(data, tenantId, `Added candidate: ${name}`);
    saveData(data);
    quickCandidateForm.reset();
    quickCandidateForm.classList.add("hidden");
    renderAll();
    showFlash("Candidate added.", "ok");
  });

  interviewForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(interviewForm);
    const candidateId = String(fd.get("candidateId") || "");
    const when = String(fd.get("when") || "");
    if (!candidateId || !when) return showFlash("Candidate and date required.", "danger");

    data.interviews.unshift({
      id: uid(),
      tenantId,
      candidateId,
      jobId: String(fd.get("jobId") || ""),
      when,
      mode: String(fd.get("mode") || "Virtual"),
      interviewer: String(fd.get("interviewer") || "TBD"),
      createdAt: nowIso()
    });

    addActivity(data, tenantId, "Interview scheduled");
    saveData(data);
    interviewForm.reset();
    renderAll();
    showFlash("Interview scheduled.", "ok");
  });

  jobsBody.addEventListener("click", (e) => {
    const del = e.target.closest("[data-delete-job]");
    if (del) {
      const id = del.dataset.deleteJob;
      data.jobs = data.jobs.filter(j => !(j.id === id && j.tenantId === tenantId));
      data.candidates = data.candidates.map(c => (c.tenantId === tenantId && c.jobId === id) ? { ...c, jobId: "" } : c);
      addActivity(data, tenantId, "Deleted job");
      saveData(data);
      renderAll();
      return;
    }

    const ed = e.target.closest("[data-edit-job]");
    if (!ed) return;
    const job = data.jobs.find(j => j.id === ed.dataset.editJob && j.tenantId === tenantId);
    if (!job) return;
    const t = prompt("Job title", job.title);
    if (t === null) return;
    job.title = t.trim() || job.title;
    saveData(data);
    addActivity(data, tenantId, `Updated job: ${job.title}`);
    renderAll();
  });

  interviewsBody?.addEventListener("click", (e) => {
    const b = e.target.closest("[data-delete-interview]");
    if (!b) return;
    data.interviews = data.interviews.filter(i => !(i.id === b.dataset.deleteInterview && i.tenantId === tenantId));
    saveData(data);
    addActivity(data, tenantId, "Deleted interview");
    renderAll();
  });

  renderAll();
})();

/** CANDIDATES **/
(function candidatesPage() {
  const body = document.querySelector("[data-candidates-body]");
  const form = document.querySelector("[data-candidate-form]");
  const search = document.querySelector("[data-candidate-search]");
  const assign = document.querySelector("[data-candidate-job]");
  if (!body || !form || !search) return;

  const ctx = getTenantDataOrRedirect();
  if (!ctx) return;
  const { data, tenantId } = ctx;

  const tJobs = () => data.jobs.filter(j => j.tenantId === tenantId);
  const tCandidates = () => data.candidates.filter(c => c.tenantId === tenantId);

  const jobOptions = (sel = "") =>
    ['<option value="">Unassigned</option>']
      .concat(tJobs().map(j => `<option value="${j.id}" ${sel === j.id ? "selected" : ""}>${escapeHtml(j.title)}</option>`))
      .join("");

  const stageSelect = (c) =>
    `<select class="input" data-stage-select="${c.id}">
      ${STAGES.map(s => `<option ${c.stage === s ? "selected" : ""}>${s}</option>`).join("")}
    </select>`;

  const jobSelect = (c) =>
    `<select class="input" data-job-select="${c.id}">${jobOptions(c.jobId || "")}</select>`;

  function render() {
    if (assign) assign.innerHTML = jobOptions();

    const q = search.value.trim().toLowerCase();
    const rows = tCandidates().filter(c =>
      [c.name, c.email, c.location, c.skills, c.phone, c.idPassport, c.nationality]
        .join(" ").toLowerCase().includes(q)
    );

    body.innerHTML = rows.length
      ? rows.map(c => `
          <tr>
            <td><a class="link" href="candidate-profile.html?id=${c.id}">${escapeHtml(c.name)}</a></td>
            <td>${escapeHtml(c.email)}</td>
            <td>${escapeHtml(c.phone || "-")}</td>
            <td>${escapeHtml(c.location || "-")}</td>
            <td>${stageSelect(c)}</td>
            <td>${jobSelect(c)}</td>
            <td>${escapeHtml(c.skills || "-")}</td>
            <td class="actions-cell"><button class="btn small danger" data-delete-candidate="${c.id}">Delete</button></td>
          </tr>
        `).join("")
      : `<tr><td colspan="8" class="muted">No candidates found.</td></tr>`;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    if (!name || !email) return;

    data.candidates.unshift({
      id: uid(),
      tenantId,
      name,
      email,
      phone: String(fd.get("phone") || "").trim(),
      location: String(fd.get("location") || "").trim(),
      stage: String(fd.get("stage") || "Applied").trim(),
      skills: String(fd.get("skills") || "").trim(),
      notes: String(fd.get("notes") || "").trim(),
      jobId: String(fd.get("jobId") || "").trim(),
      idPassport: String(fd.get("idPassport") || "").trim(),
      nationality: String(fd.get("nationality") || "").trim(),
      workPermit: String(fd.get("workPermit") || "").trim(),
      beeStatus: String(fd.get("beeStatus") || "").trim(),
      eeCategory: String(fd.get("eeCategory") || "").trim(),
      noticePeriod: String(fd.get("noticePeriod") || "").trim(),
      availability: String(fd.get("availability") || "").trim(),
      salaryExpectation: String(fd.get("salaryExpectation") || "").trim(),
      currentRole: String(fd.get("currentRole") || "").trim(),
      yearsExperience: String(fd.get("yearsExperience") || "").trim(),
      industry: String(fd.get("industry") || "").trim(),
      contactMethod: String(fd.get("contactMethod") || "").trim(),
      profileLink: String(fd.get("profileLink") || "").trim(),
      tags: String(fd.get("tags") || "").trim(),
      talentPool: String(fd.get("talentPool") || "").trim(),
      consentNote: String(fd.get("consentNote") || "").trim(),
      rtwStatus: String(fd.get("rtwStatus") || "").trim(),
      cvLink: String(fd.get("cvLink") || String(fd.get("profileLink") || "")).trim(),
      createdAt: nowIso()
    });

    addActivity(data, tenantId, `Added candidate: ${name}`);
    saveData(data);
    form.reset();
    render();
    showFlash("Candidate added.", "ok");
  });

  search.addEventListener("input", render);

  body.addEventListener("change", (e) => {
    const s = e.target.closest("[data-stage-select]");
    if (s) {
      const c = data.candidates.find(x => x.id === s.dataset.stageSelect && x.tenantId === tenantId);
      if (!c) return;
      c.stage = s.value;
      addActivity(data, tenantId, `Moved ${c.name} to ${c.stage}`);
      saveData(data);
      return;
    }

    const j = e.target.closest("[data-job-select]");
    if (j) {
      const c = data.candidates.find(x => x.id === j.dataset.jobSelect && x.tenantId === tenantId);
      if (!c) return;
      c.jobId = j.value;
      saveData(data);
    }
  });

  body.addEventListener("click", (e) => {
    const b = e.target.closest("[data-delete-candidate]");
    if (!b) return;
    const id = b.dataset.deleteCandidate;

    data.candidates = data.candidates.filter(c => !(c.id === id && c.tenantId === tenantId));
    data.applications = data.applications.filter(a => !(a.candidateId === id && a.tenantId === tenantId));
    saveData(data);
    addActivity(data, tenantId, "Deleted candidate");
    render();
  });

  render();
})();

/** CANDIDATE PROFILE **/
(function candidateProfile() {
  const wrap = document.querySelector("[data-candidate-profile]");
  if (!wrap) return;

  const ctx = getTenantDataOrRedirect();
  if (!ctx) return;
  const { data, tenantId } = ctx;

  const id = new URLSearchParams(location.search).get("id") || "";
  const c = data.candidates.find(x => x.id === id && x.tenantId === tenantId);

  if (!c) {
    wrap.innerHTML = `<div class="card form"><h1>Candidate not found</h1><a class="btn" href="candidates.html">Back</a></div>`;
    return;
  }

  const events = data.activity.filter(a => a.tenantId === tenantId && a.text.includes(c.name)).slice(0, 12);

  wrap.innerHTML = `
    <div class="card form">
      <h1>${escapeHtml(c.name)}</h1>
      <p>${escapeHtml(c.email)} • ${escapeHtml(c.phone || "No phone")} • <span class="badge">${escapeHtml(c.stage)}</span></p>

      <div class="grid grid-2">
        <div class="field"><label>ID / Passport</label><input class="input" data-prof-field="idPassport" value="${escapeHtml(c.idPassport || "")}"/></div>
        <div class="field"><label>Nationality</label><input class="input" data-prof-field="nationality" value="${escapeHtml(c.nationality || "")}"/></div>
        <div class="field"><label>Work permit status</label><input class="input" data-prof-field="workPermit" value="${escapeHtml(c.workPermit || "")}"/></div>
        <div class="field"><label>BEE status</label><input class="input" data-prof-field="beeStatus" value="${escapeHtml(c.beeStatus || "")}"/></div>
      </div>

      <div class="field"><label>Employment Equity category</label><input class="input" data-prof-field="eeCategory" value="${escapeHtml(c.eeCategory || "")}"/></div>

      <div class="field"><label>Skills</label><input class="input" data-prof-field="skills" value="${escapeHtml(c.skills || "")}"/></div>

      <div class="field"><label>Notes</label><textarea class="input" rows="5" data-prof-field="notes">${escapeHtml(c.notes || "")}</textarea></div>

      <div class="field">
        <label>Activity</label>
        <ul class="activity-list">
          ${events.length ? events.map(a => `<li><span>${escapeHtml(a.text)}</span><small>${formatDateTime(a.createdAt)}</small></li>`).join("") : `<li class="muted left">No activity yet.</li>`}
        </ul>
      </div>

      <div class="actions">
        <button class="btn primary" data-save-profile>Save Profile</button>
        <a class="btn" href="candidates.html">Back</a>
      </div>
    </div>
  `;

  wrap.querySelector("[data-save-profile]")?.addEventListener("click", () => {
    wrap.querySelectorAll("[data-prof-field]").forEach(el => {
      c[el.dataset.profField] = String(el.value || "").trim();
    });
    addActivity(data, tenantId, `Updated profile: ${c.name}`);
    saveData(data);
    showFlash("Profile updated.", "ok");
  });
})();

/** PIPELINE **/
(function pipelinePage() {
  const cols = document.querySelectorAll("[data-col]");
  if (!cols.length) return;

  const ctx = getTenantDataOrRedirect();
  if (!ctx) return;
  const { data, tenantId } = ctx;

  function render() {
    cols.forEach(col => {
      const stage = col.dataset.stage;
      const zone = col.querySelector("[data-zone]");
      const list = data.candidates.filter(c => c.tenantId === tenantId && c.stage === stage);

      zone.innerHTML = list.length
        ? list.map(c => `
            <div class="cardlet" id="${c.id}" draggable="true" data-card>
              <div class="name">${escapeHtml(c.name)}</div>
              <div class="meta">
                <span>${escapeHtml(c.location || "-")}</span>
                <span>${escapeHtml(c.skills || "No skills")}</span>
              </div>
            </div>
          `).join("")
        : `<div class="muted small-note">No candidates</div>`;

      const countEl = col.querySelector("[data-count]");
      if (countEl) countEl.textContent = `${list.length} candidate(s)`;
    });

    document.querySelectorAll("[data-card]").forEach(card => {
      card.addEventListener("dragstart", (e) => e.dataTransfer.setData("text/plain", card.id));
    });
  }

  document.querySelectorAll("[data-zone]").forEach(zone => {
    zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("drag-over"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("drag-over");

      const id = e.dataTransfer.getData("text/plain");
      const stage = zone.closest("[data-stage]")?.dataset.stage;
      const c = data.candidates.find(x => x.id === id && x.tenantId === tenantId);
      if (!c || !stage) return;

      c.stage = stage;
      addActivity(data, tenantId, `Moved ${c.name} to ${stage}`);
      saveData(data);
      render();
      showFlash("Stage updated.", "ok");
    });
  });

  render();
})();

/** PUBLIC JOBS **/
(function publicJobsPage() {
  const body = document.querySelector("[data-public-jobs-body]");
  if (!body) return;

  const data = loadData();
  // public = all tenants (later will be tenant-specific job board domains)
  const live = data.jobs.filter(j => j.status === "Active");

  body.innerHTML = live.length
    ? live.map(j => `
      <tr>
        <td>${escapeHtml(j.title)}</td>
        <td>${escapeHtml(j.client || "Company")}</td>
        <td>${escapeHtml(j.location || "-")}</td>
        <td>${escapeHtml(j.employmentType || "Permanent")}</td>
        <td>${escapeHtml(j.salaryRange || "Negotiable")}</td>
        <td><a class="btn small primary" href="apply.html?job=${j.id}">Apply</a></td>
      </tr>
    `).join("")
    : `<tr><td colspan="6" class="muted">No live vacancies currently.</td></tr>`;
})();

/** APPLY **/
(function applyPage() {
  const form = document.querySelector("[data-public-apply-form]");
  if (!form) return;

  const data = loadData();
  const jobId = new URLSearchParams(location.search).get("job") || "";
  const job = data.jobs.find(j => j.id === jobId);
  const jobCard = document.querySelector("[data-apply-job]");

  if (jobCard) {
    jobCard.innerHTML = job
      ? `<h1>${escapeHtml(job.title)}</h1>
         <p>${escapeHtml(job.client || "Company")} • ${escapeHtml(job.location || "-")} • ${escapeHtml(job.employmentType || "Permanent")}</p>
         <small>Salary: ${escapeHtml(job.salaryRange || "Negotiable")}</small>`
      : `<h1>Job unavailable</h1><p class="muted">This job link is invalid or no longer active. Please return to the jobs page.</p>`;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);

    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    if (!name || !email || !job) return showFlash("Missing required fields.", "danger");

    const tenantId = job.tenantId;
    let candidate = data.candidates.find(c => c.tenantId === tenantId && (c.email || "").toLowerCase() === email.toLowerCase());
    const isDuplicate = Boolean(candidate);

    if (!candidate) {
      candidate = {
        id: uid(),
        tenantId,
        name,
        email,
        phone: String(fd.get("phone") || "").trim(),
        location: String(fd.get("location") || "").trim(),
        stage: "Applied",
        skills: String(fd.get("skills") || "").trim(),
        notes: "Applied via public job link",
        jobId,
        idPassport: "",
        nationality: "",
        workPermit: "",
        beeStatus: "",
        eeCategory: "",
        cvLink: String(fd.get("cvLink") || "").trim(),
        createdAt: nowIso()
      };
      data.candidates.unshift(candidate);
    } else {
      candidate.stage = "Applied";
      candidate.jobId = jobId;
      candidate.phone = candidate.phone || String(fd.get("phone") || "").trim();
      candidate.location = candidate.location || String(fd.get("location") || "").trim();
      candidate.skills = candidate.skills || String(fd.get("skills") || "").trim();
      candidate.cvLink = candidate.cvLink || String(fd.get("cvLink") || "").trim();
      candidate.notes = [candidate.notes, "Applied via public job link"].filter(Boolean).join(" | ");
    }

    data.applications.unshift({
      id: uid(),
      tenantId,
      jobId,
      candidateId: candidate.id,
      source: "Public Job Link",
      status: "Applied",
      createdAt: nowIso(),
      isDuplicate
    });

    addActivity(data, tenantId, `${isDuplicate ? "Duplicate" : "New"} application from ${candidate.name}`);
    saveData(data);
    showFlash("Application submitted successfully.", "ok");
    form.reset();
  });
})();

/** APPLICATIONS **/
(function applicationsPage() {
  const body = document.querySelector("[data-applications-body]");
  const search = document.querySelector("[data-application-search]");
  if (!body || !search) return;

  const ctx = getTenantDataOrRedirect();
  if (!ctx) return;
  const { data, tenantId } = ctx;

  function candidateById(id) {
    return data.candidates.find(c => c.id === id && c.tenantId === tenantId);
  }
  function jobById(id) {
    return data.jobs.find(j => j.id === id && j.tenantId === tenantId);
  }

  function render() {
    const q = search.value.trim().toLowerCase();
    const rows = data.applications
      .filter(a => a.tenantId === tenantId)
      .filter(a => {
        const c = candidateById(a.candidateId) || {};
        const j = jobById(a.jobId) || {};
        return [c.name, c.email, j.title, a.source, a.status].join(" ").toLowerCase().includes(q);
      });

    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="7" class="muted">No applications found.</td></tr>`;
      return;
    }

    body.innerHTML = rows.map(a => {
      const c = candidateById(a.candidateId) || {};
      const j = jobById(a.jobId) || {};
      const duplicateCount = data.applications.filter(x => x.tenantId === tenantId && x.candidateId === a.candidateId).length;
      const dupBadge = duplicateCount > 1 ? `<span class="badge danger">Duplicate</span>` : "";

      return `
        <tr>
          <td>${escapeHtml(c.name || "Unknown")} ${dupBadge}</td>
          <td>${escapeHtml(c.email || "-")}</td>
          <td>${escapeHtml(j.title || "Unassigned")}</td>
          <td>${formatDateTime(a.createdAt)}</td>
          <td>${escapeHtml(a.source || "Direct")}</td>
          <td>
            <select class="input" data-app-status="${a.id}">
              ${["Applied", "Screening", "Interview", "Offer", "Rejected"].map(s => `<option ${a.status === s ? "selected" : ""}>${s}</option>`).join("")}
            </select>
          </td>
          <td class="actions-cell"><a class="btn small" href="candidate-profile.html?id=${a.candidateId}">Open</a></td>
        </tr>
      `;
    }).join("");
  }

  search.addEventListener("input", render);

  body.addEventListener("change", (e) => {
    const s = e.target.closest("[data-app-status]");
    if (!s) return;

    const app = data.applications.find(a => a.id === s.dataset.appStatus && a.tenantId === tenantId);
    if (!app) return;

    app.status = s.value;

    const c = data.candidates.find(x => x.id === app.candidateId && x.tenantId === tenantId);
    if (c) {
      if (s.value === "Interview") c.stage = "Interview 1";
      if (s.value === "Offer") c.stage = "Offer";
      if (s.value === "Rejected") c.stage = "Rejected";
    }

    addActivity(data, tenantId, `Application status updated to ${app.status}`);
    saveData(data);
    showFlash("Application updated.", "ok");
  });

  render();
})();

/** COMPANIES **/
(function companiesPage() {
  const body = document.querySelector("[data-companies-body]");
  const form = document.querySelector("[data-company-form]");
  if (!body || !form) return;

  const ctx = getTenantDataOrRedirect();
  if (!ctx) return;
  const { data, tenantId } = ctx;

  const tCompanies = () => data.companies.filter(c => c.tenantId === tenantId);

  function render() {
    const rows = tCompanies();
    body.innerHTML = rows.length
      ? rows.map(c => `
          <tr>
            <td>${escapeHtml(c.name)}</td>
            <td>${escapeHtml(c.industry || "-")}</td>
            <td>${escapeHtml(c.location || "-")}</td>
            <td>${escapeHtml(c.contact || "-")}</td>
            <td><span class="badge ${c.status === "Active" ? "ok" : "warn"}">${escapeHtml(c.status || "-")}</span></td>
            <td class="actions-cell"><button class="btn small danger" data-delete-company="${c.id}">Delete</button></td>
          </tr>
        `).join("")
      : `<tr><td colspan="6" class="muted">No companies added yet.</td></tr>`;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = String(fd.get("name") || "").trim();
    if (!name) return;

    data.companies.unshift({
      id: uid(),
      tenantId,
      name,
      industry: String(fd.get("industry") || "").trim(),
      location: String(fd.get("location") || "").trim(),
      contact: String(fd.get("contact") || "").trim(),
      billing: String(fd.get("billing") || "").trim(),
      status: String(fd.get("status") || "Active").trim(),
      notes: String(fd.get("notes") || "").trim(),
      createdAt: nowIso()
    });

    addActivity(data, tenantId, `Saved company: ${name}`);
    saveData(data);
    form.reset();
    render();
    showFlash("Company saved.", "ok");
  });

  body.addEventListener("click", (e) => {
    const b = e.target.closest("[data-delete-company]");
    if (!b) return;

    data.companies = data.companies.filter(c => !(c.id === b.dataset.deleteCompany && c.tenantId === tenantId));
    addActivity(data, tenantId, "Deleted company");
    saveData(data);
    render();
  });

  render();
})();

/** USERS **/
(function usersPage() {
  const body = document.querySelector("[data-users-body]");
  const form = document.querySelector("[data-user-form]");
  if (!body || !form) return;

  const ctx = getTenantDataOrRedirect();
  if (!ctx) return;
  const { data, tenantId } = ctx;

  const tUsers = () => data.users.filter(u => u.tenantId === tenantId);

  function render() {
    const rows = tUsers();
    body.innerHTML = rows.length
      ? rows.map(u => `
          <tr>
            <td>${escapeHtml(u.name)}</td>
            <td>${escapeHtml(u.email)}</td>
            <td>${escapeHtml(u.role)}</td>
            <td><span class="badge ok">Active</span></td>
            <td class="actions-cell"><button class="btn small danger" data-delete-user="${u.id}">Delete</button></td>
          </tr>
        `).join("")
      : `<tr><td colspan="5" class="muted">No users in this workspace yet.</td></tr>`;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim().toLowerCase();
    const role = String(fd.get("role") || "Recruiter").trim();
    if (!name || !email) return;
    if (!ROLES.includes(role)) return showFlash("Invalid role selected.", "danger");

    const exists = data.users.some(u => u.tenantId === tenantId && u.email.toLowerCase() === email);
    if (exists) return showFlash("User with this email already exists.", "danger");

    const userId = uid();
    data.users.unshift({ id: userId, tenantId, name, email, role, createdAt: nowIso() });

    const creds = loadCredentials();
    const existingCredential = creds.find((u) => String(u.email || "").toLowerCase() === email);

    if (!existingCredential) {
      const tempPassword = `welcome-${Math.random().toString(36).slice(2, 8)}`;
      creds.push({
        id: uid(),
        tenantId,
        userId,
        name,
        email,
        password: tempPassword,
        role,
        createdAt: nowIso()
      });
      saveCredentials(creds);
      showFlash(`User added. Temporary password: ${tempPassword}`, "ok");
    } else {
      showFlash("User added.", "ok");
    }

    addActivity(data, tenantId, `Added user: ${name} (${role})`);
    saveData(data);
    form.reset();
    render();
  });

  body.addEventListener("click", (e) => {
    const b = e.target.closest("[data-delete-user]");
    if (!b) return;

    const user = data.users.find(u => u.id === b.dataset.deleteUser && u.tenantId === tenantId);
    if (!user) return;

    const auth = getAuth();
    if (auth && auth.userId === user.id) {
      showFlash("You cannot remove the currently logged-in user.", "danger");
      return;
    }

    data.users = data.users.filter(u => !(u.id === user.id && u.tenantId === tenantId));
    const creds = loadCredentials().filter((u) => !(u.userId === user.id || String(u.email || "").toLowerCase() === user.email.toLowerCase()));
    saveCredentials(creds);
    addActivity(data, tenantId, `Deleted user: ${user.name}`);
    saveData(data);
    render();
  });

  render();
})();

/** REPORTS **/
(function reportsPage() {
  const total = document.querySelector('[data-report="applications"]');
  if (!total) return;

  const ctx = getTenantDataOrRedirect();
  if (!ctx) return;
  const { data, tenantId } = ctx;

  const interviewRate = document.querySelector('[data-report="interview-rate"]');
  const placements = document.querySelector('[data-report="placements"]');
  const duplicates = document.querySelector('[data-report="duplicates"]');
  const sourcesBody = document.querySelector("[data-report-sources]");

  const apps = data.applications.filter(a => a.tenantId === tenantId).length;

  const interviewCount = data.candidates
    .filter(c => c.tenantId === tenantId && ["Interview 1", "Interview 2", "Offer", "Placed"].includes(c.stage)).length;

  const placementCount = data.candidates.filter(c => c.tenantId === tenantId && c.stage === "Placed").length;

  const emailCounts = {};
  data.candidates.filter(c => c.tenantId === tenantId).forEach(c => {
    const k = (c.email || "").toLowerCase();
    if (!k) return;
    emailCounts[k] = (emailCounts[k] || 0) + 1;
  });
  const dupCount = Object.values(emailCounts).filter(v => v > 1).length;

  total.textContent = String(apps);
  interviewRate.textContent = `${apps ? Math.round((interviewCount / apps) * 100) : 0}%`;
  placements.textContent = String(placementCount);
  duplicates.textContent = String(dupCount);

  const sourceMap = {};
  data.applications.filter(a => a.tenantId === tenantId).forEach(a => {
    const s = a.source || "Unknown";
    sourceMap[s] = (sourceMap[s] || 0) + 1;
  });

  const entries = Object.entries(sourceMap).sort((a, b) => b[1] - a[1]);
  if (sourcesBody) {
    sourcesBody.innerHTML = entries.length
      ? entries.map(([s, n]) => `<tr><td>${escapeHtml(s)}</td><td>${n}</td></tr>`).join("")
      : `<tr><td colspan="2" class="muted">No application source data yet.</td></tr>`;
  }
})();

/** SETTINGS **/
(function settingsPage() {
  const reset = document.querySelector("[data-reset-all]");
  const exportBtn = document.querySelector("[data-export]");
  const imp = document.querySelector("[data-import-file]");
  if (!reset || !exportBtn || !imp) return;

  const ctx = getTenantDataOrRedirect();
  if (!ctx) return;
  const { data, tenantId } = ctx;

  exportBtn.addEventListener("click", () => {
    const tenantExport = {
      tenantId,
      exportedAt: nowIso(),
      users: data.users.filter(u => u.tenantId === tenantId),
      jobs: data.jobs.filter(j => j.tenantId === tenantId),
      candidates: data.candidates.filter(c => c.tenantId === tenantId),
      applications: data.applications.filter(a => a.tenantId === tenantId),
      interviews: data.interviews.filter(i => i.tenantId === tenantId),
      activity: data.activity.filter(a => a.tenantId === tenantId),
    };

    const blob = new Blob([JSON.stringify(tenantExport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rekruit-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showFlash("Backup exported.", "ok");
  });

  imp.addEventListener("change", async () => {
    const file = (imp.files || [])[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      // Minimal safety: only merge tenant-scoped records
      const incomingTenantId = parsed.tenantId || tenantId;

      if (incomingTenantId !== tenantId) {
        showFlash("Backup is for a different workspace.", "danger");
        return;
      }

      const mergeArrays = (key) => {
        if (!Array.isArray(parsed[key])) return;
        // replace tenant data
        data[key] = data[key].filter(x => x.tenantId !== tenantId).concat(parsed[key]);
      };

      mergeArrays("users");
      mergeArrays("jobs");
      mergeArrays("candidates");
      mergeArrays("applications");
      mergeArrays("interviews");
      mergeArrays("activity");

      saveData(data);
      showFlash("Backup imported. Refreshing…", "ok");
      setTimeout(() => location.reload(), 500);
    } catch {
      showFlash("Invalid backup file.", "danger");
    }
  });

  reset.addEventListener("click", () => {
    // clear tenant records only
    data.users = data.users.filter(x => x.tenantId !== tenantId);
    data.jobs = data.jobs.filter(x => x.tenantId !== tenantId);
    data.candidates = data.candidates.filter(x => x.tenantId !== tenantId);
    data.applications = data.applications.filter(x => x.tenantId !== tenantId);
    data.interviews = data.interviews.filter(x => x.tenantId !== tenantId);
    data.activity = data.activity.filter(x => x.tenantId !== tenantId);

    saveData(data);
    showFlash("Workspace cleared (this browser only).", "ok");
    setTimeout(() => location.href = "login.html", 600);
  });
})();
