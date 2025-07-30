// Fixed Pseudo-3D Racing Game - Based on working index.html implementation

// Game constants - matching working version
const GAME_WIDTH = 1000;
const GAME_HEIGHT = 650;
const HALF_WIDTH = GAME_WIDTH / 2;
const ROAD_WIDTH = 4000;
const SEGMENT_LENGTH = 200;
const CAMERA_DEPTH = 0.2;
const CAMERA_HEIGHT = 1500;
const N = 70; // Number of road segments - critical!

// Speed constants
const MAX_SPEED = 200;
const ACCEL = 38;
const BREAKING = -80;
const DECEL = -40;
const MAX_OFF_SPEED = 40;
const OFF_DECEL = -70;
const ENEMY_SPEED = 8;
const HIT_SPEED = 20;

// Lane positions
const LANES = {
    A: -2.3,
    B: -0.5,
    C: 1.2
};

// Colors
const COLORS = {
    TAR: ['#959298', '#9c9a9d'],
    RUMBLE: ['#959298', '#f5f2f6'],
    GRASS: ['#eedccd', '#e6d4c5']
};

// Game states
const GAME_STATES = {
    INTRO: 'intro',
    VEHICLE_SELECT: 'vehicle',
    DRIVER_SELECT: 'driver',
    RACING: 'racing',
    GAME_OVER: 'gameover'
};

// Vehicle data
const VEHICLES = [
    { name: 'Laravel Lambo', speed: 220, accel: 40, img: '/img/lambo.jpg', sprite: '/img/hero-hires.png', width: 110, height: 53 },
    { name: 'TypeScript Truck', speed: 180, accel: 35, img: '/img/truck.jpg', sprite: '/img/hero-truck-hires.png', width: 110, height: 72 },
    { name: 'CSS Cycle', speed: 260, accel: 45, img: '/img/motorcycle.jpg', sprite: '/img/hero-cycle-hires.png', width: 49, height: 53 }
];

const DRIVERS = [
    { name: 'TAYLOR OTWELL', img: '/img/taylor-otwell.png' },
    { name: 'ADAM WATHAN', img: '/img/adam-wathan.png' },
    { name: 'EVAN YOU', img: '/img/evan-you.png' }
];

// Powerup data
const POWERUPS = [
    {
        type: 'laravel',
        src: '/img/powerup-laravel.png',
        width: 50,
        height: 50,
        vehicleBonus: 'Laravel Lambo',
        driverBonus: 'TAYLOR OTWELL'
    },
    {
        type: 'vue',
        src: '/img/powerup-vue.png',
        width: 50,
        height: 50,
        vehicleBonus: 'TypeScript Truck',
        driverBonus: 'EVAN YOU'
    },
    {
        type: 'tailwind',
        src: '/img/powerup-tailwind.png',
        width: 50,
        height: 50,
        vehicleBonus: 'CSS Cycle',
        driverBonus: 'ADAM WATHAN'
    }
];

// Obstacle car sprites - scaled down from original high-res dimensions
const OBSTACLE_CARS = [
    { src: '/img/car1.png', width: 55, height: 48 }, // Scaled from 1375x1189
    { src: '/img/car2.png', width: 60, height: 41 }, // Scaled from 1709x1169
    { src: '/img/car3.png', width: 50, height: 34 }  // Scaled from 1202x806
];

// Audio assets
const AUDIO_ASSETS = {
    engine: '/audio/engine.wav',      // Engine sound with pitch based on speed
    gameover: '/audio/gameover.wav',  // Game over when out of lives
    honk: '/audio/honk.wav',         // Collision honk variant 1
    honk2: '/audio/honk2.wav',       // Collision honk variant 2
    invincible: '/audio/invincible.wav', // Invincibility powerup
    menu1: '/audio/menu1.wav',       // Menu navigation sound 1
    menu2: '/audio/menu2.wav',       // Menu navigation sound 2
    powerup: '/audio/powerup.wav',   // Standard powerup (no invincibility)
    win: '/audio/win.wav',           // Race completion win sound
    countdown: '/audio/countdown.wav' // Countdown sound at race start
};

// Helper functions
Number.prototype.pad = function (numZeros, char = 0) {
    let n = Math.abs(this);
    let zeros = Math.max(0, numZeros - Math.floor(n).toString().length);
    let zeroString = Math.pow(10, zeros).toString().substr(1).replace(0, char);
    return zeroString + n;
};

Number.prototype.clamp = function (min, max) {
    return Math.max(min, Math.min(this, max));
};

const accelerate = (v, accel, dt) => v + accel * dt;
const isCollide = (x1, w1, x2, w2) => (x1 - x2) ** 2 <= (w2 + w1) ** 2;

function getRand(min, max) {
    return (Math.random() * (max - min) + min) | 0;
}

function randomProperty(obj) {
    let keys = Object.keys(obj);
    return obj[keys[(keys.length * Math.random()) << 0]];
}

// Proper drawQuad function from working version
function drawQuad(element, layer, color, x1, y1, w1, x2, y2, w2) {
    element.style.zIndex = layer;
    element.style.background = color;
    element.style.top = y2 + 'px';
    element.style.left = x1 - w1 / 2 - w1 + 'px';
    element.style.width = w1 * 3 + 'px';
    element.style.height = y1 - y2 + 1 + 'px';

    let leftOffset = w1 + x2 - x1 + Math.abs(w2 / 2 - w1 / 2);
    element.style.clipPath = `polygon(${leftOffset}px 0, ${leftOffset + w2}px 0, 66.66% 100%, 33.33% 100%)`;
}

// Line class - matches working version
class Line {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.z = 0;

        this.X = 0;
        this.Y = 0;
        this.W = 0;

        this.curve = 0;
        this.scale = 0;

        this.elements = [];
        this.special = null;
    }

    project(camX, camY, camZ) {
        this.scale = CAMERA_DEPTH / (this.z - camZ);
        this.X = (1 + this.scale * (this.x - camX)) * HALF_WIDTH;
        this.Y = Math.round(((1 - this.scale * (this.y - camY)) * GAME_HEIGHT) / 2);
        this.W = this.scale * ROAD_WIDTH * HALF_WIDTH;
    }

    clearSprites() {
        for (let e of this.elements) e.style.background = 'transparent';
    }

    drawSprite(depth, layer, sprite, offset) {
        let destX = this.X + this.scale * HALF_WIDTH * offset;
        let destY = this.Y + 4;
        let destW = (sprite.width * this.W) / 200;
        let destH = (sprite.height * this.W) / 200;

        destX += destW * offset;
        destY += destH * -1;

        let obj = layer instanceof Element ? layer : this.elements[layer + 6];
        obj.style.background = `url('${sprite.src}') no-repeat`;
        obj.style.backgroundSize = `${destW}px ${destH}px`;
        obj.style.left = destX + 'px';
        obj.style.top = destY + 'px';
        obj.style.width = destW + 'px';
        obj.style.height = destH + 'px';
        obj.style.zIndex = depth;
    }
}

