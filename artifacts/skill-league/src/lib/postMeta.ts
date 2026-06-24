const META_KEY = 'sl_post_meta_v1';

export interface PostMeta {
  views: number;
  shares: number;
}

type MetaStore = Record<string, PostMeta>;

function load(): MetaStore {
  try { return JSON.parse(localStorage.getItem(META_KEY) || '{}'); }
  catch { return {}; }
}

function save(store: MetaStore) {
  localStorage.setItem(META_KEY, JSON.stringify(store));
}

export function getPostMeta(postId: string): PostMeta {
  return load()[postId] ?? { views: 0, shares: 0 };
}

export function getAllPostMeta(): MetaStore {
  return load();
}

export function incrementView(postId: string): PostMeta {
  const store   = load();
  const current = store[postId] ?? { views: 0, shares: 0 };
  const updated = { ...current, views: current.views + 1 };
  store[postId] = updated;
  save(store);
  return updated;
}

export function incrementShare(postId: string): PostMeta {
  const store   = load();
  const current = store[postId] ?? { views: 0, shares: 0 };
  const updated = { ...current, shares: current.shares + 1 };
  store[postId] = updated;
  save(store);
  return updated;
}

export function seedPostMeta(postIds: string[]): void {
  const store   = load();
  let changed   = false;
  for (const id of postIds) {
    if (!store[id]) {
      const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      store[id]  = { views: (hash % 180) + 15, shares: (hash % 18) + 1 };
      changed    = true;
    }
  }
  if (changed) save(store);
}
