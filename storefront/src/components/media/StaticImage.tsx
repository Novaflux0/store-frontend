import { getImageProps, type ImageProps } from 'next/image';

export type StaticImageProps = Pick<
  ImageProps,
  'alt' | 'width' | 'height' | 'sizes' | 'className' | 'loading' | 'fetchPriority' | 'title'
> & { readonly src: string };

/**
 * A Server Component image: same optimised `srcset`, lazy loading and intrinsic size
 * as `next/image`, rendered as a plain `<img>`. `next/image` is a Client Component and
 * adds ~5.5 KB gzip to every route that renders it (the 170 KB first-load budget);
 * content images need no client behaviour (no placeholder, no `onLoad`).
 */
export function StaticImage(props: StaticImageProps) {
  const { props: imgProps } = getImageProps(props);
  // guardian-ignore WEB001: getImageProps gives next/image's srcset and sizing without its client bundle
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- props come from getImageProps (alt is required by the type)
  return <img {...imgProps} />;
}
