# getInnr — Site de présentation

Landing page institutionnelle pour **getInnr**, logiciel de gestion pour studios fitness.

> **Note importante sur les captures d'écran.**
> Les captures d'écran affichées dans le site (`assets/app-abonnement.png`, `assets/app-cours.png`, `assets/app-planning.png`) ont été prises depuis **l'application iOS** de getInnr. La barre de statut iPhone (heure, signal, batterie) est volontairement conservée dans les visuels. Si vous souhaitez remplacer ces images, fournir des captures **iOS** dans les mêmes dimensions (1206 × 2622 px, ratio ≈ 1:2.17). Pour des écrans desktop, prévoir un ratio 2498 × 1168 (ce ratio a été utilisé pour la capture CRM `assets/app-crm.png`, actuellement non affichée mais conservée pour usage futur).

---

## Stack technique

- HTML5 + CSS3 (variables CSS, color-mix, grid, container queries)
- **React 18.3.1** + **Babel Standalone 7.29.0** chargés via CDN (unpkg)
- JSX inline (pas de bundler) — fichiers livrés tels quels
- Pas de framework CSS côté front ; **dépendances npm** côté serveur : Express, **SQLite** (option local) ou **PostgreSQL** via `pg` si `DATABASE_URL` est défini (voir « Serveur »)

**Choix volontaire (front) :** la landing fonctionne encore sans bundler lorsque tout est chargé depuis un serveur ; les pages légales et le formulaire nécessitent le **serveur Node** ci‑dessous pour la persistance et les API.

---

## Serveur (Express — back-office + contenu dynamique)

En plus du frontal HTML/React décrit ci‑après, ce dépôt inclut **`server/`** :

- **`npm install`** puis **`npm start`** (voir `.env.example` : utilisateur admin, secret de session, mot de passe). Au **redémarrage**, le hash du compte `ADMIN_USERNAME` est **mis à jour** pour correspondre à `ADMIN_PASSWORD`.

### Mode persistance

| Mode | Variable | Comportement |
|------|-----------|--------------|
| **SQLite (défaut local)** | Pas de `DATABASE_URL` | Fichier **`DATABASE_PATH`** (`./data/site.db` par défaut, ou exactement **`:memory:`** pour tests). Schéma créé par `server/db.js`. |
| **PostgreSQL / Supabase** | **`DATABASE_URL`** = `postgres://…` ou `postgresql://…` | Connexion **`pg`**, schéma appliqué depuis **`server/pg-schema.sql`**, même seed que SQLite. Idéal pour **Supabase self‑hosted** ou tout Postgres managé. |

- En **production** avec Postgres, définis aussi **`DATABASE_SSL=true`** si ton instance impose TLS avec certificat à valider côté client (souvent utile en Docker / self‑hosted).
- **Migration** depuis un ancien `site.db` SQLite : outil type **pgloader**, export CSV + import, ou créer une base Postgres vide (le serveur repeuple les pages par défaut au premier démarrage si la table `pages` est vide).

- L’authentification du back-office reste **cookies + table `sessions`** (pas besoin d’activer Supabase Auth pour ce site).
- Le contenu des pages **Mentions**, **Confidentialité**, **CGU**, **CGV**, **Contact** est **éditable** dans `admin.html` ; le HTML est stocké en base comme avant.
- **`legal-loader.js`** injecte le HTML des pages légales après chargement depuis l’API (toujours via le serveur Node, pas `file://`).

**Arborescence complémentaire :**

```
.
├── package.json / server/       Express + couche « store » (SQLite ou Postgres)
├── server/pg-schema.sql          DDL PostgreSQL (bootstrap auto si DATABASE_URL)
├── server/legal-defaults/        HTML initial pour le seed
├── legal-loader.js               Chargement client des pages légales
├── admin.html                    Back-office
├── data/site.db                  SQLite local (gitignoré, si pas de DATABASE_URL)

```

