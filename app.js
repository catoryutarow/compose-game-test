// ===== 8BIT MUSIC FACTORY =====
class MusicApp {
    constructor() {
        this.slots = {};
        this.selectedSlot = null;
        this.isPlaying = false;
        this.pickerOpen = false;
        this.resumeOverlayVisible = false;

        this.soundIcons = {
            kick: '♪', snare: '♫', hihat: '♩',
            synth1: '▶', synth2: '◀', piano: '▲',
            bass1: '▼', bass2: '■',
            fx1: '★', fx2: '●', vocal: '↑'
        };

        this.init();
    }

    init() {
        this.bindElements();
        this.createResumeOverlay();
        this.setupCharacters();
        this.setupPicker();
        this.setupControls();
        this.setupBeatListener();
        this.setupVisibilityHandler();

        document.addEventListener('touchstart', () => audioEngine.resumeContext(), { once: true });
        document.addEventListener('click', () => audioEngine.resumeContext(), { once: true });

        setTimeout(() => this.showToast('TAP CHARACTER TO ADD SOUND!'), 800);
    }

    createResumeOverlay() {
        // 「タップして再開」オーバーレイを作成
        this.resumeOverlay = document.createElement('div');
        this.resumeOverlay.className = 'resume-overlay';
        this.resumeOverlay.innerHTML = `
            <div class="resume-box">
                <div class="resume-icon">▶</div>
                <div class="resume-text">TAP TO RESUME</div>
            </div>
        `;
        document.body.appendChild(this.resumeOverlay);

        // タップで再開
        this.resumeOverlay.addEventListener('click', async () => {
            await this.handleResume();
        });

        this.resumeOverlay.addEventListener('touchstart', async (e) => {
            e.preventDefault();
            await this.handleResume();
        });

        // スタイルを追加
        const style = document.createElement('style');
        style.textContent = `
            .resume-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.9);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                cursor: pointer;
            }
            .resume-overlay.visible {
                display: flex;
            }
            .resume-box {
                text-align: center;
                animation: pulse-resume 1s ease-in-out infinite;
            }
            .resume-icon {
                font-size: 4rem;
                color: #00ff00;
                margin-bottom: 16px;
            }
            .resume-text {
                font-family: 'Press Start 2P', monospace;
                font-size: 0.8rem;
                color: #00ff00;
                letter-spacing: 2px;
            }
            @keyframes pulse-resume {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.8; }
            }
        `;
        document.head.appendChild(style);
    }

    async handleResume() {
        console.log('Handle resume called');

        // AudioContextを再開
        await audioEngine.resumeContext();

        // スケジューラーを再起動
        if (audioEngine.isPlaying) {
            audioEngine.restartScheduler();
        }

        // オーバーレイを非表示
        this.hideResumeOverlay();

        // 確認音を鳴らす
        audioEngine.previewSound('fx2');
    }

    showResumeOverlay() {
        if (!this.resumeOverlayVisible && this.isPlaying) {
            this.resumeOverlayVisible = true;
            this.resumeOverlay.classList.add('visible');
            console.log('Resume overlay shown');
        }
    }

    hideResumeOverlay() {
        this.resumeOverlayVisible = false;
        this.resumeOverlay.classList.remove('visible');
        console.log('Resume overlay hidden');
    }

    setupVisibilityHandler() {
        // 画面復帰時の処理
        document.addEventListener('visibilitychange', () => {
            console.log('App: visibility changed to', document.visibilityState);

            if (document.visibilityState === 'visible') {
                // 再生中だった場合、少し待ってから状態を確認
                if (this.isPlaying) {
                    setTimeout(() => {
                        // AudioContextがsuspendedなら再開オーバーレイを表示
                        const state = audioEngine.getState();
                        console.log('Audio state check:', state);

                        if (state.contextState === 'suspended' || state.needsResume) {
                            this.showResumeOverlay();
                        }
                    }, 300);
                }
            }
        });

        // ユーザーインタラクションがあったら再開を試みる
        ['touchstart', 'click'].forEach(event => {
            document.addEventListener(event, async () => {
                if (this.isPlaying && audioEngine.needsResume) {
                    console.log('User interaction detected, attempting resume');
                    await audioEngine.resumeContext();
                    if (audioEngine.audioContext.state === 'running') {
                        audioEngine.restartScheduler();
                        this.hideResumeOverlay();
                    }
                }
            }, { passive: true });
        });
    }

