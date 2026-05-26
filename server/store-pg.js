const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const { rowToPublic, normalizeSqlValue } = require("./pages");
const { SECTION_KEYS, parseLandingSectionsStored } = require("./landing-sections");
const { SITE_KV_KEY, LEGAL_LINK_KEYS, parseLegalFooterLinksStored } = require("./legal-links");
const { getSeedPageRows, stripScripts } = require("./seed");

function poolConfig() {
  const connectionString = String(process.env.DATABASE_URL || "").trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL PostgreSQL requis. Exemple: postgresql://user:pass@host:5432/db");
  }
  if (!connectionString.startsWith("postgres://") && !connectionString.startsWith("postgresql://")) {
    throw new Error(`DATABASE_URL invalide: ${connectionString.substring(0, 20)}... (doit commencer par postgresql://)`);
  }
  
  const ssl =
    String(process.env.DATABASE_SSL || "").toLowerCase() === "true" ||
    String(process.env.PGSSLMODE || "").toLowerCase() === "require";
  
  console.log(`[PG] Connexion à: ${connectionString.replace(/:\/\/[^@]+@/, "://***@")}`);
  
  return {
    connectionString,
    ssl: ssl ? { rejectUnauthorized: false } : undefined,
    max: Math.min(Number(process.env.PGPOOL_MAX || 2), 5), // Réduit pour serverless
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000, // Plus court pour Vercel
    query_timeout: 15000,
    allowExitOnIdle: true, // Permet fermeture propre
  };
}

async function runSchema(pool) {
  const client = await pool.connect();
  try {
    // Vérifier si les tables existent déjà
    const tablesCheck = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('admins', 'sessions', 'pages', 'demo_requests', 'site_kv')
    `);
    
    if (tablesCheck.rows.length >= 5) {
      console.log(`[PG] Schéma déjà présent (${tablesCheck.rows.length} tables)`);
      return;
    }
    
    console.log(`[PG] Création schéma (${tablesCheck.rows.length}/5 tables présentes)`);
    
    const sqlPath = path.join(__dirname, "pg-schema.sql");
    
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Fichier schéma introuvable: ${sqlPath}`);
    }
    
    const raw = fs.readFileSync(sqlPath, "utf8");
    const parts = raw
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));
    
    console.log(`[PG] Schéma trouvé (${raw.length} chars), ${parts.length} statements`);
    
    for (let i = 0; i < parts.length; i++) {
      const statement = parts[i];
      console.log(`[PG] Statement ${i + 1}/${parts.length}: ${statement.substring(0, 50)}...`);
      await client.query(statement);
    }
    console.log("[PG] Schéma appliqué avec succès");
  } catch (error) {
    console.error(`[PG] Erreur schéma: ${error.message}`);
    console.error(`[PG] Stack:`, error.stack);
    throw error;
  } finally {
    client.release();
  }
}

async function ensureSiteKvDefaults(client) {
  await client.query(
    `INSERT INTO site_kv (k, v)
     SELECT 'landing_sections', $1
     WHERE NOT EXISTS (SELECT 1 FROM site_kv WHERE k = 'landing_sections')`,
    [
      JSON.stringify({
        nav: true,
        hero: true,
        approche: true,
        apercu: true,
        produit: true,
        demo: true,
        footer: true,
      }),
    ]
  );
  await client.query(
    `INSERT INTO site_kv (k, v)
     SELECT 'legal_footer_links', $1
     WHERE NOT EXISTS (SELECT 1 FROM site_kv WHERE k = 'legal_footer_links')`,
    [
      JSON.stringify({
        "mentions-legales": true,
        confidentialite: true,
        cgu: true,
        cgv: true,
        contact: true,
      }),
    ]
  );
}

async function seedPagesPg(client) {
  const { rows } = await client.query(`SELECT COUNT(*)::int AS c FROM pages`);
  if (rows[0].c > 0) return;
  const pages = getSeedPageRows();
  for (const p of pages) {
    await client.query(
      `
      INSERT INTO pages (
        slug, html_title, kicker, h1, meta_updated, meta_editor,
        toc_html, content_html, layout, main_html, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        '', '', $7, $8, NOW()
      )
      `,
      [
        p.slug,
        p.html_title,
        p.kicker,
        p.h1,
        p.meta_updated,
        p.meta_editor,
        p.layout,
        p.main_html,
      ]
    );
  }
}

async function ensureAdminPg(client, username, plainPassword) {
  const hash = bcrypt.hashSync(plainPassword, 12);
  const found = await client.query(`SELECT id FROM admins WHERE username = $1`, [username]);
  if (!found.rows.length) {
    await client.query(`INSERT INTO admins (username, password_hash) VALUES ($1, $2)`, [
      username,
      hash,
    ]);
    return;
  }
  await client.query(`UPDATE admins SET password_hash = $1 WHERE id = $2`, [
    hash,
    found.rows[0].id,
  ]);
}

