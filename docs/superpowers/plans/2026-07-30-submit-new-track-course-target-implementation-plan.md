# 投稿目标 UI 与新 Track / 新课程发布开发计划

> 本计划使用可逐项勾选的任务拆分。实现时按测试先行顺序执行，并在每个任务结束后运行相关测试。

## 目标

修复投稿向导第二步中“新增课程”文字与勾选框错位的问题，并把现有只停留在 UI 层的“新增课程”能力补成可发布功能；同时允许投稿者在方向类投稿中创建新的 Track，使投稿生成的 PR 能一次性创建 Track、必要的课程目录以及资料包。

## 当前问题与根因

1. `src/css/custom.css` 对所有 `input` 设置了 `width: 100%`。该规则也命中了 checkbox，导致勾选框占据整行，视觉位置与“新增课程”标签脱离。
2. “新增课程”使用单个 checkbox 表达“已有 / 新增”二选一状态，语义和层级不够清晰，也不利于以后加入“已有方向 / 新增方向”。
3. 投稿 manifest 在新增课程时写入空 `courseSlug`；`scripts/submissions/issue-to-catalog.mjs` 遇到空值会抛出 `New courses require a maintainer-created course catalog entry`，因此当前“新增课程”实际无法由自动投稿流程发布。
4. 投稿表单仍从 `src/data/site.ts` 和 `src/data/courses.ts` 读取旧的硬编码目录，而正式内容源已经是 `content/catalog/*.json`。即使投稿 PR 创建了新 Track / 课程，表单也不会自动显示它们。
5. Track 首页及各 Track 页面仍依赖硬编码数据与静态页面。新 Track 即使进入 Catalog，也不会自动获得 `/tracks/<slug>/` 入口。

## 产品决策

### 目标选择模型

第二步不再用一个孤立的“新增课程” checkbox，而是使用明确的选择组：

- Foundation 投稿：
  - 已有课程
  - 新建课程
- Track 课程投稿：
  - 已有方向
  - 新建方向
  - 在已有方向下：已有课程 / 新建课程
  - 在新方向下：必须新建课程
- Track 非课程资料投稿：
  - 已有方向
  - 新建方向
  - 课程固定为 `General Resources`

所有选择组使用原生 radio，并让 radio、标题和辅助说明处于同一个可点击 label 中。checkbox 只保留给真正的布尔选项，例如“匿名发布”。

### 新 Track 的目录规则

- 用户必须填写：
  - Track 显示名称，例如“电子信息”
  - Track slug，例如 `electronic-information`
- slug 使用现有 Catalog 规则：小写 ASCII kebab-case，正则为 `^[a-z0-9]+(?:-[a-z0-9]+)*$`。
- 创建新 Track 时始终自动创建该方向的 `general-resources` 课程。
- 若投稿类型为“方向课程”，还要创建用户填写的新课程。
- 新 Track、新课程和资料包在同一个自动生成 PR 中提交，避免出现资料引用不存在目录的中间状态。

### 冲突策略

- 新 Track slug 已存在：拒绝自动生成并提示改选“已有方向”。
- 同一 Track 下新课程 slug 已存在：拒绝自动生成并提示改选“已有课程”。
- Foundation 新课程 slug 已存在：同样拒绝。
- 名称重复但 slug 不同：保留给维护者在投稿 PR 中判断，不自动合并目录。
- manifest 不接受客户端传入 `order`、描述等管理字段；入库脚本自行生成，防止投稿者覆盖目录结构。

### 兼容策略

- 新表单生成 `kym-submission:v3` manifest。
- 入库脚本继续读取现有 `v2` manifest，确保已经创建但尚未处理的 Issue 不失效。
- v2 的空 `courseSlug` 仍保持原来的明确报错，不猜测课程 slug。

## 目标状态组合

| 投稿范围 | Track 模式 | 课程模式 | 入库结果 |
|---|---|---|---|
| Foundation | 不适用 | 已有 | 只创建资料包 |
| Foundation | 不适用 | 新建 | 创建课程和资料包 |
| Track 课程 | 已有 | 已有 | 只创建资料包 |
| Track 课程 | 已有 | 新建 | 创建课程和资料包 |
| Track 课程 | 新建 | 强制新建 | 创建 Track、General Resources、课程和资料包 |
| Track 非课程 | 已有 | 固定 General Resources | 只创建资料包 |
| Track 非课程 | 新建 | 固定 General Resources | 创建 Track、General Resources 和资料包 |

