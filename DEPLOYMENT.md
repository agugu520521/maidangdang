# 固定部署约定与首次上线

本项目固定使用 **GitHub → Cloudflare Pages Git integration → 自动构建 → 静态 dist**。

用户已要求：后续修改 HTML、CSS、JavaScript、页面或作品内容时，禁止改变项目部署方式。维护规则见 [AGENTS.md](AGENTS.md)，机器可检查的合同见 [deployment.json](deployment.json)。这些本地文件记录约定；Cloudflare 账号连接和下面的控制台设置仍需在首次上线时完成。

## 仓库边界

Git 仓库就是当前 `Burgundy Cosmos版` 目录，仓库首页应直接看到 `package.json`、`public/`、`content/`、`scripts/`、`workshop/`。不要把父目录、极简版和参考图文件夹一起上传。

源码、上传图片、工坊、构建工具、依赖锁文件与素材授权一起保存在 GitHub。工坊源码在 GitHub 中保存，不代表进入线上网站；公开站只发布 `dist/`。仓库可以设为 Private，Cloudflare Pages 支持连接私有仓库。

`dist/`、`qa/`、`source-assets/`、本机配置与凭据已加入 Git 忽略。`content/site.json` 和 `public/media/` 必须提交，不得忽略。未被当前作品引用的本机图片可以保留，只有被引用的媒体进入构建产物。

## 固定的 Cloudflare Pages 设置

| 项目 | 固定值 |
| --- | --- |
| 产品 | Cloudflare Pages |
| 创建方式 | Pages → Connect to Git → GitHub |
| 仓库 | 首次连接当前独立项目仓库 |
| 生产分支 | `main` |
| 生产分支自动部署 | 开启 |
| 框架预设 | `None` |
| 项目根目录 | 留空，即仓库根目录 |
| 构建命令 | `npm run build` |
| 构建输出目录 | `dist` |
| Node.js | 24 主版本，由 `.node-version` 指定 |
| 初始域名 | Pages 分配的 `项目名.pages.dev` |
| 构建监视路径 | 使用默认的全部路径，不设置排除项 |

Node.js 24 的补丁版本可由同一主版本正常更新；Git 集成、构建命令、输出目录、生产分支和托管产品固定不变。不要在控制台添加与 `.node-version` 冲突的 `NODE_VERSION`。

`npm run build` 会先运行部署合同检查，再执行原有 `node scripts/build.mjs`。页面脚本、样式、作品和图集调整不需要修改这个入口。合同检查失败时应恢复误改内容；不能删掉检查、更新受保护构建脚本的校验值，或更换发布工具来绕过检查。

## 首次推送 GitHub

1. 注册或登录 GitHub，新建一个空仓库；不要额外生成 README、许可证或 `.gitignore`，项目已带这些内容。
2. 在本项目目录设置自己的 Git 提交姓名和邮箱。可使用 GitHub 设置中提供的隐私邮箱；不要填写密码或访问令牌。
3. 检查待提交文件，创建首次提交，把远程仓库设为 GitHub 仓库页面显示的真实地址，再推送 `main`。

```sh
git config user.name "你的提交显示名称"
git config user.email "你的GitHub提交邮箱"
git add .
git commit -m "Prepare portfolio for Cloudflare Pages"
git remote add origin https://github.com/你的账号/你的仓库.git
git push -u origin main
```

示例地址必须换成自己的真实仓库。通过浏览器或 GitHub 官方提供的认证流程登录，不把密码写进命令或仓库文件。

本地尚未配置提交身份时，前置准备只初始化 `main` 和整理待提交文件，不伪造作者或创建空身份提交。首次推送之前仍需有真实的 GitHub 仓库与账号授权。

## 首次连接 Cloudflare Pages

1. 注册或登录 Cloudflare，在 Workers & Pages 中创建应用，选择 **Pages**，再选择 **Connect to Git**。
2. 连接 GitHub，授权目标仓库，选择已经推送的 `main`。
3. 按上表填写固定设置，保存并部署。
4. 构建成功后打开平台返回的 `*.pages.dev` 地址，检查首页、分类、详情与 B站视频；公开站不应出现工坊入口。
5. 保存首次 Pages 项目名称、仓库地址和公网地址；后续复用同一项目，不另建其他托管方式。

## 后续更新

```text
工坊修改并保存 / 修改 HTML、CSS、JavaScript
→ 本地检查和构建
→ git add、git commit、git push 到 main
→ 原 Cloudflare Pages 项目自动构建
→ 同一个 pages.dev 地址更新
```

只有推送成功后才触发远程流程。本地编辑、保存或提交本身不会发布。不要用 `[skip ci]`、`[cf-pages-skip]` 等跳过构建的提交前缀，也不要关闭生产分支自动部署。

本地验证：`npm run check:deployment`、`npm run check`、`npm test`、`npm run build`。无需安装第三方运行时依赖。不要手工上传 `dist`、配置 Workers 或增加第二套发布工作流。

## 官方依据

- [Cloudflare Pages Git 集成与首次部署](https://developers.cloudflare.com/pages/get-started/git-integration/)
- [GitHub 集成与自动部署](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/)
- [构建命令、根目录与输出目录](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Node.js 版本文件](https://developers.cloudflare.com/pages/configuration/build-image/)
