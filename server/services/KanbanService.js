import { getDb } from '../database/connection.js';

export class KanbanService {
  /**
   * Garante a existência de um quadro Kanban padrão
   */
  static seedDefaultBoard() {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM kanban_boards LIMIT 1').get();
    
    if (!existing) {
      const defaultColumns = [
        { id: 'inbox', title: 'Inbox', color: 'text-textSecondary' },
        { id: 'todo', title: 'A Fazer', color: 'text-accent' },
        { id: 'doing', title: 'Estudando', color: 'text-warning' },
        { id: 'review', title: 'Revisão', color: 'text-purple-500' },
        { id: 'done', title: 'Concluído', color: 'text-success' }
      ];

      db.prepare(`
        INSERT INTO kanban_boards (name, description, columns, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, 0, ?, ?)
      `).run(
        'Meu Kanban de Estudos',
        'Quadro geral para gerenciar tarefas e progresso de aprendizado.',
        JSON.stringify(defaultColumns),
        new Date().toISOString(),
        new Date().toISOString()
      );
    }
  }

  /**
   * Retorna todos os quadros Kanban cadastrados
   */
  static getBoards() {
    const db = getDb();
    this.seedDefaultBoard();
    return db.prepare('SELECT * FROM kanban_boards ORDER BY sort_order ASC').all().map(board => ({
      ...board,
      columns: JSON.parse(board.columns || '[]')
    }));
  }

  /**
   * Carrega um quadro Kanban com todos os cartões agrupados pelas colunas correspondentes
   */
  static getBoard(id) {
    const db = getDb();
    const board = db.prepare('SELECT * FROM kanban_boards WHERE id = ?').get(id);
    if (!board) return null;

    const columns = JSON.parse(board.columns || '[]');
    const cards = db.prepare(`
      SELECT 
        kc.id, kc.title, kc.description, kc.column_id, kc.sort_order, kc.tags, kc.due_date,
        kc.linked_type, kc.linked_id, a.slug AS article_slug
      FROM kanban_cards kc
      LEFT JOIN articles a ON kc.linked_type = 'article' AND a.id = kc.linked_id
      WHERE kc.board_id = ?
      ORDER BY kc.sort_order ASC
    `).all(id);

    // Formatar cartões
    const formattedCards = cards.map(card => ({
      ...card,
      tags: JSON.parse(card.tags || '[]')
    }));

    return {
      metadata: {
        ...board,
        columns
      },
      cards: formattedCards
    };
  }

  /**
   * Cria um novo cartão no quadro
   */
  static createCard(boardId, cardData) {
    const db = getDb();
    const { title, description, columnId, tags, dueDate, linkedType, linkedId } = cardData;

    // Calcular próximo sort_order da coluna
    const lastCard = db.prepare(`
      SELECT sort_order FROM kanban_cards 
      WHERE board_id = ? AND column_id = ? 
      ORDER BY sort_order DESC LIMIT 1
    `).get(boardId, columnId);
    
    const nextOrder = lastCard ? lastCard.sort_order + 1 : 0;

    const result = db.prepare(`
      INSERT INTO kanban_cards (
        board_id, title, description, column_id, sort_order, linked_type, linked_id, tags, due_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      boardId,
      title,
      description || '',
      columnId,
      nextOrder,
      linkedType || null,
      linkedId || null,
      JSON.stringify(tags || []),
      dueDate || null,
      new Date().toISOString(),
      new Date().toISOString()
    );

    return this.getBoard(boardId);
  }

  /**
   * Atualiza a posição do cartão (ao arrastar para outra coluna ou reordenar)
   */
  static updateCardPosition(cardId, columnId, sortOrder) {
    const db = getDb();
    
    db.prepare(`
      UPDATE kanban_cards 
      SET column_id = ?, sort_order = ?, updated_at = ? 
      WHERE id = ?
    `).run(columnId, sortOrder, new Date().toISOString(), cardId);

    // Se o cartão foi movido para a coluna 'done' e está vinculado a um artigo, marcar o artigo correspondente como concluído!
    const card = db.prepare('SELECT linked_type, linked_id FROM kanban_cards WHERE id = ?').get(cardId);
    if (card && card.linked_type === 'article' && card.linked_id) {
      let artStatus = 'studying';
      if (columnId === 'done') artStatus = 'completed';
      else if (columnId === 'todo') artStatus = 'not_started';
      
      db.prepare('UPDATE articles SET status = ? WHERE id = ?').run(artStatus, card.linked_id);
    }
  }

  /**
   * Atualiza os detalhes de um cartão
   */
  static updateCard(cardId, cardData) {
    const db = getDb();
    const { title, description, tags, dueDate } = cardData;

    db.prepare(`
      UPDATE kanban_cards SET 
        title = ?, description = ?, tags = ?, due_date = ?, updated_at = ?
      WHERE id = ?
    `).run(
      title,
      description || '',
      JSON.stringify(tags || []),
      dueDate || null,
      new Date().toISOString(),
      cardId
    );
  }

  /**
   * Exclui um cartão
   */
  static deleteCard(cardId) {
    const db = getDb();
    db.prepare('DELETE FROM kanban_cards WHERE id = ?').run(cardId);
  }
}
