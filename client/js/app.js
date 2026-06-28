// Aegis Client Principal Launcher
import { store } from './store.js';
import { router } from './router.js';
import { Sidebar } from './components/Sidebar.js';
import { Toast } from './components/Toast.js';
import { CommandPalette } from './components/CommandPalette.js';
import { PomodoroTimer } from './components/PomodoroTimer.js';
import { el, on } from './utils/dom.js';

class App {
  constructor() {
    this.sidebar = null;
    this.commandPalette = null;
    this.pomodoroTimer = null;
    this.ws = null;
  }

  async start() {
    // 1. Verificar autenticação no servidor
    try {
      const auth = await fetch('/api/auth/check').then(r => r.json());
      
      if (!auth.authenticated) {
        // Se não autenticado, redireciona para /login (o Express cuida disso, mas garantimos aqui)
        window.location.href = '/login';
        return;
      }
      
      // Armazenar usuário no store global
      store.setState('user', auth.user);
      
      // 2. Montar interface da casca do app
      this.sidebar = new Sidebar('sidebar-container');
      this.sidebar.render();
      
      // 3. Inicializar a Paleta de Comandos (Ctrl+K)
      this.commandPalette = new CommandPalette('command-palette-container');
      
      // 4. Inicializar o Cronômetro Pomodoro Flutuante
      this.pomodoroTimer = new PomodoroTimer();
      
      // 5. Inicializar Roteador SPA
      router.init();
      
      // 5. Inicializar eventos globais do app
      this.setupGlobalEvents();
      
      // 6. Conectar ao WebSocket para sincronização em tempo real
      this.connectWebSocket();
      
      console.log('Aegis inicializado com sucesso.');
      Toast.success('Bem-vindo de volta ao Aegis!');
      
    } catch (err) {
      console.error('Erro ao inicializar Aegis:', err);
      Toast.error('Erro de conexão ao carregar Aegis. Tente recarregar.');
    }
  }

  setupGlobalEvents() {
    // Menu Dropdown do Usuário
    const userMenuBtn = el('#user-menu-btn');
    const userDropdown = el('#user-dropdown');
    
    if (userMenuBtn && userDropdown) {
      on(userMenuBtn, 'click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('hidden');
      });
      
      on(document, 'click', () => {
        userDropdown.classList.add('hidden');
      });
    }

    // Botão de Logout
    const logoutBtn = el('#logout-btn');
    if (logoutBtn) {
      on(logoutBtn, 'click', async () => {
        try {
          const res = await fetch('/api/auth/logout', { method: 'POST' }).then(r => r.json());
          if (res.success) {
            Toast.success('Logout concluído.');
            setTimeout(() => {
              window.location.href = '/login';
            }, 1000);
          }
        } catch (err) {
          Toast.error('Falha ao deslogar.');
        }
      });
    }

    // Gatilho de busca rápida (Ctrl+K)
    const searchTrigger = el('#quick-search-trigger');
    if (searchTrigger) {
      on(searchTrigger, 'click', () => {
        // Disparar o atalho Ctrl+K
        const event = new KeyboardEvent('keydown', {
          key: 'k',
          ctrlKey: true,
          bubbles: true
        });
        document.dispatchEvent(event);
      });
    }
  }

  connectWebSocket() {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}`;
    
    const wsStatusEl = el('#ws-status');

    const connect = () => {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('Conexão WebSocket estabelecida.');
        store.setState('wsConnected', true);
        if (wsStatusEl) {
          wsStatusEl.className = 'w-2.5 h-2.5 rounded-full bg-success';
          wsStatusEl.title = 'Conectado em tempo real';
        }
      };

      this.ws.onclose = () => {
        console.warn('Conexão WebSocket fechada. Tentando reconectar...');
        store.setState('wsConnected', false);
        if (wsStatusEl) {
          wsStatusEl.className = 'w-2.5 h-2.5 rounded-full bg-error animate-pulse';
          wsStatusEl.title = 'Desconectado. Tentando reconectar...';
        }
        setTimeout(connect, 3000);
      };

      this.ws.onerror = (err) => {
        console.error('Erro de WebSocket:', err);
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleWebSocketMessage(message);
        } catch (err) {
          console.error('Erro ao processar mensagem do servidor WS:', err);
        }
      };
    };

    connect();
  }

  handleWebSocketMessage(message) {
    const { event, payload } = message;
    console.log(`Evento WS recebido: ${event}`, payload);
    
    // Toast informativo de mudanças de arquivos detectadas pelo watcher
    if (event === 'file:updated') {
      Toast.info(`Arquivo atualizado: ${payload.title || payload.slug}`);
    } else if (event === 'file:created') {
      Toast.success(`Novo arquivo detectado: ${payload.title || payload.slug}`);
    } else if (event === 'file:deleted') {
      Toast.warning(`Arquivo deletado: ${payload.slug}`);
    }
  }
}

// Inicializar e rodar o app no carregamento do DOM
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.start();
});
