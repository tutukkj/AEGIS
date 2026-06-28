import { getDb } from '../database/connection.js';

export class SearchService {
  /**
   * Realiza uma busca textual usando o índice FTS5 do SQLite
   * @param {string} queryText 
   * @returns {Array<object>}
   */
  static search(queryText) {
    const db = getDb();
    
    // Limpar caracteres de controle do FTS5 para evitar erros de sintaxe do parser
    const cleanQuery = queryText.replace(/[^a-zA-Z0-9áéíóúâêôãõç\s]/gi, '').trim();
    if (!cleanQuery) return [];

    const matchPattern = `${cleanQuery}*`;

    try {
      // Buscar usando FTS5 MATCH, trazendo o snippet destacado
      const results = db.prepare(`
        SELECT 
          a.id, 
          a.slug, 
          a.title, 
          a.description, 
          a.type, 
          a.status,
          a.color,
          a.icon,
          snippet(search_index, 2, '<mark class="bg-accent/30 text-accent font-semibold px-0.5 rounded">', '</mark>', '...', 10) as snippet
        FROM search_index s
        JOIN articles a ON a.id = s.article_id
        WHERE search_index MATCH ?
        ORDER BY rank
        LIMIT 15
      `).all(matchPattern);

      return results;
    } catch (err) {
      console.error('Erro na query FTS5, executando fallback por LIKE:', err);
      
      // Fallback para LIKE simples caso o FTS5 por algum motivo falhe (ex: caracteres específicos)
      const fallbackResults = db.prepare(`
        SELECT 
          id, slug, title, description, type, status, color, icon,
          description as snippet
        FROM articles
        WHERE title LIKE ? OR description LIKE ? OR tags LIKE ?
        LIMIT 15
      `).all(`%${cleanQuery}%`, `%${cleanQuery}%`, `%${cleanQuery}%`);

      return fallbackResults;
    }
  }
}