Pour le développement : copier `.env.example` vers `.env`. En local sans `DATABASE_URL`, la base SQLite sous `DATABASE_PATH` suffit. Pour **Supabase self‑hosted**, récupère l’URI Postgres (port 5432) dans les paramètres du projet → **`DATABASE_URL=postgresql://…`** (et **`DATABASE_SSL=true`** si besoin).

### Déploiement Vercel

1. **`npx vercel`** puis **`npx vercel --prod`**, ou import Git depuis le dashboard.
2. **`api/index.js`** initialise le store puis sert **`buildApp(store)`**.
3. Variables d’environnement : **`SESSION_SECRET`**, **`ADMIN_USERNAME`**, **`ADMIN_PASSWORD`**.
   - Pour une prod fiable avec plusieurs instances : définit **`DATABASE_URL`** vers ton Postgres (**Supabase** ou autre) au lieu de compter sur une SQLite sous `/tmp`.
   - Si tu restes en SQLite sans `DATABASE_URL` sur Vercel : comportement précédent (fichier sous `/tmp` par défaut, non partagé entre instances).

Le back-office est à l’URL du site : **`/admin.html`**.

---

## Arborescence (fichiers initiaux + extensions)

```
.
├── index.html                  Page d'accueil — shell HTML, styles globaux, montage React
├── app.jsx                     Composants React de la landing
├── tweaks-panel.jsx            Panneau de tweaks (toggle dans la barre d'outils éditeur)
├── mentions-legales.html       Page légale — éditeur, hébergeur, PI, etc.
├── confidentialite.html        Politique de confidentialité RGPD
├── cgu.html                    Conditions Générales d'Utilisation
├── cgv.html                    Conditions Générales de Vente (contenu SQLite)
├── contact.html                Coordonnées / contact éditable (contenu SQLite)
└── assets/
    ├── logo.png                Logo source fourni par le client
    ├── app-abonnement.png      Capture iOS — écran "Mon abonnement"
    ├── app-cours.png           Capture iOS — écran "Cours"
    ├── app-planning.png        Capture iOS — écran "Planning"
    └── app-crm.png             Capture web — console studio (non utilisée actuellement)
```

---

## Charte graphique

### Typographies
- **Sans (corps + titres)** : Helvetica Neue · Helvetica · Arial
- **Script (logo brandmark uniquement)** : Caveat Brush (Google Fonts)

### Couleurs

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--bg` | `#faf9f7` | `#0c0b0d` | Fond principal |
| `--bg-alt` | `#f2f1ed` | `#141215` | Sections alternées |
| `--fg` | `#0d0d0d` | `#f5f4f1` | Texte principal |
| `--fg-soft` | `#3a3a38` | `#cfcdc8` | Texte secondaire |
| `--muted` | `#7a7a76` | `#8b8985` | Métadonnées, légendes |
| `--line` | `#e6e4df` | `#26242a` | Séparateurs |
| `--line-strong` | `#d4d2cc` | `#34323a` | Bordures de carte |
| `--accent` | `#a855f7` | `#c084fc` | Violet du logo — accent |
| `--accent-ink` | `#7c3aed` | `#d8b4fe` | Violet foncé — mots mis en valeur |
| `--accent-soft` | `#f3e8ff` | `#1d1622` | Fonds doux accentués |

**Règle d'usage du violet** : il est délibérément **discret** (le « . » du logo, les points de section, les mots-clés des titres, les focus rings). Jamais en aplat de fond, jamais en gros bouton.

---

## Logo HTML

Le logotype getInnr est **reconstruit en HTML/CSS** (pas une image) pour fonctionner sur fond clair et sombre. Voir la classe `.brand` dans `index.html` :

```html
<span class="brand">
  <span class="b-get">Get</span>     <!-- script handwritten, violet -->
  <span class="b-innr">INNR</span>   <!-- bold condensed -->
  <span class="b-dot"></span>        <!-- pastille violette -->
</span>
```

