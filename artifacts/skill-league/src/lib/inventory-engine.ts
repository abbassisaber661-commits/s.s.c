// ─────────────────────────────────────────────
// 🎒 SkillLeague Inventory Engine
// ─────────────────────────────────────────────

export interface InventoryItem {
  id: string;
  quantity: number;
}

export interface Inventory {
  items: InventoryItem[];
}

export function createInventory(): Inventory {
  return {
    items: [],
  };
}

export function addItem(
  inventory: Inventory,
  itemId: string,
  quantity = 1
): Inventory {
  const existing = inventory.items.find(
    (i) => i.id === itemId
  );

  if (existing) {
    return {
      ...inventory,
      items: inventory.items.map((i) =>
        i.id === itemId
          ? { ...i, quantity: i.quantity + quantity }
          : i
      ),
    };
  }

  return {
    ...inventory,
    items: [
      ...inventory.items,
      {
        id: itemId,
        quantity,
      },
    ],
  };
}

export function hasItem(
  inventory: Inventory,
  itemId: string
) {
  return inventory.items.some(
    (i) => i.id === itemId
  );
}

export function removeItem(
  inventory: Inventory,
  itemId: string,
  quantity = 1
): Inventory {
  return {
    ...inventory,
    items: inventory.items
      .map((i) =>
        i.id === itemId
          ? {
              ...i,
              quantity: i.quantity - quantity,
            }
          : i
      )
      .filter((i) => i.quantity > 0),
  };
}