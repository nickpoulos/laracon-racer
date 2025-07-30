// Pseudo-3D Racing Game - Proper Implementation
// Based on classic techniques used in games like Out Run and Cruis'n USA

// Game constants
const GAME_WIDTH = 800;
const GAME_HEIGHT = 500;
const HALF_WIDTH = GAME_WIDTH / 2;
const ROAD_WIDTH = 4000;
const SEGMENT_LENGTH = 200;
const CAMERA_DEPTH = 0.2;
const CAMERA_HEIGHT = 1500;
const DRAW_DISTANCE = 70;

// Colors
const COLORS = {
    SKY: '#72D7EE',
    GRASS: ['#eedccd', '#e6d4c5'],
    RUMBLE: ['#959298', '#f5f2f6'],
    ROAD: ['#959298', '#9c9a9d']
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
    { name: 'LAMBO', speed: 220, accel: 40, img: '/img/lambo.jpg' },
    { name: 'TRUCK', speed: 180, accel: 35, img: '/img/truck.jpg' },
    { name: 'BIKE', speed: 260, accel: 45, img: '/img/motorcycle.jpg' }
];

// Driver data
const DRIVERS = [
    { name: 'TAYLOR', img: '/img/taylor.jpg' }
];

// Line class for road segments
class Line {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.z = 0;

        // Screen coordinates after projection
        this.screenX = 0;
        this.screenY = 0;
        this.screenW = 0;
        this.scale = 0;

        this.curve = 0;
        this.elements = [];
        this.sprites = [];
    }

    // Project 3D world coordinates to 2D screen coordinates
    project(cameraX, cameraY, cameraZ) {
        this.scale = CAMERA_DEPTH / (this.z - cameraZ);
        this.screenX = (1 + this.scale * (this.x - cameraX)) * HALF_WIDTH;
        this.screenY = Math.ceil(((1 - this.scale * (this.y - cameraY)) * GAME_HEIGHT) / 2);
        this.screenW = this.scale * ROAD_WIDTH * HALF_WIDTH;
    }

    clearSprites() {
        this.sprites.forEach(sprite => {
            if (sprite.element) {
                sprite.element.style.display = 'none';
            }
        });
    }

    drawSprite(depth, sprite, offset, element) {
        const destX = this.screenX + this.scale * HALF_WIDTH * offset;
        const destY = this.screenY + 4;
        const destW = (sprite.width * this.screenW) / 265;
        const destH = (sprite.height * this.screenW) / 265;

        element.style.display = 'block';
        element.style.background = `url('${sprite.src}') no-repeat`;
        element.style.backgroundSize = `${destW}px ${destH}px`;
        element.style.left = `${destX + destW * offset}px`;
        element.style.top = `${destY + destH * -1}px`;
        element.style.width = `${destW}px`;
        element.style.height = `${destH}px`;
        element.style.zIndex = depth;
    }
}

// Car class for enemy cars
class Car {
    constructor(position, lane, type) {
        this.position = position;
        this.lane = lane;
        this.type = type;
        this.speed = 0.5 + Math.random() * 0.5;

        this.element = document.createElement('div');
        this.element.style.position = 'absolute';
        document.getElementById('road').appendChild(this.element);
    }
}

// Main game class
class Pseudo3DRacer {
    constructor() {
        this.gameState = GAME_STATES.INTRO;
        this.selectedVehicle = null;
        this.selectedDriver = null;
        this.currentVehicleIndex = 0;
        this.currentDriverIndex = 0;

        // Game variables
        this.position = 0;
        this.playerX = 0;
        this.speed = 0;
        this.score = 0;
        this.lives = 3;
        this.distance = 0;
        this.startTime = 0;
        this.collisionCooldown = 0;

        // Road
        this.lines = [];
        this.cars = [];
        this.powerups = [];

        // Input
        this.keys = {};

        // Map
        this.map = [];
        this.mapIndex = 0;
        this.sectionProgress = 0;

        this.init();
    }

