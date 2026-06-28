import { getDb } from '../database/connection.js';

export class DashboardService {
  /**
   * Coleta métricas consolidadas de estudo para o Dashboard do Aegis
   * @returns {object} - Estatísticas agregadas
   */
  static getDashboardStats() {
    const db = getDb();
    
    // 1. Estatísticas gerais
    const totalStudySeconds = db.prepare('SELECT SUM(duration_seconds) as total FROM study_logs').get().total || 0;
    const totalStudyHours = Math.round((totalStudySeconds / 3600) * 10) / 10;
    
    const totalArticles = db.prepare('SELECT COUNT(*) as count FROM articles').get().count;
    const completedArticles = db.prepare("SELECT COUNT(*) as count FROM articles WHERE status = 'completed'").get().count;
    
    const totalPomodoros = db.prepare('SELECT COUNT(*) as count FROM pomodoro_sessions WHERE ended_at IS NOT NULL').get().count;

    // 2. Gráfico Semanal (Últimos 7 dias de estudo em minutos)
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const log = db.prepare('SELECT SUM(duration_seconds) as seconds FROM study_logs WHERE date = ?').get(dateStr);
      const minutes = Math.round((log.seconds || 0) / 60);
      
      // Formato abreviado do dia da semana (Dom, Seg, Ter...)
      const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      
      weeklyData.push({
        date: dateStr,
        day: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        minutes
      });
    }

    // 3. Mapa de Calor (Heatmap estilo GitHub - Últimos 365 dias)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 365);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    const heatmapLogs = db.prepare(`
      SELECT date, SUM(duration_seconds) as seconds, COUNT(*) as count
      FROM study_logs
      WHERE date >= ?
      GROUP BY date
    `).all(startDateStr);

    const heatmap = {};
    for (const log of heatmapLogs) {
      heatmap[log.date] = Math.round(log.seconds / 60); // Minutos estudados no dia
    }

    // 4. Notas Acessadas Recentemente
    const recentArticles = db.prepare(`
      SELECT slug, title, status, color, icon, last_accessed_at, type
      FROM articles
      WHERE last_accessed_at IS NOT NULL
      ORDER BY last_accessed_at DESC
      LIMIT 5
    `).all();

    // 5. Roadmaps Ativos e seus respectivos progressos
    const activeRoadmaps = db.prepare(`
      SELECT slug, name, color, icon, total_nodes, completed_nodes
      FROM roadmaps
      WHERE total_nodes > 0
      ORDER BY updated_at DESC
      LIMIT 3
    `).all();

    return {
      stats: {
        totalStudyHours,
        totalArticles,
        completedArticles,
        totalPomodoros
      },
      weeklyData,
      heatmap,
      recentArticles,
      activeRoadmaps
    };
  }
}
