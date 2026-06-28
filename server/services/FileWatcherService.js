import chokidar from 'chokidar';
import path from 'path';
import { PATHS } from '../config.js';
import { MarkdownService } from './MarkdownService.js';
import { broadcast } from '../websocket/index.js';
import { slugify } from '../utils/slugify.js';

let watcher = null;
let debounceTimeout = null;

export class FileWatcherService {
  static start() {
    if (watcher) return;

    console.log(`Iniciando observador de arquivos em: ${PATHS.content}`);

    watcher = chokidar.watch(PATHS.content, {
      ignored: /(^|[\/\\])\../, // ignora arquivos ocultos
      persistent: true,
      ignoreInitial: true // Ignorar eventos de carregamento inicial
    });

    watcher
      .on('add', (filePath) => this.handleFileChange('created', filePath))
      .on('change', (filePath) => this.handleFileChange('updated', filePath))
      .on('unlink', (filePath) => this.handleFileDelete(filePath));
  }

  static handleFileChange(type, filePath) {
    if (!filePath.endsWith('.md')) return;

    const relPath = path.relative(PATHS.content, filePath);
    console.log(`Arquivo markdown ${type}: ${relPath}`);

    // Debounce do escaneamento do banco para evitar sobrecarga em salvamentos rápidos
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(async () => {
      try {
        await MarkdownService.scanAndIndex();
        
        const fileBasename = path.basename(relPath, '.md');
        const slug = slugify(fileBasename);
        const article = MarkdownService.getArticle(slug);
        
        broadcast(`file:${type}`, {
          path: relPath,
          slug,
          title: article ? article.metadata.title : fileBasename
        });
      } catch (err) {
        console.error('Erro no watcher ao atualizar artigo:', err);
      }
    }, 500);
  }

  static handleFileDelete(filePath) {
    if (!filePath.endsWith('.md')) return;

    const relPath = path.relative(PATHS.content, filePath);
    console.log(`Arquivo markdown deletado: ${relPath}`);

    const fileBasename = path.basename(relPath, '.md');
    const slug = slugify(fileBasename);

    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(async () => {
      try {
        await MarkdownService.scanAndIndex();
        broadcast('file:deleted', {
          path: relPath,
          slug
        });
      } catch (err) {
        console.error('Erro no watcher ao deletar artigo:', err);
      }
    }, 500);
  }

  static stop() {
    if (watcher) {
      watcher.close();
      watcher = null;
    }
  }
}
