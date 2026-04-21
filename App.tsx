import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Ability,
  AppSettings,
  CharacterStats,
  CodexEntry,
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
import AchievementToast from './components/AchievementToast';
import CodexEntryModal from './components/CodexEntryModal';
import ShrineModal from './components/ShrineModal';
import Tutorial from './components/Tutorial';
import NudgeToast from './components/NudgeToast';
import QuestCompass from './components/QuestCompass';
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
import { useAchievementEngine } from './hooks/useAchievementEngine';
import { useAmbient } from './hooks/useAmbient';
import { applyArmoryRarityUpgrade, computeSanctuaryBonuses } from './utils/progression';
import { Nudge, selectNudge } from './utils/nudges';

const INITIAL_PROMPTS: Record<Language, string> = {
  [Language.English]: 'Start the adventure. I have just arrived in the region.',
  [Language.German]: 'Beginne das Abenteuer. Ich bin gerade in der Region angekommen.',
};

// Display names for the ascension ladder. Must stay in sync with the Realism
// Charter §5 in services/geminiService.ts so the AI narration matches the UI.
const ASCENSION_NAMES = [
  'Baseline',
  'Tarnished Cycle',
  'Thorned World',
  'Bloodmoon',
  'Umbral Sovereign',
  'Umbral Sovereign',
];

