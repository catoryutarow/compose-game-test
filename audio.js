// Web Audio API を使った音楽システム
class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.sounds = {};
        this.activeSounds = {};
        this.isPlaying = false;
        this.tempo = 120;
        this.currentBeat = 0;
        this.beatInterval = null;
        this.beatsPerMeasure = 4;

        this.initAudioContext();
        this.createSounds();
    }

    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = 0.7;

            // 画面復帰時にAudioContextを再開
            this.setupVisibilityHandler();
        } catch (e) {
            console.error('Web Audio API is not supported:', e);
        }
    }

    setupVisibilityHandler() {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.resumeContext();
                // 再生中だった場合、再開
                if (this.isPlaying) {
                    this.resumeContext();
                }
            }
        });

        // iOSのためのページ表示イベント
        window.addEventListener('pageshow', () => {
            this.resumeContext();
        });
    }

    resumeContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // 各サウンドパターンの定義
    createSounds() {
        // ビート系
        this.sounds.kick = {
            type: 'beat',
            pattern: [1, 0, 0, 0, 1, 0, 0, 0],
            create: (time) => this.createKick(time)
        };

        this.sounds.snare = {
            type: 'beat',
            pattern: [0, 0, 1, 0, 0, 0, 1, 0],
            create: (time) => this.createSnare(time)
        };

        this.sounds.hihat = {
            type: 'beat',
            pattern: [1, 1, 1, 1, 1, 1, 1, 1],
            create: (time) => this.createHihat(time)
        };

        // メロディ系
        this.sounds.synth1 = {
            type: 'melody',
            pattern: [1, 0, 0, 1, 0, 0, 1, 0],
            notes: ['C4', 'E4', 'G4', 'C5'],
            create: (time, note) => this.createSynth(time, note, 'sine')
        };

        this.sounds.synth2 = {
            type: 'melody',
            pattern: [0, 1, 0, 0, 1, 0, 0, 1],
            notes: ['E4', 'G4', 'B4', 'E5'],
            create: (time, note) => this.createSynth(time, note, 'triangle')
        };

        this.sounds.piano = {
            type: 'melody',
            pattern: [1, 0, 1, 0, 1, 0, 1, 0],
            notes: ['C4', 'E4', 'G4', 'B4'],
            create: (time, note) => this.createPiano(time, note)
        };

        // ベース系
        this.sounds.bass1 = {
            type: 'bass',
            pattern: [1, 0, 0, 1, 0, 0, 1, 0],
            notes: ['C2', 'C2', 'G2', 'G2'],
            create: (time, note) => this.createBass(time, note, 'sawtooth')
        };

        this.sounds.bass2 = {
            type: 'bass',
            pattern: [1, 0, 1, 0, 1, 0, 1, 0],
            notes: ['C2', 'E2', 'G2', 'B2'],
            create: (time, note) => this.createBass(time, note, 'square')
        };

        // エフェクト系
        this.sounds.fx1 = {
            type: 'fx',
            pattern: [1, 0, 0, 0, 0, 0, 0, 0],
            create: (time) => this.createSparkle(time)
        };

        this.sounds.fx2 = {
            type: 'fx',
            pattern: [0, 0, 0, 0, 1, 0, 0, 0],
            create: (time) => this.createSweep(time)
        };

        this.sounds.vocal = {
            type: 'fx',
            pattern: [1, 0, 0, 0, 1, 0, 0, 0],
            create: (time) => this.createVocal(time)
        };
    }

    // ノート名を周波数に変換
    noteToFreq(note) {
        const notes = {
            'C2': 65.41, 'D2': 73.42, 'E2': 82.41, 'F2': 87.31, 'G2': 98.00, 'A2': 110.00, 'B2': 123.47,
            'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
            'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
            'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77
        };
        return notes[note] || 440;
    }

    // キックドラム
    createKick(time) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);

        gain.gain.setValueAtTime(1, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

        osc.start(time);
        osc.stop(time + 0.5);
    }

    // スネアドラム
    createSnare(time) {
        // ノイズ部分
        const bufferSize = this.audioContext.sampleRate * 0.2;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 1000;

        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.setValueAtTime(0.5, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        noise.start(time);

        // トーン部分
        const osc = this.audioContext.createOscillator();
        const oscGain = this.audioContext.createGain();

        osc.type = 'triangle';
        osc.frequency.value = 180;

        oscGain.gain.setValueAtTime(0.7, time);
        oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

        osc.connect(oscGain);
        oscGain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 0.2);
    }

    // ハイハット
    createHihat(time) {
        const bufferSize = this.audioContext.sampleRate * 0.05;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 7000;

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start(time);
    }

    // シンセサイザー
    createSynth(time, note, waveType) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        osc.type = waveType;
        osc.frequency.value = this.noteToFreq(note);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, time);
        filter.frequency.exponentialRampToValueAtTime(500, time + 0.3);

        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 0.4);
    }

    // ピアノ風サウンド
    createPiano(time, note) {
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        const freq = this.noteToFreq(note);
        osc1.type = 'triangle';
        osc1.frequency.value = freq;

        osc2.type = 'sine';
        osc2.frequency.value = freq * 2;

        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.8);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.masterGain);

        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + 0.8);
        osc2.stop(time + 0.8);
    }

    // ベース
    createBass(time, note, waveType) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        osc.type = waveType;
        osc.frequency.value = this.noteToFreq(note);

        filter.type = 'lowpass';
        filter.frequency.value = 400;

        gain.gain.setValueAtTime(0.5, time);
        gain.gain.exponentialRampToValueAtTime(0.1, time + 0.3);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 0.4);
    }

    // キラキラエフェクト
    createSparkle(time) {
        const frequencies = [1200, 1800, 2400, 3000];

        frequencies.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            const startTime = time + i * 0.05;
            gain.gain.setValueAtTime(0.15, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(startTime);
            osc.stop(startTime + 0.3);
        });
    }

    // スイープエフェクト
    createSweep(time) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, time);
        osc.frequency.exponentialRampToValueAtTime(2000, time + 0.5);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, time);
        filter.frequency.exponentialRampToValueAtTime(4000, time + 0.5);

        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.6);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 0.6);
    }

    // ボイス風エフェクト
    createVocal(time) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.value = 220;

        // フォルマントフィルター風
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, time);
        filter.frequency.setValueAtTime(1200, time + 0.1);
        filter.frequency.setValueAtTime(800, time + 0.2);
        filter.Q.value = 5;

        gain.gain.setValueAtTime(0.3, time);
        gain.gain.setValueAtTime(0.4, time + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 0.4);
    }

    // サウンドをスロットに追加
    addSoundToSlot(slotIndex, soundName) {
        this.activeSounds[slotIndex] = soundName;
    }

    // スロットからサウンドを削除
    removeSoundFromSlot(slotIndex) {
        delete this.activeSounds[slotIndex];
    }

    // 再生開始
    play() {
        this.resumeContext();
        this.isPlaying = true;
        this.currentBeat = 0;
        this.scheduleBeat();
    }

    // 再生停止
    stop() {
        this.isPlaying = false;
        if (this.beatInterval) {
            clearTimeout(this.beatInterval);
            this.beatInterval = null;
        }
    }

    // テンポ設定
    setTempo(bpm) {
        this.tempo = bpm;
    }

    // ビートスケジューリング
    scheduleBeat() {
        if (!this.isPlaying) return;

        const beatDuration = 60 / this.tempo / 2; // 8分音符
        const currentTime = this.audioContext.currentTime;

        // アクティブなサウンドを再生
        Object.entries(this.activeSounds).forEach(([slotIndex, soundName]) => {
            const sound = this.sounds[soundName];
            if (sound && sound.pattern[this.currentBeat]) {
                if (sound.notes) {
                    const noteIndex = this.currentBeat % sound.notes.length;
                    sound.create(currentTime, sound.notes[noteIndex]);
                } else {
                    sound.create(currentTime);
                }
            }
        });

        // ビートイベントを発火
        window.dispatchEvent(new CustomEvent('beat', {
            detail: {
                beat: this.currentBeat,
                activeSounds: this.activeSounds
            }
        }));

        this.currentBeat = (this.currentBeat + 1) % 8;

        this.beatInterval = setTimeout(() => {
            this.scheduleBeat();
        }, beatDuration * 1000);
    }

    // プレビュー再生
    previewSound(soundName) {
        this.resumeContext();
        const sound = this.sounds[soundName];
        if (sound) {
            const time = this.audioContext.currentTime;
            if (sound.notes) {
                sound.create(time, sound.notes[0]);
            } else {
                sound.create(time);
            }
        }
    }
}

// グローバルインスタンス
const audioEngine = new AudioEngine();
