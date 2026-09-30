const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const { error } = require("./content.cjs");
function services() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT)
    throw error("Le service éditorial est en cours de configuration.", 503);
  if (!getApps().length)
    initializeApp({
      credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    });
  return { db: getFirestore(), auth: getAuth() };
}
function configured() {
  return !!(
    process.env.FIREBASE_SERVICE_ACCOUNT &&
    process.env.DECORUM_ADMIN_UIDS &&
    process.env.DECORUM_RULES_VERIFIED === "true"
  );
}
async function authorize(req) {
  if (!configured())
    throw error(
      "La rédaction attend la validation de sa configuration de sécurité.",
      503,
    );
  const { auth } = services();
  const token = String(req.headers.authorization || "").replace(/^Bearer /, "");
  if (!token) throw error("Connexion nécessaire.", 401);
  let user;
  try {
    user = await auth.verifyIdToken(token, true);
  } catch {
    throw error("Session expirée. Reconnectez-vous.", 401);
  }
  const allowed = (process.env.DECORUM_ADMIN_UIDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!allowed.includes(user.uid))
    throw error("Accès réservé à la rédaction.", 403);
  return user;
}
module.exports = { services, authorize, configured };
