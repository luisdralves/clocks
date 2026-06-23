import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CrowdClock } from './crowd-clock';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CrowdClock />
  </StrictMode>,
);
