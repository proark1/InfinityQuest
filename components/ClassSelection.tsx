
import React, { useState } from 'react';
import { CharacterClass, CharacterStats, InventoryItem, Language, MetaState } from '../types';
import { Sword, Zap, Shield, Activity, ChevronLeft, ChevronRight, Check, Lock, Crown, Flame, Sparkles } from 'lucide-react';
import { SoundManager } from '../utils/soundEffects';
import {
  CLASS_UNLOCK_RULES,
  computeSanctuaryBonuses,
  summarizeSanctuaryBonuses,
  unlockedClassSet,
} from '../utils/progression';

interface ClassSelectionProps {
  onSelect: (cls: CharacterClass, stats: CharacterStats, items: InventoryItem[], imageUrl: string) => void;
  language: Language;
  metaState: MetaState;
}

type ClassDef = {
  id: CharacterClass;
  name: string;
  icon: React.ReactNode;
  desc: string;
  stats: CharacterStats;
  items: InventoryItem[];
  portraits: string[];
};

const ClassSelection: React.FC<ClassSelectionProps> = ({ onSelect, language, metaState }) => {
  const isGerman = language === Language.German;
  const [selectedIndices, setSelectedIndices] = useState<Record<string, number>>({
    Warrior: 0,
    Mage: 0,
    Rogue: 0,
    Cleric: 0,
    Paladin: 0,
    Dreadblade: 0,
  });

  const unlocked = unlockedClassSet(metaState);
  const sanctuaryBonuses = computeSanctuaryBonuses(metaState.sanctuary);
  const bonusLines = summarizeSanctuaryBonuses(sanctuaryBonuses);

  const classes: ClassDef[] = [
    {
      id: 'Warrior',
      name: isGerman ? 'Krieger' : 'Warrior',
      icon: <Sword size={24} className="text-red-500" />,
      desc: isGerman ? 'Ein gehärteter Soldat in schwerer Rüstung, Meister der Klinge.' : 'A battle-hardened soldier in heavy plate, master of the blade.',
      stats: { strength: 16, intelligence: 8, stamina: 14, charisma: 10 },
      items: [{ name: "Iron Greatsword", rarity: "common", type: "Weapon" }, { name: "Chainmail", rarity: "common", type: "Armor" }],
      portraits: [
        'https://images.unsplash.com/photo-1599508704512-2f19fe91f737?q=80&w=800',
        'https://images.unsplash.com/photo-1614728263952-84ea256f9679?q=80&w=800',
        'https://images.unsplash.com/photo-1591115765373-520b7a2d72b2?q=80&w=800',
        'https://images.unsplash.com/photo-1559194295-903973be0442?q=80&w=800',
      ],
    },
    {
      id: 'Rogue',
      name: isGerman ? 'Schurke' : 'Rogue',
      icon: <Activity size={24} className="text-green-500" />,
      desc: isGerman ? 'Ein Meister der Tarnung, der im Schatten agiert.' : 'A master of stealth, striking from the hidden shadows.',
      stats: { strength: 10, intelligence: 12, stamina: 12, charisma: 14 },
      items: [{ name: "Dual Daggers", rarity: "common", type: "Weapon" }, { name: "Lockpicks", rarity: "common", type: "Tool" }],
      portraits: [
        'https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?q=80&w=800',
        'https://images.unsplash.com/photo-1461696114087-397271a7aedc?q=80&w=800',
        'https://images.unsplash.com/photo-1506466010722-395aa2bef877?q=80&w=800',
        'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?q=80&w=800',
      ],
    },
    {
      id: 'Mage',
      name: isGerman ? 'Magier' : 'Mage',
      icon: <Zap size={24} className="text-blue-500" />,
      desc: isGerman ? 'Ein Weiser der arkanen Künste, der mystische Kräfte bändigt.' : 'A scholar of the arcane arts, bending mystical energies.',
      stats: { strength: 6, intelligence: 18, stamina: 10, charisma: 12 },
      items: [{ name: "Oak Staff", rarity: "common", type: "Weapon" }, { name: "Spellbook", rarity: "common", type: "Misc" }],
      portraits: [
        'https://images.unsplash.com/photo-1514539079130-25950c84af65?q=80&w=800',
        'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800',
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800',
        'https://images.unsplash.com/photo-1509248961158-e54f6934749c?q=80&w=800',
      ],
    },
    {
      id: 'Cleric',
      name: isGerman ? 'Kleriker' : 'Cleric',
      icon: <Shield size={24} className="text-amber-500" />,
      desc: isGerman ? 'Ein heiliger Krieger, der heilt und schützt.' : 'A holy warrior channeling divine light to protect.',
      stats: { strength: 12, intelligence: 12, stamina: 12, charisma: 16 },
      items: [{ name: "Mace", rarity: "common", type: "Weapon" }, { name: "Holy Symbol", rarity: "common", type: "Misc" }],
      portraits: [
        'https://images.unsplash.com/photo-1533107862482-0e6974b06ec4?q=80&w=800',
        'https://images.unsplash.com/photo-1501446522555-304675543ec5?q=80&w=800',
        'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=800',
        'https://images.unsplash.com/photo-1445262102387-5fbb30a5e59d?q=80&w=800',
      ],
    },
    {
      id: 'Paladin',
      name: isGerman ? 'Paladin' : 'Paladin',
      icon: <Crown size={24} className="text-yellow-400" />,
      desc: isGerman ? 'Ein Lichtritter, der mit heiligem Stahl und Wille kämpft.' : 'A light-sworn knight who channels holy steel and unshaken will.',
      stats: { strength: 14, intelligence: 10, stamina: 14, charisma: 14 },
      items: [{ name: "Sunforged Blade", rarity: "rare", type: "Weapon" }, { name: "Blessed Plate", rarity: "rare", type: "Armor" }],
      portraits: [
        'https://images.unsplash.com/photo-1533107862482-0e6974b06ec4?q=80&w=800',
        'https://images.unsplash.com/photo-1599508704512-2f19fe91f737?q=80&w=800',
        'https://images.unsplash.com/photo-1614728263952-84ea256f9679?q=80&w=800',
        'https://images.unsplash.com/photo-1501446522555-304675543ec5?q=80&w=800',
      ],
    },
    {
      id: 'Dreadblade',
      name: isGerman ? 'Schreckensklinge' : 'Dreadblade',
      icon: <Flame size={24} className="text-rose-500" />,
      desc: isGerman ? 'Ein gefallener Schwertmeister, der Schatten und Zorn bündigt.' : 'A fallen swordmaster who bends shadow and fury to the blade.',
      stats: { strength: 16, intelligence: 12, stamina: 12, charisma: 10 },
      items: [{ name: "Voidcut Saber", rarity: "epic", type: "Weapon" }, { name: "Shadowed Cloak", rarity: "rare", type: "Armor" }],
      portraits: [
        'https://images.unsplash.com/photo-1591115765373-520b7a2d72b2?q=80&w=800',
        'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?q=80&w=800',
        'https://images.unsplash.com/photo-1506466010722-395aa2bef877?q=80&w=800',
        'https://images.unsplash.com/photo-1461696114087-397271a7aedc?q=80&w=800',
      ],
    },
  ];

  const handleNextPortrait = (e: React.MouseEvent, classId: string) => {
    e.stopPropagation();
    SoundManager.playHover();
    setSelectedIndices(prev => ({
      ...prev,
      [classId]: (prev[classId] + 1) % 4,
    }));
  };

  const handlePrevPortrait = (e: React.MouseEvent, classId: string) => {
    e.stopPropagation();
    SoundManager.playHover();
    setSelectedIndices(prev => ({
      ...prev,
      [classId]: (prev[classId] - 1 + 4) % 4,
    }));
  };

  const unlockHintFor = (id: CharacterClass) =>
    CLASS_UNLOCK_RULES.find(r => r.id === id)?.requirement ?? '';

  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="max-w-6xl w-full space-y-8 py-10">
        <div className="text-center space-y-3 animate-in fade-in slide-in-from-top duration-700">
          <h1 className="text-5xl sm:text-6xl font-black text-amber-500 fantasy-font tracking-tight">
            {isGerman ? 'Wähle dein Schicksal' : 'Choose Your Destiny'}
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto">
            {isGerman
              ? 'Deine Klasse bestimmt deine Stärken und wie die Welt auf dich reagiert.'
              : 'Your class defines your strengths and how the world reacts to you. Choose wisely.'}
          </p>
        </div>

        {bonusLines.length > 0 && (
          <div
            className="max-w-3xl mx-auto bg-gradient-to-r from-slate-900 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2 justify-center shadow-[0_0_40px_rgba(245,158,11,0.08)]"
            role="status"
            aria-label="Sanctuary bonuses applied to this run"
          >
            <div className="flex items-center gap-2 text-amber-400 text-xs uppercase tracking-[0.2em] font-black">
              <Sparkles size={14} />
              Sanctuary Bonuses
            </div>
            {bonusLines.map(line => (
              <span key={line} className="text-sm text-slate-200">
                {line}
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-2 sm:px-4">
          {classes.map((cls, idx) => {
            const isUnlocked = unlocked.has(cls.id);
            const hint = unlockHintFor(cls.id);
            const currentPortrait = cls.portraits[selectedIndices[cls.id]];

            return (
              <div
                key={cls.id}
                className={`bg-slate-900 border-2 rounded-[2rem] overflow-hidden flex flex-col transition-all animate-in fade-in slide-in-from-bottom duration-500 group ${
                  isUnlocked
                    ? 'border-slate-800 hover:border-amber-500 hover:shadow-[0_0_30px_rgba(245,158,11,0.2)]'
                    : 'border-slate-900 opacity-70'
                }`}
                style={{ animationDelay: `${idx * 120}ms` }}
                aria-disabled={!isUnlocked}
              >
                <div className="relative aspect-[3/4] overflow-hidden">
                  <img
                    src={currentPortrait}
                    alt={cls.name}
                    className={`w-full h-full object-cover transition-transform duration-700 ${
                      isUnlocked ? 'group-hover:scale-105' : 'grayscale saturate-50 blur-[1px]'
                    }`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />

                  {isUnlocked && (
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-6 px-4">
                      <button
                        onClick={(e) => handlePrevPortrait(e, cls.id)}
                        className="p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-amber-500 transition-all border border-white/10"
                        aria-label={`Previous ${cls.name} portrait`}
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <div className="flex gap-1">
                        {[0, 1, 2, 3].map(i => (
                          <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === selectedIndices[cls.id] ? 'bg-amber-500 scale-125' : 'bg-white/30'}`} />
                        ))}
                      </div>
                      <button
                        onClick={(e) => handleNextPortrait(e, cls.id)}
                        className="p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-amber-500 transition-all border border-white/10"
                        aria-label={`Next ${cls.name} portrait`}
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  )}

                  <div className="absolute top-4 left-4 p-2 bg-slate-950/80 backdrop-blur-md rounded-xl border border-white/10 text-white flex items-center gap-2">
                    {cls.icon}
                    <span className="font-bold text-xs uppercase tracking-widest">{cls.name}</span>
                  </div>

                  {!isUnlocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60">
                      <div className="bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-3 text-center max-w-[80%] shadow-xl">
                        <Lock className="text-amber-500 mx-auto mb-1" size={20} aria-hidden="true" />
                        <div className="text-amber-400 text-[10px] font-black uppercase tracking-[0.2em]">
                          Locked
                        </div>
                        <div className="text-xs text-slate-300 mt-1 leading-snug">{hint}</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6 flex flex-col flex-1 space-y-4">
                  <p className="text-xs text-slate-400 italic leading-relaxed h-10">{cls.desc}</p>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 border-t border-slate-800 pt-4">
                    <div className="flex justify-between"><span>STR</span> <span className="text-red-400">{cls.stats.strength}</span></div>
                    <div className="flex justify-between"><span>INT</span> <span className="text-blue-400">{cls.stats.intelligence}</span></div>
                    <div className="flex justify-between"><span>STA</span> <span className="text-green-400">{cls.stats.stamina}</span></div>
                    <div className="flex justify-between"><span>CHA</span> <span className="text-purple-400">{cls.stats.charisma}</span></div>
                  </div>

                  <button
                    onClick={() => {
                      if (!isUnlocked) return;
                      SoundManager.playConfirm();
                      onSelect(cls.id, cls.stats, cls.items, currentPortrait);
                    }}
                    disabled={!isUnlocked}
                    className={`w-full py-4 font-black rounded-2xl uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 mt-auto shadow-lg ${
                      isUnlocked
                        ? 'bg-amber-600 hover:bg-amber-500 text-white hover:scale-[1.02] active:scale-95'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                    aria-label={isUnlocked ? `Choose ${cls.name}` : `${cls.name} is locked — ${hint}`}
                  >
                    {isUnlocked ? (
                      <>
                        <Check size={18} /> Select Hero
                      </>
                    ) : (
                      <>
                        <Lock size={16} /> {hint}
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ClassSelection;
