
import React, { useState, useEffect } from 'react';
import { GameState, Language, ItemRarity, InventoryItem } from '../types';
import { Backpack, BicepsFlexed, Brain, Activity, Trophy, Zap, Sword, Book, MapPin, Skull, Heart, Hammer, Sparkles, Utensils, Droplets, Flame, Coins, Medal, Flag, User, Eye } from 'lucide-react';
import { SoundManager } from '../utils/soundEffects';

interface SidebarProps {
  gameState: GameState;
  className?: string;
  language: Language;
  onCraft?: (item1: InventoryItem, item2: InventoryItem) => void;
  isThinking?: boolean;
  onInspectItem: (item: InventoryItem) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ gameState, className = '', language, onCraft, isThinking, onInspectItem }) => {
  const [activeTab, setActiveTab] = useState<'status' | 'inventory' | 'abilities' | 'codex' | 'social'>('status');
  const [isSaving, setIsSaving] = useState(false);
  const [isCraftingMode, setIsCraftingMode] = useState(false);
  const [selectedCraftItems, setSelectedCraftItems] = useState<InventoryItem[]>([]);
  
  useEffect(() => {
    setIsSaving(true);
    const timer = setTimeout(() => setIsSaving(false), 1500);
    return () => clearTimeout(timer);
  }, [gameState]);

  const xpPercentage = Math.min(100, Math.max(0, (gameState.currentXp / gameState.nextLevelXp) * 100));
  const hpPercentage = Math.min(100, Math.max(0, (gameState.currentHp / gameState.maxHp) * 100));

  const handleTabChange = (tab: typeof activeTab) => {
    SoundManager.playClick();
    setActiveTab(tab);
  };

  const getRarityClass = (rarity: ItemRarity) => {
    switch (rarity) {
      case 'uncommon': return 'rarity-uncommon bg-emerald-900/10';
      case 'rare': return 'rarity-rare bg-blue-900/10';
      case 'epic': return 'rarity-epic bg-purple-900/10';
      case 'legendary': return 'rarity-legendary bg-amber-900/10';
      default: return 'rarity-common bg-slate-800/50';
    }
  };

  const getStatusIcon = (type: string) => {
     switch(type) {
        case 'Poison': return <Skull size={14} className="text-emerald-500 animate-bounce" />;
        case 'Burn': return <Flame size={14} className="text-orange-500 animate-pulse" />;
        case 'Freeze': return <Droplets size={14} className="text-cyan-400 animate-pulse" />;
        default: return <Sparkles size={14} className="text-amber-500" />;
     }
  };

  const isPlayerTurn = !isThinking && gameState.activeEnemy;

  return (
    <div className={`bg-slate-900 border-r border-slate-800 flex flex-col h-full overflow-hidden ${className}`}>
      
      {/* 
         HERO DOSSIER (HEADER)
      */}
      <div className="p-3 bg-slate-950 border-b border-slate-800 space-y-3">
        
        <div className={`relative bg-slate-900 rounded-[1rem] border-2 shadow-2xl transition-all duration-700 overflow-hidden mx-auto max-w-[130px] ${isPlayerTurn ? 'border-amber-500 ring-2 ring-amber-500/10 scale-[1.02]' : 'border-slate-800'}`}>
           <div className="aspect-[4/5] w-full relative">
              {gameState.portraitUrl ? (
                <img 
                  src={gameState.portraitUrl} 
                  alt="Hero Avatar" 
                  className={`w-full h-full object-cover transition-transform duration-1000 ${isPlayerTurn ? 'scale-110' : 'scale-100'}`} 
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 gap-2">
                   <div className="animate-pulse flex flex-col items-center">
                      <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center mb-1">
                         <User size={16} className="text-slate-500" />
                      </div>
                      <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Conjuring...</span>
                   </div>
                </div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
              
              {isPlayerTurn && (
                 <div className="absolute top-0 left-0 right-0 bg-amber-500 text-slate-950 text-[7px] font-black uppercase text-center py-1 tracking-widest animate-in slide-in-from-top">
                    YOUR TURN
                 </div>
              )}

              <div className="absolute bottom-2 left-2 right-2 text-center">
                 <h2 className="text-sm font-black text-white fantasy-font leading-tight drop-shadow-2xl truncate">
                    {gameState.title || 'Novice'}
                 </h2>
                 <div className="flex items-center justify-center gap-1 text-amber-400 font-black uppercase text-[7px] tracking-widest mt-0.5">
                    <span>LVL {gameState.level}</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Survival Status Boxes */}
        <div className="space-y-2">
           <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 shadow-inner">
              <div className="flex justify-between items-end mb-1">
                 <div className="flex items-center gap-1 text-red-500 font-black uppercase text-[8px] tracking-[0.1em]">
                    <Heart size={8} fill="currentColor" /> Vitality
                 </div>
                 <div className="text-[9px] font-black text-slate-100">{gameState.currentHp} / {gameState.maxHp}</div>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700 p-0.5">
                 <div 
                   className="h-full bg-gradient-to-r from-red-800 to-red-400 rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(239,68,68,0.2)]"
                   style={{ width: `${hpPercentage}%` }}
                 />
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                 {gameState.statusEffects.map((eff, i) => (
                    <div key={i} className="p-0.5 px-1 bg-slate-950 rounded border border-slate-700 flex items-center gap-1 text-[10px] font-black text-amber-500 uppercase">
                       {getStatusIcon(eff.type)} {eff.type}
                    </div>
                 ))}
              </div>
           </div>

           <div className="grid grid-cols-3 gap-1.5">
              <div className={`p-1.5 rounded-lg border transition-all flex flex-col items-center justify-center gap-0.5 ${gameState.hunger < 25 ? 'bg-orange-950/20 border-orange-500 animate-pulse' : 'bg-slate-900 border-slate-800'}`}>
                 <Utensils size={12} className={gameState.hunger < 25 ? 'text-orange-500' : 'text-slate-600'} />
                 <div className="text-[8px] font-black text-white">{gameState.hunger}%</div>
              </div>
              <div className={`p-1.5 rounded-lg border transition-all flex flex-col items-center justify-center gap-0.5 ${gameState.thirst < 25 ? 'bg-blue-950/20 border-blue-500 animate-pulse' : 'bg-slate-900 border-slate-800'}`}>
                 <Droplets size={12} className={gameState.thirst < 25 ? 'text-blue-500' : 'text-slate-600'} />
                 <div className="text-[8px] font-black text-white">{gameState.thirst}%</div>
              </div>
              <div className={`p-1.5 rounded-lg border transition-all flex flex-col items-center justify-center gap-0.5 ${gameState.adrenaline >= 100 ? 'bg-amber-950/20 border-amber-500 shadow-lg' : 'bg-slate-900 border-slate-800'}`}>
                 <Flame size={12} className={gameState.adrenaline >= 100 ? 'text-amber-500 animate-bounce' : 'text-slate-600'} />
                 <div className="text-[8px] font-black text-white">{Math.floor(gameState.adrenaline)}%</div>
              </div>
           </div>
        </div>

        <div className="flex justify-between items-center bg-yellow-950/10 border border-yellow-900/20 p-2 rounded-lg">
           <div className="flex items-center gap-1.5 text-yellow-600 font-black uppercase text-[7px] tracking-widest">
              <Coins size={10} /> Gold Pouch
           </div>
           <div className="text-xs font-black text-yellow-500 font-mono">{gameState.gold || 0}g</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/50">
        <button onClick={() => handleTabChange('status')} className={`flex-1 py-2.5 transition-all ${activeTab === 'status' ? 'text-amber-500 border-b-2 border-amber-500 bg-slate-800/10' : 'text-slate-600 hover:text-slate-400'}`}><Medal size={16} className="mx-auto" /></button>
        <button onClick={() => handleTabChange('inventory')} className={`flex-1 py-2.5 transition-all ${activeTab === 'inventory' ? 'text-amber-500 border-b-2 border-amber-500 bg-slate-800/10' : 'text-slate-600 hover:text-slate-400'}`}><Backpack size={16} className="mx-auto" /></button>
        <button onClick={() => handleTabChange('abilities')} className={`flex-1 py-2.5 transition-all ${activeTab === 'abilities' ? 'text-amber-500 border-b-2 border-amber-500 bg-slate-800/10' : 'text-slate-600 hover:text-slate-400'}`}><Zap size={16} className="mx-auto" /></button>
        <button onClick={() => handleTabChange('codex')} className={`flex-1 py-2.5 transition-all ${activeTab === 'codex' ? 'text-amber-500 border-b-2 border-amber-500 bg-slate-800/10' : 'text-slate-600 hover:text-slate-400'}`}><Book size={16} className="mx-auto" /></button>
        <button onClick={() => handleTabChange('social')} className={`flex-1 py-2.5 transition-all ${activeTab === 'social' ? 'text-amber-500 border-b-2 border-amber-500 bg-slate-800/10' : 'text-slate-600 hover:text-slate-400'}`}><Flag size={16} className="mx-auto" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar bg-slate-900/50">
        {activeTab === 'status' && (
          <div className="space-y-5 animate-fade-in">
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 shadow-inner text-center">
              <h3 className="text-[8px] uppercase font-black text-slate-500 flex items-center justify-center gap-2 mb-3 tracking-widest">
                 <Trophy size={12} className="text-yellow-500" /> Progression
              </h3>
              <div className="space-y-1.5 text-left">
                <div className="flex justify-between text-[8px] text-slate-400 uppercase font-bold">
                  <span>Level {gameState.level} Rank</span>
                  <span className="text-amber-500">{gameState.currentXp}/{gameState.nextLevelXp}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                  <div className="h-full bg-gradient-to-r from-amber-600 to-yellow-500 transition-all duration-1000" style={{ width: `${xpPercentage}%` }} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <StatBox label="STR" value={gameState.stats.strength} icon={<BicepsFlexed size={14}/>} color="text-red-400" />
              <StatBox label="INT" value={gameState.stats.intelligence} icon={<Brain size={14}/>} color="text-blue-400" />
              <StatBox label="STA" value={gameState.stats.stamina} icon={<Activity size={14}/>} color="text-green-400" />
              <StatBox label="CHA" value={gameState.stats.charisma} icon={<Coins size={14}/>} color="text-purple-400" />
            </div>

            {gameState.location && (
               <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 space-y-2 text-center">
                  <div className="flex items-center justify-center gap-2 text-blue-400 text-[8px] font-black uppercase tracking-widest border-b border-blue-900/20 pb-1.5">
                     <MapPin size={14} /> Discovery Dossier
                  </div>
                  <div>
                     <div className="text-white font-black text-sm leading-tight">{gameState.location.name}</div>
                     <div className="text-[9px] text-slate-400 italic mt-1 leading-relaxed">{gameState.location.description}</div>
                  </div>
               </div>
            )}
          </div>
        )}

        {/* INVENTORY TAB */}
        {activeTab === 'inventory' && (
          <div className="space-y-3 animate-fade-in">
             <div className="flex items-center justify-between border-b border-emerald-900/30 pb-2">
                <div className="flex items-center gap-2 text-emerald-500 uppercase text-[10px] font-black tracking-widest">
                  <Backpack size={16} /> Gear
                </div>
                <div className="flex items-center gap-2">
                  {isCraftingMode && selectedCraftItems.length === 2 && (
                    <button 
                      onClick={() => {
                        onCraft?.(selectedCraftItems[0], selectedCraftItems[1]);
                        setSelectedCraftItems([]);
                        setIsCraftingMode(false);
                      }}
                      className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold rounded shadow-lg transition-all"
                    >
                      Combine
                    </button>
                  )}
                  <button onClick={() => {
                    setIsCraftingMode(!isCraftingMode);
                    if (isCraftingMode) setSelectedCraftItems([]);
                  }} className={`p-1.5 rounded-lg transition-all ${isCraftingMode ? 'bg-amber-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400'}`}>
                    <Hammer size={14} />
                  </button>
                </div>
              </div>

             {gameState.inventory.length === 0 ? (
                <div className="text-slate-700 text-[8px] text-center py-10 uppercase tracking-[0.2em] font-black italic opacity-40">Empty...</div>
              ) : (
                <ul className="space-y-2">
                  {gameState.inventory.map((item, index) => {
                    const isSelected = selectedCraftItems.includes(item);
                    return (
                      <li 
                        key={index} 
                        onClick={() => {
                          if (isCraftingMode) {
                             if (isSelected) setSelectedCraftItems(prev => prev.filter(i => i !== item));
                             else if (selectedCraftItems.length < 2) setSelectedCraftItems(prev => [...prev, item]);
                          } else {
                             onInspectItem(item);
                          }
                        }}
                        onContextMenu={(e) => {
                           e.preventDefault();
                           onInspectItem(item);
                        }}
                        className={`border rounded-xl p-3 flex items-start gap-3 transition-all cursor-pointer hover:translate-x-1 ${getRarityClass(item.rarity)} ${isSelected ? 'ring-2 ring-amber-500 bg-amber-500/10' : ''} group`}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                           {item.type === 'Weapon' ? <Sword size={14}/> : item.type === 'Spellbook' ? <Book size={14} className="text-amber-500"/> : <div className="w-3 h-3 rounded-full bg-current opacity-30"/>}
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="font-black text-white text-[11px] leading-tight truncate">{item.name}</div>
                           <div className="text-[7px] font-black uppercase tracking-tighter opacity-50">{item.rarity} {item.type}</div>
                        </div>
                        <button 
                          className="opacity-0 group-hover:opacity-100 p-1 bg-slate-800 rounded-md text-slate-400 hover:text-amber-500 transition-all"
                          title="Inspect Artifact"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspectItem(item);
                          }}
                        >
                          <Eye size={12} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
          </div>
        )}

        {/* ABILITIES TAB */}
        {activeTab === 'abilities' && (
          <div className="space-y-3 animate-fade-in">
             <div className="flex items-center justify-between border-b border-blue-900/30 pb-2">
                <div className="flex items-center gap-2 text-blue-500 uppercase text-[10px] font-black tracking-widest">
                  <Zap size={16} /> Abilities
                </div>
              </div>

             {(!gameState.abilities || gameState.abilities.length === 0) ? (
                <div className="text-slate-700 text-[8px] text-center py-10 uppercase tracking-[0.2em] font-black italic opacity-40">No abilities learned...</div>
              ) : (
                <ul className="space-y-2">
                  {gameState.abilities.map((ability, index) => (
                    <li key={index} className="border border-slate-700 bg-slate-800/50 rounded-xl p-3 flex flex-col gap-1">
                      <div className="font-black text-white text-[11px] leading-tight">{ability.name}</div>
                      <div className="text-[9px] text-slate-400 leading-relaxed">{ability.description}</div>
                    </li>
                  ))}
                </ul>
              )}
          </div>
        )}

        {/* CODEX TAB */}
        {activeTab === 'codex' && (
          <div className="space-y-3 animate-fade-in">
             <div className="flex items-center justify-between border-b border-purple-900/30 pb-2">
                <div className="flex items-center gap-2 text-purple-500 uppercase text-[10px] font-black tracking-widest">
                  <Book size={16} /> Codex
                </div>
              </div>

             {(!gameState.codex || gameState.codex.length === 0) ? (
                <div className="text-slate-700 text-[8px] text-center py-10 uppercase tracking-[0.2em] font-black italic opacity-40">Codex empty...</div>
              ) : (
                <ul className="space-y-2">
                  {gameState.codex.map((entry, index) => (
                    <li key={index} className="border border-slate-700 bg-slate-800/50 rounded-xl p-3 flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <div className="font-black text-white text-[11px] leading-tight">{entry.name}</div>
                        <div className="text-[7px] font-black uppercase tracking-tighter text-purple-400">{entry.category}</div>
                      </div>
                      <div className="text-[9px] text-slate-400 leading-relaxed">{entry.description}</div>
                    </li>
                  ))}
                </ul>
              )}
          </div>
        )}

        {/* SOCIAL TAB */}
        {activeTab === 'social' && (
          <div className="space-y-3 animate-fade-in">
             <div className="flex items-center justify-between border-b border-pink-900/30 pb-2">
                <div className="flex items-center gap-2 text-pink-500 uppercase text-[10px] font-black tracking-widest">
                  <Flag size={16} /> Factions & Rep
                </div>
              </div>

             {(!gameState.reputation || gameState.reputation.length === 0) ? (
                <div className="text-slate-700 text-[8px] text-center py-10 uppercase tracking-[0.2em] font-black italic opacity-40">No factions known...</div>
              ) : (
                <ul className="space-y-2">
                  {gameState.reputation.map((rep, index) => (
                    <li key={index} className="border border-slate-700 bg-slate-800/50 rounded-xl p-3 flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <div className="font-black text-white text-[11px] leading-tight">{rep.faction}</div>
                        <div className={`text-[9px] font-black uppercase tracking-tighter ${
                          rep.status === 'Hostile' ? 'text-red-500' :
                          rep.status === 'Friendly' ? 'text-emerald-500' :
                          rep.status === 'Exalted' ? 'text-amber-500' :
                          'text-slate-400'
                        }`}>{rep.status}</div>
                      </div>
                      <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-700 mt-1">
                        <div 
                          className={`h-full transition-all duration-1000 ${
                            rep.value < 0 ? 'bg-red-500' : 'bg-emerald-500'
                          }`} 
                          style={{ width: `${Math.min(100, Math.max(0, (rep.value + 100) / 2))}%` }} 
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
          </div>
        )}
      </div>

      <div className="mt-auto p-3 border-t border-slate-800 flex items-center justify-center bg-slate-950/90 text-[8px] font-black text-slate-700 uppercase tracking-[0.3em]">
           {isSaving ? "Synchronizing Fate..." : "Archived in the Void"}
      </div>
    </div>
  );
};

const StatBox: React.FC<{ label: string, value: number, icon: React.ReactNode, color: string }> = ({ label, value, icon, color }) => (
   <div className="bg-slate-900 border border-slate-800 p-3 rounded-[1.5rem] flex flex-col items-center justify-center gap-1 hover:border-slate-500 transition-all group hover:-translate-y-1 shadow-lg">
      <div className={`${color} group-hover:scale-125 transition-transform duration-500`}>{icon}</div>
      <div className="text-[7px] font-black text-slate-500 uppercase tracking-widest">{label}</div>
      <div className="text-lg font-black text-white leading-none">{value}</div>
   </div>
);

export default Sidebar;
