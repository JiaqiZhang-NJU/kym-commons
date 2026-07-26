# KYM Commons Catalog, Publishing, Routes, Search, and Material Packages Design

Date: 2026-07-26  
Status: Draft complete, pending written spec review  
Project: KYM Commons  
Scope: canonical catalog, submission publishing flow, stable routes, deeper search, and material packages

## 1. Goal

Turn the current static material list into one coherent content system in which:

- one canonical Catalog is the only source of truth for tracks, courses, Material Packages, and Assets
- every Catalog change is validated before the site can build or publish
- an approved GitHub submission produces a reviewable pull request containing both files and Catalog records
- every course and Material Package has a stable, indexable URL
- Browse uses a generated search index with relevance ranking, suggestions, and facets
- one Material Package can contain one or many related Assets without exposing every physical file as a separate search result

The five areas are intentionally designed together. They share one domain model and one generated Catalog, so they must not introduce parallel sources of truth.

## 2. Confirmed Scope

This Spec includes only:

1. a unique, validated Catalog Module
2. a complete GitHub submission-to-publishing flow
3. stable and indexable course and Material Package routes
4. deeper search without adding more ordinary dropdown filters
5. a Material Package model for one or many Assets

This Spec does not include:

- moving files out of `static/files`
- object storage, CDN, Git LFS, or hosting migration
- a custom backend
- authentication or a non-GitHub submission channel
- download analytics or search analytics
- comments, ratings, or social features
- cross-device favorites
- a broad visual redesign
- a new copyright or malware-scanning program

Basic file integrity checks required for publishing are in scope. A broader content-governance program is not.

## 3. Product Decisions

### 3.1 Canonical Source

The source of truth moves from hand-assembled TypeScript arrays to authored Catalog records under `content/`.

The old files:

- `src/data/materials.ts`
- `src/data/materialsBackfill.ts`
- `src/data/courses.ts`
- duplicated track/course labels in other modules

must become migration inputs only. They must not remain writable production sources after migration.

### 3.2 Material Package Is The Searchable Entity

The site does not search or favorite individual physical files.

The searchable, routable, and favoriteable entity is a `MaterialPackage`.

Examples:

- one PDF lecture note is one Material Package containing one Asset
- one exam plus its answer is one Material Package containing two Assets
- one programming assignment containing source, starter code, sample input, and instructions is one Material Package containing several Assets
- one stable external link is one Material Package containing one external Asset

This keeps the Catalog useful even when a logical resource consists of many files.

### 3.3 Stable IDs Own Stable URLs

Titles, filenames, and translated labels may change.

Stable routes use immutable IDs and canonical slugs:

- course URLs use the canonical course slug
- Material Package URLs use the immutable package ID
- Asset filenames never determine the Material Package URL

### 3.4 Approved Submissions Produce Pull Requests

Submission automation must never push generated content directly to `main`.

An approved submission creates or updates a dedicated branch and pull request. The pull request must pass the same Catalog validation and site build as any other change.

Merging that pull request is the publishing decision.

### 3.5 Search Is Generated At Build Time

KYM Commons remains a static site.

Search does not require a hosted search backend. The build generates a compact search index from the validated Catalog. Browse loads this index lazily and performs ranking in the browser.

## 4. Domain Language

The following terms are normative for this work.

### Catalog

The complete validated set of Tracks, Courses, Categories, Material Packages, Assets, aliases, and legacy mappings used to build the site.

### Track

A wide academic direction such as `cs`, `math`, or `physics`.

### Course

A course that belongs either to Foundation or to one Track. `General Resources` remains a special Course within each Track.

### Material Package

The smallest searchable, routable, favoriteable, and publishable material entity. It contains one or more Assets.

### Asset

One downloadable repository file or one stable external URL belonging to a Material Package.

### Submission

A proposed Material Package and its metadata submitted through a GitHub Issue.

### Catalog Module

The deep Module that loads, validates, queries, and generates derived Catalog data behind one Interface.

### Submission Intake Module

The deep Module that converts a machine-readable GitHub Submission into a proposed Catalog change.

### Search Module

The deep Module that generates and queries the Material Package search index.

## 5. Target Architecture

The dependency direction is:

```text
Authored Catalog records
        |
        v
Catalog Module validation and normalization
        |
        +-------------------+
        |                   |
        v                   v
Docusaurus route data   Search index
        |                   |
        v                   v
Course/package pages      Browse

GitHub Submission
        |
        v
Submission Intake Module
        |
        v
Proposed Catalog records + Assets
        |
        v
Pull request -> Catalog validation -> build -> merge -> publish
```

Pages must not import raw authored records directly.

