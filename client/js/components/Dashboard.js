import { html, mount, el } from '../utils/dom.js';
import { api } from '../utils/api.js';
import { Toast } from './Toast.js';

export class Dashboard {
  constructor(containerId) {
    this.container = el(`#${containerId}`);
  }

  async loadAndRender() {
    try {
      const dashboardData = await api.get('/api/dashboard');
      this.render(dashboardData);
    } catch (err) {
      console.error(err);
      Toast.error('Erro ao carregar painel inicial.');
    }
  }

  render(data) {
    if (!this.container) return;

    const { stats, weeklyData, heatmap, recentArticles, activeRoadmaps } = data;

    // Calcular progresso das notas
    const articlesProgress = stats.totalArticles > 0
      ? Math.round((stats.completedArticles / stats.totalArticles) * 100)
      : 0;

    // Gerar HTML do Heatmap
    const heatmapHTML = this.generateHeatmapHTML(heatmap);

    const template = `
      <div class="h-full flex flex-col p-6 animate-fade-in gap-6 overflow-y-auto">
        <!-- Boas-vindas -->
        <div>
          <h1 class="text-xl font-bold">Painel de Aprendizado</h1>
          <p class="text-xs text-textSecondary">Monitore seu progresso acadêmico, tempo de foco e metas diárias.</p>
        </div>

        <!-- Linha de Estatísticas Rápidas -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Card Horas Estudadas -->
          <div class="glass border border-border/40 p-4 rounded-2xl flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center border border-accent/20">
              <i data-lucide="clock" class="w-5 h-5"></i>
            </div>
            <div>
              <p class="text-[10px] text-textMuted uppercase font-bold tracking-wider">Tempo Estudado</p>
              <h3 class="text-base font-extrabold text-textPrimary">${stats.totalStudyHours}h</h3>
            </div>
          </div>

          <!-- Card Pomodoros Concluídos -->
          <div class="glass border border-border/40 p-4 rounded-2xl flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center border border-orange-500/20">
              <i data-lucide="flame" class="w-5 h-5"></i>
            </div>
            <div>
              <p class="text-[10px] text-textMuted uppercase font-bold tracking-wider">Pomodoros</p>
              <h3 class="text-base font-extrabold text-textPrimary">${stats.totalPomodoros} concluídos</h3>
            </div>
          </div>

          <!-- Card Notas Concluídas -->
          <div class="glass border border-border/40 p-4 rounded-2xl flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center border border-success/20">
              <i data-lucide="check-circle" class="w-5 h-5"></i>
            </div>
            <div>
              <p class="text-[10px] text-textMuted uppercase font-bold tracking-wider">Notas Concluídas</p>
              <h3 class="text-base font-extrabold text-textPrimary">${stats.completedArticles} / ${stats.totalArticles}</h3>
            </div>
          </div>

          <!-- Card Progresso Geral -->
          <div class="glass border border-border/40 p-4 rounded-2xl flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center border border-cyan-500/20">
              <i data-lucide="trending-up" class="w-5 h-5"></i>
            </div>
            <div class="flex-1">
              <p class="text-[10px] text-textMuted uppercase font-bold tracking-wider">Taxa de Conclusão</p>
              <div class="flex items-center justify-between gap-2 mt-0.5">
                <h3 class="text-base font-extrabold text-textPrimary">${articlesProgress}%</h3>
                <div class="w-16 bg-black/40 h-2 rounded-full overflow-hidden border border-border/20">
                  <div class="h-full bg-cyan-500" style="width: ${articlesProgress}%"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Seção Central: Heatmap de Estudo (GitHub Style) -->
        <div class="glass border border-border/40 p-5 rounded-2xl flex flex-col gap-4">
          <div class="flex items-center justify-between border-b border-border/20 pb-2.5">
            <div>
              <h3 class="font-bold text-xs text-textPrimary">Consistência de Foco (Último Ano)</h3>
              <p class="text-[10px] text-textSecondary">Frequência e duração das suas sessões de estudo diárias.</p>
            </div>
            <div class="flex items-center gap-1.5 text-[9px] text-textMuted font-medium select-none">
              <span>Menos</span>
              <span class="w-2.5 h-2.5 rounded-sm bg-border/20"></span>
              <span class="w-2.5 h-2.5 rounded-sm bg-emerald-900/50"></span>
              <span class="w-2.5 h-2.5 rounded-sm bg-emerald-700/70"></span>
              <span class="w-2.5 h-2.5 rounded-sm bg-emerald-500/90"></span>
              <span class="w-2.5 h-2.5 rounded-sm bg-emerald-400"></span>
              <span>Mais</span>
            </div>
          </div>
          
          <!-- Heatmap Container -->
          <div class="overflow-x-auto pb-2 custom-scrollbar">
            <div class="flex flex-col gap-1 min-w-[700px]">
              ${heatmapHTML}
            </div>
          </div>
        </div>

        <!-- Seção Inferior: Trilha Ativa (Esquerda) e Notas Recentes (Direita) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Trilhas Ativas -->
          <div class="glass border border-border/40 p-5 rounded-2xl flex flex-col gap-4">
            <div class="flex items-center justify-between border-b border-border/20 pb-2.5">
              <h3 class="font-bold text-xs text-textPrimary">Trilhas de Aprendizado Ativas</h3>
              <a href="#roadmaps" class="text-[10px] text-accent hover:underline font-semibold">Ver todas</a>
            </div>

            ${activeRoadmaps.length === 0 ? `
              <div class="py-8 text-center text-xs text-textMuted flex flex-col items-center gap-2">
                <i data-lucide="milestone" class="w-5 h-5"></i>
                <span>Nenhuma trilha iniciada. Visite a aba Roadmaps!</span>
              </div>
            ` : `
              <div class="flex flex-col gap-4">
                ${activeRoadmaps.map(rm => {
                  const progress = rm.total_nodes > 0 
                    ? Math.round((rm.completed_nodes / rm.total_nodes) * 100) 
                    : 0;
                    
                  const colorClass = rm.color === 'yellow' ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10'
                    : rm.color === 'purple' ? 'border-purple-500 text-purple-500 bg-purple-500/10'
                    : 'border-accent text-accent bg-accent/10';

                  return `
                    <a href="#roadmaps/${rm.slug}" class="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-hover transition-colors border border-border/20">
                      <div class="w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${colorClass}">
                        <i data-lucide="${rm.icon || 'milestone'}" class="w-4 h-4"></i>
                      </div>
                      <div class="flex-1 min-w-0">
                        <h4 class="text-xs font-semibold text-textPrimary truncate">${rm.name}</h4>
                        <div class="flex items-center justify-between text-[9px] text-textMuted mt-1">
                          <span>${progress}% Concluído</span>
                          <span>${rm.completed_nodes}/${rm.total_nodes} Tópicos</span>
                        </div>
                        <div class="w-full bg-black/40 h-1.5 rounded-full overflow-hidden mt-1 border border-border/10">
                          <div class="h-full bg-accent" style="width: ${progress}%"></div>
                        </div>
                      </div>
                    </a>
                  `;
                }).join('')}
              </div>
            `}
          </div>

          <!-- Notas Acessadas Recentemente -->
          <div class="glass border border-border/40 p-5 rounded-2xl flex flex-col gap-4">
            <div class="flex items-center justify-between border-b border-border/20 pb-2.5">
              <h3 class="font-bold text-xs text-textPrimary">Estudos Recentes</h3>
              <a href="#explorer" class="text-[10px] text-accent hover:underline font-semibold">Ver explorador</a>
            </div>

            ${recentArticles.length === 0 ? `
              <div class="py-8 text-center text-xs text-textMuted flex flex-col items-center gap-2">
                <i data-lucide="file-text" class="w-5 h-5"></i>
                <span>Nenhuma nota acessada ainda. Comece a ler notas no Explorador!</span>
              </div>
            ` : `
              <div class="flex flex-col gap-3">
                ${recentArticles.map(art => {
                  const accentColor = art.color === 'yellow' ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10'
                    : art.color === 'green' ? 'border-green-500 text-green-500 bg-green-500/10'
                    : art.color === 'purple' ? 'border-purple-500 text-purple-500 bg-purple-500/10'
                    : 'border-accent text-accent bg-accent/10';

                  const diffText = art.status === 'completed' ? 'Concluído'
                    : art.status === 'studying' ? 'Estudando'
                    : 'A Fazer';

                  const badgeColor = art.status === 'completed' ? 'border-success/30 text-success bg-success/5'
                    : art.status === 'studying' ? 'border-warning/30 text-warning bg-warning/5'
                    : 'border-border/60 text-textMuted bg-surface';

                  return `
                    <a href="#editor/${art.slug}" class="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-hover transition-colors">
                      <div class="flex items-center gap-3 min-w-0">
                        <div class="w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 ${accentColor}">
                          <i data-lucide="${art.icon || 'file-text'}" class="w-4 h-4"></i>
                        </div>
                        <div class="min-w-0">
                          <h4 class="text-xs font-semibold text-textPrimary truncate">${art.title}</h4>
                          <p class="text-[9px] text-textMuted mt-0.5">Acessado em ${new Date(art.last_accessed_at).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                      <span class="text-[9px] px-2 py-0.5 rounded-full border font-semibold ${badgeColor}">
                        ${diffText}
                      </span>
                    </a>
                  `;
                }).join('')}
              </div>
            `}
          </div>
        </div>

        <!-- Seção Gráfico de Tempo Estudado (Últimos 7 dias) -->
        <div class="glass border border-border/40 p-5 rounded-2xl flex flex-col gap-4">
          <div class="border-b border-border/20 pb-2.5">
            <h3 class="font-bold text-xs text-textPrimary">Tempo de Estudo Semanal</h3>
            <p class="text-[10px] text-textSecondary">Minutos dedicados ao foco nos últimos 7 dias.</p>
          </div>

          <div class="flex items-end justify-between gap-4 h-40 pt-4 px-2 select-none">
            ${weeklyData.map(day => {
              const maxMinutes = Math.max(...weeklyData.map(d => d.minutes), 30);
              const heightPercent = Math.min((day.minutes / maxMinutes) * 100, 100);
              
              return `
                <div class="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <!-- Tooltip -->
                  <div class="opacity-0 group-hover:opacity-100 transition-opacity bg-accent text-[9px] text-white px-2 py-0.5 rounded shadow absolute -translate-y-12 pointer-events-none z-10 font-bold">
                    ${day.minutes} min
                  </div>
                  <!-- Barra -->
                  <div 
                    class="w-full max-w-[28px] bg-accent/40 group-hover:bg-accent rounded-t-lg transition-all duration-300 relative" 
                    style="height: ${heightPercent}%"
                  >
                    <!-- Efeito Glow para barras ativas -->
                    ${day.minutes > 0 ? `<div class="absolute inset-0 bg-accent/20 filter blur-sm"></div>` : ''}
                  </div>
                  <!-- Nome do dia -->
                  <span class="text-[10px] text-textMuted font-semibold">${day.day}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

      </div>
    `;

    mount(this.container, html(template));
    lucide.createIcons({ node: this.container });
  }

  generateHeatmapHTML(heatmap) {
    const daysInWeek = 7;
    const totalWeeks = 53;
    const cells = [];
    
    // Configurar as datas
    const today = new Date();
    
    // Encontrar a data de início (53 semanas atrás, alinhada no Domingo)
    const startDate = new Date();
    startDate.setDate(today.getDate() - (totalWeeks * daysInWeek));
    // Ajustar para o primeiro domingo anterior à data de início
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    const weekLabels = [];
    let currentMonth = -1;

    // Criar uma matriz de 7 linhas (dias da semana, de domingo a sábado) por 53 colunas
    const grid = Array.from({ length: daysInWeek }, () => Array(totalWeeks).fill(null));

    let currentDate = new Date(startDate.getTime());

    for (let w = 0; w < totalWeeks; w++) {
      for (let d = 0; d < daysInWeek; d++) {
        if (currentDate <= today) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const studyTime = heatmap[dateStr] || 0; // minutos estudados

          // Determinar cor do bloco baseada nos minutos de estudo
          let colorClass = 'bg-border/10';
          if (studyTime > 0 && studyTime <= 15) colorClass = 'bg-emerald-900/50';
          else if (studyTime > 15 && studyTime <= 30) colorClass = 'bg-emerald-700/70';
          else if (studyTime > 30 && studyTime <= 60) colorClass = 'bg-emerald-500/90';
          else if (studyTime > 60) colorClass = 'bg-emerald-400';

          grid[d][w] = {
            date: dateStr,
            minutes: studyTime,
            colorClass
          };

          // Rotular meses no topo
          if (d === 0) {
            const month = currentDate.getMonth();
            if (month !== currentMonth) {
              weekLabels[w] = currentDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
              currentMonth = month;
            }
          }
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sexta', 'Sáb'];

    // Montar o HTML
    let htmlResult = '';

    // Linha de Cabeçalho dos Meses
    htmlResult += `<div class="flex items-center gap-1 pl-12 text-[8px] text-textMuted font-semibold select-none h-4">`;
    for (let w = 0; w < totalWeeks; w++) {
      const label = weekLabels[w] || '';
      htmlResult += `<div class="w-2.5 text-center flex-shrink-0 text-[8px]" style="margin-right: 2px;">${label}</div>`;
    }
    htmlResult += `</div>`;

    // Linhas dos Dias
    for (let d = 0; d < daysInWeek; d++) {
      const showDayLabel = d % 2 === 1; // Mostrar Seg, Qua, Sex para ficar clean
      const labelText = showDayLabel ? dayLabels[d] : '';

      htmlResult += `
        <div class="flex items-center gap-1">
          <!-- Rótulo do dia -->
          <div class="w-10 text-[8px] text-textMuted font-bold select-none text-right pr-2">${labelText}</div>
          
          <!-- Blocos da semana -->
          ${grid[d].map(cell => {
            if (!cell) {
              return `<div class="w-2.5 h-2.5 bg-transparent rounded-sm flex-shrink-0" style="margin-right: 2px;"></div>`;
            }
            
            const tooltip = `${cell.date}: ${cell.minutes} minutos estudados`;
            return `
              <div 
                class="w-2.5 h-2.5 rounded-sm flex-shrink-0 ${cell.colorClass} border border-black/10 hover:border-textPrimary/40 transition-colors cursor-pointer relative group"
                style="margin-right: 2px;"
                title="${tooltip}"
              >
                <!-- Tooltip hover -->
                <div class="opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 border border-border text-[8px] text-textPrimary px-1.5 py-0.5 rounded shadow absolute -top-8 left-1/2 -translate-x-1/2 pointer-events-none z-20 whitespace-nowrap font-bold">
                  ${cell.minutes} min em ${cell.date.split('-').reverse().join('/')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    return htmlResult;
  }
}
