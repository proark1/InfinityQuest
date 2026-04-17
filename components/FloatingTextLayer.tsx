
import React from 'react';
import { FloatingText } from '../types';

interface FloatingTextLayerProps {
  items: FloatingText[];
}

const FloatingTextLayer: React.FC<FloatingTextLayerProps> = ({ items }) => {
  const getColor = (type: string) => {
    switch (type) {
      case 'damage': return 'text-red-500 font-bold text-3xl text-shadow-red';
      case 'heal': return 'text-green-400 font-bold text-2xl text-shadow-green';
      case 'gold': return 'text-amber-400 font-bold text-xl text-shadow-gold';
      case 'xp': return 'text-blue-400 font-bold text-xl text-shadow-blue';
      default: return 'text-white font-bold';
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
      {items.map((item) => (
        <div
          key={item.id}
          className={`absolute animate-float-up ${getColor(item.type)}`}
          style={{ 
            left: `${item.x}%`, 
            top: `${item.y}%`,
            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
          }}
        >
          {item.text}
        </div>
      ))}
      <style>{`
        .text-shadow-red { text-shadow: 0 0 10px rgba(220, 38, 38, 0.5); }
        .text-shadow-green { text-shadow: 0 0 10px rgba(34, 197, 94, 0.5); }
        .text-shadow-gold { text-shadow: 0 0 10px rgba(251, 191, 36, 0.5); }
        .text-shadow-blue { text-shadow: 0 0 10px rgba(96, 165, 250, 0.5); }
      `}</style>
    </div>
  );
};

export default React.memo(FloatingTextLayer);
