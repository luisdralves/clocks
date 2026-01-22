import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DaylightClock } from './daylight-clock';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DaylightClock />
  </StrictMode>,
);