async function createPgStore() {
  const config = poolConfig();
  const pool = new Pool(config);
  
  // Test de connexion avec timeout
  console.log("[PG] Test de connexion...");
  let testClient;
  try {
    // Ajouter un timeout manuel pour éviter les blocages
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Timeout connexion (15s)")), 15000)
    );
    
    testClient = await Promise.race([
      pool.connect(),
      timeoutPromise
    ]);
    
    testClient.release();
    console.log("[PG] Connexion OK");
  } catch (err) {
    console.error(`[PG] Échec connexion: ${err.message}`);
    throw new Error(`Connexion PostgreSQL échouée: ${err.message}`);
  }
  
  await runSchema(pool);
  
  const client = await pool.connect();
  try {
    await ensureSiteKvDefaults(client);
    await seedPagesPg(client);
    await ensureAdminPg(
      client,
      process.env.ADMIN_USERNAME || "admin",
      process.env.ADMIN_PASSWORD || "changeme"
    );
    console.log("[PG] Initialisation terminée");
  } finally {
    client.release();
  }

  async function getKv(key) {
    const { rows } = await pool.query(`SELECT v FROM site_kv WHERE k = $1`, [key]);
    return rows[0] ? rows[0].v : null;
  }

  async function setKv(key, valueJson) {
    await pool.query(
      `
      INSERT INTO site_kv (k, v, updated_at)
      VALUES ($1, $2::text, NOW())
      ON CONFLICT (k) DO UPDATE SET
        v = EXCLUDED.v,
        updated_at = NOW()
      `,
      [key, typeof valueJson === "string" ? valueJson : JSON.stringify(valueJson)]
    );
  }

  return {
    dialect: "postgres",
    pool,

    async getPage(slug) {
      const { rows } = await pool.query(`SELECT * FROM pages WHERE slug = $1`, [slug]);
      return rowToPublic(rows[0] || null);
    },

    async listPages() {
      const { rows } = await pool.query(
        `SELECT slug, html_title, kicker, updated_at FROM pages ORDER BY slug ASC`
      );
      return rows.map((r) => ({
        slug: r.slug,
        html_title: r.html_title,
        kicker: r.kicker,
        updated_at: normalizeSqlValue(r.updated_at),
      }));
    },

    async slugExists(slug) {
      const { rows } = await pool.query(`SELECT slug FROM pages WHERE slug = $1`, [slug]);
      return !!rows.length;
    },

    async updatePage(slug, body) {
      let mainHtml = stripScripts(String(body.main_html ?? "").trim());
      if (!mainHtml) mainHtml = '<article class="doc-content"></article>';
      const hasTocAside = /<aside\b[^>]*\bclass="[^"]*\btoc\b/.test(mainHtml);
      const layout = hasTocAside ? "legal" : "simple";
      await pool.query(
        `
        UPDATE pages SET
          html_title = $1,
          kicker = $2,
          h1 = $3,
          meta_updated = $4,
          meta_editor = $5,
          layout = $6,
          toc_html = '',
          content_html = '',
          main_html = $7,
          updated_at = NOW()
        WHERE slug = $8
        `,
        [
          String(body.html_title || "").trim() || slug,
          String(body.kicker || "").trim(),
          String(body.h1 || "").trim(),
          String(body.meta_updated || "").trim() || "",
          String(body.meta_editor || "").trim() || "",
          layout,
          mainHtml,
          slug,
        ]
      );
      return this.getPage(slug);
    },

    async insertDemoRequest(payload) {
      await pool.query(
        `
        INSERT INTO demo_requests (nom, email, studio, telephone, message)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          payload.nom,
          payload.email,
          payload.studio,
          payload.telephone,
          payload.message,
        ]
      );
    },

    async listDemoRequests() {
      const { rows } = await pool.query(
        `
        SELECT id, nom, email, studio, telephone, message, created_at
        FROM demo_requests
        ORDER BY id DESC
        LIMIT 200
      `
      );
      return rows.map((r) => ({
        ...r,
        created_at: normalizeSqlValue(r.created_at),
      }));
    },

    async getLandingSections() {
      const v = await getKv("landing_sections");
      return parseLandingSectionsStored(v);
    },

    async upsertLandingSections(partial) {
      const cur = await this.getLandingSections();
      const next = { ...cur };
      if (partial && typeof partial === "object") {
        for (const k of SECTION_KEYS) {
          if (Object.prototype.hasOwnProperty.call(partial, k)) next[k] = Boolean(partial[k]);
        }
      }
      await setKv("landing_sections", JSON.stringify(next));
      return next;
    },

    async getLegalFooterLinks() {
      const v = await getKv(SITE_KV_KEY);
      return parseLegalFooterLinksStored(v);
    },

    async upsertLegalFooterLinks(partial) {
      const cur = await this.getLegalFooterLinks();
      const next = { ...cur };
      if (partial && typeof partial === "object") {
        for (const k of LEGAL_LINK_KEYS) {
          if (Object.prototype.hasOwnProperty.call(partial, k)) next[k] = Boolean(partial[k]);
        }
      }
      await setKv(SITE_KV_KEY, JSON.stringify(next));
      return next;
    },

    async findAdminByUsername(username) {
      const { rows } = await pool.query(
        `SELECT id, username, password_hash FROM admins WHERE username = $1`,
        [username]
      );
      return rows[0] || null;
    },

    async saveSession(token, adminId, expiresAt) {
      await pool.query(`INSERT INTO sessions (token, admin_id, expires_at) VALUES ($1,$2,$3)`, [
        token,
        adminId,
        expiresAt,
      ]);
    },

    async deleteExpiredSessions(nowMs) {
      await pool.query(`DELETE FROM sessions WHERE expires_at < $1`, [nowMs]);
    },

    async deleteSession(token) {
      if (!token) return;
      await pool.query(`DELETE FROM sessions WHERE token = $1`, [token]);
    },

    async getSessionAdmin(token, nowMs) {
      const { rows } = await pool.query(
        `
        SELECT s.admin_id AS id, a.username
        FROM sessions s
        JOIN admins a ON a.id = s.admin_id
        WHERE s.token = $1 AND s.expires_at > $2
      `,
        [token, nowMs]
      );
      return rows[0] || null;
    },

    /** Fermeture du pool Postgres (tests / graceful shutdown). */
    async close() {
      await pool.end();
    },
  };
}

module.exports = { createPgStore };
