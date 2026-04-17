
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AIResponse, AppSettings, Language, ImageSize, CharacterStats, InventoryItem, CharacterClass, Blessing, Reputation, Nemesis, SanctuaryState, Enemy, LocationInfo, Merchant, TextModel } from "../types";
import { getApiKey } from "../utils/apiKey";

const getAIClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key not configured. Please add your key in Settings.");
  }
  return new GoogleGenAI({ apiKey });
};

const getSystemInstruction = (language: Language) => {
  const lang = language === Language.German ? 'German (Deutsch)' : 'English';

  return `You are the Narrator and Rules Engine of INFINITY QUEST, a grounded fantasy RPG.
Respond in ${lang}. Return strict JSON matching the schema — nothing else.
Say "no" when the world says "no". The player's fun comes from constraints, not from getting everything they ask for.

=== REALISM CHARTER ===

1) CLASSIFY EVERY ACTION (before narrating).
   - TRIVIAL → narrate briefly, apply turn costs, deliver outcome.
   - CHALLENGING → return a skillCheck. Narrative stops before the outcome. DC scales:
       level 1–3 → DC 8–12 · level 4–7 → DC 12–16 · level 8+ → DC 14–20 · +2 if boss or Act 3 · +1 per 2 ascension levels.
   - IMPOSSIBLE → refuse in-character (the sigil sputters, the knot won't yield, the guard laughs).
       Do NOT add items, gold, HP, or XP. Do NOT invent escape hatches. DO offer 2–3 legal choices.

2) CAPABILITY GATES (the "impossible" list).
   - No conjuring items, gold, HP, or allies from thin air.
   - Magic requires INT ≥ 12 AND the specific spell/ability known. A Traveler cannot cast Fireball.
   - Heavy feats (break iron, shove a boulder) require STR ≥ 12; athletic feats require STA ≥ 12.
   - Stealth requires Rogue, darkness, or distraction. You cannot sneak past a goblin in broad daylight as a Warrior in plate.
   - No teleporting, time travel, fourth-wall breaks, meta-knowledge, or "I already know the password".
   - NPCs do not gift legendary items on polite request. Merchants do not give things away.
   - Social wins over powerful NPCs require CHA ≥ 14 AND good reputation AND a plausible angle.

3) TURN ECONOMY (apply on any turn that takes real time).
   - hungerChange: -2, thirstChange: -3 (a client floor applies if you forget). Double under Storm/Ash weather. Skip on pure dialogue.
   - HP never regenerates passively. Only items, rest, shrines, or explicit spells heal.
   - Do NOT touch adrenaline — the client handles it.
   - HUNGER/THIRST NARRATIVE CUES:
       • < 50: mention hunger/thirst sparingly ("your stomach grumbles").
       • < 25: a sentence of noticeable weakness.
       • = 0: the player is starving / dehydrating — the client will bleed HP automatically; describe the weakness, cracked lips, blurred vision.
   - FOOD & DRINK: when giving the player edible loot (bread, meat, berries, waterskin, potion, stew), you MUST set type to one of: "Food", "Drink", "Potion", or "Consumable", AND set the consumable object with realistic restore values:
       • Bread/apple → hungerRestore: 15–25
       • Cooked meat/stew → hungerRestore: 30–50
       • Waterskin/ale → thirstRestore: 25–40
       • Healing potion → hpRestore: 15–40
       • Mixed (stew + broth) may restore both hunger and thirst.
     Never set consumable on Weapons, Armor, Spellbooks, or Materials.

4) CONTINUITY.
   - Honor the last 10 turns. If the player killed the innkeeper, that inn is a crime scene.
   - Honor reputation: Hostile factions attack on sight; Friendly ones offer help; Exalted unlock rare options.
   - Honor active nemesis — they pursue, leave signs, reappear.
   - Never contradict what you previously narrated.

5) DIFFICULTY CURVE.
   - Encounter power scales with level + act + ascension. No wolves at level 15. No dragons at level 2 without narrative setup.
   - Boss fights get isBossFight: true and stand between acts.

6) COMBAT LOCK (when an enemy is active).
   - EVERY combat action (Attack, Defend, Spell, Flee) MUST return a skillCheck.
   - Narrative ends before the hit/miss: "You raise your blade, but the winds of fate are shifting..."
   - Never mark enemyDefeated unless the skill check has already resolved in the player's favor.

7) ECONOMY & LOOT.
   - Rarity distribution (base): common 60% · uncommon 25% · rare 10% · epic 4% · legendary 1%.
   - Add +2% epic/legendary per act. Never drop legendary from trivial encounters.
   - Gold for common mobs 5–25, scale linearly with act and enemy tier.
   - If the narrative says "you find 50 gold", goldChange MUST be 50. If it mentions a wolf pelt, it MUST be in inventory.

8) INVENTORY RULES.
   - Return the ENTIRE inventory array every turn (old items + new ones). Never omit existing gear.
   - Removed items (consumed, sold, broken) are simply absent from the returned array.
   - Do not invent items the player hasn't earned.

9) DICE TRIGGERS.
   - skillCheck: player-controlled risky actions (attack, lockpick, persuade, acrobatics, cast).
   - worldRoll: events the player does NOT control ("the ceiling groans..."). Provide label; leave result undefined so the dice decides.
   - Never trigger rolls on welcome, exposition, or pure dialogue turns.

11) ABILITIES, MANA, COOLDOWNS.
    - When granting abilities via newAbilities, always set: type ("passive" | "active" | "spell"), and for non-passives include manaCost (spells: 10-40) and cooldown (2-5 turns).
    - Passives grant always-on bonuses; narrate them when relevant but don't trigger on their own.
    - When the player USES an ability (the system override will say "ABILITY USE"), treat it as the intent; mana/cooldown are already spent client-side.
    - Reference the ability/spell by name in the narrative so the player knows it landed.

13) TRAVEL EVENTS.
    - A user message may be prefixed with "TRAVEL EVENT [id]: ..." — this is a setup the client injected, not player input.
    - Weave the event naturally into the narrative for this turn. Respect the event's intent (combat, merchant, shrine, etc.).
    - Only fire one worldRoll/skillCheck/combat per turn — don't compound.

12) EQUIPMENT.
    - Weapons/armor/trinkets can grant stat bonuses via the item's "stats" field (+1 to +4 per stat).
    - The per-turn prompt shows the equipped loadout AND a "Gear bonus" line summarizing bonuses.
    - Reference equipped weapons in attack narration ("you draw the rune-etched longsword").
    - When returning stats changes, return BASE stats only (do NOT include gear bonuses). The client sums them.

10) BRACKETS & VISUALS.
    - Wrap interactable entities in [[double brackets]]: enemies, notable NPCs, objects of interest.
    - Always fill visualPrompt (one evocative sentence, cinematic).
    - Fill portraitPrompt only when the player's appearance meaningfully changes.
`;
};

