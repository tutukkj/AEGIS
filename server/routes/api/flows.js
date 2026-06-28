import express from 'express';
import { FlowService } from '../../services/FlowService.js';

const router = express.Router();

// Listar todos os diagramas
router.get('/', (req, res) => {
  try {
    const flows = FlowService.getFlows();
    return res.json(flows);
  } catch (err) {
    console.error('Erro ao listar diagramas:', err);
    return res.status(500).json({ error: 'Erro ao listar diagramas' });
  }
});

// Obter detalhes por ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  try {
    const flow = FlowService.getFlow(id);
    if (!flow) {
      return res.status(404).json({ error: 'Diagrama não encontrado' });
    }
    return res.json(flow);
  } catch (err) {
    console.error(`Erro ao obter diagrama ${id}:`, err);
    return res.status(500).json({ error: 'Erro ao obter diagrama' });
  }
});

// Criar diagrama
router.post('/', (req, res) => {
  const { name, type, content } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Nome é obrigatório' });
  }
  try {
    const flow = FlowService.createFlow(name, type, content);
    return res.json(flow);
  } catch (err) {
    console.error('Erro ao criar diagrama:', err);
    return res.status(500).json({ error: 'Erro ao criar diagrama' });
  }
});

// Salvar diagrama
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, content } = req.body;
  if (!name || content === undefined) {
    return res.status(400).json({ error: 'Nome e conteúdo são obrigatórios' });
  }
  try {
    const flow = FlowService.saveFlow(id, name, content);
    return res.json(flow);
  } catch (err) {
    console.error(`Erro ao salvar diagrama ${id}:`, err);
    return res.status(500).json({ error: 'Erro ao salvar diagrama' });
  }
});

// Excluir diagrama
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  try {
    FlowService.deleteFlow(id);
    return res.json({ success: true });
  } catch (err) {
    console.error(`Erro ao deletar diagrama ${id}:`, err);
    return res.status(500).json({ error: 'Erro ao deletar diagrama' });
  }
});

export default router;
