import React, { useEffect, useState } from 'react';
import { Lightbulb, X } from 'lucide-react';
import type { Nudge } from '../utils/nudges';

interface Props {
  nudge: Nudge | null;
  onDismiss: () => void;
}

const NudgeToast: React.FC<Props> = ({ nudge, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!nudge) return;
    setVisible(true);
    const id = window.setTimeout(() => {
      setVisible(false);
      window.setTimeout(onDismiss, 300);
    }, 6500);
    return () => window.clearTimeout(id);
  }, [nudge, onDismiss]);

  if (!nudge) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed left-1/2 bottom-[120px] -translate-x-1/2 z-[95] transition-all duration-300 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0 pointer-events-none'}`}
    >
      <div className="bg-slate-900/95 backdrop-blur border border-amber-500/40 rounded-full py-2 pl-3 pr-2 shadow-lg flex items-center gap-2 max-w-[min(92vw,560px)]">
        <Lightbulb size={16} className="text-amber-400 flex-shrink-0" aria-hidden="true" />
        <span className="text-sm text-slate-100 leading-snug">{nudge.message}</span>
        <button
          onClick={() => { setVisible(false); window.setTimeout(onDismiss, 200); }}
          aria-label="Dismiss tip"
          className="text-slate-400 hover:text-white p-1 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default NudgeToast;
