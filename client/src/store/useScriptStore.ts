import { create } from 'zustand';
import { GeneratedScript, ScriptScene } from '../types/script';
import { api } from '../services/api';

const generateUuid = () => 'scene-' + Math.random().toString(36).substring(2, 9);

interface ScriptState {
  scripts: GeneratedScript[];
  currentScript: GeneratedScript | null;
  isGenerating: boolean;
  error: string | null;

  fetchScripts: () => Promise<void>;
  generateScript: (
    rawInformation: string,
    tone?: string,
    groupIds?: string[],
    requireMinSimilarityThreshold?: boolean,
    minSimilarityScore?: number
  ) => Promise<GeneratedScript | void>;
  createScriptFromRawText: (rawText: string, title?: string) => void;
  setCurrentScript: (script: GeneratedScript | null) => void;

  // Modificações Manuais de Cena (Criar, Deletar, Reordenar, Editar)
  addScene: (scriptId: string, narrationText: string, visualDescription?: string) => void;
  deleteScene: (scriptId: string, sceneId: string) => void;
  moveSceneUp: (scriptId: string, sceneId: string) => void;
  moveSceneDown: (scriptId: string, sceneId: string) => void;
  updateSceneText: (scriptId: string, sceneId: string, narrationText: string, visualDescription?: string) => void;

  updateSceneMedia: (scriptId: string, sceneId: string, mediaId: string, mediaUrl: string) => Promise<void>;
  updateSceneAudio: (scriptId: string, sceneId: string, audioId: number, audioUrl: string) => void;
  updateSceneVideo: (scriptId: string, sceneId: string, videoId: number, videoUrl: string) => void;
}

