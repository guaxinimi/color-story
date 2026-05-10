export interface SavedPalette {
  id: string;
  topic: string;
  imageUrl: string;   // source image URL stored as thumbnail reference
  colors: string[];   // 6 uppercase hex strings e.g. "#C4846A"
  savedAt: string;    // ISO 8601
}

export const PALETTE_STORAGE_KEY = "colorstory-palettes";
