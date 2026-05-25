const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

/** Évite dépendance circulaire migrate → seed pendant le chargement initial */
function stripScriptsLocal(html) {
  return String(html || "").replace(/<\s*script\b[^>]*>[\s\S]*?<\/\s*script\s*>/gi, "");
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function migratePagesMainHtml(db) {
  const names = db.prepare(`PRAGMA table_info(pages)`).all().map((c) => c.name);
  if (names.includes("main_html")) return;

  db.exec(`ALTER TABLE pages ADD COLUMN main_html TEXT`);

  const legacyFromRow = (r) => {
    const content = r.content_html || "";
    const toc = r.toc_html ? String(r.toc_html).trim() : "";
    if (!toc || r.layout === "simple") {
      return `<article class="doc-content">${content}</article>`;
    }
    return `<aside class="toc">${r.toc_html}</aside><article class="doc-content">${content}</article>`;
  };

  const rows = db.prepare(`SELECT slug, toc_html, content_html, layout FROM pages`).all();
  const upd = db.prepare(`UPDATE pages SET main_html = ? WHERE slug = ?`);
  db.transaction(() => {
    for (const r of rows) {
      upd.run(stripScriptsLocal(legacyFromRow(r)), r.slug);
    }
  })();
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      admin_id INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY (admin_id) REFERENCES admins(id)
    );

    CREATE TABLE IF NOT EXISTS pages (
      slug TEXT PRIMARY KEY,
      html_title TEXT NOT NULL,
      kicker TEXT NOT NULL,
      h1 TEXT NOT NULL,
      meta_updated TEXT,
      meta_editor TEXT,
      toc_html TEXT,
      content_html TEXT NOT NULL DEFAULT '',
      layout TEXT NOT NULL DEFAULT 'legal',
      main_html TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS demo_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      email TEXT NOT NULL,
      studio TEXT NOT NULL,
      telephone TEXT,
      message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_exp ON sessions(expires_at);
  `);

  migratePagesMainHtml(db);
  migrateSiteKv(db);
}

function migrateSiteKv(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS site_kv (
      k TEXT PRIMARY KEY NOT NULL,
      v TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  const has = db.prepare(`SELECT 1 AS x FROM site_kv WHERE k = 'landing_sections'`).get();
  if (!has) {
    db.prepare(`
      INSERT INTO site_kv (k, v)
      VALUES (
        'landing_sections',
        '{"nav":true,"hero":true,"approche":true,"apercu":true,"produit":true,"demo":true,"footer":true}'
      )
    `).run();
  }
  const hasLegalLinks = db
    .prepare(`SELECT 1 AS x FROM site_kv WHERE k = 'legal_footer_links'`)
    .get();
  if (!hasLegalLinks) {
    db.prepare(`
      INSERT INTO site_kv (k, v)
      VALUES (
        'legal_footer_links',
        '{"mentions-legales":true,"confidentialite":true,"cgu":true,"cgv":true,"contact":true}'
      )
    `).run();
  }
}

function openDatabase(dbPathRelative) {
  const raw = String(dbPathRelative || "./data/site.db").trim();

  /** Ne pas passer par path.join : sinon `:memory:` devient un fichier disque `./:memory:`. */
  let resolved;
  if (raw === ":memory:") {
    resolved = ":memory:";
  } else if (path.isAbsolute(raw)) {
    resolved = raw;
  } else {
    resolved = path.join(__dirname, "..", raw);
  }

  const inMemory = resolved === ":memory:";
  if (!inMemory) {
    ensureDir(path.dirname(resolved));
  }

  const db = new Database(resolved);
  db.pragma("journal_mode = WAL");
  migrate(db);
  return db;
}

module.exports = { openDatabase };
