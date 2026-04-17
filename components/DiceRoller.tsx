
import React, { useState, useEffect } from 'react';
import { SkillCheck, WorldRoll } from '../types';
import { Dices, Check, X, Sparkles, Skull } from 'lucide-react';
import { SoundManager } from '../utils/soundEffects';

interface DiceRollerProps {
  check?: SkillCheck;
  worldRoll?: WorldRoll;
  onRollComplete: (roll: number) => void;
  modifier?: number;
}

const DiceRoller: React.FC<DiceRollerProps> = ({ check, worldRoll, onRollComplete, modifier = 0 }) => {
  const [isRolling, setIsRolling] = useState(false);
  const [currentFace, setCurrentFace] = useState(20);
  const [result, setResult] = useState<number | null>(null);

  useEffect(() => {
    // If it's a world roll, trigger it automatically
    if (worldRoll && !isRolling && result === null) {
      handleRoll();
    }
  }, [worldRoll]);

  const handleRoll = () => {
    SoundManager.playClick();
    setIsRolling(true);
    let duration = 0;
    const maxDuration = 1500; // 1.5s spin
    const interval = 50;

    const spin = setInterval(() => {
      duration += interval;
      setCurrentFace(Math.floor(Math.random() * 20) + 1);
      
      if (duration % 100 === 0) SoundManager.playHover();

      if (duration >= maxDuration) {
        clearInterval(spin);
        const finalRoll = worldRoll?.result ? worldRoll.result : (Math.floor(Math.random() * 20) + 1);
        setCurrentFace(finalRoll);
        setResult(finalRoll);
        setIsRolling(false);
        
        // Critical Effects
        if (finalRoll === 20) {
           SoundManager.playNat20();
        } else if (finalRoll === 1) {
           SoundManager.playNat1();
        } else {
           SoundManager.playConfirm();
        }
        
        setTimeout(() => {
          onRollComplete(finalRoll);
        }, 2500); // Pause for impact
      }
    }, interval);
  };

  const total = result ? result + (check ? modifier : 0) : null;
  const isSuccess = check && total ? total >= check.difficultyClass : true;
  const isCritSuccess = result === 20;
  const isCritFail = result === 1;

  const headerLabel = worldRoll ? "THE NARRATOR ROLLS" : "SKILL CHECK";
  const subLabel = worldRoll ? worldRoll.label : `Rolling ${check?.attribute} ${check?.reason}`;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[70] flex items-center justify-center p-4 animate-in fade-in">
      <div className={`bg-slate-900 border-2 rounded-[2rem] p-10 w-full max-w-sm text-center shadow-2xl relative overflow-hidden transition-all duration-500 ${
         isCritSuccess ? 'border-amber-500 shadow-amber-500/20' : isCritFail ? 'border-red-600 shadow-red-600/20' : worldRoll ? 'border-indigo-500 shadow-indigo-500/10' : 'border-slate-700'
      }`}>
        {/* Ambient Glow */}
        <div className={`absolute inset-0 opacity-20 pointer-events-none transition-colors duration-500 ${
          result === null ? (worldRoll ? 'bg-indigo-500' : 'bg-amber-500') : isSuccess ? 'bg-green-500' : 'bg-red-500'
        }`} />
        
        {isCritSuccess && <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent,rgba(251,191,36,0.3))] animate-spin-slow pointer-events-none" />}

        <div className="relative z-10 space-y-8">
          <div className="space-y-2">
             <h2 className={`text-2xl font-black fantasy-font uppercase tracking-widest ${worldRoll ? 'text-indigo-400' : 'text-white'}`}>{headerLabel}</h2>
             <p className="text-slate-400 text-sm italic opacity-80">
               {subLabel}
             </p>
          </div>

          {/* Dice Visual */}
          <div className="flex justify-center py-6 relative">
             {isCritSuccess && <Sparkles className="absolute top-0 right-10 text-amber-400 animate-bounce" size={32} />}
             {isCritFail && <Skull className="absolute top-0 right-10 text-red-500 animate-bounce" size={32} />}
             
             <div className={`w-36 h-36 bg-slate-800 rounded-[2rem] border-4 flex items-center justify-center relative transition-all duration-300 ${
                isRolling ? (worldRoll ? 'border-indigo-400 animate-pulse scale-110 shadow-indigo-500/30' : 'border-amber-500 animate-pulse scale-110 shadow-amber-500/30') : 
                result === null ? 'border-slate-700' :
                isCritSuccess ? 'border-amber-400 bg-amber-900/40 scale-110 shadow-[0_0_60px_rgba(251,191,36,0.6)]' :
                isCritFail ? 'border-red-600 bg-red-900/40 scale-110 shadow-[0_0_60px_rgba(220,38,38,0.6)]' :
                isSuccess ? 'border-green-500 shadow-[0_0_40px_rgba(34,197,94,0.4)]' : 'border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.4)]'
             }`}>
                <Dices size={80} className={`absolute text-slate-700 transition-opacity ${isRolling || result !== null ? 'opacity-20' : 'opacity-100'}`} />
                <span className={`text-7xl font-black font-mono relative z-10 ${
                   isRolling ? (worldRoll ? 'text-indigo-400 blur-[1px]' : 'text-amber-400 blur-[1px]') : 
                   isCritSuccess ? 'text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]' :
                   isCritFail ? 'text-red-500 drop-shadow-[0_0_15px_rgba(220,38,38,0.8)]' :
                   result === null ? 'text-slate-500' : 
                   (check ? (isSuccess ? 'text-green-400' : 'text-red-400') : 'text-white')
                }`}>
                   {currentFace}
                </span>
             </div>
          </div>

          {/* Player check Breakdown */}
          {check && (
            <div className="flex items-center justify-center gap-6 text-sm font-black">
               <div className="flex flex-col items-center">
                  <span className="text-slate-600 text-[10px] uppercase tracking-widest">Roll</span>
                  <span className="text-2xl font-bold">{result ?? '?'}</span>
               </div>
               <span className="text-slate-700 text-xl">+</span>
               <div className="flex flex-col items-center">
                  <span className="text-slate-600 text-[10px] uppercase tracking-widest">Mod</span>
                  <span className="text-2xl font-bold text-amber-500">{modifier}</span>
               </div>
               <span className="text-slate-700 text-xl">=</span>
               <div className="flex flex-col items-center bg-slate-800/50 p-3 rounded-2xl min-w-[70px] border border-white/5">
                  <span className="text-slate-600 text-[8px] uppercase tracking-widest">Total</span>
                  <span className={`text-3xl font-black ${
                     result === null ? 'text-slate-700' : isSuccess ? 'text-green-400' : 'text-red-400'
                  }`}>
                     {total ?? '?'}
                  </span>
               </div>
            </div>
          )}
          
          {check && (
            <div className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-black">
               Difficulty Class: <span className="text-white">{check.difficultyClass}</span>
            </div>
          )}

          {result === null && !isRolling && !worldRoll && (
             <button 
               onClick={handleRoll}
               onMouseEnter={() => SoundManager.playHover()}
               className="w-full py-5 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-2xl uppercase tracking-[0.3em] transition-all hover:scale-105 active:scale-95 shadow-2xl border-b-4 border-amber-800"
             >
               Roll the Bones
             </button>
          )}

          {result !== null && (
             <div className={`text-xl font-black uppercase tracking-[0.2em] animate-in fade-in slide-in-from-bottom-4 ${isSuccess ? 'text-green-400' : 'text-red-400'}`}>
                {isCritSuccess ? "CRITICAL TRIUMPH!" : isCritFail ? "ABYSSAL FAILURE!" : worldRoll ? "FATE DECIDED" : isSuccess ? <span className="flex items-center justify-center gap-2"><Check /> SUCCESS</span> : <span className="flex items-center justify-center gap-2"><X /> FAILURE</span>}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiceRoller;
