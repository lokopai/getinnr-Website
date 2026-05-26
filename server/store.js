/**
 * Point d'entrée unique : PostgreSQL/Supabase uniquement.
 */

async function createStore() {
  const url = String(process.env.DATABASE_URL || "").trim();
  if (!url.startsWith("postgres://") && !url.startsWith("postgresql://")) {
    throw new Error("DATABASE_URL PostgreSQL/Supabase requis. SQLite non supporté.");
  }
  return require("./store-pg").createPgStore();
}

module.exports = { createStore };