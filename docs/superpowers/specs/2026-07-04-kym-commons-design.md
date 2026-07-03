# KYM Commons Design

Date: 2026-07-04
Status: Draft approved in conversation, pending user review of written spec
Project: KYM Commons
Chinese Title: 匡院资料站

## 1. Goal

KYM Commons is a course-material sharing site for students in Kuang Yaming College. It uses a familiar GitHub Pages style, keeps the UI clean and academic, and adds a limited Nanjing University purple accent.

The first version focuses on:

- collecting and organizing course materials for students inside the academy
- supporting in-site visual submission instead of requiring direct manual repository editing
- using GitHub as the review and publishing backbone
- automatically generating material pages after admin approval

The project should behave like a normal website for contributors, while remaining simple to operate for maintainers.

## 2. Product Positioning

### 2.1 Primary Users

- current students in Kuang Yaming College

### 2.2 Content Priority

- first priority: course materials
- second priority: direction-level non-course resources

### 2.3 Product Principles

- simple and trustworthy
- easy to browse by academic structure
- easy to contribute through a web form
- low maintenance burden for administrators
- clear copyright and privacy boundaries

## 3. Information Architecture

### 3.1 Top-Level Navigation

- Home
- Foundation
- Tracks
- Browse
- Submit
- Rules
- About

Suggested Chinese labels:

- 首页
- 大类培养
- 方向课程
- 全站检索
- 提交资料
- 站点规则
- 关于我们

### 3.2 Top-Level Content Structure

The whole site is organized into two major sections:

1. Foundation
2. Tracks

Foundation contains the broad-category training courses from the first three semesters.

Tracks contains later-stage courses grouped by broad academic direction.

### 3.3 Track Names

The fixed broad-track categories are:

- 数学
- 生化
- 计算机
- 物理
- 天文
- 其他

### 3.4 Unified Course Model

Each track contains:

- normal courses
- one special course named `General Resources`

`General Resources` is not a real course. It is a structural placeholder used to store materials that belong to a direction but not to a specific course. This keeps the data model, routing, rendering, and automation logic unified.

### 3.5 Content Tree

```text
KYM Commons
├─ Foundation
│  ├─ 数学分析
│  ├─ 高等代数
│  ├─ 普通物理
│  ├─ 程序设计基础
│  └─ ...
└─ Tracks
   ├─ 数学
   │  ├─ 实变函数
   │  ├─ 抽象代数
   │  └─ General Resources
   ├─ 生化
   │  └─ General Resources
   ├─ 计算机
   │  ├─ 数据结构
   │  ├─ 机器学习
   │  └─ General Resources
   ├─ 物理
   │  └─ General Resources
   ├─ 天文
   │  └─ General Resources
   └─ 其他
      └─ General Resources
```

## 4. Page Design

### 4.1 Home

The homepage should look like a polished open-source project site, not a forum and not a commercial landing page.

Core homepage sections:

- hero section with `KYM Commons`
- Chinese subtitle `匡院资料站`
- English subtitle line such as `A shared course materials hub for the academy`
- primary buttons: `Browse Materials` and `Submit Materials`
- two main entry cards: `Foundation` and `Tracks`
- one secondary entry card: `Browse`
- a recent updates section
- a featured or popular courses section
- a short submission guide

### 4.2 Foundation Page

This page directly lists broad-category training courses from the first three semesters. Each course links to a standard course page.

### 4.3 Tracks Page

This page shows the six broad directions as cards. Each direction page then shows:

- course list
- one `General Resources` card

`General Resources` should use a slightly special visual treatment so users can tell it is a shared resource container rather than a normal course.

### 4.4 Course Page

All course pages, including `General Resources`, should share one rendering model.

A course page includes:

- title
- category information
- optional semester or scope description
- material type filters
- material cards

Each material card should display:

- title
- material type
- semester or year
- short summary
- link
- tags

### 4.5 Browse Page

