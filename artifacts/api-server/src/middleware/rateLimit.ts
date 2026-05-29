import { Request, Response, NextFunction } from "express";

const store = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(opts: { windowMs: number; max: number; message?: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const key = `${ip}:${req.path.split("/")[1]}`;
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + opts.windowMs };
      store.set(key, entry);
    }
    entry.count++;

    if (entry.count > opts.max) {
      res.set("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({
        error: "too_many_requests",
        message: opts.message || "Too many requests, please slow down.",
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      });
    }

    res.set("X-RateLimit-Limit", String(opts.max));
    res.set("X-RateLimit-Remaining", String(opts.max - entry.count));
    next();
  };
}

export const defaultRateLimit  = rateLimit({ windowMs: 60_000, max: 120 });
export const strictRateLimit   = rateLimit({ windowMs: 60_000, max: 20,  message: "Too many requests on this endpoint." });
export const postRateLimit     = rateLimit({ windowMs: 60_000, max: 30 });

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now > v.resetAt) store.delete(k);
  }
}, 60_000);
