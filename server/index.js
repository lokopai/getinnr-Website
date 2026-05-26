require("dotenv").config();

const { createStore } = require("./store");
const { buildApp } = require("./app");

const PORT = Number(process.env.PORT || 3000);

createStore()
  .then((store) => {
    console.log(`[getInnr] Backend: ${store.dialect}`);
    const url = String(process.env.DATABASE_URL || "").trim();
    console.log(
      url.startsWith("postgres")
        ? "[getInnr] Postgres (Supabase ou autre) via DATABASE_URL"
        : "[getInnr] SQLite via DATABASE_PATH ou défaut ./data/site.db"
    );
    return buildApp(store);
  })
  .then((app) =>
    app.listen(PORT, () => {
      console.log(`getInnr site → http://localhost:${PORT}`);
      console.log(`Back-office → http://localhost:${PORT}/admin.html`);
    })
  )
  .catch((e) => {
    console.error("[getInnr] Arrêt:", e.message || e);
    process.exit(1);
  });
