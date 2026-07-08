# KYM Commons

`KYM Commons` 是面向匡院学习共同体的资料站，重点服务两类需求：

- 找资料：按课程、方向和分类快速定位资料
- 投资料：通过统一投稿流程补充新资料，由维护者审核后发布

如果你只是想使用网站，而不是参与开发，优先阅读下面的“找资料”“投稿”“仓库内资料位置”三部分。

## 怎么找资料

站内资料主要分成两大入口：

- `Foundation`：前三学期基础课程
- `Tracks`：宽口径方向课程，以及每个方向下的 `General Resources`

推荐按下面顺序使用：

1. 如果你已经知道课程名：
   进入对应的 `Foundation` 或 `Tracks` 页面，点进课程资料页查看。
2. 如果你只记得关键词：
   打开 `Browse / 资料检索` 页面，输入课程名、资料标题、学期或关键词。
3. 如果你想顺着同一门课继续找：
   在检索结果中查看“所在位置”，点击即可回到对应课程页。

`Browse / 资料检索` 当前支持：

- 关键词搜索
- 按“基础课程 / 方向课程”筛选
- 按分类筛选
- 按学期筛选
- 点击“搜索”按钮提交
- 在输入框中按 `Enter` 提交

课程页中的资料会按类别分组展示，例如：

- `课程讲义`
- `作业答案`
- `随堂测验`
- `期中试卷`
- `期末试卷`
- `参考资料`

如果某个分类下资料很多，页面默认只展示前几条，其余内容可以展开查看。

## 投稿怎么用

站内资料默认通过 `Submit` 页面投稿，流程是：

1. 选择投稿类型
2. 选择资料归属位置
3. 填写资料标题、简介等信息
4. 预览生成内容
5. 跳转到 GitHub Issue 完成提交

投稿时有两种文件来源方式：

- `GitHub Issue 附件`：推荐。先生成 Issue，再把本地文件直接拖进 Issue 附件区上传
- `外部链接`：仅在资料已经稳定托管在其他平台时使用

归属位置支持三类情况：

- 基础课程资料
- 方向课程资料
- 方向下不属于具体课程的资料：统一放到该方向的 `General Resources`

如果你不确定资料该挂到哪门课：

- 优先选择最接近的具体课程
- 如果明显不属于单一课程，再选择对应方向下的 `General Resources`

## 仓库内资料位置

如果网站页面偶尔显示异常，或者你怀疑某份资料“文件已经在仓库里，但网页没显示”，可以直接去仓库里看实际文件路径。

资料文件实际存放在：

- `static/files/foundation/...`
- `static/files/tracks/...`

具体规则如下：

- 基础课程资料：
  `static/files/foundation/{课程 slug}/{分类目录}/`
- 方向课程资料：
  `static/files/tracks/{方向 slug}/{课程 slug}/{分类目录}/`

常见分类目录包括：

- `materials`
- `course-slides`
- `assignment-solutions`
- `quizzes`
- `midterms`
- `finals`
- `review`
- `topic-notes`

例如：

- `static/files/foundation/linear-algebra/materials/`
- `static/files/tracks/cs/big-data/materials/`
- `static/files/tracks/cs/operating-systems-jyy/finals/`

## 如果网页和仓库不一致

站点展示不是直接扫描文件夹，而是依赖元数据文件生成页面。

也就是说：

- 文件在仓库里，不代表网页一定会显示
- 网页没显示，常见原因是元数据缺失或分类挂错

如果你遇到这种情况，建议按下面顺序检查：

1. 先去 `static/files/...` 确认文件是否真实存在
2. 再用网站的 `Browse / 资料检索` 搜一下标题关键词
3. 如果仓库里有文件、网页里没有，大概率是元数据问题，可以直接投稿反馈或提 Issue

站点元数据主要维护在：

- `src/data/materials.ts`
- `src/data/courses.ts`

## 站点内容结构

当前内容组织方式为：

- 一级分为 `Foundation` 与 `Tracks`
- `Tracks` 下按方向继续划分：数学、生化、计算机、物理、天文、其他
- 每个方向下按课程组织资料
- 每个方向保留一个 `General Resources` 入口容纳非课程资料

## 维护信息

如果你是仓库维护者，开发相关信息保留在这里：

### 技术栈

- `Docusaurus 3`
- `React 19`
- `TypeScript`
- `Vitest`
- `GitHub Actions`

### 本地开发

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

### 目录结构

```text
.
├─ docs/                  # 站点文档页与维护文档
├─ scripts/               # Issue 同步与内容生成脚本
├─ src/
│  ├─ components/         # UI 组件
│  ├─ css/                # 全局样式与主题 token
│  ├─ data/               # 站点静态数据与课程/资料元数据
│  ├─ lib/                # 业务 helper 与测试
│  └─ pages/              # Docusaurus 页面
├─ static/files/          # 实际资料文件
├─ .github/
│  ├─ ISSUE_TEMPLATE/     # 投稿模板
│  └─ workflows/          # 构建、校验、同步流程
└─ docusaurus.config.ts   # 站点配置
```
