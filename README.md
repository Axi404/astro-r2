# Astro R2 图床

基于 Astro 和 Cloudflare R2 构建的简洁、高效的图床服务，支持 Cloudflare Pages 部署。

## 功能特性

- 🚀 **基于 Astro** - 现代化的前端框架，构建速度快
- ☁️ **Cloudflare R2** - 全球 CDN 加速，成本低廉
- 📤 **多种上传方式** - 支持拖拽、文件选择、剪贴板粘贴
- 🖼️ **WebP 压缩** - 自动压缩图片为 WebP 格式，减少存储空间
- 🔐 **Hash 文件名** - 可选的 Hash 文件名，避免冲突
- 📱 **响应式设计** - 完美适配各种设备
- 🎨 **现代化 UI** - 基于 Tailwind CSS 的美观界面

## 支持的文件格式

- JPEG / JPG
- PNG
- GIF
- WebP
- SVG

## 部署指南

### 1. 环境变量配置

在 Cloudflare Pages 的设置中添加以下环境变量：

```bash
R2_ACCOUNT_ID=你的Cloudflare账户ID
R2_ACCESS_KEY_ID=你的R2访问密钥ID
R2_SECRET_ACCESS_KEY=你的R2秘密访问密钥
R2_BUCKET_NAME=你的R2存储桶名称
R2_ENDPOINT=https://你的账户ID.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://你的自定义域名.com

# 可选配置
USE_HASH_NAMES=true
ENABLE_WEBP_COMPRESSION=true
MAX_FILE_SIZE=10485760
```

### 2. R2 存储桶设置

1. 登录 Cloudflare 控制台
2. 创建 R2 存储桶
3. 生成 API Token，确保有 R2 的读写权限
4. （可选）设置自定义域名以获得更好的访问速度

### 3. 部署到 Cloudflare Pages

#### 方法一：通过 GitHub 连接（推荐）

1. 将代码推送到 GitHub 仓库
2. 在 Cloudflare Pages 中连接你的 GitHub 仓库
3. 设置构建命令：`npm run build`
4. 设置输出目录：`dist`
5. 添加环境变量
6. 部署

#### 方法二：使用 Wrangler CLI

```bash
# 安装依赖
npm install

# 构建项目
npm run build

# 部署到 Cloudflare Pages
npx wrangler pages deploy dist
```

### 4. 本地开发

```bash
# 安装依赖
npm install

# 复制环境变量文件
cp env.example .env

# 填写你的 R2 配置信息
# 编辑 .env 文件

# 启动开发服务器
npm run dev
```

## 使用方法

### 上传图片

1. **拖拽上传**：直接拖拽图片文件到上传区域
2. **文件选择**：点击"选择文件"按钮选择图片
3. **剪贴板粘贴**：复制图片后在页面上按 `Ctrl+V` 粘贴

### 管理图片

- 在"图片管理"页面可以查看所有已上传的图片
- 支持网格和列表两种视图模式
- 可以批量选择和删除图片
- 一键复制图片链接或 Markdown 格式

### 压缩设置

- 可以调整 WebP 压缩质量（10-100%）
- 默认质量为 80%，平衡文件大小和图片质量

## 项目结构

```
astro-r2/
├── src/
│   ├── components/          # React 组件
│   │   ├── ImageUploader.tsx
│   │   └── ImageGallery.tsx
│   ├── layouts/             # Astro 布局
│   │   └── Layout.astro
│   ├── lib/                 # 工具库
│   │   └── r2.ts           # R2 服务封装
│   └── pages/              # 页面
│       ├── api/            # API 路由
│       │   ├── upload.ts
│       │   └── images.ts
│       ├── index.astro     # 首页
│       └── gallery.astro   # 图片管理页
├── public/                 # 静态资源
├── astro.config.mjs       # Astro 配置
├── tailwind.config.mjs    # Tailwind 配置
├── wrangler.toml          # Cloudflare 配置
└── package.json
```

## 技术栈

- **前端框架**：Astro + React
- **样式**：Tailwind CSS
- **部署**：Cloudflare Pages
- **存储**：Cloudflare R2
- **图片处理**：Sharp
- **文件上传**：AWS SDK v3

## 注意事项

1. 确保 R2 存储桶有正确的 CORS 配置
2. 自定义域名可以提高访问速度，但不是必需的
3. 默认文件大小限制为 10MB，可通过环境变量调整
4. WebP 压缩可能不适用于所有图片格式，失败时会使用原格式

## 许可证

MIT License