This is the site-wide filtering page for users who do not enter through a fixed direction or course path.

Recommended filters:

- section: Foundation or Tracks
- direction
- course
- material type
- keyword

### 4.6 Submit Page

This should be a multi-step guided form so the experience feels like a normal website workflow.

Recommended steps:

1. choose material scope
2. choose or create course if applicable
3. fill material details
4. preview generated submission
5. submit to GitHub-backed review flow

### 4.7 Rules Page

This page should clearly define:

- what can be uploaded
- what is prohibited
- privacy and anonymization requirements
- copyright and attribution expectations

### 4.8 About Page

This page should explain:

- the site mission
- who it serves
- how contributions work
- how maintainers review content

## 5. Submission Design

### 5.1 Submission Scopes

A user can submit one of three scopes:

1. Foundation course material
2. Track course material
3. Track non-course material

Internally, the system maps them to two publishing targets:

- normal course page
- `General Resources` page under a track

### 5.2 Course Selection Behavior

For course-based submissions, users must be able to:

- choose an existing course from the list
- create a new course by manual input

If the user creates a new course, the form should collect:

- course name
- belonging section
- belonging track if applicable
- optional alias or short name
- optional note

### 5.3 Non-Course Material Behavior

If the user selects track non-course material:

- the form does not ask for a normal course
- the form asks for a track
- the system automatically maps the submission to the track's `General Resources`

### 5.4 Material Types

For course materials:

- 课程笔记
- 作业经验
- 历年题/回忆
- 参考资料
- FAQ

For non-course materials:

- 方向导引
- 经验分享
- 科研入门
- 竞赛/项目
- 工具资源
- 书单/参考资源
- 其他

### 5.5 Submission Fields

The submit form should collect:

- scope
- section
- track if applicable
- existing course or new course
- material type
- title
- semester or year
- summary
- link
- anonymous publishing preference
- privacy confirmation
- copyright confirmation

### 5.6 Submission UX

The user should feel that they are submitting through the site, not manually opening a repository issue form.

The first version should still rely on GitHub issue-based review, but the website should:

- guide the user through the form
- generate a preview
- generate standardized submission content
- hand the submission to GitHub in a structured way

## 6. Review and Publishing Workflow

### 6.1 Review Backbone

The review center is GitHub Issues.

Why Issues:

- every submission gets a unique review thread
- maintainers can ask follow-up questions
- labels can represent review status
- automation is easier to attach

### 6.2 Suggested Labels

- `submission`
- `foundation`
- `track`
- `general-resources`
- `needs-info`
- `reviewing`
- `accepted`
- `rejected`
- `published`

Direction and material-type labels can be added later if needed.

### 6.3 Approval Flow

Recommended flow:

1. user submits through the site
2. a standardized GitHub issue is created or prefilled
3. maintainers review the content
4. maintainers request missing information if needed
5. maintainers add `accepted` when approved
6. GitHub Actions processes the approved submission
7. material page is generated automatically
8. the site is redeployed to GitHub Pages
9. issue is marked `published`

## 7. Auto-Generation Design

### 7.1 Why Auto-Generation

Admins should not need to manually create pages for every accepted submission. Approval should be enough to trigger publication.

### 7.2 Auto-Generation Behavior

When an issue becomes accepted:

- parse the structured fields from the issue
- determine whether this belongs to Foundation, a track course, or track `General Resources`
- if it references a new course, append the course to the course registry
- generate a Markdown or MDX material file
- update any necessary course or browse indexes
- redeploy the site

### 7.3 New Course Handling

The course registry should live in structured data, such as `courses.json`.

When a new course submission is approved:

- normalize the course name
- check for duplicates or aliases
- add the course to the registry
- make it available in later form selections

Maintainers should keep one canonical course name to avoid duplicate naming.

## 8. Technical Architecture

### 8.1 Stack

- frontend and static site: Docusaurus
- hosting: GitHub Pages
- review: GitHub Issues
- automation: GitHub Actions
- content generation: scripts that convert approved issues into Markdown or MDX files

