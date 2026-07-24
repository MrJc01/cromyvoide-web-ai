import React, { useEffect, useRef } from 'react';
import { useTimelineStore } from '../../store/useTimelineStore';
import {
  Play,
  Pause,
  SkipBack,
  Scissors,
  Undo2,
  Redo2,
  Monitor
} from 'lucide-react';

// Componente Auxiliar para Sincronização e Exibição de Vídeo Sem Tela Preta
const CanvasVideoItem: React.FC<{
  src: string;
  isPlaying: boolean;
  currentTime: number;
  startTime: number;
  isMuted: boolean;
}> = ({ src, isPlaying, currentTime, startTime, isMuted }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      const offset = Math.max(0, currentTime - startTime);
      if (Math.abs(videoRef.current.currentTime - offset) > 0.3) {
        videoRef.current.currentTime = offset;
      }
      videoRef.current.muted = isMuted;
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, currentTime, startTime, isMuted, src]);

  return (
    <video
      ref={videoRef}
      src={src}
      className="w-full h-full object-contain max-h-full"
      playsInline
      preload="auto"
      muted={isMuted}
      loop
    />
  );
};

export const EditorCanvasPreview: React.FC = () => {
  const {
    currentTime,
    duration,
    isPlaying,
    setCurrentTime,
    setIsPlaying,
    clips,
    tracks,
    aspectRatio,
    setAspectRatio,
    splitClipAtPlayhead,
    undo,
    redo,
    historyIndex,
    history,
    selectedClipId,
    setSelectedClipId,
    updateClip
  } = useTimelineStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Manipulador de Arraste/Redimensionamento de Elementos no Canvas Preview
  const handleCanvasClipMouseDown = (
    e: React.MouseEvent,
    clipId: string,
    action: 'move' | 'scale'
  ) => {
    e.stopPropagation();
    setSelectedClipId(clipId);
    const targetClip = clips.find(c => c.id === clipId);
    if (!targetClip) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = targetClip.x || 0;
    const initialY = targetClip.y || 0;
    const initialScale = targetClip.scale || 1.0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (action === 'move') {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        updateClip(clipId, {
          x: initialX + deltaX,
          y: initialY + deltaY
        });
      } else if (action === 'scale') {
        const delta = (moveEvent.clientX - startX) / 120;
        const nextScale = Math.max(0.2, Math.min(3.5, initialScale + delta));
        updateClip(clipId, {
          scale: nextScale
        });
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Formatação de Tempo MM:SS.MS
  const formatTimecode = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Toggle de Play/Pause inteligente
  const togglePlay = () => {
    if (!isPlaying && currentTime >= duration - 0.2) {
      setCurrentTime(0);
    }
    setIsPlaying(!isPlaying);
  };

  // Atalho de Teclado (Barra de Espaço para Play/Pause)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName;
      if (e.code === 'Space' && targetTag !== 'INPUT' && targetTag !== 'TEXTAREA') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTime, duration]);

  // Encontra os clipes ativos across TODAS as trilhas visíveis e audíveis
  const visibleVideoTracks = tracks.filter(t => t.type === 'video' && !t.isHidden);
  const visibleVideoTrackIds = new Set(visibleVideoTracks.map(t => t.id));

  // Clipes visuais ativos no tempo atual (todas as trilhas de vídeo)
  const activeVisualClips = clips.filter(c =>
    visibleVideoTrackIds.has(c.trackId) &&
    (c.type === 'video' || c.type === 'image') &&
    currentTime >= c.startTime &&
    currentTime <= (c.startTime + c.duration)
  );

  // Clipes de texto ativos
  const activeTextClip = clips.find(c =>
    visibleVideoTrackIds.has(c.trackId) &&
    c.type === 'text' &&
    currentTime >= c.startTime &&
    currentTime <= (c.startTime + c.duration)
  );

  // Clipes de áudio ativos (todas as trilhas de áudio não mutadas)
  const unmutedAudioTracks = tracks.filter(t => t.type === 'audio' && !t.isMuted);
  const unmutedAudioTrackIds = new Set(unmutedAudioTracks.map(t => t.id));

  const activeAudioClip = clips.find(c =>
    unmutedAudioTrackIds.has(c.trackId) &&
    c.type === 'audio' &&
    currentTime >= c.startTime &&
    currentTime <= (c.startTime + c.duration)
  );

  // Loop de Reprodução Fluído
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      const startRealTime = Date.now();
      const startCurrentTime = currentTime;

      interval = setInterval(() => {
        const elapsed = (Date.now() - startRealTime) / 1000;
        const nextTime = startCurrentTime + elapsed;

        if (nextTime >= duration) {
          setIsPlaying(false);
          setCurrentTime(0);
        } else {
          setCurrentTime(nextTime);
        }
      }, 33);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  // Sincronização de Áudio
  useEffect(() => {
    if (activeAudioClip && activeAudioClip.mediaUrl && audioRef.current) {
      const offset = currentTime - activeAudioClip.startTime;
      if (Math.abs(audioRef.current.currentTime - offset) > 0.3) {
        audioRef.current.currentTime = offset;
      }
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTime, activeAudioClip]);

  // Aspect Ratio Dimensions CSS
  const getAspectRatioClasses = () => {
    switch (aspectRatio) {
      case '9:16': return 'aspect-[9/16] max-h-full h-full';
      case '1:1': return 'aspect-square max-h-full h-full';
      case '4:5': return 'aspect-[4/5] max-h-full h-full';
      default: return 'aspect-video max-h-full h-full max-w-full';
    }
  };

  return (
    <div className="flex flex-col items-center justify-between h-full bg-[#0d121f] p-3 md:p-4 rounded-3xl border border-slate-800/80 shadow-2xl overflow-hidden">
      {/* Elemento de Áudio Oculto para Sincronia de Narração */}
      {activeAudioClip && activeAudioClip.mediaUrl && (
        <audio ref={audioRef} src={activeAudioClip.mediaUrl} preload="auto" />
      )}

      {/* ÁREA CENTRAL DO PLAYER CANVAS */}
      <div className="flex-1 w-full flex items-center justify-center relative p-1 min-h-0 overflow-hidden">
        <div className={`relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-700/60 flex items-center justify-center transition-all ${getAspectRatioClasses()}`}>
          {/* Mídias Visuais Ativas (Vídeos ou Imagens em Camadas) */}
          {activeVisualClips.length > 0 ? (
            activeVisualClips.map((clip) => {
              const parentTrack = tracks.find(t => t.id === clip.trackId);
              const isMuted = parentTrack?.isMuted || false;
              const isSelected = selectedClipId === clip.id;

              return (
                <div
                  key={clip.id}
                  onMouseDown={(e) => handleCanvasClipMouseDown(e, clip.id, 'move')}
                  className={`absolute inset-0 flex items-center justify-center cursor-grab active:cursor-grabbing transition-transform ${
                    isSelected ? 'ring-2 ring-indigo-500 z-30' : ''
                  }`}
                  style={{
                    transform: `translate(${clip.x || 0}px, ${clip.y || 0}px) scale(${clip.scale || 1})`
                  }}
                >
                  {clip.type === 'video' ? (
                    <CanvasVideoItem
                      src={clip.mediaUrl || ''}
                      isPlaying={isPlaying}
                      currentTime={currentTime}
                      startTime={clip.startTime}
                      isMuted={isMuted}
                    />
                  ) : (
                    <img src={clip.mediaUrl} alt="Visual" className="w-full h-full object-cover animate-fade-in" />
                  )}

                  {/* Bounding Box Interativa com Alças de Redimensionamento */}
                  {isSelected && (
                    <>
                      <div
                        onMouseDown={(e) => handleCanvasClipMouseDown(e, clip.id, 'scale')}
                        className="absolute -right-2 -bottom-2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-full cursor-nwse-resize shadow-lg hover:scale-125 z-40"
                        title="Arraste para redimensionar"
                      />
                      <div
                        onMouseDown={(e) => handleCanvasClipMouseDown(e, clip.id, 'scale')}
                        className="absolute -left-2 -top-2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-full cursor-nwse-resize shadow-lg hover:scale-125 z-40"
                        title="Arraste para redimensionar"
                      />
                    </>
                  )}
                </div>
              );
            })
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-950 to-black flex items-center justify-center">
              <span className="text-xs text-slate-600 font-semibold tracking-wider">Sem mídia visual no tempo {currentTime.toFixed(1)}s</span>
            </div>
          )}

          {/* Legendas & Cartão de Texto Arrastável */}
          {activeTextClip && (
            <div
              onMouseDown={(e) => handleCanvasClipMouseDown(e, activeTextClip.id, 'move')}
              className={`absolute bottom-10 inset-x-4 flex justify-center z-40 cursor-grab active:cursor-grabbing ${
                selectedClipId === activeTextClip.id ? 'ring-2 ring-yellow-400 p-1 rounded-2xl' : ''
              }`}
              style={{
                transform: `translate(${activeTextClip.x || 0}px, ${activeTextClip.y || 0}px) scale(${activeTextClip.scale || 1})`
              }}
            >
              <div className="bg-black/85 border border-yellow-400/40 text-yellow-300 text-sm md:text-base font-extrabold px-4 py-2 rounded-xl text-center shadow-2xl backdrop-blur-sm tracking-wide uppercase max-w-lg leading-snug">
                {activeTextClip.text || activeTextClip.name}
              </div>
            </div>
          )}

          {/* Marca d'água CromyVoice RVE Studio */}
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] font-bold text-indigo-400 flex items-center gap-1.5 z-30">
            <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-500 animate-ping' : 'bg-slate-500'}`}></span>
            {isPlaying ? 'Reproduzindo' : 'Pausado'}
          </div>
        </div>
      </div>

      {/* BARRA DE CONTROLES DE TRANSPORTE & ACCESSIBILIDADE */}
      <div className="w-full bg-slate-900/90 border border-slate-800 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-4 mt-2 backdrop-blur-md">
        {/* Lado Esquerdo: Undo, Redo, Split, Skip */}
        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Desfazer (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Refazer (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button
            onClick={splitClipAtPlayhead}
            className="px-3 py-1.5 rounded-xl bg-pink-600/20 hover:bg-pink-600/30 text-pink-400 border border-pink-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Dividir Clipe Selecionado no Tempo Atual (✂️)"
          >
            <Scissors className="w-3.5 h-3.5" />
            Dividir (✂️)
          </button>
        </div>

        {/* Centro: Play, Pause & Timecode */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentTime(0)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
            title="Ir para o Início"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 scale-105'
            }`}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <div className="font-mono text-xs font-bold text-slate-200 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
            <span className="text-indigo-400">{formatTimecode(currentTime)}</span>
            <span className="text-slate-600 mx-1">/</span>
            <span className="text-slate-400">{formatTimecode(duration)}</span>
          </div>
        </div>

        {/* Lado Direito: Seletor de Aspect Ratio */}
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-slate-400" />
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold px-2.5 py-1.5 rounded-xl outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="16:9">16:9 (YouTube / Horizontal)</option>
            <option value="9:16">9:16 (Reels / TikTok / Shorts)</option>
            <option value="1:1">1:1 (Feed Quadrado)</option>
            <option value="4:5">4:5 (Instagram Portrait)</option>
          </select>
        </div>
      </div>
    </div>
  );
};