## 文件范围

### 投稿领域与 UI

- 修改 `src/lib/submission.ts`
- 修改 `src/lib/submission.test.ts`
- 修改 `src/components/submit/SubmitWizard.tsx`
- 修改 `src/components/submit/SubmitStepTarget.tsx`
- 修改 `src/components/submit/submit.module.css`
- 修改 `src/css/custom.css`

### 投稿入库

- 修改 `scripts/submissions/issue-to-catalog.mjs`
- 修改 `scripts/submissions/issue-to-catalog.test.mjs`

### Catalog 驱动的 Track 页面

- 修改 `src/catalog/runtime.ts`
- 修改 `src/plugins/catalogRoutes.ts`
- 修改 `src/pages/tracks.tsx`
- 修改 `src/components/TrackPageContent.tsx`
- 新建 `src/pages/catalog-track-route.tsx`
- 新建或修改对应的 route parsing 测试
- 删除被动态路由替代的 `src/pages/tracks/*.tsx` 固定 Track 页面

### 文档与生成物

- 修改 `README.md`
- 重新生成 `src/generated/catalog.json`（仅当实现造成 Catalog 生成结果变化）

不引入新的 npm 依赖。

---

## Task 1：锁定目标状态模型和验证规则

**文件：**

- 修改 `src/lib/submission.ts`
- 修改 `src/lib/submission.test.ts`

- [ ] 为 Track 选择新增类型：
  - `TrackTargetMode = "existing" | "new"`
  - `CourseTargetMode = "existing" | "new"`
- [ ] 用显式模式替代 `useNewCourse: boolean`，并为目标步骤增加：
  - `existingTrackSlug`
  - `newTrackLabel`
  - `newTrackSlug`
  - `existingCourseSlug`
  - `newCourseTitle`
  - `newCourseSlug`
- [ ] 提取统一的 `isCatalogSlug` 校验函数，前端验证与入库测试使用同一规则或完全一致的规则。
- [ ] 先为以下状态编写失败测试：
  - 新 Track 缺少名称时不可继续。
  - 新 Track slug 为空或格式错误时不可继续。
  - 新 Track + Track 课程必须同时提供新课程名称和 slug。
  - 新 Track + Track General 不要求填写课程。
  - 已有 Track + 新课程必须提供课程名称和 slug。
  - Foundation 新课程必须提供课程名称和 slug。
  - 已有目标仍沿用现有完成条件。
- [ ] 实现最小状态验证代码并运行：

```bash
npm run test -- src/lib/submission.test.ts
```

- [ ] 确保 `parseSubmissionPrefill` 仍只接受 Catalog 中已存在的目标；预填链接不会隐式进入“新建”模式。

## Task 2：修复表单控件错位并重做目标选择 UI

**文件：**

- 修改 `src/css/custom.css`
- 修改 `src/components/submit/SubmitStepTarget.tsx`
- 修改 `src/components/submit/submit.module.css`

- [ ] 将全局表单宽度规则限定到文本类控件，或显式覆盖：
  - `input[type="checkbox"]`
  - `input[type="radio"]`
  - 两者使用 `width: auto`、`padding: 0`、合理的 `flex: 0 0 auto`
- [ ] 添加可复用的目标模式选择样式：
  - `modeGroup`
  - `modeOption`
  - `modeOptionActive`
  - `inlineControl`
  - `fieldHint`
  - `fieldError`
- [ ] 把“新增课程” checkbox 改为“已有课程 / 新建课程”radio 组。
- [ ] 对方向投稿增加“已有方向 / 新建方向”radio 组。
- [ ] 仅渲染当前模式需要的字段：
  - 已有方向显示 Track select。
  - 新方向显示 Track 名称和 slug。
  - 已有课程显示课程 select。
  - 新课程显示课程名称和 slug。
- [ ] 新 Track + Track 课程时，课程模式固定为新建，并显示简短说明，不再显示无意义的“已有课程”选项。
- [ ] Track General 显示最终发布位置：
  - 已有方向：`<Track 名称> / General Resources`
  - 新方向：`<新 Track 名称> / General Resources`
- [ ] 每个 radio 的可点击区域包含控件、标题与说明；使用 `fieldset` 和 `legend` 提供正确的可访问语义。
- [ ] 验证匿名发布 checkbox 也因全局修复恢复正常宽度。

