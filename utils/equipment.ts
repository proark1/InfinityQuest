import { CharacterStats, EquipSlot, EquippedLoadout, InventoryItem } from '../types';

const WEAPON_TYPES = ['weapon', 'sword', 'bow', 'staff', 'dagger', 'axe', 'mace', 'wand'];
const ARMOR_TYPES = ['armor', 'cloak', 'robe', 'helm', 'helmet', 'shield', 'plate', 'leather', 'boots', 'gauntlet', 'gloves'];
const TRINKET_TYPES = ['trinket', 'ring', 'amulet', 'charm', 'pendant', 'necklace', 'talisman'];

export function inferSlot(item: InventoryItem): EquipSlot | null {
  const t = item.type.toLowerCase();
  if (WEAPON_TYPES.some(k => t.includes(k))) return 'weapon';
  if (ARMOR_TYPES.some(k => t.includes(k))) return 'armor';
  if (TRINKET_TYPES.some(k => t.includes(k))) return 'trinket';
  return null;
}

export function isEquipped(item: InventoryItem, equipped: EquippedLoadout): boolean {
  return (
    equipped.weapon === item.name ||
    equipped.armor === item.name ||
    equipped.trinket === item.name
  );
}

export function effectiveStats(
  baseStats: CharacterStats,
  inventory: InventoryItem[],
  equipped: EquippedLoadout,
): CharacterStats {
  const stats: CharacterStats = { ...baseStats };
  (['weapon', 'armor', 'trinket'] as const).forEach(slot => {
    const name = equipped[slot];
    if (!name) return;
    const item = inventory.find(i => i.name === name);
    if (!item?.stats) return;
    (Object.keys(item.stats) as (keyof CharacterStats)[]).forEach(k => {
      const bonus = item.stats![k];
      if (typeof bonus === 'number') stats[k] = stats[k] + bonus;
    });
  });
  return stats;
}
