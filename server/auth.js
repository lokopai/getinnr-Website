const crypto = require("crypto");

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function cookieSecure() {
  return (
    process.env.NODE_ENV === "production" ||
    String(process.env.COOKIE_SECURE || "").toLowerCase() === "true"
  );
}

/** Middleware : store SQLite ou Postgres. */
function requireAuth(store) {
  return async (req, res, next) => {
    try {
      const token = req.cookies?.session;
      if (!token) {
        res.status(401).json({ error: "Non authentifié" });
        return;
      }
      const row = await store.getSessionAdmin(token, Date.now());
      if (!row) {
        res.status(401).json({ error: "Session expirée" });
        return;
      }
      req.admin = { id: row.id, username: row.username };
      next();
    } catch (e) {
      next(e);
    }
  };
}

async function attachSession(store, adminId, res) {
  const token = generateToken();
  const expiresAt = Date.now() + SESSION_MAX_AGE_MS;
  await store.saveSession(token, adminId, expiresAt);
  await store.deleteExpiredSessions(Date.now());

  res.cookie("session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    maxAge: SESSION_MAX_AGE_MS,
    path: "/",
  });
}

async function clearSession(store, req, res) {
  const token = req.cookies?.session;
  if (token) await store.deleteSession(token);
  res.clearCookie("session", { path: "/" });
}

module.exports = {
  SESSION_MAX_AGE_MS,
  requireAuth,
  attachSession,
  clearSession,
};
