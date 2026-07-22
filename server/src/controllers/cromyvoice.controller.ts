import { Request, Response } from 'express';
import { cromyVoiceService } from '../services/cromyvoice.service';

export const generateAudio = async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, engine, model, sync, profile_id } = req.body;
    if (!text) {
      res.status(400).json({ error: 'O campo "text" é obrigatório.' });
      return;
    }
    const result = await cromyVoiceService.generateAudio({ text, engine, model, sync, profile_id });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao gerar áudio.' });
  }
};

export const checkStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const result = await cromyVoiceService.checkStatus(id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao consultar status.' });
  }
};

export const generateVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      audio_id,
      audio_filename,
      subtitle_style,
      profile_id,
      aspect_ratio,
      position,
      subtitle_position,
      words_per_card,
      font_name,
      font_size,
      font_color,
      outline_color,
      outline_width,
      highlight_color,
      bg_color,
      use_background_box,
      sync
    } = req.body;

    if (!audio_id && !audio_filename) {
      res.status(400).json({ error: 'Informe "audio_id" ou "audio_filename".' });
      return;
    }

    const result = await cromyVoiceService.generateVideo({
      audio_id,
      audio_filename,
      subtitle_style,
      profile_id,
      aspect_ratio,
      position: position || subtitle_position,
      words_per_card,
      font_name,
      font_size,
      font_color,
      outline_color,
      outline_width,
      highlight_color,
      bg_color,
      use_background_box,
      sync
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao gerar vídeo.' });
  }
};

export const getAudios = async (req: Request, res: Response): Promise<void> => {
  const data = await cromyVoiceService.getAudios();
  res.json(data);
};

export const getVideos = async (req: Request, res: Response): Promise<void> => {
  const data = await cromyVoiceService.getVideos();
  res.json(data);
};

export const getModels = async (req: Request, res: Response): Promise<void> => {
  const data = await cromyVoiceService.getModels();
  res.json(data);
};

export const getProfiles = async (req: Request, res: Response): Promise<void> => {
  const data = await cromyVoiceService.getProfiles();
  res.json(data);
};

export const getVideoProfiles = async (req: Request, res: Response): Promise<void> => {
  const data = await cromyVoiceService.getVideoProfiles();
  res.json(data);
};
