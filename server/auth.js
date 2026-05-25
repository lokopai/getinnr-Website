const crypto = require("crypto");

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function requireAuth(db) {
  return (req, res, next) => {
    const token = req.cookies?.session;
    if (!token) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    const now = Date.now();
    const row = db
      .prepare(
        `
      SELECT s.admin_id AS id, a.username
      FROM sessions s
      JOIN admins a ON a.id = s.admin_id
      WHERE s.token = ? AND s.expires_at > ?
    `
      )
      .get(token, now);

    if (!row) {
      res.status(401).json({ error: "Session expirée" });
      return;
    }

    req.admin = { id: row.id, username: row.username };
    next();
  };
}

function createSession(db, adminId, res) {
  const token = generateToken();
  const expiresAt = Date.now() + SESSION_MAX_AGE_MS;
  db.prepare(`INSERT INTO sessions (token, admin_id, expires_at) VALUES (?, ?, ?)`).run(
    token,
    adminId,
    expiresAt
  );

  const secure =
    process.env.NODE_ENV === "production" ||
    String(process.env.COOKIE_SECURE || "").toLowerCase() === "true";

  res.cookie("session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge: SESSION_MAX_AGE_MS,
    path: "/",
  });

  db.prepare(`DELETE FROM sessions WHERE expires_at < ?`).run(Date.now());
}

function destroySession(db, req, res) {
  const token = req.cookies?.session;
  if (token) {
    db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
  }
  res.clearCookie("session", { path: "/" });
}

module.exports = { requireAuth, createSession, destroySession };
