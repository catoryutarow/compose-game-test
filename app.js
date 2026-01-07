// メインアプリケーション
class MusicApp {
    constructor() {
        this.slots = {};
        this.isPlaying = false;
        this.draggedSound = null;

        this.init();
    }

    init() {
        this.setupControls();
        this.setupDragAndDrop();
        this.setupBeatListener();
        this.setupSoundPreviews();
    }

    // コントロールボタンのセットアップ
    setupControls() {
        const playBtn = document.getElementById('playBtn');
        const stopBtn = document.getElementById('stopBtn');
        const resetBtn = document.getElementById('resetBtn');
        const tempoSlider = document.getElementById('tempo');
        const tempoValue = document.getElementById('tempoValue');

        playBtn.addEventListener('click', () => {
            if (!this.isPlaying) {
                this.play();
            }
        });

        stopBtn.addEventListener('click', () => {
            this.stop();
        });

        resetBtn.addEventListener('click', () => {
            this.reset();
        });

        tempoSlider.addEventListener('input', (e) => {
            const tempo = parseInt(e.target.value);
            tempoValue.textContent = tempo;
            audioEngine.setTempo(tempo);
        });
    }

    // 再生開始
    play() {
        if (Object.keys(this.slots).length === 0) {
            this.showMessage('サウンドをキャラクターにドラッグしてね！');
            return;
        }

        this.isPlaying = true;
        audioEngine.play();

        document.getElementById('playBtn').classList.add('active');
        document.getElementById('playBtn').querySelector('.btn-text').textContent = '再生中...';
    }

    // 停止
    stop() {
        this.isPlaying = false;
        audioEngine.stop();

        document.getElementById('playBtn').classList.remove('active');
        document.getElementById('playBtn').querySelector('.btn-text').textContent = 'スタート';

        // キャラクターのアニメーションを停止
        document.querySelectorAll('.character').forEach(char => {
            char.classList.remove('active');
        });
    }

    // リセット
    reset() {
        this.stop();
        this.slots = {};
        audioEngine.activeSounds = {};

        // スロットのUIをリセット
        document.querySelectorAll('.sound-slot').forEach(slot => {
            slot.classList.remove('has-sound');
            slot.innerHTML = '<span class="slot-hint">ここにドロップ</span>';
        });

        this.showMessage('リセットしました！');
    }

