
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AIResponse, AppSettings, Language, ImageSize, CharacterStats, InventoryItem, CharacterClass, Blessing, Reputation, Nemesis, SanctuaryState, Enemy, LocationInfo, Merchant, WeatherType, TextModel } from "../types";

// Helper to get the AI client. 
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key not found in process.env");
  }
  return new GoogleGenAI({ apiKey: apiKey });
};

const getSystemInstruction = (
    language: Language, 
    playerClass: string, 
    activeBlessings: Blessing[], 
    reputation: Reputation[], 
    activeNemesis: Nemesis | undefined, 
    sanctuary: SanctuaryState | undefined,
    currentAct: number,
    ascensionLevel: number,
    activeEnemy: Enemy | undefined,
    activeMerchant: Merchant | undefined
) => {
  let blessingText = "";
  if (activeBlessings && activeBlessings.length > 0) {
     blessingText = "\nACTIVE BLESSINGS (META-PROGRESSION):\n" + activeBlessings.map(b => `- ${b.name}: ${b.description}`).join('\n');
  }

  let enemyText = "";
  if (activeEnemy) {
     enemyText = `\nCURRENT COMBAT: Player is fighting [[${activeEnemy.name}]] (HP: ${activeEnemy.currentHp}/${activeEnemy.maxHp}).
     - !!! COMBAT LOCK RULE !!!: You ARE PROHIBITED from determining if an attack hits or misses. 
     - FOR EVERY combat action (Attack, Defend, Spell, Flee), you MUST return a 'skillCheck' object.
     - The 'narrative' must stop exactly before the outcome: "You raise your weapon and strike, but the winds of fate are shifting..."
     - Do not kill enemies in the narrative unless 'combat.enemyDefeated' is true.`;
  }

  return `
You are the Game Engine and Dungeon Master of an infinite RPG. 

*** CORE DIRECTIVES (STRICT) ***

1. DICE ROLLING (COMBAT & SKILL):
   - ONLY trigger 'skillCheck' or 'worldRoll' during COMBAT, TRAPS, LOCKPICKING, or meaningful RISKY actions.
   - !!! DO NOT TRIGGER DICE ROLLS DURING INITIAL WELCOME OR STORY EXPOSITION turns. !!!
   - Narrative should be suspenseful and stop at the roll when one is required.

2. LOOT & INVENTORY CONSISTENCY:
   - If the narrative says "You found 50 gold", 'goldChange' MUST be 50.
   - If the narrative says "You find a wolf fur", that exact item MUST appear in the 'inventory' array.
   - You MUST return the ENTIRE inventory list (current items + new items). Never omit existing gear.

3. DYNAMIC WORLD:
   - Wrap interactable entities in double brackets: [[Entity Name]].
   - Use 'worldRoll' for events the player doesn't control (e.g., "The roof begins to collapse...").

CONTEXT:
PLAYER CLASS: ${playerClass}
ACT: ${currentAct}
${blessingText}
${enemyText}

Return strict JSON matching the schema.
`;
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
  activeMerchant: Merchant | undefined
): Promise<AIResponse> => {
  const ai = getAIClient();
  const modelName = String(settings?.textModel || TextModel.Pro);

  const prompt = `
    PLAYER ACTION: ${userAction}
    
    CURRENT INVENTORY: ${JSON.stringify(currentInventory)}
    LOCATION: ${currentLocation?.name || "The Wilds"}
    
    If player finds items, add them to the inventory. If combat occurs, trigger a skillCheck.
  `;

  const systemInstruction = getSystemInstruction(settings.language, playerClass, activeBlessings, currentReputation, activeNemesis, sanctuary, currentAct, ascensionLevel, activeEnemy, activeMerchant);

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
                  value: { type: Type.NUMBER }
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
    return JSON.parse(text) as AIResponse;
  } catch (error) {
    console.error("Error generating story:", error);
    return {
      narrative: "The world wavers...",
      inventory: currentInventory,
      currentQuest: currentQuest,
      visualPrompt: "A glitch in reality.",
      choices: ["Try again"],
      stats: currentStats,
      level: currentLevel,
      currentXp: currentXp,
      nextLevelXp: nextLevelXp
    };
  }
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
  } catch (error) { return null; }
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
  } catch(e) {}
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
  } catch (error) { return null; }
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
  } catch (error) { return null; }
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
  } catch (error) { return null; }
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
  if (typeof window.aistudio !== 'undefined' && window.aistudio.hasSelectedApiKey) {
    return await window.aistudio.hasSelectedApiKey();
  }
  return false;
};

export const requestApiKey = async (): Promise<void> => {
  if (typeof window.aistudio !== 'undefined' && window.aistudio.openSelectKey) {
    await window.aistudio.openSelectKey();
  }
};
