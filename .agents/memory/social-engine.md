---
name: Social Engine
description: Search, Trending, Hashtags, Notifications, Enhanced Profile system added on top of existing community.
---

## Routes added (App.tsx)
- `/search` → SearchPage.tsx
- `/trending` → TrendingPage.tsx
- `/hashtag/:tag` → HashtagFeedPage.tsx

## Backend (api-server/src/routes/social.ts)
- `GET /api/social/search?q=&type=all|users|posts|hashtags&sort=relevant|recent|engagement`
- `GET /api/social/trending?window=24h|7d|30d`
- `GET /api/social/hashtags/trending?window=24h|7d|30d`
- `GET /api/social/posts/hashtag/:tag?limit=`
- `GET /api/social/profile/:id`  — returns postsCount, likesReceived, commentsReceived, followersCount, followingCount, lastPostAt, lastActiveAt, joinedAt
- `GET /api/social/analytics`

## Notification triggers (server-side, fire-and-forget)
- like → notifies post author (community.ts)
- comment → notifies post author (community.ts)
- follow → notifies followed player (followers.ts)
- mention → notifies @mentioned player (community.ts, looks up by ilike username)
- Types registered in Notifications.tsx TYPE_ICON: like/comment/share/follow/mention

## Frontend
- `api.social.*` methods in apiClient.ts
- `api.followers.follow(id, followerId, followerUsername?)` — followerUsername for notification display name
- PostCard.tsx RichContent: #hashtags → /hashtag/:tag, @mentions highlighted in purple
- SocialPage.tsx: Search icon (→/search) + Trending icon (→/trending) in header; trending hashtags pills row
- UserProfile.tsx: Enhanced stats tab (📊) with backend social stats + dates; Follow button with real API
- HashtagFeedPage.tsx: shows related trending hashtags + posts with clickable #hashtags
- TrendingPage.tsx: 24h/7d/30d window selector + tabs: posts (trending/most liked/most commented) / users / hashtags

**Why:** Social graph data (followers, post counts, dates) lives in DB; localStorage only has local posts so backend endpoint is needed for accurate stats.
