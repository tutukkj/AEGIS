import { html, mount, el, on } from '../utils/dom.js';
import { api } from '../utils/api.js';
import { Toast } from './Toast.js';

export class KanbanBoard {
  constructor(containerId) {
    this.container = el(`#${containerId}`);
    this.boardData = null; // Quadro selecionado com colunas e cards
  }

  async loadAndRender() {
    try {
      // 1. Carregar lista de quadros (e obter o primeiro)
      const boards = await api.get('/api/kanban/boards');
      if (boards.length === 0) {
        this.renderEmptyState();
        return;
      }
      
      const defaultBoard = boards[0];
      await this.loadBoard(defaultBoard.id);
    } catch (err) {
      console.error(err);
      Toast.error('Erro ao inicializar quadro Kanban.');
    }
  }

  async loadBoard(boardId) {
    try {
      this.boardData = await api.get(`/api/kanban/boards/${boardId}`);
      this.render();
    } catch (err) {
      console.error(err);
      Toast.error('Erro ao carregar cartões do Kanban.');
    }
  }

  render() {
    if (!this.container || !this.boardData) return;
    const { metadata, cards } = this.boardData;

    const template = `
      <div class="h-full flex flex-col p-6 animate-fade-in gap-6 overflow-hidden">
        <!-- Topo -->
        <div class="flex items-center justify-between flex-shrink-0">
          <div>
            <h1 class="text-xl font-bold">${metadata.name}</h1>
            <p class="text-xs text-textSecondary">${metadata.description || 'Gerencie suas tarefas e artigos de estudo de forma ágil.'}</p>
          </div>
        </div>

        <!-- Colunas Kanban -->
        <div class="flex-1 flex gap-4 overflow-x-auto pb-4 items-start select-none custom-scrollbar">
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
                  class="kanban-column-cards flex-1 flex flex-col gap-3 overflow-y-auto pr-1 min-h-[150px] custom-scrollbar" 
                  data-column-id="${col.id}"
                >
                  ${columnCards.map(card => {
                    const linkedBadge = card.linked_type === 'article' 
                      ? `<a href="#editor/${card.article_slug}" class="text-[9px] text-accent hover:underline flex items-center gap-1 font-semibold mt-1.5"><i data-lucide="file-text" class="w-3 h-3"></i> Nota vinculada</a>`
                      : '';

                    return `
                      <!-- Cartão Individual -->
                      <div 
                        class="kanban-card glass rounded-xl p-3 border border-border/60 bg-surface/30 cursor-grab active:cursor-grabbing hover:border-accent/40 transition-colors flex flex-col gap-2 relative group"
                        data-card-id="${card.id}"
                      >
                        <!-- Botão Deletar (Hover) -->
                        <button 
                          class="btn-delete-card absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-textMuted hover:text-error transition-all"
                          data-card-id="${card.id}"
                          title="Excluir Cartão"
                        >
                          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>

                        <h4 class="font-bold text-xs text-textPrimary pr-6 leading-tight">${card.title}</h4>
                        ${card.description ? `<p class="text-[10px] text-textSecondary line-clamp-2 leading-relaxed">${card.description}</p>` : ''}
                        
                        <!-- Metadados -->
                        <div class="flex items-center justify-between gap-2 mt-1">
                          <!-- Data de Entrega -->
                          ${card.due_date ? `
                            <span class="text-[9px] text-textMuted flex items-center gap-1 font-semibold">
                              <i data-lucide="calendar" class="w-2.5 h-2.5"></i>
                              <span>${new Date(card.due_date).toLocaleDateString('pt-BR')}</span>
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
                      <button class="btn-cancel-quick-card text-[10px] text-textSecondary hover:text-textPrimary px-2 py-1">Cancelar</button>
                      <button class="btn-save-quick-card bg-accent hover:bg-accent-hover text-white text-[10px] font-bold px-3 py-1 rounded-lg" data-column-id="${col.id}">Adicionar</button>
                    </div>
                  </div>
                  <button class="btn-show-quick-add w-full hover:bg-surface-hover/50 text-textSecondary hover:text-textPrimary text-[10px] font-semibold py-2 rounded-xl border border-dashed border-border/50 transition-colors flex items-center justify-center gap-1.5">
                    <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                    <span>Adicionar Cartão</span>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    mount(this.container, html(template));
    lucide.createIcons({ node: this.container });

    this.setupSortable();
    this.setupQuickAdd();
    this.setupCardDeletes();
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

          // Encontrar novo sort_order
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
            // Recarregar os dados locais para sincronizar qualquer mudança no status de notas vinculadas
            this.boardData = await api.get(`/api/kanban/boards/${this.boardData.metadata.id}`);
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
        const parent = btn.parentElement.parentElement; // form
        const container = parent.parentElement; // wrapper
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
        const parent = btn.parentElement.parentElement; // form
        const title = parent.querySelector('.quick-card-title').value.trim();

        if (!title) {
          Toast.warning('O título do cartão é obrigatório.');
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

  renderEmptyState() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="h-full flex flex-col items-center justify-center text-center p-8 bg-surface/10 border border-border/40 rounded-2xl">
        <div class="w-12 h-12 bg-border rounded-xl flex items-center justify-center text-textSecondary mb-4">
          <i data-lucide="kanban" class="w-6 h-6"></i>
        </div>
        <h4 class="font-bold text-sm mb-1">Nenhum quadro Kanban configurado</h4>
        <p class="text-xs text-textSecondary max-w-xs">Não encontramos quadros cadastrados no banco de dados.</p>
      </div>
    `;
    lucide.createIcons({ node: this.container });
  }
}
