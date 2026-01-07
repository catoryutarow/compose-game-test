// ===== Pack Data Management =====
class PackManager {
    constructor() {
        this.STORAGE_KEY = 'music_factory_packs';
        this.packs = {};
        this.currentPackId = 'easy_pak';
        this.loadPacks();
    }

    // デフォルトパック（EASY PAK）
    getDefaultPacks() {
        return {
            easy_pak: {
                id: 'easy_pak',
                name: 'EASY PAK',
                isDefault: true,
                sounds: {
                    kick: {
                        name: 'KICK',
                        type: 'beat',
                        category: 'beat',
                        icon: '♪',
                        pattern: [1, 0, 0, 0, 1, 0, 0, 0],
                        waveType: 'square',
                        params: { startFreq: 150, endFreq: 30, duration: 0.15 }
                    },
                    snare: {
                        name: 'SNARE',
                        type: 'beat',
                        category: 'beat',
                        icon: '♫',
                        pattern: [0, 0, 1, 0, 0, 0, 1, 0],
                        waveType: 'square',
                        params: { freq: 200, duration: 0.1 }
                    },
                    hihat: {
                        name: 'HIHAT',
                        type: 'beat',
                        category: 'beat',
                        icon: '♩',
                        pattern: [1, 1, 1, 1, 1, 1, 1, 1],
                        waveType: 'square',
                        params: { freq: 800, duration: 0.03 }
                    },
                    synth1: {
                        name: 'LEAD1',
                        type: 'melody',
                        category: 'melody',
                        icon: '▶',
                        pattern: [1, 0, 0, 1, 0, 0, 1, 0],
                        waveType: 'square',
                        notes: ['C4', 'E4', 'G4', 'C5']
                    },
                    synth2: {
                        name: 'LEAD2',
                        type: 'melody',
                        category: 'melody',
                        icon: '◀',
                        pattern: [0, 1, 0, 0, 1, 0, 0, 1],
                        waveType: 'triangle',
                        notes: ['E4', 'G4', 'B4', 'E5']
                    },
                    piano: {
                        name: 'ARP',
                        type: 'melody',
                        category: 'melody',
                        icon: '▲',
                        pattern: [1, 0, 1, 0, 1, 0, 1, 0],
                        waveType: 'square',
                        notes: ['C4', 'E4', 'G4', 'B4'],
                        isArp: true
                    },
                    bass1: {
                        name: 'BASS1',
                        type: 'bass',
                        category: 'bass',
                        icon: '▼',
                        pattern: [1, 0, 0, 1, 0, 0, 1, 0],
                        waveType: 'square',
                        notes: ['C2', 'C2', 'G2', 'G2']
                    },
                    bass2: {
                        name: 'BASS2',
                        type: 'bass',
                        category: 'bass',
                        icon: '■',
                        pattern: [1, 0, 1, 0, 1, 0, 1, 0],
                        waveType: 'square',
                        notes: ['C2', 'E2', 'G2', 'B2']
                    },
                    fx1: {
                        name: 'POWER',
                        type: 'fx',
                        category: 'fx',
                        icon: '★',
                        pattern: [1, 0, 0, 0, 0, 0, 0, 0],
                        waveType: 'square',
                        params: { type: 'powerup' }
                    },
                    fx2: {
                        name: 'COIN',
                        type: 'fx',
                        category: 'fx',
                        icon: '●',
                        pattern: [0, 0, 0, 0, 1, 0, 0, 0],
                        waveType: 'square',
                        params: { type: 'coin' }
                    },
                    vocal: {
                        name: 'JUMP',
                        type: 'fx',
                        category: 'fx',
                        icon: '↑',
                        pattern: [1, 0, 0, 0, 1, 0, 0, 0],
                        waveType: 'square',
                        params: { type: 'jump' }
                    }
                }
            }
        };
    }

    loadPacks() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                this.packs = data.packs || this.getDefaultPacks();
                this.currentPackId = data.currentPackId || 'easy_pak';
            } else {
                this.packs = this.getDefaultPacks();
            }
        } catch (e) {
            console.error('Failed to load packs:', e);
            this.packs = this.getDefaultPacks();
        }

        // デフォルトパックが必ず存在することを保証
        if (!this.packs.easy_pak) {
            this.packs.easy_pak = this.getDefaultPacks().easy_pak;
        }
    }

    savePacks() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
                packs: this.packs,
                currentPackId: this.currentPackId
            }));
            return true;
        } catch (e) {
            console.error('Failed to save packs:', e);
            return false;
        }
    }

    getCurrentPack() {
        return this.packs[this.currentPackId] || this.packs.easy_pak;
    }

    setCurrentPack(packId) {
        if (this.packs[packId]) {
            this.currentPackId = packId;
            this.savePacks();
            return true;
        }
        return false;
    }

    getAllPacks() {
        return Object.values(this.packs);
    }

    getPack(packId) {
        return this.packs[packId];
    }

    createPack(name) {
        const id = 'pack_' + Date.now();
        this.packs[id] = {
            id: id,
            name: name,
            isDefault: false,
            sounds: {}
        };
        this.savePacks();
        return id;
    }

    deletePack(packId) {
        if (this.packs[packId] && !this.packs[packId].isDefault) {
            delete this.packs[packId];
            if (this.currentPackId === packId) {
                this.currentPackId = 'easy_pak';
            }
            this.savePacks();
            return true;
        }
        return false;
    }

    renamePack(packId, newName) {
        if (this.packs[packId]) {
            this.packs[packId].name = newName;
            this.savePacks();
            return true;
        }
        return false;
    }

    // サウンド（クリップ）操作
    addSound(packId, soundId, soundData) {
        if (this.packs[packId]) {
            this.packs[packId].sounds[soundId] = soundData;
            this.savePacks();
            return true;
        }
        return false;
    }

    updateSound(packId, soundId, soundData) {
        if (this.packs[packId] && this.packs[packId].sounds[soundId]) {
            this.packs[packId].sounds[soundId] = {
                ...this.packs[packId].sounds[soundId],
                ...soundData
            };
            this.savePacks();
            return true;
        }
        return false;
    }

    deleteSound(packId, soundId) {
        if (this.packs[packId] && this.packs[packId].sounds[soundId]) {
            delete this.packs[packId].sounds[soundId];
            this.savePacks();
            return true;
        }
        return false;
    }

    getSound(packId, soundId) {
        if (this.packs[packId]) {
            return this.packs[packId].sounds[soundId];
        }
        return null;
    }

    // パックを複製
    duplicatePack(packId, newName) {
        const sourcePack = this.packs[packId];
        if (sourcePack) {
            const newId = 'pack_' + Date.now();
            this.packs[newId] = {
                id: newId,
                name: newName || sourcePack.name + ' (Copy)',
                isDefault: false,
                sounds: JSON.parse(JSON.stringify(sourcePack.sounds))
            };
            this.savePacks();
            return newId;
        }
        return null;
    }

    // エクスポート/インポート
    exportPack(packId) {
        const pack = this.packs[packId];
        if (pack) {
            return JSON.stringify(pack, null, 2);
        }
        return null;
    }

    importPack(jsonString) {
        try {
            const pack = JSON.parse(jsonString);
            if (pack.name && pack.sounds) {
                const newId = 'pack_' + Date.now();
                this.packs[newId] = {
                    ...pack,
                    id: newId,
                    isDefault: false
                };
                this.savePacks();
                return newId;
            }
        } catch (e) {
            console.error('Import failed:', e);
        }
        return null;
    }
}

// グローバルインスタンス
const packManager = new PackManager();
