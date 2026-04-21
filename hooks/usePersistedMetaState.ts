import { useEffect, useRef, useState } from 'react';
import { MetaState } from '../types';
import { INITIAL_META_STATE, META_STORAGE_KEY, PERSIST_DEBOUNCE_MS } from '../utils/constants';

interface UsePersistedMetaState {
  metaState: MetaState;
  setMetaState: React.Dispatch<React.SetStateAction<MetaState>>;
}

export function usePersistedMetaState(): UsePersistedMetaState {
  const [metaState, setMetaState] = useState<MetaState>(INITIAL_META_STATE);
  const hasLoadedRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const savedMeta = localStorage.getItem(META_STORAGE_KEY);
      if (savedMeta) {
        const parsed = JSON.parse(savedMeta) as Partial<MetaState>;
        if (parsed && typeof parsed === 'object') {
          setMetaState(prev => ({ ...prev, ...parsed }));
        }
      }
    } catch {
      // Corrupt meta save — reset silently; meta progression is best-effort.
    }
    hasLoadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(META_STORAGE_KEY, JSON.stringify(metaState));
      } catch {
        // Quota or unavailable — meta save is optional, skip silently.
      }
    }, PERSIST_DEBOUNCE_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [metaState]);

  return { metaState, setMetaState };
}
