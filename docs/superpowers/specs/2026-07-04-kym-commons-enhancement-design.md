# KYM Commons Enhancement Design

Date: 2026-07-04
Status: Draft approved in conversation, pending user review of written spec
Project: KYM Commons
Scope: Submit flow enhancement, dark mode readability, first GitHub push readiness

## 1. Goal

This enhancement round improves the first working version of `KYM Commons` in three tightly related areas:

- turn the current single-page submit form into a clearer multi-step submission wizard
- fix dark mode readability issues so text, form controls, and preview content remain legible
- prepare the project for its first push to GitHub under the real owner account while keeping the future public-facing URL free of the owner's GitHub username

The result should feel closer to a publishable student-facing website instead of an internal prototype.

## 2. Confirmed Inputs

The following points are fixed by the conversation:

- GitHub username or owner: `JiaqiZhang-NJU`
- repository visibility strategy: private first, public later
- repository name may follow the project name
- public-facing URL shown to students must not contain the GitHub username

## 3. Repository And Public URL Strategy

### 3.1 Repository Naming

Use the repository name:

- `kym-commons`

Reason:

- consistent with the project name
- clean and stable
- easy to remember for maintainers

### 3.2 Internal Repository URL

The repository can live at:

- `https://github.com/JiaqiZhang-NJU/kym-commons`

This is acceptable as a maintainer-facing address.

### 3.3 Public Student-Facing URL

The site shown to students must not use the default GitHub Pages address:

- `https://JiaqiZhang-NJU.github.io/kym-commons/`

Instead, the design requires a custom domain before public rollout.

Recommended pattern:

- `https://commons.<your-domain>/`
- or `https://kym.<your-domain>/`
- or `https://materials.<your-domain>/`

This means:

- private development may still use the default Pages preview internally
- public release must only happen after the custom domain is configured and verified

### 3.4 Why Custom Domain Is Required

There is no GitHub Pages configuration under a personal account that hides the account name without using a custom domain. Therefore, if the public URL must not expose `JiaqiZhang-NJU`, a custom domain is the correct and necessary solution.

## 4. Submit Flow Redesign

### 4.1 Current Problem

The current submit page already generates GitHub Issue content, but the experience is still a single long form with all fields shown at once. This makes the page feel technical and slightly prototype-like.

### 4.2 Enhancement Goal

Convert the page into a real submission wizard that guides the user step by step and reduces cognitive load.

### 4.3 Chosen Approach

Use a four-step wizard inside the same page rather than routing each step to a separate URL.

Why:

- simpler state management
- fewer route and resume edge cases
- easier to preview and validate before opening GitHub Issue
- enough structure for the first release without overbuilding

### 4.4 Step Structure

The wizard should use these four steps:

1. Submission Scope
2. Course Or Track Target
3. Material Details
4. Preview And Submit

### 4.5 Step 1: Submission Scope

The first step asks the user what kind of content they are submitting:

- Foundation course material
- Track course material
- Track non-course material

Expected behavior:

- show short explanations for each option
- once selected, move to the next step
- highlight that track non-course material will publish under `General Resources`

### 4.6 Step 2: Course Or Track Target

This step adapts to the scope chosen in Step 1.

For Foundation course material:

- select an existing Foundation course
- or choose to create a new course

For Track course material:

- select a track
- select an existing course in that track
- or choose to create a new course in that track

For Track non-course material:

- select a track
- show a read-only target label such as:
  - `Publishing target: <Track> / General Resources`

### 4.7 Step 3: Material Details

This step collects:

- material title
- term or year
- material type
- summary
- link
- anonymous preference

Validation expectations:

- title is required
- term is required
- link is required
- summary should not be empty

The first version may use lightweight inline validation rather than a heavy form library.

### 4.8 Step 4: Preview And Submit

The final step shows:

- the final GitHub Issue title
- the final GitHub Issue body
- resolved publishing target
- whether the submission is anonymous

The user should then see:

- `Back` button
- `Open GitHub Issue` primary button

### 4.9 Wizard UX Rules

The wizard should obey these rules:

- one step visible at a time
- visible stepper or progress indicator at the top
- `Next` disabled if required fields for the current step are incomplete
- `Back` always available after step 1
- preview is read-only
- step state persists while staying on the page

### 4.10 File Boundaries

To keep the page maintainable, avoid keeping all wizard state logic and presentation in one large file.

Recommended split:

