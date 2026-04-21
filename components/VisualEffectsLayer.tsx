
import React, { useEffect, useState } from 'react';
import { GameState } from '../types';
import { AlertTriangle } from 'lucide-react';

interface VisualEffectsLayerProps {
  gameState: GameState;
}

const VisualEffectsLayer: React.FC<VisualEffectsLayerProps> = ({ gameState }) => {
  const hpPercentage = (gameState.currentHp / gameState.maxHp) * 100;
  const isLowHealth = hpPercentage < 30;
  const isCriticalHealth = hpPercentage < 15;
  const isFlowState = (gameState.flowStreak || 0) >= 3;
  
  const [weatherShift, setWeatherShift] = useState(false);

  useEffect(() => {
     setWeatherShift(true);
     const timer = setTimeout(() => setWeatherShift(false), 2000);
     return () => clearTimeout(timer);
  }, [gameState.location?.weather]);

  const hasStatus = (type: string) => gameState.statusEffects.some(e => e.type === type);

  return (
    <div className="fixed inset-0 pointer-events-none z-[55] overflow-hidden">
      
      {/* Weather Shift Flash */}
      {weatherShift && (
         <div className="absolute inset-0 bg-white/5 animate-pulse duration-1000" />
      )}

      {/* Poison Effect Overlay */}
      {hasStatus('Poison') && (
         <div className="absolute inset-0 bg-emerald-500/10 mix-blend-color-burn animate-pulse" />
      )}

      {/* Burn Effect Overlay */}
      {hasStatus('Burn') && (
         <div className="absolute inset-0 bg-orange-500/10 mix-blend-color-dodge animate-pulse" />
      )}
      
      {/* Freeze Effect Overlay */}
      {hasStatus('Freeze') && (
         <div className="absolute inset-0 bg-cyan-500/5 border-[40px] border-cyan-500/10 animate-in fade-in zoom-in" />
      )}

      {/* Low Health Vignette */}
      <div 
        className={`absolute inset-0 transition-opacity duration-1000 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(185,28,28,0.4)_100%)] ${isLowHealth ? 'opacity-100 animate-pulse-slow' : 'opacity-0'}`}
        style={{ animationDuration: isCriticalHealth ? '0.8s' : '2s' }}
      />
      
      {/* Critical Health Veins */}
      {isCriticalHealth && (
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/blood-splatter.png')] opacity-20 mix-blend-overlay" />
      )}

      {/* Flow State Effect (Blue/Cyan border energy) */}
      <div 
         className={`absolute inset-0 transition-opacity duration-700 bg-[radial-gradient(circle_at_center,transparent_70%,rgba(6,182,212,0.3)_100%)] ${isFlowState ? 'opacity-100 animate-pulse' : 'opacity-0'}`} 
      />
      {isFlowState && (
         <div className="absolute top-20 left-1/2 -translate-x-1/2 text-cyan-400 font-bold uppercase tracking-[0.5em] text-xs animate-in slide-in-from-top fade-in">
            Flow State Active (2x Adrenaline)
         </div>
      )}

      {/* Boss Warning Banner */}
      {gameState.activeEnemy && gameState.isBossFight && !gameState.isVictory && !gameState.isGameOver && (
         <div className="absolute top-20 left-0 right-0 animate-in slide-in-from-top fade-in duration-1000">
            <div className="bg-red-900/80 backdrop-blur border-y border-red-500 py-2 overflow-hidden relative">
               <div className="absolute inset-0 bg-red-500/20 animate-pulse" />
               <div className="flex items-center justify-center gap-4 text-red-100 font-bold tracking-[0.3em] uppercase">
                  <AlertTriangle className="text-red-500 animate-bounce" />
                  Boss Encounter Active
                  <AlertTriangle className="text-red-500 animate-bounce" />
               </div>
            </div>
         </div>
      )}

      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default React.memo(VisualEffectsLayer);
