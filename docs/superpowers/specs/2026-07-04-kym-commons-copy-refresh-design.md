# KYM Commons Copy Refresh Design

Date: 2026-07-04
Status: Draft approved in conversation, pending written spec review
Project: KYM Commons
Scope: homepage, README, About copy refresh

## Goal

Refresh the public-facing copy so `KYM Commons` reads like a formal academic project rather than a prototype or an internal maintainer note dump.

## Pages In Scope

- `src/pages/index.tsx`
- `README.md`
- `docs/about.md`

## Writing Direction

Adopt an "academic project" voice:

- formal but not bureaucratic
- clear and restrained
- student-facing without sounding casual
- suitable for a long-lived knowledge platform

## Content Changes

### Homepage

- rewrite the hero subtitle and supporting line into a more formal project introduction
- keep the page concise
- make section cards and platform mechanism text sound more institutional and stable
- avoid prototype-like wording such as "built-in review flow"

### README

- rewrite the opening into a formal project overview
- keep development instructions, but move them behind project positioning
- keep deployment and setup information maintainable
- remove colloquial or overly directive phrasing
- remove wording like:
  - `公开给学弟学妹访问时，**不要**直接使用默认 GitHub Pages 地址`
- replace it with neutral maintainer wording about release preparation and access configuration

### About

- rewrite into a formal project description page
- cover project purpose, content organization, contribution model, and review principles
- keep it short and stable

## Exclusions

This refresh does not change:

- page structure
- navigation
- component layout
- deployment logic
- GitHub setup documents used by maintainers

## Acceptance Criteria

This copy refresh is complete when:

- homepage reads like a formal project landing page
- README no longer contains the unwanted colloquial warning sentence
- About page reads like a stable project profile
- no maintainer-only phrasing leaks into the public-facing copy
