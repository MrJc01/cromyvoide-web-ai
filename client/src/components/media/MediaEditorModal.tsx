import React, { useState } from 'react';
import { api } from '../../services/api';
import { Scissors, VolumeX, Volume2, X, RefreshCw, CheckCircle2, Play, Sparkles } from 'lucide-react';

interface MediaEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  onSaveEditedVideo: (newVideoUrl: string) => void;
}

export const MediaEditorModal: React.FC<MediaEditorModalProps> = ({
  isOpen,
  onClose,
  videoUrl,
  onSaveEditedVideo
}) => {
  const [startTime, setStartTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(5);
  const [muteAudio, setMuteAudio] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [editedResultUrl, setEditedResultUrl] = useState<string>('');

  if (!isOpen || !videoUrl) return null;

  const handleProcessVideo = async () => {
    setIsProcessing(true);
    setEditedResultUrl('');
    try {
      const res = await api.editVideo(videoUrl, startTime, duration, muteAudio);
      if (res?.outputUrl) {
        setEditedResultUrl(res.outputUrl);
        onSaveEditedVideo(res.outputUrl);
      }
    } catch (err) {
      console.error('Erro ao recortar vídeo:', err);
      alert('Erro ao processar e recortar vídeo via FFmpeg.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-xl w-full rounded-2xl border border-indigo-500/30 overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                Editor Simples & Corte de Vídeo
              </h2>
              <p className="text-xs text-slate-400">
                Recorte trechos do vídeo e remova o áudio original antes de posicionar na cena.
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

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Player do Vídeo Original / Atual */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">Vídeo Selecionado:</label>
            <div className="aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 shadow-lg">
              <video src={editedResultUrl || videoUrl} controls className="w-full h-full object-contain" />
            </div>
          </div>

          {/* Controles de Corte e Edição */}
          <div className="space-y-4 glass-card p-4 rounded-xl border border-slate-800 bg-slate-950/60">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Tempo de Início (s):</span>
                  <span className="text-indigo-400 font-mono">{startTime}s</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={startTime}
                  onChange={(e) => setStartTime(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="glass-input w-full p-2.5 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Duração do Corte (s):</span>
                  <span className="text-indigo-400 font-mono">{duration}s</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={duration}
                  onChange={(e) => setDuration(Math.max(1, parseFloat(e.target.value) || 1))}
                  className="glass-input w-full p-2.5 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Checkbox de Mutar Áudio Original */}
            <div className="flex items-center gap-3 pt-2 border-t border-slate-800/80">
              <input
                type="checkbox"
                id="muteAudio"
                checked={muteAudio}
                onChange={(e) => setMuteAudio(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <label htmlFor="muteAudio" className="text-xs font-semibold text-slate-200 cursor-pointer flex items-center gap-2">
                {muteAudio ? <VolumeX className="w-4 h-4 text-pink-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                <span>Remover áudio original do vídeo (Mutar para deixar apenas a narração)</span>
              </label>
            </div>
          </div>

          {/* Resultado Concluído */}
          {editedResultUrl && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Vídeo recortado e salvo com sucesso! A cena foi atualizada.</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Concluir / Fechar
            </button>
            <button
              onClick={handleProcessVideo}
              disabled={isProcessing}
              className="bg-gradient-to-r from-indigo-600 to-pink-600 hover:opacity-90 disabled:opacity-50 text-white text-xs font-extrabold px-6 py-3 rounded-xl shadow-lg flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processando Corte (FFmpeg)...</span>
                </>
              ) : (
                <>
                  <Scissors className="w-4 h-4" />
                  <span>Recortar & Aplicar na Cena</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
