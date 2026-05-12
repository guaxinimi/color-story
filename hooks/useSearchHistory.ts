"use client";

import { useState, useEffect } from "react";

const MAX_ITEMS = 10;

// Module-level store — survives client-side navigation but clears on full reload
let memoryHistory: string[] = [];
const listeners = new Set<(h: string[]) => void>();

function notify() {
  listeners.forEach(fn => fn([...memoryHistory]));
}

export function clearSearchHistory() {
  memoryHistory = [];
  notify();
}

export function useSearchHistory(currentQuery: string) {
  const [history, setHistory] = useState<string[]>([...memoryHistory]);

  useEffect(() => {
    listeners.add(setHistory);
    return () => { listeners.delete(setHistory); };
  }, []);

  useEffect(() => {
    if (!currentQuery.trim()) return;
    const deduped = memoryHistory.filter(q => q.toLowerCase() !== currentQuery.toLowerCase());
    memoryHistory = [currentQuery, ...deduped].slice(0, MAX_ITEMS);
    notify();
  }, [currentQuery]);

  return history; // most-recent-first
}