The Catalog Module Interface is the test surface. Pages and Search consume normalized Catalog output, not filesystem layout knowledge.

## 6. Authored Catalog Layout

The proposed layout is:

```text
content/
├─ catalog/
│  ├─ tracks.json
│  ├─ courses.json
│  └─ categories.json
└─ packages/
   ├─ foundation/
   │  └─ <course-slug>/
   │     └─ <package-id>.json
   └─ tracks/
      └─ <track-slug>/
         └─ <course-slug>/
            └─ <package-id>.json
```

One Material Package is stored in one JSON file.

Reasons:

- submission pull requests normally add one isolated record
- package history is easy to inspect
- two submissions to different courses do not edit one giant file
- invalid records can be reported by exact file path
- the Catalog Module hides the many-file implementation behind one small Interface

Every Catalog JSON file uses a versioned envelope:

```ts
type CatalogFile<T> = {
  schemaVersion: 1;
  items: T[];
};
```

Package files use their own `schemaVersion` field because each file contains exactly one Package.

The directory path is organizational. The record still declares its placement explicitly, and the validator confirms that the path and record agree.

## 7. Catalog Schema

The exact runtime implementation may use Zod or an equivalently strict runtime schema. Runtime validation and TypeScript types must come from the same schema definition.

### 7.1 Track

```ts
type Track = {
  slug: string;
  label: string;
  description: string;
  aliases: string[];
  order: number;
};
```

Rules:

- `slug` is immutable, lowercase ASCII kebab-case
- `slug` is unique
- `label` is the preferred display label
- aliases may contain Chinese, English, abbreviations, or historical names
- order is unique within the Track list

### 7.2 Course

```ts
type Course = {
  slug: string;
  title: string;
  aliases: string[];
  section: "foundation" | "track";
  trackSlug?: string;
  description: string;
  order: number;
  isGeneralResources: boolean;
};
```

Rules:

- Foundation Courses must not declare `trackSlug`
- Track Courses must declare a known `trackSlug`
- `isGeneralResources` is allowed only for Track Courses
- each Track has exactly one `general-resources` Course
- `(section, trackSlug, slug)` is unique
- a Course slug does not change after publication

### 7.3 Category

```ts
type MaterialCategory = {
  slug: string;
  label: string;
  storageDirectory: string;
  aliases: string[];
  order: number;
};
```

Category slugs and storage directories are canonical. Display labels may change without changing URLs or file placement.

### 7.4 Material Package

```ts
type MaterialPackage = {
  schemaVersion: 1;
  id: string;
  title: string;
  summary: string;
  placement: {
    section: "foundation" | "track";
    trackSlug?: string;
    courseSlug: string;
  };
  categorySlug: string;
  materialType: string;
  term: {
    label: string;
    sortKey: string | null;
  };
  tags: string[];
  aliases: string[];
  assets: Asset[];
  source: {
    kind: "repository" | "external" | "github-submission";
    issueNumber?: number;
    intakePullRequestNumber?: number;
    intakeRevisionCommentId?: number;
    originalUrl?: string;
  };
  publishedAt: string | null;
  updatedAt: string | null;
  legacyIds: string[];
};
```

Rules:

- `id` is immutable, unique, lowercase ASCII, and URL-safe
- `title` and `summary` are required
- placement must resolve to a known Course
- `categorySlug` must resolve to a known Category
- a Material Package has at least one Asset
- Asset IDs are unique inside the Material Package
- the globally addressable Asset key is `(packageId, assetId)`; Asset IDs are not globally unique by themselves
- `legacyIds` are globally unique and may not collide with another current ID
- `term.label = "未知"` is allowed during migration, but `sortKey` must then be `null`
- new submissions must provide a meaningful term unless the material is explicitly timeless

### 7.5 Asset

```ts
type Asset = {
  id: string;
  label: string;
  role:
    | "primary"
    | "supplement"
    | "question"
    | "solution"
    | "source"
    | "dataset"
    | "archive";
  href: string;
  fileName: string | null;
  mediaType: string | null;
  sizeBytes: number | null;
  sha256: string | null;
};
```

Rules:

- repository Assets use `/files/...` paths
- repository paths must resolve inside `static/files`
- external Assets use `https://`
- path traversal, control characters, and unsupported schemes are rejected
- repository Assets require file name, size, and SHA-256 after migration
- external Assets may leave size and SHA-256 null
- exact duplicate repository paths are rejected
- repeated SHA-256 values produce a validation warning unless the record explicitly reuses an existing Asset

## 8. Catalog Module

### 8.1 Interface

The public Interface should remain small:

