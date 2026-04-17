import React from 'react';
import { Ability } from '../types';
import { Sparkles, Zap } from 'lucide-react';
import { SoundManager } from '../utils/soundEffects';
import { DEFAULT_ABILITY_MANA_COST } from '../utils/constants';

interface AbilityHotbarProps {
  abilities: Ability[];
  cooldowns: Record<string, number>;
  currentMana: number;
  onCast: (ability: Ability) => void;
  disabled?: boolean;
}

const AbilityHotbar: React.FC<AbilityHotbarProps> = ({ abilities, cooldowns, currentMana, onCast, disabled }) => {
  const active = abilities.filter(a => a.type !== 'passive').slice(0, 6);

  if (active.length === 0) return null;

  return (
    <div className="bg-slate-950/80 border-t border-slate-800 px-4 py-2">
      <div className="max-w-3xl mx-auto flex items-center gap-2 overflow-x-auto custom-scrollbar">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex-shrink-0 flex items-center gap-1">
          <Sparkles size={12} /> Abilities
        </span>
        {active.map((ability, idx) => {
          const cd = cooldowns[ability.name] || 0;
          const cost = ability.manaCost ?? DEFAULT_ABILITY_MANA_COST;
          const isSpell = ability.type === 'spell';
          const unaffordable = isSpell && currentMana < cost;
          const locked = disabled || cd > 0 || unaffordable;
          const title = cd > 0
            ? `On cooldown: ${cd} turn${cd > 1 ? 's' : ''}`
            : unaffordable
              ? `Needs ${cost} mana`
              : ability.description;

          return (
            <button
              key={`${ability.name}-${idx}`}
              onClick={() => {
                if (locked) return;
                SoundManager.playConfirm();
                onCast(ability);
              }}
              onMouseEnter={() => { if (!locked) SoundManager.playHover(); }}
              disabled={locked}
              title={title}
              aria-label={`Use ${ability.name}${isSpell ? `, costs ${cost} mana` : ''}`}
              className={`relative flex-shrink-0 px-3 py-2 rounded-lg border text-left text-xs font-bold transition-all
                ${locked
                  ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                  : isSpell
                    ? 'bg-indigo-950/60 border-indigo-700/50 hover:border-indigo-400 text-indigo-200 hover:scale-105'
                    : 'bg-amber-950/40 border-amber-800/50 hover:border-amber-500 text-amber-200 hover:scale-105'}`}
            >
              <div className="flex items-center gap-1.5">
                {isSpell ? <Zap size={12} /> : <Sparkles size={12} />}
                <span className="whitespace-nowrap">{ability.name}</span>
                {isSpell && (
                  <span className="text-[9px] font-mono opacity-70">{cost}MP</span>
                )}
              </div>
              {cd > 0 && (
                <div className="absolute inset-0 bg-slate-950/70 rounded-lg flex items-center justify-center">
                  <span className="text-slate-300 font-mono text-sm font-black">{cd}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(AbilityHotbar);
