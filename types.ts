
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface ConsumableEffect {
  hungerRestore?: number; // +N hunger on consume
  thirstRestore?: number; // +N thirst on consume
  hpRestore?: number;     // +N HP on consume
}

export interface InventoryItem {
  name: string;
  rarity: ItemRarity;
  type: string; // e.g., Weapon, Armor, Material, Spellbook, Food, Drink, Potion, Trinket
  description?: string;
  value?: number; // Gold value
  lore?: string; // Generated on inspection
  imageUrl?: string; // Generated on inspection
  consumable?: ConsumableEffect; // If set, item can be eaten/drunk/used to restore the listed stats
  stats?: Partial<CharacterStats>; // Stat bonuses applied while equipped (Weapon/Armor/Trinket only)
}

export type EquipSlot = 'weapon' | 'armor' | 'trinket';

export type EquippedLoadout = {
  [K in EquipSlot]?: string; // item name currently equipped in this slot
};

export interface Spell {
  name: string;
  level: number;
  description: string;
  requirement: string;
  manaCost: number;
}

export type StatusEffectType = 'Poison' | 'Burn' | 'Freeze' | 'Bleed' | 'Stun' | 'Regen';

export interface StatusEffect {
  type: StatusEffectType;
  duration: number; // turns
  intensity: number;
}

export interface FloatingText {
  id: string;
  text: string;
  type: 'damage' | 'heal' | 'gold' | 'xp' | 'info' | 'crit';
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
}

export interface Merchant {
  name: string;
  description: string;
  inventory: InventoryItem[];
}

export interface Ability {
  name: string;
  description: string;
  icon?: string;
  type?: 'passive' | 'active' | 'spell';
  manaCost?: number;
  cooldown?: number; // in turns
}

export interface Companion {
  name: string;
  species: string;
  personality: string;
  portraitUrl?: string;
  /** 0..10. Rises across runs as you adventure together. */
  bondLevel?: number;
  /** 0..99 progress toward the next bond level. Rolls over to bondLevel+1 when it hits 100. */
  bondXp?: number;
  /** Freeform accumulated memories ("Saved your life in the Ember Tomb"). */
  bondMemories?: string[];
}

export interface BondedCompanion extends Companion {
  /** Epoch ms. Used to sort recent bonds first at reunite-offer time. */
  lastSeenAt: number;
  /** The hero this companion walked with last. Gives the reunion flavor. */
  lastSeenWith?: string;
}

export interface Enemy {
  name: string;
  description: string;
  currentHp: number;
  maxHp: number;
  imageUrl?: string;
  type: string; // "Beast", "Undead", etc.
  statusEffects: StatusEffect[];
}

export type WeatherType = 'Clear' | 'Rain' | 'Storm' | 'Snow' | 'Fog' | 'Ash';

export interface LocationInfo {
  name: string;
  description: string;
  biome: string; // "Forest", "Dungeon", "City"
  weather: WeatherType; 
}

export interface CharacterVoiceProfile {
  name: string;
  voiceDescription: string;
}

export interface CharacterStats {
  strength: number;
  intelligence: number;
  stamina: number;
  charisma: number;
}

export type CharacterClass =
  | 'Warrior'
  | 'Mage'
  | 'Rogue'
  | 'Cleric'
  | 'Paladin'
  | 'Dreadblade'
  | 'Traveler';

export type CodexCategory = 'Bestiary' | 'Atlas';

export interface CodexEntry {
  id: string;
  name: string;
  category: CodexCategory;
  description: string;
  dateUnlocked: number;
}

export interface SkillCheck {
  attribute: keyof CharacterStats;
  difficultyClass: number; // The target number to beat
  reason: string; // "to jump the chasm"
}

export interface WorldRoll {
  label: string; // "The Goblin swings..."
  result?: number; // Optional predefined result
}

export interface CraftingResult {
  success: boolean;
  message: string; // "You successfully forged..." or "The items crumbled..."
  producedItem?: InventoryItem;
}

// --- FACTIONS & ACHIEVEMENTS ---

export type FactionName = 'The Solar Vanguard' | 'The Lunar Syndicate' | 'The Verdant Circle';

