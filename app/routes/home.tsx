import type { Route } from './+types/home';

import ImageUploader from '~/components/ImageUploader';
import PageIntro from '~/components/PageIntro';

export const meta: Route.MetaFunction = () => [{ title: '上传工作台 - Lightframe Archive' }];

const notes = [
  {
    title: '落下',
    body: '拖拽、粘贴或多选都保持在同一个入口里，动作不需要绕路。',
    detail: 'drag / paste / select',
  },
  {
    title: '比照',
    body: '上传前先看一眼 WebP 预览与体积变化，再决定要不要压缩。',
    detail: 'preview before commit',
  },
  {
    title: '归档',
    body: '刚上传的内容先留在眼前，方便复制链接，然后再进入完整图库。',
    detail: 'recent uploads stay close',
  },
];

export default function HomeRoute() {
  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Upload Studio"
        title={
          <>
            把图片放下，
            <br />
            让归档自然发生。
          </>
        }
        description="首页只保留接收文件、预览差异、确认命名和发起上传这几件事。版面尽量退后，让每一步都清楚而安静。"
        actions={
          <>
            <a href="/gallery" className="button-primary">
              打开图库
            </a>
            <a href="/about" className="button-secondary">
              查看说明
            </a>
          </>
        }
        asideLabel="Flow"
        asideLead="上传工作区按一个稳定的节奏组织，不需要额外切页。"
        notes={notes}
      />

      <ImageUploader />
    </div>
  );
}
