
import React, { useEffect, useRef, useState } from 'react';
import { GameTurn, Language } from '../types';
import { User, Bot, Sparkles, Volume2, Pause, RefreshCw, Skull } from 'lucide-react';
import TypewriterText from './TypewriterText';
import { isSafeImageUrl, isSafeKeyword } from '../utils/safety';

interface StoryFeedProps {
  history: GameTurn[];
  isThinking: boolean;
  language: Language;
  onGenerateAudio: (turnId: string, text: string) => void;
  onKeywordAction?: (keyword: string) => void;
}

const StoryFeed: React.FC<StoryFeedProps> = ({ history, isThinking, language, onGenerateAudio, onKeywordAction }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  
  const isGerman = language === Language.German;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isThinking]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => setPlayingId(null);
    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, []);

  const toggleAudio = (turn: GameTurn) => {
    if (playingId === turn.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (turn.audioUrl) {
        if (audioRef.current) {
          audioRef.current.src = turn.audioUrl;
          audioRef.current.play();
          setPlayingId(turn.id);
        } else {
          const newAudio = new Audio(turn.audioUrl);
          audioRef.current = newAudio;
          newAudio.addEventListener('ended', () => setPlayingId(null));
          newAudio.play();
          setPlayingId(turn.id);
        }
      } else {
        onGenerateAudio(turn.id, turn.text);
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 custom-scrollbar relative">
      <div className="max-w-3xl mx-auto space-y-8 pb-32">
        {history.length === 0 && (
          <div className="text-center py-20 opacity-50">
            <Sparkles className="mx-auto mb-4 text-amber-500" size={48} />
            <p className="text-xl font-light">
              {isGerman ? 'Die Leere erwartet deine Geschichte...' : 'The void awaits your story...'}
            </p>
          </div>
        )}

        {history.map((turn, index) => {
          const isLatestBotTurn = index === history.length - 1 && turn.role === 'model';

          return (
          <div key={turn.id} className={`flex gap-4 ${turn.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
              turn.role === 'user' ? 'bg-indigo-600' : turn.isBossTurn ? 'bg-red-700 animate-pulse' : 'bg-amber-600'
            }`}>
              {turn.role === 'user' ? <User size={20} /> : turn.isBossTurn ? <Skull size={20} /> : <Bot size={20} />}
            </div>

            <div className={`flex flex-col max-w-[85%] ${turn.role === 'user' ? 'items-end' : 'items-start'}`}>
              
              <div className={`rounded-2xl p-6 shadow-md leading-relaxed text-base sm:text-lg relative group transition-all duration-500 ${
                turn.role === 'user' 
                  ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-100' 
                  : turn.isBossTurn
                    ? 'bg-red-950/40 border border-red-500/50 text-red-100 shadow-[0_0_20px_rgba(220,38,38,0.2)]'
                    : 'bg-slate-800 border border-slate-700 text-slate-200'
              }`}>
                {isLatestBotTurn ? (
                   <TypewriterText 
                      text={turn.text} 
                      onComplete={() => bottomRef.current?.scrollIntoView()} 
                      onKeywordClick={onKeywordAction}
                   />
                ) : (
                   turn.text.split('\n').map((paragraph, i) => (
                      paragraph.trim() && <p key={i} className="mb-2 last:mb-0">
                         {paragraph.split(/(\[\[.*?\]\])/g).map((part, pi) => {
                            if (part.startsWith('[[') && part.endsWith(']]')) {
                               const kw = part.slice(2, -2);
                               if (!isSafeKeyword(kw)) return <span key={pi}>{part}</span>;
                               return (
                                  <button
                                     key={pi}
                                     onClick={() => onKeywordAction?.(kw)}
                                     className="text-amber-400 font-bold hover:underline"
                                  >
                                     {kw}
                                  </button>
                               );
                            }
                            return part;
                         })}
                      </p>
                   ))
                )}

                {turn.role === 'model' && (
                  <div className="absolute -right-3 -bottom-3 flex gap-2">
                    {turn.audioError ? (
                      <button 
                         onClick={() => onGenerateAudio(turn.id, turn.text)}
                         className="p-2 rounded-full bg-red-900/80 text-red-200 shadow-lg border border-red-700 hover:bg-red-800 transition-all"
                      >
                         <RefreshCw size={14} />
                      </button>
                    ) : (
                      <button 
                        onClick={() => toggleAudio(turn)}
                        disabled={turn.audioLoading}
                        className="p-2 rounded-full bg-slate-700 text-slate-300 shadow-lg hover:bg-amber-600 hover:text-white transition-all hover:scale-110 border border-slate-600 min-w-[34px] flex items-center justify-center"
                      >
                        {turn.audioLoading ? (
                          <div className="flex gap-0.5 items-end h-3">
                             <span className="w-0.5 bg-current animate-[soundwave_1s_ease-in-out_infinite] h-2"></span>
                             <span className="w-0.5 bg-current animate-[soundwave_1.2s_ease-in-out_infinite_0.1s] h-3"></span>
                             <span className="w-0.5 bg-current animate-[soundwave_0.8s_ease-in-out_infinite_0.2s] h-1.5"></span>
                          </div>
                        ) : playingId === turn.id ? (
                          <Pause size={16} />
                        ) : (
                          <Volume2 size={16} />
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {isSafeImageUrl(turn.imageUrl) && (
                 <div className="mt-4 rounded-xl overflow-hidden border border-slate-700 shadow-2xl max-w-full sm:max-w-md animate-fade-in relative group">
                   <img src={turn.imageUrl} alt="Scene visualization" className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105" />
                 </div>
              )}
              
              {turn.imageLoading && (
                <div className="mt-4 rounded-xl w-full sm:w-80 h-48 bg-slate-800/30 border border-slate-700/50 relative overflow-hidden">
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-3">
                    <Sparkles size={24} className="animate-pulse text-amber-500/50" />
                  </div>
                </div>
              )}

            </div>
          </div>
          );
        })}

        {isThinking && (
          <div className="flex gap-4 animate-fade-in" role="status" aria-live="polite">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center shadow-lg animate-pulse">
               <Bot size={20} />
            </div>
            <div className="flex flex-col gap-1 pt-2">
              <span className="text-sm text-slate-400 italic">
                {isGerman ? 'Der Erzähler webt dein Schicksal…' : 'The narrator is weaving your fate…'}
              </span>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-[bounce_1.4s_infinite_0ms]" aria-hidden="true" />
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-[bounce_1.4s_infinite_200ms]" aria-hidden="true" />
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-[bounce_1.4s_infinite_400ms]" aria-hidden="true" />
              </div>
            </div>
          </div>
        )}
        
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default React.memo(StoryFeed);
