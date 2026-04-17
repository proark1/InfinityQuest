
import React, { useState, useEffect } from 'react';
import { Dices, Coins, Trophy, X } from 'lucide-react';
import { SoundManager } from '../utils/soundEffects';

interface MinigameDiceProps {
  playerGold: number;
  onClose: () => void;
  onResult: (netGold: number) => void;
}

const MinigameDice: React.FC<MinigameDiceProps> = ({ playerGold, onClose, onResult }) => {
  const [bet, setBet] = useState(10);
  const [gameState, setGameState] = useState<'betting' | 'rolling' | 'result'>('betting');
  const [playerRolls, setPlayerRolls] = useState<[number, number]>([1, 1]);
  const [enemyRolls, setEnemyRolls] = useState<[number, number]>([1, 1]);
  const [winner, setWinner] = useState<'player' | 'enemy' | 'draw'>('draw');

  const maxBet = Math.min(playerGold, 100);

  const rollDice = () => {
    if (playerGold < bet) return;
    
    SoundManager.playConfirm();
    setGameState('rolling');
    
    let rolls = 0;
    const interval = setInterval(() => {
      setPlayerRolls([Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1]);
      setEnemyRolls([Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1]);
      SoundManager.playDiceRoll();
      rolls++;
      
      if (rolls > 10) {
        clearInterval(interval);
        finishRoll();
      }
    }, 100);
  };

  const finishRoll = () => {
    const finalPlayer = [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
    const finalEnemy = [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
    
    setPlayerRolls(finalPlayer as [number, number]);
    setEnemyRolls(finalEnemy as [number, number]);
    
    const playerSum = finalPlayer[0] + finalPlayer[1];
    const enemySum = finalEnemy[0] + finalEnemy[1];
    
    let result: 'player' | 'enemy' | 'draw' = 'draw';
    let multiplier = 1;

    // Pairs beat non-pairs regardless of sum (House Rule)
    const playerPair = finalPlayer[0] === finalPlayer[1];
    const enemyPair = finalEnemy[0] === finalEnemy[1];

    if (playerPair && !enemyPair) result = 'player';
    else if (!playerPair && enemyPair) result = 'enemy';
    else if (playerSum > enemySum) result = 'player';
    else if (enemySum > playerSum) result = 'enemy';
    
    if (playerPair && result === 'player') multiplier = 2; // Critical Win

    setWinner(result);
    setGameState('result');

    if (result === 'player') {
       SoundManager.playCoins();
       SoundManager.playLevelUp();
       onResult(bet * multiplier); // Net gain is bet * multiplier (e.g. bet 10, win 20 total, net +10)
    } else if (result === 'enemy') {
       SoundManager.playDamage();
       onResult(-bet);
    } else {
       SoundManager.playCancel();
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-slate-900 border-2 border-amber-600/50 rounded-2xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
           <h2 className="text-2xl font-bold text-amber-500 fantasy-font flex items-center gap-2">
              <Dices /> Dragon's Dice
           </h2>
           <button onClick={onClose} className="text-slate-400 hover:text-white"><X /></button>
        </div>

        {/* Game Area */}
        <div className="bg-slate-800/50 rounded-xl p-6 mb-6 flex justify-between items-center relative">
           {/* Player */}
           <div className="flex flex-col items-center gap-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">You</div>
              <div className="flex gap-2">
                 <DiceFace value={playerRolls[0]} isRolling={gameState === 'rolling'} />
                 <DiceFace value={playerRolls[1]} isRolling={gameState === 'rolling'} />
              </div>
              {gameState === 'result' && (
                 <div className={`font-bold ${winner === 'player' ? 'text-green-400' : 'text-slate-500'}`}>
                    {playerRolls[0] + playerRolls[1]} {playerRolls[0] === playerRolls[1] && "(PAIR!)"}
                 </div>
              )}
           </div>

           {/* VS Divider */}
           <div className="h-12 w-[1px] bg-slate-600" />

           {/* Enemy */}
           <div className="flex flex-col items-center gap-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">House</div>
              <div className="flex gap-2">
                 <DiceFace value={enemyRolls[0]} isRolling={gameState === 'rolling'} isEnemy />
                 <DiceFace value={enemyRolls[1]} isRolling={gameState === 'rolling'} isEnemy />
              </div>
              {gameState === 'result' && (
                 <div className={`font-bold ${winner === 'enemy' ? 'text-red-400' : 'text-slate-500'}`}>
                    {enemyRolls[0] + enemyRolls[1]} {enemyRolls[0] === enemyRolls[1] && "(PAIR!)"}
                 </div>
              )}
           </div>
        </div>

        {/* Result Text */}
        {gameState === 'result' && (
           <div className="text-center mb-6 animate-in slide-in-from-bottom-2">
              {winner === 'player' && <div className="text-green-400 font-bold text-xl uppercase">You Win {bet * (playerRolls[0] === playerRolls[1] ? 2 : 1)} Gold!</div>}
              {winner === 'enemy' && <div className="text-red-400 font-bold text-xl uppercase">House Wins! Lost {bet} Gold.</div>}
              {winner === 'draw' && <div className="text-slate-300 font-bold text-xl uppercase">Push. Coins returned.</div>}
           </div>
        )}

        {/* Controls */}
        {gameState === 'betting' && (
           <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-slate-400">
                 <span>Wager Amount</span>
                 <span className="text-amber-400 font-bold">{bet}g</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max={maxBet} 
                step="10"
                value={bet} 
                onChange={(e) => setBet(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <button 
                onClick={rollDice}
                disabled={playerGold < 10}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
              >
                 <Dices size={20} /> Roll Dice
              </button>
              {playerGold < 10 && <div className="text-center text-xs text-red-400">Not enough gold!</div>}
           </div>
        )}

        {gameState === 'result' && (
           <div className="flex gap-2">
              <button 
                onClick={() => setGameState('betting')}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all"
              >
                 Play Again
              </button>
              <button 
                onClick={onClose}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
              >
                 Leave Table
              </button>
           </div>
        )}
      </div>
    </div>
  );
};

const DiceFace: React.FC<{ value: number, isRolling?: boolean, isEnemy?: boolean }> = ({ value, isRolling, isEnemy }) => {
   const dots = {
      1: ['justify-center items-center'],
      2: ['justify-start items-start', 'justify-end items-end'],
      3: ['justify-start items-start', 'justify-center items-center', 'justify-end items-end'],
      4: ['justify-start items-start', 'justify-end items-start', 'justify-start items-end', 'justify-end items-end'],
      5: ['justify-start items-start', 'justify-end items-start', 'justify-center items-center', 'justify-start items-end', 'justify-end items-end'],
      6: ['justify-start items-start', 'justify-end items-start', 'justify-start items-center', 'justify-end items-center', 'justify-start items-end', 'justify-end items-end']
   };

   return (
      <div className={`w-12 h-12 bg-slate-200 rounded-lg shadow-[inset_0_-2px_4px_rgba(0,0,0,0.2)] grid grid-cols-3 grid-rows-3 p-2 gap-0.5 ${isRolling ? 'animate-spin' : ''}`}>
         {/* Render Dots based on value */}
         {[...Array(value)].map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${isEnemy ? 'bg-red-900' : 'bg-indigo-900'} ${
               value === 1 ? 'col-start-2 row-start-2' :
               value === 2 ? (i===0 ? 'col-start-1 row-start-1' : 'col-start-3 row-start-3') :
               value === 3 ? (i===0 ? 'col-start-1 row-start-1' : i===1 ? 'col-start-2 row-start-2' : 'col-start-3 row-start-3') :
               value === 4 ? (i===0 ? 'col-start-1 row-start-1' : i===1 ? 'col-start-3 row-start-1' : i===2 ? 'col-start-1 row-start-3' : 'col-start-3 row-start-3') :
               value === 5 ? (i===0 ? 'col-start-1 row-start-1' : i===1 ? 'col-start-3 row-start-1' : i===2 ? 'col-start-2 row-start-2' : i===3 ? 'col-start-1 row-start-3' : 'col-start-3 row-start-3') :
               (i===0 ? 'col-start-1 row-start-1' : i===1 ? 'col-start-3 row-start-1' : i===2 ? 'col-start-1 row-start-2' : i===3 ? 'col-start-3 row-start-2' : i===4 ? 'col-start-1 row-start-3' : 'col-start-3 row-start-3')
            }`} />
         ))}
      </div>
   );
}

export default MinigameDice;
