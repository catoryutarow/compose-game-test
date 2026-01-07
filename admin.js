// ===== 8BIT MUSIC FACTORY - ADMIN =====
class AdminApp {
    constructor() {
        this.selectedPackId = null;
        this.selectedSoundId = null;
        this.currentFilter = 'all';
        this.pattern = [0, 0, 0, 0, 0, 0, 0, 0];
        this.isNewSound = false;

        // Audio for preview
        this.audioContext = null;
        this.masterGain = null;

        this.init();
    }

    init() {
        this.initAudio();
        this.bindElements();
        this.setupEventListeners();
        this.populateNoteSelects();
        this.renderPackList();
    }

    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = 0.5;
        } catch (e) {
            console.error('Web Audio API not supported:', e);
        }
    }

    async resumeAudio() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    bindElements() {
        // Pack list
        this.packList = document.getElementById('packList');
        this.newPackBtn = document.getElementById('newPackBtn');

        // Sound list
        this.currentPackName = document.getElementById('currentPackName');
        this.newSoundBtn = document.getElementById('newSoundBtn');
        this.categoryFilter = document.getElementById('categoryFilter');
        this.soundList = document.getElementById('soundList');

        // Edit panel
        this.editPanel = document.getElementById('editPanel');
        this.editContent = document.getElementById('editContent');
        this.deleteSoundBtn = document.getElementById('deleteSoundBtn');
        this.soundForm = document.getElementById('soundForm');
        this.patternEditor = document.getElementById('patternEditor');
        this.previewBtn = document.getElementById('previewBtn');
        this.notesGroup = document.getElementById('notesGroup');
        this.paramsGroup = document.getElementById('paramsGroup');

        // Modal
        this.newPackModal = document.getElementById('newPackModal');
        this.modalOverlay = document.getElementById('modalOverlay');
        this.newPackName = document.getElementById('newPackName');
        this.createPackBtn = document.getElementById('createPackBtn');
        this.cancelPackBtn = document.getElementById('cancelPackBtn');

        // Toast
        this.toast = document.getElementById('toast');
    }

    setupEventListeners() {
        // Pack operations
        this.newPackBtn.addEventListener('click', () => this.showNewPackModal());
        this.createPackBtn.addEventListener('click', () => this.createPack());
        this.cancelPackBtn.addEventListener('click', () => this.hideNewPackModal());
        this.modalOverlay.addEventListener('click', () => this.hideNewPackModal());

        // Sound operations
        this.newSoundBtn.addEventListener('click', () => this.createNewSound());
        this.deleteSoundBtn.addEventListener('click', () => this.deleteSound());
        this.soundForm.addEventListener('submit', (e) => this.saveSound(e));
        this.previewBtn.addEventListener('click', () => this.previewSound());

        // Category filter
        this.categoryFilter.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                this.setFilter(e.target.dataset.category);
            }
        });

        // Pattern editor
        this.patternEditor.addEventListener('click', (e) => {
            const step = e.target.closest('.pattern-step');
            if (step) {
                this.togglePatternStep(parseInt(step.dataset.step));
            }
        });

        // Category change affects visible options
        document.getElementById('soundCategory').addEventListener('change', (e) => {
            this.updateFormForCategory(e.target.value);
        });

        // Keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideNewPackModal();
            }
        });

        // Enter key for modal
        this.newPackName.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.createPack();
            }
        });
    }

    populateNoteSelects() {
        const notes = [
            'C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2',
            'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3',
            'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4',
            'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5'
        ];

        for (let i = 0; i < 4; i++) {
            const select = document.getElementById(`note${i}`);
            select.innerHTML = notes.map(note =>
                `<option value="${note}">${note}</option>`
            ).join('');
        }
    }

    // ===== Pack Management =====
    renderPackList() {
        const packs = packManager.getAllPacks();
        this.packList.innerHTML = packs.map(pack => `
            <div class="pack-item ${pack.id === this.selectedPackId ? 'selected' : ''} ${pack.isDefault ? 'default' : ''}"
                 data-pack-id="${pack.id}">
                <div class="pack-name">${this.escapeHtml(pack.name)}</div>
                <div class="pack-info">${Object.keys(pack.sounds).length} SOUNDS</div>
            </div>
        `).join('');

        // Click handlers
        this.packList.querySelectorAll('.pack-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectPack(item.dataset.packId);
            });
        });
    }

    selectPack(packId) {
        this.selectedPackId = packId;
        this.selectedSoundId = null;

        // Update UI
        this.renderPackList();

        const pack = packManager.getPack(packId);
        if (pack) {
            this.currentPackName.textContent = pack.name;
            this.newSoundBtn.disabled = false;
            this.renderSoundList();
        }

        // Clear edit panel
        this.clearEditPanel();
    }

    showNewPackModal() {
        this.newPackName.value = '';
        this.newPackModal.classList.add('visible');
        this.modalOverlay.classList.add('visible');
        this.newPackName.focus();
    }

    hideNewPackModal() {
        this.newPackModal.classList.remove('visible');
        this.modalOverlay.classList.remove('visible');
    }

    createPack() {
        const name = this.newPackName.value.trim().toUpperCase();
        if (!name) {
            this.showToast('ENTER PACK NAME', true);
            return;
        }

        const packId = packManager.createPack(name);
        this.hideNewPackModal();
        this.renderPackList();
        this.selectPack(packId);
        this.showToast('PACK CREATED!');
    }

    // ===== Sound Management =====
    renderSoundList() {
        if (!this.selectedPackId) {
            this.soundList.innerHTML = '<div class="empty-message">SELECT A PACK</div>';
            return;
        }

        const pack = packManager.getPack(this.selectedPackId);
        if (!pack) return;

        const sounds = Object.entries(pack.sounds);
        const filteredSounds = this.currentFilter === 'all'
            ? sounds
            : sounds.filter(([_, s]) => s.category === this.currentFilter);

        if (filteredSounds.length === 0) {
            this.soundList.innerHTML = '<div class="empty-message">NO SOUNDS</div>';
            return;
        }

        this.soundList.innerHTML = filteredSounds.map(([soundId, sound]) => `
            <div class="sound-item ${soundId === this.selectedSoundId ? 'selected' : ''}"
                 data-sound-id="${soundId}">
                <div class="sound-icon">${sound.icon || '♪'}</div>
                <div class="sound-name">${this.escapeHtml(sound.name)}</div>
                <div class="sound-category">${sound.category}</div>
            </div>
        `).join('');

        // Click handlers
        this.soundList.querySelectorAll('.sound-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectSound(item.dataset.soundId);
            });
        });
    }

    setFilter(category) {
        this.currentFilter = category;

        // Update filter buttons
        this.categoryFilter.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });

        this.renderSoundList();
    }

    selectSound(soundId) {
        this.selectedSoundId = soundId;
        this.isNewSound = false;
        this.renderSoundList();
        this.loadSoundToEditor(soundId);
    }

    createNewSound() {
        if (!this.selectedPackId) return;

        this.isNewSound = true;
        this.selectedSoundId = 'sound_' + Date.now();

        // Reset form
        document.getElementById('soundName').value = '';
        document.getElementById('soundCategory').value = 'beat';
        document.getElementById('soundIcon').value = '♪';
        document.getElementById('waveType').value = 'square';
        document.getElementById('isArp').checked = false;
        document.getElementById('fxType').value = 'custom';

        // Reset pattern
        this.pattern = [0, 0, 0, 0, 0, 0, 0, 0];
        this.updatePatternDisplay();

        // Reset notes
        document.getElementById('note0').value = 'C4';
        document.getElementById('note1').value = 'E4';
        document.getElementById('note2').value = 'G4';
        document.getElementById('note3').value = 'C5';

        this.updateFormForCategory('beat');

        // Update UI
        this.soundList.querySelectorAll('.sound-item').forEach(item => {
            item.classList.remove('selected');
        });

        this.showToast('NEW SOUND - EDIT & SAVE');
    }

    loadSoundToEditor(soundId) {
        const sound = packManager.getSound(this.selectedPackId, soundId);
        if (!sound) return;

        document.getElementById('soundName').value = sound.name || '';
        document.getElementById('soundCategory').value = sound.category || 'beat';
        document.getElementById('soundIcon').value = sound.icon || '♪';
        document.getElementById('waveType').value = sound.waveType || 'square';
        document.getElementById('isArp').checked = sound.isArp || false;

        if (sound.params && sound.params.type) {
            document.getElementById('fxType').value = sound.params.type;
        } else {
            document.getElementById('fxType').value = 'custom';
        }

        // Load pattern
        this.pattern = sound.pattern ? [...sound.pattern] : [0, 0, 0, 0, 0, 0, 0, 0];
        this.updatePatternDisplay();

        // Load notes
        if (sound.notes) {
            for (let i = 0; i < 4; i++) {
                document.getElementById(`note${i}`).value = sound.notes[i] || 'C4';
            }
        }

        this.updateFormForCategory(sound.category);
    }

    clearEditPanel() {
        document.getElementById('soundName').value = '';
        this.pattern = [0, 0, 0, 0, 0, 0, 0, 0];
        this.updatePatternDisplay();
    }

    togglePatternStep(stepIndex) {
        this.pattern[stepIndex] = this.pattern[stepIndex] ? 0 : 1;
        this.updatePatternDisplay();
    }

    updatePatternDisplay() {
        const steps = this.patternEditor.querySelectorAll('.pattern-step');
        steps.forEach((step, i) => {
            step.classList.toggle('active', this.pattern[i] === 1);
        });
    }

    updateFormForCategory(category) {
        const showNotes = category === 'melody' || category === 'bass';
        const showFxParams = category === 'fx';

        this.notesGroup.style.display = showNotes ? 'block' : 'none';
        this.paramsGroup.style.display = showFxParams ? 'block' : 'none';
    }

    saveSound(e) {
        e.preventDefault();

        if (!this.selectedPackId) {
            this.showToast('SELECT A PACK FIRST', true);
            return;
        }

        const name = document.getElementById('soundName').value.trim().toUpperCase();
        if (!name) {
            this.showToast('ENTER SOUND NAME', true);
            return;
        }

        const category = document.getElementById('soundCategory').value;
        const soundData = {
            name: name,
            type: category,
            category: category,
            icon: document.getElementById('soundIcon').value,
            waveType: document.getElementById('waveType').value,
            pattern: [...this.pattern],
            isArp: document.getElementById('isArp').checked
        };

        // Add notes for melody/bass
        if (category === 'melody' || category === 'bass') {
            soundData.notes = [
                document.getElementById('note0').value,
                document.getElementById('note1').value,
                document.getElementById('note2').value,
                document.getElementById('note3').value
            ];
        }

        // Add params for FX
        if (category === 'fx') {
            soundData.params = {
                type: document.getElementById('fxType').value
            };
        }

        // Save
        packManager.addSound(this.selectedPackId, this.selectedSoundId, soundData);

        this.isNewSound = false;
        this.renderSoundList();
        this.showToast('SOUND SAVED!');
    }

    deleteSound() {
        if (!this.selectedPackId || !this.selectedSoundId || this.isNewSound) {
            return;
        }

        if (confirm('DELETE THIS SOUND?')) {
            packManager.deleteSound(this.selectedPackId, this.selectedSoundId);
            this.selectedSoundId = null;
            this.renderSoundList();
            this.clearEditPanel();
            this.showToast('SOUND DELETED');
        }
    }

    // ===== Sound Preview =====
    async previewSound() {
        await this.resumeAudio();

        const category = document.getElementById('soundCategory').value;
        const waveType = document.getElementById('waveType').value;

        // Play the pattern
        const tempo = 120;
        const beatDuration = 60 / tempo / 2;

        this.pattern.forEach((active, i) => {
            if (active) {
                setTimeout(() => {
                    this.playPreviewNote(category, waveType, i);
                }, i * beatDuration * 1000);
            }
        });
    }

    playPreviewNote(category, waveType, beatIndex) {
        if (!this.audioContext) return;

        const time = this.audioContext.currentTime;

        if (category === 'beat') {
            this.playDrum(time, waveType);
        } else if (category === 'melody' || category === 'bass') {
            const noteSelect = document.getElementById(`note${beatIndex % 4}`);
            const note = noteSelect.value;
            this.playNote(time, note, waveType);
        } else if (category === 'fx') {
            const fxType = document.getElementById('fxType').value;
            this.playFx(time, fxType);
        }
    }

    playDrum(time, waveType) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = waveType;
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(30, time + 0.1);

        gain.gain.setValueAtTime(0.5, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 0.15);
    }

    playNote(time, note, waveType) {
        const freq = this.noteToFreq(note);
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = waveType;
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 0.3);
    }

    playFx(time, fxType) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'square';

        switch (fxType) {
            case 'powerup':
                osc.frequency.setValueAtTime(400, time);
                osc.frequency.linearRampToValueAtTime(800, time + 0.3);
                gain.gain.setValueAtTime(0.3, time);
                gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
                osc.start(time);
                osc.stop(time + 0.3);
                break;
            case 'coin':
                osc.frequency.setValueAtTime(988, time);
                osc.frequency.setValueAtTime(1319, time + 0.08);
                gain.gain.setValueAtTime(0.3, time);
                gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
                osc.start(time);
                osc.stop(time + 0.2);
                break;
            case 'jump':
                osc.frequency.setValueAtTime(200, time);
                osc.frequency.exponentialRampToValueAtTime(600, time + 0.15);
                gain.gain.setValueAtTime(0.3, time);
                gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
                osc.start(time);
                osc.stop(time + 0.2);
                break;
            case 'laser':
                osc.frequency.setValueAtTime(1000, time);
                osc.frequency.exponentialRampToValueAtTime(100, time + 0.2);
                gain.gain.setValueAtTime(0.3, time);
                gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
                osc.start(time);
                osc.stop(time + 0.2);
                break;
            case 'explosion':
                osc.frequency.setValueAtTime(100, time);
                osc.frequency.setValueAtTime(50, time + 0.1);
                gain.gain.setValueAtTime(0.5, time);
                gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
                osc.start(time);
                osc.stop(time + 0.4);
                break;
            default:
                osc.frequency.value = 440;
                gain.gain.setValueAtTime(0.3, time);
                gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
                osc.start(time);
                osc.stop(time + 0.2);
        }

        osc.connect(gain);
        gain.connect(this.masterGain);
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

    // ===== Utilities =====
    showToast(message, isError = false) {
        this.toast.textContent = message;
        this.toast.className = 'toast visible' + (isError ? ' error' : '');

        setTimeout(() => {
            this.toast.classList.remove('visible');
        }, 2000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.adminApp = new AdminApp();
});
