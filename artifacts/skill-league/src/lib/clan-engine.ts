// ─────────────────────────────────────────────
// ⚔️ SkillLeague Clan Engine
// ─────────────────────────────────────────────

export interface ClanMember {
  id: string;
  username: string;
  role: "leader" | "officer" | "member";
}

export interface Clan {
  id: string;
  name: string;
  tag: string;
  points: number;
  members: ClanMember[];
}

export function createClan(
  id: string,
  name: string,
  tag: string,
  leader: ClanMember
): Clan {
  return {
    id,
    name,
    tag,
    points: 0,
    members: [
      {
        ...leader,
        role: "leader",
      },
    ],
  };
}

export function addClanMember(
  clan: Clan,
  member: ClanMember
): Clan {
  return {
    ...clan,
    members: [...clan.members, member],
  };
}

export function removeClanMember(
  clan: Clan,
  memberId: string
): Clan {
  return {
    ...clan,
    members: clan.members.filter(
      (m) => m.id !== memberId
    ),
  };
}

export function addClanPoints(
  clan: Clan,
  points: number
): Clan {
  return {
    ...clan,
    points: clan.points + points,
  };
}