export interface Reputation {
  faction: FactionName;
  value: number; // -100 to 100
  status: 'Hostile' | 'Neutral' | 'Friendly' | 'Exalted';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: number;
}

// --- META PROGRESSION TYPES ---

export interface Blessing {
  id: string;
  name: string;
  description: string;
  cost: number;
  effect: string; // Description for UI
}

export interface PastHero {
  id: string;
  name: string;
  class: CharacterClass;
  level: number;
  date: number;
  score: number;
  causeOfDeath: string;
  portraitUrl?: string;
  ascensionLevel: number;
}

export interface Nemesis {
  name: string;
  origin: string; // "Killer of [Hero Name]"
  defeatedAt: number;
}

export interface SanctuaryState {
  libraryLevel: number; // Knowledge/Hints
  armoryLevel: number; // Starting Stats
  gardenLevel: number; // Starting Consumables
  treasuryLevel: number; // Starting Gold
}

export interface LegacyItem extends InventoryItem {
  buriedBy: string;
  buriedAt: number;
  note: string;
}

export type TypewriterSpeed = 'instant' | 'fast' | 'normal' | 'slow';

export interface RunSnapshot {
  // Snapshot of meta state taken when a run *started*. Compared at run end to
  // show what the player unlocked during the run (codex, achievements, classes,
  // nemesis). Kept optional for backwards compatibility with old saves.
  achievementsAtStart: string[];
  classesAtStart: string[];
  codexIdsAtStart: string[];
  soulShardsAtStart: number;
  nemesisAtStart?: string;
}

export interface MetaState {
  soulShards: number;
  pastHeroes: PastHero[];
  lastOracleClaim: number; // Timestamp
  activeNemesis?: Nemesis; // The villain hunting the player
  sanctuary: SanctuaryState;
  legacyItems: LegacyItem[];
  ascensionLevel: number; // 0 = Base, 1+ = NG+
  unlockedAchievements: string[]; // IDs persisted across runs
  unlockedClasses: CharacterClass[]; // Classes available on next run
  typewriterSpeed: TypewriterSpeed; // UI preference, persists across runs
  nemesesDefeated: number; // Lifetime count; grants the Avenger badge
  runSnapshot?: RunSnapshot; // Refreshed when a run starts, read at run end
  /** First-run onboarding has been completed at least once on this machine. */
  tutorialCompleted?: boolean;
  /** User has not disabled context-sensitive toasts. Defaults to on. */
  nudgesEnabled?: boolean;
  /** Persistent audio preferences. Split so players can mute music and keep SFX. */
  masterVolume?: number; // 0..1
  musicVolume?: number;  // 0..1
  sfxEnabled?: boolean;  // defaults true
  musicEnabled?: boolean; // defaults true
  /** Companions persist across runs; we offer a reunion on the next run. */
  bondedCompanions?: BondedCompanion[];
  /** Cached NPC portrait URLs keyed by exact name. Survives runs. */
  npcPortraits?: Record<string, string>;
}

export interface GameState {
  inventory: InventoryItem[];
  gold: number; // New Economy
  currentQuest: string;
  history: GameTurn[];
  characterRegistry: CharacterVoiceProfile[];
  isGameOver: boolean;
  gameOverCause?: string; // Specific killer name
  isVictory: boolean; // Did they beat Act 3?
  
  // RPG System
  playerClass: CharacterClass;
  title: string;
  level: number;
  currentXp: number;
  nextLevelXp: number;
  stats: CharacterStats;
  currentHp: number;
  maxHp: number;
  adrenaline: number; // 0-100 Limit Break Meter
  flowStreak: number; // 0+ Combo counter. Resets on damage taken.
  statusEffects: StatusEffect[];
  
  // Survival System
  hunger: number; // 0-100 (0 = Starvation)
  thirst: number; // 0-100 (0 = Dehydration)
  
  abilities: Ability[];
  abilityCooldowns: Record<string, number>; // ability name -> turns remaining
  currentMana: number;
  maxMana: number;
  equipped: EquippedLoadout;
  codex: CodexEntry[];
  portraitUrl?: string;
  companion?: Companion;
  
