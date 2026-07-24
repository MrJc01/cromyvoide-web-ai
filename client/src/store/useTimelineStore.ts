import { create } from 'zustand';

export type ClipType = 'text' | 'video' | 'image' | 'audio';

export interface TimelineClip {
  id: string;
  trackId: string;
  name: string;
  startTime: number; // Em segundos
  duration: number;  // Em segundos
  type: ClipType;
  mediaUrl?: string;
  text?: string;
  color: string;
  volume?: number;
  x?: number; // Posição offset X em pixels
  y?: number; // Posição offset Y em pixels
  scale?: number; // Escala (ex: 1.0 = 100%, 1.2 = 120%)
  aspectRatio?: string;
  objectFit?: 'contain' | 'cover';
  layoutMode?: 'full' | 'split-horizontal' | 'split-vertical';
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: ClipType;
  isLocked: boolean;
  isHidden: boolean;
  isMuted: boolean;
  color: string;
}

interface TimelineState {
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  zoom: number; // Escala: pixels por segundo (ex: 20px/s)
  selectedClipId: string | null;
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:5';

  // Histórico
  history: TimelineClip[][];
  historyIndex: number;

  // Ações Principais
  setCurrentTime: (time: number | ((prev: number) => number)) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (isPlaying: boolean | ((prev: boolean) => boolean)) => void;
  setZoom: (zoom: number) => void;
  setSelectedClipId: (clipId: string | null) => void;
  setAspectRatio: (ratio: '16:9' | '9:16' | '1:1' | '4:5') => void;

  // Gerenciamento de Clipes
  addClip: (clip: Omit<TimelineClip, 'id'>) => string;
  updateClip: (id: string, updates: Partial<TimelineClip>) => void;
  deleteClip: (id: string) => void;
  moveClip: (id: string, newStartTime: number, newTrackId?: string) => void;
  trimClip: (id: string, newStartTime: number, newDuration: number) => void;
  splitClipAtPlayhead: () => void;
  clearTimeline: () => void;

  // Controles de Trilha
  addTrack: (type: 'video' | 'audio', name?: string) => string;
  deleteTrack: (trackId: string) => void;
  toggleTrackLock: (trackId: string) => void;
  toggleTrackHide: (trackId: string) => void;
  toggleTrackMute: (trackId: string) => void;

  // Desfazer / Refazer
  undo: () => void;
  redo: () => void;
}

const DEFAULT_TRACKS: TimelineTrack[] = [
  { id: 'video-track', name: '🎬 Trilha de Vídeo (Imagens, Legendas & Clipes)', type: 'video', isLocked: false, isHidden: false, isMuted: false, color: '#ec4899' },
  { id: 'audio-track', name: '🎵 Trilha de Áudio (Voz TTS & Músicas)', type: 'audio', isLocked: false, isHidden: false, isMuted: false, color: '#f59e0b' }
];

const INITIAL_CLIPS: TimelineClip[] = [
  {
    id: 'demo-bg-1',
    trackId: 'video-track',
    name: 'Fundo Studio Neon',
    startTime: 0,
    duration: 10,
    type: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
    color: '#10b981'
  },
  {
    id: 'demo-text-1',
    trackId: 'video-track',
    name: 'Título Inicial',
    startTime: 0.5,
    duration: 4,
    type: 'text',
    text: 'BEM-VINDO AO CROMYVOICE STUDIO PRO',
    color: '#3b82f6'
  }
];

