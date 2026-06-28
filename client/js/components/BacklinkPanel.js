import { html, mount, el } from '../utils/dom.js';

export class BacklinkPanel {
  constructor(containerId) {
    this.container = el(`#${containerId}`);
  }

  render(backlinks = []) {
    if (!this.container) return;

    if (backlinks.length === 0) {
      // Ocultar painel se não houver backlinks
      this.container.classList.add('hidden');
      return;
    }

    this.container.classList.remove('hidden');

    const template = `
      <div class="border-t border-border mt-12 pt-8 pb-12 animate-fade-in">
        <h3 class="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-4 flex items-center gap-2">
          <i data-lucide="link" class="w-3.5 h-3.5 text-accent"></i>
          <span>Referenciado por (${backlinks.length})</span>
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${backlinks.map(backlink => `
            <a 
              href="#editor/${backlink.slug}" 
              class="glass hover:bg-surface-hover rounded-xl p-4 transition-all duration-200 border border-border/40 hover:border-accent/30 flex flex-col gap-1.5 group"
            >
              <div class="font-semibold text-xs text-textPrimary group-hover:text-accent transition-colors">
                ${backlink.title}
              </div>
              ${backlink.context ? `
                <div class="text-[11px] text-textSecondary bg-black/20 px-2.5 py-1.5 rounded-lg border border-border/20 font-mono line-clamp-2">
                  ${this.formatContext(backlink.context)}
                </div>
              ` : ''}
            </a>
          `).join('')}
        </div>
      </div>
    `;

    mount(this.container, html(template));
    
    // Inicializar ícones
    lucide.createIcons({ node: this.container });
  }

  /**
   * Limpa possíveis colchetes wikilinks no texto de contexto para exibição mais legível
   */
  formatContext(context) {
    if (!context) return '';
    // Substituir [[Link]] por Link apenas para exibição
    return context.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, '$1');
  }
}
