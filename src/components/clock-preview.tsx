import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from './arrow-right';
import styles from './clock-preview.module.css';

interface ClockPreviewProps {
  src: string;
  title: string;
  aspect: string;
  innerWidth?: number;
}

export function ClockPreview({ src, title, aspect, innerWidth }: ClockPreviewProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [active, setActive] = useState(false);
  const [frame, setFrame] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Mount the live clock only while it's near the viewport, and unmount it
    // once scrolled well away — keeps at most the on-screen previews running.
    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), {
      rootMargin: '40% 0px',
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !innerWidth) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setFrame({ width, height });
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [innerWidth]);

  // Render the iframe at `innerWidth` logical pixels, then scale the whole thing
  // down to fill the frame — the embedded page sees a desktop-width viewport.
  const iframeStyle =
    innerWidth && frame
      ? {
          position: 'absolute' as const,
          top: 0,
          left: 0,
          width: `${innerWidth}px`,
          height: `${(frame.height * innerWidth) / frame.width}px`,
          transform: `scale(${frame.width / innerWidth})`,
          transformOrigin: 'top left',
        }
      : undefined;

  return (
    <a
      ref={ref}
      href={src}
      className={styles.frame}
      aria-label={`Launch ${title}`}
      tabIndex={-1}
      style={{ aspectRatio: aspect }}
    >
      {active ? (
        <iframe
          src={src}
          title={`${title} preview`}
          className={styles.iframe}
          style={iframeStyle}
          scrolling="no"
          tabIndex={-1}
        />
      ) : (
        <span className={styles.placeholder}>{title}</span>
      )}

      <span className={styles.cue} aria-hidden="true">
        Launch
        <ArrowRight />
      </span>
    </a>
  );
}
