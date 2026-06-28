// public/js/components/StateManager.js

export class StateManager {
    constructor() {
        this.prefix = 'aegis_';
        this.state = {
            graphLayout: 'force',
            mindmapLayout: 'tree',
            showLabels: true,
            lastView: 'dashboard',
            filters: {
                categories: [],
                difficulty: [],
                status: []
            },
            searchHistory: [],
            nodePositions: {},
            cameraPosition: null,
            cameraTarget: null
        };

        this.loadState();
    }

    loadState() {
        try {
            const saved = localStorage.getItem(`${this.prefix}state`);
            if (saved) {
                const parsed = JSON.parse(saved);
                this.state = { ...this.state, ...parsed };
            }
        } catch (err) {
            console.warn('Erro ao carregar estado:', err);
        }
    }

    saveState() {
        try {
            localStorage.setItem(`${this.prefix}state`, JSON.stringify(this.state));
        } catch (err) {
            console.warn('Erro ao salvar estado:', err);
        }
    }

    get(key) {
        return this.state[key];
    }

    set(key, value) {
        this.state[key] = value;
        this.saveState();
    }

    // Métodos específicos para o grafo
    saveGraphLayout(layout) {
        this.set('graphLayout', layout);
    }

    getGraphLayout() {
        return this.get('graphLayout') || 'force';
    }

    // Métodos específicos para mapas mentais
    saveMindmapLayout(layout) {
        this.set('mindmapLayout', layout);
    }

    getMindmapLayout() {
        return this.get('mindmapLayout') || 'tree';
    }

    // Salvar posições dos nós
    saveNodePositions(nodes) {
        const positions = {};
        nodes.forEach(node => {
            positions[node.id] = {
                x: node.position.x,
                y: node.position.y,
                z: node.position.z
            };
        });
        this.set('nodePositions', positions);
    }

    getNodePositions() {
        return this.get('nodePositions') || {};
    }

    // Salvar posição da câmera
    saveCameraPosition(position, target) {
        this.set('cameraPosition', {
            x: position.x,
            y: position.y,
            z: position.z
        });
        this.set('cameraTarget', {
            x: target.x,
            y: target.y,
            z: target.z
        });
    }

    getCameraPosition() {
        return this.get('cameraPosition');
    }

    getCameraTarget() {
        return this.get('cameraTarget');
    }

    // Salvar filtros
    saveFilters(filters) {
        this.set('filters', filters);
    }

    getFilters() {
        return this.get('filters') || { categories: [], difficulty: [], status: [] };
    }

    // Salvar histórico de busca
    addSearchTerm(term) {
        const history = this.get('searchHistory') || [];
        if (!history.includes(term)) {
            history.unshift(term);
            if (history.length > 10) history.pop();
            this.set('searchHistory', history);
        }
    }

    getSearchHistory() {
        return this.get('searchHistory') || [];
    }

    // Limpar todo o estado
    clearState() {
        try {
            localStorage.removeItem(`${this.prefix}state`);
            this.state = {};
            this.loadState();
        } catch (err) {
            console.warn('Erro ao limpar estado:', err);
        }
    }

    // Exportar estado para backup
    exportState() {
        return JSON.stringify(this.state, null, 2);
    }

    // Importar estado de backup
    importState(json) {
        try {
            const parsed = JSON.parse(json);
            this.state = { ...this.state, ...parsed };
            this.saveState();
            return true;
        } catch (err) {
            console.warn('Erro ao importar estado:', err);
            return false;
        }
    }
}