const statMod = (stat: number): string => {
  const mod = Math.floor((stat - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
};

interface TurnPromptArgs {
  userAction: string;
  inventory: InventoryItem[];
  quest: string;
  stats: CharacterStats;
  level: number;
  currentXp: number;
  nextLevelXp: number;
  playerClass: CharacterClass;
  blessings: Blessing[];
  reputation: Reputation[];
  nemesis: Nemesis | undefined;
  sanctuary: SanctuaryState | undefined;
  currentAct: number;
  actProgress: number;
  ascensionLevel: number;
  hunger: number;
  thirst: number;
  activeEnemy: Enemy | undefined;
  location: LocationInfo | undefined;
  activeMerchant: Merchant | undefined;
  maxHp: number;
  currentHp: number;
  currentMana: number;
  maxMana: number;
  abilities: { name: string; description: string; type?: string; manaCost?: number; cooldown?: number }[];
  abilityCooldowns: Record<string, number>;
  equipped: { weapon?: string; armor?: string; trinket?: string };
}

const buildTurnPrompt = (a: TurnPromptArgs): string => {
  const { stats } = a;
  const inv = a.inventory.length
    ? a.inventory.slice(0, 30).map(i => `- ${i.name} [${i.type}/${i.rarity}]`).join('\n')
    : '(empty)';

  const rep = a.reputation.map(r => `${r.faction.replace('The ', '')}: ${r.value} (${r.status})`).join(' · ') || '(none)';

  const blessings = a.blessings.length
    ? a.blessings.map(b => b.name).join(', ')
    : '(none)';

  const sanctuaryLine = a.sanctuary
    ? `Sanctuary: lib ${a.sanctuary.libraryLevel} · armory ${a.sanctuary.armoryLevel} · garden ${a.sanctuary.gardenLevel} · treasury ${a.sanctuary.treasuryLevel}`
    : '';

  const equippedLine = [
    a.equipped.weapon ? `Weapon: ${a.equipped.weapon}` : null,
    a.equipped.armor ? `Armor: ${a.equipped.armor}` : null,
    a.equipped.trinket ? `Trinket: ${a.equipped.trinket}` : null,
  ].filter(Boolean).join(' · ') || '(none equipped)';

  const gearBonus: Partial<CharacterStats> = {};
  (['weapon', 'armor', 'trinket'] as const).forEach(slot => {
    const name = a.equipped[slot];
    if (!name) return;
    const item = a.inventory.find(i => i.name === name);
    if (!item?.stats) return;
    (Object.keys(item.stats) as (keyof CharacterStats)[]).forEach(k => {
      const bonus = item.stats![k];
      if (typeof bonus === 'number') gearBonus[k] = (gearBonus[k] || 0) + bonus;
    });
  });
  const gearLine = Object.keys(gearBonus).length
    ? Object.entries(gearBonus).map(([k, v]) => `${v! > 0 ? '+' : ''}${v} ${k.toUpperCase().slice(0, 3)}`).join(' · ')
    : '(no gear bonuses)';

  const abilitiesLine = a.abilities.length
    ? a.abilities.map(ab => {
        const cd = a.abilityCooldowns[ab.name] || 0;
        const readiness = cd > 0 ? ` [cd:${cd}]` : '';
        const cost = ab.manaCost ? ` (${ab.manaCost}MP)` : '';
        return `${ab.name}${cost}${readiness}`;
      }).join(', ')
    : '(none yet)';

  return `PLAYER ACTION: ${a.userAction}

--- CHARACTER ---
Class: ${a.playerClass} | Level: ${a.level} (${a.currentXp}/${a.nextLevelXp} XP) | Act: ${a.currentAct} (${a.actProgress}%) | Ascension: ${a.ascensionLevel}
HP: ${a.currentHp}/${a.maxHp} | Mana: ${a.currentMana}/${a.maxMana} | Hunger: ${a.hunger}/100 | Thirst: ${a.thirst}/100
STR: ${stats.strength} (${statMod(stats.strength)}) · INT: ${stats.intelligence} (${statMod(stats.intelligence)}) · STA: ${stats.stamina} (${statMod(stats.stamina)}) · CHA: ${stats.charisma} (${statMod(stats.charisma)})
Equipped: ${equippedLine}
Gear bonus: ${gearLine}
Abilities: ${abilitiesLine}
Blessings: ${blessings}
${sanctuaryLine}

--- WORLD ---
Location: ${a.location ? `${a.location.name} (${a.location.biome}, ${a.location.weather})` : 'The Wilds'}
Active enemy: ${a.activeEnemy ? `${a.activeEnemy.name} (HP ${a.activeEnemy.currentHp}/${a.activeEnemy.maxHp}, ${a.activeEnemy.type})` : 'none'}
Active merchant: ${a.activeMerchant ? a.activeMerchant.name : 'none'}
Quest: ${a.quest || '(none yet)'}
Reputation: ${rep}
Nemesis: ${a.nemesis ? `${a.nemesis.name} — ${a.nemesis.origin}` : 'none'}

--- INVENTORY (${a.inventory.length} items) ---
${inv}

--- TASK ---
1) Classify the action: TRIVIAL, CHALLENGING, or IMPOSSIBLE (see Charter §1–2).
2) IMPOSSIBLE → refuse in-character with 2–3 legal choices. No items/gold/HP/XP added.
3) CHALLENGING → return a skillCheck. Narrative must stop before the outcome.
4) TRIVIAL → narrate briefly, apply hungerChange/thirstChange per §3, return consequences.
5) Honor continuity. Respect stat/inventory gates. Never fabricate items. Return the full inventory.`;
};

export const generateStoryTurn = async (
  historyText: string,
  userAction: string,
  currentInventory: InventoryItem[],
  currentQuest: string,
  currentStats: CharacterStats,
  currentLevel: number,
  currentXp: number,
  nextLevelXp: number,
  playerClass: CharacterClass,
  settings: AppSettings,
  activeBlessings: Blessing[],
  currentReputation: Reputation[],
  activeNemesis: Nemesis | undefined,
  sanctuary: SanctuaryState | undefined,
  currentAct: number,
  actProgress: number,
  ascensionLevel: number,
  currentHunger: number,
  currentThirst: number,
  activeEnemy: Enemy | undefined,
  currentLocation: LocationInfo | undefined,
  activeMerchant: Merchant | undefined,
  currentHp: number,
  maxHp: number,
  currentMana: number,
  maxMana: number,
  abilities: { name: string; description: string; type?: string; manaCost?: number; cooldown?: number }[],
  abilityCooldowns: Record<string, number>,
  equipped: { weapon?: string; armor?: string; trinket?: string }
): Promise<AIResponse> => {
  const ai = getAIClient();
  const modelName = String(settings?.textModel || TextModel.Pro);

  const prompt = buildTurnPrompt({
    userAction,
    inventory: currentInventory,
    quest: currentQuest,
    stats: currentStats,
    level: currentLevel,
    currentXp,
    nextLevelXp,
    playerClass,
    blessings: activeBlessings,
    reputation: currentReputation,
    nemesis: activeNemesis,
    sanctuary,
    currentAct,
    actProgress,
    ascensionLevel,
    hunger: currentHunger,
    thirst: currentThirst,
    activeEnemy,
    location: currentLocation,
    activeMerchant,
    maxHp,
    currentHp,
    currentMana,
    maxMana,
    abilities,
    abilityCooldowns,
    equipped,
  });

  const systemInstruction = getSystemInstruction(settings.language);

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            narrative: { type: Type.STRING },
            inventory: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  rarity: { type: Type.STRING, enum: ["common", "uncommon", "rare", "epic", "legendary"] },
                  type: { type: Type.STRING },
                  description: { type: Type.STRING },
                  value: { type: Type.NUMBER },
                  consumable: {
                    type: Type.OBJECT,
                    properties: {
                      hungerRestore: { type: Type.NUMBER },
                      thirstRestore: { type: Type.NUMBER },
                      hpRestore: { type: Type.NUMBER }
                    }
                  },
                  stats: {
                    type: Type.OBJECT,
                    properties: {
                      strength: { type: Type.NUMBER },
                      intelligence: { type: Type.NUMBER },
                      stamina: { type: Type.NUMBER },
                      charisma: { type: Type.NUMBER }
                    }
                  }
                },
                required: ["name", "rarity", "type"]
              }
            },
            combat: {
              type: Type.OBJECT,
              properties: {
                newEnemy: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    maxHp: { type: Type.NUMBER },
                    currentHp: { type: Type.NUMBER },
                    type: { type: Type.STRING }
                  },
                  required: ["name", "maxHp", "type"]
                },
                damageDealtToEnemy: { type: Type.NUMBER },
                enemyDefeated: { type: Type.BOOLEAN }
              }
            },
            merchant: {
               type: Type.OBJECT,
               properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  inventory: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, value: { type: Type.NUMBER } } } }
               }
            },
            location: {
               type: Type.OBJECT,
               properties: {
                  name: { type: Type.STRING },
                  biome: { type: Type.STRING },
                  weather: { type: Type.STRING, enum: ["Clear", "Rain", "Storm", "Snow", "Fog", "Ash"] }
               }
            },
            goldChange: { type: Type.NUMBER },
            currentQuest: { type: Type.STRING },
            visualPrompt: { type: Type.STRING },
            portraitPrompt: { type: Type.STRING },
            choices: { type: Type.ARRAY, items: { type: Type.STRING } },
            stats: {
              type: Type.OBJECT,
              properties: { strength: { type: Type.NUMBER }, intelligence: { type: Type.NUMBER }, stamina: { type: Type.NUMBER }, charisma: { type: Type.NUMBER } }
            },
            hpChange: { type: Type.NUMBER },
            hungerChange: { type: Type.NUMBER },
            thirstChange: { type: Type.NUMBER },
            level: { type: Type.NUMBER },
            currentXp: { type: Type.NUMBER },
            nextLevelXp: { type: Type.NUMBER },
            newAbilities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ["passive", "active", "spell"] },
                  manaCost: { type: Type.NUMBER },
                  cooldown: { type: Type.NUMBER }
                },
                required: ["name", "description", "type"]
              }
            },
            newCodexEntries: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  category: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["name", "category", "description"]
              }
            },
            reputationChange: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  faction: { type: Type.STRING, enum: ["The Solar Vanguard", "The Lunar Syndicate", "The Verdant Circle"] },
                  amount: { type: Type.NUMBER }
                },
                required: ["faction", "amount"]
              }
            },
            skillCheck: {
              type: Type.OBJECT,
              properties: {
                attribute: { type: Type.STRING, enum: ["strength", "intelligence", "stamina", "charisma"] },
                difficultyClass: { type: Type.NUMBER },
                reason: { type: Type.STRING }
              }
            },
            worldRoll: {
               type: Type.OBJECT,
               properties: {
                  label: { type: Type.STRING },
                  result: { type: Type.NUMBER }
               },
               required: ["label"]
            }
          },
          required: ["narrative", "inventory", "currentQuest", "visualPrompt", "choices", "stats", "level", "currentXp", "nextLevelXp"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No text returned from Gemini");
    return parseAIResponse(text, {
      currentInventory, currentQuest, currentStats, currentLevel, currentXp, nextLevelXp
    });
  } catch (error) {
    console.error("Error generating story:", error);
    return fallbackAIResponse({ currentInventory, currentQuest, currentStats, currentLevel, currentXp, nextLevelXp });
  }
};

