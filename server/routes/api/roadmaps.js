import express from 'express';
import { RoadmapService } from '../../services/RoadmapService.js';

const router = express.Router();

// Listar todos os roadmaps
router.get('/', (req, res) => {
  try {
    const roadmaps = RoadmapService.getRoadmaps();
    return res.json(roadmaps);
  } catch (err) {
    console.error('Erro ao listar roadmaps:', err);
    return res.status(500).json({ error: 'Erro ao listar roadmaps' });
  }
});

// Obter roadmap detalhado por slug
router.get('/:slug', (req, res) => {
  const { slug } = req.params;
  try {
    const roadmap = RoadmapService.getRoadmap(slug);
    if (!roadmap) {
      return res.status(404).json({ error: 'Roadmap não encontrado' });
    }
    return res.json(roadmap);
  } catch (err) {
    console.error(`Erro ao obter roadmap ${slug}:`, err);
    return res.status(500).json({ error: 'Erro ao obter roadmap' });
  }
});

// Atualizar checklist de um nó específico
router.put('/:slug/nodes/:nodeId/checklist', (req, res) => {
  const { slug, nodeId } = req.params;
  const { checklist } = req.body;
  
  if (!Array.isArray(checklist)) {
    return res.status(400).json({ error: 'Campo checklist deve ser um array' });
  }

  try {
    const updatedRoadmap = RoadmapService.updateNodeChecklist(slug, nodeId, checklist);
    return res.json(updatedRoadmap);
  } catch (err) {
    console.error(`Erro ao atualizar checklist do nó ${nodeId}:`, err);
    return res.status(400).json({ error: err.message || 'Erro ao atualizar checklist' });
  }
});

// Atualizar status de um nó específico
router.put('/:slug/nodes/:nodeId/status', (req, res) => {
  const { slug, nodeId } = req.params;
  const { status } = req.body;
  
  if (!status) {
    return res.status(400).json({ error: 'Status é obrigatório' });
  }

  try {
    const updatedRoadmap = RoadmapService.updateNodeStatus(slug, nodeId, status);
    return res.json(updatedRoadmap);
  } catch (err) {
    console.error(`Erro ao atualizar status do nó ${nodeId}:`, err);
    return res.status(400).json({ error: err.message || 'Erro ao atualizar status' });
  }
});

export default router;
