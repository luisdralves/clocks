import styles from './config-panel.module.css';
import {
  type ClockConfig,
  detectPreset,
  formatDuration,
  getSecondsPerTick,
  PRESETS,
  type PresetName,
} from './presets';

interface ConfigPanelProps {
  config: ClockConfig;
  onChange: (config: ClockConfig) => void;
  isOpen: boolean;
}

export function ConfigPanel({ config, onChange, isOpen }: ConfigPanelProps) {
  const currentPreset = detectPreset(config);

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetName = e.target.value as PresetName;
    const preset = PRESETS[presetName];
    if (preset) {
      onChange({
        hands: [...preset.hands],
        numberStyle: preset.numberStyle,
        cyclesPerDay: preset.cyclesPerDay,
      });
    }
  };

  const handleNumberStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({
      ...config,
      numberStyle: e.target.value as ClockConfig['numberStyle'],
    });
  };

  const handleCyclesPerDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...config,
      cyclesPerDay: parseInt(e.target.value, 10) || 1,
    });
  };

  const handleHandUnitsChange = (index: number, value: number) => {
    const newHands = [...config.hands];
    newHands[index] = value === 0 || Number.isNaN(value) ? 2 : value;
    onChange({ ...config, hands: newHands });
  };

  const handleRemoveHand = (index: number) => {
    const newHands = config.hands.filter((_, i) => i !== index);
    onChange({ ...config, hands: newHands });
  };

  const handleAddHand = () => {
    onChange({ ...config, hands: [...config.hands, 10] });
  };

  return (
    <div className={styles.panel} data-open={isOpen}>
      <div className={styles.header}>Custom Clock</div>

      <div className={styles.section}>
        <div className={styles.row}>
          <label htmlFor="preset" className={styles.label}>
            Preset
          </label>
          <select
            id="preset"
            value={currentPreset}
            onChange={handlePresetChange}
            className={styles.select}
          >
            <option value="regular12">Regular 12h</option>
            <option value="regular24">Regular 24h</option>
            <option value="inverted">Inverted</option>
            <option value="decimal">Decimal</option>
            <option value="binary">Binary</option>
            <option value="hexadecimal">Hexadecimal</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div className={styles.row}>
          <label htmlFor="numbers-style" className={styles.label}>
            Numbers
          </label>
          <select
            id="numbers-style"
            value={config.numberStyle}
            onChange={handleNumberStyleChange}
            className={styles.select}
          >
            <option value="arabic">Arabic</option>
            <option value="roman">Roman</option>
            <option value="none">None</option>
          </select>
        </div>

        <div className={styles.rowLast}>
          <label htmlFor="cycles-per-day" className={styles.label}>
            Cycles/day
          </label>
          <input
            id="cycles-per-day"
            type="number"
            min={1}
            max={24}
            value={config.cyclesPerDay}
            onChange={handleCyclesPerDayChange}
            className={styles.input}
          />
        </div>
      </div>

      <div className={styles.sectionNoBorder}>
        <div className={styles.handsTitle}>Hands</div>
        <div className={styles.handsList}>
          {config.hands.map((units, index) => {
            const label =
              index === 0
                ? 'Hand 1 (slowest)'
                : index === config.hands.length - 1
                  ? `Hand ${index + 1} (fastest)`
                  : `Hand ${index + 1}`;
            const secondsPerTick = getSecondsPerTick(index, config.hands, config.cyclesPerDay);
            const duration = formatDuration(secondsPerTick);

            return (
              <div key={label} className={styles.handItem}>
                <div className={styles.handHeader}>
                  <span>{label}</span>
                  {config.hands.length > 1 && (
                    <button
                      onClick={() => handleRemoveHand(index)}
                      className={styles.removeButton}
                      type="button"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className={styles.handRow}>
                  <label htmlFor="units" className={styles.unitsLabel}>
                    Units
                  </label>
                  <input
                    id="units"
                    type="number"
                    min={-100}
                    max={100}
                    value={units}
                    onChange={(e) => handleHandUnitsChange(index, parseInt(e.target.value, 10))}
                    className={styles.input}
                  />
                  <span className={styles.duration}>= {duration}/tick</span>
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={handleAddHand} className={styles.addButton} type="button">
          + Add Hand
        </button>
      </div>
    </div>
  );
}
