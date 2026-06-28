// public/js/app.js

// public/js/app.js - Trecho atualizado

import { store } from './store.js';
import { router } from './router.js';
import { Sidebar } from './components/Sidebar.js';
import { Toast } from './components/Toast.js';
import { CommandPalette } from './components/CommandPalette.js';
import { PomodoroTimer } from './components/PomodoroTimer.js';
import { GlobeScene } from './components/GlobeScene.js';
import { el, on } from './utils/dom.js';

class App {
  constructor() {
    this.sidebar = null;
    this.commandPalette = null;
    this.pomodoroTimer = null;
    this.globeScene = null;
    this.ws = null;
  }

  async start() {
    try {
      const auth = await fetch('/api/auth/check').then(r => r.json());

      if (!auth.authenticated) {
        window.location.href = '/login';
        return;
      }

      store.setState('user', auth.user);

      // 2. Inicializar a cena 3D (MOTOR DE CONSTELAÇÃO)
      this.globeScene = new GlobeScene('webgl-container');
      window.globeScene = this.globeScene;

      // 3. Montar interface
      this.sidebar = new Sidebar('sidebar-container');
      this.sidebar.render();

      // 4. Inicializar Paleta de Comandos
      this.commandPalette = new CommandPalette('command-palette-container');

      // 5. Inicializar Pomodoro
      this.pomodoroTimer = new PomodoroTimer();

      // 6. Inicializar Roteador SPA
      router.init();

      // 7. Configurar eventos globais
      this.setupGlobalEvents();

      // 8. Conectar WebSocket
      this.connectWebSocket();

      // 9. Carregar dados iniciais do grafo
      await this.loadInitialGraphData();

      console.log('✦ Aegis Cosmos inicializado.');
      Toast.success('Sistema Aegis online. Constelação pronta para exploração.');

    } catch (err) {
      console.error('Erro ao inicializar Aegis:', err);
      Toast.error('Erro de conexão ao carregar Aegis.');
    }
  }

  async loadInitialGraphData() {
    try {
      const graphData = await fetch('/api/graph').then(r => r.json());

      if (graphData && graphData.nodes && graphData.nodes.length > 0) {
        const nodes = graphData.nodes.map(node => ({
          id: node.data.id,
          label: node.data.label,
          color: node.data.realColor || 0x5EEAD4,
          position: node.position || {
            x: (Math.random() - 0.5) * 20,
            y: (Math.random() - 0.5) * 20,
            z: (Math.random() - 0.5) * 10
          },
          data: {
            slug: node.data.slug,
            title: node.data.title,
            description: node.data.description,
            difficulty: node.data.difficulty,
            status: node.data.status,
            roadmap: node.data.roadmap,
            estimatedHours: node.data.estimated_hours,
            category: node.data.category,
            tags: node.data.tags || []
          }
        }));

        const edges = graphData.edges.map(edge => ({
          source: edge.data.source,
          target: edge.data.target
        }));

        if (this.globeScene) {
          this.globeScene.addGraphNodes(nodes, edges);
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar dados do grafo:', err);
    }
  }

  setupGlobalEvents() {
    // Menu do usuário
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

    // Logout
    const logoutBtn = el('#logout-btn');
    if (logoutBtn) {
      on(logoutBtn, 'click', async () => {
        try {
          const res = await fetch('/api/auth/logout', { method: 'POST' }).then(r => r.json());
          if (res.success) {
            Toast.success('Desconectado do sistema.');
            setTimeout(() => {
              window.location.href = '/login';
            }, 1000);
          }
        } catch (err) {
          Toast.error('Falha ao desconectar.');
        }
      });
    }

    // Busca rápida (Ctrl+K)
    const searchTrigger = el('#quick-search-trigger');
    if (searchTrigger) {
      on(searchTrigger, 'click', () => {
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
        console.log('🔗 Conexão WebSocket estabelecida.');
        store.setState('wsConnected', true);
        if (wsStatusEl) {
          wsStatusEl.className = 'w-2 h-2 rounded-full bg-success';
          wsStatusEl.title = 'Conectado em tempo real';
        }
      };

      this.ws.onclose = () => {
        console.warn('⚠️ Conexão WebSocket fechada. Reconectando...');
        store.setState('wsConnected', false);
        if (wsStatusEl) {
          wsStatusEl.className = 'w-2 h-2 rounded-full bg-error animate-pulse';
          wsStatusEl.title = 'Desconectado. Tentando reconectar...';
        }
        setTimeout(connect, 3000);
      };

      this.ws.onerror = (err) => {
        console.error('❌ Erro de WebSocket:', err);
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleWebSocketMessage(message);
        } catch (err) {
          console.error('Erro ao processar mensagem WS:', err);
        }
      };
    };

    connect();
  }

  handleWebSocketMessage(message) {
    const { event, payload } = message;
    console.log(`📡 Evento WS: ${event}`, payload);

    if (event === 'file:updated') {
      Toast.info(`📄 Arquivo atualizado: ${payload.title || payload.slug}`);
    } else if (event === 'file:created') {
      Toast.success(`📄 Novo arquivo: ${payload.title || payload.slug}`);
    } else if (event === 'file:deleted') {
      Toast.warning(`🗑️ Arquivo deletado: ${payload.slug}`);
    } else if (event === 'graph:updated') {
      // Recarregar grafo quando houver mudanças
      this.loadInitialGraphData();
    }
  }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.start();
});