import { getDb } from '../database/connection.js';
import { WikiLinkService } from './WikiLinkService.js';
import { broadcast } from '../websocket/index.js';
import { slugify } from '../utils/slugify.js';

export class BacklinkService {
  /**
   * Atualiza as conexões de backlinks de um artigo no banco de dados
   * @param {number} sourceArticleId 
   * @param {string} markdownContent 
   */
  static async updateBacklinks(sourceArticleId, markdownContent) {
    const db = getDb();
    
    // 1. Limpar backlinks antigos deste artigo como origem
    db.prepare('DELETE FROM backlinks WHERE source_id = ?').run(sourceArticleId);
    
    // 2. Extrair novos wikilinks do texto
    const links = WikiLinkService.parseLinks(markdownContent);
    if (links.length === 0) return;
    
    // 3. Preparar inserção
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO backlinks (source_id, target_id, context, created_at)
      VALUES (?, ?, ?, ?)
    `);
    
    db.exec('BEGIN');
    try {
      // Para cada wikilink, tentar encontrar o artigo alvo
      for (const link of links) {
        const targetSlug = slugify(link.target);
        
        // Buscar artigo por slug, título ou aliases
        // Como aliases está em JSON, fazemos LIKE no banco
        const targetArticle = db.prepare(`
          SELECT id, slug FROM articles 
          WHERE slug = ? 
             OR LOWER(title) = ? 
             OR aliases LIKE ?
        `).get(targetSlug, link.target.toLowerCase(), `%${link.target.toLowerCase()}%`);
        
        if (targetArticle) {
          // Encontrar contexto: linha ou frase ao redor do link
          const context = this.extractContext(markdownContent, link.raw);
          
          insertStmt.run(
            sourceArticleId,
            targetArticle.id,
            context,
            new Date().toISOString()
          );
          
          // Notificar via WebSocket que os backlinks do alvo mudaram
          broadcast('backlinks:updated', {
            slug: targetArticle.slug
          });
        }
      }
      db.exec('COMMIT');
    } catch (txErr) {
      db.exec('ROLLBACK');
      throw txErr;
    }
  }

  /**
   * Busca todas as referências (backlinks) para um artigo
   * @param {number} targetArticleId 
   * @returns {Array<{ slug: string, title: string, context: string }>}
   */
  static getBacklinks(targetArticleId) {
    const db = getDb();
    return db.prepare(`
      SELECT a.slug, a.title, b.context
      FROM backlinks b
      JOIN articles a ON a.id = b.source_id
      WHERE b.target_id = ?
    `).all(targetArticleId);
  }

  /**
   * Extrai um pequeno trecho de contexto ao redor do WikiLink
   */
  static extractContext(text, searchStr) {
    if (!text || !searchStr) return '';
    const index = text.indexOf(searchStr);
    if (index === -1) return '';

    // Encontrar os limites da linha
    let start = text.lastIndexOf('\n', index);
    start = start === -1 ? 0 : start + 1;

    let end = text.indexOf('\n', index);
    end = end === -1 ? text.length : end;

    let line = text.slice(start, end).trim();
    
    // Limitar o tamanho do contexto se for muito longo
    if (line.length > 150) {
      const subIndex = line.indexOf(searchStr);
      const subStart = Math.max(0, subIndex - 60);
      const subEnd = Math.min(line.length, subIndex + searchStr.length + 60);
      line = (subStart > 0 ? '...' : '') + line.slice(subStart, subEnd) + (subEnd < line.length ? '...' : '');
    }

    return line;
  }
}
