import { useCallback, useEffect, useRef, useState } from 'react';
import { GameState } from '../types';
import {
  CORRUPT_BACKUP_SUFFIX,
  INITIAL_GAME_STATE,
  PERSIST_DEBOUNCE_MS,
  PERSISTED_IMAGE_TAIL,
  SCHEMA_VERSION,
  STORAGE_KEY,
} from '../utils/constants';

export type PersistWarning = 'corrupt' | 'quota' | 'unavailable';

interface UsePersistedGameState {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  gameStarted: boolean;
  setGameStarted: React.Dispatch<React.SetStateAction<boolean>>;
  resetGame: () => void;
  persistWarning: PersistWarning | null;
  clearPersistWarning: () => void;
  /** A previously-saved run is loaded in memory but not yet started. */
  hasSavedRun: boolean;
  /** Resume the loaded save — flips the game into the active view. */
  continueSavedRun: () => void;
}

interface PersistedEnvelope {
  schemaVersion: number;
  state: GameState;
}

// Strip large base64 image URLs from all but the last N turns. The inventory
// images and enemy image live elsewhere and are regenerated on demand.
const stripHeavyFields = (state: GameState): GameState => {
  const history = state.history.map((turn, index, arr) => {
    const keep = index >= arr.length - PERSISTED_IMAGE_TAIL;
    if (keep) return turn;
    if (!turn.imageUrl && !turn.audioUrl) return turn;
    return { ...turn, imageUrl: undefined, audioUrl: undefined };
  });
  return { ...state, history };
};

const safeWrite = (value: string): PersistWarning | null => {
  try {
    localStorage.setItem(STORAGE_KEY, value);
    return null;
  } catch (err) {
    const name = err instanceof Error ? err.name : '';
    if (name === 'QuotaExceededError' || /quota/i.test(String(err))) return 'quota';
    return 'unavailable';
  }
};

export function usePersistedGameState(): UsePersistedGameState {
  const [gameState, setGameState] = useState<GameState>(INITIAL_GAME_STATE);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [hasSavedRun, setHasSavedRun] = useState<boolean>(false);
  const [persistWarning, setPersistWarning] = useState<PersistWarning | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      setPersistWarning('unavailable');
      hasLoadedRef.current = true;
      return;
    }

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as PersistedEnvelope | Partial<GameState>;
        const envelope = (parsed as PersistedEnvelope).schemaVersion === SCHEMA_VERSION
          ? (parsed as PersistedEnvelope).state
          : null;
        // Legacy (pre-envelope) saves: accept if the shape looks sane.
        const legacyState = envelope
          ? null
          : (parsed && typeof parsed === 'object' && Array.isArray((parsed as GameState).history)
            ? parsed as GameState
            : null);
        const loaded = envelope ?? legacyState;
        if (loaded && Array.isArray(loaded.history) && loaded.history.length > 0) {
          setGameState({ ...INITIAL_GAME_STATE, ...loaded });
          // Present the saved run as a "Continue your story" CTA on the title
          // screen; the player opts back in instead of being dropped mid-scene.
          setHasSavedRun(true);
        } else if (!loaded) {
          throw new Error('unrecognized-save-shape');
        }
      } catch {
        try {
          localStorage.setItem(STORAGE_KEY + CORRUPT_BACKUP_SUFFIX, saved);
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignore — the next save will try again
        }
        setPersistWarning('corrupt');
      }
    }
    hasLoadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    if (!gameStarted || gameState.history.length === 0) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const envelope: PersistedEnvelope = {
        schemaVersion: SCHEMA_VERSION,
        state: stripHeavyFields(gameState),
      };
      const payload = JSON.stringify(envelope);
      const result = safeWrite(payload);
      if (result === 'quota') {
        // Retry once with no maps and no base64 images at all.
        const minimalState: GameState = { ...envelope.state, maps: {}, portraitUrl: undefined };
        const fallback = safeWrite(JSON.stringify({ ...envelope, state: minimalState }));
        setPersistWarning(fallback ?? 'quota');
      } else if (result) {
        setPersistWarning(result);
      }
    }, PERSIST_DEBOUNCE_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [gameState, gameStarted]);

  const resetGame = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setGameState(INITIAL_GAME_STATE);
    setGameStarted(false);
    setHasSavedRun(false);
    setPersistWarning(null);
  }, []);

  const continueSavedRun = useCallback(() => {
    setGameStarted(true);
    setHasSavedRun(false);
  }, []);

  const clearPersistWarning = useCallback(() => setPersistWarning(null), []);

  return {
    gameState,
    setGameState,
    gameStarted,
    setGameStarted,
    resetGame,
    persistWarning,
    clearPersistWarning,
    hasSavedRun,
    continueSavedRun,
  };
}
