import { html, mount, el, on } from '../utils/dom.js';
import { api } from '../utils/api.js';
import { Toast } from './Toast.js';

export class ProjectsPage {
  constructor(containerId) {
    this.container = el(`#${containerId}`);
    this.projects = [];
  }

  async loadAndRender() {
    try {
      this.projects = await api.get('/api/projects') || [];
      this.render();
    } catch (err) {
      console.error(err);
      Toast.error('Erro ao carregar lista de projetos.');
    }
  }

  render() {
    if (!this.container) return;

    const template = `
      <div class="h-full flex flex-col p-6 animate-fade-in gap-6 overflow-y-auto">
        <!-- Topo -->
        <div class="flex items-center justify-between flex-shrink-0">
          <div>
            <h1 class="text-xl font-bold">Projetos Acadêmicos</h1>
            <p class="text-xs text-textSecondary">Gerencie metas integradas, cronogramas de estudo e taxa de conclusão de entregas.</p>
          </div>
        </div>

        <!-- Grid de Projetos -->
        ${this.projects.length === 0 ? `
          <div class="flex-1 flex flex-col items-center justify-center text-center p-8 bg-surface/10 border border-border/40 rounded-2xl">
            <div class="w-12 h-12 bg-border rounded-xl flex items-center justify-center text-textSecondary mb-4">
              <i data-lucide="briefcase" class="w-6 h-6"></i>
            </div>
            <h4 class="font-bold text-sm mb-1">Nenhum projeto encontrado</h4>
            <p class="text-xs text-textSecondary max-w-xs">Adicione arquivos Markdown com a tag frontmatter "type: project" e veja-os aparecer aqui automaticamente.</p>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            ${this.projects.map(proj => {
              const progressPercent = Math.round(proj.progress * 100);
              
              const accentColor = proj.color === 'yellow' ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10'
                : proj.color === 'green' ? 'border-green-500 text-green-500 bg-green-500/10'
                : proj.color === 'purple' ? 'border-purple-500 text-purple-500 bg-purple-500/10'
                : 'border-accent text-accent bg-accent/10';

              const statusColor = proj.status === 'completed' ? 'text-success border-success/30 bg-success/5'
                : proj.status === 'active' ? 'text-warning border-warning/30 bg-warning/5'
                : proj.status === 'paused' ? 'text-textMuted border-border bg-surface'
                : 'text-accent border-accent/30 bg-accent/5';

              const statusText = proj.status === 'completed' ? 'Concluído'
                : proj.status === 'active' ? 'Ativo'
                : proj.status === 'paused' ? 'Pausado'
                : 'Planejamento';

              return `
                <!-- Card de Projeto -->
                <div 
                  class="glass rounded-2xl p-6 border border-border/40 hover:border-accent/40 transition-all flex flex-col gap-4 relative"
                  data-project-id="${proj.id}"
                >
                  <!-- Linha 1: Ícone & Título -->
                  <div class="flex items-start gap-4">
                    <div class="w-10 h-10 border rounded-xl flex items-center justify-center flex-shrink-0 ${accentColor}">
                      <i data-lucide="${proj.icon || 'briefcase'}" class="w-5 h-5"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between gap-3">
                        <h3 class="font-bold text-sm text-textPrimary truncate">${proj.name}</h3>
                        <span class="text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${statusColor}">${statusText}</span>
                      </div>
                      
                      <!-- Link nota projeto -->
                      <a href="#editor/${proj.slug}" class="text-[10px] text-accent hover:underline flex items-center gap-1 mt-1 font-medium select-none">
                        <i data-lucide="file-text" class="w-3.5 h-3.5"></i>
                        <span>Abrir Nota do Projeto</span>
                      </a>
                    </div>
                  </div>

                  <p class="text-xs text-textSecondary line-clamp-2 leading-relaxed">${proj.description || 'Sem descrição'}</p>

                  <!-- Horas de Estudo -->
                  <div class="flex items-center justify-between text-[10px] text-textMuted font-bold uppercase tracking-wider select-none border-y border-border/20 py-2.5 my-1">
                    <span class="flex items-center gap-1"><i data-lucide="clock" class="w-3.5 h-3.5"></i> Horas Estudadas:</span>
                    <span class="text-textPrimary">${Math.round(proj.studied_hours * 10) / 10}h / ${proj.estimated_hours || 0}h estimadas</span>
                  </div>

                  <!-- Ajuste de Progresso e Status -->
                  <div class="flex flex-col gap-3 select-none">
                    <!-- Barra de progresso slider -->
                    <div class="flex flex-col gap-1.5">
                      <div class="flex items-center justify-between text-[10px] text-textSecondary font-semibold">
                        <span>Ajustar Progresso</span>
                        <span class="text-textPrimary font-bold">${progressPercent}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value="${progressPercent}" 
                        class="project-progress-slider w-full accent-accent bg-black/40 h-1.5 rounded-lg border border-border/20 appearance-none cursor-pointer"
                        data-project-id="${proj.id}"
                      >
                    </div>

                    <!-- Alterar Estado -->
                    <div class="flex items-center justify-between gap-4">
                      <span class="text-[10px] text-textSecondary font-semibold">Alterar Estado:</span>
                      <select 
                        class="project-status-select bg-black/40 border border-border/80 rounded-xl px-3 py-1.5 text-xs text-textSecondary focus:outline-none focus:border-accent"
                        data-project-id="${proj.id}"
                      >
                        <option value="planning" ${proj.status === 'planning' ? 'selected' : ''}>Planejamento</option>
                        <option value="active" ${proj.status === 'active' ? 'selected' : ''}>Ativo</option>
                        <option value="paused" ${proj.status === 'paused' ? 'selected' : ''}>Pausado</option>
                        <option value="completed" ${proj.status === 'completed' ? 'selected' : ''}>Concluído</option>
                      </select>
                    </div>
                  </div>

                  <!-- Tags -->
                  ${proj.tags && proj.tags.length > 0 ? `
                    <div class="flex flex-wrap gap-1.5 mt-2">
                      ${proj.tags.map(tag => `
                        <span class="text-[9px] px-2 py-0.5 rounded-md border border-border/40 bg-surface/30 text-textSecondary font-semibold">
                          #${tag}
                        </span>
                      `).join('')}
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;

    mount(this.container, html(template));
    lucide.createIcons({ node: this.container });

    this.setupEvents();
  }

  setupEvents() {
    // 1. Atualizar progresso via Slider
    const sliders = this.container.querySelectorAll('.project-progress-slider');
    sliders.forEach(slider => {
      on(slider, 'change', async (e) => {
        const id = slider.getAttribute('data-project-id');
        const progress = parseFloat(e.target.value) / 100.0;
        
        // Encontrar status atual
        const project = this.projects.find(p => p.id == id);
        let status = project ? project.status : 'active';
        
        if (progress === 1.0) {
          status = 'completed';
        } else if (progress > 0 && status === 'planning') {
          status = 'active';
        }

        try {
          await api.put(`/api/projects/${id}`, { status, progress });
          Toast.success('Progresso do projeto atualizado!');
          await this.loadAndRender();
        } catch (err) {
          console.error(err);
          Toast.error('Erro ao atualizar progresso.');
        }
      });
    });

    // 2. Atualizar status via Dropdown
    const selects = this.container.querySelectorAll('.project-status-select');
    selects.forEach(select => {
      on(select, 'change', async (e) => {
        const id = select.getAttribute('data-project-id');
        const status = e.target.value;

        // Encontrar progresso atual
        const project = this.projects.find(p => p.id == id);
        let progress = project ? project.progress : 0.0;

        if (status === 'completed') {
          progress = 1.0;
        }

        try {
          await api.put(`/api/projects/${id}`, { status, progress });
          Toast.success('Estado do projeto atualizado!');
          await this.loadAndRender();
        } catch (err) {
          console.error(err);
          Toast.error('Erro ao atualizar estado.');
        }
      });
    });
  }
}
