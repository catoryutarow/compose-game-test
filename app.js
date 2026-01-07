// ===== Music App =====
class MusicApp {
    constructor() {
        this.slots = {};          // { slotIndex: { sound, emoji, name } }
        this.selectedSlot = null; // 現在選択中のキャラクター
        this.isPlaying = false;
        this.pickerOpen = false;

        this.init();
    }

    init() {
        this.bindElements();
        this.setupCharacters();
        this.setupPicker();
        this.setupControls();
        this.setupBeatListener();
        this.setupVisibilityHandler();

        // 初回タップでAudioContextを有効化
        document.addEventListener('touchstart', () => audioEngine.resumeContext(), { once: true });
        document.addEventListener('click', () => audioEngine.resumeContext(), { once: true });

        // ウェルカムメッセージ
        setTimeout(() => this.showToast('キャラをタップしてサウンドを選ぼう！'), 800);
    }

    // 画面復帰時の処理
    setupVisibilityHandler() {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                // AudioContextを再開
                audioEngine.resumeContext();
            }
        });

        // タッチで再開（iOS Safari対策）
        document.addEventListener('touchstart', () => {
            if (this.isPlaying) {
                audioEngine.resumeContext();
            }
        }, { passive: true });
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

    // ===== キャラクター =====
    setupCharacters() {
        const characters = document.querySelectorAll('.character');

        characters.forEach(char => {
            char.addEventListener('click', (e) => {
                this.hapticFeedback();
                this.selectCharacter(char);
            });

            // タッチフィードバック
            char.addEventListener('touchstart', () => {
                char.style.transform = 'scale(0.95)';
            });

            char.addEventListener('touchend', () => {
                char.style.transform = '';
            });
        });
    }

    selectCharacter(char) {
        const slotIndex = char.dataset.slot;

        // 前の選択を解除
        document.querySelectorAll('.character').forEach(c => c.classList.remove('selected'));

        // 新しい選択
        char.classList.add('selected');
        this.selectedSlot = slotIndex;

        // サウンドピッカーを開く
        this.openPicker();

        // 選択中のサウンドをハイライト
        this.updatePickerSelection();
    }

    // ===== サウンドピッカー（ボトムシート） =====
    setupPicker() {
        const pickerHandle = document.getElementById('pickerHandle');
        const tabs = document.querySelectorAll('.category-tabs .tab');
        const soundBtns = document.querySelectorAll('.sound-btn');

        // ハンドルでの開閉
        pickerHandle.addEventListener('click', () => {
            if (this.pickerOpen) {
                this.closePicker();
            }
        });

        // オーバーレイクリックで閉じる
        this.overlay.addEventListener('click', () => {
            this.closePicker();
        });

        // カテゴリタブ
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.hapticFeedback();
                this.switchCategory(tab.dataset.category);
            });
        });

        // サウンドボタン
        soundBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.hapticFeedback('heavy');
                this.selectSound(btn);
            });
        });

        // 削除ボタン
        this.removeSoundBtn.addEventListener('click', () => {
            this.hapticFeedback();
            this.removeCurrentSound();
        });

        // スワイプで閉じる
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

        // 選択解除
        document.querySelectorAll('.character').forEach(c => c.classList.remove('selected'));
        this.selectedSlot = null;
    }

    switchCategory(category) {
        // タブの切り替え
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`.tab[data-category="${category}"]`).classList.add('active');

        // グリッドの切り替え
        document.querySelectorAll('.sound-grid').forEach(g => g.classList.add('hidden'));
        document.querySelector(`.sound-grid[data-category="${category}"]`).classList.remove('hidden');
    }

    updatePickerSelection() {
        // 全ての選択状態をリセット
        document.querySelectorAll('.sound-btn').forEach(btn => btn.classList.remove('selected'));

        // 現在のスロットにサウンドがあれば選択状態に
        if (this.selectedSlot !== null && this.slots[this.selectedSlot]) {
            const currentSound = this.slots[this.selectedSlot].sound;
            const btn = document.querySelector(`.sound-btn[data-sound="${currentSound}"]`);
            if (btn) {
                btn.classList.add('selected');
                // そのカテゴリに切り替え
                const category = btn.closest('.sound-grid').dataset.category;
                this.switchCategory(category);
            }
            // 削除ボタンを表示
            this.removeSoundBtn.classList.add('visible');
        } else {
            this.removeSoundBtn.classList.remove('visible');
        }
    }

    selectSound(btn) {
        if (this.selectedSlot === null) return;

        const soundName = btn.dataset.sound;
        const soundEmoji = btn.querySelector('.sound-emoji').textContent;
        const soundLabel = btn.querySelector('.sound-label').textContent;

        // サウンドをプレビュー
        audioEngine.previewSound(soundName);

        // スロットにサウンドを割り当て
        this.assignSound(this.selectedSlot, {
            sound: soundName,
            emoji: soundEmoji,
            name: soundLabel
        });

        // UIを更新
        this.updatePickerSelection();

        // ピッカーを閉じる
        setTimeout(() => this.closePicker(), 150);
    }

    assignSound(slotIndex, soundData) {
        // データを保存
        this.slots[slotIndex] = soundData;
        audioEngine.addSoundToSlot(slotIndex, soundData.sound);

        // バッジを更新
        const badge = document.querySelector(`.sound-badge[data-slot="${slotIndex}"]`);
        if (badge) {
            badge.textContent = soundData.emoji;
            badge.classList.add('visible');

            // ポップアニメーション
            badge.style.animation = 'none';
            badge.offsetHeight; // Reflow
            badge.style.animation = '';
        }

        // キャラクターにパルス効果
        const char = document.querySelector(`.character[data-slot="${slotIndex}"]`);
        if (char) {
            char.style.transform = 'scale(1.1)';
            setTimeout(() => char.style.transform = '', 200);
        }
    }

    removeCurrentSound() {
        if (this.selectedSlot === null) return;

        // スロットからサウンドを削除
        delete this.slots[this.selectedSlot];
        audioEngine.removeSoundFromSlot(this.selectedSlot);

        // バッジを非表示
        const badge = document.querySelector(`.sound-badge[data-slot="${this.selectedSlot}"]`);
        if (badge) {
            badge.classList.remove('visible');
            badge.textContent = '';
        }

        // UI更新
        this.updatePickerSelection();
        this.closePicker();

        // 全スロットが空なら停止
        if (Object.keys(this.slots).length === 0 && this.isPlaying) {
            this.stop();
        }
    }

    // ===== コントロール =====
    setupControls() {
        this.playBtn.addEventListener('click', () => {
            this.hapticFeedback('heavy');
            if (this.isPlaying) {
                this.stop();
            } else {
                this.play();
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

    play() {
        if (Object.keys(this.slots).length === 0) {
            this.showToast('まずキャラにサウンドを設定してね！');
            return;
        }

        this.isPlaying = true;
        audioEngine.play();
        this.playBtn.classList.add('playing');
        this.playBtn.querySelector('.play-icon').textContent = '■';
    }

    stop() {
        this.isPlaying = false;
        audioEngine.stop();
        this.playBtn.classList.remove('playing');
        this.playBtn.querySelector('.play-icon').textContent = '▶';

        // キャラクターのアニメーションを停止
        document.querySelectorAll('.character').forEach(c => c.classList.remove('active'));
    }

    reset() {
        this.stop();
        this.slots = {};
        audioEngine.activeSounds = {};

        // バッジをリセット
        document.querySelectorAll('.sound-badge').forEach(badge => {
            badge.classList.remove('visible');
            badge.textContent = '';
        });

        this.showToast('リセットしました！');
    }

    // ===== ビートリスナー =====
    setupBeatListener() {
        const beatDots = document.querySelectorAll('.beat-dot');

        window.addEventListener('beat', (e) => {
            const { beat, activeSounds } = e.detail;

            // ビートインジケーター
            beatDots.forEach((dot, i) => {
                dot.classList.toggle('active', i === beat);
            });

            // アクティブなキャラクターをアニメーション
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

    // ===== ユーティリティ =====
    hapticFeedback(intensity = 'light') {
        if ('vibrate' in navigator) {
            const duration = intensity === 'heavy' ? 30 : 10;
            navigator.vibrate(duration);
        }
    }

    showToast(message) {
        // 既存のトーストを削除
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        // 表示アニメーション
        requestAnimationFrame(() => {
            toast.classList.add('visible');
        });

        // 自動で消える
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
}

// ===== アプリ起動 =====
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MusicApp();
});
