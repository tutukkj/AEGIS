import { getDb } from '../database/connection.js';

export class GraphService {
  /**
   * Retorna os nós e arestas para a representação do grafo de conhecimento
   * @returns {{ nodes: Array, edges: Array }}
   */
  static getGraphData() {
    const db = getDb();
    
    // Obter todos os artigos que serão os nós do grafo
    const articles = db.prepare(`
      SELECT id, slug, title, type, status, color, icon 
      FROM articles
    `).all();
    
    // Obter todas as conexões (backlinks) para as arestas
    const backlinks = db.prepare(`
      SELECT 
        b.id,
        source.slug AS source,
        target.slug AS target
      FROM backlinks b
      JOIN articles source ON source.id = b.source_id
      JOIN articles target ON target.id = b.target_id
    `).all();

    // Formatar os nós para o formato do Cytoscape.js
    const nodes = articles.map(art => ({
      data: {
        id: art.slug,
        label: art.title,
        type: art.type,
        status: art.status,
        color: art.color || 'blue',
        icon: art.icon || 'file-text'
      }
    }));

    // Formatar as arestas para o Cytoscape.js
    const edges = backlinks.map(link => ({
      data: {
        id: `edge-${link.source}-${link.target}`,
        source: link.source,
        target: link.target
      }
    }));

    return { nodes, edges };
  }
}
