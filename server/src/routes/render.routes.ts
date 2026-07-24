import { Router } from 'express';
import { renderCompositeVideo, concatAudiosAndGenerateMaster, concatFinalVideos, renderTimeline } from '../controllers/render.controller';

const router = Router();

router.post('/composite', renderCompositeVideo);
router.post('/concat-audios', concatAudiosAndGenerateMaster);
router.post('/concat-videos', concatFinalVideos);
router.post('/timeline', renderTimeline);

export default router;
