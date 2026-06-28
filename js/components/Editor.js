import { html, mount, el, on } from '../utils/dom.js';
import { api } from '../utils/api.js';
import { renderMarkdown, postProcessMarkdown } from '../renderers/markdownRenderer.js';
import { BacklinkPanel } from './BacklinkPanel.js';
import { Toast } from './Toast.js';
import { store } from '../store.js';

export class Editor {
  constructor(containerId) {
    this.container = el(`#${containerId}`);
    this.article = null;
    this.existingSlugs = [];
    this.autoSaveTimeout = null;
    this.backlinkPanel = null;
  }

  async loadArticle(slug) {
    try {
      // 1. Obter todos os slugs existentes para verificar links quebrados
      const articles = await api.get('/api/articles');
      this.existingSlugs = articles.map(a => a.slug);

      // 2. Carregar o artigo específico
      this.article = await api.get(`/api/articles/${slug}`);
      
      if (!this.article) {
        Toast.error('Não foi possível carregar o artigo.');
        return;
      }

      // Notificar no store que este artigo está em foco
      store.setState('activeArticle', {
        slug: this.article.metadata.slug,
        title: this.article.metadata.title
      });

      this.render();
      this.backlinkPanel = new BacklinkPanel('backlink-panel-container');
      this.backlinkPanel.render(this.article.backlinks || []);
    } catch (err) {
      console.error(err);
      Toast.error('Erro ao abrir o editor.');
    }
  }

