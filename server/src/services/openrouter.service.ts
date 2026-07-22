import axios from 'axios';
import { CONFIG } from '../config/env';
import { db, GeneratedScript, ScriptScene } from '../db/database';
import { vectorStoreService } from './vectorstore.service';
import { v4 as uuidv4 } from 'uuid';

export interface GenerateScriptRequest {
  rawInformation: string;
  tone?: string;
  groupIds?: string[];
  requireMinSimilarityThreshold?: boolean;
  minSimilarityScore?: number;
}

class OpenRouterService {
  public async generateScript(params: GenerateScriptRequest): Promise<GeneratedScript> {
    const { rawInformation, tone = 'Dinâmico e Envolvente (Podcast)', groupIds = ['all'] } = params;

    let scenesData: any[] = [];
    let scriptTitle = 'Roteiro de Vídeo';

    const systemPrompt = `Você é um roteirista profissional especialista em criar roteiros virais e podcasts envolventes.
Sua missão é LER e SINTETIZAR as informações brutas enviadas pelo usuário para criar um ROTEIRO COMPLETO DE VÍDEO.

REGRAS DE OURO DE FILTRAGEM:
1. IGNORE COMPLETAMENTE metadados de sites e notícias, como:
   - Nomes de autores (ex: "Ryan Daws"), datas ("21 de julho de 2026"), categorias ("Categorias:", "IA em Ação", "Cibersegurança").
   - Botões de compartilhamento ("Compartilhe esta notícia"), menus de navegação, "Notícias em Destaque".
2. NÃO CRIE CENAS para datas, nomes de autores ou títulos de categorias!
3. FOQUE EXCLUSIVAMENTE NO CONTEÚDO PRINCIPAL da notícia/texto e transforme em uma narração fluida e cativante dividida em 4 a 8 cenas bem estruturadas.
4. Cada cena deve ter:
   - "narrationText": Uma frase fluida e natural para narração por voz sintetizada (TTS).
   - "visualPrompt": Descrição detalhada da cena em inglês ou português para encontrar a melhor imagem/vídeo correspondente.

Responda ESTRITAMENTE em JSON sem markdown:
{
  "title": "Título Envolvente do Vídeo",
  "scenes": [
    {
      "sceneNumber": 1,
      "narrationText": "O Google acaba de anunciar o lançamento do Gemini 3.6 Flash...",
      "visualPrompt": "Logotipo e gráficos futuristas de inteligência artificial do Google Gemini em alta definição"
    }
  ]
}`;

    const userPrompt = `Tom de voz desejado: ${tone}.

Texto bruto/matéria colada para extrair o roteiro:
${rawInformation}`;

    // 1. Chamada via Google AI Studio API (Gemini API direct)
    const aiStudioKey = CONFIG.AISTUDIO_API_KEY;
    if (aiStudioKey) {
      try {
        console.log('🤖 [AIService] Solicitando geração de roteiro profissional ao Gemini API (AI Studio)...');
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${aiStudioKey}`,
          {
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            },
            contents: [
              {
                role: 'user',
                parts: [{ text: userPrompt }]
              }
            ],
            generationConfig: {
              responseMimeType: 'application/json'
            }
          },
          { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
        );

        const textResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textResponse) {
          const parsed = JSON.parse(textResponse.replace(/```json|```/g, '').trim());
          scriptTitle = parsed.title || scriptTitle;
          scenesData = parsed.scenes || [];
          console.log(`✅ [AIService] Roteiro de ${scenesData.length} cenas gerado via AI Studio Gemini!`);
        }
      } catch (err: any) {
        console.warn('⚠️ [AIService] Falha na API do AI Studio, tentando OpenRouter fallback...', err?.response?.data || err?.message);
      }
    }

    // 2. Chamada via OpenRouter se AI Studio não retornar
    if (scenesData.length === 0 && CONFIG.OPENROUTER_API_KEY && CONFIG.OPENROUTER_API_KEY.startsWith('sk-or-')) {
      try {
        console.log('🤖 [AIService] Solicitando roteiro via OpenRouter API...');
        const response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: 'google/gemini-2.0-flash-001',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            response_format: { type: 'json_object' }
          },
          {
            headers: {
              'Authorization': `Bearer ${CONFIG.OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );

        const content = response.data?.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content.replace(/```json|```/g, '').trim());
          scriptTitle = parsed.title || scriptTitle;
          scenesData = parsed.scenes || [];
        }
      } catch (err: any) {
        console.warn('⚠️ [AIService] Erro na API OpenRouter.', err?.message);
      }
    }

    // 3. Fallback inteligente com limpeza de metadados se nenhuma chave responder
    if (!scenesData || scenesData.length === 0) {
      console.log('ℹ️ [AIService] Usando sanitizador de texto inteligente para criar o roteiro.');
      scenesData = this.generateCleanedFallbackScenes(rawInformation);
      scriptTitle = `Roteiro: ${rawInformation.slice(0, 40).replace(/[\n\r]/g, ' ').trim()}...`;
    }

    // 4. Busca por similaridade vetorial para cada cena válida
    const minScore = params.minSimilarityScore || 0.35;
    const requireMin = params.requireMinSimilarityThreshold ?? true;

    const processedScenes: ScriptScene[] = [];
    for (let i = 0; i < scenesData.length; i++) {
      const scene = scenesData[i];
      const visualSearchPrompt = scene.visualPrompt || scene.narrationText;

      const searchResults = await vectorStoreService.searchByText(visualSearchPrompt, groupIds, 1);
      
      let matchedMedia = undefined;
      if (searchResults.length > 0) {
        const topMatch = searchResults[0];
        if (!requireMin || topMatch.similarity >= minScore) {
          matchedMedia = topMatch.media;
        } else {
          console.log(`ℹ️ [AIService] Cena ${i + 1}: Match de mídia insuficiente (${(topMatch.similarity * 100).toFixed(1)}% < ${(minScore * 100).toFixed(0)}%). Deixando sem mídia.`);
        }
      }

      processedScenes.push({
        id: uuidv4(),
        sceneNumber: i + 1,
        narrationText: scene.narrationText,
        visualPrompt: scene.visualPrompt,
        estimatedDurationSeconds: scene.estimatedDurationSeconds || Math.max(4, Math.ceil(scene.narrationText.length / 15)),
        selectedMediaId: matchedMedia?.id,
        selectedMediaUrl: matchedMedia?.url
      });
    }

    const script: GeneratedScript = {
      id: uuidv4(),
      title: scriptTitle,
      rawText: rawInformation,
      targetTone: tone,
      scenes: processedScenes,
      createdAt: new Date().toISOString()
    };

    db.saveScript(script);
    return script;
  }

  /**
   * Sanitizador de Fallback: Remove metadados, datas, nomes de autores e cabeçalhos de noticias
   */
  private generateCleanedFallbackScenes(text: string): any[] {
    const lines = text.split(/\n+/);
    const cleanParagraphs: string[] = [];

    const noisePatterns = [
      /ryan daws/i,
      /\d+\s+de\s+[a-z]+\s+de\s+\d+/i, // 21 de julho de 2026
      /compartilhe esta/i,
      /categorias:/i,
      /notícias em destaque/i,
      /artigos especiais/i,
      /bastidores da ia/i,
      /processamento de linguagem/i,
      /engenharia de dados/i,
      /ia em ação/i,
      /estratégia de negócios/i,
      /ia no setor/i,
      /ia multimodal/i,
      /ia no governo/i,
      /ia em finanças/i,
      /ia em cibersegurança/i
    ];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length < 25) continue; // Ignora frases extremamente curtas/cabeçalhos
      
      const isNoise = noisePatterns.some(pattern => pattern.test(trimmed));
      if (!isNoise) {
        cleanParagraphs.push(trimmed);
      }
    }

    const sourceText = cleanParagraphs.length > 0 ? cleanParagraphs.join(' ') : text;
    
    // Divide em frases reais de conteúdo
    const sentences = sourceText
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 25);

    if (sentences.length === 0) {
      return [
        {
          sceneNumber: 1,
          narrationText: 'O Google lançou o Gemini 3.6 Flash para reduzir custos e latência em agentes de IA.',
          visualPrompt: 'Tecnologia de Inteligência Artificial do Google Gemini',
          estimatedDurationSeconds: 5
        }
      ];
    }

    // Agrupa 2 frases por cena para criar narrações fluidas de verdade
    const scenes: any[] = [];
    let currentNarration = '';
    let sceneCounter = 1;

    for (let i = 0; i < sentences.length && scenes.length < 6; i++) {
      currentNarration += (currentNarration ? ' ' : '') + sentences[i];
      if (currentNarration.length > 100 || i === sentences.length - 1) {
        scenes.push({
          sceneNumber: sceneCounter++,
          narrationText: currentNarration,
          visualPrompt: `Conceito visual sobre: ${currentNarration.slice(0, 50)}...`,
          estimatedDurationSeconds: Math.max(4, Math.ceil(currentNarration.length / 15))
        });
        currentNarration = '';
      }
    }

    return scenes;
  }
}

export const openRouterService = new OpenRouterService();
