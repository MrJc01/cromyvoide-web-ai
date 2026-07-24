import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { CONFIG } from '../config/env';

export type OverlayPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'full';

export type LayoutMode = 'overlay' | 'split-horizontal' | 'split-vertical' | 'full-bg';

export interface ComposeSceneParams {
  bgMediaPath?: string;
  bgColor?: string;
  cromyVoiceVideoUrl?: string;
  cromyVoiceAudioUrl?: string;
  durationSeconds?: number;
  overlayPosition?: OverlayPosition;
  overlayScale?: number;
  layoutMode?: LayoutMode;
  splitRatio?: number; // Ex: 0.5 (50/50), 0.6 (60/40)
  objectFit?: 'contain' | 'cover';
  hideBackground?: boolean;
}

export interface EditVideoParams {
  videoUrl: string;
  startTime?: number; // Tempo inicial em segundos (ex: 0, 2.5)
  duration?: number; // Duração do corte em segundos (ex: 5)
  muteAudio?: boolean; // Remover áudio original do vídeo
}

class FFmpegService {
  /**
   * Baixa um arquivo remoto ou resolve um arquivo local temporariamente para uso no FFmpeg
   */
  public async downloadTempFile(urlOrPath: string, prefix: string): Promise<string> {
    if (!urlOrPath) return '';
    
    if (fs.existsSync(urlOrPath)) {
      return urlOrPath;
    }

    if (urlOrPath.startsWith('/uploads/')) {
      const localPath = path.join(CONFIG.UPLOADS_DIR, '..', urlOrPath);
      if (fs.existsSync(localPath)) return localPath;
    }

    const tempDir = path.join(CONFIG.UPLOADS_DIR, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const filename = `${prefix}_${uuidv4()}${path.extname(urlOrPath) || '.mp4'}`;
    const localPath = path.join(tempDir, filename);

    try {
      let downloadUrl = urlOrPath;
      if (!urlOrPath.startsWith('http://') && !urlOrPath.startsWith('https://')) {
        const baseUrl = CONFIG.CROMYVOICE_BASE_URL.replace(/\/+$/, '');
        const cleanPath = urlOrPath.replace(/^\/+/, '');
        downloadUrl = `${baseUrl}/${cleanPath}`;
      }

      console.log(`⬇️ [FFmpegService] Baixando arquivo remoto: ${downloadUrl}`);
      const response = await axios({
        method: 'GET',
        url: downloadUrl,
        responseType: 'stream',
        timeout: 60000
      });

      const writer = fs.createWriteStream(localPath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(localPath));
        writer.on('error', (err) => {
          console.error(`❌ [FFmpegService] Erro ao gravar arquivo temp ${localPath}:`, err);
          reject(err);
        });
      });
    } catch (err: any) {
      console.warn(`⚠️ [FFmpegService] Não foi possível baixar ${urlOrPath}: ${err.message}`);
      return '';
    }
  }

  /**
   * Recorta um vídeo em um trecho específico (startTime, duration, mudo opcional)
   */
  public async editVideoMedia(params: EditVideoParams): Promise<{ outputUrl: string; filename: string }> {
    const outputsDir = path.join(CONFIG.UPLOADS_DIR, 'outputs');
    if (!fs.existsSync(outputsDir)) {
      fs.mkdirSync(outputsDir, { recursive: true });
    }

    const filename = `edited_clip_${uuidv4()}.mp4`;
    const outputPath = path.join(outputsDir, filename);

    try {
      const localPath = await this.downloadTempFile(params.videoUrl, 'edit_src');
      if (!localPath || !fs.existsSync(localPath)) {
        throw new Error('Não foi possível carregar o vídeo de origem para edição.');
      }

      const startTime = params.startTime || 0;
      const duration = params.duration || 5;

      return new Promise((resolve, reject) => {
        let command = ffmpeg(localPath);

        command.seekInput(startTime);
        command.duration(duration);

        if (params.muteAudio) {
          command.noAudio();
        } else {
          command.audioCodec('aac');
        }

        command
          .videoCodec('libx264')
          .outputOptions(['-pix_fmt yuv420p', '-preset ultrafast'])
          .output(outputPath)
          .on('end', () => {
            console.log(`✅ [FFmpegService] Vídeo recortado e editado com sucesso: ${filename}`);
            resolve({
              outputUrl: `/uploads/outputs/${filename}`,
              filename
            });
          })
          .on('error', (err) => {
            console.error('❌ [FFmpegService] Erro ao recortar vídeo:', err);
            reject(err);
          })
          .run();
      });
    } catch (err: any) {
      console.error('Erros no editVideoMedia:', err);
      throw err;
    }
  }

  /**
   * Concatena múltiplos arquivos de áudio em um único master.mp3
   */
  public async concatAudios(audioUrls: string[]): Promise<string> {
    const outputsDir = path.join(CONFIG.UPLOADS_DIR, 'outputs');
    if (!fs.existsSync(outputsDir)) {
      fs.mkdirSync(outputsDir, { recursive: true });
    }

    const filename = `master_audio_${uuidv4()}.mp3`;
    const outputPath = path.join(outputsDir, filename);

    const localAudioPaths: string[] = [];
    for (const url of audioUrls) {
      const localPath = await this.downloadTempFile(url, 'audio');
      if (localPath && fs.existsSync(localPath)) {
        localAudioPaths.push(localPath);
      }
    }

    if (localAudioPaths.length === 0) {
      return '';
    }

    if (localAudioPaths.length === 1) {
      return audioUrls[0];
    }

    return new Promise((resolve) => {
      let command = ffmpeg();
      localAudioPaths.forEach(p => command.input(p));

      command
        .on('end', () => {
          console.log(`✅ [FFmpegService] ${localAudioPaths.length} áudios concatenados no master: ${filename}`);
          resolve(`/uploads/outputs/${filename}`);
        })
        .on('error', (err) => {
          console.error('❌ [FFmpegService] Erro ao concatenar áudios:', err);
          resolve(audioUrls[0] || '');
        })
        .mergeToFile(outputPath, CONFIG.UPLOADS_DIR);
    });
  }

  /**
   * Concatena múltiplos vídeos MP4 das cenas em um único vídeo final master.mp4
   */
  public async concatVideos(videoUrls: string[]): Promise<{ outputUrl: string; filename: string }> {
    const outputsDir = path.join(CONFIG.UPLOADS_DIR, 'outputs');
    if (!fs.existsSync(outputsDir)) {
      fs.mkdirSync(outputsDir, { recursive: true });
    }

    const filename = `master_video_${uuidv4()}.mp4`;
    const outputPath = path.join(outputsDir, filename);

    const localVideoPaths: string[] = [];
    for (const url of videoUrls) {
      const localPath = await this.downloadTempFile(url, 'video');
      if (localPath && fs.existsSync(localPath)) {
        localVideoPaths.push(localPath);
      }
    }

    if (localVideoPaths.length === 0) {
      return { outputUrl: '', filename };
    }

    if (localVideoPaths.length === 1) {
      return { outputUrl: videoUrls[0], filename };
    }

    try {
      // Método robusto via re-encode com filter_complex
      return new Promise((resolve) => {
        const cmd = ffmpeg();
        localVideoPaths.forEach(p => cmd.input(p));

        const inputsCount = localVideoPaths.length;
        let filterStr = '';
        for (let i = 0; i < inputsCount; i++) {
          filterStr += `[${i}:v][${i}:a]`;
        }
        filterStr += `concat=n=${inputsCount}:v=1:a=1[outv][outa]`;

        cmd
          .complexFilter(filterStr, ['outv', 'outa'])
          .outputOptions(['-c:v libx264', '-pix_fmt yuv420p', '-c:a aac', '-r 30', '-preset ultrafast'])
          .output(outputPath)
          .on('end', () => {
            console.log(`✅ [FFmpegService] ${localVideoPaths.length} vídeos concatenados (re-encode): ${filename}`);
            resolve({ outputUrl: `/uploads/outputs/${filename}`, filename });
          })
          .on('error', (err) => {
            console.error('❌ [FFmpegService] Erro ao concatenar vídeos via complexFilter:', err);
            resolve({ outputUrl: videoUrls[0] || '', filename });
          })
          .run();
      });
    } catch (err: any) {
      console.error('Erro no concatVideos:', err);
      return { outputUrl: videoUrls[0] || '', filename };
    }
  }

  /**
   * Obtém a duração em segundos de um arquivo usando ffprobe
   */
  private async getMediaDuration(filepath: string): Promise<number> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filepath, (err, metadata) => {
        if (err || !metadata || !metadata.format || !metadata.format.duration) {
          resolve(0);
        } else {
          resolve(metadata.format.duration);
        }
      });
    });
  }

  /**
   * Mescla a mídia ou cor sólida de fundo com o vídeo CromyVoice posicionado em uma das 9 posições ou split-screen
   */
  public async renderSceneComposition(params: ComposeSceneParams): Promise<{ outputUrl: string; filename: string }> {
    const outputsDir = path.join(CONFIG.UPLOADS_DIR, 'outputs');
    if (!fs.existsSync(outputsDir)) {
      fs.mkdirSync(outputsDir, { recursive: true });
    }

    const filename = `rendered_scene_${uuidv4()}.mp4`;
    const outputPath = path.join(outputsDir, filename);

    const layoutMode = params.layoutMode || 'overlay';
    const splitRatio = params.splitRatio || 0.5;
    const objectFit = params.objectFit || 'contain';
    const hideBackground = Boolean(params.hideBackground);
    const scale = params.overlayScale || 0.7;
    const pos = params.overlayPosition || 'center';
    const squareDim = Math.round(720 * scale);

    const getOverlayExpr = (position: string): string => {
      switch (position) {
        case 'top-left': return '30:30';
        case 'top-center': return '(W-w)/2:30';
        case 'top-right': return 'W-w-30:30';
        case 'middle-left': return '30:(H-h)/2';
        case 'center': return '(W-w)/2:(H-h)/2';
        case 'middle-right': return 'W-w-30:(H-h)/2';
        case 'bottom-left': return '30:H-h-30';
        case 'bottom-center': return '(W-w)/2:H-h-30';
        case 'bottom-right': return 'W-w-30:H-h-30';
        default: return '(W-w)/2:(H-h)/2';
      }
    };

    try {
      const overlaySourcePath = (!hideBackground && params.bgMediaPath) ? await this.downloadTempFile(params.bgMediaPath, 'bg') : '';
      const cromyVideoPath = params.cromyVoiceVideoUrl ? await this.downloadTempFile(params.cromyVoiceVideoUrl, 'cromy') : '';

      if (!cromyVideoPath || !fs.existsSync(cromyVideoPath)) {
        console.warn('⚠️ [FFmpegService] Vídeo overlay não encontrado, retornando URL original.');
        return { outputUrl: params.cromyVoiceVideoUrl || '', filename };
      }

      const exactDuration = await this.getMediaDuration(cromyVideoPath);
      const sceneDuration = exactDuration > 0 ? exactDuration : (params.durationSeconds || 6);

      const hasBgImage = !hideBackground && overlaySourcePath && fs.existsSync(overlaySourcePath);
      const hexColor = (params.bgColor || '#000000').replace('#', '0x');

      console.log(`🎥 [FFmpegService] Compondo cena (duração: ${sceneDuration.toFixed(2)}s, layout: ${layoutMode}, hideBg: ${hideBackground})...`);

      return new Promise((resolve) => {
        const args: string[] = [];

        if (hasBgImage) {
          args.push('-loop', '1', '-i', overlaySourcePath!, '-t', String(sceneDuration + 0.1));
        } else {
          args.push('-f', 'lavfi', '-i', `color=c=${hexColor}:s=1280x720:d=${sceneDuration + 0.1}`);
        }

        args.push('-i', cromyVideoPath);

        let filterComplex = '';

        if (layoutMode === 'split-horizontal') {
          const leftW = Math.round(1280 * splitRatio);
          const rightW = 1280 - leftW;

          const bgFilter = hasBgImage
            ? (objectFit === 'contain'
                ? `[0:v]scale=${leftW}:720:force_original_aspect_ratio=decrease,pad=${leftW}:720:(ow-iw)/2:(oh-ih)/2:color=${hexColor}[left];`
                : `[0:v]scale=${leftW}:720[left];`)
            : `[0:v]scale=${leftW}:720[left];`;

          const fgFilter = `[1:v]scale=${rightW}:720:force_original_aspect_ratio=decrease,pad=${rightW}:720:(ow-iw)/2:(oh-ih)/2:color=black[right];`;
          filterComplex = `${bgFilter}${fgFilter}[left][right]hstack=inputs=2[outv]`;
        } else if (layoutMode === 'split-vertical') {
          const topH = Math.round(720 * splitRatio);
          const botH = 720 - topH;

          const bgFilter = hasBgImage
            ? (objectFit === 'contain'
                ? `[0:v]scale=1280:${topH}:force_original_aspect_ratio=decrease,pad=1280:${topH}:(ow-iw)/2:(oh-ih)/2:color=${hexColor}[top];`
                : `[0:v]scale=1280:${topH}[top];`)
            : `[0:v]scale=1280:${topH}[top];`;

          const fgFilter = `[1:v]scale=1280:${botH}:force_original_aspect_ratio=decrease,pad=1280:${botH}:(ow-iw)/2:(oh-ih)/2:color=black[bottom];`;
          filterComplex = `${bgFilter}${fgFilter}[top][bottom]vstack=inputs=2[outv]`;
        } else {
          // Mode 'overlay' ou 'full-bg'
          const overlayExpr = getOverlayExpr(pos);
          const bgScale = hasBgImage ? `[0:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=${hexColor}[bg];` : '[0:v]copy[bg];';
          filterComplex = `${bgScale}[1:v]scale=${squareDim}:${squareDim}[over];[bg][over]overlay=${overlayExpr}[outv]`;
        }

        args.push('-filter_complex', filterComplex);
        args.push('-map', '[outv]');
        args.push('-map', '1:a?');
        args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '30');
        args.push('-c:a', 'aac', '-ar', '44100');
        args.push('-t', String(sceneDuration));
        args.push('-y', outputPath);

        const { execFile } = require('child_process');
        execFile('ffmpeg', args, { timeout: 60000 }, (error: any, stdout: string, stderr: string) => {
          if (error) {
            console.error(`⚠️ [FFmpegService] Erro na composição FFmpeg (code ${error.code}):`, stderr?.slice(-300));
            resolve({ outputUrl: params.cromyVoiceVideoUrl || '', filename });
          } else {
            console.log(`✅ [FFmpegService] Composição finalizada (${layoutMode}): ${filename}`);
            resolve({ outputUrl: `/uploads/outputs/${filename}`, filename });
          }
        });
      });
    } catch (err: any) {
      console.warn('⚠️ [FFmpegService] Erro na composição FFmpeg.', err.message);
      return {
        outputUrl: params.cromyVoiceVideoUrl || params.bgMediaPath || '',
        filename
      };
    }
  }
}

export const ffmpegService = new FFmpegService();
