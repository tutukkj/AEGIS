import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

export const PORT = process.env.PORT || 3000;
export const JWT_EXPIRY = '7d';

export const PATHS = {
  root: ROOT_DIR,
  content: path.join(ROOT_DIR, 'content'),
  database: path.join(ROOT_DIR, 'database'),
  storage: path.join(ROOT_DIR, 'storage'),
  assets: path.join(ROOT_DIR, 'assets'),
  client: path.join(ROOT_DIR, 'client'),
};

export const DB_FILE = path.join(PATHS.database, 'aegis.db');
