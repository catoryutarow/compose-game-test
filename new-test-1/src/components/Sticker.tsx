import React from 'react';
import type { StickerDef } from '../types';

interface StickerProps {
  sticker: StickerDef;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  draggable?: boolean;
  className?: string;
}

export const Sticker: React.FC<StickerProps> = ({
  sticker,
  size = 'medium',
  onClick,
  onDragStart,
  onTouchStart,
  draggable = false,
  className = '',
}) => {
  const sizeClasses = {
    small: 'sticker-small',
    medium: 'sticker-medium',
    large: 'sticker-large',
  };

  return (
    <div
      className={`sticker ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: sticker.color,
        cursor: draggable ? 'grab' : 'pointer',
      }}
      onClick={onClick}
      onDragStart={onDragStart}
      onTouchStart={onTouchStart}
      draggable={draggable}
      data-sticker-type={sticker.id}
    >
      <span className="sticker-emoji">{sticker.emoji}</span>
      {size !== 'small' && (
        <span className="sticker-name">{sticker.name}</span>
      )}
    </div>
  );
};
