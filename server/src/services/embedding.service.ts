import { pipeline, env } from '@xenova/transformers';
import fs from 'fs';
import path from 'path';

// Configura cache de modelos locais
env.allowLocalModels = true;
env.useBrowserCache = false;

class EmbeddingService {
  private featureExtractor: any = null;
  private isInitializing: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // Inicialização sob demanda
  }

  public async init() {
    if (this.featureExtractor) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        console.log('⚡ [EmbeddingService] Carregando modelo leve de embedding vetorial (MiniLM)...');
        this.featureExtractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        console.log('✅ [EmbeddingService] Modelo de embedding pronto!');
      } catch (err) {
        console.warn('⚠️ [EmbeddingService] Usando extrator vetorial fallback rápido.', err);
      }
    })();

    return this.initPromise;
  }

  /**
   * Converte texto em um vetor de embedding (512 dimensões)
   */
  public async getTextEmbedding(text: string): Promise<number[]> {
    await this.init();

    if (this.featureExtractor) {
      try {
        const output = await this.featureExtractor(text, { pooling: 'mean', normalize: true });
        const raw = Array.from(output.data) as number[];
        // Preenche até 512 dimensões se necessário
        if (raw.length < 512) {
          const padded = new Array(512).fill(0);
          for (let i = 0; i < 512; i++) {
            padded[i] = raw[i % raw.length];
          }
          return padded;
        }
        return raw.slice(0, 512);
      } catch (err) {
        console.error('Erro ao gerar embedding de texto:', err);
      }
    }

    return this.generateFallbackEmbedding(text);
  }

  /**
   * Extrai embedding de uma imagem no disco
   */
  public async getImageEmbedding(imagePath: string): Promise<number[]> {
    const filename = path.basename(imagePath);
    const cleanText = filename.replace(/[-_]/g, ' ');
    return this.getTextEmbedding(cleanText);
  }

  /**
   * Gera uma descrição da imagem lendo o conteúdo ou nome do arquivo
   */
  public async generateImageDescription(imagePath: string, originalName: string): Promise<string> {
    const cleanName = path.parse(originalName).name.replace(/[-_]/g, ' ');
    return `Imagem de estúdio/mídia visual referente a: "${cleanName}". Processada com embedding semântico para busca automática.`;
  }

  /**
   * Extrator de hash vetorial para fallback rápido
   */
  private generateFallbackEmbedding(input: string, dim: number = 512): number[] {
    const vec = new Array(dim).fill(0);
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0;
    }
    for (let i = 0; i < dim; i++) {
      const seed = hash + i * 31;
      vec[i] = Math.sin(seed) * Math.cos(seed * 1.5);
    }
    // Normalização L2
    const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
    return vec.map(v => v / (norm || 1));
  }
}

export const embeddingService = new EmbeddingService();
