import React, { useCallback } from 'react';
import { STICKER_DEFS } from '../types';
import type { PlacedSticker, StickerType } from '../types';
import { audioService } from '../services/audioService';

interface TimelineProps {
  stickers: PlacedSticker[];
  onAddSticker: (sticker: PlacedSticker) => void;
  onRemoveSticker: (id: string) => void;
  selectedSticker: StickerType | null;
  bars: number;
  currentStep: number;
}

export const Timeline: React.FC<TimelineProps> = ({
  stickers,
  onAddSticker,
  onRemoveSticker,
  selectedSticker,
  bars,
  currentStep,
}) => {
  const rows = 8; // 8行（音程/楽器）
  const cols = bars * 8; // 1小節8ビート

  const handleDrop = useCallback((e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('stickerType') as StickerType;
    if (type) {
      const newSticker: PlacedSticker = {
        id: `${type}-${row}-${col}-${Date.now()}`,
        type,
        row,
        col,
      };
      onAddSticker(newSticker);

      // サウンドプレビュー
      if (audioService.isInitialized()) {
        audioService.playSticker(type, row);
      }
    }
  }, [onAddSticker]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleCellClick = async (row: number, col: number) => {
    // 既にシールがあれば削除
    const existingSticker = stickers.find(s => s.row === row && s.col === col);
    if (existingSticker) {
      onRemoveSticker(existingSticker.id);
      return;
    }

    // 選択中のシールがあれば配置
    if (selectedSticker) {
      if (!audioService.isInitialized()) {
        await audioService.init();
      }

      const newSticker: PlacedSticker = {
        id: `${selectedSticker}-${row}-${col}-${Date.now()}`,
        type: selectedSticker,
        row,
        col,
      };
      onAddSticker(newSticker);
      audioService.playSticker(selectedSticker, row);
    }
  };

  const getStickerAt = (row: number, col: number) => {
    return stickers.find(s => s.row === row && s.col === col);
  };

  const getStickerDef = (type: StickerType) => {
    return STICKER_DEFS.find(s => s.id === type);
  };

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        {Array.from({ length: bars }).map((_, barIndex) => (
          <div key={barIndex} className="bar-marker">
            {barIndex + 1}小節
          </div>
        ))}
      </div>
      <div className="timeline-grid">
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="timeline-row">
            <div className="row-label">
              {['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド↑'][row]}
            </div>
            {Array.from({ length: cols }).map((_, col) => {
              const sticker = getStickerAt(row, col);
              const stickerDef = sticker ? getStickerDef(sticker.type) : null;
              const isCurrentStep = col === currentStep;

              return (
                <div
                  key={col}
                  className={`timeline-cell ${col % 8 === 0 ? 'bar-start' : ''} ${isCurrentStep ? 'active-step' : ''}`}
                  onDrop={(e) => handleDrop(e, row, col)}
                  onDragOver={handleDragOver}
                  onClick={() => handleCellClick(row, col)}
                >
                  {stickerDef && (
                    <div
                      className="placed-sticker"
                      style={{ backgroundColor: stickerDef.color }}
                    >
                      {stickerDef.emoji}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
