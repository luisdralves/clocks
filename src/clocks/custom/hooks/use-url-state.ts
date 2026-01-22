import { useCallback, useEffect, useState } from 'react';
import { type ClockConfig, type NumberStyle, PRESETS } from '../presets';

function parseUrlState(): ClockConfig | null {
  const params = new URLSearchParams(window.location.search);
  const handsParam = params.get('h');
  const numberStyle = (params.get('n') || 'arabic') as NumberStyle;
  const cyclesPerDay = parseInt(params.get('c') || '1', 10) || 1;

  if (!handsParam) return null;

  try {
    const hands = handsParam.split(',').map((u) => parseInt(u, 10));
    if (hands.some(Number.isNaN)) return null;
    return { hands, numberStyle, cyclesPerDay };
  } catch {
    return null;
  }
}

function updateUrl(config: ClockConfig): void {
  const params = new URLSearchParams();
  params.set('h', config.hands.join(','));
  params.set('n', config.numberStyle);
  if (config.cyclesPerDay !== 1) {
    params.set('c', config.cyclesPerDay.toString());
  }
  history.replaceState(null, '', `?${params.toString()}`);
}

export function useUrlState(): [ClockConfig, (config: ClockConfig) => void] {
  const [config, setConfigState] = useState<ClockConfig>(() => {
    const urlState = parseUrlState();
    if (urlState) return urlState;

    const preset = PRESETS.regular12;
    return {
      hands: [...preset.hands],
      numberStyle: preset.numberStyle,
      cyclesPerDay: preset.cyclesPerDay,
    };
  });

  const setConfig = useCallback((newConfig: ClockConfig) => {
    setConfigState(newConfig);
    updateUrl(newConfig);
  }, []);

  useEffect(() => {
    if (!parseUrlState()) {
      updateUrl(config);
    }
  }, [config]);

  return [config, setConfig];
}