```ts
loadCatalog(): Catalog
validateCatalog(): CatalogValidationResult
getTrack(slug): Track | null
getCourse(locator): Course | null
getPackage(id): MaterialPackage | null
listPackages(query): MaterialPackage[]
```

Build-only generation functions may live behind an internal Seam:

```ts
generateRouteData(catalog)
generateSearchDocuments(catalog)
generateLegacyMappings(catalog)
```

Pages must not know:

- where package JSON files live
- how filesystem paths are checked
- how legacy records are migrated
- how Categories map to storage directories
- how duplicate IDs are detected

That knowledge belongs to the Catalog Module implementation for Locality.

### 8.2 Validation Levels

Hard errors fail tests and builds:

- malformed schema
- duplicate Track, Course, Package, Asset, or legacy ID
- duplicate Asset path
- unknown Track, Course, or Category reference
- Track/Course placement mismatch
- package file stored in the wrong authored directory
- zero Assets
- missing repository Asset
- unsafe URL scheme or path traversal
- missing required SHA-256 or size after migration completion

Warnings are reported but do not initially fail migration:

- unknown term
- generic summary
- missing aliases
- repeated file hash with an explicit reuse explanation missing
- missing publication date on migrated content

After migration, new or edited records must not introduce new warnings.

### 8.3 Commands

The implementation must add:

```text
npm run catalog:validate
npm run catalog:generate
npm run catalog:migrate
npm run catalog:check
```

Meaning:

- `catalog:validate`: validate authored records and referenced files
- `catalog:generate`: produce route and search data for Docusaurus
- `catalog:migrate`: one-time conversion from legacy TypeScript data
- `catalog:check`: run validation plus generated-output consistency checks

Generated data must not become a second authored source of truth.

### 8.4 Build Integration

`npm run build` must run `catalog:check` before Docusaurus compilation.

The Docusaurus Catalog plugin loads the validated Catalog during build and creates:

- course route data
- Material Package route data
- a compact Browse document list
- a serialized search index
- legacy ID mappings

Pages receive only the data they need.

## 9. Legacy Migration

Migration must be deterministic and repeatable.

### 9.1 Inputs

- `src/data/materials.ts`
- `src/data/materialsBackfill.ts`
- `src/data/courses.ts`
- `src/data/site.ts`
- physical files under `static/files`

### 9.2 Migration Rules

- preserve current Material IDs whenever they are unique
- resolve duplicate IDs through an explicit migration override before writing authored records
- for each duplicated legacy ID, select one canonical winner; other Packages receive new IDs and must not inherit that ambiguous legacy ID
- record every duplicate-ID decision in the migration report
- preserve current file URLs where files exist
- report missing file URLs as hard migration tasks
- one legacy Material record becomes one one-Asset Material Package by default
- related records are not automatically merged merely because they share a folder
- clear exam/solution pairs may be grouped only by an explicit migration rule or reviewed mapping
- current favorite IDs are written into `legacyIds` when a new Package ID is created
- migration output is sorted and formatted consistently

### 9.3 Cutover

Cutover is complete when:

- pages no longer import `SAMPLE_MATERIALS`
- no runtime module imports legacy material arrays
- all Catalog tests pass
- legacy data files are deleted in a dedicated final commit
- a migration report records all resolved duplicate IDs, missing files, and grouped packages

## 10. Material Package Experience

### 10.1 Cards

Search and course pages show one card per Material Package.

A card shows:

- title
- summary
- Course and Track context
- Category
- term
- total Asset count
- available format badges
- favorite state
- link to the Material Package detail page

Cards do not show one primary download button when a Package contains several unrelated Assets. The primary action becomes `查看资料`.

### 10.2 Detail Page

The Material Package page shows:

- canonical title and summary
- Course, Track, Category, and term
- each Asset with label, role, format, and size
- individual open/download actions
- source Issue link when available
- publication and update dates when available
- related Material Packages from the same Course and Category

For new submissions, intake sets `publishedAt` to the UTC date on which the publication pull request is created. The value becomes effective only when that pull request merges; no follow-up commit rewrites it. Migrated records may keep `publishedAt = null`.

### 10.3 Download All

The static site does not generate ZIP files dynamically.

Rules:

- when the Package includes an `archive` Asset, show `下载资料包`
- otherwise list individual Assets
- do not synthesize a browser-side ZIP in the first version

### 10.4 Favorites

Favorites attach to Material Package IDs.

On first load after migration:

- read existing favorite IDs
- resolve current IDs and `legacyIds`
- replace resolved legacy IDs with current Package IDs
- preserve unknown IDs temporarily so a later Catalog correction can recover them

