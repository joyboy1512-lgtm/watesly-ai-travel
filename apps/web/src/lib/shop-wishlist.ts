export type WishlistKind = "hotel" | "flight" | "transfer" | "activity" | "destination";

export type WishlistItem = {
  id: string;
  kind: WishlistKind;
  title: string;
  href: string;
  imageUrl?: string;
  subtitle?: string;
  priceMinor?: number;
  currency?: string;
  savedAt: string;
};

const KEY = "weekendgate_wishlist";
const CHANGE = "weekendgate_wishlist_change";

function read(): WishlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WishlistItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row) => row && typeof row.id === "string" && row.href);
  } catch {
    return [];
  }
}

function write(items: WishlistItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, 80)));
  window.dispatchEvent(new Event(CHANGE));
}

export function listWishlist(): WishlistItem[] {
  return read();
}

export function wishlistHas(id: string): boolean {
  return read().some((row) => row.id === id);
}

export function toggleWishlistItem(item: Omit<WishlistItem, "savedAt">): {
  saved: boolean;
  items: WishlistItem[];
} {
  const current = read();
  const i = current.findIndex((row) => row.id === item.id);
  if (i >= 0) {
    current.splice(i, 1);
    write(current);
    return { saved: false, items: current };
  }
  const next: WishlistItem[] = [
    { ...item, savedAt: new Date().toISOString() },
    ...current,
  ];
  write(next);
  return { saved: true, items: next };
}

export function removeWishlistItem(id: string) {
  write(read().filter((row) => row.id !== id));
}

export function subscribeWishlist(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) listener();
  };
  window.addEventListener(CHANGE, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE, listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function wishlistSlug(item: Pick<WishlistItem, "kind" | "id">) {
  return `${item.kind}:${item.id}`;
}
