import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { getDb } from '../database/connection.js';
import { PATHS } from '../config.js';
import { FrontmatterService } from './FrontmatterService.js';
import { BacklinkService } from './BacklinkService.js';
import { slugify } from '../utils/slugify.js';

export class MarkdownService {
  /**
   * Varre recursivamente o diretório content/ e indexa todos os arquivos markdown
   */
  static async scanAndIndex() {
    const db = getDb();
    console.log('Escaneando base de conhecimento markdown...');

    // Procura arquivos .md recursivamente
    const files = await glob('**/*.md', { cwd: PATHS.content, absolute: false });
    
    const existingPaths = new Set();

    for (const relPath of files) {
      const fullPath = path.join(PATHS.content, relPath);
      existingPaths.add(relPath);
      
      try {
        const fileContent = fs.readFileSync(fullPath, 'utf8');
        const stats = fs.statSync(fullPath);
        const { data, content } = FrontmatterService.parse(fileContent);

        // Obter slug correspondente (slugify do nome do arquivo sem extensão, ou do frontmatter se especificado)
        const fileBasename = path.basename(relPath, '.md');
        const slug = data.slug || slugify(fileBasename);
        const title = data.title || fileBasename;

        // Verificar se já existe no banco
        const article = db.prepare('SELECT id, updated_at FROM articles WHERE file_path = ?').get(relPath);

        let articleId;

        const tagsJSON = JSON.stringify(data.tags || []);
        const aliasesJSON = JSON.stringify(data.aliases || []);
        const relatedJSON = JSON.stringify(data.related || []);

        // Converter possíveis objetos Date do frontmatter em strings válidas para o SQLite
        const createdVal = data.created instanceof Date
          ? data.created.toISOString().split('T')[0]
          : (data.created ? String(data.created) : new Date().toISOString());

        const updatedVal = data.updated instanceof Date
          ? data.updated.toISOString().split('T')[0]
          : (data.updated ? String(data.updated) : new Date().toISOString());

        const estimatedHoursVal = parseFloat(data.estimated_hours || 0) || 0;

        if (!article) {
          // Inserir novo artigo
          const stmt = db.prepare(`
            INSERT INTO articles (
              slug, file_path, title, description, type, difficulty, status, 
              tags, aliases, related, roadmap, color, icon, estimated_hours, 
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          const result = stmt.run(
            slug,
            relPath,
            title,
            data.description || '',
            data.type || 'article',
            data.difficulty || 'intermediate',
            data.status || 'not_started',
            tagsJSON,
            aliasesJSON,
            relatedJSON,
            data.roadmap || '',
            data.color || 'blue',
            data.icon || 'file-text',
            estimatedHoursVal,
            createdVal,
            updatedVal
          );
          
          articleId = result.lastInsertRowid;
          
          // Inserir no índice de busca FTS5
          db.prepare(`
            INSERT INTO search_index (article_id, title, content_text, tags, aliases, frontmatter_json)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(articleId, title, content, tagsJSON, aliasesJSON, JSON.stringify(data));

        } else {
          articleId = article.id;
          
          // Se o arquivo mudou, atualizar registro
          // Para simplificar localmente, atualizamos sempre para manter sincronia perfeita
          const stmt = db.prepare(`
            UPDATE articles SET 
              slug = ?, title = ?, description = ?, type = ?, difficulty = ?, 
              status = ?, tags = ?, aliases = ?, related = ?, roadmap = ?, 
              color = ?, icon = ?, estimated_hours = ?, updated_at = ?
            WHERE id = ?
          `);

          stmt.run(
            slug,
            title,
            data.description || '',
            data.type || 'article',
            data.difficulty || 'intermediate',
            data.status || 'not_started',
            tagsJSON,
            aliasesJSON,
            relatedJSON,
            data.roadmap || '',
            data.color || 'blue',
            data.icon || 'file-text',
            estimatedHoursVal,
            updatedVal,
            articleId
          );

          // Atualizar FTS5
          db.prepare(`
            INSERT OR REPLACE INTO search_index (article_id, title, content_text, tags, aliases, frontmatter_json)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(articleId, title, content, tagsJSON, aliasesJSON, JSON.stringify(data));
        }

        // Processar backlinks deste artigo
        await BacklinkService.updateBacklinks(articleId, content);

      } catch (err) {
        console.error(`Erro ao indexar arquivo ${relPath}:`, err);
      }
    }

    // Remover do banco de dados arquivos que não existem mais fisicamente
    const dbArticles = db.prepare('SELECT id, file_path, slug FROM articles').all();
    for (const art of dbArticles) {
      if (!existingPaths.has(art.file_path)) {
        console.log(`Removendo arquivo deletado do banco: ${art.file_path}`);
        db.prepare('DELETE FROM articles WHERE id = ?').run(art.id);
        db.prepare('DELETE FROM search_index WHERE article_id = ?').run(art.id);
      }
    }
  }

  /**
   * Retorna um único artigo e seu conteúdo markdown
   */
  static getArticle(slug) {
    const db = getDb();
    const article = db.prepare('SELECT * FROM articles WHERE slug = ?').get(slug);
    if (!article) return null;

    // Extrair categoria dinamicamente do file_path
    const parts = article.file_path.split(/[/\\]/);
    article.category = parts.length > 1 ? parts[0] : 'Geral';

    const fullPath = path.join(PATHS.content, article.file_path);
    if (!fs.existsSync(fullPath)) return null;

    const fileContent = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = FrontmatterService.parse(fileContent);

    // Buscar backlinks
    const backlinks = BacklinkService.getBacklinks(article.id);

    // Registrar acesso
    db.prepare('UPDATE articles SET last_accessed_at = ? WHERE id = ?')
      .run(new Date().toISOString(), article.id);

    return {
      metadata: article,
      frontmatter: data,
      content,
      backlinks
    };
  }

  /**
   * Salva as alterações de um artigo no sistema de arquivos e banco de dados
   */
  static async saveArticle(slug, frontmatter, markdown) {
    const db = getDb();
    const article = db.prepare('SELECT * FROM articles WHERE slug = ?').get(slug);
    if (!article) throw new Error('Artigo não encontrado');

    const fullPath = path.join(PATHS.content, article.file_path);
    
    // Atualizar data de modificação
    frontmatter.updated = new Date().toISOString().split('T')[0];
    
    // Serializar markdown + frontmatter
    const fileContent = FrontmatterService.stringify(markdown, frontmatter);
    
    // Salvar no disco
    fs.writeFileSync(fullPath, fileContent, 'utf8');
    
    // Atualizar banco de dados e FTS5
    const tagsJSON = JSON.stringify(frontmatter.tags || []);
    const aliasesJSON = JSON.stringify(frontmatter.aliases || []);
    const relatedJSON = JSON.stringify(frontmatter.related || []);

    db.prepare(`
      UPDATE articles SET
        title = ?, description = ?, type = ?, difficulty = ?, status = ?,
        tags = ?, aliases = ?, related = ?, roadmap = ?, color = ?, icon = ?,
        estimated_hours = ?, updated_at = ?
      WHERE id = ?
    `).run(
      frontmatter.title || article.title,
      frontmatter.description || '',
      frontmatter.type || 'article',
      frontmatter.difficulty || 'intermediate',
      frontmatter.status || 'not_started',
      tagsJSON,
      aliasesJSON,
      relatedJSON,
      frontmatter.roadmap || '',
      frontmatter.color || 'blue',
      frontmatter.icon || 'file-text',
      frontmatter.estimated_hours || 0,
      new Date().toISOString(),
      article.id
    );

    // Atualizar FTS5
    db.prepare(`
      INSERT OR REPLACE INTO search_index (article_id, title, content_text, tags, aliases, frontmatter_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(article.id, frontmatter.title, markdown, tagsJSON, aliasesJSON, JSON.stringify(frontmatter));

    // Atualizar backlinks
    await BacklinkService.updateBacklinks(article.id, markdown);

    return this.getArticle(slug);
  }

  /**
   * Cria um novo artigo Markdown
   */
  static async createArticle(category, filename, title) {
    const db = getDb();
    const cleanFilename = filename.endsWith('.md') ? filename : `${filename}.md`;
    const relPath = path.join(category, cleanFilename);
    const fullPath = path.join(PATHS.content, relPath);

    // Garantir que a pasta da categoria existe
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(fullPath)) {
      throw new Error('Arquivo já existe');
    }

    const frontmatter = FrontmatterService.getDefaults(title);
    const markdown = `# ${title}\n\nEscreva sua nota aqui...`;
    
    const fileContent = FrontmatterService.stringify(markdown, frontmatter);
    fs.writeFileSync(fullPath, fileContent, 'utf8');

    // Escanear para registrar no banco de dados
    await this.scanAndIndex();

    const slug = slugify(path.basename(cleanFilename, '.md'));
    return this.getArticle(slug);
  }

  /**
   * Remove um artigo
   */
  static deleteArticle(slug) {
    const db = getDb();
    const article = db.prepare('SELECT * FROM articles WHERE slug = ?').get(slug);
    if (!article) return false;

    const fullPath = path.join(PATHS.content, article.file_path);
    
    // Remover do disco se existir
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    // Remover do banco de dados (cascade cuida dos backlinks)
    db.prepare('DELETE FROM articles WHERE id = ?').run(article.id);
    db.prepare('DELETE FROM search_index WHERE article_id = ?').run(article.id);

    return true;
  }
}
