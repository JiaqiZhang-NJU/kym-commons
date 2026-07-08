# KYM Commons

`KYM Commons` 是一个面向匡院学习共同体的学术资料平台，用于系统整理大类培养课程、宽口径方向课程与方向共享资源，并通过统一的投稿、审核与发布流程支持长期维护。

项目当前包括以下核心部分：

- `Foundation`：前三学期大类培养课程资料浏览
- `Tracks`：宽口径方向课程与 `General Resources`
- `Submit`：分步式投稿与 GitHub Issue 预览
- `Review Flow`：基于 GitHub 的审核与追踪机制
- `Automation`：审核后生成资料内容的脚本基础设施

## 项目定位

`KYM Commons` 的目标不是简单堆放资料文件，而是提供一个结构清晰、便于检索、适合持续沉淀的课程与方向资源平台。

平台当前采用以下内容组织方式：

- 按 `Foundation` 与 `Tracks` 进行一级划分
- 宽口径方向下按课程继续组织内容
- 每个方向保留 `General Resources` 作为非课程资料入口
- 资料通过统一投稿流程进入审核与发布链路

## 技术栈

- `Docusaurus 3`
- `React 19`
- `TypeScript`
- `Vitest`
- `GitHub Actions`

## 本地开发

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run start
```

构建生产版本：

```bash
npm run build
```

运行测试：

```bash
npm run test
```

## 目录结构

```text
.
├─ docs/                  # 站点文档页与维护文档
├─ scripts/               # Issue 同步与内容生成脚本
├─ src/
│  ├─ components/         # UI 组件
│  ├─ css/                # 全局样式与主题 token
│  ├─ data/               # 站点静态数据
│  ├─ lib/                # 业务 helper 与测试
│  └─ pages/              # Docusaurus 页面
├─ .github/
│  ├─ ISSUE_TEMPLATE/     # 投稿模板
│  └─ workflows/          # 构建、校验、同步流程
└─ docusaurus.config.ts   # 站点配置
```

## GitHub 仓库

- Owner: `JiaqiZhang-NJU`
- Repo: `kym-commons`
- 策略：`先私有后公开`

项目维护与发布请直接参考下方“发布准备”清单，并结合仓库当前的 GitHub Pages、Actions 与自定义域名配置执行。

## 发布准备

正式发布前建议完成以下配置检查：

- 已配置自定义域名
- DNS 已正确解析
- HTTPS 已启用
- 对外地址不包含 GitHub 用户名

## 当前状态

当前仓库已完成：

- 分步式投稿页
- 暗色模式可读性修复
- GitHub 仓库真实 owner 配置
- GitHub 首推与上线准备文档

常见的下一步工作包括：

1. 创建私有 GitHub 仓库
2. 添加 `origin`
3. 首次推送 `main`
4. 检查 `Actions` 与 `Pages`
5. 准备自定义域名后再公开
