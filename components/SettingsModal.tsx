import React, { useState } from 'react';
import { AppSettings, ImageSize, TextModel, Language, TypewriterSpeed } from '../types';
import { X, Settings, Globe, RefreshCcw, KeyRound, Type } from 'lucide-react';
import { clearApiKey, getApiKey, isStoredInLocalStorage, maskKey, setApiKey } from '../utils/apiKey';
import { useModal } from '../hooks/useModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSettingsChange: (newSettings: AppSettings) => void;
  onNewGame: () => void;
  typewriterSpeed: TypewriterSpeed;
  onTypewriterSpeedChange: (speed: TypewriterSpeed) => void;
}

const SPEED_OPTIONS: { value: TypewriterSpeed; label: string; desc: string }[] = [
  { value: 'instant', label: 'Instant', desc: 'No animation' },
  { value: 'fast', label: 'Fast', desc: '8ms / chunk' },
  { value: 'normal', label: 'Normal', desc: '15ms / chunk' },
  { value: 'slow', label: 'Slow', desc: '28ms / chunk' },
];

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSettingsChange, onNewGame, typewriterSpeed, onTypewriterSpeedChange }) => {
  const [editingKey, setEditingKey] = useState(false);
  const [draftKey, setDraftKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const dialogRef = useModal<HTMLDivElement>(isOpen, onClose);

  if (!isOpen) return null;

  const currentKey = getApiKey();
  const keyFromLocalStorage = isStoredInLocalStorage();

  const saveKey = () => {
    if (!draftKey.trim()) return;
    setApiKey(draftKey);
    setDraftKey('');
    setEditingKey(false);
  };

  const removeKey = () => {
    if (window.confirm('Remove the saved API key from this browser?')) {
      clearApiKey();
      setDraftKey('');
      setEditingKey(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div ref={dialogRef} tabIndex={-1} className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto outline-none">
        <div className="flex justify-between items-center mb-6">
          <h2 id="settings-title" className="text-xl font-bold text-amber-500 flex items-center gap-2">
            <Settings size={20} />
            Engine Settings
          </h2>
          <button onClick={onClose} aria-label="Close settings" className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          {/* API Key */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <KeyRound size={16} />
              Gemini API Key
            </label>

            {!editingKey ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 font-mono text-sm text-slate-300">
                  {currentKey ? maskKey(currentKey) : <span className="text-slate-500 italic">No key configured</span>}
                </div>
                <button
                  onClick={() => { setDraftKey(''); setEditingKey(true); }}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg"
                >
                  {currentKey ? 'Change' : 'Add'}
                </button>
                {keyFromLocalStorage && (
                  <button
                    onClick={removeKey}
                    className="px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-300 text-xs rounded-lg"
                  >
                    Remove
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={draftKey}
                    onChange={(e) => setDraftKey(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveKey(); }}
                    placeholder="AIza..."
                    aria-label="Gemini API key"
                    autoFocus
                    className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(s => !s)}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg"
                    aria-label={showKey ? 'Hide API key' : 'Show API key'}
                  >
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveKey}
                    disabled={!draftKey.trim()}
                    className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setEditingKey(false); setDraftKey(''); }}
                    className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Used for story, image, TTS, and live voice. Stored only in this browser.
                </p>
              </div>
            )}
          </div>

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
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
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

          {/* Typewriter Speed */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Type size={16} />
              Typewriter Speed
            </label>
            <div className="grid grid-cols-4 gap-2">
              {SPEED_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onTypewriterSpeedChange(opt.value)}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    typewriterSpeed === opt.value
                      ? 'border-amber-500 bg-amber-500/10 text-white'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                  }`}
                  aria-pressed={typewriterSpeed === opt.value}
                >
                  <div className="text-sm font-bold">{opt.label}</div>
                  <div className="text-[10px] opacity-70">{opt.desc}</div>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">Tip: press Space while the narrator types to skip to the end.</p>
          </div>

          {/* Auto Image Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-300">Auto-Generate Scene Images</span>
            <button
              onClick={() => onSettingsChange({ ...settings, autoGenerateImages: !settings.autoGenerateImages })}
              className={`w-12 h-6 rounded-full relative transition-colors ${
                settings.autoGenerateImages ? 'bg-amber-500' : 'bg-slate-700'
              }`}
              aria-label="Toggle auto-generate scene images"
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
