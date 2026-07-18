export const FAVORITES_STORAGE_KEY = "kym-commons:material-favorites";

type FavoritesStorage = Pick<Storage, "getItem" | "setItem">;

export function parseFavoriteIds(value: string | null): Set<string> {
  if (!value) {
    return new Set();
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return new Set();
    }

    return new Set(
      parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    );
  } catch {
    return new Set();
  }
}

export function readFavoriteIds(storage: FavoritesStorage): Set<string> {
  return parseFavoriteIds(storage.getItem(FAVORITES_STORAGE_KEY));
}

export function writeFavoriteIds(storage: FavoritesStorage, favoriteIds: ReadonlySet<string>): void {
  storage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...favoriteIds].sort()));
}

export function toggleFavoriteId(favoriteIds: ReadonlySet<string>, materialId: string): Set<string> {
  const nextFavoriteIds = new Set(favoriteIds);

  if (nextFavoriteIds.has(materialId)) {
    nextFavoriteIds.delete(materialId);
  } else {
    nextFavoriteIds.add(materialId);
  }

  return nextFavoriteIds;
}
