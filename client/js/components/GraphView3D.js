// public/js/components/GraphView3D.js
// public/js/components/GraphView3D.js
// CORREÇÃO - Adicionar importação do Three.js se necessário

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import { html, mount, el, on } from '../utils/dom.js';
import { api } from '../utils/api.js';
import { Toast } from './Toast.js';
import { NodePanel } from './NodePanel.js';

export class GraphView3D {
    constructor(containerId) {
        this.container = el(`#${containerId}`);
        this.globeScene = null;
        this.nodePanel = null;
        this.graphData = null;
        this.selectedNode = null;
        this.isLoading = false;
    }

    async loadAndRender() {
        if (!this.container) return;

        // Buscar dados do grafo
        this.isLoading = true;
        this.renderLoading();

        try {
            this.graphData = await api.get('/api/graph');

            if (!this.graphData || !this.graphData.nodes || this.graphData.nodes.length === 0) {
                this.renderEmptyState();
                return;
            }

            // Processar dados para o formato 3D
            const processedData = this.processGraphData(this.graphData);

            // Renderizar a visualização
            this.render(processedData);

            // Inicializar painel de nós
            this.initNodePanel();

        } catch (err) {
            console.error('Erro ao carregar grafo:', err);
            Toast.error('Erro ao carregar visualização do grafo.');
            this.renderError();
        } finally {
            this.isLoading = false;
        }
    }

    processGraphData(data) {
        // Mapeamento de cores baseado na categoria
        const colorMap = {
            blue: 0x60a5fa,
            green: 0x34d399,
            yellow: 0xfbbf24,
            orange: 0xfb923c,
            purple: 0x8b5cf6,
            pink: 0xf472b6,
            cyan: 0x22d3ee,
            red: 0xf87171,
            indigo: 0x818cf8
        };

        // Processar nós
        const nodes = data.nodes.map(node => {
            const color = colorMap[node.data.color] || 0x8b5cf6;
            const position = node.position || this.generateNodePosition();

            return {
                id: node.data.id,
                label: node.data.label,
                color: color,
                position: position,
                data: {
                    slug: node.data.slug,
                    title: node.data.title,
                    description: node.data.description || 'Sem descrição',
                    difficulty: node.data.difficulty || 'intermediate',
                    status: node.data.status || 'not_started',
                    roadmap: node.data.roadmap || 'Geral',
                    estimatedHours: node.data.estimated_hours || 0,
                    category: node.data.category || 'outros',
                    tags: node.data.tags || []
                }
            };
        });

        // Processar arestas
        const edges = data.edges.map(edge => ({
            source: edge.data.source,
            target: edge.data.target
        }));

        return { nodes, edges };
    }

    generateNodePosition() {
        // Gerar posição aleatória dentro de uma esfera
        const radius = 8;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        const r = radius * Math.cbrt(Math.random());

        return {
            x: r * Math.sin(phi) * Math.cos(theta),
            y: r * Math.sin(phi) * Math.sin(theta),
            z: r * Math.cos(phi)
        };
    }

