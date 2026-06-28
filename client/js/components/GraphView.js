import { html, mount, el, on } from '../utils/dom.js';
import { api } from '../utils/api.js';
import { Toast } from './Toast.js';

export class GraphView {
  constructor(containerId) {
    this.container = el(`#${containerId}`);
    this.cy = null;
  }

  async loadAndRender() {
    try {
      // 1. Renders the layout container
      const template = `
        <div class="h-full flex flex-col p-6 animate-fade-in relative">
          <!-- Cabeçalho -->
          <div class="flex items-center justify-between mb-4 z-10">
            <div>
              <h1 class="text-xl font-bold">Grafo de Conhecimento</h1>
              <p class="text-xs text-textSecondary">Visualização interativa das relações e backlinks entre suas notas.</p>
            </div>
            
            <button id="btn-re-layout" class="bg-black/40 hover:bg-surface-hover border border-border text-textPrimary text-xs font-semibold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-md">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
              <span>Reorganizar</span>
            </button>
          </div>

          <!-- Div do Container do Grafo -->
          <div id="cy-container" class="flex-1 rounded-2xl border border-border bg-black/40 relative overflow-hidden" style="height: 500px;">
            <!-- Indicador de Carregamento -->
            <div id="graph-loading" class="absolute inset-0 flex items-center justify-center bg-bg/80 z-10 transition-opacity duration-300">
              <div class="flex flex-col items-center gap-3">
                <div class="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                <span class="text-xs text-textSecondary font-medium">Carregando relações do grafo...</span>
              </div>
            </div>
          </div>
        </div>
      `;

      mount(this.container, html(template));
      lucide.createIcons({ node: this.container });

      // 2. Buscar dados do grafo
      const graphData = await api.get('/api/graph');

      // Ocultar loading
      const loadingEl = el('#graph-loading', this.container);
      if (loadingEl) loadingEl.classList.add('opacity-0', 'pointer-events-none');

      if (graphData.nodes.length === 0) {
        this.renderEmptyState();
        return;
      }

      // 3. Inicializar Cytoscape.js
      this.initCytoscape(graphData);

      // Botão de re-layout
      on(el('#btn-re-layout', this.container), 'click', () => {
        if (this.cy) {
          this.cy.layout({
            name: 'cose',
            animate: true,
            nodeOverlap: 20,
            nestingFactor: 1.2,
            gravity: 1,
            numIter: 1000,
            initialTemp: 1000,
            coolingFactor: 0.99,
            minTemp: 1.0
          }).run();
        }
      });

    } catch (err) {
      console.error(err);
      Toast.error('Erro ao renderizar grafo.');
    }
  }

  initCytoscape(graphData) {
    const container = el('#cy-container', this.container);
    if (!container) return;

    // Mapeamento de cores CSS com base no frontmatter do artigo
    const colorsMap = {
      blue: 'hsl(210, 85%, 55%)',
      green: 'hsl(145, 75%, 45%)',
      yellow: 'hsl(45, 90%, 55%)',
      orange: 'hsl(25, 85%, 55%)',
      red: 'hsl(0, 75%, 55%)',
      purple: 'hsl(270, 75%, 60%)',
      cyan: 'hsl(180, 80%, 45%)',
      pink: 'hsl(330, 80%, 60%)',
      indigo: 'hsl(245, 80%, 65%)'
    };

    // Formatar elementos (adicionando as cores reais correspondentes)
    const elements = [
      ...graphData.nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          realColor: colorsMap[node.data.color] || 'hsl(250, 85%, 65%)' // Cor padrão (Accent violeta)
        }
      })),
      ...graphData.edges
    ];

    this.cy = cytoscape({
      container: container,
      elements: elements,
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'color': 'hsl(220, 15%, 85%)',
            'background-color': 'data(realColor)',
            'width': '22px',
            'height': '22px',
            'font-family': 'Inter, sans-serif',
            'font-size': '10px',
            'text-valign': 'bottom',
            'text-margin-y': '6px',
            'text-background-opacity': 0.7,
            'text-background-color': 'hsl(225, 25%, 8%)',
            'text-background-padding': '3px',
            'text-background-shape': 'roundrectangle',
            'border-width': '2px',
            'border-color': 'rgba(255, 255, 255, 0.1)',
            'transition-property': 'background-color, width, height, border-color, border-width',
            'transition-duration': '0.2s',
            'overlay-opacity': 0
          }
        },
        {
          selector: 'edge',
          style: {
            'width': '1.5px',
            'line-color': 'hsla(225, 15%, 25%, 0.6)',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': 'hsla(225, 15%, 25%, 0.6)',
            'curve-style': 'bezier',
            'transition-property': 'line-color, width, target-arrow-color',
            'transition-duration': '0.2s',
            'overlay-opacity': 0
          }
        },
        // Classes de destaque (Hover)
        {
          selector: '.highlighted',
          style: {
            'border-color': '#fff',
            'border-width': '3px',
            'width': '28px',
            'height': '28px',
            'font-size': '11px',
            'color': '#fff',
            'z-index': 9999
          }
        },
        {
          selector: '.connected-edge',
          style: {
            'line-color': 'hsl(250, 85%, 65%)',
            'target-arrow-color': 'hsl(250, 85%, 65%)',
            'width': '3px'
          }
        },
        {
          selector: '.faded',
          style: {
            'opacity': 0.15
          }
        }
      ],
      layout: {
        name: 'cose',
        animate: true,
        fit: true,
        padding: 30,
        nodeOverlap: 20,
        componentSpacing: 40,
        nodeRepulsion: 400000,
        coolingFactor: 0.95
      }
    });

    // 4. Configurar interatividade de Hover
    this.cy.on('mouseover', 'node', (e) => {
      const node = e.target;
      const neighborhood = node.neighborhood();
      
      // Aplicar fade em todos os elementos
      this.cy.elements().addClass('faded');
      
      // Remover fade e destacar o nó ativo e conexões
      node.removeClass('faded').addClass('highlighted');
      neighborhood.removeClass('faded');
      neighborhood.edgesWith(node).addClass('connected-edge');
    });

    this.cy.on('mouseout', 'node', () => {
      // Limpar todas as classes de destaque
      this.cy.elements().removeClass('faded highlighted connected-edge');
    });

    // 5. Configurar clique para abrir no Editor
    this.cy.on('tap', 'node', (e) => {
      const node = e.target;
      const slug = node.id();
      window.location.hash = `#editor/${slug}`;
    });
  }

  renderEmptyState() {
    const container = el('#cy-container', this.container);
    if (!container) return;

    const emptyTemplate = `
      <div class="h-full flex flex-col items-center justify-center text-center p-8">
        <div class="w-12 h-12 bg-border rounded-xl flex items-center justify-center text-textSecondary mb-4">
          <i data-lucide="git-fork" class="w-6 h-6"></i>
        </div>
        <h4 class="font-bold text-sm mb-1">Nenhuma relação encontrada</h4>
        <p class="text-xs text-textSecondary max-w-xs">Crie mais artigos com wikilinks para ver as relações no grafo.</p>
      </div>
    `;

    mount(container, html(emptyTemplate));
    lucide.createIcons({ node: container });
  }
}
