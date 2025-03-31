let camera, scene, renderer, bike;
let obstacles = [];
let score = 0;
let highScore = 0;
let gameSpeed = 0.2;
const lanePositions = [-4, 0, 4]; // Wider lanes
let currentLane = 1;
let isJumping = false;
let gameActive = true;
let houses = [];
let streetLights = [];

// Add new global variables
let audioManager;
let particleSystem;
let dayNightCycle = 0;
let powerUps = [];
let lives = 3;
let isInvincible = false;
let coins = [];
let speedBoostActive = false;
let gameLevel = 1;
let rainParticles = [];
let isRaining = false;
let currentWeather = 'clear';
let comboMultiplier = 1;
let lastCoinTime = 0;
let obstacleTypes = ['trashcan', 'barrier', 'puddle'];
let nightMode = true;
let boostTrail = [];
let currentBikeColor = 0xff0000;
let powerUpEffects = [];
let tutorial = false;
let tutorialStep = 0;
let achievements = {
    coinCollector: false,
    speedDemon: false,
    rainRider: false,
    perfectRun: false
};

// Add new texture loaders and materials
const envMapLoader = new THREE.CubeTextureLoader();
const normalMapLoader = new THREE.TextureLoader();

const envMap = envMapLoader.load([
    'https://threejs.org/examples/textures/cube/skybox/px.jpg',
    'https://threejs.org/examples/textures/cube/skybox/nx.jpg',
    'https://threejs.org/examples/textures/cube/skybox/py.jpg',
    'https://threejs.org/examples/textures/cube/skybox/ny.jpg',
    'https://threejs.org/examples/textures/cube/skybox/pz.jpg',
    'https://threejs.org/examples/textures/cube/skybox/nz.jpg'
]);

const bikeTextures = {
    body: textureLoader.load('https://threejs.org/examples/textures/carbon.jpg'),
    metal: textureLoader.load('https://threejs.org/examples/textures/metal.jpg'),
    normal: normalMapLoader.load('https://threejs.org/examples/textures/waternormals.jpg')
};

const roadTexture = textureLoader.load('https://threejs.org/examples/textures/asphalt.jpg');
roadTexture.wrapS = THREE.RepeatWrapping;
roadTexture.wrapT = THREE.RepeatWrapping;
roadTexture.repeat.set(4, 100);

// Add new classes for effects
class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.objectPool = new AdvancedObjectPool();
        this.objectPool.initialize();
    }

    createSpeedTrail(position) {
        const particle = this.objectPool.get('speedTrail');
        particle.position.copy(position);
        particle.scale.set(1, 1, 1);
        scene.add(particle);
        
        return particle;
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.life -= 0.02;
            particle.system.material.opacity = particle.life;

            if (particle.life <= 0) {
                this.objectPool.return(particle, 'speedTrail');
                this.particles.splice(i, 1);
            }
        }
    }
}

// Add new global variables after the existing ones
const textureLoader = new THREE.TextureLoader();

// Add new global variables
const skyboxTextures = {
    night: envMapLoader.load([
        'https://threejs.org/examples/textures/cube/nightsky/px.jpg',
        'https://threejs.org/examples/textures/cube/nightsky/nx.jpg',
        'https://threejs.org/examples/textures/cube/nightsky/py.jpg',
        'https://threejs.org/examples/textures/cube/nightsky/ny.jpg',
        'https://threejs.org/examples/textures/cube/nightsky/pz.jpg',
        'https://threejs.org/examples/textures/cube/nightsky/nz.jpg'
    ])
};

// Add new shader effects
const shaderEffects = {
    // Cyberpunk grid effect for the road
    roadGrid: new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            color: { value: new THREE.Color(0x00ff88) }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform vec3 color;
            varying vec2 vUv;
            
            void main() {
                vec2 grid = abs(fract(vUv * 50.0 - vec2(time)) - 0.5);
                float line = min(grid.x, grid.y);
                line = smoothstep(0.0, 0.05, line);
                gl_FragColor = vec4(color, 1.0 - line);
            }
        `,
        transparent: true
    }),

    // Holographic effect for power-ups
    hologram: new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            baseColor: { value: new THREE.Color(0x00ffff) }
        },
        vertexShader: `
            varying vec3 vNormal;
            varying vec3 vPosition;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform vec3 baseColor;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
                float scanLine = sin(vPosition.y * 50.0 + time * 5.0) * 0.5 + 0.5;
                float rim = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
                vec3 color = baseColor + vec3(0.2) * scanLine;
                gl_FragColor = vec4(color, rim * 0.8);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending
    })
};

// Add new global variables
const vegetation = {
    trees: [],
    grass: [],
    flowers: []
};

// Add new environment features
const environment = {
    bushes: [],
    butterflies: [],
    fireflies: [],
    clouds: []
};

// Create tree function with better graphics
function createTree(x, z) {
    const tree = new THREE.Group();
    
    // Tree trunk with realistic bark texture
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 8);
    const barkTexture = textureLoader.load('https://threejs.org/examples/textures/wood.jpg');
    barkTexture.wrapS = barkTexture.wrapT = THREE.RepeatWrapping;
    barkTexture.repeat.set(2, 2);
    
    const trunkMaterial = new THREE.MeshPhysicalMaterial({
        map: barkTexture,
        roughness: 0.9,
        metalness: 0,
        bumpMap: barkTexture,
        bumpScale: 0.1
    });
    
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 1;
    trunk.castShadow = true;
    tree.add(trunk);

    // Create detailed leaves using instances for better performance
    const leafGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const leafMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x00aa00,
        roughness: 0.8,
        metalness: 0,
        transparent: true,
        opacity: 0.9
    });

    const leavesGroup = new THREE.Group();
    for (let i = 0; i < 20; i++) {
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        leaf.position.set(
            (Math.random() - 0.5) * 1.5,
            2 + Math.random() * 1.5,
            (Math.random() - 0.5) * 1.5
        );
        leaf.scale.set(
            0.8 + Math.random() * 0.4,
            0.8 + Math.random() * 0.4,
            0.8 + Math.random() * 0.4
        );
        leaf.castShadow = true;
        leavesGroup.add(leaf);
    }
    tree.add(leavesGroup);

    // Add wind animation data
    tree.userData.windOffset = Math.random() * Math.PI * 2;
    tree.position.set(x, 0, z);
    scene.add(tree);
    vegetation.trees.push(tree);
    
    return tree;
}

// Create grass patch
function createGrass() {
    const grassGeometry = new THREE.PlaneGeometry(0.4, 0.8);
    const grassMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x33aa33,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });

    const grassPatch = new THREE.InstancedMesh(grassGeometry, grassMaterial, 1000);
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Euler();
    const scale = new THREE.Vector3();

    for (let i = 0; i < 1000; i++) {
        position.x = Math.random() * 100 - 50;
        position.y = 0.4;
        position.z = Math.random() * 200 - 100;
        rotation.z = (Math.random() - 0.5) * 0.5;
        scale.set(1 + Math.random() * 0.4, 1 + Math.random() * 0.4, 1);
        
        matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
        grassPatch.setMatrixAt(i, matrix);
    }

    scene.add(grassPatch);
    vegetation.grass.push(grassPatch);
    return grassPatch;
}

// Create flowers
function createFlowers() {
    const flowerColors = [0xff0000, 0xffff00, 0xff00ff, 0xffffff, 0x00ffff];
    const flowerGeometry = new THREE.Group();
    
    // Flower stem
    const stemGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8);
    const stemMaterial = new THREE.MeshPhysicalMaterial({ color: 0x00aa00 });
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.y = 0.25;
    flowerGeometry.add(stem);

    // Flower petals
    const petalGeometry = new THREE.CircleGeometry(0.1, 5);
    const petalMaterial = new THREE.MeshPhysicalMaterial({
        color: flowerColors[Math.floor(Math.random() * flowerColors.length)],
        side: THREE.DoubleSide,
        metalness: 0.1,
        roughness: 0.8
    });

    for (let i = 0; i < 8; i++) {
        const petal = new THREE.Mesh(petalGeometry, petalMaterial);
        petal.position.y = 0.5;
        petal.rotation.y = (i / 8) * Math.PI * 2;
        petal.rotation.x = Math.PI / 4;
        flowerGeometry.add(petal);
    }

    return flowerGeometry;
}

// Create flower field
function createFlowerField() {
    const flowers = new THREE.Group();
    
    for (let i = 0; i < 200; i++) {
        const flower = createFlowers();
        flower.position.set(
            Math.random() * 100 - 50,
            0,
            Math.random() * 200 - 100
        );
        flower.rotation.y = Math.random() * Math.PI * 2;
        flowers.add(flower);
    }

    scene.add(flowers);
    vegetation.flowers.push(flowers);
    return flowers;
}

// Update vegetation positions and animations
function updateVegetation() {
    const time = Date.now() * 0.001;

    // Update trees
    vegetation.trees.forEach((tree, index) => {
        // Move trees with game speed
        tree.position.z += gameSpeed;
        
        // Reset tree position when it goes off screen
        if (tree.position.z > 10) {
            tree.position.z = -100;
            tree.position.x = (Math.random() - 0.5) * 30;
        }

        // Animate trees in wind
        const windStrength = 0.1;
        const windFrequency = 2;
        tree.children[1].rotation.x = Math.sin(time * windFrequency + tree.userData.windOffset) * windStrength;
        tree.children[1].rotation.z = Math.cos(time * windFrequency + tree.userData.windOffset) * windStrength;
    });

    // Update grass
    vegetation.grass.forEach(grassPatch => {
        // Animate grass in wind
        const positions = grassPatch.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            const offset = Math.sin(time * 2 + positions[i] * 0.5) * 0.1;
            positions[i + 0] += offset;
        }
        grassPatch.geometry.attributes.position.needsUpdate = true;
    });

    // Update flowers
    vegetation.flowers.forEach(flowerField => {
        flowerField.position.z += gameSpeed;
        if (flowerField.position.z > 10) {
            flowerField.position.z = -100;
        }

        // Animate flowers
        flowerField.children.forEach(flower => {
            flower.rotation.y += 0.01;
        });
    });
}

// Initialize vegetation
function initVegetation() {
    // Create initial trees on both sides of the road
    for (let z = -100; z < 0; z += 10) {
        createTree(-8 - Math.random() * 4, z); // Left side
        createTree(8 + Math.random() * 4, z);  // Right side
    }

    // Create grass patches
    createGrass();

    // Create flower fields
    createFlowerField();
}

// Add game state variables
let gameState = 'START'; // Possible states: 'START', 'PLAYING', 'GAME_OVER'
let gameStarted = false;

