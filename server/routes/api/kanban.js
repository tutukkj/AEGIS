import express from 'express';
import { KanbanService } from '../../services/KanbanService.js';

const router = express.Router();

// Listar quadros
router.get('/boards', (req, res) => {
  try {
    const boards = KanbanService.getBoards();
    return res.json(boards);
  } catch (err) {
    console.error('Erro ao buscar quadros:', err);
    return res.status(500).json({ error: 'Erro ao buscar quadros' });
  }
});

// Detalhes do quadro
router.get('/boards/:id', (req, res) => {
  const { id } = req.params;
  try {
    const board = KanbanService.getBoard(id);
    if (!board) {
      return res.status(404).json({ error: 'Quadro Kanban não encontrado' });
    }
    return res.json(board);
  } catch (err) {
    console.error(`Erro ao carregar quadro ${id}:`, err);
    return res.status(500).json({ error: 'Erro ao carregar quadro' });
  }
});

// Criar cartão no quadro
router.post('/boards/:id/cards', (req, res) => {
  const { id } = req.params;
  try {
    const board = KanbanService.createCard(id, req.body);
    return res.json(board);
  } catch (err) {
    console.error('Erro ao criar cartão Kanban:', err);
    return res.status(500).json({ error: 'Erro ao criar cartão' });
  }
});

// Atualizar posição do cartão (coluna e ordenação - drag and drop)
router.put('/cards/:cardId/position', (req, res) => {
  const { cardId } = req.params;
  const { columnId, sortOrder } = req.body;

  try {
    KanbanService.updateCardPosition(cardId, columnId, parseInt(sortOrder) || 0);
    return res.json({ success: true });
  } catch (err) {
    console.error(`Erro ao mover cartão ${cardId}:`, err);
    return res.status(500).json({ error: 'Erro ao mover cartão' });
  }
});

// Editar detalhes de um cartão
router.put('/cards/:cardId', (req, res) => {
  const { cardId } = req.params;
  try {
    KanbanService.updateCard(cardId, req.body);
    return res.json({ success: true });
  } catch (err) {
    console.error(`Erro ao editar cartão ${cardId}:`, err);
    return res.status(500).json({ error: 'Erro ao editar cartão' });
  }
});

// Excluir cartão
router.delete('/cards/:cardId', (req, res) => {
  const { cardId } = req.params;
  try {
    KanbanService.deleteCard(cardId);
    return res.json({ success: true });
  } catch (err) {
    console.error(`Erro ao excluir cartão ${cardId}:`, err);
    return res.status(500).json({ error: 'Erro ao excluir cartão' });
  }
});

export default router;
