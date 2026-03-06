# Lightframe Archive

基于 React Router、Vercel 和 Cloudflare R2 的图床后台，包含登录保护、批量管理、拖拽上传和浏览器侧 WebP 压缩预览。

## 环境变量

当前版本部署到 Vercel，不再使用 Astro，也不再使用单独的 `SESSION_SECRET`。  
会话签名直接由 `ADMIN_PASSWORD` 派生（见 `app/lib/session.server.ts`）。

### 变量清单（含获取方式）

| 变量名 | 必填 | 用途 | 如何获得 |
| --- | --- | --- | --- |
| `R2_ACCESS_KEY_ID` | 是 | 调用 R2 S3 API 的 Access Key ID | Cloudflare Dashboard → `R2` → `Manage R2 API Tokens` → 创建 `Object Read & Write` 的 API Token 后获取 |
| `R2_SECRET_ACCESS_KEY` | 是 | 调用 R2 S3 API 的 Secret Key | 同上，创建 token 时一起给出；只会完整显示一次，建议立刻保存到密码管理器 |
| `R2_BUCKET_NAME` | 是 | 上传与读取的目标 bucket 名称 | Cloudflare Dashboard → `R2` → `Overview` 创建 bucket，直接使用该 bucket 名 |
| `R2_ENDPOINT` | 是 | R2 S3 endpoint（不是公共访问域名） | Cloudflare Dashboard → `R2` → `S3 API` 页面复制 endpoint，格式通常是 `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `R2_PUBLIC_URL` | 是 | 图片外链访问前缀，用于拼接最终 URL | 给 bucket 配置公开域名（自定义域名或 `r2.dev` 域名），填完整 `https://...`，建议不带尾部 `/` |
| `ADMIN_PASSWORD` | 是 | 后台登录密码；同时用于派生 cookie 会话签名 | 自己生成强密码（建议 20+ 位随机串），例如 `openssl rand -base64 24` |
| `MAX_FILE_SIZE` | 否 | 单文件上传大小上限（字节） | 按需求填写，默认 `10485760`（10MB）；例如 `20971520`（20MB） |

### 本地 `.env` 示例

在项目根目录创建 `.env`（或 `.env.local`）：

```bash
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=你的 R2 bucket 名称
R2_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://你的图片访问域名
ADMIN_PASSWORD=替换成强密码
MAX_FILE_SIZE=10485760 # 可选，默认 10MB
```

### 逐项获取步骤（Cloudflare + Vercel）

1. 在 Cloudflare `R2` 中创建 bucket，记下 bucket 名（`R2_BUCKET_NAME`）。
2. 打开 `R2` 的 API Token 管理页面，创建仅针对该 bucket 的读写 token，保存 `R2_ACCESS_KEY_ID` 和 `R2_SECRET_ACCESS_KEY`。
3. 在 `R2` 的 `S3 API` 页面复制 endpoint 作为 `R2_ENDPOINT`。
4. 为 bucket 配置公开访问域名（推荐自定义域名），把该域名填到 `R2_PUBLIC_URL`。
5. 本地生成管理员密码并保存为 `ADMIN_PASSWORD`。
6. 在 Vercel 项目 `Settings` → `Environment Variables` 中配置上述全部变量（`MAX_FILE_SIZE` 可选）。

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

1. 先按上面的“逐项获取步骤”准备好环境变量。
2. 在 Vercel 项目中设置环境变量后触发一次重新部署。
3. Vercel 会基于 `bun.lock` 和 React Router preset 自动构建。
4. 部署完成后访问 `/login`，使用 `ADMIN_PASSWORD` 登录。

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
