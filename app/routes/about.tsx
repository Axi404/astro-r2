import type { Route } from './+types/about';

import PageIntro from '~/components/PageIntro';

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
  {
    title: '少一点噪音',
    body: '上传、浏览和删除只保留必要动作，让图像内容自己站到前面。',
    detail: 'quiet first',
  },
  {
    title: '多一点秩序',
    body: '命名、预览、翻页和复制都沿着一条清晰流程组织，而不是散落在各处。',
    detail: 'clear sequence',
  },
  {
    title: '认证不退场',
    body: '页面可见时，接口也继续校验，不让私有内容在边角处漏出。',
    detail: 'auth all the way',
  },
];

export default function AboutRoute() {
  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="About"
        title={
          <>
            一套留白充足的
            <br />
            私有图床工作区。
          </>
        }
        description="Lightframe Archive 把上传、浏览、删除和登录这些动作压缩在一套克制界面里。页面不像工具箱，更像一张整理台。"
        asideLabel="Principles"
        asideLead="这一版的布局以纸面感、秩序感和较低干扰为中心。"
        notes={principles}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        {sections.map((section) => (
          <article key={section.title} className="panel panel-light p-6 sm:p-7">
            <div className="flex items-end justify-between gap-4">
              <p className="eyebrow text-[var(--muted)]">{section.title}</p>
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                scope
              </span>
            </div>
            <ul className="mt-5 space-y-4 text-sm leading-7 text-[var(--ink-soft)]">
              {section.items.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-3 h-px w-5 shrink-0 bg-[var(--accent)]" />
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