// Car class - matches working version
class Car {
    constructor(pos, type, lane) {
        this.pos = pos;
        this.type = type;
        this.lane = lane;

        var element = document.createElement('div');
        element.style.position = 'absolute';
        document.getElementById('road').appendChild(element);
        this.element = element;
    }
}

// Powerup class - fixed position, different behavior than cars
class Powerup {
    constructor(pos, type, lane) {
        this.pos = pos;
        this.type = type;
        this.lane = lane;
        this.collected = false;

        var element = document.createElement('div');
        element.style.position = 'absolute';
        document.getElementById('road').appendChild(element);
        this.element = element;
    }
}

// Audio class - Web Audio API implementation
class GameAudio {
    constructor() {
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

            // Volume control
            this.masterGain = this.audioCtx.createGain();
            this.masterGain.connect(this.audioCtx.destination);
            this.masterGain.gain.value = 0.7; // Default volume

            this.files = {};
            this.isLoaded = false;
            this.isMuted = false;

        } catch (e) {
            console.warn('Web Audio API not supported, audio disabled');
            this.audioCtx = null;
        }
    }

    get volume() {
        return this.audioCtx ? this.masterGain.gain.value : 0;
    }

    set volume(level) {
        if (this.audioCtx) {
            this.masterGain.gain.value = level;
        }
    }

    mute() {
        this.isMuted = !this.isMuted;
        this.volume = this.isMuted ? 0 : 0.7;
    }

    async loadAll() {
        if (!this.audioCtx) return;

        const loadPromises = Object.entries(AUDIO_ASSETS).map(([key, src]) =>
            this.load(src, key)
        );

        try {
            await Promise.all(loadPromises);
            this.isLoaded = true;
            console.log('All audio files loaded successfully');
        } catch (error) {
            console.warn('Some audio files failed to load:', error);
        }
    }

    load(src, key) {
        return new Promise((resolve, reject) => {
            if (!this.audioCtx) {
                resolve();
                return;
            }

            const request = new XMLHttpRequest();
            request.open('GET', src, true);
            request.responseType = 'arraybuffer';

            request.onload = () => {
                this.audioCtx.decodeAudioData(
                    request.response,
                    (buffer) => {
                        this.files[key] = buffer;
                        resolve();
                    },
                    (error) => {
                        console.warn(`Failed to decode audio: ${src}`, error);
                        resolve(); // Don't reject, just continue without this audio
                    }
                );
            };

            request.onerror = () => {
                console.warn(`Failed to load audio: ${src}`);
                resolve(); // Don't reject, just continue without this audio
            };

            request.send();
        });
    }

    play(key, options = {}) {
        if (!this.audioCtx || !this.files[key] || this.isMuted) return null;

        try {
            const source = this.audioCtx.createBufferSource();
            source.buffer = this.files[key];

            // Create gain node for individual sound volume
            const gainNode = this.audioCtx.createGain();
            gainNode.gain.value = options.volume || 1.0;

            source.connect(gainNode);
            gainNode.connect(this.masterGain);

            // Apply options
            if (options.loop) source.loop = true;
            if (options.pitch) source.detune.value = options.pitch;
            if (options.playbackRate) source.playbackRate.value = options.playbackRate;

            source.start(0);
            return source;
        } catch (error) {
            console.warn(`Failed to play audio: ${key}`, error);
            return null;
        }
    }

    playEngine(speed) {
        // Play engine sound with pitch based on speed
        if (speed > 0) {
            const pitch = speed * 8; // Adjust multiplier for desired effect
            this.play('engine', { pitch, volume: 0.3 });
        }
    }

    playCollision() {
        // Randomly choose between honk variants
        const honkVariant = Math.random() < 0.5 ? 'honk' : 'honk2';
        this.play(honkVariant, { volume: 0.8 });
    }

    playPowerupStandard() {
        // Standard powerup (no invincibility)
        this.play('powerup', { volume: 0.6 });
    }

    playPowerupInvincible() {
        // Invincibility-granting powerup
        this.play('invincible', { volume: 0.7 });
    }

    playMenu1() {
        // Menu navigation sound 1
        this.play('menu1', { volume: 0.5 });
    }

    playMenu2() {
        // Menu navigation sound 2 (opposite/alternative)
        this.play('menu2', { volume: 0.5 });
    }

    playGameOver() {
        // Game over when running out of lives
        this.play('gameover', { volume: 0.8 });
    }

    playWin() {
        // Race completion win sound
        this.play('win', { volume: 0.8 });
    }

    playCountdown() {
        // Countdown sound at race start
        this.play('countdown', { volume: 0.7 });
    }
}

// Main game class
class FixedRacer {
    constructor() {
        this.gameState = GAME_STATES.INTRO;
        this.selectedVehicle = null;
        this.selectedDriver = null;
        this.currentVehicleIndex = 0;
        this.currentDriverIndex = 0;

        // Player info for leaderboard
        this.playerName = '';
        this.githubUsername = '';

        // Game variables - match working version naming
        this.inGame = false;
        this.start = 0;
        this.playerX = 0;
        this.speed = 0;
        this.scoreVal = 0;
        this.pos = 0;
        this.cloudOffset = 0;
        this.sectionProg = 0;
        this.mapIndex = 0;
        this.countDown = 0;
        this.lives = 3;
        this.lastCollisionTime = 0; // Track last collision time
        this.collisionCooldown = 1000; // 1 second cooldown between collisions
        this.raceCompleted = false; // Track if race was completed vs failed

        // Powerup system
        this.powerups = [];
        this.invincible = false;
        this.invincibilityEndTime = 0;
        this.lastPowerupSpawn = 0;
        this.powerupSpawnCooldown = 5000; // 5 seconds minimum between powerups

        // Vehicle stats
        this.maxSpeed = MAX_SPEED; // Default to original max speed
        this.vehicleAccel = ACCEL;  // Default to original accel

        // Road segments
        this.lines = [];
        this.cars = [];
        this.map = [];

        // Input
        this.keys = {};

        // Audio system
        this.audio = new GameAudio();

        this.init();
    }

    async init() {
        this.setupDOM();
        this.setupInput();
        this.generateMap();
        this.createRoad();
        this.spawnCars();

        // Load audio files
        await this.audio.loadAll();

        this.showIntroScreen();
        this.startGameLoop();
    }

