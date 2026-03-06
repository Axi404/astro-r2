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

export default function AboutRoute() {
  return (
    <div className="space-y-6">
      <section className="panel panel-light p-6 sm:p-7">
        <p className="eyebrow text-[var(--muted)]">About</p>
        <h1 className="mt-2 font-display text-4xl text-[var(--ink)] sm:text-5xl">Lightframe Archive</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--ink-soft)] sm:text-base">
          一个面向私有图床管理的轻量工作区。首页只保留操作，说明集中放在这里。
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {sections.map((section) => (
          <article key={section.title} className="panel panel-light p-6">
            <p className="eyebrow text-[var(--muted)]">{section.title}</p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--ink-soft)]">
              {section.items.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ink)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </div>
  );
}
