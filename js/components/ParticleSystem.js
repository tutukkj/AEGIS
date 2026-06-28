// public/js/components/ParticleSystem.js

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.particleGroups = [];
        this.clock = new THREE.Clock();

        // Configurações
        this.config = {
            trailLength: 20,
            particleCount: 100,
            speed: 0.5,
            size: 0.05,
            colors: [0x8b5cf6, 0x60a5fa, 0x34d399, 0xfbbf24]
        };
    }

    /**
     * Cria um rastro de partículas entre dois pontos
     */
    createTrail(startPos, endPos, options = {}) {
        const count = options.count || 50;
        const duration = options.duration || 2000;
        const color = options.color || 0x8b5cf6;
        const size = options.size || 0.08;

        const particles = [];
        const startTime = performance.now();

        // Criar grupo de partículas
        const group = new THREE.Group();
        this.scene.add(group);

        for (let i = 0; i < count; i++) {
            const progress = i / count;
            const pos = new THREE.Vector3().lerpVectors(startPos, endPos, progress);

            // Adicionar aleatoriedade
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 0.3
            );
            pos.add(offset);

            const geometry = new THREE.SphereGeometry(size * (1 - progress * 0.5), 6, 6);
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 1 - progress * 0.8
            });

            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(pos);
            particle.userData = {
                progress: progress,
                startPos: startPos.clone(),
                endPos: endPos.clone(),
                offset: offset,
                life: 1 - progress,
                speed: 0.5 + Math.random() * 0.5
            };

            group.add(particle);
            particles.push(particle);
        }

        // Armazenar para animação
        this.particleGroups.push({
            group: group,
            particles: particles,
            startTime: startTime,
            duration: duration,
            active: true
        });

        // Retornar função para limpar
        return () => {
            this.removeTrail(group);
        };
    }

    /**
     * Cria um fluxo de partículas entre dois pontos (contínuo)
     */
    createParticleStream(startPos, endPos, options = {}) {
        const count = options.count || 30;
        const interval = options.interval || 50;
        const color = options.color || 0x8b5cf6;
        const size = options.size || 0.06;
        const speed = options.speed || 1;

        const streamGroup = new THREE.Group();
        this.scene.add(streamGroup);

        let isActive = true;
        let lastSpawn = 0;

        const spawnParticle = () => {
            if (!isActive) return;

            const progress = Math.random();
            const pos = new THREE.Vector3().lerpVectors(startPos, endPos, progress);

            // Adicionar aleatoriedade lateral
            const lateralOffset = new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2
            );
            pos.add(lateralOffset);

            const geometry = new THREE.SphereGeometry(size, 4, 4);
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.8
            });

            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(pos);
            particle.userData = {
                startPos: startPos.clone(),
                endPos: endPos.clone(),
                progress: progress,
                speed: speed * (0.5 + Math.random() * 0.5),
                life: 1,
                maxLife: 1 + Math.random() * 0.5
            };

            streamGroup.add(particle);

            // Animação da partícula
            const animateParticle = () => {
                if (!isActive || !particle.parent) return;

                particle.userData.progress += 0.01 * particle.userData.speed;
                particle.userData.life -= 0.005 / particle.userData.maxLife;

                if (particle.userData.progress >= 1 || particle.userData.life <= 0) {
                    streamGroup.remove(particle);
                    return;
                }

                const pos = new THREE.Vector3().lerpVectors(
                    particle.userData.startPos,
                    particle.userData.endPos,
                    particle.userData.progress
                );

                // Oscilação lateral
                const time = performance.now() * 0.001;
                const osc = Math.sin(time * 2 + particle.userData.progress * 10) * 0.05;
                pos.x += osc;
                pos.y += Math.cos(time * 1.5 + particle.userData.progress * 8) * 0.05;

                particle.position.copy(pos);
                particle.material.opacity = particle.userData.life * 0.8;
                particle.scale.setScalar(0.5 + particle.userData.life * 0.5);

                requestAnimationFrame(animateParticle);
            };

            animateParticle();
        };

        // Spawn contínuo
        const spawnLoop = () => {
            if (!isActive) return;

            const now = performance.now();
            if (now - lastSpawn > interval) {
                spawnParticle();
                lastSpawn = now;
            }

            requestAnimationFrame(spawnLoop);
        };

        spawnLoop();

        // Retornar função para parar
        return () => {
            isActive = false;
            setTimeout(() => {
                this.scene.remove(streamGroup);
            }, 1000);
        };
    }

    /**
     * Cria uma explosão de partículas em um ponto
     */
    createExplosion(position, options = {}) {
        const count = options.count || 80;
        const color = options.color || 0x8b5cf6;
        const size = options.size || 0.1;
        const speed = options.speed || 5;
        const duration = options.duration || 1500;

        const particles = [];
        const startTime = performance.now();

        for (let i = 0; i < count; i++) {
            const geometry = new THREE.SphereGeometry(size * (0.3 + Math.random() * 0.7), 6, 6);
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 1
            });

            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);

            // Direção aleatória
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            const velocity = new THREE.Vector3(
                Math.sin(phi) * Math.cos(theta),
                Math.sin(phi) * Math.sin(theta),
                Math.cos(phi)
            ).multiplyScalar(speed * (0.5 + Math.random() * 0.5));

            particle.userData = {
                velocity: velocity,
                life: 1,
                decay: 0.005 + Math.random() * 0.01
            };

            this.scene.add(particle);
            particles.push(particle);
        }

        // Animação da explosão
        const animateExplosion = () => {
            const now = performance.now();
            const elapsed = now - startTime;

            if (elapsed > duration) {
                particles.forEach(p => {
                    this.scene.remove(p);
                    p.geometry.dispose();
                    p.material.dispose();
                });
                return;
            }

            const progress = elapsed / duration;

            particles.forEach(p => {
                p.userData.life -= p.userData.decay;
                if (p.userData.life <= 0) {
                    p.visible = false;
                    return;
                }

                p.position.add(p.userData.velocity.clone().multiplyScalar(0.016));
                p.userData.velocity.multiplyScalar(0.99);
                p.material.opacity = p.userData.life;
                const scale = 0.3 + p.userData.life * 0.7;
                p.scale.setScalar(scale);
            });

            requestAnimationFrame(animateExplosion);
        };

        animateExplosion();
    }

    /**
     * Cria um campo de partículas flutuantes
     */
    createParticleField(options = {}) {
        const count = options.count || 200;
        const color = options.color || 0x8b5cf6;
        const size = options.size || 0.03;
        const spread = options.spread || 20;
        const opacity = options.opacity || 0.3;

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = [];
        const sizes = new Float32Array(count);

        for (let i = 0; i < count * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * spread;
            positions[i + 1] = (Math.random() - 0.5) * spread;
            positions[i + 2] = (Math.random() - 0.5) * spread;

            velocities.push({
                x: (Math.random() - 0.5) * 0.02,
                y: (Math.random() - 0.5) * 0.02,
                z: (Math.random() - 0.5) * 0.02
            });

            sizes[i / 3] = size * (0.3 + Math.random() * 0.7);
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            color: color,
            size: size,
            transparent: true,
            opacity: opacity,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });

        const particles = new THREE.Points(geometry, material);
        this.scene.add(particles);

        // Animação
        const animateField = () => {
            const positions = particles.geometry.attributes.position.array;

            for (let i = 0; i < positions.length; i += 3) {
                positions[i] += velocities[i / 3].x;
                positions[i + 1] += velocities[i / 3].y;
                positions[i + 2] += velocities[i / 3].z;

                // Rebater nas bordas
                const halfSpread = spread / 2;
                if (Math.abs(positions[i]) > halfSpread) velocities[i / 3].x *= -1;
                if (Math.abs(positions[i + 1]) > halfSpread) velocities[i / 3].y *= -1;
                if (Math.abs(positions[i + 2]) > halfSpread) velocities[i / 3].z *= -1;
            }

            particles.geometry.attributes.position.needsUpdate = true;

            if (this.scene && particles.parent) {
                requestAnimationFrame(animateField);
            }
        };

        animateField();

        // Retornar referência para limpar
        return {
            dispose: () => {
                this.scene.remove(particles);
                particles.geometry.dispose();
                particles.material.dispose();
            }
        };
    }

    /**
     * Remove um rastro de partículas
     */
    removeTrail(group) {
        const index = this.particleGroups.findIndex(pg => pg.group === group);
        if (index !== -1) {
            const pg = this.particleGroups[index];
            pg.active = false;

            // Remover gradativamente
            setTimeout(() => {
                pg.particles.forEach(p => {
                    pg.group.remove(p);
                    p.geometry.dispose();
                    p.material.dispose();
                });
                this.scene.remove(pg.group);
                this.particleGroups.splice(index, 1);
            }, 500);
        }
    }

    /**
     * Cria um efeito de conexão pulsante entre dois nós
     */
    createPulsingConnection(startPos, endPos, options = {}) {
        const color = options.color || 0x8b5cf6;
        const width = options.width || 0.03;
        const pulseSpeed = options.pulseSpeed || 1;

        // Criar linha base
        const points = [
            startPos.clone(),
            endPos.clone()
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.3
        });
        const line = new THREE.Line(geometry, material);
        this.scene.add(line);

        // Criar pulsos de luz
        const pulseCount = 3;
        const pulses = [];

        for (let i = 0; i < pulseCount; i++) {
            const pulseGeo = new THREE.SphereGeometry(width * 2, 8, 8);
            const pulseMat = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending
            });
            const pulse = new THREE.Mesh(pulseGeo, pulseMat);
            pulse.position.copy(startPos);
            pulse.userData = {
                progress: i / pulseCount,
                speed: pulseSpeed * (0.8 + Math.random() * 0.4)
            };
            this.scene.add(pulse);
            pulses.push(pulse);
        }

        // Animação
        let isActive = true;

        const animatePulse = () => {
            if (!isActive) return;

            pulses.forEach(pulse => {
                pulse.userData.progress += 0.01 * pulse.userData.speed;
                if (pulse.userData.progress > 1) {
                    pulse.userData.progress = 0;
                }

                const pos = new THREE.Vector3().lerpVectors(
                    startPos,
                    endPos,
                    pulse.userData.progress
                );
                pulse.position.copy(pos);

                // Tamanho e opacidade variáveis
                const life = 1 - Math.abs(pulse.userData.progress - 0.5) * 2;
                const scale = 0.5 + life * 1.5;
                pulse.scale.setScalar(scale);
                pulse.material.opacity = life * 0.8;
            });

            requestAnimationFrame(animatePulse);
        };

        animatePulse();

        // Retornar função para limpar
        return () => {
            isActive = false;
            this.scene.remove(line);
            pulses.forEach(p => {
                this.scene.remove(p);
                p.geometry.dispose();
                p.material.dispose();
            });
        };
    }

    /**
     * Limpa todas as partículas
     */
    clearAll() {
        this.particleGroups.forEach(pg => {
            pg.particles.forEach(p => {
                pg.group.remove(p);
                p.geometry.dispose();
                p.material.dispose();
            });
            this.scene.remove(pg.group);
        });
        this.particleGroups = [];
    }
}