    setupDOM() {
        const gameContainer = document.getElementById('game-container');
        gameContainer.innerHTML = `
            <div id="game" style="width: ${GAME_WIDTH}px; height: ${GAME_HEIGHT}px; position: relative; margin: 0 auto; overflow: hidden; background: #222;">
                <div id="road" style="position: absolute; width: 100%; height: 100%;">
                    <div id="cloud" style="background-size: auto 100%; width: 100%; height: 100%; position: absolute;"></div>
                    <div id="hero" style="position: absolute; background: url('/img/hero.png') no-repeat; background-position: -110px 0; width: 110px; height: 56px; z-index: 2000; display: none; transform: scale(1.75);"></div>
                </div>
                <div id="hud" style="position: absolute; width: 100%; height: 100%; z-index: 1000; display: none;">
                    <div style="position: absolute; top: 25px; left: 50%; transform: translateX(-50%); display: flex; gap: 40px; align-items: center;">
                        <!-- Score -->
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="background: white; color: #ffffff; border: 2px solid #ffffff; border-radius: 15px; padding: 4px 12px; font-family: 'Press Start 2P', monospace; font-size: 10px; background: white; color: black;">SCORE</span>
                            <span id="score" style="color: #ffffff; font-family: 'Press Start 2P', monospace; font-size: 16px; text-shadow: -2px 0 black, 0 2px black, 2px 0 black, 0 -2px black; letter-spacing: 1px;">0</span>
                        </div>
                        <!-- Distance -->
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="background: white; color: #4cff00; border: 2px solid #4cff00; border-radius: 15px; padding: 4px 12px; font-family: 'Press Start 2P', monospace; font-size: 10px;">DIST</span>
                            <span id="distance-value" style="color: #4cff00; font-family: 'Press Start 2P', monospace; font-size: 16px; text-shadow: -1px 0 black, 0 1px black, 1px 0 black, 0 -1px black;">0m</span>
                        </div>
                        <!-- Lives -->
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="background: white; color: #ff0000; border: 2px solid #ff0000; border-radius: 15px; padding: 4px 12px; font-family: 'Press Start 2P', monospace; font-size: 10px;">LIVES</span>
                            <span id="lives-value" style="color: #ff0000; font-family: 'Press Start 2P', monospace; font-size: 16px; text-shadow: -1px 0 black, 0 1px black, 1px 0 black, 0 -1px black;">3</span>
                        </div>
                        <!-- Lap Time -->
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="background: white; color: #0082df; border: 2px solid #0082df; border-radius: 15px; padding: 4px 12px; font-family: 'Press Start 2P', monospace; font-size: 10px;">TIME</span>
                            <span id="lap" style="color: #0082df; font-family: 'Press Start 2P', monospace; font-size: 16px; text-shadow: -2px 0 black, 0 2px black, 2px 0 black, 0 -2px black; letter-spacing: 1px;">0'00"000</span>
                        </div>
                        <!-- Invincibility indicator -->
                        <div id="invincibility-indicator" style="display: none; align-items: center; gap: 8px;">
                            <span style="background: white; color: #ffd700; border: 2px solid #ffd700; border-radius: 15px; padding: 4px 12px; font-family: 'Press Start 2P', monospace; font-size: 10px; animation: blink 0.5s infinite;">INVINCIBLE</span>
                        </div>
                    </div>
                    <!-- Speed tacho in bottom right -->
                    <div id="tacho" style="position: absolute; text-align: right; width: 23%; bottom: 5%; z-index: 2000; color: #e62e13; text-shadow: -2px 0 black, 0 2px black, 2px 0 black, 0 -2px black; letter-spacing: 1px; font-size: 24px;">0</div>
                </div>
                <div id="menu" style="position: absolute; width: 100%; height: 100%; background: rgba(0,0,0,0.8); color: white; z-index: 3000; display: flex; flex-direction: column; justify-content: center; align-items: center; font-family: 'Press Start 2P', monospace; text-align: center;">
                    <h1 id="menu-title" style="font-size: 2.5em; margin-bottom: 20px; color: #ff6600; text-align: center;">LARACON RACER</h1>
                    <div id="menu-content"></div>
                    <div id="menu-instructions" style="margin-top: 30px; font-size: 10px; color: #ccc; text-align: center;"></div>
                </div>
            </div>
        `;

        // Hero positioning will be set dynamically when vehicle is selected

        // Set cloud background
        const cloud = document.getElementById('cloud');
        cloud.style.backgroundImage = 'url(/img/cloud.jpg)';
    }

