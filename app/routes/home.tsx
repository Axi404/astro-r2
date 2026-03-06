import type { Route } from './+types/home';

import ImageUploader from '~/components/ImageUploader';

export const meta: Route.MetaFunction = () => [{ title: '上传工作台 - Lightframe Archive' }];

const notes = [
  {
    title: '拖拽',
    body: '把图片直接放进来，入口保持安静，没有多余跳转。',
  },
  {
    title: '压缩',
    body: '上传前先看一眼 WebP 预览和体积差值，再决定是否启用。',
  },
  {
    title: '归档',
    body: '最近上传会立刻留在当前页，方便继续整理和复制链接。',
  },
];

export default function HomeRoute() {
  return (
    <div className="space-y-8">
      <section className="panel panel-light overflow-hidden px-6 py-7 sm:px-8 sm:py-9">
        <div className="grid gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:items-end">
          <div className="max-w-2xl">
            <p className="eyebrow text-[var(--muted)]">Upload Studio</p>
            <h1 className="mt-4 font-display text-5xl leading-[0.96] text-[var(--ink)] sm:text-6xl">
              静静上传，
              <br />
              认真收纳。
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-8 text-[var(--ink-soft)] sm:text-base">
              这个页面只做几件必要的事: 接收图片、生成预览、确认命名策略，然后平稳地送进你的私有图床。
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="/gallery" className="button-primary">
                打开图库
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

      <ImageUploader />
    </div>
  );
}
