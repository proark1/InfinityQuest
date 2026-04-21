import React from 'react';
import { Compass, Target, Sparkles } from 'lucide-react';

interface Props {
  quest?: string;
  nextBeat?: string;
  sideLead?: string;
}

const QuestCompass: React.FC<Props> = ({ quest, nextBeat, sideLead }) => {
  const hasAny = !!(quest || nextBeat || sideLead);
  if (!hasAny) return null;

  return (
    <div
      className="max-w-3xl mx-auto mb-2 rounded-xl bg-slate-900/70 backdrop-blur border border-slate-700/70 px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs"
      role="note"
      aria-label="Current quest and next step"
    >
      {quest && (
        <div className="flex items-center gap-1.5 text-slate-200 min-w-0">
          <Compass size={12} className="text-amber-400 flex-shrink-0" aria-hidden="true" />
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Quest</span>
          <span className="truncate max-w-[22ch] sm:max-w-[32ch]" title={quest}>{quest}</span>
        </div>
      )}
      {nextBeat && (
        <div className="flex items-center gap-1.5 text-slate-200 min-w-0">
          <Target size={12} className="text-blue-400 flex-shrink-0" aria-hidden="true" />
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Next</span>
          <span className="truncate max-w-[26ch] sm:max-w-[36ch]" title={nextBeat}>{nextBeat}</span>
        </div>
      )}
      {sideLead && (
        <div className="flex items-center gap-1.5 text-slate-400 min-w-0">
          <Sparkles size={12} className="text-purple-400 flex-shrink-0" aria-hidden="true" />
          <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Lead</span>
          <span className="truncate max-w-[22ch] sm:max-w-[32ch] italic" title={sideLead}>{sideLead}</span>
        </div>
      )}
    </div>
  );
};

export default QuestCompass;
