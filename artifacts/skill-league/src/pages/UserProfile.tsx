import { useState, useEffect, useMemo, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Users, Heart, MessageCircle, Zap, Eye,
  Calendar, Clock, BarChart2, Search, X, BookOpen,
  Repeat2, ChevronRight,
} from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import { type CommunityPost, type PostType, getPostAge } from "@/lib/community";
import { getSocialLeague } from "@/lib/socialLeague";
import { getAllPostMeta } from "@/lib/postMeta";
import { getStories } from "@/lib/stories";
import Avatar from "@/components/Avatar";
import { api, getStoredPlayerId } from "@/lib/apiClient";

const XP_PER_LEVEL = 500;

type ProfileTab = "posts" | "media" | "activity";
type ListType   = "followers" | "following" | "friends";

function fmtDate(ts: string | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function fmtRelative(ts: string | null): string {
  if (!ts) return "—";
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60_000)     return "just now";
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}


export default function UserProfile() {
  const [, params]   = useRoute("/user/:username");
  const [, navigate] = useLocation();
  const { username: myUsername, level: myLevel, xp: myXp, authUser } = useGame();

  const targetUsername = params?.username ?? "";
  const isOwnProfile   = targetUsername === myUsername;

  // ── Redirect to own profile if viewing self ──
  useEffect(() => {
    if (isOwnProfile) navigate("/profile");
  }, [isOwnProfile]);

  const [tab, setTab]         = useState<ProfileTab>("posts");
  const [, forceUpdate]       = useState(0);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [postMeta, setPostMeta]           = useState<Record<string, { views: number; shares: number }>>({});

  const [backendStats, setBackendStats] = useState<{
    postsCount: number; likesReceived: number; commentsReceived: number;
    followersCount: number; followingCount: number;
    lastPostAt: string | null; lastActiveAt: string | null; joinedAt: string | null;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [targetPlayerId, setTargetPlayerId] = useState<string | null>(null);
  const [apiPosts, setApiPosts] = useState<CommunityPost[]>([]);

  const [isFollowing, setIsFollowing]       = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  const [activeList, setActiveList]       = useState<ListType | null>(null);
  const [listSearch, setListSearch]       = useState("");
  const [followersList, setFollowersList] = useState<{ id: string; username: string }[]>([]);
  const [followingList, setFollowingList] = useState<{ id: string; username: string }[]>([]);
  const [listLoading, setListLoading]     = useState(false);

  useEffect(() => {
    setPostMeta(getAllPostMeta());
  }, []);

  useEffect(() => {
    if (!targetUsername || isOwnProfile) return;
    setStatsLoading(true);
    api.players.leaderboard(100)
      .then(res => {
        const players = Array.isArray(res) ? res : ((res as unknown as { players: unknown[] }).players ?? []);
        const p = (players as { username: string; id: string }[]).find(pl => pl.username === targetUsername);
        if (!p) { setStatsLoading(false); return; }
        setTargetPlayerId(p.id);
        return api.social.profile(p.id);
      })
      .then(stats => {
        if (stats) {
          setBackendStats(stats as any);
          const rawPosts: any[] = (stats as any).posts ?? [];
          const mapped: CommunityPost[] = rawPosts.map((p: any) => ({
            id: p.id,
            authorId: p.authorId,
            authorName: p.username ?? p.authorName ?? targetUsername,
            authorLevel: p.level ?? 1,
            authorFame: 0,
            content: p.content ?? "",
            imageUrl: p.imageUrl ?? undefined,
            type: (p.type as PostType) ?? "text",
            timestamp: new Date(p.createdAt ?? Date.now()).getTime(),
            likes: p.likes ?? 0,
            likedByMe: false,
            boosted: false,
            boostExpiry: null,
          }));
          setApiPosts(mapped);
        }
      })
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, [targetUsername, isOwnProfile]);

  useEffect(() => {
    const myId = authUser?.uid ?? getStoredPlayerId();
    if (!myId || !targetPlayerId) return;
    api.followers.get(targetPlayerId, myId)
      .then((data: any) => {
        if (data) {
          setIsFollowing(data.isFollowing ?? false);
          setFollowersCount(data.followersCount ?? 0);
        }
      })
      .catch(() => {});
  }, [targetPlayerId, authUser?.uid]);

  useEffect(() => {
    if (!activeList || !targetPlayerId) return;
    setListSearch("");
    if (activeList === "friends") return;
    setListLoading(true);
    const myId = authUser?.uid ?? getStoredPlayerId() ?? "";
    if (activeList === "followers") {
      api.followers.list(targetPlayerId, myId || undefined)
        .then((data: any) => {
          const arr = Array.isArray(data) ? data : (data?.followers ?? []);
          setFollowersList(arr.map((e: any) => ({ id: e.id ?? e.followerId, username: e.username ?? e.followerUsername ?? "" })));
        })
        .catch(() => setFollowersList([]))
        .finally(() => setListLoading(false));
    } else {
      api.followers.listFollowing(targetPlayerId, myId || undefined)
        .then((data: any) => {
          const arr = Array.isArray(data) ? data : (data?.following ?? []);
          setFollowingList(arr.map((e: any) => ({ id: e.id ?? e.followingId, username: e.username ?? e.followingUsername ?? "" })));
        })
        .catch(() => setFollowingList([]))
        .finally(() => setListLoading(false));
    }
  }, [activeList, targetPlayerId]);

  const userPosts  = useMemo(
    () => [...apiPosts].sort((a, b) => b.timestamp - a.timestamp),
    [apiPosts]
  );
  const mediaPosts = useMemo(() => userPosts.filter(p => !!p.imageUrl), [userPosts]);
  const friendsList  = followingList;
  const friendsCount = followingList.length;
  const storiesCount = useMemo(() => {
    try { return getStories().filter(s => (s as any).authorName === targetUsername).length; }
    catch { return 0; }
  }, [targetUsername]);

  const inferredLevel = userPosts[0]?.authorLevel ?? 1;
  const inferredXp    = inferredLevel * XP_PER_LEVEL - Math.floor(XP_PER_LEVEL * 0.4);
  const totalLikes    = backendStats?.likesReceived ?? userPosts.reduce((s: number, p: CommunityPost) => s + p.likes, 0);
  const league        = getSocialLeague(inferredLevel);
  const xpBase        = (inferredLevel - 1) * XP_PER_LEVEL;
  const xpInLevel     = Math.max(0, inferredXp - xpBase);
  const xpPct         = Math.min(100, Math.round((xpInLevel / XP_PER_LEVEL) * 100));

  const postsCount = backendStats?.postsCount ?? userPosts.length;
  const followers  = backendStats?.followersCount ?? followersCount;
  const following  = backendStats?.followingCount ?? 0;

  const TABS: { id: ProfileTab; label: string }[] = [
    { id: "posts",    label: "Posts" },
    { id: "media",    label: "Media" },
    { id: "activity", label: "Activity" },
  ];

  async function handleFollow() {
    const myId = authUser?.uid ?? getStoredPlayerId();
    if (!myId || !targetPlayerId) return;
    try {
      if (isFollowing) {
        await api.followers.unfollow(targetPlayerId, myId);
        setIsFollowing(false);
        setFollowersCount(c => Math.max(0, c - 1));
      } else {
        await api.followers.follow(targetPlayerId, myId);
        await api.notifications.create({
          playerId: targetPlayerId,
          type: "follow",
          title: "New follower",
          body: "Someone started following you",
        });
        setIsFollowing(true);
        setFollowersCount(c => c + 1);
      }
    } catch (error) {
      console.error(error);
    }
  }

  const listItems: { id: string; username: string }[] = useMemo(() => {
    if (activeList === "followers") return followersList;
    if (activeList === "following") return followingList;
    if (activeList === "friends")   return friendsList.map(f => ({ id: f.username, username: f.username }));
    return [];
  }, [activeList, followersList, followingList, friendsList]);
  const filteredListItems = listItems.filter(u =>
    u.username.toLowerCase().includes(listSearch.toLowerCase())
  );

  if (isOwnProfile) return null;

  return (
    <div className="min-h-screen pb-28" style={{ background: "#F0F2F5" }}>

      {/* ── Header ── */}
      <div
        className="sticky top-0 z-20 border-b px-4 py-3 flex items-center gap-3"
        style={{ background: "#FFFFFF", borderColor: "#E4E6EB", boxShadow: "0 2px 4px rgba(0,0,0,0.08)" }}
      >
        <button onClick={() => window.history.back()}
          className="p-2 rounded-xl hover:bg-gray-100 active:scale-90 transition-transform">
          <ArrowLeft className="w-5 h-5" style={{ color: "#050505" }} />
        </button>
        <span className="font-black text-base flex-1 truncate" style={{ color: "#050505" }}>
          {targetUsername}
        </span>
      </div>

      {/* ── Profile Hero ── */}
      <div style={{ background: "#FFFFFF", borderBottom: "1px solid #E4E6EB" }}>
        <div className="max-w-md mx-auto px-4 pt-6 pb-4">
          <div className="flex flex-col items-center gap-3">

            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden shadow-lg"
                style={{ border: "3px solid #E4E6EB" }}>
                <Avatar username={targetUsername} size="xl" shape="rounded-full"
                  className="w-full h-full object-cover" />
              </div>
              {/* Level badge */}
              <div className="absolute -bottom-1 -right-1 px-2.5 py-0.5 rounded-full text-xs font-black shadow"
                style={{ background: league.color, color: "#fff" }}>
                {inferredLevel}
              </div>
            </div>

            {/* Name + league */}
            <div className="text-center space-y-1">
              <div className="text-xl font-black" style={{ color: "#050505" }}>{targetUsername}</div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                style={{ color: league.color, background: league.color + "18", border: `1px solid ${league.color}40` }}>
                {league.icon} {league.name}
              </span>
            </div>

            {/* XP Bar */}
            <div className="w-full space-y-1">
              <div className="flex justify-between text-[11px]" style={{ color: "#65676B" }}>
                <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-yellow-400" /> Lv.{inferredLevel}</span>
                <span>{xpInLevel}/{XP_PER_LEVEL} XP</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "#E4E6EB" }}>
                <motion.div className="h-full rounded-full" style={{ background: league.color }}
                  initial={{ width: 0 }} animate={{ width: `${xpPct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }} />
              </div>
            </div>

            {/* Stats row (clickable) */}
            <div className="w-full rounded-2xl overflow-hidden" style={{ border: "1px solid #E4E6EB", background: "#FFFFFF" }}>
              <div className="grid grid-cols-4 divide-x" style={{ borderColor: "#E4E6EB" }}>
                {[
                  { label: "Posts",     value: postsCount,    onClick: null },
                  { label: "Followers", value: followers,     onClick: () => setActiveList("followers") },
                  { label: "Following", value: following,     onClick: () => setActiveList("following") },
                  { label: "Friends",   value: friendsCount,  onClick: () => setActiveList("friends") },
                ].map(({ label, value, onClick }) => (
                  <div key={label} onClick={onClick ?? undefined}
                    className={`flex flex-col items-center py-3 gap-0.5 ${onClick ? "cursor-pointer active:bg-gray-50" : ""}`}
                    style={{ borderRight: "1px solid #E4E6EB" }}>
                    <span className="font-black text-sm tabular-nums" style={{ color: "#050505" }}>
                      {value.toLocaleString()}
                    </span>
                    <span className="text-[9px] uppercase tracking-wide" style={{ color: "#65676B" }}>
                      {label}{onClick ? " ›" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            {myUsername && (
              <div className="flex gap-2 w-full">
                <button onClick={handleFollow}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-all"
                  style={{
                    background: isFollowing ? "#E7F3E8" : "#1877F2",
                    color: isFollowing ? "#2D8A3E" : "#FFFFFF",
                  }}>
                  {isFollowing ? "✔ Following" : "Follow"}
                </button>
                <button
                  onClick={() => navigate(`/chat/${encodeURIComponent(targetUsername)}`)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-all"
                  style={{ background: "#E4E6EB", color: "#050505" }}>
                  <MessageCircle className="w-4 h-4" />
                  Message
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs (sticky) ── */}
      <div className="sticky z-10 border-b" style={{ top: "57px", background: "#FFFFFF", borderColor: "#E4E6EB" }}>
        <div className="flex max-w-md mx-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 py-3 text-xs font-bold border-b-2 transition-all"
              style={{
                borderBottomColor: tab === t.id ? "#1877F2" : "transparent",
                color: tab === t.id ? "#1877F2" : "#65676B",
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-md mx-auto px-4 py-4 space-y-3">
        <AnimatePresence mode="wait">
          <motion.div key={tab}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
            className="space-y-3">

            {/* POSTS */}
            {tab === "posts" && (
              userPosts.length === 0
                ? <EmptyState emoji="📭" text="No posts yet" />
                : userPosts.map((post, i) => (
                  <MiniPostCard key={post.id} post={post} index={i}
                    leagueColor={league.color}
                    meta={postMeta[post.id] ?? { views: 0, shares: 0 }}
                    commentCount={commentCounts[post.id] ?? 0}
                    navigate={navigate} />
                ))
            )}

            {/* MEDIA */}
            {tab === "media" && (
              mediaPosts.length === 0
                ? <EmptyState emoji="🖼️" text="No media posts yet" />
                : (
                  <div className="grid grid-cols-3 gap-1.5">
                    {mediaPosts.map(post => (
                      <div key={post.id} className="aspect-square rounded-xl overflow-hidden"
                        style={{ background: "#E4E6EB" }}>
                        <img src={post.imageUrl!} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )
            )}

            {/* ACTIVITY */}
            {tab === "activity" && (
              <div className="space-y-3">
                {/* Timeline */}
                <div className="rounded-2xl p-4 space-y-2"
                  style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}>
                  <div className="text-xs font-black uppercase tracking-wider mb-3 flex items-center gap-1.5"
                    style={{ color: "#65676B" }}>
                    <Calendar className="w-3.5 h-3.5" /> Timeline
                  </div>
                  {[
                    { icon: <Calendar className="w-3.5 h-3.5 text-blue-400" />, label: "Joined",      value: fmtDate(backendStats?.joinedAt ?? null) },
                    { icon: <Clock className="w-3.5 h-3.5 text-green-400" />,   label: "Last Active", value: fmtRelative(backendStats?.lastActiveAt ?? null) },
                    { icon: <Zap className="w-3.5 h-3.5 text-yellow-400" />,    label: "Last Post",   value: backendStats?.lastPostAt ? fmtRelative(backendStats.lastPostAt) : "No posts yet" },
                    { icon: <BookOpen className="w-3.5 h-3.5 text-purple-400" />, label: "Stories",   value: `${storiesCount} stories` },
                  ].map(row => (
                    <div key={row.label} className="flex items-center gap-3 py-1.5 last:border-0"
                      style={{ borderBottom: "1px solid #E4E6EB40" }}>
                      {row.icon}
                      <span className="text-xs flex-1" style={{ color: "#65676B" }}>{row.label}</span>
                      <span className="text-xs font-bold" style={{ color: "#050505" }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* Social stats */}
                <div className="rounded-2xl p-4 space-y-3"
                  style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}>
                  <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
                    style={{ color: "#65676B" }}>
                    <BarChart2 className="w-3.5 h-3.5" /> Social Stats
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Posts",          value: postsCount,                    color: "#1877F2", clickable: false },
                      { label: "Stories",        value: storiesCount,                  color: "#8B5CF6", clickable: false },
                      { label: "Likes Received", value: totalLikes,                    color: "#E41E3F", clickable: false },
                      { label: "Comments Got",   value: backendStats?.commentsReceived ?? 0, color: "#42B72A", clickable: false },
                      { label: "Followers",      value: followers,                     color: "#0EA5E9", clickable: true, list: "followers" as ListType },
                      { label: "Following",      value: following,                     color: "#14B8A6", clickable: true, list: "following" as ListType },
                      { label: "Friends",        value: friendsCount,                  color: "#F59E0B", clickable: true, list: "friends"   as ListType },
                    ].map(s => (
                      <div key={s.label}
                        onClick={s.clickable ? () => setActiveList(s.list!) : undefined}
                        className={`rounded-xl p-3 text-center ${s.clickable ? "cursor-pointer" : ""}`}
                        style={{ background: "#F0F2F5", border: "1px solid #E4E6EB" }}>
                        <div className="text-xl font-black tabular-nums" style={{ color: s.color }}>
                          {typeof s.value === "number" ? s.value.toLocaleString() : s.value}
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: "#65676B" }}>
                          {s.label}{s.clickable ? " ›" : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Friends preview */}
                {friendsList.length > 0 && (
                  <div className="rounded-2xl p-4 space-y-3"
                    style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}>
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
                        style={{ color: "#65676B" }}>
                        <Users className="w-3.5 h-3.5" /> Friends ({friendsCount})
                      </div>
                      {friendsCount > 4 && (
                        <button onClick={() => setActiveList("friends")}
                          className="text-xs font-bold" style={{ color: "#1877F2" }}>
                          See All ›
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {friendsList.slice(0, 4).map(f => (
                        <button key={f.username}
                          onClick={() => navigate(`/user/${encodeURIComponent(f.username)}`)}
                          className="flex flex-col items-center gap-1 active:scale-95 transition-transform">
                          <Avatar username={f.username} size="md" shape="rounded-xl" />
                          <span className="text-[10px] font-semibold text-center truncate w-full"
                            style={{ color: "#050505" }}>{f.username}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── List Sheet (Followers / Following / Friends) ── */}
      <AnimatePresence>
        {activeList && (
          <ListSheet
            type={activeList}
            items={filteredListItems}
            allCount={listItems.length}
            loading={listLoading && activeList !== "friends"}
            search={listSearch}
            onSearch={setListSearch}
            onClose={() => { setActiveList(null); setListSearch(""); }}
            navigate={navigate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Mini Post Card
═══════════════════════════════════════════════════════════ */
function MiniPostCard({
  post, index, leagueColor, meta, commentCount, navigate,
}: {
  post: CommunityPost; index: number; leagueColor: string;
  meta: { views: number; shares: number }; commentCount: number;
  navigate: (to: string) => void;
}) {
  const parts = post.content.split(/(#[\w\u0600-\u06FF]+)/g);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-2xl p-4 space-y-2.5"
      style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}>
      <div className="flex items-center justify-between">
        <span className="text-[11px]" style={{ color: "#65676B" }}>{getPostAge(post.timestamp)}</span>
        {post.boosted && <span className="text-[10px] text-yellow-500 font-bold">🔥 Boosted</span>}
      </div>
      <p className="text-sm leading-relaxed" style={{ color: "#050505" }}>
        {parts.map((part, i) =>
          part.startsWith("#")
            ? <button key={i}
                onClick={() => navigate(`/hashtag/${encodeURIComponent(part.replace(/^#/, ""))}`)}
                className="font-bold hover:underline"
                style={{ color: leagueColor }}>{part}</button>
            : <span key={i}>{part}</span>
        )}
      </p>
      {post.imageUrl && (
        <img src={post.imageUrl} alt="post" className="w-full max-h-40 object-cover rounded-xl" />
      )}
      <div className="flex items-center gap-3 pt-1" style={{ borderTop: "1px solid #E4E6EB" }}>
        <span className="flex items-center gap-1 text-xs" style={{ color: "#E41E3F" }}>
          <Heart className="w-3.5 h-3.5 fill-current" />{post.likes}
        </span>
        <span className="flex items-center gap-1 text-xs" style={{ color: "#65676B" }}>
          <Eye className="w-3.5 h-3.5" />{meta.views}
        </span>
        <span className="flex items-center gap-1 text-xs" style={{ color: "#65676B" }}>
          <MessageCircle className="w-3.5 h-3.5" />{commentCount}
        </span>
        <span className="flex items-center gap-1 text-xs" style={{ color: "#65676B" }}>
          <Repeat2 className="w-3.5 h-3.5" />{meta.shares}
        </span>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   List Sheet (Followers / Following / Friends)
═══════════════════════════════════════════════════════════ */
function ListSheet({
  type, items, allCount, loading, search, onSearch, onClose, navigate,
}: {
  type: ListType; items: { id: string; username: string }[]; allCount: number;
  loading: boolean; search: string; onSearch: (s: string) => void;
  onClose: () => void; navigate: (to: string) => void;
}) {
  const label = type === "followers" ? "Followers" : type === "following" ? "Following" : "Friends";

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        className="relative w-full max-h-[75vh] rounded-t-3xl flex flex-col overflow-hidden"
        style={{ background: "#FFFFFF" }}
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 220 }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "#E4E6EB" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2"
          style={{ borderBottom: "1px solid #E4E6EB" }}>
          <span className="font-black text-base" style={{ color: "#050505" }}>
            {label} <span className="text-sm font-normal" style={{ color: "#65676B" }}>({allCount})</span>
          </span>
          <button onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 active:scale-90 transition-transform">
            <X className="w-4 h-4" style={{ color: "#65676B" }} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2.5" style={{ borderBottom: "1px solid #E4E6EB" }}>
          <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "#F0F2F5" }}>
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: "#65676B" }} />
            <input
              value={search}
              onChange={e => onSearch(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "#050505" }}
              autoFocus
            />
            {search && (
              <button onClick={() => onSearch("")}>
                <X className="w-3.5 h-3.5" style={{ color: "#65676B" }} />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {loading ? (
            <div className="flex justify-center py-10">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                className="w-8 h-8 rounded-full border-2" style={{ borderColor: "#1877F2", borderTopColor: "transparent" }} />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-3xl mb-2">
                {search ? "🔍" : type === "followers" ? "👥" : type === "following" ? "🔭" : "👫"}
              </div>
              <p className="text-sm" style={{ color: "#65676B" }}>
                {search ? "No results found" : `No ${label.toLowerCase()} yet`}
              </p>
            </div>
          ) : (
            items.map(u => (
              <button key={u.id || u.username}
                onClick={() => { navigate(`/user/${encodeURIComponent(u.username)}`); onClose(); }}
                className="flex items-center gap-3 w-full p-3 rounded-xl active:scale-[0.98] transition-all"
                style={{ background: "transparent" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F0F2F5")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <Avatar username={u.username} size="md" shape="rounded-full" />
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-bold truncate" style={{ color: "#050505" }}>{u.username}</div>
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "#65676B" }} />
              </button>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Empty State
═══════════════════════════════════════════════════════════ */
function EmptyState({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="text-center py-16">
      <div className="text-4xl mb-2">{emoji}</div>
      <p className="text-sm" style={{ color: "#65676B" }}>{text}</p>
    </div>
  );
}