// Modify init function to show start screen
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);

    // Set up camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, -3);
    camera.lookAt(0, 0, 5);

    // Set up renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Create start screen UI
    createStartScreen();

    // Create game elements but don't start moving yet
    createBike();
    createRoad();
    
    // Set up lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Start animation loop
    animate();
}

// Add function to create start screen
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

    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.3; }
            100% { opacity: 1; }
        }
    `;

    document.head.appendChild(style);
    startScreen.appendChild(title);
    startScreen.appendChild(instruction);
    document.body.appendChild(startScreen);
}

// Modify the keydown event listener
document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        if (gameState === 'START') {
            startGame();
        } else if (gameState === 'PLAYING') {
            if (!isJumping && bike.position.y <= 0.4) {
                isJumping = true;
            }
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

// Add function to start the game
function startGame() {
    gameState = 'PLAYING';
    gameSpeed = 0.5;
    score = 0;
    
    // Remove start screen
    const startScreen = document.getElementById('startScreen');
    if (startScreen) {
        startScreen.style.display = 'none';
    }
}

// Modify animate function to check game state
function animate() {
    requestAnimationFrame(animate);
    
    if (gameState === 'PLAYING') {
        // Update bike position based on current lane
        const targetX = (currentLane - 1) * 1.5;
        bike.position.x += (targetX - bike.position.x) * 0.1;

        // Update jumping
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

function initRenderer() {
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
}

function createStreet() {
    // Enhanced road material
    const roadNormalMap = textureLoader.load('https://threejs.org/examples/textures/waternormals.jpg');
    roadNormalMap.wrapS = roadNormalMap.wrapT = THREE.RepeatWrapping;
    roadNormalMap.repeat.set(4, 100);

    const roadMaterial = new THREE.MeshPhysicalMaterial({ 
        map: roadTexture,
        normalMap: roadNormalMap,
        normalScale: new THREE.Vector2(0.5, 0.5),
        roughnessMap: roadTexture,
        roughness: 0.8,
        metalness: 0.1,
        envMap: envMap,
        envMapIntensity: 0.5
    });

    // Main road
    const road = new THREE.Mesh(
        new THREE.PlaneGeometry(12, 1000),
        roadMaterial
    );
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    scene.add(road);

    // Add reflective lane markers
    const markerMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.5,
        roughness: 0.1,
        envMap: envMap,
        envMapIntensity: 1.0
    });

    // Create lane markers with better geometry
    for (let z = -500; z < 500; z += 5) {
        const marker = new THREE.Mesh(
            new THREE.PlaneGeometry(0.3, 3),
            markerMaterial
        );
        marker.rotation.x = -Math.PI / 2;
        marker.position.set(0, 0.01, z);
        scene.add(marker);
    }
}

function createBike() {
    const bikeGroup = new THREE.Group();
    
    // Enhanced bike body material
    const bodyMaterial = new THREE.MeshPhysicalMaterial({ 
        map: bikeTextures.body,
        normalMap: bikeTextures.normal,
        envMap: envMap,
        metalness: 0.9,
        roughness: 0.1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        envMapIntensity: 1.0
    });

    // Main body with more detailed geometry
    const bodyGeometry = new THREE.Group();
    
    // Main frame
    const mainBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.4, 2),
        bodyMaterial
    );
    mainBody.position.y = 0.8;
    bodyGeometry.add(mainBody);

    // Add neon underglow
    const glowGeometry = new THREE.PlaneGeometry(1.2, 2.4);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.y = 0.2;
    glow.rotation.x = -Math.PI / 2;
    bodyGeometry.add(glow);

    // Add exhaust pipes with emissive materials
    const exhaustGeometry = new THREE.CylinderGeometry(0.05, 0.08, 0.5, 8);
    const exhaustMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x333333,
        metalness: 1.0,
        roughness: 0.2,
        emissive: 0xff4400,
        emissiveIntensity: 0.5
    });

    const leftExhaust = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
    leftExhaust.position.set(-0.3, 0.4, 0.8);
    leftExhaust.rotation.z = Math.PI / 6;
    bodyGeometry.add(leftExhaust);

    const rightExhaust = leftExhaust.clone();
    rightExhaust.position.x = 0.3;
    bodyGeometry.add(rightExhaust);

    // Add LED headlight
    const headlightGeometry = new THREE.ConeGeometry(0.15, 0.3, 16);
    const headlightMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 1.0,
        transparent: true,
        opacity: 0.9
    });
    const headlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    headlight.position.set(0, 0.8, -1);
    headlight.rotation.x = -Math.PI / 2;
    bodyGeometry.add(headlight);

    // Add headlight beam
    const beamGeometry = new THREE.CylinderGeometry(0.1, 2, 10, 16, 1, true);
    const beamMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffaa,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide
    });
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    beam.position.set(0, 0, -5);
    beam.rotation.x = Math.PI / 2;
    headlight.add(beam);

    // Add actual light source
    const headlightLight = new THREE.SpotLight(0xffffaa, 2);
    headlightLight.position.set(0, 1, -1);
    headlightLight.target.position.set(0, 0, -5);
    headlightLight.angle = 0.3;
    headlightLight.penumbra = 0.2;
    headlightLight.decay = 2;
    headlightLight.distance = 20;
    bodyGeometry.add(headlightLight);
    bodyGeometry.add(headlightLight.target);

    bikeGroup.add(bodyGeometry);
    bike = bikeGroup;
    bike.position.y = 0.4;
    
    // Add shadow casting
    bike.traverse((object) => {
        if (object.isMesh) {
            object.castShadow = true;
            object.receiveShadow = true;
        }
    });

    scene.add(bike);
}

function createHouse(x, z) {
    const house = new THREE.Group();

    // Main building
    const buildingGeometry = new THREE.BoxGeometry(3, 4, 3);
    const buildingMaterial = new THREE.MeshPhongMaterial({ 
        color: Math.random() > 0.5 ? 0x666666 : 0x444444 
    });
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.position.y = 2;
    house.add(building);

    // Roof
    const roofGeometry = new THREE.ConeGeometry(2.5, 2, 4);
    const roofMaterial = new THREE.MeshPhongMaterial({ color: 0x331111 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 5;
    roof.rotation.y = Math.PI / 4;
    house.add(roof);

    // Windows
    const windowGeometry = new THREE.PlaneGeometry(0.5, 0.8);
    const windowMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffff66,
        emissive: 0xffff00,
        emissiveIntensity: 0.5
    });

    for (let i = 0; i < 4; i++) {
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        window.position.set(
            (i % 2 === 0 ? 1 : -1) * 0.8,
            2 + (i < 2 ? 1 : -1),
            1.51
        );
        house.add(window);
    }

    house.position.set(x, 0, z);
    scene.add(house);
    houses.push(house);
    return house;
}

function createStreetLight(x, z) {
    const light = new THREE.Group();

    // Pole
    const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 5, 8);
    const poleMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = 2.5;
    light.add(pole);

    // Lamp head
    const headGeometry = new THREE.BoxGeometry(0.5, 0.3, 0.5);
    const headMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0.4, 4.8, 0);
    light.add(head);

    // Light
    const pointLight = new THREE.PointLight(0xffaa00, 0.8, 10);
    pointLight.position.set(0.4, 4.6, 0);
    light.add(pointLight);

    light.position.set(x, 0, z);
    scene.add(light);
    streetLights.push(light);
    return light;
}

function createInitialHouses() {
    for (let z = -100; z < 0; z += 20) {
        createHouse(-8, z); // Left side
        createHouse(8, z);  // Right side
    }
}

function createInitialStreetLights() {
    for (let z = -100; z < 0; z += 15) {
        createStreetLight(-6, z); // Left side
        createStreetLight(6, z);  // Right side
    }
}

function createObstacle() {
    const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
    let obstacle;
    
    switch(type) {
        case 'barrier':
            obstacle = createBarrier();
            break;
        case 'puddle':
            obstacle = createPuddle();
            break;
        default:
            obstacle = createTrashCan();
            break;
    }
    
    const lane = Math.floor(Math.random() * 3);
    obstacle.position.set(lanePositions[lane], 0, -50);
    obstacle.userData.type = type;
    scene.add(obstacle);
    obstacles.push(obstacle);
}

function onKeyDown(event) {
    if (!gameActive) return;

    switch(event.key) {
        case 'ArrowLeft':
            if (currentLane > 0) currentLane--;
            break;
        case 'ArrowRight':
            if (currentLane < 2) currentLane++;
            break;
        case ' ':
            if (!isJumping) jump();
            break;
    }
}

function jump() {
    if (!gameActive) return;
    
    isJumping = true;
    const jumpHeight = 2;
    const jumpDuration = 1000;
    
    const startY = bike.position.y;
    const startTime = Date.now();
    
    function jumpAnimation() {
        if (!gameActive) {
            isJumping = false;
            return;
        }

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

function updateScenery() {
    // Update houses
    houses.forEach((house, index) => {
        house.position.z += gameSpeed;
        if (house.position.z > 10) {
            scene.remove(house);
            houses.splice(index, 1);
            createHouse(house.position.x, -100);
        }
    });

    // Update street lights
    streetLights.forEach((light, index) => {
        light.position.z += gameSpeed;
        if (light.position.z > 10) {
            scene.remove(light);
            streetLights.splice(index, 1);
            createStreetLight(light.position.x, -100);
        }
    });

    // Update LOD for visible objects
    const cameraPosition = camera.position;
    visibleObjects.forEach(object => {
        lodManager.updateObject(object, cameraPosition);
    });
}

function animate() {
    requestAnimationFrame(animate);
    
    if (gameState === 'PLAYING') {
        // Update bike position based on current lane
        const targetX = (currentLane - 1) * 1.5;
        bike.position.x += (targetX - bike.position.x) * 0.1;

        // Update jumping
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

function gameOver() {
    gameActive = false;
    if (score > highScore) {
        highScore = score;
    }
    document.getElementById('game-over').innerHTML = `
        <h2>Game Over!</h2>
        <p>Final Score: ${Math.floor(score)}</p>
        <p>Level Reached: ${gameLevel}</p>
        <p>High Score: ${Math.floor(highScore)}</p>
        <button onclick="restartGame()">Play Again</button>
    `;
    document.getElementById('game-over').style.display = 'block';
}

function restartGame() {
    // Clear obstacles
    obstacles.forEach(obstacle => scene.remove(obstacle));
    obstacles = [];
    
    // Reset game state
    score = 0;
    gameSpeed = 0.2;
    currentLane = 1;
    bike.position.set(0, 0.4, 0);
    gameActive = true;
    lives = 3;
    gameLevel = 1;
    isInvincible = false;
    speedBoostActive = false;
    
    // Clear power-ups and coins
    powerUps.forEach(powerUp => scene.remove(powerUp));
    powerUps = [];
    coins.forEach(coin => scene.remove(coin));
    coins = [];
    
    document.getElementById('game-over').style.display = 'none';
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateUI() {
    document.getElementById('ui').innerHTML = `
        <div id="score">Score: ${Math.floor(score)}</div>
        <div id="high-score">High Score: ${Math.floor(highScore)}</div>
        <div id="lives">Lives: ${'❤️'.repeat(lives)}</div>
        <div id="level">Level: ${gameLevel}</div>
        <div id="combo">Combo: x${comboMultiplier.toFixed(1)}</div>
        ${isRaining ? '<div id="weather">🌧️ Rainy</div>' : ''}
        ${speedBoostActive ? '<div id="boost">🚀 SPEED BOOST</div>' : ''}
        ${isInvincible ? '<div id="invincible">⭐ INVINCIBLE</div>' : ''}
    `;
}

function collectPowerUp(powerUp) {
    switch(powerUp.userData.type) {
        case 'speed':
            activateSpeedBoost();
            break;
        case 'invincibility':
            activateInvincibility();
            break;
        case 'extraLife':
            lives = Math.min(lives + 1, 5);
            break;
    }
}

function activateSpeedBoost() {
    speedBoostActive = true;
    const originalSpeed = gameSpeed;
    gameSpeed *= 2;
    setTimeout(() => {
        gameSpeed = originalSpeed;
        speedBoostActive = false;
    }, 5000);
}

function activateInvincibility() {
    isInvincible = true;
    bike.material.emissive.setHex(0x0000ff);
    setTimeout(() => {
        isInvincible = false;
        bike.material.emissive.setHex(0x000000);
    }, 5000);
}

function levelUp() {
    gameLevel++;
    gameSpeed *= 1.2;
    // Visual feedback for level up
    const flash = new THREE.AmbientLight(0xffffff, 2);
    scene.add(flash);
    setTimeout(() => scene.remove(flash), 200);
}

function createCoin(x, z) {
    const coinGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
    const coinMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffd700,
        metalness: 1,
        roughness: 0.3
    });
    const coin = new THREE.Mesh(coinGeometry, coinMaterial);
    coin.rotation.x = Math.PI / 2;
    coin.position.set(x, 1, z);
    scene.add(coin);
    coins.push(coin);
}

function createPowerUp() {
    const types = ['speed', 'invincibility', 'extraLife'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const material = new THREE.MeshPhongMaterial({ 
        color: type === 'speed' ? 0x00ff00 : 
               type === 'invincibility' ? 0x0000ff : 0xff69b4,
        emissive: type === 'speed' ? 0x00ff00 : 
                  type === 'invincibility' ? 0x0000ff : 0xff69b4,
        emissiveIntensity: 0.5
    });
    
    const powerUp = new THREE.Mesh(geometry, material);
    const lane = Math.floor(Math.random() * 3);
    powerUp.position.set(lanePositions[lane], 1, -50);
    powerUp.userData.type = type;
    scene.add(powerUp);
    powerUps.push(powerUp);
}

// Add weather effects
function createRain() {
    const rainGeometry = new THREE.BufferGeometry();
    const rainMaterial = new THREE.PointsMaterial({
        color: 0x9999ff,
        size: 0.1,
        transparent: true,
        opacity: 0.6
    });

    const rainDrops = [];
    for (let i = 0; i < 1000; i++) {
        rainDrops.push(
            Math.random() * 30 - 15, // x
            Math.random() * 20, // y
            Math.random() * 50 - 25 // z
        );
    }

    rainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rainDrops, 3));
    const rain = new THREE.Points(rainGeometry, rainMaterial);
    scene.add(rain);
    rainParticles.push(rain);
}

function updateRain() {
    rainParticles.forEach(rain => {
        const positions = rain.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 1] -= 0.2; // Move rain down
            positions[i + 2] += gameSpeed; // Move rain with game speed

            if (positions[i + 1] < 0) {
                positions[i + 1] = 20; // Reset to top when reaching bottom
            }
            if (positions[i + 2] > 10) {
                positions[i + 2] = -25; // Reset depth when too close
            }
        }
        rain.geometry.attributes.position.needsUpdate = true;
    });
}

// Add new obstacle types
function createBarrier() {
    const barrier = new THREE.Group();
    
    // Barrier poles
    const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1.2, 8);
    const poleMaterial = new THREE.MeshPhongMaterial({ color: 0xff4444 });
    
    const leftPole = new THREE.Mesh(poleGeometry, poleMaterial);
    leftPole.position.set(-0.8, 0.6, 0);
    barrier.add(leftPole);
    
    const rightPole = new THREE.Mesh(poleGeometry, poleMaterial);
    rightPole.position.set(0.8, 0.6, 0);
    barrier.add(rightPole);
    
    // Barrier stripe
    const stripeGeometry = new THREE.BoxGeometry(1.8, 0.2, 0.1);
    const stripeMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffffff,
        emissive: 0xff0000,
        emissiveIntensity: 0.5
    });
    
    for (let i = 0; i < 3; i++) {
        const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
        stripe.position.set(0, 0.3 + i * 0.4, 0);
        barrier.add(stripe);
    }
    
    return barrier;
}

function createPuddle() {
    const puddleGeometry = new THREE.CircleGeometry(1, 32);
    const puddleMaterial = new THREE.MeshPhongMaterial({
        color: 0x3333ff,
        transparent: true,
        opacity: 0.6,
        shininess: 100
    });
    const puddle = new THREE.Mesh(puddleGeometry, puddleMaterial);
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.y = 0.01; // Slightly above ground
    return puddle;
}

// Update collision handling
function handleCollision(obstacle) {
    if (obstacle.userData.type === 'puddle') {
        if (!isJumping) {
            gameSpeed *= 0.7; // Slow down in puddles
            setTimeout(() => {
                gameSpeed /= 0.7;
            }, 1000);
        }
    } else {
        lives--;
        if (lives <= 0) {
            gameOver();
        } else {
            activateInvincibility();
        }
    }
}

// Add combo system
function updateCombo() {
    const now = Date.now();
    if (now - lastCoinTime < 2000) { // 2 seconds window for combo
        comboMultiplier = Math.min(comboMultiplier + 0.5, 5);
    } else {
        comboMultiplier = 1;
    }
    lastCoinTime = now;
}

// Update weather periodically
function updateWeather() {
    if (Math.random() < 0.001) { // Small chance to change weather
        isRaining = !isRaining;
        if (isRaining) {
            createRain();
            scene.fog.density = 0.03; // Increase fog in rain
        } else {
            rainParticles.forEach(rain => scene.remove(rain));
            rainParticles = [];
            scene.fog.density = 0.02; // Normal fog
        }
    }
}

// Add color cycling for bike
function cycleBikeColor() {
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xff00ff, 0xffff00];
    currentBikeColor = colors[(colors.indexOf(currentBikeColor) + 1) % colors.length];
    bike.children[0].material.color.setHex(currentBikeColor);
}

// Add boost trail effect
function createBoostTrail() {
    const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.5);
    const material = new THREE.MeshPhongMaterial({
        color: currentBikeColor,
        transparent: true,
        opacity: 0.6
    });
    const trail = new THREE.Mesh(geometry, material);
    trail.position.copy(bike.position);
    scene.add(trail);
    boostTrail.push({
        mesh: trail,
        life: 1.0
    });
}

function updateBoostTrail() {
    for (let i = boostTrail.length - 1; i >= 0; i--) {
        const trail = boostTrail[i];
        trail.life -= 0.02;
        trail.mesh.material.opacity = trail.life;
        trail.mesh.scale.multiplyScalar(0.95);
        
        if (trail.life <= 0) {
            scene.remove(trail.mesh);
            boostTrail.splice(i, 1);
        }
    }
}

// Add tutorial mode
function startTutorial() {
    tutorial = true;
    tutorialStep = 0;
    showTutorialMessage();
}

function showTutorialMessage() {
    const messages = [
        "Use LEFT and RIGHT arrows to move between lanes",
        "Press SPACEBAR to jump over obstacles",
        "Collect coins to increase your score",
        "Power-ups will help you survive longer",
        "Watch out for puddles - they'll slow you down!",
        "Ready to ride? Let's go!"
    ];

    if (tutorialStep < messages.length) {
        document.getElementById('tutorial').innerHTML = `
            <div class="tutorial-message">
                ${messages[tutorialStep]}
                <button onclick="nextTutorialStep()">Next</button>
            </div>
        `;
    } else {
        document.getElementById('tutorial').style.display = 'none';
        tutorial = false;
        gameActive = true;
    }
}

function nextTutorialStep() {
    tutorialStep++;
    showTutorialMessage();
}

// Add achievement system
function checkAchievements() {
    if (score > 10000 && !achievements.coinCollector) {
        unlockAchievement('coinCollector', 'Coin Collector', 'Score 10,000 points');
    }
    if (gameSpeed > 0.5 && !achievements.speedDemon) {
        unlockAchievement('speedDemon', 'Speed Demon', 'Reach maximum speed');
    }
    if (isRaining && score > 5000 && !achievements.rainRider) {
        unlockAchievement('rainRider', 'Rain Rider', 'Score 5,000 points in the rain');
    }
    if (lives === 3 && score > 15000 && !achievements.perfectRun) {
        unlockAchievement('perfectRun', 'Perfect Run', 'Score 15,000 points without losing lives');
    }
}

function unlockAchievement(id, title, description) {
    achievements[id] = true;
    showAchievementPopup(title, description);
}

function showAchievementPopup(title, description) {
    const popup = document.createElement('div');
    popup.className = 'achievement-popup';
    popup.innerHTML = `
        <h3>🏆 Achievement Unlocked!</h3>
        <h4>${title}</h4>
        <p>${description}</p>
    `;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 3000);
}

// Update the CSS
const style = document.createElement('style');
style.textContent = `
    .achievement-popup {
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 15px;
        border-radius: 10px;
        border: 2px solid gold;
        animation: slideIn 0.5s ease-out;
    }

    .tutorial-message {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px;
        border-radius: 10px;
        text-align: center;
    }

    @keyframes slideIn {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
    }
