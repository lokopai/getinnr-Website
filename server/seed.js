const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const ROOT = path.join(__dirname, "..");

function stripScripts(html) {
  return String(html || "").replace(/<\s*script\b[^>]*>[\s\S]*?<\/\s*script\s*>/gi, "");
}

function extractInner(html, re) {
  const m = html.match(re);
  return m ? m[1].trim() : "";
}

/** Assemble la zone &lt;main&gt; comme un unique bloc HTML (sommaire + article ou article seul). */
function buildMainHtml(layout, tocInner, articleInner) {
  const inner = stripScripts(articleInner || "");
  const toc = tocInner ? stripScripts(String(tocInner).trim()) : "";
  if (layout === "simple" || !toc) {
    return `<article class="doc-content">${inner}</article>`;
  }
  return `<aside class="toc">${toc}</aside><article class="doc-content">${inner}</article>`;
}

function parsePageHeader(html, slug) {
  const kicker = extractInner(html, /<span class="kicker">([^<]*)<\/span>/);
  const h1 = extractInner(html, /<h1 class="doc-title">([^<]*)<\/h1>/);
  const docMeta = extractInner(html, /<div class="doc-meta[^"]*">([\s\S]*?)<\/div>/);

  let metaUpdated = "25 mai 2026";
  let metaEditor = "getInnr";
  if (docMeta) {
    const spanRe = /<span><strong>([^<]+)<\/strong>\s*·\s*([^<]*)<\/span>/g;
    const spans = [...docMeta.matchAll(spanRe)];
    if (spans[0]) metaUpdated = spans[0][2].trim();
    if (spans[1]) metaEditor = spans[1][2].trim();
  }

  const htmlTitleMatch = html.match(/<title>([^<]*)<\/title>/);
  const htmlTitle = htmlTitleMatch ? htmlTitleMatch[1].trim() : h1;

  return {
    slug,
    html_title: htmlTitle || slug,
    kicker: kicker || "Document",
    h1: h1 || slug,
    meta_updated: metaUpdated,
    meta_editor: metaEditor,
  };
}

const CGV_TEMPLATE = `<section id="objet">
  <h2>Objet et champ d'application</h2>
  <p>Les présentes Conditions Générales de Vente (<abbr title="Conditions Générales de Vente">CGV</abbr>) régissent les relations contractuelles entre getInnr et tout client souscrivant à une offre logicielle getInnr (ci‑après « le Client »).</p>
</section>

<section id="offres">
  <h2>Offres et commande</h2>
  <p>Les prestations disponibles ainsi que leurs caractéristiques et prix sont présentées sur le site ou dans une proposition personnalisée. Toute commande vaut acceptation des prix et descriptions des prestations souscrites.</p>
</section>

<section id="facturation">
  <h2>Tarifs, facturation et paiement</h2>
  <p>Les prix sont indiqués <span class="placeholder">sur la page tarifs</span> ou dans le bon de commande. Ils peuvent être modifiés selon les conditions prévues au contrat cadre souscrit avec le Client. Les factures sont payables aux échéances convenues lors de la souscription.</p>
</section>

<section id="duree-resiliation">
  <h2>Durée et résiliation</h2>
  <p>L'abonnement est <span class="placeholder">sans engagement de durée minimale précisée ici</span>. Les modalités précises de reconduction, préavis et résiliation sont précisées dans le contrat ou le bon de souscription communiqué au Client avant validation.</p>
</section>

<section id="livraison">
  <h2>Accès aux services et support</h2>
  <p>Sous réserve du paiement effectif et de la mise en place technique, le Client bénéficie d’un accès au service selon les spécifications de l’offre. Un support utilisateur peut être précisé contractuellement (canaux et plages horaires).</p>
</section>

<section id="resp">
  <h2>Garantie et responsabilité</h2>
  <p>getInnr fournit ses services conformément aux usages de la profession. La responsabilité de getInnr est limitée, dans les limites légales, aux dommages directs prouvés. Les exclusions et plafonds applicables peuvent être complétées dans les conditions particulières.</p>
</section>

<section id="litiges">
  <h2>Loi applicable</h2>
  <p>Les présentes CGV sont régies par le droit français. Les litiges relatifs aux ventes sont soumis aux juridictions compétentes sous réserve des règles d’ordre public.</p>
</section>`;

