// ─────────────────────────────────────────────
// 🎨 SkillLeague Profile Customization
// ─────────────────────────────────────────────

export interface ProfileCustomization {
  avatar?: string;
  banner?: string;
  title?: string;
  badge?: string;
}

export function createDefaultCustomization(): ProfileCustomization {
  return {
    avatar: "default-avatar",
    banner: "default-banner",
    title: "Rookie",
    badge: "bronze_badge",
  };
}

export function updateAvatar(
  customization: ProfileCustomization,
  avatar: string
): ProfileCustomization {
  return {
    ...customization,
    avatar,
  };
}

export function updateBanner(
  customization: ProfileCustomization,
  banner: string
): ProfileCustomization {
  return {
    ...customization,
    banner,
  };
}

export function updateTitle(
  customization: ProfileCustomization,
  title: string
): ProfileCustomization {
  return {
    ...customization,
    title,
  };
}

export function updateBadge(
  customization: ProfileCustomization,
  badge: string
): ProfileCustomization {
  return {
    ...customization,
    badge,
  };
}