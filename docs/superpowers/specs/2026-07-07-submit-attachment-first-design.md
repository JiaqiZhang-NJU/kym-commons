# KYM Commons Submit Attachment-First Design

Date: 2026-07-07
Status: Draft approved in conversation, pending written spec review
Project: KYM Commons
Scope: submission flow redesign for attachment-first uploads

## Goal

Redesign the submission flow so contributors do not need to know repository paths or pre-host files before submitting materials. The default submission mode should treat GitHub Issue attachments as the primary file handoff channel, while external links remain an optional alternative.

## Problem

The current submit form requires a `资料链接` field in every case. That design assumes the contributor already knows where the file lives, or can predict the final repository path in advance.

For this project, that assumption is wrong:

- most contributors only have local files
- contributors should not need to know repository structure
- the system, not the contributor, should decide the final repository location
- external links should be optional, not mandatory

## Product Decision

Adopt an attachment-first submission model:

- contributors submit metadata through the site
- contributors choose a file source mode
- the default mode is `GitHub Issue 附件`
- external link mode remains available for materials that already live elsewhere
- final repository paths are decided by maintainers and system conventions after review

## Chosen Flow

### Submission Source Modes

The details step should collect a `文件来源` choice before asking for any link-like input.

Available modes:

1. `GitHub Issue 附件`
2. `外部链接`

Meaning:

- `GitHub Issue 附件`: the contributor will open the generated GitHub Issue and upload one or more files as Issue attachments
- `外部链接`: the contributor will provide a stable external URL instead of attaching files in the Issue

### Default Behavior

The default selected source mode should be `GitHub Issue 附件`.

Reason:

- fits the current static-site architecture
- matches the common user case of “I have a local file”
- removes the need for contributors to understand repository paths

## Step 3 Redesign

### Current Fields

The current details step collects:

- material type
- title
- term
- summary
- link
- anonymous preference

### New Fields

The redesigned details step should collect:

- material type
- title
- term
- summary
- file source mode
- external link (only when needed)
- anonymous preference

### Conditional Rules

If `文件来源 = GitHub Issue 附件`:

- the external link input should be hidden or disabled
- the link should not be required
- the UI should show a short explanation:
  - `提交到 GitHub Issue 后，请将文件拖拽上传到 Issue 描述区或评论区`

If `文件来源 = 外部链接`:

- the external link input should be shown
- the external link becomes required
- the placeholder can remain `https://...`

## Validation Rules

### Always Required

These fields remain required in all cases:

- title
- term
- summary
- file source mode

### Conditionally Required

- external link is required only when `文件来源 = 外部链接`
- external link is not required when `文件来源 = GitHub Issue 附件`

### Explicitly Not Required

Contributors should never be asked to provide:

- repository-relative file paths
- final `static/files/...` destinations
- GitHub Pages URLs
- local absolute paths for publication

## Preview And Issue Content

### Preview Goal

The preview step should make the next action clear before the user opens GitHub.

### Preview Content

The preview should show:

- resolved publishing target
- source mode
- whether an external link is provided
- a plain-language reminder for attachment mode

Example preview wording for attachment mode:

- `文件来源：GitHub Issue 附件`
- `外部链接：无`
- `下一步：打开 GitHub Issue 后，请将资料文件上传为附件`

Example preview wording for external-link mode:

- `文件来源：外部链接`
- `外部链接：https://...`

### Issue Body Structure

The generated Issue body should stop assuming a mandatory link line.

Instead, the body should include:

- source mode
- external link if present
- an instruction block for attachment uploads when relevant

Recommended structure:

```md
## 基本信息
- 归属：
- 方向：
- 课程：
- 类型：
- 标题：
- 学期：

## 资料说明
...

## 文件来源
- 来源方式：GitHub Issue 附件
- 外部链接：无

## 上传说明
- [ ] 我会在创建 Issue 后上传资料附件

## 发布偏好
- 是否匿名：是
```

For external-link mode:

```md
## 文件来源
- 来源方式：外部链接
- 外部链接：https://...
```

## Repository Path Ownership

The contributor does not own the final repository path.

The system and maintainers own it.

This means:

- contributors choose course, scope, and material type
- maintainers decide the final normalized file name and exact category directory
- repository placement continues following the project conventions, such as:
  - `static/files/foundation/<course>/<category>/...`
  - `static/files/tracks/<track>/<course>/<category>/...`

The submission UI should never expose this as a contributor responsibility.

## Maintainer Workflow

### Attachment Mode

For `GitHub Issue 附件` submissions:

1. contributor fills out metadata in the site
2. contributor opens the generated GitHub Issue
3. contributor uploads files as attachments in the Issue
4. maintainer reviews the metadata and attached files
5. maintainer downloads files and places them into the repository under the correct structured directory
6. maintainer updates static data or generated content as needed

### External Link Mode

For `外部链接` submissions:

1. contributor fills out metadata in the site
2. contributor provides the stable external URL
3. maintainer decides whether to keep it as an external resource or archive it into the repository later

## Scope Boundaries

This redesign includes:

- changing the submit UI from mandatory link to source-mode-based input
- making external links conditional rather than universal
- updating validation rules
- updating preview and generated Issue content
- clarifying the attachment workflow to contributors

This redesign does not include:

- true browser-to-repository file upload
- a backend file relay service
- automatic download of Issue attachments into the repository
- GitHub API automation for binary ingestion

## Risks

### User Confusion After Leaving The Site

Risk:

- users may think submission is complete before uploading files to the GitHub Issue

Mitigation:

- repeat the attachment instruction in both Step 3 and the preview step
- show the upload requirement inside the generated Issue body

### Missing Attachments

Risk:

- a contributor may open an Issue but forget to attach the file

Mitigation:

- use an explicit checklist item for attachment mode
- instruct maintainers to reject or request follow-up on metadata-only submissions without files

### Mixed Source Cases

Risk:

- some contributors may want both Issue attachments and an external mirror

Mitigation:

- keep the first version simple: one source mode only
- if needed later, add an optional “supplementary external link” field in a separate iteration

## Acceptance Criteria

This redesign is complete when:

- the submit form no longer requires every contributor to fill a link field
- `GitHub Issue 附件` is the default source mode
- contributors can complete the form without knowing repository paths
- external links are only required when the contributor explicitly chooses external-link mode
- the preview step clearly tells attachment-mode users to upload files in GitHub Issue
- the generated Issue body records source mode instead of assuming a mandatory link
- the design makes repository path planning a maintainer/system responsibility rather than a contributor responsibility

## Approval Snapshot

This spec reflects the following confirmed decisions from the conversation:

- the current mandatory-link design is incorrect for a file-first submission workflow
- contributors should not need to know repository information in advance
- repository structure should be planned by the system and maintainers
- external links should be optional rather than required
- the preferred current-mode implementation is `GitHub Issue 附件` as the primary file handoff path
