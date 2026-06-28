import { html, mount, el, on } from '../utils/dom.js';
import { api } from '../utils/api.js';
import { Toast } from './Toast.js';

export class MindMap {
  constructor(containerId) {
    this.container = el(`#${containerId}`);
    this.activeMindmap = null; // Mapa mental aberto
    this.cy = null;
    this.articles = [];
  }

  async loadAndRender(mindmapId = null) {
    // Buscar artigos para o formulário de criação
    try {
      this.articles = await api.get('/api/articles') || [];
    } catch (err) {
      console.error(err);
    }

    if (mindmapId) {
      await this.loadCanvas(mindmapId);
    } else {
      await this.loadList();
    }
  }

  async loadList() {
    try {
      const mindmaps = await api.get('/api/mindmaps');
      this.renderList(mindmaps);
    } catch (err) {
      console.error(err);
      Toast.error('Erro ao carregar lista de mapas mentais.');
    }
  }

  async loadCanvas(id) {
    try {
      this.activeMindmap = await api.get(`/api/mindmaps/${id}`);
      this.renderCanvas();
    } catch (err) {
      console.error(err);
      Toast.error('Erro ao carregar mapa mental.');
      window.location.hash = '#mindmaps';
    }
  }

  renderList(mindmaps) {
    if (!this.container) return;

    const template = `
      <div class="h-full flex flex-col p-6 animate-fade-in gap-6 overflow-y-auto">
        <!-- Topo -->
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-xl font-bold">Mapas Mentais</h1>
            <p class="text-xs text-textSecondary">Crie diagramas e árvores de conceitos interativos integrados com suas notas.</p>
          </div>
          
          <button id="btn-new-mindmap" class="bg-accent hover:bg-accent-hover text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-accent/15">
            <i data-lucide="plus" class="w-3.5 h-3.5"></i>
            <span>Novo Mapa Mental</span>
          </button>
        </div>

        <!-- Grid de Mapas Mentais -->
        ${mindmaps.length === 0 ? `
          <div class="flex-1 flex flex-col items-center justify-center text-center p-8 bg-surface/10 border border-border/40 rounded-2xl">
            <div class="w-12 h-12 bg-border rounded-xl flex items-center justify-center text-textSecondary mb-4">
              <i data-lucide="network" class="w-6 h-6"></i>
            </div>
            <h4 class="font-bold text-sm mb-1">Nenhum mapa mental criado</h4>
            <p class="text-xs text-textSecondary max-w-xs">Crie um mapa conceitual do zero ou gerado de forma automática a partir de uma nota de estudo.</p>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${mindmaps.map(mm => `
              <!-- Card Individual -->
              <div class="glass hover:bg-surface-hover/80 rounded-2xl p-5 border border-border/40 hover:border-accent/40 transition-all flex flex-col gap-4 relative group">
                <!-- Botão Excluir -->
                <button 
                  class="btn-delete-mindmap absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-textMuted hover:text-error transition-all"
                  data-mindmap-id="${mm.id}"
                  title="Excluir Mapa Mental"
                >
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>

                <a href="#mindmaps/${mm.id}" class="flex-1 flex flex-col gap-2">
                  <div class="flex items-center gap-2.5">
                    <i data-lucide="network" class="w-5 h-5 text-accent"></i>
                    <h3 class="font-bold text-xs text-textPrimary truncate group-hover:text-accent transition-colors">${mm.name}</h3>
                  </div>
                  
                  ${mm.root_article_id ? `
                    <p class="text-[10px] text-textMuted flex items-center gap-1">
                      <i data-lucide="file-text" class="w-3 h-3"></i>
                      <span>Origem: ${mm.root_article_title}</span>
                    </p>
                  ` : `
                    <p class="text-[10px] text-textMuted flex items-center gap-1">
                      <i data-lucide="file-plus-2" class="w-3 h-3"></i>
                      <span>Mapa em branco</span>
                    </p>
                  `}
                  
                  <p class="text-[9px] text-textMuted mt-2">Atualizado em: ${new Date(mm.updated_at).toLocaleDateString('pt-BR')}</p>
                </a>
              </div>
            `).join('')}
          </div>
        `}

        <!-- Modal Novo Mapa (Oculto) -->
        <div id="new-mindmap-modal" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div class="glass w-full max-w-md rounded-2xl p-6 flex flex-col gap-4 glow-accent">
            <div class="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 class="font-bold text-sm">Criar Mapa Mental</h3>
              <button id="btn-close-mm-modal" class="text-textSecondary hover:text-textPrimary transition-colors">
                <i data-lucide="x" class="w-4 h-4"></i>
              </button>
            </div>
            
            <form id="new-mindmap-form" class="flex flex-col gap-4">
              <div class="flex flex-col gap-1">
                <label for="mm-name" class="text-xs text-textSecondary font-medium">Nome do Mapa</label>
                <input type="text" id="mm-name" placeholder="Ex: Arquitetura Docker" class="bg-black/30 border border-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent" required>
              </div>

              <div class="flex flex-col gap-1">
                <label for="mm-root-article" class="text-xs text-textSecondary font-medium">Gerar de Nota Existente (Opcional)</label>
                <select id="mm-root-article" class="bg-black/30 border border-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent text-textSecondary">
                  <option value="">Começar em branco</option>
                  ${this.articles.map(art => `
                    <option value="${art.id}">${art.title}</option>
                  `).join('')}
                </select>
                <p class="text-[9px] text-textMuted mt-1 leading-relaxed lowercase">se selecionado, preenche as primeiras ramificações usando o grafo de backlinks da nota de forma inteligente.</p>
              </div>

              <button type="submit" class="bg-accent hover:bg-accent-hover text-white text-xs font-semibold py-2.5 rounded-xl transition-all mt-2">
                Criar Mapa Mental
              </button>
            </form>
          </div>
        </div>
      </div>
    `;

    mount(this.container, html(template));
    lucide.createIcons({ node: this.container });

    this.setupListEvents();
  }

