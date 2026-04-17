
import React from 'react';
import { GameState, InventoryItem } from '../types';
import { Sword, Shield, Footprints, Heart, ShoppingBag, ArrowRight, X, Flame, Dices } from 'lucide-react';
import { SoundManager } from '../utils/soundEffects';

interface ActionOverlayProps {
  gameState: GameState;
  onAction: (action: string) => void;
  onPlayDice: () => void;
  disabled: boolean;
}

const ActionOverlay: React.FC<ActionOverlayProps> = ({ gameState, onAction, onPlayDice, disabled }) => {
  if (gameState.isGameOver || gameState.isVictory) return null;

  // Ultimate Ability Button (Limit Break)
  const isLimitBreakReady = (gameState.adrenaline || 0) >= 100;
  
  // Extra safety: explicitly stringify and handle potential non-string values
  const pClassRaw = gameState?.playerClass || 'Traveler';
  const pClass = String(typeof pClassRaw === 'string' ? pClassRaw : 'Traveler');
  const upperClass = typeof pClass.toUpperCase === 'function' ? pClass.toUpperCase() : 'TRAVELER';

  // Combat Mode
  if (gameState.activeEnemy) {
    return (
      <div className="absolute bottom-24 left-0 right-0 z-20 flex justify-center px-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
        <div className="flex flex-col items-center gap-4 w-full max-w-2xl">
          
          {/* Limit Break Button */}
          {isLimitBreakReady && (
             <button
                onClick={() => { SoundManager.playCrit(); onAction(`ACTIVATE LIMIT BREAK: ULTIMATE ${upperClass} TECHNIQUE!`); }}
                disabled={disabled}
                className="w-full py-3 bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 bg-[length:200%_auto] animate-[gradient_2s_linear_infinite] text-white font-black text-xl italic uppercase tracking-widest border-2 border-yellow-300 shadow-[0_0_30px_rgba(245,158,11,0.6)] rounded-xl transform hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
             >
                <Flame className="animate-bounce" /> ULTIMATE ABILITY READY <Flame className="animate-bounce" />
             </button>
          )}

          <div className="bg-black/60 backdrop-blur-md border border-red-500/30 p-4 rounded-2xl shadow-2xl flex gap-3 w-full justify-center flex-wrap">
            <button
              onClick={() => { SoundManager.playClick(); onAction(`Attack ${gameState.activeEnemy?.name || 'Enemy'} with weapon`); }}
              onMouseEnter={() => SoundManager.playHover()}
              disabled={disabled}
              className="flex-1 min-w-[120px] bg-red-900/80 hover:bg-red-800 border border-red-600 text-white py-4 rounded-xl font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 flex flex-col items-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.4)]"
            >
              <Sword size={24} /> Attack
            </button>
            <button
              onClick={() => { SoundManager.playClick(); onAction(`Defend against ${gameState.activeEnemy?.name || 'Enemy'}`); }}
              onMouseEnter={() => SoundManager.playHover()}
              disabled={disabled}
              className="flex-1 min-w-[120px] bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 py-4 rounded-xl font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 flex flex-col items-center gap-2"
            >
              <Shield size={24} /> Defend
            </button>
            <button
              onClick={() => { SoundManager.playHeal(); onAction("Drink Healing Potion"); }}
              onMouseEnter={() => SoundManager.playHover()}
              disabled={disabled || !gameState.inventory.some(i => String(i.name || '').includes("Potion"))}
              className="flex-1 min-w-[120px] bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-600 text-white py-4 rounded-xl font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 flex flex-col items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Heart size={24} /> Heal
            </button>
            <button
              onClick={() => { SoundManager.playClick(); onAction("Flee from combat"); }}
              onMouseEnter={() => SoundManager.playHover()}
              disabled={disabled}
              className="flex-1 min-w-[120px] bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-400 py-4 rounded-xl font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 flex flex-col items-center gap-2"
            >
              <Footprints size={24} /> Flee
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Merchant Mode
  if (gameState.activeMerchant) {
    return (
      <div className="absolute bottom-24 left-0 right-0 z-20 flex justify-center px-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
        <div className="bg-black/80 backdrop-blur-md border border-amber-500/30 p-6 rounded-2xl shadow-2xl w-full max-w-3xl">
          <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
            <h3 className="text-xl font-bold text-amber-500 flex items-center gap-2">
               <ShoppingBag /> {gameState.activeMerchant.name}'s Wares
            </h3>
            <button onClick={() => { SoundManager.playCancel(); onAction("Leave shop"); }} className="text-slate-400 hover:text-white"><X size={20} /></button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 max-h-60 overflow-y-auto custom-scrollbar">
             {gameState.activeMerchant.inventory.map((item, idx) => {
               const cost = item.value || 50;
               const canAfford = gameState.gold >= cost;
               return (
                  <button 
                     key={idx}
                     onClick={() => { if (canAfford) { SoundManager.playGold(); onAction(`Buy ${item.name}`); } }}
                     onMouseEnter={() => SoundManager.playHover()}
                     disabled={disabled || !canAfford}
                     className={`p-3 rounded-lg border text-left transition-all relative group ${canAfford ? 'bg-slate-800 border-slate-600 hover:border-amber-500 hover:bg-slate-700' : 'bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed'}`}
                  >
                     <div className="font-bold text-slate-200 text-sm truncate">{item.name}</div>
                     <div className="text-xs text-amber-500 font-mono">{cost} Gold</div>
                     {canAfford && <div className="absolute inset-0 bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />}
                  </button>
               );
             })}
          </div>
          
          <div className="flex gap-2 justify-end">
             <button
               onClick={onPlayDice}
               onMouseEnter={() => SoundManager.playHover()}
               disabled={disabled}
               className="px-4 py-2 bg-indigo-900/50 hover:bg-indigo-800 border border-indigo-500/50 text-indigo-200 rounded-lg font-bold text-sm flex items-center gap-2"
             >
                <Dices size={16} /> Play Dice
             </button>
             <button 
               onClick={() => { SoundManager.playGold(); onAction("Sell Items"); }}
               onMouseEnter={() => SoundManager.playHover()}
               disabled={disabled}
               className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-600 font-bold text-sm"
             >
                Sell My Loot
             </button>
             <button 
               onClick={() => { SoundManager.playCancel(); onAction("Leave shop"); }}
               onMouseEnter={() => SoundManager.playHover()}
               disabled={disabled}
               className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-sm"
             >
                Leave
             </button>
          </div>
        </div>
      </div>
    );
  }

  // Exploration Mode (Use Suggestions)
  const lastTurn = gameState.history[gameState.history.length - 1];
  if (lastTurn && lastTurn.choices && lastTurn.choices.length > 0) {
     return (
        <div className="absolute bottom-24 left-0 right-0 z-20 flex justify-center px-4 pointer-events-none">
           <div className="flex flex-wrap gap-2 justify-center max-w-4xl pointer-events-auto">
              {lastTurn.choices.map((choice, idx) => (
                 <button
                    key={idx}
                    onClick={() => { SoundManager.playClick(); onAction(choice); }}
                    onMouseEnter={() => SoundManager.playHover()}
                    disabled={disabled}
                    className="bg-slate-900/90 backdrop-blur border border-slate-600 hover:border-amber-500 text-slate-200 px-5 py-3 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 text-sm font-medium flex items-center gap-2 group"
                 >
                    {choice} <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity -ml-2 group-hover:ml-0" />
                 </button>
              ))}
           </div>
        </div>
     );
  }

  return null;
};

export default ActionOverlay;
