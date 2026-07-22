import { Request, Response } from 'express';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { db, MediaItem } from '../db/database';
import { embeddingService } from '../services/embedding.service';
import { ffmpegService } from '../services/ffmpeg.service';

export const uploadMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const filesToProcess: Express.Multer.File[] = [];

    if (req.files && Array.isArray(req.files)) {
      filesToProcess.push(...(req.files as Express.Multer.File[]));
    } else if (req.file) {
      filesToProcess.push(req.file);
    }

    if (filesToProcess.length === 0) {
      res.status(400).json({ error: 'Nenhum arquivo enviado.' });
      return;
    }

    const { groupId = 'default', customDescription } = req.body;
    const createdItems: MediaItem[] = [];

    console.log(`🖼️ [MediaController] Processando lote de ${filesToProcess.length} arquivo(s)...`);

    for (const file of filesToProcess) {
      const fileId = uuidv4();
      const relativeUrl = `/uploads/images/${file.filename}`;
      const absolutePath = file.path;

      // Gera descrição e embedding semântico para cada imagem
      const autoDescription = await embeddingService.generateImageDescription(absolutePath, file.originalname);
      const embedding = await embeddingService.getImageEmbedding(absolutePath);
      const description = customDescription || autoDescription;

      const newMedia = db.addMedia({
        id: fileId,
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        filepath: absolutePath,
        url: relativeUrl,
        description,
        embedding,
        groupId,
        createdAt: new Date().toISOString()
      });

      createdItems.push(newMedia);
    }

    res.status(201).json({
      success: true,
      message: `${createdItems.length} mídia(s) enviada(s) e embeddings processados com sucesso!`,
      mediaList: createdItems,
      media: createdItems[0]
    });
  } catch (err: any) {
    console.error('Erro no upload de mídias:', err);
    res.status(500).json({ error: err.message || 'Erro interno ao processar upload.' });
  }
};

export const getMediaList = (req: Request, res: Response) => {
  const { groupId } = req.query;
  let media = db.getMedia();
  if (groupId && groupId !== 'all') {
    media = media.filter(m => m.groupId === groupId);
  }
  res.json(media);
};

export const updateMediaItem = (req: Request, res: Response): void => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { groupId, description } = req.body;

  const updated = db.updateMedia(id, {
    ...(groupId ? { groupId } : {}),
    ...(description ? { description } : {})
  });

  if (updated) {
    res.json({ success: true, message: 'Mídia atualizada com sucesso.', media: updated });
  } else {
    res.status(404).json({ error: 'Mídia não encontrada.' });
  }
};

export const deleteMedia = (req: Request, res: Response): void => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const deleted = db.deleteMedia(id);
  if (deleted) {
    res.json({ success: true, message: 'Mídia removida com sucesso.' });
  } else {
    res.status(404).json({ error: 'Mídia não encontrada.' });
  }
};

// GRUPOS
export const getGroups = (req: Request, res: Response) => {
  const groups = db.getGroups();
  res.json(groups);
};

export const createGroup = (req: Request, res: Response): void => {
  const { name, description, color } = req.body;
  if (!name) {
    res.status(400).json({ error: 'O nome do grupo é obrigatório.' });
    return;
  }
  const group = db.createGroup({
    id: uuidv4(),
    name,
    description,
    color: color || '#6366f1'
  });
  res.status(201).json(group);
};

export const deleteGroup = (req: Request, res: Response): void => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const deleted = db.deleteGroup(id);
  if (deleted) {
    res.json({ success: true, message: 'Grupo deletado.' });
  } else {
    res.status(400).json({ error: 'Não é possível deletar o grupo padrão ou grupo inexistente.' });
  }
};

export const editVideoMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const { videoUrl, startTime, duration, muteAudio } = req.body;

    if (!videoUrl) {
      res.status(400).json({ error: 'A propriedade "videoUrl" é obrigatória.' });
      return;
    }

    const editResult = await ffmpegService.editVideoMedia({
      videoUrl,
      startTime: Number(startTime) || 0,
      duration: Number(duration) || 5,
      muteAudio: Boolean(muteAudio)
    });

    res.json({
      success: true,
      message: 'Vídeo recortado e editado com sucesso!',
      ...editResult
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao recortar/editar vídeo.' });
  }
};
