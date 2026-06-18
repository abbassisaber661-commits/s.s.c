import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { playerSessionsTable, playersTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { createHash } from "crypto";

const JWT_SECRET = process.env["JWT_SECRET"] ?? "skillleague-dev-secret-change-in-prod";
const JWT_EXPIRES = "7d";

export interface AuthPayload {
  playerId: string;
  username: string;
  role: "player" | "admin" | "guest";
  iat?: number;
  exp?: number;
}

export function signToken(payload: Omit<AuthPayload, "iat" | "exp">): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyTokenRaw(token: string): AuthPayload {
  return jwt.verify(token, JWT_SECRET) as AuthPayload;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token" }); return;
  }
  const token = header.slice(7);
  try {
    const payload = verifyTokenRaw(token);
    req.auth = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      req.auth = verifyTokenRaw(header.slice(7));
    } catch { }
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.auth?.role !== "admin") {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    next();
  });
}
