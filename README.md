# KYM Commons

KYM Commons 是面向匡院学习共同体的资料站，帮助大家查找课程资料、分享学习经验。

访问：[kymcommons.jqzhang.top](https://kymcommons.jqzhang.top/)。

## 找资料

- `Foundation`：前三学期基础课程。
- `Tracks`：各方向的课程资料，以及容纳非课程资料的 `General Resources`。
- `Browse / 资料检索`：按关键词、分类和学期筛选。检索结果中的“所在位置”可以返回课程页。

课程页按资料类别分组，较长的分类可以展开查看。收藏保存在当前浏览器中。

## 投稿

在 `Submit` 页面按步骤操作：

1. 选择基础课程、方向课程或方向通用资料。
2. 选择已有归属，或填写新方向、新课程的名称与 slug。
3. 填写标题、类型、时间和简介，选择本地文件或 HTTPS 链接。
4. 检查预览，确认资料已脱敏且有权分享，再提交审核。

可以一次选择多个文件，数量和大小限制以页面为准。提交成功后保存投稿编号，便于向维护者询问进度。审核通过并发布后，资料会出现在对应目录。

新方向会同时创建 `General Resources`；向新方向投稿课程资料时，需要填写首门课程。slug 使用小写英文、数字和连字符，例如 `electronic-information`。

分享资料前请阅读 [投稿规则](docs/rules.md)。网站介绍见 [关于本站](docs/about.md)。

## 本地开发

使用 **Node.js 24.21.0** 和仓库锁文件安装依赖：

```powershell
npm ci
$env:KYM_DATA_DIR = Join-Path $env:TEMP ("kym-commons-dev-" + [guid]::NewGuid().ToString("N"))
npm run data:fixture -- --data-dir $env:KYM_DATA_DIR
npm run catalog:generate
npm test
npm run typecheck
npm run build
npm run start
```

这些命令生成少量人工测试资料。正式数据独立保存，不提交到源码仓库；配置参考 [.env.example](.env.example)。测试和类型检查前应先生成目录，构建和开发服务器会自动准备目录。

`npm run start` 启动网页开发服务器。测试投稿和审核还需要启动同源 API 并配置反向代理。

## 维护者文档

部署、数据备份、恢复、换服务器和回滚操作见 [部署与数据维护](maintenance/operations.md)，上线检查见 [部署检查清单](maintenance/deployment-checklist.md)。维护文档只在源码仓库提供。

## 项目结构

```text
docs/                  网站介绍与投稿规则
maintenance/           维护者操作说明，不发布到站点
src/components/        阅读、检索、投稿等界面
src/pages/             网站页面与管理入口
src/lib/               前端业务函数和测试
src/generated/         从外部数据生成的构建输入，不提交
server/                投稿 API、数据存储与发布任务
scripts/data/          构建准备、测试数据、完整备份和恢复
scripts/catalog/       目录校验与整理工具
static/img/            网站界面图片
.github/workflows/     源码检查与部署流程
```

技术栈：Docusaurus、React、TypeScript、Node.js 内置 SQLite、Vitest。
