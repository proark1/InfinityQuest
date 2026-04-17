import { useCallback, useEffect, useState } from 'react';
import {
  Ability,
  AppSettings,
  CharacterStats,
  ImageSize,
  InventoryItem,
  Language,
  LegacyItem,
  SanctuaryState,
  SkillCheck,
  TextModel,
  WorldRoll,
} from './types';
import Sidebar from './components/Sidebar';
import StoryFeed from './components/StoryFeed';
import SettingsModal from './components/SettingsModal';
import LiveSession from './components/LiveSession';
import ClassSelection from './components/ClassSelection';
import DiceRoller from './components/DiceRoller';
import GameOverModal from './components/GameOverModal';
import VictoryModal from './components/VictoryModal';
import Pantheon from './components/Pantheon';
import FloatingTextLayer from './components/FloatingTextLayer';
import ActionOverlay from './components/ActionOverlay';
import VisualEffectsLayer from './components/VisualEffectsLayer';
import LivingBackground from './components/LivingBackground';
import MinigameDice from './components/MinigameDice';
import ItemInspector from './components/ItemInspector';
import CampModal from './components/CampModal';
import AbilityHotbar from './components/AbilityHotbar';
import { effectiveStats, inferSlot } from './utils/equipment';
import { SoundManager } from './utils/soundEffects';
import { checkApiKey, generateAudio, isAiStudioAvailable, requestApiKey } from './services/geminiService';
import { setApiKey as saveApiKey } from './utils/apiKey';
import { AlertTriangle, Menu, Mic, Send, Settings } from 'lucide-react';
import {
  DEFAULT_ABILITY_COOLDOWN,
  DEFAULT_ABILITY_MANA_COST,
  HUNGER_THIRST_MAX,
  INITIAL_HP,
  REST_HP_RESTORE_PCT,
  REST_HUNGER_COST,
  REST_NIGHT_ENCOUNTER_CHANCE,
  REST_THIRST_COST,
  SANCTUARY_UPGRADE_BASE_COST,
  clamp,
  newId,
} from './utils/constants';
import { usePersistedGameState } from './hooks/usePersistedGameState';
import { usePersistedMetaState } from './hooks/usePersistedMetaState';
import { useFloatingTexts } from './hooks/useFloatingTexts';
import { useGameTurn } from './hooks/useGameTurn';

const INITIAL_PROMPTS: Record<Language, string> = {
  [Language.English]: 'Start the adventure. I have just arrived in the region.',
  [Language.German]: 'Beginne das Abenteuer. Ich bin gerade in der Region angekommen.',
};

