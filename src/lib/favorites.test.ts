import { describe, expect, it } from "vitest";

import {
  FAVORITES_STORAGE_KEY,
  parseFavoriteIds,
  readFavoriteIds,
  toggleFavoriteId,
  writeFavoriteIds,
} from "./favorites";

describe("favorite material storage", () => {
  it("parses valid ids and ignores invalid values", () => {
    expect([...parseFavoriteIds('["material-a", "", 3, "material-a", "material-b"]')]).toEqual([
      "material-a",
      "material-b",
    ]);
    expect(parseFavoriteIds("not-json").size).toBe(0);
    expect(parseFavoriteIds('{"id":"material-a"}').size).toBe(0);
  });

  it("reads and writes a stable serialized value", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    writeFavoriteIds(storage, new Set(["material-b", "material-a"]));

    expect(values.get(FAVORITES_STORAGE_KEY)).toBe('["material-a","material-b"]');
    expect([...readFavoriteIds(storage)]).toEqual(["material-a", "material-b"]);
  });

  it("adds and removes a material without mutating the current set", () => {
    const current = new Set(["material-a"]);
    const added = toggleFavoriteId(current, "material-b");
    const removed = toggleFavoriteId(added, "material-a");

    expect([...current]).toEqual(["material-a"]);
    expect([...added]).toEqual(["material-a", "material-b"]);
    expect([...removed]).toEqual(["material-b"]);
  });
});