interface FallbackContext {
  currentInventory: InventoryItem[];
  currentQuest: string;
  currentStats: CharacterStats;
  currentLevel: number;
  currentXp: number;
  nextLevelXp: number;
}

const fallbackAIResponse = (ctx: FallbackContext): AIResponse => ({
  narrative: "The world wavers...",
  inventory: ctx.currentInventory,
  currentQuest: ctx.currentQuest,
  visualPrompt: "A glitch in reality.",
  choices: ["Try again"],
  stats: ctx.currentStats,
  level: ctx.currentLevel,
  currentXp: ctx.currentXp,
  nextLevelXp: ctx.nextLevelXp,
});

const parseAIResponse = (raw: string, ctx: FallbackContext): AIResponse => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.error("AI response was not valid JSON:", e);
    return fallbackAIResponse(ctx);
  }

  if (!parsed || typeof parsed !== "object") {
    console.error("AI response was not an object");
    return fallbackAIResponse(ctx);
  }

  const obj = parsed as Record<string, unknown>;
  if (typeof obj.narrative !== "string" || !Array.isArray(obj.choices)) {
    console.error("AI response missing required fields (narrative/choices)");
    return fallbackAIResponse(ctx);
  }

  const response = obj as unknown as AIResponse;
  if (!Array.isArray(response.inventory)) response.inventory = ctx.currentInventory;
  if (typeof response.currentQuest !== "string") response.currentQuest = ctx.currentQuest;
  if (typeof response.visualPrompt !== "string") response.visualPrompt = "";
  if (!response.stats) response.stats = ctx.currentStats;
  if (typeof response.level !== "number") response.level = ctx.currentLevel;
  if (typeof response.currentXp !== "number") response.currentXp = ctx.currentXp;
  if (typeof response.nextLevelXp !== "number") response.nextLevelXp = ctx.nextLevelXp;

  return response;
};