## 11. Stable And Indexable Routes

### 11.1 Canonical Routes

```text
/foundation/<course-slug>/
/tracks/<track-slug>/<course-slug>/
/materials/<package-id>/
```

Examples:

```text
/foundation/calculus-i/
/tracks/cs/machine-learning/
/tracks/cs/general-resources/
/materials/foundation-university-physics-i-chapter01-pdf/
```

Existing Track landing pages remain:

```text
/tracks/cs/
/tracks/math/
```

### 11.2 Generated Routes

The local Docusaurus Catalog plugin creates one route for every Course and Material Package.

Every generated page must:

- use validated Catalog data
- have a specific title and description
- emit a canonical URL
- be included in the sitemap
- render a useful not-found state when route data cannot be resolved during development

### 11.3 Legacy Route Compatibility

The old query route remains temporarily:

```text
/materials?section=foundation&course=<slug>
/materials?section=track&track=<slug>&course=<slug>
```

It becomes a compatibility redirect Module:

- valid legacy queries redirect to the canonical Course route
- invalid queries redirect to `/browse`
- the compatibility page uses `noindex`
- all internal links switch to canonical routes in the first route commit

The compatibility route may be removed only after at least one public release cycle.

### 11.4 Route Builders

All route construction moves behind one routing Interface:

```ts
buildCoursePath(course)
buildPackagePath(materialPackage)
resolveLegacyCoursePath(search)
```

Callers must not assemble course query strings or Material Package paths themselves.

## 12. Search Module

### 12.1 Search Documents

The build generates one Search Document per Material Package:

```ts
type SearchDocument = {
  id: string;
  title: string;
  summary: string;
  aliases: string[];
  tags: string[];
  courseSlug: string;
  courseTitle: string;
  courseAliases: string[];
  trackSlug: string | null;
  trackLabel: string | null;
  categorySlug: string;
  categoryLabel: string;
  termLabel: string;
  termSortKey: string | null;
  assetFormats: string[];
  route: string;
};
```

Course suggestions use a separate lightweight document so a Course with no Packages can still be discovered:

```ts
type CourseSuggestionDocument = {
  type: "course";
  id: string;
  title: string;
  aliases: string[];
  trackLabel: string | null;
  route: string;
  packageCount: number;
};
```

Course Suggestion Documents participate in autocomplete only. They do not appear as material results or affect Material Package result counts.

The browser must not import the full authored Catalog.

### 12.2 Indexing

Use a serialized browser search index generated at build time. MiniSearch or an equivalent small static-search library is acceptable.

Tokenization rules:

- normalize Unicode to NFC
- lowercase Latin text
- normalize punctuation and repeated whitespace
- segment Chinese text with `Intl.Segmenter`
- index complete Chinese strings as well as segmented terms
- preserve canonical course abbreviations and aliases

Field weighting:

| Field | Relative weight |
|---|---:|
| exact title | 8 |
| title aliases | 7 |
| Course title and aliases | 5 |
| Track label | 4 |
| tags | 4 |
| Category | 3 |
| term | 3 |
| summary | 1 |

Ranking rules:

- exact title and exact Course matches rank first
- matches containing all query terms rank before partial matches
- prefix matching is enabled
- fuzzy matching applies only to sufficiently long Latin terms
- fuzzy matching is not applied blindly to short Chinese queries
- duplicate Assets inside one Material Package never create duplicate results

### 12.3 Browse Experience

Browse keeps one visually dominant search input.

Instead of adding more ordinary dropdowns, deepen retrieval with:

- ranked suggestions while typing
- Course and Material Package suggestions in separate groups
- highlighted matching terms in results
- result counts by Track, Course, Category, and format
- clickable facet values with counts
- removable active-filter chips
- a collapsible refinement area
- clear zero-result suggestions
- direct links to canonical Course and Material Package routes

Existing filters may be migrated into facets. New search dimensions must not be added as another row of ordinary dropdowns.

Facet semantics are:

- multiple selected values in one Facet use OR
- selections across different Facets use AND
- each Facet count applies the current query and all other Facets, but excludes that Facet's own current selection
- zero-count values are hidden unless currently selected
- selecting or removing a Facet resets pagination to page 1

### 12.4 URL State

Search state remains shareable:

```text
/browse?q=machine+learning&track=cs&category=finals&page=2
```

Rules:

- query, facets, sort, and page are canonicalized
- default values are omitted
- a submitted search creates browser history
- back and forward restore prior searches
- typing suggestions does not create history entries
- pagination scrolls to the result heading and moves keyboard focus there

Favorites-only remains device-local and is not required to be shareable.

