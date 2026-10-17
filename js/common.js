// Shared helpers used by every page.

function categoryName(id) {
  const c = CATEGORIES.find((c) => c.id === id);
  return c ? c.name : id;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

// Text with blank lines becomes separate paragraphs.
function paragraphs(text) {
  return String(text || "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("");
}

// Bauhaus mark for a category: circle, square, triangle or half-disc.
function catMark(id) {
  return `<span class="mark cat-${escapeHtml(id)}" aria-hidden="true"></span>`;
}

function toyImage(toy) {
  return `<img src="${escapeHtml(toy.image)}" alt="${escapeHtml(toy.title)}" loading="lazy">`;
}
