class AudioManager {
    constructor() {
        this.sounds = {};
        this.loadSounds();
    }

    loadSounds() {
        this.sounds.jump = new Audio('sounds/jump.mp3');
        this.sounds.crash = new Audio('sounds/crash.mp3');
        this.sounds.background = new Audio('sounds/background.mp3');
        this.sounds.background.loop = true;
    }

    play(soundName) {
        if (this.sounds[soundName]) {
            this.sounds[soundName].currentTime = 0;
            this.sounds[soundName].play();
        }
    }

    stopBackground() {
        this.sounds.background.pause();
        this.sounds.background.currentTime = 0;
    }

    startBackground() {
        this.sounds.background.play();
    }
} 