// public/js/components/Sidebar.js
import { html, mount, el } from '../utils/dom.js';
import { store } from '../store.js';

export class Sidebar {
  constructor(containerId) {
    this.container = el(`#${containerId}`);
    this.menuItems = [
      { id: 'dashboard', label: 'PAINEL', icon: 'layout-dashboard', href: '#dashboard' },
      { id: 'explorer', label: 'EXPLORADOR', icon: 'folder-closed', href: '#explorer' },
      { id: 'graph', label: 'GRAFO', icon: 'git-fork', href: '#graph' },
      { id: 'mindmaps', label: 'MAPAS', icon: 'network', href: '#mindmaps' },
      { id: 'roadmaps', label: 'ROADMAPS', icon: 'milestone', href: '#roadmaps' },
      { id: 'kanban', label: 'KANBAN', icon: 'kanban', href: '#kanban' },
      { id: 'projects', label: 'PROJETOS', icon: 'briefcase', href: '#projects' },
      { id: 'settings', label: 'SETTINGS', icon: 'settings', href: '#settings' },
    ];

    store.subscribe('currentRoute', (route) => {
      this.updateActiveItem(route);
    });
  }

  render() {
    const template = `
      <div class="h-full flex flex-col justify-between py-4">
        <!-- Logo -->
        <div class="px-5 flex items-center gap-2 select-none">
          <div class="w-8 h-8 border border-border flex items-center justify-center text-textPrimary">
            <span class="text-sm font-bold">⧩</span>
          </div>
          <div>
            <h2 class="text-xs font-bold tracking-wider text-textPrimary">AEGIS</h2>
            <p class="text-[8px] text-textMuted tracking-[0.2em]">OS</p>
          </div>
        </div>

        <!-- Menu Principal -->
        <nav class="flex-1 px-3 py-6 flex flex-col gap-0.5 overflow-y-auto">
          ${this.menuItems.map(item => `
            <a 
              href="${item.href}" 
              id="nav-item-${item.id}"
              class="nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-[9px] font-mono text-textSecondary hover:text-textPrimary hover:bg-surface-hover transition-all duration-200 tracking-wider"
            >
              <i data-lucide="${item.icon}" class="w-3.5 h-3.5"></i>
              <span>${item.label}</span>
            </a>
          `).join('')}
        </nav>

        <!-- Rodapé do menu -->
        <div class="px-5 text-[8px] text-textMuted border-t border-border/40 pt-3 flex flex-col gap-0.5 font-mono">
          <div class="flex items-center gap-2">
            <div class="w-1.5 h-1.5 rounded-full bg-success"></div>
            <span>ONLINE</span>
          </div>
          <span>v2.0.0</span>
        </div>
      </div>
    `;

    mount(this.container, html(template));

    lucide.createIcons({
      attrs: { 'stroke-width': 1.5 },
      nameAttr: 'data-lucide',
      node: this.container
    });

    this.updateActiveItem(store.getState().currentRoute);
  }

  updateActiveItem(route) {
    if (!this.container) return;

    const links = this.container.querySelectorAll('.nav-link');
    links.forEach(link => {
      link.classList.remove('bg-white/5', 'text-textPrimary');
      link.classList.add('text-textSecondary');
    });

    const pageId = route.split('/')[0] || 'dashboard';
    const activeLink = this.container.querySelector(`#nav-item-${pageId}`);
    if (activeLink) {
      activeLink.classList.remove('text-textSecondary');
      activeLink.classList.add('bg-white/5', 'text-textPrimary');
    }
  }
}