  // Combat & World
  activeEnemy?: Enemy;
  activeMerchant?: Merchant; // New: Trading
  location?: LocationInfo;
  maps: Record<string, string>; // Map of LocationName -> ImageUrl
  
  // Structure
  currentAct: number; // 1, 2, 3
  actProgress: number; // 0-100
  isBossFight: boolean;
  ascensionLevel: number; // Current difficulty tier

  // Social
  reputation: Reputation[];
  unlockedAchievements: string[]; // IDs of unlocked achievements
  
  // Roguelite
  activeBlessings: Blessing[];
  activeNemesis?: Nemesis; // Injected from Meta
  
  // Run Specific
  foundShrine?: boolean; // If true, UI allows burying an item

  // AI director / quest compass. Short strings shown above the input.
  currentBeat?: string; // "Find a way into the temple."
  sideLead?: string;    // "The bard mentioned a hidden tunnel."

  // Counters the director uses to detect stuck/cruising patterns.
  directorStats?: {
    failedChecksInARow: number;
    successesInARow: number;
    lowStakeTurns: number; // turns without meaningful progress
    lastInterventionTurn: number; // index into history
  };
}

export interface GameTurn {
  id: string;
  role: 'user' | 'model';
  text: string;
  choices?: string[];
  imageUrl?: string;
  imageLoading?: boolean;
  audioUrl?: string;
  audioLoading?: boolean;
  audioError?: string;
  rollResult?: { total: number; success: boolean; dc: number }; // If this turn involved a roll
  isBossTurn?: boolean; // Visual flair for boss dialogue
}

export interface CombatUpdate {
  newEnemy?: Enemy;
  damageDealtToEnemy?: number;
  enemyDefeated?: boolean;
  playerStatusApplied?: StatusEffect[];
  enemyStatusApplied?: StatusEffect[];
}

export interface AIResponse {
  narrative: string;
  inventory: InventoryItem[]; // Structured inventory
  goldChange?: number; // +/- Gold
  currentQuest: string;
  visualPrompt: string;
  portraitPrompt?: string; // Prompt to generate character avatar
  choices: string[];
  
  // RPG Updates
  stats: CharacterStats;
  hpChange?: number; // +5 or -10
  hungerChange?: number; // -2 (time) or +20 (eating)
  thirstChange?: number; // -3 (time) or +30 (drinking)
  
  // Combat
  combat?: CombatUpdate;
  
  // Location
  location?: LocationInfo;
  
  causeOfDeath?: string; // If hpChange kills player, who did it?
  level: number;
  currentXp: number;
  nextLevelXp: number;
  newAbilities?: Ability[]; // Options for level up
  
  // Structure Updates
  actProgressChange?: number; // +10 or +20
  isBossFight?: boolean;
  isVictory?: boolean; // Beat the game

  // Social
  reputationChange?: { faction: FactionName; amount: number }[];
  
  // Skill Check Request (Pauses game)
  skillCheck?: SkillCheck;
  
  // World/Narrator Roll (UI Roll)
  worldRoll?: WorldRoll;

  // Codex Updates
  newCodexEntries?: CodexEntry[];

  // Companion
  newCompanion?: Companion; // If the player gains a companion
  
  // Crafting
  craftingResult?: CraftingResult; // If the player attempted to craft
  
  // New: Merchant
  merchant?: Merchant;

  // Legacy System
  foundShrine?: boolean; // AI signals that the player is at a shrine

  // True if the narrator confirms the active nemesis was slain this turn.
  nemesisDefeated?: boolean;

  // Quest compass strings — shown above the action input.
  nextBeat?: string;
  sideLead?: string;

  // If the AI wants a durable NPC portrait, it emits prompts the client can
  // fulfill (and cache) once per name. Rate-limited by the client.
  npcPortraits?: { name: string; prompt: string }[];

  // Skill-check outcome threaded back so the director can notice fail/success
  // streaks. Populated by the client after a roll, not by the model.
  skillCheckOutcome?: 'success' | 'failure' | 'critSuccess' | 'critFailure';
}

export enum ImageSize {
  Size_1K = '1K',
  Size_2K = '2K',
  Size_4K = '4K',
}

