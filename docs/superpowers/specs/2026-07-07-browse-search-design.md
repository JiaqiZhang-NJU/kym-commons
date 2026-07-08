# KYM Commons Browse Search Design

Date: 2026-07-07
Status: Draft approved in conversation, pending written spec review
Project: KYM Commons
Scope: browse page lightweight search and filtering

## Goal

Upgrade the `browse` page from a static all-materials list into a lightweight search page that helps users quickly find materials across the site without relying on the existing `foundation` and `tracks` navigation flows.

The new page should feel like a unified retrieval entry rather than a directory page.

## Problem

The current `browse` page only renders all materials in one flat list.

That creates three problems:

- users cannot quickly search by keyword
- users cannot narrow results by a few common metadata dimensions
- the page is too passive to serve as a true site-wide retrieval entry

At the same time, this project already has `foundation` and `tracks` pages that work as navigation directories.

So the `browse` page should not become another course-entry page. It should solve a different problem: direct retrieval of matching materials.

## Product Decision

Turn `browse` into a pure search page:

- the top area contains a search box and lightweight filters
- the results area directly shows matching materials
- the page does not show course trees, track cards, or section entry cards
- the page does not organize the user into a navigation path first

This keeps `browse` clearly different from `foundation` and `tracks`.

## Chosen Experience

### Page Positioning

`browse` is the unified site-wide material search page.

It should answer the question:

- `我想找某类资料，直接搜`

It should not answer the question:

- `我先从某个方向或基础课入口开始点进去`

### Interaction Model

The page should use a simple top-down search workflow:

1. the user enters a keyword and optionally adjusts filters
2. the page updates the URL query string
3. matching results are shown immediately below the filter area

The page should remain a single flat retrieval surface, not a grouped browser.

## Search Scope

The first version should support a unified keyword search across the following fields:

- material title
- material summary
- course slug related metadata
- track slug related metadata
- category
- term

This is intentionally broader than title-only search so that users can find materials by both content wording and metadata context.

### Matching Rules

The first version should use simple case-insensitive substring matching.

Behavior:

- keyword is trimmed before matching
- an empty keyword means `no keyword restriction`
- keyword matching is performed against a normalized combined text string built from the searchable fields

The first version does not include:

- fuzzy matching
- typo tolerance
- full-text indexing
- highlighted matched fragments

## Filter Dimensions

The first version should provide exactly three lightweight filters:

1. `资料归属`
2. `分类`
3. `学期`

### 资料归属

This maps to the existing `section` field and should allow:

- `全部`
- `foundation`
- `track`

This filter only narrows the search space.

It must not be presented as a visual entry card or navigation shortcut.

### 分类

This maps to the existing `category` field.

Candidate values should be derived dynamically from current material data instead of being hardcoded by hand.

This prevents the UI from drifting away from the actual dataset.

### 学期

This maps to the existing `term` field.

Candidate values should also be derived dynamically from current material data.

The UI does not need to normalize or merge similar terms in this iteration. It should reflect the current data faithfully.

## URL State

Search state should be encoded into the `browse` page URL so that refresh, back-forward navigation, and link sharing all preserve the current retrieval state.

### Query Parameters

Recommended parameters:

- `q`: keyword
- `section`: material ownership scope
- `category`: material category
- `term`: material term

Example:

```text
/browse?q=physics&section=foundation&category=课程讲义&term=大学物理下
```

### URL Rules

- if a filter is unset, omit the query parameter
- if the keyword is empty after trimming, omit `q`
- invalid values should not break rendering; they should simply produce zero results or be ignored by the UI state parser

## Result Presentation

### Layout

The page should have four visual blocks:

1. page title and short explanatory text
2. search and filter controls
3. result summary row
4. flat result list

### Result List

The result list should continue to reuse `MaterialCard`.

Reason:

- keeps the browse page visually consistent with the rest of the site
- minimizes implementation risk
- keeps this iteration focused on retrieval logic rather than card redesign

### Result Summary

The page should show a short summary such as:

- `共找到 12 条资料`

It should also provide a lightweight `清空筛选` action when any search condition is active.

### No Grouping

Results should not be grouped by course, track, or category in the first version.

Reason:

- grouping makes the page feel like a directory browser
- grouping duplicates what `materials` already does
- a flat result list better matches the chosen retrieval-first goal

## Empty State

When no materials match the current conditions, the page should display a clear empty state.

Recommended content:

- no matching result message
- reminder that the user can relax or clear filters

Example wording:

- `没有找到匹配的资料`
- `可以尝试修改关键词，或清空部分筛选条件`

## Data And Logic Placement

### Data Source

The first version continues to use `SAMPLE_MATERIALS` as the search dataset.

This keeps the work aligned with the current static-site architecture.

### Logic Placement

Search and filter helper logic should be added to `src/lib/materials.ts` instead of being embedded entirely inside the page component.

Recommended responsibilities:

- parse and normalize browse query parameters
- derive unique filter options from materials
- build searchable text for each material
- apply keyword and filter matching

This keeps `browse.tsx` focused on rendering and URL interaction.

## Non-Goals

This iteration does not include:

- replacing `foundation` or `tracks`
- adding a course-level filter control
- grouped result sections
- result sorting controls
- advanced search syntax
- search suggestions
- ranking by relevance score
- migration to a backend or external search service

## Why This Stays Different From Existing Pages

`foundation` and `tracks` are directory-first flows:

- users enter through cards
- users follow a structure
- users eventually land on a course-specific material page

The new `browse` page is retrieval-first:

- users search the material corpus directly
- results are shown immediately
- the page does not require a prior navigation path

That difference should remain obvious in both layout and interaction.

## Risks

### Data Quality Differences

Risk:

- current track-side material coverage is lighter than foundation-side material coverage

Impact:

- search results may appear skewed toward foundation materials

Mitigation:

- accept this as a data coverage issue rather than a search UI issue
- keep the ownership filter visible so users understand the available scope

### Metadata Inconsistency

Risk:

- category or term values may become inconsistent as more materials are added

Impact:

- filter options may become noisy or duplicated in meaning

Mitigation:

- derive options dynamically in this version
- treat metadata normalization as a future data-governance task, not a blocker for this feature

### URL Parsing Drift

Risk:

- page state and URL state may get out of sync if parsing is implemented ad hoc

Mitigation:

- centralize browse query parsing in helper functions
- use one canonical mapping between URL params and page state

## Acceptance Criteria

This design is complete when:

- `browse` supports keyword search across title, summary, course context, track context, category, and term
- `browse` supports lightweight filters for `section`, `category`, and `term`
- the search page remains a flat retrieval page rather than a directory page
- all search conditions are reflected in the URL query string
- refreshing the page preserves the current search state
- the page shows a result count
- the page provides a clear way to clear active conditions
- the page shows a clear empty state for zero matches
- the implementation continues to reuse existing material cards and current static data

## Approval Snapshot

This spec reflects the following confirmed decisions from the conversation:

- the feature should be added to `browse`, not to `foundation` or `tracks`
- the page should focus on retrieval rather than navigation
- keyword search should cover title, summary, and course/category-related metadata
- the first version should include `资料归属`、`分类`、`学期` three filters
- the page should be a pure search panel plus direct result list
- search state should be written into the URL
