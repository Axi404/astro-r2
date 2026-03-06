import type { Route } from './+types/about';

const sections = [
  {
    title: '上传',
    items: ['支持拖拽、粘贴和批量选择', '可选随机文件名', '浏览器侧 WebP 预览压缩'],
  },
  {
    title: '图库',
    items: ['分页和全量两种读取方式', '网格和列表两种视图', '支持复制链接、Markdown 与批量删除'],
  },
  {
    title: '访问控制',
    items: ['单管理员密码登录', '签名 cookie 会话', '所有接口继续校验认证状态'],
  },
  {
    title: '部署',
    items: ['React Router', 'Vercel', 'Cloudflare R2'],
  },
];

export const meta: Route.MetaFunction = () => [{ title: 'About - Lightframe Archive' }];

const principles = [
  '少一点界面噪音，多一点操作秩序。',
  '上传、浏览和删除都保持认证校验。',
  '界面以扁平、中性、克制为主，不抢内容本身的注意力。',
];

export default function AboutRoute() {
  return (
    <div className="space-y-8">
      <section className="panel panel-light overflow-hidden px-6 py-7 sm:px-8 sm:py-9">
        <div className="grid gap-8 lg:grid-cols-[1.06fr_0.94fr] lg:items-end">
          <div className="max-w-2xl">
            <p className="eyebrow text-[var(--muted)]">About</p>
            <h1 className="mt-4 font-display text-5xl leading-[0.96] text-[var(--ink)] sm:text-6xl">
              一个更安静的
              <br />
              私有图床工作区。
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-8 text-[var(--ink-soft)] sm:text-base">
              Lightframe Archive 把上传、浏览、删除和登录这些动作压缩到一套克制的界面里，让日常维护保持轻而有序。
            </p>
          </div>

          <div className="metric-card p-6">
            <p className="eyebrow text-[var(--muted)]">Principles</p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--ink-soft)]">
              {principles.map((principle) => (
                <div key={principle} className="flex gap-3">
                  <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  <span>{principle}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {sections.map((section) => (
          <article key={section.title} className="panel panel-light p-6 sm:p-7">
            <p className="eyebrow text-[var(--muted)]">{section.title}</p>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-[var(--ink-soft)]">
              {section.items.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="panel panel-muted px-6 py-6 sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow text-[var(--muted)]">Stack</p>
            <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
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
