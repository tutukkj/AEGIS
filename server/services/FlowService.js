import { getDb } from '../database/connection.js';

export class FlowService {
  /**
   * Retorna todos os fluxogramas/diagramas cadastrados
   */
  static getFlows() {
    const db = getDb();
    return db.prepare(`
      SELECT id, name, type, created_at, updated_at
      FROM flows
      ORDER BY updated_at DESC
    `).all();
  }

  /**
   * Retorna os detalhes de um fluxograma por ID
   */
  static getFlow(id) {
    const db = getDb();
    const flow = db.prepare('SELECT * FROM flows WHERE id = ?').get(id);
    return flow || null;
  }

  /**
   * Cria um novo fluxograma/diagrama
   */
  static createFlow(name, type = 'flowchart', content = '') {
    const db = getDb();
    
    // Se content estiver vazio, colocar um template padrão em formato JSON
    let initialContent = content;
    if (!initialContent) {
      if (type === 'er') {
        initialContent = JSON.stringify({
          nodes: [
            { id: 'node-1', x: 100, y: 100, text: 'CLIENTE\n---\nid INT PK\nnome VARCHAR\nemail VARCHAR', shape: 'acao' },
            { id: 'node-2', x: 400, y: 100, text: 'PEDIDO\n---\nid INT PK\ncliente_id INT FK\ndata DATE', shape: 'acao' }
          ],
          connections: [
            { id: 'conn-1', from: 'node-1', to: 'node-2', label: 'possui (1:N)' }
          ]
        }, null, 2);
      } else {
        initialContent = JSON.stringify({
          nodes: [
            { id: 'node-1', x: 80, y: 150, text: 'INÍCIO', shape: 'inicio' },
            { id: 'node-2', x: 260, y: 150, text: 'PROCESSAR REQUISIÇÃO', shape: 'acao' },
            { id: 'node-3', x: 480, y: 100, text: 'SUCESSO', shape: 'fim' },
            { id: 'node-4', x: 480, y: 220, text: 'FALHA', shape: 'fim' }
          ],
          connections: [
            { id: 'conn-1', from: 'node-1', to: 'node-2', label: '' },
            { id: 'conn-2', from: 'node-2', to: 'node-3', label: 'OK' },
            { id: 'conn-3', from: 'node-2', to: 'node-4', label: 'ERRO' }
          ]
        }, null, 2);
      }
    }

    const result = db.prepare(`
      INSERT INTO flows (name, type, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      name,
      type,
      initialContent,
      new Date().toISOString(),
      new Date().toISOString()
    );

    return this.getFlow(result.lastInsertRowid);
  }

  /**
   * Salva as alterações de nome e código do fluxograma
   */
  static saveFlow(id, name, content) {
    const db = getDb();
    db.prepare(`
      UPDATE flows 
      SET name = ?, content = ?, updated_at = ? 
      WHERE id = ?
    `).run(name, content, new Date().toISOString(), id);
    
    return this.getFlow(id);
  }

  /**
   * Exclui um fluxograma por ID
   */
  static deleteFlow(id) {
    const db = getDb();
    db.prepare('DELETE FROM flows WHERE id = ?').run(id);
  }
}
