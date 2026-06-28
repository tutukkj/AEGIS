// public/js/components/GraphFilter.js

import { html, mount, el, on } from '../utils/dom.js';
import { Toast } from './Toast.js';

export class GraphFilter {
    constructor(containerId, globeScene) {
        this.container = el(`#${containerId}`);
        this.globeScene = globeScene;
        this.filters = {
            categories: new Set(),
            tags: new Set(),
            difficulty: new Set(),
            status: new Set(),
            searchQuery: '',
            showIsolated: true,
            minConnections: 0
        };

        this.filteredNodes = new Set();
        this.isActive = false;
    }

    render() {
        if (!this.container) return;

        // Coletar estatísticas para os filtros
        const stats = this.getFilterStats();

        const template = `
            <div class="glass rounded-2xl border border-border/60 p-4 shadow-2xl">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-2">
                        <i data-lucide="sliders" class="w-4 h-4 text-accent"></i>
                        <span class="text-sm font-mono font-bold">FILTROS</span>
                        <span class="text-[10px] text-textMuted font-mono">(${stats.totalNodes} nós)</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <button id="clear-filters" class="text-[10px] text-textMuted hover:text-textPrimary transition-colors font-mono">
                            LIMPAR
                        </button>
                        <button id="apply-filters" class="bg-accent hover:bg-accent-hover text-white text-[10px] font-mono px-3 py-1 rounded-lg transition-all">
                            APLICAR
                        </button>
                    </div>
                </div>
                
                <!-- Filtro por Categoria -->
                <div class="mb-3">
                    <div class="text-[10px] text-textMuted font-mono uppercase tracking-wider mb-1.5">Categorias</div>
                    <div class="flex flex-wrap gap-1.5">
                        ${Object.entries(stats.categories).map(([cat, count]) => `
                            <label class="filter-chip flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg border border-border/40 cursor-pointer transition-all hover:border-accent/40 ${this.filters.categories.has(cat) ? 'bg-accent/15 border-accent/40' : ''}">
                                <input type="checkbox" value="${cat}" ${this.filters.categories.has(cat) ? 'checked' : ''} class="hidden filter-checkbox" data-type="category">
                                <span>${cat}</span>
                                <span class="text-[8px] text-textMuted">(${count})</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Filtro por Dificuldade -->
                <div class="mb-3">
                    <div class="text-[10px] text-textMuted font-mono uppercase tracking-wider mb-1.5">Dificuldade</div>
                    <div class="flex flex-wrap gap-1.5">
                        ${['beginner', 'intermediate', 'advanced'].map(diff => {
            const count = stats.difficulty[diff] || 0;
            const label = diff === 'beginner' ? 'Iniciante' : diff === 'intermediate' ? 'Intermediário' : 'Avançado';
            return `
                                <label class="filter-chip flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg border border-border/40 cursor-pointer transition-all hover:border-accent/40 ${this.filters.difficulty.has(diff) ? 'bg-accent/15 border-accent/40' : ''}">
                                    <input type="checkbox" value="${diff}" ${this.filters.difficulty.has(diff) ? 'checked' : ''} class="hidden filter-checkbox" data-type="difficulty">
                                    <span>${label}</span>
                                    <span class="text-[8px] text-textMuted">(${count})</span>
                                </label>
                            `;
        })}
                    </div>
                </div>
                
                <!-- Filtro por Status -->
                <div class="mb-3">
                    <div class="text-[10px] text-textMuted font-mono uppercase tracking-wider mb-1.5">Status</div>
                    <div class="flex flex-wrap gap-1.5">
                        ${['not_started', 'studying', 'review', 'completed'].map(status => {
            const count = stats.status[status] || 0;
            const label = status === 'not_started' ? 'Não Iniciado'
                : status === 'studying' ? 'Estudando'
                    : status === 'review' ? 'Revisão'
                        : 'Concluído';
            return `
                                <label class="filter-chip flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg border border-border/40 cursor-pointer transition-all hover:border-accent/40 ${this.filters.status.has(status) ? 'bg-accent/15 border-accent/40' : ''}">
                                    <input type="checkbox" value="${status}" ${this.filters.status.has(status) ? 'checked' : ''} class="hidden filter-checkbox" data-type="status">
                                    <span>${label}</span>
                                    <span class="text-[8px] text-textMuted">(${count})</span>
                                </label>
                            `;
        })}
                    </div>
                </div>
                
                <!-- Filtro por Conexões -->
                <div class="mb-3">
                    <div class="text-[10px] text-textMuted font-mono uppercase tracking-wider mb-1.5">Conexões Mínimas</div>
                    <div class="flex items-center gap-3">
                        <input 
                            type="range" 
                            id="min-connections" 
                            min="0" 
                            max="5" 
                            value="${this.filters.minConnections}"
                            class="flex-1 accent-accent bg-black/40 h-1.5 rounded-lg border border-border/20 appearance-none cursor-pointer"
                        >
                        <span id="connections-value" class="text-xs font-mono text-textPrimary min-w-[20px] text-center">
                            ${this.filters.minConnections}
                        </span>
                    </div>
                </div>
                
                <!-- Filtro de Nós Isolados -->
                <div class="flex items-center gap-2">
                    <input 
                        type="checkbox" 
                        id="show-isolated" 
                        ${this.filters.showIsolated ? 'checked' : ''}
                        class="accent-accent"
                    >
                    <label for="show-isolated" class="text-[10px] text-textMuted font-mono cursor-pointer">
                        Mostrar nós isolados
                    </label>
                </div>
            </div>
        `;

        mount(this.container, html(template));
        lucide.createIcons({ node: this.container });

        this.setupEvents();
    }

    setupEvents() {
        // Checkboxes de filtro
        const checkboxes = this.container.querySelectorAll('.filter-checkbox');
        checkboxes.forEach(cb => {
            on(cb, 'change', (e) => {
                const type = cb.getAttribute('data-type');
                const value = cb.value;

                if (cb.checked) {
                    this.filters[type].add(value);
                } else {
                    this.filters[type].delete(value);
                }
            });
        });

        // Slider de conexões
        const slider = el('#min-connections', this.container);
        const valueDisplay = el('#connections-value', this.container);
        if (slider && valueDisplay) {
            on(slider, 'input', (e) => {
                this.filters.minConnections = parseInt(e.target.value);
                valueDisplay.textContent = this.filters.minConnections;
            });
        }

        // Mostrar isolados
        const isolatedCheck = el('#show-isolated', this.container);
        if (isolatedCheck) {
            on(isolatedCheck, 'change', (e) => {
                this.filters.showIsolated = e.target.checked;
            });
        }

        // Limpar filtros
        const clearBtn = el('#clear-filters', this.container);
        if (clearBtn) {
            on(clearBtn, 'click', () => {
                this.filters.categories.clear();
                this.filters.tags.clear();
                this.filters.difficulty.clear();
                this.filters.status.clear();
                this.filters.minConnections = 0;
                this.filters.showIsolated = true;

                // Resetar UI
                const checkboxes = this.container.querySelectorAll('.filter-checkbox');
                checkboxes.forEach(cb => cb.checked = false);

                const slider = el('#min-connections', this.container);
                if (slider) {
                    slider.value = '0';
                    const display = el('#connections-value', this.container);
                    if (display) display.textContent = '0';
                }

                const isolated = el('#show-isolated', this.container);
                if (isolated) isolated.checked = true;
            });
        }

        // Aplicar filtros
        const applyBtn = el('#apply-filters', this.container);
        if (applyBtn) {
            on(applyBtn, 'click', () => {
                this.applyFilters();
                Toast.info('🔍 Filtros aplicados');
            });
        }
    }

    getFilterStats() {
        const nodes = this.globeScene ? this.globeScene.getGraphNodes() : [];
        const stats = {
            totalNodes: nodes.length,
            categories: {},
            tags: {},
            difficulty: {},
            status: {}
        };

        nodes.forEach(node => {
            const data = node.data || {};

            // Categorias
            const cat = data.category || 'outros';
            stats.categories[cat] = (stats.categories[cat] || 0) + 1;

            // Dificuldade
            const diff = data.difficulty || 'intermediate';
            stats.difficulty[diff] = (stats.difficulty[diff] || 0) + 1;

            // Status
            const status = data.status || 'not_started';
            stats.status[status] = (stats.status[status] || 0) + 1;

            // Tags
            if (data.tags) {
                data.tags.forEach(tag => {
                    stats.tags[tag] = (stats.tags[tag] || 0) + 1;
                });
            }
        });

        return stats;
    }

    applyFilters() {
        if (!this.globeScene) return;

        const nodes = this.globeScene.getGraphNodes();
        const edges = this.globeScene.getGraphEdges();

        // Calcular conexões por nó
        const connections = new Map();
        edges.forEach(edge => {
            connections.set(edge.source, (connections.get(edge.source) || 0) + 1);
            connections.set(edge.target, (connections.get(edge.target) || 0) + 1);
        });

        // Filtrar nós
        const filteredIds = new Set();

        nodes.forEach(node => {
            const data = node.data || {};
            let include = true;

            // Filtro por categoria
            if (this.filters.categories.size > 0) {
                const cat = data.category || 'outros';
                if (!this.filters.categories.has(cat)) include = false;
            }

            // Filtro por dificuldade
            if (this.filters.difficulty.size > 0) {
                const diff = data.difficulty || 'intermediate';
                if (!this.filters.difficulty.has(diff)) include = false;
            }

            // Filtro por status
            if (this.filters.status.size > 0) {
                const status = data.status || 'not_started';
                if (!this.filters.status.has(status)) include = false;
            }

            // Filtro por conexões mínimas
            const connCount = connections.get(node.id) || 0;
            if (connCount < this.filters.minConnections) include = false;

            // Nós isolados
            if (!this.filters.showIsolated && connCount === 0) include = false;

            if (include) {
                filteredIds.add(node.id);
            }
        });

        // Aplicar filtro visual
        this.globeScene.applyNodeFilter(filteredIds);

        // Atualizar contagem
        const filteredCount = filteredIds.size;
        Toast.info(`🔍 ${filteredCount} de ${nodes.length} nós visíveis`);

        // Atualizar contador na UI
        const stats = this.getFilterStats();
        const totalEl = this.container.querySelector('.text-textMuted.font-mono');
        if (totalEl) {
            totalEl.textContent = `(${filteredCount} / ${stats.totalNodes} nós)`;
        }
    }

    toggle() {
        this.isActive = !this.isActive;
        if (this.isActive) {
            this.render();
        } else if (this.container) {
            this.container.innerHTML = '';
        }
    }
}