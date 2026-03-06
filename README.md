# Astro R2 图床

基于 Astro、Vercel 和 Cloudflare R2 的图床服务，包含登录保护、批量管理、拖拽上传和可选的 WebP 压缩。

## 环境变量

在 Vercel 项目中配置以下环境变量：

```bash
R2_ACCESS_KEY_ID=你的 R2 Access Key ID
R2_SECRET_ACCESS_KEY=你的 R2 Secret Access Key
R2_BUCKET_NAME=你的 R2 存储桶名称
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://你的图片访问域名
ADMIN_PASSWORD=后台登录密码
SESSION_SECRET=用于签名登录 cookie 的随机长字符串
MAX_FILE_SIZE=10485760 # 可选，默认 10MB
R2_ACCOUNT_ID=你的 Cloudflare Account ID # 可选，仅为兼容保留
```

`SESSION_SECRET` 在生产环境必填，建议使用至少 32 字节的随机值。

## 本地开发

```bash
bun install
bun run dev
```

常用命令：

- `bun run build`：构建生产版本
- `bun run preview`：预览构建产物
- `bun run test`：运行内置测试
- `bun run check`：运行 Astro 类型检查
- `bun run verify`：串联测试、类型检查和构建

## 部署步骤

1. 在 Cloudflare R2 中创建存储桶，并生成具备读写权限的 Access Key。
2. 为存储桶配置公开访问域名，作为 `R2_PUBLIC_URL`。
3. 在 Vercel 导入本仓库，并填入上面的环境变量。
4. 部署完成后访问 `/login`，使用 `ADMIN_PASSWORD` 登录。

## 功能概览

- 上传页支持拖拽、文件选择和粘贴图片
- 支持随机文件名和 WebP 压缩预览
- 图库页支持网格/列表切换、分页、批量删除
- 未登录访问上传页或图库页会自动跳转到登录页

## 手动验收建议

1. 未登录访问 `/` 和 `/gallery`，确认都会跳到 `/login`
2. 登录后上传多张图片，确认可复制链接和 Markdown
3. 翻页浏览图库，确认上一页/下一页正常
4. 批量删除图片，确认部分失败时能看到错误提示