    render(data) {
        if (!this.container) return;

        const template = `
            <div class="h-full flex flex-col animate-fade-in relative">
                <!-- Cabeçalho -->
                <div class="flex items-center justify-between p-6 border-b border-border/40 flex-shrink-0">
                    <div>
                        <h1 class="text-xl font-bold font-mono flex items-center gap-3">
                            <i data-lucide="git-fork" class="w-5 h-5 text-accent"></i>
                            <span>GRAFO DE CONHECIMENTO</span>
                        </h1>
                        <p class="text-xs text-textSecondary mt-1">
                            ${data.nodes.length} nós · ${data.edges.length} conexões · 
                            <span class="text-accent">${this.calculateDensity(data)}% densidade</span>
                        </p>
                    </div>
                    
                    <div class="flex items-center gap-3">
                        <!-- Controles de Layout -->
                        <button id="btn-layout-force" class="glass-hover px-3 py-1.5 rounded-lg text-xs font-mono border border-border/40 flex items-center gap-2 hover:text-accent transition-all">
                            <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
                            <span>REORGANIZAR</span>
                        </button>
                        <button id="btn-layout-radial" class="glass-hover px-3 py-1.5 rounded-lg text-xs font-mono border border-border/40 flex items-center gap-2 hover:text-accent transition-all">
                            <i data-lucide="target" class="w-3.5 h-3.5"></i>
                            <span>RADIAL</span>
                        </button>
                        <button id="btn-layout-grid" class="glass-hover px-3 py-1.5 rounded-lg text-xs font-mono border border-border/40 flex items-center gap-2 hover:text-accent transition-all">
                            <i data-lucide="grid" class="w-3.5 h-3.5"></i>
                            <span>GRADE</span>
                        </button>
                        <button id="btn-reset-view" class="glass-hover px-3 py-1.5 rounded-lg text-xs font-mono border border-border/40 flex items-center gap-2 hover:text-accent transition-all">
                            <i data-lucide="maximize" class="w-3.5 h-3.5"></i>
                            <span>AJUSTAR</span>
                        </button>
                    </div>
                </div>

                <!-- Container 3D (o GlobeScene já existe, vamos apenas referenciá-lo) -->
                <div id="graph-3d-container" class="flex-1 relative overflow-hidden">
                    <!-- Overlay de instruções -->
                    <div id="graph-instructions" class="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 glass px-6 py-3 rounded-xl border border-border/40 text-center pointer-events-none transition-opacity duration-500">
                        <span class="text-xs font-mono text-textSecondary">
                            🖱️ <span class="text-accent">CLIQUE</span> nos nós para explorar · 
                            Rolar para <span class="text-accent">MERgulhar</span> no grafo · 
                            <span class="text-accent">ARRAsTE</span> para orbitar
                        </span>
                    </div>
                    
                    <!-- Indicador de carregamento do grafo 3D -->
                    <div id="graph-loading-3d" class="absolute inset-0 flex items-center justify-center bg-bg/80 z-10 transition-opacity duration-300">
                        <div class="flex flex-col items-center gap-3">
                            <div class="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                            <span class="text-xs text-textSecondary font-mono">CARREGANDO CONSTELAÇÃO...</span>
                        </div>
                    </div>
                </div>

                <!-- Legenda -->
                <div class="flex items-center gap-6 p-3 border-t border-border/40 flex-shrink-0 overflow-x-auto">
                    <span class="text-[10px] font-mono text-textMuted uppercase tracking-wider">Legenda:</span>
                    ${this.generateLegend(data.nodes).map(item => `
                        <div class="flex items-center gap-2 text-xs font-mono text-textSecondary">
                            <span class="w-2.5 h-2.5 rounded-full" style="background: #${item.color.toString(16).padStart(6, '0')}"></span>
                            <span>${item.label}</span>
                            <span class="text-[9px] text-textMuted">(${item.count})</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        mount(this.container, html(template));
        lucide.createIcons({ node: this.container });

        // Conectar com o GlobeScene existente
        this.connectToGlobeScene(data);

        // Configurar eventos dos botões
        this.setupControls();
    }

    connectToGlobeScene(data) {
        // Encontrar o GlobeScene na instância global
        // (será definido pelo app.js)
        if (window.globeScene) {
            this.globeScene = window.globeScene;
            // Adicionar os nós ao espaço 3D
            this.globeScene.addGraphNodes(data.nodes, data.edges);

            // Esconder loading
            const loadingEl = el('#graph-loading-3d', this.container);
            if (loadingEl) {
                loadingEl.classList.add('opacity-0', 'pointer-events-none');
                setTimeout(() => loadingEl.remove(), 500);
            }

            // Configurar callbacks do GlobeScene
            this.globeScene.onNodePanelClosed = () => {
                this.deselectNode();
            };

            // Adicionar listener para clique em nós
            this.setupNodeClickHandler();
        } else {
            // Se não encontrar, tentar novamente após um delay
            setTimeout(() => this.connectToGlobeScene(data), 500);
        }
    }

    setupNodeClickHandler() {
        // Usar o sistema de raycasting do GlobeScene
        // O GlobeScene precisa expor um método para registrar cliques
        if (this.globeScene && this.globeScene.renderer) {
            // Adicionar listener global para cliques
            document.addEventListener('click', (e) => {
                // Verificar se o clique foi no container 3D
                const container = this.globeScene.container;
                if (container && container.contains(e.target)) {
                    this.handleGraphClick(e);
                }
            });
        }
    }

    handleGraphClick(event) {
        // O GlobeScene deve ter um método para obter o nó clicado
        if (this.globeScene && this.globeScene.getIntersectedNode) {
            const node = this.globeScene.getIntersectedNode(event);
            if (node) {
                this.selectNode(node);
            } else {
                this.deselectNode();
            }
        }
    }

    selectNode(node) {
        this.selectedNode = node;

        // Atualizar painel lateral
        if (this.nodePanel) {
            this.nodePanel.show(node);
        } else {
            this.initNodePanel(node);
        }

        // Destacar o nó no grafo
        if (this.globeScene) {
            this.globeScene.highlightNode(node.id);
        }

        // Esconder instruções
        const instructions = el('#graph-instructions', this.container);
        if (instructions) {
            instructions.style.opacity = '0';
            setTimeout(() => instructions.remove(), 500);
        }
    }

