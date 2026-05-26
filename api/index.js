require("dotenv").config();

let cached;

async function loadApp() {
  if (!cached) {
    const { createStore } = require("../server/store");
    const { buildApp } = require("../server/app");
    const store = await createStore();
    cached = buildApp(store);
  }
  return cached;
}

module.exports = async function vercelApi(req, res) {
  const app = await loadApp();
  return app(req, res);
};
