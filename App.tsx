
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GameTurn, AppSettings, TextModel, ImageSize, Language, CharacterStats, InventoryItem, Ability, CharacterClass, CodexEntry, SkillCheck, MetaState, Blessing, PastHero, BLESSINGS, Reputation, FactionName, Achievement, ACHIEVEMENTS_LIST, Nemesis, SanctuaryState, LegacyItem, FloatingText, WorldRoll } from './types';
import Sidebar from './components/Sidebar';
import StoryFeed from './components/StoryFeed';
import SettingsModal from './components/SettingsModal';
import LiveSession from './components/LiveSession';
import ClassSelection from './components/ClassSelection';
import DiceRoller from './components/DiceRoller';
import GameOverModal from './components/GameOverModal';
import VictoryModal from './components/VictoryModal';
import Pantheon from './components/Pantheon';
import AchievementToast from './components/AchievementToast';
import FloatingTextLayer from './components/FloatingTextLayer';
import ActionOverlay from './components/ActionOverlay';
import LootReveal from './components/LootReveal';
import VisualEffectsLayer from './components/VisualEffectsLayer';
import LivingBackground from './components/LivingBackground';
import MinigameDice from './components/MinigameDice'; 
import ItemInspector from './components/ItemInspector';
import { SoundManager } from './utils/soundEffects';
import { generateStoryTurn, checkApiKey, requestApiKey, generateCharacterImage, generateEnemyImage, generateMapImage, generateSceneImage, generateAudio } from './services/geminiService';
import { Send, Settings, Menu, AlertTriangle, Mic } from 'lucide-react';

const INITIAL_PROMPTS = {
  [Language.English]: "Start the adventure. I have just arrived in the region.",
  [Language.German]: "Beginne das Abenteuer. Ich bin gerade in der Region angekommen.",
};

const STORAGE_KEY = 'infinity_quest_save_v4'; 
const META_STORAGE_KEY = 'infinity_quest_meta_v1';

const DEFAULT_STATS: CharacterStats = {
  strength: 10, intelligence: 10, stamina: 10, charisma: 10
};

const DEFAULT_SANCTUARY: SanctuaryState = {
  libraryLevel: 0, armoryLevel: 0, gardenLevel: 0, treasuryLevel: 0
};

const INITIAL_REPUTATION: Reputation[] = [
  { faction: 'The Solar Vanguard', value: 0, status: 'Neutral' },
  { faction: 'The Lunar Syndicate', value: 0, status: 'Neutral' },
  { faction: 'The Verdant Circle', value: 0, status: 'Neutral' }
];

