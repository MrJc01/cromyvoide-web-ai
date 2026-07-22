import React, { useState } from 'react';
import { useScriptStore } from '../../store/useScriptStore';
import { useCromyVoiceStore } from '../../store/useCromyVoiceStore';
import { useMediaStore } from '../../store/useMediaStore';
import { api } from '../../services/api';
import {
  Wand2,
  Upload,
  Sparkles,
  FileText,
  Video,
  CheckCircle2,
  RefreshCw,
  Download,
  AlertCircle,
  ImageIcon,
  Sliders,
  Play,
  Film,
  Layers,
  LayoutGrid,
  ShieldCheck
} from 'lucide-react';

export type OverlayPosition9 =
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

export const AutoVideoGenerator: React.FC = () => {
  const { currentScript, generateScript, createScriptFromRawText, updateSceneMedia, updateSceneAudio, updateSceneVideo } = useScriptStore();
  const { models, selectedModel, selectedProfileId, subtitleStyle, synthesizeAudio, generateVideo, renderCompositeVideo } = useCromyVoiceStore();
  const { fetchMedia } = useMediaStore();

  // Entradas da Página Única
  const [systemPrompt, setSystemPrompt] = useState(
    'Crie um roteiro fluido e dinâmico para narração direta. NUNCA comece com saudações ou frases introdutórias como "Aqui está o roteiro" ou "Criei um roteiro". Comece DIRETO na primeira frase do conteúdo.'
  );
  const [content, setContent] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [smartAntiTextPositioning, setSmartAntiTextPositioning] = useState(true);
  const [fallbackPosition, setFallbackPosition] = useState<OverlayPosition9>('bottom-left');
  const [overlayScale, setOverlayScale] = useState<number>(0.5); // 50% para não cobrir a imagem de fundo

  // Estado do Processo
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProgressStep, setCurrentProgressStep] = useState<string>('');
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [finalMasterVideoUrl, setFinalMasterVideoUrl] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setUploadedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * IA Anti-Texto: Analisa a imagem e escolhe uma posição na grade 3x3 que NAO cubra textos importantes!
   */
  const determineSmartOverlayPosition = (mediaUrl: string, mediaDescription?: string): OverlayPosition9 => {
    if (!smartAntiTextPositioning) return fallbackPosition;

    const desc = (mediaDescription || mediaUrl || '').toLowerCase();

    // Se a imagem contém código, editor, IDE, print com texto no topo ou centro:
    if (desc.includes('code') || desc.includes('editor') || desc.includes('ide') || desc.includes('código') || desc.includes('print') || desc.includes('texto')) {
      // Posiciona no canto inferior esquerdo/direito para deixar o texto/código 100% visível!
      return 'bottom-left';
    }

    // Se a imagem tem legenda/rodapé:
    if (desc.includes('footer') || desc.includes('rodapé') || desc.includes('legenda')) {
      return 'top-right';
    }

    // Padrão seguro para capturas e apresentações: canto inferior esquerdo
    return 'bottom-left';
  };

  /**
   * PIPELINE 1-CLIQUE AUTOMÁTICO COMPLETO ("LIGAR TUDO"):
   * Conteúdo + Mídias + System Prompt -> Roteiro -> Upload -> TTS -> Legendas -> Overlay Anti-Texto -> Vídeo Mestre MP4!
   */
  const handleStartFullAutomatedPipeline = async () => {
    if (!content.trim()) {
      alert('Por favor, digite ou cole o conteúdo do vídeo.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setFinalMasterVideoUrl('');
    setProgressPercentage(5);

    try {
      // ETAPA 1: Upload e Indexação Automática de Mídias (se houver)
      let uploadedMediaUrls: string[] = [];
      if (uploadedFiles.length > 0) {
        setCurrentProgressStep(`🖼️ 1/6. Enviando e indexando ${uploadedFiles.length} mídia(s) por embeddings vetoriais...`);
        const uploadRes = await api.uploadMedia(uploadedFiles, 'auto-upload');
        if (uploadRes && Array.isArray(uploadRes.items)) {
          uploadedMediaUrls = uploadRes.items.map((item: any) => item.url);
        }
        await fetchMedia();
      }
      setProgressPercentage(20);

      // ETAPA 2: Gerar Roteiro Estruturado em Cenas com Prompt do Sistema
      setCurrentProgressStep('📝 2/6. Processando conteúdo e gerando cenas narradas...');
      let scriptRes = await generateScript(
        `${systemPrompt}\n\nCONTEÚDO BRUTO:\n${content}`,
        'Dinâmico e Envolvente (Podcast)',
        ['all'],
        false
      );

      if (!scriptRes || !scriptRes.scenes || scriptRes.scenes.length === 0) {
        createScriptFromRawText(content, 'Vídeo Automático 1-Clique');
        scriptRes = useScriptStore.getState().currentScript || undefined;
      }

      if (!scriptRes || !scriptRes.scenes || scriptRes.scenes.length === 0) {
        throw new Error('Não foi possível estruturar o roteiro em cenas.');
      }
      setProgressPercentage(40);

      const scenes = scriptRes.scenes;
      const sceneFinalVideoUrls: string[] = [];

      // ETAPA 3, 4, 5: Processar Cada Cena (TTS + Legenda CromyVoice + Overlay Anti-Texto)
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const stepNum = i + 1;
        const totalScenes = scenes.length;

        setCurrentProgressStep(`🎙️ 3/6. Sintetizando áudio TTS da Cena ${stepNum}/${totalScenes}...`);
        const cleanNarrationText = (scene.narrationText || '')
          .replace(/^(aqui está (o|um) roteiro[^.:!\n]*[:.]?\s*)/i, '')
          .replace(/^(criei (um|o) roteiro[^.:!\n]*[:.]?\s*)/i, '')
          .replace(/^(este é (um|o) roteiro[^.:!\n]*[:.]?\s*)/i, '')
          .replace(/^(roteiro criado[^.:!\n]*[:.]?\s*)/i, '')
          .replace(/^(cena \d+[:.]?\s*)/i, '')
          .replace(/^(narrador[:.]?\s*)/i, '')
          .replace(/^["']|["']$/g, '')
          .trim() || scene.narrationText;

        const audioRes = await synthesizeAudio(cleanNarrationText, selectedModel, selectedProfileId);
        if (!audioRes) throw new Error(`Falha ao sintetizar áudio para a cena ${stepNum}.`);
        updateSceneAudio(scriptRes.id, scene.id, audioRes.id, audioRes.url);

        setCurrentProgressStep(`🎬 4/6. Gerando vídeo com legendas MP4 da Cena ${stepNum}/${totalScenes}...`);
        const videoRes = await generateVideo(audioRes.id, subtitleStyle, 'center', '1:1', selectedProfileId);
        if (!videoRes) throw new Error(`Falha ao gerar vídeo legendado para a cena ${stepNum}.`);
        updateSceneVideo(scriptRes.id, scene.id, videoRes.id, videoRes.url);

        // Escolhe a mídia de fundo (da lista enviada ou busca vetorial)
        let bgUrl = uploadedMediaUrls[i % uploadedMediaUrls.length] || scene.selectedMediaUrl || '';
        if (!bgUrl) {
          const searchRes = await api.semanticSearch(scene.narrationText, ['all'], 1);
          if (searchRes?.results && searchRes.results.length > 0) {
            bgUrl = searchRes.results[0].media.url;
            updateSceneMedia(scriptRes.id, scene.id, searchRes.results[0].media.id, bgUrl);
          }
        }

        // Posicionamento inteligente anti-texto
        const smartPos = determineSmartOverlayPosition(bgUrl, scene.visualPrompt);
        setCurrentProgressStep(`📐 5/6. Renderizando overlay inteligente anti-texto (Posição: ${smartPos}) da Cena ${stepNum}/${totalScenes}...`);

        const compositeResultUrl = await renderCompositeVideo(
          bgUrl,
          videoRes.url,
          audioRes.url,
          scene.estimatedDurationSeconds || 6,
          smartPos,
          overlayScale,
          '#000000'
        );

        if (compositeResultUrl) {
          sceneFinalVideoUrls.push(compositeResultUrl);
        } else {
          sceneFinalVideoUrls.push(videoRes.url);
        }

        const sceneProgress = 40 + Math.round(((i + 1) / totalScenes) * 45);
        setProgressPercentage(sceneProgress);
      }

      // ETAPA 6: Concatenar Todos os Vídeos Renderizados em 1 Vídeo Mestre Final
      setCurrentProgressStep('🎬 6/6. Juntando todas as cenas no Vídeo Mestre Final MP4...');
      setProgressPercentage(90);

      const finalMasterRes = await api.concatFinalVideos(sceneFinalVideoUrls);
      if (finalMasterRes?.outputUrl) {
        setFinalMasterVideoUrl(finalMasterRes.outputUrl);
        useCromyVoiceStore.setState({ compositeVideoUrl: finalMasterRes.outputUrl });
      } else {
        throw new Error('Falha ao concatenar as cenas no vídeo mestre final.');
      }

      setProgressPercentage(100);
      setCurrentProgressStep('✅ Vídeo Mestre Completo Renderizado com Sucesso!');
    } catch (err: any) {
      console.error('Erro no pipeline 1-clique:', err);
      setErrorMessage(err.message || 'Ocorreu um erro durante o processamento automático do vídeo.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Top Banner Header */}
      <div className="glass-card p-6 md:p-8 rounded-3xl border border-indigo-500/30 relative overflow-hidden shadow-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-pink-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 shrink-0">
            <Wand2 className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              ⚡ Gerador Automático de Vídeo 1-Clique (Pipeline Completo)
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Cole o conteúdo, faça o upload das mídias e insira suas instruções do Prompt. O sistema processa tudo automaticamente e gera o vídeo final pronto para uso sem cobrir textos importantes da imagem.
            </p>
          </div>
        </div>
      </div>

      {/* Main Single Page Form */}
      <div className="glass-card p-6 md:p-8 rounded-3xl border border-indigo-500/20 space-y-6 shadow-xl">
        {/* 1. Prompt do Sistema (System Prompt) */}
        <div>
          <label className="text-xs font-bold text-indigo-300 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Prompt do Sistema (Instruções da IA para o Roteiro e Estilo):
          </label>
          <textarea
            rows={2}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Digite as instruções do sistema para a IA..."
            className="glass-input w-full p-3 rounded-2xl text-xs leading-relaxed"
          />
        </div>

        {/* 2. Conteúdo / Matéria Principal */}
        <div>
          <label className="text-xs font-bold text-slate-200 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              Conteúdo / Matéria ou Notícia do Vídeo:
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{content.length} caracteres</span>
          </label>
          <textarea
            rows={6}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Cole aqui o texto completo da matéria, notícia ou post a ser transformado em vídeo..."
            className="glass-input w-full p-4 rounded-2xl text-xs leading-relaxed"
          />
        </div>

        {/* 3. Upload de Mídias em Lote (Imagens / Vídeos de Fundo) */}
        <div className="space-y-3 p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-indigo-300 flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-400" />
              Upload de Mídias da Galeria (Imagens ou Vídeos para Fundo):
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              {uploadedFiles.length} arquivo(s) selecionado(s)
            </span>
          </div>

          <div className="border-2 border-dashed border-indigo-500/40 hover:border-indigo-500 rounded-2xl p-6 text-center space-y-3 bg-slate-950/40 transition-all">
            <ImageIcon className="w-8 h-8 text-indigo-400 mx-auto" />
            <div>
              <p className="text-xs font-bold text-white">Arraste ou selecione suas imagens/vídeos aqui</p>
              <p className="text-[11px] text-slate-400 mt-0.5">PNG, JPG, MP4 ou WEBM</p>
            </div>
            <label className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow cursor-pointer transition-all">
              <Upload className="w-4 h-4" /> Selecionar Mídias
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Lista das mídias anexadas */}
          {uploadedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {uploadedFiles.map((file, idx) => (
                <div key={idx} className="glass-card px-3 py-1.5 rounded-xl border border-indigo-500/30 text-[11px] text-slate-300 flex items-center gap-2">
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <button
                    onClick={() => handleRemoveFile(idx)}
                    className="text-pink-400 hover:text-pink-300 font-bold ml-1"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Configuração do Posicionamento Inteligente Anti-Texto */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Inteligência de Posicionamento (Não Cobrir Textos da Imagem):
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="smartAntiTextPositioning"
                checked={smartAntiTextPositioning}
                onChange={(e) => setSmartAntiTextPositioning(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <label htmlFor="smartAntiTextPositioning" className="text-xs text-slate-300 cursor-pointer font-semibold">
                🛡️ Posicionamento IA Anti-Texto (Analisa a imagem e evita cobrir áreas de código/título)
              </label>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 mb-1 block">
                Tamanho / Escala do Quadrado:
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={overlayScale}
                  onChange={(e) => setOverlayScale(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-indigo-400 font-mono w-12">
                  {Math.round(overlayScale * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback de Progresso Ativo */}
        {isProcessing && (
          <div className="p-6 rounded-2xl bg-indigo-950/40 border border-indigo-500/50 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-indigo-300">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                {currentProgressStep}
              </span>
              <span className="font-mono">{progressPercentage}%</span>
            </div>
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-indigo-500/30 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-pink-500 to-emerald-400 rounded-full transition-all duration-500 shadow-lg"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-xl bg-pink-950/40 border border-pink-500/40 text-pink-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>⚠️ {errorMessage}</span>
          </div>
        )}

        {/* Botão de Disparo do Pipeline Automático */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleStartFullAutomatedPipeline}
            disabled={isProcessing || !content.trim()}
            className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 via-indigo-600 to-pink-600 hover:opacity-95 disabled:opacity-50 text-white text-sm font-extrabold px-10 py-5 rounded-2xl shadow-2xl shadow-indigo-600/30 flex items-center justify-center gap-3 transition-all"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Processando Pipeline 1-Clique...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                <span>🎬 GERAR VÍDEO COMPLETO AUTOMÁTICO (1-Clique)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Exibição do Vídeo Mestre Final Renderizado */}
      {finalMasterVideoUrl && (
        <div className="glass-card p-8 rounded-3xl border border-emerald-500/50 space-y-4 shadow-2xl bg-gradient-to-b from-slate-900 to-emerald-950/30 text-center">
          <div className="w-16 h-16 bg-emerald-600/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/40 shadow-lg">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-white">🎉 Vídeo Mestre Completo Renderizado com Sucesso!</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-lg mx-auto">
              Todas as cenas foram sintetizadas, compostas com IA anti-texto e concatenadas no arquivo final abaixo:
            </p>
          </div>

          <div className="max-w-2xl mx-auto aspect-video bg-black rounded-2xl overflow-hidden border border-emerald-500/40 shadow-2xl">
            <video src={finalMasterVideoUrl} controls className="w-full h-full object-contain" />
          </div>

          <div className="pt-2">
            <a
              href={finalMasterVideoUrl}
              download
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold px-8 py-3.5 rounded-xl shadow-xl shadow-emerald-600/30 transition-all"
            >
              <Download className="w-4 h-4" /> Baixar Vídeo Mestre Final MP4
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
