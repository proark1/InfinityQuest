
import React, { useEffect, useState } from 'react';
import { Medal } from 'lucide-react';
import { Achievement } from '../types';

interface AchievementToastProps {
  achievement: Achievement | null;
  onClose: () => void;
}

const AchievementToast: React.FC<AchievementToastProps> = ({ achievement, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (achievement) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 500); // Wait for animation to finish
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [achievement, onClose]);

  if (!achievement) return null;

  return (
    <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 transform ${visible ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0 pointer-events-none'}`}>
       <div className="bg-slate-900/90 backdrop-blur border border-yellow-500/50 rounded-xl p-4 shadow-[0_0_30px_rgba(234,179,8,0.3)] flex items-center gap-4 min-w-[300px]">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-slate-900 shadow-lg animate-[bounce_1s_infinite]">
             <Medal size={24} />
          </div>
          <div>
             <div className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest mb-0.5">Achievement Unlocked</div>
             <div className="font-bold text-white text-lg leading-none mb-1">{achievement.title}</div>
             <div className="text-xs text-slate-300">{achievement.description}</div>
          </div>
       </div>
    </div>
  );
};

export default AchievementToast;
