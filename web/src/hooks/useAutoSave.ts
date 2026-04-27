import { useEffect } from 'react';

export function useAutoSave(callback: () => void, deps: unknown[], delay = 100): void {
  useEffect(() => {
    const id = setTimeout(callback, delay);
    return () => clearTimeout(id);
  }, [callback, delay, ...deps]);
}