function App() {
  const [apiKeyReady, setApiKeyReady] = useState<boolean>(false);
  const [input, setInput] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [liveSessionOpen, setLiveSessionOpen] = useState<boolean>(false);
  const [showDiceGame, setShowDiceGame] = useState(false);
  const [showCampModal, setShowCampModal] = useState(false);
  const [inspectItem, setInspectItem] = useState<InventoryItem | null>(null);
  const [showClassSelection, setShowClassSelection] = useState<boolean>(false);
  const [showPantheon, setShowPantheon] = useState<boolean>(false);
  const [activeSkillCheck, setActiveSkillCheck] = useState<SkillCheck | null>(null);
  const [activeWorldRoll, setActiveWorldRoll] = useState<WorldRoll | null>(null);
  const [pendingLegacyItem, setPendingLegacyItem] = useState<LegacyItem | null>(null);

  const [settings, setSettings] = useState<AppSettings>({
    textModel: TextModel.Pro,
    imageSize: ImageSize.Size_1K,
    autoGenerateImages: true,
    language: Language.English,
  });

  const { gameState, setGameState, gameStarted, setGameStarted, resetGame } = usePersistedGameState();
  const { metaState, setMetaState } = usePersistedMetaState();
  const { floatingTexts, addFloatingText } = useFloatingTexts();

  const { loading, processTurn } = useGameTurn({
    gameState,
    setGameState,
    settings,
    metaState,
    addFloatingText,
    setActiveSkillCheck,
    setActiveWorldRoll,
    activeSkillCheck,
    activeWorldRoll,
  });

  useEffect(() => {
    checkApiKey().then(setApiKeyReady);
  }, []);

  const handleGenerateAudio = useCallback(async (turnId: string, text: string) => {
    setGameState(prev => ({
      ...prev,
      history: prev.history.map(t =>
        t.id === turnId ? { ...t, audioLoading: true, audioError: undefined } : t,
      ),
    }));

    const cleanText = text.replace(/\[\[(.*?)\]\]/g, '$1');
    const audioUrl = await generateAudio(cleanText);

    setGameState(prev => ({
      ...prev,
      history: prev.history.map(t =>
        t.id === turnId
          ? {
              ...t,
              audioLoading: false,
              audioUrl: audioUrl || undefined,
              audioError: audioUrl ? undefined : 'Failed to generate audio',
            }
          : t,
      ),
    }));
  }, [setGameState]);

  const handleRollComplete = useCallback((roll: number) => {
    if (activeSkillCheck) {
      const attribute = activeSkillCheck.attribute || 'strength';
      const effStats = effectiveStats(gameState.stats, gameState.inventory, gameState.equipped);
      const modifier = Math.floor((effStats[attribute] - 10) / 2);
      const success = roll + modifier >= (activeSkillCheck.difficultyClass || 10);
      const dc = activeSkillCheck.difficultyClass;
      setActiveSkillCheck(null);
      processTurn(
        success ? 'I succeeded in my attempt.' : 'I failed in my attempt.',
        false,
        `Skill Check Result: Roll ${roll} + Modifier ${modifier} = ${roll + modifier}. Success: ${success}. Difficulty was ${dc}.`,
      );
    } else if (activeWorldRoll) {
      const { label, result: preset } = activeWorldRoll;
      setActiveWorldRoll(null);
      // Feed the world roll result back so the AI can narrate the consequence.
      // Skip if the AI pre-supplied a result (it already resolved the outcome in-narrative).
      if (preset === undefined || preset === null) {
        const outcome = roll === 20 ? 'critical success' : roll === 1 ? 'critical failure' : roll >= 15 ? 'success' : roll >= 8 ? 'partial success' : 'failure';
        processTurn(
          'Continue.',
          false,
          `World Roll Result: "${label}" rolled ${roll}/20 (${outcome}). Narrate the consequence of this roll and continue the story. Do not request another worldRoll on this turn.`,
        );
      }
    }
  }, [activeSkillCheck, activeWorldRoll, gameState.stats, processTurn]);

  const handleMinigameResult = useCallback((netGold: number) => {
    setGameState(prev => ({ ...prev, gold: Math.max(0, prev.gold + netGold) }));
  }, [setGameState]);

  const handleItemDetailsLoaded = useCallback((itemName: string, details: { lore?: string; imageUrl?: string }) => {
    setGameState(prev => ({
      ...prev,
      inventory: prev.inventory.map(i =>
        i.name === itemName
          ? { ...i, lore: details.lore ?? i.lore, imageUrl: details.imageUrl ?? i.imageUrl }
          : i,
      ),
    }));
  }, [setGameState]);

  const handleEquip = useCallback((item: InventoryItem) => {
    const slot = inferSlot(item);
    if (!slot) return;
    SoundManager.playConfirm();
    setGameState(prev => ({
      ...prev,
      equipped: { ...prev.equipped, [slot]: item.name },
    }));
    addFloatingText(`Equipped: ${item.name}`, 'info');
  }, [addFloatingText, setGameState]);

  const handleUnequip = useCallback((item: InventoryItem) => {
    const slot = inferSlot(item);
    if (!slot) return;
    SoundManager.playClick();
    setGameState(prev => {
      const nextEquipped = { ...prev.equipped };
      if (nextEquipped[slot] === item.name) delete nextEquipped[slot];
      return { ...prev, equipped: nextEquipped };
    });
    addFloatingText(`Unequipped: ${item.name}`, 'info');
  }, [addFloatingText, setGameState]);

  const handleCast = useCallback((ability: Ability) => {
    const cost = ability.type === 'spell' ? (ability.manaCost ?? DEFAULT_ABILITY_MANA_COST) : 0;
    if (cost > gameState.currentMana) {
      addFloatingText('Not enough mana', 'info');
      return;
    }
    if ((gameState.abilityCooldowns[ability.name] || 0) > 0) return;

    const cooldown = ability.cooldown ?? DEFAULT_ABILITY_COOLDOWN;

    setGameState(prev => ({
      ...prev,
      currentMana: clamp(prev.currentMana - cost, 0, prev.maxMana),
      abilityCooldowns: { ...prev.abilityCooldowns, [ability.name]: cooldown },
    }));

    if (cost > 0) addFloatingText(`-${cost} MP`, 'info');

    const override = `ABILITY USE: The player activates "${ability.name}" — ${ability.description}. Type: ${ability.type || 'active'}. Mana cost already spent, cooldown already set. Resolve this ability: if offensive or risky, return a skillCheck (use INT for spells, STR for physical, STA for sustained). If utility/heal/buff, narrate the effect and apply concrete stat changes (hpChange, statusEffects) in this response. Reference the spell/ability by name.`;
    processTurn(`I use ${ability.name}.`, false, override);
  }, [addFloatingText, gameState.abilityCooldowns, gameState.currentMana, processTurn, setGameState]);

  const handleCamp = useCallback((foodName: string, drinkName: string) => {
    SoundManager.playConfirm();
    setShowCampModal(false);
    const nightEncounter = Math.random() < REST_NIGHT_ENCOUNTER_CHANCE;

    setGameState(prev => {
      const inv = [...prev.inventory];
      const foodIdx = inv.findIndex(i => i.name === foodName);
      if (foodIdx >= 0) inv.splice(foodIdx, 1);
      const drinkIdx = inv.findIndex(i => i.name === drinkName);
      if (drinkIdx >= 0) inv.splice(drinkIdx, 1);

      const hpRestore = Math.floor(prev.maxHp * (REST_HP_RESTORE_PCT / 100));
      return {
        ...prev,
        inventory: inv,
        currentHp: clamp(prev.currentHp + hpRestore, 0, prev.maxHp),
        hunger: clamp(prev.hunger + REST_HUNGER_COST, 0, HUNGER_THIRST_MAX),
        thirst: clamp(prev.thirst + REST_THIRST_COST, 0, HUNGER_THIRST_MAX),
        currentMana: prev.maxMana,
        abilityCooldowns: {},
      };
    });

    addFloatingText('Rested', 'heal');

    const override = nightEncounter
      ? `The player is making camp for the night. Consumed: ${foodName} and ${drinkName}. Roughly 4 hours pass. HP, mana, and cooldowns have been restored. However, a DISTURBANCE breaks the night — an ambush, a wandering beast, a stranger, or an ill omen. Narrate the disturbance and what the player sees. Present it as a choice or trigger a skillCheck/combat if appropriate.`
      : `The player is making camp for the night. Consumed: ${foodName} and ${drinkName}. Roughly 4 hours pass quietly. HP, mana, and cooldowns have been restored. Narrate the restful night in 2-3 sentences and what the morning reveals.`;

    processTurn('I set up camp and rest.', false, override);
  }, [addFloatingText, processTurn, setGameState]);

  const handleConsume = useCallback((item: InventoryItem) => {
    if (!item.consumable) return;
    const { hungerRestore = 0, thirstRestore = 0, hpRestore = 0 } = item.consumable;
    SoundManager.playConfirm();
    setGameState(prev => {
      const idx = prev.inventory.findIndex(i => i.name === item.name);
      const nextInventory = idx >= 0
        ? [...prev.inventory.slice(0, idx), ...prev.inventory.slice(idx + 1)]
        : prev.inventory;
      const nextEquipped = { ...prev.equipped };
      (Object.keys(nextEquipped) as Array<keyof typeof nextEquipped>).forEach(slot => {
        if (nextEquipped[slot] === item.name) delete nextEquipped[slot];
      });
      return {
        ...prev,
        inventory: nextInventory,
        equipped: nextEquipped,
        hunger: clamp(prev.hunger + hungerRestore, 0, HUNGER_THIRST_MAX),
        thirst: clamp(prev.thirst + thirstRestore, 0, HUNGER_THIRST_MAX),
        currentHp: clamp(prev.currentHp + hpRestore, 0, prev.maxHp),
      };
    });
    if (hungerRestore) addFloatingText(`+${hungerRestore} Hunger`, 'info');
    if (thirstRestore) addFloatingText(`+${thirstRestore} Thirst`, 'info');
    if (hpRestore) addFloatingText(`+${hpRestore} HP`, 'heal');
  }, [addFloatingText, setGameState]);

  const handleAiStudioConnect = useCallback(async () => {
    await requestApiKey();
    const ok = await checkApiKey();
    setApiKeyReady(ok);
  }, []);

  const handleManualKeySubmit = useCallback((key: string) => {
    const trimmed = key.trim();
    if (!trimmed) return;
    saveApiKey(trimmed);
    setApiKeyReady(true);
  }, []);

  const handleRunEnd = useCallback((shardsEarned: number, causeOfDeath: string) => {
    setMetaState(prev => ({
      ...prev,
      soulShards: prev.soulShards + shardsEarned,
      ascensionLevel: causeOfDeath === 'Ascended' ? prev.ascensionLevel + 1 : prev.ascensionLevel,
      pastHeroes: [
        ...prev.pastHeroes,
        {
          id: newId(),
          name: gameState.title,
          class: gameState.playerClass,
          level: gameState.level,
          causeOfDeath: causeOfDeath === 'Ascended' ? 'Ascended' : gameState.gameOverCause || causeOfDeath,
          score: shardsEarned,
          date: Date.now(),
          ascensionLevel: gameState.ascensionLevel,
        },
      ],
    }));
    resetGame();
  }, [gameState, resetGame, setMetaState]);

  if (!apiKeyReady) {
    return (
      <ApiKeyGate
        onAiStudioConnect={handleAiStudioConnect}
        onManualKey={handleManualKeySubmit}
      />
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden relative">
      <LivingBackground biome={gameState.location?.biome} weather={gameState.location?.weather} />
      <VisualEffectsLayer gameState={gameState} />
      <FloatingTextLayer items={floatingTexts} />

      {gameStarted && (
        <div className="flex h-full w-full">
           <div className={`${sidebarOpen ? 'fixed inset-0 z-50 flex' : 'hidden lg:flex'} w-80 flex-shrink-0`}>
             {sidebarOpen && (
               <div className="fixed inset-0 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
             )}
             <Sidebar
               gameState={gameState}
               language={settings.language}
               onCraft={(item1, item2) => {
                 processTurn(`I try to combine ${item1.name} and ${item2.name}.`);
               }}
               isThinking={loading}
               onInspectItem={setInspectItem}
               className="w-80 flex-shrink-0 relative z-10"
             />
           </div>
           <div className="flex-1 flex flex-col min-w-0 relative">
              <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex items-center justify-between px-4">
                 <div className="flex items-center gap-4">
                    <button
                      onClick={() => setSidebarOpen(true)}
                      className="lg:hidden p-2 text-slate-400"
                      aria-label="Open sidebar"
                    >
                      <Menu />
                    </button>
                    <span className="font-bold text-amber-500 fantasy-font tracking-widest hidden sm:block">INFINITY QUEST</span>
                 </div>
                 <div className="flex items-center gap-3">
                    <button
                      onClick={() => { SoundManager.playClick(); setLiveSessionOpen(true); }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 rounded-full text-sm font-medium"
                      aria-label="Open voice mode"
                    >
                      <Mic size={16} /> Voice Mode
                    </button>
                    <button
                      onClick={() => setSettingsOpen(true)}
                      className="p-2 text-slate-400 hover:text-white"
                      aria-label="Open settings"
                    >
                      <Settings size={20} />
                    </button>
                 </div>
              </header>

              <StoryFeed
                 history={gameState.history}
                 isThinking={loading}
                 language={settings.language}
                 onGenerateAudio={handleGenerateAudio}
                 onKeywordAction={(kw) => processTurn(`Inspect [[${kw}]]`)}
              />

              <ActionOverlay
                 gameState={gameState}
                 onAction={processTurn}
                 onPlayDice={() => setShowDiceGame(true)}
                 onMakeCamp={() => setShowCampModal(true)}
                 disabled={loading}
              />

              <AbilityHotbar
                 abilities={gameState.abilities}
                 cooldowns={gameState.abilityCooldowns}
                 currentMana={gameState.currentMana}
                 onCast={handleCast}
                 disabled={loading || !!activeSkillCheck || !!activeWorldRoll}
              />

              <div className="bg-slate-900 border-t border-slate-800 p-4 z-10">
                 <div className="max-w-3xl mx-auto flex gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          processTurn(input);
                          setInput('');
                        }
                      }}
                      disabled={loading}
                      aria-busy={loading}
                      aria-label="Describe your action"
                      className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-xl py-4 px-5 focus:outline-none focus:border-amber-500 shadow-inner"
                      placeholder="What will you do?"
                    />
                    <button
                      onClick={() => { processTurn(input); setInput(''); }}
                      disabled={loading || !input.trim()}
                      className="p-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                      aria-label="Submit action"
                    >
                      <Send size={24} />
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {liveSessionOpen && (
         <LiveSession
           isOpen={liveSessionOpen}
           onClose={() => setLiveSessionOpen(false)}
           gameState={gameState}
           language={settings.language}
           onInventoryUpdate={(items) => {
             setGameState(prev => {
               const newInventory = [...prev.inventory];
               items.forEach(itemName => {
                 if (!newInventory.some(i => i.name === itemName)) {
                   newInventory.push({ name: itemName, type: 'misc', rarity: 'common', description: 'Added by Narrator' });
                 }
               });
               const filteredInventory = newInventory.filter(i => items.includes(i.name));
               return { ...prev, inventory: filteredInventory };
             });
           }}
           onQuestUpdate={(quest) => {
             setGameState(prev => ({ ...prev, currentQuest: quest }));
           }}
           onRegisterCharacter={(name, description) => {
             setGameState(prev => ({
               ...prev,
               characterRegistry: [...prev.characterRegistry, { name, voiceDescription: description }],
             }));
           }}
           onStatUpdate={(newStats) => {
             setGameState(prev => ({ ...prev, stats: newStats }));
           }}
           onXpUpdate={(xpAdded, levelUp) => {
             setGameState(prev => ({
               ...prev,
               currentXp: prev.currentXp + xpAdded,
               level: levelUp ? prev.level + 1 : prev.level,
               nextLevelXp: levelUp ? prev.nextLevelXp * 2 : prev.nextLevelXp,
             }));
           }}
           onSurvivalUpdate={(hungerChange, thirstChange) => {
             setGameState(prev => ({
               ...prev,
               hunger: clamp(prev.hunger + hungerChange, 0, HUNGER_THIRST_MAX),
               thirst: clamp(prev.thirst + thirstChange, 0, HUNGER_THIRST_MAX),
             }));
           }}
           onInspectItem={setInspectItem}
           onTranscript={(role, text) => {
             setGameState(prev => ({
               ...prev,
               history: [...prev.history, { id: newId(), role, text }],
             }));
           }}
         />
      )}

      {!gameStarted && !showClassSelection && !showPantheon && (
         <div className="flex-1 flex flex-col items-center justify-center space-y-12 p-8 bg-[url('https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?q=80&w=2544')] bg-cover bg-center relative">
            <div className="absolute inset-0 bg-black/70" />
            <div className="relative z-10 text-center space-y-8 animate-in zoom-in duration-700">
               <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-600 fantasy-font drop-shadow-2xl tracking-tighter">INFINITY QUEST</h1>
               <div className="flex flex-col gap-4 items-center">
                 <div className="p-1 bg-gradient-to-r from-amber-500 to-amber-800 rounded-2xl">
                   <button onClick={() => { SoundManager.playConfirm(); setShowClassSelection(true); }} className="px-16 py-8 bg-slate-900 hover:bg-slate-800 text-white text-3xl font-black rounded-xl shadow-2xl transition-all hover:scale-105 active:scale-95 fantasy-font tracking-widest border border-amber-500/30 font-bold uppercase">BEGIN ADVENTURE</button>
                 </div>
                 {metaState.pastHeroes.length > 0 && (
                   <button onClick={() => { SoundManager.playConfirm(); setShowPantheon(true); }} className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-amber-500 text-xl font-bold rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 fantasy-font tracking-widest border border-amber-500/20 uppercase">ENTER PANTHEON</button>
                 )}
               </div>
            </div>
         </div>
      )}

      {showPantheon && (
         <Pantheon
            metaState={metaState}
            onStartRun={(blessings, legacyItem) => {
               setGameState(prev => ({ ...prev, activeBlessings: blessings }));
               if (legacyItem) setPendingLegacyItem(legacyItem);
               setShowPantheon(false);
               setShowClassSelection(true);
            }}
            onOracleClaim={() => {
               setMetaState(prev => ({ ...prev, lastOracleClaim: Date.now(), soulShards: prev.soulShards + 100 }));
            }}
            onSanctuaryUpgrade={(building) => {
               setMetaState(prev => {
                  const key = `${building}Level` as keyof SanctuaryState;
                  const currentLevel = prev.sanctuary[key];
                  const cost = (currentLevel + 1) * SANCTUARY_UPGRADE_BASE_COST;
                  if (prev.soulShards >= cost) {
                     return {
                        ...prev,
                        soulShards: prev.soulShards - cost,
                        sanctuary: {
                           ...prev.sanctuary,
                           [key]: currentLevel + 1,
                        },
                     };
                  }
                  return prev;
               });
            }}
         />
      )}

      {showClassSelection && (
         <ClassSelection
            language={settings.language}
            onSelect={(cls, stats, items, imageUrl) => {
               const finalInventory = [...items];
               const finalStats: CharacterStats = { ...stats };

               if (pendingLegacyItem) {
                 finalInventory.push({
                   name: pendingLegacyItem.name,
                   type: pendingLegacyItem.type,
                   rarity: pendingLegacyItem.rarity,
                   description: pendingLegacyItem.description,
                   value: pendingLegacyItem.value,
                 });
                 const legacyStats = (pendingLegacyItem as LegacyItem & { stats?: Partial<CharacterStats> }).stats;
                 if (legacyStats) {
                   (Object.keys(legacyStats) as (keyof CharacterStats)[]).forEach(key => {
                     const bonus = legacyStats[key];
                     if (typeof bonus === 'number' && typeof finalStats[key] === 'number') {
                       finalStats[key] = finalStats[key] + bonus;
                     }
                   });
                 }
                 setPendingLegacyItem(null);
               }

               setGameState(prev => ({
                 ...prev,
                 playerClass: cls,
                 stats: finalStats,
                 inventory: finalInventory,
                 currentHp: INITIAL_HP,
                 maxHp: INITIAL_HP,
                 title: 'The ' + cls,
                 portraitUrl: imageUrl,
               }));
               setGameStarted(true);
               setShowClassSelection(false);
               processTurn(INITIAL_PROMPTS[settings.language], true);
            }}
         />
      )}

      {activeSkillCheck && (
        <DiceRoller
          check={activeSkillCheck}
          modifier={Math.floor(((effectiveStats(gameState.stats, gameState.inventory, gameState.equipped)[activeSkillCheck.attribute] || 10) - 10) / 2)}
          onRollComplete={handleRollComplete}
        />
      )}

      {activeWorldRoll && (
        <DiceRoller
          worldRoll={activeWorldRoll}
          onRollComplete={handleRollComplete}
        />
      )}

      {showDiceGame && (
         <MinigameDice
            playerGold={gameState.gold}
            onClose={() => setShowDiceGame(false)}
            onResult={handleMinigameResult}
         />
      )}

      {inspectItem && (
        <ItemInspector
          item={inspectItem}
          onClose={() => setInspectItem(null)}
          onConsume={handleConsume}
          onDetailsLoaded={handleItemDetailsLoaded}
          onEquip={handleEquip}
          onUnequip={handleUnequip}
          equipped={gameState.equipped}
        />
      )}
      <CampModal
        isOpen={showCampModal}
        onClose={() => setShowCampModal(false)}
        inventory={gameState.inventory}
        onConfirm={handleCamp}
      />
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} onSettingsChange={setSettings} onNewGame={() => { setSettingsOpen(false); resetGame(); }} />
      <GameOverModal
        isOpen={gameState.isGameOver}
        gameState={gameState}
        onContinue={(shardsEarned) => handleRunEnd(shardsEarned, gameState.gameOverCause || 'Unknown')}
      />
      <VictoryModal
        isOpen={gameState.isVictory}
        gameState={gameState}
        onAscend={(shardsEarned) => handleRunEnd(shardsEarned, 'Ascended')}
      />
    </div>
  );
}

