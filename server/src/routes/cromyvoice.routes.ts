import { Router } from 'express';
import {
  generateAudio,
  checkStatus,
  generateVideo,
  getAudios,
  getVideos,
  getModels,
  getProfiles,
  getVideoProfiles
} from '../controllers/cromyvoice.controller';

const router = Router();

router.post('/generate', generateAudio);
router.get('/status/:id', checkStatus);
router.post('/video/generate', generateVideo);

router.get('/audios', getAudios);
router.get('/videos', getVideos);
router.get('/models', getModels);
router.get('/profiles', getProfiles);
router.get('/video/profiles', getVideoProfiles);

export default router;
