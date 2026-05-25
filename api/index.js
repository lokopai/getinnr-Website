/**
 * Handler Vercel : export de l’app Express (runtime Node gère l’adaptation).
 */
require("dotenv").config();

module.exports = require("../server/app").app;
