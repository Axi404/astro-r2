# Astro R2 图床

基于 Astro 和 Cloudflare R2 构建的简洁、高效的图床服务，支持 Cloudflare Pages 部署。

## 支持的文件格式

- JPEG / JPG
- PNG
- GIF
- WebP
- SVG

## 部署指南

### 1. R2 存储桶设置

1. 登录 Cloudflare 控制台
2. 创建 R2 存储桶
3. 生成 API Token，确保有 R2 的读写权限

![](https://picr2.axi404.top/1754991977043_image.webp)

![](https://picr2.axi404.top/1754992057042_image.webp)

![](https://picr2.axi404.top/1754992118194_image.webp)

![](https://picr2.axi404.top/1754992181237_image.webp)

![](https://picr2.axi404.top/1754992252450_image.webp)

复制并且备份这个页面中的内容，它们只出现一次。

### 2. Vercel 部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository=https://github.com/Axi404/astro-r2)

### 3. 环境变量设置

在 Vercel 的设置中添加以下环境变量：

```bash
R2_ACCOUNT_ID=你的Cloudflare账户ID
R2_ACCESS_KEY_ID=你的R2访问密钥ID
R2_SECRET_ACCESS_KEY=你的R2秘密访问密钥
R2_BUCKET_NAME=你的R2存储桶名称
R2_ENDPOINT=你的终结点
R2_PUBLIC_URL=https://你的自定义域名.com # 或者你的桶的默认 url
ADMIN_PASSWORD=网页的登录密码，自定义
```

其中 R2_ACCOUNT_ID 为账户 ID：

![](https://picr2.axi404.top/1754992463308_image.webp)

之后重新部署，即可。

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

## 许可证

MIT License