import { useState, useEffect, useRef } from 'react';
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
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SearchHistoryEntry =>
        typeof item === 'object' && item !== null && typeof item.query === 'string',
    );
  } catch {
    return [];
  }
}

function saveToStorage(entries: SearchHistoryEntry[]): void {
  try {
    if (entries.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    }
  } catch {
    // クォータ超過など — React ステートの更新は継続する
  }
}

export function useSearchHistory(): UseSearchHistoryReturn {
  const [history, setHistory] = useState<SearchHistoryEntry[]>(loadFromStorage);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    saveToStorage(history);
  }, [history]);

  const addToHistory = (query: string) => {
    const trimmed = query.trim();
    if (trimmed === '') return;
    setHistory((prev) => {
      const filtered = prev.filter((e) => e.query !== trimmed);
      return [{ query: trimmed }, ...filtered].slice(0, MAX_HISTORY_SIZE);
    });
  };

  const removeFromHistory = (query: string) => {
    setHistory((prev) => prev.filter((e) => e.query !== query));
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return { history, addToHistory, removeFromHistory, clearHistory };
}