function App() {
  const [apiKeyReady, setApiKeyReady] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [input, setInput] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [liveSessionOpen, setLiveSessionOpen] = useState<boolean>(false);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [showDiceGame, setShowDiceGame] = useState(false);
  const [inspectItem, setInspectItem] = useState<InventoryItem | null>(null);

  const [metaState, setMetaState] = useState<MetaState>({ 
     soulShards: 0, pastHeroes: [], lastOracleClaim: 0, sanctuary: DEFAULT_SANCTUARY, legacyItems: [], ascensionLevel: 0
  });

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

  const [gameState, setGameState] = useState<GameState>({
    inventory: [], gold: 0, currentQuest: "", history: [], characterRegistry: [],
    isGameOver: false, isVictory: false, level: 1, currentXp: 0, nextLevelXp: 1000,
    stats: DEFAULT_STATS, currentHp: 20, maxHp: 20, adrenaline: 0, flowStreak: 0,
    statusEffects: [], hunger: 100, thirst: 100, abilities: [], playerClass: 'Traveler',
    title: 'Novice', codex: [], activeBlessings: [], reputation: INITIAL_REPUTATION,
    unlockedAchievements: [], currentAct: 1, actProgress: 0, isBossFight: false,
    ascensionLevel: 0, maps: {}
  });

  useEffect(() => {
    const verifyKey = async () => {
      const hasKey = await checkApiKey();
      setApiKeyReady(hasKey);
    };
    verifyKey();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.history && parsed.history.length > 0) {
           setGameState(prev => ({ ...prev, ...parsed }));
           setGameStarted(true);
        }
      } catch (e) { console.error("Save load failed", e); }
    }

    const savedMeta = localStorage.getItem(META_STORAGE_KEY);
    if (savedMeta) {
      try {
        const parsedMeta = JSON.parse(savedMeta);
        setMetaState(prev => ({ ...prev, ...parsedMeta }));
      } catch (e) { console.error("Meta load failed", e); }
    }
  }, []);

  useEffect(() => {
    if (gameStarted && gameState.history.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
    }
  }, [gameState, gameStarted]);

  useEffect(() => {
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(metaState));
  }, [metaState]);

  const addFloatingText = (text: string, type: FloatingText['type']) => {
    const id = Date.now().toString() + Math.random();
    const x = 40 + Math.random() * 20;
    const y = 40 + Math.random() * 20;
    setFloatingTexts(prev => [...prev, { id, text, type, x, y }]);
    setTimeout(() => setFloatingTexts(prev => prev.filter(ft => ft.id !== id)), 1500);
  };

  const processTurn = useCallback(async (userAction: string, isInitial: boolean = false, systemOverride?: string) => {
    if ((!userAction.trim() && !isInitial) || loading || activeSkillCheck || activeWorldRoll || gameState.isGameOver || gameState.isVictory) return;
    
    SoundManager.playClick();
    setLoading(true);

    let newHistory = [...gameState.history];
    if (!isInitial && !systemOverride) {
      newHistory.push({ id: Date.now().toString(), role: 'user', text: userAction });
      setGameState(prev => ({ ...prev, history: newHistory }));
      setInput('');
    }

    try {
      const aiResponse = await generateStoryTurn(
        newHistory.slice(-10).map(t => `${t.role === 'user' ? 'Player' : 'Master'}: ${t.text}`).join('\n'),
        systemOverride || userAction,
        gameState.inventory, gameState.currentQuest, gameState.stats, gameState.level, gameState.currentXp, gameState.nextLevelXp, gameState.playerClass, settings, gameState.activeBlessings, gameState.reputation, undefined, metaState.sanctuary, gameState.currentAct, gameState.actProgress, gameState.ascensionLevel, gameState.hunger, gameState.thirst, gameState.activeEnemy, gameState.location, gameState.activeMerchant
      );

      // AI-initiated World Roll (Narrator Dice)
      if (aiResponse.worldRoll) {
        setActiveWorldRoll(aiResponse.worldRoll);
      }

      if (aiResponse.skillCheck) {
        setActiveSkillCheck(aiResponse.skillCheck);
        setGameState(prev => ({ ...prev, history: [...newHistory, { id: Date.now().toString(), role: 'model', text: aiResponse.narrative + "\n\n[DICE ROLL REQUIRED]", choices: [] }] }));
        setLoading(false);
        return;
      }

      if (aiResponse.portraitPrompt) {
        generateCharacterImage(aiResponse.portraitPrompt).then(url => {
          if (url) setGameState(prev => ({ ...prev, portraitUrl: url }));
        });
      }

      if (aiResponse.location && !gameState.maps[aiResponse.location.name]) {
        generateMapImage(aiResponse.location.name, aiResponse.location.biome).then(url => {
          if (url) setGameState(prev => ({ ...prev, maps: { ...prev.maps, [aiResponse.location!.name]: url } }));
        });
      }

      const turnId = Date.now().toString();
      
      if (settings.autoGenerateImages && aiResponse.visualPrompt) {
        generateSceneImage(aiResponse.visualPrompt, settings.imageSize).then(url => {
          if (url) {
            setGameState(prev => ({
              ...prev,
              history: prev.history.map(t => t.id === turnId ? { ...t, imageUrl: url, imageLoading: false } : t)
            }));
          } else {
            setGameState(prev => ({
              ...prev,
              history: prev.history.map(t => t.id === turnId ? { ...t, imageLoading: false } : t)
            }));
          }
        });
      }

      setGameState(prev => {
         // CRITICAL: Ensure inventory merging always includes existing items if AI returned a subset
         // and always respects added items from the narrative.
         const newInventoryFromAI = aiResponse.inventory || [];
         const currentInvNames = prev.inventory.map(i => i.name);
         
         // Combine lists while preventing duplicates if the AI returned full state
         let mergedInventory = [...newInventoryFromAI];
         prev.inventory.forEach(oldItem => {
            if (!mergedInventory.some(newItem => newItem.name === oldItem.name)) {
               mergedInventory.push(oldItem);
            }
         });

         const nextState: GameState = {
            ...prev,
            inventory: mergedInventory,
            gold: Math.max(0, prev.gold + (aiResponse.goldChange || 0)),
            currentQuest: aiResponse.currentQuest || prev.currentQuest,
            stats: aiResponse.stats ? { ...prev.stats, ...aiResponse.stats } : prev.stats,
            level: aiResponse.level || prev.level,
            currentXp: aiResponse.currentXp || prev.currentXp,
            nextLevelXp: aiResponse.nextLevelXp || prev.nextLevelXp,
            currentHp: Math.min(prev.maxHp, Math.max(0, prev.currentHp + (aiResponse.hpChange || 0))),
            hunger: Math.min(100, Math.max(0, prev.hunger + (aiResponse.hungerChange || 0))),
            thirst: Math.min(100, Math.max(0, prev.thirst + (aiResponse.thirstChange || 0))),
            adrenaline: Math.min(100, (prev.adrenaline || 0) + (prev.activeEnemy ? 20 : 10)),
            location: aiResponse.location || prev.location,
            activeMerchant: aiResponse.merchant || undefined,
            isBossFight: aiResponse.isBossFight || false,
            isVictory: aiResponse.isVictory || false,
            history: [...newHistory, { id: turnId, role: 'model', text: aiResponse.narrative, choices: aiResponse.choices, isBossTurn: aiResponse.isBossFight, imageLoading: settings.autoGenerateImages && !!aiResponse.visualPrompt }],
         };

         if (aiResponse.newAbilities && aiResponse.newAbilities.length > 0) {
            nextState.abilities = [...prev.abilities, ...aiResponse.newAbilities];
         }

         if (aiResponse.newCodexEntries && aiResponse.newCodexEntries.length > 0) {
            nextState.codex = [...prev.codex, ...aiResponse.newCodexEntries];
         }

         if (aiResponse.reputationChange && aiResponse.reputationChange.length > 0) {
            let updatedReputation = [...prev.reputation];
            aiResponse.reputationChange.forEach(change => {
               const existing = updatedReputation.find(r => r.faction === change.faction);
               if (existing) {
                  existing.value = Math.max(-100, Math.min(100, existing.value + change.amount));
                  if (existing.value >= 80) existing.status = 'Exalted';
                  else if (existing.value >= 20) existing.status = 'Friendly';
                  else if (existing.value <= -20) existing.status = 'Hostile';
                  else existing.status = 'Neutral';
               } else {
                  let status: 'Neutral' | 'Hostile' | 'Friendly' | 'Exalted' = 'Neutral';
                  if (change.amount >= 80) status = 'Exalted';
                  else if (change.amount >= 20) status = 'Friendly';
                  else if (change.amount <= -20) status = 'Hostile';
                  updatedReputation.push({ faction: change.faction, value: change.amount, status });
               }
            });
            nextState.reputation = updatedReputation;
         }

         if (aiResponse.combat?.newEnemy) {
            const enemy = { ...aiResponse.combat.newEnemy, currentHp: aiResponse.combat.newEnemy.maxHp, statusEffects: [] };
            nextState.activeEnemy = enemy;
            generateEnemyImage(enemy.description).then(url => {
              if (url) setGameState(p => ({ ...p, activeEnemy: p.activeEnemy?.name === enemy.name ? { ...p.activeEnemy, imageUrl: url } : p.activeEnemy }));
            });
         } 
         
         if (aiResponse.combat?.enemyDefeated) {
            SoundManager.playEnemyDefeat();
            nextState.activeEnemy = undefined;
            addFloatingText("VANQUISHED!", "info");
         }

         if (aiResponse.hpChange && aiResponse.hpChange < 0) {
            SoundManager.playDamage();
            addFloatingText(`${aiResponse.hpChange} HP`, "damage");
         } else if (aiResponse.hpChange && aiResponse.hpChange > 0) {
            SoundManager.playHeal();
            addFloatingText(`+${aiResponse.hpChange} HP`, "heal");
         }

         if (aiResponse.goldChange && aiResponse.goldChange > 0) {
            SoundManager.playGold();
            addFloatingText(`+${aiResponse.goldChange} Gold`, "gold");
         }

         return nextState;
      });

    } catch (error) { 
      console.error("Turn generation error:", error);
    } finally { setLoading(false); }
  }, [gameState, settings, loading, activeSkillCheck, activeWorldRoll]);

  const handleGenerateAudio = async (turnId: string, text: string) => {
    setGameState(prev => ({
      ...prev,
      history: prev.history.map(t => t.id === turnId ? { ...t, audioLoading: true, audioError: undefined } : t)
    }));
    
    // Remove bracketed keywords for audio
    const cleanText = text.replace(/\[\[(.*?)\]\]/g, '$1');
    const audioUrl = await generateAudio(cleanText);
    
    setGameState(prev => ({
      ...prev,
      history: prev.history.map(t => t.id === turnId ? { 
        ...t, 
        audioLoading: false, 
        audioUrl: audioUrl || undefined,
        audioError: audioUrl ? undefined : 'Failed to generate audio'
      } : t)
    }));
  };

  const handleRollComplete = (roll: number) => {
    if (activeSkillCheck) {
      const attribute = activeSkillCheck.attribute || 'strength';
      const modifier = Math.floor((gameState.stats[attribute] - 10) / 2);
      const success = roll + modifier >= (activeSkillCheck.difficultyClass || 10);
      setActiveSkillCheck(null);
      processTurn(success ? "I succeeded in my attempt." : "I failed in my attempt.", false, `Skill Check Result: Roll ${roll} + Modifier ${modifier} = ${roll+modifier}. Success: ${success}. Difficulty was ${activeSkillCheck.difficultyClass}.`);
    } else if (activeWorldRoll) {
      setActiveWorldRoll(null);
    }
  };

  const handleMinigameResult = (netGold: number) => {
     setGameState(prev => ({ ...prev, gold: Math.max(0, prev.gold + netGold) }));
  };

  const handleConnect = async () => {
    await requestApiKey();
    setApiKeyReady(true);
  };

  if (!apiKeyReady) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 text-center">
          <AlertTriangle className="text-amber-500 w-16 h-16 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-2 fantasy-font">Access Required</h1>
          <p className="text-slate-400 mb-8">Connect your Google Cloud API key to start.</p>
          <button onClick={handleConnect} className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-all">Connect API Key</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen bg-slate-950 text-slate-200 overflow-hidden relative`}>
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
                    <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-400"><Menu /></button>
                    <span className="font-bold text-amber-500 fantasy-font tracking-widest hidden sm:block">INFINITY QUEST</span>
                 </div>
                 <div className="flex items-center gap-3">
                    <button onClick={() => { SoundManager.playClick(); setLiveSessionOpen(true); }} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 rounded-full text-sm font-medium"><Mic size={16} /> Voice Mode</button>
                    <button onClick={() => setSettingsOpen(true)} className="p-2 text-slate-400 hover:text-white"><Settings size={20} /></button>
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
                 disabled={loading} 
              />

              <div className="bg-slate-900 border-t border-slate-800 p-4 z-10">
                 <div className="max-w-3xl mx-auto flex gap-2">
                    <input 
                      type="text" 
                      value={input} 
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && processTurn(input)}
                      disabled={loading}
                      className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-xl py-4 px-5 focus:outline-none focus:border-amber-500 shadow-inner"
                      placeholder="What will you do?"
                    />
                    <button onClick={() => processTurn(input)} disabled={loading || !input.trim()} className="p-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl disabled:opacity-50 transition-all hover:scale-105 active:scale-95"><Send size={24} /></button>
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
               // Remove items not in the list
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
               characterRegistry: [...prev.characterRegistry, { name, voiceDescription: description }]
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
               nextLevelXp: levelUp ? prev.nextLevelXp * 2 : prev.nextLevelXp
             }));
           }} 
           onSurvivalUpdate={(hungerChange, thirstChange) => {
             setGameState(prev => ({
               ...prev,
               hunger: Math.min(100, Math.max(0, prev.hunger + hungerChange)),
               thirst: Math.min(100, Math.max(0, prev.thirst + thirstChange))
             }));
           }} 
           onInspectItem={setInspectItem}
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
                  const cost = (prev.sanctuary[`${building}Level` as keyof SanctuaryState] + 1) * 200;
                  if (prev.soulShards >= cost) {
                     return {
                        ...prev,
                        soulShards: prev.soulShards - cost,
                        sanctuary: {
                           ...prev.sanctuary,
                           [`${building}Level`]: prev.sanctuary[`${building}Level` as keyof SanctuaryState] + 1
                        }
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
               let finalStats = { ...stats };
               
               if (pendingLegacyItem) {
                 finalInventory.push({
                   name: pendingLegacyItem.name,
                   type: pendingLegacyItem.type,
                   rarity: pendingLegacyItem.rarity,
                   description: pendingLegacyItem.description,
                   effect: pendingLegacyItem.effect,
                   stats: pendingLegacyItem.stats
                 });
                 if (pendingLegacyItem.stats) {
                   Object.keys(pendingLegacyItem.stats).forEach(key => {
                     const statKey = key as keyof CharacterStats;
                     if (finalStats[statKey] && pendingLegacyItem.stats![statKey]) {
                       finalStats[statKey] += pendingLegacyItem.stats![statKey]!;
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
                 currentHp: 20, 
                 maxHp: 20,
                 title: 'The ' + cls,
                 portraitUrl: imageUrl
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
          modifier={Math.floor(((gameState.stats[activeSkillCheck.attribute] || 10) - 10) / 2)} 
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

      {inspectItem && <ItemInspector item={inspectItem} onClose={() => setInspectItem(null)} />}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} onSettingsChange={setSettings} onNewGame={() => window.location.reload()} />
      <GameOverModal isOpen={gameState.isGameOver} gameState={gameState} onContinue={(shardsEarned) => {
        const newMetaState = {
          ...metaState,
          soulShards: metaState.soulShards + shardsEarned,
          pastHeroes: [...metaState.pastHeroes, {
            id: Date.now().toString(),
            name: gameState.title,
            class: gameState.playerClass,
            level: gameState.level,
            causeOfDeath: gameState.gameOverCause || 'Unknown',
            score: shardsEarned,
            date: Date.now(),
            ascensionLevel: gameState.ascensionLevel
          }]
        };
        setMetaState(newMetaState);
        localStorage.setItem(META_STORAGE_KEY, JSON.stringify(newMetaState));
        localStorage.removeItem(STORAGE_KEY);
        window.location.reload();
      }} />
      <VictoryModal isOpen={gameState.isVictory} gameState={gameState} onAscend={(shardsEarned) => {
        const newMetaState = {
          ...metaState,
          soulShards: metaState.soulShards + shardsEarned,
          ascensionLevel: metaState.ascensionLevel + 1,
          pastHeroes: [...metaState.pastHeroes, {
            id: Date.now().toString(),
            name: gameState.title,
            class: gameState.playerClass,
            level: gameState.level,
            causeOfDeath: 'Ascended',
            score: shardsEarned,
            date: Date.now(),
            ascensionLevel: gameState.ascensionLevel
          }]
        };
        setMetaState(newMetaState);
        localStorage.setItem(META_STORAGE_KEY, JSON.stringify(newMetaState));
        localStorage.removeItem(STORAGE_KEY);
        window.location.reload();
      }} />
    </div>
  );
}

export default App;