    setupInput() {
        window.addEventListener('keydown', (e) => {
            // Allow normal typing in input fields
            if (e.target.tagName === 'INPUT') {
                // Only handle Space key for game navigation when in input fields
                if (e.code === 'Space') {
                    this.keys[e.code] = true;
                    this.handleKeyPress(e.code);
                    e.preventDefault();
                }
                return; // Don't prevent default for other keys in input fields
            }

            this.keys[e.code] = true;
            this.handleKeyPress(e.code);
            e.preventDefault();
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    handleKeyPress(keyCode) {
        // Global audio control
        if (keyCode === 'KeyM') {
            this.audio.mute();
            return;
        }

        switch (this.gameState) {
            case GAME_STATES.INTRO:
                if (keyCode === 'Space' || keyCode === 'Enter') {
                    // Validate and store player information
                    const nameInput = document.getElementById('player-name');
                    const githubInput = document.getElementById('github-username');
                    const validationMessage = document.getElementById('validation-message');

                    if (nameInput && githubInput) {
                        this.playerName = nameInput.value.trim();
                        this.githubUsername = githubInput.value.trim();

                        // Basic validation
                        if (!this.playerName || !this.githubUsername) {
                            validationMessage.style.display = 'block';
                            validationMessage.textContent = 'Please fill in both name and GitHub username';
                            return;
                        }

                        // GitHub username validation (basic)
                        const githubRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-])*[a-zA-Z0-9]$/;
                        let cleanUsername = this.githubUsername.replace(/^@/, ''); // Remove @ if present
                        if (!githubRegex.test(cleanUsername) || cleanUsername.length > 39) {
                            validationMessage.style.display = 'block';
                            validationMessage.textContent = 'Please enter a valid GitHub username';
                            return;
                        }

                        // Store clean username (without @)
                        this.githubUsername = cleanUsername;

                        // Hide validation message and proceed
                        validationMessage.style.display = 'none';
                    }

                    this.gameState = GAME_STATES.VEHICLE_SELECT;
                    this.showVehicleSelect();
                }
                // ESC on intro screen does nothing (already at first screen)
                break;

            case GAME_STATES.VEHICLE_SELECT:
                if (keyCode === 'ArrowLeft' || keyCode === 'KeyA') {
                    this.currentVehicleIndex = (this.currentVehicleIndex - 1 + VEHICLES.length) % VEHICLES.length;
                    this.showVehicleSelect();
                    this.audio.playMenu1(); // Navigation sound
                } else if (keyCode === 'ArrowRight' || keyCode === 'KeyD') {
                    this.currentVehicleIndex = (this.currentVehicleIndex + 1) % VEHICLES.length;
                    this.showVehicleSelect();
                    this.audio.playMenu1(); // Navigation sound
                } else if (keyCode === 'Space' || keyCode === 'Enter') {
                    this.selectedVehicle = VEHICLES[this.currentVehicleIndex];
                    this.gameState = GAME_STATES.DRIVER_SELECT;
                    this.showDriverSelect();
                    this.audio.playMenu2(); // Selection sound
                } else if (keyCode === 'Escape') {
                    // Go back to intro screen
                    this.gameState = GAME_STATES.INTRO;
                    this.showIntroScreen();
                    this.audio.playMenu2(); // Back sound
                }
                break;

            case GAME_STATES.DRIVER_SELECT:
                if (keyCode === 'ArrowLeft' || keyCode === 'KeyA') {
                    this.currentDriverIndex = (this.currentDriverIndex - 1 + DRIVERS.length) % DRIVERS.length;
                    this.showDriverSelect();
                    this.audio.playMenu1(); // Navigation sound
                } else if (keyCode === 'ArrowRight' || keyCode === 'KeyD') {
                    this.currentDriverIndex = (this.currentDriverIndex + 1) % DRIVERS.length;
                    this.showDriverSelect();
                    this.audio.playMenu1(); // Navigation sound
                } else if (keyCode === 'Space' || keyCode === 'Enter') {
                    this.selectedDriver = DRIVERS[this.currentDriverIndex];
                    this.gameState = GAME_STATES.RACING;
                    this.startRace();
                    // Race start sound will be handled in countdown
                } else if (keyCode === 'Escape') {
                    // Go back to vehicle selection
                    this.gameState = GAME_STATES.VEHICLE_SELECT;
                    this.showVehicleSelect();
                    this.audio.playMenu2(); // Back sound
                }
                break;

            case GAME_STATES.GAME_OVER:
                if (keyCode === 'Space' || keyCode === 'Enter') {
                    this.resetGame();
                    this.gameState = GAME_STATES.INTRO;
                    this.showIntroScreen();
                } else if (keyCode === 'Escape') {
                    // ESC also restarts from intro (same as Space)
                    this.resetGame();
                    this.gameState = GAME_STATES.INTRO;
                    this.showIntroScreen();
                }
                break;
        }
    }

    showIntroScreen() {
        const menu = document.getElementById('menu');
        const content = document.getElementById('menu-content');
        const instructions = document.getElementById('menu-instructions');

        menu.style.display = 'flex';
        content.innerHTML = `
            <div style="text-align: center; max-width: 400px;">
                <p style="font-size: 1.2em; margin-bottom: 30px; color: #ffffff;">Enter your details to compete on the leaderboard!</p>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: #ff6600; font-size: 12px; margin-bottom: 8px; text-align: left;">PLAYER NAME</label>
                    <input id="player-name" type="text" maxlength="20" placeholder="Enter your name"
                           style="width: 100%; padding: 10px; font-family: 'Press Start 2P', monospace; font-size: 10px;
                                  background: #222; color: #ffffff; border: 2px solid #ff6600; border-radius: 5px;
                                  text-align: center; outline: none;"
                           value="${this.playerName}">
                </div>

                <div style="margin-bottom: 30px;">
                    <label style="display: block; color: #ff6600; font-size: 12px; margin-bottom: 8px; text-align: left;">GITHUB USERNAME</label>
                    <input id="github-username" type="text" maxlength="39" placeholder="Enter GitHub username (without @)"
                           style="width: 100%; padding: 10px; font-family: 'Press Start 2P', monospace; font-size: 10px;
                                  background: #222; color: #ffffff; border: 2px solid #ff6600; border-radius: 5px;
                                  text-align: center; outline: none;"
                           value="${this.githubUsername}">
                </div>

                <p id="start-prompt" style="font-size: 1.8em; animation: blink 1s infinite; margin-top: 70px;">PRESS SPACE TO START</p>
                <p id="validation-message" style="color: #ff0000; font-size: 10px; margin-top: 10px; display: none;">Please fill in both name and GitHub username</p>
            </div>
        `;
        instructions.innerHTML = '';

        const style = document.createElement('style');
        style.textContent = '@keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }';
        document.head.appendChild(style);

        // Focus on name input initially
        setTimeout(() => {
            document.getElementById('player-name').focus();
        }, 100);
    }

    showVehicleSelect() {
        const content = document.getElementById('menu-content');
        content.innerHTML = `
            <h2 style="margin-bottom: 30px; font-size: 1.5em; text-align: center;">SELECT YOUR VEHICLE</h2>
            <div style="display: flex; gap: 40px; justify-content: center;">
                ${VEHICLES.map((vehicle, index) => `
                    <div style="text-align: center; border: ${index === this.currentVehicleIndex ? '4px solid #ff6600' : '2px solid #666'}; padding: 20px; border-radius: 10px; background: ${index === this.currentVehicleIndex ? 'rgba(255, 102, 0, 0.2)' : 'transparent'};">
                        <div style="width: 100%; height: 80px; background: url('${vehicle.img}') center/cover; margin: 0 auto 10px auto; border-radius: 5px;"></div>
                        <h3 style="font-size: 1.2em; color: ${index === this.currentVehicleIndex ? '#ff6600' : 'white'}; text-align: center;margin-bottom:20px;">${vehicle.name}</h3>
                        <p style="font-size: 0.9em; text-align: center;">Speed: ${vehicle.speed} MPH</p>
                        <p style="font-size: 0.9em; text-align: center;">Accel: ${vehicle.accel}</p>
                    </div>
                `).join('')}
            </div>
        `;

        document.getElementById('menu-instructions').innerHTML = '<div style="font-size: 12px; text-align: center;"><span style="color: #ff6600;font-size: 28px; letter-spacing: -10px; margin-right: 10px; position: relative; top: 2px;">← →</span> Navigate • <span style="color: #ff6600;">SPACE</span> Select • <span style="color: #ff6600;">ESC</span> Back</div>';
    }

    showDriverSelect() {
        const content = document.getElementById('menu-content');
        content.innerHTML = `
            <h2 style="margin-bottom: 30px; font-size: 1.5em; text-align: center;">SELECT YOUR DRIVER</h2>
            <div style="display: flex; gap: 40px; justify-content: center;">
                ${DRIVERS.map((driver, index) => `
                    <div style="text-align: center; border: ${index === this.currentDriverIndex ? '4px solid #ff6600' : '2px solid #666'}; padding: 20px; border-radius: 10px; background: ${index === this.currentDriverIndex ? 'rgba(255, 102, 0, 0.2)' : 'transparent'};">
                        <div style="width: 120px; height: 120px; background: url('${driver.img}') center/cover; margin: 0 auto 10px auto; border-radius: 5px;"></div>
                        <h3 style="font-size: 1.2em; color: ${index === this.currentDriverIndex ? '#ff6600' : 'white'}; text-align: center;">${driver.name}</h3>
                    </div>
                `).join('')}
            </div>
        `;

        document.getElementById('menu-instructions').innerHTML = '<div style="font-size: 12px; text-align: center;"><span style="color: #ff6600; font-size: 28px; letter-spacing: -10px; margin-right: 10px; position: relative; top: 2px;">← →</span> Navigate • <span style="color: #ff6600;">SPACE</span> Select • <span style="color: #ff6600;">ESC</span> Back</div>';
    }

    startRace() {
        // Hide menu
        document.getElementById('menu').style.display = 'none';

        // Reset game state
        this.resetGame();

        // Apply vehicle-specific stats
        this.maxSpeed = this.selectedVehicle.speed;
        this.vehicleAccel = this.selectedVehicle.accel;

        // TypeScript Truck gets an extra life
        if (this.selectedVehicle.name === 'TypeScript Truck') {
            this.lives = 4; // 3 base lives + 1 extra for truck
        } else {
            this.lives = 3; // Base lives for other vehicles
        }

        // Update lives display
        document.getElementById('lives-value').textContent = this.lives;

        // Regenerate the map to ensure we start from the beginning
        this.generateMap();

        this.inGame = false; // Keep game paused during countdown
        this.start = Date.now();

        // Show player car, HUD, and ensure road is fully opaque
        const hero = document.getElementById('hero');
        hero.style.display = 'block';
        // Set the appropriate sprite and dimensions based on selected vehicle
        hero.style.backgroundImage = `url('${this.selectedVehicle.sprite}')`;
        hero.style.width = `${this.selectedVehicle.width}px`;
        hero.style.height = `${this.selectedVehicle.height}px`;

        // Set background position and size based on vehicle type
        if (this.selectedVehicle.name === 'CSS Cycle') {
            hero.style.backgroundPosition = '-49px 0'; // Center position for high-res bike (second frame scaled)
            hero.style.backgroundSize = '147px 53px'; // Scale down the high-res sprite (385*3 frames = 1155, scaled to 147px)
        } else if (this.selectedVehicle.name === 'TypeScript Truck') {
            hero.style.backgroundPosition = '-110px 0'; // Center position for high-res truck (second frame scaled)
            hero.style.backgroundSize = '330px 72px'; // Scale down the high-res sprite (805*3 frames = 2415, scaled to 330px)
        } else if (this.selectedVehicle.name === 'Laravel Lambo') {
            hero.style.backgroundPosition = '-110px 0'; // Center position for high-res lambo (second frame scaled)
            hero.style.backgroundSize = '330px 53px'; // Scale down the high-res sprite (795*3 frames = 2385, scaled to 330px)
        } else {
            hero.style.backgroundPosition = '-110px 0'; // Center position for other cars
            hero.style.backgroundSize = 'auto';
        }

        // Reposition hero based on new dimensions
        hero.style.top = `${GAME_HEIGHT - 100}px`;
        hero.style.left = `${HALF_WIDTH - (this.selectedVehicle.width * 1.75 / 2)}px`;

        document.getElementById('hud').style.display = 'block';
        const road = document.getElementById('road');
        road.style.opacity = '1';

        // Reset HUD display values
        document.getElementById('score').textContent = (this.scoreVal | 0).pad(8);
        document.getElementById('tacho').textContent = (this.speed | 0) + ' MPH';
        document.getElementById('distance-value').textContent = `${Math.floor(this.scoreVal)}m`;
        document.getElementById('lives-value').textContent = this.lives;

        let cT = new Date(Date.now() - this.start);
        document.getElementById('lap').textContent = `${cT.getMinutes()}'${cT.getSeconds().pad(2)}"${cT.getMilliseconds().pad(3)}`;

        // Force a reflow to ensure styles are applied
        road.offsetHeight;

        // Start countdown
        this.startCountdown();
    }

    async startCountdown() {
        const hud = document.getElementById('hud');
        const countdownElement = document.createElement('div');
        countdownElement.id = 'countdown';
        countdownElement.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 80px;
            font-family: 'Press Start 2P', monospace;
            color: #ff0000;
            text-shadow: 0 0 10px #000;
            z-index: 5000;
        `;
        hud.appendChild(countdownElement);

        // Play countdown sound when countdown starts
        this.audio.playCountdown();

        // Countdown sequence
        for (let i = 3; i > 0; i--) {
            countdownElement.textContent = i;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Remove countdown element
        countdownElement.remove();

        // Start the game
        this.inGame = true;
    }

    generateMap() {
        this.map = [];
        const mapLength = 15000;

        for (var i = 0; i < mapLength; i += getRand(0, 50)) {
            let section = {
                from: i,
                to: (i = i + getRand(300, 600))
            };

            let randHeight = getRand(-5, 5);
            let randCurve = getRand(5, 30) * (Math.random() >= 0.5 ? 1 : -1);
            let randInterval = getRand(20, 40);

            if (Math.random() > 0.9) {
                Object.assign(section, {
                    curve: (_) => randCurve,
                    height: (_) => randHeight
                });
            } else if (Math.random() > 0.8) {
                Object.assign(section, {
                    curve: (_) => 0,
                    height: (i) => Math.sin(i / randInterval) * 1000
                });
            } else if (Math.random() > 0.8) {
                Object.assign(section, {
                    curve: (_) => 0,
                    height: (_) => randHeight
                });
            } else {
                Object.assign(section, {
                    curve: (_) => randCurve,
                    height: (_) => 0
                });
            }

            this.map.push(section);
        }

        this.map.push({
            from: i,
            to: i + N,
            curve: (_) => 0,
            height: (_) => 0,
            special: { src: '/img/finish.png', width: 339, height: 180, offset: -0.5 }
        });
        this.map.push({ from: Infinity });
    }

    createRoad() {
        const roadContainer = document.getElementById('road');

        for (let i = 0; i < N; i++) {
            const line = new Line();
            line.z = i * SEGMENT_LENGTH + 270;

            // Create 8 DOM elements for each line (6 road + 2 sprites)
            for (let j = 0; j < 6 + 2; j++) {
                const element = document.createElement('div');
                element.style.position = 'absolute';
                roadContainer.appendChild(element);
                line.elements.push(element);
            }

            this.lines.push(line);
        }
    }

    spawnCars() {
        this.cars = [];

        // Position cars well ahead of the player to prevent any immediate collisions
        // Using positions that ensure they start well ahead and in different lanes
        // Each car randomly selects from the new obstacle car sprites
        this.cars.push(new Car(30, OBSTACLE_CARS[Math.floor(Math.random() * OBSTACLE_CARS.length)], LANES.A));  // Far ahead in left lane
        this.cars.push(new Car(35, OBSTACLE_CARS[Math.floor(Math.random() * OBSTACLE_CARS.length)], LANES.C));  // Far ahead in right lane
        this.cars.push(new Car(40, OBSTACLE_CARS[Math.floor(Math.random() * OBSTACLE_CARS.length)], LANES.B));  // Far ahead in center lane
        this.cars.push(new Car(50, OBSTACLE_CARS[Math.floor(Math.random() * OBSTACLE_CARS.length)], LANES.A));  // Even further in left lane
        this.cars.push(new Car(55, OBSTACLE_CARS[Math.floor(Math.random() * OBSTACLE_CARS.length)], LANES.C));  // Even further in right lane
        this.cars.push(new Car(65, OBSTACLE_CARS[Math.floor(Math.random() * OBSTACLE_CARS.length)], LANES.B));  // Even further in center lane
        this.cars.push(new Car(70, OBSTACLE_CARS[Math.floor(Math.random() * OBSTACLE_CARS.length)], LANES.A));  // Furthest in left lane
    }

    spawnPowerup() {
        const now = Date.now();

        // Only spawn if enough time has passed and random chance (much rarer than cars)
        if (now - this.lastPowerupSpawn > this.powerupSpawnCooldown && Math.random() < 0.02) {
            // Random powerup type
            const powerupType = POWERUPS[Math.floor(Math.random() * POWERUPS.length)];

            // Random lane
            const lanes = Object.values(LANES);
            const randomLane = lanes[Math.floor(Math.random() * lanes.length)];

            // Fixed position far ahead of player
            const powerupPos = 60 + Math.random() * 20; // Between positions 60-80

            const powerup = new Powerup(powerupPos, powerupType, randomLane);
            this.powerups.push(powerup);

            this.lastPowerupSpawn = now;
        }
    }

    collectPowerup(powerup) {
        const baseScore = 500;
        let totalScore = baseScore;
        let vehicleBonus = 0;
        let driverBonus = 0;
        let invincibilityGranted = false;

        // Check vehicle bonus
        if (this.selectedVehicle.name === powerup.type.vehicleBonus) {
            vehicleBonus = 250;
            totalScore += vehicleBonus;
        }

        // Check driver bonus
        if (this.selectedDriver.name === powerup.type.driverBonus) {
            driverBonus = 250;
            totalScore += driverBonus;
        }

        // Check for perfect match (both vehicle and driver bonus)
        if (vehicleBonus > 0 && driverBonus > 0) {
            // Grant 10 seconds of invincibility
            this.invincible = true;
            this.invincibilityEndTime = Date.now() + 10000; // 10 seconds
            invincibilityGranted = true;
        }

        // Add score
        this.scoreVal += totalScore;

        // Play sound effects
        if (invincibilityGranted) {
            this.audio.playPowerupInvincible();
        } else {
            this.audio.playPowerupStandard();
        }

        // Show powerup collection feedback (you could add visual effects here)
        console.log(`Collected ${powerup.type.type} powerup! Score: +${totalScore}${invincibilityGranted ? ' + Invincibility!' : ''}`);
    }

    startGameLoop() {
        let then = Date.now();
        const targetFrameRate = 1000 / 25;

        const gameLoop = () => {
            requestAnimationFrame(gameLoop);

            let now = Date.now();
            let delta = now - then;

            if (delta > targetFrameRate) {
                then = now - (delta % targetFrameRate);
                if (this.gameState === GAME_STATES.RACING) {
                    this.update(delta / 1000);
                }
            }
        };

        requestAnimationFrame(gameLoop);
    }

    update(step) {
        // Match the working version exactly
        this.pos += this.speed;
        while (this.pos >= N * SEGMENT_LENGTH) this.pos -= N * SEGMENT_LENGTH;
        while (this.pos < 0) this.pos += N * SEGMENT_LENGTH;

        var startPos = (this.pos / SEGMENT_LENGTH) | 0;
        let endPos = (startPos + N - 1) % N;

        this.scoreVal += this.speed * step;
        this.countDown -= step;

        // Player movement - match working version
        this.playerX -= (this.lines[startPos].curve / 5000) * step * this.speed;

        const hero = document.getElementById('hero');
        if (this.keys['ArrowRight'] || this.keys['KeyD']) {
            if (this.selectedVehicle.name === 'CSS Cycle') {
                hero.style.backgroundPosition = `-98px 0`; // Right turn for high-res bike (third frame scaled)
            } else if (this.selectedVehicle.name === 'TypeScript Truck') {
                hero.style.backgroundPosition = '-220px 0'; // Right turn for high-res truck (third frame scaled)
            } else if (this.selectedVehicle.name === 'Laravel Lambo') {
                hero.style.backgroundPosition = '-220px 0'; // Right turn for high-res lambo (third frame scaled)
            } else {
                hero.style.backgroundPosition = '-220px 0'; // Right turn for cars
            }
            this.playerX += 0.007 * step * this.speed;
        } else if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
            hero.style.backgroundPosition = '0 0'; // Left turn (same for all)
            this.playerX -= 0.007 * step * this.speed;
        } else {
            if (this.selectedVehicle.name === 'CSS Cycle') {
                hero.style.backgroundPosition = '-49px 0'; // Center position for high-res bike (second frame scaled)
            } else if (this.selectedVehicle.name === 'TypeScript Truck') {
                hero.style.backgroundPosition = '-110px 0'; // Center position for high-res truck (second frame scaled)
            } else if (this.selectedVehicle.name === 'Laravel Lambo') {
                hero.style.backgroundPosition = '-110px 0'; // Center position for high-res lambo (second frame scaled)
            } else {
                hero.style.backgroundPosition = '-110px 0'; // Center position for cars
            }
        }

        this.playerX = this.playerX.clamp(-3, 3);

        // Speed control - using vehicle-specific stats
        if (this.inGame && (this.keys['ArrowUp'] || this.keys['KeyW'])) {
            this.speed = accelerate(this.speed, this.vehicleAccel, step); // Use vehicle accel
        } else if (this.keys['ArrowDown'] || this.keys['KeyS']) {
            this.speed = accelerate(this.speed, BREAKING, step);
        } else {
            this.speed = accelerate(this.speed, DECEL, step);
        }

        if (Math.abs(this.playerX) > 0.55 && this.speed >= MAX_OFF_SPEED) {
            this.speed = accelerate(this.speed, OFF_DECEL, step);
        }

        this.speed = this.speed.clamp(0, this.maxSpeed); // Use vehicle max speed

        // Update map
        let current = this.map[this.mapIndex];
        let use = current.from < this.scoreVal && current.to > this.scoreVal;
        if (use) this.sectionProg += this.speed * step;
        this.lines[endPos].curve = use ? current.curve(this.sectionProg) : 0;
        this.lines[endPos].y = use ? current.height(this.sectionProg) : 0;
        this.lines[endPos].special = null;

        if (current.to <= this.scoreVal) {
            this.mapIndex++;
            this.sectionProg = 0;
            this.lines[endPos].special = this.map[this.mapIndex].special;
        }

        // Game over conditions
        if (!this.inGame) {
            this.speed = accelerate(this.speed, BREAKING, step);
            this.speed = this.speed.clamp(0, MAX_SPEED);
        } else if (this.countDown <= 0 || this.lines[startPos].special) {
            this.raceCompleted = true; // Player completed the race
            this.gameOver();
        } else {
            // Update UI
            document.getElementById('score').textContent = (this.scoreVal | 0).pad(8);
            document.getElementById('tacho').textContent = (this.speed | 0) + ' MPH';

            // Update new HUD elements
            document.getElementById('distance-value').textContent = `${Math.floor(this.scoreVal)}m`;
            document.getElementById('lives-value').textContent = this.lives;

            let cT = new Date(Date.now() - this.start);
            document.getElementById('lap').textContent = `${cT.getMinutes()}'${cT.getSeconds().pad(2)}"${cT.getMilliseconds().pad(3)}`;
        }

        // Engine sound based on speed
        if (this.inGame && this.speed > 0) {
            this.audio.playEngine(this.speed);
        }

        // Update cloud background
        const cloud = document.getElementById('cloud');
        this.cloudOffset -= this.lines[startPos].curve * step * this.speed * 0.13;
        cloud.style.backgroundPosition = `${this.cloudOffset | 0}px 0`;

        // Update cars - match working version
        for (let car of this.cars) {
            car.pos = (car.pos + ENEMY_SPEED * step) % N;

            // Respawn
            if ((car.pos | 0) === endPos) {
                if (this.speed < 30) car.pos = startPos;
                else car.pos = endPos - 2;
                car.lane = randomProperty(LANES);
                // Randomize car type on respawn for more variety
                car.type = OBSTACLE_CARS[Math.floor(Math.random() * OBSTACLE_CARS.length)];
            }

            // Collision - only check if game is actually running (not during countdown)
            if (this.inGame) {
                const offsetRatio = 5;
                if ((car.pos | 0) === startPos &&
                    isCollide(this.playerX * offsetRatio + LANES.B, 0.5, car.lane, 0.5)) {
                    // Check if enough time has passed since last collision AND not invincible
                    const now = Date.now();
                    if (!this.invincible && now - this.lastCollisionTime > this.collisionCooldown) {
                        this.speed = Math.min(HIT_SPEED, this.speed);
                        this.lives--;
                        this.lastCollisionTime = now; // Update last collision time

                        // Update lives display immediately
                        document.getElementById('lives-value').textContent = this.lives;

                        this.audio.playCollision(); // Collision sound
                        console.log('Car collision! Lives:', this.lives);
                        if (this.lives <= 0) {
                            this.gameOver();
                        }
                    }
                }
            }
        }

        // Update powerups - they don't move like cars, they're fixed positions
        if (this.inGame) {
            // Try to spawn new powerups
            this.spawnPowerup();

            // Update invincibility
            const now = Date.now();
            if (this.invincible && now > this.invincibilityEndTime) {
                this.invincible = false;
                document.getElementById('invincibility-indicator').style.display = 'none';
            }

            // Update invincibility indicator visibility
            const invincibilityIndicator = document.getElementById('invincibility-indicator');
            if (this.invincible) {
                invincibilityIndicator.style.display = 'flex';
            } else {
                invincibilityIndicator.style.display = 'none';
            }

            // Check powerup collisions
            for (let i = this.powerups.length - 1; i >= 0; i--) {
                const powerup = this.powerups[i];

                // Remove powerups that are behind the player (using a more lenient check)
                if (powerup.pos < (this.pos / SEGMENT_LENGTH) - 10) {
                    powerup.element.remove();
                    this.powerups.splice(i, 1);
                    continue;
                }

                // Check collision with player
                const offsetRatio = 5;
                if ((powerup.pos | 0) === startPos &&
                    isCollide(this.playerX * offsetRatio + LANES.B, 0.5, powerup.lane, 0.5) &&
                    !powerup.collected) {

                    // Collect powerup
                    powerup.collected = true;
                    this.collectPowerup(powerup);

                    // Remove from game
                    powerup.element.remove();
                    this.powerups.splice(i, 1);
                }
            }
        }

        this.render(startPos);
    }

