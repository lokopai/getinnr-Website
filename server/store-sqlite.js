const { openDatabase } = require("./db");
const {
  normalizeSqlValue,
  getPage,
  listPages,
} = require("./pages");
const { seedPages, ensureAdmin, stripScripts } = require("./seed");
const {
  getLandingSections,
  upsertLandingSections,
} = require("./landing-sections");
const {
  getLegalFooterLinks,
  upsertLegalFooterLinks,
} = require("./legal-links");

function resolveSqlitePath() {
  const explicit = process.env.DATABASE_PATH && String(process.env.DATABASE_PATH).trim();
  if (explicit) return explicit;
  if (process.env.VERCEL) return "/tmp/site.db";
  return "./data/site.db";
}

function createSqliteStore() {
  const db = openDatabase(resolveSqlitePath());
  seedPages(db);
  ensureAdmin(
    db,
    process.env.ADMIN_USERNAME || "admin",
    process.env.ADMIN_PASSWORD || "changeme"
  );

  return {
    dialect: "sqlite",

    async getPage(slug) {
      return getPage(db, slug);
    },

    async listPages() {
      return listPages(db);
    },

    async slugExists(slug) {
      return !!db.prepare(`SELECT slug FROM pages WHERE slug = ?`).get(slug);
    },

    async updatePage(slug, body) {
      let mainHtml = stripScripts(String(body.main_html ?? "").trim());
      if (!mainHtml) mainHtml = '<article class="doc-content"></article>';
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
      return getPage(db, slug);
    },

    async insertDemoRequest(payload) {
      db.prepare(
        `
        INSERT INTO demo_requests (nom, email, studio, telephone, message)
        VALUES (@nom, @email, @studio, @telephone, @message)
      `
      ).run(payload);
    },

    async listDemoRequests() {
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
      return rows.map((r) => ({
        ...r,
        created_at: normalizeSqlValue(r.created_at),
      }));
    },

    async getLandingSections() {
      return getLandingSections(db);
    },

    async upsertLandingSections(partial) {
      return upsertLandingSections(db, partial);
    },

    async getLegalFooterLinks() {
      return getLegalFooterLinks(db);
    },

    async upsertLegalFooterLinks(partial) {
      return upsertLegalFooterLinks(db, partial);
    },

    async findAdminByUsername(username) {
      return db
        .prepare(`SELECT id, username, password_hash FROM admins WHERE username = ?`)
        .get(username) || null;
    },

    async saveSession(token, adminId, expiresAt) {
      db.prepare(`INSERT INTO sessions (token, admin_id, expires_at) VALUES (?, ?, ?)`).run(
        token,
        adminId,
        expiresAt
      );
    },

    async deleteExpiredSessions(nowMs) {
      db.prepare(`DELETE FROM sessions WHERE expires_at < ?`).run(nowMs);
    },

    async deleteSession(token) {
      if (!token) return;
      db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
    },

    async getSessionAdmin(token, nowMs) {
      return db
        .prepare(
          `
          SELECT s.admin_id AS id, a.username
          FROM sessions s
          JOIN admins a ON a.id = s.admin_id
          WHERE s.token = ? AND s.expires_at > ?
      `
        )
        .get(token, nowMs) || null;
    },

    async close() {},
  };
}

module.exports = { createSqliteStore };