    // ドラッグ＆ドロップのセットアップ
    setupDragAndDrop() {
        const soundItems = document.querySelectorAll('.sound-item');
        const slots = document.querySelectorAll('.sound-slot');

        // サウンドアイテムのドラッグイベント
        soundItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                this.draggedSound = {
                    sound: item.dataset.sound,
                    category: item.dataset.category,
                    icon: item.querySelector('.sound-icon').textContent,
                    name: item.querySelector('.sound-name').textContent
                };
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'copy';
            });

            item.addEventListener('dragend', (e) => {
                item.classList.remove('dragging');
                this.draggedSound = null;
            });
        });

        // スロットのドロップイベント
        slots.forEach(slot => {
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                slot.classList.add('drag-over');
            });

            slot.addEventListener('dragleave', (e) => {
                slot.classList.remove('drag-over');
            });

            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('drag-over');

                if (this.draggedSound) {
                    this.assignSoundToSlot(slot, this.draggedSound);
                }
            });
        });

        // タッチデバイス対応
        this.setupTouchDragAndDrop();
    }

    // タッチデバイス用のドラッグ＆ドロップ
    setupTouchDragAndDrop() {
        const soundItems = document.querySelectorAll('.sound-item');
        let touchedItem = null;
        let clone = null;

        soundItems.forEach(item => {
            item.addEventListener('touchstart', (e) => {
                touchedItem = item;
                this.draggedSound = {
                    sound: item.dataset.sound,
                    category: item.dataset.category,
                    icon: item.querySelector('.sound-icon').textContent,
                    name: item.querySelector('.sound-name').textContent
                };

                // クローン作成
                clone = item.cloneNode(true);
                clone.style.position = 'fixed';
                clone.style.pointerEvents = 'none';
                clone.style.opacity = '0.8';
                clone.style.zIndex = '1000';
                clone.style.transform = 'scale(1.1)';
                document.body.appendChild(clone);
            });

            item.addEventListener('touchmove', (e) => {
                if (clone) {
                    const touch = e.touches[0];
                    clone.style.left = (touch.clientX - 40) + 'px';
                    clone.style.top = (touch.clientY - 40) + 'px';

                    // ドロップターゲットのハイライト
                    const slots = document.querySelectorAll('.sound-slot');
                    slots.forEach(slot => {
                        const rect = slot.getBoundingClientRect();
                        if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
                            touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
                            slot.classList.add('drag-over');
                        } else {
                            slot.classList.remove('drag-over');
                        }
                    });
                }
                e.preventDefault();
            });

            item.addEventListener('touchend', (e) => {
                if (clone) {
                    const touch = e.changedTouches[0];
                    const slots = document.querySelectorAll('.sound-slot');

                    slots.forEach(slot => {
                        const rect = slot.getBoundingClientRect();
                        if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
                            touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
                            this.assignSoundToSlot(slot, this.draggedSound);
                        }
                        slot.classList.remove('drag-over');
                    });

                    document.body.removeChild(clone);
                    clone = null;
                }
                touchedItem = null;
                this.draggedSound = null;
            });
        });
    }

    // サウンドをスロットに割り当て
    assignSoundToSlot(slot, soundData) {
        const slotIndex = slot.dataset.slot;

        // 既存のサウンドを削除
        if (this.slots[slotIndex]) {
            audioEngine.removeSoundFromSlot(slotIndex);
        }

        // 新しいサウンドを追加
        this.slots[slotIndex] = soundData;
        audioEngine.addSoundToSlot(slotIndex, soundData.sound);

        // UIを更新
        slot.classList.add('has-sound');
        slot.innerHTML = `
            <span class="slot-sound-icon">${soundData.icon}</span>
            <button class="remove-sound" data-slot="${slotIndex}">×</button>
        `;

        // 削除ボタンのイベント
        slot.querySelector('.remove-sound').addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeSoundFromSlot(slotIndex);
        });

        // プレビュー再生
        audioEngine.previewSound(soundData.sound);

        // キャラクターをハイライト
        const character = document.querySelector(`.character[data-slot="${slotIndex}"]`);
        if (character) {
            character.classList.add('highlight');
            setTimeout(() => character.classList.remove('highlight'), 300);
        }
    }

    // スロットからサウンドを削除
    removeSoundFromSlot(slotIndex) {
        delete this.slots[slotIndex];
        audioEngine.removeSoundFromSlot(slotIndex);

        const slot = document.querySelector(`.sound-slot[data-slot="${slotIndex}"]`);
        if (slot) {
            slot.classList.remove('has-sound');
            slot.innerHTML = '<span class="slot-hint">ここにドロップ</span>';
        }

        // 全スロットが空になったら停止
        if (Object.keys(this.slots).length === 0 && this.isPlaying) {
            this.stop();
        }
    }

    // ビートリスナーのセットアップ
    setupBeatListener() {
        window.addEventListener('beat', (e) => {
            const { beat, activeSounds } = e.detail;

            // ビートインジケーターを更新（もし追加されていれば）
            document.querySelectorAll('.beat-dot').forEach((dot, i) => {
                dot.classList.toggle('active', i === beat);
            });

            // アクティブなキャラクターをアニメーション
            Object.entries(activeSounds).forEach(([slotIndex, soundName]) => {
                const character = document.querySelector(`.character[data-slot="${slotIndex}"]`);
                const sound = audioEngine.sounds[soundName];

                if (character && sound && sound.pattern[beat]) {
                    character.classList.add('active');
                    setTimeout(() => {
                        // 次のビートまでactiveを維持
                    }, 100);
                }
            });

            // ビートごとにアクティブなキャラクターを更新
            document.querySelectorAll('.character').forEach(char => {
                const slotIndex = char.dataset.slot;
                if (!activeSounds[slotIndex]) {
                    char.classList.remove('active');
                }
            });
        });
    }

    // サウンドプレビューのセットアップ
    setupSoundPreviews() {
        document.querySelectorAll('.sound-item').forEach(item => {
            item.addEventListener('click', () => {
                const soundName = item.dataset.sound;
                audioEngine.previewSound(soundName);

                // クリックアニメーション
                item.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    item.style.transform = '';
                }, 100);
            });
        });
    }

    // メッセージ表示
    showMessage(text) {
        // 既存のメッセージを削除
        const existing = document.querySelector('.message-toast');
        if (existing) {
            existing.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'message-toast';
        toast.textContent = text;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 15px 30px;
            border-radius: 30px;
            font-size: 1.1rem;
            z-index: 1000;
            animation: fadeInOut 2s ease-in-out forwards;
        `;

        // アニメーションスタイルを追加
        if (!document.querySelector('#toast-animation')) {
            const style = document.createElement('style');
            style.id = 'toast-animation';
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                    20% { opacity: 1; transform: translateX(-50%) translateY(0); }
                    80% { opacity: 1; transform: translateX(-50%) translateY(0); }
                    100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 2000);
    }
}

// ビートインジケーターを追加
function addBeatIndicator() {
    const stage = document.querySelector('.stage');
    const indicator = document.createElement('div');
    indicator.className = 'beat-indicator';

    for (let i = 0; i < 8; i++) {
        const dot = document.createElement('div');
        dot.className = 'beat-dot';
        indicator.appendChild(dot);
    }

    stage.appendChild(indicator);
}

// アプリ起動
document.addEventListener('DOMContentLoaded', () => {
    addBeatIndicator();
    const app = new MusicApp();

    // ウェルカムメッセージ
    setTimeout(() => {
        app.showMessage('🎵 サウンドをキャラクターにドラッグして音楽を作ろう！ 🎵');
    }, 500);
});

// Audio Context のユーザー操作での初期化（ブラウザポリシー対応）
document.addEventListener('click', () => {
    audioEngine.resumeContext();
}, { once: true });

document.addEventListener('touchstart', () => {
    audioEngine.resumeContext();
}, { once: true });
