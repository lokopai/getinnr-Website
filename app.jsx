// app.jsx — getInnr landing
const { useState, useEffect, useMemo } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "hero": "split",
  "headline": "institutional",
  "featuresLayout": "cards",
  "theme": "light",
  "accent": "#a855f7"
}/*EDITMODE-END*/;

/** Sections de la landing (activables depuis le back-office, API SQLite). */
const LANDING_KEYS = ["nav", "hero", "approche", "apercu", "produit", "demo", "footer"];

function normalizeLandingSections(raw) {
  const o = {};
  for (const k of LANDING_KEYS) {
    o[k] = raw && typeof raw === "object" && raw[k] === false ? false : true;
  }
  return o;
}

/** Liens pied de page (mentions, RGPD, CGU/CGV, contact). */
const LEGAL_FOOTER_KEYS = ["mentions-legales", "confidentialite", "cgu", "cgv", "contact"];

function normalizeLegalFooterLinks(raw) {
  const o = {};
  for (const k of LEGAL_FOOTER_KEYS) {
    o[k] = raw && typeof raw === "object" && raw[k] === false ? false : true;
  }
  return o;
}

const FOOTER_LEGAL_ITEMS = [
  ["mentions-legales", "mentions-legales.html", "Mentions légales"],
  ["confidentialite", "confidentialite.html", "Politique de confidentialité"],
  ["cgu", "cgu.html", "CGU"],
  ["cgv", "cgv.html", "CGV"],
  ["contact", "contact.html", "Contact"],
];

// ───────────────── Brandmark ─────────────────
function Brand({ size = 24 }) {
  return (
    <span className="brand" style={{ fontSize: size }}>
      <span className="b-get">Get</span>
      <span className="b-innr">INNR</span>
      <span className="b-dot" />
    </span>
  );
}

// ───────────────── Icons (minimal, line) ─────────────────
const Arrow = ({ size = 14 }) => (
  <svg className="arr" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
);
const Check = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.5l4.5 4.5L19 7" />
  </svg>
);
const Lock = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

