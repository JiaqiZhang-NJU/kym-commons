/** Compatibility type used by browse/navigation helpers. Production records are external catalog data. */
export type MaterialRecord = {
  id: string;
  section: "foundation" | "track";
  trackSlug?: string;
  courseSlug: string;
  category: string;
  categoryOrder?: number;
  title: string;
  type: string;
  term: string;
  summary: string;
  href: string;
};
