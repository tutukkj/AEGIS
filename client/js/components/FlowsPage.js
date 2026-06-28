import { html, mount, el, on } from '../utils/dom.js';
import { api } from '../utils/api.js';
import { Toast } from './Toast.js';

export class FlowsPage {
  constructor(containerId) {
    this.container = el(`#${containerId}`);
    this.flows = [];
    this.currentFlow = null;
    this.diagramData = { nodes: [], connections: [] };
    
    // Estados do Editor Visual
    this.selectedNodeId = null;
    this.selectedConnectionId = null;
    this.linkingSourceNodeId = null;
    this.tempLineTarget = null;

    // Listas para vínculos
    this.articles = [];
    this.kanbanCards = [];
  }

  async loadAndRender() {
    try {
      this.flows = await api.get('/api/flows') || [];

      // Carregar artigos
      try {
        this.articles = await api.get('/api/articles') || [];
      } catch (err) {
        console.warn('Erro ao carregar artigos para fluxos:', err);
        this.articles = [];
      }

      // Carregar cartões kanban
      try {
        this.kanbanCards = await api.get('/api/kanban/cards') || [];
      } catch (err) {
        console.warn('Erro ao carregar cartões kanban para fluxos:', err);
        this.kanbanCards = [];
      }
      
      if (this.currentFlow) {
        const refreshed = this.flows.find(f => f.id === this.currentFlow.id);
        if (refreshed) {
          const flowDetails = await api.get(`/api/flows/${refreshed.id}`);
          this.currentFlow = flowDetails;
          this.parseDiagramData(flowDetails.content);
        } else {
          this.currentFlow = null;
        }
      }
      
      this.render();
    } catch (err) {
      console.error(err);
      Toast.error('Erro ao carregar diagramas.');
    }
  }

  parseDiagramData(content) {
    try {
      this.diagramData = JSON.parse(content || '{"nodes":[], "connections":[]}');
    } catch (err) {
      console.warn('Erro ao decodificar dados do diagrama. Inicializando vazio.', err);
      this.diagramData = { nodes: [], connections: [] };
    }
  }