`;
document.head.appendChild(style);

// Add environment effects
function createEnvironment() {
    // Add stars
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.1,
        transparent: true,
        opacity: 0.8
    });

    const starsVertices = [];
    for (let i = 0; i < 1000; i++) {
        starsVertices.push(
            Math.random() * 1000 - 500,
            Math.random() * 500,
            Math.random() * 1000 - 500
        );
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    // Add moon
    const moonGeometry = new THREE.SphereGeometry(50, 32, 32);
    const moonMaterial = new THREE.MeshPhongMaterial({
        color: 0x888888,
        emissive: 0x444444
    });
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.position.set(-100, 200, -500);
    scene.add(moon);
}

// Add post-processing effects
function setupPostProcessing() {
    const composer = new THREE.EffectComposer(renderer);
    
    // Regular scene render
    const renderPass = new THREE.RenderPass(scene, camera);
    composer.addPass(renderPass);

    // Bloom effect for neon and lights
    const bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5, 0.4, 0.85
    );
    composer.addPass(bloomPass);

    // Color correction
    const colorCorrectionPass = new THREE.ShaderPass({
        uniforms: {
            tDiffuse: { value: null },
            brightness: { value: 0.05 },
            contrast: { value: 0.95 },
            saturation: { value: 1.2 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform float brightness;
            uniform float contrast;
            uniform float saturation;
            varying vec2 vUv;
            void main() {
                vec4 color = texture2D(tDiffuse, vUv);
                color.rgb += brightness;
                color.rgb = (color.rgb - 0.5) * contrast + 0.5;
                float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
                color.rgb = mix(vec3(gray), color.rgb, saturation);
                gl_FragColor = color;
            }
        `
    });
    composer.addPass(colorCorrectionPass);

    return composer;
}

