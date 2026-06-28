import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { DB_FILE, PATHS } from '../config.js';

// Garantir que os diretórios necessários existem
if (!fs.existsSync(PATHS.database)) {
  fs.mkdirSync(PATHS.database, { recursive: true });
}
if (!fs.existsSync(PATHS.content)) {
  fs.mkdirSync(PATHS.content, { recursive: true });
}
if (!fs.existsSync(PATHS.storage)) {
  fs.mkdirSync(PATHS.storage, { recursive: true });
}
if (!fs.existsSync(path.join(PATHS.storage, 'roadmaps'))) {
  fs.mkdirSync(path.join(PATHS.storage, 'roadmaps'), { recursive: true });
}
if (!fs.existsSync(path.join(PATHS.storage, 'mindmaps'))) {
  fs.mkdirSync(path.join(PATHS.storage, 'mindmaps'), { recursive: true });
}
if (!fs.existsSync(path.join(PATHS.storage, 'kanban'))) {
  fs.mkdirSync(path.join(PATHS.storage, 'kanban'), { recursive: true });
}

let db = null;

export function getDb() {
  if (db) return db;

  db = new DatabaseSync(DB_FILE);
  
  // Otimizações do SQLite executadas como comandos diretos
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA synchronous = NORMAL');
  
  return db;
}

export async function initDatabase() {
  const currentDb = getDb();
  
  // Tabela para controle de migrations
  currentDb.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL
    );
  `);
  
  await applyMigrations(currentDb);
}

async function applyMigrations(currentDb) {
  const migrationsDir = path.join(PATHS.root, 'server', 'database', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.warn(`Diretório de migrations não encontrado em ${migrationsDir}`);
    return;
  }
  
  const files = fs.readdirSync(migrationsDir).sort();
  const appliedMigrations = currentDb.prepare('SELECT name FROM migrations').all().map(m => m.name);
  
  for (const file of files) {
    if (file.endsWith('.js') && !appliedMigrations.includes(file)) {
      console.log(`Aplicando migration: ${file}`);
      
      const filePath = path.join(migrationsDir, file);
      // No Windows, precisamos usar file:// para importações dinâmicas de caminhos absolutos
      const fileUrl = `file://${filePath.replace(/\\/g, '/')}`;
      
      try {
        const migration = await import(fileUrl);
        
        // Executar a migration dentro de uma transação SQL nativa
        currentDb.exec('BEGIN');
        try {
          migration.up(currentDb);
          const stmt = currentDb.prepare('INSERT INTO migrations (name, applied_at) VALUES (?, ?)');
          stmt.run(file, new Date().toISOString());
          currentDb.exec('COMMIT');
          console.log(`Migration ${file} aplicada com sucesso.`);
        } catch (txErr) {
          currentDb.exec('ROLLBACK');
          throw txErr;
        }
      } catch (err) {
        console.error(`Erro ao aplicar migration ${file}:`, err);
        throw err;
      }
    }
  }
}
