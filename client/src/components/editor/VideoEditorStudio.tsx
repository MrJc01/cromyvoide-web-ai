import React, { useState } from 'react';
import axios from 'axios';
import { useTimelineStore } from '../../store/useTimelineStore';
import { EditorSidebarTools } from './EditorSidebarTools';
import { EditorCanvasPreview } from './EditorCanvasPreview';
import { MultiTrackTimeline } from './MultiTrackTimeline';
import {
  Sparkles,
  Download,
  Loader2,
  Film,
  CheckCircle2,
  AlertCircle,
  X,
  Play,
  RotateCcw
} from 'lucide-react';

export const VideoEditorStudio: React.FC = () => {
  const { clips, tracks, aspectRatio, duration, clearTimeline } = useTimelineStore();

  const [isRendering, setIsRendering] = useState(false);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isRenderModalOpen, setIsRenderModalOpen] = useState(false);

  const [timelineHeight, setTimelineHeight] = useState<number>(240);

  // Redimensionador de Altura da Timeline por Drag
  const handleTimelineResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = timelineHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY;
      const newHeight = Math.max(120, Math.min(500, startHeight + deltaY));
      setTimelineHeight(newHeight);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Renderizar Projeto Multi-Track da Timeline via Backend FFmpeg
  const handleRenderProject = async () => {
    if (clips.length === 0) {
      alert('Sua linha do tempo está vazia! Adicione mídias, narrações ou vídeos para renderizar.');
      return;
    }

    setIsRendering(true);
    setRenderError(null);
    setIsRenderModalOpen(true);

    try {
      const response = await axios.post('/api/render/timeline', {
        clips,
        tracks,
        aspectRatio,
        durationSeconds: duration
      });

      if (response.data && response.data.outputUrl) {
        setRenderedVideoUrl(response.data.outputUrl);
      } else {
        throw new Error('Nenhum URL de vídeo retornado da renderização.');
      }
    } catch (err: any) {
      console.error('Erro na renderização do projeto:', err);
      setRenderError(err.response?.data?.error || err.message || 'Erro ao renderizar vídeo.');
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-[#090d16] text-slate-100 font-sans overflow-hidden select-none">
      {/* CABEÇALHO DO EDITOR (TOP ACTION BAR) */}
      <div className="h-14 bg-[#0d121f] border-b border-slate-800 px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
            <Film className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm text-white tracking-tight leading-none flex items-center gap-2">
              RVE Studio • Editor de Vídeo Multi-Track
              <span className="bg-indigo-950 border border-indigo-700/50 text-indigo-400 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">
                Pro Engine
              </span>
            </h2>
            <span className="text-[10px] text-slate-400 font-medium">
              Crie, edite clipes na timeline e renderize vídeos profissionais em tempo real
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (confirm('Deseja limpar toda a linha do tempo?')) {
                clearTimeline();
              }
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700/50"
            title="Limpar Linha do Tempo"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Limpar Timeline
          </button>

          <button
            onClick={handleRenderProject}
            className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            Renderizar Vídeo Final (MP4)
          </button>
        </div>
      </div>

      {/* ÁREA CENTRAL DO EDITOR (SIDEBAR TOOLS + CANVAS PREVIEW) */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Painel Esquerdo de Ferramentas & Geradores */}
        <EditorSidebarTools />

        {/* Painel Central de Preview Real-Time */}
        <div className="flex-1 p-4 overflow-hidden flex flex-col">
          <EditorCanvasPreview />
        </div>
      </div>

      {/* DIVISOR ARRASTÁVEL PARA REDIMENSIONAR A TIMELINE */}
      <div
        onMouseDown={handleTimelineResizeStart}
        className="h-2.5 bg-slate-950 hover:bg-indigo-600/80 border-y border-slate-800 cursor-ns-resize flex items-center justify-center transition-colors group select-none z-30"
        title="Arraste para cima/baixo para ajustar a altura da linha do tempo"
      >
        <div className="w-12 h-1 bg-slate-700 group-hover:bg-white rounded-full transition-colors" />
      </div>

      {/* PAINEL INFERIOR DA TIMELINE MULTI-TRACK */}
      <MultiTrackTimeline height={timelineHeight} />

      {/* MODAL DE RENDERIZAÇÃO DO VÍDEO FINAL */}
      {isRenderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0d121f] border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsRenderModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">Renderização Multi-Track FFmpeg</h3>
                <p className="text-xs text-slate-400">Processando trilhas e exportando arquivo MP4 final...</p>
              </div>
            </div>

            {isRendering && (
              <div className="p-8 text-center space-y-4 bg-slate-900/60 rounded-2xl border border-slate-800">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-200">Compilando e mesclando trilhas com áudio e legendas...</p>
                <p className="text-[10px] text-slate-400">Isso pode levar alguns segundos dependendo da duração do projeto.</p>
              </div>
            )}

            {renderError && (
              <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-2xl text-red-300 text-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-1">Erro na Renderização:</span>
                  {renderError}
                </div>
              </div>
            )}

            {renderedVideoUrl && !isRendering && (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-black rounded-2xl overflow-hidden border border-slate-800">
                  <video src={renderedVideoUrl} controls autoPlay className="w-full max-h-64 object-contain" />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <a
                    href={renderedVideoUrl}
                    download="video-editado-cromyvoice.mp4"
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs py-3 rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Baixar Vídeo Renderizado (MP4)
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
