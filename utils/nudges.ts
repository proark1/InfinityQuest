import { GameState } from '../types';

export interface Nudge {
  id: string;           // unique per firing condition; used for throttle
  message: string;
  // Optional tap target: we just pulse the sidebar/inventory etc. CSS hook.
  target?: 'sidebar' | 'inventory' | 'abilities' | 'codex' | 'input' | 'camp';
}

const has = (g: GameState, predicate: (name: string) => boolean) =>
  g.inventory.some(i => predicate(i.name.toLowerCase()) || predicate(i.type.toLowerCase()));

const hasFood = (g: GameState) =>
  has(g, n => /bread|ration|stew|meat|apple|fruit|berry|food/.test(n));

const hasDrink = (g: GameState) =>
  has(g, n => /water|ale|wine|drink|potion/.test(n));

const hasPotion = (g: GameState) =>
  g.inventory.some(i => /potion/i.test(i.name) && i.consumable?.hpRestore);

const hasReadyAbility = (g: GameState) =>
  g.abilities.some(a => (g.abilityCooldowns[a.name] ?? 0) === 0 && (a.manaCost ?? 0) <= g.currentMana);

/**
 * Ordered nudge rules. We emit at most one nudge per turn, so only the FIRST
 * matching rule fires — order by severity. A nudge is throttled by id so the
 * same advice doesn't repeat every turn while the condition persists.
 */
export const selectNudge = (game: GameState, recentIds: string[]): Nudge | null => {
  const fired = new Set(recentIds);

  // Starvation/dehydration is critical — always tell the player there's a fix.
  if (game.hunger < 25 && hasFood(game) && !fired.has('hunger-low')) {
    return {
      id: 'hunger-low',
      message: `You're hungry. Try "Eat ${bestFood(game)}" or tap a food item in your pack.`,
      target: 'inventory',
    };
  }
  if (game.thirst < 25 && hasDrink(game) && !fired.has('thirst-low')) {
    return {
      id: 'thirst-low',
      message: `You're parched. Try "Drink ${bestDrink(game)}".`,
      target: 'inventory',
    };
  }

  // Combat lifesaver.
  if (game.activeEnemy && game.currentHp > 0 && game.currentHp / Math.max(1, game.maxHp) < 0.35 && hasPotion(game) && !fired.has('hp-low-combat')) {
    return {
      id: 'hp-low-combat',
      message: 'Low HP in combat — you have a healing potion. Press Heal or say "Drink Potion".',
      target: 'inventory',
    };
  }

  // Ability education — once per run the first time a ready ability exists.
  if (game.activeEnemy && hasReadyAbility(game) && !fired.has('ability-ready-combat')) {
    const ready = game.abilities.find(a => (game.abilityCooldowns[a.name] ?? 0) === 0 && (a.manaCost ?? 0) <= game.currentMana);
    if (ready) {
      return {
        id: 'ability-ready-combat',
        message: `${ready.name} is ready. Tap it on your hotbar to cast.`,
        target: 'abilities',
      };
    }
  }

  // First ability ever — even out of combat.
  if (game.abilities.length > 0 && !fired.has('first-ability')) {
    return {
      id: 'first-ability',
      message: `You learned ${game.abilities[0].name}. It lives on your ability hotbar above the input.`,
      target: 'abilities',
    };
  }

  // First inventory item ever.
  if (game.inventory.length > 0 && !fired.has('first-item')) {
    return {
      id: 'first-item',
      message: 'Tap an item in your inventory to inspect it — or right-click for fast inspect.',
      target: 'inventory',
    };
  }

  // First codex entry earned.
  if (game.codex.length > 0 && !fired.has('first-codex')) {
    return {
      id: 'first-codex',
      message: `Discovery recorded in your Codex. Tap the ${game.codex[0].category} tab to read more.`,
      target: 'codex',
    };
  }

  // Limit break primed.
  if (game.adrenaline >= 100 && game.activeEnemy && !fired.has('limit-break-ready')) {
    return {
      id: 'limit-break-ready',
      message: 'Limit Break charged — tap the glowing button above the combat row.',
    };
  }

  // Safe window — suggest camp once per run if the player hasn't.
  if (!game.activeEnemy && !game.activeMerchant && game.currentHp / Math.max(1, game.maxHp) < 0.6 && !fired.has('try-camp')) {
    return {
      id: 'try-camp',
      message: 'HP running low. Look for a quiet place and press "Make Camp" to rest.',
      target: 'camp',
    };
  }

  return null;
};

const bestFood = (game: GameState): string => {
  const food = game.inventory.find(i => i.consumable?.hungerRestore) ?? game.inventory.find(i => /bread|ration|stew|meat|food/i.test(i.name));
  return food?.name ?? 'food';
};

const bestDrink = (game: GameState): string => {
  const drink = game.inventory.find(i => i.consumable?.thirstRestore) ?? game.inventory.find(i => /water|ale|wine|drink/i.test(i.name));
  return drink?.name ?? 'water';
};
