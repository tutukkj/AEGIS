import { getDb } from '../database/connection.js';

export class SettingsService {
  /**
   * Retorna todas as configurações como um objeto chave-valor
   */
  static getSettings() {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM settings').all();
    
    const settingsMap = {};
    rows.forEach(row => {
      settingsMap[row.key] = row.value;
    });

    return settingsMap;
  }

  /**
   * Atualiza ou insere múltiplos registros de configurações
   */
  static updateSettings(settingsMap) {
    const db = getDb();
    
    db.exec('BEGIN');
    try {
      const stmt = db.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `);

      for (const [key, value] of Object.entries(settingsMap)) {
        stmt.run(key, String(value), new Date().toISOString());
      }

      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      console.error('Erro ao atualizar configurações:', err);
      throw err;
    }

    return this.getSettings();
  }
}
