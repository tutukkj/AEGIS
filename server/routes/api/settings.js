import express from 'express';
import { SettingsService } from '../../services/SettingsService.js';

const router = express.Router();

// Obter configurações
router.get('/', (req, res) => {
  try {
    const settings = SettingsService.getSettings();
    return res.json(settings);
  } catch (err) {
    console.error('Erro ao ler configurações:', err);
    return res.status(500).json({ error: 'Erro ao ler configurações' });
  }
});

// Atualizar configurações
router.put('/', (req, res) => {
  try {
    const updatedSettings = SettingsService.updateSettings(req.body);
    return res.json(updatedSettings);
  } catch (err) {
    console.error('Erro ao atualizar configurações:', err);
    return res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
});

export default router;
