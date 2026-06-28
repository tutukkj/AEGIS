import { html, mount, el, on } from '../utils/dom.js';
import { api } from '../utils/api.js';
import { Toast } from './Toast.js';

export class Roadmap {
  constructor(containerId) {
    this.container = el(`#${containerId}`);
    this.activeRoadmap = null; // Detalhes do roadmap aberto
  }

  async loadAndRender(roadmapSlug = null) {
    if (roadmapSlug) {
      // Carregar um roadmap detalhado
      await this.loadDetail(roadmapSlug);
    } else {
      // Listar todos os roadmaps
      await this.loadList();
    }
  }

  async loadList() {
    try {
      const roadmaps = await api.get('/api/roadmaps');
      this.renderList(roadmaps);
    } catch (err) {
      console.error(err);
      Toast.error('Erro ao carregar lista de roadmaps.');
    }
  }

  async loadDetail(slug) {
    try {
      this.activeRoadmap = await api.get(`/api/roadmaps/${slug}`);
      this.renderDetail();
    } catch (err) {
      console.error(err);
      Toast.error('Erro ao carregar detalhes do roadmap.');
      window.location.hash = '#roadmaps';
    }
  }

  renderList(roadmaps) {
    if (!this.container) return;

    const template = `
      <div class="h-full flex flex-col p-6 animate-fade-in">
        <div class="mb-6">
          <h1 class="text-xl font-bold">Roadmaps de Aprendizado</h1>
          <p class="text-xs text-textSecondary">Selecione uma trilha para acompanhar seu progresso de estudo e checklists.</p>
        </div>

        ${roadmaps.length === 0 ? `
          <div class="flex-1 flex flex-col items-center justify-center text-center p-8 bg-surface/10 border border-border/40 rounded-2xl">
            <div class="w-12 h-12 bg-border rounded-xl flex items-center justify-center text-textSecondary mb-4">
              <i data-lucide="milestone" class="w-6 h-6"></i>
            </div>
            <h4 class="font-bold text-sm mb-1">Nenhum roadmap encontrado</h4>
            <p class="text-xs text-textSecondary max-w-xs">Adicione arquivos JSON de trilhas na pasta storage/roadmaps para indexá-las.</p>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            ${roadmaps.map(roadmap => {
              const progress = roadmap.total_nodes > 0 
                ? Math.round((roadmap.completed_nodes / roadmap.total_nodes) * 100) 
                : 0;
                
              const accentColor = roadmap.color === 'yellow' ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10'
                : roadmap.color === 'blue' ? 'border-blue-500 text-blue-500 bg-blue-500/10'
                : roadmap.color === 'green' ? 'border-green-500 text-green-500 bg-green-500/10'
                : roadmap.color === 'orange' ? 'border-orange-500 text-orange-500 bg-orange-500/10'
                : roadmap.color === 'purple' ? 'border-purple-500 text-purple-500 bg-purple-500/10'
                : 'border-accent text-accent bg-accent/10';

              return `
                <a 
                  href="#roadmaps/${roadmap.slug}" 
                  class="glass hover:bg-surface-hover rounded-2xl p-6 transition-all duration-300 border border-border/40 hover:border-accent/40 flex flex-col gap-4 group"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 border rounded-xl flex items-center justify-center ${accentColor}">
                      <i data-lucide="${roadmap.icon || 'milestone'}" class="w-5 h-5"></i>
                    </div>
                    <div>
                      <h3 class="font-bold text-sm text-textPrimary group-hover:text-accent transition-colors">${roadmap.name}</h3>
                      <p class="text-[10px] text-textMuted font-medium uppercase tracking-wider">${roadmap.total_nodes} tópicos</p>
                    </div>
                  </div>
                  
                  <p class="text-xs text-textSecondary line-clamp-2 leading-relaxed">${roadmap.description || 'Sem descrição'}</p>
                  
                  <!-- Barra de Progresso -->
                  <div class="flex flex-col gap-1.5 mt-2">
                    <div class="flex items-center justify-between text-[10px] text-textSecondary font-semibold">
                      <span>Progresso da Trilha</span>
                      <span>${progress}%</span>
                    </div>
                    <div class="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-border/40">
                      <div class="h-full bg-accent transition-all duration-500" style="width: ${progress}%"></div>
                    </div>
                  </div>
                </a>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;

    mount(this.container, html(template));
    lucide.createIcons({ node: this.container });
  }

  renderDetail() {
    if (!this.container || !this.activeRoadmap) return;
    const roadmap = this.activeRoadmap.metadata;
    const nodes = this.activeRoadmap.nodes;

    const progress = roadmap.total_nodes > 0 
      ? Math.round((roadmap.completed_nodes / roadmap.total_nodes) * 100) 
      : 0;

    const accentColor = roadmap.color === 'yellow' ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10'
      : roadmap.color === 'blue' ? 'border-blue-500 text-blue-500 bg-blue-500/10'
      : roadmap.color === 'green' ? 'border-green-500 text-green-500 bg-green-500/10'
      : roadmap.color === 'orange' ? 'border-orange-500 text-orange-500 bg-orange-500/10'
      : roadmap.color === 'purple' ? 'border-purple-500 text-purple-500 bg-purple-500/10'
      : 'border-accent text-accent bg-accent/10';

    const template = `
      <div class="h-full flex flex-col p-6 animate-fade-in">
        <!-- Botão Voltar & Cabeçalho -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-border/40 pb-6">
          <div class="flex items-center gap-3">
            <a href="#roadmaps" class="w-8 h-8 rounded-xl bg-black/30 border border-border hover:bg-surface-hover/80 text-textSecondary hover:text-textPrimary flex items-center justify-center transition-all select-none">
              <i data-lucide="arrow-left" class="w-4 h-4"></i>
            </a>
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 border rounded-xl flex items-center justify-center ${accentColor}">
                <i data-lucide="${roadmap.icon || 'milestone'}" class="w-5 h-5"></i>
              </div>
              <div>
                <h1 class="text-lg font-bold">${roadmap.name}</h1>
                <p class="text-xs text-textSecondary">${roadmap.description || 'Sem descrição'}</p>
              </div>
            </div>
          </div>

          <!-- Progresso Geral -->
          <div class="min-w-[180px] flex flex-col gap-1.5 select-none">
            <div class="flex items-center justify-between text-xs text-textSecondary font-semibold">
              <span>Progresso geral</span>
              <span>${progress}% (${roadmap.completed_nodes}/${roadmap.total_nodes})</span>
            </div>
            <div class="w-full bg-black/40 h-2.5 rounded-full overflow-hidden border border-border/40">
              <div id="overall-progress-bar" class="h-full bg-accent transition-all duration-500" style="width: ${progress}%"></div>
            </div>
          </div>
        </div>

        <!-- Lista de Tópicos do Roadmap -->
        <div class="flex-1 overflow-y-auto max-w-3xl mx-auto w-full pr-2 flex flex-col gap-6 relative">
          ${nodes.map((node, index) => {
            const isCompleted = node.status === 'completed';
            const isInProgress = node.status === 'in_progress';
            const isSkipped = node.status === 'skipped';
            
            const cardBorder = isCompleted ? 'border-success/30 bg-success/5'
              : isInProgress ? 'border-warning/30 bg-warning/5'
              : isSkipped ? 'border-border/30 bg-black/10 opacity-70'
              : 'border-border/40 bg-surface/20';

            const statusText = isCompleted ? 'Concluído'
              : isInProgress ? 'Em Progresso'
              : isSkipped ? 'Pulado'
              : 'Não Iniciado';

            const statusColor = isCompleted ? 'text-success'
              : isInProgress ? 'text-warning'
              : isSkipped ? 'text-textMuted'
              : 'text-textSecondary';

            return `
              <div 
                class="roadmap-node-card glass rounded-2xl p-5 border transition-all-300 flex flex-col gap-4 relative ${cardBorder}"
                data-node-id="${node.node_id}"
              >
                <!-- Linha superior: Informações e Controles -->
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div class="flex items-center gap-3">
                    <span class="w-6 h-6 rounded-full bg-black/30 text-[10px] font-bold border border-border/60 flex items-center justify-center select-none">${index + 1}</span>
                    <div>
                      <h3 class="font-bold text-xs text-textPrimary">${node.title}</h3>
                      <!-- Link para Artigo -->
                      ${node.article_slug ? `
                        <a href="#editor/${node.article_slug}" class="text-[10px] text-accent hover:underline flex items-center gap-1 mt-0.5 font-medium">
                          <i data-lucide="file-text" class="w-3 h-3"></i>
                          <span>Ver Nota: ${node.article_title || node.article_slug}</span>
                        </a>
                      ` : `
                        <span class="text-[10px] text-textMuted flex items-center gap-1 mt-0.5">
                          <i data-lucide="link-2-off" class="w-3 h-3"></i>
                          <span>Nenhuma nota vinculada</span>
                        </span>
                      `}
                    </div>
                  </div>

                  <!-- Seletor de Status -->
                  <div class="flex items-center gap-3 select-none">
                    <span class="text-[10px] font-semibold uppercase tracking-wider ${statusColor}">${statusText}</span>
                    <select 
                      class="node-status-select bg-black/40 border border-border/80 rounded-xl px-2.5 py-1 text-[11px] text-textSecondary focus:outline-none focus:border-accent"
                      data-node-id="${node.node_id}"
                    >
                      <option value="not_started" ${node.status === 'not_started' ? 'selected' : ''}>A Fazer</option>
                      <option value="in_progress" ${node.status === 'in_progress' ? 'selected' : ''}>Estudando</option>
                      <option value="completed" ${node.status === 'completed' ? 'selected' : ''}>Concluído</option>
                      <option value="skipped" ${node.status === 'skipped' ? 'selected' : ''}>Pular</option>
                    </select>
                  </div>
                </div>

                <!-- Checklist de Sub-itens -->
                ${node.checklist && node.checklist.length > 0 ? `
                  <div class="border-t border-border/40 pt-4 mt-1 flex flex-col gap-2.5">
                    <div class="flex items-center justify-between text-[10px] text-textMuted font-bold uppercase tracking-wider select-none">
                      <span>Checklist de Tarefas</span>
                      <span>${node.checklist.filter(c => c.done).length}/${node.checklist.length}</span>
                    </div>
                    <div class="flex flex-col gap-2 pl-1 select-none">
                      ${node.checklist.map((item, cIndex) => `
                        <label class="flex items-start gap-2.5 cursor-pointer text-xs text-textSecondary hover:text-textPrimary group">
                          <input 
                            type="checkbox" 
                            class="node-checklist-checkbox mt-0.5 border-border text-accent focus:ring-accent rounded bg-black/40 transition-colors"
                            data-node-id="${node.node_id}"
                            data-checklist-index="${cIndex}"
                            ${item.done ? 'checked' : ''}
                          >
                          <span class="leading-relaxed ${item.done ? 'line-through text-textMuted' : ''}">${item.text}</span>
                        </label>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    mount(this.container, html(template));
    lucide.createIcons({ node: this.container });

    // Configurar Eventos para Controles de Nó
    this.setupNodeControls();
  }

  setupNodeControls() {
    if (!this.container || !this.activeRoadmap) return;
    const slug = this.activeRoadmap.metadata.slug;

    // 1. Alteração de Status
    const statusSelects = this.container.querySelectorAll('.node-status-select');
    statusSelects.forEach(select => {
      on(select, 'change', async (e) => {
        const nodeId = select.getAttribute('data-node-id');
        const status = e.target.value;
        
        try {
          const updated = await api.put(`/api/roadmaps/${slug}/nodes/${nodeId}/status`, { status });
          if (updated) {
            Toast.success('Status atualizado!');
            this.activeRoadmap = updated;
            this.renderDetail();
          }
        } catch (err) {
          console.error(err);
          Toast.error('Erro ao atualizar status.');
        }
      });
    });

    // 2. Toggles de Checklist
    const checkboxes = this.container.querySelectorAll('.node-checklist-checkbox');
    checkboxes.forEach(cb => {
      on(cb, 'change', async (e) => {
        const nodeId = cb.getAttribute('data-node-id');
        const index = parseInt(cb.getAttribute('data-checklist-index'));
        
        // Encontrar o nó localmente para atualizar
        const node = this.activeRoadmap.nodes.find(n => n.node_id === nodeId);
        if (!node) return;

        // Atualizar checkbox
        node.checklist[index].done = e.target.checked;
        
        try {
          const updated = await api.put(`/api/roadmaps/${slug}/nodes/${nodeId}/checklist`, {
            checklist: node.checklist
          });
          if (updated) {
            this.activeRoadmap = updated;
            this.renderDetail();
          }
        } catch (err) {
          console.error(err);
          Toast.error('Erro ao atualizar checklist.');
        }
      });
    });
  }
}
