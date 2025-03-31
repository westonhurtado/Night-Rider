// Initialize Three.js scene, camera, and renderer
let scene, camera, renderer;
let bike, road;
let gameSpeed = 0;
let score = 0;
let lives = 3;
let currentLane = 1;
let isJumping = false;
let gameState = 'START';

// Initialize game
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue background

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, -3);
    camera.lookAt(0, 0, 5);

    initRenderer();
    createStartScreen();
    createStreet();
    createBike();
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    animate();
}

function initRenderer() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);
}

function createStreet() {
    // Create main road
    const roadGeometry = new THREE.PlaneGeometry(5, 1000);
    const roadMaterial = new THREE.MeshPhongMaterial({
        color: 0x333333,
        shininess: 10
    });
    road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    scene.add(road);

    // Add road lines
    const lineGeometry = new THREE.PlaneGeometry(0.1, 1000);
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    // Left line
    const leftLine = new THREE.Mesh(lineGeometry, lineMaterial);
    leftLine.rotation.x = -Math.PI / 2;
    leftLine.position.x = -1.5;
    leftLine.position.y = 0.01;
    scene.add(leftLine);
    
    // Right line
    const rightLine = new THREE.Mesh(lineGeometry, lineMaterial);
    rightLine.rotation.x = -Math.PI / 2;
    rightLine.position.x = 1.5;
    rightLine.position.y = 0.01;
    scene.add(rightLine);
}

function createBike() {
    const bikeGeometry = new THREE.BoxGeometry(0.5, 0.5, 1);
    const bikeMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ff88,
        shininess: 30
    });
    bike = new THREE.Mesh(bikeGeometry, bikeMaterial);
    bike.position.set(0, 0.4, 0);
    bike.castShadow = true;
    bike.receiveShadow = true;
    scene.add(bike);
}

function createStartScreen() {
    const startScreen = document.createElement('div');
    startScreen.id = 'startScreen';
    startScreen.style.position = 'absolute';
    startScreen.style.width = '100%';
    startScreen.style.height = '100%';
    startScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    startScreen.style.display = 'flex';
    startScreen.style.flexDirection = 'column';
    startScreen.style.justifyContent = 'center';
    startScreen.style.alignItems = 'center';
    startScreen.style.color = 'white';
    startScreen.style.fontFamily = 'Arial, sans-serif';
    startScreen.style.zIndex = '1000';

    const title = document.createElement('h1');
    title.textContent = 'NIGHT RIDER';
    title.style.fontSize = '48px';
    title.style.marginBottom = '20px';

    const instruction = document.createElement('p');
    instruction.textContent = 'Press SPACE to start';
    instruction.style.fontSize = '24px';
    instruction.style.animation = 'pulse 1.5s infinite';

    startScreen.appendChild(title);
    startScreen.appendChild(instruction);
    document.body.appendChild(startScreen);
}

function startGame() {
    gameState = 'PLAYING';
    gameSpeed = 0.5;
    score = 0;
    
    const startScreen = document.getElementById('startScreen');
    if (startScreen) {
        startScreen.style.display = 'none';
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    if (gameState === 'PLAYING') {
        // Update bike position
        const targetX = (currentLane - 1) * 1.5;
        bike.position.x += (targetX - bike.position.x) * 0.1;

        // Handle jumping
        if (isJumping) {
            bike.position.y += 0.1;
            if (bike.position.y > 2) {
                isJumping = false;
            }
        } else if (bike.position.y > 0.4) {
            bike.position.y -= 0.1;
        }

        // Move road
        road.position.z += gameSpeed;
        if (road.position.z > 100) {
            road.position.z = 0;
        }

        // Update score
        score += Math.floor(gameSpeed * 10);
        document.getElementById('score').textContent = `Score: ${score}`;
    }
    
    renderer.render(scene, camera);
}

// Handle keyboard input
document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        if (gameState === 'START') {
            startGame();
        } else if (gameState === 'PLAYING' && !isJumping && bike.position.y <= 0.4) {
            isJumping = true;
        }
    }

    if (gameState === 'PLAYING') {
        switch(event.key) {
            case 'ArrowLeft':
                if (currentLane > 0) currentLane--;
                break;
            case 'ArrowRight':
                if (currentLane < 2) currentLane++;
                break;
        }
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start game
init();