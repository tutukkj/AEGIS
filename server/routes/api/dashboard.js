import express from 'express';
import { DashboardService } from '../../services/DashboardService.js';

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const stats = DashboardService.getDashboardStats();
    return res.json(stats);
  } catch (err) {
    console.error('Erro ao coletar estatísticas do dashboard:', err);
    return res.status(500).json({ error: 'Erro ao coletar estatísticas do dashboard' });
  }
});

export default router;