    init() {
        this.setupDOM();
        this.setupInput();
        this.generateMap();
        this.createRoad();
        this.spawnCars();
        this.showIntroScreen();
        this.startGameLoop();
    }

    setupDOM() {
        const gameContainer = document.getElementById('game-container');
        gameContainer.innerHTML = `
            <div id="game" style="width: ${GAME_WIDTH}px; height: ${GAME_HEIGHT}px; position: relative; margin: 0 auto; overflow: hidden; background: ${COLORS.SKY};">
                <div id="road" style="position: absolute; width: 100%; height: 100%;"></div>
                <div id="hero" style="position: absolute; background: url('/img/hero.png') no-repeat; width: 110px; height: 56px; z-index: 2000; display: none;"></div>
                <div id="hud" style="position: absolute; width: 100%; height: 100%; z-index: 1000; display: none;">
                    <div class="ui-text" style="position: absolute; left: 30px; top: 25px; color: #f4f430; font-family: 'Courier New', monospace; font-size: 24px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">LIVES: <span id="lives">3</span></div>
                    <div class="ui-text" style="position: absolute; left: 30px; top: 60px; color: #ffffff; font-family: 'Courier New', monospace; font-size: 24px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">SCORE: <span id="score">0</span></div>
                    <div class="ui-text" style="position: absolute; right: 30px; top: 25px; color: #00ff00; font-family: 'Courier New', monospace; font-size: 24px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">SPEED: <span id="speed">0</span></div>
                    <div class="ui-text" style="position: absolute; right: 30px; top: 60px; color: #0082df; font-family: 'Courier New', monospace; font-size: 24px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">DISTANCE: <span id="distance">0</span>FT</div>
                </div>
                <div id="menu" style="position: absolute; width: 100%; height: 100%; background: rgba(0,0,0,0.8); color: white; z-index: 3000; display: flex; flex-direction: column; justify-content: center; align-items: center; font-family: monospace;">
                    <h1 id="menu-title" style="font-size: 3em; margin-bottom: 20px; color: #ff6600;">LARACON RACER</h1>
                    <div id="menu-content"></div>
                    <div id="menu-instructions" style="margin-top: 30px; font-size: 14px; color: #ccc;"></div>
                </div>
            </div>
        `;

        // Position hero car at bottom center
        const hero = document.getElementById('hero');
        hero.style.top = `${GAME_HEIGHT - 80}px`;
        hero.style.left = `${HALF_WIDTH - 55}px`;
    }