    render(startPos) {
        // Draw road - match working version exactly
        let maxy = GAME_HEIGHT;
        let camH = CAMERA_HEIGHT + this.lines[startPos].y;
        let x = 0;
        let dx = 0;

        for (let n = startPos; n < startPos + N; n++) {
            let l = this.lines[n % N];
            let level = N * 2 - n;

            // Update view - critical projection math
            l.project(
                this.playerX * ROAD_WIDTH - x,
                camH,
                startPos * SEGMENT_LENGTH - (n >= N ? N * SEGMENT_LENGTH : 0)
            );
            x += dx;
            dx += l.curve;

            // Clear sprites
            l.clearSprites();

            // Draw sprites - trees and cars
            const treeSprite = { src: '/img/tree.png', width: 132, height: 192 };
            if (n % 10 === 0) l.drawSprite(level, 0, treeSprite, -2);
            if ((n + 5) % 10 === 0) l.drawSprite(level, 0, treeSprite, 1.3);

            if (l.special) l.drawSprite(level, 0, l.special, l.special.offset || 0);

            for (let car of this.cars) {
                if ((car.pos | 0) === n % N) {
                    l.drawSprite(level, car.element, car.type, car.lane);
                }
            }

            // Draw powerups
            for (let powerup of this.powerups) {
                if ((powerup.pos | 0) === n % N && !powerup.collected) {
                    l.drawSprite(level, powerup.element, powerup.type, powerup.lane);
                }
            }

            // Draw road segments
            if (l.Y >= maxy) continue;
            maxy = l.Y;

            let even = ((n / 2) | 0) % 2;
            let grass = COLORS.GRASS[even * 1];
            let rumble = COLORS.RUMBLE[even * 1];
            let tar = COLORS.TAR[even * 1];

            let p = this.lines[(n - 1) % N];

            // Draw grass
            drawQuad(l.elements[0], level, grass,
                GAME_WIDTH / 4, p.Y, HALF_WIDTH + 2,
                GAME_WIDTH / 4, l.Y, HALF_WIDTH);
            drawQuad(l.elements[1], level, grass,
                (GAME_WIDTH / 4) * 3, p.Y, HALF_WIDTH + 2,
                (GAME_WIDTH / 4) * 3, l.Y, HALF_WIDTH);

            // Draw road
            drawQuad(l.elements[2], level, rumble,
                p.X, p.Y, p.W * 1.15,
                l.X, l.Y, l.W * 1.15);
            drawQuad(l.elements[3], level, tar,
                p.X, p.Y, p.W,
                l.X, l.Y, l.W);

            // Draw center line
            if (!even) {
                drawQuad(l.elements[4], level, COLORS.RUMBLE[1],
                    p.X, p.Y, p.W * 0.4,
                    l.X, l.Y, l.W * 0.4);
                drawQuad(l.elements[5], level, tar,
                    p.X, p.Y, p.W * 0.35,
                    l.X, l.Y, l.W * 0.35);
            }
        }

        // Update hero car position
        const hero = document.getElementById('hero');
        const heroHalfWidth = (this.selectedVehicle.width * 1.75) / 2;
        hero.style.left = `${HALF_WIDTH - heroHalfWidth + this.playerX * 125}px`;
    }