  setupListEvents() {
    const modal = el('#new-mindmap-modal', this.container);
    const newBtn = el('#btn-new-mindmap', this.container);
    const closeBtn = el('#btn-close-mm-modal', this.container);
    const form = el('#new-mindmap-form', this.container);

    on(newBtn, 'click', () => {
      modal.classList.remove('hidden');
      el('#mm-name').focus();
    });

    const hideModal = () => {
      modal.classList.add('hidden');
      form.reset();
    };

    on(closeBtn, 'click', hideModal);

    on(form, 'submit', async (e) => {
      e.preventDefault();
      const name = el('#mm-name').value;
      const rootArticleId = el('#mm-root-article').value || null;

      try {
        const mm = await api.post('/api/mindmaps', { name, rootArticleId });
        if (mm) {
          Toast.success('Mapa mental criado!');
          hideModal();
          window.location.hash = `#mindmaps/${mm.id}`;
        }
      } catch (err) {
        console.error(err);
        Toast.error('Erro ao criar mapa mental.');
      }
    });

    const deleteBtns = this.container.querySelectorAll('.btn-delete-mindmap');
    deleteBtns.forEach(btn => {
      on(btn, 'click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-mindmap-id');
        if (!confirm('Deseja realmente excluir este mapa mental?')) return;

        try {
          await api.delete(`/api/mindmaps/${id}`);
          Toast.success('Mapa mental excluído!');
          this.loadList();
        } catch (err) {
          console.error(err);
          Toast.error('Erro ao excluir mapa mental.');
        }
      });
    });
  }

  renderCanvas() {
    if (!this.container || !this.activeMindmap) return;
    const mm = this.activeMindmap;

    const template = `
      <div class="h-full flex flex-col p-6 animate-fade-in gap-4 relative overflow-hidden select-none">
        <!-- Topo: Título e Controles de Edição -->
        <div class="flex items-center justify-between flex-shrink-0 z-10">
          <div class="flex items-center gap-3">
            <a href="#mindmaps" class="w-8 h-8 rounded-xl bg-black/30 border border-border hover:bg-surface-hover/80 text-textSecondary hover:text-textPrimary flex items-center justify-center transition-all select-none">
              <i data-lucide="arrow-left" class="w-4 h-4"></i>
            </a>
            <div>
              <h1 class="text-sm font-bold">${mm.name}</h1>
              <p class="text-[10px] text-textSecondary">Dê duplo clique no fundo para adicionar nó. Duplo clique no nó para renomear.</p>
            </div>
          </div>

          <!-- Ações de Grafo -->
          <div class="flex items-center gap-2">
            <button id="btn-mm-add-node" class="bg-black/40 hover:bg-surface-hover border border-border text-textPrimary text-xs font-semibold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5">
              <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i>
              <span>Adicionar Nó</span>
            </button>
            <button id="btn-mm-delete-node" class="bg-black/40 hover:bg-surface-hover border border-border text-error hover:text-white hover:bg-error/15 border-border text-xs font-semibold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 opacity-50" disabled>
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              <span>Deletar Selecionado</span>
            </button>
            <button id="btn-mm-layout" class="bg-black/40 hover:bg-surface-hover border border-border text-textPrimary text-xs font-semibold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5" title="Reorganizar Hierarquicamente">
              <i data-lucide="git-merge" class="w-3.5 h-3.5"></i>
              <span>Reorganizar</span>
            </button>
            <button id="btn-mm-save" class="bg-accent hover:bg-accent-hover text-white text-xs font-bold px-4 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-accent/10">
              <i data-lucide="save" class="w-3.5 h-3.5"></i>
              <span>Salvar Mapa</span>
            </button>
          </div>
        </div>

        <!-- Canvas -->
        <div id="cy-mindmap-container" class="flex-1 rounded-2xl border border-border bg-black/40 relative overflow-hidden" style="height: 500px;"></div>
      </div>
    `;

    mount(this.container, html(template));
    lucide.createIcons({ node: this.container });

    this.initCytoscape();
  }

  initCytoscape() {
    const container = el('#cy-mindmap-container', this.container);
    if (!container) return;

    const data = this.activeMindmap.tree_data;

    // Se o layout tiver nós sem posição salva, organizar usando layout circular/hierárquico inicial
    const hasPositions = data.nodes.some(n => n.position);

    this.cy = cytoscape({
      container: container,
      elements: [...data.nodes, ...data.edges],
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'color': 'hsl(220, 15%, 85%)',
            'background-color': 'hsl(250, 85%, 65%)',
            'width': '18px',
            'height': '18px',
            'font-family': 'Inter, sans-serif',
            'font-size': '10px',
            'text-valign': 'bottom',
            'text-margin-y': '5px',
            'text-background-opacity': 0.7,
            'text-background-color': 'hsl(225, 25%, 8%)',
            'text-background-padding': '3px',
            'text-background-shape': 'roundrectangle',
            'border-width': '2px',
            'border-color': 'rgba(255, 255, 255, 0.1)',
            'overlay-opacity': 0
          }
        },
        {
          selector: 'node[?isRoot]',
          style: {
            'background-color': 'hsl(145, 75%, 45%)', // Verde para o nó raiz
            'width': '24px',
            'height': '24px',
            'font-size': '11px',
            'font-weight': 'bold'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': '1.5px',
            'line-color': 'hsla(225, 15%, 35%, 0.6)',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': 'hsla(225, 15%, 35%, 0.6)',
            'curve-style': 'bezier',
            'overlay-opacity': 0
          }
        },
        // Estilo de seleção
        {
          selector: ':selected',
          style: {
            'border-color': '#fff',
            'border-width': '3px',
            'line-color': '#fff',
            'target-arrow-color': '#fff'
          }
        }
      ],
      layout: hasPositions ? { name: 'preset' } : {
        name: 'breadthfirst',
        directed: true,
        padding: 50,
        animate: true
      }
    });

    this.setupCanvasInteractivity();
  }

  setupCanvasInteractivity() {
    const addBtn = el('#btn-mm-add-node', this.container);
    const deleteBtn = el('#btn-mm-delete-node', this.container);
    const layoutBtn = el('#btn-mm-layout', this.container);
    const saveBtn = el('#btn-mm-save', this.container);

    let selectedNode = null;

    // Escutar seleção de nós
    this.cy.on('select', 'node', (e) => {
      selectedNode = e.target;
      deleteBtn.removeAttribute('disabled');
      deleteBtn.classList.remove('opacity-50');
    });

    this.cy.on('unselect', 'node', () => {
      selectedNode = null;
      deleteBtn.setAttribute('disabled', 'true');
      deleteBtn.classList.add('opacity-50');
    });

    // Função interna para adicionar novo nó
    const addNode = (pos = null) => {
      const label = prompt('Digite o nome do novo nó conceitual:');
      if (!label || label.trim() === '') return;

      const nodeId = `node-${Date.now()}`;
      const renderPos = pos || (selectedNode ? selectedNode.position() : { x: 150, y: 150 });
      
      // Se tiver pos, deslocar um pouco se tiver nó de referência
      const position = pos ? pos : { x: renderPos.x + 60, y: renderPos.y + 60 };

      // Inserir nó no cytoscape
      this.cy.add({
        group: 'nodes',
        data: { id: nodeId, label: label.trim() },
        position
      });

      // Se tiver nó selecionado, conectar aresta
      if (selectedNode) {
        this.cy.add({
          group: 'edges',
          data: {
            id: `edge-${selectedNode.id()}-${nodeId}`,
            source: selectedNode.id(),
            target: nodeId
          }
        });
      }

      Toast.success('Nó adicionado!');
    };

    // Botão Adicionar
    on(addBtn, 'click', () => addNode());

    // Duplo clique no canvas para adicionar nó na posição do mouse
    this.cy.on('dbltap', (e) => {
      if (e.target === this.cy) {
        addNode(e.position);
      }
    });

    // Duplo clique no nó para renomear
    this.cy.on('dbltap', 'node', (e) => {
      const node = e.target;
      const currentLabel = node.data('label');
      const newLabel = prompt('Editar nome do nó conceitual:', currentLabel);
      
      if (newLabel && newLabel.trim() !== '') {
        node.data('label', newLabel.trim());
        Toast.success('Nó renomeado!');
      }
    });

    // Botão Deletar Selecionado
    on(deleteBtn, 'click', () => {
      if (selectedNode) {
        if (selectedNode.data('isRoot')) {
          Toast.warning('O nó raiz não pode ser excluído.');
          return;
        }
        
        if (confirm(`Deseja excluir o nó "${selectedNode.data('label')}" e todas as suas arestas?`)) {
          this.cy.remove(selectedNode);
          Toast.success('Nó removido!');
        }
      }
    });

    // Reorganizar Layout
    on(layoutBtn, 'click', () => {
      this.cy.layout({
        name: 'breadthfirst',
        directed: true,
        padding: 50,
        animate: true
      }).run();
    });

    // Botão Salvar
    on(saveBtn, 'click', async () => {
      const elements = this.cy.elements();
      
      // Formatar nós e arestas com as posições salvas
      const nodes = this.cy.nodes().map(n => ({
        data: {
          id: n.id(),
          label: n.data('label'),
          isRoot: n.data('isRoot') || false,
          slug: n.data('slug') || null
        },
        position: n.position()
      }));

      const edges = this.cy.edges().map(e => ({
        data: {
          id: e.id(),
          source: e.source().id(),
          target: e.target().id()
        }
      }));

      const treeData = { nodes, edges };

      try {
        saveBtn.disabled = true;
        saveBtn.innerText = 'Salvando...';

        const updated = await api.put(`/api/mindmaps/${this.activeMindmap.id}`, { treeData });
        if (updated) {
          Toast.success('Mapa mental salvo com sucesso!');
          this.activeMindmap = updated;
        }
      } catch (err) {
        console.error(err);
        Toast.error('Erro ao salvar mapa mental.');
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i data-lucide="save" class="w-3.5 h-3.5"></i><span>Salvar Mapa</span>`;
        lucide.createIcons({ node: saveBtn });
      }
    });
  }

  renderEmptyState() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="h-full flex flex-col items-center justify-center text-center p-8 bg-surface/10 border border-border/40 rounded-2xl">
        <div class="w-12 h-12 bg-border rounded-xl flex items-center justify-center text-textSecondary mb-4">
          <i data-lucide="network" class="w-6 h-6"></i>
        </div>
        <h4 class="font-bold text-sm mb-1">Nenhum mapa mental configurado</h4>
        <p class="text-xs text-textSecondary max-w-xs">Não encontramos mapas conceituais cadastrados no banco de dados.</p>
      </div>
    `;
    lucide.createIcons({ node: this.container });
  }
}
