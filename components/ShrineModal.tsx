import React, { useState } from 'react';
import { InventoryItem } from '../types';
import { Archive, X, Flame } from 'lucide-react';
import { useModal } from '../hooks/useModal';
import { SoundManager } from '../utils/soundEffects';

interface Props {
  isOpen: boolean;
  inventory: InventoryItem[];
  heroName: string;
  onBury: (item: InventoryItem, note: string) => void;
  onSkip: () => void;
}

const MAX_NOTE = 120;

const ShrineModal: React.FC<Props> = ({ isOpen, inventory, heroName, onBury, onSkip }) => {
  const dialogRef = useModal<HTMLDivElement>(isOpen, onSkip);
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const burialCandidates = inventory.filter(i => i.type !== 'Food' && i.type !== 'Drink' && i.type !== 'Potion');

  const confirm = () => {
    if (!selected) return;
    SoundManager.playConfirm();
    onBury(selected, note.trim().slice(0, MAX_NOTE) || 'Left in memory.');
    setSelected(null);
    setNote('');
  };

  const skip = () => {
    setSelected(null);
    setNote('');
    onSkip();
  };

  return (
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-[95] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shrine-title"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 w-full max-w-lg shadow-2xl outline-none overflow-y-auto max-h-[90vh]"
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30">
              <Flame size={20} className="text-emerald-400" aria-hidden="true" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Shrine of Legacy</div>
              <h3 id="shrine-title" className="text-xl font-bold text-white fantasy-font leading-tight">Bury an Heirloom</h3>
            </div>
          </div>
          <button
            onClick={skip}
            aria-label="Leave the shrine"
            className="text-slate-400 hover:text-white transition-colors p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400 rounded"
          >
            <X size={22} />
          </button>
        </div>

        <p className="text-slate-400 text-sm mb-4">
          Leave one item behind. Your next hero will find it at the start of their run, prefixed by your note.
        </p>

        {burialCandidates.length === 0 ? (
          <div className="text-slate-500 italic text-sm text-center py-8">
            You carry nothing worth leaving behind.
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
            {burialCandidates.map((item, idx) => {
              const isSelected = selected?.name === item.name;
              return (
                <li key={`${item.name}-${idx}`}>
                  <button
                    onClick={() => setSelected(item)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-900/30 text-white'
                        : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500'
                    }`}
                    aria-pressed={isSelected}
                  >
                    <div className="font-bold text-sm truncate">{item.name}</div>
                    <div className="text-[10px] uppercase tracking-wider opacity-70">{item.rarity} {item.type}</div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {selected && (
          <div className="mt-4 space-y-2">
            <label htmlFor="burial-note" className="block text-xs font-bold text-slate-300 uppercase tracking-widest">
              A note for the next hero (optional)
            </label>
            <textarea
              id="burial-note"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={`"${heroName || 'A forgotten hero'} left this behind."`}
              maxLength={MAX_NOTE}
              rows={2}
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
            <div className="text-[10px] text-slate-500 text-right">{note.length}/{MAX_NOTE}</div>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            onClick={skip}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold transition-all"
          >
            Leave Untouched
          </button>
          <button
            onClick={confirm}
            disabled={!selected}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            <Archive size={16} /> Bury
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShrineModal;
