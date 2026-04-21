import { CharacterClass, InventoryItem, ItemRarity, MetaState, SanctuaryState } from '../types';

const RARITY_ORDER: ItemRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export interface SanctuaryBonuses {
  bonusHp: number;
  bonusGold: number;
  extraItems: InventoryItem[];
  loreHintLine?: string;
  rarityUpgrade: number;
}

export const computeSanctuaryBonuses = (sanctuary: SanctuaryState): SanctuaryBonuses => {
  const garden = Math.max(0, sanctuary.gardenLevel);
  const treasury = Math.max(0, sanctuary.treasuryLevel);
  const armory = Math.max(0, sanctuary.armoryLevel);
  const library = Math.max(0, sanctuary.libraryLevel);

  const extraItems: InventoryItem[] = [];
  for (let i = 0; i < garden; i++) {
    extraItems.push({
      name: i === 0 ? 'Waystone Ration' : `Waystone Ration ${i + 1}`,
      type: 'Food',
      rarity: 'common',
      description: 'A dried travel loaf from the Sanctuary Garden.',
      consumable: { hungerRestore: 25, hpRestore: 5 },
    });
  }
  if (treasury >= 1) {
    extraItems.push({
      name: 'Sanctuary Satchel',
      type: 'Trinket',
      rarity: 'uncommon',
      description: 'A worn pouch stamped with the Sanctuary sigil. Guards your coin.',
    });
  }

  return {
    bonusHp: garden * 10,
    bonusGold: treasury * 50,
    extraItems,
    loreHintLine: library > 0
      ? `Sanctuary Library L${library}: drop ${library} short lore hint${library > 1 ? 's' : ''} about this act's enemies and treasures in the opening narration.`
      : undefined,
    rarityUpgrade: armory,
  };
};

export const applyArmoryRarityUpgrade = (items: InventoryItem[], levels: number): InventoryItem[] => {
  if (levels <= 0) return items;
  return items.map(item => {
    const idx = RARITY_ORDER.indexOf(item.rarity);
    if (idx < 0) return item;
    const next = RARITY_ORDER[Math.min(RARITY_ORDER.length - 1, idx + levels)];
    return next === item.rarity ? item : { ...item, rarity: next };
  });
};

export const summarizeSanctuaryBonuses = (b: SanctuaryBonuses): string[] => {
  const lines: string[] = [];
  if (b.bonusHp > 0) lines.push(`+${b.bonusHp} Max HP (Garden)`);
  if (b.bonusGold > 0) lines.push(`+${b.bonusGold} Starting Gold (Treasury)`);
  if (b.rarityUpgrade > 0) lines.push(`+${b.rarityUpgrade} starter rarity (Armory)`);
  if (b.extraItems.length > 0) lines.push(`+${b.extraItems.length} Sanctuary item${b.extraItems.length > 1 ? 's' : ''}`);
  if (b.loreHintLine) lines.push('Library hints in opening narration');
  return lines;
};

// --- Class unlocks ---

export interface ClassUnlockRule {
  id: CharacterClass;
  /** Plain description shown to the player when the class is locked. */
  requirement: string;
  /** Returns true when `metaState` satisfies the unlock. */
  isUnlocked: (meta: MetaState) => boolean;
  /** When newly-satisfied at run end, fire a celebration. */
  awardedAfter?: 'actClear' | 'ascension' | 'friendlyFactions';
}

export const CLASS_UNLOCK_RULES: ClassUnlockRule[] = [
  {
    id: 'Mage',
    requirement: 'Clear Act 1 with any hero.',
    isUnlocked: (m) => m.pastHeroes.some(h => h.level >= 4) || (m.unlockedClasses ?? []).includes('Mage'),
    awardedAfter: 'actClear',
  },
  {
    id: 'Cleric',
    requirement: 'Befriend 2 factions in a single run.',
    isUnlocked: (m) =>
      (m.unlockedAchievements ?? []).includes('faction_friend') || (m.unlockedClasses ?? []).includes('Cleric'),
    awardedAfter: 'friendlyFactions',
  },
  {
    id: 'Paladin',
    requirement: 'Reach Ascension II.',
    isUnlocked: (m) => (m.ascensionLevel ?? 0) >= 2 || (m.unlockedClasses ?? []).includes('Paladin'),
    awardedAfter: 'ascension',
  },
  {
    id: 'Dreadblade',
    requirement: 'Reach Ascension IV.',
    isUnlocked: (m) => (m.ascensionLevel ?? 0) >= 4 || (m.unlockedClasses ?? []).includes('Dreadblade'),
    awardedAfter: 'ascension',
  },
];

export const unlockedClassSet = (meta: MetaState): Set<CharacterClass> => {
  const set = new Set<CharacterClass>(meta.unlockedClasses ?? []);
  set.add('Warrior');
  set.add('Rogue');
  for (const rule of CLASS_UNLOCK_RULES) {
    if (rule.isUnlocked(meta)) set.add(rule.id);
  }
  return set;
};