Le logo source `assets/logo.png` est conservé pour référence et pour l'icône favicon éventuelle.

---

## Structure de la landing

1. **Nav** — sticky, blur, logo + CTA "Demander une démo"
2. **Hero** — accroche + lede + double CTA + capture iOS Planning dans bezel
3. **Approche** — 3 principes (Simple / Prix juste / Sans superflu)
4. **Aperçu** — 3 captures iOS en composition décalée
5. **Produit (sous embargo)** — 3 cartes verrouillées teasant les modules inédits
6. **Démo** — formulaire complet (nom, email, studio, téléphone, message)
7. **Footer** — marque + copyright + liens légaux

---

## Tweaks (mode éditeur)

Un panneau de tweaks est disponible en cliquant sur le toggle "Tweaks" dans la barre d'outils. Il expose :

- **Hero** : `split` / `centered` / `editorial`
- **Accroche** : 3 variations de copywriting
- **Section produit** : `cards` (3 colonnes) / `pillars` (rangées éditoriales)
- **Thème** : `light` / `dark`
- **Accent** : 5 nuances de violet + noir

Les valeurs par défaut sont persistées dans un bloc `/*EDITMODE-BEGIN*/{...}/*EDITMODE-END*/` au début de `app.jsx`.

---

## Contenu à personnaliser avant production

Les valeurs marquées **`<span class="placeholder">…</span>`** (pastille violette) dans les pages légales sont à compléter :

- `mentions-legales.html` : raison sociale, capital, siège, RCS, TVA, directeur de publication, hébergeur
- `confidentialite.html` : raison sociale + adresse, DPO
- `cgu.html` : URL de la page tarifs, conditions d'engagement précises

Email à provisionner :
- `contact@getinnr.com`
- `privacy@getinnr.com`

---

## Mise en ligne

**Bundle front :** toujours aucune étape webpack/vite — les fichiers `index.html`, `app.jsx` et `*.html` légales sont livrés tels quels.

**Serveur recommandé (formulaire démo + pages légales + admin) :**

- Déployer le dépôt sur une machine où **Node 18+** tourne (`npm ci && npm start` derrière un reverse proxy), ou un PaaS supportant Node.
- Exposer les variables d’environnement (`.env`) : `ADMIN_*`, `SESSION_SECRET`, `DATABASE_PATH` si besoin.
- Sans serveur Node, la **landing** peut encore s’afficher statiquement, mais le **formulaire de démo** et le **contenu légal chargé depuis SQLite** ne fonctionneront pas.

**Déploiement purement statique (fallback) :**

- **Netlify / Vercel / Cloudflare Pages** : possible pour la **landing seule** si vous acceptez de ne pas utiliser SQLite / back-office sur ce mode.
- **OVH / serveur classique** : copier le dossier ou servir via Node comme ci‑dessus.

Le formulaire de démo (`<DemoSection>` dans `app.jsx`) **enregistre les demandes en SQLite** lorsque le site est servi par `npm start`. Pour un service de mail transactionnel, brancher un envoi côté serveur ou un webhook depuis `server/index.js`.

Ancienne note (mode 100 % statique sans serveur) — **factice** (validation locale uniquement) : à brancher sur :
- un service de mail transactionnel (Resend, Postmark, SendGrid)
- ou un endpoint Netlify Forms / Formspree
- ou votre propre API

Voir la fonction `submit()` dans `DemoSection` pour le point d'intégration.

---

## Notes pour la suite

- Les **3 modules inédits** (section "Produit sous embargo") sont à dévoiler au lancement. Remplacer les `title: "Bientôt révélé"` dans `app.jsx` par les vrais noms et descriptions.
- La capture CRM desktop (`app-crm.png`) est conservée dans `/assets` mais n'est plus référencée dans le code. Disponible si besoin de la réintégrer.
- Le pricing n'est pas encore intégré (pas de section Tarifs). Mention "Tarif unique · Sans engagement" sur la carte d'Approche n° 02.
