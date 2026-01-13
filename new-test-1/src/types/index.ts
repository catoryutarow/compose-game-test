// シールの種類
export type StickerType = 'kick' | 'snare' | 'hihat' | 'clap' | 'bass' | 'synth' | 'piano' | 'bell';

// シールの定義
export interface StickerDef {
  id: StickerType;
  name: string;
  emoji: string;
  color: string;
  note?: string; // 音階がある場合
}

// タイムライン上に配置されたシール
export interface PlacedSticker {
  id: string;
  type: StickerType;
  row: number;   // 音程や楽器の行
  col: number;   // 時間位置（ビート）
}

// プロジェクト状態
export interface ProjectState {
  stickers: PlacedSticker[];
  bpm: number;
  bars: number;  // 小節数
}

// シールの定義一覧
export const STICKER_DEFS: StickerDef[] = [
  { id: 'kick', name: 'キック', emoji: '🥁', color: '#FF6B6B' },
  { id: 'snare', name: 'スネア', emoji: '🪘', color: '#4ECDC4' },
  { id: 'hihat', name: 'ハイハット', emoji: '🔔', color: '#45B7D1' },
  { id: 'clap', name: 'クラップ', emoji: '👏', color: '#96CEB4' },
  { id: 'bass', name: 'ベース', emoji: '🎸', color: '#9B59B6' },
  { id: 'synth', name: 'シンセ', emoji: '🎹', color: '#F39C12' },
  { id: 'piano', name: 'ピアノ', emoji: '🎵', color: '#E74C3C' },
  { id: 'bell', name: 'ベル', emoji: '✨', color: '#1ABC9C' },
];
