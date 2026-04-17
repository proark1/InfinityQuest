
import React, { useEffect, useState } from 'react';
import { InventoryItem, SPELLBOOK_DATA } from '../types';
import { generateItemDetails } from '../services/geminiService';
import { X, Sparkles, Package, Loader, BookOpen, Wand2, Zap, Flame, Snowflake } from 'lucide-react';
import { SoundManager } from '../utils/soundEffects';

interface ItemInspectorProps {
  item: InventoryItem | null;
  onClose: () => void;
}

const ItemInspector: React.FC<ItemInspectorProps> = ({ item, onClose }) => {
  const [details, setDetails] = useState<{ lore: string; imageUrl: string | null } | null>(null);
  const [loading, setLoading] = useState(false);

  // Identify if this is the special Mage spellbook
  const isSpellbook = item?.type === "Spellbook";

  useEffect(() => {
    if (item && !isSpellbook) {
      setLoading(true);
      generateItemDetails(item).then(res => {
         setDetails(res);
         setLoading(false);
         SoundManager.playLoot(item.rarity);
      });
    } else {
      setDetails(null);
    }
  }, [item, isSpellbook]);

  if (!item) return null;

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'text-amber-400 border-amber-500 shadow-amber-500/50 bg-amber-900/30';
      case 'epic': return 'text-purple-400 border-purple-500 shadow-purple-500/50 bg-purple-900/30';
      case 'rare': return 'text-blue-400 border-blue-500 shadow-blue-500/50 bg-blue-900/30';
      default: return 'text-slate-200 border-slate-500 shadow-slate-500/20 bg-slate-800';
    }
  };

  const getSpellIcon = (name: string) => {
     const n = name.toLowerCase();
     if (n.includes("fire")) return <Flame size={18} className="text-orange-500" />;
     if (n.includes("frost") || n.includes("ice")) return <Snowflake size={18} className="text-blue-400" />;
     if (n.includes("arcane") || n.includes("bolt")) return <Zap size={18} className="text-purple-400" />;
     return <Wand2 size={18} className="text-slate-400" />;
  };

  const renderGrimoire = () => (
     <div className="w-full space-y-6">
        <div className="bg-amber-950/20 p-6 rounded-3xl border border-amber-900/50 text-left relative overflow-hidden shadow-inner">
           {/* Decorative bg for Grimoire */}
           <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')]" />
           
           <h3 className="text-amber-500 font-black uppercase tracking-[0.3em] text-[10px] mb-4 flex items-center gap-2">
              < BookOpen size={16} /> Arcane Compendium
           </h3>
           <p className="text-xs text-slate-400 italic mb-6 leading-relaxed border-l-2 border-amber-900/50 pl-3">
              "Speak the incantation aloud to manifest these primal energies. Magic is but a whisper in the ears of the gods."
           </p>
           
           <div className="space-y-4 max-h-[450px] overflow-y-auto custom-scrollbar pr-2">
              {SPELLBOOK_DATA.map((spell, i) => (
                 <div key={i} className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 group hover:border-amber-500/30 transition-all hover:translate-x-1">
                    <div className="flex justify-between items-start mb-2">
                       <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-800 rounded-xl group-hover:scale-110 transition-transform">
                             {getSpellIcon(spell.name)}
                          </div>
                          <span className="font-black text-slate-100 tracking-tight text-lg">{spell.name}</span>
                       </div>
                       <span className="text-[10px] bg-amber-500/10 px-2 py-1 rounded-full text-amber-500 font-black border border-amber-500/20">{spell.manaCost} MP</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">{spell.description}</p>
                    <div className="text-[9px] text-amber-600/70 font-black uppercase tracking-widest flex items-center gap-2">
                       <Sparkles size={10} /> To Cast: {spell.requirement}
                    </div>
                 </div>
              ))}
           </div>
        </div>
     </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={onClose}>
       <div 
         className={`relative w-full max-w-xl bg-slate-950 border-2 rounded-[3rem] p-10 shadow-2xl overflow-hidden ${getRarityColor(item.rarity)}`}
         onClick={(e) => e.stopPropagation()}
       >
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 text-slate-400 hover:text-white z-20 bg-slate-900 rounded-full p-3 transition-all hover:rotate-90"
          >
             <X size={24} />
          </button>

          <div className="relative z-10 flex flex-col items-center text-center space-y-8">
             
             <div>
                <div className="text-[10px] font-black uppercase tracking-[0.4em] opacity-50 mb-2">{item.rarity} {item.type}</div>
                <h2 className="text-5xl font-black fantasy-font leading-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500">{item.name}</h2>
             </div>

             {isSpellbook ? renderGrimoire() : (
               <>
                 <div className="relative w-72 h-72 bg-slate-900 rounded-[2.5rem] border-2 border-white/5 flex items-center justify-center shadow-2xl overflow-hidden group">
                    {loading ? (
                       <div className="flex flex-col items-center gap-3 text-slate-500">
                          <Loader className="animate-spin" size={32} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Identifying Artifact...</span>
                       </div>
                    ) : details?.imageUrl ? (
                       <img src={details.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                    ) : (
                       <Package size={64} className="opacity-10" />
                    )}
                 </div>

                 <div className="bg-slate-900/50 p-8 rounded-[2rem] border border-white/5 w-full shadow-inner relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-950 px-4 py-1 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-amber-500">
                       Lore Fragment
                    </div>
                    {loading ? (
                       <div className="space-y-3">
                          <div className="h-2 bg-white/5 animate-pulse rounded-full w-full" />
                          <div className="h-2 bg-white/5 animate-pulse rounded-full w-4/5 mx-auto" />
                       </div>
                    ) : (
                       <p className="text-sm italic font-serif leading-loose text-slate-300">
                          "{details?.lore || item.description}"
                       </p>
                    )}
                 </div>

                 <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800">
                       <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest block mb-1">Exchange Value</span>
                       <span className="font-mono text-amber-400 text-2xl font-black">{item.value || 50}g</span>
                    </div>
                    <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800">
                       <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest block mb-1">Classification</span>
                       <span className="text-slate-300 text-xl font-black">{item.type}</span>
                    </div>
                 </div>
               </>
             )}
          </div>
       </div>
    </div>
  );
};

export default ItemInspector;
