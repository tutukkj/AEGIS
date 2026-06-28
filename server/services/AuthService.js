import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getDb } from '../database/connection.js';
import { JWT_EXPIRY } from '../config.js';

export class AuthService {
  static async login(username, password, ipAddress = '', userAgent = '') {
    const db = getDb();
    
    // Obter usuário do banco
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }
    
    // Validar senha
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new Error('Senha incorreta');
    }
    
    // Gerar JWT com o secret próprio do usuário
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      user.jwt_secret,
      { expiresIn: JWT_EXPIRY }
    );
    
    // Salvar sessão no banco de dados
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias
    
    const stmt = db.prepare(`
      INSERT INTO sessions (user_id, token, ip_address, user_agent, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      user.id,
      token,
      ipAddress,
      userAgent,
      new Date().toISOString(),
      expiresAt.toISOString()
    );
    
    return { token, username: user.username };
  }
  
  static logout(token) {
    const db = getDb();
    const stmt = db.prepare('DELETE FROM sessions WHERE token = ?');
    const result = stmt.run(token);
    return result.changes > 0;
  }
  
  static verifyToken(token) {
    const db = getDb();
    
    // Obter sessão do banco para verificar expiração e existência
    const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
    if (!session) {
      return null;
    }
    
    // Verificar se expirou no banco
    if (new Date(session.expires_at) < new Date()) {
      db.prepare('DELETE FROM sessions WHERE id = ?').run(session.id);
      return null;
    }
    
    // Obter o usuário para pegar seu jwt_secret
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id);
    if (!user) {
      return null;
    }
    
    try {
      // Validar assinatura do JWT usando o secret do usuário
      const decoded = jwt.verify(token, user.jwt_secret);
      return { userId: user.id, username: user.username };
    } catch (err) {
      // Se deu erro na validação do JWT, remover a sessão correspondente do banco
      db.prepare('DELETE FROM sessions WHERE id = ?').run(session.id);
      return null;
    }
  }
  
  static async changePassword(userId, oldPassword, newPassword) {
    const db = getDb();
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }
    
    // Validar senha antiga
    const isValid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isValid) {
      throw new Error('Senha antiga incorreta');
    }
    
    // Hash da nova senha
    const newHash = await bcrypt.hash(newPassword, 12);
    
    // Gerar um novo jwt_secret para invalidar todas as sessões existentes deste usuário
    const newSecret = crypto.randomBytes(32).toString('hex');
    
    db.exec('BEGIN');
    try {
      // Atualizar senha e secret
      db.prepare('UPDATE users SET password_hash = ?, jwt_secret = ?, updated_at = ? WHERE id = ?')
        .run(newHash, newSecret, new Date().toISOString(), userId);
        
      // Deletar todas as sessões antigas
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
    
    return true;
  }
}
