// public/js/components/AnimationEngine.js

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';

export class AnimationEngine {
    constructor(scene) {
        this.scene = scene;
        this.animations = [];
        this.tweens = [];
        this.clock = new THREE.Clock();
    }

    /**
     * Anima a transição de um objeto entre duas posições
     */
    animatePosition(object, targetPos, duration = 1000, easing = 'easeInOut') {
        return new Promise((resolve) => {
            const startPos = object.position.clone();
            const startTime = performance.now();

            const update = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = this.getEasing(easing)(progress);

                object.position.lerpVectors(startPos, targetPos, eased);

                if (progress < 1) {
                    requestAnimationFrame(update);
                } else {
                    object.position.copy(targetPos);
                    resolve();
                }
            };

            update();
        });
    }

    /**
     * Anima a escala de um objeto
     */
    animateScale(object, targetScale, duration = 500, easing = 'easeOut') {
        return new Promise((resolve) => {
            const startScale = object.scale.clone();
            const startTime = performance.now();

            const update = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = this.getEasing(easing)(progress);

                object.scale.x = startScale.x + (targetScale.x - startScale.x) * eased;
                object.scale.y = startScale.y + (targetScale.y - startScale.y) * eased;
                object.scale.z = startScale.z + (targetScale.z - startScale.z) * eased;

                if (progress < 1) {
                    requestAnimationFrame(update);
                } else {
                    object.scale.copy(targetScale);
                    resolve();
                }
            };

            update();
        });
    }

    /**
     * Anima a cor de um material
     */
    animateColor(material, targetColor, duration = 500, easing = 'easeInOut') {
        return new Promise((resolve) => {
            const startColor = material.color.clone();
            const startTime = performance.now();

            const update = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = this.getEasing(easing)(progress);

                material.color.r = startColor.r + (targetColor.r - startColor.r) * eased;
                material.color.g = startColor.g + (targetColor.g - startColor.g) * eased;
                material.color.b = startColor.b + (targetColor.b - startColor.b) * eased;

                if (progress < 1) {
                    requestAnimationFrame(update);
                } else {
                    material.color.copy(targetColor);
                    resolve();
                }
            };

            update();
        });
    }

    /**
     * Cria uma animação de flutuação contínua
     */
    createFloatingAnimation(object, options = {}) {
        const amplitude = options.amplitude || 0.3;
        const speed = options.speed || 1;
        const phase = options.phase || 0;

        const startY = object.position.y;
        let isActive = true;

        const update = () => {
            if (!isActive) return;

            const time = performance.now() * 0.001;
            object.position.y = startY + Math.sin(time * speed + phase) * amplitude;

            requestAnimationFrame(update);
        };

        update();

        return () => {
            isActive = false;
        };
    }

    /**
     * Cria uma animação de rotação contínua
     */
    createRotationAnimation(object, options = {}) {
        const speed = options.speed || 0.01;
        const axis = options.axis || 'y';
        let isActive = true;

        const update = () => {
            if (!isActive) return;

            object.rotation[axis] += speed;

            requestAnimationFrame(update);
        };

        update();

        return () => {
            isActive = false;
        };
    }

    /**
     * Cria uma animação de pulso (escala)
     */
    createPulseAnimation(object, options = {}) {
        const minScale = options.minScale || 0.8;
        const maxScale = options.maxScale || 1.2;
        const speed = options.speed || 1;
        const phase = options.phase || 0;

        let isActive = true;

        const update = () => {
            if (!isActive) return;

            const time = performance.now() * 0.001;
            const scale = minScale + (maxScale - minScale) * (0.5 + 0.5 * Math.sin(time * speed + phase));
            object.scale.setScalar(scale);

            requestAnimationFrame(update);
        };

        update();

        return () => {
            isActive = false;
        };
    }

    /**
     * Cria uma animação de trajetória curva
     */
    createPathAnimation(object, path, duration = 2000, easing = 'easeInOut') {
        return new Promise((resolve) => {
            const startTime = performance.now();

            const update = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = this.getEasing(easing)(progress);

                const index = Math.floor(eased * (path.length - 1));
                const nextIndex = Math.min(index + 1, path.length - 1);
                const localProgress = (eased * (path.length - 1)) % 1;

                const pos = new THREE.Vector3().lerpVectors(
                    path[index],
                    path[nextIndex],
                    localProgress
                );

                object.position.copy(pos);

                if (progress < 1) {
                    requestAnimationFrame(update);
                } else {
                    object.position.copy(path[path.length - 1]);
                    resolve();
                }
            };

            update();
        });
    }

    /**
     * Cria um efeito de onda em um grupo de objetos
     */
    createWaveEffect(objects, options = {}) {
        const amplitude = options.amplitude || 0.5;
        const speed = options.speed || 1;
        const spread = options.spread || 1;
        let isActive = true;

        // Guardar posições originais
        const originalPositions = objects.map(obj => obj.position.clone());

        const update = () => {
            if (!isActive) return;

            const time = performance.now() * 0.001;

            objects.forEach((obj, index) => {
                const offset = index * spread;
                const wave = Math.sin(time * speed + offset) * amplitude;
                obj.position.y = originalPositions[index].y + wave;
            });

            requestAnimationFrame(update);
        };

        update();

        return () => {
            isActive = false;
            // Restaurar posições
            objects.forEach((obj, index) => {
                obj.position.copy(originalPositions[index]);
            });
        };
    }

    /**
     * Funções de easing
     */
    getEasing(type) {
        const easings = {
            linear: (t) => t,
            easeIn: (t) => t * t,
            easeOut: (t) => 1 - (1 - t) * (1 - t),
            easeInOut: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
            easeInCubic: (t) => t * t * t,
            easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
            easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
            easeOutElastic: (t) => {
                const c4 = (2 * Math.PI) / 3;
                return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
            },
            easeOutBack: (t) => {
                const c1 = 1.70158;
                const c3 = c1 + 1;
                return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
            }
        };

        return easings[type] || easings.linear;
    }

    /**
     * Cria uma cadeia de animações (sequência)
     */
    createSequence(animations) {
        return async () => {
            for (const anim of animations) {
                await anim();
            }
        };
    }

    /**
     * Cria animações paralelas
     */
    createParallel(animations) {
        return async () => {
            await Promise.all(animations.map(anim => anim()));
        };
    }

    /**
     * Limpa todas as animações
     */
    clearAll() {
        // Parar todas as animações contínuas
        // (implementação depende de como as animações são armazenadas)
        this.animations = [];
        this.tweens = [];
    }
}