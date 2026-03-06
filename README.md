# Lightframe Archive

基于 React Router、Vercel 和 Cloudflare R2 的图床后台，包含登录保护、批量管理、拖拽上传和浏览器侧 WebP 压缩预览。

## 环境变量

当前版本部署到 Vercel，不再使用 Astro，也不再使用单独的 `SESSION_SECRET`。
会话签名直接由 `ADMIN_PASSWORD` 派生。

在本地环境或 Vercel Project Settings 中配置以下变量：

```bash
R2_ACCESS_KEY_ID=Cloudflare R2 S3 Access Key ID
R2_SECRET_ACCESS_KEY=Cloudflare R2 S3 Secret Access Key
R2_BUCKET_NAME=你的 R2 bucket 名称
R2_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://你的图片访问域名
ADMIN_PASSWORD=后台登录密码
MAX_FILE_SIZE=10485760 # 可选，默认 10MB
```

其中 `R2_ENDPOINT` 使用 Cloudflare R2 的 S3 API endpoint，`R2_PUBLIC_URL` 使用你给 bucket 配置的公开访问域名。

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

1. 在 Cloudflare R2 中创建存储桶，并记录 bucket 名称。
2. 在 Cloudflare R2 的 S3 API 页面创建 Access Key，拿到 `R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY` 和 `R2_ENDPOINT`。
3. 给 bucket 配置公开访问域名，作为 `R2_PUBLIC_URL`。
4. 在 Vercel 项目的 Environment Variables 中配置全部变量。
5. 把仓库重新部署到 Vercel；Vercel 会基于 `bun.lock` 和 React Router preset 自动构建。
6. 部署完成后访问 `/login`，使用 `ADMIN_PASSWORD` 登录。

## Vercel 配置说明

- Framework Preset 保持自动检测即可，这个仓库已经通过 `@vercel/react-router` preset 适配。
- 不需要 `wrangler.jsonc`、Workers bucket binding，也不需要 `SESSION_SECRET`。
- 运行时通过 S3 兼容 API 访问 R2，所以只依赖上面的环境变量。

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
