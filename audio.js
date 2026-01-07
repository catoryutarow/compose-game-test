// ===== 8bit風 Web Audio Engine (iOS対応強化版 + パック対応) =====
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
        this.needsResume = false;  // 再開が必要かどうか
        this.currentPackId = null;

        this.initAudioContext();
        // パック対応: createSounds() を loadPack() に置き換え
        // パックのロードは app.js から行う
    }

    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = 0.7;

            // AudioContextの状態変化を監視
            this.audioContext.onstatechange = () => {
                console.log('AudioContext state:', this.audioContext.state);

                if (this.audioContext.state === 'running' && this.needsResume) {
                    this.needsResume = false;
                    if (this.wasPlayingBeforePause && this.isPlaying) {
                        console.log('AudioContext running - restarting scheduler');
                        this.restartScheduler();
                    }
                }

                if (this.audioContext.state === 'suspended') {
                    console.log('AudioContext suspended');
                    if (this.isPlaying) {
                        this.needsResume = true;
                    }
                }
            };

            this.setupVisibilityHandler();
            this.setupInteractionHandler();

        } catch (e) {
            console.error('Web Audio API is not supported:', e);
        }
    }

    setupVisibilityHandler() {
        // 画面の表示/非表示を監視
        document.addEventListener('visibilitychange', () => {
            console.log('Visibility changed:', document.visibilityState);

            if (document.visibilityState === 'hidden') {
                // 再生中だったことを記録
                if (this.isPlaying) {
                    this.wasPlayingBeforePause = true;
                    this.needsResume = true;
                    console.log('Marked for resume');
                }
            } else if (document.visibilityState === 'visible') {
                // 画面復帰時
                console.log('Screen visible - attempting resume');
                this.attemptResume();
            }
        });

        // iOS Safari用の追加イベント
        window.addEventListener('pageshow', (e) => {
            console.log('Pageshow event');
            if (this.isPlaying || this.wasPlayingBeforePause) {
                this.attemptResume();
            }
        });

        window.addEventListener('focus', () => {
            console.log('Window focus');
            if (this.isPlaying || this.needsResume) {
                this.attemptResume();
            }
        });

        // 定期的に状態をチェック（バックアップ）
        setInterval(() => {
            if (this.isPlaying && this.audioContext.state === 'suspended') {
                console.log('Periodic check: context suspended while playing');
                this.needsResume = true;
            }
        }, 1000);
    }

    setupInteractionHandler() {
        // ユーザーインタラクションで強制的に再開
        const forceResume = async () => {
            if (this.audioContext.state === 'suspended') {
                console.log('User interaction - forcing resume');
                await this.resumeContext();
            }

            if (this.needsResume && this.isPlaying) {
                console.log('User interaction - restarting after resume flag');
                this.needsResume = false;
                this.restartScheduler();
            }
        };

        // 複数のイベントで対応
        ['touchstart', 'touchend', 'click', 'keydown'].forEach(event => {
            document.addEventListener(event, forceResume, { passive: true });
        });
    }

    async attemptResume() {
        console.log('Attempting resume, context state:', this.audioContext.state);

        if (this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
                console.log('Resume successful, new state:', this.audioContext.state);
            } catch (e) {
                console.error('Resume failed:', e);
                this.needsResume = true;
                return;
            }
        }

        // AudioContextがrunningになったらスケジューラーを再起動
        if (this.audioContext.state === 'running') {
            if (this.wasPlayingBeforePause && this.isPlaying) {
                console.log('Context running - restarting scheduler');
                this.restartScheduler();
                this.wasPlayingBeforePause = false;
            }
            this.needsResume = false;
        }
    }

    async resumeContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
                console.log('Context resumed successfully');
                return true;
            } catch (e) {
                console.error('Failed to resume context:', e);
                return false;
            }
        }
        return this.audioContext.state === 'running';
    }

    restartScheduler() {
        console.log('Restarting scheduler');

        // 既存のタイマーをクリア
        if (this.beatInterval) {
            clearTimeout(this.beatInterval);
            this.beatInterval = null;
        }

        // スケジューラーを再開
        if (this.isPlaying && this.audioContext.state === 'running') {
            this.scheduleBeat();
            console.log('Scheduler restarted');
        } else {
            console.log('Cannot restart: isPlaying=', this.isPlaying, 'state=', this.audioContext.state);
        }
    }

    // パックからサウンドをロード
    loadPack(packId) {
        if (!packManager) {
            console.error('PackManager not available');
            return false;
        }

        const pack = packManager.getPack(packId);
        if (!pack) {
            console.error('Pack not found:', packId);
            return false;
        }

        this.currentPackId = packId;
        this.sounds = {};

        // パックの各サウンドを変換
        Object.entries(pack.sounds).forEach(([soundId, soundData]) => {
            this.sounds[soundId] = this.createSoundFromData(soundId, soundData);
        });

        console.log('Pack loaded:', pack.name, Object.keys(this.sounds).length, 'sounds');
        return true;
    }

    // サウンドデータからサウンドオブジェクトを作成
    createSoundFromData(soundId, data) {
        const sound = {
            type: data.type || data.category,
            pattern: data.pattern || [1, 0, 0, 0, 0, 0, 0, 0],
            notes: data.notes || null,
            waveType: data.waveType || 'square',
            isArp: data.isArp || false,
            params: data.params || {}
        };

        // create関数を動的に設定
        sound.create = (time, note) => {
            this.playSoundFromData(time, sound, note);
        };

        return sound;
    }

    // データに基づいてサウンドを再生
    playSoundFromData(time, sound, note) {
        const category = sound.type;
        const waveType = sound.waveType || 'square';

        if (category === 'beat') {
            this.playBeat(time, waveType, sound.params);
        } else if (category === 'melody' || category === 'bass') {
            if (sound.isArp) {
                this.create8bitArp(time, note);
            } else {
                this.create8bitMelody(time, note, waveType);
            }
        } else if (category === 'fx') {
            this.playFx(time, sound.params);
        }
    }

    // ビート音再生
    playBeat(time, waveType, params = {}) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = waveType;

        const startFreq = params.startFreq || 150;
        const endFreq = params.endFreq || 30;
        const duration = params.duration || 0.15;

        osc.frequency.setValueAtTime(startFreq, time);
        osc.frequency.exponentialRampToValueAtTime(endFreq, time + duration * 0.7);

        gain.gain.setValueAtTime(0.6, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + duration);
    }

    // FX音再生
    playFx(time, params = {}) {
        const fxType = params.type || 'custom';

        switch (fxType) {
            case 'powerup':
                this.create8bitPowerUp(time);
                break;
            case 'coin':
                this.create8bitCoin(time);
                break;
            case 'jump':
                this.create8bitJump(time);
                break;
            case 'laser':
                this.create8bitLaser(time);
                break;
            case 'explosion':
                this.create8bitExplosion(time);
                break;
            default:
                this.create8bitCoin(time);
        }
    }

    // レーザー音
    create8bitLaser(time) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(1000, time);
        osc.frequency.exponentialRampToValueAtTime(100, time + 0.2);

        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 0.2);
    }

    // 爆発音
    create8bitExplosion(time) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(100, time);
        osc.frequency.setValueAtTime(50, time + 0.1);

        gain.gain.setValueAtTime(0.5, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 0.4);
    }

    // 現在のパックを取得
    getCurrentPack() {
        if (this.currentPackId && packManager) {
            return packManager.getPack(this.currentPackId);
        }
        return null;
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

    create8bitCoin(time) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(988, time);
        osc.frequency.setValueAtTime(1319, time + 0.08);

        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 0.2);
    }

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

    async play() {
        console.log('Play called');

        // AudioContextを確実に再開
        await this.resumeContext();

        this.isPlaying = true;
        this.wasPlayingBeforePause = true;
        this.needsResume = false;
        this.currentBeat = 0;

        // AudioContextがrunningになるまで待つ
        if (this.audioContext.state !== 'running') {
            console.log('Waiting for context to be running...');
            await new Promise(resolve => {
                const checkState = () => {
                    if (this.audioContext.state === 'running') {
                        resolve();
                    } else {
                        setTimeout(checkState, 50);
                    }
                };
                checkState();
            });
        }

        this.scheduleBeat();
        console.log('Play started');
    }

    stop() {
        console.log('Stop called');
        this.isPlaying = false;
        this.wasPlayingBeforePause = false;
        this.needsResume = false;

        if (this.beatInterval) {
            clearTimeout(this.beatInterval);
            this.beatInterval = null;
        }
    }

    setTempo(bpm) {
        this.tempo = bpm;
    }

    scheduleBeat() {
        if (!this.isPlaying) {
            console.log('scheduleBeat: not playing, stopping');
            return;
        }

        if (this.audioContext.state !== 'running') {
            console.log('scheduleBeat: context not running, marking for resume');
            this.needsResume = true;
            return;
        }

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

    async previewSound(soundName) {
        await this.resumeContext();
        const sound = this.sounds[soundName];
        if (sound && this.audioContext.state === 'running') {
            const time = this.audioContext.currentTime;
            if (sound.notes) {
                sound.create(time, sound.notes[0]);
            } else {
                sound.create(time);
            }
        }
    }

    // 外部から状態を確認するメソッド
    getState() {
        return {
            contextState: this.audioContext?.state,
            isPlaying: this.isPlaying,
            needsResume: this.needsResume,
            wasPlayingBeforePause: this.wasPlayingBeforePause
        };
    }
}

const audioEngine = new AudioEngine();
