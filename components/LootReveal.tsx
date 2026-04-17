
import React, { useState } from 'react';
import { InventoryItem } from '../types';
import { Package, Sparkles, Star } from 'lucide-react';
import { SoundManager } from '../utils/soundEffects';

interface LootRevealProps {
  items: InventoryItem[];
  onClose: () => void;
}

const LootReveal: React.FC<LootRevealProps> = ({ items, onClose }) => {
  const [stage, setStage] = useState<'closed' | 'opening' | 'revealed'>('closed');
  const [revealedCount, setRevealedCount] = useState(0);

  const handleOpen = () => {
    if (stage === 'closed') {
      SoundManager.playConfirm();
      setStage('opening');
      setTimeout(() => {
        setStage('revealed');
        // Stagger reveal of multiple items
        let count = 0;
        const interval = setInterval(() => {
          if (count < items.length) {
             const item = items[count];
             SoundManager.playLoot(item.rarity);
          }
          count++;
          setRevealedCount(count);
          if (count >= items.length) clearInterval(interval);
        }, 500);
      }, 1000); // Wait for open animation
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'text-amber-400 border-amber-500 shadow-amber-500/50 bg-amber-900/30';
      case 'epic': return 'text-purple-400 border-purple-500 shadow-purple-500/50 bg-purple-900/30';
      case 'rare': return 'text-blue-400 border-blue-500 shadow-blue-500/50 bg-blue-900/30';
      default: return 'text-slate-200 border-slate-500 shadow-slate-500/20 bg-slate-800';
    }
  };

  const getRarityBg = (rarity: string) => {
     switch(rarity) {
        case 'legendary': return 'from-amber-500/20 to-amber-900/50';
        case 'epic': return 'from-purple-500/20 to-purple-900/50';
        case 'rare': return 'from-blue-500/20 to-blue-900/50';
        default: return 'from-slate-700/20 to-slate-900/50';
     }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-300">
      
      {/* Background Rays for Legendary Loot */}
      {stage === 'revealed' && items.some(i => i.rarity === 'legendary' || i.rarity === 'epic') && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200vmax] h-[200vmax] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(251,191,36,0.1)_20deg,transparent_40deg,rgba(251,191,36,0.1)_60deg,transparent_80deg,rgba(251,191,36,0.1)_100deg,transparent_120deg)] animate-spin-slow opacity-50" />
        </div>
      )}

      <div className="relative z-10 w-full max-w-2xl text-center">
        
        {stage === 'closed' && (
          <div className="cursor-pointer group transform transition-all hover:scale-105" onClick={handleOpen} onMouseEnter={() => SoundManager.playHover()}>
             <div className="relative inline-block">
                <Package size={128} strokeWidth={1} className="text-amber-500 drop-shadow-[0_0_30px_rgba(245,158,11,0.5)] group-hover:drop-shadow-[0_0_50px_rgba(245,158,11,0.8)] transition-all" />
                <div className="absolute -top-4 -right-4 animate-bounce">
                   <div className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full border border-red-400 shadow-lg">
                      {items.length} Items!
                   </div>
                </div>
             </div>
             <h2 className="text-2xl font-bold text-white mt-8 fantasy-font animate-pulse">Click to Open</h2>
          </div>
        )}

        {stage === 'opening' && (
           <div className="animate-[ping_0.5s_cubic-bezier(0,0,0.2,1)_infinite]">
              <Package size={140} strokeWidth={1} className="text-white mx-auto blur-sm" />
           </div>
        )}

        {stage === 'revealed' && (
          <div className="space-y-6">
             <h2 className="text-3xl font-bold text-white fantasy-font mb-8 drop-shadow-lg">Loot Acquired</h2>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item, idx) => (
                   <div 
                     key={idx}
                     className={`transform transition-all duration-500 ${idx < revealedCount ? 'scale-100 opacity-100 translate-y-0' : 'scale-50 opacity-0 translate-y-10'}`}
                   >
                      <div className={`p-6 rounded-xl border-2 flex flex-col items-center gap-3 relative overflow-hidden group hover:scale-105 transition-transform bg-gradient-to-br shadow-[0_0_20px_rgba(0,0,0,0.3)] ${getRarityColor(item.rarity)} ${getRarityBg(item.rarity)}`}>
                         {/* Flash effect on reveal */}
                         <div className="absolute inset-0 bg-white/50 animate-flash" style={{ animationDelay: `${idx * 0.1}s` }} />
                         
                         {item.rarity === 'legendary' && <Sparkles className="absolute top-2 right-2 text-yellow-200 animate-spin" size={16} />}
                         
                         <div className="w-12 h-12 rounded-full bg-black/20 flex items-center justify-center">
                            <Star className={item.rarity === 'legendary' ? 'text-yellow-400 fill-yellow-400' : 'text-current'} size={24} />
                         </div>
                         
                         <div>
                            <div className="font-bold text-lg leading-tight mb-1">{item.name}</div>
                            <div className="text-xs uppercase tracking-widest opacity-80">{item.rarity} {item.type}</div>
                         </div>

                         {item.value && (
                            <div className="mt-2 text-xs font-mono bg-black/30 px-2 py-1 rounded">
                               Value: {item.value}g
                            </div>
                         )}
                      </div>
                   </div>
                ))}
             </div>

             <div className={`mt-8 transition-opacity duration-1000 ${revealedCount === items.length ? 'opacity-100' : 'opacity-0'}`}>
                <button 
                  onClick={() => { SoundManager.playClick(); onClose(); }}
                  onMouseEnter={() => SoundManager.playHover()}
                  className="px-8 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white rounded-full font-bold uppercase tracking-widest transition-all hover:scale-105"
                >
                   Collect All
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LootReveal;