export const useTimelineStore = create<TimelineState>((set, get) => ({
  tracks: DEFAULT_TRACKS,
  clips: INITIAL_CLIPS,
  currentTime: 0,
  duration: 30,
  isPlaying: false,
  zoom: 30, // 30px por segundo
  selectedClipId: 'demo-text-1',
  aspectRatio: '16:9',

  history: [INITIAL_CLIPS],
  historyIndex: 0,

  setCurrentTime: (time) => {
    const nextTime = typeof time === 'function' ? time(get().currentTime) : time;
    const boundedTime = Math.max(0, Math.min(get().duration, nextTime));
    set({ currentTime: boundedTime });
  },

  setDuration: (duration) => set({ duration: Math.max(5, duration) }),
  setIsPlaying: (isPlaying) => {
    const nextVal = typeof isPlaying === 'function' ? isPlaying(get().isPlaying) : isPlaying;
    set({ isPlaying: nextVal });
  },
  setZoom: (zoom) => set({ zoom: Math.max(10, Math.min(100, zoom)) }),
  setSelectedClipId: (clipId) => set({ selectedClipId: clipId }),
  setAspectRatio: (ratio) => set({ aspectRatio: ratio }),

  saveHistoryState: () => {
    const { history, historyIndex, clips } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(clips)));
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1
    });
  },

  addClip: (clipData) => {
    const id = 'clip-' + Math.random().toString(36).substring(2, 9);
    const newClip: TimelineClip = {
      ...clipData,
      id
    };
    const newClips = [...get().clips, newClip];
    
    // Atualiza duração total se necessário
    const maxClipEnd = Math.max(...newClips.map(c => c.startTime + c.duration), get().duration);
    
    set((state) => ({
      clips: newClips,
      selectedClipId: id,
      duration: Math.max(state.duration, maxClipEnd + 5)
    }));

    // Registra histórico
    const { history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newClips)));
    set({ history: newHistory, historyIndex: newHistory.length - 1 });

    return id;
  },

  updateClip: (id, updates) => {
    const newClips = get().clips.map(c => c.id === id ? { ...c, ...updates } : c);
    set({ clips: newClips });
  },

  deleteClip: (id) => {
    const newClips = get().clips.filter(c => c.id !== id);
    set({
      clips: newClips,
      selectedClipId: get().selectedClipId === id ? null : get().selectedClipId
    });
  },

  moveClip: (id, newStartTime, newTrackId) => {
    const startTime = Math.max(0, newStartTime);
    const newClips = get().clips.map(c => {
      if (c.id === id) {
        return {
          ...c,
          startTime,
          trackId: newTrackId || c.trackId
        };
      }
      return c;
    });
    set({ clips: newClips });
  },

  trimClip: (id, newStartTime, newDuration) => {
    const newClips = get().clips.map(c => {
      if (c.id === id) {
        const startTime = newStartTime !== undefined && !isNaN(newStartTime) ? Math.max(0, newStartTime) : c.startTime;
        const duration = Math.max(0.5, newDuration);
        return { ...c, startTime, duration };
      }
      return c;
    });
    set({ clips: newClips });
  },

  splitClipAtPlayhead: () => {
    const { clips, currentTime, selectedClipId } = get();
    
    // Encontra clipe selecionado ou o primeiro clipe no playhead
    const targetClip = clips.find(c => 
      (selectedClipId ? c.id === selectedClipId : true) &&
      currentTime > c.startTime && 
      currentTime < (c.startTime + c.duration)
    );

    if (!targetClip) return;

    const firstDuration = currentTime - targetClip.startTime;
    const secondDuration = targetClip.duration - firstDuration;

    if (firstDuration < 0.3 || secondDuration < 0.3) return;

    const firstClip: TimelineClip = {
      ...targetClip,
      duration: firstDuration
    };

    const secondClip: TimelineClip = {
      ...targetClip,
      id: 'clip-' + Math.random().toString(36).substring(2, 9),
      startTime: currentTime,
      duration: secondDuration,
      name: `${targetClip.name} (Parte 2)`
    };

    const newClips = clips.flatMap(c => c.id === targetClip.id ? [firstClip, secondClip] : [c]);

    set({
      clips: newClips,
      selectedClipId: secondClip.id
    });
  },

  clearTimeline: () => set({ clips: [], selectedClipId: null }),

  addTrack: (type, name) => {
    const tracks = get().tracks;
    const countOfType = tracks.filter(t => t.type === type).length + 1;
    const trackId = `${type}-track-${Date.now()}`;
    const defaultName = type === 'video'
      ? `🎬 Trilha de Vídeo ${countOfType}`
      : `🎵 Trilha de Áudio ${countOfType}`;
    const newTrack: TimelineTrack = {
      id: trackId,
      name: name || defaultName,
      type: type === 'video' ? 'video' : 'audio',
      isLocked: false,
      isHidden: false,
      isMuted: false,
      color: type === 'video' ? '#ec4899' : '#f59e0b'
    };

    // Mantém Vídeos no topo e Áudios na base
    const videoTracks = tracks.filter(t => t.type === 'video');
    const audioTracks = tracks.filter(t => t.type !== 'video');

    let updatedTracks: TimelineTrack[];
    if (type === 'video') {
      updatedTracks = [...videoTracks, newTrack, ...audioTracks];
    } else {
      updatedTracks = [...videoTracks, ...audioTracks, newTrack];
    }

    set({ tracks: updatedTracks });
    return trackId;
  },

  deleteTrack: (trackId) => {
    const tracks = get().tracks;
    if (tracks.length <= 1) {
      alert('Você deve manter pelo menos uma trilha no projeto.');
      return;
    }
    set({
      tracks: tracks.filter(t => t.id !== trackId),
      clips: get().clips.filter(c => c.trackId !== trackId)
    });
  },

  toggleTrackLock: (trackId) => set((state) => ({
    tracks: state.tracks.map(t => t.id === trackId ? { ...t, isLocked: !t.isLocked } : t)
  })),

  toggleTrackHide: (trackId) => set((state) => ({
    tracks: state.tracks.map(t => t.id === trackId ? { ...t, isHidden: !t.isHidden } : t)
  })),

  toggleTrackMute: (trackId) => set((state) => ({
    tracks: state.tracks.map(t => t.id === trackId ? { ...t, isMuted: !t.isMuted } : t)
  })),

  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      set({
        clips: JSON.parse(JSON.stringify(history[prevIndex])),
        historyIndex: prevIndex
      });
    }
  },

  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      set({
        clips: JSON.parse(JSON.stringify(history[nextIndex])),
        historyIndex: nextIndex
      });
    }
  }
}));
