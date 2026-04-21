import { useEffect, useRef, useState } from 'react';
import { Achievement, ACHIEVEMENTS_LIST, GameState, MetaState } from '../types';
import { ACHIEVEMENT_PREDICATES } from '../utils/achievementPredicates';
import { SoundManager } from '../utils/soundEffects';

interface Args {
  gameState: GameState;
  metaState: MetaState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  setMetaState: React.Dispatch<React.SetStateAction<MetaState>>;
}

// Watches game/meta state and surfaces a single active Achievement for the
// <AchievementToast>. Queues multiple unlocks and pops one at a time.
export function useAchievementEngine({ gameState, metaState, setGameState, setMetaState }: Args) {
  const [active, setActive] = useState<Achievement | null>(null);
  const queueRef = useRef<Achievement[]>([]);

  // Track which IDs we've already handled this session so React-18 double-invoke
  // (and quick successive state updates) don't re-fire the same toast.
  const seenRef = useRef<Set<string>>(new Set(metaState.unlockedAchievements ?? []));

  useEffect(() => {
    const already = new Set<string>([
      ...(metaState.unlockedAchievements ?? []),
      ...gameState.unlockedAchievements,
      ...seenRef.current,
    ]);

    const freshlyUnlocked: Achievement[] = [];
    for (const def of ACHIEVEMENTS_LIST) {
      if (already.has(def.id)) continue;
      const pred = ACHIEVEMENT_PREDICATES[def.id];
      if (!pred) continue;
      if (pred(gameState, metaState)) {
        freshlyUnlocked.push({ ...def, unlockedAt: Date.now() });
        seenRef.current.add(def.id);
      }
    }

    if (freshlyUnlocked.length === 0) return;

    const newIds = freshlyUnlocked.map(a => a.id);
    setGameState(prev => ({
      ...prev,
      unlockedAchievements: Array.from(new Set([...prev.unlockedAchievements, ...newIds])),
    }));
    setMetaState(prev => ({
      ...prev,
      unlockedAchievements: Array.from(new Set([...(prev.unlockedAchievements ?? []), ...newIds])),
    }));

    queueRef.current.push(...freshlyUnlocked);
    if (!active) {
      const next = queueRef.current.shift()!;
      SoundManager.playGold();
      setActive(next);
    }
  }, [gameState, metaState, setGameState, setMetaState, active]);

  const dismiss = () => {
    const next = queueRef.current.shift();
    setActive(next ?? null);
  };

  return { active, dismiss };
}