  render() {
    if (!this.article) return;
    const meta = this.article.metadata;
    const fm = this.article.frontmatter;

    const template = `
      <div class="h-full flex flex-col animate-fade-in">
        <!-- Barra de Ações Superior do Editor -->
        <div class="border-b border-border bg-surface/20 px-6 py-3 flex flex-wrap items-center justify-between gap-4 select-none">
          <!-- Esquerda: Título, Status e Dificuldade -->
          <div class="flex flex-wrap items-center gap-3">
            <h2 class="text-sm font-bold truncate max-w-[200px]" title="${meta.title}">${meta.title}</h2>
            
            <!-- Dificuldade -->
            <select id="edit-difficulty" class="bg-black/30 border border-border rounded-xl px-2.5 py-1 text-xs text-textSecondary focus:outline-none focus:border-accent">
              <option value="beginner" ${meta.difficulty === 'beginner' ? 'selected' : ''}>Iniciante</option>
              <option value="intermediate" ${meta.difficulty === 'intermediate' ? 'selected' : ''}>Intermediário</option>
              <option value="advanced" ${meta.difficulty === 'advanced' ? 'selected' : ''}>Avançado</option>
            </select>

            <!-- Status -->
            <select id="edit-status" class="bg-black/30 border border-border rounded-xl px-2.5 py-1 text-xs text-textSecondary focus:outline-none focus:border-accent">
              <option value="not_started" ${meta.status === 'not_started' ? 'selected' : ''}>Não Iniciado</option>
              <option value="studying" ${meta.status === 'studying' ? 'selected' : ''}>Estudando</option>
              <option value="review" ${meta.status === 'review' ? 'selected' : ''}>Revisar</option>
              <option value="completed" ${meta.status === 'completed' ? 'selected' : ''}>Concluído</option>
            </select>
            
            <!-- Horas Estimadas -->
            <div class="flex items-center gap-1.5 bg-black/20 border border-border/80 rounded-xl px-2 py-0.5 text-xs text-textSecondary">
              <i data-lucide="clock" class="w-3.5 h-3.5"></i>
              <input type="number" id="edit-hours" value="${meta.estimated_hours}" min="0" class="w-10 bg-transparent text-center focus:outline-none" title="Horas estimadas">
              <span>horas</span>
            </div>
          </div>

          <!-- Direita: Barra de Formatação & Botão Salvar -->
          <div class="flex items-center gap-3">
            <!-- Toolbar de Formatação -->
            <div class="flex items-center bg-black/20 border border-border/80 rounded-xl p-0.5 text-textSecondary">
              <button id="btn-bold" class="p-1.5 hover:text-textPrimary hover:bg-surface-hover rounded-lg transition-colors" title="Negrito (Ctrl+B)">
                <i data-lucide="bold" class="w-3.5 h-3.5"></i>
              </button>
              <button id="btn-italic" class="p-1.5 hover:text-textPrimary hover:bg-surface-hover rounded-lg transition-colors" title="Itálico (Ctrl+I)">
                <i data-lucide="italic" class="w-3.5 h-3.5"></i>
              </button>
              <button id="btn-code" class="p-1.5 hover:text-textPrimary hover:bg-surface-hover rounded-lg transition-colors" title="Bloco de Código">
                <i data-lucide="code" class="w-3.5 h-3.5"></i>
              </button>
              <button id="btn-wikilink" class="p-1.5 hover:text-textPrimary hover:bg-surface-hover rounded-lg transition-colors" title="Adicionar WikiLink">
                <i data-lucide="link" class="w-3.5 h-3.5"></i>
              </button>
              <button id="btn-checklist" class="p-1.5 hover:text-textPrimary hover:bg-surface-hover rounded-lg transition-colors" title="Adicionar Checklist">
                <i data-lucide="check-square" class="w-3.5 h-3.5"></i>
              </button>
            </div>

            <!-- Botão Salvar Manual -->
            <button id="btn-save-manual" class="bg-accent hover:bg-accent-hover text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5">
              <i data-lucide="save" class="w-3.5 h-3.5"></i>
              <span>Salvar</span>
            </button>
          </div>
        </div>

        <!-- Área Dividida (Split Editor / Preview) -->
        <div class="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
          <!-- Editor (Esquerda) -->
          <div class="h-full flex flex-col border-r border-border overflow-hidden bg-black/10">
            <textarea 
              id="editor-textarea" 
              class="flex-1 w-full h-full p-6 bg-transparent border-none text-sm font-mono text-textPrimary resize-none focus:outline-none leading-relaxed select-text" 
              placeholder="Comece a escrever seu conhecimento em markdown..."
            >${this.article.content}</textarea>
          </div>

          <!-- Preview (Direita) -->
          <div id="preview-pane" class="h-full overflow-y-auto p-6 markdown-preview bg-surface/10 select-text"></div>
        </div>

        <!-- Painel de Backlinks (Fica abaixo do split se for rolável) -->
        <div class="px-8 border-t border-border bg-surface/5">
          <div id="backlink-panel-container"></div>
        </div>
      </div>
    `;

    mount(this.container, html(template));
    lucide.createIcons({ node: this.container });

    this.textarea = el('#editor-textarea', this.container);
    this.preview = el('#preview-pane', this.container);

    // Eventos
    on(this.textarea, 'input', () => this.handleInput());
    on(el('#btn-save-manual', this.container), 'click', () => this.saveArticle(true));
    
    // Mudanças de Metadados disparam salvamento automático
    on(el('#edit-difficulty', this.container), 'change', () => this.triggerAutoSave());
    on(el('#edit-status', this.container), 'change', () => this.triggerAutoSave());
    on(el('#edit-hours', this.container), 'change', () => this.triggerAutoSave());

    // Configurar Toolbar de Formatação
    this.setupToolbar();

    // Sincronizar Rolagem (Sync Scroll)
    this.setupSyncScroll();

    // Renderização inicial
    this.updatePreview();
  }

  handleInput() {
    this.updatePreview();
    this.triggerAutoSave();
  }

  async updatePreview() {
    if (!this.textarea || !this.preview) return;
    const markdown = this.textarea.value;
    const htmlContent = renderMarkdown(markdown, this.existingSlugs);
    this.preview.innerHTML = htmlContent;
    
    // Inicializar ícones nos callouts gerados dinamicamente
    lucide.createIcons({ node: this.preview });
    
    // Renderizar diagramas Mermaid e equações KaTeX
    await postProcessMarkdown(this.preview);
  }

