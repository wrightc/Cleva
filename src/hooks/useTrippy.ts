import { useState, useEffect } from 'react';

export function useTrippy() {
  const [trippy, setTrippy] = useState(() => {
    try { return localStorage.getItem('sw_trippy') !== 'false'; }
    catch { return true; }
  });

  useEffect(() => {
    try { localStorage.setItem('sw_trippy', String(trippy)); }
    catch {}
    document.documentElement.setAttribute('data-trippy', String(trippy));
  }, [trippy]);

  // Apply on first mount
  useEffect(() => {
    document.documentElement.setAttribute('data-trippy', String(trippy));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { trippy, toggle: () => setTrippy(t => !t) };
}