// Add new visual effects
function addVisualEffects() {
    // Add lens flares for street lights
    const textureLoader = new THREE.TextureLoader();
    const flareTexture = textureLoader.load('https://threejs.org/examples/textures/lensflare/lensflare0.png');
    
    streetLights.forEach(light => {
        const lensflare = new THREE.Lensflare();
        lensflare.addElement(new THREE.LensflareElement(flareTexture, 100, 0));
        light.children[2].add(lensflare); // Add to light source
    });

    // Add ground reflection
    const mirrorGeometry = new THREE.PlaneGeometry(12, 1000);
    const groundMirror = new THREE.Reflector(mirrorGeometry, {
        clipBias: 0.003,
        textureWidth: window.innerWidth * window.devicePixelRatio,
        textureHeight: window.innerHeight * window.devicePixelRatio,
        color: 0x889999
    });
    groundMirror.rotation.x = -Math.PI / 2;
    groundMirror.position.y = 0.01;
    scene.add(groundMirror);

    // Add neon signs to buildings
    houses.forEach(house => {
        addNeonSignToHouse(house);
    });
}

function addNeonSignToHouse(house) {
    const neonColors = [0xff00ff, 0x00ffff, 0xffff00];
    const color = neonColors[Math.floor(Math.random() * neonColors.length)];
    
    const signGeometry = new THREE.TextGeometry('NIGHT', {
        font: neonFont,
        size: 0.5,
        height: 0.1
    });
    
    const signMaterial = new THREE.MeshPhongMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 1,
        transparent: true,
        opacity: 0.9
    });
    
    const sign = new THREE.Mesh(signGeometry, signMaterial);
    sign.position.set(0, 4, 1.52);
    house.add(sign);

    // Add glow effect
    const glowMaterial = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(color) }
        },
        vertexShader: `
            varying vec3 vNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 color;
            varying vec3 vNormal;
            void main() {
                float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 4.0);
                gl_FragColor = vec4(color, 1.0) * intensity;
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending
    });
    
    const glowMesh = new THREE.Mesh(signGeometry, glowMaterial);
    glowMesh.position.copy(sign.position);
    glowMesh.scale.multiplyScalar(1.1);
    house.add(glowMesh);
}

// Enhance bike effects
function enhanceBikeEffects() {
    // Add energy field around bike during speed boost
    const energyGeometry = new THREE.SphereGeometry(1.5, 32, 32);
    const energyMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            color: { value: new THREE.Color(0x00ff00) }
        },
        vertexShader: `
            varying vec3 vNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform vec3 color;
            varying vec3 vNormal;
            void main() {
                float intensity = pow(0.8 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
                intensity *= sin(time * 5.0) * 0.5 + 0.5;
                gl_FragColor = vec4(color, 1.0) * intensity;
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending
    });
    
    const energyField = new THREE.Mesh(energyGeometry, energyMaterial);
    bike.add(energyField);
    energyField.visible = false;
    
    // Update animation
    function updateEnergyField() {
        if (speedBoostActive) {
            energyField.visible = true;
            energyField.material.uniforms.time.value += 0.016;
        } else {
            energyField.visible = false;
        }
    }
    
    return updateEnergyField;
}

