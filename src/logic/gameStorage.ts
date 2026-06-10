// localStorage-Adapter mit try/catch-Absicherung (Masterprompt 3.1).

import type { SaveStorage } from './save';

const memory = new Map<string, string>();

// Fällt auf In-Memory zurück, wenn localStorage gesperrt ist (z. B. Privatmodus)
export const storage: SaveStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      memory.set(key, value);
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      memory.delete(key);
    }
  },
};
