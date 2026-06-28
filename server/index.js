import express from 'express';
import http from 'http';
import cookieParser from 'cookie-parser';
import path from 'path';
import { PORT, PATHS } from './config.js';
import { getDb, initDatabase } from './database/connection.js';
import { seed } from './database/seeds/defaults.js';
import { authMiddleware } from './middleware/authMiddleware.js';

// API Routes
import authRoutes from './routes/api/auth.js';
import articlesRoutes from './routes/api/articles.js';
import graphRoutes from './routes/api/graph.js';
import searchRoutes from './routes/api/search.js';
import roadmapsRoutes from './routes/api/roadmaps.js';
import dashboardRoutes from './routes/api/dashboard.js';
import pomodoroRoutes from './routes/api/pomodoro.js';
import kanbanRoutes from './routes/api/kanban.js';
import projectsRoutes from './routes/api/projects.js';
import mindmapsRoutes from './routes/api/mindmaps.js';
import settingsRoutes from './routes/api/settings.js';
// Páginas SPA
import pageRoutes from './routes/pages.js';
// WebSocket Server
import { initWebSocket } from './websocket/index.js';
// Services para inicialização
import { MarkdownService } from './services/MarkdownService.js';
import { FileWatcherService } from './services/FileWatcherService.js';
import { RoadmapService } from './services/RoadmapService.js';

const app = express();
const server = http.createServer(app);

// Inicializar WebSocket
initWebSocket(server);

// Middleware Config
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Servir arquivos estáticos do cliente ANTES do middleware de auth para permitir assets públicos
app.use(express.static(PATHS.client));

// Middleware Global de Autenticação
app.use(authMiddleware);

// Montar rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/articles', articlesRoutes);
app.use('/api/graph', graphRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/roadmaps', roadmapsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/pomodoro', pomodoroRoutes);
app.use('/api/kanban', kanbanRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/mindmaps', mindmapsRoutes);
app.use('/api/settings', settingsRoutes);

// Servir arquivos estáticos do diretório storage/assets (caso o usuário salve imagens)
app.use('/assets', express.static(PATHS.assets));

// Roteador de páginas (coringa SPA)
app.use('/', pageRoutes);

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor'
  });
});

async function startServer() {
  try {
    console.log('Inicializando banco de dados...');
    await initDatabase();
    
    console.log('Executando seeders...');
    const db = getDb();
    await seed(db);
    
    console.log('Escaneando e indexando arquivos markdown...');
    await MarkdownService.scanAndIndex();
    
    console.log('Sincronizando roadmaps...');
    RoadmapService.syncRoadmaps();
    
    console.log('Iniciando monitoramento de arquivos...');
    FileWatcherService.start();
    
    server.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`  Aegis Learning OS rodando em:`);
      console.log(`  http://localhost:${PORT}`);
      console.log(`===============================================`);
    });
  } catch (err) {
    console.error('Falha ao iniciar o servidor:', err);
    process.exit(1);
  }
}

startServer();
