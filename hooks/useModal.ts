import { useEffect, useRef } from 'react';

// Shared behavior for every dialog: Escape closes, focus moves inside when the
// modal opens, and scroll is locked on the body while the modal is visible.
export function useModal<T extends HTMLElement>(isOpen: boolean, onClose: () => void) {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handler);

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const root = containerRef.current;
    if (root) {
      const focusables = root.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      (focusables[0] ?? root).focus({ preventScroll: true });
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = originalOverflow;
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [isOpen, onClose]);

  return containerRef;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
