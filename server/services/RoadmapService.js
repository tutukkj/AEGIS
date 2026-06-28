import fs from 'fs';
import path from 'path';
import { getDb } from '../database/connection.js';
import { PATHS } from '../config.js';

export class RoadmapService {
  /**
   * Sincroniza arquivos JSON em storage/roadmaps/ com o banco de dados SQLite
   */
  static syncRoadmaps() {
    const db = getDb();
    const roadmapsDir = path.join(PATHS.storage, 'roadmaps');
    
    if (!fs.existsSync(roadmapsDir)) {
      fs.mkdirSync(roadmapsDir, { recursive: true });
      return;
    }

    const files = fs.readdirSync(roadmapsDir);
    
    db.exec('BEGIN');
    try {
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = path.join(roadmapsDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const roadmapData = JSON.parse(fileContent);
        
        const slug = roadmapData.slug || path.basename(file, '.json');
        
        // 1. Inserir ou atualizar na tabela roadmaps
        const rSelect = db.prepare('SELECT id FROM roadmaps WHERE slug = ?').get(slug);
        let roadmapId;
        
        if (rSelect) {
          roadmapId = rSelect.id;
          db.prepare(`
            UPDATE roadmaps SET 
              name = ?, description = ?, definition = ?, color = ?, icon = ?, updated_at = ?
            WHERE id = ?
          `).run(
            roadmapData.name,
            roadmapData.description || '',
            JSON.stringify(roadmapData.nodes || []),
            roadmapData.color || 'blue',
            roadmapData.icon || 'milestone',
            new Date().toISOString(),
            roadmapId
          );
        } else {
          const insertR = db.prepare(`
            INSERT INTO roadmaps (slug, name, description, definition, color, icon, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            slug,
            roadmapData.name,
            roadmapData.description || '',
            JSON.stringify(roadmapData.nodes || []),
            roadmapData.color || 'blue',
            roadmapData.icon || 'milestone',
            new Date().toISOString(),
            new Date().toISOString()
          );
          roadmapId = insertR.lastInsertRowid;
        }

        // 2. Sincronizar nós do roadmap
        const nodes = roadmapData.nodes || [];
        let completedCount = 0;
        
        for (let idx = 0; idx < nodes.length; idx++) {
          const node = nodes[idx];
          
          // Tentar encontrar artigo correspondente no banco
          let articleId = null;
          let articleStatus = 'not_started';
          
          if (node.article_slug) {
            const article = db.prepare('SELECT id, status FROM articles WHERE slug = ?').get(node.article_slug);
            if (article) {
              articleId = article.id;
              articleStatus = article.status;
            }
          }
          
          // Mapear status do artigo para o nó
          let nodeStatus = 'not_started';
          let progress = 0.0;
          
          if (articleStatus === 'completed') {
            nodeStatus = 'completed';
            progress = 1.0;
            completedCount++;
          } else if (articleStatus === 'studying' || articleStatus === 'review') {
            nodeStatus = 'in_progress';
            progress = 0.5;
          }
          
          // Verificar se já existe o nó no banco para manter checklist customizado do usuário
          const existingNode = db.prepare('SELECT id, checklist, status FROM roadmap_nodes WHERE roadmap_id = ? AND node_id = ?').get(roadmapId, node.id);
          
          let checklistJSON = JSON.stringify(node.checklist || []);
          if (existingNode) {
            // Preservar checklist do banco para não sobrescrever o progresso do usuário
            checklistJSON = existingNode.checklist;
            
            // Se o status do artigo não for completed, respeitar o status customizado do nó
            if (articleStatus !== 'completed' && existingNode.status !== 'not_started') {
              nodeStatus = existingNode.status;
              if (nodeStatus === 'completed') {
                progress = 1.0;
                completedCount++;
              } else if (nodeStatus === 'in_progress') {
                progress = 0.5;
              }
            }
          }
          
          db.prepare(`
            INSERT OR REPLACE INTO roadmap_nodes (
              roadmap_id, node_id, title, parent_node_id, article_id, status, progress, sort_order, checklist
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            roadmapId,
            node.id,
            node.title,
            node.parent || null,
            articleId,
            nodeStatus,
            progress,
            idx,
            checklistJSON
          );
        }
        
        // 3. Atualizar contadores do roadmap
        db.prepare(`
          UPDATE roadmaps SET total_nodes = ?, completed_nodes = ? WHERE id = ?
        `).run(nodes.length, completedCount, roadmapId);
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      console.error('Erro ao sincronizar roadmaps:', err);
      throw err;
    }
  }

  /**
   * Retorna todos os roadmaps cadastrados
   */
  static getRoadmaps() {
    const db = getDb();
    return db.prepare(`
      SELECT id, slug, name, description, color, icon, total_nodes, completed_nodes, updated_at
      FROM roadmaps
      ORDER BY name ASC
    `).all();
  }

  /**
   * Retorna um único roadmap detalhado com seus nós de progresso e informações de artigos vinculados
   */
  static getRoadmap(slug) {
    const db = getDb();
    const roadmap = db.prepare('SELECT * FROM roadmaps WHERE slug = ?').get(slug);
    if (!roadmap) return null;

    const nodes = db.prepare(`
      SELECT 
        rn.id, rn.node_id, rn.title, rn.parent_node_id, rn.status, rn.progress, rn.checklist,
        a.slug AS article_slug, a.title AS article_title, a.status AS article_status
      FROM roadmap_nodes rn
      LEFT JOIN articles a ON a.id = rn.article_id
      WHERE rn.roadmap_id = ?
      ORDER BY rn.sort_order ASC
    `).all(roadmap.id);

    // Formatar checklist de JSON para objeto
    const formattedNodes = nodes.map(node => ({
      ...node,
      checklist: JSON.parse(node.checklist || '[]')
    }));

    return {
      metadata: roadmap,
      nodes: formattedNodes
    };
  }

  /**
   * Atualiza a checklist de um nó e recalcula o progresso do nó e do roadmap
   */
  static updateNodeChecklist(roadmapSlug, nodeId, checklist) {
    const db = getDb();
    
    const roadmap = db.prepare('SELECT id FROM roadmaps WHERE slug = ?').get(roadmapSlug);
    if (!roadmap) throw new Error('Roadmap não encontrado');

    const node = db.prepare('SELECT id, status FROM roadmap_nodes WHERE roadmap_id = ? AND node_id = ?').get(roadmap.id, nodeId);
    if (!node) throw new Error('Nó do roadmap não encontrado');

    // Calcular progresso do nó baseado na checklist
    let progress = 0.0;
    let status = node.status;

    if (checklist.length > 0) {
      const doneCount = checklist.filter(item => item.done).length;
      progress = doneCount / checklist.length;
      
      if (doneCount === checklist.length) {
        status = 'completed';
      } else if (doneCount > 0) {
        status = 'in_progress';
      }
    }

    db.exec('BEGIN');
    try {
      db.prepare(`
        UPDATE roadmap_nodes SET checklist = ?, progress = ?, status = ? WHERE id = ?
      `).run(JSON.stringify(checklist), progress, status, node.id);

      // Recalcular contador global do roadmap
      const allNodes = db.prepare('SELECT status FROM roadmap_nodes WHERE roadmap_id = ?').all(roadmap.id);
      const completedCount = allNodes.filter(n => n.status === 'completed').length;

      db.prepare(`
        UPDATE roadmaps SET completed_nodes = ?, updated_at = ? WHERE id = ?
      `).run(completedCount, new Date().toISOString(), roadmap.id);

      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    return this.getRoadmap(roadmapSlug);
  }

  /**
   * Atualiza o status geral do nó
   */
  static updateNodeStatus(roadmapSlug, nodeId, status) {
    const db = getDb();
    
    const roadmap = db.prepare('SELECT id FROM roadmaps WHERE slug = ?').get(roadmapSlug);
    if (!roadmap) throw new Error('Roadmap não encontrado');

    const node = db.prepare('SELECT id FROM roadmap_nodes WHERE roadmap_id = ? AND node_id = ?').get(roadmap.id, nodeId);
    if (!node) throw new Error('Nó do roadmap não encontrado');

    let progress = 0.0;
    if (status === 'completed') progress = 1.0;
    else if (status === 'in_progress') progress = 0.5;

    db.exec('BEGIN');
    try {
      db.prepare(`
        UPDATE roadmap_nodes SET status = ?, progress = ? WHERE id = ?
      `).run(status, progress, node.id);

      // Se o nó estiver associado a um artigo, atualizar o status do artigo correspondente!
      const linkedArticle = db.prepare('SELECT article_id FROM roadmap_nodes WHERE id = ?').get(node.id);
      if (linkedArticle && linkedArticle.article_id) {
        let articleStatus = 'not_started';
        if (status === 'completed') articleStatus = 'completed';
        else if (status === 'in_progress') articleStatus = 'studying';
        
        db.prepare('UPDATE articles SET status = ? WHERE id = ?').run(articleStatus, linkedArticle.article_id);
      }

      // Recalcular contador global do roadmap
      const allNodes = db.prepare('SELECT status FROM roadmap_nodes WHERE roadmap_id = ?').all(roadmap.id);
      const completedCount = allNodes.filter(n => n.status === 'completed').length;

      db.prepare(`
        UPDATE roadmaps SET completed_nodes = ?, updated_at = ? WHERE id = ?
      `).run(completedCount, new Date().toISOString(), roadmap.id);

      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    return this.getRoadmap(roadmapSlug);
  }
}
