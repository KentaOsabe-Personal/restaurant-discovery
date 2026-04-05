import { useState } from 'react';
import type { SearchHistoryEntry } from '../types/search';

const STORAGE_KEY = 'restaurant_search_history';
const MAX_HISTORY_SIZE = 10;

interface UseSearchHistoryReturn {
  history: readonly SearchHistoryEntry[];
  addToHistory: (query: string) => void;
  removeFromHistory: (query: string) => void;
  clearHistory: () => void;
}

function loadFromStorage(): SearchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SearchHistoryEntry[];
  } catch {
    return [];
  }
}

function saveToStorage(entries: SearchHistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // クォータ超過など — React ステートの更新は継続する
  }
}

export function useSearchHistory(): UseSearchHistoryReturn {
  const [history, setHistory] = useState<SearchHistoryEntry[]>(loadFromStorage);

  const addToHistory = (query: string) => {
    if (query.trim() === '') return;

    setHistory((prev) => {
      const filtered = prev.filter((e) => e.query !== query);
      const next = [{ query }, ...filtered].slice(0, MAX_HISTORY_SIZE);
      saveToStorage(next);
      return next;
    });
  };

  const removeFromHistory = (query: string) => {
    setHistory((prev) => {
      const next = prev.filter((e) => e.query !== query);
      saveToStorage(next);
      return next;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // 握りつぶし
    }
  };

  return { history, addToHistory, removeFromHistory, clearHistory };
}
