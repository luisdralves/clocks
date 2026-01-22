import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CustomClock } from './custom-clock';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CustomClock />
  </StrictMode>,
);
