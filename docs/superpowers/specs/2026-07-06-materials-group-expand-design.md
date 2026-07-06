# Materials Group Expand Design

Date: 2026-07-06
Status: Draft approved in conversation, pending written spec review
Project: KYM Commons
Scope: materials page grouped list expansion

## Goal

Improve the browsing experience on grouped course-material pages by collapsing long category lists by default while preserving direct access to the full list on demand.

## Problem

Some course categories such as lecture slides, quizzes, or past papers may contain more than ten items. Rendering every item at once makes the page visually dense and reduces scanability.

## Decision

On the course materials page, each category group should:

- display all items when the group contains at most 3 entries
- display only the first 3 items by default when the group contains more than 3 entries
- provide an in-place toggle to expand the current group and reveal the remaining items
- allow the same group to be collapsed back to the default view

## In Scope

- `src/pages/materials.tsx`
- `src/lib/materials.ts`
- `src/lib/materials.test.ts`

## Out of Scope

This change does not introduce:

- new routes or category detail pages
- modal or drawer based browsing
- progressive loading such as "show 3 more"
- persistence of expand/collapse state across refreshes
- changes to the `browse` page
- changes to the material data model

## Interaction Model

### Expansion Granularity

Expansion state is tracked per category group on the materials page. Expanding one category must not affect any other category.

### Default State

- groups with `<= 3` items are fully shown and have no toggle
- groups with `> 3` items are collapsed by default and show only the first 3 items

### Toggle Copy

- collapsed state: `查看更多（还有 N 条）`
- expanded state: `收起`

Where `N` is the number of hidden items in the collapsed state.

## Rendering Rules

The existing category order and item order must remain unchanged.

For each grouped category:

1. compute whether the group is expanded
2. compute the visible items from the existing ordered `group.items`
3. render only the visible subset
4. render the toggle button only when the total item count exceeds the display threshold

The threshold is fixed at `3` for this iteration.

## Architecture

### Page Responsibility

`src/pages/materials.tsx` remains the integration point:

- read grouped materials
- hold per-category expansion state
- derive visible items for each category
- render the toggle button below the current category list

### Helper Responsibility

`src/lib/materials.ts` should hold a small pure helper for list truncation logic so the branching rule is testable without coupling tests to the page component.

The helper should encapsulate:

- input item list
- display limit
- expanded flag
- returned visible items
- returned hidden-count metadata

## Testing

Add focused tests in `src/lib/materials.test.ts` for the truncation helper:

- fewer than 3 items returns all items and zero hidden count
- exactly 3 items returns all items and zero hidden count
- more than 3 items while collapsed returns the first 3 items and the correct hidden count
- more than 3 items while expanded returns all items and zero hidden count

No additional page-level test is required for this iteration because the project currently relies on helper-oriented tests for this kind of logic.

## Acceptance Criteria

This change is complete when:

- long category groups on `materials` pages show only the first 3 cards by default
- a category with more than 3 items shows `查看更多（还有 N 条）`
- clicking the toggle expands only the current category
- the expanded category can be collapsed with `收起`
- groups with 3 or fewer items do not show a toggle
- item ordering inside each category is unchanged
- typecheck, tests, and build all pass
