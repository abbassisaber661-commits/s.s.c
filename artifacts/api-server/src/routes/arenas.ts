/**
 * arenas.ts
 * ─────────
 * Arena configuration endpoint — returns server-authoritative arena definitions
 * (entry costs, reward multipliers, ELO K-factor) for all tiers.
 *
 * Routes:
 *   GET /arenas          → list all arena configs
 *   GET /arenas/:id      → single arena config
 */

import { Router } from "express";

const router = Router();

export const ARENAS = [
  {
    id:             "training",
    displayName:    "Training",
    aliases:        ["bronze"],
    tier:           1,
    entryCost:      0,
    winMultiplier:  1.5,
    drawMultiplier: 0.5,
    eloK:           16,
    minElo:         800,
    maxElo:         1099,
    description:    "Free entry. Low stakes — perfect for learning the game.",
    rewards: {
      win:  { dnMultiplier: 1.5, xp: 60  },
      draw: { dnMultiplier: 0.5, xp: 20  },
      loss: { dnMultiplier: 0,   xp: 8   },
    },
  },
  {
    id:             "coin",
    displayName:    "Coin Arena",
    aliases:        ["silver"],
    tier:           2,
    entryCost:      50,
    winMultiplier:  2.5,
    drawMultiplier: 0.8,
    eloK:           24,
    minElo:         1100,
    maxElo:         1399,
    description:    "50 coin entry. 2.5× win reward. Real stakes, real competition.",
    rewards: {
      win:  { dnMultiplier: 2.5, xp: 136 },
      draw: { dnMultiplier: 0.8, xp: 50  },
      loss: { dnMultiplier: 0,   xp: 25  },
    },
  },
  {
    id:             "pro",
    displayName:    "Pro League",
    aliases:        ["elite"],
    tier:           3,
    entryCost:      200,
    winMultiplier:  3.0,
    drawMultiplier: 1.0,
    eloK:           32,
    minElo:         1400,
    maxElo:         1699,
    description:    "200 coin entry. 3× win reward. High-skill competitive play.",
    rewards: {
      win:  { dnMultiplier: 3.0, xp: 152 },
      draw: { dnMultiplier: 1.0, xp: 50  },
      loss: { dnMultiplier: 0,   xp: 25  },
    },
  },
  {
    id:             "champion",
    displayName:    "Champion",
    aliases:        [],
    tier:           4,
    entryCost:      500,
    winMultiplier:  4.0,
    drawMultiplier: 1.2,
    eloK:           48,
    minElo:         1700,
    maxElo:         9999,
    description:    "500 coin entry. 4× win reward. Top-tier elite competition.",
    rewards: {
      win:  { dnMultiplier: 4.0, xp: 184 },
      draw: { dnMultiplier: 1.2, xp: 50  },
      loss: { dnMultiplier: 0,   xp: 25  },
    },
  },
];

router.get("/arenas", (_req, res) => {
  res.json(ARENAS);
});

router.get("/arenas/:id", (req, res) => {
  const arena = ARENAS.find(
    a => a.id === req.params.id || a.aliases.includes(req.params.id),
  );
  if (!arena) { res.status(404).json({ error: "arena not found" }); return; }
  res.json(arena);
});

export default router;
