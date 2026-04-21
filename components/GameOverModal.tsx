
import React, { useEffect, useState } from 'react';
import { GameState } from '../types';
import { Skull, Trophy, Star, BookOpen, Crown } from 'lucide-react';

interface GameOverModalProps {
  isOpen: boolean;
  gameState: GameState;
  onContinue: (shardsEarned: number) => void;
}

const GameOverModal: React.FC<GameOverModalProps> = ({ isOpen, gameState, onContinue }) => {
  const [scoreBreakdown, setScoreBreakdown] = useState<{
    levelScore: number;
    lootScore: number;
    codexScore: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen && !scoreBreakdown) {
      // Calculate Score
      const levelScore = gameState.level * 100;
      
      const lootScore = gameState.inventory.reduce((acc, item) => {
        switch (item.rarity) {
          case 'legendary': return acc + 50;
          case 'epic': return acc + 25;
          case 'rare': return acc + 10;
          case 'uncommon': return acc + 5;
          default: return acc + 1;
        }
      }, 0);

      const codexScore = (gameState.codex?.length || 0) * 10;
      
      const total = levelScore + lootScore + codexScore;
      
      setScoreBreakdown({ levelScore, lootScore, codexScore, total });
    }
  }, [isOpen, gameState]);

  if (!isOpen || !scoreBreakdown) return null;

  return (
    <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-1000" role="dialog" aria-modal="true" aria-labelledby="gameover-title">
      <div className="max-w-lg w-full bg-slate-900 border border-red-900/50 rounded-2xl p-8 text-center relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-slate-900/50 to-slate-950 pointer-events-none" />
        
        <div className="relative z-10 space-y-6">
          <div className="inline-block p-4 bg-red-900/20 rounded-full border border-red-500/30 mb-2">
             <Skull size={48} className="text-red-500 animate-pulse" />
          </div>
          
          <h1 id="gameover-title" className="text-4xl font-bold text-red-500 fantasy-font uppercase tracking-[0.2em] mb-2">
             Fallen Hero
          </h1>
          
          <p className="text-slate-400 italic">
            "Your journey ends here, but your soul persists..."
          </p>
          
          {gameState.gameOverCause && (
             <div className="py-2 px-4 bg-red-950/80 border border-red-700/70 rounded-lg inline-block text-sm text-red-100">
               Slain by: <span className="font-bold text-white">{gameState.gameOverCause}</span>
             </div>
          )}

          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 space-y-3">
             <h3 className="text-amber-500 font-bold uppercase tracking-widest text-sm mb-4 border-b border-slate-700 pb-2">Soul Shards Earned</h3>
             
             <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 flex items-center gap-2"><Crown size={14}/> Level {gameState.level}</span>
                <span className="text-slate-200">+{scoreBreakdown.levelScore}</span>
             </div>
             <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 flex items-center gap-2"><Trophy size={14}/> Epic Loot</span>
                <span className="text-slate-200">+{scoreBreakdown.lootScore}</span>
             </div>
             <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 flex items-center gap-2"><BookOpen size={14}/> Discoveries</span>
                <span className="text-slate-200">+{scoreBreakdown.codexScore}</span>
             </div>

             <div className="flex justify-between items-center pt-4 mt-2 border-t border-slate-700">
                <span className="text-lg font-bold text-slate-200">Total Shards</span>
                <span className="text-2xl font-bold text-amber-500 flex items-center gap-2">
                   <Star size={20} fill="currentColor" /> {scoreBreakdown.total}
                </span>
             </div>
          </div>

          <button 
             onClick={() => onContinue(scoreBreakdown.total)}
             className="w-full py-4 bg-gradient-to-r from-red-900 to-slate-900 hover:from-red-800 hover:to-slate-800 border border-red-700 text-red-100 font-bold rounded-xl uppercase tracking-widest transition-all hover:scale-105 shadow-[0_0_20px_rgba(185,28,28,0.3)]"
          >
             Enter The Pantheon
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverModal;
