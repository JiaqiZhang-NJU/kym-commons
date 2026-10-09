# 运维与迁移

本页说明服务器部署、完整备份和换服务器恢复的方法。命令中的域名示例需要替换为实际域名；这里不表示域名或 HTTPS 已配置完成。

## 目录与配置

生产部署使用以下目录：

| 路径 | 用途 |
| --- | --- |
| `/opt/kym-commons/source` | 从 GitHub 获取的源码与依赖 |
| `/var/lib/kym-commons` | SQLite 数据库、哈希文件和审核队列 |
| `/opt/kym-commons/releases` | 每次完整构建的发布版本 |
| `/opt/kym-commons/current` | 指向当前发布版本的符号链接 |
| `/var/backups/kym-commons` | 私有完整备份包 |
| `/etc/kym-commons/environment` | 服务环境配置 |
| `/etc/kym-commons/admin-password` | 管理员密码文件 |

Nginx 读取 `current/site` 中的页面和 `current/files` 中的已发布资料，将 API 请求转发到本机服务。数据库、未发布投稿、密码和备份目录不对外提供下载。

建议把资料数据目录和发布目录放在同一文件系统，例如 `/var/lib/kym-commons` 与 `/opt/kym-commons/releases` 所在挂载卷相同。此时各 release 的 `files` 通过硬链接共享不可变文件，只增加目录和页面的空间。不同卷时程序仅在 `EXDEV` 错误下回退为校验后的只读复制，不创建文件符号链接；每个完整 release 会额外占用一份资料体积，当前基线约 **4.29 GB**。保留两份跨卷 release 约需额外 **8.58 GB**，还须另外预留数据库、上传、构建和备份临时空间。部署前可用 `df -h /var/lib/kym-commons /opt/kym-commons/releases` 检查挂载与剩余容量，并按卷计算保留版本数。

环境配置参考源码中的 `.env.example`：

| 配置 | 生产用途 |
| --- | --- |
| `KYM_DATA_DIR` | `/var/lib/kym-commons` |
| `KYM_SOURCE_DIR` | `/opt/kym-commons/source` |
| `KYM_RELEASES_DIR` | `/opt/kym-commons/releases` |
| `KYM_CURRENT_LINK` | `/opt/kym-commons/current` |
| `KYM_SITE_URL` | 实际来源，如 `https://your-domain.example` |
| `KYM_BASE_URL` | 独立域名一般为 `/`，路径部署时需带首尾斜线 |
| `KYM_ADMIN_PASSWORD_FILE` | `/etc/kym-commons/admin-password` |
| `KYM_SOURCE_COMMIT` | 正在部署的源码 commit |

服务只监听本机地址，通过 Nginx 对外提供入口。域名、路径前缀、API 来源检查和 Cookie 配置必须一致。更换域名或前缀后重新构建网站，并同步修改服务及 Nginx 配置。

使用 Node.js **24.21.0**，通过 `npm ci` 安装锁定依赖。Linux 还需要 `tar`、Nginx 和 systemd。

## 投稿与审核

访客在 `/submit` 上传资料；管理员在 `/admin` 使用密码登录。密码只放在服务器受限文件中，不写入源码、文档或 GitHub Actions 输出。

管理员下载附件检查后，可以通过或退回投稿：

| 状态 | 含义 |
| --- | --- |
| 上传未完成 | 文件尚未全部接收，不能审核 |
| 待审核 | 文件已经接收，等待维护者检查 |
| 审核通过，等待发布 | 已产生新的目录版本，尚未完成网站构建 |
| 正在发布 | 系统正在构建完整发布版本 |
| 已发布 | 新版本已切换为当前网站 |
| 已退回 | 记录和退回原因保留 |
| 发布失败 | 当前网站仍可使用，修复后点击“重试发布” |

审核通过后的发布任务依次执行。构建与文件视图准备完成后，系统才切换 `current`，不会将构建了一半的目录公开。失败原因可在管理页、发布目录的 `build.log` 和服务日志中查看。

## 日常检查

从本机连接当前服务器：

```bash
ssh jd-personal
```

在服务器检查服务和发布位置：

```bash
sudo systemctl status kym-commons --no-pager
sudo journalctl -u kym-commons -n 100 --no-pager
readlink -f /opt/kym-commons/current
sudo nginx -t
```

检查首页、课程页、检索、资料下载、投稿和管理登录。网页能打开只说明静态入口可用，不能代替投稿审核流程检查。

更新源码前先导出并校验备份，记录旧源码 commit 和当前 release。更新后使用正确的数据目录生成构建输入，再执行测试、类型检查和构建。正式切换后保留旧 release，确认新入口可用后再清理过期构建产物。

