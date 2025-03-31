class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
    }

    createSpeedParticles(position) {
        const geometry = new THREE.BufferGeometry();
        const material = new THREE.PointsMaterial({
            size: 0.1,
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });

        const positions = [];
        for (let i = 0; i < 20; i++) {
            positions.push(
                position.x + (Math.random() - 0.5) * 0.5,
                position.y + (Math.random() - 0.5) * 0.5,
                position.z + (Math.random() - 0.5) * 0.5
            );
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const particleSystem = new THREE.Points(geometry, material);
        this.scene.add(particleSystem);
        this.particles.push({
            system: particleSystem,
            life: 1.0
        });
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.life -= 0.02;
            particle.system.material.opacity = particle.life;

            if (particle.life <= 0) {
                this.scene.remove(particle.system);
                this.particles.splice(i, 1);
            }
        }
    }
} 