// Add motion blur effect
function addMotionBlur() {
    const motionBlurPass = new THREE.ShaderPass({
        uniforms: {
            tDiffuse: { value: null },
            velocity: { value: 0 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform float velocity;
            varying vec2 vUv;
            void main() {
                vec4 color = texture2D(tDiffuse, vUv);
                vec2 direction = vec2(0.0, -1.0);
                vec4 blur = vec4(0.0);
                float samples = 6.0;
                
                for(float i = 0.0; i < samples; i++) {
                    vec2 offset = direction * (i / samples) * velocity * 0.1;
                    blur += texture2D(tDiffuse, vUv + offset);
                }
                
                gl_FragColor = blur / samples;
            }
        `
    });
    
    composer.addPass(motionBlurPass);
    
    // Update motion blur based on speed
    function updateMotionBlur() {
        motionBlurPass.uniforms.velocity.value = gameSpeed * 2;
    }
    
    return updateMotionBlur;
}

// Add volumetric fog effect
function addVolumetricFog() {
    const fogGeometry = new THREE.BoxGeometry(100, 10, 100);
    const fogMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            fogColor: { value: new THREE.Color(0x000066) }
        },
        vertexShader: `
            varying vec3 vPosition;
            void main() {
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform vec3 fogColor;
            varying vec3 vPosition;
            
            float noise(vec3 p) {
                return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
            }
            
            void main() {
                float density = noise(vPosition * 0.1 + time * 0.1);
                density = smoothstep(0.3, 0.7, density);
                gl_FragColor = vec4(fogColor, density * 0.3);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending
    });
    
    const fog = new THREE.Mesh(fogGeometry, fogMaterial);
    fog.position.y = 5;
    scene.add(fog);
    return fog;
}

// Add dynamic environment mapping
function addDynamicEnvironment() {
    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256);
    const cubeCamera = new THREE.CubeCamera(1, 1000, cubeRenderTarget);
    scene.add(cubeCamera);
    
    return {
        update: function() {
            bike.visible = false;
            cubeCamera.position.copy(bike.position);
            cubeCamera.update(renderer, scene);
            bike.visible = true;
            bike.children[0].material.envMap = cubeRenderTarget.texture;
        }
    };
}

// Add light trails effect
function createLightTrails() {
    const trailGeometry = new THREE.BufferGeometry();
    const trailMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            color: { value: new THREE.Color(currentBikeColor) }
        },
        vertexShader: `
            attribute float alpha;
            varying float vAlpha;
            void main() {
                vAlpha = alpha;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 color;
            varying float vAlpha;
            void main() {
                gl_FragColor = vec4(color, vAlpha);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending
    });

    const trail = new THREE.Mesh(trailGeometry, trailMaterial);
    scene.add(trail);
    return trail;
}

// Add interactive particles
function addInteractiveParticles() {
    const particleCount = 1000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    
    for(let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = Math.random() * 100 - 50;
        positions[i + 1] = Math.random() * 20;
        positions[i + 2] = Math.random() * 100 - 50;
        
        velocities[i] = (Math.random() - 0.5) * 0.1;
        velocities[i + 1] = (Math.random() - 0.5) * 0.1;
        velocities[i + 2] = (Math.random() - 0.5) * 0.1;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    
    const material = new THREE.PointsMaterial({
        size: 0.1,
        color: 0x88ccff,
        transparent: true,
        opacity: 0.6,
        map: createParticleTexture()
    });
    
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    return particles;
}

function createParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
}

function updateInteractiveParticles(particles, bikePosition) {
    const positions = particles.geometry.attributes.position.array;
    const velocities = particles.geometry.attributes.velocity.array;
    
    for(let i = 0; i < positions.length; i += 3) {
        // Apply velocity
        positions[i] += velocities[i];
        positions[i + 1] += velocities[i + 1];
        positions[i + 2] += velocities[i + 2];
        
        // Attract to bike
        const dx = bikePosition.x - positions[i];
        const dy = bikePosition.y - positions[i + 1];
        const dz = bikePosition.z - positions[i + 2];
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if(distance < 10) {
            velocities[i] += dx * 0.0001;
            velocities[i + 1] += dy * 0.0001;
            velocities[i + 2] += dz * 0.0001;
        }
    }
    
    particles.geometry.attributes.position.needsUpdate = true;
}

function updateLightTrails(trail, position) {
    // Update trail positions based on bike movement
    const positions = trail.geometry.attributes.position.array;
    const alphas = trail.geometry.attributes.alpha.array;
    
    // Shift old positions
    for(let i = positions.length - 3; i >= 3; i -= 3) {
        positions[i] = positions[i - 3];
        positions[i + 1] = positions[i - 2];
        positions[i + 2] = positions[i - 1];
        alphas[i/3] = alphas[i/3 - 1] * 0.95;
    }
    
    // Add new position
    positions[0] = position.x;
    positions[1] = position.y;
    positions[2] = position.z;
    alphas[0] = 1.0;
    
    trail.geometry.attributes.position.needsUpdate = true;
    trail.geometry.attributes.alpha.needsUpdate = true;
}

// Initialize new effects
function initEnhancedGraphics() {
    scene.background = skyboxTextures.night;
    addVisualEffects();
    const updateEnergyField = enhanceBikeEffects();
    const updateMotionBlur = addMotionBlur();
    
    return { updateEnergyField, updateMotionBlur };
}

// Create decorative bush
function createBush(x, z) {
    const bush = new THREE.Group();
    
    // Create multiple layers of foliage
    const bushColors = [0x2d5a27, 0x1e4d1c, 0x3a6b35];
    for (let i = 0; i < 5; i++) {
        const foliageGeometry = new THREE.SphereGeometry(0.5 - i * 0.1, 8, 8);
        const foliageMaterial = new THREE.MeshPhysicalMaterial({
            color: bushColors[i % 3],
            roughness: 0.8,
            metalness: 0,
            transparent: true,
            opacity: 0.9
        });
        
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.y = i * 0.2;
        foliage.position.x = (Math.random() - 0.5) * 0.3;
        foliage.position.z = (Math.random() - 0.5) * 0.3;
        bush.add(foliage);
    }

    bush.position.set(x, 0, z);
    scene.add(bush);
    environment.bushes.push(bush);
    return bush;
}

// Create animated butterfly
function createButterfly() {
    const butterfly = new THREE.Group();
    
    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    butterfly.add(body);
    
    // Wings
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.quadraticCurveTo(0.1, 0.1, 0.2, 0);
    wingShape.quadraticCurveTo(0.1, -0.1, 0, 0);
    
    const wingGeometry = new THREE.ShapeGeometry(wingShape);
    const wingMaterial = new THREE.MeshPhongMaterial({
        color: Math.random() > 0.5 ? 0xff69b4 : 0x4169e1,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });
    
    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
    leftWing.position.set(-0.1, 0, 0);
    butterfly.add(leftWing);
    
    const rightWing = leftWing.clone();
    rightWing.position.set(0.1, 0, 0);
    rightWing.scale.x = -1;
    butterfly.add(rightWing);
    
    // Add animation data
    butterfly.userData = {
        wingAngle: 0,
        speed: 0.1 + Math.random() * 0.1,
        height: 1 + Math.random() * 2,
        offset: Math.random() * Math.PI * 2
    };
    
    butterfly.position.set(
        (Math.random() - 0.5) * 20,
        butterfly.userData.height,
        Math.random() * -100
    );
    
    scene.add(butterfly);
    environment.butterflies.push(butterfly);
    return butterfly;
}

// Create firefly effect
function createFirefly() {
    const firefly = new THREE.Group();
    
    // Glowing core
    const coreGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.8
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    firefly.add(core);
    
    // Light source
    const light = new THREE.PointLight(0xffff00, 0.5, 2);
    firefly.add(light);
    
    // Animation data
    firefly.userData = {
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5,
        radius: 2 + Math.random() * 3
    };
    
    scene.add(firefly);
    environment.fireflies.push(firefly);
    return firefly;
}

// Create cloud
function createCloud() {
    const cloud = new THREE.Group();
    
    // Create multiple spheres for puffy appearance
    const positions = [
        [0, 0, 0], [1, 0.2, 0], [-1, 0.1, 0],
        [0.5, 0.3, 0.5], [-0.5, 0.2, -0.5]
    ];
    
    positions.forEach(pos => {
        const puffGeometry = new THREE.SphereGeometry(0.8, 8, 8);
        const puffMaterial = new THREE.MeshPhongMaterial({
            color: 0xeeeeee,
            transparent: true,
            opacity: 0.8
        });
        const puff = new THREE.Mesh(puffGeometry, puffMaterial);
        puff.position.set(pos[0], pos[1], pos[2]);
        cloud.add(puff);
    });
    
    cloud.position.set(
        (Math.random() - 0.5) * 50,
        15 + Math.random() * 10,
        Math.random() * -100
    );
    
    scene.add(cloud);
    environment.clouds.push(cloud);
    return cloud;
}

// Update environment animations
function updateEnvironment() {
    const time = Date.now() * 0.001;
    
    // Update butterflies
    environment.butterflies.forEach(butterfly => {
        // Wing flapping animation
        butterfly.userData.wingAngle += 0.2;
        butterfly.children[1].rotation.y = Math.sin(butterfly.userData.wingAngle) * 0.5;
        butterfly.children[2].rotation.y = -Math.sin(butterfly.userData.wingAngle) * 0.5;
        
        // Flying movement
        butterfly.position.x += Math.sin(time + butterfly.userData.offset) * 0.02;
        butterfly.position.y = butterfly.userData.height + Math.sin(time * 2 + butterfly.userData.offset) * 0.1;
        butterfly.position.z += butterfly.userData.speed;
        
        // Reset position when too far
        if (butterfly.position.z > 10) {
            butterfly.position.z = -100;
            butterfly.position.x = (Math.random() - 0.5) * 20;
        }
    });
    
    // Update fireflies
    environment.fireflies.forEach(firefly => {
        // Glowing animation
        const glow = Math.sin(time * 2 + firefly.userData.phase) * 0.5 + 0.5;
        firefly.children[0].material.opacity = glow * 0.8;
        firefly.children[1].intensity = glow * 0.5;
        
        // Movement
        const angle = time * firefly.userData.speed;
        firefly.position.x = Math.cos(angle) * firefly.userData.radius;
        firefly.position.y = 1 + Math.sin(time * 2) * 0.5;
        firefly.position.z += gameSpeed;
        
        // Reset position
        if (firefly.position.z > 10) {
            firefly.position.z = -100;
        }
    });
    
    // Update clouds
    environment.clouds.forEach(cloud => {
        cloud.position.z += gameSpeed * 0.5;
        if (cloud.position.z > 50) {
            cloud.position.z = -100;
            cloud.position.x = (Math.random() - 0.5) * 50;
        }
    });
}

// Initialize environment
function initEnvironment() {
    // Create bushes along the road
    for (let z = -100; z < 0; z += 5) {
        createBush(-10 - Math.random() * 2, z);
        createBush(10 + Math.random() * 2, z);
    }
    
    // Create butterflies
    for (let i = 0; i < 20; i++) {
        createButterfly();
    }
    
    // Create fireflies (more visible at night)
    for (let i = 0; i < 30; i++) {
        createFirefly();
    }
    
    // Create clouds
    for (let i = 0; i < 10; i++) {
        createCloud();
    }
}

// Add new function to create first person elements
function createFirstPersonElements() {
    const fpElements = new THREE.Group();

    // Add rear view mirrors
    const createMirror = (isLeft) => {
        const mirror = new THREE.Group();
        
        // Mirror stem
        const stemGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8);
        const stemMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x333333,
            metalness: 0.9,
            roughness: 0.1
        });
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.rotation.z = isLeft ? Math.PI / 4 : -Math.PI / 4;
        mirror.add(stem);

        // Mirror surface
        const mirrorGeometry = new THREE.PlaneGeometry(0.15, 0.1);
        const mirrorMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 1,
            roughness: 0,
            envMap: envMap,
            envMapIntensity: 1
        });
        const mirrorSurface = new THREE.Mesh(mirrorGeometry, mirrorMaterial);
        mirrorSurface.position.y = 0.1;
        mirrorSurface.rotation.x = -0.1;
        mirrorSurface.rotation.y = isLeft ? Math.PI / 6 : -Math.PI / 6;
        mirror.add(mirrorSurface);

        mirror.position.set(isLeft ? -0.4 : 0.4, 0, 0.3);
        return mirror;
    };

    fpElements.add(createMirror(true));
    fpElements.add(createMirror(false));

    // Add digital dashboard
    const dashboardGeometry = new THREE.BoxGeometry(0.6, 0.3, 0.05);
    const dashboardMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x111111,
        metalness: 0.7,
        roughness: 0.3
    });
    const dashboard = new THREE.Mesh(dashboardGeometry, dashboardMaterial);
    dashboard.position.set(0, -0.1, 0.4);
    dashboard.rotation.x = -Math.PI / 6;
    fpElements.add(dashboard);

    // Digital display screen
    const screenGeometry = new THREE.PlaneGeometry(0.55, 0.25);
    const screenMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            speed: { value: 0 },
            gear: { value: 1 },
            boost: { value: 0 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform float speed;
            uniform float gear;
            uniform float boost;
            varying vec2 vUv;

            void main() {
                vec3 color = vec3(0.0, 0.8, 0.2); // Base green color
                
                // Speed bar
                float speedBar = step(vUv.x, speed * 0.5);
                
                // Digital number effect
                float flash = sin(time * 10.0) * 0.5 + 0.5;
                
                // Boost indicator
                float boostGlow = boost * sin(time * 20.0) * 0.5 + 0.5;
                
                if (vUv.y > 0.8) {
                    // Top status bar
                    color = mix(color, vec3(1.0), speedBar);
                } else if (vUv.y < 0.2) {
                    // Bottom boost indicator
                    color = mix(color, vec3(1.0, 0.0, 0.0), boostGlow);
                }
                
                // Add scan line effect
                float scanLine = sin(vUv.y * 50.0 + time * 5.0) * 0.05 + 0.95;
                
                gl_FragColor = vec4(color * scanLine, 1.0);
            }
        `
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.set(0, -0.1, 0.41);
    screen.rotation.x = -Math.PI / 6;
    fpElements.add(screen);

    // Add tachometer ring
    const tachRingGeometry = new THREE.RingGeometry(0.12, 0.15, 32);
    const tachRingMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x00ff00,
        emissive: 0x00ff00,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.8
    });
    const tachRing = new THREE.Mesh(tachRingGeometry, tachRingMaterial);
    tachRing.position.set(0.2, -0.05, 0.42);
    tachRing.rotation.x = -Math.PI / 6;
    fpElements.add(tachRing);

    // Add windshield effect
    const windshieldGeometry = new THREE.PlaneGeometry(2, 1);
    const windshieldMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.1,
        metalness: 0.9,
        roughness: 0.1,
        envMap: envMap
    });
    const windshield = new THREE.Mesh(windshieldGeometry, windshieldMaterial);
    windshield.position.set(0, 0.3, 0.5);
    windshield.rotation.x = -0.3;
    fpElements.add(windshield);

    // Add rain effect on windshield (only visible when raining)
    const raindropsGeometry = new THREE.BufferGeometry();
    const raindropPositions = [];
    for (let i = 0; i < 1000; i++) {
        raindropPositions.push(
            Math.random() * 2 - 1,
            Math.random() * 1,
            0
        );
    }
    raindropsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(raindropPositions, 3));
    const rainDropsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.01,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending
    });
    const raindrops = new THREE.Points(raindropsGeometry, rainDropsMaterial);
    raindrops.position.copy(windshield.position);
    raindrops.rotation.copy(windshield.rotation);
    raindrops.visible = false;
    fpElements.add(raindrops);

    // Add handlebar vibration effect
    const handlebarGroup = createDetailedHandlebars();
    fpElements.add(handlebarGroup);

    // Add arms with jacket effect
    const arms = createDetailedArms();
    fpElements.add(arms.left);
    fpElements.add(arms.right);

    // Add front wheel with suspension
    const wheelAssembly = createDetailedWheel();
    fpElements.add(wheelAssembly);

    // Add to camera
    camera.add(fpElements);
    scene.add(camera);

    return {
        screen,
        handlebarGroup,
        wheelAssembly,
        raindrops,
        arms,
        updateDisplay: (gameData) => {
            screen.material.uniforms.time.value += 0.016;
            screen.material.uniforms.speed.value = gameData.speed;
            screen.material.uniforms.boost.value = gameData.boost ? 1.0 : 0.0;
            raindrops.visible = gameData.isRaining;
        }
    };
}

