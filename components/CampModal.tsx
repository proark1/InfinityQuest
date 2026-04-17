import React, { useMemo } from 'react';
import { InventoryItem } from '../types';
import { Flame, X, Utensils, Droplets, Heart, Moon } from 'lucide-react';
import { SoundManager } from '../utils/soundEffects';

interface CampModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  onConfirm: (foodName: string, drinkName: string) => void;
}

const isFood = (item: InventoryItem): boolean => {
  const t = item.type.toLowerCase();
  return (
    t === 'food' ||
    t === 'consumable' ||
    (item.consumable?.hungerRestore ?? 0) > 0
  );
};

const isDrink = (item: InventoryItem): boolean => {
  const t = item.type.toLowerCase();
  return (
    t === 'drink' ||
    t === 'potion' ||
    (item.consumable?.thirstRestore ?? 0) > 0
  );
};

const CampModal: React.FC<CampModalProps> = ({ isOpen, onClose, inventory, onConfirm }) => {
  const { foodOptions, drinkOptions } = useMemo(() => ({
    foodOptions: inventory.filter(isFood),
    drinkOptions: inventory.filter(isDrink),
  }), [inventory]);

  const [selectedFood, setSelectedFood] = React.useState<string>('');
  const [selectedDrink, setSelectedDrink] = React.useState<string>('');

  React.useEffect(() => {
    if (isOpen) {
      setSelectedFood(foodOptions[0]?.name || '');
      setSelectedDrink(drinkOptions[0]?.name || '');
    }
  }, [isOpen, foodOptions, drinkOptions]);

  if (!isOpen) return null;

  const canCamp = !!selectedFood && !!selectedDrink;

  return (
    <div className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
      <div
        className="bg-slate-900 border-2 border-amber-700/50 rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close camp"
          className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 rounded-full p-2"
        >
          <X size={18} />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex p-4 bg-amber-900/30 border border-amber-600/40 rounded-full mb-3">
            <Flame className="text-amber-500 animate-pulse" size={32} />
          </div>
          <h2 className="text-2xl font-black text-amber-500 fantasy-font uppercase tracking-widest">Make Camp</h2>
          <p className="text-slate-400 text-sm mt-2">Rest for a few hours. Cook a meal. Restore your vigor.</p>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-orange-400 mb-2">
              <Utensils size={14} /> Food
            </label>
            {foodOptions.length > 0 ? (
              <select
                value={selectedFood}
                onChange={(e) => setSelectedFood(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2.5 text-sm focus:outline-none focus:border-amber-500"
              >
                {foodOptions.map(item => (
                  <option key={item.name} value={item.name}>{item.name} [{item.rarity}]</option>
                ))}
              </select>
            ) : (
              <div className="text-red-400 text-xs italic border border-red-900/40 bg-red-950/20 rounded-lg p-3 text-center">
                No food in your pack. You can't eat.
              </div>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-blue-400 mb-2">
              <Droplets size={14} /> Drink
            </label>
            {drinkOptions.length > 0 ? (
              <select
                value={selectedDrink}
                onChange={(e) => setSelectedDrink(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2.5 text-sm focus:outline-none focus:border-amber-500"
              >
                {drinkOptions.map(item => (
                  <option key={item.name} value={item.name}>{item.name} [{item.rarity}]</option>
                ))}
              </select>
            ) : (
              <div className="text-red-400 text-xs italic border border-red-900/40 bg-red-950/20 rounded-lg p-3 text-center">
                Nothing to drink. Dehydration looms.
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-6 text-center">
          <div className="bg-slate-800/50 rounded-lg p-2">
            <Heart size={14} className="mx-auto text-red-400 mb-1" />
            <div className="text-[9px] uppercase tracking-widest text-slate-500 font-black">HP</div>
            <div className="text-xs text-slate-200 font-mono">+50%</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2">
            <Moon size={14} className="mx-auto text-indigo-400 mb-1" />
            <div className="text-[9px] uppercase tracking-widest text-slate-500 font-black">Time</div>
            <div className="text-xs text-slate-200 font-mono">+4h</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2">
            <Flame size={14} className="mx-auto text-amber-400 mb-1" />
            <div className="text-[9px] uppercase tracking-widest text-slate-500 font-black">Mana</div>
            <div className="text-xs text-slate-200 font-mono">Full</div>
          </div>
        </div>

        <button
          onClick={() => {
            if (!canCamp) return;
            SoundManager.playConfirm();
            onConfirm(selectedFood, selectedDrink);
          }}
          disabled={!canCamp}
          className="w-full py-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center gap-2"
        >
          <Flame size={18} /> Rest the Night
        </button>

        <p className="text-[10px] text-slate-600 italic text-center mt-3">
          The wilds are rarely quiet. You may be disturbed.
        </p>
      </div>
    </div>
  );
};

export default CampModal;