## Task 3：让向导状态切换和预览保持一致

**文件：**

- 修改 `src/components/submit/SubmitWizard.tsx`
- 修改 `src/lib/submission.ts`
- 修改 `src/lib/submission.test.ts`

- [ ] 用 `trackTargetMode`、`courseTargetMode` 替换 `useNewCourse`。
- [ ] 所有已有 Track 和课程选项改为读取 `src/catalog/runtime.ts` 导出的 Catalog 数据，不再从 `src/data/site.ts`、`src/data/courses.ts` 读取。
- [ ] 定义模式切换时的重置规则：
  - 切换投稿范围时重置不适用的 Track / 课程新建字段。
  - 切换 Track 时选择该 Track 第一门非 General Resources 课程。
  - 切换到新 Track 时清空已有课程，并在 Track 课程范围内强制新课程模式。
  - 从新 Track 切回已有 Track 时恢复该 Track 的首个可选课程。
  - 用户已经输入的新名称和 slug 不应被无关的详情步骤前后切换清空。
- [ ] `getResolvedCourseTitle` 和目标预览使用当前模式解析名称。
- [ ] Issue 标题在新 Track 模式下使用新 Track 显示名称，而不是“未选择方向”。
- [ ] Next 按钮严格使用 Task 1 的组合验证规则。
- [ ] 为模式切换涉及的纯函数补测试，避免逻辑全部隐藏在 React 组件内部。

## Task 4：定义并生成 v3 投稿 manifest

**文件：**

- 修改 `src/lib/submission.ts`
- 修改 `src/lib/submission.test.ts`

- [ ] v3 manifest 使用结构化目标，避免用空 slug 隐式表达“新建”：

```json
{
  "version": 3,
  "scope": "track-course",
  "track": {
    "mode": "new",
    "slug": "electronic-information",
    "label": "电子信息"
  },
  "course": {
    "mode": "new",
    "slug": "digital-signal-processing",
    "title": "数字信号处理"
  }
}
```

- [ ] Foundation 的 `track` 固定为 `null`。
- [ ] Track General 的 `course` 使用明确的 `{ "mode": "existing", "slug": "general-resources", "title": "General Resources" }`。
- [ ] Issue 人类可读区域明确标注：
  - `方向：电子信息（新建：electronic-information）`
  - `课程：数字信号处理（新建：digital-signal-processing）`
- [ ] 预览页在用户跳转 GitHub 前显示“本投稿将同时申请创建新方向/新课程”。
- [ ] 测试 v3 JSON、Issue 标题、人类可读内容和 URL 编码结果。

## Task 5：让投稿入库原子化创建 Track、课程和资料包

**文件：**

- 修改 `scripts/submissions/issue-to-catalog.mjs`
- 修改 `scripts/submissions/issue-to-catalog.test.mjs`

- [ ] 把当前“解析 manifest → 直接创建 package”拆成可测试的纯步骤：
  1. 解析 v2/v3 manifest。
  2. 读取当前 Catalog。
  3. 验证目标和冲突。
  4. 计算要新增的 Track、课程和资料包。
  5. 统一写入文件。
- [ ] 新增一个返回变更集的函数，例如：

```ts
{
  tracks: [...],
  courses: [...],
  materialPackage: {...}
}
```

- [ ] 新 Track 记录由脚本生成：
  - `slug`、`label` 来自已验证的 manifest。
  - `description` 使用 `<label>方向课程资料`。
  - `aliases` 初始为空。
  - `order` 为当前最大值加一。
- [ ] 新 Track 自动生成 `general-resources` 课程：
  - `section: "track"`
  - `trackSlug: <new track slug>`
  - `isGeneralResources: true`
  - 标题为 `General Resources`
- [ ] 新课程记录由脚本生成：
  - 正确的 `section` 和可选 `trackSlug`
  - `isGeneralResources: false`
  - `order` 为对应范围或 Track 内最大值加一
- [ ] 资料包 placement 必须引用最终已存在或本次新建的课程。
- [ ] 写文件前完成所有验证，任何错误都不得留下只写了一半的 Catalog。
- [ ] 写入：
  - `content/catalog/tracks.json`（仅有新 Track 时）
  - `content/catalog/courses.json`（有新课程或新 General Resources 时）
  - `content/packages/.../<submission-id>.json`
