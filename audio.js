// ===== 8bit風 Web Audio Engine =====
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
        this.wasPlayingBeforePause = false;

        this.initAudioContext();
        this.createSounds();
    }

    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = 0.7;

            this.setupVisibilityHandler();
        } catch (e) {
            console.error('Web Audio API is not supported:', e);
        }
    }

    setupVisibilityHandler() {
        // 画面が非表示になったとき
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                // 再生中だったことを記録
                this.wasPlayingBeforePause = this.isPlaying;
            } else if (document.visibilityState === 'visible') {
                // 画面復帰時
                this.resumeContext();

                // 再生中だった場合、スケジューラーを再起動
                if (this.wasPlayingBeforePause && this.isPlaying) {
                    this.restartScheduler();
                }
            }
        });

        // iOS Safari用
        window.addEventListener('pageshow', (e) => {
            this.resumeContext();
            if (this.isPlaying) {
                this.restartScheduler();
            }
        });

        // フォーカス復帰時も
        window.addEventListener('focus', () => {
            this.resumeContext();
            if (this.isPlaying) {
                this.restartScheduler();
            }
        });
    }

    resumeContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // スケジューラーを再起動
    restartScheduler() {
        if (this.beatInterval) {
            clearTimeout(this.beatInterval);
            this.beatInterval = null;
        }
        this.scheduleBeat();
    }

    // 8bit風サウンドパターン
    createSounds() {
        // ビート系（8bit風）
        this.sounds.kick = {
            type: 'beat',
            pattern: [1, 0, 0, 0, 1, 0, 0, 0],
            create: (time) => this.create8bitKick(time)
        };

        this.sounds.snare = {
            type: 'beat',
            pattern: [0, 0, 1, 0, 0, 0, 1, 0],
            create: (time) => this.create8bitSnare(time)
        };

        this.sounds.hihat = {
            type: 'beat',
            pattern: [1, 1, 1, 1, 1, 1, 1, 1],
            create: (time) => this.create8bitHihat(time)
        };

        // メロディ系（8bit風）
        this.sounds.synth1 = {
            type: 'melody',
            pattern: [1, 0, 0, 1, 0, 0, 1, 0],
            notes: ['C4', 'E4', 'G4', 'C5'],
            create: (time, note) => this.create8bitMelody(time, note, 'square')
        };

        this.sounds.synth2 = {
            type: 'melody',
            pattern: [0, 1, 0, 0, 1, 0, 0, 1],
            notes: ['E4', 'G4', 'B4', 'E5'],
            create: (time, note) => this.create8bitMelody(time, note, 'triangle')
        };

        this.sounds.piano = {
            type: 'melody',
            pattern: [1, 0, 1, 0, 1, 0, 1, 0],
            notes: ['C4', 'E4', 'G4', 'B4'],
            create: (time, note) => this.create8bitArp(time, note)
        };

        // ベース系（8bit風）
        this.sounds.bass1 = {
            type: 'bass',
            pattern: [1, 0, 0, 1, 0, 0, 1, 0],
            notes: ['C2', 'C2', 'G2', 'G2'],
            create: (time, note) => this.create8bitBass(time, note)
        };

        this.sounds.bass2 = {
            type: 'bass',
            pattern: [1, 0, 1, 0, 1, 0, 1, 0],
            notes: ['C2', 'E2', 'G2', 'B2'],
            create: (time, note) => this.create8bitBass(time, note)
        };

        // エフェクト系（8bit風）
        this.sounds.fx1 = {
            type: 'fx',
            pattern: [1, 0, 0, 0, 0, 0, 0, 0],
            create: (time) => this.create8bitPowerUp(time)
        };

        this.sounds.fx2 = {
            type: 'fx',
            pattern: [0, 0, 0, 0, 1, 0, 0, 0],
            create: (time) => this.create8bitCoin(time)
        };

        this.sounds.vocal = {
            type: 'fx',
            pattern: [1, 0, 0, 0, 1, 0, 0, 0],
            create: (time) => this.create8bitJump(time)
        };
    }

    noteToFreq(note) {
        const notes = {
            'C2': 65.41, 'D2': 73.42, 'E2': 82.41, 'F2': 87.31, 'G2': 98.00, 'A2': 110.00, 'B2': 123.47,
            'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
            'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
            'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77
        };
        return notes[note] || 440;
    }

    // 8bit キック
    create8bitKick(time) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(30, time + 0.1);

        gain.gain.setValueAtTime(0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 0.15);
    }

    // 8bit スネア（ノイズ風）
    create8bitSnare(time) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(200, time);
        osc.frequency.setValueAtTime(150, time + 0.02);
        osc.frequency.setValueAtTime(100, time + 0.04);

        gain.gain.setValueAtTime(0.6, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 0.1);

        // ノイズ風の追加音
        const osc2 = this.audioContext.createOscillator();
        const gain2 = this.audioContext.createGain();
        osc2.type = 'square';
        osc2.frequency.value = 400;

        gain2.gain.setValueAtTime(0.3, time);
        gain2.gain.exponentialRampToValueAtTime(0.01, time + 0.08);

        osc2.connect(gain2);
        gain2.connect(this.masterGain);
        osc2.start(time);
        osc2.stop(time + 0.08);
    }

    // 8bit ハイハット
    create8bitHihat(time) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'square';
        osc.frequency.value = 800;

        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.03);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 0.03);
    }

    // 8bit メロディ
    create8bitMelody(time, note, waveType = 'square') {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = waveType;
        osc.frequency.value = this.noteToFreq(note);

        gain.gain.setValueAtTime(0.3, time);
        gain.gain.setValueAtTime(0.25, time + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 0.3);
    }

    // 8bit アルペジオ
    create8bitArp(time, note) {
        const freq = this.noteToFreq(note);
        const freqs = [freq, freq * 1.25, freq * 1.5];

        freqs.forEach((f, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = 'square';
            osc.frequency.value = f;

            const startTime = time + i * 0.05;
            gain.gain.setValueAtTime(0.2, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(startTime);
            osc.stop(startTime + 0.15);
        });
    }

    // 8bit ベース
    create8bitBass(time, note) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'square';
        osc.frequency.value = this.noteToFreq(note);

        gain.gain.setValueAtTime(0.4, time);
        gain.gain.setValueAtTime(0.35, time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 0.2);
    }

    // 8bit パワーアップ音
    create8bitPowerUp(time) {
        const notes = [400, 500, 600, 800];
        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = 'square';
            osc.frequency.value = freq;

            const startTime = time + i * 0.08;
            gain.gain.setValueAtTime(0.25, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(startTime);
            osc.stop(startTime + 0.1);
        });
    }

    // 8bit コイン音
    create8bitCoin(time) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(988, time);  // B5
        osc.frequency.setValueAtTime(1319, time + 0.08);  // E6

        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 0.2);
    }

    // 8bit ジャンプ音
    create8bitJump(time) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(200, time);
        osc.frequency.exponentialRampToValueAtTime(600, time + 0.15);

        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 0.2);
    }

    addSoundToSlot(slotIndex, soundName) {
        this.activeSounds[slotIndex] = soundName;
    }

    removeSoundFromSlot(slotIndex) {
        delete this.activeSounds[slotIndex];
    }

    play() {
        this.resumeContext();
        this.isPlaying = true;
        this.wasPlayingBeforePause = true;
        this.currentBeat = 0;
        this.scheduleBeat();
    }

    stop() {
        this.isPlaying = false;
        this.wasPlayingBeforePause = false;
        if (this.beatInterval) {
            clearTimeout(this.beatInterval);
            this.beatInterval = null;
        }
    }

    setTempo(bpm) {
        this.tempo = bpm;
    }

    scheduleBeat() {
        if (!this.isPlaying) return;

        const beatDuration = 60 / this.tempo / 2;
        const currentTime = this.audioContext.currentTime;

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

const audioEngine = new AudioEngine();