// Add new function to create detailed handlebars with controls
function createDetailedHandlebars() {
    const handlebarGroup = new THREE.Group();

    // Main handlebar tube
    const handlebarGeometry = new THREE.TorusGeometry(0.3, 0.02, 16, 32);
    const handlebarMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x333333,
        metalness: 0.9,
        roughness: 0.1,
        envMap: envMap
    });
    const handlebar = new THREE.Mesh(handlebarGeometry, handlebarMaterial);
    handlebar.rotation.x = Math.PI / 2;
    handlebarGroup.add(handlebar);

    // Add grip details
    const createGrip = (isLeft) => {
        const gripGroup = new THREE.Group();
        
        // Rubber grip
        const gripGeometry = new THREE.CylinderGeometry(0.025, 0.028, 0.15, 16);
        const gripMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x111111,
            roughness: 0.9,
            metalness: 0.1
        });
        const grip = new THREE.Mesh(gripGeometry, gripMaterial);
        grip.rotation.z = Math.PI / 2;
        gripGroup.add(grip);

        // Brake lever
        const leverGeometry = new THREE.BoxGeometry(0.1, 0.02, 0.01);
        const leverMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x666666,
            metalness: 0.8,
            roughness: 0.2
        });
        const lever = new THREE.Mesh(leverGeometry, leverMaterial);
        lever.position.set(0.05, 0.03, 0);
        lever.rotation.z = -Math.PI / 6;
        gripGroup.add(lever);

        gripGroup.position.set(isLeft ? -0.3 : 0.3, 0, 0);
        return gripGroup;
    };

    handlebarGroup.add(createGrip(true));
    handlebarGroup.add(createGrip(false));

    // Add control panel
    const panelGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.05);
    const panelMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x222222,
        metalness: 0.7,
        roughness: 0.3
    });
    const panel = new THREE.Mesh(panelGeometry, panelMaterial);
    panel.position.set(0, 0.05, 0.1);
    handlebarGroup.add(panel);

    // Add buttons and switches
    const buttonGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.01, 16);
    const buttonMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.5
    });
    
    [-0.05, 0, 0.05].forEach(x => {
        const button = new THREE.Mesh(buttonGeometry, buttonMaterial.clone());
        button.position.set(x, 0.05, 0.13);
        handlebarGroup.add(button);
    });

    handlebarGroup.position.set(0, -0.2, 0.3);
    return handlebarGroup;
}

// Add new function to create detailed arms with gloves
function createDetailedArms() {
    const createArm = (isLeft) => {
        const armGroup = new THREE.Group();

        // Jacket sleeve
        const sleeveGeometry = new THREE.CylinderGeometry(0.04, 0.03, 0.3, 8);
        const sleeveMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x000066,
            roughness: 0.8,
            metalness: 0.1
        });
        const sleeve = new THREE.Mesh(sleeveGeometry, sleeveMaterial);
        sleeve.rotation.z = Math.PI / 2;
        armGroup.add(sleeve);

        // Glove
        const gloveGeometry = new THREE.BoxGeometry(0.06, 0.03, 0.08);
        const gloveMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x111111,
            roughness: 0.9,
            metalness: 0.1
        });
        const glove = new THREE.Mesh(gloveGeometry, gloveMaterial);
        glove.position.set(0.15, 0, 0);
        armGroup.add(glove);

        // Add armor details
        const armorGeometry = new THREE.BoxGeometry(0.08, 0.04, 0.06);
        const armorMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x444444,
            metalness: 0.8,
            roughness: 0.2
        });
        const armor = new THREE.Mesh(armorGeometry, armorMaterial);
        armor.position.set(0.05, 0.04, 0);
        armGroup.add(armor);

        armGroup.position.set(isLeft ? -0.3 : 0.3, -0.2, 0.3);
        return armGroup;
    };

    return {
        left: createArm(true),
        right: createArm(false)
    };
}

// Add new function to create detailed front wheel with suspension
function createDetailedWheel() {
    const wheelAssembly = new THREE.Group();

    // Tire
    const tireGeometry = new THREE.TorusGeometry(0.2, 0.05, 16, 32);
    const tireMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x111111,
        roughness: 0.9,
        metalness: 0.1
    });
    const tire = new THREE.Mesh(tireGeometry, tireMaterial);
    tire.rotation.x = Math.PI / 2;

    // Spokes
    const spokesGroup = new THREE.Group();
    for (let i = 0; i < 8; i++) {
        const spokeGeometry = new THREE.CylinderGeometry(0.002, 0.002, 0.19, 4);
        const spokeMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xcccccc,
            metalness: 0.9,
            roughness: 0.1
        });
        const spoke = new THREE.Mesh(spokeGeometry, spokeMaterial);
        spoke.rotation.z = (i / 8) * Math.PI * 2;
        spokesGroup.add(spoke);
    }
    tire.add(spokesGroup);

    // Suspension forks
    const createFork = (isLeft) => {
        const forkGroup = new THREE.Group();
        
        // Main fork tube
        const tubeGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8);
        const tubeMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x666666,
            metalness: 0.9,
            roughness: 0.1
        });
        const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
        tube.position.y = 0.2;
        forkGroup.add(tube);

        // Shock absorber
        const shockGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.2, 8);
        const shockMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x333333,
            metalness: 0.8,
            roughness: 0.2
        });
        const shock = new THREE.Mesh(shockGeometry, shockMaterial);
        shock.position.set(0, 0.1, 0.02);
        forkGroup.add(shock);

        forkGroup.position.set(isLeft ? -0.15 : 0.15, -0.2, 0);
        return forkGroup;
    };

    wheelAssembly.add(tire);
    wheelAssembly.add(createFork(true));
    wheelAssembly.add(createFork(false));

    wheelAssembly.position.set(0, -0.8, 0.5);
    return wheelAssembly;
}

