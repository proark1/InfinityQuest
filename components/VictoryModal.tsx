
import React, { useEffect, useMemo, useState } from 'react';
import { GameState, MetaState } from '../types';
import { Crown, Sparkles, Star, ArrowUp, Medal, BookOpen, Target, Unlock } from 'lucide-react';
import { buildRunSummary } from '../utils/runSummary';

interface VictoryModalProps {
  isOpen: boolean;
  gameState: GameState;
  metaState: MetaState;
  onAscend: (shardsEarned: number) => void;
}

const VictoryModal: React.FC<VictoryModalProps> = ({ isOpen, gameState, metaState, onAscend }) => {
  const [bonusShards, setBonusShards] = useState(0);
  const [animatedShards, setAnimatedShards] = useState(0);
  const summary = useMemo(() => buildRunSummary(gameState, metaState), [gameState, metaState]);

  useEffect(() => {
    if (isOpen) {
      let bonus = 500;
      bonus += gameState.level * 20;
      bonus += (gameState.inventory.filter(i => i.rarity === 'legendary').length * 100);
      setBonusShards(bonus);
    }
  }, [isOpen, gameState]);

  useEffect(() => {
    if (!bonusShards) return;
    const start = performance.now();
    const DURATION = 1100;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimatedShards(Math.round(bonusShards * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [bonusShards]);

  if (!isOpen) return null;

  const hasUnlocks =
    summary.newAchievementTitles.length > 0 ||
    summary.newClassNames.length > 0 ||
    summary.newCodexCount > 0 ||
    summary.newNemesisAvenged;

  return (
    <div
      className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-1000 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="victory-title"
    >
      <div className="max-w-lg w-full bg-slate-900 border border-amber-500/50 rounded-2xl p-6 sm:p-8 text-center relative overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.2)] my-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-slate-900/50 to-slate-950 pointer-events-none" />

        <div className="relative z-10 space-y-5">
          <div className="inline-block p-5 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-full border-4 border-slate-900 shadow-xl animate-bounce">
             <Crown size={42} className="text-white" />
          </div>

          <h1 id="victory-title" className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 fantasy-font uppercase tracking-widest">
             Victory
          </h1>

          <p className="text-slate-300 italic text-base sm:text-lg">"You have conquered the abyss and shattered the cycle."</p>

          <div className="bg-slate-800/80 rounded-xl p-5 border border-amber-500/30 space-y-3 text-left">
             <div className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Ascension Rewards</div>

             <div className="flex justify-between items-center text-base">
                <span className="text-slate-200 flex items-center gap-2"><Star className="text-amber-500" size={16}/> Soul Shards</span>
                <span className="text-2xl font-bold text-amber-400 tabular-nums">+{animatedShards}</span>
             </div>

             <div className="flex justify-between items-center text-base">
                <span className="text-slate-200 flex items-center gap-2"><ArrowUp className="text-purple-500" size={16}/> World Tier</span>
                <span className="text-2xl font-bold text-purple-400">+1</span>
             </div>
          </div>

          {hasUnlocks && (
            <div className="bg-slate-800/40 rounded-xl p-5 border border-amber-500/20 text-left space-y-2">
              <h3 className="text-amber-400 font-bold uppercase tracking-widest text-xs mb-2 flex items-center gap-2 justify-center">
                <Unlock size={12} /> Earned This Run
              </h3>
              {summary.newAchievementTitles.map(title => (
                <div key={title} className="flex items-center gap-2 text-sm text-slate-200">
                  <Medal size={14} className="text-yellow-500 flex-shrink-0" />
                  <span>{title}</span>
                </div>
              ))}
              {summary.newClassNames.map(name => (
                <div key={name} className="flex items-center gap-2 text-sm text-slate-200">
                  <Crown size={14} className="text-amber-400 flex-shrink-0" />
                  <span>Class unlocked: <span className="font-bold">{name}</span></span>
                </div>
              ))}
              {summary.newCodexCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-slate-200">
                  <BookOpen size={14} className="text-blue-400 flex-shrink-0" />
                  <span>+{summary.newCodexCount} codex {summary.newCodexCount === 1 ? 'entry' : 'entries'}</span>
                </div>
              )}
            </div>
          )}

          {summary.nextUnlock && (
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-4 text-left">
              <div className="flex items-center gap-2 text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black mb-1">
                <Target size={12} /> What's Next
              </div>
              <div className="font-bold text-white text-sm">{summary.nextUnlock.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{summary.nextUnlock.subtitle}</div>
              {summary.nextUnlock.distance && (
                <div className="text-[11px] text-amber-400 mt-1">{summary.nextUnlock.distance}</div>
              )}
            </div>
          )}

          <button
             onClick={() => onAscend(bonusShards)}
             className="w-full py-4 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-bold rounded-xl uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-lg group relative overflow-hidden"
          >
             <span className="relative z-10 flex items-center justify-center gap-2">
                <Sparkles size={18} /> Ascend to New Game+
             </span>
             <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VictoryModal;
