import { html, el } from '../utils/dom.js';

export class Toast {
  static show(message, type = 'info', duration = 4000) {
    const container = el('#toast-container');
    if (!container) return;

    // Configurações de cores e ícones baseadas no tipo
    const types = {
      success: {
        bg: 'border-success/30 bg-success/5 text-success',
        icon: 'check-circle'
      },
      error: {
        bg: 'border-error/30 bg-error/5 text-error',
        icon: 'alert-triangle'
      },
      warning: {
        bg: 'border-warning/30 bg-warning/5 text-warning',
        icon: 'alert-circle'
      },
      info: {
        bg: 'border-info/30 bg-info/5 text-info',
        icon: 'info'
      }
    };

    const config = types[type] || types.info;

    // Criar elemento HTML do Toast
    const toastElement = html(`
      <div class="glass border ${config.bg} px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-medium shadow-2xl pointer-events-auto min-w-[280px] max-w-sm animate-slide-up">
        <i data-lucide="${config.icon}" class="w-4 h-4 flex-shrink-0"></i>
        <div class="flex-1 text-textPrimary">${message}</div>
        <button class="text-textMuted hover:text-textPrimary transition-colors focus:outline-none">
          <i data-lucide="x" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    `);

    // Adicionar no container
    container.appendChild(toastElement);

    // Inicializar ícones lucide neste toast específico
    lucide.createIcons({
      attrs: { 'stroke-width': 2.5 },
      nameAttr: 'data-lucide',
      node: toastElement
    });

    // Configurar fechamento ao clicar no botão 'X'
    const closeBtn = toastElement.querySelector('button');
    closeBtn.addEventListener('click', () => {
      removeToast();
    });

    // Auto-destruição após a duração
    let timeoutId = setTimeout(() => {
      removeToast();
    }, duration);

    function removeToast() {
      clearTimeout(timeoutId);
      toastElement.classList.add('opacity-0', 'translate-y-2', 'transition-all', 'duration-200');
      setTimeout(() => {
        toastElement.remove();
      }, 200);
    }
  }

  static success(message, duration) {
    this.show(message, 'success', duration);
  }

  static error(message, duration) {
    this.show(message, 'error', duration);
  }

  static warning(message, duration) {
    this.show(message, 'warning', duration);
  }

  static info(message, duration) {
    this.show(message, 'info', duration);
  }
}
