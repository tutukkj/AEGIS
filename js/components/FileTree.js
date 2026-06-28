import { html, mount, el, on } from '../utils/dom.js';
import { api } from '../utils/api.js';
import { Toast } from './Toast.js';

export class FileTree {
  constructor(containerId) {
    this.container = el(`#${containerId}`);
    this.treeData = {};
    this.collapsedDirs = new Set();
  }

  async loadAndRender() {
    try {
      const articles = await api.get('/api/articles');
      this.buildTree(articles);
      this.render();
    } catch (err) {
      console.error(err);
      Toast.error('Erro ao carregar explorador de arquivos.');
    }
  }

  buildTree(articles) {
    this.treeData = { dirs: {}, files: [] };
    
    for (const art of articles) {
      const parts = art.file_path.split(/[/\\]/);
      let current = this.treeData;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        
        if (i === parts.length - 1) {
          // É arquivo
          current.files.push(art);
        } else {
          // É diretório
          if (!current.dirs[part]) {
            current.dirs[part] = { dirs: {}, files: [] };
          }
          current = current.dirs[part];
        }
      }
    }
  }

  render() {
    if (!this.container) return;

    const template = `
      <div class="h-full flex flex-col p-6 animate-fade-in">
        <!-- Topo: Botão Nova Nota -->
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-xl font-bold">Explorador</h1>
          <button id="btn-new-note" class="bg-accent hover:bg-accent-hover text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-accent/10">
            <i data-lucide="plus" class="w-3.5 h-3.5"></i>
            <span>Nova Nota</span>
          </button>
        </div>

        <!-- Árvore de Arquivos -->
        <div class="flex-1 overflow-y-auto bg-surface/10 rounded-2xl border border-border/40 p-4">
          <div id="tree-root" class="flex flex-col gap-1 select-none">
            ${this.renderNode(this.treeData, '')}
          </div>
        </div>

        <!-- Modal Nova Nota (Oculto inicialmente) -->
        <div id="new-note-modal" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div class="glass w-full max-w-md rounded-2xl p-6 flex flex-col gap-4 glow-accent">
            <div class="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 class="font-bold text-sm">Criar Nova Nota</h3>
              <button id="btn-close-modal" class="text-textSecondary hover:text-textPrimary transition-colors">
                <i data-lucide="x" class="w-4 h-4"></i>
              </button>
            </div>
            
            <form id="new-note-form" class="flex flex-col gap-4">
              <div class="flex flex-col gap-1">
                <label for="note-title" class="text-xs text-textSecondary font-medium">Título da Nota</label>
                <input type="text" id="note-title" placeholder="Ex: Docker Compose" class="bg-black/30 border border-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent" required>
              </div>

              <div class="flex flex-col gap-1">
                <label for="note-filename" class="text-xs text-textSecondary font-medium">Nome do Arquivo (.md)</label>
                <input type="text" id="note-filename" placeholder="Ex: docker-compose.md" class="bg-black/30 border border-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent" required>
              </div>

              <div class="flex flex-col gap-1">
                <label for="note-category" class="text-xs text-textSecondary font-medium">Categoria / Pasta</label>
                <select id="note-category" class="bg-black/30 border border-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent">
                  <option value="backend">backend</option>
                  <option value="ai">ai</option>
                  <option value="math">math</option>
                  <option value="outros">outros</option>
                </select>
              </div>

              <button type="submit" class="bg-accent hover:bg-accent-hover text-white text-xs font-semibold py-2.5 rounded-xl transition-all mt-2">
                Criar Nota
              </button>
            </form>
          </div>
        </div>
      </div>
    `;

    mount(this.container, html(template));
    lucide.createIcons({ node: this.container });

    // Ligar Eventos de Pastas Collapsible
    const folderToggles = this.container.querySelectorAll('.folder-toggle');
    folderToggles.forEach(toggle => {
      on(toggle, 'click', (e) => {
        const folderName = toggle.getAttribute('data-folder');
        const contents = this.container.querySelector(`.folder-contents[data-folder="${folderName}"]`);
        const icon = toggle.querySelector('.folder-icon');
        
        if (contents) {
          contents.classList.toggle('hidden');
          if (contents.classList.contains('hidden')) {
            this.collapsedDirs.add(folderName);
            if (icon) icon.setAttribute('data-lucide', 'folder-closed');
          } else {
            this.collapsedDirs.delete(folderName);
            if (icon) icon.setAttribute('data-lucide', 'folder-open');
          }
          lucide.createIcons({ node: toggle });
        }
      });
    });

    // Eventos do Modal
    const modal = el('#new-note-modal', this.container);
    const newNoteBtn = el('#btn-new-note', this.container);
    const closeModalBtn = el('#btn-close-modal', this.container);
    const form = el('#new-note-form', this.container);

    on(newNoteBtn, 'click', () => {
      modal.classList.remove('hidden');
      el('#note-title').focus();
    });

    const hideModal = () => {
      modal.classList.add('hidden');
      form.reset();
    };

    on(closeModalBtn, 'click', hideModal);
    
    // Submissão do formulário de Nova Nota
    on(form, 'submit', async (e) => {
      e.preventDefault();
      
      const title = el('#note-title').value;
      const filename = el('#note-filename').value;
      const category = el('#note-category').value;
      
      try {
        const response = await api.post('/api/articles', {
          category,
          filename,
          title
        });
        
        if (response) {
          Toast.success('Nota criada com sucesso!');
          hideModal();
          // Navegar diretamente para o editor da nota criada
          window.location.hash = `#editor/${response.metadata.slug}`;
        }
      } catch (err) {
        Toast.error(err.message || 'Erro ao criar nota.');
      }
    });
  }

  renderNode(node, currentPath) {
    let htmlContent = '';

    // Renderizar subdiretórios
    for (const [dirName, dirNode] of Object.entries(node.dirs)) {
      const fullDirPath = currentPath ? `${currentPath}/${dirName}` : dirName;
      const isCollapsed = this.collapsedDirs.has(fullDirPath);
      const iconName = isCollapsed ? 'folder-closed' : 'folder-open';
      const hiddenClass = isCollapsed ? 'hidden' : '';

      htmlContent += `
        <div class="flex flex-col gap-1 pl-2">
          <!-- Toggle do Diretório -->
          <div 
            class="folder-toggle flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-textSecondary hover:text-textPrimary hover:bg-surface-hover/50 cursor-pointer transition-colors"
            data-folder="${fullDirPath}"
          >
            <i data-lucide="${iconName}" class="folder-icon w-4 h-4 text-accent/80"></i>
            <span>${dirName}</span>
          </div>

          <!-- Conteúdo do Diretório -->
          <div 
            class="folder-contents flex flex-col gap-1 border-l border-border/40 ml-4 pl-2 ${hiddenClass}" 
            data-folder="${fullDirPath}"
          >
            ${this.renderNode(dirNode, fullDirPath)}
          </div>
        </div>
      `;
    }

    // Renderizar arquivos
    for (const file of node.files) {
      // Configurar cor da categoria se existir
      const accentColor = file.color === 'yellow' ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10'
        : file.color === 'blue' ? 'border-blue-500 text-blue-500 bg-blue-500/10'
        : file.color === 'green' ? 'border-green-500 text-green-500 bg-green-500/10'
        : file.color === 'orange' ? 'border-orange-500 text-orange-500 bg-orange-500/10'
        : file.color === 'purple' ? 'border-purple-500 text-purple-500 bg-purple-500/10'
        : file.color === 'cyan' ? 'border-cyan-500 text-cyan-500 bg-cyan-500/10'
        : file.color === 'pink' ? 'border-pink-500 text-pink-500 bg-pink-500/10'
        : 'border-accent text-accent bg-accent/10';

      htmlContent += `
        <a 
          href="#editor/${file.slug}"
          class="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-textSecondary hover:text-textPrimary hover:bg-surface-hover transition-all"
        >
          <div class="w-6 h-6 border rounded-lg flex items-center justify-center ${accentColor}">
            <i data-lucide="${file.icon || 'file-text'}" class="w-3.5 h-3.5"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="truncate font-semibold">${file.title}</p>
            <p class="text-[10px] text-textMuted truncate">${file.description || 'Sem descrição'}</p>
          </div>
          <!-- Badge de Dificuldade -->
          <span class="text-[9px] px-2 py-0.5 rounded-full border border-border/60 bg-surface text-textMuted uppercase font-semibold">
            ${file.difficulty === 'beginner' ? 'Inic.' : file.difficulty === 'intermediate' ? 'Inter.' : 'Avan.'}
          </span>
        </a>
      `;
    }

    return htmlContent;
  }
}
