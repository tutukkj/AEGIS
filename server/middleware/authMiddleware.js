import { AuthService } from '../services/AuthService.js';

export function authMiddleware(req, res, next) {
  const path = req.path;
  
  // Caminhos que não requerem autenticação
  const publicPaths = [
    '/login',
    '/api/auth/login',
    '/css/app.css',
    '/js/utils/api.js',
    '/js/utils/dom.js',
    '/js/components/LoginPage.js'
  ];
  
  // Se for um arquivo de asset em /assets, é público
  const isAsset = path.startsWith('/assets/');
  
  const isPublic = publicPaths.includes(path) || isAsset;

  // Extrair token do cookie
  const token = req.cookies ? req.cookies.aegis_token : null;
  let user = null;

  if (token) {
    user = AuthService.verifyToken(token);
  }

  if (user) {
    req.user = user;
    
    // Se o usuário já está autenticado e tentar ir para /login, redireciona para a home
    if (path === '/login') {
      return res.redirect('/');
    }
    
    return next();
  }

  // Não está autenticado
  if (isPublic) {
    return next();
  }

  // Se for uma rota da API, retorna 401
  if (path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Não autorizado. Faça login para continuar.' });
  }

  // Se for uma página, redireciona para a tela de login
  return res.redirect('/login');
}
