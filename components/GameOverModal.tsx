
import React, { useEffect, useMemo, useState } from 'react';
import { GameState, MetaState } from '../types';
import { Skull, Trophy, Star, BookOpen, Crown, Medal, Unlock, Target, Flame } from 'lucide-react';
import { buildRunSummary } from '../utils/runSummary';

interface GameOverModalProps {
  isOpen: boolean;
  gameState: GameState;
  metaState: MetaState;
  onContinue: (shardsEarned: number) => void;
}

const GameOverModal: React.FC<GameOverModalProps> = ({ isOpen, gameState, metaState, onContinue }) => {
  const [scoreBreakdown, setScoreBreakdown] = useState<{
    levelScore: number;
    lootScore: number;
    codexScore: number;
    total: number;
  } | null>(null);
  const [animatedShards, setAnimatedShards] = useState(0);

  const summary = useMemo(() => buildRunSummary(gameState, metaState), [gameState, metaState]);

  useEffect(() => {
    if (isOpen && !scoreBreakdown) {
      const levelScore = gameState.level * 100;
      const lootScore = gameState.inventory.reduce((acc, item) => {
        switch (item.rarity) {
          case 'legendary': return acc + 50;
          case 'epic': return acc + 25;
          case 'rare': return acc + 10;
          case 'uncommon': return acc + 5;
          default: return acc + 1;
        }
      }, 0);
      const codexScore = (gameState.codex?.length || 0) * 10;
      const total = levelScore + lootScore + codexScore;
      setScoreBreakdown({ levelScore, lootScore, codexScore, total });
    }
  }, [isOpen, gameState, scoreBreakdown]);

  useEffect(() => {
    if (!scoreBreakdown) return;
    const target = scoreBreakdown.total;
    const start = performance.now();
    const DURATION = 900;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimatedShards(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [scoreBreakdown]);

  if (!isOpen || !scoreBreakdown) return null;

  const hasUnlocks =
    summary.newAchievementTitles.length > 0 ||
    summary.newClassNames.length > 0 ||
    summary.newCodexCount > 0 ||
    summary.newNemesisName ||
    summary.newNemesisAvenged;

  return (
    <div
      className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-1000 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gameover-title"
    >
      <div className="max-w-lg w-full bg-slate-900 border border-red-900/50 rounded-2xl p-6 sm:p-8 text-center relative overflow-hidden shadow-2xl my-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-slate-900/50 to-slate-950 pointer-events-none" />

        <div className="relative z-10 space-y-5">
          <div className="inline-block p-4 bg-red-900/20 rounded-full border border-red-500/30 mb-1">
             <Skull size={42} className="text-red-500 animate-pulse" />
          </div>

          <h1 id="gameover-title" className="text-3xl sm:text-4xl font-bold text-red-500 fantasy-font uppercase tracking-[0.2em]">
             Fallen Hero
          </h1>

          <p className="text-slate-400 italic">"Your journey ends here, but your soul persists..."</p>

          {gameState.gameOverCause && (
             <div className="py-2 px-4 bg-red-950/80 border border-red-700/70 rounded-lg inline-block text-sm text-red-100">
               Slain by: <span className="font-bold text-white">{gameState.gameOverCause}</span>
             </div>
          )}

          {/* Shard breakdown */}
          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700 space-y-3 text-left">
             <h3 className="text-amber-500 font-bold uppercase tracking-widest text-xs mb-3 border-b border-slate-700 pb-2 flex items-center justify-center gap-2">
               <Star size={12} fill="currentColor" /> Soul Shards Earned
             </h3>

             <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 flex items-center gap-2"><Crown size={14}/> Level {gameState.level}</span>
                <span className="text-slate-200">+{scoreBreakdown.levelScore}</span>
             </div>
             <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 flex items-center gap-2"><Trophy size={14}/> Epic Loot</span>
                <span className="text-slate-200">+{scoreBreakdown.lootScore}</span>
             </div>
             <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 flex items-center gap-2"><BookOpen size={14}/> Discoveries</span>
                <span className="text-slate-200">+{scoreBreakdown.codexScore}</span>
             </div>

             <div className="flex justify-between items-center pt-3 mt-1 border-t border-slate-700">
                <span className="text-sm font-bold text-slate-200">Total Shards</span>
                <span className="text-2xl font-bold text-amber-500 flex items-center gap-2 tabular-nums">
                   <Star size={18} fill="currentColor" /> {animatedShards}
                </span>
             </div>
          </div>

          {/* Unlocked this run */}
          {hasUnlocks && (
            <div className="bg-slate-800/40 rounded-xl p-5 border border-amber-500/20 text-left space-y-2">
              <h3 className="text-amber-400 font-bold uppercase tracking-widest text-xs mb-2 flex items-center gap-2 justify-center">
                <Unlock size={12} /> Unlocked This Run
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
              {summary.newNemesisAvenged && (
                <div className="flex items-center gap-2 text-sm text-slate-200">
                  <Flame size={14} className="text-emerald-400 flex-shrink-0" />
                  <span>Nemesis avenged — +150 bonus shards</span>
                </div>
              )}
              {summary.newNemesisName && (
                <div className="flex items-center gap-2 text-sm text-slate-200">
                  <Skull size={14} className="text-rose-400 flex-shrink-0" />
                  <span>Nemesis born: <span className="font-bold">{summary.newNemesisName}</span></span>
                </div>
              )}
            </div>
          )}

          {/* What's next */}
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
             onClick={() => onContinue(scoreBreakdown.total)}
             className="w-full py-4 bg-gradient-to-r from-red-900 to-slate-900 hover:from-red-800 hover:to-slate-800 border border-red-700 text-red-100 font-bold rounded-xl uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(185,28,28,0.3)]"
          >
             Enter The Pantheon
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverModal;
