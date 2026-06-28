import express from 'express';
import { ProjectService } from '../../services/ProjectService.js';

const router = express.Router();

// Listar todos os projetos
router.get('/', (req, res) => {
  try {
    const projects = ProjectService.getProjects();
    return res.json(projects);
  } catch (err) {
    console.error('Erro ao listar projetos:', err);
    return res.status(500).json({ error: 'Erro ao listar projetos' });
  }
});

// Atualizar status e progresso de um projeto
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { status, progress } = req.body;

  try {
    const result = ProjectService.updateProject(id, status, progress);
    return res.json(result);
  } catch (err) {
    console.error(`Erro ao atualizar projeto ${id}:`, err);
    return res.status(400).json({ error: err.message || 'Erro ao atualizar projeto' });
  }
});

export default router;
