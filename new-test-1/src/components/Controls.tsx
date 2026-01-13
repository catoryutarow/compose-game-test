import React from 'react';

interface ControlsProps {
  isPlaying: boolean;
  bpm: number;
  bars: number;
  onPlay: () => void;
  onStop: () => void;
  onBpmChange: (bpm: number) => void;
  onBarsChange: (bars: number) => void;
  onClear: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  isPlaying,
  bpm,
  bars,
  onPlay,
  onStop,
  onBpmChange,
  onBarsChange,
  onClear,
}) => {
  return (
    <div className="controls">
      <div className="control-group">
        <button
          className={`play-btn ${isPlaying ? 'playing' : ''}`}
          onClick={isPlaying ? onStop : onPlay}
        >
          {isPlaying ? '⏹ 停止' : '▶ 再生'}
        </button>
      </div>

      <div className="control-group">
        <label>
          テンポ: {bpm} BPM
          <input
            type="range"
            min="60"
            max="180"
            value={bpm}
            onChange={(e) => onBpmChange(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="control-group">
        <label>
          小節数:
          <select
            value={bars}
            onChange={(e) => onBarsChange(Number(e.target.value))}
          >
            <option value={1}>1小節</option>
            <option value={2}>2小節</option>
            <option value={4}>4小節</option>
            <option value={8}>8小節</option>
          </select>
        </label>
      </div>

      <div className="control-group">
        <button className="clear-btn" onClick={onClear}>
          🗑 全消去
        </button>
      </div>
    </div>
  );
};
