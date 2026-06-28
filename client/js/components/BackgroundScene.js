// public/js/components/BackgroundScene.js

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class BackgroundScene {
    constructor(containerId = 'webgl-container') {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Container 3D não encontrado:', containerId);
            return;
        }

        // Estado da cena
        this.currentState = 'globe'; // 'globe' | 'graph'
        this.isGraphInteractive = false;

        // Posições da câmera
        this.globeCamPos = { x: 5, y: 0, z: 25 };
        this.graphCamPos = { x: 0, y: -100, z: 20 };

        // Inicializar cena
        this.initScene();
        this.createGlobe();
        this.createGraphPlaceholder();
        this.setupEvents();
        this.animate();
    }

    initScene() {
        // Cena
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x030303, 0.015);

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
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);
        this.container.appendChild(this.renderer.domElement);

        // Controles
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = false;
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        // Grupo principal
        this.mainGroup = new THREE.Group();
        this.scene.add(this.mainGroup);
    }

    createGlobe() {
        this.globeGroup = new THREE.Group();
        this.mainGroup.add(this.globeGroup);

        // Esfera principal (wireframe + partículas)
        const sphereGeo = new THREE.SphereGeometry(7, 64, 64);

        // Partículas
        const particlesMat = new THREE.PointsMaterial({
            color: 0x8b5cf6,
            size: 0.04,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending
        });
        this.globePoints = new THREE.Points(sphereGeo, particlesMat);

        // Wireframe
        const wireframeGeo = new THREE.SphereGeometry(7.05, 32, 32);
        const wireframeMat = new THREE.MeshBasicMaterial({
            color: 0x6b7280,
            wireframe: true,
            transparent: true,
            opacity: 0.15
        });
        this.wireframeGlobe = new THREE.Mesh(wireframeGeo, wireframeMat);

        this.globeGroup.add(this.globePoints);
        this.globeGroup.add(this.wireframeGlobe);

        // Anéis orbitais (satélites)
        this.satellites = [];
        this.createSatelliteRing(9.5, Math.PI / 2, 0);
        this.createSatelliteRing(11, Math.PI / 3, Math.PI / 4);
        this.createSatelliteRing(12.5, -Math.PI / 6, -Math.PI / 4);
    }

    createSatelliteRing(radius, rotX, rotY) {
        const ringGroup = new THREE.Group();
        ringGroup.rotation.set(rotX, rotY, 0);

        // Anel
        const ringGeo = new THREE.TorusGeometry(radius, 0.015, 16, 100);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x4b5563,
            transparent: true,
            opacity: 0.3
        });
        ringGroup.add(new THREE.Mesh(ringGeo, ringMat));

        // Satélite
        const satGeo = new THREE.SphereGeometry(0.12, 8, 8);
        const satMat = new THREE.MeshBasicMaterial({
            color: 0x8b5cf6
        });
        const sat = new THREE.Mesh(satGeo, satMat);
        sat.position.x = radius;

        const pivot = new THREE.Group();
        pivot.add(sat);
        ringGroup.add(pivot);

        this.globeGroup.add(ringGroup);
        this.satellites.push({
            pivot,
            speed: 0.003 + Math.random() * 0.004
        });
    }

    createGraphPlaceholder() {
        // Grupo do grafo (será populado depois pelo GraphView)
        this.graphGroup = new THREE.Group();
        this.graphGroup.position.y = -100;
        this.mainGroup.add(this.graphGroup);

        // Pequeno grid no fundo do grafo
        const gridHelper = new THREE.GridHelper(40, 20, 0x4b5563, 0x2d3748);
        gridHelper.position.y = -5;
        this.graphGroup.add(gridHelper);

        // Algumas estrelas de fundo
        const starsGeo = new THREE.BufferGeometry();
        const starsCount = 500;
        const positions = new Float32Array(starsCount * 3);
        for (let i = 0; i < starsCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 80;
            positions[i + 1] = (Math.random() - 0.5) * 80;
            positions[i + 2] = (Math.random() - 0.5) * 80 - 20;
        }
        starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const starsMat = new THREE.PointsMaterial({
            color: 0x6b7280,
            size: 0.05,
            transparent: true,
            opacity: 0.3
        });
        this.graphStars = new THREE.Points(starsGeo, starsMat);
        this.graphGroup.add(this.graphStars);
    }

    setupEvents() {
        // Scroll para transição entre globe e graph
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            const maxScroll = document.body.scrollHeight - window.innerHeight;

            if (scrollY >= maxScroll - 50 && this.currentState !== 'graph') {
                this.transitionTo('graph');
            } else if (scrollY < maxScroll - 50 && this.currentState !== 'globe') {
                this.transitionTo('globe');
            }
        });

        // Resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    transitionTo(state) {
        if (this.currentState === state) return;
        this.currentState = state;

        const targetPos = state === 'graph' ? this.graphCamPos : this.globeCamPos;
        const targetTarget = state === 'graph'
            ? { x: 0, y: -100, z: 0 }
            : { x: 0, y: 0, z: 0 };

        // Habilitar/desabilitar zoom
        this.controls.enableZoom = state === 'graph';

        // Atualizar interatividade do container
        if (state === 'graph') {
            this.container.classList.add('interactive');
        } else {
            this.container.classList.remove('interactive');
        }

        // Animar câmera
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

        const duration = 1500;
        const startTime = Date.now();

        const animateTransition = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing cubic
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
            }
        };

        animateTransition();
    }

    // Método para o GraphView adicionar seus nós
    addGraphNodes(nodes) {
        // Será chamado pelo GraphView quando os dados estiverem prontos
        // Remove os nós antigos
        while (this.graphGroup.children.length > 0) {
            const child = this.graphGroup.children[0];
            if (child !== this.graphStars) {
                this.graphGroup.remove(child);
                // Cleanup de geometrias/materiais se necessário
            } else {
                break;
            }
        }

        // Adicionar novos nós (serão planetas)
        // Este método será expandido na Fase 2
        nodes.forEach(node => {
            const pos = node.position || { x: 0, y: 0, z: 0 };
            const sphere = new THREE.Mesh(
                new THREE.SphereGeometry(0.5, 16, 16),
                new THREE.MeshBasicMaterial({
                    color: node.color || 0x8b5cf6,
                    wireframe: true
                })
            );
            sphere.position.set(pos.x, pos.y, pos.z);
            sphere.userData = node;
            this.graphGroup.add(sphere);
        });
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        // Animações do globo
        if (this.globePoints) {
            this.globePoints.rotation.y += 0.001;
            this.wireframeGlobe.rotation.y += 0.001;
        }

        // Satélites
        this.satellites.forEach((sat, index) => {
            const speed = index === 0 ? -0.005 : index === 1 ? 0.003 : -0.004;
            sat.pivot.rotation.z += speed;
        });

        // Rotação do grafo (quando não está focado)
        if (this.currentState === 'graph' && !this.isGraphInteractive) {
            this.graphGroup.rotation.y += 0.0005;
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    // Método para limpar recursos
    dispose() {
        this.renderer.dispose();
        this.container.removeChild(this.renderer.domElement);
    }
}