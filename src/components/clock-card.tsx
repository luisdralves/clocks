import styles from './clock-card.module.css';

interface ClockInfo {
  id: string;
  name: string;
  description?: string;
  path: string;
}

interface ClockCardProps {
  clock: ClockInfo;
  isSelected: boolean;
  onSelect: () => void;
}

export function ClockCard({ clock, isSelected, onSelect }: ClockCardProps) {
  return (
    <button onClick={onSelect} className={styles.card} data-selected={isSelected} type="button">
      <h3 className={styles.name}>{clock.name}</h3>
      {!!clock.description?.length && <p className={styles.description}>{clock.description}</p>}
    </button>
  );
}

export type { ClockInfo };