### 12.5 Loading And Failure Behavior

- the search index loads only on Browse or when homepage suggestions need it
- the search input remains usable while the index loads
- show a compact loading message rather than an empty result state
- if index loading fails, show Course navigation links and a retry action
- the build enforces a compressed search-payload budget

The initial compressed payload target is no more than 500 KiB. If migration data exceeds it, split documents by section or Track and load shards on demand.

## 13. Complete Submission-To-Publishing Flow

### 13.1 Submission Contract

The site-generated GitHub Issue contains:

- human-readable title and summary
- a machine-readable `kym-submission:v2` block
- file-source instructions
- contributor confirmations

Example:

```md
<!-- kym-submission:v2
{
  "schemaVersion": 2,
  "placement": {
    "section": "track",
    "trackSlug": "cs",
    "courseSlug": "machine-learning"
  },
  "categorySlug": "reference",
  "materialType": "参考资料",
  "title": "机器学习复习资料",
  "term": "2026 Spring",
  "summary": "课程重点与复习路径整理",
  "source": {
    "mode": "issue-attachment"
  },
  "updateTargetPackageId": null,
  "anonymous": true
}
-->
```

The runtime contract is a discriminated union:

```ts
type SubmissionV2 = {
  schemaVersion: 2;
  placement:
    | {
        section: "foundation";
        courseSlug: string;
      }
    | {
        section: "track";
        trackSlug: string;
        courseSlug: string;
      };
  proposedCourse?: {
    title: string;
    aliases: string[];
    requestedSlug?: string;
  };
  categorySlug: string;
  materialType: string;
  title: string;
  term: string;
  summary: string;
  source:
    | {
        mode: "issue-attachment";
      }
    | {
        mode: "external-link";
        externalUrl: string;
        label: string;
        role: Asset["role"];
      };
  updateTargetPackageId: string | null;
  anonymous: boolean;
};
```

Rules:

- `proposedCourse` is allowed only when the selected Course does not already exist
- `requestedSlug` is a maintainer override, not a required contributor field
- `updateTargetPackageId` must resolve to an existing Package in the submitted placement
- attachment mode rejects `externalUrl`
- external mode requires `externalUrl`, Asset label, and Asset role

Because attachment URLs do not exist before the Issue is created, attachment mode uses a second versioned manifest after upload:

```md
<!-- kym-assets:v1
{
  "revision": 1,
  "assets": [
    {
      "url": "https://github.com/user-attachments/assets/...",
      "label": "试题",
      "role": "question"
    },
    {
      "url": "https://github.com/user-attachments/assets/...",
      "label": "参考答案",
      "role": "solution"
    }
  ]
}
-->
```

The Asset manifest is a complete replacement list, not an append operation.

The Submission Intake Module parses the machine block, not translated labels.

The human-readable body remains available for contributors and reviewers.

### 13.2 Submission States

```text
submitted
  -> needs-information
  -> ready-for-intake
  -> intake-pr-open
  -> published

Any pre-publication state may move to rejected.
```

Suggested labels:

- `submission`
- `submission:needs-information`
- `submission:ready`
- `submission:pr-open`
- `submission:published`
- `submission:rejected`

The existing generic `accepted` trigger is replaced by `submission:ready`.

### 13.3 Intake Trigger

When a maintainer applies `submission:ready`:

1. check out the current default branch
2. load the Issue body and metadata for comments containing an Asset manifest
3. parse and validate the machine-readable block
4. select the latest authorized Asset manifest or validate the external URL
5. resolve the existing Course, or prepare a new Course proposal
6. create a deterministic Material Package ID
7. download repository-bound Assets into the canonical `static/files` location
8. calculate size, media type, and SHA-256
9. write one authored Material Package record
10. run tests, typecheck, and build; build includes the Catalog check
11. create or update `submission/issue-<number>`
12. open or update a pull request
13. comment on the Issue with the pull request URL
14. replace `submission:ready` with `submission:pr-open`

The intake workflow uses least-privilege permissions:

```yaml
permissions:
  contents: write
  pull-requests: write
  issues: write
```

It must not receive deployment, Pages, package-publishing, or unrelated repository permissions.

Production intake creates its branch and pull request with a narrowly scoped GitHub App installation token. This allows the normal pull-request validation workflow to run automatically and produce required checks for the intake branch.

Repository `GITHUB_TOKEN` may be used for read operations and Issue comments. A personal access token is not part of this Spec.

### 13.4 Deterministic IDs

For a new Package:

```text
pkg-gh-<issue-number>
```

For Assets:

```text
asset-1
asset-2
...
```

These IDs do not depend on Chinese slugification.

