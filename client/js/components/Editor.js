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

    if (window.TurndownService) {
      this.turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced'
      });
      if (window.turndownPluginGfm) {
        this.turndownService.use(window.turndownPluginGfm.gfm);
      }
    }
  }

  async loadArticle(slug) {
    try {
      const articles = await api.get('/api/articles');
      this.existingSlugs = articles.map(a => a.slug);

      this.article = await api.get(`/api/articles/${slug}`);
      
      if (!this.article) {
        Toast.error('Não foi possível carregar o artigo.');
        return;
      }

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
              <button id="btn-bold" class="p-1.5 hover:text-textPrimary hover:bg-surface-hover rounded-lg transition-colors" title="Negrito">
                <i data-lucide="bold" class="w-3.5 h-3.5"></i>
              </button>
              <button id="btn-italic" class="p-1.5 hover:text-textPrimary hover:bg-surface-hover rounded-lg transition-colors" title="Itálico">
                <i data-lucide="italic" class="w-3.5 h-3.5"></i>
              </button>
              <button id="btn-h1" class="px-2 py-1.5 hover:text-textPrimary hover:bg-surface-hover rounded-lg transition-colors font-bold text-[9px]" title="Título Grande">
                H1
              </button>
              <button id="btn-h2" class="px-2 py-1.5 hover:text-textPrimary hover:bg-surface-hover rounded-lg transition-colors font-bold text-[9px]" title="Título Médio">
                H2
              </button>
              <button id="btn-list-ul" class="p-1.5 hover:text-textPrimary hover:bg-surface-hover rounded-lg transition-colors" title="Lista Bullet">
                <i data-lucide="list" class="w-3.5 h-3.5"></i>
              </button>
              <button id="btn-list-ol" class="p-1.5 hover:text-textPrimary hover:bg-surface-hover rounded-lg transition-colors" title="Lista Numerada">
                <i data-lucide="list-ordered" class="w-3.5 h-3.5"></i>
              </button>
              <button id="btn-checklist" class="p-1.5 hover:text-textPrimary hover:bg-surface-hover rounded-lg transition-colors" title="Adicionar Checklist">
                <i data-lucide="check-square" class="w-3.5 h-3.5"></i>
              </button>
              <button id="btn-table" class="p-1.5 hover:text-textPrimary hover:bg-surface-hover rounded-lg transition-colors" title="Inserir Tabela">
                <i data-lucide="table" class="w-3.5 h-3.5"></i>
              </button>
              <button id="btn-code" class="p-1.5 hover:text-textPrimary hover:bg-surface-hover rounded-lg transition-colors" title="Bloco de Código">
                <i data-lucide="code" class="w-3.5 h-3.5"></i>
              </button>
              <button id="btn-wikilink" class="p-1.5 hover:text-textPrimary hover:bg-surface-hover rounded-lg transition-colors" title="Adicionar WikiLink">
                <i data-lucide="link" class="w-3.5 h-3.5"></i>
              </button>
            </div>

            <!-- Alternador de Código Fonte -->
            <button id="btn-toggle-source" class="bg-surface border border-border/80 hover:border-border text-textSecondary hover:text-textPrimary text-xs font-semibold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5" title="Ver Código Fonte Markdown">
              <i data-lucide="eye" class="w-3.5 h-3.5"></i>
              <span>Código</span>
            </button>

            <!-- Botão Salvar Manual -->
            <button id="btn-save-manual" class="bg-accent hover:bg-accent-hover text-black text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5">
              <i data-lucide="save" class="w-3.5 h-3.5"></i>
              <span>Salvar</span>
            </button>

            <!-- Botão Copiar -->
            <button id="btn-copy-markdown" class="bg-surface border border-border/80 hover:border-border text-textSecondary hover:text-textPrimary text-xs font-semibold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5" title="Copiar Markdown">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i>
              <span>Copiar</span>
            </button>

            <!-- Botão Excluir -->
            <button id="btn-delete-article" class="bg-error/10 border border-error/20 hover:border-error/50 text-error hover:bg-error/20 text-xs font-semibold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5" title="Excluir Nota">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              <span>Excluir</span>
            </button>
          </div>
        </div>

        <!-- Área Dividida (Split Editor / Preview) -->
        <div id="editor-split-container" class="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
          <!-- Editor de Código Markdown -->
          <div id="textarea-container" class="hidden h-full flex flex-col border-r border-border overflow-hidden bg-black/10">
            <textarea 
              id="editor-textarea" 
              class="flex-1 w-full h-full p-6 bg-transparent border-none text-sm font-mono text-textPrimary resize-none focus:outline-none leading-relaxed select-text" 
              placeholder="Comece a escrever seu conhecimento em markdown..."
            >${this.article.content}</textarea>
          </div>

          <!-- Preview Editável (Preview First) -->
          <div 
            id="preview-pane" 
            contenteditable="true" 
            class="col-span-2 h-full overflow-y-auto p-6 markdown-preview bg-surface/10 select-text outline-none focus:ring-1 focus:ring-accent/20 text-left"
            placeholder="Comece a escrever aqui diretamente..."
          ></div>
        </div>

        <!-- Painel de Backlinks -->
        <div class="px-8 border-t border-border bg-surface/5">
          <div id="backlink-panel-container"></div>
        </div>
      </div>
    `;

    mount(this.container, html(template));
    lucide.createIcons({ node: this.container });

    this.textarea = el('#editor-textarea', this.container);
    this.preview = el('#preview-pane', this.container);
    this.textareaContainer = el('#textarea-container', this.container);

    // Evento de digitação na visualização rica
    on(this.preview, 'input', () => {
      this.syncPreviewToTextarea();
      this.triggerAutoSave();
    });

    // Evento de digitação no editor de código
    on(this.textarea, 'input', () => {
      if (document.activeElement === this.textarea) {
        this.updatePreviewFromTextarea();
      }
      this.triggerAutoSave();
    });

    // Atalhos de teclado avançados (shortcuts de nível profissional)
    const handleShortcuts = (e) => {
      // Ctrl + S: Salvar
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.saveArticle(true);
      }
      // Ctrl + B: Negrito
      if (e.ctrlKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        this.performAction('**', '**', 'bold');
      }
      // Ctrl + I: Itálico
      if (e.ctrlKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        this.performAction('*', '*', 'italic');
      }
      // Tab: Recuo / Indentação
      if (e.key === 'Tab') {
        e.preventDefault();
        const isCodeActive = !this.textareaContainer.classList.contains('hidden');
        if (isCodeActive && document.activeElement === this.textarea) {
          this.insertMarkdownText('  ');
        } else {
          this.formatVisual('insertHTML', '&nbsp;&nbsp;&nbsp;&nbsp;');
        }
      }
    };

    on(this.preview, 'keydown', handleShortcuts);
    on(this.textarea, 'keydown', handleShortcuts);

    // Toggle Código Fonte
    const toggleSourceBtn = el('#btn-toggle-source', this.container);
    on(toggleSourceBtn, 'click', () => {
      const isHidden = this.textareaContainer.classList.contains('hidden');
      if (isHidden) {
        this.textareaContainer.classList.remove('hidden');
        this.preview.classList.remove('col-span-2');
        toggleSourceBtn.querySelector('span').textContent = 'Visualizar';
        toggleSourceBtn.querySelector('i').setAttribute('data-lucide', 'eye-off');
      } else {
        this.textareaContainer.classList.add('hidden');
        this.preview.classList.add('col-span-2');
        toggleSourceBtn.querySelector('span').textContent = 'Código';
        toggleSourceBtn.querySelector('i').setAttribute('data-lucide', 'eye');
      }
      lucide.createIcons({ node: toggleSourceBtn });
    });

    on(el('#btn-save-manual', this.container), 'click', () => this.saveArticle(true));

    // Copiar
    on(el('#btn-copy-markdown', this.container), 'click', () => {
      if (this.textarea) {
        navigator.clipboard.writeText(this.textarea.value).then(() => {
          Toast.success('Markdown copiado!');
        }).catch(() => {
          Toast.error('Erro ao copiar.');
        });
      }
    });

    // Excluir nota
    on(el('#btn-delete-article', this.container), 'click', async () => {
      if (!this.article) return;
      if (!confirm(`Deseja realmente excluir a nota "${meta.title}" permanentemente?`)) return;
      try {
        await api.delete(`/api/articles/${metaSlug(meta.slug)}`);
        Toast.success('Nota excluída!');
        window.location.hash = '#explorer';
      } catch (err) {
        console.error(err);
        Toast.error('Erro ao excluir nota.');
      }
    });
    
    // Mudanças de Metadados
    on(el('#edit-difficulty', this.container), 'change', () => this.triggerAutoSave());
    on(el('#edit-status', this.container), 'change', () => this.triggerAutoSave());
    on(el('#edit-hours', this.container), 'change', () => this.triggerAutoSave());

    this.setupToolbar();
    this.setupSyncScroll();

    // Carregar conteúdo inicial
    this.updatePreviewFromTextarea();
  }

  // Converter visualizador rico em Markdown
  syncPreviewToTextarea() {
    if (!this.preview || !this.textarea || !this.turndownService) return;
    const htmlContent = this.preview.innerHTML;
    const markdown = this.turndownService.turndown(htmlContent);
    this.textarea.value = markdown;
  }

  // Renderizar Markdown no visualizador rico
  async updatePreviewFromTextarea() {
    if (!this.textarea || !this.preview) return;
    const markdown = this.textarea.value;
    const htmlContent = renderMarkdown(markdown, this.existingSlugs);
    this.preview.innerHTML = htmlContent;
    
    this.setupInteractiveCheckboxes();
    lucide.createIcons({ node: this.preview });
    await postProcessMarkdown(this.preview);
  }

  setupInteractiveCheckboxes() {
    const checkboxes = this.preview.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
      cb.removeAttribute('disabled');
      on(cb, 'change', () => {
        if (cb.checked) {
          cb.setAttribute('checked', 'checked');
        } else {
          cb.removeAttribute('checked');
        }
        this.syncPreviewToTextarea();
        this.triggerAutoSave();
      });
    });
  }

  setupSyncScroll() {
    if (!this.textarea || !this.preview) return;

    let isSyncingTextareaScroll = false;
    let isSyncingPreviewScroll = false;

    on(this.textarea, 'scroll', () => {
      if (isSyncingPreviewScroll) {
        isSyncingPreviewScroll = false;
        return;
      }
      isSyncingTextareaScroll = true;
      const scrollRatio = this.textarea.scrollTop / (this.textarea.scrollHeight - this.textarea.clientHeight);
      this.preview.scrollTop = scrollRatio * (this.preview.scrollHeight - this.preview.clientHeight);
    });

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

  insertMarkdownText(before, after = '') {
    if (!this.textarea) return;
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const text = this.textarea.value;
    const selected = text.substring(start, end);
    const replacement = before + selected + after;
    
    this.textarea.value = text.substring(0, start) + replacement + text.substring(end);
    this.textarea.focus();
    this.textarea.selectionStart = start + before.length;
    this.textarea.selectionEnd = start + before.length + selected.length;
    
    this.updatePreviewFromTextarea();
    this.triggerAutoSave();
  }

  formatVisual(command, value = null) {
    if (!this.preview) return;
    this.preview.focus();
    document.execCommand(command, false, value);
    this.syncPreviewToTextarea();
    this.triggerAutoSave();
  }

  performAction(mdBefore, mdAfter, visualCommand, visualValue = null) {
    const isCodeActive = !this.textareaContainer.classList.contains('hidden');
    if (isCodeActive && document.activeElement === this.textarea) {
      this.insertMarkdownText(mdBefore, mdAfter);
    } else {
      this.formatVisual(visualCommand, visualValue);
    }
  }

  setupToolbar() {
    on(el('#btn-bold', this.container), 'click', () => this.performAction('**', '**', 'bold'));
    on(el('#btn-italic', this.container), 'click', () => this.performAction('*', '*', 'italic'));
    on(el('#btn-h1', this.container), 'click', () => this.performAction('# ', '', 'formatBlock', '<h1>'));
    on(el('#btn-h2', this.container), 'click', () => this.performAction('## ', '', 'formatBlock', '<h2>'));
    on(el('#btn-list-ul', this.container), 'click', () => this.performAction('- ', '', 'insertUnorderedList'));
    on(el('#btn-list-ol', this.container), 'click', () => this.performAction('1. ', '', 'insertOrderedList'));
    
    on(el('#btn-checklist', this.container), 'click', () => {
      const isCodeActive = !this.textareaContainer.classList.contains('hidden');
      if (isCodeActive && document.activeElement === this.textarea) {
        this.insertMarkdownText('- [ ] ');
      } else {
        this.formatVisual('insertHTML', '<ul><li><input type="checkbox"> Nova Tarefa</li></ul>');
        this.setupInteractiveCheckboxes();
      }
    });

    on(el('#btn-table', this.container), 'click', () => {
      const isCodeActive = !this.textareaContainer.classList.contains('hidden');
      const tableHtml = `
        <table class="border border-collapse w-full my-3">
          <thead>
            <tr>
              <th class="border border-border p-2 bg-surface/50 text-left">Coluna 1</th>
              <th class="border border-border p-2 bg-surface/50 text-left">Coluna 2</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="border border-border p-2">Item 1</td>
              <td class="border border-border p-2">Item 2</td>
            </tr>
          </tbody>
        </table><br>
      `;
      if (isCodeActive && document.activeElement === this.textarea) {
        const tableMd = `\n| Coluna 1 | Coluna 2 |\n| --- | --- |\n| Item 1 | Item 2 |\n\n`;
        this.insertMarkdownText(tableMd);
      } else {
        this.formatVisual('insertHTML', tableHtml);
      }
    });

    on(el('#btn-code', this.container), 'click', () => this.performAction('```python\n', '\n```', 'formatBlock', '<pre>'));
    
    on(el('#btn-wikilink', this.container), 'click', () => {
      const name = prompt('Digite o título da nota para ligar (WikiLink):');
      if (name) {
        const isCodeActive = !this.textareaContainer.classList.contains('hidden');
        if (isCodeActive && document.activeElement === this.textarea) {
          this.insertMarkdownText(`[[${name}]]`);
        } else {
          this.formatVisual('insertHTML', `<a href="#editor/${encodeURIComponent(name.toLowerCase())}" class="wikilink font-bold text-accent">[[${name}]]</a>`);
        }
      }
    });
  }

  triggerAutoSave() {
    if (this.autoSaveTimeout) clearTimeout(this.autoSaveTimeout);
    
    const saveBtn = el('#btn-save-manual span', this.container);
    if (saveBtn) saveBtn.textContent = 'Digitando...';

    this.autoSaveTimeout = setTimeout(() => {
      this.saveArticle(false);
    }, 2000);
  }

  async saveArticle(manual = false) {
    if (!this.article) return;
    
    if (this.autoSaveTimeout) clearTimeout(this.autoSaveTimeout);
    
    const saveBtn = el('#btn-save-manual span', this.container);
    if (saveBtn) saveBtn.textContent = 'Salvando...';

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
        
        if (this.backlinkPanel) {
          this.backlinkPanel.render(this.article.backlinks || []);
        }

        if (manual) {
          Toast.success('Artigo salvo!');
        }
      }
    } catch (err) {
      console.error(err);
      if (saveBtn) saveBtn.textContent = 'Erro';
      Toast.error('Erro ao salvar.');
    }
  }
}

function metaSlug(slug) {
  return encodeURIComponent(slug);
}
