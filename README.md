# Lightframe Archive

基于 React Router、Cloudflare Workers 和 Cloudflare R2 的图床后台，包含登录保护、批量管理、拖拽上传和浏览器侧 WebP 压缩预览。

## 环境变量

当前版本不再使用 Astro/Vercel，也不再使用单独的 `SESSION_SECRET`。
会话签名直接由 `ADMIN_PASSWORD` 派生。

在 Cloudflare Workers / Wrangler 中配置以下变量或 secret：

```bash
R2_PUBLIC_URL=https://你的图片访问域名
ADMIN_PASSWORD=后台登录密码
MAX_FILE_SIZE=10485760 # 可选，默认 10MB
```

同时需要在 [wrangler.jsonc](/home/gaoning/repos/Github/astro-r2/wrangler.jsonc) 里把 `IMAGES_BUCKET` 绑定到真实的 R2 bucket，并把 `R2_PUBLIC_URL` 改成真实的公开访问域名。

## 本地开发

```bash
bun install
bun run dev
```

常用命令：

- `bun run build`：构建生产版本
- `bun run preview`：预览构建产物
- `bun run test`：运行内置测试
- `bun run check`：运行 React Router 类型生成和 TypeScript 检查
- `bun run verify`：串联测试、类型检查和构建

## 部署步骤

1. 在 Cloudflare R2 中创建存储桶。
2. 为存储桶配置公开访问域名，作为 `R2_PUBLIC_URL`。
3. 在 [wrangler.jsonc](/home/gaoning/repos/Github/astro-r2/wrangler.jsonc) 中把 `IMAGES_BUCKET` 绑定到实际 bucket。
4. 通过 Wrangler 或 Cloudflare Dashboard 配置 `ADMIN_PASSWORD` 和可选的 `MAX_FILE_SIZE`。
5. 执行 `bun run deploy`，部署完成后访问 `/login`，使用 `ADMIN_PASSWORD` 登录。

## 功能概览

- 上传页支持拖拽、文件选择和粘贴图片
- 支持随机文件名和浏览器侧 WebP 压缩预览
- 图库页支持网格/列表切换、分页、批量删除
- 未登录访问上传页或图库页会自动跳转到登录页

## 手动验收建议

1. 未登录访问 `/` 和 `/gallery`，确认都会跳到 `/login`
2. 登录后上传多张图片，确认可复制链接和 Markdown
3. 翻页浏览图库，确认上一页/下一页正常
4. 批量删除图片，确认部分失败时能看到错误提示
