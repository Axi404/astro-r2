import type { Route } from './+types/about';

const sections = [
  { title: '上传', items: ['拖拽、粘贴、批量选择', '可选随机文件名', '浏览器端 WebP 压缩'] },
  { title: '图库', items: ['分页 / 全量读取', '网格 / 列表视图', '复制链接与批量删除'] },
  { title: '认证', items: ['管理员密码登录', '签名 Cookie 会话', '接口持续校验'] },
];

export const meta: Route.MetaFunction = () => [{ title: 'About - Lightframe Archive' }];

export default function AboutRoute() {
  return (
    <div className="space-y-4">
      <section className="panel panel-light p-5 sm:p-6">
        <h1 className="text-lg font-semibold text-[var(--ink)]">使用说明</h1>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          这是一个私有图床后台，核心操作是上传、管理和复制链接。
        </p>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        {sections.map((section) => (
          <article key={section.title} className="panel panel-light p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-[var(--ink)]">{section.title}</h2>
            <ul className="mt-3 space-y-2 text-sm text-[var(--ink-soft)]">
              {section.items.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="panel panel-muted px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--ink)]">技术栈</h3>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              React Router 负责界面，Vercel 负责交付，Cloudflare R2 负责内容存储。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="surface-tag">React Router</span>
            <span className="surface-tag">Vercel</span>
            <span className="surface-tag">Cloudflare R2</span>
          </div>
        </div>
      </section>
    </div>
  );
}