  render() {
    const template = `
      <div class="h-full flex overflow-hidden animate-fade-in font-mono">
        <!-- Sidebar de Diagramas -->
        <div class="w-64 border-r border-border/20 bg-surface/5 flex flex-col flex-shrink-0 select-none">
          <div class="p-4 border-b border-border/20 flex flex-col gap-2">
            <h2 class="text-xs font-bold text-accent uppercase tracking-wider">Fluxogramas & MER</h2>
            <p class="text-[9px] text-textMuted">Crie diagramas conceituais, fluxos de sistema e diagramas de banco de dados.</p>
          </div>
          
          <!-- Lista de Diagramas -->
          <div class="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5 custom-scrollbar">
            ${this.flows.map(flow => `
              <div 
                class="flow-list-item px-3 py-2.5 rounded-xl border border-border/50 bg-surface/10 hover:bg-surface-hover/80 hover:border-accent/40 cursor-pointer transition-all flex items-center justify-between group ${this.currentFlow?.id === flow.id ? 'border-accent/80 bg-accent/5' : ''}"
                data-id="${flow.id}"
              >
                <div class="flex items-center gap-2 truncate">
                  <i data-lucide="git-branch" class="w-3.5 h-3.5 ${this.currentFlow?.id === flow.id ? 'text-accent' : 'text-textSecondary'} flex-shrink-0"></i>
                  <span class="text-xs text-textSecondary font-semibold truncate group-hover:text-textPrimary">${flow.name}</span>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Rodapé com Criador -->
          <div class="p-4 border-t border-border/20 bg-black/20 flex flex-col gap-2">
            <input 
              type="text" 
              id="new-flow-name" 
              placeholder="Nome do Diagrama..." 
              class="w-full bg-black/40 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent text-textPrimary placeholder:text-textMuted"
            >
            <select 
              id="new-flow-type" 
              class="w-full bg-black/40 border border-border rounded-xl px-3 py-2 text-xs text-textSecondary focus:outline-none focus:border-accent"
            >
              <option value="flowchart">Fluxograma</option>
              <option value="er">Modelagem MER</option>
            </select>
            <button 
              id="btn-create-flow" 
              class="bg-accent hover:bg-accent-hover text-white text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1"
            >
              <i data-lucide="plus" class="w-3.5 h-3.5"></i>
              <span>NOVO DIAGRAMA</span>
            </button>
          </div>
        </div>

        <!-- Área Principal de Edição -->
        <div class="flex-1 flex flex-col overflow-hidden relative bg-[#030303]">
          ${!this.currentFlow ? `
            <div class="flex-1 flex flex-col items-center justify-center text-center p-8 select-none">
              <div class="w-12 h-12 bg-surface border border-border/80 rounded-2xl flex items-center justify-center text-textMuted mb-4">
                <i data-lucide="git-branch" class="w-6 h-6"></i>
              </div>
              <h3 class="font-bold text-sm text-textPrimary mb-1">Nenhum Diagrama Aberto</h3>
              <p class="text-xs text-textMuted max-w-xs">Selecione um diagrama na barra lateral ou crie um novo para começar.</p>
            </div>
          ` : `
            <!-- Topbar do Editor -->
            <div class="h-14 border-b border-border/20 px-6 flex items-center justify-between bg-black/20 flex-shrink-0 z-10 select-none">
              <div class="flex items-center gap-3">
                <input 
                  type="text" 
                  id="flow-edit-name" 
                  value="${this.currentFlow.name}" 
                  class="bg-transparent border-none text-sm font-bold text-textPrimary focus:outline-none focus:ring-1 focus:ring-accent/40 rounded px-1.5 py-0.5"
                >
                <span class="text-[9px] text-textMuted uppercase px-1.5 py-0.5 rounded border border-border bg-black/30">
                  ${this.currentFlow.type === 'er' ? 'MER' : 'FLUXOGRAMA'}
                </span>
              </div>
              
              <div class="flex items-center gap-2">
                <button 
                  id="btn-save-flow" 
                  class="bg-accent/10 border border-accent/20 hover:border-accent/60 text-accent hover:bg-accent/20 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                >
                  <i data-lucide="save" class="w-3.5 h-3.5"></i>
                  <span>SALVAR</span>
                </button>
                <button 
                  id="btn-close-editor" 
                  class="text-textMuted hover:text-textPrimary ml-2"
                >
                  <i data-lucide="x" class="w-5 h-5"></i>
                </button>
              </div>
            </div>

            <!-- Toolbar de Caixas (Desenhar) -->
            <div class="h-12 border-b border-border/20 px-6 flex items-center gap-3 bg-black/30 flex-shrink-0 z-10">
              <span class="text-[9px] text-textMuted font-bold uppercase mr-2">Adicionar:</span>
              <button 
                id="btn-add-inicio" 
                class="bg-surface border border-border/80 hover:border-accent/40 text-textSecondary hover:text-textPrimary px-3 py-1 rounded-lg text-[10px] flex items-center gap-1.5 transition-all"
              >
                <span class="w-2.5 h-2.5 bg-accent/20 border border-accent rounded-full"></span>
                <span>INÍCIO/FIM</span>
              </button>
              <button 
                id="btn-add-acao" 
                class="bg-surface border border-border/80 hover:border-accent/40 text-textSecondary hover:text-textPrimary px-3 py-1 rounded-lg text-[10px] flex items-center gap-1.5 transition-all"
              >
                <span class="w-3.5 h-2.5 bg-accent/20 border border-accent rounded"></span>
                <span>PROCESSO</span>
              </button>
              <button 
                id="btn-add-decisao" 
                class="bg-surface border border-border/80 hover:border-accent/40 text-textSecondary hover:text-textPrimary px-3 py-1 rounded-lg text-[10px] flex items-center gap-1.5 transition-all"
              >
                <span class="w-2.5 h-2.5 bg-accent/20 border border-accent rotate-45 transform"></span>
                <span>DECISÃO</span>
              </button>
              <button 
                id="btn-add-dados" 
                class="bg-surface border border-border/80 hover:border-accent/40 text-textSecondary hover:text-textPrimary px-3 py-1 rounded-lg text-[10px] flex items-center gap-1.5 transition-all"
              >
                <span class="w-3.5 h-2.5 bg-accent/20 border border-accent -skew-x-12 transform"></span>
                <span>DADOS</span>
              </button>
              <button 
                id="btn-add-banco" 
                class="bg-surface border border-border/80 hover:border-accent/40 text-textSecondary hover:text-textPrimary px-3 py-1 rounded-lg text-[10px] flex items-center gap-1.5 transition-all"
              >
                <span class="w-3.5 h-3 bg-accent/20 border border-accent rounded-b-sm rounded-t-sm"></span>
                <span>BANCO</span>
              </button>
              <button 
                id="btn-add-documento" 
                class="bg-surface border border-border/80 hover:border-accent/40 text-textSecondary hover:text-textPrimary px-3 py-1 rounded-lg text-[10px] flex items-center gap-1.5 transition-all"
              >
                <span class="w-3.5 h-2.5 bg-accent/20 border border-accent rounded-t-md rounded-bl-md"></span>
                <span>DOCUMENTO</span>
              </button>
            </div>

            <!-- Canvas Container -->
            <div class="flex-1 min-w-0 relative overflow-hidden bg-[#030303]">
              <!-- Grid de fundo estilo holograma -->
              <div class="absolute inset-0 pointer-events-none" style="
                background-image: radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px);
                background-size: 20px 20px;
              "></div>

              <!-- Canvas Interativo -->
              <div 
                id="flow-canvas" 
                class="absolute inset-0 overflow-auto"
              >
                <!-- SVG Overlay para Conexões -->
                <svg id="flow-connections-svg" class="absolute inset-0 pointer-events-none w-full h-full min-w-[2000px] min-h-[2000px]">
                  <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#5EEAD4" />
                    </marker>
                    <marker id="arrow-selected" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#F472B6" />
                    </marker>
                  </defs>
                </svg>

                <!-- Div de nós do canvas -->
                <div id="flow-nodes-container" class="absolute inset-0 w-full h-full min-w-[2000px] min-h-[2000px]"></div>
              </div>

              <!-- Inspector Panel Flutuante -->
              <div 
                id="flow-inspector" 
                class="absolute top-4 right-4 w-72 bg-surface/90 border border-border/80 rounded-2xl p-4 shadow-2xl z-20 backdrop-blur-md"
              ></div>
            </div>
          `}
        </div>
      </div>
    `;

    mount(this.container, html(template));
    lucide.createIcons({ node: this.container });

    this.setupEvents();
    
    if (this.currentFlow) {
      this.renderCanvas();
      this.renderInspector();
    }
  }

  renderCanvas() {
    const container = this.container.querySelector('#flow-nodes-container');
    if (!container) return;

    container.innerHTML = '';

    this.diagramData.nodes.forEach(node => {
      let shapeClass = '';
      let nodeContentHtml = '';

      if (node.shape === 'inicio' || node.shape === 'fim') {
        shapeClass = 'w-40 h-16 border-2 border-accent bg-surface/80 rounded-full flex items-center justify-center text-center text-xs text-textPrimary px-4 font-bold select-none cursor-grab active:cursor-grabbing hover:border-accent-hover transition-colors shadow-lg';
        nodeContentHtml = `<span class="truncate max-w-full">${node.text.replace(/\n/g, ' ')}</span>`;
      } else if (node.shape === 'decisao') {
        shapeClass = 'w-24 h-24 relative select-none cursor-grab active:cursor-grabbing hover:scale-105 transition-transform';
        nodeContentHtml = `
          <div class="absolute inset-0 border-2 border-accent bg-surface/80 rotate-45 rounded-lg hover:border-accent-hover transition-colors shadow-lg"></div>
          <div class="relative z-10 text-center text-[10px] text-textPrimary px-2 font-bold leading-tight truncate max-w-full">
            ${node.text.replace(/\n/g, ' ')}
          </div>
        `;
      } else if (node.shape === 'dados') {
        shapeClass = 'w-40 h-16 relative flex items-center justify-center select-none cursor-grab active:cursor-grabbing hover:scale-102 transition-transform';
        nodeContentHtml = `
          <div class="absolute inset-0 border-2 border-accent bg-surface/80 -skew-x-12 rounded-lg hover:border-accent-hover transition-colors shadow-lg"></div>
          <div class="relative z-10 text-center text-xs text-textPrimary px-4 font-bold leading-tight truncate max-w-full">
            ${node.text.replace(/\n/g, ' ')}
          </div>
        `;
      } else if (node.shape === 'banco') {
        shapeClass = 'w-36 h-20 relative flex items-center justify-center select-none cursor-grab active:cursor-grabbing hover:scale-102 transition-transform';
        nodeContentHtml = `
          <div class="absolute inset-0 border-2 border-accent bg-surface/80 rounded-xl hover:border-accent-hover transition-colors shadow-lg">
            <!-- Top cylinder ellipse -->
            <div class="absolute -top-1 -left-0.5 -right-0.5 h-4 border-2 border-accent bg-[#0a0a0c] rounded-full"></div>
            <!-- Bottom cylinder lines -->
            <div class="absolute -bottom-1 -left-0.5 -right-0.5 h-4 border-2 border-accent bg-[#0a0a0c] rounded-full border-t-0"></div>
          </div>
          <div class="relative z-10 text-center text-xs text-textPrimary px-4 font-bold leading-tight truncate max-w-full mt-2">
            ${node.text.replace(/\n/g, ' ')}
          </div>
        `;
      } else if (node.shape === 'documento') {
        shapeClass = 'w-40 h-16 relative flex items-center justify-center select-none cursor-grab active:cursor-grabbing hover:scale-102 transition-transform';
        nodeContentHtml = `
          <div class="absolute inset-0 border-2 border-accent bg-surface/80 rounded-t-xl rounded-bl-xl hover:border-accent-hover transition-colors shadow-lg" style="border-bottom-right-radius: 28px 12px;"></div>
          <div class="relative z-10 text-center text-xs text-textPrimary px-4 font-bold leading-tight truncate max-w-full">
            ${node.text.replace(/\n/g, ' ')}
          </div>
        `;
      } else {
        // acao / default
        shapeClass = 'w-40 h-16 border-2 border-accent bg-surface/80 rounded-xl flex flex-col items-center justify-center text-center text-xs text-textPrimary px-4 font-bold select-none cursor-grab active:cursor-grabbing hover:border-accent-hover transition-colors shadow-lg';
        nodeContentHtml = `<span class="truncate max-w-full leading-normal whitespace-pre-line">${node.text}</span>`;
      }

      const activeBorder = this.selectedNodeId === node.id ? 'ring-2 ring-pink-400 border-pink-400' : '';
      const linkingGlow = this.linkingSourceNodeId === node.id ? 'ring-2 ring-amber-400 border-amber-400 animate-pulse' : '';

      // Links flutuantes de notas e tarefas
      let linksHtml = '';
      if (node.linkedArticleSlug) {
        linksHtml += `
          <a href="#editor/${node.linkedArticleSlug}" class="no-drag inline-flex items-center gap-0.5 text-[7px] bg-accent/20 hover:bg-accent/40 text-accent border border-accent/30 rounded px-1.5 py-0.5 font-bold uppercase transition-all select-none" title="Abrir Nota">
            <i data-lucide="file-text" class="w-2.5 h-2.5"></i>
            <span>NOTA</span>
          </a>
        `;
      }
      if (node.linkedCardId) {
        linksHtml += `
          <a href="#kanban" class="no-drag inline-flex items-center gap-0.5 text-[7px] bg-pink-500/20 hover:bg-pink-500/40 text-pink-400 border border-pink-500/30 rounded px-1.5 py-0.5 font-bold uppercase transition-all select-none" title="Ver no Kanban">
            <i data-lucide="check-square" class="w-2.5 h-2.5"></i>
            <span>TAREFA</span>
          </a>
        `;
      }
      const linksContainerHtml = linksHtml ? `<div class="absolute -top-3.5 left-2 flex gap-1 z-20">${linksHtml}</div>` : '';

      const nodeEl = document.createElement('div');
      nodeEl.id = `dom-${node.id}`;
      nodeEl.className = `absolute ${shapeClass} ${activeBorder} ${linkingGlow} flex items-center justify-center`;
      nodeEl.style.left = `${node.x}px`;
      nodeEl.style.top = `${node.y}px`;
      nodeEl.innerHTML = `
        ${linksContainerHtml}
        ${nodeContentHtml}
        <!-- Link handle -->
        <div class="no-drag absolute -bottom-2 right-2 w-4 h-4 bg-accent hover:bg-accent-hover border border-black rounded-full flex items-center justify-center text-[10px] text-black font-bold cursor-crosshair shadow-md" data-link-source="${node.id}" title="Conectar">+</div>
      `;

      // Clicar no nó seleciona ou realiza conexão (Click-to-Connect)
      nodeEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.linkingSourceNodeId && this.linkingSourceNodeId !== node.id) {
          const exists = this.diagramData.connections.some(c => c.from === this.linkingSourceNodeId && c.to === node.id);
          if (!exists) {
            this.diagramData.connections.push({
              id: `conn-${Date.now()}`,
              from: this.linkingSourceNodeId,
              to: node.id,
              label: ''
            });
            this.saveFlowData();
          }
          this.linkingSourceNodeId = null;
          this.tempLineTarget = null;
          this.drawConnections();
          this.renderCanvas(); // Limpar brilho amarelado
          return;
        }
        this.selectNode(node.id);
      });

      this.makeDraggable(nodeEl, node);
      this.setupNodeLinking(nodeEl.querySelector('[data-link-source]'), node.id);

      container.appendChild(nodeEl);
    });

    this.drawConnections();
    lucide.createIcons({ node: container });
  }

  makeDraggable(nodeEl, nodeObj) {
    let startX, startY;
    let startLeft, startTop;

    const onMouseDown = (e) => {
      if (e.target.closest('.no-drag')) return;

      startX = e.clientX;
      startY = e.clientY;
      startLeft = nodeObj.x;
      startTop = nodeObj.y;

      const onMouseMove = (moveEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;

        nodeObj.x = startLeft + dx;
        nodeObj.y = startTop + dy;

        // Limites mínimos
        if (nodeObj.x < 10) nodeObj.x = 10;
        if (nodeObj.y < 10) nodeObj.y = 10;

        nodeEl.style.left = `${nodeObj.x}px`;
        nodeEl.style.top = `${nodeObj.y}px`;

        this.drawConnections();
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        
        // Auto-save ao arrastar caixas
        this.saveFlowData();
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    nodeEl.addEventListener('mousedown', onMouseDown);
  }

  setupNodeLinking(handleEl, sourceId) {
    if (!handleEl) return;

    // Clique-para-conectar como alternativa
    handleEl.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.linkingSourceNodeId === sourceId) {
        this.linkingSourceNodeId = null;
        this.tempLineTarget = null;
      } else {
        this.linkingSourceNodeId = sourceId;
        this.tempLineTarget = null;
        Toast.info('Clique no nó de destino para conectar!');
      }
      this.drawConnections();
      this.renderCanvas(); // Adicionar glow amarelado
    });

    const onMouseDown = (e) => {
      e.stopPropagation();
      e.preventDefault();

      this.linkingSourceNodeId = sourceId;
      const canvas = this.container.querySelector('#flow-canvas');
      const rect = canvas.getBoundingClientRect();

      this.tempLineTarget = {
        x: e.clientX - rect.left + canvas.scrollLeft,
        y: e.clientY - rect.top + canvas.scrollTop
      };

      this.drawConnections();

      const onMouseMove = (moveEvent) => {
        this.tempLineTarget = {
          x: moveEvent.clientX - rect.left + canvas.scrollLeft,
          y: moveEvent.clientY - rect.top + canvas.scrollTop
        };
        this.drawConnections();
      };

      const onMouseUp = (upEvent) => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        // Verificar se soltou em cima de algum outro nó
        const targetEl = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
        const targetNodeEl = targetEl ? targetEl.closest('[id^="dom-"]') : null;

        if (targetNodeEl) {
          const targetId = targetNodeEl.id.replace('dom-', '');
          if (targetId && targetId !== sourceId) {
            const exists = this.diagramData.connections.some(c => c.from === sourceId && c.to === targetId);
            if (!exists) {
              this.diagramData.connections.push({
                id: `conn-${Date.now()}`,
                from: sourceId,
                to: targetId,
                label: ''
              });
              this.saveFlowData();
            }
          }
        }

        this.linkingSourceNodeId = null;
        this.tempLineTarget = null;
        this.drawConnections();
        this.renderCanvas();
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    handleEl.addEventListener('mousedown', onMouseDown);
  }

  drawConnections() {
    const svg = this.container.querySelector('#flow-connections-svg');
    if (!svg) return;

    const defs = svg.querySelector('defs');
    svg.innerHTML = '';
    if (defs) svg.appendChild(defs);

    const nodes = this.diagramData.nodes;
    const conns = this.diagramData.connections;
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    const getDims = (shape) => {
      if (shape === 'decisao') return { w: 96, h: 96 };
      if (shape === 'banco') return { w: 144, h: 80 };
      return { w: 160, h: 64 };
    };

    conns.forEach(conn => {
      const fromNode = nodeMap.get(conn.from);
      const toNode = nodeMap.get(conn.to);
      if (!fromNode || !toNode) return;

      const dim1 = getDims(fromNode.shape);
      const w1 = dim1.w;
      const h1 = dim1.h;

      const dim2 = getDims(toNode.shape);
      const w2 = dim2.w;
      const h2 = dim2.h;

      const cx1 = fromNode.x + w1 / 2;
      const cy1 = fromNode.y + h1 / 2;
      const cx2 = toNode.x + w2 / 2;
      const cy2 = toNode.y + h2 / 2;

      const dx = cx2 - cx1;
      const dy = cy2 - cy1;
      const dist = Math.hypot(dx, dy);

      if (dist === 0) return;

      const nx = dx / dist;
      const ny = dy / dist;

      // Pontos das bordas aproximados (com margem de 10px antes do nó de destino para seta caber)
      const startX = cx1 + nx * (w1 / 2);
      const startY = cy1 + ny * (h1 / 2);
      const endX = cx2 - nx * (w2 / 2 + 10);
      const endY = cy2 - ny * (h2 / 2 + 10);

      // Criar a linha
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      const isSelected = this.selectedConnectionId === conn.id;
      
      line.setAttribute('x1', startX);
      line.setAttribute('y1', startY);
      line.setAttribute('x2', endX);
      line.setAttribute('y2', endY);
      line.setAttribute('stroke', isSelected ? '#F472B6' : '#5EEAD4');
      line.setAttribute('stroke-width', isSelected ? '3' : '2');
      line.setAttribute('marker-end', isSelected ? 'url(#arrow-selected)' : 'url(#arrow)');
      line.setAttribute('class', 'cursor-pointer pointer-events-auto');
      line.style.transition = 'stroke 0.2s';
      
      // Clique na linha
      line.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectConnection(conn.id);
      });

      svg.appendChild(line);

      // Texto de label da conexão
      if (conn.label) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', (startX + endX) / 2);
        text.setAttribute('y', (startY + endY) / 2 - 6);
        text.setAttribute('fill', isSelected ? '#F472B6' : '#888888');
        text.setAttribute('font-size', '8px');
        text.setAttribute('text-anchor', 'middle');
        text.textContent = conn.label;
        svg.appendChild(text);
      }
    });

    // Linha temporária de arrasto
    if (this.linkingSourceNodeId && this.tempLineTarget) {
      const sourceNode = nodeMap.get(this.linkingSourceNodeId);
      if (sourceNode) {
        const dim = getDims(sourceNode.shape);
        const cx1 = sourceNode.x + dim.w / 2;
        const cy1 = sourceNode.y + dim.h / 2;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', cx1);
        line.setAttribute('y1', cy1);
        line.setAttribute('x2', this.tempLineTarget.x);
        line.setAttribute('y2', this.tempLineTarget.y);
        line.setAttribute('stroke', '#fbbf24');
        line.setAttribute('stroke-dasharray', '5');
        line.setAttribute('stroke-width', '2');
        svg.appendChild(line);
      }
    }
  }

  selectNode(id) {
    this.selectedNodeId = id;
    this.selectedConnectionId = null;
    this.renderCanvas();
    this.renderInspector();
  }

  selectConnection(id) {
    this.selectedConnectionId = id;
    this.selectedNodeId = null;
    this.renderCanvas();
    this.renderInspector();
  }

  deselectAll() {
    this.selectedNodeId = null;
    this.selectedConnectionId = null;
    this.renderCanvas();
    this.renderInspector();
  }

  renderInspector() {
    const inspector = this.container.querySelector('#flow-inspector');
    if (!inspector) return;

    if (this.selectedNodeId) {
      const node = this.diagramData.nodes.find(n => n.id === this.selectedNodeId);
      if (!node) {
        inspector.innerHTML = '';
        return;
      }

      inspector.innerHTML = `
        <div class="flex flex-col gap-4">
          <div class="flex justify-between items-center border-b border-border/40 pb-2">
            <h3 class="text-xs font-bold text-accent">PROPRIEDADES DA CAIXA</h3>
            <button id="inspect-close" class="text-textMuted hover:text-textPrimary text-xs">&times;</button>
          </div>
          
          <div class="flex flex-col gap-1.5">
            <label class="text-[9px] text-textSecondary uppercase font-bold">Conteúdo do Texto:</label>
            <textarea 
              id="inspect-node-text" 
              class="w-full bg-black/40 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent text-textPrimary placeholder:text-textMuted h-20 resize-none font-mono"
            >${node.text}</textarea>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-[9px] text-textSecondary uppercase font-bold">Formato / Tipo:</label>
            <select 
              id="inspect-node-shape" 
              class="w-full bg-black/40 border border-border rounded-xl px-3 py-2 text-xs text-textSecondary focus:outline-none focus:border-accent"
            >
              <option value="inicio" ${node.shape === 'inicio' ? 'selected' : ''}>INÍCIO / FIM</option>
              <option value="acao" ${node.shape === 'acao' ? 'selected' : ''}>PROCESSO</option>
              <option value="decisao" ${node.shape === 'decisao' ? 'selected' : ''}>DECISÃO</option>
              <option value="dados" ${node.shape === 'dados' ? 'selected' : ''}>DADOS (PARALELOGRAMA)</option>
              <option value="banco" ${node.shape === 'banco' ? 'selected' : ''}>BANCO DE DADOS</option>
              <option value="documento" ${node.shape === 'documento' ? 'selected' : ''}>DOCUMENTO</option>
              <option value="fim" ${node.shape === 'fim' ? 'selected' : ''}>FIM</option>
            </select>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-[9px] text-textSecondary uppercase font-bold">Nota Vinculada (.md):</label>
            <select 
              id="inspect-node-article" 
              class="w-full bg-black/40 border border-border rounded-xl px-3 py-2 text-xs text-textSecondary focus:outline-none focus:border-accent"
            >
              <option value="">Nenhuma nota vinculada</option>
              ${this.articles.map(art => `
                <option value="${art.slug}" ${node.linkedArticleSlug === art.slug ? 'selected' : ''}>${art.title}</option>
              `).join('')}
            </select>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-[9px] text-textSecondary uppercase font-bold">Tarefa Kanban Vinculada:</label>
            <select 
              id="inspect-node-card" 
              class="w-full bg-black/40 border border-border rounded-xl px-3 py-2 text-xs text-textSecondary focus:outline-none focus:border-accent"
            >
              <option value="">Nenhuma tarefa vinculada</option>
              ${this.kanbanCards.map(card => `
                <option value="${card.id}" ${String(node.linkedCardId || '') === String(card.id) ? 'selected' : ''}>${card.title} (${card.column_id})</option>
              `).join('')}
            </select>
          </div>

          <button 
            id="inspect-delete-node" 
            class="bg-error/10 border border-error/20 hover:border-error/50 text-error hover:bg-error/20 w-full py-2 rounded-xl text-xs font-bold transition-all mt-2"
          >
            EXCLUIR CAIXA
          </button>
        </div>
      `;

      // Eventos
      on(inspector.querySelector('#inspect-close'), 'click', () => this.deselectAll());

      const textarea = inspector.querySelector('#inspect-node-text');
      on(textarea, 'input', (e) => {
        node.text = e.target.value;
        const domEl = this.container.querySelector(`#dom-${node.id}`);
        if (domEl) {
          const textSpan = domEl.querySelector('.relative.z-10, span');
          if (textSpan) {
            textSpan.innerHTML = node.text.replace(/\n/g, '<br>');
          }
        }
        this.saveFlowData();
      });

      const shapeSelect = inspector.querySelector('#inspect-node-shape');
      on(shapeSelect, 'change', (e) => {
        node.shape = e.target.value;
        this.renderCanvas();
        this.saveFlowData();
      });

      const articleSelect = inspector.querySelector('#inspect-node-article');
      on(articleSelect, 'change', (e) => {
        node.linkedArticleSlug = e.target.value;
        this.renderCanvas();
        this.saveFlowData();
      });

      const cardSelect = inspector.querySelector('#inspect-node-card');
      on(cardSelect, 'change', (e) => {
        node.linkedCardId = e.target.value;
        this.renderCanvas();
        this.saveFlowData();
      });

      const deleteBtn = inspector.querySelector('#inspect-delete-node');
      on(deleteBtn, 'click', () => {
        this.diagramData.nodes = this.diagramData.nodes.filter(n => n.id !== node.id);
        this.diagramData.connections = this.diagramData.connections.filter(c => c.from !== node.id && c.to !== node.id);
        this.deselectAll();
        this.saveFlowData();
      });

    } else if (this.selectedConnectionId) {
      const conn = this.diagramData.connections.find(c => c.id === this.selectedConnectionId);
      if (!conn) {
        inspector.innerHTML = '';
        return;
      }

      inspector.innerHTML = `
        <div class="flex flex-col gap-4">
          <div class="flex justify-between items-center border-b border-border/40 pb-2">
            <h3 class="text-xs font-bold text-accent">PROPRIEDADES DA LINHA</h3>
            <button id="inspect-close" class="text-textMuted hover:text-textPrimary text-xs">&times;</button>
          </div>
          
          <div class="flex flex-col gap-1.5">
            <label class="text-[9px] text-textSecondary uppercase font-bold">Rótulo / Texto da Linha:</label>
            <input 
              type="text" 
              id="inspect-conn-label" 
              value="${conn.label}" 
              class="w-full bg-black/40 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent text-textPrimary placeholder:text-textMuted font-mono"
            >
          </div>

          <button 
            id="inspect-delete-conn" 
            class="bg-error/10 border border-error/20 hover:border-error/50 text-error hover:bg-error/20 w-full py-2 rounded-xl text-xs font-bold transition-all mt-2"
          >
            EXCLUIR LINHA
          </button>
        </div>
      `;

      on(inspector.querySelector('#inspect-close'), 'click', () => this.deselectAll());

      const labelInput = inspector.querySelector('#inspect-conn-label');
      on(labelInput, 'input', (e) => {
        conn.label = e.target.value.trim();
        this.drawConnections();
        this.saveFlowData();
      });

      const deleteBtn = inspector.querySelector('#inspect-delete-conn');
      on(deleteBtn, 'click', () => {
        this.diagramData.connections = this.diagramData.connections.filter(c => c.id !== conn.id);
        this.deselectAll();
        this.saveFlowData();
      });

    } else {
      inspector.innerHTML = `
        <div class="text-center py-4 text-textMuted text-[10px] leading-relaxed select-none">
          CLIQUE EM UMA CAIXA OU LINHA PARA VER SUAS PROPRIEDADES.
        </div>
      `;
    }
  }

  setupEvents() {
    const canvas = this.container.querySelector('#flow-canvas');
    if (canvas) {
      on(canvas, 'click', (e) => {
        if (e.target.id === 'flow-canvas' || e.target.id === 'flow-nodes-container' || e.target.id === 'flow-connections-svg') {
          this.deselectAll();
        }
      });
    }

    const items = this.container.querySelectorAll('.flow-list-item');
    items.forEach(item => {
      on(item, 'click', async () => {
        const id = item.getAttribute('data-id');
        try {
          this.currentFlow = await api.get(`/api/flows/${id}`);
          this.parseDiagramData(this.currentFlow.content);
          this.selectedNodeId = null;
          this.selectedConnectionId = null;
          this.render();
        } catch (err) {
          Toast.error('Erro ao abrir o diagrama.');
        }
      });
    });

    const createBtn = this.container.querySelector('#btn-create-flow');
    if (createBtn) {
      on(createBtn, 'click', async () => {
        const nameInput = this.container.querySelector('#new-flow-name');
        const typeSelect = this.container.querySelector('#new-flow-type');
        const name = nameInput ? nameInput.value.trim() : '';
        const type = typeSelect ? typeSelect.value : 'flowchart';

        if (!name) {
          Toast.error('Digite um nome para o diagrama!');
          return;
        }

        try {
          const newFlow = await api.post('/api/flows', { name, type });
          Toast.success('Diagrama criado com sucesso!');
          this.currentFlow = newFlow;
          this.parseDiagramData(newFlow.content);
          this.selectedNodeId = null;
          this.selectedConnectionId = null;
          await this.loadAndRender();
        } catch (err) {
          console.error(err);
          Toast.error('Erro ao criar diagrama.');
        }
      });
    }

    const saveBtn = this.container.querySelector('#btn-save-flow');
    if (saveBtn && this.currentFlow) {
      on(saveBtn, 'click', async () => {
        const nameInput = this.container.querySelector('#flow-edit-name');
        const name = nameInput ? nameInput.value.trim() : this.currentFlow.name;
        
        if (!name) {
          Toast.error('O nome do diagrama não pode estar vazio!');
          return;
        }

        await this.saveFlowData();
        Toast.success('Diagrama salvo com sucesso!');
        await this.loadAndRender();
      });
    }

    const closeBtn = this.container.querySelector('#btn-close-editor');
    if (closeBtn) {
      on(closeBtn, 'click', () => {
        this.currentFlow = null;
        this.diagramData = { nodes: [], connections: [] };
        this.deselectAll();
      });
    }

    // Injetar Caixas
    const addInicioBtn = this.container.querySelector('#btn-add-inicio');
    if (addInicioBtn) {
      on(addInicioBtn, 'click', () => this.addNode('inicio'));
    }
    const addAcaoBtn = this.container.querySelector('#btn-add-acao');
    if (addAcaoBtn) {
      on(addAcaoBtn, 'click', () => this.addNode('acao'));
    }
    const addDecisaoBtn = this.container.querySelector('#btn-add-decisao');
    if (addDecisaoBtn) {
      on(addDecisaoBtn, 'click', () => this.addNode('decisao'));
    }
    const addDadosBtn = this.container.querySelector('#btn-add-dados');
    if (addDadosBtn) {
      on(addDadosBtn, 'click', () => this.addNode('dados'));
    }
    const addBancoBtn = this.container.querySelector('#btn-add-banco');
    if (addBancoBtn) {
      on(addBancoBtn, 'click', () => this.addNode('banco'));
    }
    const addDocumentoBtn = this.container.querySelector('#btn-add-documento');
    if (addDocumentoBtn) {
      on(addDocumentoBtn, 'click', () => this.addNode('documento'));
    }
  }

  addNode(shape) {
    if (!this.currentFlow) return;

    const id = `node-${Date.now()}`;
    const canvas = this.container.querySelector('#flow-canvas');
    
    const x = canvas ? canvas.scrollLeft + 150 + Math.random() * 80 : 150;
    const y = canvas ? canvas.scrollTop + 120 + Math.random() * 80 : 150;

    let text = 'PROCESSO';
    if (shape === 'inicio') text = 'INÍCIO';
    if (shape === 'fim') text = 'FIM';
    if (shape === 'decisao') text = 'DECISÃO';
    if (shape === 'dados') text = 'DADOS';
    if (shape === 'banco') text = 'BANCO DE DADOS';
    if (shape === 'documento') text = 'DOCUMENTO';

    this.diagramData.nodes.push({ id, x, y, text, shape });
    this.renderCanvas();
    this.selectNode(id);
    this.saveFlowData(); // Salvar automaticamente
  }

  async saveFlowData() {
    if (!this.currentFlow) return;
    const nameInput = this.container.querySelector('#flow-edit-name');
    const name = nameInput ? nameInput.value.trim() : this.currentFlow.name;
    const content = JSON.stringify(this.diagramData, null, 2);

    try {
      this.currentFlow = await api.put(`/api/flows/${this.currentFlow.id}`, { name, content });
      const idx = this.flows.findIndex(f => f.id === this.currentFlow.id);
      if (idx !== -1) {
        this.flows[idx].name = name;
      }
    } catch (err) {
      console.error('Erro ao salvar fluxo automaticamente:', err);
    }
  }
}
