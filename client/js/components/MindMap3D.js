// public/js/components/MindMap3D.js - Versão Cosmos Corrigida

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

    // ==========================================
    // LISTA DE MAPAS MENTAIS
    // ==========================================

    async renderList() {
        try {
            const mindmaps = await api.get('/api/mindmaps');

            if (!mindmaps || mindmaps.length === 0) {
                this.renderEmptyList();
                return;
            }

            const template = `
                <div class="h-full flex flex-col p-6 animate-fade-in">
                    <div class="flex items-center justify-between mb-6 border-b border-border/40 pb-4">
                        <div>
                            <h1 class="text-lg font-mono font-bold tracking-wider flex items-center gap-3">
                                <span class="text-accent">✦</span>
                                <span>MAPAS MENTAIS</span>
                            </h1>
                            <p class="text-[10px] text-textMuted font-mono">
                                ${mindmaps.length} CONSTELAÇÕES · CLIQUE PARA EXPLORAR
                            </p>
                        </div>
                        <button id="btn-new-mindmap" 
                            class="border border-accent text-accent hover:bg-accent hover:text-bg px-4 py-2 text-[10px] font-mono transition-all duration-300">
                            + NOVO MAPA
                        </button>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1 overflow-y-auto pb-4">
                        ${mindmaps.map(mm => `
                            <div class="border border-border/40 p-6 cursor-pointer transition-all duration-300 hover:border-accent/50 group" 
                                 data-mindmap-id="${mm.id}">
                                <div class="flex items-start justify-between mb-4">
                                    <div class="flex items-center gap-3">
                                        <div class="w-10 h-10 border border-accent/20 flex items-center justify-center text-accent">
                                            <span class="text-lg">◈</span>
                                        </div>
                                        <div>
                                            <h3 class="font-mono font-bold text-sm group-hover:text-accent transition-colors">
                                                ${mm.name}
                                            </h3>
                                            <p class="text-[9px] text-textMuted font-mono">${mm.node_count || 0} NÓS</p>
                                        </div>
                                    </div>
                                    <button class="btn-delete-mindmap opacity-0 group-hover:opacity-100 text-textMuted hover:text-error transition-all" 
                                            data-mindmap-id="${mm.id}">
                                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                                    </button>
                                </div>
                                <p class="text-[10px] text-textSecondary font-mono line-clamp-2">${mm.description || 'Sem descrição'}</p>
                                <div class="mt-4 flex items-center justify-between text-[9px] text-textMuted font-mono border-t border-border/40 pt-3">
                                    <span>ATUALIZADO: ${new Date(mm.updated_at).toLocaleDateString('pt-BR')}</span>
                                    <span class="text-accent">${mm.root_article_title || 'EM BRANCO'}</span>
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

    // ==========================================
    // DETALHE DO MAPA MENTAL (VISUALIZAÇÃO 3D)
    // ==========================================

    renderDetail(data) {
        if (!this.container || !data) return;

        const template = `
            <div class="h-full flex flex-col animate-fade-in">
                <!-- Barra Superior -->
                <div class="flex items-center justify-between p-4 border-b border-border/40 flex-shrink-0">
                    <div class="flex items-center gap-4">
                        <a href="#mindmaps" class="text-textMuted hover:text-textPrimary transition-colors font-mono text-xs">
                            ← VOLTAR
                        </a>
                        <div>
                            <h1 class="text-sm font-mono font-bold tracking-wider flex items-center gap-2">
                                <span class="text-accent">✦</span>
                                ${data.name}
                            </h1>
                            <p class="text-[9px] text-textMuted font-mono">${data.description || 'Constelação de conhecimento'}</p>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-2">
                        <button id="btn-layout-tree" class="border border-border/40 px-3 py-1.5 text-[9px] font-mono hover:border-accent/50 hover:text-accent transition-all">
                            ÁRVORE
                        </button>
                        <button id="btn-layout-radial" class="border border-border/40 px-3 py-1.5 text-[9px] font-mono hover:border-accent/50 hover:text-accent transition-all">
                            RADIAL
                        </button>
                        <button id="btn-layout-force" class="border border-border/40 px-3 py-1.5 text-[9px] font-mono hover:border-accent/50 hover:text-accent transition-all">
                            FORÇA
                        </button>
                        <span class="w-px h-6 bg-border/40 mx-1"></span>
                        <button id="btn-reset-view" class="border border-border/40 px-3 py-1.5 text-[9px] font-mono hover:border-accent/50 hover:text-accent transition-all">
                            RESET
                        </button>
                        <button id="btn-edit-mindmap" class="border border-accent/40 text-accent px-3 py-1.5 text-[9px] font-mono hover:bg-accent hover:text-bg transition-all">
                            EDITAR
                        </button>
                        <button id="btn-save-mindmap" class="bg-accent text-bg px-4 py-1.5 text-[9px] font-mono hover:bg-accent/80 transition-all">
                            SALVAR
                        </button>
                    </div>
                </div>
                
                <!-- Container 3D -->
                <div id="mindmap-3d-container" class="flex-1 relative overflow-hidden">
                    <div id="mindmap-instructions" class="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 border border-border/40 px-6 py-2 text-center pointer-events-none bg-bg/80 backdrop-blur-sm">
                        <span class="text-[9px] font-mono text-textSecondary">
                            CLIQUE NOS NÓS · 
                            ARRASTE PARA ORBITAR · 
                            SCROLL PARA ZOOM
                        </span>
                    </div>
                    <div id="mindmap-loading" class="absolute inset-0 flex items-center justify-center bg-bg/80 z-10 transition-opacity duration-300">
                        <div class="flex flex-col items-center gap-3">
                            <div class="w-6 h-6 border border-accent border-t-transparent rounded-full animate-spin"></div>
                            <span class="text-[9px] text-textMuted font-mono">GERANDO CONSTELAÇÃO...</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        mount(this.container, html(template));
        lucide.createIcons({ node: this.container });

        this.connectToGlobeScene(data);
        this.setupControls();
    }

    // ==========================================
    // INTEGRAÇÃO COM O GLOBESCENE
    // ==========================================

    connectToGlobeScene(data) {
        // Verificar se o GlobeScene já existe
        if (window.globeScene) {
            this.globeScene = window.globeScene;
            const processedData = this.processMindMapData(data);

            // Adicionar nós ao grafo
            this.globeScene.addGraphNodes(processedData.nodes, processedData.edges);

            // Configurar callbacks
            this.globeScene.onNodeSelected = (nodeData) => {
                this.selectedNode = nodeData;
                this.showNodeInfo(nodeData);
            };

            this.globeScene.onNodeDeselected = () => {
                this.selectedNode = null;
                this.hideNodeInfo();
            };

            // Esconder loading
            const loadingEl = el('#mindmap-loading', this.container);
            if (loadingEl) {
                loadingEl.classList.add('opacity-0', 'pointer-events-none');
                setTimeout(() => loadingEl.remove(), 500);
            }

            // Esconder instruções após alguns segundos
            setTimeout(() => {
                const instructions = el('#mindmap-instructions', this.container);
                if (instructions) {
                    instructions.style.opacity = '0';
                    setTimeout(() => instructions.remove(), 500);
                }
            }, 5000);

        } else {
            // Tentar novamente após delay
            setTimeout(() => this.connectToGlobeScene(data), 500);
        }
    }

    // ==========================================
    // PROCESSAMENTO DE DADOS DO MAPA MENTAL (CORRIGIDO)
    // ==========================================

    processMindMapData(data) {
        // Garantir que tree_data existe
        const treeData = data.tree_data || { nodes: [], edges: [] };
        const nodes = [];
        const edges = [];

        // Cores para diferentes níveis (módulos vs tópicos)
        const levelColors = [
            0x5EEAD4, // Nível 0 - Módulo (Ciano)
            0x60A5FA, // Nível 1 - Azul
            0x34D399, // Nível 2 - Verde
            0xFBBF24, // Nível 3 - Amarelo
            0xF472B6, // Nível 4 - Rosa
            0xFB923C  // Nível 5 - Laranja
        ];

        // Gerador de IDs únicos
        let idCounter = 0;
        const generateId = () => {
            return `node-${Date.now()}-${idCounter++}`;
        };

        const processNode = (node, level = 0, parentId = null) => {
            // Garantir que o nó tem um ID
            const nodeId = node.id || node.data?.id || generateId();
            const color = levelColors[Math.min(level, levelColors.length - 1)];
            const isRoot = level === 0;

            // Gerar posição baseada no nível
            const pos = node.position || this.generateNodePosition(level, nodeId);

            nodes.push({
                id: nodeId,
                label: node.label || node.data?.label || 'Nó',
                color: color,
                position: pos,
                data: {
                    slug: node.slug || node.data?.slug || null,
                    title: node.label || node.data?.label || 'Nó sem título',
                    description: node.description || node.data?.description || '',
                    level: level,
                    isRoot: isRoot,
                    category: isRoot ? 'module' : 'topic'
                }
            });

            if (parentId) {
                edges.push({
                    source: parentId,
                    target: nodeId
                });
            }

            // Processar filhos
            const children = node.children || [];
            if (children.length > 0) {
                children.forEach(child => {
                    processNode(child, level + 1, nodeId);
                });
            }
        };

        // Encontrar nó raiz
        const rootNode = treeData.nodes?.find(n => n.data?.isRoot) || treeData.nodes?.[0];

        if (rootNode) {
            processNode(rootNode, 0);
        } else if (treeData.nodes && treeData.nodes.length > 0) {
            // Se não houver raiz definida, usar o primeiro nó como raiz
            processNode(treeData.nodes[0], 0);
        } else {
            // Se não houver nós, criar um nó raiz padrão
            const defaultRoot = {
                id: generateId(),
                label: data.name || 'Mapa Mental',
                data: { isRoot: true }
            };
            processNode(defaultRoot, 0);
        }

        // Adicionar arestas existentes (se houver)
        if (treeData.edges && Array.isArray(treeData.edges)) {
            treeData.edges.forEach(edge => {
                const source = edge.data?.source || edge.source;
                const target = edge.data?.target || edge.target;
                if (source && target) {
                    if (!edges.some(e => e.source === source && e.target === target)) {
                        edges.push({ source, target });
                    }
                }
            });
        }

        return { nodes, edges };
    }

    // ==========================================
    // GERADOR DE POSIÇÃO (CORRIGIDO)
    // ==========================================

    generateNodePosition(level, id) {
        // Layout em árvore expansiva
        const radius = 3 + level * 2.5;

        // Gerar ângulo baseado no ID de forma consistente
        let hash = 0;
        if (id) {
            const idStr = String(id);
            for (let i = 0; i < idStr.length; i++) {
                hash = ((hash << 5) - hash) + idStr.charCodeAt(i);
                hash = hash & hash;
            }
        } else {
            hash = Math.random() * 1000;
        }

        const angle = (Math.abs(hash) / 1000) * Math.PI * 2;
        const spread = 0.6 + level * 0.2;

        return {
            x: radius * Math.cos(angle + level * 0.5) * spread,
            y: (Math.random() - 0.5) * 1.5,
            z: radius * Math.sin(angle + level * 0.5) * spread
        };
    }

    // ==========================================
    // PAINEL DE INFORMAÇÕES DO NÓ
    // ==========================================

    showNodeInfo(nodeData) {
        const panel = document.getElementById('node-panel');
        if (!panel) return;

        const data = nodeData.data || {};

        document.getElementById('p-title').textContent = data.title || nodeData.label || 'NÓ';
        document.getElementById('p-desc').textContent = data.description || 'Sem descrição disponível.';
        document.getElementById('p-status').textContent = data.status || 'NÃO INICIADO';
        document.getElementById('p-diff').textContent = data.difficulty || 'INTERMEDIÁRIO';
        document.getElementById('p-roadmap').textContent = data.roadmap || 'GERAL';
        document.getElementById('p-time').textContent = data.estimatedHours ? `${data.estimatedHours}h` : 'N/A';

        // Tags
        const tagsContainer = document.getElementById('p-tags');
        if (tagsContainer && data.tags) {
            tagsContainer.innerHTML = data.tags.map(tag =>
                `<span class="border border-border/40 px-2 py-0.5 text-[9px] font-mono text-textSecondary">#${tag}</span>`
            ).join('') || '<span class="text-[9px] text-textMuted font-mono">SEM TAGS</span>';
        }

        // Conexões
        const connectionsContainer = document.getElementById('p-connections');
        if (connectionsContainer && this.globeScene) {
            const connections = this.globeScene.getGraphEdges()
                .filter(e => e.source === nodeData.id || e.target === nodeData.id);

            if (connections.length > 0) {
                connectionsContainer.innerHTML = connections.map(conn => {
                    const otherId = conn.source === nodeData.id ? conn.target : conn.source;
                    const otherNode = this.globeScene.getGraphNodes().find(n => n.id === otherId);
                    return `<div class="flex items-center justify-between text-[9px] font-mono py-1 border-b border-border/20">
                        <span class="text-textMuted">→</span>
                        <span class="text-textSecondary">${otherNode?.label || otherId}</span>
                    </div>`;
                }).join('');
            } else {
                connectionsContainer.innerHTML = '<span class="text-[9px] text-textMuted font-mono">NENHUMA CONEXÃO</span>';
            }
        }

        panel.classList.add('active');
    }

    hideNodeInfo() {
        const panel = document.getElementById('node-panel');
        if (panel) {
            panel.classList.remove('active');
        }
    }

    // ==========================================
    // CONTROLES
    // ==========================================

    setupControls() {
        const layouts = ['tree', 'radial', 'force'];
        layouts.forEach(type => {
            const btn = el(`#btn-layout-${type}`, this.container);
            if (btn) {
                on(btn, 'click', () => {
                    if (this.globeScene && this.globeScene.applyLayout) {
                        this.globeScene.applyLayout(type);
                        Toast.info(`🔄 Layout ${type.toUpperCase()}`);
                    }
                });
            }
        });

        const resetBtn = el('#btn-reset-view', this.container);
        if (resetBtn) {
            on(resetBtn, 'click', () => {
                if (this.globeScene) {
                    this.globeScene.resetCamera();
                    this.globeScene.deselectNode();
                    Toast.info('⌖ Câmera resetada');
                }
            });
        }

        const editBtn = el('#btn-edit-mindmap', this.container);
        if (editBtn) {
            on(editBtn, 'click', () => {
                this.isEditing = !this.isEditing;
                editBtn.classList.toggle('bg-accent/20');
                editBtn.textContent = this.isEditing ? '✎ EDITANDO' : '✎ EDITAR';
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

    // ==========================================
    // SALVAR MAPA MENTAL
    // ==========================================

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
                        isRoot: n.data?.isRoot || false,
                        slug: n.data?.slug || null
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

    // ==========================================
    // MODAL DE CRIAÇÃO
    // ==========================================

    showCreateModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50';
        modal.innerHTML = `
            <div class="border border-border/60 bg-bg p-6 w-full max-w-md">
                <div class="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
                    <h3 class="font-mono font-bold text-sm tracking-wider">✦ NOVA CONSTELAÇÃO</h3>
                    <button id="modal-close" class="text-textMuted hover:text-textPrimary transition-colors">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>
                <form id="create-mindmap-form" class="flex flex-col gap-4">
                    <div>
                        <label class="text-[9px] text-textMuted font-mono uppercase tracking-wider">NOME</label>
                        <input type="text" id="mm-name" placeholder="Ex: Arquitetura de Software" 
                               class="w-full bg-black/40 border border-border/40 px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-accent/50 mt-1">
                    </div>
                    <div>
                        <label class="text-[9px] text-textMuted font-mono uppercase tracking-wider">DESCRIÇÃO</label>
                        <textarea id="mm-description" rows="2" placeholder="Descreva o objetivo..." 
                                  class="w-full bg-black/40 border border-border/40 px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-accent/50 mt-1 resize-none"></textarea>
                    </div>
                    <div>
                        <label class="text-[9px] text-textMuted font-mono uppercase tracking-wider">NOTA RAÍZ</label>
                        <select id="mm-root-article" class="w-full bg-black/40 border border-border/40 px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-accent/50 mt-1 text-textSecondary">
                            <option value="">COMEÇAR EM BRANCO</option>
                        </select>
                    </div>
                    <button type="submit" class="bg-accent text-bg py-2.5 font-mono text-sm hover:bg-accent/80 transition-all mt-2">
                        CRIAR CONSTELAÇÃO
                    </button>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        lucide.createIcons({ node: modal });

        // Carregar artigos para o select
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

        // Eventos
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
                        Toast.success('🗺️ Constelação criada!');
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

    // ==========================================
    // ESTADOS VAZIOS E ERRO
    // ==========================================

    renderEmptyList() {
        if (!this.container) return;
        const template = `
            <div class="h-full flex flex-col items-center justify-center p-8 text-center">
                <div class="text-6xl text-accent/30 mb-6">✦</div>
                <h2 class="text-lg font-mono font-bold tracking-wider mb-2">NENHUMA CONSTELAÇÃO</h2>
                <p class="text-sm text-textSecondary font-mono max-w-md">Crie mapas mentais para visualizar suas ideias e conexões.</p>
                <button id="btn-create-first" class="mt-6 border border-accent text-accent hover:bg-accent hover:text-bg px-6 py-2 font-mono text-sm transition-all">
                    + CRIAR PRIMEIRO MAPA
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
                <div class="text-6xl text-error/30 mb-6">⚠</div>
                <h2 class="text-lg font-mono font-bold tracking-wider mb-2">ERRO AO CARREGAR</h2>
                <p class="text-sm text-textSecondary font-mono max-w-md">Não foi possível carregar a constelação.</p>
                <button id="retry-mindmap" class="mt-6 text-accent hover:underline font-mono text-sm">↻ TENTAR NOVAMENTE</button>
            </div>
        `;
        mount(this.container, html(template));
        lucide.createIcons({ node: this.container });

        const retryBtn = el('#retry-mindmap', this.container);
        if (retryBtn) {
            on(retryBtn, 'click', () => this.loadAndRender(this.mindmapId));
        }
    }
}