    calculateFinalScore() {
        const raceTimeMs = Date.now() - this.start; // Time in milliseconds
        const raceTimeSeconds = Math.floor(raceTimeMs / 1000); // Time in seconds for penalty calculation
        const baseScore = Math.floor(this.scoreVal);
        const timePenalty = raceTimeSeconds; // 1 point deducted per second
        const lifeBonus = this.lives * 100; // 100 points per life remaining
        const completionBonus = this.raceCompleted ? 1000 : 0; // 1000 points for completing the race
        const finalScore = Math.max(0, baseScore - timePenalty + lifeBonus + completionBonus);

        return {
            baseScore,
            raceTimeMs, // Store milliseconds for precise timing
            raceTimeSeconds, // Keep seconds for penalty display
            timePenalty,
            lifeBonus,
            completionBonus,
            livesRemaining: this.lives,
            finalScore
        };
    }

    gameOver() {
        this.inGame = false;
        this.gameState = GAME_STATES.GAME_OVER;

        const scoreData = this.calculateFinalScore();

        // Play appropriate sound based on how the game ended
        if (this.raceCompleted) {
            this.audio.playWin(); // Race completed successfully
        } else {
            this.audio.playGameOver(); // Ran out of lives
        }

        // Submit score to leaderboard
        this.submitToLeaderboard(scoreData);

        document.getElementById('menu').style.display = 'flex';
        document.getElementById('menu-content').innerHTML = `
            <h2 style="color: #ff0000; margin-bottom: 20px; font-size: 1.8em; text-align: center;">GAME OVER</h2>
            <div style="text-align: center; font-size: 14px; line-height: 1.6;">
                <div style="background: rgba(0,0,0,0.5); padding: 20px; border-radius: 10px; margin: 20px auto; max-width: 400px;">
                    <h3 style="color: #ffffff; margin-bottom: 15px; font-size: 16px;">SCORE BREAKDOWN</h3>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: #ffffff;">Base Score:</span>
                        <span style="color: #4cff00;">+${scoreData.baseScore}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: #ffffff;">Time Penalty (${scoreData.raceTimeSeconds}s):</span>
                        <span style="color: #ff0000;">-${scoreData.timePenalty}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: #ffffff;">Life Bonus (${scoreData.livesRemaining} × 100):</span>
                        <span style="color: #4cff00;">+${scoreData.lifeBonus}</span>
                    </div>
                    ${scoreData.completionBonus > 0 ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                        <span style="color: #ffffff;">Completion Bonus:</span>
                        <span style="color: #4cff00;">+${scoreData.completionBonus}</span>
                    </div>
                    ` : '<div style="margin-bottom: 15px;"></div>'}
                    <div style="border-top: 2px solid #ffffff; padding-top: 10px;">
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #ff6600; font-size: 18px; font-weight: bold;">FINAL SCORE:</span>
                            <span style="color: #ff6600; font-size: 18px; font-weight: bold;">${scoreData.finalScore}</span>
                        </div>
                    </div>
                </div>
                <div id="leaderboard-status" style="margin-top: 15px; font-size: 10px; color: #4cff00;">Submitting to leaderboard...</div>
                <p style="margin-top: 20px; animation: blink 1s infinite; text-align: center; font-size: 1.1em;">PRESS SPACE TO RESTART</p>
            </div>
        `;
        document.getElementById('menu-instructions').innerHTML = '';
    }

    async submitToLeaderboard(scoreData) {
        const statusElement = document.getElementById('leaderboard-status');

        try {
            if (window.leaderboard) {
                const raceData = {
                    player_name: this.playerName,
                    github_username: this.githubUsername, // Will have @ added by backend if missing
                    base_score: scoreData.baseScore,
                    time_penalty: scoreData.timePenalty,
                    life_bonus: scoreData.lifeBonus,
                    final_score: scoreData.finalScore,
                    race_time: scoreData.raceTimeMs, // Send milliseconds to database
                    vehicle: this.selectedVehicle.name,
                    driver: this.selectedDriver.name,
                    lives_remaining: scoreData.livesRemaining
                };

                const success = await window.leaderboard.submitRace(raceData);

                if (success && statusElement) {
                    statusElement.textContent = '✓ Score submitted to leaderboard!';
                    statusElement.style.color = '#4cff00';
                } else if (statusElement) {
                    statusElement.textContent = '✗ Failed to submit score';
                    statusElement.style.color = '#ff0000';
                }
            }
        } catch (error) {
            console.error('Error submitting to leaderboard:', error);
            if (statusElement) {
                statusElement.textContent = '✗ Error submitting score';
                statusElement.style.color = '#ff0000';
            }
        }
    }

    resetGame() {
        this.inGame = false;
        this.start = Date.now();
        this.countDown = this.map[this.map.length - 2].to / 130 + 10;
        this.playerX = 0;
        this.speed = 0;
        this.scoreVal = 0;
        this.pos = 0;
        this.cloudOffset = 0;
        this.sectionProg = 0;
        this.mapIndex = 0;
        this.lives = 3;
        this.lastCollisionTime = 0; // Reset collision time
        this.raceCompleted = false; // Reset completion status

        // Reset powerup system
        this.powerups.forEach(powerup => powerup.element.remove());
        this.powerups = [];
        this.invincible = false;
        this.invincibilityEndTime = 0;
        this.lastPowerupSpawn = 0;

        // Reset vehicle stats to defaults
        this.maxSpeed = MAX_SPEED;
        this.vehicleAccel = ACCEL;

        for (let line of this.lines) {
            line.curve = line.y = 0;
        }

        document.getElementById('road').style.opacity = '0.4';
        document.getElementById('hud').style.display = 'none';
        document.getElementById('hero').style.display = 'none';
    }
}

// Initialize the game
export function initFixedRacer() {
    new FixedRacer();
}
