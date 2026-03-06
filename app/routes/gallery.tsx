import type { Route } from './+types/gallery';

import ImageGallery from '~/components/ImageGallery';
import PageIntro from '~/components/PageIntro';

export const meta: Route.MetaFunction = () => [{ title: '内容档案 - Lightframe Archive' }];

const notes = [
  {
    title: '浏览',
    body: '在网格与列表之间切换，让浏览方式贴合你此刻的整理节奏。',
    detail: 'grid / list',
  },
  {
    title: '巡检',
    body: '分页适合稳步筛选，全量读取适合一次性巡检整个档案。',
    detail: 'page / all',
  },
  {
    title: '带走',
    body: '复制链接、复制 Markdown、删除条目都在一个安静的操作带里完成。',
    detail: 'copy / remove',
  },
];

export default function GalleryRoute() {
  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Archive View"
        title={
          <>
            让图库回到
            <br />
            浏览本身。
          </>
        }
        description="图库页只保留筛选、复制、删除和切换视图这些真正需要的动作，让内容自己成为视觉中心，而不是被界面推着走。"
        actions={
          <>
            <a href="/" className="button-primary">
              返回上传
            </a>
            <a href="/about" className="button-secondary">
              查看说明
            </a>
          </>
        }
        asideLabel="Rhythm"
        asideLead="这里不是更复杂，而是更稳地浏览、筛选与收束。"
        notes={notes}
      />

      <ImageGallery />
    </div>
  );
}
