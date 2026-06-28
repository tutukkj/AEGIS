import { getDb } from '../database/connection.js';

export class ProjectService {
  /**
   * Sincroniza e vincula artigos de tipo 'project' com a tabela de projetos
   */
  static syncProjects() {
    const db = getDb();
    
    // Obter todos os artigos que são do tipo 'project'
    const projectArticles = db.prepare("SELECT * FROM articles WHERE type = 'project'").all();
    
    db.exec('BEGIN');
    try {
      for (const art of projectArticles) {
        const existing = db.prepare('SELECT id FROM projects WHERE slug = ?').get(art.slug);
        
        // Mapear status do artigo para o projeto
        let projectStatus = 'active';
        if (art.status === 'completed') projectStatus = 'completed';
        
        if (existing) {
          db.prepare(`
            UPDATE projects SET
              name = ?, description = ?, status = ?, tags = ?, updated_at = ?
            WHERE id = ?
          `).run(art.title, art.description || '', projectStatus, art.tags, new Date().toISOString(), existing.id);
        } else {
          db.prepare(`
            INSERT INTO projects (slug, name, description, article_id, status, tags, progress, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 0.0, ?, ?)
          `).run(
            art.slug,
            art.title,
            art.description || '',
            art.id,
            projectStatus,
            art.tags,
            new Date().toISOString(),
            new Date().toISOString()
          );
        }
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      console.error('Erro ao sincronizar projetos:', err);
    }
  }

  /**
   * Retorna a lista de todos os projetos com os metadados agregados do artigo associado
   */
  static getProjects() {
    const db = getDb();
    this.syncProjects(); // Sincroniza antes de retornar
    
    return db.prepare(`
      SELECT 
        p.id, p.slug, p.name, p.description, p.status, p.progress, p.tags, p.created_at,
        a.icon, a.color, a.studied_hours, a.estimated_hours
      FROM projects p
      LEFT JOIN articles a ON a.id = p.article_id
      ORDER BY p.created_at DESC
    `).all().map(proj => ({
      ...proj,
      tags: JSON.parse(proj.tags || '[]')
    }));
  }

  /**
   * Atualiza o progresso e status de um projeto
   */
  static updateProject(id, status, progress) {
    const db = getDb();
    
    db.exec('BEGIN');
    try {
      db.prepare(`
        UPDATE projects SET status = ?, progress = ?, updated_at = ? WHERE id = ?
      `).run(status, parseFloat(progress) || 0.0, new Date().toISOString(), id);
      
      // Sincronizar o status do artigo vinculado
      const proj = db.prepare('SELECT article_id FROM projects WHERE id = ?').get(id);
      if (proj && proj.article_id) {
        let artStatus = 'studying';
        if (status === 'completed') artStatus = 'completed';
        
        db.prepare('UPDATE articles SET status = ? WHERE id = ?').run(artStatus, proj.article_id);
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
    
    return { success: true };
  }
}
