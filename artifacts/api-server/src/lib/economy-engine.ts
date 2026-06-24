// ─────────────────────────────────────────────
// 💰 SkillLeague Economy Engine
// ─────────────────────────────────────────────

export interface Wallet {
  coins: number;
  gems: number;
}

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  currency: "coins" | "gems";
}

export function createWallet(): Wallet {
  return {
    coins: 0,
    gems: 0,
  };
}

export function addCoins(
  wallet: Wallet,
  amount: number
): Wallet {
  return {
    ...wallet,
    coins: wallet.coins + amount,
  };
}

export function addGems(
  wallet: Wallet,
  amount: number
): Wallet {
  return {
    ...wallet,
    gems: wallet.gems + amount,
  };
}

export function canBuy(
  wallet: Wallet,
  item: ShopItem
) {
  if (item.currency === "coins") {
    return wallet.coins >= item.price;
  }

  return wallet.gems >= item.price;
}

export function buyItem(
  wallet: Wallet,
  item: ShopItem
): Wallet {
  if (!canBuy(wallet, item)) {
    return wallet;
  }

  if (item.currency === "coins") {
    return {
      ...wallet,
      coins: wallet.coins - item.price,
    };
  }

  return {
    ...wallet,
    gems: wallet.gems - item.price,
  };
}