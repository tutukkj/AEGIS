import { html, mount, el, on } from '../utils/dom.js';
import { api } from '../utils/api.js';
import { Toast } from './Toast.js';

export class KanbanBoard {
  constructor(containerId) {
    this.container = el(`#${containerId}`);
    this.boards = [];
    this.boardData = null;
    this.articles = [];
  }

  async loadAndRender() {
    try {
      // 1. Carregar lista de artigos para vincular a cartões
      try {
        this.articles = await api.get('/api/articles') || [];
      } catch (err) {
        console.warn('Erro ao carregar artigos no Kanban:', err);
        this.articles = [];
      }

      // 2. Carregar quadros
      this.boards = await api.get('/api/kanban/boards') || [];
      if (this.boards.length === 0) {
        this.renderEmptyState();
        return;
      }
      
      // Se não houver quadro ativo, selecionar o primeiro
      if (!this.boardData || !this.boards.some(b => b.id === this.boardData.metadata.id)) {
        await this.loadBoard(this.boards[0].id);
      } else {
        await this.loadBoard(this.boardData.metadata.id);
      }
    } catch (err) {
      console.error(err);
      Toast.error('Erro ao inicializar Kanban.');
    }
  }

  async loadBoard(boardId) {
    try {
      this.boardData = await api.get(`/api/kanban/boards/${boardId}`);
      this.render();
    } catch (err) {
      console.error(err);
      Toast.error('Erro ao carregar quadro.');
    }
  }

  render() {
    if (!this.container || !this.boardData) return;
    const { metadata, cards } = this.boardData;

    const template = `
      <div class="h-full flex overflow-hidden animate-fade-in font-mono">
        <!-- Sidebar de Quadros -->
        <div class="w-64 border-r border-border/20 bg-surface/5 flex flex-col flex-shrink-0 select-none">
          <div class="p-4 border-b border-border/20 flex flex-col gap-2">
            <h2 class="text-xs font-bold text-accent uppercase tracking-wider">Quadros Kanban</h2>
            <p class="text-[9px] text-textMuted">Gerencie múltiplos fluxos de tarefas vinculados a roadmaps e notas.</p>
          </div>
          
          <!-- Lista de Quadros -->
          <div class="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5 custom-scrollbar">
            ${this.boards.map(board => `
              <div 
                class="board-list-item px-3 py-2.5 rounded-xl border border-border/50 bg-surface/10 hover:bg-surface-hover/80 hover:border-accent/40 cursor-pointer transition-all flex items-center justify-between group ${metadata.id === board.id ? 'border-accent/80 bg-accent/5' : ''}"
                data-id="${board.id}"
              >
                <div class="flex items-center gap-2 truncate">
                  <i data-lucide="kanban" class="w-3.5 h-3.5 ${metadata.id === board.id ? 'text-accent' : 'text-textSecondary'} flex-shrink-0"></i>
                  <span class="text-xs text-textSecondary font-semibold truncate group-hover:text-textPrimary">${board.name}</span>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Rodapé com Criador -->
          <div class="p-4 border-t border-border/20 bg-black/20 flex flex-col gap-2">
            <input 
              type="text" 
              id="new-board-name" 
              placeholder="Nome do Quadro..." 
              class="w-full bg-black/40 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent text-textPrimary placeholder:text-textMuted"
            >
            <button 
              id="btn-create-board" 
              class="bg-accent hover:bg-accent-hover text-black text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1"
            >
              <i data-lucide="plus" class="w-3.5 h-3.5"></i>
              <span>NOVO QUADRO</span>
            </button>
          </div>
        </div>

        <!-- Área Principal de Kanban -->
        <div class="flex-1 flex flex-col overflow-hidden relative bg-[#030303]">
          <!-- Grid de fundo estilo holograma -->
          <div class="absolute inset-0 pointer-events-none" style="
            background-image: radial-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px);
            background-size: 20px 20px;
          "></div>

          <!-- Topo do Quadro Ativo -->
          <div class="h-16 border-b border-border/20 px-6 flex items-center justify-between bg-black/20 flex-shrink-0 z-10 select-none">
            <div>
              <h1 class="text-sm font-bold text-textPrimary uppercase tracking-wider">${metadata.name}</h1>
              <p class="text-[9px] text-textMuted">${metadata.description || 'GERENCIE SUAS TAREFAS DE FORMA ÁGIL.'}</p>
            </div>
          </div>

