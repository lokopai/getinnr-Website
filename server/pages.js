function legacyMainHtml(row) {
  const content = row.content_html || "";
  const toc = row.toc_html ? String(row.toc_html).trim() : "";
  if (!toc || row.layout === "simple") {
    return `<article class="doc-content">${content}</article>`;
  }
  return `<aside class="toc">${row.toc_html}</aside><article class="doc-content">${content}</article>`;
}

function rowToPublic(row) {
  if (!row) return null;
  const main =
    row.main_html && String(row.main_html).trim()
      ? row.main_html
      : legacyMainHtml(row);
  return {
    slug: row.slug,
    html_title: row.html_title,
    kicker: row.kicker,
    h1: row.h1,
    meta_updated: row.meta_updated,
    meta_editor: row.meta_editor,
    main_html: main,
    updated_at: row.updated_at,
  };
}

function getPage(db, slug) {
  const row = db.prepare(`SELECT * FROM pages WHERE slug = ?`).get(slug);
  return rowToPublic(row);
}

function listPages(db) {
  return db
    .prepare(
      `SELECT slug, html_title, kicker, updated_at FROM pages ORDER BY slug ASC`
    )
    .all();
}

module.exports = { rowToPublic, getPage, listPages };
