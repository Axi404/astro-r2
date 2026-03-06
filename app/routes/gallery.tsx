import type { Route } from './+types/gallery';

import ImageGallery from '~/components/ImageGallery';

export const meta: Route.MetaFunction = () => [{ title: '内容档案 - Lightframe Archive' }];

export default function GalleryRoute() {
  return <ImageGallery />;
}
