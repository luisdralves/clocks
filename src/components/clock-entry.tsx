import { ArrowRight } from './arrow-right';
import styles from './clock-entry.module.css';
import { ClockPreview } from './clock-preview';
import { MarkdownRenderer } from './markdown-renderer';

interface ClockInfo {
  id: string;
  name: string;
  tagline?: string;
  body: string;
  path: string;
  aspect: string;
  innerWidth?: number;
}

interface ClockEntryProps {
  clock: ClockInfo;
}

export function ClockEntry({ clock }: ClockEntryProps) {
  return (
    <article className={styles.entry}>
      <header className={styles.head}>
        <h2 className={styles.name}>
          <a href={clock.path} className={styles.nameLink}>
            {clock.name}
          </a>
        </h2>

        <a href={clock.path} className={styles.launch}>
          Launch
          <ArrowRight className={styles.arrow} />
        </a>
      </header>

      {clock.tagline && <p className={styles.tagline}>{clock.tagline}</p>}

      <ClockPreview
        src={clock.path}
        title={clock.name}
        aspect={clock.aspect}
        innerWidth={clock.innerWidth}
      />

      <MarkdownRenderer content={clock.body} />
    </article>
  );
}

export type { ClockInfo };
