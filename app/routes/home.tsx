import type { Route } from './+types/home';

import ImageUploader from '~/components/ImageUploader';

export const meta: Route.MetaFunction = () => [{ title: '上传工作台 - Lightframe Archive' }];

export default function HomeRoute() {
  return (
    <div className="space-y-6">
      <section className="panel panel-light flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-7">
        <div>
          <p className="eyebrow text-[var(--muted)]">Workspace</p>
          <h1 className="mt-2 font-display text-4xl text-[var(--ink)] sm:text-5xl">上传</h1>
          <p className="mt-2 text-sm text-[var(--ink-soft)] sm:text-base">
            拖拽、粘贴或选择文件，然后直接上传。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/gallery" className="button-secondary">
            图库
          </a>
          <a href="/about" className="button-secondary">
            About
          </a>
        </div>
      </section>

      <ImageUploader />
    </div>
  );
}
