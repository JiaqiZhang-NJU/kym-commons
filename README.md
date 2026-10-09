# KYM Commons

服务器迁移包含 Git 历史清理。已有克隆请先保存本地修改，再重新克隆源码仓库，避免把旧资料历史重新合并回来。迁移前的完整 Git 归档和资料备份另行保留；日常源码克隆不携带业务数据库或真实资料。

KYM Commons 是面向匡院学习共同体的资料站。访客可以按课程、方向和分类查找资料，也可以在网站上传资料，由维护者审核发布。

GitHub 仓库保存源码、测试和部署配置。正式资料的目录、元数据和审核状态保存在服务器 SQLite 数据库中，文件保存在独立数据目录中。数据库和文件一起导出为完整备份包，换服务器时使用备份包与对应源码版本恢复。

## 找资料

- `Foundation`：前三学期基础课程。
- `Tracks`：各方向的课程资料，以及容纳非课程资料的 `General Resources`。
- `Browse / 资料检索`：按关键词、分类和学期筛选。检索结果中的“所在位置”可以返回课程页。

课程页按资料类别分组，较长的分类可以展开查看。收藏仍保存在当前浏览器；迁移不恢复原站收藏，也不提供收藏导出、导入功能。

## 投稿

在 `Submit` 页面按步骤操作：

1. 选择基础课程、方向课程或方向通用资料。
2. 选择已有归属，或填写新方向、新课程的名称与 slug。
3. 填写标题、类型、时间和简介，选择本地文件或 HTTPS 外部链接。
4. 检查预览，确认资料已脱敏且有权分享，再提交审核。

可以一次选择多个文件，具体数量和大小限制会显示在页面中。上传失败时，已填写内容和文件选择会保留，可以重试。提交成功后保存投稿编号，便于向维护者询问进度。

新方向会同时创建 `General Resources`；向新方向投稿课程资料时，需要填写首门课程。slug 使用小写英文、数字和连字符，例如 `electronic-information`。目录和资料一起审核，发布完成后才会出现在网站中。

管理员在 `/admin` 登录，下载附件检查后审核通过或退回。“审核通过，等待发布”“正在发布”和“已发布”是不同状态；发布失败可以重试。上传到网站的投稿不需要创建 GitHub Issue 或资料 PR。

分享资料前请阅读 [投稿规则](docs/rules.md)。网站介绍见 [关于本站](docs/about.md)。

## 源码与数据

源码仓库不包含生产数据库、资料文件、投稿队列、管理员密码或完整备份包。生成的目录数据和构建产物也不提交到 Git。

外部数据目录主要包含：

- `catalog.sqlite`：资料目录、版本、投稿和审核状态。
- `blobs/`：按内容哈希保存的资料文件。
- `build-views/`：从已发布数据版本生成的文件视图，可以重新生成。

网页展示依赖数据库中的目录记录。遇到资料缺失或分类错误，请向维护者提供标题、课程位置或投稿编号；直接向源码仓库放文件不会使资料出现在网站上。

只有已存入服务器的文件包含在完整备份中。HTTPS 外部链接仍依赖第三方服务；需要长期独立保存的资料应上传文件副本。未成功镜像的旧外链不能计入“已保存文件”。

## 本地开发

使用 **Node.js 24.21.0** 和仓库锁文件安装依赖：

```powershell
npm ci
```

构建和测试需要先从外部数据生成目录。下面使用新目录生成少量人工测试资料，不包含正式站点资料：

```powershell
$env:KYM_DATA_DIR = Join-Path $env:TEMP ("kym-commons-dev-" + [guid]::NewGuid().ToString("N"))
npm run data:fixture -- --data-dir $env:KYM_DATA_DIR
npm run catalog:generate
npm test
npm run typecheck
npm run build
npm run start
```

如果已有完整备份，先恢复到一个**尚不存在的新目录**，再设置 `KYM_DATA_DIR` 并运行 `npm run catalog:generate`。测试和类型检查前应先生成目录；`build` 和 `start` 的前置脚本也会读取外部数据。

`npm run start` 提供网页开发服务器。原生投稿和后台审核还需要同源的 API 服务与反向代理；只启动 Docusaurus 时不能完成投稿。服务配置参考 [.env.example](.env.example) 和 [运维与迁移说明](maintenance/operations.md)。

`KYM_SITE_URL` 指定站点来源，如 `https://your-domain.example`；`KYM_BASE_URL` 指定路径前缀，独立域名通常使用 `/`。更换域名后按新配置重新构建，并同步 API 与 Nginx 配置。

## 完整备份与恢复

```bash
node scripts/data/backup.mjs export --data-dir /path/to/data --output /path/to/backup.tar.gz
node scripts/data/backup.mjs verify --archive /path/to/backup.tar.gz
node scripts/data/backup.mjs restore --archive /path/to/backup.tar.gz --data-dir /path/to/new-data
```

备份包含数据库快照、已存储的文件、历史数据版本、待审投稿、审核状态、校验清单和源码版本信息。恢复目标必须尚不存在，工具不会覆盖正在使用的数据目录。备份属于私有数据，应放在仓库外并限制访问。

恢复时使用备份 `manifest.json` 中对应的源码 commit 和支持的 Node.js 24 环境，不依赖旧服务器。管理员密码不在数据备份中，需要在新服务器重新配置。具体部署、备份保留、恢复演练与回滚操作见 [运维与迁移说明](maintenance/operations.md)；切换前按 [迁移验收清单](maintenance/migration-checklist.md) 核对。这些维护文档仅在源码仓库提供，不发布到站点。

## 项目结构

```text
docs/                  站点说明与投稿规则
maintenance/           仓库中的运维、备份与迁移文档，不发布到站点
src/components/        阅读、检索、投稿等界面
src/pages/             网站页面与管理入口
src/lib/               前端业务函数和测试
src/generated/         从外部数据库生成的构建输入，不提交
server/                投稿 API、SQLite 存储与发布任务
scripts/data/          数据导入、构建准备、完整备份和恢复
scripts/catalog/       目录校验与整理工具
static/img/            网站界面图片，不含资料附件
.github/workflows/     源码检查流程
```

技术栈为 Docusaurus、React、TypeScript、Node.js 内置 SQLite 和 Vitest。生产网站通过 Nginx 读取当前发布目录，投稿 API 由 systemd 管理。
