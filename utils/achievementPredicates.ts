import { GameState, MetaState } from '../types';

// Each predicate returns true the first moment its condition becomes true
// given the current GameState. The engine layers in de-dup via the
// `unlockedAchievements` array, so predicates can stay naive.
export type AchievementPredicate = (game: GameState, meta: MetaState) => boolean;

export const ACHIEVEMENT_PREDICATES: Record<string, AchievementPredicate> = {
  first_blood: (g) => g.history.some(t => /slain|defeated|vanquish|killed/i.test(t.text)) || g.adrenaline >= 40,
  hoarder: (g) => g.inventory.length >= 10,
  wealthy: (g) => g.gold >= 500,
  legendary_find: (g) => g.inventory.some(i => i.rarity === 'legendary'),
  social_butterfly: (g) => g.stats.charisma >= 16,
  survivor: (g) => g.level >= 5,
  beast_master: (g) => !!g.companion,
  faction_friend: (g) => g.reputation.some(r => r.status === 'Friendly' || r.status === 'Exalted'),
  ascended: (g) => g.isVictory,
  // `avenger` is fired imperatively from useGameTurn when a nemesis is slain;
  // it's not derivable from GameState alone, so it's absent here on purpose.
};
