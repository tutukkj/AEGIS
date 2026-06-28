import express from 'express';
import path from 'path';
import { PATHS } from '../config.js';

const router = express.Router();

router.get('/login', (req, res) => {
  res.sendFile(path.join(PATHS.client, 'views', 'login.html'));
});

// Rota coringa para o shell da SPA
router.get('*', (req, res, next) => {
  // Ignorar chamadas de API ou arquivos estáticos com extensões
  if (req.path.startsWith('/api/') || req.path.includes('.')) {
    return next();
  }
  res.sendFile(path.join(PATHS.client, 'views', 'index.html'));
});

export default router;
