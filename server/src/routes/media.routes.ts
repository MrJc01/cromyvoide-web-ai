import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { CONFIG } from '../config/env';
import {
  uploadMedia,
  getMediaList,
  updateMediaItem,
  deleteMedia,
  getGroups,
  createGroup,
  deleteGroup,
  editVideoMedia
} from '../controllers/media.controller';
import { semanticSearch } from '../controllers/search.controller';

const router = Router();

// Configura o multer para uploads em lote de múltiplos arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(CONFIG.UPLOADS_DIR, 'images');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `media_${uuidv4()}${ext}`);
  }
});

const upload = multer({ storage });

// Aceita tanto upload.array('files') quanto upload.single('file')
router.post('/upload', upload.any(), uploadMedia);
router.get('/', getMediaList);
router.post('/search', semanticSearch);
router.post('/edit-video', editVideoMedia);
router.patch('/:id', updateMediaItem);
router.delete('/:id', deleteMedia);

// Rotas de Grupos
router.get('/groups', getGroups);
router.post('/groups', createGroup);
router.delete('/groups/:id', deleteGroup);

export default router;
