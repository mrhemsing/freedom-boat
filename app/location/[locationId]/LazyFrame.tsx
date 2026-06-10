'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

type LazyFrameProps = {
  title: string;
  src: string;
  className?: string;
  iframeClassName?: string;
  placeholder: ReactNode;
  allow?: string;
};

export default function LazyFrame({
  title,
  src,
  className,
  iframeClassName,
  placeholder,
  allow
}: LazyFrameProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (shouldLoad) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '240px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldLoad]);

  return (
    <div ref={ref} className={className}>
      {shouldLoad ? (
        <iframe
          title={title}
          src={src}
          className={iframeClassName}
          loading="lazy"
          allow={allow}
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        placeholder
      )}
    </div>
  );
}
