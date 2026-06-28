import express from 'express';
import { GraphService } from '../../services/GraphService.js';

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const graphData = GraphService.getGraphData();
    return res.json(graphData);
  } catch (err) {
    console.error('Erro ao buscar dados do grafo:', err);
    return res.status(500).json({ error: 'Erro ao buscar dados do grafo' });
  }
});

export default router;
