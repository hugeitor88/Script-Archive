export class MusicPlayer {
    constructor(audioUrl) {
        // Use global Howler object directly
        this.audioUrl = audioUrl;
        this.howl = null;
        this.isPlaying = false;
        this.setupPlayerElement();
        this.initializeHowler();
        this.setupVisualizer();
    }

    setupPlayerElement() {
        const musicPlayerContainer = document.querySelector('.music-player');
        if (!musicPlayerContainer) {
            console.error("Music player container not found.");
            return;
        }

        this.playPauseBtn = musicPlayerContainer.querySelector('#play-pause-btn');
        this.stopBtn = musicPlayerContainer.querySelector('#stop-music-btn');
        this.volumeSlider = musicPlayerContainer.querySelector('#volume-slider');

        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.stopBtn.addEventListener('click', () => this.stopMusic());
        this.volumeSlider.addEventListener('input', (e) => {
            if (this.howl) {
                this.howl.volume(parseFloat(e.target.value));
            }
        });
    }

    initializeHowler() {
        try {
            // Use global Howler object (Howl is now global)
            this.howl = new Howl({
                src: [this.audioUrl],
                html5: true,
                loop: true,
                volume: 1.0,
                onload: () => {
                    console.log('Audio loaded successfully');
                },
                onloaderror: (id, error) => console.error('Howler Load Error:', error),
                onplayerror: (id, error) => console.error('Howler Play Error:', error),
                onplay: () => {
                    this.isPlaying = true;
                    this.updatePlayPauseButton();
                    this.startVisualizer();
                },
                onpause: () => {
                    this.isPlaying = false;
                    this.updatePlayPauseButton();
                    this.stopVisualizer();
                },
                onstop: () => {
                    this.isPlaying = false;
                    this.updatePlayPauseButton();
                    this.stopVisualizer();
                }
            });
        } catch (error) {
            console.error('Howler initialization error:', error);
        }
    }

    updatePlayPauseButton() {
        if (!this.playPauseBtn) return;
        
        if (this.isPlaying) {
            this.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            this.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    }

    togglePlayPause() {
        if (!this.howl) return;

        if (this.isPlaying) {
            this.howl.pause();
        } else {
            this.howl.play();
        }
    }

    stopMusic() {
        if (this.howl) {
            this.howl.stop();
        }
    }

    setupVisualizer() {
        // Get visualizer bars
        this.visualizerBars = document.querySelectorAll('.audio-visualizer .bar');
        
        // Initialize bars to default state
        if (this.visualizerBars) {
            this.visualizerBars.forEach(bar => {
                bar.style.height = '5px';
                bar.style.backgroundColor = 'rgba(106, 17, 203, 0.5)';
            });
        }
    }

    startVisualizer() {
        this.visualizerInterval = setInterval(() => {
            this.visualizerBars.forEach((bar, index) => {
                const randomHeight = Math.random() * 30 + 5;
                bar.style.height = `${randomHeight}px`;
                bar.style.backgroundColor = `hsla(${280 + index}, 80%, 60%, 0.8)`;
            });
        }, 100);
    }

    stopVisualizer() {
        if (this.visualizerInterval) {
            clearInterval(this.visualizerInterval);
        }
        this.visualizerBars.forEach(bar => {
            bar.style.height = '5px';
            bar.style.backgroundColor = 'rgba(106, 17, 203, 0.5)';
        });
    }
}