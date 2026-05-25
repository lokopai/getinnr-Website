require("dotenv").config();

const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");

const { openDatabase } = require("./db");
const { seedPages, ensureAdmin, stripScripts } = require("./seed");
const { requireAuth, createSession, destroySession } = require("./auth");
const { getPage, listPages } = require("./pages");
const {
  SECTION_KEYS,
  LABELS_FR,
  getLandingSections,
  upsertLandingSections,
} = require("./landing-sections");
const {
  LEGAL_LINK_KEYS,
  LEGAL_LINK_LABELS_FR,
  getLegalFooterLinks,
  upsertLegalFooterLinks,
} = require("./legal-links");

const ROOT = path.join(__dirname, "..");

const SESSION_SECRET_OPT = process.env.SESSION_SECRET;
if (!SESSION_SECRET_OPT && process.env.NODE_ENV === "production") {
  console.warn(
    "[getInnr] Avertissement: définissez SESSION_SECRET en production (.env ou variables Vercel)."
  );
}

/** Sur Vercel le FS projet est en lecture seule ; par défaut on utilise `/tmp` si aucun chemin n’est fourni. */
function resolveDatabasePath() {
  const explicit = process.env.DATABASE_PATH && String(process.env.DATABASE_PATH).trim();
  if (explicit) return explicit;
  if (process.env.VERCEL) return "/tmp/site.db";
  return "./data/site.db";
}

const dbPath = resolveDatabasePath();
const db = openDatabase(dbPath);

seedPages(db);

const adminUser = process.env.ADMIN_USERNAME || "admin";
const adminPass = process.env.ADMIN_PASSWORD || "changeme";
ensureAdmin(db, adminUser, adminPass);

const app = express();

if (process.env.VERCEL) {
  app.set("trust proxy", 1);
}

app.disable("x-powered-by");
app.use(cookieParser());
app.use(express.json({ limit: "512kb" }));
app.use(express.urlencoded({ extended: true }));

// --- APIs publiques ---

app.get("/api/public/pages/:slug", (req, res) => {
  const page = getPage(db, req.params.slug);
  if (!page) {
    res.status(404).json({ error: "Page inconnue" });
    return;
  }
  res.json(page);
});

app.post("/api/public/demo-request", (req, res) => {
  const { nom, email, studio, telephone, message } = req.body || {};
  if (!nom || !String(nom).trim()) {
    res.status(400).json({ error: "Nom requis" });
    return;
  }
  if (!email || !/\S+@\S+\.\S+/.test(String(email))) {
    res.status(400).json({ error: "Email invalide" });
    return;
  }
  if (!studio || !String(studio).trim()) {
    res.status(400).json({ error: "Studio requis" });
    return;
  }

  db.prepare(
    `
    INSERT INTO demo_requests (nom, email, studio, telephone, message)
    VALUES (@nom, @email, @studio, @telephone, @message)
  `
  ).run({
    nom: String(nom).trim(),
    email: String(email).trim(),
    studio: String(studio).trim(),
    telephone: telephone ? String(telephone).trim() : null,
    message: message ? String(message).trim() : null,
  });

  res.json({ ok: true });
});

app.get("/api/public/landing-sections", (_req, res) => {
  res.json({ sections: getLandingSections(db) });
});

app.get("/api/public/legal-footer-links", (_req, res) => {
  res.json({ links: getLegalFooterLinks(db) });
});

// --- Authentification admin ---

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  const u = typeof username === "string" ? username.trim() : "";
  const p = typeof password === "string" ? password : "";

  const row = db.prepare(`SELECT id, username, password_hash FROM admins WHERE username = ?`).get(u);
  if (!row || !bcrypt.compareSync(p, row.password_hash)) {
    res.status(401).json({ error: "Identifiants invalides" });
    return;
  }

  createSession(db, row.id, res);
  res.json({ ok: true, username: row.username });
});

app.post("/api/auth/logout", (req, res) => {
  destroySession(db, req, res);
  res.json({ ok: true });
});

app.get("/api/auth/me", (req, res) => {
  const token = req.cookies?.session;
  if (!token) {
    res.json({ user: null });
    return;
  }
  const now = Date.now();
  const row = db
    .prepare(
      `
    SELECT s.admin_id AS id, a.username
    FROM sessions s
    JOIN admins a ON a.id = s.admin_id
    WHERE s.token = ? AND s.expires_at > ?
  `
    )
    .get(token, now);

  if (!row) {
    res.json({ user: null });
    return;
  }
  res.json({ user: { id: row.id, username: row.username } });
});

// --- APIs admin protégées ---

const guard = requireAuth(db);

app.get("/api/admin/pages", guard, (req, res) => {
  res.json(listPages(db));
});

app.get("/api/admin/pages/:slug", guard, (req, res) => {
  const page = getPage(db, req.params.slug);
  if (!page) {
    res.status(404).json({ error: "Page inconnue" });
    return;
  }
  res.json(page);
});

app.put("/api/admin/pages/:slug", guard, (req, res) => {
  const slug = req.params.slug;
  const existing = db.prepare(`SELECT slug FROM pages WHERE slug = ?`).get(slug);
  if (!existing) {
    res.status(404).json({ error: "Page inconnue" });
    return;
  }

  const body = req.body || {};
  let mainHtml = stripScripts(String(body.main_html ?? "").trim());
  if (!mainHtml) {
    mainHtml = '<article class="doc-content"></article>';
  }

  const hasTocAside = /<aside\b[^>]*\bclass="[^"]*\btoc\b/.test(mainHtml);
  const layout = hasTocAside ? "legal" : "simple";

  db.prepare(
    `
    UPDATE pages SET
      html_title = @html_title,
      kicker = @kicker,
      h1 = @h1,
      meta_updated = @meta_updated,
      meta_editor = @meta_editor,
      layout = @layout,
      toc_html = '',
      content_html = '',
      main_html = @main_html,
      updated_at = datetime('now')
    WHERE slug = @slug
  `
  ).run({
    html_title: String(body.html_title || "").trim() || slug,
    kicker: String(body.kicker || "").trim(),
    h1: String(body.h1 || "").trim(),
    meta_updated: String(body.meta_updated || "").trim() || "",
    meta_editor: String(body.meta_editor || "").trim() || "",
    layout,
    main_html: mainHtml,
    slug,
  });

  res.json(getPage(db, slug));
});

app.get("/api/admin/demo-requests", guard, (_req, res) => {
  const rows = db
    .prepare(
      `
    SELECT id, nom, email, studio, telephone, message, created_at
    FROM demo_requests
    ORDER BY id DESC
    LIMIT 200
  `
    )
    .all();
  res.json(rows);
});

app.get("/api/admin/landing-sections", guard, (_req, res) => {
  res.json({
    sections: getLandingSections(db),
    keys: SECTION_KEYS,
    labels: LABELS_FR,
  });
});

app.put("/api/admin/landing-sections", guard, (req, res) => {
  const body = req.body || {};
  const merged = upsertLandingSections(db, body.sections || body);
  res.json({ sections: merged });
});

app.get("/api/admin/legal-footer-links", guard, (_req, res) => {
  res.json({
    links: getLegalFooterLinks(db),
    keys: LEGAL_LINK_KEYS,
    labels: LEGAL_LINK_LABELS_FR,
  });
});

app.put("/api/admin/legal-footer-links", guard, (req, res) => {
  const body = req.body || {};
  const merged = upsertLegalFooterLinks(db, body.links || body);
  res.json({ links: merged });
});

// --- Fichiers statiques (landing, légal, admin) ---
app.use(express.static(ROOT, { extensions: ["html"] }));

module.exports = { app };
