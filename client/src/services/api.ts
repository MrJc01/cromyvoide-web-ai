import axios from 'axios';
import { MediaItem, MediaGroup, SearchResult } from '../types/media';
import { GeneratedScript } from '../types/script';

const API_BASE = '/api';

export interface TTSResponse {
  id: number;
  success: boolean;
  status: string;
  filename: string;
  url: string;
  text: string;
  engine: string;
}

export interface VideoResponse {
  id: number;
  success: boolean;
  status: string;
  filename: string;
  url: string;
}

export interface VideoProfilesResponse {
  system_presets: { id: number; name: string; is_system: boolean; settings?: any }[];
  user_profiles: { id: number; user_id: number; name: string; engine: string; settings?: any }[];
}

export const api = {
  // MEDIA & EMBEDDINGS
  uploadMedia: async (fileOrFiles: File[] | FileList | File, groupId?: string, description?: string) => {
    const formData = new FormData();
    if (fileOrFiles instanceof FileList || Array.isArray(fileOrFiles)) {
      Array.from(fileOrFiles).forEach(f => formData.append('files', f));
    } else {
      formData.append('file', fileOrFiles);
    }
    if (groupId) formData.append('groupId', groupId);
    if (description) formData.append('customDescription', description);

    const res = await axios.post(`${API_BASE}/media/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  getMedia: async (groupId?: string): Promise<MediaItem[]> => {
    const res = await axios.get(`${API_BASE}/media`, {
      params: { groupId }
    });
    return res.data;
  },

  deleteMedia: async (id: string) => {
    const res = await axios.delete(`${API_BASE}/media/${id}`);
    return res.data;
  },

  updateMedia: async (id: string, groupId?: string, description?: string): Promise<{ media: MediaItem }> => {
    const res = await axios.patch(`${API_BASE}/media/${id}`, { groupId, description });
    return res.data;
  },

  getGroups: async (): Promise<MediaGroup[]> => {
    const res = await axios.get(`${API_BASE}/media/groups`);
    return res.data;
  },

  createGroup: async (name: string, description?: string, color?: string): Promise<MediaGroup> => {
    const res = await axios.post(`${API_BASE}/media/groups`, { name, description, color });
    return res.data;
  },

  deleteGroup: async (id: string) => {
    const res = await axios.delete(`${API_BASE}/media/groups/${id}`);
    return res.data;
  },

  semanticSearch: async (
    query: string,
    groupIds: string[] = ['all'],
    limit: number = 20
  ): Promise<{ query: string; results: SearchResult[] }> => {
    const res = await axios.post(`${API_BASE}/media/search`, { query, groupIds, limit });
    return res.data;
  },

  // SCRIPTS
  generateScript: async (
    rawInformation: string,
    tone?: string,
    groupIds?: string[],
    requireMinSimilarityThreshold?: boolean,
    minSimilarityScore?: number
  ): Promise<GeneratedScript> => {
    const res = await axios.post(`${API_BASE}/script/generate`, {
      rawInformation,
      tone,
      groupIds,
      requireMinSimilarityThreshold,
      minSimilarityScore
    });
    return res.data.script || res.data;
  },

  getScripts: async (): Promise<GeneratedScript[]> => {
    const res = await axios.get(`${API_BASE}/script`);
    return res.data;
  },

  updateSceneMedia: async (scriptId: string, sceneId: string, mediaId: string, mediaUrl: string) => {
    const res = await axios.patch(`${API_BASE}/script/${scriptId}/scene/${sceneId}`, {
      selectedMediaId: mediaId,
      selectedMediaUrl: mediaUrl
    });
    return res.data;
  },

  // CROMYVOICE
  generateAudio: async (
    text: string,
    model: string = 'pt_BR-faber-medium.onnx',
    sync: boolean = true,
    profile_id?: number
  ): Promise<TTSResponse> => {
    const res = await axios.post(`${API_BASE}/cromyvoice/generate`, {
      text,
      engine: 'piper',
      model,
      sync,
      profile_id
    });
    return res.data;
  },

  generateVideo: async (
    audio_id: number,
    subtitle_style: 'j-vid' | 'neon' | 'minimal' | 'box' | string = 'j-vid',
    position: 'center' | 'bottom' | string = 'center',
    aspect_ratio: '1:1' | '9:16' | '16:9' | string = '1:1',
    profile_id?: number
  ): Promise<VideoResponse> => {
    const res = await axios.post(`${API_BASE}/cromyvoice/video/generate`, {
      audio_id,
      subtitle_style,
      position,
      aspect_ratio,
      profile_id,
      sync: true
    });
    return res.data;
  },

  getAudios: async () => {
    const res = await axios.get(`${API_BASE}/cromyvoice/audios`);
    return res.data;
  },

  getVideos: async () => {
    const res = await axios.get(`${API_BASE}/cromyvoice/videos`);
    return res.data;
  },

  getModels: async () => {
    const res = await axios.get(`${API_BASE}/cromyvoice/models`);
    return res.data;
  },

  getProfiles: async () => {
    const res = await axios.get(`${API_BASE}/cromyvoice/profiles`);
    return res.data;
  },

  getVideoProfiles: async (): Promise<VideoProfilesResponse> => {
    const res = await axios.get(`${API_BASE}/cromyvoice/video/profiles`);
    return res.data;
  },

  // EDIT VIDEO MEDIA (Trim, Mute)
  editVideo: async (
    videoUrl: string,
    startTime: number = 0,
    duration: number = 5,
    muteAudio: boolean = true
  ): Promise<{ outputUrl: string; filename: string }> => {
    const res = await axios.post(`${API_BASE}/media/edit-video`, {
      videoUrl,
      startTime,
      duration,
      muteAudio
    });
    return res.data;
  },

  // RENDER COMPOSITE (FFmpeg)
  renderComposite: async (
    bgMediaPath?: string,
    cromyVoiceVideoUrl?: string,
    cromyVoiceAudioUrl?: string,
    durationSeconds?: number,
    overlayPosition: 'top-left' | 'top-center' | 'top-right' | 'middle-left' | 'center' | 'middle-right' | 'bottom-left' | 'bottom-center' | 'bottom-right' | 'full' = 'center',
    overlayScale: number = 0.7,
    bgColor: string = '#000000'
  ): Promise<{ outputUrl: string; filename: string }> => {
    const res = await axios.post(`${API_BASE}/render/composite`, {
      bgMediaPath,
      bgColor,
      cromyVoiceVideoUrl,
      cromyVoiceAudioUrl,
      durationSeconds,
      overlayPosition,
      overlayScale
    });
    return res.data;
  },

  concatAudiosAndGenerateVideo: async (
    audioUrls: string[],
    fullText?: string,
    subtitleStyle: string = 'j-vid'
  ): Promise<{
    masterAudioUrl: string;
    cromyAudioId: number;
    cromyVideoUrl: string;
    cromyVideoId: number;
  }> => {
    const res = await axios.post(`${API_BASE}/render/concat-audios`, {
      audioUrls,
      fullText,
      subtitleStyle
    });
    return res.data;
  },

  // CONCATENAR VÍDEOS FINAIS COMPOSTOS (com overlay + fundo)
  concatFinalVideos: async (
    videoUrls: string[]
  ): Promise<{ outputUrl: string; filename: string }> => {
    const res = await axios.post(`${API_BASE}/render/concat-videos`, { videoUrls });
    return res.data;
  }
};
