import React from 'react';
import { CodexEntry } from '../types';
import { X, BookOpen, Swords, MapPin } from 'lucide-react';
import { useModal } from '../hooks/useModal';

interface Props {
  entry: CodexEntry | null;
  onClose: () => void;
}

const CodexEntryModal: React.FC<Props> = ({ entry, onClose }) => {
  const dialogRef = useModal<HTMLDivElement>(!!entry, onClose);
  if (!entry) return null;

  const isBestiary = entry.category === 'Bestiary';
  const Icon = isBestiary ? Swords : MapPin;
  const borderClass = isBestiary ? 'border-red-500/30' : 'border-blue-500/30';
  const badgeBg = isBestiary ? 'bg-red-950/40' : 'bg-blue-950/40';
  const badgeBorder = isBestiary ? 'border-red-500/30' : 'border-blue-500/30';
  const accentText = isBestiary ? 'text-red-400' : 'text-blue-400';

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[90] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="codex-entry-title"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`bg-slate-900 border ${borderClass} rounded-2xl p-6 w-full max-w-md shadow-2xl outline-none`}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${badgeBg} border ${badgeBorder}`}>
              <Icon size={20} className={accentText} aria-hidden="true" />
            </div>
            <div>
              <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${accentText} flex items-center gap-1.5`}>
                <BookOpen size={10} /> {entry.category}
              </div>
              <h3 id="codex-entry-title" className="text-xl font-bold text-white fantasy-font leading-tight">
                {entry.name}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close codex entry"
            className="text-slate-400 hover:text-white transition-colors p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400 rounded"
          >
            <X size={22} />
          </button>
        </div>

        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{entry.description}</p>

        {entry.dateUnlocked && (
          <p className="text-[11px] text-slate-500 mt-4 italic">
            Discovered {new Date(entry.dateUnlocked).toLocaleDateString()}.
          </p>
        )}
      </div>
    </div>
  );
};

export default CodexEntryModal;