  setupSyncScroll() {
    if (!this.textarea || !this.preview) return;

    let isSyncingTextareaScroll = false;
    let isSyncingPreviewScroll = false;

    // Rolagem: Editor -> Preview
    on(this.textarea, 'scroll', () => {
      if (isSyncingPreviewScroll) {
        isSyncingPreviewScroll = false;
        return;
      }
      isSyncingTextareaScroll = true;
      const scrollRatio = this.textarea.scrollTop / (this.textarea.scrollHeight - this.textarea.clientHeight);
      this.preview.scrollTop = scrollRatio * (this.preview.scrollHeight - this.preview.clientHeight);
    });

    // Rolagem: Preview -> Editor
    on(this.preview, 'scroll', () => {
      if (isSyncingTextareaScroll) {
        isSyncingTextareaScroll = false;
        return;
      }
      isSyncingPreviewScroll = true;
      const scrollRatio = this.preview.scrollTop / (this.preview.scrollHeight - this.preview.clientHeight);
      this.textarea.scrollTop = scrollRatio * (this.textarea.scrollHeight - this.textarea.clientHeight);
    });
  }

  setupToolbar() {
    const insertText = (before, after = '') => {
      const start = this.textarea.selectionStart;
      const end = this.textarea.selectionEnd;
      const text = this.textarea.value;
      const selected = text.substring(start, end);
      const replacement = before + selected + after;
      
      this.textarea.value = text.substring(0, start) + replacement + text.substring(end);
      this.textarea.focus();
      this.textarea.selectionStart = start + before.length;
      this.textarea.selectionEnd = start + before.length + selected.length;
      
      this.handleInput();
    };

    on(el('#btn-bold', this.container), 'click', () => insertText('**', '**'));
    on(el('#btn-italic', this.container), 'click', () => insertText('*', '*'));
    on(el('#btn-code', this.container), 'click', () => insertText('```python\n', '\n```'));
    on(el('#btn-wikilink', this.container), 'click', () => insertText('[[', ']]'));
    on(el('#btn-checklist', this.container), 'click', () => insertText('- [ ] '));
  }

  triggerAutoSave() {
    if (this.autoSaveTimeout) clearTimeout(this.autoSaveTimeout);
    
    // Indicador sutil de "digitando..."
    const saveBtn = el('#btn-save-manual span', this.container);
    if (saveBtn) saveBtn.textContent = 'Digitando...';

    this.autoSaveTimeout = setTimeout(() => {
      this.saveArticle(false);
    }, 2000); // 2 segundos
  }

  async saveArticle(manual = false) {
    if (!this.article) return;
    
    if (this.autoSaveTimeout) clearTimeout(this.autoSaveTimeout);
    
    const saveBtn = el('#btn-save-manual span', this.container);
    if (saveBtn) saveBtn.textContent = 'Salvando...';

    // Montar metadados atualizados baseados nos campos da toolbar
    const updatedFrontmatter = {
      ...this.article.frontmatter,
      difficulty: el('#edit-difficulty', this.container).value,
      status: el('#edit-status', this.container).value,
      estimated_hours: parseFloat(el('#edit-hours', this.container).value) || 0
    };

    const markdown = this.textarea.value;

    try {
      const response = await api.put(`/api/articles/${metaSlug(this.article.metadata.slug)}`, {
        frontmatter: updatedFrontmatter,
        markdown
      });
      
      if (response) {
        this.article = response;
        if (saveBtn) saveBtn.textContent = 'Salvar';
        
        // Atualizar painel de backlinks caso links tenham mudado
        if (this.backlinkPanel) {
          this.backlinkPanel.render(this.article.backlinks || []);
        }

        if (manual) {
          Toast.success('Artigo salvo com sucesso!');
        }
      }
    } catch (err) {
      console.error(err);
      if (saveBtn) saveBtn.textContent = 'Erro ao Salvar';
      Toast.error('Erro ao salvar artigo.');
    }
  }
}

// Pequeno helper para lidar com decodificação/codificação de slugs
function metaSlug(slug) {
  return encodeURIComponent(slug);
}
