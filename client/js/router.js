import { store } from './store.js';
import { el, html, mount } from './utils/dom.js';
import { FileTree } from './components/FileTree.js';
import { Editor } from './components/Editor.js';
import { GraphView3D } from './components/GraphView3D.js';
import { Roadmap } from './components/Roadmap.js';
import { Dashboard } from './components/Dashboard.js';
import { KanbanBoard } from './components/KanbanBoard.js';
import { MindMap3D } from './components/MindMap3D.js';
import { FlowsPage } from './components/FlowsPage.js';

class Router {
  constructor() {
    this.mainContent = el('#main-content');

    this.routes = {
      cosmos: () => {
        if (window.app) {
          window.app.scrollToSolar();
          if (window.globeScene && window.globeScene.mode !== 'solar') {
            window.globeScene.transitionTo('solar');
          }
        }
        const template = `<div id="dashboard-view-container" class="h-full"></div>`;
        mount(this.mainContent, html(template));
        const dashboard = new Dashboard('dashboard-view-container');
        dashboard.loadAndRender();
      },
      dashboard: () => {
        const template = `<div id="dashboard-view-container" class="h-full"></div>`;
        mount(this.mainContent, html(template));
        const dashboard = new Dashboard('dashboard-view-container');
        dashboard.loadAndRender();
      },
      explorer: () => {
        const template = `<div id="explorer-view-container" class="h-full"></div>`;
        mount(this.mainContent, html(template));
        const fileTree = new FileTree('explorer-view-container');
        fileTree.loadAndRender();
      },
      editor: (params) => {
        const slug = params[0];
        if (!slug) {
          window.location.hash = '#explorer';
          return;
        }
        const template = `<div id="editor-view-container" class="h-full"></div>`;
        mount(this.mainContent, html(template));
        const editor = new Editor('editor-view-container');
        editor.loadArticle(slug);
      },
      graph: () => {
        if (window.app) {
          window.app.loadInitialGraphData();
        }
        // Exibir o grafo da tela inicial se disponível
        if (window.globeScene) {
          if (window.globeScene.mode !== 'graph') {
            window.globeScene.transitionTo('graph');
          }
        }
        if (window.app) {
          window.app.scrollToSolar();
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Renderizar aviso caso o usuário role a tela para baixo
        const template = `
          <div class="h-full flex flex-col items-center justify-center p-8 text-center animate-fade-in">
            <div class="w-16 h-16 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center text-accent mb-6 animate-pulse">
              <i data-lucide="git-fork" class="w-8 h-8"></i>
            </div>
            <h1 class="text-2xl font-bold mb-2">Constelação de Conhecimento Ativa</h1>
            <p class="text-sm text-textSecondary max-w-md">O mapa interativo tridimensional está ativo no plano estelar superior da tela.</p>
            <button onclick="if(window.app){window.app.scrollToSolar();}else{window.scrollTo({top:0, behavior:'smooth'});}" class="mt-6 bg-accent hover:bg-accent-hover text-black text-xs font-semibold py-2.5 px-6 rounded-xl transition-all">
              Subir para o Cosmos
            </button>
          </div>
        `;
        mount(this.mainContent, html(template));
        lucide.createIcons({ node: this.mainContent });
      },
      mindmaps: (params) => {
        const id = params[0];
        const template = `<div id="mindmaps-view-container" class="h-full"></div>`;
        mount(this.mainContent, html(template));
        const mindmap = new MindMap3D('mindmaps-view-container');
        mindmap.loadAndRender(id);
      },
      roadmaps: (params) => {
        const slug = params[0];
        const template = `<div id="roadmaps-view-container" class="h-full"></div>`;
        mount(this.mainContent, html(template));
        const roadmapView = new Roadmap('roadmaps-view-container');
        roadmapView.loadAndRender(slug);
      },
      kanban: () => {
        const template = `<div id="kanban-view-container" class="h-full"></div>`;
        mount(this.mainContent, html(template));
        const kanban = new KanbanBoard('kanban-view-container');
        kanban.loadAndRender();
      },
      fluxos: () => {
        const template = `<div id="fluxos-view-container" class="h-full"></div>`;
        mount(this.mainContent, html(template));
        const flowsPage = new FlowsPage('fluxos-view-container');
        flowsPage.loadAndRender();
      },
      settings: () => this.renderSettingsPage()
    };

    window.addEventListener('hashchange', () => this.handleRouting());
  }

  init() {
    this.handleRouting();
  }

  handleRouting() {
    // Pegar hash atual sem o caractere '#'
    let hash = window.location.hash.slice(1);

    // Se estiver vazio, redirecionar para dashboard por padrão
    if (!hash || hash === '') {
      window.location.hash = '#dashboard';
      return;
    }

    // Atualizar no store global
    store.setState('currentRoute', hash);

    // Separar rota de parâmetros (ex: editor/backend/python)
    const [path, ...params] = hash.split('/');

    // Transicionar de volta para modo solar se navegar para outra rota
    if (path !== 'graph' && window.globeScene && window.globeScene.mode === 'graph') {
      window.globeScene.transitionTo('solar');
    }

    const renderFn = this.routes[path];

    if (renderFn) {
      // Atualiza o breadcrumb superior
      this.updateBreadcrumb(path, params);
      // Renderiza
      renderFn(params);
    } else {
      // Rota não encontrada
      this.renderNotFound(path);
    }
  }

  updateBreadcrumb(path, params) {
    const breadcrumbContainer = el('#breadcrumb-container');
    if (!breadcrumbContainer) return;

    // Encontrar rótulo correspondente
    const labels = {
      dashboard: 'Painel Inicial',
      explorer: 'Explorador',
      editor: 'Editor',
      graph: 'Visão em Grafo',
      mindmaps: 'Mapas Mentais',
      roadmaps: 'Roadmaps',
      kanban: 'Kanban',
      projects: 'Projetos',
      settings: 'Configurações'
    };

    const pageLabel = labels[path] || path;

    let template = `
      <span class="text-textMuted select-none">Aegis</span>
      <span class="text-textMuted select-none">/</span>
      <a href="#${path}" class="font-semibold hover:text-accent transition-colors">${pageLabel}</a>
    `;

    if (params && params.length > 0) {
      params.forEach((param, index) => {
        const fullParamPath = `#${path}/${params.slice(0, index + 1).join('/')}`;
        template += `
          <span class="text-textMuted select-none">/</span>
          <a href="${fullParamPath}" class="text-textSecondary hover:text-accent transition-colors">${decodeURIComponent(param)}</a>
        `;
      });
    }

    mount(breadcrumbContainer, html(template));
  }

  renderPlaceholder(title, icon, description) {
    const template = `
      <div class="h-full flex flex-col items-center justify-center p-8 text-center animate-fade-in">
        <div class="w-16 h-16 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center text-accent mb-6">
          <i data-lucide="${icon}" class="w-8 h-8"></i>
        </div>
        <h1 class="text-2xl font-bold mb-2">${title}</h1>
        <p class="text-sm text-textSecondary max-w-md">${description}</p>
        <div class="mt-8 text-xs text-textMuted border border-border bg-surface/30 px-4 py-2 rounded-xl flex items-center gap-2">
          <i data-lucide="info" class="w-3.5 h-3.5 text-accent"></i>
          <span>Este módulo será ativado nas próximas fases de desenvolvimento.</span>
        </div>
      </div>
    `;

    mount(this.mainContent, html(template));
    lucide.createIcons({ node: this.mainContent });
  }

  async renderSettingsPage() {
    try {
      const response = await fetch('/api/settings');
      const settings = await response.json();

      const template = `
        <div class="max-w-2xl mx-auto p-8 flex flex-col gap-8 animate-fade-in">
          <div>
            <h1 class="text-xl font-bold mb-1">Configurações do Aegis</h1>
            <p class="text-xs text-textSecondary">Gerencie suas preferências locais de usuário e segurança.</p>
          </div>
          
          <!-- Bloco Preferências do Sistema -->
          <div class="glass rounded-2xl p-6 flex flex-col gap-4">
            <div class="flex items-center gap-3 border-b border-border/60 pb-3">
              <div class="text-accent">
                <i data-lucide="sliders" class="w-5 h-5"></i>
              </div>
              <h3 class="font-semibold text-sm">Preferências do Estudo</h3>
            </div>
            
            <form id="preferencesForm" class="flex flex-col gap-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-2">
                  <label for="set-pomodoro" class="text-xs text-textSecondary font-medium">Duração do Pomodoro (min)</label>
                  <input type="number" id="set-pomodoro" value="${settings.pomodoro_duration || 25}" class="bg-black/30 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent">
                </div>
                <div class="flex flex-col gap-2">
                  <label for="set-short-break" class="text-xs text-textSecondary font-medium">Pausa Curta (min)</label>
                  <input type="number" id="set-short-break" value="${settings.short_break_duration || 5}" class="bg-black/30 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent">
                </div>
              </div>
              <div class="flex flex-col gap-2">
                <label for="set-theme" class="text-xs text-textSecondary font-medium">Tema Visual</label>
                <select id="set-theme" class="bg-black/30 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent text-textSecondary">
                  <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Dark (Holographic Space)</option>
                  <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Light (Notion White)</option>
                </select>
              </div>
              <button type="submit" class="bg-accent hover:bg-accent-hover text-white text-xs font-semibold py-2.5 px-4 rounded-xl self-start transition-all mt-2 flex items-center gap-2">
                <span>Salvar Preferências</span>
                <i data-lucide="save" class="w-4 h-4"></i>
              </button>
            </form>
          </div>
          
          <!-- Bloco de segurança -->
          <div class="glass rounded-2xl p-6 flex flex-col gap-4">
            <div class="flex items-center gap-3 border-b border-border/60 pb-3">
              <div class="text-accent">
                <i data-lucide="key" class="w-5 h-5"></i>
              </div>
              <h3 class="font-semibold text-sm">Alterar Senha do Sistema</h3>
            </div>
            
            <form id="changePasswordForm" class="flex flex-col gap-4">
              <div class="flex flex-col gap-2">
                <label for="oldPassword" class="text-xs text-textSecondary font-medium">Senha Atual</label>
                <input type="password" id="oldPassword" class="bg-black/30 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent" required>
              </div>
              <div class="flex flex-col gap-2">
                <label for="newPassword" class="text-xs text-textSecondary font-medium">Nova Senha</label>
                <input type="password" id="newPassword" class="bg-black/30 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent" required>
              </div>
              <button type="submit" class="bg-accent hover:bg-accent-hover text-white text-xs font-semibold py-2.5 px-4 rounded-xl self-start transition-all mt-2 flex items-center gap-2">
                <span>Atualizar Senha</span>
                <i data-lucide="save" class="w-4 h-4"></i>
              </button>
            </form>
          </div>
        </div>
      `;

      mount(this.mainContent, html(template));
      lucide.createIcons({ node: this.mainContent });

      // Bind formulários
      const prefForm = el('#preferencesForm', this.mainContent);
      prefForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const updates = {
          pomodoro_duration: el('#set-pomodoro').value,
          short_break_duration: el('#set-short-break').value,
          theme: el('#set-theme').value
        };
        try {
          const res = await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          });
          if (res.ok) {
            alert('Preferências salvas com sucesso!');
          } else {
            alert('Erro ao salvar preferências.');
          }
        } catch (err) {
          alert('Erro de comunicação.');
        }
      });

      const passForm = el('#changePasswordForm', this.mainContent);
      passForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const oldPassword = el('#oldPassword').value;
        const newPassword = el('#newPassword').value;

        try {
          const response = await fetch('/api/auth/password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldPassword, newPassword })
          });
          const data = await response.json();

          if (response.ok) {
            alert('Senha atualizada com sucesso. Faça login novamente.');
            window.location.reload();
          } else {
            alert(data.error || 'Erro ao atualizar senha');
          }
        } catch (err) {
          alert('Erro de comunicação.');
        }
      });
    } catch (err) {
      console.error(err);
    }
  }

  renderNotFound(path) {
    const template = `
      <div class="h-full flex flex-col items-center justify-center p-8 text-center">
        <div class="text-error mb-4">
          <i data-lucide="alert-triangle" class="w-12 h-12"></i>
        </div>
        <h1 class="text-xl font-bold mb-2">Página Não Encontrada</h1>
        <p class="text-sm text-textSecondary mb-6">A rota '#${path}' não pôde ser encontrada no sistema.</p>
        <a href="#dashboard" class="bg-accent hover:bg-accent-hover px-4 py-2 rounded-xl text-xs font-semibold transition-all">
          Voltar ao Painel
        </a>
      </div>
    `;

    mount(this.mainContent, html(template));
    lucide.createIcons({ node: this.mainContent });
  }
}

export const router = new Router();