    bindElements() {
        this.soundPicker = document.getElementById('soundPicker');
        this.overlay = document.getElementById('overlay');
        this.playBtn = document.getElementById('playBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.tempoSlider = document.getElementById('tempo');
        this.tempoValue = document.getElementById('tempoValue');
        this.removeSoundBtn = document.getElementById('removeSoundBtn');
    }

    setupCharacters() {
        const characters = document.querySelectorAll('.character');

        characters.forEach(char => {
            char.addEventListener('click', () => {
                this.hapticFeedback();
                this.selectCharacter(char);
            });

            char.addEventListener('touchstart', () => {
                char.style.transform = 'scale(0.95)';
            }, { passive: true });

            char.addEventListener('touchend', () => {
                char.style.transform = '';
            });
        });
    }

    selectCharacter(char) {
        const slotIndex = char.dataset.slot;

        document.querySelectorAll('.character').forEach(c => c.classList.remove('selected'));
        char.classList.add('selected');
        this.selectedSlot = slotIndex;

        this.openPicker();
        this.updatePickerSelection();
    }

    setupPicker() {
        const pickerHandle = document.getElementById('pickerHandle');
        const tabs = document.querySelectorAll('.pixel-tab');
        const soundBtns = document.querySelectorAll('.pixel-sound-btn');

        pickerHandle.addEventListener('click', () => {
            if (this.pickerOpen) this.closePicker();
        });

        this.overlay.addEventListener('click', () => this.closePicker());

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.hapticFeedback();
                this.switchCategory(tab.dataset.category);
            });
        });

        soundBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.hapticFeedback('heavy');
                this.selectSound(btn);
            });
        });

        this.removeSoundBtn.addEventListener('click', () => {
            this.hapticFeedback();
            this.removeCurrentSound();
        });

        this.setupSwipeGesture();
    }

    setupSwipeGesture() {
        let startY = 0;
        let currentY = 0;

        this.soundPicker.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
        }, { passive: true });

        this.soundPicker.addEventListener('touchmove', (e) => {
            currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            if (diff > 0 && this.pickerOpen) {
                this.soundPicker.style.transform = `translateY(${diff}px)`;
            }
        }, { passive: true });

        this.soundPicker.addEventListener('touchend', () => {
            const diff = currentY - startY;
            if (diff > 80 && this.pickerOpen) {
                this.closePicker();
            } else {
                this.soundPicker.style.transform = '';
            }
            startY = 0;
            currentY = 0;
        });
    }

    openPicker() {
        this.pickerOpen = true;
        this.soundPicker.classList.add('open');
        this.overlay.classList.add('visible');
        this.soundPicker.style.transform = '';
    }

    closePicker() {
        this.pickerOpen = false;
        this.soundPicker.classList.remove('open');
        this.overlay.classList.remove('visible');
        this.soundPicker.style.transform = '';

        document.querySelectorAll('.character').forEach(c => c.classList.remove('selected'));
        this.selectedSlot = null;
    }

    switchCategory(category) {
        document.querySelectorAll('.pixel-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`.pixel-tab[data-category="${category}"]`).classList.add('active');

        document.querySelectorAll('.sound-grid').forEach(g => g.classList.add('hidden'));
        document.querySelector(`.sound-grid[data-category="${category}"]`).classList.remove('hidden');
    }

    updatePickerSelection() {
        document.querySelectorAll('.pixel-sound-btn').forEach(btn => btn.classList.remove('selected'));

        if (this.selectedSlot !== null && this.slots[this.selectedSlot]) {
            const currentSound = this.slots[this.selectedSlot].sound;
            const btn = document.querySelector(`.pixel-sound-btn[data-sound="${currentSound}"]`);
            if (btn) {
                btn.classList.add('selected');
                const category = btn.closest('.sound-grid').dataset.category;
                this.switchCategory(category);
            }
            this.removeSoundBtn.classList.add('visible');
        } else {
            this.removeSoundBtn.classList.remove('visible');
        }
    }

    selectSound(btn) {
        if (this.selectedSlot === null) return;

        const soundName = btn.dataset.sound;
        const soundIcon = this.soundIcons[soundName] || '♪';
        const soundLabel = btn.querySelector('.sound-label').textContent;

        audioEngine.previewSound(soundName);

        this.assignSound(this.selectedSlot, {
            sound: soundName,
            icon: soundIcon,
            name: soundLabel
        });

        this.updatePickerSelection();
        setTimeout(() => this.closePicker(), 100);
    }

    assignSound(slotIndex, soundData) {
        this.slots[slotIndex] = soundData;
        audioEngine.addSoundToSlot(slotIndex, soundData.sound);

        const badge = document.querySelector(`.sound-badge[data-slot="${slotIndex}"]`);
        if (badge) {
            badge.textContent = soundData.icon;
            badge.classList.add('visible');
            badge.style.animation = 'none';
            badge.offsetHeight;
            badge.style.animation = '';
        }

        const char = document.querySelector(`.character[data-slot="${slotIndex}"]`);
        if (char) {
            char.style.transform = 'scale(1.1)';
            setTimeout(() => char.style.transform = '', 150);
        }
    }

    removeCurrentSound() {
        if (this.selectedSlot === null) return;

        delete this.slots[this.selectedSlot];
        audioEngine.removeSoundFromSlot(this.selectedSlot);

        const badge = document.querySelector(`.sound-badge[data-slot="${this.selectedSlot}"]`);
        if (badge) {
            badge.classList.remove('visible');
            badge.textContent = '';
        }

        this.updatePickerSelection();
        this.closePicker();

        if (Object.keys(this.slots).length === 0 && this.isPlaying) {
            this.stop();
        }
    }

    setupControls() {
        this.playBtn.addEventListener('click', async () => {
            this.hapticFeedback('heavy');
            if (this.isPlaying) {
                this.stop();
            } else {
                await this.play();
            }
        });

        this.resetBtn.addEventListener('click', () => {
            this.hapticFeedback();
            this.reset();
        });

        this.tempoSlider.addEventListener('input', (e) => {
            const tempo = parseInt(e.target.value);
            this.tempoValue.textContent = tempo;
            audioEngine.setTempo(tempo);
        });
    }

    async play() {
        if (Object.keys(this.slots).length === 0) {
            this.showToast('ADD SOUNDS FIRST!');
            return;
        }

        this.isPlaying = true;
        await audioEngine.play();
        this.playBtn.classList.add('playing');
    }

    stop() {
        this.isPlaying = false;
        audioEngine.stop();
        this.playBtn.classList.remove('playing');
        this.hideResumeOverlay();

        document.querySelectorAll('.character').forEach(c => c.classList.remove('active'));
    }

    reset() {
        this.stop();
        this.slots = {};
        audioEngine.activeSounds = {};

        document.querySelectorAll('.sound-badge').forEach(badge => {
            badge.classList.remove('visible');
            badge.textContent = '';
        });

        this.showToast('RESET!');
    }

    setupBeatListener() {
        const beatDots = document.querySelectorAll('.beat-dot');

        window.addEventListener('beat', (e) => {
            const { beat, activeSounds } = e.detail;

            beatDots.forEach((dot, i) => {
                dot.classList.toggle('active', i === beat);
            });

            document.querySelectorAll('.character').forEach(char => {
                const slotIndex = char.dataset.slot;
                const soundName = activeSounds[slotIndex];

                if (soundName) {
                    const sound = audioEngine.sounds[soundName];
                    if (sound && sound.pattern[beat]) {
                        char.classList.add('active');
                    }
                } else {
                    char.classList.remove('active');
                }
            });
        });
    }

    hapticFeedback(intensity = 'light') {
        if ('vibrate' in navigator) {
            navigator.vibrate(intensity === 'heavy' ? 30 : 10);
        }
    }

    showToast(message) {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('visible'));

        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 200);
        }, 2000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new MusicApp();
});
