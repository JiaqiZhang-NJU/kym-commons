export type CatalogEnvelope<T> = {
  schemaVersion: 1;
  items: T[];
};

export type CatalogTrack = {
  slug: string;
  label: string;
  description: string;
  aliases: string[];
  order: number;
};

export type CatalogCourse = {
  slug: string;
  title: string;
  aliases: string[];
  section: "foundation" | "track";
  trackSlug?: string;
  description: string;
  order: number;
  isGeneralResources: boolean;
};

export type CatalogCategory = {
  slug: string;
  label: string;
  storageDirectory: string;
  aliases: string[];
  order: number;
};

export type AssetRole =
  | "primary"
  | "supplement"
  | "question"
  | "solution"
  | "source"
  | "dataset"
  | "archive";

export type CatalogAsset = {
  id: string;
  label: string;
  role: AssetRole;
  href: string;
  fileName: string | null;
  mediaType: string | null;
  sizeBytes: number | null;
  sha256: string | null;
  originalUrl?: string;
};

export type MaterialPackage = {
  schemaVersion: 1;
  id: string;
  title: string;
  summary: string;
  placement:
    | { section: "foundation"; courseSlug: string }
    | { section: "track"; trackSlug: string; courseSlug: string };
  categorySlug: string;
  materialType: string;
  term: { label: string; sortKey: string | null };
  tags: string[];
  aliases: string[];
  assets: CatalogAsset[];
  source: {
    kind: "repository" | "external" | "github-submission" | "website-submission";
    submissionId?: string;
    anonymous?: boolean;
    issueNumber?: number;
    intakePullRequestNumber?: number;
    intakeRevisionCommentId?: number;
    originalUrl?: string;
  };
  publishedAt: string | null;
  updatedAt: string | null;
  legacyIds: string[];
};

export type Catalog = {
  tracks: CatalogTrack[];
  courses: CatalogCourse[];
  categories: CatalogCategory[];
  packages: MaterialPackage[];
};

export type CatalogValidationResult = {
  errors: string[];
  warnings: string[];
};
