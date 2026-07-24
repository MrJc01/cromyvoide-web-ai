import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Video,
  Volume2,
  VolumeX,
  Sparkles,
  Layers,
  Columns2,
  Rows2,
  EyeOff,
  Eye,
  Sliders,
  Maximize2,
  CheckCircle2,
  Loader2,
  Download,
  Scissors,
  Music,
  FileText
} from 'lucide-react';
import { api } from '../../services/api';

export interface TimelineClipItem {
  id: string;
  sceneNumber: number;
  narrationText: string;
  visualPrompt: string;
  estimatedDurationSeconds: number;
  selectedMediaId?: string;
  selectedMediaUrl?: string;
  cromyVoiceVideoUrl?: string;
  cromyVoiceAudioUrl?: string;
  layoutMode: 'overlay' | 'split-horizontal' | 'split-vertical' | 'full-bg';
  splitRatio: number; // 0.3 a 0.7 (default 0.5)
  objectFit: 'contain' | 'cover';
  hideBackground: boolean;
  bgColor: string;
  overlayPosition: string;
  overlayScale: number;
}

interface VideoTimelineEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenes: TimelineClipItem[];
  fullText?: string;
  onRenderComplete?: (outputUrl: string) => void;
}

export const VideoTimelineEditorModal: React.FC<VideoTimelineEditorModalProps> = ({
  isOpen,
  onClose,
  scenes: initialScenes,
  fullText,
  onRenderComplete
}) => {
  const [clips, setClips] = useState<TimelineClipItem[]>(initialScenes);
  const [selectedClipId, setSelectedClipId] = useState<string>(initialScenes[0]?.id || '');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(20); // pixels por segundo
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderedOutputUrl, setRenderedOutputUrl] = useState<string>('');

  const activeClip = clips.find(c => c.id === selectedClipId) || clips[0];
  const totalDuration = clips.reduce((acc, c) => acc + (c.estimatedDurationSeconds || 5), 0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setClips(initialScenes);
    if (initialScenes.length > 0) {
      setSelectedClipId(initialScenes[0].id);
    }
  }, [initialScenes]);

  if (!isOpen) return null;

  // Atualizar propriedades do clipe selecionado
  const updateActiveClip = (updates: Partial<TimelineClipItem>) => {
    setClips(prev =>
      prev.map(c => (c.id === selectedClipId ? { ...c, ...updates } : c))
    );
  };

  // Calcula o tempo de início acumulado de cada clipe na timeline
  const getClipStartTime = (clipId: string) => {
    let start = 0;
    for (const c of clips) {
      if (c.id === clipId) break;
      start += c.estimatedDurationSeconds || 5;
    }
    return start;
  };

  // Altera o playhead ao clicar na régua da timeline
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickedTime = Math.max(0, Math.min(totalDuration, clickX / zoomLevel));
    setCurrentTime(clickedTime);

    // Selecionar clipe correspondente ao tempo clicado
    let accum = 0;
    for (const c of clips) {
      const dur = c.estimatedDurationSeconds || 5;
      if (clickedTime >= accum && clickedTime <= accum + dur) {
        setSelectedClipId(c.id);
        break;
      }
      accum += dur;
    }
  };

  // Renderização do Projeto Final com FFmpeg
  const handleExportTimelineVideo = async () => {
    setIsRendering(true);
    setRenderedOutputUrl('');

    try {
      const renderedSceneUrls: string[] = [];

      for (const clip of clips) {
        if (clip.cromyVoiceVideoUrl) {
          const res = await api.renderComposite(
            clip.hideBackground ? '' : clip.selectedMediaUrl,
            clip.cromyVoiceVideoUrl,
            clip.cromyVoiceAudioUrl,
            clip.estimatedDurationSeconds || 5,
            (clip.overlayPosition as any) || 'center',
            clip.overlayScale || 0.7,
            clip.bgColor || '#000000',
            clip.layoutMode || 'overlay',
            clip.splitRatio || 0.5,
            clip.objectFit || 'contain',
            clip.hideBackground
          );
          if (res.outputUrl) {
            renderedSceneUrls.push(res.outputUrl);
          }
        }
      }

      if (renderedSceneUrls.length > 0) {
        const finalRes = await api.concatFinalVideos(renderedSceneUrls);
        setRenderedOutputUrl(finalRes.outputUrl);
        onRenderComplete?.(finalRes.outputUrl);
      }
    } catch (err: any) {
      console.error('Erro ao renderizar vídeo na Timeline:', err);
      alert('Erro ao renderizar projeto da Timeline: ' + (err.message || 'Erro de comunicação'));
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-7xl w-full h-[92vh] rounded-3xl border border-indigo-500/30 overflow-hidden flex flex-col shadow-2xl bg-slate-950/90">
        
        {/* HEADER DO EDITOR */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-pink-600/30">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                Editor de Vídeo & Timeline Multi-Track
                <span className="text-[10px] bg-pink-500/20 text-pink-300 font-mono px-2 py-0.5 rounded-full border border-pink-500/30">
                  Pré-Etapa Editável
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Ajuste a ordem das cenas, split-screen (lado a lado), encaixe de mídia (object-contain) e cor de fundo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportTimelineVideo}
              disabled={isRendering}
              className="bg-gradient-to-r from-pink-600 via-indigo-600 to-emerald-600 hover:opacity-90 disabled:opacity-50 text-white text-xs font-extrabold px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
            >
              {isRendering ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Renderizando Timeline...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Renderizar Projeto Final
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CORPO DO EDITOR (LAYOUT DE DUAS COLUNAS: PREVIEW + INSPECTOR) */}
        <div className="flex-1 flex overflow-hidden border-b border-slate-800/80">
          
          {/* PAINEL ESQUERDO: PLAYER DE PREVIEW SIMULADO E COMPOSTO */}
          <div className="flex-1 bg-slate-950 p-6 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="w-full max-w-2xl aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
              {activeClip ? (
                <div className="w-full h-full relative flex overflow-hidden">
                  
                  {/* MODO SPLIT-HORIZONTAL (LADO A LADO) */}
                  {activeClip.layoutMode === 'split-horizontal' && (
                    <div className="w-full h-full flex">
                      {/* LADO ESQUERDO (MÍDIA DE FUNDO EM OBJECT-CONTAIN) */}
                      <div
                        className="h-full relative overflow-hidden border-r border-slate-800 flex items-center justify-center"
                        style={{
                          width: `${(activeClip.splitRatio || 0.5) * 100}%`,
                          backgroundColor: activeClip.bgColor || '#000000'
                        }}
                      >
                        {!activeClip.hideBackground && activeClip.selectedMediaUrl ? (
                          <img
                            src={activeClip.selectedMediaUrl}
                            alt="Fundo"
                            className={`w-full h-full ${
                              activeClip.objectFit === 'contain' ? 'object-contain' : 'object-cover'
                            }`}
                          />
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">Fundo Oculto / Cor Sólida</span>
                        )}
                      </div>

                      {/* LADO DIREITO (AVATAR CROMYVOICE VÍDEO) */}
                      <div
                        className="h-full bg-black relative flex items-center justify-center"
                        style={{ width: `${(1 - (activeClip.splitRatio || 0.5)) * 100}%` }}
                      >
                        {activeClip.cromyVoiceVideoUrl ? (
                          <video
                            src={activeClip.cromyVoiceVideoUrl}
                            autoPlay
                            loop
                            muted
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="text-center p-4 text-slate-400">
                            <Video className="w-8 h-8 mx-auto mb-1 opacity-50" />
                            <span className="text-xs">Cena {activeClip.sceneNumber} (CromyVoice)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* MODO SPLIT-VERTICAL (TOPO / BASE) */}
                  {activeClip.layoutMode === 'split-vertical' && (
                    <div className="w-full h-full flex flex-col">
                      <div
                        className="w-full relative overflow-hidden border-b border-slate-800 flex items-center justify-center"
                        style={{
                          height: `${(activeClip.splitRatio || 0.5) * 100}%`,
                          backgroundColor: activeClip.bgColor || '#000000'
                        }}
                      >
                        {!activeClip.hideBackground && activeClip.selectedMediaUrl && (
                          <img
                            src={activeClip.selectedMediaUrl}
                            alt="Fundo"
                            className={`w-full h-full ${
                              activeClip.objectFit === 'contain' ? 'object-contain' : 'object-cover'
                            }`}
                          />
                        )}
                      </div>
                      <div
                        className="w-full bg-black relative flex items-center justify-center"
                        style={{ height: `${(1 - (activeClip.splitRatio || 0.5)) * 100}%` }}
                      >
                        {activeClip.cromyVoiceVideoUrl && (
                          <video src={activeClip.cromyVoiceVideoUrl} autoPlay loop muted className="w-full h-full object-contain" />
                        )}
                      </div>
                    </div>
                  )}

                  {/* MODO OVERLAY (PADRÃO 9 POSIÇÕES) */}
                  {activeClip.layoutMode === 'overlay' && (
                    <div className="w-full h-full relative" style={{ backgroundColor: activeClip.bgColor || '#000000' }}>
                      {!activeClip.hideBackground && activeClip.selectedMediaUrl && (
                        <img src={activeClip.selectedMediaUrl} alt="Fundo" className="w-full h-full object-cover" />
                      )}
                      {activeClip.cromyVoiceVideoUrl && (
                        <div
                          className="absolute bg-black/90 border border-indigo-500/80 shadow-2xl rounded-lg overflow-hidden flex items-center justify-center"
                          style={{
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: `${(activeClip.overlayScale || 0.7) * 75}%`,
                            aspectRatio: '1 / 1'
                          }}
                        >
                          <video src={activeClip.cromyVoiceVideoUrl} autoPlay loop muted className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                  Nenhum clipe selecionado
                </div>
              )}
            </div>

            {/* CONTROLES DE PLAY/PAUSE */}
            <div className="flex items-center gap-4 mt-4 bg-slate-900/80 border border-slate-800 px-6 py-2.5 rounded-full shadow-lg">
              <button
                onClick={() => setCurrentTime(0)}
                className="text-slate-400 hover:text-white transition-colors"
                title="Reiniciar agulha"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <div className="text-xs font-mono font-bold text-slate-300">
                {currentTime.toFixed(1)}s / {totalDuration.toFixed(1)}s
              </div>
            </div>
          </div>

          {/* PAINEL DIREITO: INSPECTOR / PROPRIEDADES DA CENA SELECIONADA */}
          <div className="w-96 bg-slate-900/60 border-l border-slate-800/80 p-5 overflow-y-auto space-y-5">
            <div>
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" /> Propriedades da Cena {activeClip?.sceneNumber}
              </h3>
              <p className="text-[11px] text-slate-400">
                Configure o layout, divisão de tela e ocultação da mídia de fundo.
              </p>
            </div>

            {activeClip && (
              <>
                {/* TIPO DE LAYOUT */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">Modo de Exibição / Layout:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateActiveClip({ layoutMode: 'split-horizontal' })}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                        activeClip.layoutMode === 'split-horizontal'
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <Columns2 className="w-4 h-4" /> Lado a Lado
                    </button>

                    <button
                      type="button"
                      onClick={() => updateActiveClip({ layoutMode: 'split-vertical' })}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                        activeClip.layoutMode === 'split-vertical'
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <Rows2 className="w-4 h-4" /> Topo / Base
                    </button>

                    <button
                      type="button"
                      onClick={() => updateActiveClip({ layoutMode: 'overlay' })}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                        activeClip.layoutMode === 'overlay'
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <Maximize2 className="w-4 h-4" /> Sobreposição
                    </button>
                  </div>
                </div>

                {/* AJUSTE DE DIVISÃO (SPLIT RATIO) */}
                {(activeClip.layoutMode === 'split-horizontal' || activeClip.layoutMode === 'split-vertical') && (
                  <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-300">Proporção da Divisão (Split):</span>
                      <span className="font-mono text-indigo-400 font-bold">
                        {Math.round((activeClip.splitRatio || 0.5) * 100)}% / {Math.round((1 - (activeClip.splitRatio || 0.5)) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.3"
                      max="0.7"
                      step="0.05"
                      value={activeClip.splitRatio || 0.5}
                      onChange={(e) => updateActiveClip({ splitRatio: parseFloat(e.target.value) })}
                      className="w-full accent-indigo-500 h-2 bg-slate-900 rounded-lg cursor-pointer"
                    />
                  </div>
                )}

                {/* OBJECT FIT: CONTAIN VS COVER */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">Encaixe da Mídia de Fundo:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateActiveClip({ objectFit: 'contain' })}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        activeClip.objectFit === 'contain'
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      Contain (Sem Cortes)
                    </button>

                    <button
                      type="button"
                      onClick={() => updateActiveClip({ objectFit: 'cover' })}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        activeClip.objectFit === 'cover'
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      Cover (Preencher)
                    </button>
                  </div>
                </div>

                {/* OPÇÃO DE OCULTAR VÍDEO DE FUNDO */}
                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {activeClip.hideBackground ? <EyeOff className="w-4 h-4 text-pink-400" /> : <Eye className="w-4 h-4 text-indigo-400" />}
                      <span className="text-xs font-bold text-slate-200">Esconder Vídeo/Mídia de Fundo</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={activeClip.hideBackground || false}
                      onChange={(e) => updateActiveClip({ hideBackground: e.target.checked })}
                      className="w-4 h-4 accent-pink-500 rounded cursor-pointer"
                    />
                  </div>

                  {activeClip.hideBackground && (
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Cor Sólida de Fundo:</span>
                      <input
                        type="color"
                        value={activeClip.bgColor || '#000000'}
                        onChange={(e) => updateActiveClip({ bgColor: e.target.value })}
                        className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* TEXTO DA NARRAÇÃO */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 block">Narração da Cena:</label>
                  <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 italic leading-relaxed">
                    "{activeClip.narrationText}"
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* PAINEL INFERIOR: TIMELINE MULTI-TRACK INTERATIVA */}
        <div className="h-44 bg-slate-950 p-3 flex flex-col overflow-hidden relative">
          
          {/* HEADER DA TIMELINE (RÉGUA DE TEMPO & CONTROLES DE ZOOM) */}
          <div className="flex items-center justify-between pb-2 text-[11px] font-mono text-slate-400 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="font-bold text-indigo-400">TIMELINE MULTI-TRACK</span>
              <span>• Total: {totalDuration.toFixed(1)}s</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Zoom:</span>
              <input
                type="range"
                min="10"
                max="50"
                value={zoomLevel}
                onChange={(e) => setZoomLevel(Number(e.target.value))}
                className="w-20 accent-indigo-500 h-1.5 bg-slate-900 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* TRILHAS DA TIMELINE COM SCROLL HORIZONTAL */}
          <div
            ref={timelineRef}
            onClick={handleTimelineClick}
            className="flex-1 overflow-x-auto relative mt-2 cursor-pointer select-none space-y-1.5"
          >
            {/* LINHA DE AGULHA DO PLAYHEAD */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-pink-500 z-30 pointer-events-none transition-all"
              style={{ left: `${currentTime * zoomLevel}px` }}
            >
              <div className="w-2.5 h-2.5 bg-pink-500 rounded-full -translate-x-[4px] -translate-y-1 shadow-lg" />
            </div>

            {/* TRILHA 1: VÍDEOS CROMYVOICE */}
            <div className="flex items-center h-8 bg-slate-900/80 rounded-lg overflow-hidden relative border border-slate-800/80">
              <div className="w-24 shrink-0 px-2 text-[10px] font-bold text-indigo-400 flex items-center gap-1 border-r border-slate-800 bg-slate-950">
                <Video className="w-3 h-3" /> Vídeo Cena
              </div>
              <div className="flex relative h-full">
                {clips.map(clip => {
                  const dur = clip.estimatedDurationSeconds || 5;
                  const widthPx = dur * zoomLevel;
                  const isSelected = clip.id === selectedClipId;
                  return (
                    <div
                      key={clip.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClipId(clip.id);
                      }}
                      className={`h-full border-r border-slate-950 px-2 flex items-center text-[10px] font-bold truncate transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600/80 text-white border-2 border-indigo-400 shadow-md'
                          : 'bg-indigo-950/40 text-indigo-200 hover:bg-indigo-900/40'
                      }`}
                      style={{ width: `${widthPx}px` }}
                    >
                      Cena {clip.sceneNumber} ({dur}s)
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TRILHA 2: MÍDIAS DE FUNDO */}
            <div className="flex items-center h-8 bg-slate-900/80 rounded-lg overflow-hidden relative border border-slate-800/80">
              <div className="w-24 shrink-0 px-2 text-[10px] font-bold text-pink-400 flex items-center gap-1 border-r border-slate-800 bg-slate-950">
                <Layers className="w-3 h-3" /> Fundo/Split
              </div>
              <div className="flex relative h-full">
                {clips.map(clip => {
                  const dur = clip.estimatedDurationSeconds || 5;
                  const widthPx = dur * zoomLevel;
                  const isSelected = clip.id === selectedClipId;
                  return (
                    <div
                      key={clip.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClipId(clip.id);
                      }}
                      className={`h-full border-r border-slate-950 px-2 flex items-center text-[10px] truncate transition-all cursor-pointer ${
                        clip.hideBackground
                          ? 'bg-slate-950 text-slate-600 italic'
                          : isSelected
                          ? 'bg-pink-600/80 text-white font-bold border-2 border-pink-400'
                          : 'bg-pink-950/40 text-pink-200 hover:bg-pink-900/40'
                      }`}
                      style={{ width: `${widthPx}px` }}
                    >
                      {clip.hideBackground ? 'Sem Fundo' : `${clip.layoutMode}`}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TRILHA 3: NARRAÇÃO ÁUDIO */}
            <div className="flex items-center h-7 bg-slate-900/80 rounded-lg overflow-hidden relative border border-slate-800/80">
              <div className="w-24 shrink-0 px-2 text-[10px] font-bold text-emerald-400 flex items-center gap-1 border-r border-slate-800 bg-slate-950">
                <Music className="w-3 h-3" /> Narração
              </div>
              <div className="flex relative h-full">
                {clips.map(clip => {
                  const dur = clip.estimatedDurationSeconds || 5;
                  const widthPx = dur * zoomLevel;
                  return (
                    <div
                      key={clip.id}
                      className="h-full border-r border-slate-950 px-2 flex items-center text-[9px] text-emerald-300 bg-emerald-950/30 truncate"
                      style={{ width: `${widthPx}px` }}
                    >
                      Áudio TTS #{clip.sceneNumber}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
