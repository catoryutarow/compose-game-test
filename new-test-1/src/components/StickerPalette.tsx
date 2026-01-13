import React from 'react';
import { Sticker } from './Sticker';
import { STICKER_DEFS } from '../types';
import type { StickerType } from '../types';
import { audioService } from '../services/audioService';

interface StickerPaletteProps {
  onStickerSelect: (type: StickerType) => void;
  selectedSticker: StickerType | null;
}

export const StickerPalette: React.FC<StickerPaletteProps> = ({
  onStickerSelect,
  selectedSticker,
}) => {
  const handleDragStart = (e: React.DragEvent, type: StickerType) => {
    e.dataTransfer.setData('stickerType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleTouchStart = (type: StickerType) => {
    onStickerSelect(type);
  };

  const handleClick = async (type: StickerType) => {
    onStickerSelect(type);
    // プレビュー再生
    if (!audioService.isInitialized()) {
      await audioService.init();
    }
    audioService.playSticker(type);
  };

  return (
    <div className="sticker-palette">
      <h2 className="palette-title">シールを選んで貼ろう!</h2>
      <div className="sticker-grid">
        {STICKER_DEFS.map((sticker) => (
          <Sticker
            key={sticker.id}
            sticker={sticker}
            size="large"
            draggable
            onClick={() => handleClick(sticker.id)}
            onDragStart={(e) => handleDragStart(e, sticker.id)}
            onTouchStart={() => handleTouchStart(sticker.id)}
            className={selectedSticker === sticker.id ? 'selected' : ''}
          />
        ))}
      </div>
    </div>
  );
};
