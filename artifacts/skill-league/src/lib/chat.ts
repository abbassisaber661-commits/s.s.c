const CHAT_KEY = 'chat_conversations_v1';

export interface ChatMessage {
  id: string;
  fromUsername: string;
  toUsername: string;
  text: string;
  timestamp: number;
  read: boolean;
}

export interface Conversation {
  id: string;
  participants: [string, string];
  messages: ChatMessage[];
}

type ChatStore = Record<string, Conversation>;

export function convId(a: string, b: string): string {
  return [a, b].sort().join('|');
}

function load(): ChatStore {
  try { return JSON.parse(localStorage.getItem(CHAT_KEY) || '{}'); }
  catch { return {}; }
}

function save(store: ChatStore) {
  localStorage.setItem(CHAT_KEY, JSON.stringify(store));
}

export function getConversation(me: string, them: string): Conversation {
  const store = load();
  const id    = convId(me, them);
  return store[id] ?? { id, participants: [me, them] as [string, string], messages: [] };
}

export function getAllConversations(me: string): Conversation[] {
  const store = load();
  return Object.values(store)
    .filter(c => c.participants.includes(me))
    .sort((a, b) => {
      const aLast = a.messages.at(-1)?.timestamp ?? 0;
      const bLast = b.messages.at(-1)?.timestamp ?? 0;
      return bLast - aLast;
    });
}

export function sendMessage(fromUsername: string, toUsername: string, text: string): Conversation {
  const store = load();
  const id    = convId(fromUsername, toUsername);
  const conv  = store[id] ?? { id, participants: [fromUsername, toUsername] as [string, string], messages: [] };
  const msg: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    fromUsername, toUsername,
    text: text.trim().slice(0, 1000),
    timestamp: Date.now(),
    read: false,
  };
  conv.messages = [...conv.messages, msg];
  store[id]     = conv;
  save(store);
  return conv;
}

export function markConversationRead(me: string, them: string): void {
  const store = load();
  const id    = convId(me, them);
  if (!store[id]) return;
  store[id].messages = store[id].messages.map(m =>
    m.toUsername === me ? { ...m, read: true } : m,
  );
  save(store);
}

export function getUnreadDMs(me: string): number {
  const store = load();
  return Object.values(store)
    .filter(c => c.participants.includes(me))
    .reduce((n, c) => n + c.messages.filter(m => m.toUsername === me && !m.read).length, 0);
}

export function getOtherParticipant(conv: Conversation, me: string): string {
  return conv.participants.find(p => p !== me) ?? conv.participants[0];
}

export function getMsgAge(timestamp: number): string {
  const diff  = Date.now() - timestamp;
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return 'now';
  if (mins < 60)  return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

export function seedConversation(me: string): void {
  if (!me) return;
  const store = load();
  const bot   = 'QuantumBolt77';
  const id    = convId(me, bot);
  if (store[id]) return;
  const now = Date.now();
  const conv: Conversation = {
    id, participants: [me, bot],
    messages: [
      { id: 'seed_m1', fromUsername: bot, toUsername: me, text: 'Hey! Good game earlier 🔥', timestamp: now - 12 * 3600_000, read: true },
      { id: 'seed_m2', fromUsername: bot, toUsername: me, text: 'Want to run a tournament set?', timestamp: now - 8 * 3600_000, read: false },
    ],
  };
  store[id] = conv;
  save(store);
}
