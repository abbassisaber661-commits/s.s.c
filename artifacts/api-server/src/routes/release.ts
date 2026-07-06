import { Router } from "express";
import { db, playersTable, pvpMatchesTable } from "@workspace/db";
import { count, gte } from "drizzle-orm";

const router = Router();

const RC_VERSION = "1.0.0-rc.1";
const RC_DATE = "2026-05-29";

const CHECKLIST = [
  { id: "auth",       label: "نظام تسجيل الدخول",        status: "done",    note: "Google + Pi + Guest" },
  { id: "matchmaking",label: "نظام المباريات",            status: "done",    note: "PvP + Bots + Tournaments" },
  { id: "economy",    label: "نظام DN$",                  status: "done",    note: "DN$ + Transactions" },
  { id: "vip",        label: "اشتراك VIP عبر Pi",        status: "done",    note: "3 مستويات مفعّلة" },
  { id: "store",      label: "المتجر + Pi",               status: "done",    note: "عناصر مدفوعة بـ Pi" },
  { id: "anticheat",  label: "Anti-Cheat",                status: "done",    note: "Score + Bot + Multi-account" },
  { id: "security",   label: "تأمين API",                 status: "done",    note: "Rate limit + JWT + CORS" },
  { id: "analytics",  label: "تحليلات اللاعبين",          status: "done",    note: "Retention + Features + Economy" },
  { id: "monitor",    label: "مراقبة مباشرة",             status: "done",    note: "Live dashboard + Alerts" },
  { id: "lootbox",    label: "توازن الصناديق",            status: "done",    note: "Anti-inflation balancing" },
  { id: "pwa",        label: "PWA / Web Deployment",      status: "done",    note: "Vite PWA ready" },
  { id: "piapps",     label: "Pi Apps Publishing",        status: "pending", note: "في الانتظار - يحتاج Pi SDK live" },
  { id: "terms",      label: "Terms & Privacy",           status: "done",    note: "صفحات مرتبطة في الإعدادات" },
  { id: "i18n",       label: "دعم اللغة العربية",         status: "done",    note: "AR + EN كامل" },
  { id: "offline",    label: "وضع عدم الاتصال",          status: "done",    note: "Local fallback + sync" },
];

router.get("/release/status", async (req, res) => {
  try {
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [players] = await db.select({ count: count() }).from(playersTable);
    const [matches7d] = await db.select({ count: count() })
      .from(pvpMatchesTable).where(gte(pvpMatchesTable.createdAt, since7d));

    const done = CHECKLIST.filter(c => c.status === "done").length;
    const readiness = Math.round((done / CHECKLIST.length) * 100);

    res.json({
      version: RC_VERSION,
      date: RC_DATE,
      readiness,
      checklist: CHECKLIST,
      summary: {
        totalPlayers: players.count,
        matchesLast7d: matches7d.count,
        featuresReady: done,
        featuresPending: CHECKLIST.filter(c => c.status === "pending").length,
        overallStatus: readiness >= 90 ? "ready" : readiness >= 70 ? "almost_ready" : "in_progress",
      },
      deploymentTargets: [
        { id: "web",    label: "Web (Replit)",   status: "live",    url: "skill-league.replit.app" },
        { id: "mobile", label: "Mobile PWA",     status: "ready",   url: "قابل للتثبيت كـ PWA" },
        { id: "pi",     label: "Pi Apps",        status: "pending", url: "في انتظار مراجعة Pi Network" },
      ],
      removedFeatures: [
        "InviteGate (مفتوح للجميع الآن)",
        "Debug panel (محذوف من Prod)",
        "Fake match simulator (محذوف)",
      ],
    });
  } catch (err) {
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/release/ping", async (req, res) => {
  const { platform, version } = req.body as { platform?: string; version?: string };
  res.json({
    ok: true,
    serverVersion: RC_VERSION,
    platform: platform ?? "unknown",
    clientVersion: version ?? "unknown",
    compatible: true,
    message: "SkillLeague RC — الخادم يعمل بشكل طبيعي",
  });
});

export default router;
