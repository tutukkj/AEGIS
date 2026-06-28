import express from 'express';
import { MarkdownService } from '../../services/MarkdownService.js';
import { BacklinkService } from '../../services/BacklinkService.js';
import { getDb } from '../../database/connection.js';

const router = express.Router();

// Listar todos os artigos
router.get('/', (req, res) => {
  try {
    const { type, status, tag } = req.query;
    
    // Obter todos do banco
    const db = getDb();
    let query = 'SELECT * FROM articles WHERE 1=1';
    const params = [];
    
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (tag) {
      query += ' AND tags LIKE ?';
      params.push(`%"${tag}"%`); // Tags são salvas em JSON
    }
    
    query += ' ORDER BY title ASC';
    
    const articles = db.prepare(query).all(...params);
    
    // Fazer parse das strings JSON
    const parsedArticles = articles.map(art => ({
      ...art,
      tags: JSON.parse(art.tags || '[]'),
      aliases: JSON.parse(art.aliases || '[]'),
      related: JSON.parse(art.related || '[]')
    }));
    
    return res.json(parsedArticles);
  } catch (err) {
    console.error('Erro ao listar artigos:', err);
    return res.status(500).json({ error: 'Erro ao listar artigos' });
  }
});

// Obter artigo individual pelo slug
router.get('/:slug', (req, res) => {
  const { slug } = req.params;
  
  try {
    const article = MarkdownService.getArticle(slug);
    
    if (!article) {
      return res.status(404).json({ error: 'Artigo não encontrado' });
    }
    
    return res.json(article);
  } catch (err) {
    console.error(`Erro ao obter artigo ${slug}:`, err);
    return res.status(500).json({ error: 'Erro ao obter artigo' });
  }
});

// Criar novo artigo
router.post('/', async (req, res) => {
  const { category, filename, title } = req.body;
  
  if (!category || !filename || !title) {
    return res.status(400).json({ error: 'Os campos categoria, nome do arquivo e título são obrigatórios.' });
  }
  
  try {
    const article = await MarkdownService.createArticle(category, filename, title);
    return res.status(201).json(article);
  } catch (err) {
    console.error('Erro ao criar artigo:', err);
    return res.status(400).json({ error: err.message || 'Erro ao criar artigo' });
  }
});

// Atualizar artigo
router.put('/:slug', async (req, res) => {
  const { slug } = req.params;
  const { frontmatter, markdown } = req.body;
  
  if (!frontmatter || markdown === undefined) {
    return res.status(400).json({ error: 'Metadados (frontmatter) e conteúdo (markdown) são obrigatórios.' });
  }
  
  try {
    const article = await MarkdownService.saveArticle(slug, frontmatter, markdown);
    return res.json(article);
  } catch (err) {
    console.error(`Erro ao salvar artigo ${slug}:`, err);
    return res.status(400).json({ error: err.message || 'Erro ao salvar artigo' });
  }
});

// Excluir artigo
router.delete('/:slug', (req, res) => {
  const { slug } = req.params;
  
  try {
    const deleted = MarkdownService.deleteArticle(slug);
    if (!deleted) {
      return res.status(404).json({ error: 'Artigo não encontrado' });
    }
    return res.json({ success: true, message: 'Artigo excluído com sucesso.' });
  } catch (err) {
    console.error(`Erro ao excluir artigo ${slug}:`, err);
    return res.status(500).json({ error: 'Erro ao excluir artigo' });
  }
});

// Obter backlinks do artigo pelo slug
router.get('/:slug/backlinks', (req, res) => {
  const { slug } = req.params;
  
  try {
    const db = getDb();
    const article = db.prepare('SELECT id FROM articles WHERE slug = ?').get(slug);
    
    if (!article) {
      return res.status(404).json({ error: 'Artigo não encontrado' });
    }
    
    const backlinks = BacklinkService.getBacklinks(article.id);
    return res.json(backlinks);
  } catch (err) {
    console.error(`Erro ao obter backlinks de ${slug}:`, err);
    return res.status(500).json({ error: 'Erro ao obter backlinks' });
  }
});

export default router;
