# KYM Commons

`KYM Commons` 是一个面向匡院同学的资料共享站，采用 `Docusaurus + GitHub Pages + GitHub Issues + GitHub Actions` 构建。

项目当前支持：

- `Foundation` 大类培养课程资料浏览
- `Tracks` 宽口径方向课程与 `General Resources`
- `Submit` 分步式投稿向导
- GitHub Issue 预览与审核流
- 审核后自动生成资料页的脚本基础设施

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

首次 push 与公开发布前准备，见：

- [GitHub Setup](./docs/github-setup.md)
- [First Push Checklist](./docs/first-push-checklist.md)

## 公开上线约束

公开给学弟学妹访问时，**不要**直接使用默认 GitHub Pages 地址：

- `https://JiaqiZhang-NJU.github.io/kym-commons/`

公开发布必须满足：

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

下一步通常是：

1. 创建私有 GitHub 仓库
2. 添加 `origin`
3. 首次推送 `main`
4. 检查 `Actions` 与 `Pages`
5. 准备自定义域名后再公开
