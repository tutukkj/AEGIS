import { html, mount, el } from '../utils/dom.js';
import { store } from '../store.js';

export class Sidebar {
  constructor(containerId) {
    this.container = el(`#${containerId}`);
    this.menuItems = [
      { id: 'dashboard', label: 'Painel Inicial', icon: 'layout-dashboard', href: '#dashboard' },
      { id: 'explorer', label: 'Explorador', icon: 'folder-closed', href: '#explorer' },
      { id: 'graph', label: 'Visão em Grafo', icon: 'git-fork', href: '#graph' },
      { id: 'mindmaps', label: 'Mapas Mentais', icon: 'network', href: '#mindmaps' },
      { id: 'roadmaps', label: 'Roadmaps', icon: 'milestone', href: '#roadmaps' },
      { id: 'kanban', label: 'Kanban', icon: 'kanban', href: '#kanban' },
      { id: 'projects', label: 'Projetos', icon: 'briefcase', href: '#projects' },
      { id: 'settings', label: 'Configurações', icon: 'settings', href: '#settings' },
    ];
    
    // Inscrever-se nas mudanças de rota do estado global para atualizar o item ativo
    store.subscribe('currentRoute', (route) => {
      this.updateActiveItem(route);
    });
  }

  render() {
    const template = `
      <div class="h-full flex flex-col justify-between py-6">
        <!-- Logo -->
        <div class="px-6 flex items-center gap-3 select-none">
          <div class="w-9 h-9 bg-accent/20 rounded-lg border border-accent/40 flex items-center justify-center text-accent">
            <i data-lucide="shield" class="w-5 h-5"></i>
          </div>
          <div>
            <h2 class="text-sm font-bold tracking-tight text-textPrimary">Aegis</h2>
            <p class="text-[10px] text-textSecondary font-semibold uppercase tracking-wider">Learning OS</p>
          </div>
        </div>

        <!-- Menu Principal -->
        <nav class="flex-1 px-4 py-8 flex flex-col gap-1 overflow-y-auto">
          ${this.menuItems.map(item => `
            <a 
              href="${item.href}" 
              id="nav-item-${item.id}"
              class="nav-link flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-medium text-textSecondary hover:text-textPrimary hover:bg-surface-hover transition-all duration-200"
            >
              <i data-lucide="${item.icon}" class="w-4 h-4"></i>
              <span>${item.label}</span>
            </a>
          `).join('')}
        </nav>

        <!-- Rodapé do menu -->
        <div class="px-6 text-[10px] text-textMuted border-t border-border/40 pt-4 flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <div class="w-1.5 h-1.5 rounded-full bg-success"></div>
            <span>Modo Offline</span>
          </div>
          <span>v1.0.0</span>
        </div>
      </div>
    `;

    mount(this.container, html(template));
    
    // Inicializa os ícones do Lucide após renderizar
    lucide.createIcons({
      attrs: {
        'stroke-width': 2
      },
      nameAttr: 'data-lucide',
      node: this.container
    });
    
    // Atualiza o item ativo com base na rota atual do store
    this.updateActiveItem(store.getState().currentRoute);
  }

  updateActiveItem(route) {
    if (!this.container) return;
    
    // Remover classes ativas de todos os links
    const links = this.container.querySelectorAll('.nav-link');
    links.forEach(link => {
      link.classList.remove('bg-accent/15', 'text-textPrimary', 'border-l-2', 'border-accent', 'pl-[14px]');
      link.classList.add('text-textSecondary');
    });
    
    // Identificar a página atual a partir da hash
    let pageId = route.split('/')[0] || 'dashboard';
    if (!pageId || pageId === '') pageId = 'dashboard';
    
    const activeLink = this.container.querySelector(`#nav-item-${pageId}`);
    if (activeLink) {
      activeLink.classList.remove('text-textSecondary');
      activeLink.classList.add('bg-accent/15', 'text-textPrimary', 'border-l-2', 'border-accent', 'pl-[14px]');
    }
  }
}
