require("dotenv").config();

let cached;

async function loadApp() {
  if (!cached) {
    const { createStore } = require("../server/store");
    const { buildApp } = require("../server/app");
    
    // Ne pas cacher le store, le recréer à chaque fois pour éviter les connexions fermées
    console.log("[Vercel] Création nouveau store PostgreSQL");
    const store = await createStore();
    cached = { buildApp, createStore };
  }
  return cached;
}

module.exports = async function vercelApi(req, res) {
  try {
    const { buildApp, createStore } = await loadApp();
    
    // Créer un nouveau store pour chaque requête (évite les connexions fermées)
    const store = await createStore();
    const app = buildApp(store);
    
    return app(req, res);
  } catch (error) {
    console.error("[Vercel] Erreur:", error.message);
    res.status(500).json({ error: "Erreur serveur" });
  }
};
