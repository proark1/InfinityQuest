import { CharacterStats, GameState, MetaState, Reputation, SanctuaryState } from '../types';

export const STORAGE_KEY = 'infinity_quest_save_v4';
export const META_STORAGE_KEY = 'infinity_quest_meta_v1';
export const CORRUPT_BACKUP_SUFFIX = '_corrupt_backup';

// Incremented whenever GameState / MetaState shape changes in a breaking way.
// Saves with a mismatched schemaVersion are reset to INITIAL (with a backup kept).
export const SCHEMA_VERSION = 1;

// Keep the last N turns' base64 images in the persisted save. Older turn images
// are stripped to keep localStorage under the ~5 MB quota.
export const PERSISTED_IMAGE_TAIL = 5;

export const FLOATING_TEXT_DURATION_MS = 1500;
export const ORACLE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
export const PERSIST_DEBOUNCE_MS = 500;

export const REPUTATION_MIN = -100;
export const REPUTATION_MAX = 100;
export const HUNGER_THIRST_MAX = 100;
export const ADRENALINE_MAX = 100;

export const INITIAL_HP = 20;
export const SANCTUARY_UPGRADE_BASE_COST = 200;
export const HISTORY_CONTEXT_WINDOW = 20;

export const MANA_PER_INT_POINT = 5;
export const MANA_REGEN_PER_TURN_PCT = 10; // % of maxMana regenerated each turn
export const DEFAULT_ABILITY_MANA_COST = 10;
export const DEFAULT_ABILITY_COOLDOWN = 2;

export const REST_HP_RESTORE_PCT = 50;
export const REST_HUNGER_COST = 20;
export const REST_THIRST_COST = 20;
export const REST_NIGHT_ENCOUNTER_CHANCE = 0.25;

export const TRAVEL_EVENT_CHANCE = 0.4;
export const TRAVEL_KEYWORDS = ['walk', 'travel', 'ride', 'continue', 'journey', 'head ', 'go to', 'march', 'move on', 'set out', 'trek'];

export const DEFAULT_STATS: CharacterStats = {
  strength: 10,
  intelligence: 10,
  stamina: 10,
  charisma: 10,
};

export const DEFAULT_SANCTUARY: SanctuaryState = {
  libraryLevel: 0,
  armoryLevel: 0,
  gardenLevel: 0,
  treasuryLevel: 0,
};

export const INITIAL_REPUTATION: Reputation[] = [
  { faction: 'The Solar Vanguard', value: 0, status: 'Neutral' },
  { faction: 'The Lunar Syndicate', value: 0, status: 'Neutral' },
  { faction: 'The Verdant Circle', value: 0, status: 'Neutral' },
];

export const INITIAL_GAME_STATE: GameState = {
  inventory: [],
  gold: 0,
  currentQuest: '',
  history: [],
  characterRegistry: [],
  isGameOver: false,
  isVictory: false,
  level: 1,
  currentXp: 0,
  nextLevelXp: 1000,
  stats: DEFAULT_STATS,
  currentHp: INITIAL_HP,
  maxHp: INITIAL_HP,
  adrenaline: 0,
  flowStreak: 0,
  statusEffects: [],
  hunger: HUNGER_THIRST_MAX,
  thirst: HUNGER_THIRST_MAX,
  abilities: [],
  abilityCooldowns: {},
  currentMana: 0,
  maxMana: DEFAULT_STATS.intelligence * MANA_PER_INT_POINT,
  equipped: {},
  playerClass: 'Traveler',
  title: 'Novice',
  codex: [],
  activeBlessings: [],
  reputation: INITIAL_REPUTATION,
  unlockedAchievements: [],
  currentAct: 1,
  actProgress: 0,
  isBossFight: false,
  ascensionLevel: 0,
  maps: {},
};

export const INITIAL_META_STATE: MetaState = {
  soulShards: 0,
  pastHeroes: [],
  lastOracleClaim: 0,
  sanctuary: DEFAULT_SANCTUARY,
  legacyItems: [],
  ascensionLevel: 0,
};

export const REPUTATION_STATUS = (value: number): Reputation['status'] => {
  if (value >= 80) return 'Exalted';
  if (value >= 20) return 'Friendly';
  if (value <= -20) return 'Hostile';
  return 'Neutral';
};

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const newId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
};