export const generateSceneImage = async (
  visualPrompt: string, 
  size: ImageSize
): Promise<string | null> => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: { parts: [{ text: visualPrompt }] },
      config: { imageConfig: { aspectRatio: "16:9", imageSize: size } }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    return null;
  } catch (error) {
    console.error("Scene image generation failed:", error);
    return null;
  }
};

export const generateItemDetails = async (item: InventoryItem): Promise<{ lore: string; imageUrl: string | null }> => {
  const ai = getAIClient();
  let lore = "An artifact of power.";
  let imageUrl = null;
  try {
     const loreResp = await ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: `Cryptic 2-sentence lore for: ${item.name} (${item.rarity} ${item.type}).`
     });
     lore = loreResp.text || lore;

     const imgResp = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: { parts: [{ text: `Fantasy RPG Icon: ${item.name} (${item.type}). Isolated, detailed.` }] },
      config: { imageConfig: { aspectRatio: "1:1", imageSize: "1K" } }
    });
    for (const part of imgResp.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  } catch (e) {
    console.error("Item details generation failed:", e);
  }
  return { lore, imageUrl };
};

export const generateMapImage = async (locationName: string, biome: string): Promise<string | null> => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: { parts: [{ text: `Fantasy map of ${locationName} (${biome}). Ancient parchment.` }] },
      config: { imageConfig: { aspectRatio: "16:9", imageSize: "1K" } }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    return null;
  } catch (error) {
    console.error("Map image generation failed:", error);
    return null;
  }
};

