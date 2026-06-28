// public/js/components/MindMap3D.js

import { html, mount, el, on } from '../utils/dom.js';
import { api } from '../utils/api.js';
import { Toast } from './Toast.js';

export class MindMap3D {
    constructor(containerId) {
        this.container = el(`#${containerId}`);
        this.mindmapId = null;
        this.mindmapData = null;
        this.globeScene = null;
        this.selectedNode = null;
        this.isEditing = false;
        this.isLoading = false;
        this.nodePanel = null;
        this.shootingStarInterval = null;

        // Estado do mapa
        this.state = {
            zoom: 1,
            rotation: { x: 0, y: 0 },
            focusNode: null,
            showLabels: true,
            layout: 'tree'
        };
    }

    async loadAndRender(mindmapId = null) {
        this.mindmapId = mindmapId;
        this.isLoading = true;

        if (!this.container) return;

        if (!mindmapId) {
            await this.renderList();
            return;
        }

        try {
            this.mindmapData = await api.get(`/api/mindmaps/${mindmapId}`);

            if (!this.mindmapData) {
                Toast.error('Mapa mental não encontrado.');
                window.location.hash = '#mindmaps';
                return;
            }

            this.renderDetail(this.mindmapData);

        } catch (err) {
            console.error('Erro ao carregar mapa mental:', err);
            Toast.error('Erro ao carregar mapa mental.');
            this.renderError();
        } finally {
            this.isLoading = false;
        }
    }

    // ============================================
    // MÉTODOS DE RENDERIZAÇÃO
    // ============================================

    async renderList() {
        try {
            const mindmaps = await api.get('/api/mindmaps');

            if (!mindmaps || mindmaps.length === 0) {
                this.renderEmptyList();
                return;
            }

            const template = `
                <div class="h-full flex flex-col p-6 animate-fade-in">
                    <div class="flex items-center justify-between mb-6">
                        <div>
                            <h1 class="text-xl font-bold font-mono flex items-center gap-3">
                                <i data-lucide="network" class="w-5 h-5 text-accent"></i>
                                <span>MAPAS MENTAIS</span>
                            </h1>
                            <p class="text-xs text-textSecondary mt-1">
                                ${mindmaps.length} mapas · Constelações de conhecimento interativas
                            </p>
                        </div>
                        <button id="btn-new-mindmap" class="glass-hover px-4 py-2 rounded-xl text-xs font-mono border border-accent/40 text-accent hover:bg-accent/10 transition-all flex items-center gap-2">
                            <i data-lucide="plus" class="w-4 h-4"></i>
                            <span>NOVO MAPA</span>
                        </button>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1 overflow-y-auto pb-4">
                        ${mindmaps.map(mm => `
                            <div class="glass-hover rounded-2xl border border-border/40 p-6 cursor-pointer transition-all group" data-mindmap-id="${mm.id}">
                                <div class="flex items-start justify-between mb-3">
                                    <div class="flex items-center gap-3">
                                        <div class="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                                            <i data-lucide="${mm.icon || 'network'}" class="w-5 h-5"></i>
                                        </div>
                                        <div>
                                            <h3 class="font-bold text-sm font-mono group-hover:text-accent transition-colors">${mm.name}</h3>
                                            <p class="text-[10px] text-textMuted">${mm.node_count || 0} nós</p>
                                        </div>
                                    </div>
                                    <button class="btn-delete-mindmap opacity-0 group-hover:opacity-100 text-textMuted hover:text-error transition-all" data-mindmap-id="${mm.id}">
                                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                                    </button>
                                </div>
                                <p class="text-xs text-textSecondary line-clamp-2">${mm.description || 'Mapa mental sem descrição'}</p>
                                <div class="mt-4 flex items-center justify-between text-[10px] text-textMuted">
                                    <span>Atualizado: ${new Date(mm.updated_at).toLocaleDateString('pt-BR')}</span>
                                    <span class="text-accent">${mm.root_article_title || 'Em branco'}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            mount(this.container, html(template));
            lucide.createIcons({ node: this.container });

            // Eventos dos cards
            const cards = this.container.querySelectorAll('[data-mindmap-id]');
            cards.forEach(card => {
                on(card, 'click', (e) => {
                    if (e.target.closest('.btn-delete-mindmap')) return;
                    const id = card.getAttribute('data-mindmap-id');
                    window.location.hash = `#mindmaps/${id}`;
                });
            });

            // Eventos de deletar
            const deleteBtns = this.container.querySelectorAll('.btn-delete-mindmap');
            deleteBtns.forEach(btn => {
                on(btn, 'click', async (e) => {
                    e.stopPropagation();
                    const id = btn.getAttribute('data-mindmap-id');
                    if (confirm('Deseja realmente excluir este mapa mental?')) {
                        try {
                            await api.delete(`/api/mindmaps/${id}`);
                            Toast.success('Mapa mental excluído.');
                            this.renderList();
                        } catch (err) {
                            Toast.error('Erro ao excluir mapa.');
                        }
                    }
                });
            });

            const newBtn = el('#btn-new-mindmap', this.container);
            if (newBtn) {
                on(newBtn, 'click', () => this.showCreateModal());
            }

        } catch (err) {
            console.error(err);
            Toast.error('Erro ao carregar lista de mapas.');
        }
    }

