import { create } from 'zustand';
import { api, TTSResponse, VideoResponse, VideoProfilesResponse } from '../services/api';

export interface VoiceProfile {
  id: number;
  user_id: number;
  name: string;
  engine: string;
  model: string;
  voice: string;
  settings: string;
  created_at: string;
}

interface CromyVoiceState {
  audios: TTSResponse[];
  videos: VideoResponse[];
  models: string[];
  profiles: VoiceProfile[];
  videoProfiles: VideoProfilesResponse | null;
  generatedAudio: TTSResponse | null;
  generatedVideo: VideoResponse | null;
  compositeVideoUrl: string | null;

  isSynthesizing: boolean;
  isGeneratingVideo: boolean;
  isComposing: boolean;

  selectedModel: string;
  selectedProfileId?: number;
  subtitleStyle: 'j-vid' | 'neon' | 'minimal' | 'box' | string;
  subtitlePosition: 'center' | 'bottom' | string;
  aspectRatio: '1:1' | '9:16' | '16:9' | string;
  error: string | null;

  fetchModelsAndProfiles: () => Promise<void>;
  setSelectedModel: (model: string) => void;
  setSelectedProfileId: (profileId?: number) => void;
  setSubtitleStyle: (style: 'j-vid' | 'neon' | 'minimal' | 'box' | string) => void;
  setSubtitlePosition: (pos: 'center' | 'bottom' | string) => void;
  setAspectRatio: (ratio: '1:1' | '9:16' | '16:9' | string) => void;
  synthesizeAudio: (text: string, model?: string, profileId?: number) => Promise<TTSResponse | void>;
  generateVideo: (
    audioId: number,
    style?: string,
    position?: string,
    aspectRatio?: string,
    profileId?: number
  ) => Promise<VideoResponse | void>;
  renderCompositeVideo: (
    bgMediaPath?: string,
    cromyVoiceVideoUrl?: string,
    cromyVoiceAudioUrl?: string,
    durationSeconds?: number,
    overlayPosition?: 'top-left' | 'top-center' | 'top-right' | 'middle-left' | 'center' | 'middle-right' | 'bottom-left' | 'bottom-center' | 'bottom-right' | 'full',
    overlayScale?: number,
    bgColor?: string,
    layoutMode?: 'overlay' | 'split-horizontal' | 'split-vertical' | 'full-bg',
    splitRatio?: number,
    objectFit?: 'contain' | 'cover',
    hideBackground?: boolean
  ) => Promise<string | void>;
  concatAudiosAndGenerateVideo: (audioUrls: string[], fullText?: string, subtitleStyle?: string) => Promise<string | void>;
}

export const useCromyVoiceStore = create<CromyVoiceState>((set, get) => ({
  audios: [],
  videos: [],
  models: [
    'pt_BR-faber-medium.onnx',
    'pt_BR-cadu-medium.onnx',
    'pt_BR-edresson-low.onnx',
    'pt_BR-jeff-medium.onnx'
  ],
  profiles: [],
  videoProfiles: null,
  generatedAudio: null,
  generatedVideo: null,
  compositeVideoUrl: null,

  isSynthesizing: false,
  isGeneratingVideo: false,
  isComposing: false,
  selectedModel: 'pt_BR-faber-medium.onnx',
  subtitleStyle: 'j-vid',
  subtitlePosition: 'center',
  aspectRatio: '1:1',
  error: null,

  fetchModelsAndProfiles: async () => {
    try {
      const modelsData = await api.getModels();
      const profilesData = await api.getProfiles();
      const videoProfilesData = await api.getVideoProfiles();

      if (modelsData.installed && modelsData.installed.length > 0) {
        set({ models: modelsData.installed, selectedModel: modelsData.installed[0] });
      }
      set({ profiles: profilesData, videoProfiles: videoProfilesData });
    } catch (err: any) {
      console.error('Erro ao carregar modelos e perfis da API CromyVoice:', err);
    }
  },

  setSelectedModel: (model) => set({ selectedModel: model }),
  setSelectedProfileId: (profileId) => set({ selectedProfileId: profileId }),
  setSubtitleStyle: (style) => set({ subtitleStyle: style }),
  setSubtitlePosition: (pos) => set({ subtitlePosition: pos }),
  setAspectRatio: (ratio) => set({ aspectRatio: ratio }),

  synthesizeAudio: async (text, model, profileId) => {
    set({ isSynthesizing: true, error: null });
    try {
      const activeModel = model || get().selectedModel;
      const activeProfileId = profileId ?? get().selectedProfileId;
      const res = await api.generateAudio(text, activeModel, true, activeProfileId);
      set({ generatedAudio: res, isSynthesizing: false });
      return res;
    } catch (err: any) {
      set({ error: err.message || 'Erro na síntese de áudio TTS.', isSynthesizing: false });
    }
  },

  generateVideo: async (audioId, style, position, aspectRatio, profileId) => {
    set({ isGeneratingVideo: true, error: null });
    try {
      const activeStyle = style || get().subtitleStyle;
      const activePos = position || get().subtitlePosition;
      const activeRatio = aspectRatio || get().aspectRatio;
      const activeProfileId = profileId ?? get().selectedProfileId;

      const res = await api.generateVideo(audioId, activeStyle, activePos, activeRatio, activeProfileId);
      set({ generatedVideo: res, isGeneratingVideo: false });
      return res;
    } catch (err: any) {
      set({ error: err.message || 'Erro ao gerar vídeo MP4 com legendas.', isGeneratingVideo: false });
    }
  },

  renderCompositeVideo: async (bgMediaPath, cromyVoiceVideoUrl, cromyVoiceAudioUrl, durationSeconds, overlayPosition = 'center', overlayScale = 0.7, bgColor = '#000000', layoutMode = 'overlay', splitRatio = 0.5, objectFit = 'contain', hideBackground = false) => {
    set({ isComposing: true, error: null });
    try {
      const res = await api.renderComposite(
        bgMediaPath,
        cromyVoiceVideoUrl,
        cromyVoiceAudioUrl,
        durationSeconds,
        overlayPosition,
        overlayScale,
        bgColor,
        layoutMode,
        splitRatio,
        objectFit,
        hideBackground
      );
      set({ isComposing: false });
      return res.outputUrl;
    } catch (err: any) {
      set({ error: err.message || 'Erro na composição do vídeo com sobreposição.', isComposing: false });
    }
  },

  concatAudiosAndGenerateVideo: async (audioUrls, fullText, subtitleStyle = 'j-vid') => {
    set({ isComposing: true, error: null });
    try {
      const res = await api.concatAudiosAndGenerateVideo(audioUrls, fullText, subtitleStyle);
      set({ compositeVideoUrl: res.cromyVideoUrl, isComposing: false });
      return res.cromyVideoUrl;
    } catch (err: any) {
      set({ error: err.message || 'Erro ao concatenar áudios e gerar vídeo mestre.', isComposing: false });
    }
  }
}));
