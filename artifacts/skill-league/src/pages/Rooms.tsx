import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { motion } from 'framer-motion';
import { ROOM_TYPES, generateInviteCode } from '@/lib/pvp-engine';

const LEAGUES_LIST = [
  { id: 'bronze', label: 'Bronze', color: '#CD7F32' },
  { id: 'silver', label: 'Silver', color: '#A8A9AD' },
  { id: 'elite',  label: 'Elite',  color: '#FFD700' },
];

interface Room {
  id: string;
  code: string;
  host: string;
  league: string;
  type: 'public' | 'private' | 'tournament';
  players: number;
  maxPlayers: number;
  stake: number;
}

const MOCK_PUBLIC_ROOMS: Room[] = [
  { id: '1', code: 'PUB001', host: 'SwiftEagle47', league: 'bronze', type: 'public', players: 1, maxPlayers: 2, stake: 30 },
  { id: '2', code: 'PUB002', host: 'BrightFox12',  league: 'silver', type: 'public', players: 1, maxPlayers: 2, stake: 75 },
  { id: '3', code: 'PUB003', host: 'NeonBlade',    league: 'elite',  type: 'public', players: 1, maxPlayers: 2, stake: 150 },
];

export default function Rooms() {
  const { username, coins, level } = useGame();
  const [tab, setTab] = useState<'browse' | 'create' | 'join'>('browse');
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState('bronze');
  const [selectedType, setSelectedType] = useState<'public' | 'private' | 'tournament'>('public');

  const createRoom = () => {
    const code = generateInviteCode();
    setCreatedCode(code);
  };

  const copyCode = () => {
    if (createdCode) {
      navigator.clipboard.writeText(createdCode).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const leagueColor = (id: string) => LEAGUES_LIST.find(l => l.id === id)?.color ?? '#A8A9AD';

  return (
    <div className="min-h-screen bg-background flex flex-col p-5 max-w-md mx-auto pb-10">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/pvp">
          <button className="p-2 rounded-full hover:bg-card"><ArrowLeft className="w-5 h-5" /></button>
        </Link>
        <h1 className="text-2xl font-bold flex-1">Match Rooms</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-card border border-border rounded-xl p-1 mb-5">
        {(['browse', 'create', 'join'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-all"
            style={{ background: tab === t ? 'hsl(var(--primary))' : 'transparent', color: tab === t ? 'white' : 'inherit' }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Browse */}
      {tab === 'browse' && (
        <div className="space-y-3">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Open Rooms</div>
          {MOCK_PUBLIC_ROOMS.map(room => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#2EE87A' }} />
                  <span className="font-bold text-sm">{room.host}'s Room</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{ backgroundColor: `${leagueColor(room.league)}20`, color: leagueColor(room.league) }}>
                  {room.league.charAt(0).toUpperCase() + room.league.slice(1)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{room.players}/{room.maxPlayers} players · {room.stake} 🪙 stake</span>
                <Link href={room.type === 'tournament' ? '/tournament' : '/pvp'}>
                  <button
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                    style={{ backgroundColor: leagueColor(room.league) }}
                  >
                    {room.type === 'tournament' ? 'Enter' : 'Join'}
                  </button>
                </Link>
              </div>
            </motion.div>
          ))}

          <div className="bg-card border border-dashed border-border rounded-2xl p-6 text-center text-muted-foreground">
            <div className="text-3xl mb-2">🔍</div>
            <div className="text-sm">More rooms appear as players go online</div>
          </div>
        </div>
      )}

      {/* Create */}
      {tab === 'create' && (
        <div className="space-y-4">
          <div>
            <div className="text-xs font-bold text-muted-foreground uppercase mb-2">Room Type</div>
            <div className="space-y-2">
              {ROOM_TYPES.map(rt => (
                <button
                  key={rt.id}
                  onClick={() => setSelectedType(rt.id)}
                  className="w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3"
                  style={{
                    borderColor: selectedType === rt.id ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                    backgroundColor: selectedType === rt.id ? 'hsl(var(--primary)/0.1)' : 'transparent',
                  }}
                >
                  <span className="text-2xl">{rt.icon}</span>
                  <div>
                    <div className="font-bold text-sm">{rt.label}</div>
                    <div className="text-xs text-muted-foreground">{rt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-muted-foreground uppercase mb-2">League</div>
            <div className="flex gap-2">
              {LEAGUES_LIST.map(l => (
                <button
                  key={l.id}
                  onClick={() => setSelectedLeague(l.id)}
                  className="flex-1 py-2 rounded-xl text-sm font-bold border transition-all"
                  style={{
                    borderColor: selectedLeague === l.id ? l.color : 'hsl(var(--border))',
                    backgroundColor: selectedLeague === l.id ? `${l.color}20` : 'transparent',
                    color: selectedLeague === l.id ? l.color : 'inherit',
                  }}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {!createdCode ? (
            <button
              onClick={createRoom}
              className="w-full h-14 rounded-2xl bg-primary text-white font-bold text-lg active:scale-95 transition-transform"
            >
              Create Room
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-green-500/30 rounded-2xl p-5 text-center space-y-3"
            >
              <div className="text-sm text-muted-foreground">Room Created!</div>
              <div className="text-4xl font-black tracking-widest text-primary">{createdCode}</div>
              <button
                onClick={copyCode}
                className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl border border-border text-sm font-medium"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
              <div className="text-xs text-muted-foreground">Share this code with your opponent</div>
              <Link href={selectedType === 'tournament' ? '/tournament' : '/pvp'}>
                <button className="w-full h-12 rounded-xl bg-primary text-white font-bold">
                  {selectedType === 'tournament' ? 'Enter Tournament' : 'Start Battle'}
                </button>
              </Link>
            </motion.div>
          )}
        </div>
      )}

      {/* Join */}
      {tab === 'join' && (
        <div className="space-y-4">
          <div>
            <div className="text-xs font-bold text-muted-foreground uppercase mb-2">Enter Invite Code</div>
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ABC123"
              className="w-full h-16 bg-card border border-border rounded-2xl px-5 text-center text-2xl font-black tracking-widest outline-none focus:border-primary transition-colors"
            />
          </div>

          <Link href="/pvp">
            <button
              disabled={joinCode.length < 4}
              className="w-full h-14 rounded-2xl bg-primary text-white font-bold text-lg active:scale-95 transition-transform disabled:opacity-40"
            >
              Join Room
            </button>
          </Link>

          <div className="bg-card border border-border rounded-2xl p-4 text-sm text-muted-foreground text-center">
            Ask your friend to create a private room and share the 6-character code with you.
          </div>
        </div>
      )}
    </div>
  );
}
