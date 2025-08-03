// Sound System - Handles all audio effects in the game
class SoundSystem {
    constructor() {
        this.sounds = {};
        this.isMuted = false;
        this.volume = 0.7; // Default volume (0.0 to 1.0)
        this.loadSounds();
    }

    loadSounds() {
        // Load winning sound
        this.sounds.winning = new Audio('sounds/winning.mp3');
        this.sounds.winning.volume = this.volume;
        
        // Load loss sound
        this.sounds.loss = new Audio('sounds/loss.wav');
        this.sounds.loss.volume = this.volume;
        
        console.log('Sound system initialized with winning and loss sounds');
    }

    playSound(soundName) {
        if (this.isMuted) return;
        
        const sound = this.sounds[soundName];
        if (sound) {
            // Reset the audio to start
            sound.currentTime = 0;
            sound.play().catch(error => {
                console.log('Sound play failed:', error);
                // This is normal if user hasn't interacted with page yet
            });
        }
    }

    playWinningSound() {
        this.playSound('winning');
    }

    playLossSound() {
        this.playSound('loss');
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        Object.values(this.sounds).forEach(sound => {
            sound.volume = this.volume;
        });
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }

    isMuted() {
        return this.isMuted;
    }
}

// Create global sound system instance
window.soundSystem = new SoundSystem(); 