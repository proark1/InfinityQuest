
import React, { useState } from 'react';
import { Blessing, BLESSINGS, MetaState, LegacyItem } from '../types';
import { Star, Crown, Scroll, Sparkles, User, Eye, Lock, Castle, Book, Sword, Sprout, Archive } from 'lucide-react';

interface PantheonProps {
  metaState: MetaState;
  onStartRun: (selectedBlessings: Blessing[], legacyItem?: LegacyItem) => void;
  onOracleClaim?: () => void;
  onSanctuaryUpgrade?: (building: 'library' | 'armory' | 'garden' | 'treasury') => void;
}

const Pantheon: React.FC<PantheonProps> = ({ metaState, onStartRun, onOracleClaim, onSanctuaryUpgrade }) => {
  const [view, setView] = useState<'hall' | 'sanctuary'>('hall');
  const [selectedBlessings, setSelectedBlessings] = useState<Blessing[]>([]);
  const [selectedLegacyItem, setSelectedLegacyItem] = useState<LegacyItem | undefined>(undefined);
  const [isOracleRevealing, setIsOracleRevealing] = useState(false);

  const toggleBlessing = (blessing: Blessing) => {
    if (selectedBlessings.find(b => b.id === blessing.id)) {
      setSelectedBlessings(prev => prev.filter(b => b.id !== blessing.id));
    } else {
      const currentCost = selectedBlessings.reduce((acc, b) => acc + b.cost, 0);
      if (currentCost + blessing.cost <= metaState.soulShards) {
        setSelectedBlessings(prev => [...prev, blessing]);
      }
    }
  };

  const totalCost = selectedBlessings.reduce((acc, b) => acc + b.cost, 0);
  const remainingShards = metaState.soulShards - totalCost;
  
  // Check Oracle Availability (24h)
  const canClaimOracle = Date.now() - (metaState.lastOracleClaim || 0) > 86400000;

  const handleOracleClick = () => {
    if (canClaimOracle && onOracleClaim) {
       setIsOracleRevealing(true);
       setTimeout(() => {
          onOracleClaim();
          setIsOracleRevealing(false);
       }, 2000);
    }
  };

  const getUpgradeCost = (level: number) => (level + 1) * 200;

  const renderSanctuary = () => (
     <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-5xl">
        {/* Library */}
        <div className="bg-slate-900 border border-blue-900/50 rounded-xl p-6 relative overflow-hidden group hover:border-blue-500/50 transition-all">
           <div className="absolute top-2 right-2 p-2 bg-blue-900/20 rounded-lg text-blue-400"><Book size={24} /></div>
           <h3 className="text-xl font-bold text-blue-300 fantasy-font mb-1">The Library</h3>
           <p className="text-xs text-blue-200/60 uppercase tracking-widest mb-4">Level {metaState.sanctuary.libraryLevel}</p>
           <p className="text-sm text-slate-400 mb-6 h-12">Unlocks lore hints and enemy weaknesses during adventures.</p>
           <button 
             onClick={() => onSanctuaryUpgrade?.('library')}
             disabled={metaState.soulShards < getUpgradeCost(metaState.sanctuary.libraryLevel)}
             className="w-full py-2 bg-slate-800 hover:bg-blue-900/50 border border-slate-700 hover:border-blue-500 text-slate-300 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
           >
             Upgrade ({getUpgradeCost(metaState.sanctuary.libraryLevel)} Shards)
           </button>
        </div>

        {/* Armory */}
        <div className="bg-slate-900 border border-red-900/50 rounded-xl p-6 relative overflow-hidden group hover:border-red-500/50 transition-all">
           <div className="absolute top-2 right-2 p-2 bg-red-900/20 rounded-lg text-red-400"><Sword size={24} /></div>
           <h3 className="text-xl font-bold text-red-300 fantasy-font mb-1">The Armory</h3>
           <p className="text-xs text-red-200/60 uppercase tracking-widest mb-4">Level {metaState.sanctuary.armoryLevel}</p>
           <p className="text-sm text-slate-400 mb-6 h-12">Grants permanent starting stat bonuses to Strength and Stamina.</p>
           <button 
             onClick={() => onSanctuaryUpgrade?.('armory')}
             disabled={metaState.soulShards < getUpgradeCost(metaState.sanctuary.armoryLevel)}
             className="w-full py-2 bg-slate-800 hover:bg-red-900/50 border border-slate-700 hover:border-red-500 text-slate-300 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
           >
             Upgrade ({getUpgradeCost(metaState.sanctuary.armoryLevel)} Shards)
           </button>
        </div>

        {/* Garden */}
        <div className="bg-slate-900 border border-emerald-900/50 rounded-xl p-6 relative overflow-hidden group hover:border-emerald-500/50 transition-all">
           <div className="absolute top-2 right-2 p-2 bg-emerald-900/20 rounded-lg text-emerald-400"><Sprout size={24} /></div>
           <h3 className="text-xl font-bold text-emerald-300 fantasy-font mb-1">The Garden</h3>
           <p className="text-xs text-emerald-200/60 uppercase tracking-widest mb-4">Level {metaState.sanctuary.gardenLevel}</p>
           <p className="text-sm text-slate-400 mb-6 h-12">Provides healing herbs and ingredients at the start of every run.</p>
           <button 
             onClick={() => onSanctuaryUpgrade?.('garden')}
             disabled={metaState.soulShards < getUpgradeCost(metaState.sanctuary.gardenLevel)}
             className="w-full py-2 bg-slate-800 hover:bg-emerald-900/50 border border-slate-700 hover:border-emerald-500 text-slate-300 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
           >
             Upgrade ({getUpgradeCost(metaState.sanctuary.gardenLevel)} Shards)
           </button>
        </div>

        {/* Treasury */}
        <div className="bg-slate-900 border border-amber-900/50 rounded-xl p-6 relative overflow-hidden group hover:border-amber-500/50 transition-all">
           <div className="absolute top-2 right-2 p-2 bg-amber-900/20 rounded-lg text-amber-400"><Castle size={24} /></div>
           <h3 className="text-xl font-bold text-amber-300 fantasy-font mb-1">The Treasury</h3>
           <p className="text-xs text-amber-200/60 uppercase tracking-widest mb-4">Level {metaState.sanctuary.treasuryLevel}</p>
           <p className="text-sm text-slate-400 mb-6 h-12">Increases starting Gold and chance for wealth.</p>
           <button 
             onClick={() => onSanctuaryUpgrade?.('treasury')}
             disabled={metaState.soulShards < getUpgradeCost(metaState.sanctuary.treasuryLevel)}
             className="w-full py-2 bg-slate-800 hover:bg-amber-900/50 border border-slate-700 hover:border-amber-500 text-slate-300 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
           >
             Upgrade ({getUpgradeCost(metaState.sanctuary.treasuryLevel)} Shards)
           </button>
        </div>
     </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-950 z-50 overflow-y-auto custom-scrollbar">
       <div className="min-h-screen p-8 flex flex-col items-center">
          
          <div className="text-center mb-8 animate-in slide-in-from-top duration-700">
             <div className="inline-flex items-center justify-center p-4 bg-slate-900 rounded-full border border-amber-500/30 mb-4 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                <Crown size={48} className="text-amber-500" />
             </div>
             <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 fantasy-font mb-2">
                THE PANTHEON
             </h1>
             <p className="text-slate-400 max-w-xl mx-auto">
                Spend Soul Shards to build your Sanctuary and bless your next life.
             </p>
          </div>

          <div className="flex gap-4 mb-8">
             <button 
               onClick={() => setView('hall')}
               className={`px-6 py-2 rounded-full font-bold transition-all ${view === 'hall' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
             >
                Hall of Heroes
             </button>
             <button 
               onClick={() => setView('sanctuary')}
               className={`px-6 py-2 rounded-full font-bold transition-all ${view === 'sanctuary' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
             >
                The Sanctuary
             </button>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 px-6 py-3 rounded-full border border-amber-500/30 mb-8 sticky top-4 z-20 shadow-xl">
              <Star size={20} className="text-amber-500 fill-amber-500" />
              <span className="text-2xl font-bold text-white">{remainingShards}</span>
              <span className="text-xs text-slate-400 uppercase tracking-widest ml-2">Shards</span>
          </div>

          {view === 'sanctuary' ? renderSanctuary() : (
          <div className="grid lg:grid-cols-3 gap-8 w-full max-w-6xl">
             
             {/* Left: Hall of Heroes */}
             <div className="lg:col-span-1 space-y-6">
                
                {/* Oracle Section */}
                <div className="bg-slate-900 border border-purple-900/50 rounded-xl p-6 relative overflow-hidden group">
                   <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-slate-900 z-0" />
                   <div className="relative z-10 text-center">
                      <h3 className="text-purple-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2 mb-3">
                         <Eye size={16} /> The Oracle
                      </h3>
                      {isOracleRevealing ? (
                         <div className="py-8">
                            <Sparkles className="mx-auto text-purple-400 animate-spin" size={32} />
                            <p className="text-xs text-purple-300 mt-2">Reading the stars...</p>
                         </div>
                      ) : canClaimOracle ? (
                         <button 
                           onClick={handleOracleClick}
                           className="w-full py-3 bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/30 text-purple-200 font-bold rounded-lg transition-all hover:scale-105 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                         >
                            Claim Daily Prophecy
                         </button>
                      ) : (
                         <div className="py-3 bg-slate-950/50 rounded-lg border border-slate-800 text-slate-500 flex items-center justify-center gap-2">
                            <Lock size={14} /> Available Tomorrow
                         </div>
                      )}
                      <p className="text-xs text-slate-500 mt-3 italic">"Fate favors the persistent."</p>
                   </div>
                </div>

                <div className="space-y-4">
                   <h2 className="text-xl font-bold text-slate-300 flex items-center gap-2 border-b border-slate-800 pb-2">
                      <Scroll size={20} /> Hall of Heroes
                   </h2>
                   <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 h-[300px] overflow-y-auto custom-scrollbar space-y-3">
                      {metaState.pastHeroes.length === 0 ? (
                         <div className="text-center text-slate-600 italic py-10">No legends recorded yet.</div>
                      ) : (
                         metaState.pastHeroes.slice().reverse().map((hero) => (
                            <div key={hero.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex items-center gap-3">
                               <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-400">
                                  <User size={16} />
                               </div>
                               <div className="flex-1">
                                  <div className="flex justify-between items-center">
                                     <span className="font-bold text-slate-200 text-sm">{hero.name}</span>
                                     <span className="text-xs text-amber-500 flex items-center gap-1"><Star size={10} /> {hero.score}</span>
                                  </div>
                                  <div className="text-xs text-slate-500">Lvl {hero.level} {hero.class}</div>
                                  <div className="text-[10px] text-red-900/60 uppercase mt-1">{hero.causeOfDeath || "Fell in battle"}</div>
                               </div>
                            </div>
                         ))
                      )}
                   </div>
                </div>
             </div>

             {/* Center/Right: Shop */}
             <div className="lg:col-span-2 space-y-6">
                
                {/* Legacy Chest Section */}
                {metaState.legacyItems && metaState.legacyItems.length > 0 && (
                  <div className="bg-slate-900 border border-emerald-900/50 rounded-xl p-6 mb-6">
                    <h2 className="text-xl font-bold text-emerald-400 mb-4 flex items-center gap-2">
                      <Archive size={20} /> Legacy Chest
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                      {metaState.legacyItems.map((item, idx) => {
                         const isSelected = selectedLegacyItem === item;
                         return (
                           <button 
                             key={idx}
                             onClick={() => setSelectedLegacyItem(isSelected ? undefined : item)}
                             className={`p-3 rounded-lg border text-left transition-all ${isSelected ? 'bg-emerald-900/30 border-emerald-500' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}
                           >
                             <div className="font-bold text-slate-200">{item.name}</div>
                             <div className="text-xs text-emerald-500 mb-1">{item.rarity}</div>
                             <div className="text-xs text-slate-500 italic">"Buried by {item.buriedBy}"</div>
                           </button>
                         );
                      })}
                    </div>
                  </div>
                )}

                <div className="bg-slate-900 border border-amber-500/20 rounded-xl p-6">
                   <h2 className="text-xl font-bold text-amber-500 fantasy-font mb-4">Blessings</h2>

                   <div className="grid md:grid-cols-2 gap-4">
                      {BLESSINGS.map(blessing => {
                         const isSelected = selectedBlessings.some(b => b.id === blessing.id);
                         const canAfford = remainingShards >= blessing.cost || isSelected;

                         return (
                            <button
                               key={blessing.id}
                               onClick={() => canAfford && toggleBlessing(blessing)}
                               disabled={!canAfford && !isSelected}
                               className={`relative p-4 rounded-xl border-2 text-left transition-all group ${
                                  isSelected 
                                     ? 'border-amber-500 bg-amber-900/20' 
                                     : canAfford 
                                        ? 'border-slate-700 bg-slate-800 hover:border-slate-500' 
                                        : 'border-slate-800 bg-slate-900/50 opacity-50 cursor-not-allowed'
                               }`}
                            >
                               <div className="flex justify-between items-start mb-2">
                                  <h3 className={`font-bold ${isSelected ? 'text-amber-400' : 'text-slate-200'}`}>{blessing.name}</h3>
                                  <span className={`text-xs font-bold px-2 py-1 rounded ${isSelected ? 'bg-amber-500 text-slate-900' : 'bg-slate-900 text-slate-400'}`}>
                                     {blessing.cost}
                                  </span>
                               </div>
                               <p className="text-sm text-slate-400 mb-2">{blessing.description}</p>
                               <div className="text-xs font-mono text-amber-600/80 uppercase tracking-wider">{blessing.effect}</div>
                               
                               {isSelected && <div className="absolute top-2 right-2 text-amber-500"><Sparkles size={16} /></div>}
                            </button>
                         );
                      })}
                   </div>

                   <div className="mt-8 pt-6 border-t border-slate-800 flex justify-end">
                      <button 
                         onClick={() => onStartRun(selectedBlessings, selectedLegacyItem)}
                         className="px-8 py-4 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-bold rounded-xl shadow-lg transform transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                      >
                         <Crown size={20} />
                         Begin New Incarnation
                         {selectedLegacyItem && <span className="text-xs bg-black/20 px-2 py-1 rounded">+ Legacy Item</span>}
                      </button>
                   </div>
                </div>
             </div>
          </div>
          )}
       </div>
    </div>
  );
};

export default Pantheon;
