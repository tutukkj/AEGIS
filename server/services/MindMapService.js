import { getDb } from '../database/connection.js';

export class MindMapService {
  /**
   * Retorna todos os mapas mentais cadastrados
   */
  static getMindMaps() {
    const db = getDb();
    return db.prepare(`
      SELECT m.id, m.name, m.root_article_id, m.created_at, m.updated_at, a.title AS root_article_title
      FROM mindmaps m
      LEFT JOIN articles a ON a.id = m.root_article_id
      ORDER BY m.updated_at DESC
    `).all();
  }

  /**
   * Retorna os detalhes de um mapa mental por ID
   */
  static getMindMap(id) {
    const db = getDb();
    const mindmap = db.prepare('SELECT * FROM mindmaps WHERE id = ?').get(id);
    if (!mindmap) return null;

    return {
      ...mindmap,
      tree_data: JSON.parse(mindmap.tree_data || '{"nodes":[], "edges":[]}')
    };
  }

  /**
   * Cria um novo mapa mental, opcionalmente populado pelas conexões de uma nota root
   */
  static createMindMap(name, rootArticleId = null) {
    const db = getDb();
    const initialTreeData = { nodes: [], edges: [] };

    if (rootArticleId) {
      const article = db.prepare('SELECT title, slug FROM articles WHERE id = ?').get(rootArticleId);
      if (article) {
        // Criar nó raiz correspondente ao artigo
        initialTreeData.nodes.push({
          data: { id: 'root', label: article.title, isRoot: true, slug: article.slug }
        });

        // Buscar referências conectadas por backlinks para ramificações iniciais
        const connections = db.prepare(`
          SELECT DISTINCT a.title, a.slug
          FROM backlinks b
          JOIN articles a ON a.id = b.source_id
          WHERE b.target_id = ?
          UNION
          SELECT DISTINCT a.title, a.slug
          FROM backlinks b
          JOIN articles a ON a.id = b.target_id
          WHERE b.source_id = ?
        `).all(rootArticleId, rootArticleId);

        connections.forEach((conn, index) => {
          const nodeId = `branch-${index}`;
          initialTreeData.nodes.push({
            data: { id: nodeId, label: conn.title, slug: conn.slug }
          });
          initialTreeData.edges.push({
            data: { id: `edge-root-${nodeId}`, source: 'root', target: nodeId }
          });
        });
      }
    } else {
      // Cria mapa com raiz genérica
      initialTreeData.nodes.push({
        data: { id: 'root', label: name, isRoot: true }
      });
    }

    const result = db.prepare(`
      INSERT INTO mindmaps (name, root_article_id, tree_data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      name,
      rootArticleId || null,
      JSON.stringify(initialTreeData),
      new Date().toISOString(),
      new Date().toISOString()
    );

    return this.getMindMap(result.lastInsertRowid);
  }

  /**
   * Salva os dados de layout de nós e arestas do mapa mental
   */
  static saveMindMap(id, treeData) {
    const db = getDb();
    db.prepare(`
      UPDATE mindmaps SET tree_data = ?, updated_at = ? WHERE id = ?
    `).run(JSON.stringify(treeData), new Date().toISOString(), id);
    
    return this.getMindMap(id);
  }

  /**
   * Exclui um mapa mental por ID
   */
  static deleteMindMap(id) {
    const db = getDb();
    db.prepare('DELETE FROM mindmaps WHERE id = ?').run(id);
  }
}
