import { useCallback, useRef, useState } from 'react';
import {
  AppSettings,
  FloatingText,
  GameState,
  MetaState,
  SkillCheck,
  WorldRoll,
} from '../types';
import {
  generateCharacterImage,
  generateEnemyImage,
  generateMapImage,
  generateSceneImage,
  generateStoryTurn,
} from '../services/geminiService';
import { SoundManager } from '../utils/soundEffects';
import {
  ADRENALINE_MAX,
  HISTORY_CONTEXT_WINDOW,
  HUNGER_THIRST_MAX,
  REPUTATION_MAX,
  REPUTATION_MIN,
  REPUTATION_STATUS,
  clamp,
  newId,
} from '../utils/constants';

interface UseGameTurnArgs {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  settings: AppSettings;
  metaState: MetaState;
  addFloatingText: (text: string, type: FloatingText['type']) => void;
  setActiveSkillCheck: React.Dispatch<React.SetStateAction<SkillCheck | null>>;
  setActiveWorldRoll: React.Dispatch<React.SetStateAction<WorldRoll | null>>;
  activeSkillCheck: SkillCheck | null;
  activeWorldRoll: WorldRoll | null;
}

interface UseGameTurn {
  loading: boolean;
  processTurn: (userAction: string, isInitial?: boolean, systemOverride?: string) => Promise<void>;
}

