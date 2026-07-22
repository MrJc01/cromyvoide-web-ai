import { Router } from 'express';
import { generateScript, getScripts, getScriptById, updateSceneMedia } from '../controllers/script.controller';

const router = Router();

router.post('/generate', generateScript);
router.get('/', getScripts);
router.get('/:id', getScriptById);
router.patch('/:scriptId/scenes/:sceneId/media', updateSceneMedia);
router.patch('/:scriptId/scene/:sceneId', updateSceneMedia);

export default router;
