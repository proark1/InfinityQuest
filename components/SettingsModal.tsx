import React from 'react';
import { AppSettings, ImageSize, TextModel, Language } from '../types';
import { X, Settings, Globe, RefreshCcw } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSettingsChange: (newSettings: AppSettings) => void;
  onNewGame: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSettingsChange, onNewGame }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-amber-500 flex items-center gap-2">
            <Settings size={20} />
            Engine Settings
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Text Model Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">Story Engine Model</label>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => onSettingsChange({ ...settings, textModel: TextModel.Pro })}
                className={`p-3 rounded-lg border text-left transition-all ${
                  settings.textModel === TextModel.Pro
                    ? 'border-amber-500 bg-amber-500/10 text-white'
                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="font-bold">Gemini 3.0 Pro Preview</div>
                <div className="text-xs opacity-70">Best for complex reasoning, inventory tracking, and deep storytelling.</div>
              </button>
              <button
                onClick={() => onSettingsChange({ ...settings, textModel: TextModel.FlashLite })}
                className={`p-3 rounded-lg border text-left transition-all ${
                  settings.textModel === TextModel.FlashLite
                    ? 'border-amber-500 bg-amber-500/10 text-white'
                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="font-bold flex items-center gap-2">
                   Gemini 2.5 Flash Lite <span className="bg-blue-500/20 text-blue-300 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold">Fast</span>
                </div>
                <div className="text-xs opacity-70">Lightning fast responses. Good for speed runs.</div>
              </button>
            </div>
          </div>

          {/* Language Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300 flex items-center gap-2">
              <Globe size={16} />
              Language / Sprache
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onSettingsChange({ ...settings, language: Language.English })}
                className={`p-2 rounded-lg border text-center transition-all ${
                  settings.language === Language.English
                    ? 'border-amber-500 bg-amber-500/10 text-white'
                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                }`}
              >
                English
              </button>
              <button
                onClick={() => onSettingsChange({ ...settings, language: Language.German })}
                className={`p-2 rounded-lg border text-center transition-all ${
                  settings.language === Language.German
                    ? 'border-amber-500 bg-amber-500/10 text-white'
                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                }`}
              >
                Deutsch
              </button>
            </div>
          </div>

          {/* Image Size Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">Image Generation Size</label>
            <select
              value={settings.imageSize}
              onChange={(e) => onSettingsChange({ ...settings, imageSize: e.target.value as ImageSize })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value={ImageSize.Size_1K}>1K (Standard)</option>
              <option value={ImageSize.Size_2K}>2K (High Res)</option>
              <option value={ImageSize.Size_4K}>4K (Ultra Res)</option>
            </select>
          </div>

          {/* Auto Image Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-300">Auto-Generate Scene Images</span>
            <button
              onClick={() => onSettingsChange({ ...settings, autoGenerateImages: !settings.autoGenerateImages })}
              className={`w-12 h-6 rounded-full relative transition-colors ${
                settings.autoGenerateImages ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                settings.autoGenerateImages ? 'left-7' : 'left-1'
              }`} />
            </button>
          </div>

        </div>

        <div className="mt-8 pt-6 border-t border-slate-700 space-y-3">
           
           <button 
             onClick={() => {
               if (window.confirm('Are you sure you want to restart? All progress will be lost.')) {
                 onNewGame();
                 onClose();
               }
             }}
             className="w-full py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 hover:text-red-300 border border-red-900/30 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
           >
             <RefreshCcw size={16} />
             {settings.language === Language.German ? 'Abenteuer neu starten' : 'Restart Adventure'}
           </button>

           <button 
             onClick={onClose}
             className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
           >
             Close
           </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;