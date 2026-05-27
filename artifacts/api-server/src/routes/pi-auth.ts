import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.post("/auth/pi", async (req, res) => {
  const accessToken: unknown = req.body?.accessToken;
  if (typeof accessToken !== "string" || !accessToken) {
    res.status(400).json({ error: "accessToken is required" });
    return;
  }

  try {
    const piRes = await fetch("https://api.minepi.com/v2/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!piRes.ok) {
      req.log.warn({ status: piRes.status }, "Pi token validation rejected");
      res.status(401).json({ error: "Invalid Pi access token" });
      return;
    }

    const piUser = (await piRes.json()) as { uid: string; username: string };

    req.log.info({ uid: piUser.uid }, "Pi user authenticated");
    res.json({ uid: piUser.uid, username: piUser.username });
  } catch (err) {
    req.log.error({ err }, "Pi token validation failed");
    res.status(500).json({ error: "Failed to validate Pi token" });
  }
});

export default router;
