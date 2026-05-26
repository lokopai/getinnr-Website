/**
 * Charge le contenu d'une page légale / contact depuis l'API SQLite.
 * data-page-slug sur <html>.
 */
(function legalLoader() {
  var slug =
    document.documentElement.getAttribute("data-page-slug") ||
    document.body.getAttribute("data-page-slug");
  if (!slug) return;

  var main = document.querySelector("main.doc-body");
  if (!main) return;

  var LEGAL_FOOTER_KEYS = ["mentions-legales", "confidentialite", "cgu", "cgv", "contact"];

  function hrefFooterSlug(href) {
    var s = String(href || "").replace(/^\.\//, "").trim();
    if (!/\.html$/i.test(s)) return "";
    return s.replace(/\.html$/i, "");
  }

  function normalizeFooterLinksMap(raw) {
    var o = {};
    for (var i = 0; i < LEGAL_FOOTER_KEYS.length; i++) {
      var k = LEGAL_FOOTER_KEYS[i];
      o[k] = !(raw && raw[k] === false);
    }
    return o;
  }

  function applyLegalFooterLinks(linkMap) {
    var footer = document.querySelector("footer.footer .footer-meta");
    if (!footer) return;
    var nodes = footer.querySelectorAll("a[href]");
    for (var i = 0; i < nodes.length; i++) {
      var slug = hrefFooterSlug(nodes[i].getAttribute("href"));
      if (LEGAL_FOOTER_KEYS.indexOf(slug) === -1) continue;
      nodes[i].hidden = !linkMap[slug];
    }
  }

  fetch("/api/public/legal-footer-links", { credentials: "same-origin" })
    .then(function (r) {
      return r.ok ? r.json() : null;
    })
    .then(function (data) {
      var raw = data && typeof data.links === "object" ? data.links : null;
      applyLegalFooterLinks(normalizeFooterLinksMap(raw));
    })
    .catch(function () {
      applyLegalFooterLinks(normalizeFooterLinksMap(null));
    });

  var host = document.getElementById("legal-main-host");
  var banner = document.getElementById("legal-load-msg");

  function metaLine(span, boldLabel, rest) {
    span.textContent = "";
    var s = document.createElement("strong");
    s.textContent = boldLabel;
    span.appendChild(s);
    span.appendChild(document.createTextNode(" · " + (rest || "")));
  }

  function fail(msg) {
    if (banner) {
      banner.textContent = msg || "Impossible de charger cette page.";
      banner.style.display = "block";
      main.hidden = false;
    }
  }

  /** Supprime dans le sommaire les numéros déjà dans le libellé (« 12. », « 12 », « 12Permissions »…) pour éviter le doublon avec le <ol>. */
  function dedupeTOCAnchorNumeration(scope) {
    if (!scope) return;
    var anchors = scope.querySelectorAll(".toc ol li > a,.toc ul li > a");
    for (var i = 0; i < anchors.length; i++) {
      var a = anchors[i];
      var original = String(a.textContent || "").trim();
      if (!original) continue;
      var t = original;
      var guard = 0;
      while (guard++ < 12) {
        var prev = t;
        t = t.replace(/^\s*\d{1,3}\s*[.\)\-–—]\s+/, "").trim();
        t = t.replace(/^\s*\d{1,3}\s+/, "").trim();
        t = t.replace(/^\d{1,3}[.\)]\s*/, "").trim();
        t = t
          .replace(/^\d{1,3}(?=[A-Za-zÀ-ÖØ-öø-ÿŒœ])/i, "")
          .trim();
        if (t === prev) break;
      }
      if (t.length) a.textContent = t;
    }
  }

  fetch("/api/public/pages/" + encodeURIComponent(slug), { credentials: "same-origin" })
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function (p) {
      document.title = p.html_title || document.title;

      var kicker = document.querySelector("header.doc-head .kicker");
      if (kicker && p.kicker != null) kicker.textContent = p.kicker;

      var title = document.querySelector("header.doc-head .doc-title");
      if (title && p.h1 != null) title.textContent = p.h1;

      var spans = document.querySelectorAll(".doc-meta.doc-meta-dynamic > span");
      if (spans.length >= 2) {
        metaLine(spans[0], "Dernière mise à jour", p.meta_updated || "");
        metaLine(spans[1], "Édité par", p.meta_editor || "");
      }

      if (!host) {
        fail("Structure HTML inattendue (legal-main-host).");
        return;
      }

      host.innerHTML = p.main_html || "";
      dedupeTOCAnchorNumeration(main);

      if (banner) banner.style.display = "none";

      var hasToc = main.querySelector("aside.toc");
      if (hasToc) {
        main.style.removeProperty("grid-template-columns");
      } else {
        main.style.gridTemplateColumns = "1fr";
      }

      main.hidden = false;
    })
    .catch(function () {
      fail(
        "Contenu indisponible. Démarrez le site avec npm start (serveur Node requis)."
      );
    });
})();
