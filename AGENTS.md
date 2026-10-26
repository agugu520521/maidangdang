# 项目维护规则：固定 Cloudflare Pages 部署

本规则来自用户明确要求：后续 HTML、CSS、JavaScript 和页面结构可以大幅调整，项目部署方式必须保持不变。

## 固定部署合同

- 本目录自身是 Git 仓库根目录，只维护这个版本；不把父目录、其他网站版本或参考图目录作为仓库根目录。
- 代码托管使用 GitHub，生产分支固定为 `main`。
- 发布产品固定为 **Cloudflare Pages**，通过 Pages 的 **Git integration** 连接 GitHub。
- 生产分支启用自动部署：推送 `main` 后由 Pages 自动构建和发布。
- 根目录设置留空，框架选择 `None`，构建命令固定 `npm run build`，发布目录固定 `dist`。
- `npm run build` 的构建入口固定为 `node scripts/build.mjs`，运行前自动检查部署合同。
- 构建运行时主版本固定 Node.js 24，由根目录 `.node-version` 声明。
- 公开站是纯静态文件，初始公网地址采用 Cloudflare Pages 提供的 `*.pages.dev`。
- 本地工坊、保存与上传接口仅供本机使用，不得进入 `dist` 或线上站点。

## 后续工作必须遵守

- 页面更新只修改展示、内容与交互，继续输出同一个静态 `dist`；不得借页面重写之机重建或迁移部署管线。
- 不得切换到 Workers、Workers Builds、GitHub Pages、Vercel、Netlify、Direct Upload、Wrangler 手工发布或 GitHub Actions 发布。
- 不得新增线上服务器、Pages Functions、`functions/` 或 `_worker.js`，不得引入新的部署配置取代当前方式。
- 不得修改生产分支、项目根目录、构建命令、发布目录、自动部署开关、Git 集成方式或 Pages 项目身份。
- `deployment.json`、`.node-version`、`scripts/build.mjs`、`scripts/check-deployment.mjs`、`package.json` 的 `build`/`prebuild`、本文件与 DEPLOYMENT.md 中的固定合同属于保护项，不得为完成页面任务而修改或绕过。
- `public/`、`workshop/` 和 `content/site.json` 的组织结构与构建隔离规则保留。上传图片与内容数据必须随源码提交。
- 不把令牌、密码或本机路径写入公开页面。GitHub/Cloudflare 的账号授权在平台完成。

## 提交前验证

执行 `npm run check:deployment`、`npm run check`、`npm test`、`npm run build`。验证 `dist/index.html` 存在，引用资源完整，`dist` 不含工坊或接口。部署合同检查失败时应恢复误改内容，不得删除检查、更新受保护文件的校验值或改用其他部署方法。

## 当前暂停的任务

首屏星球与玫瑰视觉优化按用户要求暂停；部署准备不包含这项视觉修改。
