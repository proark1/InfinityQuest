import { useEffect, useRef, useState } from 'react';
import { MetaState } from '../types';
import { INITIAL_META_STATE, META_STORAGE_KEY } from '../utils/constants';

interface UsePersistedMetaState {
  metaState: MetaState;
  setMetaState: React.Dispatch<React.SetStateAction<MetaState>>;
}

export function usePersistedMetaState(): UsePersistedMetaState {
  const [metaState, setMetaState] = useState<MetaState>(INITIAL_META_STATE);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const savedMeta = localStorage.getItem(META_STORAGE_KEY);
    if (savedMeta) {
      try {
        const parsed = JSON.parse(savedMeta) as Partial<MetaState>;
        setMetaState(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Meta load failed', e);
      }
    }
    hasLoadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    try {
      localStorage.setItem(META_STORAGE_KEY, JSON.stringify(metaState));
    } catch (e) {
      console.error('Meta save failed', e);
    }
  }, [metaState]);

  return { metaState, setMetaState };
}
