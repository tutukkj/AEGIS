// public/js/components/GraphSearch.js

import { html, mount, el, on } from '../utils/dom.js';
import { api } from '../utils/api.js';
import { Toast } from './Toast.js';

export class GraphSearch {
    constructor(containerId, globeScene) {
        this.container = el(`#${containerId}`);
        this.globeScene = globeScene;
        this.searchResults = [];
        this.selectedIndex = -1;
        this.isActive = false;
        this.searchHistory = [];
        this.maxHistory = 10;

        // Índice de busca
        this.searchIndex = new Map();
        this.buildSearchIndex();
    }

    buildSearchIndex() {
        // Construir índice de busca a partir dos nós do grafo
        const nodes = this.globeScene ? this.globeScene.getGraphNodes() : [];

        nodes.forEach(node => {
            const keywords = [
                node.label || '',
                node.data?.title || '',
                node.data?.description || '',
                node.data?.category || '',
                node.data?.roadmap || '',
                ...(node.data?.tags || [])
            ].join(' ').toLowerCase();

            this.searchIndex.set(node.id, {
                id: node.id,
                label: node.label,
                data: node.data,
                keywords: keywords,
                position: node.position
            });
        });
    }

    render() {
        if (!this.container) return;

        const template = `
            <div class="absolute top-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl z-30">
                <div class="glass rounded-2xl border border-border/60 shadow-2xl overflow-hidden">
                    <!-- Barra de Busca -->
                    <div class="flex items-center gap-3 px-4 py-3 border-b border-border/40">
                        <i data-lucide="search" class="w-4 h-4 text-textMuted"></i>
                        <input 
                            type="text" 
                            id="graph-search-input"
                            placeholder="Buscar nós, categorias, tags..." 
                            class="flex-1 bg-transparent border-none outline-none text-sm font-mono text-textPrimary placeholder:text-textMuted"
                            autofocus
                        >
                        <kbd class="text-[10px] text-textMuted font-mono bg-black/30 px-2 py-1 rounded border border-border/40">ESC</kbd>
                    </div>
                    
                    <!-- Resultados -->
                    <div id="search-results" class="max-h-80 overflow-y-auto p-2 flex flex-col gap-1">
                        <div class="text-center py-8 text-xs text-textMuted font-mono">
                            Digite para buscar nós e conexões
                        </div>
                    </div>
                    
                    <!-- Histórico -->
                    <div id="search-history" class="border-t border-border/40 p-2 flex flex-wrap gap-1.5">
                        ${this.searchHistory.map(term => `
                            <span class="search-history-item text-[10px] text-textSecondary bg-black/20 px-2 py-1 rounded-lg border border-border/20 cursor-pointer hover:border-accent/40 transition-colors">
                                ${term}
                            </span>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        mount(this.container, html(template));
        lucide.createIcons({ node: this.container });

        // Configurar eventos
        this.setupEvents();
    }

    setupEvents() {
        const input = el('#graph-search-input', this.container);
        const results = el('#search-results', this.container);

        if (input) {
            // Busca em tempo real
            on(input, 'input', (e) => {
                const query = e.target.value.trim();
                if (query.length > 0) {
                    this.performSearch(query);
                } else {
                    this.showSuggestions();
                }
            });

            // Navegação por teclado
            on(input, 'keydown', (e) => {
                if (e.key === 'Escape') {
                    this.close();
                    return;
                }

                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.navigateResults(1);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.navigateResults(-1);
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    this.selectCurrentResult();
                }
            });
        }

