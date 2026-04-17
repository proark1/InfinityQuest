
import React, { useEffect, useState } from 'react';
import { GameState } from '../types';
import { Crown, Sparkles, Star, ArrowUp } from 'lucide-react';

interface VictoryModalProps {
  isOpen: boolean;
  gameState: GameState;
  onAscend: (shardsEarned: number) => void;
}

const VictoryModal: React.FC<VictoryModalProps> = ({ isOpen, gameState, onAscend }) => {
  const [bonusShards, setBonusShards] = useState(0);

  useEffect(() => {
    if (isOpen) {
      // Victory Bonus Calculation (Base 500 + Multipliers)
      let bonus = 500;
      bonus += gameState.level * 20;
      bonus += (gameState.inventory.filter(i => i.rarity === 'legendary').length * 100);
      setBonusShards(bonus);
    }
  }, [isOpen, gameState]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-1000">
      <div className="max-w-lg w-full bg-slate-900 border border-amber-500/50 rounded-2xl p-8 text-center relative overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.2)]">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-slate-900/50 to-slate-950 pointer-events-none" />
        
        <div className="relative z-10 space-y-6">
          <div className="inline-block p-6 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-full border-4 border-slate-900 shadow-xl mb-4 animate-bounce">
             <Crown size={48} className="text-white" />
          </div>
          
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 fantasy-font uppercase tracking-widest mb-2">
             Victory
          </h1>
          
          <p className="text-slate-300 italic text-lg">
            "You have conquered the abyss and shattered the cycle."
          </p>

          <div className="bg-slate-800/80 rounded-xl p-6 border border-amber-500/30 space-y-4">
             <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">Ascension Rewards</div>
             
             <div className="flex justify-between items-center text-lg">
                <span className="text-slate-200 flex items-center gap-2"><Star className="text-amber-500" size={18}/> Soul Shards</span>
                <span className="text-2xl font-bold text-amber-400">+{bonusShards}</span>
             </div>

             <div className="flex justify-between items-center text-lg">
                <span className="text-slate-200 flex items-center gap-2"><ArrowUp className="text-purple-500" size={18}/> World Tier</span>
                <span className="text-2xl font-bold text-purple-400">+{1}</span>
             </div>
          </div>

          <button 
             onClick={() => onAscend(bonusShards)}
             className="w-full py-4 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-bold rounded-xl uppercase tracking-widest transition-all hover:scale-105 shadow-lg group relative overflow-hidden"
          >
             <span className="relative z-10 flex items-center justify-center gap-2">
                <Sparkles size={18} /> Ascend to New Game+
             </span>
             <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VictoryModal;
