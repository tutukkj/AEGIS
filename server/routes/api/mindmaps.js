import express from 'express';
import { MindMapService } from '../../services/MindMapService.js';

const router = express.Router();

// Listar todos os mapas mentais
router.get('/', (req, res) => {
  try {
    const mindmaps = MindMapService.getMindMaps();
    return res.json(mindmaps);
  } catch (err) {
    console.error('Erro ao listar mapas mentais:', err);
    return res.status(500).json({ error: 'Erro ao listar mapas mentais' });
  }
});

// Carregar detalhes por ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  try {
    const mindmap = MindMapService.getMindMap(id);
    if (!mindmap) {
      return res.status(404).json({ error: 'Mapa mental não encontrado' });
    }
    return res.json(mindmap);
  } catch (err) {
    console.error(`Erro ao obter mapa mental ${id}:`, err);
    return res.status(500).json({ error: 'Erro ao obter mapa mental' });
  }
});

// Criar mapa mental
router.post('/', (req, res) => {
  const { name, rootArticleId } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Nome é obrigatório' });
  }

  try {
    const mindmap = MindMapService.createMindMap(name, rootArticleId);
    return res.json(mindmap);
  } catch (err) {
    console.error('Erro ao criar mapa mental:', err);
    return res.status(500).json({ error: 'Erro ao criar mapa mental' });
  }
});

// Salvar dados e posições (layout) do mapa mental
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { treeData } = req.body;

  if (!treeData) {
    return res.status(400).json({ error: 'Os dados do grafo são obrigatórios' });
  }

  try {
    const updated = MindMapService.saveMindMap(id, treeData);
    return res.json(updated);
  } catch (err) {
    console.error(`Erro ao salvar mapa mental ${id}:`, err);
    return res.status(500).json({ error: 'Erro ao salvar mapa mental' });
  }
});

// Excluir mapa mental
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  try {
    MindMapService.deleteMindMap(id);
    return res.json({ success: true });
  } catch (err) {
    console.error(`Erro ao deletar mapa mental ${id}:`, err);
    return res.status(500).json({ error: 'Erro ao deletar mapa mental' });
  }
});

export default router;
