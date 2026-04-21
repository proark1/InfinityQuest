
import React, { useState, useEffect, useRef } from 'react';
import { SoundManager } from '../utils/soundEffects';
import { isSafeKeyword } from '../utils/safety';
import { prefersReducedMotion } from '../hooks/useModal';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  onKeywordClick?: (keyword: string) => void;
}

const CHUNK_SIZE = 8;

const TypewriterText: React.FC<TypewriterTextProps> = ({ text, speed = 15, onComplete, onKeywordClick }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  const skipRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    setDisplayedText('');
    setIsComplete(false);
    indexRef.current = 0;
    skipRef.current = false;

    // Honor OS reduced-motion preference: show full text immediately.
    if (prefersReducedMotion()) {
      setDisplayedText(text);
      setIsComplete(true);
      onCompleteRef.current?.();
      return;
    }

    let charCountForSound = 0;

    const typeChar = () => {
      if (skipRef.current) {
        setDisplayedText(text);
        setIsComplete(true);
        onCompleteRef.current?.();
        return;
      }
      if (indexRef.current < text.length) {
        setDisplayedText((prev) => prev + text.slice(indexRef.current, indexRef.current + CHUNK_SIZE));
        indexRef.current += CHUNK_SIZE;

        charCountForSound++;
        if (charCountForSound >= 3) {
          SoundManager.playTypewriter();
          charCountForSound = 0;
        }

        timerRef.current = window.setTimeout(typeChar, speed);
      } else {
        setIsComplete(true);
        onCompleteRef.current?.();
      }
    };

    timerRef.current = window.setTimeout(typeChar, speed);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, speed]);

  const skip = () => {
    if (isComplete) return;
    skipRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    setDisplayedText(text);
    setIsComplete(true);
    onCompleteRef.current?.();
  };

  // Helper to parse [[brackets]] into interactive elements
  const renderParsedContent = (content: string) => {
    const parts = content.split(/(\[\[.*?\]\])/g);
    return parts.map((part, i) => {
      if (part.startsWith('[[') && part.endsWith(']]')) {
        const keyword = part.slice(2, -2);
        if (!isSafeKeyword(keyword)) {
          return <span key={i}>{part}</span>;
        }
        return (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); onKeywordClick?.(keyword); }}
            onMouseEnter={() => SoundManager.playHover()}
            className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold hover:bg-amber-500 hover:text-slate-900 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
          >
            {keyword}
          </button>
        );
      }
      return part;
    });
  };

  const handleKey = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (isComplete) return;
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault();
      skip();
    }
  };

  return (
    <span
      className={isComplete ? 'typewriter-done' : 'typewriter'}
      role={isComplete ? undefined : 'button'}
      tabIndex={isComplete ? undefined : 0}
      aria-label={isComplete ? undefined : 'Skip typing animation'}
      onClick={() => { if (!isComplete) skip(); }}
      onKeyDown={handleKey}
    >
      {displayedText.split('\n').map((line, i) => (
         <span key={i}>
            {renderParsedContent(line)}
            {i < displayedText.split('\n').length - 1 && <br />}
         </span>
      ))}
    </span>
  );
};

export default TypewriterText;
