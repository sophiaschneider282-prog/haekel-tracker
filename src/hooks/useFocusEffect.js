import { useEffect, useRef } from 'react';

// Runs on mount only - use the refresh pattern in App.js for re-fetching
export function useFocusEffect(callback) {
  const cb = useRef(callback);
  cb.current = callback;
  useEffect(() => { cb.current(); }, []);
}
