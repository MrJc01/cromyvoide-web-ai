import React, { useRef, useState } from 'react';
import { useTimelineStore, TimelineClip } from '../../store/useTimelineStore';
import {
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Trash2,
  ZoomIn,
  ZoomOut,
  Scissors,
  Plus
} from 'lucide-react';

interface MultiTrackTimelineProps {
  height?: number;
}

export const MultiTrackTimeline: React.FC<MultiTrackTimelineProps> = ({ height }) => {
  const {
    tracks,
    clips,
    currentTime,
    duration,
    zoom,
    selectedClipId,
    setCurrentTime,
    setZoom,
    setSelectedClipId,
    moveClip,
    trimClip,
    deleteClip,
    addTrack,
    deleteTrack,
    toggleTrackLock,
    toggleTrackHide,
    toggleTrackMute
  } = useTimelineStore();

  const timelineRef = useRef<HTMLDivElement | null>(null);
  const tracksContainerRef = useRef<HTMLDivElement | null>(null);
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<'move' | 'trim-left' | 'trim-right' | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [clipInitialStart, setClipInitialStart] = useState<number>(0);
  const [clipInitialDuration, setClipInitialDuration] = useState<number>(0);

  // Gera marcadores numéricos da régua de segundos
  const renderRulerTicks = () => {
    const ticks = [];
    const step = zoom >= 40 ? 1 : (zoom >= 20 ? 2 : 5); // Ticks dinâmicos por zoom
    for (let sec = 0; sec <= duration; sec += step) {
      const leftPx = sec * zoom;
      ticks.push(
        <div key={sec} className="absolute top-0 bottom-0 flex flex-col justify-between" style={{ left: `${leftPx}px` }}>
          <span className="text-[9px] font-mono font-bold text-slate-500 -ml-2 select-none">{sec}s</span>
          <div className="w-px h-2 bg-slate-700/80" />
        </div>
      );
    }
    return ticks;
  };

  // Clique na régua para mover a agulha de tempo
  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left + timelineRef.current.scrollLeft;
    const newTime = Math.max(0, Math.min(duration, clickX / zoom));
    setCurrentTime(newTime);
  };

  // Início de Arrastar / Trim de Clipe
  const handleClipMouseDown = (
    e: React.MouseEvent,
    clip: TimelineClip,
    type: 'move' | 'trim-left' | 'trim-right'
  ) => {
    e.stopPropagation();
    setSelectedClipId(clip.id);
    setDraggingClipId(clip.id);
    setDragType(type);
    setDragStartX(e.clientX);
    setClipInitialStart(clip.startTime);
    setClipInitialDuration(clip.duration);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - e.clientX;
      const deltaTime = deltaX / zoom;

      if (type === 'move') {
        const nextStart = Math.max(0, clipInitialStart + deltaTime);
        let targetTrackId = clip.trackId;

        // Calcula a trilha de destino baseada na posição vertical do mouse
        if (tracksContainerRef.current) {
          const rect = tracksContainerRef.current.getBoundingClientRect();
          const relY = moveEvent.clientY - rect.top;
          const trackIndex = Math.max(0, Math.min(tracks.length - 1, Math.floor(relY / 56)));
          const targetTrack = tracks[trackIndex];
          if (targetTrack) {
            if ((clip.type === 'audio' && targetTrack.type === 'audio') ||
                (clip.type !== 'audio' && targetTrack.type === 'video')) {
              targetTrackId = targetTrack.id;
            }
          }
        }

        moveClip(clip.id, nextStart, targetTrackId);
      } else if (type === 'trim-left') {
        const nextStart = Math.max(0, clipInitialStart + deltaTime);
        const nextDuration = Math.max(0.5, clipInitialDuration - deltaTime);
        trimClip(clip.id, nextStart, nextDuration);
      } else if (type === 'trim-right') {
        const nextDuration = Math.max(0.5, clipInitialDuration + deltaTime);
        trimClip(clip.id, clipInitialStart, nextDuration);
      }
    };

    const handleMouseUp = () => {
      setDraggingClipId(null);
      setDragType(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const playheadLeftPx = currentTime * zoom;

  return (
    <div
      className="w-full bg-[#0b0f19] border-t border-slate-800 flex flex-col flex-shrink-0 select-none"
      style={{ height: height ? `${height}px` : undefined }}
    >
      {/* BARRA SUPERIOR DE CONTROLES DA TIMELINE */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/80 border-b border-slate-800/80 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-500"></span>
            Linha do Tempo Multi-Track
          </span>

          <div className="h-4 w-px bg-slate-800" />

          {/* Botões para Adicionar Mais Trilhas */}
          <button
            onClick={() => addTrack('video')}
            className="px-2.5 py-1 rounded-lg bg-pink-600/20 hover:bg-pink-600/30 text-pink-300 border border-pink-500/30 text-[11px] font-bold flex items-center gap-1 transition-all"
            title="Adicionar Nova Trilha de Vídeo"
          >
            <Plus className="w-3 h-3" />
            + Trilha de Vídeo
          </button>

          <button
            onClick={() => addTrack('audio')}
            className="px-2.5 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 transition-all"
            title="Adicionar Nova Trilha de Áudio"
          >
            <Plus className="w-3 h-3" />
            + Trilha de Áudio
          </button>

          {selectedClipId && (
            <>
              <div className="h-4 w-px bg-slate-800" />
              <button
                onClick={() => deleteClip(selectedClipId)}
                className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 text-[11px] font-bold flex items-center gap-1 transition-all"
                title="Excluir Clipe Selecionado (Del)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir Clipe
              </button>
            </>
          )}
        </div>

        {/* Controles de Zoom */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setZoom(zoom - 5)}
              className="text-slate-400 hover:text-white transition-colors"
              title="Diminuir Zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <input
              type="range"
              min="10"
              max="100"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-24 accent-indigo-500 h-1.5 bg-slate-800 rounded cursor-pointer"
            />

            <button
              onClick={() => setZoom(zoom + 5)}
              className="text-slate-400 hover:text-white transition-colors"
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-indigo-400 font-bold ml-1">{(zoom / 30).toFixed(1)}x</span>
          </div>
        </div>
      </div>

      {/* CORPO DA TIMELINE: CABEÇALHOS À ESQUERDA + PISTA À DIREITA */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* COLUNA ESQUERDA: CABEÇALHOS DAS TRILHAS */}
        <div className="w-56 bg-slate-950/90 border-r border-slate-800/80 flex flex-col z-20 shadow-xl">
          {/* Espaço em branco alinhado com a régua */}
          <div className="h-7 border-b border-slate-800/80 px-3 flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Trilhas ({tracks.length})
          </div>

          {/* Lista de Cabeçalhos de Trilha */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            {tracks.map((track) => (
              <div
                key={track.id}
                className="h-14 border-b border-slate-800/60 px-3 flex items-center justify-between text-xs font-semibold text-slate-300 bg-slate-900/40"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="truncate" title={track.name}>{track.name}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleTrackLock(track.id)}
                    className={`p-1 rounded hover:bg-slate-800 ${track.isLocked ? 'text-amber-400' : 'text-slate-500'}`}
                    title={track.isLocked ? 'Trilha Bloqueada' : 'Bloquear Trilha'}
                  >
                    {track.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => toggleTrackHide(track.id)}
                    className={`p-1 rounded hover:bg-slate-800 ${track.isHidden ? 'text-red-400' : 'text-slate-500'}`}
                    title={track.isHidden ? 'Trilha Oculta' : 'Ocultar Trilha'}
                  >
                    {track.isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>

                  {track.type === 'audio' && (
                    <button
                      onClick={() => toggleTrackMute(track.id)}
                      className={`p-1 rounded hover:bg-slate-800 ${track.isMuted ? 'text-red-400' : 'text-slate-500'}`}
                      title={track.isMuted ? 'Áudio Mutado' : 'Mutar Áudio'}
                    >
                      {track.isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  )}

                  {tracks.length > 1 && (
                    <button
                      onClick={() => deleteTrack(track.id)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-600 hover:text-red-400 transition-colors"
                      title="Excluir Trilha"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUNA DIREITA: PISTA DA LINHA DO TEMPO (SCROLLABLE HORIZONTAL & VERTICAL) */}
        <div ref={timelineRef} className="flex-1 overflow-auto relative bg-[#090d16]">
          {/* RÉRUA DE SEGUNDOS */}
          <div
            onClick={handleRulerClick}
            className="h-7 border-b border-slate-800/80 bg-slate-950/60 relative cursor-pointer select-none"
            style={{ width: `${duration * zoom + 300}px` }}
          >
            {renderRulerTicks()}
          </div>

          {/* ÁREA DE CLIPES E TRILHAS */}
          <div ref={tracksContainerRef} className="relative" style={{ width: `${duration * zoom + 300}px` }}>
            {/* Agulha Vermelha de Tempo (Playhead Scrub Line) */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none transition-none shadow-[0_0_8px_rgba(239,68,68,0.8)]"
              style={{ left: `${playheadLeftPx}px` }}
            >
              <div className="w-3 h-3 bg-red-500 rotate-45 -ml-1.25 -mt-1 shadow-md" />
            </div>

            {/* Render das Linhas de Trilha */}
            {tracks.map((track) => {
              const trackClips = clips.filter(c => c.trackId === track.id);
              return (
                <div
                  key={track.id}
                  className={`h-14 border-b border-slate-800/50 relative transition-all ${
                    track.isHidden ? 'opacity-30 pointer-events-none' : ''
                  }`}
                >
                  {trackClips.map((clip) => {
                    const isSelected = selectedClipId === clip.id;
                    const leftPx = clip.startTime * zoom;
                    const widthPx = clip.duration * zoom;

                    return (
                      <div
                        key={clip.id}
                        onMouseDown={(e) => handleClipMouseDown(e, clip, 'move')}
                        className={`absolute top-1.5 bottom-1.5 rounded-xl border flex items-center justify-between text-xs font-bold cursor-grab active:cursor-grabbing transition-shadow select-none overflow-hidden ${
                          isSelected
                            ? 'ring-2 ring-white border-white shadow-xl shadow-indigo-500/20'
                            : 'border-slate-700/60 hover:border-slate-500'
                        }`}
                        style={{
                          left: `${leftPx}px`,
                          width: `${widthPx}px`,
                          backgroundColor: clip.color || '#3b82f6',
                          color: '#ffffff'
                        }}
                      >
                        {/* Handle de Trim Esquerda */}
                        <div
                          onMouseDown={(e) => handleClipMouseDown(e, clip, 'trim-left')}
                          className="absolute left-0 top-0 bottom-0 w-3 bg-white/20 hover:bg-white/70 cursor-ew-resize rounded-l-xl z-20 flex items-center justify-center transition-colors"
                          title="Arraste para ajustar o início do clipe"
                        >
                          <div className="w-0.5 h-3 bg-black/60 rounded-full" />
                        </div>

                        {/* Nome do Clipe */}
                        <span className="truncate text-[11px] drop-shadow-md z-10 mx-2">{clip.name}</span>

                        {/* Handle de Trim Direita */}
                        <div
                          onMouseDown={(e) => handleClipMouseDown(e, clip, 'trim-right')}
                          className="absolute right-0 top-0 bottom-0 w-3 bg-white/20 hover:bg-white/70 cursor-ew-resize rounded-r-xl z-20 flex items-center justify-center transition-colors"
                          title="Arraste para ajustar a duração do clipe"
                        >
                          <div className="w-0.5 h-3 bg-black/60 rounded-full" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
