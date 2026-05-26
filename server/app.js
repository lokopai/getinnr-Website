const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");

const { requireAuth, attachSession, clearSession } = require("./auth");
const { stripScripts } = require("./seed");
const { SECTION_KEYS, LABELS_FR } = require("./landing-sections");
const { LEGAL_LINK_KEYS, LEGAL_LINK_LABELS_FR } = require("./legal-links");

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

/** @returns {express.Application} */
function buildApp(store) {
  const ROOT = path.join(__dirname, "..");

  const SESSION_SECRET_OPT = process.env.SESSION_SECRET;
  if (!SESSION_SECRET_OPT && process.env.NODE_ENV === "production") {
    console.warn(
      "[getInnr] Avertissement: définissez SESSION_SECRET en production (.env ou variables d’environnement)."
    );
  }

  const app = express();

  if (process.env.VERCEL || String(process.env.TRUST_PROXY || "").toLowerCase() === "true") {
    app.set("trust proxy", 1);
  }

  app.disable("x-powered-by");
  app.use(cookieParser());
  app.use(express.json({ limit: "512kb" }));
  app.use(express.urlencoded({ extended: true }));

  if (process.env.NODE_ENV !== "production") {
    app.use((_req, res, next) => {
      res.setHeader("X-DB-Dialect", store.dialect || "unknown");
      next();
    });
  }

  // --- APIs publiques ---
  app.get(
    "/api/public/pages/:slug",
    wrap(async (req, res) => {
      const page = await store.getPage(req.params.slug);
      if (!page) {
        res.status(404).json({ error: "Page inconnue" });
        return;
      }
      res.json(page);
    })
  );

  app.post(
    "/api/public/demo-request",
    wrap(async (req, res) => {
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

      await store.insertDemoRequest({
        nom: String(nom).trim(),
        email: String(email).trim(),
        studio: String(studio).trim(),
        telephone: telephone ? String(telephone).trim() : null,
        message: message ? String(message).trim() : null,
      });

      res.json({ ok: true });
    })
  );

  app.get("/api/public/landing-sections", wrap(async (_req, res) => {
    res.json({ sections: await store.getLandingSections() });
  }));

  app.get("/api/public/legal-footer-links", wrap(async (_req, res) => {
    res.json({ links: await store.getLegalFooterLinks() });
  }));

  app.post(
    "/api/auth/login",
    wrap(async (req, res) => {
      const { username, password } = req.body || {};
      const u = typeof username === "string" ? username.trim() : "";
      const p = typeof password === "string" ? password : "";

      const row = await store.findAdminByUsername(u);
      if (!row || !bcrypt.compareSync(p, row.password_hash)) {
        res.status(401).json({ error: "Identifiants invalides" });
        return;
      }

      await attachSession(store, row.id, res);
      res.json({ ok: true, username: row.username });
    })
  );

  app.post("/api/auth/logout", wrap(async (req, res) => {
    await clearSession(store, req, res);
    res.json({ ok: true });
  }));

  app.get("/api/auth/me", wrap(async (req, res) => {
    const token = req.cookies?.session;
    if (!token) {
      res.json({ user: null });
      return;
    }
    const row = await store.getSessionAdmin(token, Date.now());
    if (!row) {
      res.json({ user: null });
      return;
    }
    res.json({ user: { id: row.id, username: row.username } });
  }));

  const guard = requireAuth(store);

  app.get("/api/admin/pages", guard, wrap(async (_req, res) => {
    res.json(await store.listPages());
  }));

  app.get("/api/admin/pages/:slug", guard, wrap(async (req, res) => {
    const page = await store.getPage(req.params.slug);
    if (!page) {
      res.status(404).json({ error: "Page inconnue" });
      return;
    }
    res.json(page);
  }));

  app.put("/api/admin/pages/:slug", guard, wrap(async (req, res) => {
    const slug = req.params.slug;
    if (!(await store.slugExists(slug))) {
      res.status(404).json({ error: "Page inconnue" });
      return;
    }

    const body = req.body || {};
    let mainHtml = stripScripts(String(body.main_html ?? "").trim());
    if (!mainHtml) mainHtml = '<article class="doc-content"></article>';

    const saved = await store.updatePage(slug, body);
    res.json(saved);
  }));

  app.get("/api/admin/demo-requests", guard, wrap(async (_req, res) => {
    res.json(await store.listDemoRequests());
  }));

  app.get("/api/admin/landing-sections", guard, wrap(async (_req, res) => {
    res.json({
      sections: await store.getLandingSections(),
      keys: SECTION_KEYS,
      labels: LABELS_FR,
    });
  }));

  app.put("/api/admin/landing-sections", guard, wrap(async (req, res) => {
    const body = req.body || {};
    const merged = await store.upsertLandingSections(body.sections || body);
    res.json({ sections: merged });
  }));

  app.get("/api/admin/legal-footer-links", guard, wrap(async (_req, res) => {
    res.json({
      links: await store.getLegalFooterLinks(),
      keys: LEGAL_LINK_KEYS,
      labels: LEGAL_LINK_LABELS_FR,
    });
  }));

  app.put("/api/admin/legal-footer-links", guard, wrap(async (req, res) => {
    const body = req.body || {};
    const merged = await store.upsertLegalFooterLinks(body.links || body);
    res.json({ links: merged });
  }));

  app.use(express.static(ROOT, { extensions: ["html"] }));

  app.use((err, _req, res, _next) => {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: "Erreur serveur" });
  });

  return app;
}

module.exports = { buildApp };
