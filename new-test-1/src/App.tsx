import { useState, useCallback } from 'react';
import './App.css';
import { StickerPalette } from './components/StickerPalette';
import { Timeline } from './components/Timeline';
import { Controls } from './components/Controls';
import type { PlacedSticker, StickerType } from './types';
import { audioService } from './services/audioService';

function App() {
  const [stickers, setStickers] = useState<PlacedSticker[]>([]);
  const [selectedSticker, setSelectedSticker] = useState<StickerType | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [bars, setBars] = useState(2);
  const [currentStep, setCurrentStep] = useState(-1);

  const handleAddSticker = useCallback((sticker: PlacedSticker) => {
    setStickers((prev) => {
      // 同じ位置にあるシールは削除して新しいものを追加
      const filtered = prev.filter(
        (s) => !(s.row === sticker.row && s.col === sticker.col)
      );
      return [...filtered, sticker];
    });
  }, []);

  const handleRemoveSticker = useCallback((id: string) => {
    setStickers((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handlePlay = async () => {
    if (!audioService.isInitialized()) {
      await audioService.init();
    }
    setIsPlaying(true);
    audioService.playSequence(stickers, bars, bpm, (step) => {
      setCurrentStep(step);
    });
  };

  const handleStop = () => {
    audioService.stop();
    setIsPlaying(false);
    setCurrentStep(-1);
  };

  const handleBpmChange = (newBpm: number) => {
    setBpm(newBpm);
    if (isPlaying) {
      audioService.setBPM(newBpm);
    }
  };

  const handleBarsChange = (newBars: number) => {
    setBars(newBars);
    // 小節数を減らした場合、範囲外のシールを削除
    const maxCol = newBars * 8;
    setStickers((prev) => prev.filter((s) => s.col < maxCol));
    if (isPlaying) {
      handleStop();
    }
  };

  const handleClear = () => {
    setStickers([]);
    if (isPlaying) {
      handleStop();
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎵 シール帳で作曲しよう! 🎵</h1>
      </header>

      <main className="app-main">
        <StickerPalette
          onStickerSelect={setSelectedSticker}
          selectedSticker={selectedSticker}
        />

        <Controls
          isPlaying={isPlaying}
          bpm={bpm}
          bars={bars}
          onPlay={handlePlay}
          onStop={handleStop}
          onBpmChange={handleBpmChange}
          onBarsChange={handleBarsChange}
          onClear={handleClear}
        />

        <Timeline
          stickers={stickers}
          onAddSticker={handleAddSticker}
          onRemoveSticker={handleRemoveSticker}
          selectedSticker={selectedSticker}
          bars={bars}
          currentStep={currentStep}
        />
      </main>

      <footer className="app-footer">
        <p>シールをドラッグしてタイムラインに貼ろう! タップでも配置できるよ</p>
      </footer>
    </div>
  );
}

export default App;