          <!-- Colunas Kanban -->
          <div class="flex-1 flex gap-4 overflow-x-auto p-6 items-start select-none custom-scrollbar z-10">
            ${metadata.columns.map(col => {
              const columnCards = cards.filter(c => c.column_id === col.id);
              
              return `
                <!-- Coluna Individual -->
                <div class="w-72 flex-shrink-0 flex flex-col max-h-full glass rounded-2xl p-4 border border-border/40 bg-surface/5">
                  <!-- Cabeçalho da Coluna -->
                  <div class="flex items-center justify-between mb-4 flex-shrink-0 px-1">
                    <div class="flex items-center gap-2">
                      <span class="w-2 h-2 rounded-full ${col.id === 'done' ? 'bg-success' : col.id === 'doing' ? 'bg-warning' : col.id === 'todo' ? 'bg-accent' : 'bg-textMuted'}"></span>
                      <h3 class="font-bold text-xs text-textPrimary">${col.title}</h3>
                    </div>
                    <span class="text-[10px] text-textMuted font-bold px-2 py-0.5 rounded-lg bg-black/30">${columnCards.length}</span>
                  </div>

                  <!-- Lista de Cartões (Drag Container) -->
                  <div 
                    class="kanban-column-cards flex-1 flex flex-col gap-3 overflow-y-auto pr-1 min-h-[250px] custom-scrollbar" 
                    data-column-id="${col.id}"
                  >
                    ${columnCards.map(card => {
                      const linkedBadge = card.linked_type === 'article' 
                        ? `<a href="#editor/${card.article_slug}" class="no-drag text-[9px] text-accent hover:underline flex items-center gap-1 font-semibold mt-1.5"><i data-lucide="file-text" class="w-3.5 h-3.5"></i> Nota vinculada</a>`
                        : '';

                      return `
                        <!-- Cartão Individual -->
                        <div 
                          class="kanban-card glass rounded-xl p-3.5 border border-border/60 bg-surface/30 cursor-grab active:cursor-grabbing hover:border-accent/40 transition-colors flex flex-col gap-2 relative group"
                          data-card-id="${card.id}"
                        >
                          <!-- Botão Deletar (Hover) -->
                          <button 
                            class="btn-delete-card absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-textMuted hover:text-error transition-all no-drag bg-transparent border-none p-0 cursor-pointer"
                            data-card-id="${card.id}"
                            title="Excluir Cartão"
                          >
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                          </button>

                          <h4 class="font-bold text-xs text-textPrimary pr-6 leading-tight select-text text-left">${card.title}</h4>
                          ${card.description ? `<p class="text-[10px] text-textSecondary line-clamp-2 leading-relaxed select-text text-left">${card.description}</p>` : ''}
                          
                          <!-- Tags -->
                          ${card.tags && card.tags.length > 0 ? `
                            <div class="flex flex-wrap gap-1 mt-1">
                              ${card.tags.map(tag => `
                                <span class="text-[7.5px] px-1.5 py-0.5 rounded border border-border/40 bg-black/25 text-textSecondary">#${tag}</span>
                              `).join('')}
                            </div>
                          ` : ''}

                          <!-- Metadados -->
                          <div class="flex items-center justify-between gap-2 mt-1">
                            ${card.due_date ? `
                              <span class="text-[9px] text-textMuted flex items-center gap-1 font-semibold">
                                <i data-lucide="calendar" class="w-3 h-3"></i>
                                <span>Prazo: ${new Date(card.due_date).toLocaleDateString('pt-BR')}</span>
                              </span>
                            ` : '<span></span>'}
                          </div>

                          ${linkedBadge}
                        </div>
                      `;
                    }).join('')}
                  </div>

                  <!-- Input Rápido Adicionar Cartão -->
                  <div class="mt-4 pt-2 border-t border-border/20 flex-shrink-0 flex flex-col gap-2">
                    <div class="quick-add-form hidden flex flex-col gap-2">
                      <input 
                        type="text" 
                        placeholder="Título da tarefa..." 
                        class="quick-card-title bg-black/40 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent text-textPrimary"
                      >
                      <div class="flex items-center gap-1.5 justify-end">
                        <button class="btn-cancel-quick-card text-[10px] text-textSecondary hover:text-textPrimary px-2 py-1 bg-transparent border-none cursor-pointer">Cancelar</button>
                        <button class="btn-save-quick-card bg-accent hover:bg-accent-hover text-black text-[10px] font-bold px-3 py-1 rounded-lg border-none cursor-pointer" data-column-id="${col.id}">Adicionar</button>
                      </div>
                    </div>
                    <button class="btn-show-quick-add w-full hover:bg-surface-hover/50 text-textSecondary hover:text-textPrimary text-[10px] font-semibold py-2 rounded-xl border border-dashed border-border/50 bg-transparent transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                      <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                      <span>Adicionar Cartão</span>
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Modal Editar Cartão -->
          <div id="edit-card-modal" class="hidden fixed inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div class="glass w-full max-w-lg rounded-2xl p-6 flex flex-col gap-4 glow-accent font-mono">
              <div class="flex items-center justify-between border-b border-border/60 pb-3">
                <h3 class="font-bold text-sm text-accent uppercase">Editar Cartão</h3>
                <button id="btn-close-edit-modal" class="text-textSecondary hover:text-textPrimary transition-colors bg-transparent border-none cursor-pointer">
                  <i data-lucide="x" class="w-4 h-4"></i>
                </button>
              </div>
              
              <form id="edit-card-form" class="flex flex-col gap-4 text-left">
                <input type="hidden" id="edit-card-id">
                
                <div class="flex flex-col gap-1.5">
                  <label for="edit-card-title" class="text-[10px] text-textSecondary font-bold uppercase">Título da Tarefa</label>
                  <input type="text" id="edit-card-title" class="bg-black/40 border border-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent text-textPrimary" required>
                </div>

                <div class="flex flex-col gap-1.5">
                  <label for="edit-card-desc" class="text-[10px] text-textSecondary font-bold uppercase">Descrição</label>
                  <textarea id="edit-card-desc" class="bg-black/40 border border-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent text-textPrimary h-24 resize-none"></textarea>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div class="flex flex-col gap-1.5">
                    <label for="edit-card-date" class="text-[10px] text-textSecondary font-bold uppercase">Prazo de Conclusão</label>
                    <input type="date" id="edit-card-date" class="bg-black/40 border border-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent text-textPrimary">
                  </div>

                  <div class="flex flex-col gap-1.5">
                    <label for="edit-card-column" class="text-[10px] text-textSecondary font-bold uppercase">Status / Coluna</label>
                    <select id="edit-card-column" class="bg-black/40 border border-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent text-textSecondary">
                      <option value="inbox">Inbox</option>
                      <option value="todo">A Fazer</option>
                      <option value="doing">Estudando</option>
                      <option value="review">Revisão</option>
                      <option value="done">Concluído</option>
                    </select>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div class="flex flex-col gap-1.5">
                    <label for="edit-card-tags" class="text-[10px] text-textSecondary font-bold uppercase">Tags (separadas por vírgula)</label>
                    <input type="text" id="edit-card-tags" placeholder="Ex: estudo, dev" class="bg-black/40 border border-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent text-textPrimary">
                  </div>

                  <div class="flex flex-col gap-1.5">
                    <label for="edit-card-article" class="text-[10px] text-textSecondary font-bold uppercase">Nota Vinculada (.md)</label>
                    <select id="edit-card-article" class="bg-black/40 border border-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent text-textSecondary">
                      <option value="">Nenhuma</option>
                    </select>
                  </div>
                </div>

                <button type="submit" class="bg-accent hover:bg-accent-hover text-black text-xs font-bold py-3 rounded-xl transition-all mt-2 uppercase border-none cursor-pointer">
                  Salvar Alterações
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;

    mount(this.container, html(template));
    lucide.createIcons({ node: this.container });

    this.setupEvents();
    this.setupSortable();
    this.setupQuickAdd();
    this.setupCardDeletes();
    this.setupCardClicks();
    this.setupEditModalEvents();
  }

  setupEvents() {
    // Seleção de Quadro
    const items = this.container.querySelectorAll('.board-list-item');
    items.forEach(item => {
      on(item, 'click', () => {
        const id = item.getAttribute('data-id');
        this.loadBoard(id);
      });
    });

    // Criação de Quadro
    const btnCreate = this.container.querySelector('#btn-create-board');
    if (btnCreate) {
      on(btnCreate, 'click', async () => {
        const input = this.container.querySelector('#new-board-name');
        const name = input ? input.value.trim() : '';
        if (!name) {
          Toast.warning('Digite o nome do quadro.');
          return;
        }

        try {
          const newBoard = await api.post('/api/kanban/boards', { name, description: 'Quadro criado pelo usuário.' });
          Toast.success('Quadro criado!');
          this.boardData = newBoard;
          await this.loadAndRender();
        } catch (err) {
          console.error(err);
          Toast.error('Erro ao criar quadro.');
        }
      });
    }
  }

  setupSortable() {
    if (!this.container || !this.boardData) return;
    const columns = this.container.querySelectorAll('.kanban-column-cards');

    columns.forEach(colEl => {
      new Sortable(colEl, {
        group: 'kanban-board',
        animation: 180,
        ghostClass: 'bg-accent/10',
        dragClass: 'opacity-50',
        onEnd: async (evt) => {
          const cardId = evt.item.getAttribute('data-card-id');
          const targetColumnId = evt.to.getAttribute('data-column-id');

          const cardsInCol = evt.to.children;
          let newOrder = 0;
          for (let i = 0; i < cardsInCol.length; i++) {
            const cardEl = cardsInCol[i];
            if (cardEl.getAttribute('data-card-id') === cardId) {
              newOrder = i;
              break;
            }
          }

          try {
            await api.put(`/api/kanban/cards/${cardId}/position`, {
              columnId: targetColumnId,
              sortOrder: newOrder
            });
            this.boardData = await api.get(`/api/kanban/boards/${this.boardData.metadata.id}`);
            this.render();
          } catch (err) {
            console.error(err);
            Toast.error('Erro ao atualizar posição do cartão.');
          }
        }
      });
    });
  }

  setupQuickAdd() {
    const showBtns = this.container.querySelectorAll('.btn-show-quick-add');
    showBtns.forEach(btn => {
      on(btn, 'click', () => {
        const parent = btn.parentElement;
        const form = parent.querySelector('.quick-add-form');
        const input = form.querySelector('.quick-card-title');
        
        btn.classList.add('hidden');
        form.classList.remove('hidden');
        input.focus();
      });
    });

    const cancelBtns = this.container.querySelectorAll('.btn-cancel-quick-card');
    cancelBtns.forEach(btn => {
      on(btn, 'click', () => {
        const parent = btn.parentElement.parentElement;
        const container = parent.parentElement;
        const showBtn = container.querySelector('.btn-show-quick-add');
        
        parent.classList.add('hidden');
        showBtn.classList.remove('hidden');
        parent.querySelector('.quick-card-title').value = '';
      });
    });

    const saveBtns = this.container.querySelectorAll('.btn-save-quick-card');
    saveBtns.forEach(btn => {
      on(btn, 'click', async () => {
        const columnId = btn.getAttribute('data-column-id');
        const parent = btn.parentElement.parentElement;
        const title = parent.querySelector('.quick-card-title').value.trim();

        if (!title) {
          Toast.warning('O título é obrigatório.');
          return;
        }

        try {
          const updatedBoard = await api.post(`/api/kanban/boards/${this.boardData.metadata.id}/cards`, {
            title,
            columnId
          });
          if (updatedBoard) {
            Toast.success('Cartão adicionado!');
            this.boardData = updatedBoard;
            this.render();
          }
        } catch (err) {
          console.error(err);
          Toast.error('Erro ao adicionar cartão.');
        }
      });
    });
  }

  setupCardDeletes() {
    const deleteBtns = this.container.querySelectorAll('.btn-delete-card');
    deleteBtns.forEach(btn => {
      on(btn, 'click', async (e) => {
        e.stopPropagation();
        const cardId = btn.getAttribute('data-card-id');
        
        if (!confirm('Deseja realmente excluir este cartão?')) return;

        try {
          await api.delete(`/api/kanban/cards/${cardId}`);
          Toast.success('Cartão excluído!');
          await this.loadBoard(this.boardData.metadata.id);
        } catch (err) {
          console.error(err);
          Toast.error('Erro ao excluir cartão.');
        }
      });
    });
  }

  setupCardClicks() {
    const cards = this.container.querySelectorAll('.kanban-card');
    cards.forEach(cardEl => {
      on(cardEl, 'click', (e) => {
        if (e.target.closest('.no-drag') || e.target.closest('.btn-delete-card')) return;
        
        const cardId = cardEl.getAttribute('data-card-id');
        this.openEditModal(cardId);
      });
    });
  }

  openEditModal(cardId) {
    const card = this.boardData.cards.find(c => String(c.id) === String(cardId));
    if (!card) return;

    const modal = el('#edit-card-modal', this.container);
    el('#edit-card-id', this.container).value = card.id;
    el('#edit-card-title', this.container).value = card.title;
    el('#edit-card-desc', this.container).value = card.description || '';
    el('#edit-card-date', this.container).value = card.due_date ? card.due_date.substring(0, 10) : '';
    el('#edit-card-column', this.container).value = card.column_id;
    el('#edit-card-tags', this.container).value = (card.tags || []).join(', ');

    const articleSelect = el('#edit-card-article', this.container);
    articleSelect.innerHTML = '<option value="">Nenhuma</option>';
    this.articles.forEach(art => {
      const isSelected = card.linked_type === 'article' && card.linked_id === art.id ? 'selected' : '';
      articleSelect.innerHTML += `<option value="${art.id}" ${isSelected}>${art.title}</option>`;
    });

    modal.classList.remove('hidden');
    lucide.createIcons({ node: modal });
  }

  setupEditModalEvents() {
    const modal = el('#edit-card-modal', this.container);
    const closeBtn = el('#btn-close-edit-modal', this.container);
    const form = el('#edit-card-form', this.container);

    if (closeBtn) {
      on(closeBtn, 'click', () => modal.classList.add('hidden'));
    }

    if (form) {
      on(form, 'submit', async (e) => {
        e.preventDefault();
        
        const cardId = el('#edit-card-id', this.container).value;
        const title = el('#edit-card-title', this.container).value.trim();
        const description = el('#edit-card-desc', this.container).value.trim();
        const dueDate = el('#edit-card-date', this.container).value || null;
        const columnId = el('#edit-card-column', this.container).value;
        const tagsText = el('#edit-card-tags', this.container).value;
        const linkedIdVal = el('#edit-card-article', this.container).value;

        const tags = tagsText ? tagsText.split(',').map(t => t.trim()).filter(Boolean) : [];
        const linkedId = linkedIdVal ? parseInt(linkedIdVal) : null;
        const linkedType = linkedId ? 'article' : null;

        try {
          await api.put(`/api/kanban/cards/${cardId}`, {
            title,
            description,
            tags,
            dueDate,
            columnId,
            linkedType,
            linkedId
          });
          
          Toast.success('Cartão atualizado com sucesso!');
          modal.classList.add('hidden');
          await this.loadBoard(this.boardData.metadata.id);
        } catch (err) {
          console.error(err);
          Toast.error('Erro ao atualizar cartão.');
        }
      });
    }
  }

  renderEmptyState() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="h-full flex flex-col items-center justify-center text-center p-8 bg-surface/10 border border-border/40 rounded-2xl font-mono">
        <div class="w-12 h-12 bg-border rounded-xl flex items-center justify-center text-textSecondary mb-4">
          <i data-lucide="kanban" class="w-6 h-6"></i>
        </div>
        <h4 class="font-bold text-sm mb-1">Nenhum quadro Kanban configurado</h4>
        <p class="text-xs text-textSecondary max-w-xs mb-4">Não encontramos quadros cadastrados no banco de dados.</p>
        <div class="flex items-center gap-2 max-w-xs">
          <input type="text" id="empty-board-name" placeholder="Nome do primeiro quadro..." class="bg-black/40 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent text-textPrimary w-full">
          <button id="btn-create-empty-board" class="bg-accent hover:bg-accent-hover text-black text-xs font-bold px-4 py-2 rounded-xl transition-all border-none cursor-pointer">Criar</button>
        </div>
      </div>
    `;

    lucide.createIcons({ node: this.container });

    const btnCreate = this.container.querySelector('#btn-create-empty-board');
    if (btnCreate) {
      on(btnCreate, 'click', async () => {
        const input = this.container.querySelector('#empty-board-name');
        const name = input ? input.value.trim() : '';
        if (!name) {
          Toast.warning('Digite o nome do quadro.');
          return;
        }

        try {
          const newBoard = await api.post('/api/kanban/boards', { name, description: 'Quadro padrão.' });
          Toast.success('Quadro criado!');
          this.boardData = newBoard;
          await this.loadAndRender();
        } catch (err) {
          console.error(err);
          Toast.error('Erro ao criar quadro.');
        }
      });
    }
  }
}