    setupInput() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            this.handleKeyPress(e.code);
            e.preventDefault();
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    handleKeyPress(keyCode) {
        switch (this.gameState) {
            case GAME_STATES.INTRO:
                if (keyCode === 'Space') {
                    this.gameState = GAME_STATES.VEHICLE_SELECT;
                    this.showVehicleSelect();
                }
                break;

            case GAME_STATES.VEHICLE_SELECT:
                if (keyCode === 'ArrowLeft') {
                    this.currentVehicleIndex = (this.currentVehicleIndex - 1 + VEHICLES.length) % VEHICLES.length;
                    this.showVehicleSelect();
                } else if (keyCode === 'ArrowRight') {
                    this.currentVehicleIndex = (this.currentVehicleIndex + 1) % VEHICLES.length;
                    this.showVehicleSelect();
                } else if (keyCode === 'Space') {
                    this.selectedVehicle = VEHICLES[this.currentVehicleIndex];
                    this.gameState = GAME_STATES.DRIVER_SELECT;
                    this.showDriverSelect();
                }
                break;

            case GAME_STATES.DRIVER_SELECT:
                if (keyCode === 'ArrowLeft') {
                    this.currentDriverIndex = (this.currentDriverIndex - 1 + DRIVERS.length) % DRIVERS.length;
                    this.showDriverSelect();
                } else if (keyCode === 'ArrowRight') {
                    this.currentDriverIndex = (this.currentDriverIndex + 1) % DRIVERS.length;
                    this.showDriverSelect();
                } else if (keyCode === 'Space') {
                    this.selectedDriver = DRIVERS[this.currentDriverIndex];
                    this.gameState = GAME_STATES.RACING;
                    this.startRace();
                }
                break;

            case GAME_STATES.GAME_OVER:
                if (keyCode === 'Space') {
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
        content.innerHTML = '<p style="font-size: 1.5em; text-align: center; animation: blink 1s infinite;">PRESS SPACE TO START</p>';
        instructions.innerHTML = '<div style="font-size: 18px; text-align: center;"><span style="color: #ff6600;">← →</span> Navigate/Steer • <span style="color: #ff6600;">↑ ↓</span> Accelerate/Brake • <span style="color: #ff6600;">SPACE</span> Select/Start</div>';

        // Add blinking animation
        const style = document.createElement('style');
        style.textContent = '@keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }';
        document.head.appendChild(style);
    }

    showVehicleSelect() {
        const content = document.getElementById('menu-content');
        content.innerHTML = `
            <h2 style="margin-bottom: 30px; font-size: 2em;">SELECT YOUR VEHICLE</h2>
            <div style="display: flex; gap: 40px; justify-content: center;">
                ${VEHICLES.map((vehicle, index) => `
                    <div style="text-align: center; border: ${index === this.currentVehicleIndex ? '4px solid #ff6600' : '2px solid #666'}; padding: 20px; border-radius: 10px; background: ${index === this.currentVehicleIndex ? 'rgba(255, 102, 0, 0.2)' : 'transparent'};">
                        <div style="width: 120px; height: 80px; background: url('${vehicle.img}') center/cover; margin-bottom: 10px;"></div>
                        <h3 style="font-size: 1.5em; color: ${index === this.currentVehicleIndex ? '#ff6600' : 'white'};">${vehicle.name}</h3>
                        <p style="font-size: 1.2em;">Speed: ${vehicle.speed}</p>
                        <p style="font-size: 1.2em;">Accel: ${vehicle.accel}</p>
                    </div>
                `).join('')}
            </div>
        `;

        document.getElementById('menu-instructions').innerHTML = '<div style="font-size: 18px; text-align: center;"><span style="color: #ff6600;">← →</span> Navigate • <span style="color: #ff6600;">SPACE</span> Select</div>';
    }

    showDriverSelect() {
        const content = document.getElementById('menu-content');
        content.innerHTML = `
            <h2 style="margin-bottom: 30px; font-size: 2em;">SELECT YOUR DRIVER</h2>
            <div style="text-align: center;">
                ${DRIVERS.map((driver, index) => `
                    <div style="border: ${index === this.currentDriverIndex ? '4px solid #ff6600' : '2px solid #666'}; padding: 20px; border-radius: 10px; display: inline-block; background: ${index === this.currentDriverIndex ? 'rgba(255, 102, 0, 0.2)' : 'transparent'};">
                        <div style="width: 120px; height: 120px; background: url('${driver.img}') center/cover; margin-bottom: 10px;"></div>
                        <h3 style="font-size: 1.5em; color: ${index === this.currentDriverIndex ? '#ff6600' : 'white'};">${driver.name}</h3>
                    </div>
                `).join('')}
            </div>
        `;

        document.getElementById('menu-instructions').innerHTML = '<div style="font-size: 18px; text-align: center;"><span style="color: #ff6600;">← →</span> Navigate • <span style="color: #ff6600;">SPACE</span> Select</div>';
    }

    startRace() {
        document.getElementById('menu').style.display = 'none';
        document.getElementById('hud').style.display = 'block';
        document.getElementById('hero').style.display = 'block';

        this.resetGame();
        this.startTime = Date.now();
    }

    generateMap() {
        this.map = [];
        const mapLength = 15000;

        for (let i = 0; i < mapLength; i += this.randomInt(0, 50)) {
            const sectionLength = this.randomInt(300, 600);
            const section = {
                from: i,
                to: i + sectionLength
            };

            const randHeight = this.randomInt(-5, 5);
            const randCurve = this.randomInt(5, 30) * (Math.random() >= 0.5 ? 1 : -1);
            const randInterval = this.randomInt(20, 40);

            if (Math.random() > 0.9) {
                section.curve = () => randCurve;
                section.height = () => randHeight;
            } else if (Math.random() > 0.8) {
                section.curve = () => 0;
                section.height = (x) => Math.sin(x / randInterval) * 1000;
            } else if (Math.random() > 0.8) {
                section.curve = () => 0;
                section.height = () => randHeight;
            } else {
                section.curve = () => randCurve;
                section.height = () => 0;
            }

            this.map.push(section);
            i += sectionLength;
        }

        // Add finish line
        this.map.push({
            from: mapLength,
            to: mapLength + DRAW_DISTANCE,
            curve: () => 0,
            height: () => 0,
            special: 'finish'
        });
    }

    createRoad() {
        const roadContainer = document.getElementById('road');

        for (let i = 0; i < DRAW_DISTANCE; i++) {
            const line = new Line();
            line.z = i * SEGMENT_LENGTH + 270;

            // Create DOM elements for road segments
            for (let j = 0; j < 6; j++) {
                const element = document.createElement('div');
                element.style.position = 'absolute';
                roadContainer.appendChild(element);
                line.elements.push(element);
            }

            // Create sprite containers
            for (let j = 0; j < 2; j++) {
                const spriteContainer = document.createElement('div');
                spriteContainer.style.position = 'absolute';
                spriteContainer.style.display = 'none';
                roadContainer.appendChild(spriteContainer);
                line.sprites.push({ element: spriteContainer });
            }

            this.lines.push(line);
        }
    }

    spawnCars() {
        const lanes = [-2.3, -0.5, 1.2]; // Left, Center, Right

        for (let i = 0; i < 7; i++) {
            const car = new Car(
                (i * 15) + 30, // Start cars much further ahead and spread them out more
                lanes[Math.floor(Math.random() * lanes.length)],
                { src: '/img/car04.png', width: 50, height: 36 }
            );
            this.cars.push(car);
        }

        console.log('Spawned cars at positions:', this.cars.map(car => car.position));
    }

    startGameLoop() {
        let lastTime = 0;
        const targetFPS = 25;
        const frameTime = 1000 / targetFPS;

        const gameLoop = (currentTime) => {
            const deltaTime = currentTime - lastTime;

            if (deltaTime >= frameTime) {
                if (this.gameState === GAME_STATES.RACING) {
                    this.update(deltaTime / 1000);
                    this.render();
                }
                lastTime = currentTime - (deltaTime % frameTime);
            }

            requestAnimationFrame(gameLoop);
        };

        requestAnimationFrame(gameLoop);
    }

    update(deltaTime) {
        // Update collision cooldown
        if (this.collisionCooldown > 0) {
            this.collisionCooldown -= deltaTime;
        }

        // Update position
        this.position += this.speed;
        while (this.position >= DRAW_DISTANCE * SEGMENT_LENGTH) {
            this.position -= DRAW_DISTANCE * SEGMENT_LENGTH;
        }
        while (this.position < 0) {
            this.position += DRAW_DISTANCE * SEGMENT_LENGTH;
        }

        const startPos = Math.floor(this.position / SEGMENT_LENGTH);

        // Handle input
        if (this.keys['ArrowLeft']) {
            this.playerX -= 0.007 * deltaTime * this.speed;
        }
        if (this.keys['ArrowRight']) {
            this.playerX += 0.007 * deltaTime * this.speed;
        }
        if (this.keys['ArrowUp']) {
            this.speed = Math.min(this.selectedVehicle.speed, this.speed + this.selectedVehicle.accel * deltaTime);
        } else if (this.keys['ArrowDown']) {
            this.speed = Math.max(0, this.speed - 80 * deltaTime);
        } else {
            this.speed = Math.max(0, this.speed - 40 * deltaTime);
        }

        // Keep player on road
        this.playerX = Math.max(-3, Math.min(3, this.playerX));

        // Update curve effect
        if (this.lines[startPos]) {
            this.playerX -= (this.lines[startPos].curve / 5000) * deltaTime * this.speed;
        }

        // Update score and distance
        this.score += Math.floor(this.speed * deltaTime);
        this.distance += this.speed * deltaTime * 0.1;

        // Update map
        this.updateMap();

        // Update cars
        this.updateCars(deltaTime, startPos);

        // Update UI
        this.updateUI();

        // Check game over conditions - only if lives is 0 or less
        if (this.lives <= 0) {
            console.log('Game over: Lives reached 0');
            this.gameOver();
        }

        // Check finish line (much later in the game)
        if (this.distance > 10000) { // Only after traveling 10000ft
            console.log('Game over: Reached finish line at', this.distance, 'ft');
            this.gameOver();
        }
    }

    updateMap() {
        const current = this.map[this.mapIndex];
        if (!current) return;

        const useSection = current.from < this.score && current.to > this.score;
        if (useSection) {
            this.sectionProgress += this.speed * 0.016;
        }

        const endPos = (Math.floor(this.position / SEGMENT_LENGTH) + DRAW_DISTANCE - 1) % DRAW_DISTANCE;
        if (this.lines[endPos]) {
            this.lines[endPos].curve = useSection ? current.curve(this.sectionProgress) : 0;
            this.lines[endPos].y = useSection ? current.height(this.sectionProgress) : 0;
        }

        if (current.to <= this.score) {
            this.mapIndex++;
            this.sectionProgress = 0;
        }
    }

    updateCars(deltaTime, startPos) {
        this.cars.forEach((car, index) => {
            car.position = (car.position + 8 * deltaTime) % DRAW_DISTANCE;

            // Respawn cars further ahead when they loop around
            if (car.position < startPos) {
                car.position = startPos + 40 + (index * 10); // Spawn far ahead
            }

            // Check collision only if cooldown is over and car is close
            if (this.collisionCooldown <= 0 && Math.abs(car.position - startPos) < 1) {
                // Convert player position to lane coordinates (-0.5 is center lane)
                const playerLane = this.playerX * 2; // Scale player X to lane coordinates
                const distance = Math.abs(playerLane - car.lane);

                console.log('Collision check - Player lane:', playerLane, 'Car lane:', car.lane, 'Distance:', distance, 'Car pos:', car.position, 'Player pos:', startPos);

                if (distance < 0.5) { // Much tighter collision detection
                    console.log('Collision detected! Lives:', this.lives - 1, 'Distance:', distance);
                    this.lives--;
                    this.speed = Math.min(20, this.speed);
                    this.collisionCooldown = 2.0; // 2 second cooldown
                }
            }
        });
    }

    render() {
        const startPos = Math.floor(this.position / SEGMENT_LENGTH);
        let maxY = GAME_HEIGHT;
        const cameraHeight = CAMERA_HEIGHT + (this.lines[startPos]?.y || 0);
        let x = 0;
        let dx = 0;

        for (let n = startPos; n < startPos + DRAW_DISTANCE; n++) {
            const line = this.lines[n % DRAW_DISTANCE];
            if (!line) continue;

            const level = DRAW_DISTANCE * 2 - n;

            // Project line to screen coordinates
            line.project(
                this.playerX * ROAD_WIDTH - x,
                cameraHeight,
                startPos * SEGMENT_LENGTH - (n >= DRAW_DISTANCE ? DRAW_DISTANCE * SEGMENT_LENGTH : 0)
            );

            x += dx;
            dx += line.curve;

            // Skip if behind camera
            if (line.screenY >= maxY) continue;
            maxY = line.screenY;

            // Draw road segment
            this.drawRoadSegment(line, n, level);

            // Draw scenery (trees)
            this.drawScenery(line, n, level);

            // Draw cars
            this.drawCars(line, n, level);
        }

        // Update hero car position
        const hero = document.getElementById('hero');
        hero.style.left = `${HALF_WIDTH - 55 + this.playerX * 100}px`;
    }

    drawRoadSegment(line, segmentIndex, level) {
        const even = Math.floor(segmentIndex / 2) % 2;
        const grass = COLORS.GRASS[even];
        const rumble = COLORS.RUMBLE[even];
        const road = COLORS.ROAD[even];

        const prevLine = this.lines[(segmentIndex - 1) % DRAW_DISTANCE];
        if (!prevLine) return;

        // Draw grass (left and right)
        this.drawQuad(line.elements[0], level, grass,
            GAME_WIDTH / 4, prevLine.screenY, HALF_WIDTH + 2,
            GAME_WIDTH / 4, line.screenY, HALF_WIDTH);

        this.drawQuad(line.elements[1], level, grass,
            (GAME_WIDTH / 4) * 3, prevLine.screenY, HALF_WIDTH + 2,
            (GAME_WIDTH / 4) * 3, line.screenY, HALF_WIDTH);

        // Draw road
        this.drawQuad(line.elements[2], level, rumble,
            prevLine.screenX, prevLine.screenY, prevLine.screenW * 1.15,
            line.screenX, line.screenY, line.screenW * 1.15);

        this.drawQuad(line.elements[3], level, road,
            prevLine.screenX, prevLine.screenY, prevLine.screenW,
            line.screenX, line.screenY, line.screenW);

        // Draw center line
        if (!even) {
            this.drawQuad(line.elements[4], level, COLORS.RUMBLE[1],
                prevLine.screenX, prevLine.screenY, prevLine.screenW * 0.4,
                line.screenX, line.screenY, line.screenW * 0.4);

            this.drawQuad(line.elements[5], level, road,
                prevLine.screenX, prevLine.screenY, prevLine.screenW * 0.35,
                line.screenX, line.screenY, line.screenW * 0.35);
        }
    }

    drawQuad(element, layer, color, x1, y1, w1, x2, y2, w2) {
        element.style.zIndex = layer;
        element.style.background = color;
        element.style.top = `${y2}px`;
        element.style.left = `${x1 - w1 / 2 - w1}px`;
        element.style.width = `${w1 * 3}px`;
        element.style.height = `${y1 - y2}px`;

        const leftOffset = w1 + x2 - x1 + Math.abs(w2 / 2 - w1 / 2);
        element.style.clipPath = `polygon(${leftOffset}px 0, ${leftOffset + w2}px 0, 66.66% 100%, 33.33% 100%)`;
    }

    drawScenery(line, segmentIndex, level) {
        // Draw trees much less frequently and further to the sides
        if (segmentIndex % 25 === 0) {
            this.drawTree(line, level, -4.5, segmentIndex); // Far left side
        }
        if ((segmentIndex + 12) % 25 === 0) {
            this.drawTree(line, level, 4.5, segmentIndex); // Far right side
        }

        // Add some variety with trees at different distances
        if ((segmentIndex + 6) % 30 === 0) {
            this.drawTree(line, level, -3.8, segmentIndex); // Left side, closer
        }
        if ((segmentIndex + 18) % 30 === 0) {
            this.drawTree(line, level, 3.8, segmentIndex); // Right side, closer
        }
    }

    drawTree(line, level, offset, segmentIndex) {
        // Only draw trees that are far enough to be visible
        if (line.scale < 0.1) return;

        const treeElement = document.createElement('div');
        treeElement.style.position = 'absolute';

        // Position trees well off to the sides of the road
        const treeX = line.screenX + line.scale * HALF_WIDTH * offset;
        const treeY = line.screenY - (50 * line.scale);

        // Make trees much bigger and scale properly with distance
        const treeW = Math.max(15, 50 * line.scale);
        const treeH = Math.max(25, 80 * line.scale);

        // Only draw if tree is within screen bounds
        if (treeX < -50 || treeX > GAME_WIDTH + 50) return;

        // Create a more tree-like shape
        treeElement.style.left = `${treeX - treeW/2}px`;
        treeElement.style.top = `${treeY}px`;
        treeElement.style.width = `${treeW}px`;
        treeElement.style.height = `${treeH}px`;
        treeElement.style.background = 'linear-gradient(to bottom, #228B22 0%, #32CD32 30%, #8B4513 80%, #8B4513 100%)';
        treeElement.style.borderRadius = '50% 50% 20% 20% / 80% 80% 20% 20%';
        treeElement.style.zIndex = level;

        // Add a trunk
        const trunk = document.createElement('div');
        trunk.style.position = 'absolute';
        trunk.style.bottom = '0px';
        trunk.style.left = `${treeW * 0.4}px`;
        trunk.style.width = `${treeW * 0.2}px`;
        trunk.style.height = `${treeH * 0.3}px`;
        trunk.style.background = '#8B4513';
        treeElement.appendChild(trunk);

        // Try to load tree image, but use better fallback
        const img = new Image();
        img.onload = () => {
            treeElement.style.background = `url('/img/tree.png') no-repeat center/contain`;
            treeElement.style.borderRadius = '0';
            treeElement.innerHTML = ''; // Remove trunk when using image
        };
        img.src = '/img/tree.png';

        document.getElementById('road').appendChild(treeElement);

        // Clean up tree element after it's no longer visible
        setTimeout(() => {
            if (treeElement.parentNode) {
                treeElement.parentNode.removeChild(treeElement);
            }
        }, 3000);
    }

    drawCars(line, segmentIndex, level) {
        this.cars.forEach(car => {
            if (Math.abs(car.position - segmentIndex) < 2) {
                const carX = line.screenX + line.scale * HALF_WIDTH * car.lane;
                const carY = line.screenY - 20 * line.scale;

                car.element.style.display = 'block';
                car.element.style.background = `url('${car.type.src}') no-repeat`;
                car.element.style.backgroundSize = '100% 100%';
                car.element.style.left = `${carX - 25 * line.scale}px`;
                car.element.style.top = `${carY}px`;
                car.element.style.width = `${50 * line.scale}px`;
                car.element.style.height = `${36 * line.scale}px`;
                car.element.style.zIndex = level;
            } else {
                car.element.style.display = 'none';
            }
        });
    }

    updateUI() {
        document.getElementById('lives').textContent = this.lives;
        document.getElementById('score').textContent = Math.floor(this.score);
        document.getElementById('speed').textContent = Math.floor(this.speed);
        document.getElementById('distance').textContent = Math.floor(this.distance);
    }

    gameOver() {
        this.gameState = GAME_STATES.GAME_OVER;

        document.getElementById('menu').style.display = 'flex';
        document.getElementById('menu-content').innerHTML = `
            <h2 style="color: #ff0000; margin-bottom: 20px;">GAME OVER</h2>
            <div style="text-align: center;">
                <p style="font-size: 1.2em;">Final Score: ${Math.floor(this.score)}</p>
                <p style="font-size: 1.2em;">Distance: ${Math.floor(this.distance)}ft</p>
                <p style="margin-top: 20px; animation: blink 1s infinite;">PRESS SPACE TO RESTART</p>
            </div>
        `;
        document.getElementById('menu-instructions').innerHTML = '';
    }

    resetGame() {
        this.position = 0;
        this.playerX = 0;
        this.speed = 0;
        this.score = 0;
        this.lives = 3;
        this.distance = 0;
        this.mapIndex = 0;
        this.sectionProgress = 0;
        this.collisionCooldown = 0;

        console.log('Game reset - Lives:', this.lives);

        // Reset lines
        this.lines.forEach(line => {
            line.curve = 0;
            line.y = 0;
        });
    }

    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

// Initialize the game
export function initPseudo3DRacer() {
    new Pseudo3DRacer();
}
