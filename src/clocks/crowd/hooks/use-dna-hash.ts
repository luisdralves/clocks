import { useCallback, useEffect, useState } from 'react';
import { type Dna, decodeDna, encodeDna } from '../dna';

// Two-way binding between window.location.hash and a Dna value. A non-empty
// hash that decodes puts the app in "customize mode"; the returned setter
// writes back to the hash so external listeners and the back button stay in
// sync. Clearing the DNA strips the hash via history.replaceState so no stray
// "#" is left in the URL.
export function useDnaHash(): [Dna | null, (next: Dna | null) => void] {
  const [dna, setDnaState] = useState<Dna | null>(() => readHash());

  const setDna = useCallback((next: Dna | null) => {
    setDnaState(next);
    if (next) {
      const encoded = encodeDna(next);
      if (window.location.hash.slice(1) !== encoded) {
        window.location.hash = encoded;
      }
    } else if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  useEffect(() => {
    const onChange = () => setDnaState(readHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return [dna, setDna];
}

function readHash(): Dna | null {
  const raw = window.location.hash.slice(1);
  return raw ? decodeDna(raw) : null;
}