export const generateEnemyImage = async (description: string): Promise<string | null> => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: { parts: [{ text: "Monster Portrait: " + description }] },
      config: { imageConfig: { aspectRatio: "1:1", imageSize: "1K" } }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    return null;
  } catch (error) {
    console.error("Enemy image generation failed:", error);
    return null;
  }
};

export const generateCharacterImage = async (portraitPrompt: string): Promise<string | null> => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: { parts: [{ text: portraitPrompt }] },
      config: { imageConfig: { aspectRatio: "1:1", imageSize: "1K" } }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    return null;
  } catch (error) {
    console.error("Character image generation failed:", error);
    return null;
  }
};

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export const generateAudio = async (text: string, voiceName: string = 'Kore'): Promise<string | null> => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return `data:audio/wav;base64,${base64Audio}`;
    }
    return null;
  } catch (error) {
    console.error("Audio generation error:", error);
    return null;
  }
};

export const checkApiKey = async (): Promise<boolean> => {
  if (getApiKey()) return true;
  if (typeof window.aistudio !== 'undefined' && window.aistudio.hasSelectedApiKey) {
    try {
      return await window.aistudio.hasSelectedApiKey();
    } catch {
      return false;
    }
  }
  return false;
};

export const requestApiKey = async (): Promise<void> => {
  if (typeof window.aistudio !== 'undefined' && window.aistudio.openSelectKey) {
    await window.aistudio.openSelectKey();
  }
};

export const isAiStudioAvailable = (): boolean =>
  typeof window !== 'undefined' && typeof window.aistudio?.openSelectKey === 'function';
