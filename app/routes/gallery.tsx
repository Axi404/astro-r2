import type { Route } from './+types/gallery';

import ImageGallery from '~/components/ImageGallery';

const notes = [
  '分页模式适合快速处理，不会一次性把大量对象堆到视图里。',
  '查看全部会顺着 cursor 连续抓取，更适合盘库和全量浏览。',
  '网格、表格、复制直链、Markdown 与批量删除都保留。',
];

const stats = [
  { value: 'Grid / List', label: '两种视图', tone: 'light' },
  { value: 'Cursor Sweep', label: '全量抓取', tone: 'dark' },
  { value: 'Batch Delete', label: '批量整理', tone: 'muted' },
];

export const meta: Route.MetaFunction = () => [{ title: '内容档案 - Lightframe Archive' }];

export default function GalleryRoute() {
  return (
    <div className="space-y-10">
      <section className="grid gap-6 xl:grid-cols-[1.16fr_0.84fr]">
        <div className="panel panel-light relative overflow-hidden px-6 py-8 sm:px-8 sm:py-10">
          <div className="pointer-events-none absolute right-[-3rem] top-[-3rem] h-40 w-40 rounded-full bg-[radial-gradient(circle,_rgba(241,91,42,0.18),_transparent_68%)]"></div>
          <p className="eyebrow text-[var(--muted)]">Archive Floor</p>
          <h1 className="mt-5 max-w-4xl font-display text-5xl leading-[0.92] text-[var(--ink)] sm:text-6xl lg:text-7xl">
            让图库更像一间能批量
            <span className="text-[var(--accent)]">处理内容的档案室</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--ink-soft)] sm:text-lg">
            这一页负责整理而不是上传。你可以在分页节奏里快速处理，也可以一口气扫完全部对象，
            然后切换视图、做选择、复制引用或直接删除。
          </p>
        </div>

        <div className="grid gap-4">
          <div className="panel panel-dark p-6">
            <p className="eyebrow text-[rgba(240,226,204,0.48)]">Operating Notes</p>
            <ul className="mt-5 space-y-4 text-sm leading-7 text-[rgba(240,226,204,0.8)]">
              {notes.map((note) => (
                <li key={note} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--accent-soft)]"></span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-3">
            {stats.map((item) => (
              <article
                key={item.label}
                className={[
                  'panel p-5',
                  item.tone === 'dark' ? 'panel-dark' : item.tone === 'muted' ? 'panel-muted' : 'panel-light',
                ].join(' ')}
              >
                <p className={item.tone === 'dark' ? 'eyebrow text-[rgba(240,226,204,0.44)]' : 'eyebrow text-[var(--muted)]'}>
                  {item.label}
                </p>
                <div className={item.tone === 'dark' ? 'mt-4 font-display text-3xl text-[var(--paper)]' : 'mt-4 font-display text-3xl text-[var(--ink)]'}>
                  {item.value}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <ImageGallery />
    </div>
  );
}
