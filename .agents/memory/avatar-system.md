---
name: Global Avatar System
description: Unified avatar storage/component used app-wide; photo upload + initials fallback.
---

## Rule
`lib/avatar.ts` is the single source of truth. `components/Avatar.tsx` is the only avatar UI component. Never define local `AVATAR_COLORS` / `avatarGradient` — always import from `@/lib/avatar`.

**Why:** Previous code had 6+ duplicate `AVATAR_COLORS` arrays and `avatarGradient` functions. Unified so uploading a photo in Profile instantly propagates everywhere via the `sl:avatar-updated` window event.

## How to apply
- Storage key: `sl_avatar_v1` → `Record<string, string>` (username → base64 JPEG)
- Exports: `getAvatarUrl`, `setMyAvatar`, `clearMyAvatar`, `resizeAvatarToBase64`, `avatarGradient`, `avatarInitials`
- `setMyAvatar` fires `window.dispatchEvent(new CustomEvent('sl:avatar-updated'))` — Avatar component listens and re-renders instantly
- Avatar props: `username`, `size` (xs/sm/md/lg/xl), `shape` (rounded-lg/xl/2xl/3xl/full), `online?: boolean`
- Profile.tsx: photo upload overlays the emoji/theme avatar. The emoji theme system (`avatarThemeId`, `setAvatarTheme`, FREE_FACES/VIP_FACES in `lib/customization.ts`) is SEPARATE — do not conflate them.
- Files updated: ProfileBar, FeaturedPlayers, PostCard, StoryBar, ChatPage, UserProfile, FriendsPage, Messages, Leaderboard, Results, Profile
