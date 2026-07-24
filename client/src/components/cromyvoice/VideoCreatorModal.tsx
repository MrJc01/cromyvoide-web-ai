import React, { useState, useEffect } from 'react';
import { useCromyVoiceStore } from '../../store/useCromyVoiceStore';
import { useMediaStore } from '../../store/useMediaStore';
import { api } from '../../services/api';
import { SearchResult } from '../../types/media';
import {
  Mic,
  Video,
  Layers,
  X,
  Sparkles,
  Play,
  Download,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Check,
  Grid,
  Loader2
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

interface VideoCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  sceneId?: string;
  initialText?: string;
  initialBgMediaUrl?: string;
  initialAudioUrl?: string;
  initialAudioId?: number;
  initialVideoUrl?: string;
  onVideoGenerated?: (videoUrl: string, videoId?: number) => void;
}

export const VideoCreatorModal: React.FC<VideoCreatorModalProps> = ({
  isOpen,
  onClose,
  initialText = '',
  initialBgMediaUrl = '',
  initialAudioUrl = '',
  initialAudioId,
  initialVideoUrl = '',
  onVideoGenerated
}) => {
  const {
    models,
    profiles,
    videoProfiles,
    selectedModel,
    setSelectedModel,
    selectedProfileId,
    setSelectedProfileId,
    subtitleStyle,
    setSubtitleStyle,
    subtitlePosition,
    setSubtitlePosition,
    aspectRatio,
    setAspectRatio,
    fetchModelsAndProfiles,
    synthesizeAudio,
    generateVideo,
    renderCompositeVideo,
    isSynthesizing,
    isGeneratingVideo,
    isComposing
  } = useCromyVoiceStore();

  const { mediaList, fetchMedia } = useMediaStore();

  // Fluxo de Etapas (Step-by-step Wizard Workflow)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Estados LOCAIS isolados por cena (não poluem o Zustand global)
  const [text, setText] = useState(initialText);
  const [bgMediaUrl, setBgMediaUrl] = useState(initialBgMediaUrl);
  const [bgColor, setBgColor] = useState<string>('#000000');
  const [bgType, setBgType] = useState<'image' | 'color'>('color');
  const [recommendedMedia, setRecommendedMedia] = useState<SearchResult[]>([]);
  const [isRecommendationLoading, setIsRecommendationLoading] = useState(false);

  // Estado LOCAL de áudio e vídeo da cena atual (não compartilhado entre cenas)
  const [localAudioId, setLocalAudioId] = useState<number | undefined>(initialAudioId);
  const [localAudioUrl, setLocalAudioUrl] = useState<string>(initialAudioUrl || '');
  const [localVideoUrl, setLocalVideoUrl] = useState<string>(initialVideoUrl || '');
  const [localCompositeUrl, setLocalCompositeUrl] = useState<string>('');

  // Posição na grade 3x3 (9 posições + Tela Cheia)
  const [overlayPosition, setOverlayPosition] = useState<OverlayPosition9>('center');
  const [overlayScale, setOverlayScale] = useState<number>(0.7);

  useEffect(() => {
    fetchModelsAndProfiles();
    fetchMedia();
  }, []);

  // Resetar TODO o estado local quando o modal abre para uma cena diferente
  useEffect(() => {
    if (!isOpen) return;

    setText(initialText || '');
    setBgMediaUrl(initialBgMediaUrl || '');
    setBgColor('#000000');
    setBgType('color');
    setRecommendedMedia([]);
    setLocalCompositeUrl('');

    if (initialAudioUrl) {
      setLocalAudioId(initialAudioId || 1);
      setLocalAudioUrl(initialAudioUrl);
    } else {
      setLocalAudioId(undefined);
      setLocalAudioUrl('');
    }

    if (initialVideoUrl) {
      setLocalVideoUrl(initialVideoUrl);
    } else {
      setLocalVideoUrl('');
    }

    // Definir o step inicial correto
    if (initialVideoUrl || initialAudioUrl) {
      setCurrentStep(3);
    } else {
      setCurrentStep(1);
    }
  }, [initialText, initialBgMediaUrl, initialAudioUrl, initialVideoUrl, isOpen]);

  if (!isOpen) return null;

  // Etapa 1 -> 2: Sintetizar Áudio TTS
  const handleApproveScriptAndGenerateAudio = async () => {
    if (!text.trim()) return;
    const audioRes = await synthesizeAudio(text, selectedModel, selectedProfileId);
    if (audioRes) {
      setLocalAudioId(audioRes.id);
      setLocalAudioUrl(audioRes.url);
      setCurrentStep(2);
    }
  };

  // Etapa 2 -> 3: Gerar Vídeo MP4 na API CromyVoice
  const handleApproveAudioAndGenerateVideo = async () => {
    if (!localAudioId) return;
    const videoRes = await generateVideo(localAudioId, subtitleStyle, subtitlePosition, aspectRatio, selectedProfileId);
    if (videoRes) {
      setLocalVideoUrl(videoRes.url);
      onVideoGenerated?.(videoRes.url, videoRes.id);
      setCurrentStep(3);
    }
  };

  // Disparar geração de vídeo no Passo 3 com feedback de loading
  const handleTriggerVideoGenerationInStep3 = async () => {
    if (!localAudioId) {
      alert('Sintetize ou selecione o áudio primeiro.');
      return;
    }
    const videoRes = await generateVideo(localAudioId, subtitleStyle, subtitlePosition, aspectRatio, selectedProfileId);
    if (videoRes) {
      setLocalVideoUrl(videoRes.url);
      onVideoGenerated?.(videoRes.url, videoRes.id);
    }
  };

  // Etapa 3 -> 4: Recomendar Mídias com IA (Similaridade Vetorial)
  const handleRecommendMedia = async () => {
    setIsRecommendationLoading(true);
    try {
      const data = await api.semanticSearch(text, ['all'], 8);
      setRecommendedMedia(data.results);
    } catch (err) {
      console.error('Erro na recomendação IA:', err);
    } finally {
      setIsRecommendationLoading(false);
    }
  };

  // Etapa 5 -> Renderização Final via FFmpeg com Posição na Grade de 9 Pontos
  const handleStartFinalRender = async () => {
    const compositeUrl = await renderCompositeVideo(
      bgType === 'image' ? bgMediaUrl : '',
      localVideoUrl,
      localAudioUrl,
      6,
      overlayPosition,
      overlayScale,
      bgType === 'color' ? bgColor : (bgColor || '#000000')
    );
    if (compositeUrl) {
      setLocalCompositeUrl(compositeUrl);
      onVideoGenerated?.(compositeUrl, 1);
    }
    setCurrentStep(5);
  };

  const grid9Positions: { id: OverlayPosition9; label: string }[] = [
    { id: 'top-left', label: 'Top Left' },
    { id: 'top-center', label: 'Top Center' },
    { id: 'top-right', label: 'Top Right' },
    { id: 'middle-left', label: 'Mid Left' },
    { id: 'center', label: 'Centro (Print)' },
    { id: 'middle-right', label: 'Mid Right' },
    { id: 'bottom-left', label: 'Btm Left' },
    { id: 'bottom-center', label: 'Btm Center' },
    { id: 'bottom-right', label: 'Btm Right' },
  ];

  const stepsLabels = [
    { num: 1, label: '1. Texto' },
    { num: 2, label: '2. Preset Áudio' },
    { num: 3, label: '3. Legenda & Vídeo' },
    { num: 4, label: '4. Mídia Fundo' },
    { num: 5, label: '5. Grade 9 Posições' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-4xl w-full rounded-2xl border border-indigo-500/30 overflow-hidden flex flex-col max-h-[92vh] shadow-2xl">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-600/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                Ajustar Posição do Vídeo na Grade & Legendas
              </h2>
              <p className="text-xs text-slate-400">
                Defina onde o quadrado do vídeo ficará posicionado sobre a mídia de fundo antes de renderizar.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Header Bar */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between overflow-x-auto">
          {stepsLabels.map((s) => {
            const isActive = currentStep === s.num;
            const isCompleted = currentStep > s.num;
            return (
              <div
                key={s.num}
                onClick={() => setCurrentStep(s.num)}
                className={`flex items-center gap-2 text-xs font-semibold shrink-0 cursor-pointer ${
                  isActive
                    ? 'text-indigo-400 font-bold'
                    : isCompleted
                    ? 'text-emerald-400'
                    : 'text-slate-500'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md'
                      : isCompleted
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className="w-3 h-3" /> : s.num}
                </div>
                <span>{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* PASSO 1: TEXTO DA CENA */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="bg-indigo-950/40 border border-indigo-800/40 p-4 rounded-xl">
                <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                  Passo 1: Texto da Fala da Cena
                </h3>
                <p className="text-xs text-slate-400">
                  Edite o texto que será narrado e convertido em legendas.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                  Texto da Fala (TTS):
                </label>
                <textarea
                  rows={4}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Digite o texto a ser narrado..."
                  className="glass-input w-full p-4 rounded-xl text-xs leading-relaxed"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleApproveScriptAndGenerateAudio}
                  disabled={isSynthesizing || !text.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg flex items-center gap-2"
                >
                  {isSynthesizing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Sintetizando Áudio...
                    </>
                  ) : (
                    <>
                      <span>Aprovar Texto & Gerar Áudio</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* PASSO 2: PRESET DE ÁUDIO TTS */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="bg-indigo-950/40 border border-indigo-800/40 p-4 rounded-xl">
                <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <Mic className="w-4 h-4 text-indigo-400" />
                  Passo 2: Escolha da Voz do Narrador (ONNX Piper)
                </h3>
                <p className="text-xs text-slate-400">
                  Selecione o perfil ou modelo de voz desejado para a narração.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                    Modelo de Voz ONNX:
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="glass-input w-full px-3 py-2.5 rounded-xl text-xs"
                  >
                    {models.map(m => (
                      <option key={m} value={m} className="bg-slate-900 text-white">
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                    Perfil Salvo (profile_id):
                  </label>
                  <select
                    value={selectedProfileId ?? ''}
                    onChange={(e) => setSelectedProfileId(e.target.value ? Number(e.target.value) : undefined)}
                    className="glass-input w-full px-3 py-2.5 rounded-xl text-xs"
                  >
                    <option value="" className="bg-slate-900">Nenhum (Direto)</option>

                    {profiles.length > 0 && (
                      <optgroup label="🎙️ Perfis de Voz TTS">
                        {profiles.map((p) => (
                          <option key={`tts-${p.id}`} value={p.id} className="bg-slate-900 text-white">
                            Perfil Voz #{p.id}: {p.name}
                          </option>
                        ))}
                      </optgroup>
                    )}

                    {videoProfiles && (
                      <>
                        {videoProfiles.user_profiles && videoProfiles.user_profiles.length > 0 && (
                          <optgroup label="🎬 Perfis de Vídeo (Usuário)">
                            {videoProfiles.user_profiles.map((vp) => (
                              <option key={`vid-user-${vp.id}`} value={vp.id} className="bg-slate-900 text-white">
                                Perfil Vídeo #{vp.id}: {vp.name}
                              </option>
                            ))}
                          </optgroup>
                        )}

                        {videoProfiles.system_presets && videoProfiles.system_presets.length > 0 && (
                          <optgroup label="⚡ Presets de Vídeo (Sistema)">
                            {videoProfiles.system_presets.map((sp) => (
                              <option key={`vid-sys-${sp.id}`} value={sp.id} className="bg-slate-900 text-white">
                                Preset Vídeo #{sp.id}: {sp.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Player do Áudio Sintetizado */}
              {localAudioUrl && (
                <div className="glass-card p-3 rounded-xl border border-indigo-500/30 space-y-1.5">
                  <span className="text-[10px] font-bold text-indigo-400">Player de Áudio:</span>
                  <audio src={localAudioUrl} controls className="w-full h-10 rounded-lg" />
                </div>
              )}

              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="text-slate-400 hover:text-white text-xs font-medium flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </button>
                <button
                  onClick={handleApproveAudioAndGenerateVideo}
                  disabled={isGeneratingVideo}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg flex items-center gap-2"
                >
                  {isGeneratingVideo ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Gerando Vídeo Legendado...
                    </>
                  ) : (
                    <>
                      <span>Aprovar Áudio & Ir para Legendas</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* PASSO 3: LEGENDAS & GERAR VÍDEO LEGENDADO COM SPINNER DE LOADING */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="bg-indigo-950/40 border border-indigo-800/40 p-4 rounded-xl">
                <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <Video className="w-4 h-4 text-indigo-400" />
                  Passo 3: Escolha do Preset de Legenda (j-vid, neon, minimal, box)
                </h3>
                <p className="text-xs text-slate-400">
                  Selecione o estilo e a posição das legendas. Clique em "Gerar Vídeo Legendado MP4" para renderizar as legendas na API CromyVoice.
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-300 block">Estilo / Preset das Legendas (CromyVoice):</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'j-vid', label: 'j-vid', desc: 'Padrão J-Vid' },
                    { id: 'neon', label: 'neon', desc: 'Glow & Brilho' },
                    { id: 'minimal', label: 'minimal', desc: 'Bold Minimal' },
                    { id: 'box', label: 'box', desc: 'Caixa Marcador' }
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSubtitleStyle(preset.id)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        subtitleStyle === preset.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold shadow-lg'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="capitalize text-xs block font-bold mb-1">{preset.label}</span>
                      <span className="text-[10px] text-slate-500">{preset.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Seletor de Posição da Legenda no Vídeo (Center, Bottom) e Format */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
                <div>
                  <label className="text-xs font-bold text-slate-300 mb-1.5 block">Posição das Legendas:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'center', label: 'center (Meio)' },
                      { id: 'bottom', label: 'bottom (Rodapé)' }
                    ].map((pos) => (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => setSubtitlePosition(pos.id)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                          subtitlePosition === pos.id
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 mb-1.5 block">Formato (Aspect Ratio):</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: '1:1', label: '1:1' },
                      { id: '9:16', label: '9:16' },
                      { id: '16:9', label: '16:9' }
                    ].map((ar) => (
                      <button
                        key={ar.id}
                        type="button"
                        onClick={() => setAspectRatio(ar.id)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                          aspectRatio === ar.id
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {ar.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Botão de Geração Direta do Vídeo com Loading Spinner */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTriggerVideoGenerationInStep3}
                  disabled={isGeneratingVideo}
                  className="w-full bg-gradient-to-r from-pink-600 to-indigo-600 hover:opacity-90 disabled:opacity-50 text-white text-xs font-extrabold py-3.5 px-6 rounded-xl shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2.5 transition-all"
                >
                  {isGeneratingVideo ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Gerando Vídeo Legendado MP4 na API CromyVoice... Aguarde</span>
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4" />
                      <span>🎬 Gerar / Re-gerar Vídeo Legendado MP4 ({subtitleStyle}, {subtitlePosition})</span>
                    </>
                  )}
                </button>
              </div>

              {/* Banner de Estado de Loading Ativo */}
              {isGeneratingVideo && (
                <div className="glass-card p-4 rounded-xl border border-pink-500/40 bg-pink-950/20 text-center space-y-2 animate-pulse">
                  <Loader2 className="w-7 h-7 text-pink-400 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-pink-300">
                    A API CromyVoice está processando e renderizando as legendas no vídeo...
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Isso leva apenas alguns segundos. O vídeo aparecerá abaixo assim que for concluído.
                  </p>
                </div>
              )}

              {/* Preview do Vídeo Legendado Concluído */}
              {!isGeneratingVideo && localVideoUrl && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Preview do Vídeo Legendado (API CromyVoice):
                    </h4>
                  </div>
                  <div className={`bg-black rounded-xl overflow-hidden border border-emerald-500/30 mx-auto shadow-xl transition-all ${
                    aspectRatio === '1:1'
                      ? 'aspect-square max-w-sm'
                      : aspectRatio === '9:16'
                      ? 'aspect-[9/16] max-w-xs'
                      : 'aspect-video max-w-lg'
                  }`}>
                    <video
                      src={localVideoUrl}
                      controls
                      className="w-full h-full object-contain bg-black"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="text-slate-400 hover:text-white text-xs font-medium flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </button>
                <button
                  onClick={() => {
                    handleRecommendMedia();
                    setCurrentStep(4);
                  }}
                  disabled={isGeneratingVideo}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg flex items-center gap-2"
                >
                  <span>Escolher Mídia de Fundo (IA)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PASSO 4: MÍDIA OU COR SÓLIDA DE FUNDO */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="bg-indigo-950/40 border border-indigo-800/40 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    Passo 4: Escolha o Fundo (Imagem ou Cor Sólida)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Defina se deseja usar uma imagem da galeria ou uma cor sólida de fundo (Preto padrão #000000).
                  </p>
                </div>
              </div>

              {/* Seletor de Tipo de Fundo (Imagem vs Cor Sólida) */}
              <div className="flex items-center gap-3 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setBgType('color')}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    bgType === 'color'
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🎨 Cor Sólida de Fundo (Preto Padrão)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBgType('image')}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    bgType === 'image'
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🖼️ Imagem da Galeria</span>
                </button>
              </div>

              {/* OPÇÃO 1: COR SÓLIDA DE FUNDO */}
              {bgType === 'color' && (
                <div className="space-y-4 glass-card p-5 rounded-2xl border border-slate-800">
                  <label className="text-xs font-bold text-slate-300 block">Paleta de Cores Sólidas Pré-definidas:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                    {[
                      { hex: '#000000', label: 'Preto (Padrão)' },
                      { hex: '#0f172a', label: 'Azul Escuro' },
                      { hex: '#1e1b4b', label: 'Roxo Estúdio' },
                      { hex: '#064e3b', label: 'Verde Escuro' },
                      { hex: '#450a0a', label: 'Vermelho' },
                      { hex: '#18181b', label: 'Cinza Chumbo' }
                    ].map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => {
                          setBgColor(c.hex);
                          setBgMediaUrl('');
                        }}
                        className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-2 ${
                          bgColor === c.hex
                            ? 'border-indigo-500 ring-2 ring-indigo-500/50 shadow-lg scale-95'
                            : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full border border-white/20 shadow-md" style={{ backgroundColor: c.hex }} />
                        <span className="text-[10px] font-bold text-slate-300">{c.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <span className="text-xs font-bold text-slate-300">Escolher Cor Customizada:</span>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => {
                          setBgColor(e.target.value);
                          setBgMediaUrl('');
                        }}
                        className="w-10 h-10 rounded-xl cursor-pointer bg-slate-900 border border-slate-700 p-1"
                      />
                      <span className="font-mono text-xs text-indigo-400 font-bold uppercase">{bgColor}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* OPÇÃO 2: IMAGEM DA GALERIA */}
              {bgType === 'image' && (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <button
                      onClick={handleRecommendMedia}
                      disabled={isRecommendationLoading}
                      className="bg-gradient-to-r from-indigo-600 to-pink-600 hover:opacity-90 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 shadow"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isRecommendationLoading ? 'animate-spin' : ''}`} />
                      Reordenar com IA
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(recommendedMedia.length > 0 ? recommendedMedia.map(r => r.media) : mediaList).map((media) => {
                      const isSelected = bgMediaUrl === media.url;
                      const matchScore = recommendedMedia.find(r => r.media.id === media.id)?.scorePercentage;
                      return (
                        <div
                          key={media.id}
                          onClick={() => setBgMediaUrl(media.url)}
                          className={`glass-card rounded-xl overflow-hidden border cursor-pointer transition-all relative group ${
                            isSelected
                              ? 'border-indigo-500 ring-2 ring-indigo-500/50 shadow-lg'
                              : 'border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="aspect-video bg-slate-950 relative">
                            <img src={media.url} alt={media.originalname} className="w-full h-full object-cover" />
                            {matchScore && (
                              <span className="absolute top-1.5 right-1.5 bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                                {matchScore} Match
                              </span>
                            )}
                            {isSelected && (
                              <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center">
                                <Check className="w-6 h-6 text-white bg-indigo-600 p-1 rounded-full shadow" />
                              </div>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="text-[11px] font-semibold text-white truncate">{media.originalname}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="text-slate-400 hover:text-white text-xs font-medium flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </button>
                <button
                  onClick={() => setCurrentStep(5)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg flex items-center gap-2"
                >
                  <span>Posicionar na Grade de 9 Locais</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PASSO 5: DEFINIR POSIÇÃO NA GRADE DE 9 LOCAIS */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="bg-indigo-950/40 border border-indigo-800/40 p-4 rounded-xl">
                <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <Grid className="w-4 h-4 text-indigo-400" />
                  Passo 5: Selecione o Local na Grade de 9 Posições & Tamanho
                </h3>
                <p className="text-xs text-slate-400">
                  Clique em um dos 9 locais da grade para posicionar o quadrado do vídeo CromyVoice sobre a mídia de fundo sem cobrir o assunto principal.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Seletor Visual da Grade 3x3 de 9 Posições */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 mb-2 flex items-center justify-between">
                      <span>Grade de 9 Posições do Quadrado:</span>
                      <span className="text-indigo-400 font-mono uppercase">{overlayPosition}</span>
                    </label>

                    {/* Matriz 3x3 de Botões da Grade */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                      {grid9Positions.map((pos) => {
                        const isSelected = overlayPosition === pos.id;
                        return (
                          <button
                            key={pos.id}
                            type="button"
                            onClick={() => setOverlayPosition(pos.id)}
                            className={`h-16 rounded-xl border text-[11px] font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg ring-2 ring-indigo-500/50 scale-95'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                            }`}
                          >
                            <div className={`w-3 h-3 rounded-sm ${isSelected ? 'bg-white' : 'bg-slate-600'}`} />
                            <span>{pos.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => setOverlayPosition('full')}
                      className={`w-full mt-2 py-2 rounded-xl border text-xs font-bold transition-all ${
                        overlayPosition === 'full'
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Tela Cheia (100% Overlay)
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-300 block">
                        Tamanho / Escala do Quadrado:
                      </label>
                      <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                        {(overlayScale * 100).toFixed(0)}%
                      </span>
                    </div>

                    {/* Slider Contínuo de Escala (15% até 100%) */}
                    <input
                      type="range"
                      min="0.15"
                      max="1.0"
                      step="0.05"
                      value={overlayScale}
                      onChange={(e) => setOverlayScale(parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-900 rounded-lg mb-3"
                    />

                    {/* Presets Rápidos de Escalas Menores e Maiores */}
                    <div className="grid grid-cols-5 gap-1.5">
                      {[0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map((sc) => (
                        <button
                          key={sc}
                          type="button"
                          onClick={() => setOverlayScale(sc)}
                          className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                            Math.abs(overlayScale - sc) < 0.01
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                          }`}
                        >
                          {(sc * 100).toFixed(0)}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* PREVIEW INTERATIVO COM POSICIONAMENTO DINÂMICO NAS 9 POSIÇÕES */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">Preview em Tempo Real da Posição:</label>
                  <div className="aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 relative shadow-2xl">
                    {bgType === 'image' && bgMediaUrl ? (
                      <img src={bgMediaUrl} alt="Fundo Selecionado" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full transition-all flex items-center justify-center text-slate-500 text-xs font-mono" style={{ backgroundColor: bgColor }}>
                        Cor Sólida de Fundo ({bgColor})
                      </div>
                    )}

                    {/* Simulação da Caixa posicionada dinamicamente nos 9 locais */}
                    <div
                      className={`absolute bg-black/90 border border-indigo-500/80 shadow-2xl flex items-center justify-center transition-all duration-300 ${
                        overlayPosition === 'top-left'
                          ? 'top-3 left-3'
                          : overlayPosition === 'top-center'
                          ? 'top-3 left-1/2 -translate-x-1/2'
                          : overlayPosition === 'top-right'
                          ? 'top-3 right-3'
                          : overlayPosition === 'middle-left'
                          ? 'top-1/2 left-3 -translate-y-1/2'
                          : overlayPosition === 'center'
                          ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
                          : overlayPosition === 'middle-right'
                          ? 'top-1/2 right-3 -translate-y-1/2'
                          : overlayPosition === 'bottom-left'
                          ? 'bottom-3 left-3'
                          : overlayPosition === 'bottom-center'
                          ? 'bottom-3 left-1/2 -translate-x-1/2'
                          : overlayPosition === 'bottom-right'
                          ? 'bottom-3 right-3'
                          : 'inset-0'
                      }`}
                      style={{
                        height: overlayPosition === 'full' ? '100%' : `${overlayScale * 80}%`,
                        aspectRatio: '1 / 1'
                      }}
                    >
                      {localVideoUrl ? (
                        <video src={localVideoUrl} autoPlay loop muted className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <span className="text-[10px] text-white font-mono p-2 text-center">
                          Quadrado CromyVoice ({overlayPosition})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Botão de Renderização Final */}
              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={() => setCurrentStep(4)}
                  className="text-slate-400 hover:text-white text-xs font-medium flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar Mídia
                </button>
                <button
                  onClick={handleStartFinalRender}
                  disabled={isComposing}
                  className="bg-gradient-to-r from-pink-600 via-indigo-600 to-emerald-600 hover:opacity-90 text-white text-xs font-extrabold px-8 py-3 rounded-xl shadow-lg flex items-center gap-2"
                >
                  {isComposing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Renderizando com FFmpeg...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Renderizar Composição Final (MP4)
                    </>
                  )}
                </button>
              </div>

              {/* Vídeo Renderizado Final Pronto para Download */}
              {localCompositeUrl && (
                <div className="glass-card p-6 rounded-2xl border border-emerald-500/40 space-y-3 mt-4">
                  <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> Vídeo Final Renderizado no Local Escolhido!
                  </h4>
                  <div className="aspect-video bg-black rounded-xl overflow-hidden border border-emerald-500/30 max-w-lg mx-auto">
                    <video src={localCompositeUrl} controls className="w-full h-full" />
                  </div>
                  <div className="flex justify-center">
                    <a
                      href={localCompositeUrl}
                      download
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-8 py-3 rounded-xl shadow-lg flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" /> Baixar Vídeo MP4 Final
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