- [ ] 保持当前 workflow 的执行顺序：
  - `issue-to-catalog`
  - `catalog:generate`
  - `catalog:check`
- [ ] 为以下场景添加临时目录集成测试：
  - 已有 Track + 已有课程。
  - 已有 Track + 新课程。
  - 新 Track + Track General。
  - 新 Track + 新课程。
  - Foundation 新课程。
  - Track slug 冲突。
  - 课程 slug 冲突。
  - 非法 slug。
  - v2 已有课程投稿保持兼容。
  - 任一校验失败时 Catalog 文件内容不变。

## Task 6：使新 Track 自动获得目录入口和路由

**文件：**

- 修改 `src/catalog/runtime.ts`
- 修改 `src/plugins/catalogRoutes.ts`
- 修改 `src/pages/tracks.tsx`
- 修改 `src/components/TrackPageContent.tsx`
- 新建 `src/pages/catalog-track-route.tsx`
- 修改或新建 route parsing 测试
- 删除 `src/pages/tracks/astronomy.tsx`
- 删除 `src/pages/tracks/biochem.tsx`
- 删除 `src/pages/tracks/cs.tsx`
- 删除 `src/pages/tracks/math.tsx`
- 删除 `src/pages/tracks/other.tsx`
- 删除 `src/pages/tracks/physics.tsx`

- [ ] 在 runtime Catalog API 中增加 `getTrack(trackSlug)`。
- [ ] `src/pages/tracks.tsx` 从 `runtimeCatalog.tracks` 渲染方向卡片，使用 Catalog 中的描述与顺序。
- [ ] Catalog 路由插件为每个 Track 生成 `/tracks/<track-slug>/`。
- [ ] 动态 Track 页面从当前 pathname 解析 slug，读取 Track label，并复用 `TrackPageContent`。
- [ ] 未知 Track 显示“未找到方向”及返回 `/tracks` 的入口。
- [ ] 删除六个固定 Track 页面，避免动态路由与 Docusaurus 文件路由冲突。
- [ ] 测试：
  - 已知 Track 路径可解析。
  - 带 baseUrl 的 GitHub Pages 路径可解析。
  - 未知 Track 不会误匹配。
  - 新 Track 的课程列表包含自动建立的 General Resources。

## Task 7：端到端验证和文档更新

**文件：**

- 修改 `README.md`
- 按需要更新生成物

- [ ] 在 README 的投稿说明中补充：
  - 何时选择新建方向。
  - Track / 课程 slug 格式。
  - 新建目录需经维护者审核，并会与资料一起进入投稿 PR。
- [ ] 执行完整自动验证：

```bash
npm run test
npm run typecheck
npm run catalog:generate
npm run catalog:check
npm run build
```

- [ ] 启动本地站点并进行浏览器验收：

```bash
npm run start
```

- [ ] 桌面宽度验收：
  - radio/checkbox 与文字基线对齐。
  - “已有 / 新建”选项的点击范围正确。
  - 新建字段只在对应模式出现。
  - Next 启用条件与错误提示一致。
- [ ] 移动端宽度验收：
  - 选择卡纵向排列，不溢出。
  - slug 输入框和提示不遮挡。
  - Back / Next 按钮保持可操作。
- [ ] 浅色和深色主题都检查 radio、边框、错误提示和 disabled 状态。
- [ ] 手工走通六种目标组合，并检查预览 Issue 中的 v3 manifest。
- [ ] 使用临时 fixture 模拟一次“新 Track + 新课程”入库，确认生成：
  - Track Catalog 记录。
  - General Resources 课程记录。
  - 新课程记录。
  - 正确目录下的资料包。
  - 动态 Track 页面和两条课程路由。

## 完成标准

- “新增课程”不再出现勾选框与文字错位。
- 已有/新增方向和已有/新增课程的选择关系清晰，不会显示互相矛盾的控件。
- 新课程投稿不再因空 `courseSlug` 在入库阶段失败。
- 投稿者可以申请新 Track，并能在同一投稿中提交其 General Resources 或首门课程资料。
- 投稿 PR 包含所有必要的 Catalog 记录和资料包，不需要维护者先手工创建目录。
- 新 Track 合并后自动出现在 Tracks 首页，并拥有可访问的 Track 和课程页面。
- 旧 v2 投稿仍可处理，现有投稿、检索、构建和部署测试全部通过。
