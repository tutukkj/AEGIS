import express from 'express';
import { PomodoroService } from '../../services/PomodoroService.js';

const router = express.Router();

router.post('/start', (req, res) => {
  const { articleSlug, durationMinutes } = req.body;
  try {
    const session = PomodoroService.startSession(articleSlug, durationMinutes);
    return res.json(session);
  } catch (err) {
    console.error('Erro ao iniciar Pomodoro:', err);
    return res.status(500).json({ error: 'Erro ao iniciar Pomodoro' });
  }
});

router.post('/end', (req, res) => {
  const { sessionId, interruptions, notes } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'ID da sessão é obrigatório' });
  }

  try {
    const result = PomodoroService.endSession(sessionId, parseInt(interruptions) || 0, notes || '');
    return res.json(result);
  } catch (err) {
    console.error('Erro ao encerrar Pomodoro:', err);
    return res.status(400).json({ error: err.message || 'Erro ao encerrar Pomodoro' });
  }
});

export default router;
