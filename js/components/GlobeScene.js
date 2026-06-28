import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ParticleSystem } from './ParticleSystem.js';
import { AnimationEngine } from './AnimationEngine.js';

export class GlobeScene {
    constructor(containerId = 'webgl-container') {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Container 3D não encontrado:', containerId);
            return;
        }

        // Estado da cena
        this.currentState = 'globe';
        this.isGraphInteractive = false;
        this.isTransitioning = false;

        // Posições da câmera
        this.globeCamPos = { x: 5, y: 0, z: 25 };
        this.graphCamPos = { x: 0, y: -100, z: 20 };

        // Dados do grafo
        this.graphNodes = [];
        this.graphEdges = [];
        this.nodePanel = null; // <-- ADICIONAR

        // Inicializar
        this.initScene();
        this.createGlobe();
        this.createGraphSpace();
        this.createParticlesField();
        this.setupEvents();
        this.setupKeyboardShortcuts();
        // Inicializar sistemas de animação e partículas
        this.initAnimationSystems();
        this.animate();

        // Atualizar uptime
        this.startUptimeCounter();
    }

    initScene() {
        // Cena
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x030303, 0.012);

        // Câmera
        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(
            this.globeCamPos.x,
            this.globeCamPos.y,
            this.globeCamPos.z
        );

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Controles Orbitais
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.enableZoom = false;
        this.controls.rotateSpeed = 0.5;
        this.controls.autoRotate = false;
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        // Luzes
        this.setupLights();
    }

    setupLights() {
        // Luz ambiente
        const ambientLight = new THREE.AmbientLight(0x404060);
        this.scene.add(ambientLight);

        // Luz principal (neon purple)
        const mainLight = new THREE.DirectionalLight(0x8b5cf6, 1.2);
        mainLight.position.set(10, 20, 10);
        mainLight.castShadow = true;
        this.scene.add(mainLight);

        // Luz secundária (azul)
        const secondaryLight = new THREE.DirectionalLight(0x60a5fa, 0.5);
        secondaryLight.position.set(-10, -5, -10);
        this.scene.add(secondaryLight);

        // Luz de preenchimento (ambiente)
        const fillLight = new THREE.HemisphereLight(0x8b5cf6, 0x1a1a2e, 0.3);
        this.scene.add(fillLight);

        // Luz de destaque (glow effect)
        const glowLight = new THREE.PointLight(0x8b5cf6, 0.5, 30);
        glowLight.position.set(0, 5, 10);
        this.scene.add(glowLight);
    }

    createGlobe() {
        this.globeGroup = new THREE.Group();
        this.scene.add(this.globeGroup);

        // 1. Esfera principal (partículas)
        const sphereGeo = new THREE.SphereGeometry(7, 64, 64);
        const particlesMat = new THREE.PointsMaterial({
            color: 0x8b5cf6,
            size: 0.05,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        this.globePoints = new THREE.Points(sphereGeo, particlesMat);
        this.globeGroup.add(this.globePoints);

        // 2. Wireframe externo
        const wireframeGeo = new THREE.SphereGeometry(7.1, 24, 24);
        const wireframeMat = new THREE.MeshBasicMaterial({
            color: 0x6b7280,
            wireframe: true,
            transparent: true,
            opacity: 0.12
        });
        this.wireframeGlobe = new THREE.Mesh(wireframeGeo, wireframeMat);
        this.globeGroup.add(this.wireframeGlobe);

        // 3. Anéis concêntricos (órbitas)
        this.rings = [];
        const ringColors = [0x8b5cf6, 0x60a5fa, 0x34d399, 0xfbbf24];
        for (let i = 0; i < 4; i++) {
            const radius = 8 + i * 1.8;
            const ringGeo = new THREE.TorusGeometry(radius, 0.02, 16, 100);
            const ringMat = new THREE.MeshBasicMaterial({
                color: ringColors[i % ringColors.length],
                transparent: true,
                opacity: 0.15 + i * 0.05
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2 + (i * 0.2);
            ring.rotation.z = i * 0.3;
            this.globeGroup.add(ring);
            this.rings.push(ring);
        }

        // 4. Satélites orbitais
        this.satellites = [];
        const satColors = [0x8b5cf6, 0x60a5fa, 0x34d399, 0xfbbf24];
        for (let i = 0; i < 6; i++) {
            const radius = 9 + Math.random() * 4;
            const angle = (i / 6) * Math.PI * 2;
            const tiltX = (Math.random() - 0.5) * 0.8;
            const tiltY = (Math.random() - 0.5) * 0.8;

            const satGroup = new THREE.Group();
            satGroup.rotation.set(tiltX, tiltY, 0);

            // Anel do satélite
            const ringGeo = new THREE.TorusGeometry(radius, 0.015, 8, 60);
            const ringMat = new THREE.MeshBasicMaterial({
                color: satColors[i % satColors.length],
                transparent: true,
                opacity: 0.2
            });
            const ringMesh = new THREE.Mesh(ringGeo, ringMat);
            satGroup.add(ringMesh);

            // Satélite (ponto brilhante)
            const satGeo = new THREE.SphereGeometry(0.1, 8, 8);
            const satMat = new THREE.MeshBasicMaterial({
                color: satColors[i % satColors.length],
                transparent: true,
                opacity: 0.8
            });
            const satMesh = new THREE.Mesh(satGeo, satMat);
            satMesh.position.x = radius;

            const pivot = new THREE.Group();
            pivot.add(satMesh);
            satGroup.add(pivot);

            this.globeGroup.add(satGroup);
            this.satellites.push({
                group: satGroup,
                pivot: pivot,
                speed: 0.002 + Math.random() * 0.004,
                phase: Math.random() * Math.PI * 2
            });
        }

        // 5. Glow externo (partículas em órbita)
        const glowParticlesGeo = new THREE.BufferGeometry();
        const glowCount = 2000;
        const positions = new Float32Array(glowCount * 3);
        for (let i = 0; i < glowCount * 3; i += 3) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            const r = 7.5 + Math.random() * 3;
            positions[i] = r * Math.sin(phi) * Math.cos(theta);
            positions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i + 2] = r * Math.cos(phi);
        }
        glowParticlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const glowParticlesMat = new THREE.PointsMaterial({
            color: 0x8b5cf6,
            size: 0.02,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        this.glowParticles = new THREE.Points(glowParticlesGeo, glowParticlesMat);
        this.globeGroup.add(this.glowParticles);
    }

    createGraphSpace() {
        // Grupo do grafo (posicionado abaixo)
        this.graphGroup = new THREE.Group();
        this.graphGroup.position.y = -100;
        this.scene.add(this.graphGroup);

        // Grid de fundo (cyberpunk)
        const gridHelper = new THREE.GridHelper(50, 25, 0x8b5cf6, 0x4b5563);
        gridHelper.position.y = -5;
        gridHelper.material.transparent = true;
        gridHelper.material.opacity = 0.15;
        this.graphGroup.add(gridHelper);

        // Estrelas de fundo
        const starsGeo = new THREE.BufferGeometry();
        const starsCount = 1000;
        const positions = new Float32Array(starsCount * 3);
        const sizes = new Float32Array(starsCount);
        for (let i = 0; i < starsCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 100;
            positions[i + 1] = (Math.random() - 0.5) * 100;
            positions[i + 2] = (Math.random() - 0.5) * 80 - 20;
            sizes[i / 3] = 0.02 + Math.random() * 0.08;
        }
        starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starsGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        const starsMat = new THREE.PointsMaterial({
            color: 0x6b7280,
            size: 0.05,
            transparent: true,
            opacity: 0.3,
            sizeAttenuation: true
        });
        this.graphStars = new THREE.Points(starsGeo, starsMat);
        this.graphGroup.add(this.graphStars);

        // Texto de placeholder (será substituído pelos nós reais)
        this.graphPlaceholder = this.createPlaceholderText();
        this.graphGroup.add(this.graphPlaceholder);
    }

    createPlaceholderText() {
        // Usando sprites para texto simples
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'transparent';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = 'bold 36px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Glow
        ctx.shadowColor = 'rgba(139, 92, 246, 0.5)';
        ctx.shadowBlur = 30;
        ctx.fillStyle = '#8b5cf6';
        ctx.fillText('INICIALIZANDO GRAFO...', canvas.width / 2, canvas.height / 2 - 10);

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#d1d5db';
        ctx.font = '16px "JetBrains Mono", monospace';
        ctx.fillText('AGUARDANDO DADOS', canvas.width / 2, canvas.height / 2 + 40);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 0.6
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(12, 3, 1);
        sprite.position.y = 2;

        return sprite;
    }

    createParticlesField() {
        // Campo de partículas flutuantes (fundo)
        const particlesGeo = new THREE.BufferGeometry();
        const count = 1500;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        for (let i = 0; i < count * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 80;
            positions[i + 1] = (Math.random() - 0.5) * 60;
            positions[i + 2] = (Math.random() - 0.5) * 60 - 30;

            const color = new THREE.Color().setHSL(0.75 + Math.random() * 0.1, 0.5, 0.3 + Math.random() * 0.2);
            colors[i] = color.r;
            colors[i + 1] = color.g;
            colors[i + 2] = color.b;
        }

        particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particlesGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const particlesMat = new THREE.PointsMaterial({
            size: 0.04,
            vertexColors: true,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });

        this.particlesField = new THREE.Points(particlesGeo, particlesMat);
        this.scene.add(this.particlesField);
    }

    setupEvents() {
        // Scroll para transição
        let isScrolling = false;
        window.addEventListener('scroll', () => {
            if (isScrolling) return;
            isScrolling = true;
            requestAnimationFrame(() => {
                this.handleScroll();
                isScrolling = false;
            });
        });

        // Resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Mouse move para efeito de paralaxe (opcional)
        window.addEventListener('mousemove', (e) => {
            if (this.currentState === 'globe' && !this.isTransitioning) {
                const x = (e.clientX / window.innerWidth - 0.5) * 0.02;
                const y = (e.clientY / window.innerHeight - 0.5) * 0.02;
                if (this.globeGroup) {
                    this.globeGroup.rotation.x += (y * 0.001 - this.globeGroup.rotation.x % 0.01) * 0.01;
                    this.globeGroup.rotation.y += (x * 0.001 - this.globeGroup.rotation.y % 0.01) * 0.01;
                }
            }
        });
    }

    handleScroll() {
        const scrollY = window.scrollY;
        const maxScroll = document.body.scrollHeight - window.innerHeight;

        // Zona de transição: últimos 100px
        const transitionZone = 150;

        if (scrollY >= maxScroll - transitionZone && this.currentState !== 'graph') {
            this.transitionTo('graph');
        } else if (scrollY < maxScroll - transitionZone && this.currentState !== 'globe') {
            this.transitionTo('globe');
        }
    }

    transitionTo(state) {
        if (this.currentState === state || this.isTransitioning) return;

        this.isTransitioning = true;
        this.currentState = state;

        const targetPos = state === 'graph' ? this.graphCamPos : this.globeCamPos;
        const targetTarget = state === 'graph'
            ? { x: 0, y: -100, z: 0 }
            : { x: 0, y: 0, z: 0 };

        // Habilitar/desabilitar zoom
        this.controls.enableZoom = state === 'graph';
        this.controls.enableRotate = state === 'graph';

        // Atualizar interatividade do container
        if (state === 'graph') {
            this.container.classList.add('interactive');
            this.isGraphInteractive = true;
            // Notificar que o grafo está ativo
            this.onGraphActivated && this.onGraphActivated();
        } else {
            this.container.classList.remove('interactive');
            this.isGraphInteractive = false;
        }

        // Animar transição
        const startPos = {
            x: this.camera.position.x,
            y: this.camera.position.y,
            z: this.camera.position.z
        };
        const startTarget = {
            x: this.controls.target.x,
            y: this.controls.target.y,
            z: this.controls.target.z
        };

        const duration = 1200;
        const startTime = performance.now();

        const animateTransition = (time) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing: cubic-bezier(0.16, 1, 0.3, 1)
            const ease = progress < 0.5
                ? 4 * progress * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;

            this.camera.position.x = startPos.x + (targetPos.x - startPos.x) * ease;
            this.camera.position.y = startPos.y + (targetPos.y - startPos.y) * ease;
            this.camera.position.z = startPos.z + (targetPos.z - startPos.z) * ease;

            this.controls.target.x = startTarget.x + (targetTarget.x - startTarget.x) * ease;
            this.controls.target.y = startTarget.y + (targetTarget.y - startTarget.y) * ease;
            this.controls.target.z = startTarget.z + (targetTarget.z - startTarget.z) * ease;

            this.controls.update();

            if (progress < 1) {
                requestAnimationFrame(animateTransition);
            } else {
                this.isTransitioning = false;
            }
        };

        requestAnimationFrame(animateTransition);
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+G para ir direto ao grafo
            if (e.ctrlKey && e.shiftKey && (e.key === 'g' || e.key === 'G')) {
                e.preventDefault();
                if (this.currentState === 'globe') {
                    window.scrollTo(0, document.body.scrollHeight);
                } else {
                    window.scrollTo(0, 0);
                }
            }

            // Escape para fechar painel de nó
            if (e.key === 'Escape') {
                const panel = document.getElementById('node-panel');
                if (panel && panel.classList.contains('active')) {
                    this.closeNodePanel();
                }
            }
        });
    }

    startUptimeCounter() {
        const startTime = Date.now();
        const display = document.getElementById('uptime-display');

        setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const hours = String(Math.floor(elapsed / 3600)).padStart(2, '0');
            const minutes = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
            const seconds = String(elapsed % 60).padStart(2, '0');
            if (display) {
                display.textContent = `${hours}:${minutes}:${seconds}`;
            }
        }, 1000);
    }

    // Método para adicionar nós do grafo
    addGraphNodes(nodes, edges) {
        this.graphNodes = nodes;
        this.graphEdges = edges || [];

        // Remover placeholder
        if (this.graphPlaceholder) {
            this.graphGroup.remove(this.graphPlaceholder);
            this.graphPlaceholder = null;
        }

        // Limpar nós antigos (mantendo grid e estrelas)
        const toRemove = [];
        this.graphGroup.children.forEach(child => {
            if (child !== this.graphStars &&
                child !== this.graphGroup.children[0] && // grid
                child.type !== 'GridHelper') {
                toRemove.push(child);
            }
        });
        toRemove.forEach(child => this.graphGroup.remove(child));

        // Adicionar nós
        nodes.forEach((node, index) => {
            const pos = node.position || {
                x: (Math.random() - 0.5) * 20,
                y: (Math.random() - 0.5) * 20,
                z: (Math.random() - 0.5) * 10
            };

            const color = node.color || 0x8b5cf6;
            const radius = 0.3 + Math.random() * 0.4;

            // Grupo do nó
            const nodeGroup = new THREE.Group();
            nodeGroup.position.set(pos.x, pos.y, pos.z);
            nodeGroup.userData = node;

            // Esfera central
            const sphere = new THREE.Mesh(
                new THREE.SphereGeometry(radius, 16, 16),
                new THREE.MeshBasicMaterial({
                    color: color,
                    transparent: true,
                    opacity: 0.8
                })
            );
            nodeGroup.add(sphere);

            // Anel do nó (wireframe)
            const ring = new THREE.Mesh(
                new THREE.SphereGeometry(radius * 1.6, 12, 12),
                new THREE.MeshBasicMaterial({
                    color: color,
                    wireframe: true,
                    transparent: true,
                    opacity: 0.2
                })
            );
            nodeGroup.add(ring);

            // Label (sprite)
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'transparent';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.font = 'bold 20px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#d1d5db';
            ctx.fillText(node.label || node.id, canvas.width / 2, canvas.height - 5);

            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                depthTest: false
            });
            const label = new THREE.Sprite(material);
            label.position.y = radius * 1.8 + 0.5;
            label.scale.set(2, 0.5, 1);
            nodeGroup.add(label);

            this.graphGroup.add(nodeGroup);

            // Armazenar referência para interações
            node.mesh = sphere;
            node.group = nodeGroup;
        });

        // Adicionar conexões
        edges.forEach(edge => {
            const source = nodes.find(n => n.id === edge.source);
            const target = nodes.find(n => n.id === edge.target);

            if (source && target) {
                const points = [
                    new THREE.Vector3(source.position.x, source.position.y, source.position.z),
                    new THREE.Vector3(target.position.x, target.position.y, target.position.z)
                ];
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const material = new THREE.LineBasicMaterial({
                    color: 0x4b5563,
                    transparent: true,
                    opacity: 0.3
                });
                const line = new THREE.Line(geometry, material);
                this.graphGroup.add(line);
            }
        });
    }

    // Método para fechar painel de nó
    closeNodePanel() {
        const panel = document.getElementById('node-panel');
        if (panel) {
            panel.classList.remove('active');
        }
        // Notificar que o painel foi fechado
        this.onNodePanelClosed && this.onNodePanelClosed();
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        const time = performance.now() * 0.001;

        // Animações do globo
        if (this.globePoints) {
            this.globePoints.rotation.y += 0.0008;
            this.wireframeGlobe.rotation.y += 0.0008;
        }

        // Anéis
        this.rings.forEach((ring, index) => {
            ring.rotation.x += 0.001 * (index + 1) * 0.5;
            ring.rotation.z += 0.0005 * (index + 1);
        });

        // Satélites
        this.satellites.forEach((sat) => {
            sat.pivot.rotation.z += sat.speed;
            sat.group.rotation.y += 0.001;
        });

        // Partículas de glow
        if (this.glowParticles) {
            this.glowParticles.rotation.y += 0.0003;
            this.glowParticles.rotation.x += 0.0001;
        }

        // Partículas de fundo (movimento lento)
        if (this.particlesField) {
            this.particlesField.rotation.y += 0.0001;
            this.particlesField.rotation.x += 0.00005;
        }

        // Rotação do grafo (quando não está interativo)
        if (this.currentState === 'graph' && !this.isGraphInteractive && !this.isTransitioning) {
            this.graphGroup.rotation.y += 0.0003;
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    // Método para limpar recursos
    dispose() {
        this.renderer.dispose();
        this.container.removeChild(this.renderer.domElement);
    }

    getIntersectedNode(event) {
        if (!this.renderer || !this.camera) return null;

        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);

        // Coletar todos os nós do grafo
        const nodeMeshes = [];
        this.graphGroup.children.forEach(child => {
            if (child.type === 'Group' && child.userData && child.userData.id) {
                // Encontrar a esfera dentro do grupo
                child.children.forEach(mesh => {
                    if (mesh.type === 'Mesh' && mesh.geometry.type === 'SphereGeometry') {
                        nodeMeshes.push(mesh);
                    }
                });
            }
        });

        const intersects = raycaster.intersectObjects(nodeMeshes);
        if (intersects.length > 0) {
            const mesh = intersects[0].object;
            // Encontrar o grupo pai que contém os dados do nó
            let group = mesh.parent;
            while (group && group.type !== 'Group') {
                group = group.parent;
            }
            if (group && group.userData && group.userData.id) {
                return group.userData;
            }
        }

        return null;
    }

    /**
     * Destaca um nó específico no grafo
     */
    highlightNode(nodeId) {
        this.graphGroup.children.forEach(child => {
            if (child.type === 'Group' && child.userData && child.userData.id === nodeId) {
                // Aumentar tamanho e brilho
                child.children.forEach(mesh => {
                    if (mesh.type === 'Mesh' && mesh.geometry.type === 'SphereGeometry') {
                        // Animação de destaque
                        const targetScale = 1.8;
                        const duration = 300;
                        const startTime = performance.now();
                        const startScale = mesh.scale.x;

                        const animateScale = (time) => {
                            const progress = Math.min((time - startTime) / duration, 1);
                            const ease = 1 - Math.pow(1 - progress, 3);
                            const scale = startScale + (targetScale - startScale) * ease;
                            mesh.scale.set(scale, scale, scale);

                            if (progress < 1) {
                                requestAnimationFrame(animateScale);
                            }
                        };
                        requestAnimationFrame(animateScale);

                        // Mudar cor
                        if (mesh.material) {
                            mesh.material.color.setHex(0xffffff);
                            mesh.material.transparent = true;
                            mesh.material.opacity = 1;
                        }
                    }
                });

                // Destacar anel
                child.children.forEach(mesh => {
                    if (mesh.type === 'Mesh' && mesh.geometry.type === 'SphereGeometry' &&
                        mesh.material && mesh.material.wireframe) {
                        mesh.material.color.setHex(0x8b5cf6);
                        mesh.material.opacity = 0.8;
                    }
                });
            } else if (child.type === 'Group' && child.userData && child.userData.id) {
                // Diminuir outros nós
                child.children.forEach(mesh => {
                    if (mesh.type === 'Mesh' && mesh.geometry.type === 'SphereGeometry') {
                        mesh.scale.set(0.7, 0.7, 0.7);
                        if (mesh.material) {
                            mesh.material.transparent = true;
                            mesh.material.opacity = 0.3;
                        }
                    }
                });
            }
        });

        // Destacar conexões do nó
        this.graphGroup.children.forEach(child => {
            if (child.type === 'Line') {
                // Verificar se a linha conecta ao nó destacado
                const positions = child.geometry.attributes.position;
                if (positions) {
                    const points = [];
                    for (let i = 0; i < positions.count; i++) {
                        points.push(new THREE.Vector3(
                            positions.getX(i),
                            positions.getY(i),
                            positions.getZ(i)
                        ));
                    }
                    // Verificar se algum ponto está próximo do nó
                    // (simplificado: verificar se a linha está no grupo do grafo)
                    child.material.color.setHex(0x8b5cf6);
                    child.material.opacity = 0.8;
                }
            }
        });
    }

    /**
     * Remove o destaque de todos os nós
     */
    unhighlightNode() {
        this.graphGroup.children.forEach(child => {
            if (child.type === 'Group' && child.userData && child.userData.id) {
                child.children.forEach(mesh => {
                    if (mesh.type === 'Mesh' && mesh.geometry.type === 'SphereGeometry') {
                        mesh.scale.set(1, 1, 1);
                        if (mesh.material) {
                            mesh.material.transparent = true;
                            mesh.material.opacity = 0.8;
                            // Restaurar cor original
                            const nodeData = child.userData;
                            if (nodeData.color) {
                                mesh.material.color.setHex(nodeData.color);
                            }
                        }
                    }

                    // Anel
                    if (mesh.type === 'Mesh' && mesh.geometry.type === 'SphereGeometry' &&
                        mesh.material && mesh.material.wireframe) {
                        mesh.material.color.setHex(0x6b7280);
                        mesh.material.opacity = 0.2;
                    }
                });
            }

            // Linhas
            if (child.type === 'Line') {
                child.material.color.setHex(0x4b5563);
                child.material.opacity = 0.3;
            }
        });
    }

    /**
     * Aplica um layout diferente aos nós do grafo
     */
    applyLayout(type) {
        const nodes = [];
        this.graphGroup.children.forEach(child => {
            if (child.type === 'Group' && child.userData && child.userData.id) {
                nodes.push({
                    id: child.userData.id,
                    position: child.position.clone()
                });
            }
        });

        if (nodes.length === 0) return;

        // Calcular novo layout
        let newPositions;
        switch (type) {
            case 'radial':
                newPositions = this.layoutRadial(nodes);
                break;
            case 'grid':
                newPositions = this.layoutGrid(nodes);
                break;
            case 'force':
            default:
                newPositions = this.layoutForce(nodes);
                break;
        }

        // Animar transição
        const duration = 800;
        const startTime = performance.now();

        const animateLayout = (time) => {
            const progress = Math.min((time - startTime) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);

            newPositions.forEach(pos => {
                const nodeGroup = this.graphGroup.children.find(
                    child => child.type === 'Group' && child.userData.id === pos.id
                );
                if (nodeGroup) {
                    const startPos = nodeGroup.position.clone();
                    nodeGroup.position.x = startPos.x + (pos.x - startPos.x) * ease;
                    nodeGroup.position.y = startPos.y + (pos.y - startPos.y) * ease;
                    nodeGroup.position.z = startPos.z + (pos.z - startPos.z) * ease;
                }
            });

            if (progress < 1) {
                requestAnimationFrame(animateLayout);
            }
        };
        requestAnimationFrame(animateLayout);
    }

    layoutRadial(nodes) {
        const center = { x: 0, y: 0, z: 0 };
        const radius = 8;
        const positions = [];

        nodes.forEach((node, index) => {
            const angle = (index / nodes.length) * Math.PI * 2;
            const radiusOffset = 0.5 + Math.random() * 0.5;
            positions.push({
                id: node.id,
                x: center.x + radius * Math.cos(angle) * radiusOffset,
                y: center.y + (Math.random() - 0.5) * 4,
                z: center.z + radius * Math.sin(angle) * radiusOffset
            });
        });

        return positions;
    }

    layoutGrid(nodes) {
        const cols = Math.ceil(Math.sqrt(nodes.length));
        const rows = Math.ceil(nodes.length / cols);
        const spacing = 3;
        const positions = [];

        nodes.forEach((node, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const offsetX = (cols - 1) * spacing / 2;
            const offsetZ = (rows - 1) * spacing / 2;

            positions.push({
                id: node.id,
                x: col * spacing - offsetX,
                y: (Math.random() - 0.5) * 2,
                z: row * spacing - offsetZ
            });
        });

        return positions;
    }

    layoutForce(nodes) {
        // Simulação simples de força
        const positions = nodes.map(node => ({
            id: node.id,
            x: node.position.x,
            y: node.position.y,
            z: node.position.z
        }));

        // Repulsão entre nós
        const iterations = 50;
        const repulsion = 0.5;
        const attraction = 0.01;

        for (let iter = 0; iter < iterations; iter++) {
            for (let i = 0; i < positions.length; i++) {
                for (let j = i + 1; j < positions.length; j++) {
                    const dx = positions[i].x - positions[j].x;
                    const dy = positions[i].y - positions[j].y;
                    const dz = positions[i].z - positions[j].z;
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.1;

                    const force = repulsion / (dist * dist);
                    positions[i].x += dx * force;
                    positions[i].y += dy * force;
                    positions[i].z += dz * force;
                    positions[j].x -= dx * force;
                    positions[j].y -= dy * force;
                    positions[j].z -= dz * force;
                }
            }

            // Atração para o centro
            positions.forEach(pos => {
                pos.x *= (1 - attraction);
                pos.y *= (1 - attraction);
                pos.z *= (1 - attraction);
            });
        }

        return positions;
    }

    /**
     * Reseta a câmera para a visão geral
     */
    resetCamera() {
        const targetPos = this.currentState === 'graph'
            ? this.graphCamPos
            : this.globeCamPos;

        const targetTarget = this.currentState === 'graph'
            ? { x: 0, y: -100, z: 0 }
            : { x: 0, y: 0, z: 0 };

        const duration = 600;
        const startTime = performance.now();
        const startPos = {
            x: this.camera.position.x,
            y: this.camera.position.y,
            z: this.camera.position.z
        };
        const startTarget = {
            x: this.controls.target.x,
            y: this.controls.target.y,
            z: this.controls.target.z
        };

        const animateReset = (time) => {
            const progress = Math.min((time - startTime) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);

            this.camera.position.x = startPos.x + (targetPos.x - startPos.x) * ease;
            this.camera.position.y = startPos.y + (targetPos.y - startPos.y) * ease;
            this.camera.position.z = startPos.z + (targetPos.z - startPos.z) * ease;

            this.controls.target.x = startTarget.x + (targetTarget.x - startTarget.x) * ease;
            this.controls.target.y = startTarget.y + (targetTarget.y - startTarget.y) * ease;
            this.controls.target.z = startTarget.z + (targetTarget.z - startTarget.z) * ease;

            this.controls.update();

            if (progress < 1) {
                requestAnimationFrame(animateReset);
            }
        };
        requestAnimationFrame(animateReset);
    }
    updateNodeLabel(nodeId, newLabel) {
        this.graphGroup.children.forEach(child => {
            if (child.type === 'Group' && child.userData && child.userData.id === nodeId) {
                child.userData.label = newLabel;

                // Encontrar o label (sprite) e atualizar
                child.children.forEach(mesh => {
                    if (mesh.type === 'Sprite') {
                        const canvas = document.createElement('canvas');
                        canvas.width = 256;
                        canvas.height = 64;
                        const ctx = canvas.getContext('2d');
                        ctx.fillStyle = 'transparent';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.font = 'bold 20px "JetBrains Mono", monospace';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'bottom';
                        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
                        ctx.shadowBlur = 10;
                        ctx.fillStyle = '#d1d5db';
                        ctx.fillText(newLabel, canvas.width / 2, canvas.height - 5);

                        const texture = new THREE.CanvasTexture(canvas);
                        mesh.material.map = texture;
                        mesh.material.needsUpdate = true;
                    }
                });
            }
        });
    }

    /**
     * Toggle dos rótulos
     */
    toggleLabels(show) {
        this.graphGroup.children.forEach(child => {
            if (child.type === 'Group') {
                child.children.forEach(mesh => {
                    if (mesh.type === 'Sprite') {
                        mesh.visible = show;
                    }
                });
            }
        });
    }

    /**
     * Ajusta o zoom da câmera
     */
    setZoom(zoomFactor) {
        const currentDistance = this.camera.position.length();
        const newDistance = Math.max(5, Math.min(50, currentDistance / zoomFactor));
        const direction = this.camera.position.clone().normalize();

        this.camera.position.copy(direction.multiplyScalar(newDistance));
        this.controls.update();
    }

    /**
     * Obtém todos os nós do grafo
     */
    getGraphNodes() {
        const nodes = [];
        this.graphGroup.children.forEach(child => {
            if (child.type === 'Group' && child.userData && child.userData.id) {
                nodes.push({
                    id: child.userData.id,
                    label: child.userData.label,
                    position: child.position.clone(),
                    data: child.userData.data || {}
                });
            }
        });
        return nodes;
    }

    /**
     * Obtém todas as arestas do grafo
     */
    getGraphEdges() {
        const edges = [];
        this.graphGroup.children.forEach(child => {
            if (child.type === 'Line') {
                const positions = child.geometry.attributes.position;
                if (positions && positions.count === 2) {
                    const source = new THREE.Vector3(
                        positions.getX(0),
                        positions.getY(0),
                        positions.getZ(0)
                    );
                    const target = new THREE.Vector3(
                        positions.getX(1),
                        positions.getY(1),
                        positions.getZ(1)
                    );

                    // Encontrar IDs dos nós baseado nas posições
                    let sourceId = null;
                    let targetId = null;

                    this.graphGroup.children.forEach(gchild => {
                        if (gchild.type === 'Group' && gchild.userData && gchild.userData.id) {
                            const pos = gchild.position;
                            if (pos.distanceTo(source) < 0.1) sourceId = gchild.userData.id;
                            if (pos.distanceTo(target) < 0.1) targetId = gchild.userData.id;
                        }
                    });

                    if (sourceId && targetId) {
                        edges.push({ source: sourceId, target: targetId });
                    }
                }
            }
        });
        return edges;
    }

    /**
     * Aplica layout em árvore (para mapas mentais)
     */
    layoutTree(nodes) {
        // Encontrar nó raiz
        const root = nodes.find(n => n.data && n.data.isRoot);
        if (!root) return this.layoutForce(nodes);

        const positions = [];
        const visited = new Set();
        const queue = [{ node: root, level: 0, index: 0 }];

        while (queue.length > 0) {
            const { node, level, index } = queue.shift();
            if (visited.has(node.id)) continue;
            visited.add(node.id);

            const spacing = 3;
            const xOffset = (index - (Math.pow(2, level) - 1) / 2) * spacing;
            const yOffset = level * 2.5;

            positions.push({
                id: node.id,
                x: xOffset,
                y: (Math.random() - 0.5) * 0.5,
                z: -yOffset
            });

            // Encontrar filhos
            const children = nodes.filter(n => {
                return this.graphEdges.some(e =>
                    e.source === node.id && e.target === n.id
                );
            });

            children.forEach((child, i) => {
                queue.push({
                    node: child,
                    level: level + 1,
                    index: index * 2 + i
                });
            });
        }

        return positions;
    }

    // Sobrescrever applyLayout para incluir tree
    applyLayout(type) {
        const nodes = this.getGraphNodes();
        if (nodes.length === 0) return;

        // Armazenar arestas para layout em árvore
        this.graphEdges = this.getGraphEdges();

        let newPositions;
        switch (type) {
            case 'tree':
                newPositions = this.layoutTree(nodes);
                break;
            case 'radial':
                newPositions = this.layoutRadial(nodes);
                break;
            case 'grid':
                newPositions = this.layoutGrid(nodes);
                break;
            case 'force':
            default:
                newPositions = this.layoutForce(nodes);
                break;
        }

        // Animar transição
        const duration = 800;
        const startTime = performance.now();

        const animateLayout = (time) => {
            const progress = Math.min((time - startTime) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);

            newPositions.forEach(pos => {
                const nodeGroup = this.graphGroup.children.find(
                    child => child.type === 'Group' && child.userData.id === pos.id
                );
                if (nodeGroup) {
                    const startPos = nodeGroup.position.clone();
                    nodeGroup.position.x = startPos.x + (pos.x - startPos.x) * ease;
                    nodeGroup.position.y = startPos.y + (pos.y - startPos.y) * ease;
                    nodeGroup.position.z = startPos.z + (pos.z - startPos.z) * ease;
                }
            });

            if (progress < 1) {
                requestAnimationFrame(animateLayout);
            }
        };
        requestAnimationFrame(animateLayout);
    }

    initAnimationSystems() {
        this.particleSystem = new ParticleSystem(this.scene);
        this.animationEngine = new AnimationEngine(this.scene);

        // Criar campo de partículas de fundo
        this.backgroundParticles = this.particleSystem.createParticleField({
            count: 300,
            color: 0x8b5cf6,
            size: 0.02,
            spread: 30,
            opacity: 0.15
        });
    }

    /**
     * Adiciona um nó com animação de entrada
     */
    addNodeWithAnimation(node, position) {
        const group = new THREE.Group();
        group.position.copy(position);
        group.userData = node;

        // Criar nó com escala zero (invisível)
        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(node.size || 0.4, 16, 16),
            new THREE.MeshBasicMaterial({
                color: node.color || 0x8b5cf6,
                transparent: true,
                opacity: 0
            })
        );
        sphere.scale.set(0, 0, 0);
        group.add(sphere);

        // Anel wireframe
        const ring = new THREE.Mesh(
            new THREE.SphereGeometry((node.size || 0.4) * 1.6, 12, 12),
            new THREE.MeshBasicMaterial({
                color: node.color || 0x8b5cf6,
                wireframe: true,
                transparent: true,
                opacity: 0
            })
        );
        ring.scale.set(0, 0, 0);
        group.add(ring);

        this.graphGroup.add(group);

        // Animar entrada
        this.animationEngine.animateScale(sphere, new THREE.Vector3(1, 1, 1), 500, 'easeOutBack');
        this.animationEngine.animateScale(ring, new THREE.Vector3(1, 1, 1), 600, 'easeOutBack');

        // Fade in
        setTimeout(() => {
            sphere.material.opacity = 0.8;
            ring.material.opacity = 0.2;
        }, 300);

        // Partículas de entrada
        if (this.particleSystem) {
            this.particleSystem.createExplosion(position, {
                count: 30,
                color: node.color || 0x8b5cf6,
                size: 0.05,
                speed: 2,
                duration: 800
            });
        }

        return group;
    }

    /**
     * Remove um nó com animação de saída
     */
    removeNodeWithAnimation(nodeId) {
        const nodeGroup = this.graphGroup.children.find(
            child => child.type === 'Group' && child.userData.id === nodeId
        );

        if (!nodeGroup) return;

        // Animar saída
        const sphere = nodeGroup.children.find(
            child => child.type === 'Mesh' && !child.material.wireframe
        );

        if (sphere) {
            this.animationEngine.animateScale(sphere, new THREE.Vector3(0, 0, 0), 400, 'easeIn');
            setTimeout(() => {
                this.graphGroup.remove(nodeGroup);
            }, 500);
        }
    }

    /**
     * Destaca um nó com animação
     */
    highlightNodeWithAnimation(nodeId) {
        const nodeGroup = this.graphGroup.children.find(
            child => child.type === 'Group' && child.userData.id === nodeId
        );

        if (!nodeGroup) return;

        // Animação de pulso
        const sphere = nodeGroup.children.find(
            child => child.type === 'Mesh' && !child.material.wireframe
        );

        if (sphere) {
            // Salvar cor original
            const originalColor = sphere.material.color.clone();

            // Mudar para branco com animação
            this.animationEngine.animateColor(sphere.material, new THREE.Color(0xffffff), 300);

            // Animar escala
            this.animationEngine.animateScale(sphere, new THREE.Vector3(1.5, 1.5, 1.5), 400, 'easeOutBack')
                .then(() => {
                    // Restaurar após um tempo
                    setTimeout(() => {
                        this.animationEngine.animateColor(sphere.material, originalColor, 300);
                        this.animationEngine.animateScale(sphere, new THREE.Vector3(1, 1, 1), 400);
                    }, 2000);
                });
        }

        // Criar anel de partículas ao redor do nó
        if (this.particleSystem) {
            const pos = nodeGroup.position.clone();
            const ringParticles = this.particleSystem.createParticleStream(
                pos.clone().add(new THREE.Vector3(1, 0, 0)),
                pos.clone().add(new THREE.Vector3(-1, 0, 0)),
                {
                    count: 20,
                    interval: 30,
                    color: 0x8b5cf6,
                    size: 0.03,
                    speed: 0.5
                }
            );

            // Parar após 2 segundos
            setTimeout(ringParticles, 2000);
        }
    }

    /**
     * Cria uma conexão animada entre dois nós
     */
    createAnimatedEdge(sourceId, targetId, options = {}) {
        const source = this.graphGroup.children.find(
            child => child.type === 'Group' && child.userData.id === sourceId
        );
        const target = this.graphGroup.children.find(
            child => child.type === 'Group' && child.userData.id === targetId
        );

        if (!source || !target) return null;

        const startPos = source.position.clone();
        const endPos = target.position.clone();
        const color = options.color || 0x8b5cf6;

        // Criar linha base
        const points = [startPos, endPos];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.2
        });
        const line = new THREE.Line(geometry, material);
        this.graphGroup.add(line);

        // Criar fluxo de partículas
        let streamCleanup = null;
        if (this.particleSystem) {
            streamCleanup = this.particleSystem.createParticleStream(
                startPos,
                endPos,
                {
                    count: 15,
                    interval: 40,
                    color: color,
                    size: 0.04,
                    speed: 1.5
                }
            );
        }

        // Retornar função para remover
        return () => {
            this.graphGroup.remove(line);
            if (streamCleanup) streamCleanup();
        };
    }

    /**
     * Efeito de onda ao adicionar múltiplos nós
     */
    addNodesWithWaveEffect(nodes, center = new THREE.Vector3(0, 0, 0)) {
        const radius = 5;
        const total = nodes.length;

        nodes.forEach((node, index) => {
            const angle = (index / total) * Math.PI * 2;
            const distance = radius * (0.5 + Math.random() * 0.5);
            const pos = new THREE.Vector3(
                center.x + distance * Math.cos(angle),
                center.y + (Math.random() - 0.5) * 2,
                center.z + distance * Math.sin(angle)
            );

            // Delay baseado na posição (efeito de onda)
            const delay = (index / total) * 1000;

            setTimeout(() => {
                this.addNodeWithAnimation(node, pos);
            }, delay);
        });
    }

    /**
     * Cria uma constelação animada (rotação suave)
     */
    createAnimatedConstellation() {
        const nodes = this.getGraphNodes();
        if (nodes.length === 0) return;

        // Calcular centro
        const center = new THREE.Vector3(0, 0, 0);
        nodes.forEach(n => center.add(n.position));
        center.divideScalar(nodes.length);

        // Salvar posições relativas
        const relativePositions = nodes.map(n => ({
            id: n.id,
            pos: n.position.clone().sub(center)
        }));

        let angle = 0;
        let isActive = true;

        const animateConstellation = () => {
            if (!isActive) return;

            angle += 0.002;

            relativePositions.forEach(rel => {
                const nodeGroup = this.graphGroup.children.find(
                    child => child.type === 'Group' && child.userData.id === rel.id
                );
                if (nodeGroup) {
                    const rotated = rel.pos.clone().applyAxisAngle(
                        new THREE.Vector3(0, 1, 0),
                        angle
                    );
                    nodeGroup.position.copy(rotated.add(center));
                }
            });

            requestAnimationFrame(animateConstellation);
        };

        animateConstellation();

        return () => {
            isActive = false;
        };
    }

    /**
     * Inicializa efeitos visuais para o grafo
     */
    initGraphVisualEffects() {
        // Adicionar rastro de partículas nas bordas
        const edges = this.getGraphEdges();
        edges.forEach(edge => {
            const source = this.graphGroup.children.find(
                child => child.type === 'Group' && child.userData.id === edge.source
            );
            const target = this.graphGroup.children.find(
                child => child.type === 'Group' && child.userData.id === edge.target
            );

            if (source && target && this.particleSystem) {
                this.particleSystem.createPulsingConnection(
                    source.position,
                    target.position,
                    {
                        color: 0x4b5563,
                        width: 0.02,
                        pulseSpeed: 0.5 + Math.random() * 0.5
                    }
                );
            }
        });
    }

    /**
     * Aplica um layout com animação
     */
    applyLayoutWithAnimation(type) {
        const nodes = this.getGraphNodes();
        if (nodes.length === 0) return;

        this.graphEdges = this.getGraphEdges();

        let newPositions;
        switch (type) {
            case 'tree':
                newPositions = this.layoutTree(nodes);
                break;
            case 'radial':
                newPositions = this.layoutRadial(nodes);
                break;
            case 'grid':
                newPositions = this.layoutGrid(nodes);
                break;
            case 'force':
            default:
                newPositions = this.layoutForce(nodes);
                break;
        }

        // Animar cada nó com delay escalonado
        newPositions.forEach((pos, index) => {
            const nodeGroup = this.graphGroup.children.find(
                child => child.type === 'Group' && child.userData.id === pos.id
            );
            if (nodeGroup) {
                const delay = index * 50;
                const target = new THREE.Vector3(pos.x, pos.y, pos.z);
                setTimeout(() => {
                    this.animationEngine.animatePosition(nodeGroup, target, 600, 'easeOutBack');
                }, delay);
            }
        });
    }

    // Sobrescrever método addGraphNodes para usar animações
    addGraphNodes(nodes, edges) {
        // Limpar nós antigos
        const toRemove = [];
        this.graphGroup.children.forEach(child => {
            if (child.type === 'Group') {
                toRemove.push(child);
            }
        });
        toRemove.forEach(child => this.graphGroup.remove(child));

        // Limpar arestas antigas
        const edgesToRemove = [];
        this.graphGroup.children.forEach(child => {
            if (child.type === 'Line') {
                edgesToRemove.push(child);
            }
        });
        edgesToRemove.forEach(child => this.graphGroup.remove(child));

        // Adicionar nós com animação
        const center = new THREE.Vector3(0, 0, 0);
        const radius = 5;
        const total = nodes.length;

        nodes.forEach((node, index) => {
            const angle = (index / total) * Math.PI * 2;
            const distance = radius * (0.3 + Math.random() * 0.7);
            const pos = new THREE.Vector3(
                center.x + distance * Math.cos(angle),
                center.y + (Math.random() - 0.5) * 3,
                center.z + distance * Math.sin(angle)
            );

            // Salvar posição nos dados do nó
            node.position = pos;

            // Adicionar com animação
            setTimeout(() => {
                this.addNodeWithAnimation(node, pos);
            }, index * 100);
        });

        // Adicionar arestas com animação após os nós
        setTimeout(() => {
            edges.forEach((edge, index) => {
                setTimeout(() => {
                    const source = this.graphGroup.children.find(
                        child => child.type === 'Group' && child.userData.id === edge.source
                    );
                    const target = this.graphGroup.children.find(
                        child => child.type === 'Group' && child.userData.id === edge.target
                    );

                    if (source && target && this.particleSystem) {
                        this.particleSystem.createPulsingConnection(
                            source.position,
                            target.position,
                            {
                                color: 0x4b5563,
                                width: 0.02,
                                pulseSpeed: 0.5 + Math.random() * 0.5
                            }
                        );
                    }
                }, index * 50);
            });
        }, 1000);

        // Iniciar efeitos visuais
        setTimeout(() => {
            this.initGraphVisualEffects();
        }, 2000);
    }


    /**
     * Busca nós por texto
     */
    searchNodes(query) {
        const results = [];
        const lowerQuery = query.toLowerCase();

        this.graphGroup.children.forEach(child => {
            if (child.type === 'Group' && child.userData && child.userData.id) {
                const node = child.userData;
                const label = node.label || '';
                const data = node.data || {};
                const searchable = [
                    label,
                    data.title || '',
                    data.description || '',
                    data.category || '',
                    data.roadmap || '',
                    ...(data.tags || [])
                ].join(' ').toLowerCase();

                if (searchable.includes(lowerQuery)) {
                    results.push({
                        id: node.id,
                        label: label,
                        data: data,
                        position: child.position.clone(),
                        relevance: label.toLowerCase().includes(lowerQuery) ? 2 : 1
                    });
                }
            }
        });

        // Ordenar por relevância
        results.sort((a, b) => b.relevance - a.relevance);
        return results;
    }

    /**
     * Foca em um nó específico (zoom e destaque)
     */
    focusOnNode(nodeId) {
        const nodeGroup = this.graphGroup.children.find(
            child => child.type === 'Group' && child.userData.id === nodeId
        );

        if (!nodeGroup) return;

        const pos = nodeGroup.position.clone();
        const distance = 5;
        const camPos = pos.clone().add(new THREE.Vector3(distance * 0.6, distance * 0.4, distance));

        // Animar câmera
        this.animationEngine.animatePosition(
            this.camera,
            camPos,
            600,
            'easeOutCubic'
        );

        // Animar alvo
        this.animationEngine.animatePosition(
            this.controls.target,
            pos,
            600,
            'easeOutCubic'
        );

        // Destacar nó
        this.highlightNodeWithAnimation(nodeId);
    }
    applyNodeFilter(filteredIds) {
        this.graphGroup.children.forEach(child => {
            if (child.type === 'Group' && child.userData && child.userData.id) {
                const shouldShow = filteredIds.has(child.userData.id);
                child.visible = shouldShow;

                if (shouldShow) {
                    child.children.forEach(mesh => {
                        if (mesh.type === 'Mesh' && mesh.material) {
                            mesh.material.transparent = true;
                            mesh.material.opacity = 0.8;
                            mesh.scale.set(1, 1, 1);
                        }
                    });
                } else {
                    child.children.forEach(mesh => {
                        if (mesh.type === 'Mesh' && mesh.material) {
                            mesh.material.transparent = true;
                            mesh.material.opacity = 0.05;
                            mesh.scale.set(0.3, 0.3, 0.3);
                        }
                    });
                }
            }

            // Filtrar arestas
            if (child.type === 'Line') {
                const positions = child.geometry.attributes.position;
                if (positions) {
                    const start = new THREE.Vector3(positions.getX(0), positions.getY(0), positions.getZ(0));
                    const end = new THREE.Vector3(positions.getX(1), positions.getY(1), positions.getZ(1));

                    let sourceVisible = false;
                    let targetVisible = false;

                    this.graphGroup.children.forEach(gchild => {
                        if (gchild.type === 'Group' && gchild.userData && gchild.userData.id) {
                            const pos = gchild.position;
                            if (pos.distanceTo(start) < 0.1 && filteredIds.has(gchild.userData.id)) {
                                sourceVisible = true;
                            }
                            if (pos.distanceTo(end) < 0.1 && filteredIds.has(gchild.userData.id)) {
                                targetVisible = true;
                            }
                        }
                    });

                    child.visible = sourceVisible && targetVisible;
                }
            }
        });
    }
}