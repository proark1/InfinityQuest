const API_KEY_STORAGE = 'infinity_quest_api_key';

type KeyListener = () => void;
const listeners = new Set<KeyListener>();

export function getApiKey(): string | null {
  try {
    const stored = localStorage.getItem(API_KEY_STORAGE);
    if (stored && stored.trim()) return stored.trim();
  } catch {
    // localStorage unavailable (private mode, etc.)
  }
  return null;
}

export function setApiKey(key: string): void {
  const trimmed = key.trim();
  if (!trimmed) return clearApiKey();
  try {
    localStorage.setItem(API_KEY_STORAGE, trimmed);
  } catch {
    // ignore
  }
  listeners.forEach(l => l());
}

export function clearApiKey(): void {
  try {
    localStorage.removeItem(API_KEY_STORAGE);
  } catch {
    // ignore
  }
  listeners.forEach(l => l());
}

export function hasApiKey(): boolean {
  return getApiKey() !== null;
}

export function onApiKeyChange(listener: KeyListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isStoredInLocalStorage(): boolean {
  try {
    return !!localStorage.getItem(API_KEY_STORAGE);
  } catch {
    return false;
  }
}

export function maskKey(key: string): string {
  if (key.length <= 8) return '•'.repeat(key.length);
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}
