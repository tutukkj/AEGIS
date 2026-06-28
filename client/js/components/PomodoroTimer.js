import { html, mount, el, on } from '../utils/dom.js';
import { api } from '../utils/api.js';
import { Toast } from './Toast.js';

export class PomodoroTimer {
  constructor() {
    this.container = null;
    this.timerInterval = null;
    this.duration = 25 * 60; // 25 minutos em segundos
    this.timeLeft = this.duration;
    this.isRunning = false;
    this.sessionId = null;
    this.selectedArticleSlug = '';
    this.interruptions = 0;
    this.articles = [];

    this.init();
  }

  async init() {
    // 1. Criar container flutuante se não existir
    let widget = document.getElementById('pomodoro-floating-widget');
    if (!widget) {
      widget = document.createElement('div');
      widget.id = 'pomodoro-floating-widget';
      widget.className = 'fixed bottom-6 right-6 z-40';
      document.body.appendChild(widget);
    }
    this.container = widget;

    // 2. Buscar lista de artigos para dropdown
    try {
      this.articles = await api.get('/api/articles') || [];
    } catch (err) {
      console.error('Erro ao buscar artigos para pomodoro:', err);
    }

    this.render();
  }

  render() {
    const minutes = String(Math.floor(this.timeLeft / 60)).padStart(2, '0');
    const seconds = String(this.timeLeft % 60).padStart(2, '0');
    const progressPercent = ((this.duration - this.timeLeft) / this.duration) * 100;

    const template = `
      <div class="relative">
        <!-- Widget Minimizado -->
        <button 
          id="pomo-toggle-btn" 
          class="w-12 h-12 bg-accent hover:bg-accent-hover text-white rounded-full flex items-center justify-center shadow-lg shadow-accent/20 transition-all duration-300 hover:scale-105"
        >
          <i data-lucide="timer" class="w-6 h-6 ${this.isRunning ? 'animate-pulse' : ''}"></i>
        </button>

        <!-- Painel do Timer (Oculto inicialmente) -->
        <div 
          id="pomo-panel" 
          class="hidden glass absolute bottom-14 right-0 w-80 rounded-2xl p-5 border border-border/80 shadow-2xl flex flex-col gap-4 glow-accent text-xs animate-scale-up"
        >
          <!-- Topo -->
          <div class="flex items-center justify-between border-b border-border/40 pb-2.5">
            <div class="flex items-center gap-1.5">
              <i data-lucide="timer" class="w-4 h-4 text-accent"></i>
              <span class="font-bold text-textPrimary">Pomodoro Aegis</span>
            </div>
            <button id="pomo-close-panel" class="text-textSecondary hover:text-textPrimary transition-colors">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <!-- Display do Timer Circular -->
          <div class="flex flex-col items-center justify-center py-4 relative">
            <div class="text-4xl font-extrabold font-mono text-textPrimary tracking-wider">${minutes}:${seconds}</div>
            <span class="text-[10px] text-textMuted font-bold uppercase mt-1 select-none">
              ${this.isRunning ? 'Foco Ativo' : 'Pausado'}
            </span>
            
            <!-- Linha de progresso linear abaixo do timer -->
            <div class="w-full bg-black/40 h-1.5 rounded-full overflow-hidden mt-3.5 border border-border/20">
              <div class="h-full bg-accent transition-all duration-300" style="width: ${progressPercent}%"></div>
            </div>
          </div>

          <!-- Seletor de Notas (Vincular Estudo) -->
          <div class="flex flex-col gap-1 select-none">
            <label for="pomo-article-select" class="text-[10px] text-textSecondary font-semibold">Vincular nota de estudo</label>
            <select 
              id="pomo-article-select" 
              class="bg-black/30 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent w-full text-textSecondary"
              ${this.isRunning ? 'disabled' : ''}
            >
              <option value="">Sem nota vinculada</option>
              ${this.articles.map(art => `
                <option value="${art.slug}" ${this.selectedArticleSlug === art.slug ? 'selected' : ''}>
                  ${art.title}
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Controles -->
          <div class="flex items-center justify-center gap-4 py-2 border-t border-border/40 select-none">
            <button 
              id="pomo-btn-reset" 
              class="w-8 h-8 rounded-xl border border-border bg-black/20 hover:bg-surface-hover/80 text-textSecondary hover:text-textPrimary flex items-center justify-center transition-colors"
              title="Reiniciar"
            >
              <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
            </button>
            
            <button 
              id="pomo-btn-start" 
              class="px-5 py-2.5 rounded-xl text-white font-bold text-xs bg-accent hover:bg-accent-hover flex items-center gap-1.5 shadow-md shadow-accent/15 transition-all hover:scale-102"
            >
              <i data-lucide="${this.isRunning ? 'pause' : 'play'}" class="w-3.5 h-3.5"></i>
              <span>${this.isRunning ? 'Pausar' : 'Iniciar'}</span>
            </button>

            <button 
              id="pomo-btn-interrupt" 
              class="w-8 h-8 rounded-xl border border-border bg-black/20 hover:bg-surface-hover/80 text-textSecondary hover:text-textPrimary flex items-center justify-center transition-colors relative"
              title="Registrar Interrupção"
              ${!this.isRunning ? 'disabled opacity-50' : ''}
            >
              <i data-lucide="zap-off" class="w-4 h-4"></i>
              ${this.interruptions > 0 ? `
                <span class="absolute -top-1.5 -right-1.5 bg-accent text-[9px] text-white font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  ${this.interruptions}
                </span>
              ` : ''}
            </button>
          </div>

          <!-- Notas da Sessão (Mostrado apenas ao terminar) -->
          <div id="pomo-notes-container" class="hidden flex flex-col gap-2 border-t border-border/40 pt-3 select-none">
            <label for="pomo-notes" class="text-[10px] text-textSecondary font-semibold">Resumo do que foi estudado</label>
            <textarea 
              id="pomo-notes" 
              placeholder="Ex: Aprendi o mecanismo de atenção do Transformer..." 
              class="bg-black/30 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent w-full resize-none h-14"
            ></textarea>
            <button 
              id="pomo-btn-save" 
              class="bg-success hover:bg-success/80 text-white text-xs font-bold py-2 rounded-xl transition-all"
            >
              Salvar e Concluir
            </button>
          </div>
        </div>
      </div>
    `;

    mount(this.container, html(template));
    lucide.createIcons({ node: this.container });

    this.setupEvents();
  }

  setupEvents() {
    const toggleBtn = el('#pomo-toggle-btn', this.container);
    const closeBtn = el('#pomo-close-panel', this.container);
    const panel = el('#pomo-panel', this.container);

    const startBtn = el('#pomo-btn-start', this.container);
    const resetBtn = el('#pomo-btn-reset', this.container);
    const interruptBtn = el('#pomo-btn-interrupt', this.container);
    const select = el('#pomo-article-select', this.container);
    const saveBtn = el('#pomo-btn-save', this.container);
    const notesContainer = el('#pomo-notes-container', this.container);

    // Toggle do Painel
    on(toggleBtn, 'click', () => {
      panel.classList.toggle('hidden');
    });

    on(closeBtn, 'click', () => {
      panel.classList.add('hidden');
    });

    // Artigo selecionado
    if (select) {
      on(select, 'change', (e) => {
        this.selectedArticleSlug = e.target.value;
      });
    }

    // Iniciar / Pausar
    on(startBtn, 'click', async () => {
      if (this.isRunning) {
        this.pause();
      } else {
        await this.start();
      }
      this.render();
      // Manter painel aberto após interagir
      el('#pomo-panel', this.container).classList.remove('hidden');
    });

    // Reiniciar
    on(resetBtn, 'click', () => {
      this.reset();
      this.render();
      el('#pomo-panel', this.container).classList.remove('hidden');
    });

    // Interrupção
    on(interruptBtn, 'click', () => {
      if (this.isRunning) {
        this.interruptions++;
        Toast.warning('Interrupção registrada!');
        this.render();
        el('#pomo-panel', this.container).classList.remove('hidden');
      }
    });

    // Salvar ao final
    on(saveBtn, 'click', async () => {
      const notes = el('#pomo-notes', this.container).value;
      try {
        await api.post('/api/pomodoro/end', {
          sessionId: this.sessionId,
          interruptions: this.interruptions,
          notes
        });
        Toast.success('Sessão Pomodoro salva com sucesso!');
        this.reset();
        this.render();
      } catch (err) {
        console.error(err);
        Toast.error('Erro ao salvar sessão.');
      }
    });
  }

  async start() {
    try {
      if (!this.sessionId) {
        // Criar nova sessão no banco de dados
        const session = await api.post('/api/pomodoro/start', {
          articleSlug: this.selectedArticleSlug,
          durationMinutes: Math.floor(this.duration / 60)
        });
        this.sessionId = session.sessionId;
      }

      this.isRunning = true;
      this.timerInterval = setInterval(() => {
        this.timeLeft--;
        if (this.timeLeft <= 0) {
          this.complete();
        } else {
          // Atualizar o display
          const minutes = String(Math.floor(this.timeLeft / 60)).padStart(2, '0');
          const seconds = String(this.timeLeft % 60).padStart(2, '0');
          const display = el('.text-4xl', this.container);
          if (display) display.textContent = `${minutes}:${seconds}`;

          // Atualizar a barra de progresso linear
          const progressPercent = ((this.duration - this.timeLeft) / this.duration) * 100;
          const progressBar = el('.bg-accent', this.container);
          if (progressBar) progressBar.style.width = `${progressPercent}%`;
        }
      }, 1000);
    } catch (err) {
      console.error(err);
      Toast.error('Erro ao iniciar sessão.');
    }
  }

  pause() {
    this.isRunning = false;
    clearInterval(this.timerInterval);
  }

  reset() {
    this.pause();
    this.timeLeft = this.duration;
    this.sessionId = null;
    this.interruptions = 0;
  }

  complete() {
    this.pause();
    this.timeLeft = 0;
    this.playCompletionSound();
    Toast.success('Pomodoro Concluído! Excelente trabalho de foco.');
    
    // Mostrar campo de notas
    const notesContainer = el('#pomo-notes-container', this.container);
    if (notesContainer) notesContainer.classList.remove('hidden');
    
    const startBtn = el('#pomo-btn-start', this.container);
    if (startBtn) startBtn.disabled = true;
  }

  playCompletionSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5
      oscillator.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.3); // G5
      oscillator.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.45); // C6

      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.8);
    } catch (e) {
      console.error('Erro ao reproduzir áudio:', e);
    }
  }
}