export function useGameTurn({
  gameState,
  setGameState,
  settings,
  metaState,
  addFloatingText,
  setActiveSkillCheck,
  setActiveWorldRoll,
  activeSkillCheck,
  activeWorldRoll,
}: UseGameTurnArgs): UseGameTurn {
  const [loading, setLoading] = useState<boolean>(false);

  const stateRef = useRef(gameState);
  stateRef.current = gameState;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const metaRef = useRef(metaState);
  metaRef.current = metaState;
  const skillCheckRef = useRef(activeSkillCheck);
  skillCheckRef.current = activeSkillCheck;
  const worldRollRef = useRef(activeWorldRoll);
  worldRollRef.current = activeWorldRoll;

  const processTurn = useCallback(
    async (userAction: string, isInitial: boolean = false, systemOverride?: string) => {
      const current = stateRef.current;
      const currentSettings = settingsRef.current;
      const currentMeta = metaRef.current;

      if (
        (!userAction.trim() && !isInitial) ||
        skillCheckRef.current ||
        worldRollRef.current ||
        current.isGameOver ||
        current.isVictory
      ) {
        return;
      }

      SoundManager.playClick();
      setLoading(true);

      const historyWithUser = [...current.history];
      if (!isInitial && !systemOverride) {
        historyWithUser.push({ id: newId(), role: 'user', text: userAction });
        setGameState(prev => ({ ...prev, history: historyWithUser }));
      }

      try {
        const aiResponse = await generateStoryTurn(
          historyWithUser
            .slice(-HISTORY_CONTEXT_WINDOW)
            .map(t => `${t.role === 'user' ? 'Player' : 'Master'}: ${t.text}`)
            .join('\n'),
          systemOverride || userAction,
          current.inventory,
          current.currentQuest,
          current.stats,
          current.level,
          current.currentXp,
          current.nextLevelXp,
          current.playerClass,
          currentSettings,
          current.activeBlessings,
          current.reputation,
          undefined,
          currentMeta.sanctuary,
          current.currentAct,
          current.actProgress,
          current.ascensionLevel,
          current.hunger,
          current.thirst,
          current.activeEnemy,
          current.location,
          current.activeMerchant,
          current.currentHp,
          current.maxHp,
        );

        if (aiResponse.worldRoll) {
          setActiveWorldRoll(aiResponse.worldRoll);
        }

        if (aiResponse.skillCheck) {
          setActiveSkillCheck(aiResponse.skillCheck);
          setGameState(prev => ({
            ...prev,
            history: [
              ...historyWithUser,
              {
                id: newId(),
                role: 'model',
                text: aiResponse.narrative + '\n\n[DICE ROLL REQUIRED]',
                choices: [],
              },
            ],
          }));
          setLoading(false);
          return;
        }

        if (aiResponse.portraitPrompt) {
          generateCharacterImage(aiResponse.portraitPrompt).then(url => {
            if (url) setGameState(prev => ({ ...prev, portraitUrl: url }));
          });
        }

        if (aiResponse.location && !current.maps[aiResponse.location.name]) {
          const loc = aiResponse.location;
          generateMapImage(loc.name, loc.biome).then(url => {
            if (url) {
              setGameState(prev => ({
                ...prev,
                maps: { ...prev.maps, [loc.name]: url },
              }));
            }
          });
        }

        const turnId = newId();

        if (currentSettings.autoGenerateImages && aiResponse.visualPrompt) {
          generateSceneImage(aiResponse.visualPrompt, currentSettings.imageSize).then(url => {
            setGameState(prev => ({
              ...prev,
              history: prev.history.map(t =>
                t.id === turnId
                  ? url
                    ? { ...t, imageUrl: url, imageLoading: false }
                    : { ...t, imageLoading: false }
                  : t,
              ),
            }));
          });
        }

        let nextEnemyForImage: { name: string; description: string } | null = null;

        setGameState(prev => {
          const newInventoryFromAI = aiResponse.inventory || [];
          const mergedInventory = [...newInventoryFromAI];
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
            currentHp: clamp(prev.currentHp + (aiResponse.hpChange || 0), 0, prev.maxHp),
            hunger: clamp(prev.hunger + (aiResponse.hungerChange || 0), 0, HUNGER_THIRST_MAX),
            thirst: clamp(prev.thirst + (aiResponse.thirstChange || 0), 0, HUNGER_THIRST_MAX),
            adrenaline: Math.min(
              ADRENALINE_MAX,
              (prev.adrenaline || 0) + (prev.activeEnemy ? 20 : 10),
            ),
            location: aiResponse.location || prev.location,
            activeMerchant: aiResponse.merchant || undefined,
            isBossFight: aiResponse.isBossFight || false,
            isVictory: aiResponse.isVictory || false,
            history: [
              ...historyWithUser,
              {
                id: turnId,
                role: 'model',
                text: aiResponse.narrative,
                choices: aiResponse.choices,
                isBossTurn: aiResponse.isBossFight,
                imageLoading: currentSettings.autoGenerateImages && !!aiResponse.visualPrompt,
              },
            ],
          };

          if (aiResponse.newAbilities && aiResponse.newAbilities.length > 0) {
            nextState.abilities = [...prev.abilities, ...aiResponse.newAbilities];
          }

          if (aiResponse.newCodexEntries && aiResponse.newCodexEntries.length > 0) {
            nextState.codex = [...prev.codex, ...aiResponse.newCodexEntries];
          }

          if (aiResponse.reputationChange && aiResponse.reputationChange.length > 0) {
            const updatedReputation = prev.reputation.map(r => ({ ...r }));
            aiResponse.reputationChange.forEach(change => {
              const existing = updatedReputation.find(r => r.faction === change.faction);
              if (existing) {
                existing.value = clamp(existing.value + change.amount, REPUTATION_MIN, REPUTATION_MAX);
                existing.status = REPUTATION_STATUS(existing.value);
              } else {
                const clamped = clamp(change.amount, REPUTATION_MIN, REPUTATION_MAX);
                updatedReputation.push({
                  faction: change.faction,
                  value: clamped,
                  status: REPUTATION_STATUS(clamped),
                });
              }
            });
            nextState.reputation = updatedReputation;
          }

          if (aiResponse.combat?.newEnemy) {
            const enemy = {
              ...aiResponse.combat.newEnemy,
              currentHp: aiResponse.combat.newEnemy.maxHp,
              statusEffects: [],
            };
            nextState.activeEnemy = enemy;
            nextEnemyForImage = { name: enemy.name, description: enemy.description };
          }

          if (aiResponse.combat?.enemyDefeated) {
            SoundManager.playEnemyDefeat();
            nextState.activeEnemy = undefined;
            addFloatingText('VANQUISHED!', 'info');
          }

          if (aiResponse.hpChange && aiResponse.hpChange < 0) {
            SoundManager.playDamage();
            addFloatingText(`${aiResponse.hpChange} HP`, 'damage');
          } else if (aiResponse.hpChange && aiResponse.hpChange > 0) {
            SoundManager.playHeal();
            addFloatingText(`+${aiResponse.hpChange} HP`, 'heal');
          }

          if (aiResponse.goldChange && aiResponse.goldChange > 0) {
            SoundManager.playGold();
            addFloatingText(`+${aiResponse.goldChange} Gold`, 'gold');
          }

          return nextState;
        });

        if (nextEnemyForImage) {
          const { name, description } = nextEnemyForImage;
          generateEnemyImage(description).then(url => {
            if (!url) return;
            setGameState(prev =>
              prev.activeEnemy?.name === name
                ? { ...prev, activeEnemy: { ...prev.activeEnemy, imageUrl: url } }
                : prev,
            );
          });
        }
      } catch (error) {
        console.error('Turn generation error:', error);
      } finally {
        setLoading(false);
      }
    },
    [setGameState, setActiveSkillCheck, setActiveWorldRoll, addFloatingText],
  );

  return { loading, processTurn };
}
