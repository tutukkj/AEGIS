export function up(db) {
  // Adiciona a coluna kanban_card_id na tabela pomodoro_sessions para fazer o vínculo com tarefas
  try {
    db.exec(`
      ALTER TABLE pomodoro_sessions ADD COLUMN kanban_card_id INTEGER REFERENCES kanban_cards(id) ON DELETE SET NULL;
    `);
  } catch (err) {
    // Caso a coluna já exista em alguma execução anterior
    console.warn('Aviso ao aplicar migration de pomodoro_sessions:', err.message);
  }
}

export function down(db) {
  // SQLite não suporta exclusão de coluna de forma simples, mas em rollback podemos recriar se necessário.
}
