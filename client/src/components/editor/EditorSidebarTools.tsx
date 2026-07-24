import React, { useState, useEffect } from 'react';
import { useTimelineStore } from '../../store/useTimelineStore';
import { useCromyVoiceStore } from '../../store/useCromyVoiceStore';
import { useMediaStore } from '../../store/useMediaStore';
import {
  Mic,
  Video,
  Image as ImageIcon,
  Type,
  Sparkles,
  Plus,
  Loader2,
  Play,
  Volume2,
  Sliders,
  CheckCircle2
} from 'lucide-react';

export const EditorSidebarTools: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'audio' | 'video' | 'media' | 'text'>('audio');

  // Form State para TTS
  const [ttsText, setTtsText] = useState('Bem-vindo ao Editor de Vídeo Multi-Track CromyVoice!');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [lastAudioUrl, setLastAudioUrl] = useState<string | null>(null);

  // Form State para Vídeo CromyVoice
  const [videoText, setVideoText] = useState('Texto narrado e legendado no vídeo de IA');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [lastVideoUrl, setLastVideoUrl] = useState<string | null>(null);

  // Form State para Texto Personalizado
  const [customText, setCustomText] = useState('Sua Legenda Aqui');

  const { addClip, currentTime } = useTimelineStore();
  const { models, profiles, videoProfiles, fetchModelsAndProfiles, synthesizeAudio, generateVideo } = useCromyVoiceStore();
  const { mediaList, fetchMedia } = useMediaStore();

  useEffect(() => {
    fetchModelsAndProfiles();
    fetchMedia();
  }, []);

  // Sintetizar Áudio TTS Piper ONNX
  const handleSynthesizeAudio = async () => {
    if (!ttsText.trim()) return;
    setIsSynthesizing(true);
    try {
      const res = await synthesizeAudio(ttsText);
      if (res && res.url) {
        setLastAudioUrl(res.url);
        // Insere automaticamente na trilha de áudio da timeline!
        addClip({
          trackId: 'audio-track',
          name: `Áudio: "${ttsText.substring(0, 18)}..."`,
          startTime: currentTime,
          duration: 5,
          type: 'audio',
          mediaUrl: res.url,
          color: '#f59e0b',
          volume: 1.0
        });
      }
    } catch (err) {
      console.error('Erro ao sintetizar áudio no editor:', err);
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Gerar Vídeo CromyVoice com Legendas
  const handleGenerateVideo = async () => {
    if (!videoText.trim()) return;
    setIsGeneratingVideo(true);
    try {
      // 1. Sintetiza o áudio primeiro para obter o audioId
      const audioRes = await synthesizeAudio(videoText);
      if (audioRes && audioRes.id) {
        // 2. Gera o vídeo com legenda usando o ID do áudio
        const res = await generateVideo(audioRes.id);
        if (res && res.url) {
          setLastVideoUrl(res.url);
          // Insere automaticamente na trilha de vídeo da timeline!
          addClip({
            trackId: 'video-track',
            name: `Vídeo IA: "${videoText.substring(0, 18)}..."`,
            startTime: currentTime,
            duration: 5,
            type: 'video',
            mediaUrl: res.url,
            color: '#ec4899'
          });
        }
      }
    } catch (err) {
      console.error('Erro ao gerar vídeo no editor:', err);
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  // Adicionar Mídia de Fundo da Galeria
  const handleAddMediaToTimeline = (mediaUrl: string, filename: string, isVideo: boolean) => {
    addClip({
      trackId: 'video-track',
      name: filename,
      startTime: currentTime,
      duration: 6,
      type: isVideo ? 'video' : 'image',
      mediaUrl,
      color: '#10b981'
    });
  };

  // Adicionar Cartão de Texto/Legenda
  const handleAddTextCard = () => {
    if (!customText.trim()) return;
    addClip({
      trackId: 'video-track',
      name: customText,
      startTime: currentTime,
      duration: 4,
      type: 'text',
      text: customText,
      color: '#3b82f6'
    });
  };

  return (
    <div className="w-72 lg:w-80 flex-shrink-0 bg-[#0d121f] border-r border-slate-800 flex flex-col h-full select-none">
      {/* NAVEGAÇÃO ENTRE FERRAMENTAS */}
      <div className="grid grid-cols-4 p-2 bg-slate-950/60 border-b border-slate-800/80 text-[11px] font-bold">
        <button
          onClick={() => setActiveTab('audio')}
          className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-all ${
            activeTab === 'audio' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Mic className="w-4 h-4" />
          Voz TTS
        </button>

        <button
          onClick={() => setActiveTab('video')}
          className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-all ${
            activeTab === 'video' ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Video className="w-4 h-4" />
          Vídeo IA
        </button>

        <button
          onClick={() => setActiveTab('media')}
          className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-all ${
            activeTab === 'media' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          Galeria
        </button>

        <button
          onClick={() => setActiveTab('text')}
          className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-all ${
            activeTab === 'text' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Type className="w-4 h-4" />
          Texto
        </button>
      </div>

      {/* CONTEÚDO DAS FERRAMENTAS */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* ABA 1: GERADOR DE VOZ TTS ONNX */}
        {activeTab === 'audio' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Mic className="w-4 h-4" />
              Sintetizar Narração com Piper ONNX
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 mb-1.5 block">
                Texto para Falar:
              </label>
              <textarea
                value={ttsText}
                onChange={(e) => setTtsText(e.target.value)}
                placeholder="Digite a fala da narração..."
                className="glass-input w-full h-24 p-3 rounded-xl text-xs resize-none"
              />
            </div>

            <button
              onClick={handleSynthesizeAudio}
              disabled={isSynthesizing || !ttsText.trim()}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-extrabold text-xs py-3 rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isSynthesizing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sintetizando Voz...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Gerar & Inserir na Timeline (Áudio)
                </>
              )}
            </button>

            {lastAudioUrl && (
              <div className="p-3 bg-slate-900 border border-amber-500/30 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Áudio Inserido na Timeline!
                </span>
                <audio src={lastAudioUrl} controls className="w-full h-8 rounded-lg" />
              </div>
            )}
          </div>
        )}

        {/* ABA 2: GERADOR DE VÍDEO IA CROMYVOICE */}
        {activeTab === 'video' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 text-xs font-bold text-pink-400 uppercase tracking-wider">
              <Video className="w-4 h-4" />
              Gerar Vídeo CromyVoice com Legendas
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 mb-1.5 block">
                Texto do Vídeo Legendado:
              </label>
              <textarea
                value={videoText}
                onChange={(e) => setVideoText(e.target.value)}
                placeholder="Texto que aparecerá sincronizado com legenda no vídeo..."
                className="glass-input w-full h-24 p-3 rounded-xl text-xs resize-none"
              />
            </div>

            <button
              onClick={handleGenerateVideo}
              disabled={isGeneratingVideo || !videoText.trim()}
              className="w-full bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-extrabold text-xs py-3 rounded-xl shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isGeneratingVideo ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gerando Vídeo com Legenda...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Gerar & Inserir na Timeline (Vídeo)
                </>
              )}
            </button>

            {lastVideoUrl && (
              <div className="p-3 bg-slate-900 border border-pink-500/30 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-pink-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Vídeo Inserido na Timeline!
                </span>
                <video src={lastVideoUrl} controls className="w-full h-24 rounded-lg object-contain bg-black" />
              </div>
            )}
          </div>
        )}

        {/* ABA 3: GALERIA DE MÍDIAS DA BIBLIOTECA */}
        {activeTab === 'media' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Mídias da Galeria SQLite ({mediaList.length})
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1">
              {mediaList.map((m) => {
                const isVideo = m.mimetype?.includes('video');
                return (
                  <div
                    key={m.id}
                    onClick={() => handleAddMediaToTimeline(m.url, m.filename, !!isVideo)}
                    className="group relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden cursor-pointer hover:border-emerald-500/60 transition-all"
                  >
                    {isVideo ? (
                      <video src={m.url} className="w-full h-24 object-cover" />
                    ) : (
                      <img src={m.url} alt={m.filename} className="w-full h-24 object-cover" />
                    )}

                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center p-2 transition-opacity text-center">
                      <Plus className="w-5 h-5 text-emerald-400 mb-1" />
                      <span className="text-[9px] font-bold text-white truncate w-full">{m.filename}</span>
                      <span className="text-[8px] text-emerald-300 font-semibold">+ Inserir no Fundo</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ABA 4: TEXTO & LEGENDAS PERSONALIZADAS */}
        {activeTab === 'text' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
              <Type className="w-4 h-4" />
              Adicionar Cartão de Texto / Legenda
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 mb-1.5 block">
                Conteúdo do Texto:
              </label>
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Texto que aparecerá na tela..."
                className="glass-input w-full px-3 py-2.5 rounded-xl text-xs"
              />
            </div>

            <button
              onClick={handleAddTextCard}
              disabled={!customText.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs py-3 rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Adicionar Cartão na Trilha de Texto
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
