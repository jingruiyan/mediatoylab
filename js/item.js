// Item page: renders one object from ?id=..., with previous / next links
// that step through the catalog in the same order as the grid (toys first).

const id = new URLSearchParams(location.search).get("id");
const order = Object.fromEntries(CATEGORIES.map((c, i) => [c.id, i]));
const sorted = [...TOYS].sort((a, b) =>
  order[a.category] - order[b.category] || a.title.localeCompare(b.title));
const index = sorted.findIndex((t) => t.id === id);
const root = document.getElementById("item");

if (index === -1) {
  document.title = "Not found · Media History Lab";
  root.innerHTML = `<p class="empty">Object not found. <a href="index.html">Back to the collection</a>.</p>`;
} else {
  const toy = sorted[index];
  const prev = sorted[(index - 1 + sorted.length) % sorted.length];
  const next = sorted[(index + 1) % sorted.length];
  const catLink = `<a href="index.html?category=${toy.category}">${escapeHtml(categoryName(toy.category))}</a>`;
  document.title = `${toy.title} · Media History Lab`;

  const fields = [
    ["Accession no.", toy.accession],
    ["Type", toy.type],
    ["Date", toy.year],
    ["Maker", toy.maker],
    ["Model", toy.model],
    ["Director", toy.director],
    ["Origin", toy.origin],
    ["Materials", toy.materials],
    ["Size", toy.size],
    ["Length", toy.length],
    ["Parts", toy.parts],
    ["Related media", toy.related],
    ["Credit", toy.credit],
  ].filter(([, v]) => v);

  root.innerHTML = `
    <p class="breadcrumb"><a href="index.html">Collection</a> / ${catLink}</p>
    <article class="item">
      <div class="item-media">${toyImage(toy)}</div>
      <div class="item-body">
        <span class="tag">${catMark(toy.category)}${escapeHtml(categoryName(toy.category))}</span>
        <h1 class="item-title">${escapeHtml(toy.title)}</h1>
        <dl class="item-fields">
          ${fields.map(([k, v]) => `<div><dt>${k}</dt><dd>${escapeHtml(v)}</dd></div>`).join("")}
        </dl>
        ${toy.description ? `<div class="item-desc">${paragraphs(toy.description)}</div>` : ""}
      </div>
    </article>
    <nav class="pager">
      <a href="item.html?id=${encodeURIComponent(prev.id)}"><span class="label">← Previous</span>${escapeHtml(prev.title)}</a>
      <a href="item.html?id=${encodeURIComponent(next.id)}"><span class="label">Next →</span>${escapeHtml(next.title)}</a>
    </nav>`;
}
