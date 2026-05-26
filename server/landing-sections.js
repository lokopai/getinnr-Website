/** Identifiants stables synchronisés avec app.jsx */

const SECTION_KEYS = [
  "nav",
  "hero",
  "approche",
  "apercu",
  "produit",
  "demo",
  "footer",
];

const LABELS_FR = {
  nav: "Barre de navigation (logo, liens, CTA)",
  hero: "Bloc héros (accroche + visuel)",
  approche: "Section « Notre approche »",
  apercu: "Section « Aperçu » (captures)",
  produit: "Section « Produit » (teaser embargo)",
  demo: "Section « Démo » (formulaire)",
  footer: "Pied de page",
};

function defaultLandingSections() {
  const o = {};
  for (const k of SECTION_KEYS) o[k] = true;
  return o;
}

function coerceLandingSections(obj) {
  const base = defaultLandingSections();
  if (!obj || typeof obj !== "object") return base;
  for (const k of SECTION_KEYS) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) base[k] = Boolean(obj[k]);
  }
  return base;
}

function parseStored(v) {
  try {
    return coerceLandingSections(JSON.parse(String(v || "{}")));
  } catch (_) {
    return defaultLandingSections();
  }
}

function getLandingSections(db) {
  const row = db.prepare(`SELECT v FROM site_kv WHERE k = ?`).get("landing_sections");
  return parseStored(row?.v);
}

/** Fusionne uniquement les clés connues (booléennes). */
function upsertLandingSections(db, partial) {
  const cur = getLandingSections(db);
  const next = { ...cur };
  if (partial && typeof partial === "object") {
    for (const k of SECTION_KEYS) {
      if (Object.prototype.hasOwnProperty.call(partial, k)) next[k] = Boolean(partial[k]);
    }
  }
  db.prepare(`
    INSERT INTO site_kv (k, v)
    VALUES ('landing_sections', @v)
    ON CONFLICT(k) DO UPDATE SET
      v = excluded.v,
      updated_at = datetime('now')
  `).run({ v: JSON.stringify(next) });
  return next;
}

module.exports = {
  SECTION_KEYS,
  LABELS_FR,
  defaultLandingSections,
  coerceLandingSections,
  parseLandingSectionsStored: parseStored,
  getLandingSections,
  upsertLandingSections,
};
