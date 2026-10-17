// Catalog page: category filter, search, and grid / A–Z index views.
// State lives in the URL (?category=toys&q=atari&view=index) so views can be linked.
// The unfiltered grid is grouped by category in CATEGORIES order, so toys come first.

const params = new URLSearchParams(location.search);
const state = {
  category: params.get("category") || "all",
  q: params.get("q") || "",
  view: params.get("view") === "index" ? "index" : "grid",
};

const els = {
  filters: document.getElementById("filters"),
  search: document.getElementById("search"),
  results: document.getElementById("results"),
  count: document.getElementById("count"),
  viewButtons: document.querySelectorAll("[data-view]"),
};

const categoryOrder = Object.fromEntries(CATEGORIES.map((c, i) => [c.id, i]));
const byCategoryThenTitle = (a, b) =>
  categoryOrder[a.category] - categoryOrder[b.category] || a.title.localeCompare(b.title);

function matches(toy) {
  if (state.category !== "all" && toy.category !== state.category) return false;
  if (!state.q) return true;
  const hay = [toy.title, toy.maker, toy.model, toy.year, toy.origin, toy.type,
    toy.accession, toy.director, toy.description].join(" ").toLowerCase();
  return state.q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
}

function syncUrl() {
  const p = new URLSearchParams();
  if (state.category !== "all") p.set("category", state.category);
  if (state.q) p.set("q", state.q);
  if (state.view !== "grid") p.set("view", state.view);
  const qs = p.toString();
  history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
}

function renderFilters() {
  const all = [{ id: "all", name: "Everything", count: TOYS.length }].concat(
    CATEGORIES.map((c) => ({ ...c, count: TOYS.filter((t) => t.category === c.id).length }))
  );
  els.filters.innerHTML = all.map((c) => `
    <button class="filter${c.id === state.category ? " is-active" : ""}" data-category="${c.id}">
      ${c.id === "all" ? "" : catMark(c.id)}${escapeHtml(c.name)} <span class="filter-count">${c.count}</span>
    </button>`).join("");
}

function cardMeta(t) {
  return [t.year, t.maker].filter(Boolean).map(escapeHtml).join(" · ");
}

function renderGrid(items) {
  return `<ul class="grid">${items.map((t) => `
    <li>
      <a class="card" href="item.html?id=${encodeURIComponent(t.id)}">
        <div class="card-media">${toyImage(t)}</div>
        <div class="card-body">
          <span class="tag">${catMark(t.category)}${escapeHtml(categoryName(t.category))}</span>
          <h3 class="card-title">${escapeHtml(t.title)}</h3>
          <p class="card-meta">${cardMeta(t)}</p>
        </div>
      </a>
    </li>`).join("")}</ul>`;
}

function renderGroupedGrid(items) {
  return CATEGORIES.map((c) => {
    const group = items.filter((t) => t.category === c.id);
    if (!group.length) return "";
    return `<section class="shelf shelf-${c.id}">
      <div class="shelf-head">
        <h2>${catMark(c.id)}${escapeHtml(c.name)}</h2>
        <button class="shelf-link" data-category="${c.id}">See all ${group.length} →</button>
      </div>
      ${renderGrid(c.id === "toys" ? group : group.slice(0, 8))}
    </section>`;
  }).join("");
}

function renderIndex(items) {
  const groups = {};
  [...items].sort((a, b) => a.title.localeCompare(b.title)).forEach((t) => {
    const letter = /[a-z]/i.test(t.title[0]) ? t.title[0].toUpperCase() : "#";
    (groups[letter] ||= []).push(t);
  });
  return `<div class="index">${Object.keys(groups).sort().map((letter) => `
    <section class="index-group">
      <h2 class="index-letter">${letter}</h2>
      <ul class="index-list">${groups[letter].map((t) => `
        <li><a href="item.html?id=${encodeURIComponent(t.id)}">
          <span class="index-title">${escapeHtml(t.title)}</span>
          <span class="index-meta">${catMark(t.category)}${escapeHtml(categoryName(t.category))}${t.year ? " · " + escapeHtml(t.year) : ""}</span>
        </a></li>`).join("")}
      </ul>
    </section>`).join("")}</div>`;
}

function render() {
  const items = TOYS.filter(matches).sort(byCategoryThenTitle);
  els.count.textContent = `${items.length} object${items.length === 1 ? "" : "s"}`;
  let html;
  if (!items.length) html = `<p class="empty">No objects match “${escapeHtml(state.q)}”.</p>`;
  else if (state.view === "index") html = renderIndex(items);
  else if (state.category === "all" && !state.q) html = renderGroupedGrid(items);
  else html = renderGrid(items);
  els.results.innerHTML = html;
  els.viewButtons.forEach((b) => b.classList.toggle("is-active", b.dataset.view === state.view));
  renderFilters();
  syncUrl();
}

function selectCategory(e) {
  const btn = e.target.closest("[data-category]");
  if (!btn) return;
  state.category = btn.dataset.category;
  render();
  if (e.currentTarget === els.results) els.filters.scrollIntoView({ behavior: "smooth" });
}
els.filters.addEventListener("click", selectCategory);
els.results.addEventListener("click", selectCategory);

els.search.value = state.q;
els.search.addEventListener("input", () => {
  state.q = els.search.value.trim();
  render();
});

els.viewButtons.forEach((b) => b.addEventListener("click", () => {
  state.view = b.dataset.view;
  render();
}));

render();
