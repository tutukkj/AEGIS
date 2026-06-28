import { html, mount, el, on } from '../utils/dom.js';
import { api } from '../utils/api.js';

export class CommandPalette {
  constructor(containerId) {
    this.container = el(`#${containerId}`);
    this.activeSearchQuery = '';
    this.searchResults = [];
    this.selectedIndex = 0;
    this.quickActions = [
      { label: 'Ir para o Painel Inicial', href: '#dashboard', icon: 'layout-dashboard', type: 'action' },
      { label: 'Ir para o Explorador de Notas', href: '#explorer', icon: 'folder-closed', type: 'action' },
      { label: 'Ir para a Visão em Grafo', href: '#graph', icon: 'git-fork', type: 'action' },
      { label: 'Ir para Configurações', href: '#settings', icon: 'settings', type: 'action' }
    ];
    
    this.setupEvents();
  }

  setupEvents() {
    if (!this.container) return;

    // Fechar ao clicar fora da paleta (no backdrop)
    on(this.container, 'click', (e) => {
      if (e.target === this.container) {
        this.close();
      }
    });

    // Registrar o atalho Ctrl+K e comandos globais
    document.addEventListener('keydown', (e) => {
      // Toggle
      if (e.ctrlKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.toggle();
      }
      
      // Close
      if (e.key === 'Escape' && !this.container.classList.contains('hidden')) {
        this.close();
      }

      // Navegação por teclado nos itens da paleta
      if (!this.container.classList.contains('hidden')) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.navigateSelection(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.navigateSelection(-1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          this.selectActiveItem();
        }
      }
    });
  }

  toggle() {
    this.container.classList.toggle('hidden');
    
    if (!this.container.classList.contains('hidden')) {
      this.render();
      const input = el('#palette-input', this.container);
      if (input) {
        input.focus();
        input.value = '';
      }
      this.selectedIndex = 0;
      this.searchResults = [];
      this.activeSearchQuery = '';
      this.renderList();
    }
  }

  close() {
    this.container.classList.add('hidden');
  }

  render() {
    const template = `
      <div class="glass w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl border border-border/80 flex flex-col glow-accent animate-scale-up">
        <!-- Campo de Input -->
        <div class="flex items-center gap-3 px-5 border-b border-border/60 bg-surface/20">
          <i data-lucide="search" class="w-4 h-4 text-textSecondary flex-shrink-0"></i>
          <input 
            type="text" 
            id="palette-input" 
            placeholder="Digite para buscar notas ou comandos rápidos..." 
            class="w-full bg-transparent py-4 text-sm focus:outline-none placeholder:text-gray-500"
            autoComplete="off"
          >
          <kbd class="bg-surface border border-border px-1.5 py-0.5 rounded text-[10px] text-textMuted font-mono select-none">ESC</kbd>
        </div>

        <!-- Lista de Resultados -->
        <div id="palette-list" class="max-h-[350px] overflow-y-auto p-2 flex flex-col gap-0.5"></div>
        
        <!-- Rodapé explicativo -->
        <div class="border-t border-border/40 bg-surface/20 px-5 py-2.5 flex items-center justify-between text-[10px] text-textMuted select-none">
          <div class="flex items-center gap-3">
            <span class="flex items-center gap-1"><kbd class="bg-surface border border-border px-1 rounded font-mono">↑↓</kbd> Navegar</span>
            <span class="flex items-center gap-1"><kbd class="bg-surface border border-border px-1 rounded font-mono">Enter</kbd> Selecionar</span>
          </div>
          <span>Aegis Learning OS</span>
        </div>
      </div>
    `;

    mount(this.container, html(template));
    lucide.createIcons({ node: this.container });

    // Escutar digitação
    const input = el('#palette-input', this.container);
    on(input, 'input', async (e) => {
      this.activeSearchQuery = e.target.value.trim();
      this.selectedIndex = 0;
      
      if (this.activeSearchQuery.length > 0) {
        await this.performSearch(this.activeSearchQuery);
      } else {
        this.searchResults = [];
        this.renderList();
      }
    });
  }

