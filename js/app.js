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

  render();
})();