If the Issue already maps to an existing Package, the intake command updates that Package only when the Issue explicitly declares an update target.

### 13.5 Existing And New Courses

For an existing Course:

- the submitted canonical Course slug must resolve
- labels are ignored for routing decisions

For a proposed new Course:

- the Issue records section, Track, proposed title, and aliases
- the intake process proposes an ASCII slug
- the pull request includes the new Course record
- the reviewer may adjust the slug before the first merge
- after first publication, the slug becomes immutable

Chinese slug generation must use an explicit transliteration implementation or a maintainer-provided override. It must never silently produce an empty slug.

### 13.6 Attachment Rules

- attachment mode requires one valid `kym-assets:v1` manifest
- an Asset manifest is trusted only when it is in the Issue body written by the Issue author, or in a comment written by the Issue author or an actor with `MEMBER`, `OWNER`, or `COLLABORATOR` author association
- arbitrary Markdown links and attachments outside a valid manifest are ignored
- the latest valid authorized manifest replaces earlier manifests; its comment ID is stored as `intakeRevisionCommentId`
- rerunning intake with the same manifest revision and comment ID is a no-op
- a changed manifest must increment `revision`
- external-link mode requires one valid `https://` URL
- unsupported schemes fail intake
- repository-bound attachments may be downloaded only from an allowlist of GitHub attachment hosts and paths
- redirects must remain on the attachment-host allowlist
- external-link mode validates but never downloads the external URL
- the workflow enforces configured per-file, total-size, file-count, redirect-count, and download-time limits
- file names are Unicode NFC-normalized
- storage paths reject traversal and reserved names
- name collisions receive a deterministic suffix
- new multi-file submissions create one Material Package with several Assets
- an uploaded ZIP may be one `archive` Asset; the intake process does not automatically unpack arbitrary archives

### 13.7 Idempotency

Reapplying `submission:ready` must not create duplicate:

- branches
- pull requests
- Material Package records
- files
- Issue comments

The Issue number is the idempotency key.

If a prior intake branch exists, the workflow updates it and its existing pull request.

The pull request number is persisted in `source.intakePullRequestNumber`, and the pull request body contains a versioned marker with Issue number and Package ID.

### 13.8 Failure Behavior

On failure:

- do not push partial content to `main`
- preserve diagnostic logs in the workflow
- comment a concise actionable error on the Issue
- apply `submission:needs-information` when contributor action can fix it
- keep `submission:ready` off until the Issue is corrected

Examples:

- missing attachment
- unknown Course
- duplicate Package target
- invalid machine block
- missing file after download
- Catalog validation failure

### 13.9 Publication Completion

When the intake pull request merges:

- the normal `main` validation and deployment publish the new Package
- the Issue receives the canonical Material Package URL
- the Issue is labeled `submission:published`
- the Issue may be closed automatically

If deployment fails, the Issue must not be marked published.

The Issue notification therefore runs only after the Pages deployment job succeeds and requires `issues: write`.

The deployment-success notification Module:

1. diffs Catalog Package files between the pushed `before` and `sha`
2. selects changed Packages whose source is `github-submission`
3. reads `issueNumber`, `intakePullRequestNumber`, and Package ID from each record
4. builds the canonical URL through the shared route builder
5. posts one comment containing `<!-- kym-published:<package-id>:<sha> -->`
6. skips a comment when that marker already exists
7. labels and closes an Issue only when every Package associated with that intake pull request has been deployed

This supports several submission pull requests in one merge batch and safe workflow retries.

## 14. Continuous Integration

The main validation job must run:

```text
npm ci
npm run test
npm run typecheck
npm run build
```

`npm run build` is the single production entry that runs `catalog:check` once before Docusaurus compilation. CI and intake must not call `catalog:check` separately in the same job.

Deployment must depend on the successful validation job rather than running independently.

Submission intake pull requests use the same validation commands.

## 15. Proposed File And Module Changes

New authored content:

```text
content/catalog/tracks.json
content/catalog/courses.json
content/catalog/categories.json
content/packages/...
```

New Catalog implementation:

```text
src/catalog/schema.ts
src/catalog/loadCatalog.ts
src/catalog/validateCatalog.ts
src/catalog/queryCatalog.ts
src/catalog/routes.ts
src/catalog/searchDocuments.ts
plugins/material-catalog/index.ts
```

New page modules:

```text
src/theme/MaterialPackagePage/
src/theme/CourseMaterialsPage/
src/pages/materials.tsx             # temporary legacy redirect only
```

New Search implementation:

```text
src/search/buildSearchIndex.ts
src/search/querySearchIndex.ts
src/search/searchQuery.ts
src/search/searchTypes.ts
```

