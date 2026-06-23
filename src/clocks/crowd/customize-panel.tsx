import { DNA_SIZE_BUCKETS } from './constants';
import styles from './customize-panel.module.css';
import { DNA_DOMAINS, type Dna } from './dna';
import { HAIR_PALETTE, HAIR_SHAPES, hairName, SKIN_COLORS } from './palette';

interface CustomizePanelProps {
  dna: Dna;
  onChange: (next: Dna) => void;
  onExit: () => void;
}

const FIELDS: Array<{ key: keyof Dna; label: string }> = [
  { key: 'skin', label: 'Skin' },
  { key: 'hair', label: 'Hair' },
  { key: 'shape', label: 'Hairline' },
  { key: 'sizeBucket', label: 'Size' },
];

export function CustomizePanel({ dna, onChange, onExit }: CustomizePanelProps) {
  const step = (key: keyof Dna, direction: number) => {
    const domain = DNA_DOMAINS[key];
    const next = (dna[key] + direction + domain) % domain;
    onChange({ ...dna, [key]: next });
  };

  return (
    <div className={styles.panel}>
      <h2 className={styles.heading}>Customize</h2>
      {FIELDS.map(({ key, label }) => (
        <div key={key} className={styles.row}>
          <span className={styles.label}>{label}</span>
          <button
            type="button"
            className={styles.step}
            onClick={() => step(key, -1)}
            aria-label={`Previous ${label.toLowerCase()}`}
          >
            ←
          </button>
          <span className={styles.value}>{describeField(key, dna[key])}</span>
          <button
            type="button"
            className={styles.step}
            onClick={() => step(key, 1)}
            aria-label={`Next ${label.toLowerCase()}`}
          >
            →
          </button>
        </div>
      ))}
      <button type="button" className={styles.exit} onClick={onExit}>
        ← Back to crowd
      </button>
    </div>
  );
}

function describeField(key: keyof Dna, value: number): string {
  switch (key) {
    case 'skin':
      return SKIN_COLORS[value];
    case 'hair':
      return hairName(HAIR_PALETTE[value].color);
    case 'shape':
      return HAIR_SHAPES[value];
    case 'sizeBucket':
      return `${value + 1}/${DNA_SIZE_BUCKETS}`;
    default:
      return assertNever(key);
  }
}

function assertNever(x: never): never {
  throw new Error(`Unhandled DNA field: ${String(x)}`);
}
