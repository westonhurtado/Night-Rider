let camera, scene, renderer, bike;
let obstacles = [];
let score = 0;
let gameSpeed = 0.1;
const lanePositions = [-2, 0, 2]; // Left, Center, Right lanes
let currentLane = 1; // Start in center lane
let isJumping = false;

// Add new global variables
let audioManager;
let particleSystem;
let highScore = 0;
let dayNightCycle = 0;
let powerUps = [];

function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, -5);
    camera.rotation.x = -0.2;

    // Create renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Create street
    createStreet();

    // Create bike
    createBike();

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 10, 5);
    scene.add(directionalLight);

    // Initialize new systems
    audioManager = new AudioManager();
    particleSystem = new ParticleSystem(scene);
    
    // Add street lights
    createStreetLights();
    
    // Start background music
    audioManager.startBackground();

    // Event listeners
    document.addEventListener('keydown', onKeyDown);

    // Start game loop
    animate();
}

function createStreet() {
    const street = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 1000),
        new THREE.MeshPhongMaterial({ color: 0x333333 })
    );
    street.rotation.x = -Math.PI / 2;
    street.position.z = 0;
    scene.add(street);
}

function createBike() {
    // Simple bike representation using a box
    const geometry = new THREE.BoxGeometry(0.5, 1, 1);
    const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    bike = new THREE.Mesh(geometry, material);
    bike.position.set(0, 0.5, 0);
    scene.add(bike);
}

function createObstacle() {
    const geometry = new THREE.CylinderGeometry(0.3, 0.3, 1, 8);
    const material = new THREE.MeshPhongMaterial({ color: 0x666666 });
    const obstacle = new THREE.Mesh(geometry, material);
    
    const lane = Math.floor(Math.random() * 3);
    obstacle.position.set(lanePositions[lane], 0.5, -50);
    scene.add(obstacle);
    obstacles.push(obstacle);
}

function createStreetLights() {
    for (let z = -1000; z < 0; z += 50) {
        for (let x of [-5, 5]) {
            const light = new THREE.PointLight(0xffaa00, 0.5, 20);
            light.position.set(x, 3, z);
            scene.add(light);
            
            // Light pole
            const geometry = new THREE.CylinderGeometry(0.1, 0.1, 3, 8);
            const material = new THREE.MeshPhongMaterial({ color: 0x333333 });
            const pole = new THREE.Mesh(geometry, material);
            pole.position.set(x, 1.5, z);
            scene.add(pole);
        }
    }
}

function createPowerUp() {
    const geometry = new THREE.SphereGeometry(0.3);
    const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    const powerUp = new THREE.Mesh(geometry, material);
    
    const lane = Math.floor(Math.random() * 3);
    powerUp.position.set(lanePositions[lane], 1, -50);
    scene.add(powerUp);
    powerUps.push({
        mesh: powerUp,
        type: 'speed'
    });
}

function onKeyDown(event) {
    switch(event.key) {
        case 'ArrowLeft':
            if (currentLane > 0) currentLane--;
            break;
        case 'ArrowRight':
            if (currentLane < 2) currentLane++;
            break;
        case 'Space':
            if (!isJumping) jump();
            break;
    }
}

function jump() {
    isJumping = true;
    const jumpHeight = 2;
    const jumpDuration = 1000; // ms
    
    const startY = bike.position.y;
    const startTime = Date.now();
    
    function jumpAnimation() {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / jumpDuration;
        
        if (progress < 1) {
            bike.position.y = startY + Math.sin(progress * Math.PI) * jumpHeight;
            requestAnimationFrame(jumpAnimation);
        } else {
            bike.position.y = startY;
            isJumping = false;
        }
    }
    
    jumpAnimation();
}

function updateDayNightCycle() {
    dayNightCycle += 0.001;
    const intensity = Math.sin(dayNightCycle) * 0.5 + 0.5;
    scene.background = new THREE.Color(intensity * 0.1, intensity * 0.1, intensity * 0.3);
}

function animate() {
    requestAnimationFrame(animate);
    
    // Update day/night cycle
    updateDayNightCycle();
    
    // Update particles
    particleSystem.update();
    
    // Create speed particles
    if (gameSpeed > 0.15) {
        particleSystem.createSpeedParticles(bike.position);
    }
    
    // Move bike to target lane position
    const targetX = lanePositions[currentLane];
    bike.position.x += (targetX - bike.position.x) * 0.1;
    
    // Move obstacles
    obstacles.forEach((obstacle, index) => {
        obstacle.position.z += gameSpeed;
        
        // Check collision
        if (Math.abs(obstacle.position.z - bike.position.z) < 1 &&
            Math.abs(obstacle.position.x - bike.position.x) < 0.5 &&
            !isJumping) {
            console.log('Game Over!');
            resetGame();
        }
        
        // Remove obstacles that are behind the camera
        if (obstacle.position.z > 5) {
            scene.remove(obstacle);
            obstacles.splice(index, 1);
        }
    });
    
    // Create new obstacles
    if (Math.random() < 0.02) {
        createObstacle();
    }
    
    // Handle power-ups
    powerUps.forEach((powerUp, index) => {
        powerUp.mesh.position.z += gameSpeed;
        
        // Check collision with power-up
        if (Math.abs(powerUp.mesh.position.z - bike.position.z) < 1 &&
            Math.abs(powerUp.mesh.position.x - bike.position.x) < 0.5) {
            // Apply power-up effect
            gameSpeed *= 1.5;
            setTimeout(() => gameSpeed /= 1.5, 5000); // Effect lasts 5 seconds
            
            scene.remove(powerUp.mesh);
            powerUps.splice(index, 1);
        }
        
        if (powerUp.mesh.position.z > 5) {
            scene.remove(powerUp.mesh);
            powerUps.splice(index, 1);
        }
    });
    
    // Randomly spawn power-ups
    if (Math.random() < 0.005) {
        createPowerUp();
    }
    
    // Update score
    score += gameSpeed;
    document.getElementById('score').textContent = `Score: ${Math.floor(score)}`;
    
    // Increase game speed gradually
    gameSpeed += 0.0001;
    
    renderer.render(scene, camera);
}

function resetGame() {
    obstacles.forEach(obstacle => scene.remove(obstacle));
    obstacles = [];
    score = 0;
    gameSpeed = 0.1;
    currentLane = 1;
    bike.position.set(0, 0.5, 0);
    
    // Update high score
    if (score > highScore) {
        highScore = score;
        document.getElementById('high-score').textContent = `High Score: ${Math.floor(highScore)}`;
    }
    
    // Show game over screen
    document.getElementById('game-over').style.display = 'block';
    document.getElementById('final-score').textContent = Math.floor(score);
    
    // Play crash sound
    audioManager.play('crash');
}

function restartGame() {
    document.getElementById('game-over').style.display = 'none';
    resetGame();
}

// Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start the game
init(); 