import { Request, Response } from 'express';
import { openRouterService } from '../services/openrouter.service';
import { db } from '../db/database';

export const generateScript = async (req: Request, res: Response): Promise<void> => {
  try {
    const { rawInformation, tone, groupIds, requireMinSimilarityThreshold, minSimilarityScore } = req.body;

    if (!rawInformation || typeof rawInformation !== 'string' || !rawInformation.trim()) {
      res.status(400).json({ error: 'Envie o texto/informações brutas no campo "rawInformation".' });
      return;
    }

    const script = await openRouterService.generateScript({
      rawInformation,
      tone,
      groupIds: groupIds || ['all'],
      requireMinSimilarityThreshold: requireMinSimilarityThreshold ?? true,
      minSimilarityScore: Number(minSimilarityScore) || 0.35
    });

    res.status(201).json({
      success: true,
      message: 'Roteiro gerado e mídias associadas com sucesso!',
      script
    });
  } catch (err: any) {
    console.error('Erro ao gerar roteiro:', err);
    res.status(500).json({ error: err.message || 'Erro interno ao gerar roteiro.' });
  }
};

export const getScripts = (req: Request, res: Response) => {
  const scripts = db.getScripts();
  res.json(scripts);
};

export const getScriptById = (req: Request, res: Response): void => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const script = db.getScriptById(id);
  if (!script) {
    res.status(404).json({ error: 'Roteiro não encontrado.' });
    return;
  }
  res.json(script);
};

export const updateSceneMedia = (req: Request, res: Response): void => {
  const scriptId = Array.isArray(req.params.scriptId) ? req.params.scriptId[0] : req.params.scriptId;
  const sceneId = Array.isArray(req.params.sceneId) ? req.params.sceneId[0] : req.params.sceneId;
  const { mediaId, mediaUrl } = req.body;

  const script = db.getScriptById(scriptId);
  if (!script) {
    res.status(404).json({ error: 'Roteiro não encontrado.' });
    return;
  }

  const scene = script.scenes.find(s => s.id === sceneId);
  if (!scene) {
    res.status(404).json({ error: 'Cena não encontrada no roteiro.' });
    return;
  }

  scene.selectedMediaId = mediaId;
  scene.selectedMediaUrl = mediaUrl;

  db.saveScript(script);

  res.json({
    success: true,
    message: 'Mídia da cena atualizada.',
    script
  });
};
