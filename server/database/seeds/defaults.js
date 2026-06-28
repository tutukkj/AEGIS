import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function seed(db) {
  // Verificar se já existe algum usuário
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  
  if (userCount === 0) {
    console.log('Nenhum usuário encontrado. Criando usuário admin padrão...');
    
    // Hash da senha aegis123
    const passwordHash = await bcrypt.hash('aegis123', 12);
    // Gerar um secret JWT único para este usuário/instância
    const jwtSecret = crypto.randomBytes(32).toString('hex');
    
    const stmt = db.prepare(`
      INSERT INTO users (username, password_hash, jwt_secret, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      'admin',
      passwordHash,
      jwtSecret,
      new Date().toISOString(),
      new Date().toISOString()
    );
    
    console.log('Usuário admin criado com sucesso. Senha padrão: aegis123');
  }

  // Seeder de Configurações Padrão
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get().count;
  if (settingsCount === 0) {
    console.log('Inserindo configurações padrão...');
    
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
    `);
    
    const defaultSettings = [
      { key: 'theme', value: 'dark' },
      { key: 'language', value: 'pt-BR' },
      { key: 'pomodoro_duration', value: '25' },
      { key: 'short_break_duration', value: '5' },
      { key: 'long_break_duration', value: '15' },
      { key: 'auto_save_interval', value: '2000' } // ms
    ];
    
    for (const setting of defaultSettings) {
      stmt.run(setting.key, setting.value, new Date().toISOString());
    }
    
    console.log('Configurações padrão inseridas.');
  }
}
