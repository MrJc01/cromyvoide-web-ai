import dotenv from 'dotenv';
import path from 'path';

// Carrega as variáveis do .env na raiz ou na pasta server
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const CONFIG = {
  PORT: process.env.PORT || 3001,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  AISTUDIO_API_KEY: process.env.AISTUDIO_API_KEY || process.env.GEMINI_API_KEY || '',
  CROMYVOICE_API_KEY: process.env.CROMYVOICE_API_KEY || 'cv_174a0170fd1d4b602fd24109f250b409ee83107fc1749ef905c19791d27d7855',
  CROMYVOICE_BASE_URL: process.env.CROMYVOICE_BASE_URL || 'https://cromyvoice0.crom.me',
  UPLOADS_DIR: path.resolve(__dirname, '../../uploads'),
  DATA_FILE: path.resolve(__dirname, '../../db_store.json'),
};
