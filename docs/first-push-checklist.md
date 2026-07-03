# First Push Checklist

这份清单用于 `KYM Commons` 第一次推送到 GitHub 前后的人工核对。

## 推送前

- [ ] 已在 GitHub 创建私有仓库：`JiaqiZhang-NJU/kym-commons`
- [ ] 本地 `npm install` 已完成
- [ ] `npm run test` 通过
- [ ] `npm run build` 通过
- [ ] `git status --short` 为空
- [ ] 已确认当前默认仓库配置指向 `JiaqiZhang-NJU/kym-commons`

## 首次推送

```bash
git remote add origin https://github.com/JiaqiZhang-NJU/kym-commons.git
git push -u origin main
```

推送后核对：

- [ ] `origin` 已存在并指向正确仓库
- [ ] GitHub 仓库默认分支为 `main`
- [ ] 首次提交历史完整可见

## 仓库设置

- [ ] `Actions` 已启用
- [ ] `Pages` 来源已切到 `GitHub Actions`
- [ ] 仓库仍保持私有
- [ ] Issue 与 Issue Forms 可正常使用
- [ ] `Actions` 有权限读取仓库内容并部署 Pages

## 公开前门槛

不要在以下任一项未完成时公开给学弟学妹：

- [ ] 已购买或准备好自定义域名
- [ ] 已配置目标子域名，如 `commons.example.com`
- [ ] DNS 已解析到 GitHub Pages
- [ ] `CNAME` 策略已明确
- [ ] HTTPS 已启用
- [ ] 最终公开网址不含 `JiaqiZhang-NJU`

## 推荐公开流程

1. 先私有仓库内完成内容和页面打磨
2. 完成自定义域名与 DNS 配置
3. 在 GitHub Pages 中验证新域名可访问
4. 再将仓库转为公开
5. 最后对外发布正式链接