const CONTACT_TEMPLATE = `
<p>Cette page permet de faire figurer vos coordonnées officielles, visibles également dans le pied de page et les documents juridiques le cas échéant.</p>
<dl>
  <dt>E-mail général</dt>
  <dd><a href="mailto:contact@getinnr.com">contact@getinnr.com</a></dd>
  <dt>Données personnelles / RGPD</dt>
  <dd><a href="mailto:privacy@getinnr.com">privacy@getinnr.com</a></dd>
  <dt>Adresse</dt>
  <dd><span class="placeholder">Adresse postale complète du studio / siège social</span></dd>
  <dt>Téléphone</dt>
  <dd><span class="placeholder">Numéro de téléphone</span></dd>
</dl>
<div class="note">Le contenu de cette page peut être modifié depuis le back-office (compte administrateur).</div>
`;

const CGV_TOC_INNER = `<h4>Sommaire</h4>
    <ol>
      <li><a href="#objet">Objet et champ d'application</a></li>
      <li><a href="#offres">Offres et commande</a></li>
      <li><a href="#facturation">Tarifs et paiement</a></li>
      <li><a href="#duree-resiliation">Durée et résiliation</a></li>
      <li><a href="#livraison">Accès aux services</a></li>
      <li><a href="#resp">Garantie et responsabilité</a></li>
      <li><a href="#litiges">Loi applicable</a></li>
    </ol>`;

/**
 * Crée ou met à jour l’admin : le hash suit toujours ADMIN_* du .env au redémarrage,
 * sinon un premier bootstrap avec défault puis changement dans .env ne permet plus de se connecter.
 */
function ensureAdmin(db, username, password) {
  const hash = bcrypt.hashSync(password, 12);
  const row = db.prepare("SELECT id FROM admins WHERE username = ?").get(username);
  if (!row) {
    db.prepare(`INSERT INTO admins (username, password_hash) VALUES (?, ?)`).run(
      username,
      hash
    );
    return;
  }
  db.prepare(`UPDATE admins SET password_hash = ? WHERE id = ?`).run(hash, row.id);
}

function seedPages(db) {
  const count = db.prepare("SELECT COUNT(*) AS c FROM pages").get().c;
  if (count > 0) return;

  const insert = db.prepare(`
    INSERT INTO pages (
      slug, html_title, kicker, h1, meta_updated, meta_editor,
      toc_html, content_html, layout, main_html, updated_at
    ) VALUES (
      @slug, @html_title, @kicker, @h1, @meta_updated, @meta_editor,
      '', '', @layout, @main_html, datetime('now')
    )
  `);

  const runTx = db.transaction(() => {
    const files = [
      ["mentions-legales.html", "mentions-legales"],
      ["confidentialite.html", "confidentialite"],
      ["cgu.html", "cgu"],
    ];

    for (const [file, slug] of files) {
      const shell = fs.readFileSync(path.join(ROOT, file), "utf8");
      const header = parsePageHeader(shell, slug);
      const mainPath = path.join(__dirname, "legal-defaults", `${slug}-main.html`);
      const raw = fs.readFileSync(mainPath, "utf8");
      const main_html = stripScripts(raw.trim());
      if (!main_html || main_html.length < 400) {
        throw new Error(
          `[seed] Contenu légal trop court pour slug=${slug}. Fichier attendu (${mainPath}, ${raw.length} octets lus). Copie échouée depuis le zip ou fichier manquant.`
        );
      }
      insert.run({ ...header, layout: "legal", main_html });
    }

    insert.run({
      slug: "cgv",
      html_title: "Conditions Générales de Vente — getInnr",
      kicker: "CGV",
      h1: "Conditions Générales de Vente",
      meta_updated: "25 mai 2026",
      meta_editor: "getInnr",
      layout: "legal",
      main_html: buildMainHtml("legal", CGV_TOC_INNER, CGV_TEMPLATE.trim()),
    });

    insert.run({
      slug: "contact",
      html_title: "Contact — getInnr",
      kicker: "Contact",
      h1: "Nous écrire",
      meta_updated: "25 mai 2026",
      meta_editor: "getInnr",
      layout: "simple",
      main_html: buildMainHtml("simple", null, CONTACT_TEMPLATE.trim()),
    });
  });

  runTx();
}

module.exports = {
  seedPages,
  ensureAdmin,
  stripScripts,
  buildMainHtml,
};
