"use client";

import { useState, useEffect } from "react";

const HISTORY_KEY = "colorstory-search-history";
const MAX_ITEMS   = 10;

export function useSearchHistory(currentQuery: string) {
  const [history, setHistory]       = useState<string[]>([]);
  const [storageReady, setStorageReady] = useState(false);

  // Read localStorage once on mount
  useEffect(() => {
    try {
      const stored: string[] = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
      setHistory(stored);
    } catch {}
    setStorageReady(true);
  }, []);

  // Add current query to history once storage is loaded (deduped, most-recent-first)
  useEffect(() => {
    if (!storageReady || !currentQuery.trim()) return;
    setHistory(prev => {
      const deduped = prev.filter(q => q.toLowerCase() !== currentQuery.toLowerCase());
      const updated = [currentQuery, ...deduped].slice(0, MAX_ITEMS);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, [currentQuery, storageReady]);

  return history; // most-recent-first
}
