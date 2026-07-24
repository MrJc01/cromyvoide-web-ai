import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { CONFIG } from './config/env';

import scriptRoutes from './routes/script.routes';
import mediaRoutes from './routes/media.routes';
import searchRoutes from './routes/search.routes';
import cromyVoiceRoutes from './routes/cromyvoice.routes';
import renderRoutes from './routes/render.routes';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Garantir que diretórios de uploads existam
const uploadsDir = CONFIG.UPLOADS_DIR;
['images', 'audios', 'outputs'].forEach(folder => {
  const dirPath = path.join(uploadsDir, folder);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Arquivos estáticos de mídia
app.use('/uploads', express.static(uploadsDir));

// Rotas da API REST (Suporta aliases flexíveis para o cliente React)
app.use('/api/script', scriptRoutes);
app.use('/api/scripts', scriptRoutes);

app.use('/api/media', mediaRoutes);

app.use('/api/search', searchRoutes);
app.use('/api/media/search', searchRoutes);

app.use('/api/cromyvoice', cromyVoiceRoutes);
app.use('/api/render', renderRoutes);

// Health check / Info API REST
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'CromyVoice Studio Pro API',
    cromyVoiceBaseUrl: CONFIG.CROMYVOICE_BASE_URL,
    timestamp: new Date().toISOString()
  });
});

app.listen(Number(CONFIG.PORT), '0.0.0.0', () => {
  console.log(`
  🚀 ======================================================
  🎙️ CromyVoice AI Studio Pro API REST rodando na porta ${CONFIG.PORT} (0.0.0.0)
  🔗 API Health: http://localhost:${CONFIG.PORT}/api/health
  📁 Static Uploads: http://localhost:${CONFIG.PORT}/uploads
  ======================================================
  `);
});