- `src/pages/submit.tsx`: page shell
- `src/components/submit/SubmitWizard.tsx`: step controller
- `src/components/submit/SubmitStepScope.tsx`
- `src/components/submit/SubmitStepTarget.tsx`
- `src/components/submit/SubmitStepDetails.tsx`
- `src/components/submit/SubmitStepPreview.tsx`
- `src/components/submit/submit.module.css` or equivalent focused CSS module
- `src/lib/submission.ts`: keep payload generation logic here

## 5. Dark Mode Readability Fix

### 5.1 Current Problem

The current dark mode palette sets primary colors but does not fully define surface, border, form control, secondary text, and preview text tokens. As a result, some text can appear too dim against dark backgrounds, especially in form-heavy pages and preview blocks.

### 5.2 Enhancement Goal

Dark mode should be readable and consistent across:

- body content
- cards
- labels
- helper text
- links
- form inputs
- `pre` preview blocks
- tables and borders if present

### 5.3 Chosen Approach

Use global CSS design tokens rather than one-off per-component text color fixes.

Why:

- consistent theme behavior
- easier maintenance
- less regression risk when more components are added

### 5.4 Required Dark Mode Tokens

Add or refine tokens for:

- page background
- surface background
- border color
- main text color
- muted text color
- input background
- input text color
- input placeholder color
- `pre` and code block background
- `pre` and code block text

### 5.5 Visual Standard

Dark mode should feel:

- calm
- readable
- slightly academic
- not overly neon

Purple remains an accent color, not the main text color.

### 5.6 Minimum Readability Targets

The following areas must remain clearly legible:

- navbar text
- hero subtitle
- card text
- form field labels
- selected option text
- preview title and body text
- button labels

## 6. First Push To GitHub Preparation

### 6.1 Goal

Prepare the repository so the first push can happen cleanly while the project remains private during internal setup.

### 6.2 First Push Checklist

Before the first push:

1. create private GitHub repository `kym-commons`
2. add `origin` remote pointing to `JiaqiZhang-NJU/kym-commons`
3. push local `main`
4. confirm Actions are enabled
5. confirm Pages can later publish from GitHub Actions
6. decide the intended public custom domain
7. prepare DNS access before public launch

### 6.3 Pages Configuration Rule

The repository may use GitHub Pages for deployment, but public release should only happen after:

- Pages is enabled
- the custom domain is configured
- HTTPS is active
- the public URL no longer exposes the GitHub username

### 6.4 Repository Documentation

This enhancement round should add a maintainer-facing setup document explaining:

- repository naming
- remote setup
- first push commands
- private-to-public rollout order
- custom domain requirement
- Pages enablement steps

Recommended file:

- `docs/github-setup.md`

## 7. Scope Boundaries

This enhancement round includes:

- submit page wizard UI
- dark mode token and readability fixes
- real GitHub owner and repository configuration
- maintainer documentation for first push and public rollout

This enhancement round does not include:

- GitHub OAuth
- true file upload
- backend relay service
- comment system
- analytics

## 8. Implementation Risks

### 8.1 Submit Wizard Complexity

Risk:

- page state becomes tangled if kept in one file

Mitigation:

- split the wizard into focused step components

### 8.2 Dark Mode Regressions

Risk:

- fixing one page but missing shared tokens causes later inconsistency

Mitigation:

- fix global tokens first, then verify submit page and homepage

### 8.3 Public URL Constraint

Risk:

- repo goes public before custom domain is ready, exposing the GitHub username in the public Pages URL

Mitigation:

- keep the repository private until custom domain setup is complete
- document this as a release gate, not a suggestion

## 9. Acceptance Criteria

This enhancement is complete when:

- the submit page is a true four-step wizard
- users can move forward and backward cleanly
- preview still generates valid GitHub Issue content
- dark mode text is readable on content cards, forms, and preview blocks
- repository config points to `JiaqiZhang-NJU/kym-commons`
- maintainer docs explain first push and custom-domain rollout
- the design makes it explicit that the student-facing public URL must use a custom domain

## 10. Approval Snapshot

This written spec reflects the following confirmed decisions from the conversation:

- use the real GitHub owner `JiaqiZhang-NJU`
- repository strategy is private first, public later
- repository name should follow the project name and use `kym-commons`
- use the medium-scope enhancement approach
- redesign submit page as a multi-step wizard
- repair dark mode readability using shared tokens, not isolated one-off fixes
- public student-facing URL must not contain the GitHub username
- therefore public release requires a custom domain