    deselectNode() {
        this.selectedNode = null;

        if (this.nodePanel) {
            this.nodePanel.hide();
        }

        if (this.globeScene) {
            this.globeScene.unhighlightNode();
        }
    }

    initNodePanel(node = null) {
        // O painel já existe no HTML (node-panel)
        const panelElement = document.getElementById('node-panel');
        if (panelElement) {
            this.nodePanel = new NodePanel('node-panel');
            if (node) {
                this.nodePanel.show(node);
            }
        }
    }

    calculateDensity(data) {
        if (data.nodes.length < 2) return 0;
        const maxEdges = (data.nodes.length * (data.nodes.length - 1)) / 2;
        return Math.round((data.edges.length / maxEdges) * 100);
    }

    generateLegend(nodes) {
        const categories = {};
        nodes.forEach(node => {
            const cat = node.data.category || 'outros';
            if (!categories[cat]) {
                categories[cat] = { color: node.color, count: 0 };
            }
            categories[cat].count++;
        });

        return Object.entries(categories).map(([label, data]) => ({
            label: label.toUpperCase(),
            color: data.color,
            count: data.count
        }));
    }

    setupControls() {
        // Botão de reorganizar (force layout)
        const btnForce = el('#btn-layout-force', this.container);
        if (btnForce) {
            on(btnForce, 'click', () => {
                if (this.globeScene) {
                    this.globeScene.applyLayout('force');
                    Toast.info('🔄 Reorganizando constelação...');
                }
            });
        }

        // Botão de layout radial
        const btnRadial = el('#btn-layout-radial', this.container);
        if (btnRadial) {
            on(btnRadial, 'click', () => {
                if (this.globeScene) {
                    this.globeScene.applyLayout('radial');
                    Toast.info('🔄 Organizando em órbita radial...');
                }
            });
        }

        // Botão de layout em grade
        const btnGrid = el('#btn-layout-grid', this.container);
        if (btnGrid) {
            on(btnGrid, 'click', () => {
                if (this.globeScene) {
                    this.globeScene.applyLayout('grid');
                    Toast.info('🔄 Alinhando em grade...');
                }
            });
        }

        // Botão de reset da view
        const btnReset = el('#btn-reset-view', this.container);
        if (btnReset) {
            on(btnReset, 'click', () => {
                if (this.globeScene) {
                    this.globeScene.resetCamera();
                    Toast.info('🎯 Câmera ajustada para visão geral.');
                }
            });
        }
    }

    renderLoading() {
        if (!this.container) return;

        const template = `
            <div class="h-full flex items-center justify-center">
                <div class="flex flex-col items-center gap-4">
                    <div class="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                    <span class="text-xs font-mono text-textSecondary">CARREGANDO GRAFO...</span>
                </div>
            </div>
        `;
        mount(this.container, html(template));
    }

    renderEmptyState() {
        if (!this.container) return;

        const template = `
            <div class="h-full flex flex-col items-center justify-center p-8 text-center">
                <div class="w-16 h-16 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center text-accent mb-6">
                    <i data-lucide="git-fork" class="w-8 h-8"></i>
                </div>
                <h2 class="text-lg font-bold font-mono mb-2">NENHUMA CONEXÃO ENCONTRADA</h2>
                <p class="text-sm text-textSecondary max-w-md">
                    Crie artigos com <span class="text-accent">[[WikiLinks]]</span> para construir sua 
                    constelação de conhecimento.
                </p>
                <div class="mt-6 glass px-4 py-2 rounded-xl border border-border/40 text-xs text-textMuted font-mono">
                    # MARKDOWN + WIKILINKS = GRAFO VIVO
                </div>
            </div>
        `;
        mount(this.container, html(template));
        lucide.createIcons({ node: this.container });
    }

    renderError() {
        if (!this.container) return;

        const template = `
            <div class="h-full flex flex-col items-center justify-center p-8 text-center">
                <div class="w-16 h-16 bg-error/10 border border-error/20 rounded-2xl flex items-center justify-center text-error mb-6">
                    <i data-lucide="alert-triangle" class="w-8 h-8"></i>
                </div>
                <h2 class="text-lg font-bold font-mono mb-2">ERRO DE CARREGAMENTO</h2>
                <p class="text-sm text-textSecondary max-w-md">
                    Não foi possível carregar os dados do grafo. 
                    <span class="text-accent block mt-2 cursor-pointer hover:underline" id="retry-graph">
                        ↻ TENTAR NOVAMENTE
                    </span>
                </p>
            </div>
        `;
        mount(this.container, html(template));
        lucide.createIcons({ node: this.container });

        const retryBtn = el('#retry-graph', this.container);
        if (retryBtn) {
            on(retryBtn, 'click', () => this.loadAndRender());
        }
    }
}