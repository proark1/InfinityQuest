import { useEffect } from 'react';
import { GameState, MetaState } from '../types';
import { AmbientEngine, AmbientMood } from '../utils/ambientEngine';

const pickMood = (game: GameState): AmbientMood => {
  if (game.isVictory) return 'victory';
  if (game.isGameOver) return 'defeat';
  if (game.activeEnemy) return 'combat';
  if (game.activeMerchant) return 'explore';
  if (game.currentHp > 0 && game.currentHp / Math.max(1, game.maxHp) > 0.9 && game.adrenaline < 20) {
    return 'rest';
  }
  return 'explore';
};

/** Keeps the AmbientEngine in sync with game + user preferences. */
export function useAmbient(gameState: GameState, metaState: MetaState, interactionReady: boolean): void {
  // The engine must be primed by a user gesture. We call it once the app is
  // past the API-key gate (interactionReady) and the player has done at least
  // one click (SoundManager already plays on many interactions, so the
  // AudioContext is almost certainly unlocked by this point — but we still
  // call prime() defensively).
  useEffect(() => {
    if (!interactionReady) return;
    AmbientEngine.prime();
  }, [interactionReady]);

  const musicEnabled = metaState.musicEnabled !== false;
  const master = metaState.masterVolume ?? 0.6;
  const music = metaState.musicVolume ?? 0.5;

  useEffect(() => {
    AmbientEngine.setEnabled(interactionReady && musicEnabled);
  }, [interactionReady, musicEnabled]);

  useEffect(() => { AmbientEngine.setMasterVolume(master); }, [master]);
  useEffect(() => { AmbientEngine.setMusicVolume(music); }, [music]);
  useEffect(() => { AmbientEngine.setMusicEnabled(musicEnabled); }, [musicEnabled]);

  useEffect(() => { AmbientEngine.setBiome(gameState.location?.biome); }, [gameState.location?.biome]);
  useEffect(() => { AmbientEngine.setWeather(gameState.location?.weather); }, [gameState.location?.weather]);
  useEffect(() => { AmbientEngine.setMood(pickMood(gameState)); }, [
    gameState.activeEnemy?.name,
    gameState.activeMerchant?.name,
    gameState.isGameOver,
    gameState.isVictory,
    gameState.currentHp,
    gameState.maxHp,
    gameState.adrenaline,
  ]);
}
