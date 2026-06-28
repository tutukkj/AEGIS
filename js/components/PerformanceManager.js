// public/js/components/PerformanceManager.js

export class PerformanceManager {
    constructor(globeScene) {
        this.globeScene = globeScene;
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = performance.now();
        this.isMonitoring = false;

        // Configurações de performance
        this.config = {
            maxParticles: 1000,
            lodLevels: {
                high: { nodeDetail: 16, particleCount: 1.0, shadowQuality: 1.0 },
                medium: { nodeDetail: 12, particleCount: 0.6, shadowQuality: 0.6 },
                low: { nodeDetail: 8, particleCount: 0.3, shadowQuality: 0.3 }
            },
            currentLOD: 'high',
            targetFPS: 60,
            autoOptimize: true
        };

        this.startMonitoring();
    }

    startMonitoring() {
        if (this.isMonitoring) return;
        this.isMonitoring = true;
        this.monitorLoop();
    }

    stopMonitoring() {
        this.isMonitoring = false;
    }

    monitorLoop() {
        if (!this.isMonitoring) return;

        // Calcular FPS
        this.frameCount++;
        const now = performance.now();
        if (now - this.lastFpsUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = now;

            // Otimização automática baseada no FPS
            if (this.config.autoOptimize) {
                this.autoOptimize();
            }
        }

        requestAnimationFrame(() => this.monitorLoop());
    }

    autoOptimize() {
        if (this.fps < 30 && this.config.currentLOD !== 'low') {
            this.setLOD('low');
            console.log(`⚡ Performance: FPS ${this.fps} - Reduzindo para LOD Low`);
        } else if (this.fps < 45 && this.config.currentLOD === 'high') {
            this.setLOD('medium');
            console.log(`⚡ Performance: FPS ${this.fps} - Reduzindo para LOD Medium`);
        } else if (this.fps > 55 && this.config.currentLOD === 'low') {
            this.setLOD('medium');
            console.log(`⚡ Performance: FPS ${this.fps} - Aumentando para LOD Medium`);
        } else if (this.fps > 60 && this.config.currentLOD === 'medium') {
            this.setLOD('high');
            console.log(`⚡ Performance: FPS ${this.fps} - Aumentando para LOD High`);
        }
    }

    setLOD(level) {
        if (!this.config.lodLevels[level]) return;

        this.config.currentLOD = level;
        const config = this.config.lodLevels[level];

        // Ajustar detalhe dos nós
        this.adjustNodeDetail(config.nodeDetail);

        // Ajustar partículas
        this.adjustParticles(config.particleCount);

        // Ajustar qualidade das sombras
        this.adjustShadows(config.shadowQuality);

        // Ajustar qualidade do renderer
        this.adjustRendererQuality(level);
    }

    adjustNodeDetail(detail) {
        // Atualizar geometrias dos nós
        const nodes = this.globeScene.getGraphNodes();
        nodes.forEach(node => {
            const group = this.globeScene.graphGroup.children.find(
                child => child.type === 'Group' && child.userData.id === node.id
            );
            if (group) {
                group.children.forEach(child => {
                    if (child.type === 'Mesh' && child.geometry.type === 'SphereGeometry') {
                        // Recriar geometria com novo detalhe
                        const newGeo = new THREE.SphereGeometry(
                            child.geometry.parameters.radius,
                            detail,
                            detail
                        );
                        child.geometry.dispose();
                        child.geometry = newGeo;
                    }
                });
            }
        });
    }

    adjustParticles(ratio) {
        // Ajustar número de partículas
        const maxCount = Math.floor(this.config.maxParticles * ratio);

        // Atualizar sistemas de partículas existentes
        if (this.globeScene.particleSystem) {
            // Limitar partículas
            this.globeScene.particleSystem.particleGroups.forEach(group => {
                while (group.particles.length > maxCount) {
                    const p = group.particles.pop();
                    group.group.remove(p);
                    p.geometry.dispose();
                    p.material.dispose();
                }
            });
        }
    }

