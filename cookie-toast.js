/**
 * Petit toast « vie privée » : pas de consentement CMP, juste un message clair que l’on ne collecte pas.
 */
(function cookieToastInit() {
  var STORAGE_KEY = "getinnr_cookie_toast_v1";

  function canUseStorage() {
    try {
      return typeof localStorage !== "undefined";
    } catch (_) {
      return false;
    }
  }

  if (canUseStorage() && localStorage.getItem(STORAGE_KEY) === "1") return;

  var prefersReduce =
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;

  var style = document.createElement("style");
  style.textContent =
    "#getinnr-cookie-toast{position:fixed;z-index:300;left:16px;right:16px;bottom:18px;margin:0 auto;max-width:420px;font-family:inherit;font-size:14px;line-height:1.45;color:var(--fg,#111);pointer-events:auto;}" +
    "#getinnr-cookie-toast.getinnr-cookie-toast--hide{opacity:0;transform:translateY(14px);pointer-events:none}" +
    (prefersReduce
      ? "#getinnr-cookie-toast{transition:opacity .2s ease}"
      : "#getinnr-cookie-toast{transition:opacity .35s ease,transform .38s cubic-bezier(.2,.8,.2,1)}") +
    "#getinnr-cookie-toast-inner{" +
    "background:color-mix(in oklab,var(--accent-soft,#f3e8ff) 92%,transparent);" +
    "border:1px solid color-mix(in oklab,var(--accent,#a855f7) 28%,var(--line,#e6e4df));" +
    "border-radius:14px;padding:14px 16px 14px;" +
    "box-shadow:0 -4px 24px rgba(0,0,0,.06),0 2px 8px rgba(0,0,0,.04);" +
    "backdrop-filter:saturate(140%) blur(10px);" +
    "}" +
    "#getinnr-cookie-toast-title{font-weight:700;letter-spacing:-.02em;margin:0 0 6px;font-size:14px;display:flex;align-items:center;gap:8px;}" +
    "#getinnr-cookie-toast-title .cookie-emoji{font-size:1.25em;line-height:1}" +
    "#getinnr-cookie-toast-msg{margin:0 0 12px;color:var(--fg-soft,var(--muted,#444));font-size:13px;white-space:pre-line}" +
    "#getinnr-cookie-toast-dismiss{" +
    "appearance:none;-webkit-appearance:none;border:1px solid var(--fg-soft,#444);" +
    "background:var(--fg,#111);color:var(--bg,#fff);padding:9px 16px;border-radius:999px;" +
    "font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;" +
    "transition:transform .15s ease,opacity .15s ease" +
    "}" +
    "#getinnr-cookie-toast-dismiss:hover{opacity:.9;transform:scale(1.02)}" +
    "#getinnr-cookie-toast-dismiss:focus-visible{outline:2px solid var(--accent,#a855f7);outline-offset:2px}" +
    "@media (max-width:480px){#getinnr-cookie-toast{left:12px;right:12px;bottom:14px}}";

  document.head.appendChild(style);

  var root = document.createElement("div");
  root.id = "getinnr-cookie-toast";
  root.setAttribute("role", "status");
  root.setAttribute(
    "aria-label",
    "Information sur l’absence de cookies marketing sur ce site"
  );

  var inner = document.createElement("div");
  inner.id = "getinnr-cookie-toast-inner";

  var title = document.createElement("p");
  title.id = "getinnr-cookie-toast-title";
  var titleEmoji = document.createElement("span");
  titleEmoji.className = "cookie-emoji";
  titleEmoji.setAttribute("aria-hidden", "true");
  titleEmoji.textContent = "\u{1F36A}\u00A0";
  var titleText = document.createElement("span");
  titleText.textContent = "Ici les cookies sont light";
  title.appendChild(titleEmoji);
  title.appendChild(titleText);

  var msg = document.createElement("p");
  msg.id = "getinnr-cookie-toast-msg";
  msg.textContent =
    "Zéro biscuit espion : aucun cookie de pub ou de tracking sur ce site.\n" +
      "Les barres, c’est à la cage à squat ; ici aucun tableau de tes allers-retours numériques.";

  var btn = document.createElement("button");
  btn.type = "button";
  btn.id = "getinnr-cookie-toast-dismiss";
  btn.textContent = "OK coach, tout est carré ✓";

  var dismissed = false;

  function removeEsc() {
    document.removeEventListener("keydown", onEsc, true);
  }

  function onEsc(ev) {
    if (ev.key === "Escape" || ev.key === "Esc") {
      removeEsc();
      close();
    }
  }

  function close() {
    if (dismissed) return;
    dismissed = true;
    removeEsc();
    root.classList.add("getinnr-cookie-toast--hide");
    if (canUseStorage()) localStorage.setItem(STORAGE_KEY, "1");
    window.setTimeout(function () {
      if (root.parentNode) root.parentNode.removeChild(root);
    }, prefersReduce ? 220 : 400);
  }

  btn.addEventListener("click", close);

  document.addEventListener("keydown", onEsc, true);

  inner.appendChild(title);
  inner.appendChild(msg);
  inner.appendChild(btn);
  root.appendChild(inner);
  document.body.appendChild(root);

  btn.focus({ preventScroll: true });
})();
