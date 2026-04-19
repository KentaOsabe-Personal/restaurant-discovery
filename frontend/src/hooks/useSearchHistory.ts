import { useState, useEffect, useRef } from 'react';
import type { SearchHistoryEntry, SearchMode } from '../types/search';

const STORAGE_KEYS: Record<SearchMode, string> = {
  izakaya: 'restaurant_search_history',
  ramen: 'ramen_search_history',
};
const MAX_HISTORY_SIZE = 10;

interface UseSearchHistoryReturn {
  history: readonly SearchHistoryEntry[];
  addToHistory: (query: string) => void;
  removeFromHistory: (query: string) => void;
  clearHistory: () => void;
}

function loadFromStorage(key: string): SearchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(key);
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

function saveToStorage(entries: SearchHistoryEntry[], key: string): void {
  try {
    if (entries.length === 0) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(entries));
    }
  } catch {
    // クォータ超過など — React ステートの更新は継続する
  }
}

export function useSearchHistory(mode: SearchMode = 'izakaya'): UseSearchHistoryReturn {
  const [history, setHistory] = useState<SearchHistoryEntry[]>(() =>
    loadFromStorage(STORAGE_KEYS[mode]),
  );
  const isInitialMount = useRef(true);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // mode 変更時に対応する localStorage から履歴を再読み込みする
  useEffect(() => {
    setHistory(loadFromStorage(STORAGE_KEYS[mode]));
  }, [mode]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    saveToStorage(history, STORAGE_KEYS[modeRef.current]);
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
