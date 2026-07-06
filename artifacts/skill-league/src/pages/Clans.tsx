import { useState, useEffect } from "react";
import { useGame } from "@/contexts/GameContext";
import { Link } from "wouter";
import { ChevronLeft, Users, Trophy, Plus, Search, Crown, Shield, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { playTap, playCoin } from "@/lib/sounds";
import { isRTL } from "@/lib/i18n";
import {
  loadClans, createClan, joinClan, leaveClan, loadMyClanData, saveMyClanData,
  getClanRankings, contributeClanDN, getClanLevelInfo, CLAN_LOGOS,
  type Clan, type ClanPlayerData,
} from "@/lib/clans";

export default function Clans() {
  const { language, username, level, elo, dnBalance, spendCoins } = useGame();
  const rtl = isRTL(language);

  const [tab, setTab] = useState<'rankings' | 'myClan' | 'create'>('rankings');
  const [clans, setClans] = useState<Clan[]>([]);
  const [myClan, setMyClan] = useState<ClanPlayerData>(loadMyClanData());
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const [newName, setNewName] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newLogo, setNewLogo] = useState(CLAN_LOGOS[0]);
  const [contributeAmount, setContributeAmount] = useState(50);

  useEffect(() => { setClans(getClanRankings()); }, []);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  const myClanObj = clans.find(c => c.id === myClan.clanId);
  const myMember = myClanObj?.members.find(m => m.username === username);

  function handleCreate() {
    if (!newName.trim() || !newTag.trim()) { showToast('❌ Enter name and tag', false); return; }
    if (myClan.clanId) { showToast('❌ Already in a clan', false); return; }
    const clan = createClan(newName, newTag, newLogo, newDesc, username, level, elo);
    saveMyClanData({ clanId: clan.id, clanName: clan.name, clanTag: clan.tag, clanRole: 'owner', clanDNContributed: 0 });
    setMyClan(loadMyClanData());
    setClans(getClanRankings());
    showToast(`✅ Clan "${clan.name}" created!`, true);
    setTab('myClan');
    playTap();
  }

  function handleJoin(clan: Clan) {
    if (myClan.clanId) { showToast('❌ Already in a clan — leave first', false); return; }
    if (elo < clan.minElo) { showToast(`❌ Need ${clan.minElo} ELO`, false); return; }
    const ok = joinClan(clan.id, username, level, elo);
    if (ok) {
      saveMyClanData({ clanId: clan.id, clanName: clan.name, clanTag: clan.tag, clanRole: 'member', clanDNContributed: 0 });
      setMyClan(loadMyClanData());
      setClans(getClanRankings());
      showToast(`✅ Joined ${clan.name}!`, true);
      setTab('myClan');
      playCoin();
    } else {
      showToast('❌ Cannot join — clan full or ELO too low', false);
    }
  }

  function handleLeave() {
    if (!myClan.clanId) return;
    leaveClan(myClan.clanId, username);
    saveMyClanData({ clanId: null, clanName: null, clanTag: null, clanRole: null, clanDNContributed: 0 });
    setMyClan(loadMyClanData());
    setClans(getClanRankings());
    showToast('✅ Left the clan', true);
    setTab('rankings');
  }

  function handleContribute() {
    if (!myClan.clanId) return;
    if (!spendCoins(contributeAmount)) { showToast('❌ Not enough DN$', false); return; }
    contributeClanDN(myClan.clanId, username, contributeAmount);
    const updated = { ...myClan, clanDNContributed: myClan.clanDNContributed + contributeAmount };
    saveMyClanData(updated);
    setMyClan(updated);
    setClans(getClanRankings());
    showToast(`✅ Contributed ${contributeAmount} DN$!`, true);
    playCoin();
  }

  const filtered = clans.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.tag.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} className="min-h-screen bg-background text-foreground pb-24">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/60 px-4 py-3 flex items-center gap-3">
        <button className="p-2 rounded-xl hover:bg-card active:scale-95 transition-all" onClick={() => { playTap(); window.history.back(); }}><ChevronLeft className={`w-5 h-5 ${rtl ? 'rotate-180' : ''}`} /></button>
        <h1 className="text-lg font-black flex-1">🏰 {language === 'ar' ? 'الفرق' : 'Clans'}</h1>
        {myClan.clanId && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/15 border border-primary/30 rounded-xl text-xs font-bold text-primary">
            {myClan.clanTag}
          </div>
        )}
      </div>

      <div className="max-w-md mx-auto">
        {/* Tabs */}
        <div className="flex gap-1 p-3">
          {[
            { id: 'rankings', label: language === 'ar' ? '🏆 الترتيب' : '🏆 Rankings' },
            { id: 'myClan',   label: language === 'ar' ? '🛡️ فريقي' : '🛡️ My Clan' },
            { id: 'create',   label: language === 'ar' ? '➕ إنشاء' : '➕ Create' },
          ].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id as any); playTap(); }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Rankings Tab */}
        {tab === 'rankings' && (
          <div className="px-3 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={language === 'ar' ? 'البحث عن فريق...' : 'Search clans...'}
                className="w-full bg-card border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-primary/50" />
            </div>

            {filtered.map((clan, i) => {
              const levelInfo = getClanLevelInfo(clan);
              const isMyC = clan.id === myClan.clanId;
              return (
                <motion.div key={clan.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className={`rounded-2xl border bg-card p-4 ${isMyC ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: 'hsl(var(--primary)/0.12)' }}>{clan.logo}</div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[9px] font-black flex items-center justify-center">
                        {i + 1}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm">{clan.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-bold">[{clan.tag}]</span>
                        {isMyC && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 font-bold">Mine</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" /><span>{clan.members.length}</span>
                        <span>·</span>
                        <Trophy className="w-3 h-3" /><span>{clan.wins}W</span>
                        <span>·</span>
                        <Star className="w-3 h-3" /><span>Lv.{clan.level}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{clan.description}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-sm font-black text-yellow-400">{(clan.dn ?? 0).toLocaleString()}</div>
                      <div className="text-[10px] text-muted-foreground">DN$</div>
                      {!isMyC && !myClan.clanId && (
                        <Button size="sm" onClick={() => handleJoin(clan)} className="mt-1 text-[10px] h-6 px-2 font-bold">
                          {language === 'ar' ? 'انضم' : 'Join'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Level bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>{levelInfo.current.name}</span>
                      <span>{clan.xp} XP{levelInfo.next ? ` / ${levelInfo.next.xpRequired}` : ''}</span>
                    </div>
                    <div className="h-1.5 bg-card rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all"
                        style={{ width: levelInfo.next ? `${Math.min(100, (clan.xp / levelInfo.next.xpRequired) * 100)}%` : '100%' }} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* My Clan Tab */}
        {tab === 'myClan' && (
          <div className="px-3 space-y-4">
            {!myClan.clanId ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="rounded-2xl border border-dashed border-border bg-card p-8 text-center space-y-3">
                <div className="text-5xl">🏰</div>
                <p className="font-bold">{language === 'ar' ? 'لست في فريق بعد' : "You're not in a clan yet"}</p>
                <p className="text-xs text-muted-foreground">{language === 'ar' ? 'انضم إلى فريق أو أنشئ فريقاً جديداً' : 'Join a clan or create your own'}</p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => setTab('rankings')} variant="outline" size="sm">{language === 'ar' ? 'استعرض الفرق' : 'Browse Clans'}</Button>
                  <Button onClick={() => setTab('create')} size="sm">{language === 'ar' ? 'إنشاء فريق' : 'Create Clan'}</Button>
                </div>
              </motion.div>
            ) : myClanObj ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {/* Clan header */}
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center">
                  <div className="text-4xl mb-2">{myClanObj.logo}</div>
                  <h2 className="text-xl font-black">{myClanObj.name}</h2>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold">[{myClanObj.tag}]</span>
                    <span className="text-xs text-muted-foreground">Lv.{myClanObj.level} {getClanLevelInfo(myClanObj).current.name}</span>
                    {myMember?.role === 'owner' && <Crown className="w-3 h-3 text-yellow-400" />}
                  </div>
                  <div className="flex justify-center gap-6 mt-4 text-center">
                    <div><div className="text-lg font-black text-yellow-400">{(myClanObj.dn ?? 0).toLocaleString()}</div><div className="text-[10px] text-muted-foreground">DN$</div></div>
                    <div><div className="text-lg font-black">{myClanObj.members.length}</div><div className="text-[10px] text-muted-foreground">Members</div></div>
                    <div><div className="text-lg font-black">{myClanObj.wins}</div><div className="text-[10px] text-muted-foreground">Wins</div></div>
                  </div>
                </div>

                {/* Contribute */}
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <p className="text-sm font-bold">{language === 'ar' ? '💰 ساهم بـ DN$' : '💰 Contribute DN$'}</p>
                  <div className="flex gap-2 flex-wrap">
                    {[25, 50, 100, 250].map(amt => (
                      <button key={amt} onClick={() => setContributeAmount(amt)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${contributeAmount === amt ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}>
                        {amt} 🪙
                      </button>
                    ))}
                  </div>
                  <Button onClick={handleContribute} className="w-full text-sm font-bold" disabled={dnBalance < contributeAmount}>
                    {language === 'ar' ? `ساهم بـ ${contributeAmount} DN$` : `Contribute ${contributeAmount} DN$`}
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center">
                    {language === 'ar' ? `ساهمت بإجمالي: ${myClan.clanDNContributed} DN$` : `Your total contribution: ${myClan.clanDNContributed} DN$`}
                  </p>
                </div>

                {/* Members */}
                <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                  <p className="text-sm font-bold mb-3">{language === 'ar' ? '👥 الأعضاء' : '👥 Members'}</p>
                  {myClanObj.members.sort((a, b) => (b.weeklyDN ?? 0) - (a.weeklyDN ?? 0)).map((m, i) => (
                    <div key={m.id} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                      <span className="text-xs text-muted-foreground w-5 text-center">{i + 1}</span>
                      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-sm font-black">
                        {m.username.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold">{m.username}</span>
                          {m.role === 'owner' && <Crown className="w-3 h-3 text-yellow-400" />}
                          {m.role === 'officer' && <Shield className="w-3 h-3 text-blue-400" />}
                          {m.username === username && <span className="text-[9px] px-1 py-0.5 rounded bg-primary/15 text-primary font-bold">You</span>}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Lv.{m.level} · {m.elo} ELO</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-yellow-400">{m.weeklyDN ?? 0} DN$</div>
                        <div className="text-[9px] text-muted-foreground">{language === 'ar' ? 'هذا الأسبوع' : 'this week'}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button variant="outline" onClick={handleLeave} className="w-full text-red-400 border-red-500/30 text-sm">
                  {language === 'ar' ? 'مغادرة الفريق' : 'Leave Clan'}
                </Button>
              </motion.div>
            ) : null}
          </div>
        )}

        {/* Create Tab */}
        {tab === 'create' && (
          <div className="px-3 space-y-4">
            {myClan.clanId ? (
              <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-2">
                <div className="text-3xl">🛑</div>
                <p className="font-bold text-sm">{language === 'ar' ? 'أنت بالفعل في فريق' : "You're already in a clan"}</p>
                <p className="text-xs text-muted-foreground">{language === 'ar' ? 'غادر فريقك الحالي أولاً لإنشاء فريق جديد' : 'Leave your current clan first to create a new one'}</p>
                <Button variant="outline" onClick={() => setTab('myClan')} size="sm">{language === 'ar' ? 'عرض فريقي' : 'View My Clan'}</Button>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {/* Logo picker */}
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-xs font-bold text-muted-foreground mb-3">{language === 'ar' ? 'شعار الفريق' : 'Clan Logo'}</p>
                  <div className="grid grid-cols-8 gap-2">
                    {CLAN_LOGOS.map(logo => (
                      <button key={logo} onClick={() => setNewLogo(logo)}
                        className={`w-10 h-10 rounded-xl text-2xl flex items-center justify-center transition-all active:scale-90 ${
                          newLogo === logo ? 'bg-primary/20 border-2 border-primary' : 'bg-card border border-border'
                        }`}>
                        {logo}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form */}
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground">{language === 'ar' ? 'اسم الفريق' : 'Clan Name'} *</label>
                    <input value={newName} onChange={e => setNewName(e.target.value)} maxLength={24}
                      placeholder={language === 'ar' ? 'مثال: صقور الشمال' : 'e.g. Northern Eagles'}
                      className="w-full mt-1 bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground">{language === 'ar' ? 'الوسم (5 أحرف)' : 'Tag (5 chars)'} *</label>
                    <input value={newTag} onChange={e => setNewTag(e.target.value.toUpperCase())} maxLength={5}
                      placeholder="e.g. NRTH"
                      className="w-full mt-1 bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50 uppercase" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground">{language === 'ar' ? 'الوصف' : 'Description'}</label>
                    <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} maxLength={80} rows={2}
                      placeholder={language === 'ar' ? 'صِف فريقك...' : 'Describe your clan...'}
                      className="w-full mt-1 bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50 resize-none" />
                  </div>
                </div>

                {/* Preview */}
                {newName && (
                  <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-2xl">{newLogo}</div>
                    <div>
                      <div className="font-black">{newName} <span className="text-primary text-sm">[{newTag || '???'}]</span></div>
                      <div className="text-xs text-muted-foreground">{language === 'ar' ? 'المالك' : 'Owner'}: {username}</div>
                    </div>
                  </div>
                )}

                <Button onClick={handleCreate} className="w-full font-bold" disabled={!newName.trim() || !newTag.trim()}>
                  <Plus className="w-4 h-4 mr-1" />
                  {language === 'ar' ? 'إنشاء الفريق' : 'Create Clan'}
                </Button>
              </motion.div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 48 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 48 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-sm font-bold shadow-xl z-50 border ${
              toast.ok ? 'bg-green-500/15 border-green-500/40 text-green-400' : 'bg-red-500/15 border-red-500/40 text-red-400'
            }`}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