首次部署、源码升级或恢复后，使用发布工具生成完整 release 并切换当前入口。在已配置服务账户权限的源码目录运行：

```bash
cd /opt/kym-commons/source
node --env-file=/etc/kym-commons/environment scripts/deploy/release.mjs --data-dir /var/lib/kym-commons --releases-dir /opt/kym-commons/releases --current-link /opt/kym-commons/current --site-url https://your-domain.example --source-dir /opt/kym-commons/source
```

命令默认构建数据库中当前已发布的资料版本，可通过 `--revision` 选择具体版本。输出包含 release 记录，发布目录中保留 `release.json`。域名未接入时使用实际临时 HTTP 入口，正式域名和 HTTPS 配置完成后按新来源重新构建。

管理员密码由服务器终端配置或更换，权限只允许维护者和服务读取。更换后重启 `kym-commons`，使新的配置生效。恢复到新服务器时使用新密码。

可用 `scripts/deploy/admin-password.mjs` 生成 scrypt 密码文件。交互输入时避免把密码放在命令行历史中：

```bash
read -r -s -p '管理员密码（至少 12 字符）: ' admin_password; printf '\n'
printf '%s' "$admin_password" | node scripts/deploy/admin-password.mjs --output /tmp/kym-admin-password.hash
unset admin_password
sudo install -o kym-commons -g www-data -m 600 /tmp/kym-admin-password.hash /etc/kym-commons/admin-password
sudo rm /tmp/kym-admin-password.hash
sudo systemctl restart kym-commons
```

源码更新脚本会从 GitHub 取得指定完整 commit，在独立目录安装依赖，停止写入服务后构建、验证并切换 release，再启动服务。构建失败时旧站点继续提供阅读，旧源码目录保留。升级前先生成完整备份：

```bash
sudo bash /opt/kym-commons/source/scripts/deploy/backup.sh
sudo bash /opt/kym-commons/source/scripts/deploy/update.sh <40位源码commit>
```

脚本和 systemd 模板位于 `scripts/deploy/`。每日备份 timer 为 `kym-commons-backup.timer`，成功导出并全量校验后保留最近两份，每份附有 SHA-256 文件；失败不会删除上一份已验证备份。首次安装后用 `systemctl list-timers kym-commons-backup.timer` 检查计划，并用 `journalctl -u kym-commons-backup.service` 检查失败原因。备份应另存到个人电脑；服务器本地两份不能替代服务器外副本。

## 导出完整备份

在源码目录运行：

```bash
cd /opt/kym-commons/source
node --env-file=/etc/kym-commons/environment scripts/data/backup.mjs export --data-dir /var/lib/kym-commons --output /var/backups/kym-commons/kym-complete-20261009.tar.gz
node scripts/data/backup.mjs verify --archive /var/backups/kym-commons/kym-complete-20261009.tar.gz
```

文件名每次换成新的日期或时间。导出工具拒绝覆盖已有备份文件。

导出使用一致的 SQLite 快照，再收集快照引用的不可变哈希文件。当前未启用自动清理哈希文件，可以在服务运行时导出，不需要为普通备份暂停投稿。不要同时手工删除数据目录中的文件。

完整包包含：

- SQLite 快照与对应逻辑状态。
- 已保存的资料文件，包括待审投稿已经上传的附件。
- 历史资料版本、投稿队列、审核结果和发布状态。
- 文件哈希、数量、大小校验清单。
- 源码 commit、运行时版本、公开配置和恢复说明。

管理员密码、HTTPS 证书、SSH 密钥和服务器账户权限需要在新环境单独配置。构建产物可以重新生成，无需靠旧 release 恢复。

导出和校验会使用临时目录。资料压缩后不一定明显变小，应为完整包和临时文件留出空间。完整包包含未公开投稿，只能存放在私有位置；文件权限应为 `0600`。

建议每日保存备份，源码升级、数据整理和服务器迁移前另做一次。至少保留最近一份已校验且实际恢复过的备份，并在原服务器外保存副本。只有导出成功还不够，必须运行 `verify` 并定期恢复演练。

下载到个人电脑时，先在服务器准备仅 SSH 用户可读取的私有副本。下面的 `ops` 应替换为自己的 SSH 用户，文件名应替换为实际已验证的备份：

```bash
sudo install -d -o ops -g ops -m 700 /home/ops/kym-private-backups
sudo install -o ops -g ops -m 600 /var/backups/kym-commons/kym-20261009T000000Z.tar.gz /home/ops/kym-private-backups/
sudo install -o ops -g ops -m 600 /var/backups/kym-commons/kym-20261009T000000Z.tar.gz.sha256 /home/ops/kym-private-backups/
```