interface ApiKeyGateProps {
  onAiStudioConnect: () => void | Promise<void>;
  onManualKey: (key: string) => void;
}

function ApiKeyGate({ onAiStudioConnect, onManualKey }: ApiKeyGateProps) {
  const [manualKey, setManualKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const aiStudio = isAiStudioAvailable();

  const submit = () => {
    if (manualKey.trim()) onManualKey(manualKey);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">
        <div className="text-center">
          <AlertTriangle className="text-amber-500 w-16 h-16 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-2 fantasy-font">Access Required</h1>
          <p className="text-slate-400 mb-6 text-sm">
            A Gemini API key is needed for story generation, images, and live voice mode.
          </p>
        </div>

        <label className="block text-xs font-medium text-slate-300 mb-2 uppercase tracking-wider">
          Gemini API Key
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type={showKey ? 'text' : 'password'}
            value={manualKey}
            onChange={(e) => setManualKey(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder="AIza..."
            aria-label="Gemini API key"
            className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
          />
          <button
            type="button"
            onClick={() => setShowKey(s => !s)}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg"
            aria-label={showKey ? 'Hide API key' : 'Show API key'}
          >
            {showKey ? 'Hide' : 'Show'}
          </button>
        </div>
        <p className="text-[11px] text-slate-500 mb-6">
          Stored only in this browser's localStorage. Get a key at{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline">aistudio.google.com/apikey</a>.
        </p>

        <button
          onClick={submit}
          disabled={!manualKey.trim()}
          className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all"
        >
          Save Key & Enter
        </button>

        {aiStudio && (
          <>
            <div className="flex items-center gap-2 my-4">
              <div className="flex-1 h-px bg-slate-700" />
              <span className="text-[11px] text-slate-500 uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-slate-700" />
            </div>
            <button
              onClick={() => onAiStudioConnect()}
              className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-lg transition-all text-sm"
            >
              Use AI Studio Key
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
