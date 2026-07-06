export type TxType =
  | 'earn_match'
  | 'earn_pvp'
  | 'earn_tournament'
  | 'earn_challenge'
  | 'earn_trophy'
  | 'earn_weekly'
  | 'earn_season'
  | 'spend_pvp'
  | 'spend_tournament'
  | 'spend_boost'
  | 'spend_store'
  | 'purchase_dn';

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  label: string;
  timestamp: number;
}

const TX_KEY = 'sl_transactions';

export function getTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(TX_KEY);
    if (raw) return JSON.parse(raw) as Transaction[];
  } catch { /* ignore */ }
  return [];
}

export function addTransaction(tx: Omit<Transaction, 'id' | 'timestamp'>): Transaction[] {
  const full: Transaction = {
    ...tx,
    id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
  };
  const existing = getTransactions();
  const updated = [full, ...existing].slice(0, 200);
  localStorage.setItem(TX_KEY, JSON.stringify(updated));
  return updated;
}

export function getTxIcon(type: TxType): string {
  const icons: Record<TxType, string> = {
    earn_match:       '🎮',
    earn_pvp:         '⚔️',
    earn_tournament:  '🏆',
    earn_challenge:   '📅',
    earn_trophy:      '🏅',
    earn_weekly:      '📋',
    earn_season:      '🌀',
    spend_pvp:        '⚔️',
    spend_tournament: '🏆',
    spend_boost:      '🔥',
    spend_store:      '🛒',
    purchase_dn:     'π',
  };
  return icons[type] ?? '💰';
}

export function getTxColor(amount: number): string {
  return amount >= 0 ? '#2EE87A' : '#FF3A5E';
}

export function getWalletStats(txs: Transaction[]): {
  totalEarned: number;
  totalSpent: number;
  todayEarned: number;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTs = today.getTime();

  let totalEarned = 0, totalSpent = 0, todayEarned = 0;
  for (const tx of txs) {
    if (tx.amount > 0) {
      totalEarned += tx.amount;
      if (tx.timestamp >= todayTs) todayEarned += tx.amount;
    } else {
      totalSpent += Math.abs(tx.amount);
    }
  }
  return { totalEarned, totalSpent, todayEarned };
}

export const DAILY_EARN_LIMIT = 500;