    adjustShadows(quality) {
        if (this.globeScene.renderer) {
            const renderer = this.globeScene.renderer;
            if (quality > 0.7) {
                renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                renderer.shadowMap.enabled = true;
            } else if (quality > 0.4) {
                renderer.shadowMap.type = THREE.PCFShadowMap;
                renderer.shadowMap.enabled = true;
            } else {
                renderer.shadowMap.enabled = false;
            }
        }
    }

    adjustRendererQuality(level) {
        if (this.globeScene.renderer) {
            const renderer = this.globeScene.renderer;

            switch (level) {
                case 'high':
                    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                    renderer.antialias = true;
                    break;
                case 'medium':
                    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
                    renderer.antialias = true;
                    break;
                case 'low':
                    renderer.setPixelRatio(1);
                    renderer.antialias = false;
                    break;
            }
        }
    }

    // Método para otimização manual
    optimizeForPerformance() {
        this.setLOD('low');
        // Desativar animações desnecessárias
        if (this.globeScene) {
            // Reduzir taxa de atualização
            this.globeScene.animationEngine.clearAll();
        }
        // Liberar memória
        if (window.gc) {
            window.gc();
        }
    }

    // Método para otimização de qualidade
    optimizeForQuality() {
        this.setLOD('high');
        // Reativar animações
        if (this.globeScene) {
            this.globeScene.initAnimationSystems();
        }
    }

    // Detectar capacidade do dispositivo
    detectDeviceCapability() {
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const isLowEnd = navigator.hardwareConcurrency < 4;

        if (isMobile || isLowEnd) {
            this.setLOD('low');
            this.config.autoOptimize = true;
            console.log('📱 Dispositivo de baixa performance detectado - Modo econômico ativado');
        } else if (navigator.hardwareConcurrency < 8) {
            this.setLOD('medium');
            console.log('💻 Dispositivo de performance média - Modo balanceado ativado');
        } else {
            this.setLOD('high');
            console.log('🖥️ Dispositivo de alta performance - Modo qualidade ativado');
        }
    }

    // Obter estatísticas de performance
    getStats() {
        return {
            fps: this.fps,
            lodLevel: this.config.currentLOD,
            nodeCount: this.globeScene ? this.globeScene.getGraphNodes().length : 0,
            edgeCount: this.globeScene ? this.globeScene.getGraphEdges().length : 0,
            particleCount: this.globeScene && this.globeScene.particleSystem
                ? this.globeScene.particleSystem.particleGroups.reduce((acc, g) => acc + g.particles.length, 0)
                : 0,
            memoryUsage: window.performance && window.performance.memory
                ? Math.round(window.performance.memory.usedJSHeapSize / 1024 / 1024)
                : 'N/A'
        };
    }

    // Exibir overlay de performance (debug)
    showPerformanceOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'performance-overlay';
        overlay.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            z-index: 9999;
            background: rgba(0,0,0,0.8);
            border: 1px solid rgba(139,92,246,0.3);
            border-radius: 8px;
            padding: 10px 14px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 10px;
            color: #d1d5db;
            min-width: 180px;
            pointer-events: none;
            backdrop-filter: blur(8px);
        `;
        document.body.appendChild(overlay);

        const updateOverlay = () => {
            if (!overlay.parentNode) return;

            const stats = this.getStats();
            overlay.innerHTML = `
                <div style="color: #8b5cf6; font-weight: bold; margin-bottom: 4px;">⚡ PERFORMANCE</div>
                <div>FPS: <span style="color: ${this.fps > 55 ? '#34d399' : this.fps > 30 ? '#fbbf24' : '#f87171'}">${this.fps}</span></div>
                <div>LOD: ${stats.lodLevel.toUpperCase()}</div>
                <div>Nós: ${stats.nodeCount}</div>
                <div>Conexões: ${stats.edgeCount}</div>
                <div>Partículas: ${stats.particleCount}</div>
                <div>Memória: ${stats.memoryUsage}MB</div>
            `;

            requestAnimationFrame(updateOverlay);
        };

        updateOverlay();

        return overlay;
    }
}