        // Histórico de busca
        const historyItems = this.container.querySelectorAll('.search-history-item');
        historyItems.forEach(item => {
            on(item, 'click', () => {
                const term = item.textContent;
                if (input) {
                    input.value = term;
                    this.performSearch(term);
                }
            });
        });
    }

    performSearch(query) {
        const results = [];
        const lowerQuery = query.toLowerCase();

        // Buscar no índice
        for (const [id, node] of this.searchIndex) {
            if (node.keywords.includes(lowerQuery)) {
                // Calcular relevância
                let relevance = 0;
                const words = lowerQuery.split(' ');
                words.forEach(word => {
                    if (node.keywords.includes(word)) {
                        relevance += 1;
                    }
                    // Peso extra para match no título
                    if (node.label.toLowerCase().includes(word)) {
                        relevance += 2;
                    }
                });

                results.push({
                    ...node,
                    relevance: relevance,
                    matches: this.getMatches(node.keywords, lowerQuery)
                });
            }
        }

        // Ordenar por relevância
        results.sort((a, b) => b.relevance - a.relevance);

        this.searchResults = results;
        this.selectedIndex = -1;
        this.renderResults(results);

        // Adicionar ao histórico
        if (query.length > 2 && !this.searchHistory.includes(query)) {
            this.searchHistory.unshift(query);
            if (this.searchHistory.length > this.maxHistory) {
                this.searchHistory.pop();
            }
            this.updateHistory();
        }
    }

    getMatches(text, query) {
        const words = query.split(' ');
        const matches = [];
        words.forEach(word => {
            if (text.includes(word)) {
                const index = text.indexOf(word);
                matches.push({
                    word: word,
                    index: index,
                    length: word.length
                });
            }
        });
        return matches;
    }

    renderResults(results) {
        const container = el('#search-results', this.container);
        if (!container) return;

        if (results.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-xs text-textMuted font-mono">
                    <i data-lucide="search" class="w-6 h-6 mx-auto mb-2 text-textMuted"></i>
                    Nenhum resultado encontrado
                </div>
            `;
            lucide.createIcons({ node: container });
            return;
        }

        container.innerHTML = results.map((result, index) => {
            const isSelected = index === this.selectedIndex;
            const selectedClass = isSelected ? 'bg-accent/15 border-accent/30' : 'hover:bg-surface-hover/50';

            // Destacar matches
            let label = result.label;
            result.matches.forEach(match => {
                const before = label.substring(0, match.index);
                const highlighted = `<span class="text-accent font-bold">${match.word}</span>`;
                const after = label.substring(match.index + match.length);
                label = before + highlighted + after;
            });

            const categoryColor = result.data?.category === 'backend' ? 'text-blue-400'
                : result.data?.category === 'ai' ? 'text-purple-400'
                    : result.data?.category === 'math' ? 'text-green-400'
                        : 'text-textMuted';

            return `
                <div class="search-result-item flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${selectedClass}" data-node-id="${result.id}">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-2 h-2 rounded-full" style="background: #${result.data?.color || '8b5cf6'}"></div>
                        <div class="min-w-0">
                            <div class="text-xs font-mono font-semibold text-textPrimary truncate">${label}</div>
                            <div class="text-[10px] text-textMuted truncate">${result.data?.description || 'Sem descrição'}</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                        <span class="text-[9px] px-2 py-0.5 rounded-full border border-border/40 ${categoryColor} font-mono">
                            ${result.data?.category || 'geral'}
                        </span>
                        <span class="text-[9px] text-textMuted font-mono">
                            ${result.relevance} pts
                        </span>
                    </div>
                </div>
            `;
        }).join('');

        lucide.createIcons({ node: container });

        // Eventos de clique nos resultados
        const items = container.querySelectorAll('.search-result-item');
        items.forEach(item => {
            on(item, 'click', () => {
                const nodeId = item.getAttribute('data-node-id');
                this.selectNode(nodeId);
            });

            on(item, 'mouseenter', () => {
                const index = Array.from(items).indexOf(item);
                this.selectedIndex = index;
                this.renderResults(this.searchResults);
            });
        });
    }

    showSuggestions() {
        const container = el('#search-results', this.container);
        if (!container) return;

        // Mostrar sugestões baseadas em tags/categorias populares
        const suggestions = this.getPopularTags();

        if (suggestions.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-xs text-textMuted font-mono">
                    <i data-lucide="lightbulb" class="w-6 h-6 mx-auto mb-2 text-textMuted"></i>
                    Sugestões: tente buscar por <span class="text-accent">backend</span>, <span class="text-accent">ai</span> ou <span class="text-accent">python</span>
                </div>
            `;
            lucide.createIcons({ node: container });
            return;
        }

        container.innerHTML = `
            <div class="px-3 py-2 text-[10px] text-textMuted font-mono uppercase tracking-wider">
                Sugestões populares
            </div>
            <div class="flex flex-wrap gap-2 px-3 pb-3">
                ${suggestions.map(tag => `
                    <span class="suggestion-tag text-xs text-textSecondary bg-black/20 px-3 py-1.5 rounded-lg border border-border/20 cursor-pointer hover:border-accent/40 hover:text-accent transition-all">
                        ${tag}
                    </span>
                `).join('')}
            </div>
        `;

        lucide.createIcons({ node: container });

        // Eventos de clique nas sugestões
        const tags = container.querySelectorAll('.suggestion-tag');
        tags.forEach(tag => {
            on(tag, 'click', () => {
                const input = el('#graph-search-input', this.container);
                if (input) {
                    input.value = tag.textContent;
                    this.performSearch(tag.textContent);
                }
            });
        });
    }

    getPopularTags() {
        const nodes = this.globeScene ? this.globeScene.getGraphNodes() : [];
        const tagCount = new Map();

        nodes.forEach(node => {
            const tags = node.data?.tags || [];
            const category = node.data?.category;
            const roadmap = node.data?.roadmap;

            tags.forEach(tag => {
                tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
            });

            if (category) {
                tagCount.set(category, (tagCount.get(category) || 0) + 1);
            }
            if (roadmap) {
                tagCount.set(roadmap, (tagCount.get(roadmap) || 0) + 0.5);
            }
        });

        // Ordenar por frequência e pegar top 8
        return Array.from(tagCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([tag]) => tag);
    }

    navigateResults(direction) {
        if (this.searchResults.length === 0) return;

        this.selectedIndex = (this.selectedIndex + direction + this.searchResults.length) % this.searchResults.length;
        this.renderResults(this.searchResults);

        // Scroll para o item selecionado
        const container = el('#search-results', this.container);
        if (container) {
            const selected = container.querySelector('.search-result-item.bg-accent\\/15');
            if (selected) {
                selected.scrollIntoView({ block: 'nearest' });
            }
        }
    }

    selectCurrentResult() {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.searchResults.length) {
            const result = this.searchResults[this.selectedIndex];
            this.selectNode(result.id);
        }
    }

    selectNode(nodeId) {
        if (this.globeScene) {
            // Encontrar o nó no grafo
            const nodes = this.globeScene.getGraphNodes();
            const node = nodes.find(n => n.id === nodeId);

            if (node) {
                // Destacar e focar no nó
                this.globeScene.highlightNodeWithAnimation(nodeId);

                // Navegar até o nó
                const nodeGroup = this.globeScene.graphGroup.children.find(
                    child => child.type === 'Group' && child.userData.id === nodeId
                );

                if (nodeGroup) {
                    const pos = nodeGroup.position.clone();
                    // Calcular posição da câmera para focar no nó
                    const camPos = pos.clone().add(new THREE.Vector3(3, 2, 5));
                    this.globeScene.animationEngine.animatePosition(
                        this.globeScene.camera,
                        camPos,
                        800,
                        'easeOutCubic'
                    );

                    // Atualizar alvo
                    const target = pos.clone();
                    this.globeScene.animationEngine.animatePosition(
                        this.globeScene.controls.target,
                        target,
                        800,
                        'easeOutCubic'
                    );
                }

                // Abrir painel do nó
                if (this.globeScene.nodePanel) {
                    this.globeScene.nodePanel.show(node);
                }

                this.close();
                Toast.info(`🎯 Navegando para: ${node.label}`);
            }
        }
    }

    updateHistory() {
        const container = el('#search-history', this.container);
        if (!container) return;

        container.innerHTML = this.searchHistory.map(term => `
            <span class="search-history-item text-[10px] text-textSecondary bg-black/20 px-2 py-1 rounded-lg border border-border/20 cursor-pointer hover:border-accent/40 transition-colors">
                ${term}
            </span>
        `).join('');

        // Reativar eventos
        const items = container.querySelectorAll('.search-history-item');
        items.forEach(item => {
            on(item, 'click', () => {
                const input = el('#graph-search-input', this.container);
                if (input) {
                    input.value = item.textContent;
                    this.performSearch(item.textContent);
                }
            });
        });
    }

    open() {
        this.isActive = true;
        this.render();

        const input = el('#graph-search-input', this.container);
        if (input) {
            setTimeout(() => input.focus(), 100);
        }

        // Reconstruir índice
        this.buildSearchIndex();
    }

    close() {
        this.isActive = false;
        if (this.container) {
            this.container.innerHTML = '';
        }
    }

    toggle() {
        if (this.isActive) {
            this.close();
        } else {
            this.open();
        }
    }
}