export const useScriptStore = create<ScriptState>((set, get) => ({
  scripts: [],
  currentScript: null,
  isGenerating: false,
  error: null,

  fetchScripts: async () => {
    try {
      const data = await api.getScripts();
      set({ scripts: data });
      if (!get().currentScript && data.length > 0) {
        set({ currentScript: data[0] });
      }
    } catch (err: any) {
      console.error('Erro ao buscar roteiros:', err);
    }
  },

  generateScript: async (rawInformation, tone, groupIds, requireMinSimilarityThreshold, minSimilarityScore) => {
    set({ isGenerating: true, error: null });
    try {
      const res = await api.generateScript(rawInformation, tone, groupIds, requireMinSimilarityThreshold, minSimilarityScore);
      set({
        currentScript: res,
        scripts: [res, ...get().scripts],
        isGenerating: false
      });
      return res;
    } catch (err: any) {
      set({ error: err.message || 'Erro ao gerar roteiro via OpenRouter.', isGenerating: false });
    }
  },

  createScriptFromRawText: (rawText: string, title?: string) => {
    const textToUse = rawText && rawText.trim() ? rawText.trim() : 'Nova cena do roteiro. Digite a fala narrada aqui.';

    const paragraphs = textToUse
      .split(/\n\s*\n|\.\s+/)
      .map(p => p.trim())
      .filter(p => p.length > 2);

    const scenes: ScriptScene[] = (paragraphs.length > 0 ? paragraphs : [textToUse]).map((text, idx) => {
      const cleanText = text.endsWith('.') ? text : text + '.';
      return {
        id: generateUuid(),
        sceneNumber: idx + 1,
        narrationText: cleanText,
        visualPrompt: `Mídia para: ${cleanText.slice(0, 40)}`,
        visualDescription: `Mídia para: ${cleanText.slice(0, 40)}`,
        estimatedDurationSeconds: Math.max(3, Math.ceil(cleanText.split(' ').length / 3)),
        mode: 'text'
      };
    });

    const script: GeneratedScript = {
      id: generateUuid(),
      title: title || 'Roteiro Direto (Sem IA)',
      rawText: textToUse,
      targetTone: 'Direto (Sem IA)',
      scenes,
      createdAt: new Date().toISOString()
    };

    set({
      currentScript: script,
      scripts: [script, ...get().scripts],
      isGenerating: false
    });
  },

  setCurrentScript: (script) => set({ currentScript: script }),

  // Adicionar Nova Cena
  addScene: (scriptId, narrationText, visualDescription) => {
    let current = get().currentScript;
    if (!current) {
      current = {
        id: generateUuid(),
        title: 'Novo Roteiro Manual',
        rawText: narrationText || '',
        targetTone: 'Manual',
        scenes: [],
        createdAt: new Date().toISOString()
      };
    }
    const nextNum = (current.scenes?.length || 0) + 1;
    const textPrompt = visualDescription || 'Mídia visual da nova cena.';
    const newScene: ScriptScene = {
      id: generateUuid(),
      sceneNumber: nextNum,
      narrationText: narrationText || 'Nova cena inserida manualmente.',
      visualPrompt: textPrompt,
      visualDescription: textPrompt,
      estimatedDurationSeconds: Math.max(3, Math.ceil((narrationText || '').split(' ').length / 3)) || 5,
      mode: 'text'
    };
    const updatedScenes = [...(current.scenes || []), newScene];
    const updatedScript = { ...current, scenes: updatedScenes };
    set({
      currentScript: updatedScript,
      scripts: get().scripts.some(s => s.id === updatedScript.id)
        ? get().scripts.map(s => s.id === updatedScript.id ? updatedScript : s)
        : [updatedScript, ...get().scripts]
    });
  },

  // Deletar Cena
  deleteScene: (scriptId, sceneId) => {
    const current = get().currentScript;
    if (!current) return;
    const filteredScenes = (current.scenes || [])
      .filter(s => s.id !== sceneId)
      .map((s, idx) => ({ ...s, sceneNumber: idx + 1 }));
    set({ currentScript: { ...current, scenes: filteredScenes } });
  },

  // Mover Cena para Cima (Reordenar)
  moveSceneUp: (scriptId, sceneId) => {
    const current = get().currentScript;
    if (!current) return;
    const scenes = [...(current.scenes || [])];
    const idx = scenes.findIndex(s => s.id === sceneId);
    if (idx <= 0) return;
    const temp = scenes[idx];
    scenes[idx] = scenes[idx - 1];
    scenes[idx - 1] = temp;
    const reordered = scenes.map((s, i) => ({ ...s, sceneNumber: i + 1 }));
    set({ currentScript: { ...current, scenes: reordered } });
  },

  // Mover Cena para Baixo (Reordenar)
  moveSceneDown: (scriptId, sceneId) => {
    const current = get().currentScript;
    if (!current) return;
    const scenes = [...(current.scenes || [])];
    const idx = scenes.findIndex(s => s.id === sceneId);
    if (idx < 0 || idx >= scenes.length - 1) return;
    const temp = scenes[idx];
    scenes[idx] = scenes[idx + 1];
    scenes[idx + 1] = temp;
    const reordered = scenes.map((s, i) => ({ ...s, sceneNumber: i + 1 }));
    set({ currentScript: { ...current, scenes: reordered } });
  },

  // Editar Texto da Cena
  updateSceneText: (scriptId, sceneId, narrationText, visualDescription) => {
    const current = get().currentScript;
    if (!current) return;
    const updatedScenes = (current.scenes || []).map(s => s.id === sceneId ? {
      ...s,
      narrationText,
      ...(visualDescription !== undefined ? { visualDescription } : {})
    } : s);
    set({ currentScript: { ...current, scenes: updatedScenes } });
  },

  updateSceneMedia: async (scriptId, sceneId, mediaId, mediaUrl) => {
    try {
      await api.updateSceneMedia(scriptId, sceneId, mediaId, mediaUrl);
      const current = get().currentScript;
      if (current) {
        const updatedScenes = (current.scenes || []).map(s => s.id === sceneId ? { ...s, selectedMediaId: mediaId, selectedMediaUrl: mediaUrl } : s);
        set({ currentScript: { ...current, scenes: updatedScenes } });
      }
    } catch (err: any) {
      console.error('Erro ao atualizar mídia da cena:', err);
    }
  },

  updateSceneAudio: (scriptId, sceneId, audioId, audioUrl) => {
    const current = get().currentScript;
    if (current) {
      const updatedScenes = (current.scenes || []).map(s => s.id === sceneId ? {
        ...s,
        generatedAudioId: audioId,
        generatedAudioUrl: audioUrl,
        mode: 'audio' as const
      } : s);
      set({ currentScript: { ...current, scenes: updatedScenes } });
    }
  },

  updateSceneVideo: (scriptId, sceneId, videoId, videoUrl) => {
    const current = get().currentScript;
    if (current) {
      const updatedScenes = (current.scenes || []).map(s => s.id === sceneId ? {
        ...s,
        generatedVideoId: videoId,
        generatedVideoUrl: videoUrl,
        mode: 'video' as const
      } : s);
      set({ currentScript: { ...current, scenes: updatedScenes } });
    }
  }
}));
