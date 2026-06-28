import { getDb } from '../database/connection.js';

export class PomodoroService {
  /**
   * Inicia uma nova sessão de Pomodoro
   * @param {string} articleSlug - Slug da nota vinculada (opcional)
   * @param {number} durationMinutes - Duração em minutos
   * @returns {object} - A sessão criada
   */
  static startSession(articleSlug = null, durationMinutes = 25) {
    const db = getDb();
    let articleId = null;

    if (articleSlug) {
      const article = db.prepare('SELECT id FROM articles WHERE slug = ?').get(articleSlug);
      if (article) {
        articleId = article.id;
      }
    }

    const startedAt = new Date().toISOString();
    const result = db.prepare(`
      INSERT INTO pomodoro_sessions (article_id, duration_minutes, interruptions, started_at)
      VALUES (?, ?, ?, ?)
    `).run(articleId, durationMinutes, 0, startedAt);

    return {
      sessionId: result.lastInsertRowid,
      articleId,
      durationMinutes,
      startedAt
    };
  }

  /**
   * Finaliza uma sessão de Pomodoro salvando interrupções e registrando o tempo de estudo
   */
  static endSession(sessionId, interruptions = 0, notes = '') {
    const db = getDb();
    
    // Obter sessão
    const session = db.prepare('SELECT * FROM pomodoro_sessions WHERE id = ?').get(sessionId);
    if (!session) throw new Error('Sessão Pomodoro não encontrada');

    const endedAt = new Date().toISOString();
    const durationSeconds = session.duration_minutes * 60;
    const today = new Date().toISOString().split('T')[0];

    db.exec('BEGIN');
    try {
      // 1. Atualizar sessão pomodoro
      db.prepare(`
        UPDATE pomodoro_sessions 
        SET interruptions = ?, ended_at = ?, notes = ?
        WHERE id = ?
      `).run(interruptions, endedAt, notes, sessionId);

      // 2. Registrar no log de estudos (study_logs)
      db.prepare(`
        INSERT INTO study_logs (article_id, duration_seconds, date, started_at, ended_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(session.article_id, durationSeconds, today, session.started_at, endedAt);

      // 3. Se houver artigo vinculado, atualizar as horas estudadas nele
      if (session.article_id) {
        const hoursToAdd = session.duration_minutes / 60.0;
        db.prepare(`
          UPDATE articles 
          SET studied_hours = studied_hours + ?, updated_at = ?
          WHERE id = ?
        `).run(hoursToAdd, endedAt, session.article_id);
      }

      // 4. Registrar/Incrementar estatísticas diárias (daily_stats)
      const existingStat = db.prepare('SELECT id FROM daily_stats WHERE date = ?').get(today);
      if (existingStat) {
        db.prepare(`
          UPDATE daily_stats 
          SET total_study_seconds = total_study_seconds + ?,
              total_pomodoros = total_pomodoros + 1
          WHERE id = ?
        `).run(durationSeconds, existingStat.id);
      } else {
        db.prepare(`
          INSERT INTO daily_stats (date, total_study_seconds, total_pomodoros, articles_accessed, articles_created, articles_updated)
          VALUES (?, ?, 1, 0, 0, 0)
        `).run(today, durationSeconds);
      }

      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      console.error('Erro ao encerrar sessão Pomodoro:', err);
      throw err;
    }

    return { success: true };
  }
}
