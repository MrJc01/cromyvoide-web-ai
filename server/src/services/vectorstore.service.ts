import { db, MediaItem } from '../db/database';
import { embeddingService } from './embedding.service';
import { cosineSimilarity } from '../utils/vector';

export interface SearchResult {
  media: MediaItem;
  similarity: number;
  scorePercentage: string;
}

class VectorStoreService {
  /**
   * Realiza busca vetorial por similaridade semântica para uma frase dada.
   * Permite filtrar por grupos específicos (ou 'all' / todos).
   */
  public async searchByText(
    queryText: string,
    groupIds: string[] = ['all'],
    limit: number = 10
  ): Promise<SearchResult[]> {
    if (!queryText.trim()) return [];

    // 1. Converte frase da busca em embedding
    const queryEmbedding = await embeddingService.getTextEmbedding(queryText);

    // 2. Busca mídias do banco
    let mediaList = db.getMedia();

    // 3. Aplica filtro por grupos se especificado (e não for 'all')
    if (groupIds.length > 0 && !groupIds.includes('all') && !groupIds.includes('*')) {
      mediaList = mediaList.filter(m => groupIds.includes(m.groupId));
    }

    if (mediaList.length === 0) {
      return [];
    }

    // 4. Calcula similaridade para cada mídia
    const results: SearchResult[] = mediaList.map(item => {
      const similarity = cosineSimilarity(queryEmbedding, item.embedding);
      return {
        media: item,
        similarity,
        scorePercentage: (Math.max(0, similarity) * 100).toFixed(1) + '%'
      };
    });

    // 5. Ordena por similaridade decrescente
    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, limit);
  }
}

export const vectorStoreService = new VectorStoreService();