// Add new function for advanced first-person effects
function createAdvancedFirstPersonEffects() {
    // Create head movement simulation
    function simulateHeadMovement(camera) {
        const headBob = {
            timer: 0,
            amplitude: 0.05,
            frequency: 2
        };

        return {
            update: (speed) => {
                headBob.timer += speed;
                camera.position.y = 1.7 + Math.sin(headBob.timer * headBob.frequency) * headBob.amplitude * speed;
                camera.rotation.z = Math.sin(headBob.timer * headBob.frequency * 0.5) * 0.01 * speed;
            }
        };
    }

    // Create breathing effect
    function createBreathingEffect(fpElements) {
        const breathingConfig = {
            timer: 0,
            frequency: 0.5,
            amplitude: 0.02
        };

        return {
            update: () => {
                breathingConfig.timer += 0.016;
                const breathingOffset = Math.sin(breathingConfig.timer * breathingConfig.frequency) * breathingConfig.amplitude;
                fpElements.position.z += breathingOffset;
            }
        };
    }

    // Create visor effects
    const visorEffects = new THREE.Group();

    // Add helmet interior edges
    const helmetGeometry = new THREE.RingGeometry(2, 2.1, 32);
    const helmetMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x111111,
        metalness: 0.9,
        roughness: 0.1,
        transparent: true,
        opacity: 0.3
    });
    const helmetEdge = new THREE.Mesh(helmetGeometry, helmetMaterial);
    helmetEdge.position.z = 0.1;
    visorEffects.add(helmetEdge);

    // Add HUD elements
    const hudGeometry = new THREE.PlaneGeometry(0.3, 0.1);
    const hudMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            speed: { value: 0 },
            boost: { value: 0 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform float speed;
            uniform float boost;
            varying vec2 vUv;

            void main() {
                vec3 color = vec3(0.0, 1.0, 0.5);
                float alpha = 0.0;

                // Create digital readout effect
                float scanLine = mod(vUv.y * 10.0 + time, 1.0);
                scanLine = smoothstep(0.5, 0.51, scanLine) * 0.2;

                // Speed indicator
                if (vUv.x < speed) {
                    alpha = 0.8;
                    color = mix(vec3(0.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), speed);
                }

                // Boost indicator
                if (boost > 0.0) {
                    float flash = sin(time * 10.0) * 0.5 + 0.5;
                    color = mix(color, vec3(1.0, 0.5, 0.0), flash * boost);
                }

                gl_FragColor = vec4(color, alpha + scanLine);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending
    });

    // Add speed display
    const speedDisplay = new THREE.Mesh(hudGeometry, hudMaterial);
    speedDisplay.position.set(0.4, -0.2, 0.5);
    visorEffects.add(speedDisplay);

    // Add compass bar
    const compassGeometry = new THREE.PlaneGeometry(0.8, 0.05);
    const compassMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            direction: { value: 0 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform float direction;
            varying vec2 vUv;

            void main() {
                vec3 color = vec3(0.0, 1.0, 0.5);
                float alpha = 0.3;

                // Create moving compass markers
                float marker = mod(vUv.x * 10.0 - direction + time, 1.0);
                marker = smoothstep(0.45, 0.55, marker);

                gl_FragColor = vec4(color, alpha * marker);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending
    });

    const compass = new THREE.Mesh(compassGeometry, compassMaterial);
    compass.position.set(0, 0.4, 0.5);
    visorEffects.add(compass);

    // Add visor dirt/rain effects
    const raindropsGeometry = new THREE.BufferGeometry();
    const raindropPositions = new Float32Array(1000 * 3);
    for (let i = 0; i < raindropPositions.length; i += 3) {
        raindropPositions[i] = (Math.random() - 0.5) * 2;
        raindropPositions[i + 1] = (Math.random() - 0.5) * 2;
        raindropPositions[i + 2] = 0;
    }
    raindropsGeometry.setAttribute('position', new THREE.BufferAttribute(raindropPositions, 3));

    const rainDropsMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            speed: { value: 0 }
        },
        vertexShader: `
            uniform float time;
            uniform float speed;
            varying float vAlpha;
            
            void main() {
                vec3 pos = position;
                pos.y = mod(pos.y - time * speed, 2.0) - 1.0;
                vAlpha = 1.0 - abs(pos.y);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = 2.0;
            }
        `,
        fragmentShader: `
            varying float vAlpha;
            void main() {
                vec2 center = gl_PointCoord - 0.5;
                float dist = length(center);
                float alpha = smoothstep(0.5, 0.2, dist) * vAlpha * 0.3;
                gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending
    });

    const raindrops = new THREE.Points(raindropsGeometry, rainDropsMaterial);
    raindrops.visible = false;
    visorEffects.add(raindrops);

    return {
        headMovement: simulateHeadMovement(camera),
        breathing: createBreathingEffect(fpElements),
        visorEffects,
        raindrops,
        updateEffects: (gameData) => {
            // Update HUD
            speedDisplay.material.uniforms.time.value += 0.016;
            speedDisplay.material.uniforms.speed.value = gameData.speed / 2;
            speedDisplay.material.uniforms.boost.value = gameData.boost ? 1.0 : 0.0;

            // Update compass
            compass.material.uniforms.time.value += 0.016;
            compass.material.uniforms.direction.value = gameData.direction;

            // Update rain effects
            raindrops.visible = gameData.isRaining;
            if (gameData.isRaining) {
                raindrops.material.uniforms.time.value += 0.016;
                raindrops.material.uniforms.speed.value = gameData.speed + 0.5;
            }
        }
    };
}

// Add new function for advanced cockpit effects
function createCockpitEffects() {
    const cockpitGroup = new THREE.Group();

    // Add dynamic speedometer with 3D elements
    const speedometerGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 32);
    const speedometerMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            speed: { value: 0 },
            maxSpeed: { value: 2.0 }
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vPosition;
            void main() {
                vUv = uv;
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform float speed;
            uniform float maxSpeed;
            varying vec2 vUv;
            varying vec3 vPosition;

            void main() {
                // Create circular gauge effect
                float angle = atan(vPosition.z, vPosition.x);
                float normalizedSpeed = speed / maxSpeed;
                float speedIndicator = step(angle, normalizedSpeed * 6.28 - 3.14);
                
                // Add pulsing effect
                float pulse = sin(time * 10.0) * 0.5 + 0.5;
                
                // Create gradient colors based on speed
                vec3 baseColor = mix(
                    vec3(0.0, 1.0, 0.0),
                    vec3(1.0, 0.0, 0.0),
                    normalizedSpeed
                );
                
                // Add digital readout effect
                float scanLine = mod(vUv.y * 20.0 + time * 5.0, 1.0);
                float scanEffect = smoothstep(0.4, 0.6, scanLine);
                
                vec3 finalColor = mix(baseColor, baseColor * 1.5, scanEffect * pulse * speedIndicator);
                float alpha = speedIndicator * (0.8 + pulse * 0.2);
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide
    });

    const speedometer = new THREE.Mesh(speedometerGeometry, speedometerMaterial);
    speedometer.position.set(0.2, -0.1, 0.4);
    speedometer.rotation.x = -Math.PI / 4;
    cockpitGroup.add(speedometer);

    // Add holographic warning system
    const warningDisplayGeometry = new THREE.PlaneGeometry(0.4, 0.1);
    const warningDisplayMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            danger: { value: 0.0 },
            isRaining: { value: 0.0 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform float danger;
            uniform float isRaining;
            varying vec2 vUv;

            void main() {
                vec3 warningColor = vec3(1.0, 0.0, 0.0);
                vec3 rainColor = vec3(0.0, 0.5, 1.0);
                float alpha = 0.0;

                // Warning flash effect
                float warningFlash = sin(time * 20.0) * 0.5 + 0.5;
                float warningIntensity = danger * warningFlash;

                // Rain indicator effect
                float rainPulse = sin(time * 5.0) * 0.5 + 0.5;
                float rainIntensity = isRaining * rainPulse;

                // Create HUD-style lines
                float lines = step(0.9, sin(vUv.y * 50.0 + time * 2.0));
                
                vec3 finalColor = mix(
                    rainColor * rainIntensity,
                    warningColor * warningIntensity,
                    danger
                );

                alpha = max(warningIntensity, rainIntensity) * (0.7 + lines * 0.3);
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending
    });

    const warningDisplay = new THREE.Mesh(warningDisplayGeometry, warningDisplayMaterial);
    warningDisplay.position.set(0, 0.2, 0.4);
    cockpitGroup.add(warningDisplay);

    // Add interactive control highlights
    const createControlLight = (position, color) => {
        const lightGeometry = new THREE.CircleGeometry(0.02, 16);
        const lightMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.8
        });
        const light = new THREE.Mesh(lightGeometry, lightMaterial);
        light.position.copy(position);
        return light;
    };

    // Add control lights for different functions
    const controlLights = {
        left: createControlLight(new THREE.Vector3(-0.3, -0.15, 0.35), 0x00ff00),
        right: createControlLight(new THREE.Vector3(0.3, -0.15, 0.35), 0x00ff00),
        boost: createControlLight(new THREE.Vector3(0, -0.15, 0.35), 0xff0000)
    };

    Object.values(controlLights).forEach(light => cockpitGroup.add(light));

    // Add handlebar grip animations
    const leftGrip = fpElements.handlebarGroup.children[1];
    const rightGrip = fpElements.handlebarGroup.children[2];

    // Return update function for all cockpit effects
    return {
        update: (gameData) => {
            // Update speedometer
            speedometer.material.uniforms.time.value += 0.016;
            speedometer.material.uniforms.speed.value = gameData.speed;

            // Update warning display
            warningDisplay.material.uniforms.time.value += 0.016;
            warningDisplay.material.uniforms.danger.value = 
                Math.min(1.0, gameData.obstacleProximity || 0);
            warningDisplay.material.uniforms.isRaining.value = 
                gameData.isRaining ? 1.0 : 0.0;

            // Update control lights
            controlLights.left.material.opacity = 
                (gameData.turning === 'left') ? 0.8 : 0.2;
            controlLights.right.material.opacity = 
                (gameData.turning === 'right') ? 0.8 : 0.2;
            controlLights.boost.material.opacity = 
                gameData.boost ? 0.8 : 0.2;

            // Animate grips based on input
            leftGrip.rotation.x = gameData.turning === 'left' ? 0.1 : 0;
            rightGrip.rotation.x = gameData.turning === 'right' ? 0.1 : 0;
        }
    };
}

// Add object pooling for frequently created objects
const objectPool = {
    particles: [],
    obstacles: [],
    effects: [],
    
    initialize() {
        // Pre-create objects for reuse
        for (let i = 0; i < 100; i++) {
            this.particles.push(this.createParticle());
            this.obstacles.push(this.createObstacle());
            this.effects.push(this.createEffect());
        }
    },
    
    getParticle() {
        return this.particles.pop() || this.createParticle();
    },
    
    returnParticle(particle) {
        if (this.particles.length < 100) {
            this.particles.push(particle);
        }
    }
};

// Add level of detail system
function createLODSystem() {
    const lodSystem = {
        distances: {
            high: 20,
            medium: 50,
            low: 100
        },
        
        updateMeshDetail(object, distanceFromCamera) {
            if (distanceFromCamera < this.distances.high) {
                object.geometry = object.geometries.high;
            } else if (distanceFromCamera < this.distances.medium) {
                object.geometry = object.geometries.medium;
            } else {
                object.geometry = object.geometries.low;
            }
        }
    };
    
    return lodSystem;
}

// Add improved physics system
const physicsSystem = {
    gravity: -9.81,
    friction: 0.98,
    airResistance: 0.995,
    
    update(deltaTime) {
        // Apply physics to bike
        if (isJumping) {
            bike.velocity.y += this.gravity * deltaTime;
            bike.position.y += bike.velocity.y * deltaTime;
            
            // Ground collision
            if (bike.position.y <= 0.4) {
                bike.position.y = 0.4;
                bike.velocity.y = 0;
                isJumping = false;
            }
        }
        
        // Apply air resistance
        bike.velocity.x *= this.airResistance;
        bike.velocity.z *= this.airResistance;
        
        // Apply banking physics during turns
        if (currentLane !== previousLane) {
            const bankAngle = (currentLane - previousLane) * 0.2;
            bike.rotation.z = -bankAngle;
        }
    }
};

// Improve collision detection
function enhancedCollisionDetection(object1, object2) {
    // Create bounding boxes
    const box1 = new THREE.Box3().setFromObject(object1);
    const box2 = new THREE.Box3().setFromObject(object2);
    
    // Check for intersection
    if (box1.intersectsBox(box2)) {
        // Detailed collision check using raycasting
        const raycaster = new THREE.Raycaster();
        // ... implement detailed collision detection
        return true;
    }
    return false;
}

// Add motion blur effect based on speed
const motionBlurPass = new THREE.ShaderPass({
    uniforms: {
        tDiffuse: { value: null },
        velocity: { value: new THREE.Vector2() },
        strength: { value: 1.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 velocity;
        uniform float strength;
        varying vec2 vUv;
        
        void main() {
            vec4 color = vec4(0.0);
            float samples = 8.0;
            
            for(float i = 0.0; i < samples; i++) {
                vec2 offset = velocity * (i / samples) * strength;
                color += texture2D(tDiffuse, vUv + offset);
            }
            
            gl_FragColor = color / samples;
        }
    `
});

// Add dynamic environment mapping
function createDynamicReflections() {
    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
        format: THREE.RGBFormat,
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter
    });
    
    const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget);
    scene.add(cubeCamera);
    
    return {
        update() {
            cubeCamera.position.copy(bike.position);
            cubeCamera.update(renderer, scene);
            bike.material.envMap = cubeRenderTarget.texture;
        }
    };
}

// Add 3D positional audio system
const audioSystem = {
    listener: new THREE.AudioListener(),
    sounds: {},
    
    initialize() {
        camera.add(this.listener);
        
        // Load sound effects
        const audioLoader = new THREE.AudioLoader();
        
        this.loadSound('engine', 'sounds/engine.mp3', true);
        this.loadSound('wind', 'sounds/wind.mp3', true);
        this.loadSound('collision', 'sounds/collision.mp3', false);
        this.loadSound('powerup', 'sounds/powerup.mp3', false);
    },
    
    loadSound(name, url, isLoop) {
        const sound = new THREE.PositionalAudio(this.listener);
        const audioLoader = new THREE.AudioLoader();
        
        audioLoader.load(url, (buffer) => {
            sound.setBuffer(buffer);
            sound.setLoop(isLoop);
            sound.setVolume(0.5);
            sound.setRefDistance(20);
        });
        
        this.sounds[name] = sound;
    },
    
    updateEngine(speed) {
        if (this.sounds.engine) {
            this.sounds.engine.playbackRate = 0.5 + speed;
        }
    }
};

// Add proper game state management
const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameOver'
};