### 8.2 Repository Structure

```text
kym-commons/
├─ docs/
│  ├─ foundation/
│  │  ├─ courses/
│  │  └─ resources/
│  ├─ tracks/
│  │  ├─ math/
│  │  ├─ biochem/
│  │  ├─ cs/
│  │  ├─ physics/
│  │  ├─ astronomy/
│  │  └─ other/
│  ├─ rules/
│  └─ about/
├─ data/
│  ├─ courses.json
│  ├─ directions.json
│  ├─ material-types.json
│  └─ submissions-schema.json
├─ src/
│  ├─ components/
│  ├─ pages/
│  │  ├─ index.tsx
│  │  ├─ browse.tsx
│  │  ├─ submit.tsx
│  │  └─ directions.tsx
│  ├─ css/
│  └─ utils/
├─ scripts/
│  ├─ issue-to-content.js
│  ├─ update-course-index.js
│  └─ build-search-data.js
├─ .github/
│  ├─ workflows/
│  │  ├─ deploy.yml
│  │  ├─ sync-submissions.yml
│  │  └─ validate-content.yml
│  └─ ISSUE_TEMPLATE/
│     └─ material-submission.yml
└─ static/
```

### 8.3 Data Boundaries

Static site generation is the default. The first version should avoid introducing a complex runtime backend.

First version should support:

- metadata submission
- links to materials
- online document links
- cloud storage links

First version should not support:

- direct binary upload inside the site
- full user account system
- heavy moderation backend

## 9. Visual Design

### 9.1 Style Direction

The site should use a common GitHub Pages visual language:

- clean
- academic
- restrained
- reliable

It should not look like:

- a forum
- a commercial SaaS landing page
- a highly decorative student club page

### 9.2 Color Strategy

- background: white or very light gray-purple
- body text: dark gray
- accent color: Nanjing University purple

Use purple mainly for:

- navbar highlights
- primary buttons
- tags
- card hover states
- important links

Avoid:

- large purple background blocks
- heavy gradients
- excessive shadows

## 10. Phase Scope

### 10.1 First Version Must Include

- homepage
- Foundation page
- Tracks page
- direction pages
- course pages
- `General Resources` pages
- browse page
- submit page
- issue template
- review labels
- approved-issue to page generation
- GitHub Pages deployment

### 10.2 Later Phases

Possible later upgrades:

- GitHub OAuth
- a light relay service
- actual file upload support
- richer search
- popularity or recommendation modules

## 11. Development Order

Recommended implementation order:

1. create Docusaurus project skeleton
2. build homepage and global navigation
3. define Foundation and Tracks data model
4. build static direction and course pages
5. implement material card rendering
6. build submit page UI
7. define GitHub issue template and labels
8. implement issue-to-content automation
9. connect GitHub Pages deployment
10. polish style and content details

## 12. Open Constraints

These points are intentionally fixed for the first version:

- course names can be selected from a list or added manually
- non-course direction resources are supported
- non-course resources are published under `General Resources`
- admin approval triggers automatic page generation
- first version is link-based rather than direct file upload

These points should not be expanded in the first version unless there is a strong reason:

- complex auth
- heavy backend
- social features such as comments or likes

## 13. Approval Snapshot

This written spec reflects the following confirmed decisions from the conversation:

- project name: `KYM Commons`
- Chinese subtitle: `匡院资料站`
- style: common GitHub Pages look with limited Nanjing University purple accents
- architecture: `Docusaurus + GitHub Pages + GitHub Issues + GitHub Actions`
- top-level split: `Foundation` and `Tracks`
- first three semesters grouped under `Foundation`
- broad directions under `Tracks`: 数学、生化、计算机、物理、天文、其他
- each track contains one special course: `General Resources`
- submissions support existing courses, new courses, and non-course resources
- accepted submissions generate pages automatically
