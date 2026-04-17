import { useCallback, useEffect, useRef, useState } from 'react';
import { GameState } from '../types';
import { INITIAL_GAME_STATE, PERSIST_DEBOUNCE_MS, STORAGE_KEY } from '../utils/constants';

interface UsePersistedGameState {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  gameStarted: boolean;
  setGameStarted: React.Dispatch<React.SetStateAction<boolean>>;
  resetGame: () => void;
}

export function usePersistedGameState(): UsePersistedGameState {
  const [gameState, setGameState] = useState<GameState>(INITIAL_GAME_STATE);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<GameState>;
        if (Array.isArray(parsed.history) && parsed.history.length > 0) {
          setGameState(prev => ({ ...prev, ...parsed }));
          setGameStarted(true);
        }
      } catch (e) {
        console.error('Save load failed', e);
      }
    }
    hasLoadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    if (!gameStarted || gameState.history.length === 0) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
      } catch (e) {
        console.error('Save failed', e);
      }
    }, PERSIST_DEBOUNCE_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [gameState, gameStarted]);

  const resetGame = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    localStorage.removeItem(STORAGE_KEY);
    setGameState(INITIAL_GAME_STATE);
    setGameStarted(false);
  }, []);

  return { gameState, setGameState, gameStarted, setGameStarted, resetGame };
}