const gameManager = {
    currentState: GameState.MENU,
    
    setState(newState) {
        this.currentState = newState;
        this.handleStateChange();
    },
    
    handleStateChange() {
        switch(this.currentState) {
            case GameState.MENU:
                this.showMenu();
                break;
            case GameState.PLAYING:
                this.startGame();
                break;
            case GameState.PAUSED:
                this.pauseGame();
                break;
            case GameState.GAME_OVER:
                this.endGame();
                break;
        }
    },
    
    update(deltaTime) {
        if (this.currentState === GameState.PLAYING) {
            // Update game logic
            physicsSystem.update(deltaTime);
            updateScenery();
            updatePlayer();
        }
    }
};

// Add enhanced object pooling system
const enhancedObjectPool = {
    // ... existing code ...
    
    // Add specialized pools
    trailParticles: [],
    raindrops: [],
    sparkEffects: [],
    
    initialize() {
        // Pre-create objects with different geometries and materials
        const geometries = {
            particle: new THREE.SphereGeometry(0.05, 4, 4),
            trail: new THREE.BoxGeometry(0.1, 0.1, 0.1),
            spark: new THREE.ConeGeometry(0.05, 0.2, 4)
        };
        
        const materials = {
            particle: new THREE.MeshPhysicalMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.6
            }),
            trail: new THREE.MeshPhysicalMaterial({
                color: currentBikeColor,
                transparent: true,
                opacity: 0.8
            }),
            spark: new THREE.MeshPhysicalMaterial({
                color: 0xffaa00,
                emissive: 0xffaa00,
                emissiveIntensity: 0.5
            })
        };
        
        // Initialize pools
        for (let i = 0; i < 200; i++) {
            this.trailParticles.push(new THREE.Mesh(geometries.trail, materials.trail.clone()));
            this.raindrops.push(new THREE.Mesh(geometries.particle, materials.particle.clone()));
            this.sparkEffects.push(new THREE.Mesh(geometries.spark, materials.spark.clone()));
        }
    },
    
    getObject(type) {
        const pool = this[type];
        return pool.pop() || this.createObject(type);
    },
    
    returnObject(object, type) {
        const pool = this[type];
        if (pool.length < 200) {
            object.visible = false;
            pool.push(object);
        } else {
            scene.remove(object);
        }
    }
};

// Enhanced physics system with improved bike handling
const enhancedPhysics = {
    // ... existing physics system ...
    
    bikePhysics: {
        mass: 200,
        drag: 0.1,
        engineForce: 0,
        brakingForce: 0,
        maxSpeed: 2.0,
        acceleration: 0.01,
        deceleration: 0.005,
        turnForce: 0.08,
        bankingAngle: 0,
        suspensionTravel: 0.2,
        suspensionStiffness: 0.8,
        wheelBase: 1.4,
        gravity: -9.81
    },
    
    updateBikePhysics(deltaTime) {
        // Apply engine force
        this.bikePhysics.engineForce = gameSpeed * this.bikePhysics.acceleration;
        
        // Apply banking during turns
        const targetBank = (currentLane - 1) * this.bikePhysics.turnForce;
        this.bikePhysics.bankingAngle += (targetBank - this.bikePhysics.bankingAngle) * 0.1;
        bike.rotation.z = -this.bikePhysics.bankingAngle;
        
        // Suspension simulation
        if (isJumping) {
            const suspensionForce = this.bikePhysics.gravity * deltaTime;
            bike.position.y = Math.max(
                0.4,
                bike.position.y + suspensionForce
            );
        } else {
            // Ground suspension
            const groundForce = Math.sin(Date.now() * 0.01) * 0.02 * gameSpeed;
            bike.position.y = 0.4 + groundForce * this.bikePhysics.suspensionTravel;
        }
        
        // Apply speed limitations
        if (speedBoostActive) {
            gameSpeed = Math.min(gameSpeed, this.bikePhysics.maxSpeed * 1.5);
        } else {
            gameSpeed = Math.min(gameSpeed, this.bikePhysics.maxSpeed);
        }
    }
};

// Enhanced visual effects system
const enhancedVisuals = {
    // Add new shader for dynamic road surface
    roadShader: new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            speed: { value: 0 },
            nightFactor: { value: 1.0 },
            rainFactor: { value: 0.0 }
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vPosition;
            varying vec3 vNormal;
            
            void main() {
                vUv = uv;
                vPosition = position;
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform float speed;
            uniform float nightFactor;
            uniform float rainFactor;
            
            varying vec2 vUv;
            varying vec3 vPosition;
            varying vec3 vNormal;
            
            void main() {
                // Base road color
                vec3 roadColor = vec3(0.1, 0.1, 0.1);
                
                // Add lane markers
                float laneMarker = step(0.98, mod(vUv.x * 3.0, 1.0));
                laneMarker *= step(0.48, mod(vUv.y * 50.0 - time * speed, 1.0));
                
                // Add rain effect
                float rainRipple = sin(vUv.y * 100.0 + time * 10.0) * 
                                 sin(vUv.x * 100.0 + time * 5.0);
                float rainEffect = rainFactor * rainRipple * 0.5;
                
                // Add night glow from markers
                float nightGlow = laneMarker * nightFactor;
                
                // Add wetness effect
                float wetness = rainFactor * 0.5;
                
                // Combine effects
                vec3 finalColor = mix(roadColor, vec3(1.0), laneMarker * 0.8);
                finalColor += vec3(0.2, 0.4, 1.0) * rainEffect;
                finalColor += vec3(1.0, 0.8, 0.2) * nightGlow;
                
                // Add specular highlight for wet surface
                float specular = pow(max(0.0, dot(vNormal, vec3(0.0, 1.0, 0.0))), 
                                  mix(10.0, 30.0, wetness));
                
                gl_FragColor = vec4(finalColor + specular * wetness, 1.0);
            }
        `
    }),
    
    // Add new effect for bike energy field
    bikeEnergyField: new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            boostFactor: { value: 0 },
            color: { value: new THREE.Color(0x00ff88) }
        },
        vertexShader: `
            varying vec3 vPosition;
            varying vec3 vNormal;
            
            void main() {
                vPosition = position;
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform float boostFactor;
            uniform vec3 color;
            
            varying vec3 vPosition;
            varying vec3 vNormal;
            
            void main() {
                float pulse = sin(time * 5.0) * 0.5 + 0.5;
                float energyLine = abs(sin(vPosition.y * 10.0 + time * 3.0));
                float rim = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
                
                vec3 finalColor = color * (pulse * 0.5 + 0.5);
                float alpha = (rim + energyLine * 0.5) * boostFactor;
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending
    })
};

// Enhanced object pooling system with integration into existing particle and object systems
class AdvancedObjectPool {
    constructor() {
        this.pools = {
            speedTrail: [],
            raindrops: [],
            coins: [],
            powerUps: [],
            obstacles: [],
            particles: []
        };
        
        // Cache geometries and materials
        this.geometries = {
            particle: new THREE.SphereGeometry(0.05, 4, 4),
            trail: new THREE.BoxGeometry(0.1, 0.1, 0.1),
            coin: new THREE.CylinderGeometry(0.3, 0.3, 0.05, 16),
            powerUp: new THREE.BoxGeometry(0.5, 0.5, 0.5),
            obstacle: new THREE.BoxGeometry(1, 1, 1)
        };
        
        this.materials = {
            trail: new THREE.MeshPhysicalMaterial({
                color: 0x00ff88,
                transparent: true,
                opacity: 0.6
            }),
            raindrop: new THREE.MeshBasicMaterial({
                color: 0xaaaaff,
                transparent: true,
                opacity: 0.5
            }),
            coin: new THREE.MeshPhongMaterial({
                color: 0xffdd00,
                metalness: 1.0,
                roughness: 0.2
            })
        };
    }

    initialize() {
        // Pre-populate pools
        const counts = {
            speedTrail: 200,
            raindrops: 1000,
            coins: 20,
            powerUps: 10,
            obstacles: 30,
            particles: 500
        };

        for (const [type, count] of Object.entries(counts)) {
            for (let i = 0; i < count; i++) {
                const object = this.createObject(type);
                object.visible = false;
                this.pools[type].push(object);
            }
        }
    }

    createObject(type) {
        switch (type) {
            case 'speedTrail':
                return new THREE.Mesh(
                    this.geometries.trail,
                    this.materials.trail.clone()
                );
            case 'raindrops':
                return new THREE.Mesh(
                    this.geometries.particle,
                    this.materials.raindrop.clone()
                );
            case 'coins':
                return new THREE.Mesh(
                    this.geometries.coin,
                    this.materials.coin.clone()
                );
            // Add other cases as needed
        }
    }

    get(type) {
        const pool = this.pools[type];
        if (pool.length > 0) {
            const object = pool.pop();
            object.visible = true;
            return object;
        }
        return this.createObject(type);
    }

    return(object, type) {
        if (this.pools[type].length < this.getMaxPoolSize(type)) {
            object.visible = false;
            this.pools[type].push(object);
        } else {
            scene.remove(object);
        }
    }

    getMaxPoolSize(type) {
        const sizes = {
            speedTrail: 300,
            raindrops: 1500,
            coins: 30,
            powerUps: 15,
            obstacles: 45,
            particles: 750
        };
        return sizes[type] || 100;
    }
}

// Add LOD (Level of Detail) system for complex objects
class LODManager {
    constructor() {
        this.lodLevels = {
            high: { distance: 20, detail: 1 },
            medium: { distance: 50, detail: 0.5 },
            low: { distance: 100, detail: 0.25 }
        };
        
        this.geometries = {
            tree: {
                high: new THREE.CylinderGeometry(0.2, 0.4, 4, 12),
                medium: new THREE.CylinderGeometry(0.2, 0.4, 4, 8),
                low: new THREE.CylinderGeometry(0.2, 0.4, 4, 6)
            },
            house: {
                high: new THREE.BoxGeometry(4, 6, 4, 4, 4, 4),
                medium: new THREE.BoxGeometry(4, 6, 4, 2, 2, 2),
                low: new THREE.BoxGeometry(4, 6, 4, 1, 1, 1)
            }
        };
    }

    getGeometryForDistance(type, distance) {
        if (distance < this.lodLevels.high.distance) {
            return this.geometries[type].high;
        } else if (distance < this.lodLevels.medium.distance) {
            return this.geometries[type].medium;
        }
        return this.geometries[type].low;
    }

    updateObject(object, cameraPosition) {
        const distance = object.position.distanceTo(cameraPosition);
        const type = object.userData.type;
        
        if (type && this.geometries[type]) {
            const newGeometry = this.getGeometryForDistance(type, distance);
            if (object.geometry !== newGeometry) {
                object.geometry.dispose();
                object.geometry = newGeometry;
            }
        }
    }
}