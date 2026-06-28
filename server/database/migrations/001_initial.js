export function up(db) {
  // 1. Tabela de Usuários
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      jwt_secret TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 2. Tabela de Sessões de Usuário
  db.exec(`
    CREATE TABLE sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 3. Tabela de Artigos (Metadados dos markdowns)
  db.exec(`
    CREATE TABLE articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      file_path TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL DEFAULT 'article', -- article, project, snippet, note
      difficulty TEXT DEFAULT 'intermediate', -- beginner, intermediate, advanced
      status TEXT NOT NULL DEFAULT 'not_started', -- not_started, studying, review, completed
      tags TEXT NOT NULL DEFAULT '[]', -- JSON array
      aliases TEXT NOT NULL DEFAULT '[]', -- JSON array
      related TEXT NOT NULL DEFAULT '[]', -- JSON array
      roadmap TEXT,
      color TEXT,
      icon TEXT,
      estimated_hours REAL DEFAULT 0,
      studied_hours REAL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_accessed_at TEXT
    );
  `);

  // 4. Tabela de Backlinks (Links entre artigos)
  db.exec(`
    CREATE TABLE backlinks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER NOT NULL,
      target_id INTEGER NOT NULL,
      context TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (source_id) REFERENCES articles(id) ON DELETE CASCADE,
      FOREIGN KEY (target_id) REFERENCES articles(id) ON DELETE CASCADE,
      UNIQUE(source_id, target_id, context)
    );
  `);

  // 5. Tabela de Sessões Pomodoro
  db.exec(`
    CREATE TABLE pomodoro_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER,
      duration_minutes INTEGER NOT NULL,
      interruptions INTEGER DEFAULT 0,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      notes TEXT,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL
    );
  `);

  // 6. Tabela de Logs de Estudo (Tempo estudado)
  db.exec(`
    CREATE TABLE study_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER,
      duration_seconds INTEGER NOT NULL,
      date TEXT NOT NULL, -- YYYY-MM-DD
      started_at TEXT NOT NULL,
      ended_at TEXT NOT NULL,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL
    );
  `);

  // 7. Tabela de Quadros Kanban
  db.exec(`
    CREATE TABLE kanban_boards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      columns TEXT NOT NULL DEFAULT '[]', -- JSON array contendo id, título e cor da coluna
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 8. Tabela de Cartões Kanban
  db.exec(`
    CREATE TABLE kanban_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      board_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      column_id TEXT NOT NULL, -- inbox, todo, doing, review, done
      sort_order INTEGER DEFAULT 0,
      linked_type TEXT, -- article, project, roadmap, snippet
      linked_id INTEGER,
      tags TEXT NOT NULL DEFAULT '[]', -- JSON array
      due_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (board_id) REFERENCES kanban_boards(id) ON DELETE CASCADE
    );
  `);

  // 9. Tabela de Roadmaps
  db.exec(`
    CREATE TABLE roadmaps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      definition TEXT NOT NULL, -- JSON com a estrutura do grafo de nós do roadmap
      color TEXT,
      icon TEXT,
      total_nodes INTEGER DEFAULT 0,
      completed_nodes INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 10. Tabela de Progresso nos Nós do Roadmap
  db.exec(`
    CREATE TABLE roadmap_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      roadmap_id INTEGER NOT NULL,
      node_id TEXT NOT NULL, -- ID único do nó na árvore do roadmap
      title TEXT NOT NULL,
      parent_node_id TEXT,
      article_id INTEGER,
      status TEXT NOT NULL DEFAULT 'not_started', -- not_started, in_progress, completed, skipped
      progress REAL DEFAULT 0.0,
      sort_order INTEGER DEFAULT 0,
      checklist TEXT NOT NULL DEFAULT '[]', -- JSON array de itens { text, done }
      last_accessed_at TEXT,
      FOREIGN KEY (roadmap_id) REFERENCES roadmaps(id) ON DELETE CASCADE,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL,
      UNIQUE(roadmap_id, node_id)
    );
  `);

  // 11. Tabela de Mapas Mentais
  db.exec(`
    CREATE TABLE mindmaps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      root_article_id INTEGER,
      tree_data TEXT NOT NULL DEFAULT '{}', -- JSON contendo nós e arestas do mapa mental
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (root_article_id) REFERENCES articles(id) ON DELETE SET NULL
    );
  `);

  // 12. Tabela de Projetos (Vínculo de projetos a markdowns e progresso)
  db.exec(`
    CREATE TABLE projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      article_id INTEGER, -- Link para o markdown do projeto
      status TEXT NOT NULL DEFAULT 'planning', -- planning, active, paused, completed, archived
      tags TEXT NOT NULL DEFAULT '[]', -- JSON array
      progress REAL DEFAULT 0.0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL
    );
  `);

  // 13. Tabela de Estatísticas Diárias
  db.exec(`
    CREATE TABLE daily_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE, -- YYYY-MM-DD
      total_study_seconds INTEGER DEFAULT 0,
      total_pomodoros INTEGER DEFAULT 0,
      articles_accessed INTEGER DEFAULT 0,
      articles_created INTEGER DEFAULT 0,
      articles_updated INTEGER DEFAULT 0,
      active_roadmaps TEXT NOT NULL DEFAULT '[]' -- JSON array de IDs de roadmaps ativos
    );
  `);

  // 14. Tabela de Metas (Semanal, Mensal ou Customizada)
  db.exec(`
    CREATE TABLE goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL, -- weekly, monthly, custom
      title TEXT NOT NULL,
      description TEXT,
      target_type TEXT NOT NULL, -- study_hours, pomodoros, articles, roadmap_progress
      target_value REAL NOT NULL,
      current_value REAL DEFAULT 0.0,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active', -- active, completed, failed
      created_at TEXT NOT NULL
    );
  `);

  // 15. Tabela de Configurações Gerais
  db.exec(`
    CREATE TABLE settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 16. Tabela de Favoritos
  db.exec(`
    CREATE TABLE favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL, -- article, roadmap, project, mindmap
      entity_id INTEGER NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  // 17. Tabela Virtual FTS5 de Busca
  db.exec(`
    CREATE VIRTUAL TABLE search_index USING fts5(
      article_id UNINDEXED,
      title,
      content_text,
      tags,
      aliases,
      frontmatter_json UNINDEXED
    );
  `);
}

export function down(db) {
  db.exec(`DROP TABLE IF EXISTS search_index;`);
  db.exec(`DROP TABLE IF EXISTS favorites;`);
  db.exec(`DROP TABLE IF EXISTS settings;`);
  db.exec(`DROP TABLE IF EXISTS goals;`);
  db.exec(`DROP TABLE IF EXISTS daily_stats;`);
  db.exec(`DROP TABLE IF EXISTS projects;`);
  db.exec(`DROP TABLE IF EXISTS mindmaps;`);
  db.exec(`DROP TABLE IF EXISTS roadmap_nodes;`);
  db.exec(`DROP TABLE IF EXISTS roadmaps;`);
  db.exec(`DROP TABLE IF EXISTS kanban_cards;`);
  db.exec(`DROP TABLE IF EXISTS kanban_boards;`);
  db.exec(`DROP TABLE IF EXISTS study_logs;`);
  db.exec(`DROP TABLE IF EXISTS pomodoro_sessions;`);
  db.exec(`DROP TABLE IF EXISTS backlinks;`);
  db.exec(`DROP TABLE IF EXISTS articles;`);
  db.exec(`DROP TABLE IF EXISTS sessions;`);
  db.exec(`DROP TABLE IF EXISTS users;`);
}
