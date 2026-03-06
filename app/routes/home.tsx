import type { Route } from './+types/home';

import ImageUploader from '~/components/ImageUploader';

const heroStats = [
  {
    value: '03',
    label: '输入方式',
    description: '拖拽、粘贴、点选三条路径全部保留。',
  },
  {
    value: 'WebP',
    label: '本地预览',
    description: '质量滑杆即刻反馈体积变化，不必盲传。',
  },
  {
    value: 'R2',
    label: '最终落点',
    description: '上传完成后直接拿直链或 Markdown 引用。',
  },
];

const features = [
  {
    label: 'Queue Logic',
    title: '先把样张排好，再统一发片',
    description: '上传队列、压缩对照和最近结果被拆成清晰的三段式流程，操作不会互相打架。',
  },
  {
    label: 'File Hygiene',
    title: '命名规则和压缩策略放到同一控制板',
    description: '随机文件名、压缩开关、质量档位不再散落在页面里，所有核心开关都在第一视线。',
  },
  {
    label: 'Dispatch Speed',
    title: '上传后立刻进入可分发状态',
    description: '最近上传区保留复制直链和 Markdown，减少从上传到分享的跳转次数。',
  },
];

export const meta: Route.MetaFunction = () => [{ title: '上传工作台 - Lightframe Archive' }];

export default function HomeRoute() {
  return (
    <div className="space-y-10">
      <section className="grid gap-6 xl:grid-cols-[1.24fr_0.76fr]">
        <div className="panel panel-dark grain relative overflow-hidden px-6 py-8 sm:px-8 sm:py-10">
          <div className="pointer-events-none absolute -right-8 top-6 h-40 w-40 rounded-full border border-[rgba(255,232,198,0.12)] bg-[radial-gradient(circle,_rgba(255,200,137,0.18),_transparent_68%)]"></div>
          <div className="pointer-events-none absolute bottom-[-4rem] left-[-2rem] h-40 w-40 rounded-full bg-[radial-gradient(circle,_rgba(241,91,42,0.18),_transparent_70%)]"></div>

          <p className="eyebrow text-[rgba(240,226,204,0.54)]">Upload Stage</p>
          <h1 className="mt-5 max-w-4xl font-display text-5xl leading-[0.9] text-[var(--paper)] sm:text-6xl lg:text-7xl">
            把上传页改成真正能工作的
            <span className="text-[var(--accent-soft)]">影像控制台</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[rgba(240,226,204,0.78)] sm:text-lg">
            这里不再只是一个上传按钮。你可以先贴图、看压缩结果、决定命名策略，再把结果推到 R2，
            最后顺手切去图库做整理和分发。
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a href="/gallery" className="button-primary">
              打开图库
              <span aria-hidden="true">↗</span>
            </a>
            <div className="status-pill border border-[var(--line-inverse)] bg-[rgba(255,255,255,0.05)] text-[rgba(240,226,204,0.72)]">
              预览先行 / 上传后发
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
          {heroStats.map((item, index) => (
            <article
              key={item.label}
              className={[
                'panel relative overflow-hidden p-5 sm:p-6',
                index === 0 ? 'panel-muted' : '',
                index === 1 ? 'panel-light' : '',
                index === 2 ? 'panel-dark' : '',
              ].join(' ')}
            >
              <p className={index === 2 ? 'eyebrow text-[rgba(240,226,204,0.48)]' : 'eyebrow text-[var(--muted)]'}>
                {item.label}
              </p>
              <div className={index === 2 ? 'mt-5 font-display text-5xl text-[var(--paper)]' : 'mt-5 font-display text-5xl text-[var(--ink)]'}>
                {item.value}
              </div>
              <p className={index === 2 ? 'mt-3 text-sm leading-7 text-[rgba(240,226,204,0.74)]' : 'mt-3 text-sm leading-7 text-[var(--ink-soft)]'}>
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <ImageUploader />

      <section className="grid gap-4 lg:grid-cols-3">
        {features.map((feature, index) => (
          <article
            key={feature.label}
            className={['panel p-6 sm:p-7', index === 1 ? 'panel-dark' : 'panel-light'].join(' ')}
          >
            <p className={index === 1 ? 'eyebrow text-[rgba(240,226,204,0.48)]' : 'eyebrow text-[var(--muted)]'}>
              {feature.label}
            </p>
            <h2 className={index === 1 ? 'mt-4 font-display text-3xl text-[var(--paper)]' : 'mt-4 font-display text-3xl text-[var(--ink)]'}>
              {feature.title}
            </h2>
            <p className={index === 1 ? 'mt-3 text-sm leading-7 text-[rgba(240,226,204,0.74)]' : 'mt-3 text-sm leading-7 text-[var(--ink-soft)]'}>
              {feature.description}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
