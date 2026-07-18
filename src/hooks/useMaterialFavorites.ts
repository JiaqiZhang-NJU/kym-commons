import { useCallback, useEffect, useState } from "react";

import {
  FAVORITES_STORAGE_KEY,
  readFavoriteIds,
  toggleFavoriteId,
  writeFavoriteIds,
} from "../lib/favorites";

export function useMaterialFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    function refreshFavorites() {
      try {
        setFavoriteIds(readFavoriteIds(window.localStorage));
      } catch {
        setFavoriteIds(new Set());
      }
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === FAVORITES_STORAGE_KEY) {
        refreshFavorites();
      }
    }

    refreshFavorites();
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const toggleFavorite = useCallback((materialId: string) => {
    setFavoriteIds((current) => {
      const next = toggleFavoriteId(current, materialId);

      try {
        writeFavoriteIds(window.localStorage, next);
      } catch {
        // Keep the in-memory state useful when browser storage is unavailable.
      }

      return next;
    });
  }, []);

  return { favoriteIds, toggleFavorite };
}
