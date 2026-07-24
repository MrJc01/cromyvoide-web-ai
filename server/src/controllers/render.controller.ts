import { Request, Response } from 'express';
import { ffmpegService } from '../services/ffmpeg.service';
import { cromyVoiceService } from '../services/cromyvoice.service';

export const renderCompositeVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      bgMediaPath,
      bgColor = '#000000',
      cromyVoiceVideoUrl,
      cromyVoiceAudioUrl,
      durationSeconds,
      overlayPosition = 'center',
      overlayScale = 0.7,
      layoutMode = 'overlay',
      splitRatio = 0.5,
      objectFit = 'contain',
      hideBackground = false
    } = req.body;

    const renderResult = await ffmpegService.renderSceneComposition({
      bgMediaPath,
      bgColor,
      cromyVoiceVideoUrl,
      cromyVoiceAudioUrl,
      durationSeconds: Number(durationSeconds) || 6,
      overlayPosition,
      overlayScale: Number(overlayScale) || 0.7,
      layoutMode,
      splitRatio: Number(splitRatio) || 0.5,
      objectFit,
      hideBackground: Boolean(hideBackground)
    });

    res.json({
      success: true,
      message: 'Composição de vídeo com sobreposição finalizada.',
      ...renderResult
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao renderizar sobreposição de vídeo.' });
  }
};

export const concatAudiosAndGenerateMaster = async (req: Request, res: Response): Promise<void> => {
  try {
    const { audioUrls, fullText, subtitleStyle = 'j-vid' } = req.body;

    if (!audioUrls || !Array.isArray(audioUrls) || audioUrls.length === 0) {
      res.status(400).json({ error: 'Envie uma lista de URLs/caminhos de áudio no campo "audioUrls".' });
      return;
    }

    console.log(`🎙️ [RenderController] Concatenando ${audioUrls.length} áudios das cenas em um único áudio mestre...`);
    const masterAudio = await ffmpegService.concatAudios(audioUrls);

    // Usa o texto completo do roteiro para gerar a sintese com legendas completas
    const textToSynthesize = fullText && fullText.trim() ? fullText.trim() : 'Roteiro Completo Agrupado com todas as falas das cenas.';

    console.log(`🎬 [RenderController] Gerando áudio mestre completo no CromyVoice (${textToSynthesize.length} caracteres)...`);
    const cromyAudioRes = await cromyVoiceService.generateAudio({
      text: textToSynthesize,
      engine: 'piper',
      sync: true
    });

    // Gera o vídeo MP4 com legendas do áudio mestre completo
    const cromyVideoRes = await cromyVoiceService.generateVideo({
      audio_id: cromyAudioRes.id,
      subtitle_style: subtitleStyle,
      sync: true
    });

    res.json({
      success: true,
      message: 'Áudios concatenados e vídeo MP4 mestre completo gerado no CromyVoice com sucesso!',
      masterAudioUrl: masterAudio,
      cromyAudioId: cromyAudioRes.id,
      cromyVideoUrl: cromyVideoRes.url,
      cromyVideoId: cromyVideoRes.id
    });
  } catch (err: any) {
    console.error('Erro ao concatenar áudios:', err);
    res.status(500).json({ error: err.message || 'Erro ao concatenar áudios e gerar vídeo mestre.' });
  }
};

export const concatFinalVideos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { videoUrls } = req.body;

    if (!videoUrls || !Array.isArray(videoUrls) || videoUrls.length === 0) {
      res.status(400).json({ error: 'Envie uma lista de URLs de vídeos finais no campo "videoUrls".' });
      return;
    }

    console.log(`🎬 [RenderController] Concatenando ${videoUrls.length} vídeos finais compostos em um único vídeo mestre...`);
    const result = await ffmpegService.concatVideos(videoUrls);

    res.json({
      success: true,
      message: `${videoUrls.length} vídeos compostos concatenados no vídeo mestre final!`,
      outputUrl: result.outputUrl,
      filename: result.filename
    });
  } catch (err: any) {
    console.error('Erro ao concatenar vídeos finais:', err);
    res.status(500).json({ error: err.message || 'Erro ao concatenar vídeos finais.' });
  }
};

export const renderTimeline = async (req: Request, res: Response): Promise<void> => {
  try {
    const { clips, tracks, aspectRatio, durationSeconds } = req.body;

    if (!clips || !Array.isArray(clips)) {
      res.status(400).json({ error: 'Envie uma lista válida de "clips" para a renderização da timeline.' });
      return;
    }

    console.log(`🎬 [RenderController] Iniciando renderização de projeto da Timeline (${clips.length} clipes)...`);
    const renderResult = await ffmpegService.renderTimelineProject({
      clips,
      tracks: tracks || [],
      aspectRatio,
      durationSeconds: Number(durationSeconds) || 30
    });

    res.json({
      success: true,
      message: 'Renderização do projeto da timeline finalizada com sucesso.',
      ...renderResult
    });
  } catch (err: any) {
    console.error('Erro ao renderizar projeto da timeline:', err);
    res.status(500).json({ error: err.message || 'Erro ao renderizar projeto da timeline.' });
  }
};
