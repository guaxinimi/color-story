"use client";

import { useState, useEffect, useCallback } from "react";
import type { SavedPalette } from "@/types/palette";
import { PALETTE_STORAGE_KEY } from "@/types/palette";

export function useSavedPalettes() {
  const [palettes, setPalettes] = useState<SavedPalette[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PALETTE_STORAGE_KEY);
      if (raw) setPalettes(JSON.parse(raw) as SavedPalette[]);
    } catch {}
    setReady(true);
  }, []);

  const deletePalette = useCallback((id: string) => {
    setPalettes(prev => {
      const next = prev.filter(p => p.id !== id);
      localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { palettes, deletePalette, ready };
}
