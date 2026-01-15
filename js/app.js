// ===== Active nav highlight =====
(function () {
  const path = (location.pathname.split("/").pop() || "").toLowerCase();
  document.querySelectorAll("[data-nav]").forEach(a => {
    const href = (a.getAttribute("href") || "").toLowerCase();
    if (href === path) a.classList.add("active");
  });
})();

// ===== Simple kanban drag & drop =====
(function () {
  const cards = document.querySelectorAll("[data-card]");
  const zones = document.querySelectorAll("[data-zone]");

  if (!cards.length || !zones.length) return;

  cards.forEach(card => {
    card.setAttribute("draggable", "true");

    card.addEventListener("dragstart", (e) => {
      card.classList.add("dragging");
      e.dataTransfer.setData("text/plain", card.id);
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
    });
  });

  zones.forEach(zone => {
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.classList.add("drag-over");
    });

    zone.addEventListener("dragleave", () => {
      zone.classList.remove("drag-over");
    });

    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("drag-over");

      const id = e.dataTransfer.getData("text/plain");
      const card = document.getElementById(id);
      if (!card) return;

      zone.appendChild(card);
      updateCounts();
    });
  });

  function updateCounts() {
    document.querySelectorAll("[data-col]").forEach(col => {
      const zone = col.querySelector("[data-zone]");
      const count = zone ? zone.children.length : 0;
      const el = col.querySelector("[data-count]");
      if (el) el.textContent = `${count} candidate(s)`;
    });
  }

  updateCounts();
})();
