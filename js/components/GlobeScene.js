// public/js/components/GlobeScene.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class GlobeScene {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Container 3D não encontrado:', containerId);
            return;
        }

        // Estados
        this.mode = 'solar'; // 'solar' | 'graph'
        this.selectedNode = null;
        this.hoveredNode = null;
        this.isTransitioning = false;
        this.onNodeSelected = null;
        this.onNodeDeselected = null;

        // Dados
        this.graphNodes = [];
        this.graphEdges = [];
        this.nodeGroupMap = new Map();
        this.connectionLines = [];
        this.planetMeshes = [];
        this.meshDataMap = new Map();

        // Posições da câmera
        this.solarCamPos = { x: 0, y: 6, z: 22 };
        this.graphCamPos = { x: 0, y: 0, z: 20 };

        // Inicializar
        this.initScene();
        this.createCosmosBackground();
        this.createSolarSystem();
        this.setupEvents();
        this.animate();
        this.startUptimeCounter();

        console.log('🌌 GlobeScene inicializado em modo SOLAR');
    }

    // ==========================================
    // 1. INICIALIZAÇÃO DA CENA
    // ==========================================

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x030303, 0.008);

        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(
            this.solarCamPos.x,
            this.solarCamPos.y,
            this.solarCamPos.z
        );

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x030303, 0);
        this.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.3;
        this.controls.enableZoom = true;
        this.controls.minDistance = 3;
        this.controls.maxDistance = 50;
        this.controls.target.set(0, 0, 0);

        // Grupo principal
        this.mainGroup = new THREE.Group();
        this.scene.add(this.mainGroup);

        // Luz ambiente
        const ambientLight = new THREE.AmbientLight(0x1a1a2e);
        this.scene.add(ambientLight);
    }

    // ==========================================
    // 2. FUNDO ESPACIAL
    // ==========================================

    createCosmosBackground() {
        // Estrelas
        const starsGeo = new THREE.BufferGeometry();
        const starsCount = 2000;
        const positions = new Float32Array(starsCount * 3);
        const colors = new Float32Array(starsCount * 3);

        for (let i = 0; i < starsCount * 3; i += 3) {
            const radius = 30 + Math.random() * 70;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);

            positions[i] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.5;
            positions[i + 2] = radius * Math.cos(phi);

            const brightness = 0.2 + Math.random() * 0.8;
            colors[i] = brightness * 0.9;
            colors[i + 1] = brightness * 0.9;
            colors[i + 2] = brightness;
        }

        starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starsGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const starsMat = new THREE.PointsMaterial({
            size: 0.04,
            vertexColors: true,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });

        this.starField = new THREE.Points(starsGeo, starsMat);
        this.scene.add(this.starField);

        // Nebulosa
        const nebulaGeo = new THREE.BufferGeometry();
        const nebulaCount = 300;
        const nebulaPos = new Float32Array(nebulaCount * 3);
        const nebulaCol = new Float32Array(nebulaCount * 3);

        for (let i = 0; i < nebulaCount * 3; i += 3) {
            const radius = 15 + Math.random() * 25;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);

            nebulaPos[i] = radius * Math.sin(phi) * Math.cos(theta);
            nebulaPos[i + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.6;
            nebulaPos[i + 2] = radius * Math.cos(phi);

            const color = new THREE.Color().setHSL(
                0.75 + Math.random() * 0.15,
                0.5,
                0.08 + Math.random() * 0.12
            );
            nebulaCol[i] = color.r;
            nebulaCol[i + 1] = color.g;
            nebulaCol[i + 2] = color.b;
        }

        nebulaGeo.setAttribute('position', new THREE.BufferAttribute(nebulaPos, 3));
        nebulaGeo.setAttribute('color', new THREE.BufferAttribute(nebulaCol, 3));

        const nebulaMat = new THREE.PointsMaterial({
            size: 0.15,
            vertexColors: true,
            transparent: true,
            opacity: 0.15,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });

        const nebula = new THREE.Points(nebulaGeo, nebulaMat);
        this.scene.add(nebula);
    }

    // ==========================================
    // 3. SISTEMA SOLAR (MODO PADRÃO)
    // ==========================================

    createSolarSystem() {
        this.solarGroup = new THREE.Group();
        this.mainGroup.add(this.solarGroup);

        // --- SOL CENTRAL (AEGIS CORE) ---
        this.coreGroup = new THREE.Group();
        this.solarGroup.add(this.coreGroup);

        // Núcleo com padrão binário
        const coreCanvas = document.createElement('canvas');
        coreCanvas.width = 512;
        coreCanvas.height = 512;
        const ctx = coreCanvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, coreCanvas.width, coreCanvas.height);

        const gridSize = 12;
        const cellSize = coreCanvas.width / gridSize;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 32px "JetBrains Mono", monospace';

        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const value = (i + j) % 2 === 0 ? '0' : '1';
                const x = i * cellSize + cellSize / 2;
                const y = j * cellSize + cellSize / 2;
                ctx.fillStyle = (i + j) % 2 === 0 ? '#000000' : '#ffffff';
                ctx.fillText(value, x, y);
            }
        }

        const coreTexture = new THREE.CanvasTexture(coreCanvas);
        coreTexture.needsUpdate = true;

        const coreMat = new THREE.MeshBasicMaterial({
            map: coreTexture,
            transparent: true,
            opacity: 0.9
        });
        const core = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 32), coreMat);
        this.coreGroup.add(core);

        // Anel do Sol
        const ringGeo = new THREE.TorusGeometry(2.5, 0.02, 16, 80);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        this.coreGroup.add(ring);

        const ring2 = new THREE.Mesh(
            new THREE.TorusGeometry(3.0, 0.015, 16, 80),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1 })
        );
        ring2.rotation.x = Math.PI / 3;
        ring2.rotation.z = 0.5;
        this.coreGroup.add(ring2);

        // Glow particles
        const glowCount = 200;
        const glowGeo = new THREE.BufferGeometry();
        const glowPos = new Float32Array(glowCount * 3);
        for (let i = 0; i < glowCount * 3; i += 3) {
            const r = 1.8 + Math.random() * 3;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            glowPos[i] = r * Math.sin(phi) * Math.cos(theta);
            glowPos[i + 1] = r * Math.sin(phi) * Math.sin(theta);
            glowPos[i + 2] = r * Math.cos(phi);
        }
        glowGeo.setAttribute('position', new THREE.BufferAttribute(glowPos, 3));
        const glowMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.04,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        const glow = new THREE.Points(glowGeo, glowMat);
        this.coreGroup.add(glow);

        // Label do Core
        const coreLabel = this.createLabel('AEGIS CORE', true);
        coreLabel.position.y = 3.5;
        this.coreGroup.add(coreLabel);

        this.coreGroup.userData = {
            id: 'aegis',
            name: 'AEGIS CORE',
            description: 'Sistema Operacional de Aprendizado',
            isCore: true,
            color: 0xffffff
        };

        // Guardar referência do core para interação
        this.coreMesh = core;
        this.meshDataMap.set(core, this.coreGroup.userData);

        // --- PLANETAS ---
        this.planetsData = [
            {
                id: 'backend',
                name: 'BACKEND',
                description: 'Desenvolvimento de APIs e infraestrutura',
                color: 0x5EEAD4,
                orbitRadius: 4.5,
                orbitSpeed: 0.3,
                radius: 0.7,
                items: [
                    { id: 'python', name: 'PYTHON.md', desc: 'Linguagem base' },
                    { id: 'fastapi', name: 'FASTAPI.md', desc: 'Framework web' },
                    { id: 'docker', name: 'DOCKER.md', desc: 'Containerização' }
                ]
            },
            {
                id: 'ai',
                name: 'IA ENGENHARIA',
                description: 'Modelos de linguagem e agentes',
                color: 0xF472B6,
                orbitRadius: 6.5,
                orbitSpeed: 0.2,
                radius: 0.7,
                items: [
                    { id: 'llm', name: 'LLM.md', desc: 'Large Language Models' },
                    { id: 'rag', name: 'RAG.md', desc: 'Retrieval-Augmented Gen' }
                ]
            },
            {
                id: 'math',
                name: 'MATEMÁTICA',
                description: 'Fundamentos para IA e dados',
                color: 0xFBBF24,
                orbitRadius: 8.5,
                orbitSpeed: 0.15,
                radius: 0.6,
                items: [
                    { id: 'linear', name: 'ALGEBRA.md', desc: 'Vetores e matrizes' },
                    { id: 'calculus', name: 'CALCULO.md', desc: 'Diferencial e integral' }
                ]
            },
            {
                id: 'frontend',
                name: 'FRONTEND',
                description: 'Interfaces e experiência do usuário',
                color: 0x60A5FA,
                orbitRadius: 10.5,
                orbitSpeed: 0.12,
                radius: 0.6,
                items: [
                    { id: 'react', name: 'REACT.md', desc: 'Biblioteca de interfaces' },
                    { id: 'tailwind', name: 'TAILWIND.md', desc: 'Framework CSS' }
                ]
            },
            {
                id: 'devops',
                name: 'DEVOPS',
                description: 'Infraestrutura e automação',
                color: 0x34D399,
                orbitRadius: 12.5,
                orbitSpeed: 0.1,
                radius: 0.5,
                items: [
                    { id: 'k8s', name: 'KUBERNETES.md', desc: 'Orquestração' },
                    { id: 'terraform', name: 'TERRAFORM.md', desc: 'Infra como código' }
                ]
            }
        ];

        this.planetsData.forEach((planet, index) => {
            this.createPlanet(planet, index);
        });
    }

    createPlanet(planet, index) {
        const planetGroup = new THREE.Group();
        const angle = (index / this.planetsData.length) * Math.PI * 2;
        planetGroup.position.set(
            planet.orbitRadius * Math.cos(angle),
            (Math.random() - 0.5) * 1.0,
            planet.orbitRadius * Math.sin(angle)
        );

        // Núcleo do planeta
        const coreMat = new THREE.MeshBasicMaterial({
            color: planet.color,
            transparent: true,
            opacity: 0.8
        });
        const core = new THREE.Mesh(new THREE.SphereGeometry(planet.radius * 0.5, 16, 16), coreMat);
        planetGroup.add(core);

        // Anel wireframe
        const wireMat = new THREE.MeshBasicMaterial({
            color: planet.color,
            wireframe: true,
            transparent: true,
            opacity: 0.25
        });
        const wire = new THREE.Mesh(new THREE.SphereGeometry(planet.radius, 12, 12), wireMat);
        planetGroup.add(wire);

        // Anel orbital ao redor do planeta
        const ringGeo = new THREE.TorusGeometry(planet.radius * 1.6, 0.015, 8, 30);
        const ringMat = new THREE.MeshBasicMaterial({ color: planet.color, transparent: true, opacity: 0.15 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.rotation.z = 0.3;
        planetGroup.add(ring);

        // Label
        const label = this.createLabel(planet.name, false);
        label.position.y = planet.radius * 2 + 0.5;
        planetGroup.add(label);

        // Dados
        planetGroup.userData = {
            id: planet.id,
            name: planet.name,
            description: planet.description,
            isPlanet: true,
            color: planet.color,
            items: planet.items,
            orbitRadius: planet.orbitRadius,
            orbitSpeed: planet.orbitSpeed,
            pivot: null
        };

        // Órbita visível
        const orbitPoints = [];
        for (let i = 0; i <= 64; i++) {
            const a = (i / 64) * Math.PI * 2;
            orbitPoints.push(new THREE.Vector3(
                planet.orbitRadius * Math.cos(a),
                0,
                planet.orbitRadius * Math.sin(a)
            ));
        }
        const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
        const orbitMat = new THREE.LineBasicMaterial({
            color: planet.color,
            transparent: true,
            opacity: 0.06
        });
        const orbitLine = new THREE.Line(orbitGeo, orbitMat);
        this.solarGroup.add(orbitLine);

        // Pivot para rotação
        const pivot = new THREE.Group();
        pivot.position.set(0, 0, 0);
        pivot.add(planetGroup);
        this.solarGroup.add(pivot);
        planetGroup.userData.pivot = pivot;

        // Guardar referências
        this.planetMeshes.push(core);
        this.meshDataMap.set(core, planetGroup.userData);

        // Salvar para uso posterior
        if (!this.planetGroups) this.planetGroups = [];
        this.planetGroups.push(planetGroup);
    }

    createLabel(text, isCore) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.shadowColor = 'rgba(255, 255, 255, 0.1)';
        ctx.shadowBlur = 15;

        ctx.font = isCore ? 'bold 40px "JetBrains Mono", monospace' : '28px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isCore ? '#ffffff' : '#d1d5db';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2 - 5);

        if (isCore) {
            ctx.shadowBlur = 0;
            ctx.font = '12px "JetBrains Mono", monospace';
            ctx.fillStyle = '#2a2a2a';
            ctx.fillText('◈ SYSTEM CORE', canvas.width / 2, canvas.height / 2 + 40);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false,
            opacity: 0.9
        });
        const sprite = new THREE.Sprite(material);
        const scale = isCore ? 3.5 : 2.5;
        sprite.scale.set(scale, scale * 0.25, 1);
        return sprite;
    }

    // ==========================================
    // 4. MODO GRAFO (VISUALIZAÇÃO DE NÓS)
    // ==========================================

    toggleMode() {
        this.mode = this.mode === 'solar' ? 'graph' : 'solar';
        this.transitionTo(this.mode);
        return this.mode;
    }

    transitionTo(mode) {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        const targetPos = mode === 'graph' ? this.graphCamPos : this.solarCamPos;
        const targetAutoRotate = mode === 'solar';

        // Se for modo grafo, mostrar os nós
        if (mode === 'graph' && this.graphNodes.length > 0) {
            this.showGraphNodes(true);
        } else {
            this.showGraphNodes(false);
        }

        // Animar câmera
        const duration = 1000;
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
        const targetTarget = { x: 0, y: 0, z: 0 };

        const animateTransition = (time) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);

            this.camera.position.x = startPos.x + (targetPos.x - startPos.x) * ease;
            this.camera.position.y = startPos.y + (targetPos.y - startPos.y) * ease;
            this.camera.position.z = startPos.z + (targetPos.z - startPos.z) * ease;

            this.controls.target.x = startTarget.x + (targetTarget.x - startTarget.x) * ease;
            this.controls.target.y = startTarget.y + (targetTarget.y - startTarget.y) * ease;
            this.controls.target.z = startTarget.z + (targetTarget.z - startTarget.z) * ease;

            this.controls.autoRotate = targetAutoRotate ? progress > 0.5 : false;
            this.controls.update();

            if (progress < 1) {
                requestAnimationFrame(animateTransition);
            } else {
                this.isTransitioning = false;
            }
        };
        requestAnimationFrame(animateTransition);

        // Notificar mudança
        if (this.onModeChange) {
            this.onModeChange(mode);
        }
    }

    showGraphNodes(visible) {
        // Mostrar/esconder nós do grafo
        this.nodeMeshes?.forEach(group => {
            group.visible = visible;
        });
        this.connectionLines?.forEach(line => {
            line.visible = visible;
        });

        // Mostrar/esconder sistema solar
        if (this.solarGroup) {
            this.solarGroup.visible = !visible;
        }

        // Se visível e não tem nós, adicionar
        if (visible && this.graphNodes.length > 0 && !this.nodeMeshes) {
            this.addGraphNodes(this.graphNodes, this.graphEdges);
        }
    }

    // ==========================================
    // 5. ADIÇÃO DE NÓS (GRAFO)
    // ==========================================

    addGraphNodes(nodes, edges) {
        this.graphNodes = nodes;
        this.graphEdges = edges || [];

        // Limpar nós antigos
        this.clearGraphNodes();

        if (!nodes || nodes.length === 0) return;

        this.nodeMeshes = [];
        this.nodeGroupMap = new Map();

        nodes.forEach((node, index) => {
            const group = this.createNodeGroup(node, index);
            this.mainGroup.add(group);
            this.nodeGroupMap.set(node.id, group);
            this.nodeMeshes.push(group);
        });

        // Criar conexões
        edges.forEach(edge => {
            this.createConnectionLine(edge);
        });

        // Esconder por padrão (só mostra no modo grafo)
        if (this.mode !== 'graph') {
            this.nodeMeshes.forEach(g => g.visible = false);
            this.connectionLines.forEach(l => l.visible = false);
        }

        // Atualizar contador
        this.updateNodeCount(nodes.length);
    }

    createNodeGroup(node, index) {
        const group = new THREE.Group();
        const pos = node.position || {
            x: (Math.random() - 0.5) * 15,
            y: (Math.random() - 0.5) * 15,
            z: (Math.random() - 0.5) * 15
        };
        group.position.set(pos.x, pos.y, pos.z);
        group.userData = {
            id: node.id,
            label: node.label,
            data: node.data,
            isRoot: node.data?.category === 'module',
            color: node.color || 0x5EEAD4
        };

        const color = node.color || 0x5EEAD4;
        const radius = group.userData.isRoot ? 0.6 : 0.35;

        // Núcleo
        const coreMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.8
        });
        const core = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16), coreMat);
        core.userData.isCore = true;
        group.add(core);

        // Anel wireframe
        const wireMat = new THREE.MeshBasicMaterial({
            color: color,
            wireframe: true,
            transparent: true,
            opacity: 0.2
        });
        const wire = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.5, 12, 12), wireMat);
        wire.userData.isWire = true;
        group.add(wire);

        // Label (Sprite)
        const label = this.createLabel(node.label || 'NÓ', false);
        label.position.y = radius * 2 + 0.3;
        group.add(label);

        return group;
    }

    createConnectionLine(edge) {
        const sourceGroup = this.nodeGroupMap.get(edge.source);
        const targetGroup = this.nodeGroupMap.get(edge.target);
        if (!sourceGroup || !targetGroup) return;

        const startPos = sourceGroup.position.clone();
        const endPos = targetGroup.position.clone();
        const points = [startPos, endPos];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        const material = new THREE.LineBasicMaterial({
            color: 0x334155,
            transparent: true,
            opacity: 0.15
        });

        const line = new THREE.Line(geometry, material);
        line.userData = { source: edge.source, target: edge.target };
        this.mainGroup.add(line);
        this.connectionLines.push(line);
    }

    clearGraphNodes() {
        if (this.nodeMeshes) {
            this.nodeMeshes.forEach(group => {
                this.mainGroup.remove(group);
                group.children.forEach(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
            });
        }
        this.nodeMeshes = [];
        this.nodeGroupMap.clear();

        if (this.connectionLines) {
            this.connectionLines.forEach(line => {
                this.mainGroup.remove(line);
                line.geometry.dispose();
                line.material.dispose();
            });
        }
        this.connectionLines = [];
    }

    // ==========================================
    // 6. INTERAÇÃO
    // ==========================================

    setupEvents() {
        // Mouse move - hover
        this.renderer.domElement.addEventListener('mousemove', (e) => {
            if (this.mode === 'graph') {
                this.handleGraphHover(e);
            } else {
                this.handleSolarHover(e);
            }
        });

        // Click
        this.renderer.domElement.addEventListener('click', (e) => {
            if (this.mode === 'graph') {
                this.handleGraphClick(e);
            } else {
                this.handleSolarClick(e);
            }
        });

        // Teclado
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.deselectNode();
            }
            // Ctrl+Shift+M - alternar modo
            if (e.ctrlKey && e.shiftKey && (e.key === 'm' || e.key === 'M')) {
                e.preventDefault();
                const newMode = this.toggleMode();
                console.log(`Modo: ${newMode}`);
            }
        });

        // Resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    handleSolarHover(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);

        const targets = [this.coreMesh, ...this.planetMeshes];
        const intersects = raycaster.intersectObjects(targets);

        if (intersects.length > 0) {
            const mesh = intersects[0].object;
            const data = this.meshDataMap.get(mesh);
            if (data) {
                this.renderer.domElement.style.cursor = 'pointer';
                if (this.hoveredNode !== data.id) {
                    this.hoveredNode = data.id;
                    // Efeito de hover
                    mesh.material.opacity = 1;
                    mesh.scale.set(1.3, 1.3, 1.3);
                }
                return;
            }
        }

        this.renderer.domElement.style.cursor = 'default';
        if (this.hoveredNode) {
            // Reset hover
            this.planetMeshes.forEach(m => {
                if (m.material) {
                    m.material.opacity = 0.7;
                    m.scale.set(1, 1, 1);
                }
            });
            if (this.coreMesh) {
                this.coreMesh.material.opacity = 0.9;
                this.coreMesh.scale.set(1, 1, 1);
            }
            this.hoveredNode = null;
        }
    }

    handleSolarClick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);

        const targets = [this.coreMesh, ...this.planetMeshes];
        const intersects = raycaster.intersectObjects(targets);

        if (intersects.length > 0) {
            const mesh = intersects[0].object;
            const data = this.meshDataMap.get(mesh);
            if (data) {
                this.selectNode(data);
            }
        }
    }

    handleGraphHover(event) {
        if (!this.nodeMeshes || this.nodeMeshes.length === 0) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);

        const targets = [];
        this.nodeMeshes.forEach(group => {
            group.children.forEach(child => {
                if (child.userData?.isCore) {
                    targets.push(child);
                }
            });
        });

        const intersects = raycaster.intersectObjects(targets);

        if (intersects.length > 0) {
            const hit = intersects[0].object;
            const group = hit.parent;
            const nodeId = group.userData.id;
            this.renderer.domElement.style.cursor = 'pointer';
            if (this.hoveredNode !== nodeId) {
                this.hoveredNode = nodeId;
                this.highlightNode(nodeId, true);
            }
        } else {
            this.renderer.domElement.style.cursor = 'default';
            if (this.hoveredNode) {
                this.highlightNode(this.hoveredNode, false);
                this.hoveredNode = null;
            }
        }
    }

    handleGraphClick(event) {
        if (!this.nodeMeshes || this.nodeMeshes.length === 0) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);

        const targets = [];
        this.nodeMeshes.forEach(group => {
            group.children.forEach(child => {
                if (child.userData?.isCore) {
                    targets.push(child);
                }
            });
        });

        const intersects = raycaster.intersectObjects(targets);

        if (intersects.length > 0) {
            const hit = intersects[0].object;
            const group = hit.parent;
            const nodeData = group.userData;
            // Buscar dados completos do nó
            const fullNode = this.graphNodes.find(n => n.id === nodeData.id);
            if (fullNode) {
                this.selectNode(fullNode);
            } else {
                this.selectNode(nodeData);
            }
        } else {
            this.deselectNode();
        }
    }

    // ==========================================
    // 7. SELEÇÃO E DESTAQUE
    // ==========================================

    selectNode(data) {
        if (this.selectedNode && this.selectedNode.id === data.id) return;

        // Deselecionar anterior
        if (this.selectedNode) {
            this.deselectNode();
        }

        this.selectedNode = data;

        // Destacar no grafo (se estiver no modo grafo)
        if (this.mode === 'graph' && data.id) {
            this.highlightNode(data.id, true);
            this.highlightConnections(data.id, true);
        }

        // Notificar
        if (this.onNodeSelected) {
            this.onNodeSelected(data);
        }
    }

    deselectNode() {
        if (this.selectedNode) {
            if (this.mode === 'graph' && this.selectedNode.id) {
                this.highlightNode(this.selectedNode.id, false);
                this.highlightConnections(this.selectedNode.id, false);
            }
            this.selectedNode = null;
            if (this.onNodeDeselected) {
                this.onNodeDeselected();
            }
        }
    }

    highlightNode(nodeId, active) {
        const group = this.nodeGroupMap.get(nodeId);
        if (!group) return;

        group.children.forEach(child => {
            if (child.userData?.isCore) {
                child.material.opacity = active ? 1 : 0.7;
                child.scale.set(active ? 1.5 : 1, active ? 1.5 : 1, active ? 1.5 : 1);
            }
            if (child.userData?.isWire) {
                child.material.opacity = active ? 0.6 : 0.2;
            }
        });
    }

    highlightConnections(nodeId, active) {
        this.connectionLines.forEach(line => {
            const isConnected = line.userData.source === nodeId || line.userData.target === nodeId;
            if (isConnected) {
                line.material.opacity = active ? 0.4 : 0.15;
                line.material.color.setHex(active ? 0x5EEAD4 : 0x334155);
            }
        });
    }

    // ==========================================
    // 8. UTILITÁRIOS
    // ==========================================

    updateNodeCount(count) {
        const el = document.getElementById('node-count');
        if (el) el.textContent = count;
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

    getGraphNodes() { return this.graphNodes; }
    getGraphEdges() { return this.graphEdges; }

    // ==========================================
    // 9. ANIMAÇÃO
    // ==========================================

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        // Rotação do core
        if (this.coreGroup) {
            this.coreGroup.children[0].rotation.x += 0.005;
            this.coreGroup.children[0].rotation.y += 0.008;
            // Anéis do core
            this.coreGroup.children.forEach(child => {
                if (child.type === 'Mesh' && child.geometry.type === 'TorusGeometry') {
                    child.rotation.z += 0.002;
                }
            });
        }

        // Rotação dos planetas
        if (this.solarGroup) {
            this.solarGroup.children.forEach(child => {
                if (child.type === 'Group' && child.userData?.pivot) {
                    const data = child.userData;
                    const pivot = data.pivot;
                    const speed = data.orbitSpeed || 0.2;
                    pivot.rotation.y += 0.005 * speed;
                }
            });
        }

        // Rotação das estrelas
        if (this.starField) {
            this.starField.rotation.y += 0.0001;
        }

        // Flutuação dos nós do grafo (se visíveis)
        if (this.mode === 'graph' && this.nodeMeshes) {
            const time = performance.now() * 0.001;
            this.nodeMeshes.forEach((group, i) => {
                const offset = i * 0.3;
                const baseY = group.position.y;
                // A flutuação é aplicada diretamente na posição, mas preservamos a original
                if (!group.userData.baseY) {
                    group.userData.baseY = baseY;
                }
                group.position.y = group.userData.baseY + Math.sin(time + offset) * 0.1;
            });
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    // ==========================================
    // 10. DISPOSE
    // ==========================================

    dispose() {
        this.renderer.dispose();
        if (this.container && this.renderer.domElement) {
            this.container.removeChild(this.renderer.domElement);
        }
        this.clearGraphNodes();
    }
}