    renderDetail(data) {
        if (!this.container || !data) return;

        const template = `
            <div class="h-full flex flex-col animate-fade-in">
                <div class="flex items-center justify-between p-4 border-b border-border/40 flex-shrink-0">
                    <div class="flex items-center gap-4">
                        <a href="#mindmaps" class="text-textSecondary hover:text-textPrimary transition-colors">
                            <i data-lucide="arrow-left" class="w-5 h-5"></i>
                        </a>
                        <div>
                            <h1 class="text-lg font-bold font-mono flex items-center gap-3">
                                <span>${data.name}</span>
                                ${data.root_article_title ? `
                                    <span class="text-[9px] font-mono text-textMuted bg-black/30 px-2 py-0.5 rounded border border-border/40">
                                        📄 ${data.root_article_title}
                                    </span>
                                ` : ''}
                            </h1>
                            <p class="text-xs text-textSecondary">${data.description || 'Mapa mental interativo'}</p>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-2">
                        <button id="btn-layout-tree" class="glass-hover px-3 py-1.5 rounded-lg text-[10px] font-mono border border-border/40 hover:text-accent transition-all flex items-center gap-1.5">
                            <i data-lucide="git-branch" class="w-3.5 h-3.5"></i>
                            <span>ÁRVORE</span>
                        </button>
                        <button id="btn-layout-radial" class="glass-hover px-3 py-1.5 rounded-lg text-[10px] font-mono border border-border/40 hover:text-accent transition-all flex items-center gap-1.5">
                            <i data-lucide="target" class="w-3.5 h-3.5"></i>
                            <span>RADIAL</span>
                        </button>
                        <button id="btn-layout-force" class="glass-hover px-3 py-1.5 rounded-lg text-[10px] font-mono border border-border/40 hover:text-accent transition-all flex items-center gap-1.5">
                            <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
                            <span>FORÇA</span>
                        </button>
                        <span class="w-px h-6 bg-border/40 mx-1"></span>
                        <button id="btn-toggle-labels" class="glass-hover px-3 py-1.5 rounded-lg text-[10px] font-mono border border-border/40 hover:text-accent transition-all flex items-center gap-1.5">
                            <i data-lucide="text" class="w-3.5 h-3.5"></i>
                            <span>RÓTULOS</span>
                        </button>
                        <button id="btn-zoom-in" class="glass-hover px-3 py-1.5 rounded-lg text-[10px] font-mono border border-border/40 hover:text-accent transition-all">
                            <i data-lucide="zoom-in" class="w-3.5 h-3.5"></i>
                        </button>
                        <button id="btn-zoom-out" class="glass-hover px-3 py-1.5 rounded-lg text-[10px] font-mono border border-border/40 hover:text-accent transition-all">
                            <i data-lucide="zoom-out" class="w-3.5 h-3.5"></i>
                        </button>
                        <button id="btn-reset-view" class="glass-hover px-3 py-1.5 rounded-lg text-[10px] font-mono border border-border/40 hover:text-accent transition-all">
                            <i data-lucide="maximize" class="w-3.5 h-3.5"></i>
                        </button>
                        <span class="w-px h-6 bg-border/40 mx-1"></span>
                        <button id="btn-edit-mindmap" class="glass-hover px-3 py-1.5 rounded-lg text-[10px] font-mono border border-accent/40 text-accent hover:bg-accent/10 transition-all flex items-center gap-1.5">
                            <i data-lucide="edit" class="w-3.5 h-3.5"></i>
                            <span>EDITAR</span>
                        </button>
                        <button id="btn-save-mindmap" class="bg-accent hover:bg-accent-hover text-white px-4 py-1.5 rounded-lg text-[10px] font-mono transition-all flex items-center gap-1.5 shadow-lg shadow-accent/20">
                            <i data-lucide="save" class="w-3.5 h-3.5"></i>
                            <span>SALVAR</span>
                        </button>
                    </div>
                </div>
                
                <div id="mindmap-3d-container" class="flex-1 relative overflow-hidden">
                    <div id="mindmap-instructions" class="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 glass px-6 py-3 rounded-xl border border-border/40 text-center pointer-events-none transition-opacity duration-500">
                        <span class="text-xs font-mono text-textSecondary">
                            🖱️ <span class="text-accent">CLIQUE</span> nos nós para explorar · 
                            Duplo clique para <span class="text-accent">RENOMEAR</span> · 
                            <span class="text-accent">ARRASTE</span> para orbitar · 
                            Scroll para <span class="text-accent">ZOOM</span>
                        </span>
                    </div>
                    <div id="mindmap-loading" class="absolute inset-0 flex items-center justify-center bg-bg/80 z-10 transition-opacity duration-300">
                        <div class="flex flex-col items-center gap-3">
                            <div class="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                            <span class="text-xs text-textSecondary font-mono">GERANDO CONSTELAÇÃO...</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        mount(this.container, html(template));
        lucide.createIcons({ node: this.container });

        this.initNodePanel();
        this.connectToGlobeScene(data);
        this.setupControls();
    }

    // ============================================
    // MÉTODOS DE INTEGRAÇÃO 3D
    // ============================================

    connectToGlobeScene(data) {
        if (window.globeScene) {
            this.globeScene = window.globeScene;
            const processedData = this.processMindMapData(data);
            this.globeScene.addGraphNodes(processedData.nodes, processedData.edges);

            setTimeout(() => {
                this.globeScene.applyLayout('tree');
            }, 500);

            const loadingEl = el('#mindmap-loading', this.container);
            if (loadingEl) {
                loadingEl.classList.add('opacity-0', 'pointer-events-none');
                setTimeout(() => loadingEl.remove(), 500);
            }

            this.globeScene.onNodePanelClosed = () => {
                this.deselectNode();
            };

            this.setupNodeClickHandler();
        } else {
            setTimeout(() => this.connectToGlobeScene(data), 500);
        }
    }

    processMindMapData(data) {
        const nodes = [];
        const edges = [];
        const treeData = data.tree_data || { nodes: [], edges: [] };

        const levelColors = [0x8b5cf6, 0x60a5fa, 0x34d399, 0xfbbf24, 0xf472b6, 0xfb923c];

        const processNode = (node, level = 0, parentId = null) => {
            const color = levelColors[Math.min(level, levelColors.length - 1)];
            const size = Math.max(0.3, 0.8 - level * 0.05);

            nodes.push({
                id: node.id || `node-${Date.now()}-${Math.random()}`,
                label: node.label || 'Nó',
                color: color,
                size: size,
                position: node.position || this.generateNodePosition(level),
                data: {
                    slug: node.slug || null,
                    title: node.label || 'Nó sem título',
                    description: node.description || '',
                    level: level,
                    isRoot: level === 0
                }
            });

            if (parentId) {
                edges.push({
                    source: parentId,
                    target: node.id || `node-${Date.now()}-${Math.random()}`
                });
            }

            if (node.children && node.children.length > 0) {
                node.children.forEach(child => {
                    processNode(child, level + 1, node.id);
                });
            }
        };

        const rootNode = treeData.nodes.find(n => n.data.isRoot) || treeData.nodes[0];
        if (rootNode) {
            processNode(rootNode, 0);
        } else if (treeData.nodes.length > 0) {
            processNode(treeData.nodes[0], 0);
        }

        if (treeData.edges) {
            treeData.edges.forEach(edge => {
                if (!edges.some(e => e.source === edge.data.source && e.target === edge.data.target)) {
                    edges.push({
                        source: edge.data.source,
                        target: edge.data.target
                    });
                }
            });
        }

        return { nodes, edges };
    }

    generateNodePosition(level) {
        const radius = 3 + level * 2;
        const angle = Math.random() * Math.PI * 2;
        const spread = 0.5 + level * 0.3;
        return {
            x: radius * Math.cos(angle) * spread,
            y: (Math.random() - 0.5) * 1.5,
            z: radius * Math.sin(angle) * spread
        };
    }

    // ============================================
    // MÉTODOS DE INTERAÇÃO
    // ============================================

    setupNodeClickHandler() {
        if (this.globeScene && this.globeScene.renderer) {
            document.addEventListener('click', (e) => {
                if (this.globeScene && this.globeScene.container.contains(e.target)) {
                    const node = this.globeScene.getIntersectedNode(e);
                    if (node) {
                        this.selectNode(node);
                    } else {
                        this.deselectNode();
                    }
                }
            });

            document.addEventListener('dblclick', (e) => {
                if (this.globeScene && this.globeScene.container.contains(e.target)) {
                    const node = this.globeScene.getIntersectedNode(e);
                    if (node && this.isEditing) {
                        this.editNodeLabel(node);
                    }
                }
            });
        }
    }

    selectNode(node) {
        this.selectedNode = node;
        if (this.nodePanel) {
            this.nodePanel.show(node);
        }
        if (this.globeScene) {
            this.globeScene.highlightNode(node.id);
        }
        const instructions = el('#mindmap-instructions', this.container);
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

    editNodeLabel(node) {
        const newLabel = prompt('Editar nome do nó:', node.label);
        if (newLabel && newLabel.trim() !== '') {
            node.label = newLabel.trim();
            if (this.globeScene) {
                this.globeScene.updateNodeLabel(node.id, newLabel);
            }
            Toast.success('Nó renomeado!');
        }
    }

    // ============================================
    // MÉTODOS DE CONTROLE
    // ============================================

    setupControls() {
        const layouts = ['tree', 'radial', 'force'];
        layouts.forEach(type => {
            const btn = el(`#btn-layout-${type}`, this.container);
            if (btn) {
                on(btn, 'click', () => {
                    if (this.globeScene) {
                        this.globeScene.applyLayout(type);
                        Toast.info(`🔄 Layout ${type.toUpperCase()}`);
                    }
                });
            }
        });

        const labelsBtn = el('#btn-toggle-labels', this.container);
        if (labelsBtn) {
            on(labelsBtn, 'click', () => {
                this.state.showLabels = !this.state.showLabels;
                if (this.globeScene) {
                    this.globeScene.toggleLabels(this.state.showLabels);
                }
                labelsBtn.classList.toggle('text-accent');
            });
        }

        const zoomIn = el('#btn-zoom-in', this.container);
        const zoomOut = el('#btn-zoom-out', this.container);
        if (zoomIn) {
            on(zoomIn, 'click', () => {
                this.state.zoom *= 1.2;
                if (this.globeScene) {
                    this.globeScene.setZoom(this.state.zoom);
                }
            });
        }
        if (zoomOut) {
            on(zoomOut, 'click', () => {
                this.state.zoom *= 0.8;
                if (this.globeScene) {
                    this.globeScene.setZoom(this.state.zoom);
                }
            });
        }

        const resetBtn = el('#btn-reset-view', this.container);
        if (resetBtn) {
            on(resetBtn, 'click', () => {
                this.state.zoom = 1;
                if (this.globeScene) {
                    this.globeScene.resetCamera();
                }
            });
        }

        const editBtn = el('#btn-edit-mindmap', this.container);
        if (editBtn) {
            on(editBtn, 'click', () => {
                this.isEditing = !this.isEditing;
                editBtn.classList.toggle('bg-accent/20');
                editBtn.classList.toggle('text-accent');
                Toast.info(this.isEditing ? '✏️ Modo edição ativado' : '📖 Modo visualização');
            });
        }

        const saveBtn = el('#btn-save-mindmap', this.container);
        if (saveBtn) {
            on(saveBtn, 'click', async () => {
                await this.saveMindMap();
            });
        }
    }

    async saveMindMap() {
        if (!this.mindmapId || !this.globeScene) return;

        try {
            const nodes = this.globeScene.getGraphNodes();
            const edges = this.globeScene.getGraphEdges();

            const treeData = {
                nodes: nodes.map(n => ({
                    data: {
                        id: n.id,
                        label: n.label,
                        isRoot: n.data.isRoot || false,
                        slug: n.data.slug || null
                    },
                    position: n.position
                })),
                edges: edges.map(e => ({
                    data: {
                        source: e.source,
                        target: e.target
                    }
                }))
            };

            await api.put(`/api/mindmaps/${this.mindmapId}`, { treeData });
            Toast.success('💾 Mapa mental salvo com sucesso!');

        } catch (err) {
            console.error(err);
            Toast.error('Erro ao salvar mapa mental.');
        }
    }

    // ============================================
    // MÉTODOS DE UTILITÁRIOS
    // ============================================

    initNodePanel() {
        if (!document.getElementById('node-panel')) {
            const panel = document.createElement('div');
            panel.id = 'node-panel';
            panel.innerHTML = `
                <div class="flex items-start justify-between mb-4">
                    <div class="node-title" id="p-title">NODE_NAME</div>
                    <button id="p-close" class="text-textMuted hover:text-textPrimary transition-colors">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>
                <div class="node-desc" id="p-desc">Descrição do nó</div>
                <div class="flex flex-col gap-1">
                    <div class="node-row"><span>NÍVEL:</span><span id="p-level">0</span></div>
                    <div class="node-row"><span>CONEXÕES:</span><span id="p-connections-count">0</span></div>
                </div>
                <div class="mt-4 pt-3 border-t border-border/40 flex gap-2">
                    <button id="p-open-editor" class="btn-action flex-1">ABRIR NOTA</button>
                </div>
            `;
            document.body.appendChild(panel);
        }

        import('./NodePanel.js').then(module => {
            this.nodePanel = new module.NodePanel('node-panel');
        });
    }

    renderEmptyList() {
        if (!this.container) return;
        const template = `
            <div class="h-full flex flex-col items-center justify-center p-8 text-center">
                <div class="w-16 h-16 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center text-accent mb-6">
                    <i data-lucide="network" class="w-8 h-8"></i>
                </div>
                <h2 class="text-lg font-bold font-mono mb-2">NENHUM MAPA MENTAL</h2>
                <p class="text-sm text-textSecondary max-w-md">Crie mapas mentais para visualizar suas ideias e conexões.</p>
                <button id="btn-create-first" class="mt-6 bg-accent hover:bg-accent-hover text-white px-6 py-2 rounded-xl text-sm font-mono transition-all flex items-center gap-2">
                    <i data-lucide="plus" class="w-4 h-4"></i>
                    <span>CRIAR PRIMEIRO MAPA</span>
                </button>
            </div>
        `;
        mount(this.container, html(template));
        lucide.createIcons({ node: this.container });

        const createBtn = el('#btn-create-first', this.container);
        if (createBtn) {
            on(createBtn, 'click', () => this.showCreateModal());
        }
    }

    renderError() {
        if (!this.container) return;
        const template = `
            <div class="h-full flex flex-col items-center justify-center p-8 text-center">
                <div class="w-16 h-16 bg-error/10 border border-error/20 rounded-2xl flex items-center justify-center text-error mb-6">
                    <i data-lucide="alert-triangle" class="w-8 h-8"></i>
                </div>
                <h2 class="text-lg font-bold font-mono mb-2">ERRO AO CARREGAR</h2>
                <p class="text-sm text-textSecondary max-w-md">Não foi possível carregar o mapa mental.</p>
                <button id="retry-mindmap" class="mt-6 text-accent hover:underline text-sm font-mono">↻ TENTAR NOVAMENTE</button>
            </div>
        `;
        mount(this.container, html(template));
        lucide.createIcons({ node: this.container });

        const retryBtn = el('#retry-mindmap', this.container);
        if (retryBtn) {
            on(retryBtn, 'click', () => this.loadAndRender(this.mindmapId));
        }
    }

    showCreateModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in';
        modal.innerHTML = `
            <div class="glass w-full max-w-md rounded-2xl p-6 flex flex-col gap-4 border border-border/60 shadow-2xl">
                <div class="flex items-center justify-between border-b border-border/60 pb-3">
                    <h3 class="font-bold font-mono text-sm">CRIAR MAPA MENTAL</h3>
                    <button id="modal-close" class="text-textSecondary hover:text-textPrimary transition-colors">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>
                <form id="create-mindmap-form" class="flex flex-col gap-4">
                    <div>
                        <label for="mm-name" class="text-xs text-textSecondary font-mono">NOME DO MAPA</label>
                        <input type="text" id="mm-name" placeholder="Ex: Arquitetura de Software" class="w-full bg-black/30 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent font-mono mt-1">
                    </div>
                    <div>
                        <label for="mm-description" class="text-xs text-textSecondary font-mono">DESCRIÇÃO</label>
                        <textarea id="mm-description" rows="2" placeholder="Descreva o objetivo deste mapa..." class="w-full bg-black/30 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent font-mono mt-1 resize-none"></textarea>
                    </div>
                    <div>
                        <label for="mm-root-article" class="text-xs text-textSecondary font-mono">NOTA RAZ (OPCIONAL)</label>
                        <select id="mm-root-article" class="w-full bg-black/30 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent font-mono mt-1 text-textSecondary">
                            <option value="">Começar em branco</option>
                        </select>
                        <p class="text-[9px] text-textMuted mt-1 font-mono">Selecionar uma nota irá gerar ramificações automáticas baseadas nos backlinks.</p>
                    </div>
                    <button type="submit" class="bg-accent hover:bg-accent-hover text-white text-sm font-mono py-2.5 rounded-xl transition-all mt-2">CRIAR MAPA</button>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        lucide.createIcons({ node: modal });

        api.get('/api/articles').then(articles => {
            const select = modal.querySelector('#mm-root-article');
            if (select && articles) {
                articles.forEach(art => {
                    const opt = document.createElement('option');
                    opt.value = art.id;
                    opt.textContent = art.title;
                    select.appendChild(opt);
                });
            }
        }).catch(() => { });

        const closeBtn = modal.querySelector('#modal-close');
        if (closeBtn) {
            on(closeBtn, 'click', () => modal.remove());
        }

        const form = modal.querySelector('#create-mindmap-form');
        if (form) {
            on(form, 'submit', async (e) => {
                e.preventDefault();
                const name = modal.querySelector('#mm-name').value.trim();
                const description = modal.querySelector('#mm-description').value.trim();
                const rootArticleId = modal.querySelector('#mm-root-article').value || null;

                if (!name) {
                    Toast.warning('Digite um nome para o mapa.');
                    return;
                }

                try {
                    const data = await api.post('/api/mindmaps', { name, description, rootArticleId });
                    if (data) {
                        Toast.success('🗺️ Mapa mental criado!');
                        modal.remove();
                        window.location.hash = `#mindmaps/${data.id}`;
                    }
                } catch (err) {
                    Toast.error('Erro ao criar mapa.');
                }
            });
        }

        on(modal, 'click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    // ============================================
    // MÉTODOS DE ANIMAÇÃO (mantidos do arquivo anterior)
    // ============================================

    animateMindMapExpansion() {
        const nodes = this.globeScene?.getGraphNodes() || [];
        if (nodes.length === 0) return;

        const root = nodes.find(n => n.data.isRoot);
        if (!root) return;

        const sorted = this.sortNodesByDepth(nodes);
        sorted.forEach((node, index) => {
            const delay = index * 150;
            const nodeGroup = this.globeScene.graphGroup.children.find(
                child => child.type === 'Group' && child.userData.id === node.id
            );
            if (nodeGroup) {
                nodeGroup.scale.set(0, 0, 0);
                setTimeout(() => {
                    this.globeScene.animationEngine.animateScale(
                        nodeGroup,
                        new THREE.Vector3(1, 1, 1),
                        400,
                        'easeOutBack'
                    );
                }, delay);
            }
        });
    }

    sortNodesByDepth(nodes) {
        const depths = new Map();
        const visited = new Set();

        const findDepth = (nodeId, depth) => {
            if (visited.has(nodeId)) return;
            visited.add(nodeId);
            depths.set(nodeId, depth);

            const children = nodes.filter(n => {
                return this.globeScene.graphEdges.some(e =>
                    e.source === nodeId && e.target === n.id
                );
            });
            children.forEach(child => {
                findDepth(child.id, depth + 1);
            });
        };

        const root = nodes.find(n => n.data.isRoot);
        if (root) {
            findDepth(root.id, 0);
        }

        return nodes.sort((a, b) => {
            return (depths.get(a.id) || 999) - (depths.get(b.id) || 999);
        });
    }

    animateParentChildConnections() {
        const edges = this.globeScene?.getGraphEdges() || [];
        edges.forEach((edge, index) => {
            const source = this.globeScene.graphGroup.children.find(
                child => child.type === 'Group' && child.userData.id === edge.source
            );
            const target = this.globeScene.graphGroup.children.find(
                child => child.type === 'Group' && child.userData.id === edge.target
            );
            if (source && target && this.globeScene.particleSystem) {
                setTimeout(() => {
                    this.globeScene.particleSystem.createPulsingConnection(
                        source.position,
                        target.position,
                        { color: 0x4b5563, width: 0.02, pulseSpeed: 0.5 + Math.random() * 0.5 }
                    );
                }, index * 100);
            }
        });
    }

    highlightNodeWithRing(nodeId) {
        const nodeGroup = this.globeScene?.graphGroup.children.find(
            child => child.type === 'Group' && child.userData.id === nodeId
        );
        if (!nodeGroup || !this.globeScene.particleSystem) return;

        const pos = nodeGroup.position.clone();
        const ringParticles = this.globeScene.particleSystem.createParticleStream(
            pos.clone().add(new THREE.Vector3(1.5, 0, 0)),
            pos.clone().add(new THREE.Vector3(-1.5, 0, 0)),
            { count: 25, interval: 20, color: 0x8b5cf6, size: 0.04, speed: 0.8 }
        );
        setTimeout(ringParticles, 3000);
    }

    createShootingStarEffect() {
        if (!this.globeScene || !this.globeScene.particleSystem) return;
        const nodes = this.globeScene.getGraphNodes();
        if (nodes.length < 2) return;

        const idx1 = Math.floor(Math.random() * nodes.length);
        let idx2 = Math.floor(Math.random() * nodes.length);
        while (idx2 === idx1) {
            idx2 = Math.floor(Math.random() * nodes.length);
        }

        const node1 = nodes[idx1];
        const node2 = nodes[idx2];
        const startPos = node1.position.clone();
        const endPos = node2.position.clone();

        this.globeScene.particleSystem.createTrail(startPos, endPos, {
            count: 30,
            duration: 1500,
            color: 0xfbbf24,
            size: 0.1
        });
    }

    startShootingStarCycle(interval = 5000) {
        if (this.shootingStarInterval) {
            clearInterval(this.shootingStarInterval);
        }
        this.shootingStarInterval = setInterval(() => {
            this.createShootingStarEffect();
        }, interval);
    }

    stopShootingStarCycle() {
        if (this.shootingStarInterval) {
            clearInterval(this.shootingStarInterval);
            this.shootingStarInterval = null;
        }
    }

    startNodeBreathingEffect() {
        const nodes = this.globeScene?.getGraphNodes() || [];
        nodes.forEach(node => {
            const nodeGroup = this.globeScene.graphGroup.children.find(
                child => child.type === 'Group' && child.userData.id === node.id
            );
            if (nodeGroup) {
                const sphere = nodeGroup.children.find(
                    child => child.type === 'Mesh' && !child.material.wireframe
                );
                if (sphere) {
                    this.globeScene.animationEngine.createPulseAnimation(sphere, {
                        minScale: 0.8,
                        maxScale: 1.2,
                        speed: 0.5 + Math.random() * 0.5,
                        phase: Math.random() * Math.PI * 2
                    });
                }
            }
        });
    }
}