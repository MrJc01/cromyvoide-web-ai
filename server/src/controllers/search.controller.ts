import { Request, Response } from 'express';
import { vectorStoreService } from '../services/vectorstore.service';
import { embeddingService } from '../services/embedding.service';

export const semanticSearch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, groupIds = ['all'], limit = 10 } = req.body;

    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'A propriedade "query" (frase de busca) é obrigatória.' });
      return;
    }

    console.log(`🔎 [SearchController] Pesquisa semântica por embedding para: "${query}" nos grupos: [${groupIds.join(', ')}]`);

    // Gera embedding para a frase de entrada
    const queryEmbedding = await embeddingService.getTextEmbedding(query);

    // Realiza busca vetorial no vector store filtrando pelos grupos
    const parsedGroups = Array.isArray(groupIds) ? groupIds : [groupIds];
    const results = await vectorStoreService.searchByText(query, parsedGroups, Number(limit) || 10);

    res.json({
      success: true,
      query,
      queryEmbeddingLength: queryEmbedding.length,
      sampleEmbeddingDimensions: queryEmbedding.slice(0, 5), // amostra dos primeiros 5 valores
      resultsCount: results.length,
      results
    });
  } catch (err: any) {
    console.error('Erro na pesquisa por embedding:', err);
    res.status(500).json({ error: err.message || 'Erro interno na busca vetorial.' });
  }
};
