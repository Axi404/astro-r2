import type { Route } from './+types/gallery';

import ImageGallery from '~/components/ImageGallery';

export const meta: Route.MetaFunction = () => [{ title: '内容档案 - Lightframe Archive' }];

export default function GalleryRoute() {
  return (
    <div className="space-y-6">
      <section className="panel panel-light flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-7">
        <div>
          <p className="eyebrow text-[var(--muted)]">Workspace</p>
          <h1 className="mt-2 font-display text-4xl text-[var(--ink)] sm:text-5xl">图库</h1>
          <p className="mt-2 text-sm text-[var(--ink-soft)] sm:text-base">
            浏览、复制、筛选和删除现有内容。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/" className="button-secondary">
            上传
          </a>
          <a href="/about" className="button-secondary">
            About
          </a>
        </div>
      </section>

      <ImageGallery />
    </div>
  );
}