export enum TextModel {
  Pro = 'gemini-3-pro-preview',
  FlashLite = 'gemini-flash-lite-latest',
}

export enum Language {
  English = 'en',
  German = 'de',
}

export type LiveVoice = 'Puck' | 'Charon' | 'Kore' | 'Fenrir';

export interface AppSettings {
  textModel: TextModel;
  imageSize: ImageSize;
  autoGenerateImages: boolean;
  language: Language;
}

export type GameStateUpdate = (newState: Partial<GameState>) => void;
export type CharacterRegistrationHandler = (name: string, description: string) => void;
export type StatUpdateHandler = (newStats: CharacterStats) => void;
export type SurvivalUpdateHandler = (hungerChange: number, thirstChange: number) => void;
export type XpUpdateHandler = (xpAdded: number, levelUp: boolean) => void;
export type InventoryUpdateHandler = (items: InventoryItem[]) => void;

// --- CONSTANTS ---

export const BLESSINGS: Blessing[] = [
  { id: 'titan_blood', name: "Titan's Blood", description: "Start with +10 Max HP.", cost: 100, effect: "+10 HP" },
  { id: 'scholar_mind', name: "Scholar's Mind", description: "Start with +2 Intelligence.", cost: 150, effect: "+2 INT" },
  { id: 'warrior_spirit', name: "Warrior's Spirit", description: "Start with +2 Strength.", cost: 150, effect: "+2 STR" },
  { id: 'merchant_favor', name: "Merchant's Favor", description: "Start with a Rare item.", cost: 300, effect: "Rare Item" },
  { id: 'legendary_lineage', name: "Legendary Lineage", description: "Higher chance to find Epic/Legendary loot.", cost: 500, effect: "Better Loot" },
];

export const ACHIEVEMENTS_LIST: Achievement[] = [
  { id: 'first_blood', title: 'First Blood', description: 'Survive your first combat encounter.', icon: 'sword' },
  { id: 'hoarder', title: 'Hoarder', description: 'Have 10 or more items in your inventory.', icon: 'backpack' },
  { id: 'wealthy', title: 'Wealthy', description: 'Amass 500 Gold.', icon: 'coins' },
  { id: 'legendary_find', title: 'Treasure Hunter', description: 'Find a Legendary item.', icon: 'star' },
  { id: 'social_butterfly', title: 'Diplomat', description: 'Reach 16 Charisma.', icon: 'message-circle' },
  { id: 'survivor', title: 'Survivor', description: 'Reach Level 5.', icon: 'crown' },
  { id: 'beast_master', title: 'Beast Master', description: 'Gain a Companion.', icon: 'paw-print' },
  { id: 'faction_friend', title: 'Ally', description: 'Reach "Friendly" status with any faction.', icon: 'flag' },
  { id: 'ascended', title: 'Ascended', description: 'Complete Act 3 and Ascend.', icon: 'zap' },
  { id: 'avenger', title: 'Avenger', description: 'Slay a nemesis that once killed you.', icon: 'skull' },
];

export const SPELLBOOK_DATA: Spell[] = [
  { name: 'Fireball', level: 1, description: 'Unleash a sphere of flame dealing massive fire damage.', requirement: 'Learn from an Ember Spirit or mixing Charcoal and Sulfur.', manaCost: 30 },
  { name: 'Mage Hand', level: 1, description: 'A spectral hand that can interact with objects at distance.', requirement: 'Default basic spell.', manaCost: 5 },
  { name: 'Frost Nova', level: 1, description: 'Freeze all enemies in a short radius.', requirement: 'Acquire Frozen Essence.', manaCost: 25 },
  { name: 'Arcane Missiles', level: 1, description: 'Rapid bursts of magical energy.', requirement: 'Default basic spell.', manaCost: 15 },
  { name: 'Heal Wound', level: 1, description: 'Knit flesh back together using raw magic.', requirement: 'Acquire Blessed Water.', manaCost: 20 },
  { name: 'Invisibility', level: 2, description: 'Become unseen for a short duration.', requirement: 'Mixing Void Dust and Cloud Vapor.', manaCost: 40 }
];
