import { ACHIEVEMENTS_LIST, BLESSINGS, GameState, MetaState } from '../types';
import { CLASS_UNLOCK_RULES, unlockedClassSet } from './progression';

export interface RunSummary {
  newAchievementTitles: string[];
  newClassNames: string[];
  newCodexCount: number;
  newNemesisName?: string;
  soulShardsBefore: number;
  newNemesisAvenged: boolean;
  nextUnlock?: {
    label: string;
    subtitle: string;
    distance: string;
  };
}

export const buildRunSummary = (game: GameState, meta: MetaState): RunSummary => {
  const snap = meta.runSnapshot;
  const achievementsBefore = new Set(snap?.achievementsAtStart ?? []);
  const classesBefore = new Set(snap?.classesAtStart ?? []);
  const nemesisBefore = snap?.nemesisAtStart;

  const newAchievements = (meta.unlockedAchievements ?? []).filter(id => !achievementsBefore.has(id));
  const newClasses = [...unlockedClassSet(meta)].filter(c => !classesBefore.has(c));

  const newAchievementTitles = newAchievements
    .map(id => ACHIEVEMENTS_LIST.find(a => a.id === id)?.title)
    .filter((t): t is string => !!t);

  const newCodexCount = game.codex.length; // all codex unlocks happen during the run

  // Was the run's nemesis cleared (avenged)?
  const newNemesisAvenged =
    !!nemesisBefore && !meta.activeNemesis;

  const newNemesisName = meta.activeNemesis && meta.activeNemesis.name !== nemesisBefore
    ? meta.activeNemesis.name
    : undefined;

  // What's next: cheapest still-locked class or still-unaffordable blessing.
  const unlockedNow = unlockedClassSet(meta);
  const nextLockedClass = CLASS_UNLOCK_RULES.find(r => !unlockedNow.has(r.id));

  let nextUnlock: RunSummary['nextUnlock'];
  if (nextLockedClass) {
    nextUnlock = {
      label: `Unlock the ${nextLockedClass.id}`,
      subtitle: nextLockedClass.requirement,
      distance: '',
    };
  } else {
    const affordableOrder = [...BLESSINGS].sort((a, b) => a.cost - b.cost);
    const shards = meta.soulShards;
    const next = affordableOrder.find(b => b.cost > shards);
    if (next) {
      nextUnlock = {
        label: `Buy ${next.name}`,
        subtitle: next.description,
        distance: `${next.cost - shards} more shards`,
      };
    }
  }

  return {
    newAchievementTitles,
    newClassNames: newClasses,
    newCodexCount,
    newNemesisName,
    newNemesisAvenged,
    soulShardsBefore: snap?.soulShardsAtStart ?? meta.soulShards,
    nextUnlock,
  };
};