New intake implementation:

```text
scripts/submission/parse-submission.mjs
scripts/submission/collect-assets.mjs
scripts/submission/build-package.mjs
scripts/submission/run-intake.mjs
```

Workflow changes:

```text
.github/workflows/validate-content.yml
.github/workflows/deploy.yml
.github/workflows/sync-submissions.yml
```

Legacy modules removed only after cutover:

```text
src/data/materials.ts
src/data/materialsBackfill.ts
scripts/issue-to-content.mjs
```

## 16. Test Strategy

### 16.1 Catalog Module Tests

Test through the Catalog Interface:

- loads a valid fixture Catalog
- rejects duplicate Track, Course, Package, Asset, and legacy IDs
- rejects missing repository Assets
- rejects unknown placement references
- rejects Package/path placement mismatches
- rejects unsafe paths and URL schemes
- accepts one-Asset and multi-Asset Packages
- warns on unknown legacy terms
- produces deterministic normalized ordering

### 16.2 Migration Tests

- converts a current single-file record into one Package
- preserves unique existing IDs
- resolves known duplicate-ID fixtures through reviewed migration overrides
- assigns each ambiguous legacy ID to exactly one canonical winner
- records duplicate-ID decisions in the migration report
- preserves Unicode filenames
- records missing files in the migration report
- maps changed IDs through `legacyIds`
- repeated migration produces no diff

### 16.3 Route Tests

- every Course produces exactly one canonical route
- every Material Package produces exactly one canonical route
- Foundation, Track Course, and General Resources paths are correct
- valid legacy queries resolve to canonical paths
- invalid legacy queries resolve to Browse
- internal route builders never emit the old query format after cutover

### 16.4 Search Tests

- Chinese and Latin normalization
- Course aliases and abbreviations
- multi-term all-token ranking
- exact title ranking above summary-only matches
- prefix and long-Latin fuzzy matching
- facet counts after a query
- same-Facet OR and cross-Facet AND behavior
- self-excluding Facet counts
- Course suggestions for a Course with zero Packages
- Package deduplication when several Assets match
- URL parse/build round trips
- browser-history behavior
- index serialization and deserialization

### 16.5 Material Package Tests

- one Asset renders as one Package
- several Assets render one result and one detail page
- Asset roles and formats display correctly
- archive Asset enables `下载资料包`
- no archive Asset falls back to individual downloads
- legacy favorite IDs migrate to Package IDs

### 16.6 Submission Intake Tests

- parses a valid `kym-submission:v2` block
- rejects translated-label-only placement
- handles attachment and external modes
- accepts only an explicit Asset manifest from an authorized actor
- ignores arbitrary attachments from unauthorized comments
- replaces earlier Asset manifests with a higher authorized revision
- validates external Asset labels and roles
- validates explicit Package update targets
- generates deterministic Package and Asset IDs
- handles a Chinese-only title without an empty slug
- creates a new Course proposal
- updates an existing intake branch idempotently
- creates a pull request whose required checks run automatically
- rejects missing attachments
- rejects path traversal
- produces Catalog records that pass the real Catalog validator
- posts one idempotent publication comment only after successful deployment

### 16.7 Workflow Fixture

A repository-local fixture must simulate:

```text
Issue JSON + comment JSON + local attachment fixture
  -> intake
  -> authored Package record
  -> copied Asset
  -> Catalog validation
  -> route data
  -> search document
```

This is the required end-to-end test of the publishing flow. Pure parser tests alone are insufficient.

## 17. Implementation Slices And Git Archives

Each slice should be independently tested and committed.

### Slice 1: Catalog schema and validator

- add authored schema and Catalog Module
- add validation commands and fixtures
- do not switch pages yet

Suggested commit:

```text
feat(catalog): add canonical catalog validation
```

### Slice 2: Legacy migration

- migrate Tracks, Courses, Categories, and current materials
- fix duplicate IDs and missing paths
- produce migration report

Suggested commit:

```text
feat(catalog): migrate legacy material records
```

### Slice 3: Material Packages

- render Package cards and Package details
- support one or many Assets
- migrate favorites

Suggested commit:

```text
feat(materials): add material package pages
```

### Slice 4: Stable Course routes

- generate Course routes
- update internal links
- add legacy compatibility redirects

Suggested commit:

```text
feat(routes): add canonical course pages
```

### Slice 5: Generated search

- generate search documents and serialized index
- add ranking, suggestions, facets, and URL history

Suggested commit:

```text
feat(search): add generated ranked search
```

### Slice 6: Submission contract and intake command

