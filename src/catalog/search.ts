import type { MaterialPackage } from "./types";

export type CatalogSearchQuery = {
  q: string;
  section: "all" | "foundation" | "track";
  course: string;
  category: string;
  term: string;
  tags: string[];
};

export type CatalogFacet = "section" | "course" | "category" | "term" | "tags";

const EMPTY_QUERY: CatalogSearchQuery = {
  q: "",
  section: "all",
  course: "",
  category: "",
  term: "",
  tags: [],
};

function normalize(value: string): string {
  return value.toLocaleLowerCase("zh-Hans").replace(/[\s_-]+/g, " ").trim();
}

export function tokenize(value: string): string[] {
  const normalized = normalize(value);
  if (!normalized) return [];

  if (typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter("zh-Hans", { granularity: "word" });
    const segments = [...segmenter.segment(normalized)]
      .filter((segment) => segment.isWordLike)
      .map((segment) => segment.segment);
    return segments.length ? segments : normalized.split(" ").filter(Boolean);
  }

  return normalized.split(" ").filter(Boolean);
}

function packageSearchText(materialPackage: MaterialPackage): string {
  return normalize(
    [
      materialPackage.title,
      materialPackage.summary,
      materialPackage.materialType,
      materialPackage.categorySlug,
      materialPackage.term.label,
      ...materialPackage.tags,
      ...materialPackage.aliases,
      ...materialPackage.assets.flatMap((asset) => [asset.label, asset.fileName ?? ""]),
    ].join(" ")
  );
}

function matchesFacets(materialPackage: MaterialPackage, query: CatalogSearchQuery): boolean {
  if (query.section !== "all" && materialPackage.placement.section !== query.section) return false;
  if (query.course && materialPackage.placement.courseSlug !== query.course) return false;
  if (query.category && materialPackage.categorySlug !== query.category) return false;
  if (query.term && materialPackage.term.label !== query.term) return false;
  return query.tags.every((tag) => materialPackage.tags.includes(tag));
}

export function searchCatalog(packages: MaterialPackage[], query: Partial<CatalogSearchQuery> = EMPTY_QUERY) {
  const normalizedQuery = { ...EMPTY_QUERY, ...query };
  const tokens = tokenize(normalizedQuery.q);

  return packages
    .map((materialPackage, index) => ({ materialPackage, index, score: scorePackage(materialPackage, tokens) }))
    .filter(({ materialPackage, score }) => matchesFacets(materialPackage, normalizedQuery) && (tokens.length === 0 || score > 0))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ materialPackage }) => materialPackage);
}

function scorePackage(materialPackage: MaterialPackage, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const title = normalize(materialPackage.title);
  const aliases = normalize(materialPackage.aliases.join(" "));
  const tags = normalize(materialPackage.tags.join(" "));
  const assets = normalize(materialPackage.assets.flatMap((asset) => [asset.label, asset.fileName ?? ""]).join(" "));
  const remainder = packageSearchText(materialPackage);
  let score = 0;

  for (const token of tokens) {
    if (!remainder.includes(token)) return 0;
    if (title.includes(token)) score += 100;
    else if (aliases.includes(token)) score += 70;
    else if (tags.includes(token)) score += 45;
    else if (assets.includes(token)) score += 25;
    else score += 10;
  }

  return score;
}

export function getCatalogFacetCounts(
  packages: MaterialPackage[],
  query: CatalogSearchQuery,
  facet: CatalogFacet
): Map<string, number> {
  const selfExcludingQuery: CatalogSearchQuery = {
    ...query,
    [facet]: facet === "section" ? "all" : facet === "tags" ? [] : "",
  };
  const matching = searchCatalog(packages, selfExcludingQuery);
  const counts = new Map<string, number>();

  for (const materialPackage of matching) {
    const values =
      facet === "section"
        ? [materialPackage.placement.section]
        : facet === "course"
          ? [materialPackage.placement.courseSlug]
          : facet === "category"
            ? [materialPackage.categorySlug]
            : facet === "term"
              ? [materialPackage.term.label]
              : materialPackage.tags;
    for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return counts;
}
