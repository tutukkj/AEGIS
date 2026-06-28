// public/js/components/NodePanel.js

import { html, mount, el, on } from '../utils/dom.js';
import { api } from '../utils/api.js';
import { Toast } from './Toast.js';

export class NodePanel {
    constructor(containerId) {
        this.container = el(`#${containerId}`);
        this.currentNode = null;
        this.isVisible = false;

        // Elementos do painel
        this.elements = {
            title: el('#p-title', this.container),
            desc: el('#p-desc', this.container),
            status: el('#p-status', this.container),
            diff: el('#p-diff', this.container),
            roadmap: el('#p-roadmap', this.container),
            time: el('#p-time', this.container),
            tags: el('#p-tags', this.container),
            connections: el('#p-connections', this.container)
        };

        this.setupEvents();
    }

    setupEvents() {
        // Botão de abrir no editor
        const openBtn = el('#p-open-editor', this.container);
        if (openBtn) {
            on(openBtn, 'click', () => {
                if (this.currentNode) {
                    window.location.hash = `#editor/${this.currentNode.data.slug}`;
                    this.hide();
                }
            });
        }

        // Botão de fechar
        const closeBtn = el('#p-close', this.container);
        if (closeBtn) {
            on(closeBtn, 'click', () => {
                this.hide();
            });
        }

        // Escutar clique fora do painel para fechar
        document.addEventListener('click', (e) => {
            if (this.isVisible && this.container && !this.container.contains(e.target)) {
                // Verificar se o clique não foi em um nó do grafo
                const target = e.target;
                if (!target.closest('#webgl-container')) {
                    this.hide();
                }
            }
        });
    }

    show(node) {
        this.currentNode = node;
        this.isVisible = true;

        this.updateContent(node);
        this.container.classList.add('active');

        // Animar entrada
        this.container.style.opacity = '0';
        requestAnimationFrame(() => {
            this.container.style.opacity = '1';
            this.container.style.transition = 'opacity 0.3s ease';
        });
    }

    hide() {
        this.isVisible = false;
        this.container.classList.remove('active');
        this.currentNode = null;
    }

    updateContent(node) {
        const data = node.data;

        // Título
        if (this.elements.title) {
            this.elements.title.textContent = data.title || node.label || 'NÓ SEM NOME';
        }

        // Descrição
        if (this.elements.desc) {
            this.elements.desc.textContent = data.description || 'Sem descrição disponível.';
        }

        // Status (com ícone e cor)
        if (this.elements.status) {
            const statusMap = {
                'not_started': { label: 'NÃO INICIADO', color: 'text-textMuted' },
                'studying': { label: 'EM ESTUDO', color: 'text-warning' },
                'review': { label: 'EM REVISÃO', color: 'text-info' },
                'completed': { label: 'CONCLUÍDO', color: 'text-success' }
            };
            const status = statusMap[data.status] || statusMap['not_started'];
            this.elements.status.innerHTML = `
                <span class="${status.color}">●</span> ${status.label}
            `;
        }

        // Dificuldade
        if (this.elements.diff) {
            const diffMap = {
                'beginner': { label: 'INICIANTE', color: 'text-success' },
                'intermediate': { label: 'INTERMEDIÁRIO', color: 'text-warning' },
                'advanced': { label: 'AVANÇADO', color: 'text-error' }
            };
            const diff = diffMap[data.difficulty] || diffMap['intermediate'];
            this.elements.diff.innerHTML = `
                <span class="${diff.color}">◆</span> ${diff.label}
            `;
        }

        // Roadmap
        if (this.elements.roadmap) {
            this.elements.roadmap.textContent = data.roadmap || 'GERAL';
        }

        // Tempo estimado
        if (this.elements.time) {
            this.elements.time.textContent = data.estimatedHours ? `${data.estimatedHours}h` : 'N/A';
        }

        // Tags
        if (this.elements.tags) {
            if (data.tags && data.tags.length > 0) {
                this.elements.tags.innerHTML = data.tags.map(tag =>
                    `<span class="text-[9px] px-2 py-0.5 rounded-full border border-border/40 bg-surface/30 text-textMuted font-mono">#${tag}</span>`
                ).join(' ');
            } else {
                this.elements.tags.innerHTML = '<span class="text-[9px] text-textMuted">Sem tags</span>';
            }
        }

        // Conexões
        if (this.elements.connections) {
            // Buscar conexões do nó
            this.loadConnections(node.id);
        }
    }

    async loadConnections(nodeId) {
        if (!this.elements.connections) return;

        try {
            const connections = await api.get(`/api/graph/connections/${nodeId}`);

            if (connections && connections.length > 0) {
                this.elements.connections.innerHTML = connections.map(conn => `
                    <div class="flex items-center justify-between text-[10px] font-mono py-1.5 border-b border-border/20">
                        <span class="text-textSecondary">${conn.type}</span>
                        <a href="#editor/${conn.slug}" class="text-accent hover:underline">${conn.title}</a>
                    </div>
                `).join('');
            } else {
                this.elements.connections.innerHTML = `
                    <span class="text-[10px] text-textMuted">Nenhuma conexão direta</span>
                `;
            }
        } catch (err) {
            console.warn('Erro ao carregar conexões:', err);
            this.elements.connections.innerHTML = `
                <span class="text-[10px] text-textMuted">Conexões não disponíveis</span>
            `;
        }
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            // Se não tem nó selecionado, não faz nada
        }
    }
}