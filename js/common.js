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

// Drawn stand-in for objects without a photo: the object's initial on a
// toy-block shape, colored by category.
function placeholderSvg(toy) {
  const letter = escapeHtml(toy.title.replace(/^[^a-z0-9]+/i, "").charAt(0).toUpperCase());
  return `<svg class="placeholder cat-${escapeHtml(toy.category)}" viewBox="0 0 100 75" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect x="30" y="15" width="40" height="40" rx="6" class="ph-block"/>
    <rect x="34" y="19" width="32" height="32" rx="3" class="ph-face"/>
    <text x="50" y="36.5" text-anchor="middle" dominant-baseline="central">${letter}</text>
    <text x="50" y="66" text-anchor="middle" class="ph-note">photo coming soon</text>
  </svg>`;
}

function toyImage(toy) {
  return toy.image
    ? `<img src="${escapeHtml(toy.image)}" alt="${escapeHtml(toy.title)}" loading="lazy">`
    : placeholderSvg(toy);
}