  async performSearch(query) {
    try {
      const results = await api.get(`/api/search?q=${encodeURIComponent(query)}`);
      this.searchResults = results || [];
      this.renderList();
    } catch (err) {
      console.error(err);
    }
  }

  renderList() {
    const listContainer = el('#palette-list', this.container);
    if (!listContainer) return;

    let itemsToRender = [];

    if (this.activeSearchQuery.length === 0) {
      // Exibir ações rápidas
      itemsToRender = this.quickActions;
    } else {
      // Exibir resultados da busca FTS5
      itemsToRender = this.searchResults;
    }

    if (itemsToRender.length === 0) {
      listContainer.innerHTML = `
        <div class="py-8 text-center text-xs text-textMuted flex flex-col items-center gap-2">
          <i data-lucide="info" class="w-5 h-5"></i>
          <span>Nenhum resultado encontrado para "${this.activeSearchQuery}"</span>
        </div>
      `;
      lucide.createIcons({ node: listContainer });
      return;
    }

    listContainer.innerHTML = itemsToRender.map((item, index) => {
      const isSelected = index === this.selectedIndex;
      const activeClass = isSelected ? 'bg-accent/15 text-textPrimary border-l-2 border-accent pl-3' : 'text-textSecondary hover:bg-surface-hover/50';
      
      if (item.type === 'action') {
        // Renderiza atalho de comando
        return `
          <a 
            href="${item.href}" 
            class="palette-item flex items-center justify-between px-4 py-3 rounded-xl transition-all text-xs font-semibold cursor-pointer ${activeClass}"
            data-index="${index}"
          >
            <div class="flex items-center gap-3">
              <i data-lucide="${item.icon}" class="w-4 h-4 text-accent"></i>
              <span>${item.label}</span>
            </div>
            <span class="text-[9px] text-textMuted uppercase font-bold tracking-wider">Atalho</span>
          </a>
        `;
      } else {
        // Renderiza nota/artigo encontrado por FTS5
        const difficultyBadge = item.difficulty === 'beginner' ? 'Iniciante' 
          : item.difficulty === 'intermediate' ? 'Intermediário' 
          : 'Avançado';
          
        return `
          <a 
            href="#editor/${item.slug}" 
            class="palette-item flex flex-col gap-1 px-4 py-2.5 rounded-xl transition-all cursor-pointer ${activeClass}"
            data-index="${index}"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <i data-lucide="${item.icon || 'file-text'}" class="w-3.5 h-3.5 text-accent/80"></i>
                <span class="text-xs font-semibold text-textPrimary">${item.title}</span>
              </div>
              <span class="text-[9px] px-1.5 py-0.5 rounded border border-border/80 text-textMuted font-bold uppercase">${difficultyBadge}</span>
            </div>
            ${item.snippet ? `
              <div class="text-[10px] text-textMuted truncate font-mono bg-black/10 px-2 py-1 rounded border border-border/10">
                ${item.snippet}
              </div>
            ` : ''}
          </a>
        `;
      }
    }).join('');

    lucide.createIcons({ node: listContainer });

    // Configurar clique do mouse nos itens da paleta
    const items = listContainer.querySelectorAll('.palette-item');
    items.forEach(item => {
      on(item, 'click', (e) => {
        this.close();
      });
    });
  }

  navigateSelection(direction) {
    let itemsCount = this.activeSearchQuery.length === 0 ? this.quickActions.length : this.searchResults.length;
    if (itemsCount === 0) return;

    this.selectedIndex = (this.selectedIndex + direction + itemsCount) % itemsCount;
    this.renderList();

    // Rolagem automática para o item selecionado na lista
    const listContainer = el('#palette-list', this.container);
    const selectedItem = listContainer.querySelector(`[data-index="${this.selectedIndex}"]`);
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest' });
    }
  }

  selectActiveItem() {
    let items = this.activeSearchQuery.length === 0 ? this.quickActions : this.searchResults;
    if (items.length === 0 || this.selectedIndex >= items.length) return;

    const activeItem = items[this.selectedIndex];
    this.close();

    // Executar navegação SPA
    window.location.hash = activeItem.href || `#editor/${activeItem.slug}`;
  }
}