// ───────────────── Top nav ─────────────────
function Nav({ sections }) {
  const s = sections || normalizeLandingSections(null);
  const anyLink = s.approche || s.produit || s.demo;
  return (
    <nav className="nav">
      <div className="wrap nav-inner">
        <a href="#top" aria-label="getInnr">
          <Brand size={22} />
        </a>
        {(anyLink || s.demo) && (
          <div className="nav-meta">
            {anyLink && (
              <span className="nav-links" style={{ display: "inline-flex", gap: 22 }}>
                {s.approche && <a href="#approche">Approche</a>}
                {s.produit && <a href="#produit">Produit</a>}
                {s.demo && <a href="#demo">Démo</a>}
              </span>
            )}
            {s.demo && (
              <a className="nav-cta" href="#demo">
                <span className="dot" />
                <span>Demander une démo</span>
              </a>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

// ───────────────── Hero variants ─────────────────
const HEADLINES = {
  institutional: (
    <>
      Un logiciel de studio fitness <span className="ser">pensé pour démarrer.</span>
      <span className="mark" />
    </>
  ),
  direct: (
    <>
      L'essentiel pour faire tourner votre studio. <span className="ser">Rien de superflu.</span>
      <span className="mark" />
    </>
  ),
  promise: (
    <>
      Moins de complexité. <span className="ser">Plus de studio.</span>
      <span className="mark" />
    </>
  ),
};

const LEDES = {
  institutional:
    "getInnr est une plateforme de gestion conçue pour les studios fitness indépendants. Tous les outils nécessaires au pilotage de votre activité, dans une application volontairement simple — et à un tarif accessible dès le premier mois.",
  direct:
    "Les outils historiques sont coûteux et chargés de fonctions que vous n'utiliserez jamais. getInnr propose l'inverse : une plateforme épurée, opérationnelle en quelques minutes, à un prix calibré pour un studio qui démarre.",
  promise:
    "Une seule application pour piloter votre studio au quotidien : sobre, rapide, opérationnelle. Sans plan tarifaire à tiroirs, sans formation obligatoire, sans surcouche commerciale.",
};

function HeroVisual() {
  return (
    <div className="hero-visual" aria-hidden="true">
      <div className="phone-bezel">
        <img src="assets/app-planning.png" alt="Planning getInnr" />
      </div>
    </div>
  );
}

function Hero({ variant, headlineKey, sections }) {
  const s = sections || normalizeLandingSections(null);
  const heading = HEADLINES[headlineKey] || HEADLINES.institutional;
  const lede = LEDES[headlineKey] || LEDES.institutional;

  return (
    <section id="top" className={`hero ${variant}`}>
      <div className="wrap">
        <div className="hero-grid">
          <div className="hero-text">
            <span className="eyebrow">
              <span className="pulse" />
              Logiciel pour studios fitness
            </span>

            <h1 className="h1">{heading}</h1>

            {variant === "editorial" ? (
              <div className="lede-block">
                <p className="lede" style={{ margin: 0 }}>{lede}</p>
                <div>
                  <div className="cta-row" style={{ marginTop: 0 }}>
                    {s.demo && (
                      <a className="btn" href="#demo">
                        Demander une démo <Arrow />
                      </a>
                    )}
                    {s.approche && (
                      <a className="btn btn-ghost" href="#approche">Notre approche</a>
                    )}
                  </div>
                  <div className="hero-meta">
                    <span className="item"><span className="dot" /> Sans engagement</span>
                    <span className="item"><span className="dot" /> Sans frais d'installation</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <p className="lede">{lede}</p>
                <div className="cta-row">
                  {s.demo && (
                    <a className="btn" href="#demo">
                      Demander une démo <Arrow />
                    </a>
                  )}
                  {s.produit && (
                    <a className="btn btn-ghost" href="#produit">Découvrir le produit</a>
                  )}
                </div>
                <div className="hero-meta">
                  <span className="item"><span className="dot" /> Sans engagement</span>
                  <span className="item"><span className="dot" /> Sans frais d'installation</span>
                  <span className="item"><span className="dot" /> Accompagnement inclus</span>
                </div>
              </>
            )}
          </div>

          {variant === "split" && <HeroVisual />}
        </div>
      </div>
    </section>
  );
}

// ───────────────── Aperçu (real screenshots) ─────────────────
function Preview() {
  return (
    <section id="apercu" className="preview">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <span className="sec-kicker">Aperçu</span>
            <h2 className="sec-title">
              L'application, <span className="ser">telle quelle.</span>
            </h2>
          </div>
          <p className="sec-aside">
            Pas de captures retouchées. Voici les écrans que vos clients
            et vos équipes utilisent au quotidien — sur mobile et au studio.
          </p>
        </div>

        <div className="preview-stage">
          <div className="pv-item">
            <div className="pv-card is-mobile">
              <img src="assets/app-abonnement.png" alt="Écran abonnement getInnr" />
            </div>
            <div className="pv-cap">
              <span className="kk">App membre · iOS / Android</span>
              <span className="tt">Suivi d'abonnement et passages.</span>
            </div>
          </div>

          <div className="pv-item">
            <div className="pv-card is-mobile">
              <img src="assets/app-cours.png" alt="Écran cours getInnr" />
            </div>
            <div className="pv-cap">
              <span className="kk">App membre · iOS / Android</span>
              <span className="tt">Catalogue de cours et disciplines.</span>
            </div>
          </div>

          <div className="pv-item">
            <div className="pv-card is-mobile">
              <img src="assets/app-planning.png" alt="Écran planning getInnr" />
            </div>
            <div className="pv-cap">
              <span className="kk">App membre · iOS / Android</span>
              <span className="tt">Planning et réservation de cours.</span>
            </div>
          </div>
        </div>
      </div>
      <div className="corner"><span className="dot" />Aperçu</div>
    </section>
  );
}

// ───────────────── Approach / features teaser ─────────────────
const TEASER_CARDS = [
  {
    n: "01",
    t: "Simple par conception",
    b: "Une prise en main en quelques minutes. Aucune formation, aucun manuel d'utilisation. Si l'usage n'est pas évident, c'est notre interface qui doit changer — pas vos équipes.",
    f: "Mise en service · 1 journée",
  },
  {
    n: "02",
    t: "Au prix juste",
    b: "Un tarif calibré pour un studio qui démarre, sans options cachées ni paliers commerciaux. Notre prix est public, il l'est dès le premier jour, il le restera.",
    f: "Tarif unique · Sans engagement",
  },
  {
    n: "03",
    t: "L'essentiel — pas le superflu",
    b: "Nous écartons délibérément les fonctionnalités que les studios ouvrent une fois puis oublient. À la place, des outils que vous utiliserez tous les jours, mieux conçus.",
    f: "Périmètre maîtrisé",
  },
];

function FeaturesCards() {
  return (
    <div className="feat-grid">
      {TEASER_CARDS.map((c) => (
        <article key={c.n} className="feat-card">
          <div className="feat-num">
            <span>{c.n}</span>
            <span className="glyph" />
          </div>
          <h3 className="feat-title">{c.t}</h3>
          <p className="feat-body">{c.b}</p>
          <div className="feat-footer">
            <span>{c.f}</span>
            <span className="mono">·</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function FeaturesPillars() {
  return (
    <div className="pillars">
      {TEASER_CARDS.map((c) => (
        <div className="pillar" key={c.n}>
          <div className="pillar-idx">
            <span className="glyph" />
            <span>{c.n} — Principe</span>
          </div>
          <h3>{c.t}</h3>
          <p>{c.b}</p>
        </div>
      ))}
    </div>
  );
}

function Approach({ layout }) {
  return (
    <section id="approche" className="section">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <span className="sec-kicker">Notre approche</span>
            <h2 className="sec-title">
              Trois principes, <span className="ser">tenus.</span>
            </h2>
          </div>
          <p className="sec-aside">
            getInnr s'adresse aux studios fitness qui veulent se lancer sans payer
            le tarif d'une plateforme conçue pour des chaînes. Voici l'ADN du produit.
          </p>
        </div>
        {layout === "pillars" ? <FeaturesPillars /> : <FeaturesCards />}
      </div>

      <div className="corner">
        <span className="dot" />
        Approche
      </div>
    </section>
  );
}

// ───────────────── Product teaser — locked cards ─────────────────
const LOCKED = [
  { idx: "01", tag: "Module produit", title: "Bientôt révélé" },
  { idx: "02", tag: "Module produit", title: "Bientôt révélé" },
  { idx: "03", tag: "Module produit", title: "Bientôt révélé" },
];

function ProductTeaser() {
  return (
    <section id="produit" className="section" style={{ background: "var(--bg-alt)" }}>
      <div className="wrap">
        <div className="sec-head">
          <div>
            <span className="sec-kicker">Produit</span>
            <h2 className="sec-title">
              Des fonctionnalités <span className="ser">inédites</span> sur le marché.
            </h2>
          </div>
          <p className="sec-aside">
            Nous finalisons trois modules absents des plateformes existantes.
            Leur dévoilement est prévu au lancement public — réservez votre démo
            pour être informé en avant-première.
          </p>
        </div>

        <div className="feat-grid locked">
          {LOCKED.map((l) => (
            <article key={l.idx} className="feat-card" style={{ opacity: .96 }}>
              <div className="feat-num">
                <span>{l.idx}</span>
                <span className="lock"><Lock /></span>
              </div>
              <h3 className="feat-title" style={{ color: "var(--muted)" }}>
                {l.title}
              </h3>
              <p className="feat-body">
                Un avantage concret, exclusif à getInnr, dévoilé lors de votre
                démo. Inscrivez-vous pour figurer parmi les premiers studios à
                en bénéficier.
              </p>
              <div className="feat-footer">
                <span>{l.tag}</span>
                <span className="mono">— sous embargo</span>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="corner">
        <span className="dot" />
        Produit
      </div>
    </section>
  );
}

// ───────────────── Démo form ─────────────────
function DemoSection() {
  const [state, setState] = useState({
    nom: "", email: "", studio: "", telephone: "", message: "",
  });
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState({});

  const change = (k) => (e) => setState((s) => ({ ...s, [k]: e.target.value }));

  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState(null);

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!state.nom.trim()) errs.nom = "Requis";
    if (!state.email.trim() || !/^\S+@\S+\.\S+$/.test(state.email)) errs.email = "Email invalide";
    if (!state.studio.trim()) errs.studio = "Requis";
    setErrors(errs);
    setSubmitErr(null);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    fetch("/api/public/demo-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom: state.nom.trim(),
        email: state.email.trim(),
        studio: state.studio.trim(),
        telephone: state.telephone.trim(),
        message: state.message.trim(),
      }),
    })
      .then(async (r) => {
        let data = {};
        try {
          data = await r.json();
        } catch (_) {
          /* ignore */
        }
        if (!r.ok) throw new Error(data.error || "Erreur " + r.status);
        setSent(true);
      })
      .catch((err) => {
        const isNet =
          err &&
          typeof err === "object" &&
          err.name === "TypeError" &&
          String(err.message).includes("fetch");
        setSubmitErr(
          isNet
            ? "Impossible de contacter le serveur : lancez npm start et ouvrez le site sur http://localhost:3000/"
            : err.message || "Envoi impossible"
        );
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <section id="demo" className="demo">
      <div className="wrap demo-shell">
        <div>
          <span className="sec-kicker">Démo</span>
          <h2 className="demo-claim">
            Voyez l'application en <span className="ser">quinze minutes,</span> sans installation.
          </h2>
          <p style={{ color: "var(--fg-soft)", fontSize: 16, lineHeight: 1.6, maxWidth: "46ch", margin: 0 }}>
            Un échange court, sans présentation commerciale appuyée.
            Vous nous décrivez votre studio, nous vous montrons l'interface
            et les modules à venir. Vous repartez avec une vision claire — et
            une proposition tarifaire.
          </p>

          <ul className="demo-list">
            <li><span className="tick"><Check /></span>Démonstration personnalisée selon votre activité</li>
            <li><span className="tick"><Check /></span>Aperçu en avant‑première des modules inédits</li>
            <li><span className="tick"><Check /></span>Tarif confirmé et garanti à vie sur votre abonnement</li>
            <li><span className="tick"><Check /></span>Réponse sous 24 heures ouvrées</li>
          </ul>
        </div>

        <div className="form-card">
          {sent ? (
            <div className="form-success">
              <div className="check"><Check size={20} /></div>
              <h5>Demande envoyée — merci.</h5>
              <p>
                Nous revenons vers vous sous 24 heures ouvrées pour fixer
                un créneau avec votre studio.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <h4>Réserver votre démo</h4>
              <div className="sub">15 minutes, en visio. Sans engagement.</div>

              <div className="field">
                <label>Nom complet {errors.nom && <span className="opt" style={{ color: "var(--accent-ink)" }}>{errors.nom}</span>}</label>
                <input type="text" value={state.nom} onChange={change("nom")} placeholder="Alice Lemoine" autoComplete="name" />
              </div>

              <div className="field">
                <label>Adresse e‑mail {errors.email && <span className="opt" style={{ color: "var(--accent-ink)" }}>{errors.email}</span>}</label>
                <input type="email" value={state.email} onChange={change("email")} placeholder="alice@studio-name.fr" autoComplete="email" />
              </div>

              <div className="field-row">
                <div className="field">
                  <label>Nom du studio {errors.studio && <span className="opt" style={{ color: "var(--accent-ink)" }}>{errors.studio}</span>}</label>
                  <input type="text" value={state.studio} onChange={change("studio")} placeholder="Studio Rive Droite" />
                </div>
                <div className="field">
                  <label>Téléphone <span className="opt">(facultatif)</span></label>
                  <input type="tel" value={state.telephone} onChange={change("telephone")} placeholder="06 12 34 56 78" />
                </div>
              </div>

              <div className="field">
                <label>Votre besoin <span className="opt">(facultatif)</span></label>
                <textarea value={state.message} onChange={change("message")} placeholder="Quelques mots sur votre studio, votre stade actuel, ou ce que vous souhaitez voir lors de la démo." />
              </div>

              {submitErr && (
                <div className="form-foot" style={{ color: "var(--accent-ink)", marginBottom: 10 }}>
                  {submitErr}
                </div>
              )}
              <button type="submit" className="form-submit" disabled={submitting}>
                {submitting ? "Envoi…" : "Demander une démo"} <Arrow />
              </button>
              <div className="form-foot">
                En envoyant ce formulaire, vous acceptez d'être contacté par
                un membre de l'équipe getInnr. Vos données ne sont pas
                cédées à des tiers.
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

// ───────────────── Footer ─────────────────
function Footer({ legalFooterLinks }) {
  return (
    <footer className="wrap footer">
      <div className="footer-left">
        <Brand size={18} />
        <span className="footer-copy">© 2026 getInnr. Tous droits réservés.</span>
      </div>
      <div className="footer-meta">
        {FOOTER_LEGAL_ITEMS.map(([key, href, label]) =>
          legalFooterLinks[key] ? (
            <a key={key} href={href}>
              {label}
            </a>
          ) : null
        )}
      </div>
    </footer>
  );
}

// ───────────────── App ─────────────────
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [landingSections, setLandingSections] = useState(() => normalizeLandingSections(null));
  const [legalFooterLinks, setLegalFooterLinks] = useState(() => normalizeLegalFooterLinks(null));

  useEffect(() => {
    fetch("/api/public/landing-sections", { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || typeof data.sections !== "object") return;
        setLandingSections(normalizeLandingSections(data.sections));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/public/legal-footer-links", { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || typeof data.links !== "object") return;
        setLegalFooterLinks(normalizeLegalFooterLinks(data.links));
      })
      .catch(() => {});
  }, []);

  // apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", t.theme || "light");
  }, [t.theme]);

  // apply accent color
  useEffect(() => {
    if (!t.accent) return;
    document.documentElement.style.setProperty("--accent", t.accent);
    // derive a darker ink + soft tint via CSS color-mix is already in stylesheet
    // but we also force --accent-ink to a slightly darker variant for legibility
    document.documentElement.style.setProperty(
      "--accent-ink",
      `color-mix(in oklab, ${t.accent} 80%, #000)`
    );
    document.documentElement.style.setProperty(
      "--accent-soft",
      `color-mix(in oklab, ${t.accent} 12%, var(--bg))`
    );
  }, [t.accent]);

  return (
    <>
      {!landingSections.hero && (
        <div id="top" aria-hidden />
      )}
      {landingSections.nav && <Nav sections={landingSections} />}
      {landingSections.hero && (
        <Hero variant={t.hero} headlineKey={t.headline} sections={landingSections} />
      )}
      {landingSections.approche && <Approach layout={t.featuresLayout} />}
      {landingSections.apercu && <Preview />}
      {landingSections.produit && <ProductTeaser />}
      {landingSections.demo && <DemoSection />}
      {landingSections.footer && <Footer legalFooterLinks={legalFooterLinks} />}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Mise en page" />
        <TweakRadio
          label="Hero"
          value={t.hero}
          options={["split", "centered", "editorial"]}
          onChange={(v) => setTweak("hero", v)}
        />
        <TweakSelect
          label="Accroche"
          value={t.headline}
          options={[
            { value: "institutional", label: "Institutionnelle" },
            { value: "direct", label: "Directe" },
            { value: "promise", label: "Promesse courte" },
          ]}
          onChange={(v) => setTweak("headline", v)}
        />
        <TweakRadio
          label="Section produit"
          value={t.featuresLayout}
          options={["cards", "pillars"]}
          onChange={(v) => setTweak("featuresLayout", v)}
        />

        <TweakSection label="Apparence" />
        <TweakRadio
          label="Thème"
          value={t.theme}
          options={["light", "dark"]}
          onChange={(v) => setTweak("theme", v)}
        />
        <TweakColor
          label="Accent"
          value={t.accent}
          options={["#a855f7", "#7c3aed", "#c084fc", "#6b21a8", "#111111"]}
          onChange={(v) => setTweak("accent", v)}
        />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