- generate the v2 machine block
- implement local deterministic intake
- add end-to-end fixture

Suggested commit:

```text
feat(submit): add catalog intake pipeline
```

### Slice 7: GitHub pull-request automation

- replace direct push with idempotent intake pull requests
- add Issue status updates
- gate publication on validation and deployment

Suggested commit:

```text
feat(workflows): publish submissions through review prs
```

### Slice 8: Legacy removal

- remove old data arrays and old issue generator
- confirm no legacy imports remain

Suggested commit:

```text
refactor(catalog): remove legacy material sources
```

## 18. Rollout

### Phase A: Parallel Catalog

- introduce the Catalog Module and migrated records
- compare generated output with current pages
- keep old pages active

Exit condition:

- Catalog validates with zero hard errors
- Package count and Course coverage are reviewed

### Phase B: Read Cutover

- switch Course pages, Package pages, Browse, and favorites to Catalog output
- enable stable routes
- retain legacy query redirects

Exit condition:

- no runtime import of legacy arrays
- all canonical routes build
- search uses generated documents

### Phase C: Write Cutover

- enable `kym-submission:v2`
- enable local intake command
- enable pull-request automation

Exit condition:

- end-to-end fixture passes
- a test Issue produces a valid pull request

### Phase D: Cleanup

- remove legacy sources
- mark old Issue parsing unsupported
- retain legacy route redirects for one public release cycle

## 19. Risks And Mitigations

### Migration Changes Existing Favorites

Mitigation:

- preserve IDs where possible
- write every changed ID into `legacyIds`
- migrate local favorites on read

### Automatic Grouping Creates Incorrect Packages

Mitigation:

- default to one legacy record per Package
- merge only through explicit reviewed mappings

### Generated Routes Conflict With Existing Track Routes

Mitigation:

- reserve `/tracks/<track>/` for Track landing pages
- require Course routes to include the Course slug
- test the complete generated route set for collisions

### Search Payload Grows Too Large

Mitigation:

- index only Search Documents, not full Package records
- enforce the compressed budget
- shard by section or Track when the budget is exceeded

### Submission Automation Publishes Partial Content

Mitigation:

- work only on a dedicated branch
- validate before opening or updating the pull request
- merge is required for publication
- never push generated intake changes directly to `main`

### Issue Text Is Edited Or Corrupted

Mitigation:

- parse the versioned machine block
- validate all canonical IDs against the Catalog
- comment actionable errors instead of guessing from labels

### New Course Slug Is Poor

Mitigation:

- treat the automatically generated slug as a proposal
- allow reviewer adjustment before first merge
- make the slug immutable after publication

## 20. Acceptance Criteria

This work is complete when:

### Catalog

- one authored Catalog is the only source of Track, Course, Package, and Asset data
- all authored records pass runtime schema validation
- there are zero duplicate current or legacy IDs
- every repository Asset exists
- pages no longer import `SAMPLE_MATERIALS`
- generated data is not manually edited

### Material Packages

- every searchable result is a Material Package
- a Package supports one or many Assets
- multi-Asset Packages appear once in search and course listings
- every Package has a stable detail URL
- existing favorites survive ID migration where mappings exist

### Routes

- every Course has one canonical indexable URL
- every Material Package has one canonical indexable URL
- internal links use canonical routes
- valid legacy query links redirect correctly
- generated routes appear in the sitemap

### Search

- Browse queries a generated search index
- exact, prefix, alias, Chinese, and multi-term searches are covered
- results are relevance-ranked
- suggestions and counted facets replace the need for more ordinary dropdowns
- URL history, refresh, back, and forward preserve submitted searches
- one Package never appears more than once because it has several Assets

### Submission Publishing

- the site emits `kym-submission:v2`
- an approved attachment submission produces Assets and one authored Package record
- an approved external submission produces one external Asset
- intake is idempotent by Issue number
- intake opens or updates a pull request instead of pushing `main`
- the pull request passes Catalog checks, tests, typecheck, and build
- merging and successful deployment mark the Issue published
- the end-to-end workflow fixture passes

## 21. Approval Snapshot

This Spec makes the following implementation decisions for review:

- use one logical Catalog backed by small authored JSON records
- use Material Package as the searchable and routable entity
- model every Package as one or more Assets
- preserve current `static/files` storage during this work
- generate canonical Course and Material Package routes at build time
- keep old query links as temporary redirects
- use a generated browser search index with weighted relevance
- add suggestions and counted facets instead of more ordinary dropdowns
- use versioned machine-readable submission metadata
- make GitHub Issue number the intake idempotency key
- publish approved submissions through pull requests
- migrate in independent, reversible Git commits
