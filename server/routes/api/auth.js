import express from 'express';
import { AuthService } from '../../services/AuthService.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ error: 'Senha é obrigatória' });
  }
  
  try {
    // Usamos o usuário padrão 'admin'
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '';
    const userAgent = req.headers['user-agent'] || '';
    
    const { token, username } = await AuthService.login('admin', password, ipAddress, userAgent);
    
    // Configurar o cookie HttpOnly seguro
    res.cookie('aegis_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
    });
    
    return res.json({ success: true, username });
  } catch (err) {
    console.error('Erro de login:', err);
    return res.status(401).json({ error: err.message || 'Senha incorreta' });
  }
});

router.post('/logout', (req, res) => {
  const token = req.cookies ? req.cookies.aegis_token : null;
  
  if (token) {
    AuthService.logout(token);
  }
  
  // Limpar o cookie
  res.clearCookie('aegis_token');
  return res.json({ success: true, message: 'Logout realizado com sucesso' });
});

router.get('/check', (req, res) => {
  // Se passou pelo middleware, req.user está definido
  if (req.user) {
    return res.json({ authenticated: true, user: req.user });
  }
  return res.json({ authenticated: false });
});

router.put('/password', async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Senha antiga e nova são obrigatórias' });
  }
  
  if (!req.user) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  
  try {
    await AuthService.changePassword(req.user.userId, oldPassword, newPassword);
    
    // Como a senha mudou e o secret mudou, invalidou a sessão
    // Limpamos o cookie para forçar relogin
    res.clearCookie('aegis_token');
    return res.json({ success: true, message: 'Senha alterada com sucesso. Faça login novamente.' });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Erro ao alterar senha' });
  }
});

export default router;
