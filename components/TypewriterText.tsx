
import React, { useState, useEffect, useRef } from 'react';
import { SoundManager } from '../utils/soundEffects';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  onKeywordClick?: (keyword: string) => void;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({ text, speed = 15, onComplete, onKeywordClick }) => {
  const [displayedText, setDisplayedText] = useState('');
  const indexRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    setDisplayedText('');
    indexRef.current = 0;
    
    let charCountForSound = 0;

    const typeChar = () => {
      if (indexRef.current < text.length) {
        const chunk = text.length > 500 ? 3 : 1; 
        
        setDisplayedText((prev) => prev + text.slice(indexRef.current, indexRef.current + chunk));
        indexRef.current += chunk;
        
        charCountForSound++;
        if (charCountForSound >= 3) {
           SoundManager.playTypewriter();
           charCountForSound = 0;
        }

        timerRef.current = window.setTimeout(typeChar, speed);
      } else {
        if (onCompleteRef.current) onCompleteRef.current();
      }
    };

    timerRef.current = window.setTimeout(typeChar, speed);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, speed]);

  // Helper to parse [[brackets]] into interactive elements
  const renderParsedContent = (content: string) => {
    const parts = content.split(/(\[\[.*?\]\])/g);
    return parts.map((part, i) => {
      if (part.startsWith('[[') && part.endsWith(']]')) {
        const keyword = part.slice(2, -2);
        return (
          <button
            key={i}
            onClick={() => onKeywordClick?.(keyword)}
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

  return (
    <span className="typewriter">
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
