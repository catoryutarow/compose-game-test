import * as Tone from 'tone';
import type { StickerType, PlacedSticker } from '../types';

class AudioService {
  private synths: Map<StickerType, Tone.Synth | Tone.MembraneSynth | Tone.MetalSynth | Tone.NoiseSynth> = new Map();
  private initialized = false;
  private sequence: Tone.Sequence | null = null;

  async init() {
    if (this.initialized) return;

    await Tone.start();

    // キック（低音ドラム）
    this.synths.set('kick', new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 8,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 1.4 }
    }).toDestination());

    // スネア
    const snare = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 }
    }).toDestination();
    this.synths.set('snare', snare);

    // ハイハット
    this.synths.set('hihat', new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.1, release: 0.1 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5
    }).toDestination());

    // クラップ（ノイズベース）
    const clap = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 }
    }).toDestination();
    this.synths.set('clap', clap);

    // ベース
    this.synths.set('bass', new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.8 }
    }).toDestination());

    // シンセ
    this.synths.set('synth', new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.5 }
    }).toDestination());

    // ピアノ風
    this.synths.set('piano', new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.5, sustain: 0.3, release: 1 }
    }).toDestination());

    // ベル
    this.synths.set('bell', new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.8, release: 0.5 },
      harmonicity: 12,
      modulationIndex: 20,
      resonance: 800,
      octaves: 2
    }).toDestination());

    this.initialized = true;
  }

  // シール種類ごとの音程マッピング
  private getNoteForSticker(type: StickerType, row: number): string {
    const notes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
    const noteIndex = Math.max(0, Math.min(row, notes.length - 1));

    switch (type) {
      case 'kick':
        return 'C1';
      case 'snare':
      case 'clap':
        return 'C2'; // ノイズベースなので固定
      case 'hihat':
        return 'C6';
      case 'bass':
        return ['C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2', 'C3'][noteIndex];
      default:
        return notes[noteIndex];
    }
  }

  playSticker(type: StickerType, row: number = 0) {
    const synth = this.synths.get(type);
    if (!synth) return;

    const note = this.getNoteForSticker(type, row);

    if (synth instanceof Tone.NoiseSynth) {
      synth.triggerAttackRelease('8n');
    } else if (synth instanceof Tone.MembraneSynth || synth instanceof Tone.MetalSynth) {
      synth.triggerAttackRelease(note, '8n');
    } else {
      synth.triggerAttackRelease(note, '8n');
    }
  }

  setBPM(bpm: number) {
    Tone.getTransport().bpm.value = bpm;
  }

  playSequence(stickers: PlacedSticker[], bars: number, bpm: number, onStep?: (step: number) => void) {
    this.stop();
    this.setBPM(bpm);

    const totalSteps = bars * 8; // 1小節8ビート
    const steps = Array.from({ length: totalSteps }, (_, i) => i);

    this.sequence = new Tone.Sequence(
      (time, step) => {
        // このステップに配置されているシールを再生
        const stickersAtStep = stickers.filter(s => s.col === step);
        stickersAtStep.forEach(sticker => {
          const note = this.getNoteForSticker(sticker.type, sticker.row);
          const synth = this.synths.get(sticker.type);

          if (synth) {
            if (synth instanceof Tone.NoiseSynth) {
              synth.triggerAttackRelease('8n', time);
            } else if (synth instanceof Tone.MembraneSynth || synth instanceof Tone.MetalSynth) {
              synth.triggerAttackRelease(note, '8n', time);
            } else {
              synth.triggerAttackRelease(note, '8n', time);
            }
          }
        });

        // UIコールバック
        if (onStep) {
          Tone.getDraw().schedule(() => {
            onStep(step);
          }, time);
        }
      },
      steps,
      '8n'
    );

    this.sequence.loop = true;
    this.sequence.start(0);
    Tone.getTransport().start();
  }

  stop() {
    if (this.sequence) {
      this.sequence.stop();
      this.sequence.dispose();
      this.sequence = null;
    }
    Tone.getTransport().stop();
  }

  isInitialized() {
    return this.initialized;
  }
}

export const audioService = new AudioService();
