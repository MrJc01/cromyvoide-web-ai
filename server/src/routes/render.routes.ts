import { Router } from 'express';
import { renderCompositeVideo, concatAudiosAndGenerateMaster, concatFinalVideos } from '../controllers/render.controller';

const router = Router();

router.post('/composite', renderCompositeVideo);
router.post('/concat-audios', concatAudiosAndGenerateMaster);
router.post('/concat-videos', concatFinalVideos);

export default router;
