import React, { useState, useEffect } from 'react';
import { useScriptStore } from '../../store/useScriptStore';
import { useCromyVoiceStore } from '../../store/useCromyVoiceStore';
import { useMediaStore } from '../../store/useMediaStore';
import { api } from '../../services/api';
import {
  Sparkles,
  RefreshCw,
  FileText,
  Clock,
  Mic,
  Video,
  Layers,
  Image as ImageIcon,
  Sliders,
  Play,
  Film,
  Music,
  Combine,
  Wand2,
  Download,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Edit3,
  Check,
  Scissors
} from 'lucide-react';

interface ScriptGeneratorProps {
  onOpenSearchForScene: (sceneId: string) => void;
  onOpenVideoCreator: (
    sceneId: string,
    narrationText: string,
    bgUrl?: string,
    audioUrl?: string,
    audioId?: number,
    videoUrl?: string
  ) => void;
  onOpenMediaEditor?: (sceneId: string, videoUrl: string) => void;
}

export const ScriptGenerator: React.FC<ScriptGeneratorProps> = ({
  onOpenSearchForScene,
  onOpenVideoCreator,
  onOpenMediaEditor
}) => {
  const {
    currentScript,
    isGenerating,
    error,
    generateScript,
    createScriptFromRawText,
    updateSceneAudio,
    updateSceneVideo,
    addScene,
    deleteScene,
    moveSceneUp,
    moveSceneDown,
    updateSceneText
  } = useScriptStore();

  const {
    models,
    profiles,
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
    concatAudiosAndGenerateVideo,
    compositeVideoUrl
  } = useCromyVoiceStore();

  const { groups, fetchGroups } = useMediaStore();

  const [rawText, setRawText] = useState('');
  const [tone, setTone] = useState('Dinâmico e Envolvente (Podcast)');
  const [selectedGroups, setSelectedGroups] = useState<string[]>(['all']);
  const [requireMinMatch, setRequireMinMatch] = useState(true);

  const [activeLoadingSceneId, setActiveLoadingSceneId] = useState<string | null>(null);
  const [isConcatLoading, setIsConcatLoading] = useState(false);

  // Estados de edição de texto da cena
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  // Estado de adição manual de cena
  const [isAddingScene, setIsAddingScene] = useState(false);
  const [newSceneText, setNewSceneText] = useState('');

  useEffect(() => {
    fetchModelsAndProfiles();
    fetchGroups();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) return;
    await generateScript(rawText, tone, selectedGroups, requireMinMatch, 0.35);
  };

  const handleToggleGroup = (groupId: string) => {
    if (groupId === 'all') {
      setSelectedGroups(['all']);
      return;
    }

    let next = selectedGroups.filter((g) => g !== 'all');
    if (next.includes(groupId)) {
      next = next.filter((g) => g !== groupId);
    } else {
      next.push(groupId);
    }

    if (next.length === 0) next = ['all'];
    setSelectedGroups(next);
  };

  // Gerar Áudio TTS da Cena
  const handleGenerateSceneAudio = async (sceneId: string, narrationText: string) => {
    if (!currentScript) return;
    setActiveLoadingSceneId(sceneId);
    try {
      const audioRes = await synthesizeAudio(narrationText, selectedModel, selectedProfileId);
      if (audioRes) {
        updateSceneAudio(currentScript.id, sceneId, audioRes.id, audioRes.url);
      }
    } catch (err) {
      console.error('Erro ao gerar áudio da cena:', err);
    } finally {
      setActiveLoadingSceneId(null);
    }
  };

  // Juntar Todos os Cards em 1 Vídeo Mestre Final
  const handleConcatAllCards = async () => {
    const scenes = currentScript?.scenes || [];
    if (!currentScript || scenes.length === 0) return;
    setIsConcatLoading(true);
    try {
      // Prioridade 1: Concatenar os vídeos FINAIS compostos (com overlay + fundo)
      const finalVideoUrls: string[] = [];
      for (const scene of scenes) {
        if (scene.generatedVideoUrl) {
          finalVideoUrls.push(scene.generatedVideoUrl);
        }
      }

      if (finalVideoUrls.length === scenes.length && finalVideoUrls.length > 0) {
        // Todas as cenas têm vídeo final → concatenar diretamente os vídeos compostos
        const result = await api.concatFinalVideos(finalVideoUrls);
        if (result?.outputUrl) {
          useCromyVoiceStore.setState({ compositeVideoUrl: result.outputUrl });
        }
      } else {
        // Fallback: gerar áudios faltantes e criar vídeo via CromyVoice
        const audioUrls: string[] = [];
        const narrationTexts: string[] = [];

        for (const scene of scenes) {
          if (scene.narrationText) narrationTexts.push(scene.narrationText);
          if (scene.generatedAudioUrl) {
            audioUrls.push(scene.generatedAudioUrl);
          } else {
            const audioRes = await synthesizeAudio(scene.narrationText, selectedModel, selectedProfileId);
            if (audioRes?.url) {
              audioUrls.push(audioRes.url);
              updateSceneAudio(currentScript.id, scene.id, audioRes.id, audioRes.url);
            }
          }
        }

        if (audioUrls.length > 0) {
          const fullText = narrationTexts.join(' ');
          await concatAudiosAndGenerateVideo(audioUrls, fullText, subtitleStyle);
        }
      }
    } catch (err) {
      console.error('Erro ao concatenar todos os cards:', err);
    } finally {
      setIsConcatLoading(false);
    }
  };

  // Salvar Edição Manual do Texto da Cena
  const handleSaveSceneText = (sceneId: string) => {
    if (currentScript && editingText.trim()) {
      updateSceneText(currentScript.id, sceneId, editingText);
      setEditingSceneId(null);
    }
  };

  // Confirmar Adição Manual de Nova Cena
  const handleCreateNewSceneSubmit = () => {
    if (currentScript && newSceneText.trim()) {
      addScene(currentScript.id, newSceneText);
      setNewSceneText('');
      setIsAddingScene(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Script Generator Form Card */}
      <div className="glass-card p-6 md:p-8 rounded-3xl border border-indigo-500/20 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              Gerador de Roteiro de Vídeo AI (OpenRouter)
            </h2>
            <p className="text-xs text-slate-400">
              Cole as informações brutas ou uma notícia. Nossa IA gera o roteiro dividido em cenas com falas narradas e faz a pesquisa vetorial imediata por imagens da galeria.
            </p>
          </div>
        </div>

        <form onSubmit={handleGenerate} className="space-y-6">
          <div>
            <label className="text-xs font-bold text-slate-300 mb-2 flex items-center justify-between">
              <span>Cole as Informações ou Matéria do Vídeo:</span>
              <span className="text-[10px] text-slate-400 font-mono">{rawText.length} caracteres</span>
            </label>
            <textarea
              rows={5}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Cole aqui o texto da notícia ou conteúdo a ser transformado em roteiro..."
              className="glass-input w-full p-4 rounded-2xl text-xs leading-relaxed"
            />
          </div>

          {/* Configurações Globais de Voz, Perfil Salvo e Legendas */}
          <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 space-y-4">
            <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              Configurações de Voz ONNX, Perfis Salvos & Presets CromyVoice:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 mb-1.5 block">
                  Perfil Salvo (profile_id):
                </label>
                <select
                  value={selectedProfileId || ''}
                  onChange={(e) => setSelectedProfileId(e.target.value ? Number(e.target.value) : undefined)}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                >
                  <option value="" className="bg-slate-900">Nenhum (Direto)</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                      Preset {p.id}: {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 mb-1.5 block">
                  Voz Narrador (Piper ONNX):
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                >
                  {models.map((m) => (
                    <option key={m} value={m} className="bg-slate-900 text-white">
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 mb-1.5 block">
                  Filtro / Preset Legenda:
                </label>
                <select
                  value={subtitleStyle}
                  onChange={(e) => setSubtitleStyle(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                >
                  <option value="j-vid" className="bg-slate-900">j-vid (Padrão J-Vid)</option>
                  <option value="neon" className="bg-slate-900">neon (Glow & Brilho)</option>
                  <option value="minimal" className="bg-slate-900">minimal (Bold Minimal)</option>
                  <option value="box" className="bg-slate-900">box (Caixa Marcador)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 mb-1.5 block">
                  Posição no Vídeo:
                </label>
                <select
                  value={subtitlePosition}
                  onChange={(e) => setSubtitlePosition(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                >
                  <option value="center" className="bg-slate-900">center (Centralizado)</option>
                  <option value="bottom" className="bg-slate-900">bottom (Rodapé)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 mb-1.5 block">
                  Formato (Aspect Ratio):
                </label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                >
                  <option value="1:1" className="bg-slate-900">1:1 (Feed Quadrado)</option>
                  <option value="9:16" className="bg-slate-900">9:16 (Reels/TikTok)</option>
                  <option value="16:9" className="bg-slate-900">16:9 (YouTube Video)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-2 block">
                Tom do Roteiro:
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="glass-input w-full p-3 rounded-xl text-xs"
              >
                <option value="Dinâmico e Envolvente (Podcast)" className="bg-slate-900">Dinâmico e Envolvente (Podcast)</option>
                <option value="Informativo e Sério (Jornalístico)" className="bg-slate-900">Informativo e Sério (Jornalístico)</option>
                <option value="Persuasivo (Comercial / Vendas)" className="bg-slate-900">Persuasivo (Comercial / Vendas)</option>
                <option value="Didático e Explicativo" className="bg-slate-900">Didático e Explicativo</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-2 block">
                Filtro de Grupos da Mídia:
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleGroup('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedGroups.includes('all')
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Todos
                </button>
                {groups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleToggleGroup(g.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      selectedGroups.includes(g.id)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="requireMinMatch"
              checked={requireMinMatch}
              onChange={(e) => setRequireMinMatch(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="requireMinMatch" className="text-xs text-slate-300 cursor-pointer">
              Deixar cena sem mídia se não houver imagem relevante na galeria (Similaridade &lt; 35%)
            </label>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-pink-950/40 border border-pink-500/40 text-pink-300 text-xs">
              ⚠️ {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => createScriptFromRawText(rawText)}
              className="w-full sm:w-auto bg-indigo-900/60 hover:bg-indigo-800 text-white text-xs font-bold px-6 py-4 rounded-2xl border border-indigo-500/40 flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <FileText className="w-4 h-4 text-indigo-300" />
              <span>📝 Criar Cenas Direto (Sem IA)</span>
            </button>

            <button
              type="submit"
              disabled={isGenerating || !rawText.trim()}
              className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 via-pink-600 to-indigo-600 hover:opacity-95 text-white text-xs font-extrabold px-8 py-4 rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Gerando Roteiro & Analisando Mídias...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>✨ Gerar Roteiro via IA & Mídias</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Generated Script & Scenes Display */}
      {currentScript && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-4 rounded-xl border border-indigo-500/30">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                {currentScript.title}
              </h3>
              <p className="text-xs text-slate-400">
                Tom: {currentScript.targetTone || 'Padrão'} • {currentScript?.scenes?.length || 0} Cenas Geradas
              </p>
            </div>

            {/* Botão de Adicionar Nova Cena Manualmente */}
            <button
              onClick={() => setIsAddingScene(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow flex items-center gap-2 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Nova Cena Manualmente</span>
            </button>
          </div>

          {/* Form Modal/Card Inline para Inserir Nova Cena */}
          {isAddingScene && (
            <div className="glass-card p-5 rounded-2xl border border-indigo-500/50 bg-indigo-950/20 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                Adicionar Nova Cena ao Roteiro
              </h4>
              <textarea
                rows={3}
                value={newSceneText}
                onChange={(e) => setNewSceneText(e.target.value)}
                placeholder="Digite a fala / narração da nova cena..."
                className="glass-input w-full p-3 rounded-xl text-xs"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsAddingScene(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateNewSceneSubmit}
                  disabled={!newSceneText.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl shadow"
                >
                  Adicionar Cena
                </button>
              </div>
            </div>
          )}

          {/* Lista de Cards das Cenas com Reordenação, Edição e Exclusão */}
          <div className="space-y-4">
            {(currentScript?.scenes || []).map((scene, index) => {
              const currentMode = scene.mode || 'text';
              const isLoading = activeLoadingSceneId === scene.id;
              const isEditing = editingSceneId === scene.id;
              const isFirst = index === 0;
              const isLast = index === (currentScript.scenes.length - 1);

              return (
                <div
                  key={scene.id}
                  className={`glass-card rounded-2xl p-5 border transition-all flex flex-col md:flex-row gap-6 items-start justify-between ${
                    currentMode === 'video'
                      ? 'border-emerald-500/50 bg-emerald-950/10'
                      : currentMode === 'audio'
                      ? 'border-indigo-500/50 bg-indigo-950/10'
                      : 'border-slate-800 hover:border-indigo-500/40'
                  }`}
                >
                  {/* Scene Left Details */}
                  <div className="flex-1 space-y-3 w-full">
                    {/* Header do Card com Reordenação e Ações */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-indigo-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-lg">
                          Cena {scene.sceneNumber}
                        </span>

                        {/* Badge Indicador de Modo */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1 ${
                          currentMode === 'video'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : currentMode === 'audio'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {currentMode === 'video' ? <Film className="w-3 h-3" /> : currentMode === 'audio' ? <Music className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                          Modo {currentMode === 'video' ? 'Vídeo MP4' : currentMode === 'audio' ? 'Áudio TTS' : 'Texto'}
                        </span>

                        <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-slate-500" /> ~{scene.estimatedDurationSeconds}s
                        </span>
                      </div>

                      {/* Botões de Ação Manual: Subir, Descer e Excluir Cena */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveSceneUp(currentScript.id, scene.id)}
                          disabled={isFirst}
                          title="Mover cena para cima"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => moveSceneDown(currentScript.id, scene.id)}
                          disabled={isLast}
                          title="Mover cena para baixo"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteScene(currentScript.id, scene.id)}
                          title="Excluir cena"
                          className="p-1.5 rounded-lg text-pink-400 hover:text-pink-300 hover:bg-pink-950/40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Fala Narrada com Modo de Edição Inline */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Fala Narrada (TTS):
                        </h4>
                        {!isEditing ? (
                          <button
                            onClick={() => {
                              setEditingSceneId(scene.id);
                              setEditingText(scene.narrationText);
                            }}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                          >
                            <Edit3 className="w-3 h-3" /> Editar Fala
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSaveSceneText(scene.id)}
                            className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold"
                          >
                            <Check className="w-3 h-3" /> Salvar Fala
                          </button>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            rows={3}
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="glass-input w-full p-3 rounded-xl text-xs leading-relaxed"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingSceneId(null)}
                              className="text-xs text-slate-400 hover:text-white px-2 py-1"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleSaveSceneText(scene.id)}
                              className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-lg"
                            >
                              Salvar Alteração
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm font-semibold text-slate-100 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                          "{scene.narrationText}"
                        </p>
                      )}
                    </div>

                    {/* MODO ÁUDIO ATIVO: Exibe player de áudio */}
                    {scene.generatedAudioUrl && (
                      <div className="glass-card p-3 rounded-xl border border-indigo-500/30 space-y-1">
                        <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-1">
                          <Music className="w-3 h-3" /> Player de Áudio Sintetizado:
                        </span>
                        <audio src={scene.generatedAudioUrl} controls className="w-full h-8" />
                      </div>
                    )}

                    {/* MODO VÍDEO ATIVO: Exibe preview do vídeo legendado */}
                    {scene.generatedVideoUrl && (
                      <div className="glass-card p-3 rounded-xl border border-emerald-500/30 space-y-1">
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                          <Film className="w-3 h-3" /> Preview do Vídeo Legendado (API CromyVoice):
                        </span>
                        <div className="aspect-video bg-black rounded-lg overflow-hidden border border-slate-800 max-w-sm">
                          <video src={scene.generatedVideoUrl} controls className="w-full h-full" />
                        </div>
                      </div>
                    )}

                    <div className="text-[11px] text-slate-400 italic">
                      Prompt de Busca IA para Mídia: "{scene.visualDescription}"
                    </div>
                  </div>

                  {/* Scene Right Media & Controls */}
                  <div className="w-full md:w-64 space-y-3 shrink-0">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Mídia Selecionada:
                    </h4>

                    {scene.selectedMediaUrl ? (
                      <div className="glass-card rounded-xl overflow-hidden border border-indigo-500/40 relative group">
                        <div className="aspect-video bg-slate-950">
                          {scene.selectedMediaUrl.match(/\.(mp4|webm|mov)$/i) || scene.selectedMediaUrl.includes('trimmed') ? (
                            <video src={scene.selectedMediaUrl} controls className="w-full h-full object-cover" />
                          ) : (
                            <img src={scene.selectedMediaUrl} alt="Mídia da cena" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="grid grid-cols-2 divide-x divide-slate-800 border-t border-slate-800">
                          <button
                            onClick={() => onOpenSearchForScene(scene.id)}
                            className="py-1.5 bg-slate-900/90 text-indigo-300 hover:text-white text-[10px] font-semibold flex items-center justify-center gap-1"
                          >
                            <ImageIcon className="w-3 h-3" /> Alterar
                          </button>
                          <button
                            onClick={() => onOpenMediaEditor?.(scene.id, scene.selectedMediaUrl!)}
                            className="py-1.5 bg-pink-950/40 text-pink-300 hover:text-white text-[10px] font-bold flex items-center justify-center gap-1"
                          >
                            <Scissors className="w-3 h-3" /> Recortar / Mutar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-slate-800 rounded-xl p-4 text-center space-y-2 bg-slate-950/40">
                        <Video className="w-6 h-6 text-slate-600 mx-auto" />
                        <p className="text-[11px] text-slate-400 font-medium">Nenhuma mídia associada</p>
                        <button
                          onClick={() => onOpenSearchForScene(scene.id)}
                          className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold px-3 py-1.5 rounded-lg border border-indigo-500/30 flex items-center justify-center gap-1 mx-auto"
                        >
                          <Sparkles className="w-3 h-3" /> Buscar com IA
                        </button>
                      </div>
                    )}

                    {/* Botões Dinâmicos por Modo */}
                    {currentMode === 'text' && (
                      <button
                        onClick={() => handleGenerateSceneAudio(scene.id, scene.narrationText)}
                        disabled={isLoading}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20"
                      >
                        <Mic className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        {isLoading ? 'Sintetizando Áudio...' : '🎙️ Gerar Áudio da Cena'}
                      </button>
                    )}

                    {currentMode === 'audio' && (
                      <button
                        onClick={() => onOpenVideoCreator(
                          scene.id,
                          scene.narrationText,
                          scene.selectedMediaUrl,
                          scene.generatedAudioUrl,
                          scene.generatedAudioId,
                          scene.generatedVideoUrl
                        )}
                        className="w-full bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-pink-600/20"
                      >
                        <Video className="w-3.5 h-3.5" />
                        🎬 Gerar Vídeo & Posicionar
                      </button>
                    )}

                    {currentMode === 'video' && (
                      <button
                        onClick={() => onOpenVideoCreator(
                          scene.id,
                          scene.narrationText,
                          scene.selectedMediaUrl,
                          scene.generatedAudioUrl,
                          scene.generatedAudioId,
                          scene.generatedVideoUrl
                        )}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        ✨ Ajustar Posição / Overlay
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* BOTÃO FINAL NO RODAPÉ: JUNTAR TODOS OS CARDS EM 1 VÍDEO MESTRE COMPLETO */}
          <div className="glass-card p-8 rounded-2xl border border-indigo-500/40 text-center space-y-4 shadow-2xl bg-gradient-to-b from-slate-900/80 to-indigo-950/40 mt-8">
            <div className="w-14 h-14 bg-indigo-600/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto border border-indigo-500/40 shadow-lg">
              <Combine className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Renderização Final Completa do Roteiro</h3>
              <p className="text-xs text-slate-400 max-w-lg mx-auto mt-1">
                Clique no botão abaixo para juntar a narração e mídias de todos os cards em um único vídeo final concatenado e pronto para uso!
              </p>
            </div>

            <button
              onClick={handleConcatAllCards}
              disabled={isConcatLoading}
              className="bg-gradient-to-r from-emerald-500 via-indigo-600 to-pink-600 hover:opacity-90 disabled:opacity-50 text-white font-extrabold px-8 py-4 rounded-2xl shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-3 mx-auto text-sm transition-all"
            >
              {isConcatLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Concatenando Áudios & Gerando Vídeo Mestre...</span>
                </>
              ) : (
                <>
                  <Film className="w-5 h-5" />
                  <span>🎬 RENDERIZAR VÍDEO COMPLETO DO ROTEIRO (Juntar Todos os Cards em 1)</span>
                </>
              )}
            </button>

            {compositeVideoUrl && (
              <div className="pt-4 border-t border-slate-800 max-w-lg mx-auto space-y-3">
                <span className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4" /> Vídeo Mestre Completo Renderizado!
                </span>
                <video src={compositeVideoUrl} controls className="w-full aspect-video rounded-xl border border-slate-800" />
                <a
                  href={compositeVideoUrl}
                  download
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow"
                >
                  <Download className="w-4 h-4" /> Baixar Vídeo Mestre MP4
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