const NARRATOR_HINTS = [
  'Press Space to skip the typewriter.',
  'Bury an item at a shrine to leave a legacy.',
  'Your sanctuary grows with every run.',
  'A nemesis remembers who slew your last hero.',
  'Pick a chip, or type anything at all.',
  'Classes unlock by clearing acts and ascending.',
];

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
  const [inspectCodexEntry, setInspectCodexEntry] = useState<CodexEntry | null>(null);
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [activeNudge, setActiveNudge] = useState<Nudge | null>(null);
  const seenNudgesRef = useRef<string[]>([]);

  const [settings, setSettings] = useState<AppSettings>({
    textModel: TextModel.Pro,
    imageSize: ImageSize.Size_1K,
    autoGenerateImages: true,
    language: Language.English,
  });

  const {
    gameState,
    setGameState,
    gameStarted,
    setGameStarted,
    resetGame,
    persistWarning,
    clearPersistWarning,
    hasSavedRun,
    continueSavedRun,
  } = usePersistedGameState();
  const { metaState, setMetaState } = usePersistedMetaState();
  const { floatingTexts, addFloatingText } = useFloatingTexts();

  const { loading, processTurn } = useGameTurn({
    gameState,
    setGameState,
    settings,
    metaState,
    setMetaState,
    addFloatingText,
    setActiveSkillCheck,
    setActiveWorldRoll,
    activeSkillCheck,
    activeWorldRoll,
  });

  const { active: activeAchievement, dismiss: dismissAchievement } = useAchievementEngine({
    gameState,
    metaState,
    setGameState,
    setMetaState,
  });

  useAmbient(gameState, metaState, gameStarted);

  // Kick off the tutorial the first time a run actually starts (not during
  // the save-loaded screen). Gate behind `tutorialCompleted` so returning
  // players don't get quizzed again.
  useEffect(() => {
    if (!gameStarted) return;
    if (metaState.tutorialCompleted) return;
    if (gameState.history.length < 1) return; // let the opening narration start
    setShowTutorial(true);
  }, [gameStarted, metaState.tutorialCompleted, gameState.history.length]);

  const completeTutorial = useCallback(() => {
    setShowTutorial(false);
    setMetaState(prev => ({ ...prev, tutorialCompleted: true }));
  }, [setMetaState]);

  // Nudges: on every game-state change, ask the rule list if any tip applies,
  // honoring user preference and a per-run dedupe list (see seenNudgesRef).
  useEffect(() => {
    if (metaState.nudgesEnabled === false) return;
    if (!gameStarted || gameState.isGameOver || gameState.isVictory) return;
    if (showTutorial) return;
    if (activeNudge) return;
    const next = selectNudge(gameState, seenNudgesRef.current);
    if (next) {
      seenNudgesRef.current = [...seenNudgesRef.current, next.id].slice(-20);
      setActiveNudge(next);
    }
  }, [gameState, metaState.nudgesEnabled, gameStarted, showTutorial, activeNudge]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Latest narrator turn provides the chip suggestions; max 3, trimmed.
  const suggestedChips = useMemo<string[]>(() => {
    const lastModel = [...gameState.history].reverse().find(t => t.role === 'model');
    if (!lastModel?.choices) return [];
    return lastModel.choices.filter(c => typeof c === 'string' && c.trim().length > 0).slice(0, 3);
  }, [gameState.history]);

  // Rotating narrator hint while the turn is in flight — keeps the UI feeling
  // alive instead of frozen during LLM latency.
  const [hintIndex, setHintIndex] = useState(0);
  useEffect(() => {
    if (!loading) return;
    setHintIndex(i => (i + 1) % NARRATOR_HINTS.length);
    const id = window.setInterval(() => {
      setHintIndex(i => (i + 1) % NARRATOR_HINTS.length);
    }, 3500);
    return () => window.clearInterval(id);
  }, [loading]);
  const narratorHint = NARRATOR_HINTS[hintIndex];

  // Global keyboard shortcuts. Ignored when typing in an input/textarea so the
  // action box never eats its own text.
  useEffect(() => {
    if (!gameStarted || gameState.isGameOver || gameState.isVictory) return;
    const isTyping = () => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
    };
    const handler = (e: KeyboardEvent) => {
      if (loading || activeSkillCheck || activeWorldRoll) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping()) return;
      // Number keys fire suggested-action chips.
      if (['1', '2', '3'].includes(e.key)) {
        const chip = suggestedChips[Number(e.key) - 1];
        if (chip) {
          e.preventDefault();
          SoundManager.playClick();
          processTurn(chip);
        }
        return;
      }
      if (e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setSidebarOpen(s => !s);
      } else if (e.key.toLowerCase() === 'p' && metaState.pastHeroes.length > 0) {
        e.preventDefault();
        setShowPantheon(true);
      } else if (e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    gameStarted,
    gameState.isGameOver,
    gameState.isVictory,
    loading,
    activeSkillCheck,
    activeWorldRoll,
    suggestedChips,
    processTurn,
    metaState.pastHeroes.length,
  ]);

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
      // Feed the outcome into the director's fail/success streak counters so
      // the next-turn staging hint can react.
      setGameState(prev => {
        const s = prev.directorStats ?? { failedChecksInARow: 0, successesInARow: 0, lowStakeTurns: 0, lastInterventionTurn: -999 };
        return {
          ...prev,
          directorStats: {
            ...s,
            failedChecksInARow: success ? 0 : s.failedChecksInARow + 1,
            successesInARow: success ? s.successesInARow + 1 : 0,
          },
        };
      });
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
    setMetaState(prev => {
      // Save (or update) the bond with the companion who walked with this hero.
      let bondedCompanions = prev.bondedCompanions ?? [];
      if (gameState.companion) {
        const existing = bondedCompanions.find(c => c.name === gameState.companion!.name);
        const merged = {
          name: gameState.companion.name,
          species: gameState.companion.species,
          personality: gameState.companion.personality,
          portraitUrl: gameState.companion.portraitUrl,
          bondLevel: gameState.companion.bondLevel ?? existing?.bondLevel ?? 0,
          bondXp: gameState.companion.bondXp ?? existing?.bondXp ?? 0,
          bondMemories: (gameState.companion.bondMemories ?? existing?.bondMemories ?? []).slice(-8),
          lastSeenAt: Date.now(),
          lastSeenWith: gameState.title,
        };
        bondedCompanions = [
          merged,
          ...bondedCompanions.filter(c => c.name !== merged.name),
        ].slice(0, 6);
      }
      return {
        ...prev,
        soulShards: prev.soulShards + shardsEarned,
        ascensionLevel: causeOfDeath === 'Ascended' ? prev.ascensionLevel + 1 : prev.ascensionLevel,
        bondedCompanions,
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
      };
    });
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
      <AchievementToast achievement={activeAchievement} onClose={dismissAchievement} />
      <NudgeToast nudge={activeNudge} onDismiss={() => setActiveNudge(null)} />
      <Tutorial open={showTutorial} onComplete={completeTutorial} />
      {persistWarning && (
        <div
          role="alert"
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[200] bg-amber-900/90 border border-amber-500/60 text-amber-100 text-sm px-4 py-2 rounded-lg shadow-lg flex items-center gap-3"
        >
          <AlertTriangle size={16} aria-hidden="true" />
          <span>
            {persistWarning === 'corrupt' && 'A corrupted save was reset. A backup copy was kept.'}
            {persistWarning === 'quota' && 'Browser storage is nearly full — older turn images were dropped to keep saving.'}
            {persistWarning === 'unavailable' && 'Browser storage is unavailable — progress will not be saved.'}
          </span>
          <button
            onClick={clearPersistWarning}
            className="ml-2 text-amber-300 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400 rounded"
            aria-label="Dismiss notice"
          >
            ×
          </button>
        </div>
      )}

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
               onInspectCodex={setInspectCodexEntry}
               className="w-80 flex-shrink-0 relative z-10"
             />
           </div>
           <div className="flex-1 flex flex-col min-w-0 relative">
              <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex items-center justify-between px-4">
                 <div className="flex items-center gap-4">
                    <button
                      data-tutorial="sidebar-toggle"
                      onClick={() => setSidebarOpen(true)}
                      className="lg:hidden p-3 min-h-[44px] min-w-[44px] text-slate-400 hover:text-white"
                      aria-label="Open sidebar"
                    >
                      <Menu />
                    </button>
                    <span className="font-bold text-amber-500 fantasy-font tracking-widest hidden sm:block">INFINITY QUEST</span>
                    {(gameState.ascensionLevel ?? 0) > 0 && (
                      <span
                        className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-purple-950/40 border border-purple-500/40 rounded-full text-[10px] font-black tracking-widest text-purple-300 uppercase"
                        title={ASCENSION_NAMES[Math.min(gameState.ascensionLevel, ASCENSION_NAMES.length - 1)]}
                      >
                        <span aria-hidden="true">▲</span> Asc {gameState.ascensionLevel} — {ASCENSION_NAMES[Math.min(gameState.ascensionLevel, ASCENSION_NAMES.length - 1)]}
                      </span>
                    )}
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
                      className="p-3 min-h-[44px] min-w-[44px] text-slate-400 hover:text-white"
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
                 onKeywordAction={(kw) => {
                   // Match codex entry first (case-insensitive) — opens detail
                   // modal instead of burning a turn on inspection.
                   const match = gameState.codex.find(e =>
                     e.name.toLowerCase() === kw.toLowerCase() ||
                     kw.toLowerCase().includes(e.name.toLowerCase()),
                   );
                   if (match) {
                     setInspectCodexEntry(match);
                   } else {
                     processTurn(`Inspect [[${kw}]]`);
                   }
                 }}
                 typewriterSpeed={metaState.typewriterSpeed}
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

              <div className="bg-slate-900 border-t border-slate-800 p-3 sm:p-4 z-10">
                 <div className="max-w-3xl mx-auto space-y-2">
                    <QuestCompass
                      quest={gameState.currentQuest}
                      nextBeat={gameState.currentBeat}
                      sideLead={gameState.sideLead}
                    />
                    <div className="flex gap-2" data-tutorial="input">
                      <input
                        ref={inputRef}
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
                        className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-xl py-3 sm:py-4 px-4 sm:px-5 focus:outline-none focus:border-amber-500 shadow-inner min-h-[48px]"
                        placeholder={loading ? 'The narrator is weaving…' : 'What will you do?'}
                      />
                      <button
                        onClick={() => { processTurn(input); setInput(''); }}
                        disabled={loading || !input.trim()}
                        className="p-3 sm:p-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl disabled:opacity-50 transition-all hover:scale-105 active:scale-95 min-h-[48px] min-w-[48px] flex items-center justify-center"
                        aria-label="Submit action"
                      >
                        <Send size={22} />
                      </button>
                    </div>
                    {loading && (
                      <div className="text-[11px] text-slate-500 italic text-center animate-pulse">
                        {narratorHint}
                      </div>
                    )}
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
         <div className="flex-1 flex flex-col items-center justify-center space-y-10 p-6 sm:p-8 bg-[url('https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?q=80&w=2544')] bg-cover bg-center relative overflow-y-auto">
            <div className="absolute inset-0 bg-black/70" />
            <div className="relative z-10 text-center space-y-8 animate-in zoom-in duration-700 w-full max-w-2xl">
               <h1 className="text-6xl sm:text-7xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-600 fantasy-font drop-shadow-2xl tracking-tighter">INFINITY QUEST</h1>

               {hasSavedRun ? (
                 <div className="space-y-3">
                   <div className="bg-slate-900/70 backdrop-blur border border-amber-500/30 rounded-2xl p-4 text-left">
                     <div className="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em] mb-2">Last Chapter</div>
                     <div className="text-slate-200 text-sm italic line-clamp-3">
                       "{gameState.history.slice().reverse().find(t => t.role === 'model')?.text?.replace(/\[\[|\]\]/g, '').slice(0, 220) || 'Your story awaits.'}"
                     </div>
                     {gameState.location?.name && (
                       <div className="text-xs text-slate-400 mt-2">
                         {gameState.title || 'Hero'} · Lvl {gameState.level} · {gameState.location.name}
                       </div>
                     )}
                   </div>
                   <div className="flex flex-col gap-3 items-stretch">
                     <button
                       onClick={() => { SoundManager.playConfirm(); continueSavedRun(); }}
                       className="py-5 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white text-xl sm:text-2xl font-black rounded-xl shadow-2xl transition-all hover:scale-[1.02] active:scale-95 fantasy-font tracking-widest uppercase"
                     >
                       Continue Your Story
                     </button>
                     <div className="flex flex-col sm:flex-row gap-2">
                       <button
                         onClick={() => {
                           if (window.confirm('Start a new run? Your current story will be overwritten.')) {
                             SoundManager.playConfirm();
                             resetGame();
                             setShowClassSelection(true);
                           }
                         }}
                         className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-all fantasy-font uppercase tracking-widest text-sm border border-slate-700"
                       >
                         New Adventure
                       </button>
                       {metaState.pastHeroes.length > 0 && (
                         <button
                           onClick={() => { SoundManager.playConfirm(); setShowPantheon(true); }}
                           className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-xl transition-all fantasy-font uppercase tracking-widest text-sm border border-amber-500/20"
                         >
                           Pantheon
                         </button>
                       )}
                     </div>
                   </div>
                 </div>
               ) : (
                 <div className="flex flex-col gap-4 items-center">
                   <div className="p-1 bg-gradient-to-r from-amber-500 to-amber-800 rounded-2xl">
                     <button onClick={() => { SoundManager.playConfirm(); setShowClassSelection(true); }} className="px-10 sm:px-16 py-6 sm:py-8 bg-slate-900 hover:bg-slate-800 text-white text-2xl sm:text-3xl font-black rounded-xl shadow-2xl transition-all hover:scale-105 active:scale-95 fantasy-font tracking-widest border border-amber-500/30 font-bold uppercase">BEGIN ADVENTURE</button>
                   </div>
                   {metaState.pastHeroes.length > 0 && (
                     <button onClick={() => { SoundManager.playConfirm(); setShowPantheon(true); }} className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-amber-500 text-xl font-bold rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 fantasy-font tracking-widest border border-amber-500/20 uppercase">ENTER PANTHEON</button>
                   )}
                 </div>
               )}
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
            metaState={metaState}
            onSelect={(cls, stats, items, imageUrl) => {
               const bonuses = computeSanctuaryBonuses(metaState.sanctuary);
               const upgradedStarters = applyArmoryRarityUpgrade(items, bonuses.rarityUpgrade);
               const finalInventory = [...upgradedStarters, ...bonuses.extraItems];
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

               const startingHp = INITIAL_HP + bonuses.bonusHp;

               // Most recent bonded companion (if any) reunites with the hero.
               const bonded = [...(metaState.bondedCompanions ?? [])].sort((a, b) => b.lastSeenAt - a.lastSeenAt)[0];

               // Snapshot meta for the end-of-run reveal so we can diff what
               // the player earned during this run.
               setMetaState(prev => ({
                 ...prev,
                 runSnapshot: {
                   achievementsAtStart: [...(prev.unlockedAchievements ?? [])],
                   classesAtStart: [...(prev.unlockedClasses ?? [])],
                   codexIdsAtStart: [],
                   soulShardsAtStart: prev.soulShards,
                   nemesisAtStart: prev.activeNemesis?.name,
                 },
               }));

               setGameState(prev => ({
                 ...prev,
                 playerClass: cls,
                 stats: finalStats,
                 inventory: finalInventory,
                 gold: (prev.gold || 0) + bonuses.bonusGold,
                 currentHp: startingHp,
                 maxHp: startingHp,
                 title: 'The ' + cls,
                 portraitUrl: imageUrl,
                 activeNemesis: metaState.activeNemesis,
                 ascensionLevel: metaState.ascensionLevel ?? 0,
                 companion: bonded
                   ? {
                       name: bonded.name,
                       species: bonded.species,
                       personality: bonded.personality,
                       portraitUrl: bonded.portraitUrl,
                       bondLevel: bonded.bondLevel ?? 0,
                       bondXp: bonded.bondXp ?? 0,
                       bondMemories: bonded.bondMemories ?? [],
                     }
                   : prev.companion,
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
      <CodexEntryModal entry={inspectCodexEntry} onClose={() => setInspectCodexEntry(null)} />
      <ShrineModal
        isOpen={!!gameState.foundShrine}
        inventory={gameState.inventory}
        heroName={gameState.title}
        onBury={(item, note) => {
          setMetaState(prev => ({
            ...prev,
            legacyItems: [
              ...(prev.legacyItems ?? []),
              {
                ...item,
                buriedBy: gameState.title || 'A Forgotten Hero',
                buriedAt: Date.now(),
                note,
              },
            ],
          }));
          setGameState(prev => ({
            ...prev,
            inventory: prev.inventory.filter(i => i.name !== item.name),
            foundShrine: false,
          }));
          addFloatingText('Heirloom buried', 'xp');
          SoundManager.playConfirm();
          processTurn(`I bury the ${item.name} at the shrine and leave. Note: "${note}"`);
        }}
        onSkip={() => {
          setGameState(prev => ({ ...prev, foundShrine: false }));
          processTurn('I leave the shrine without burying anything.');
        }}
      />
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
        onNewGame={() => { setSettingsOpen(false); resetGame(); }}
        typewriterSpeed={metaState.typewriterSpeed ?? 'normal'}
        onTypewriterSpeedChange={(speed) => setMetaState(prev => ({ ...prev, typewriterSpeed: speed }))}
        masterVolume={metaState.masterVolume ?? 0.6}
        onMasterVolumeChange={(v) => setMetaState(prev => ({ ...prev, masterVolume: v }))}
        musicVolume={metaState.musicVolume ?? 0.5}
        onMusicVolumeChange={(v) => setMetaState(prev => ({ ...prev, musicVolume: v }))}
        musicEnabled={metaState.musicEnabled !== false}
        onMusicEnabledChange={(v) => setMetaState(prev => ({ ...prev, musicEnabled: v }))}
        nudgesEnabled={metaState.nudgesEnabled !== false}
        onNudgesEnabledChange={(v) => setMetaState(prev => ({ ...prev, nudgesEnabled: v }))}
        onResetTutorial={() => {
          setMetaState(prev => ({ ...prev, tutorialCompleted: false }));
          setSettingsOpen(false);
          if (gameStarted) setShowTutorial(true);
        }}
      />
      <GameOverModal
        isOpen={gameState.isGameOver}
        gameState={gameState}
        metaState={metaState}
        onContinue={(shardsEarned) => handleRunEnd(shardsEarned, gameState.gameOverCause || 'Unknown')}
      />
      <VictoryModal
        isOpen={gameState.isVictory}
        gameState={gameState}
        metaState={metaState}
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
          <AlertTriangle className="text-amber-500 w-16 h-16 mx-auto mb-6" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-white mb-2 fantasy-font">Bring Your Own Key</h1>
          <p className="text-slate-400 mb-6 text-sm leading-relaxed">
            Infinity Quest runs entirely in your browser and calls Google Gemini directly — so you supply the key.
            It takes about two minutes:
          </p>
        </div>

        <ol className="text-slate-300 text-sm space-y-2 mb-6 bg-slate-900/60 border border-slate-700 rounded-lg p-4">
          <li><span className="text-amber-500 font-bold">1.</span> Open <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">aistudio.google.com/apikey</a> (free, Google account).</li>
          <li><span className="text-amber-500 font-bold">2.</span> Click <em>Create API key</em> and copy the value.</li>
          <li><span className="text-amber-500 font-bold">3.</span> Paste it below — it is stored only in this browser.</li>
        </ol>

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
