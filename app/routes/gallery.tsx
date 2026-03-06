import type { Route } from './+types/gallery';

import ImageGallery from '~/components/ImageGallery';

export const meta: Route.MetaFunction = () => [{ title: '内容档案 - Lightframe Archive' }];

const notes = [
  {
    title: '浏览',
    body: '在网格和列表之间切换，按你当下的整理节奏来。',
  },
  {
    title: '批量',
    body: '分页查看适合稳步筛选，全量读取适合集中巡检。',
  },
  {
    title: '复制',
    body: '链接和 Markdown 可以直接带走，减少额外操作。',
  },
];

export default function GalleryRoute() {
  return (
    <div className="space-y-8">
      <section className="panel panel-light overflow-hidden px-6 py-7 sm:px-8 sm:py-9">
        <div className="grid gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:items-end">
          <div className="max-w-2xl">
            <p className="eyebrow text-[var(--muted)]">Archive View</p>
            <h1 className="mt-4 font-display text-5xl leading-[0.96] text-[var(--ink)] sm:text-6xl">
              把影像整理得
              <br />
              更安静一些。
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-8 text-[var(--ink-soft)] sm:text-base">
              图库页保留筛选、复制和删除这些真正需要的动作，其他界面噪音都尽量退后。
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="/" className="button-primary">
                返回上传
              </a>
              <a href="/about" className="button-secondary">
                查看说明
              </a>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {notes.map((note) => (
              <article key={note.title} className="metric-card p-5">
                <p className="eyebrow text-[var(--muted)]">{note.title}</p>
                <p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">{note.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <ImageGallery />
    </div>
  );
}
