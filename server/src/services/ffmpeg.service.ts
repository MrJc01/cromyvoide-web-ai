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

export interface ComposeSceneParams {
  bgMediaPath?: string;
  bgColor?: string;
  cromyVoiceVideoUrl?: string;
  cromyVoiceAudioUrl?: string;
  durationSeconds?: number;
  overlayPosition?: OverlayPosition;
  overlayScale?: number;
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

    if (urlOrPath.startsWith('/uploads')) {
      const relativePath = urlOrPath.replace('/uploads', '');
      const localUploadFile = path.join(CONFIG.UPLOADS_DIR, relativePath);
      if (fs.existsSync(localUploadFile)) {
        return localUploadFile;
      }
    }

    try {
      const fullUrl = urlOrPath.startsWith('http')
        ? urlOrPath
        : `http://localhost:${CONFIG.PORT}${urlOrPath.startsWith('/') ? '' : '/'}${urlOrPath}`;

      const outputsDir = path.join(CONFIG.UPLOADS_DIR, 'outputs');
      if (!fs.existsSync(outputsDir)) {
        fs.mkdirSync(outputsDir, { recursive: true });
      }

      const tempPath = path.join(outputsDir, `${prefix}_${uuidv4()}${path.extname(urlOrPath) || '.mp4'}`);
      const writer = fs.createWriteStream(tempPath);

      const response = await axios({
        url: fullUrl,
        method: 'GET',
        responseType: 'stream',
        timeout: 15000
      });

      response.data.pipe(writer);

      return new Promise((resolve) => {
        writer.on('finish', () => resolve(tempPath));
        writer.on('error', (err) => {
          console.warn(`Erro ao salvar temp file para ${urlOrPath}:`, err.message);
          resolve('');
        });
      });
    } catch (err: any) {
      console.warn(`⚠️ [FFmpegService] Não foi possível baixar ${urlOrPath}: ${err.message}`);
      return '';
    }
  }

  /**
   * Edita e recorta um vídeo (definindo inicio, duracao e remocao de audio original)
   */
  public async editVideoMedia(params: EditVideoParams): Promise<{ outputUrl: string; filename: string }> {
    const outputsDir = path.join(CONFIG.UPLOADS_DIR, 'outputs');
    if (!fs.existsSync(outputsDir)) {
      fs.mkdirSync(outputsDir, { recursive: true });
    }

    const filename = `trimmed_${uuidv4()}.mp4`;
    const outputPath = path.join(outputsDir, filename);

    const localPath = await this.downloadTempFile(params.videoUrl, 'trim_src');
    if (!localPath || !fs.existsSync(localPath)) {
      throw new Error('Não foi possível carregar o vídeo de origem para edição.');
    }

    return new Promise((resolve, reject) => {
      let command = ffmpeg(localPath);

      if (params.startTime && params.startTime > 0) {
        command = command.seekInput(params.startTime);
      }

      if (params.duration && params.duration > 0) {
        command = command.duration(params.duration);
      }

      if (params.muteAudio) {
        command = command.noAudio();
      }

      command
        .outputOptions(['-c:v libx264', '-pix_fmt yuv420p'])
        .output(outputPath)
        .on('end', () => {
          console.log(`✅ [FFmpegService] Vídeo recortado e editado com sucesso: ${filename}`);
          resolve({
            outputUrl: `/uploads/outputs/${filename}`,
            filename
          });
        })
        .on('error', (err) => {
          console.error('Erro ao recortar vídeo:', err);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Agrupa e concatena múltiplos arquivos de áudio em um único áudio mestre
   */
  public async concatAudios(audioUrlsOrPaths: string[]): Promise<{ outputUrl: string; filepath: string }> {
    const outputsDir = path.join(CONFIG.UPLOADS_DIR, 'audios');
    if (!fs.existsSync(outputsDir)) {
      fs.mkdirSync(outputsDir, { recursive: true });
    }

    const filename = `concat_master_${uuidv4()}.wav`;
    const outputPath = path.join(outputsDir, filename);

    const localAudioPaths: string[] = [];
    for (const urlOrPath of audioUrlsOrPaths) {
      const temp = await this.downloadTempFile(urlOrPath, 'audio_part');
      if (temp) localAudioPaths.push(temp);
    }

    if (localAudioPaths.length === 0) {
      throw new Error('Nenhum arquivo de áudio válido para concatenar.');
    }

    return new Promise((resolve, reject) => {
      let command = ffmpeg();
      localAudioPaths.forEach(p => {
        command = command.input(p);
      });

      const filterInputs = localAudioPaths.map((_, idx) => `[${idx}:a]`).join('');
      const concatFilter = `${filterInputs}concat=n=${localAudioPaths.length}:v=0:a=1[outa]`;

      command
        .complexFilter(concatFilter)
        .map('[outa]')
        .output(outputPath)
        .on('end', () => {
          console.log(`✅ [FFmpegService] ${localAudioPaths.length} áudios concatenados no master: ${filename}`);
          resolve({
            outputUrl: `/uploads/audios/${filename}`,
            filepath: outputPath
          });
        })
        .on('error', (err) => {
          console.error('Erro ao concatenar áudios:', err);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Concatena múltiplos arquivos de vídeo em um único vídeo mestre final
   */
  public async concatVideos(videoUrlsOrPaths: string[]): Promise<{ outputUrl: string; filename: string }> {
    const outputsDir = path.join(CONFIG.UPLOADS_DIR, 'outputs');
    if (!fs.existsSync(outputsDir)) {
      fs.mkdirSync(outputsDir, { recursive: true });
    }

    const filename = `master_final_${uuidv4()}.mp4`;
    const outputPath = path.join(outputsDir, filename);

    // Baixa todos os vídeos para o disco local
    const localVideoPaths: string[] = [];
    for (const urlOrPath of videoUrlsOrPaths) {
      const temp = await this.downloadTempFile(urlOrPath, 'video_part');
      if (temp && fs.existsSync(temp)) localVideoPaths.push(temp);
    }

    if (localVideoPaths.length === 0) {
      throw new Error('Nenhum arquivo de vídeo válido para concatenar.');
    }

    // Cria um arquivo de lista concat para o FFmpeg
    const listPath = path.join(outputsDir, `concat_list_${uuidv4()}.txt`);
    const listContent = localVideoPaths.map(p => `file '${p}'`).join('\n');
    fs.writeFileSync(listPath, listContent);

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(listPath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions(['-c', 'copy'])
        .output(outputPath)
        .on('end', () => {
          console.log(`✅ [FFmpegService] ${localVideoPaths.length} vídeos concatenados no master final: ${filename}`);
          // Limpa o arquivo de lista temporário
          try { fs.unlinkSync(listPath); } catch {}
          resolve({
            outputUrl: `/uploads/outputs/${filename}`,
            filename
          });
        })
        .on('error', (err) => {
          console.warn('⚠️ Concat com -c copy falhou, tentando re-encode...');
          // Fallback: re-encode se os codecs forem diferentes
          const cmd = ffmpeg();
          localVideoPaths.forEach(p => { cmd.input(p); });

          const filterInputs = localVideoPaths.map((_, idx) => `[${idx}:v:0][${idx}:a:0]`).join('');
          const concatFilter = `${filterInputs}concat=n=${localVideoPaths.length}:v=1:a=1[outv][outa]`;

          cmd
            .complexFilter(concatFilter)
            .outputOptions(['-map', '[outv]', '-map', '[outa]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p'])
            .output(outputPath)
            .on('end', () => {
              console.log(`✅ [FFmpegService] ${localVideoPaths.length} vídeos concatenados (re-encode): ${filename}`);
              try { fs.unlinkSync(listPath); } catch {}
              resolve({
                outputUrl: `/uploads/outputs/${filename}`,
                filename
              });
            })
            .on('error', (err2) => {
              console.error('Erro ao concatenar vídeos:', err2);
              try { fs.unlinkSync(listPath); } catch {}
              reject(err2);
            })
            .run();
        })
        .run();
    });
  }

  /**
   * Obtém a duração exata em segundos de um arquivo de mídia (áudio ou vídeo) via ffprobe
   */
  public async getMediaDuration(filepath: string): Promise<number> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filepath, (err, metadata) => {
        if (err || !metadata?.format?.duration) {
          resolve(0);
        } else {
          resolve(metadata.format.duration);
        }
      });
    });
  }

  /**
   * Mescla a mídia ou cor sólida de fundo com o vídeo CromyVoice posicionado em uma das 9 posições da grade
   */
  public async renderSceneComposition(params: ComposeSceneParams): Promise<{ outputUrl: string; filename: string }> {
    const outputsDir = path.join(CONFIG.UPLOADS_DIR, 'outputs');
    if (!fs.existsSync(outputsDir)) {
      fs.mkdirSync(outputsDir, { recursive: true });
    }

    const filename = `rendered_scene_${uuidv4()}.mp4`;
    const outputPath = path.join(outputsDir, filename);

    const scale = params.overlayScale || 0.7;
    const pos = params.overlayPosition || 'center';
    const squareDim = Math.round(720 * scale);

    // Calcula a expressão de posição do overlay
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
      const overlaySourcePath = params.bgMediaPath ? await this.downloadTempFile(params.bgMediaPath, 'bg') : '';
      const cromyVideoPath = params.cromyVoiceVideoUrl ? await this.downloadTempFile(params.cromyVoiceVideoUrl, 'cromy') : '';

      if (!cromyVideoPath || !fs.existsSync(cromyVideoPath)) {
        console.warn('⚠️ [FFmpegService] Vídeo overlay não encontrado, retornando URL original.');
        return { outputUrl: params.cromyVoiceVideoUrl || '', filename };
      }

      // Obtém a duração EXATA de áudio e legenda do vídeo CromyVoice (para sincronia 1:1 perfeita)
      const exactDuration = await this.getMediaDuration(cromyVideoPath);
      const sceneDuration = exactDuration > 0 ? exactDuration : (params.durationSeconds || 6);

      const overlayExpr = getOverlayExpr(pos);
      const hasBgImage = overlaySourcePath && fs.existsSync(overlaySourcePath);
      const hexColor = (params.bgColor || '#000000').replace('#', '0x');

      console.log(`🎥 [FFmpegService] Compondo cena (duração exata: ${sceneDuration.toFixed(2)}s, overlay: ${squareDim}x${squareDim} em ${pos})...`);

      return new Promise((resolve) => {
        const args: string[] = [];

        if (hasBgImage) {
          args.push('-loop', '1', '-i', overlaySourcePath!, '-t', String(sceneDuration + 0.1));
        } else {
          args.push('-f', 'lavfi', '-i', `color=c=${hexColor}:s=1280x720:d=${sceneDuration + 0.1}`);
        }

        args.push('-i', cromyVideoPath);

        const bgScale = hasBgImage ? '[0:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2[bg];' : '[0:v]copy[bg];';
        const filterComplex = `${bgScale}[1:v]scale=${squareDim}:${squareDim}[over];[bg][over]overlay=${overlayExpr}[outv]`;

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
            console.log(`✅ [FFmpegService] Composição finalizada com sincronia 1:1 (${sceneDuration.toFixed(2)}s): ${filename}`);
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

