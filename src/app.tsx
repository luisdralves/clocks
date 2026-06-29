import styles from './app.module.css';
import { ClockEntry, type ClockInfo } from './components/clock-entry';
import { LiveTime } from './components/live-time';

// Per-clock preview tuning, in curated reading order. `aspect` is the frame
// shape; `innerWidth`, when set, renders the iframe as if its viewport were that
// many pixels wide (then scales it to fit), so clocks that branch on viewport
// size keep their desktop layout.
const CLOCK_META: { id: string; aspect: string; innerWidth?: number }[] = [
  { id: 'simple', aspect: '16 / 9' },
  { id: 'wall-o-clocks', aspect: '21 / 9' },
  { id: 'precalculated-grid', aspect: '16 / 9' },
  { id: 'lemniscate', aspect: '2 / 1' },
  { id: 'spiral', aspect: '16 / 9' },
  { id: 'custom', aspect: '4 / 3' },
  { id: 'daylight', aspect: '16 / 9', innerWidth: 1280 },
  { id: 'crowd', aspect: '16 / 9' },
];

const DEFAULT_ASPECT = '16 / 9';
const META = new Map(CLOCK_META.map((meta, order) => [meta.id, { ...meta, order }]));

function parseClock(path: string, content: string): ClockInfo | null {
  const id = path.match(/\.\/clocks\/(.+)\/README\.md/)?.[1];
  const name = content.match(/^#\s+(.+)$/m)?.[1];

  if (!id || !name) {
    return null;
  }

  const tagline = content.match(/^>\s*(.+)$/m)?.[1];
  const body = content
    .replace(/^#\s+.+$/m, '')
    .replace(/^>\s*.+$/m, '')
    .trim();

  return {
    id,
    name,
    tagline,
    body,
    path: `/${id}/`,
    aspect: META.get(id)?.aspect ?? DEFAULT_ASPECT,
    innerWidth: META.get(id)?.innerWidth,
  };
}

const CLOCKS = Object.entries(import.meta.glob('./clocks/*/README.md', { as: 'raw', eager: true }))
  .map(([path, content]) => parseClock(path, content))
  .filter((clock): clock is ClockInfo => !!clock)
  .sort(
    (a, b) =>
      (META.get(a.id)?.order ?? CLOCK_META.length) - (META.get(b.id)?.order ?? CLOCK_META.length),
  );

export function App() {
  return (
    <div className={styles.page}>
      <header className={styles.masthead}>
        <h1 className={styles.wordmark}>Clocks</h1>
        <LiveTime className={styles.readout} />
      </header>

      <main className={styles.entries}>
        {CLOCKS.map((clock) => (
          <ClockEntry key={clock.id} clock={clock} />
        ))}
      </main>
    </div>
  );
}
