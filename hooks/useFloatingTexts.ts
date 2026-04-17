import { useCallback, useEffect, useRef, useState } from 'react';
import { FloatingText } from '../types';
import { FLOATING_TEXT_DURATION_MS, newId } from '../utils/constants';

interface UseFloatingTexts {
  floatingTexts: FloatingText[];
  addFloatingText: (text: string, type: FloatingText['type']) => void;
}

export function useFloatingTexts(): UseFloatingTexts {
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    const timersSnapshot = timers.current;
    return () => {
      timersSnapshot.forEach(t => clearTimeout(t));
      timersSnapshot.clear();
    };
  }, []);

  const addFloatingText = useCallback((text: string, type: FloatingText['type']) => {
    const id = newId();
    const x = 40 + Math.random() * 20;
    const y = 40 + Math.random() * 20;
    setFloatingTexts(prev => [...prev, { id, text, type, x, y }]);

    const timer = setTimeout(() => {
      setFloatingTexts(prev => prev.filter(ft => ft.id !== id));
      timers.current.delete(timer);
    }, FLOATING_TEXT_DURATION_MS);
    timers.current.add(timer);
  }, []);

  return { floatingTexts, addFloatingText };
}
