import express from 'express';
import { SearchService } from '../../services/SearchService.js';

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim() === '') {
      return res.json([]);
    }
    
    const results = SearchService.search(q);
    return res.json(results);
  } catch (err) {
    console.error('Erro de busca:', err);
    return res.status(500).json({ error: 'Erro interno ao realizar busca' });
  }
});

export default router;
