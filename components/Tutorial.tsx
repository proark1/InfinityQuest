import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ArrowRight, X, Sparkles } from 'lucide-react';

interface TutorialStep {
  id: string;
  /** CSS selector of the element to highlight. If missing, the step renders centered. */
  target?: string;
  title: string;
  body: string;
  /** Prefer bubble above (false) or below (true) the target. */
  below?: boolean;
}

const STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome, hero.',
    body: 'The world listens. Take a few seconds to learn the controls — you can skip any time.',
  },
  {
    id: 'chips',
    target: '[data-tutorial="chips"]',
    title: 'Suggested actions',
    body: 'Every turn, the narrator offers a few paths. Tap a chip to follow one, or press 1 / 2 / 3.',
  },
  {
    id: 'input',
    target: '[data-tutorial="input"]',
    title: 'Speak freely',
    body: 'Or type any action you want. Realistic attempts beat impossible ones — the world pushes back.',
    below: true,
  },
  {
    id: 'sidebar',
    target: '[data-tutorial="sidebar-toggle"]',
    title: 'Inventory & status',
    body: 'Open the sidebar (or press I) for stats, inventory, abilities, codex, and factions. Tap items to inspect them.',
    below: true,
  },
  {
    id: 'camp',
    target: '[data-tutorial="camp"]',
    title: 'Rest & recover',
    body: 'When things get dangerous, Make Camp to restore HP and mana — but a food and drink is required.',
  },
  {
    id: 'done',
    title: 'Good luck out there.',
    body: 'Press Space to skip the typewriter. Your progress auto-saves — close the tab and come back any time.',
  },
];

interface Props {
  open: boolean;
  onComplete: () => void;
}

const Tutorial: React.FC<Props> = ({ open, onComplete }) => {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Reset to step 0 every time the tutorial opens.
  useEffect(() => { if (open) setIndex(0); }, [open]);

  const step = STEPS[index];

  useLayoutEffect(() => {
    if (!open) return;
    if (!step?.target) { setRect(null); return; }
    let cancelled = false;
    const reposition = () => {
      if (cancelled) return;
      const el = document.querySelector(step.target!);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    reposition();
    const obs = new MutationObserver(reposition);
    obs.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    const raf = window.setInterval(reposition, 400);
    return () => {
      cancelled = true;
      obs.disconnect();
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      window.clearInterval(raf);
    };
  }, [open, index, step?.target]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onComplete(); }
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (index < STEPS.length - 1) setIndex(i => i + 1);
        else onComplete();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, index, onComplete]);

  if (!open) return null;

  // Bubble placement. If no target, center.
  const bubble = (() => {
    if (!rect) {
      return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' as const };
    }
    const PAD = 12;
    const w = 320;
    const below = step.below === true;
    const top = below ? rect.bottom + PAD : rect.top - PAD;
    const left = Math.max(12, Math.min(window.innerWidth - w - 12, rect.left + rect.width / 2 - w / 2));
    return {
      left,
      top,
      transform: below ? 'translateY(0)' : 'translateY(-100%)',
      width: w,
    } as const;
  })();

  return (
    <div className="fixed inset-0 z-[120] pointer-events-none">
      {/* Dim layer, pointer-events enabled so misclicks don't fire underlying buttons */}
      <div
        role="presentation"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px] pointer-events-auto"
        onClick={onComplete}
      />

      {/* Highlight rectangle around the target */}
      {rect && (
        <div
          aria-hidden="true"
          className="absolute border-2 border-amber-400 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55),0_0_22px_rgba(245,158,11,0.7)] transition-all duration-200"
          style={{
            left: rect.left - 6,
            top: rect.top - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
        />
      )}

      {/* Bubble */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
        className="absolute pointer-events-auto bg-slate-900 border border-amber-500/50 rounded-2xl p-5 shadow-2xl text-slate-100"
        style={bubble}
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Sparkles size={16} aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 id="tutorial-title" className="font-bold text-amber-400 text-base fantasy-font tracking-wider">{step.title}</h3>
              <button
                onClick={onComplete}
                aria-label="Skip tutorial"
                className="text-slate-500 hover:text-white p-1 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-slate-300 mt-1 leading-relaxed">{step.body}</p>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex gap-1">
                {STEPS.map((_, i) => (
                  <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === index ? 'bg-amber-400 scale-125' : 'bg-slate-700'}`} />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onComplete}
                  className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1"
                >
                  Skip
                </button>
                <button
                  onClick={() => index < STEPS.length - 1 ? setIndex(i => i + 1) : onComplete()}
                  className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold rounded-lg px-3 py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
                >
                  {index < STEPS.length - 1 ? (<>Next <ArrowRight size={14} /></>) : 'Start Quest'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tutorial;
