import { useEffect, useState } from 'react';
import styles from './app.module.css';
import { ClockCard } from './components/clock-card';
import { MarkdownRenderer } from './components/markdown-renderer';

const CLOCKS = Object.entries(import.meta.glob('./clocks/*/README.md', { as: 'raw', eager: true }))
  .map(([path, content]) => {
    const id = path.match(/\.\/clocks\/(.+)\/README\.md/)?.[1];
    const name = content.match(/^#\s+(.+)$/m)?.[1];
    const description = content.match(/^>\s*(.+)$/m)?.[1];

    if (!id || !name) {
      return null;
    }

    return {
      id,
      name,
      description,
      content,
      path: `/${id}/`,
    };
  })
  .filter((clock) => !!clock);

export function App() {
  const [selectedClock, setSelectedClock] = useState<string | null>(() => {
    const hash = window.location.hash.slice(1);
    return CLOCKS.some((c) => c.id === hash) ? hash : null;
  });

  const selectedClockInfo = CLOCKS.find((c) => c.id === selectedClock);

  useEffect(() => {
    if (selectedClock) {
      window.history.replaceState(null, '', `#${selectedClock}`);
    } else {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [selectedClock]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && CLOCKS.some((c) => c.id === hash)) {
        setSelectedClock(hash);
      } else {
        setSelectedClock(null);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <div className={styles.container} data-sidebar-open={!!selectedClock}>
      <header className={styles.header}>
        <h1 className={styles.title}>Clocks</h1>
      </header>

      <main className={styles.main}>
        <section className={styles.clockGrid}>
          {CLOCKS.map((clock) => (
            <ClockCard
              key={clock.id}
              clock={clock}
              isSelected={selectedClock === clock.id}
              onSelect={() => setSelectedClock(selectedClock === clock.id ? null : clock.id)}
            />
          ))}
        </section>

        <aside className={styles.sidebar}>
          {selectedClock && selectedClockInfo && (
            <>
              <div className={styles.sidebarHeader}>
                <a href={selectedClockInfo.path} className={styles.launchButton}>
                  Launch Clock →
                </a>

                <button
                  onClick={() => setSelectedClock(null)}
                  className={styles.closeButton}
                  type="button"
                >
                  ×
                </button>
              </div>

              <MarkdownRenderer content={selectedClockInfo.content} />
            </>
          )}
        </aside>
      </main>
    </div>
  );
}
