/** Liens pied de page (pages légal + contact), alignés sur les slugs `pages.slug`. */

const LEGAL_LINK_KEYS = [
  "mentions-legales",
  "confidentialite",
  "cgu",
  "cgv",
  "contact",
];

const LEGAL_LINK_LABELS_FR = {
  "mentions-legales": "Mentions légales",
  confidentialite: "Politique de confidentialité",
  cgu: "CGU",
  cgv: "CGV",
  contact: "Contact",
};

function defaultLegalFooterLinks() {
  const o = {};
  for (const k of LEGAL_LINK_KEYS) o[k] = true;
  return o;
}

function coerceLegalFooterLinks(obj) {
  const base = defaultLegalFooterLinks();
  if (!obj || typeof obj !== "object") return base;
  for (const k of LEGAL_LINK_KEYS) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) base[k] = Boolean(obj[k]);
  }
  return base;
}

function parseStored(v) {
  try {
    return coerceLegalFooterLinks(JSON.parse(String(v || "{}")));
  } catch (_) {
    return defaultLegalFooterLinks();
  }
}

const SITE_KV_KEY = "legal_footer_links";

function getLegalFooterLinks(db) {
  const row = db.prepare(`SELECT v FROM site_kv WHERE k = ?`).get(SITE_KV_KEY);
  return parseStored(row?.v);
}

/** Fusionne uniquement les clés connues (booléennes). */
function upsertLegalFooterLinks(db, partial) {
  const cur = getLegalFooterLinks(db);
  const next = { ...cur };
  if (partial && typeof partial === "object") {
    for (const k of LEGAL_LINK_KEYS) {
      if (Object.prototype.hasOwnProperty.call(partial, k)) next[k] = Boolean(partial[k]);
    }
  }
  db.prepare(`
    INSERT INTO site_kv (k, v)
    VALUES (@k, @v)
    ON CONFLICT(k) DO UPDATE SET
      v = excluded.v,
      updated_at = datetime('now')
  `).run({ k: SITE_KV_KEY, v: JSON.stringify(next) });
  return next;
}

module.exports = {
  LEGAL_LINK_KEYS,
  LEGAL_LINK_LABELS_FR,
  SITE_KV_KEY,
  defaultLegalFooterLinks,
  coerceLegalFooterLinks,
  parseLegalFooterLinksStored: parseStored,
  getLegalFooterLinks,
  upsertLegalFooterLinks,
};