在个人电脑的私有目录中运行，不要下载到公开网站或提交进 Git：

```powershell
scp jd-personal:/home/ops/kym-private-backups/kym-20261009T000000Z.tar.gz .
scp jd-personal:/home/ops/kym-private-backups/kym-20261009T000000Z.tar.gz.sha256 .
Get-FileHash ./kym-20261009T000000Z.tar.gz -Algorithm SHA256
```

将输出的哈希与 `.sha256` 文件开头的 64 位哈希核对，再用 `backup.mjs verify` 检查包内数据。下载完成后可删除服务器上的临时私有副本；自动备份仍保留在 `/var/backups/kym-commons`。

## 在新服务器恢复

迁移前保存完整备份和 `manifest.json` 中对应的源码 commit。源码应已提交到 GitHub，不能只存在旧服务器的未提交修改中。

新服务器按以下顺序处理：

1. 获取对应源码版本，安装 Node.js 24.21.0 和系统依赖。
2. 在源码目录运行 `npm ci`。
3. 校验完整包，恢复到一个**尚不存在的新目录**。
4. 配置数据路径、域名、发布目录和新的管理员密码。
5. 从恢复数据生成目录，执行测试和类型检查，构建首个完整 release。
6. 配置 Nginx 与 systemd，验证后再切换正式入口。

恢复数据的命令：

```bash
cd /opt/kym-commons/source
node scripts/data/backup.mjs verify --archive /path/to/kym-complete.tar.gz
node scripts/data/backup.mjs restore --archive /path/to/kym-complete.tar.gz --data-dir /var/lib/kym-commons-restored
export KYM_DATA_DIR=/var/lib/kym-commons-restored
npm run catalog:generate
npm test
npm run typecheck
```

然后在服务配置中填入恢复目录和实际来源，执行完整发布：

```bash
node --env-file=/etc/kym-commons/environment scripts/deploy/release.mjs --data-dir /var/lib/kym-commons-restored --releases-dir /opt/kym-commons/releases --current-link /opt/kym-commons/current --site-url https://your-domain.example --source-dir /opt/kym-commons/source
```

确认 Nginx 的页面根目录为 `current/site`、资料目录为 `current/files`，且 API 指向本机服务，再启动或重启 `kym-commons`。在正式入口切换前完成下述验收。

`/var/lib/kym-commons-restored` 必须尚不存在。不要直接覆盖原数据目录；恢复完成并校验后，将新服务配置指向恢复目录，保留原目录以便回退。

数据库中的已发布版本可以重新构建；待审投稿和已审核任务会保留。未完整上传的投稿仍是“上传未完成”，需要补充上传或重新投稿。管理员会话不属于长期数据，新服务器重新登录。

完整备份只保证包内文件可独立恢复。外部 HTTPS 链接以及未成功镜像的历史外链仍依赖第三方平台，应单独核对并列出缺口。

迁移验收至少覆盖资料数量和哈希、课程与检索结果、附件下载、一次投稿审核发布、发布失败重试，以及空白环境恢复。验收期间不访问旧服务器，才能确认恢复没有隐含依赖。

正式备份和源码中的 SHA 对应当前可获取的 GitHub 版本。历史清理后，普通新克隆只携带源码；GitHub 的已关闭 PR 引用、平台缓存及他人的旧克隆可能仍保存公开过的旧对象，常规分支推送不能删除这些平台保留对象。旧完整仓库另存私有归档，已有克隆须重新克隆，避免将旧资料历史重新合并进源码分支。

浏览器收藏不在服务器备份中。迁移不恢复原收藏，也不增加收藏导出、导入功能。

## 故障与回滚

发布失败时先查看错误，修复磁盘空间、依赖或配置问题，再在管理页点击“重试发布”。失败任务和已收到的投稿留在数据库中，不要通过删除数据库解决构建问题。

回滚已有网站时，先暂停服务写入，确认要恢复的源码版本、数据版本和 release 属于同一套记录。仅切换页面目录而继续使用更新后的数据库，会使网站与后台状态不一致。

必要时将已验证备份恢复到新目录，修改服务配置并重新构建对应 release。切换前保留当前数据和发布记录；检查通过后恢复服务：

```bash
sudo systemctl restart kym-commons
sudo systemctl status kym-commons --no-pager
sudo nginx -t
```

从备份回退会退回到备份时刻。先保存故障后的当前数据，核对期间接收的新投稿，再决定如何补回，避免丢失已经接收的资料。
