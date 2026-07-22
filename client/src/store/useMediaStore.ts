import { create } from 'zustand';
import { MediaItem, MediaGroup, SearchResult } from '../types/media';
import { api } from '../services/api';

interface MediaState {
  mediaList: MediaItem[];
  groups: MediaGroup[];
  selectedGroupId: string;
  selectedGroupIdsForSearch: string[]; // ['all'] ou array de IDs
  searchResults: SearchResult[];
  searchEmbeddingInfo: { dimensions?: number[]; sample?: number[] } | null;
  isLoading: boolean;
  isUploading: boolean;
  isSearching: boolean;
  error: string | null;

  fetchMedia: (groupId?: string) => Promise<void>;
  fetchGroups: () => Promise<void>;
  setSelectedGroup: (groupId: string) => void;
  toggleSearchGroupFilter: (groupId: string) => void;
  uploadFile: (files: File[] | FileList | File, groupId?: string, description?: string) => Promise<MediaItem[] | void>;
  deleteMediaItem: (id: string) => Promise<void>;
  updateMediaItemGroup: (id: string, groupId: string) => Promise<void>;
  createGroupItem: (name: string, description?: string, color?: string) => Promise<void>;
  deleteGroupItem: (id: string) => Promise<void>;
  performSemanticSearch: (query: string) => Promise<void>;
  clearSearch: () => void;
}

export const useMediaStore = create<MediaState>((set, get) => ({
  mediaList: [],
  groups: [],
  selectedGroupId: 'all',
  selectedGroupIdsForSearch: ['all'],
  searchResults: [],
  searchEmbeddingInfo: null,
  isLoading: false,
  isUploading: false,
  isSearching: false,
  error: null,

  fetchMedia: async (groupId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.getMedia(groupId);
      set({ mediaList: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Erro ao carregar mídias.', isLoading: false });
    }
  },

  fetchGroups: async () => {
    try {
      const groups = await api.getGroups();
      set({ groups });
    } catch (err: any) {
      console.error('Erro ao buscar grupos:', err);
    }
  },

  setSelectedGroup: (groupId) => {
    set({ selectedGroupId: groupId });
    get().fetchMedia(groupId === 'all' ? undefined : groupId);
  },

  toggleSearchGroupFilter: (groupId) => {
    const current = get().selectedGroupIdsForSearch;
    if (groupId === 'all') {
      set({ selectedGroupIdsForSearch: ['all'] });
      return;
    }

    let updated = current.filter(g => g !== 'all');
    if (updated.includes(groupId)) {
      updated = updated.filter(g => g !== groupId);
    } else {
      updated.push(groupId);
    }

    if (updated.length === 0) updated = ['all'];
    set({ selectedGroupIdsForSearch: updated });
  },

  uploadFile: async (files, groupId, description) => {
    set({ isUploading: true, error: null });
    try {
      const targetGroup = groupId || get().selectedGroupId || 'default';
      const res = await api.uploadMedia(files, targetGroup === 'all' ? 'default' : targetGroup, description);
      set({ isUploading: false });
      await get().fetchMedia(get().selectedGroupId === 'all' ? undefined : get().selectedGroupId);
      return res.mediaList;
    } catch (err: any) {
      set({ error: err.message || 'Erro no upload de mídias em lote.', isUploading: false });
    }
  },

  deleteMediaItem: async (id) => {
    try {
      await api.deleteMedia(id);
      set({ mediaList: get().mediaList.filter(m => m.id !== id) });
    } catch (err: any) {
      console.error('Erro ao deletar mídia:', err);
    }
  },

  updateMediaItemGroup: async (id, groupId) => {
    try {
      await api.updateMedia(id, groupId);
      const updatedList = get().mediaList.map(m => m.id === id ? { ...m, groupId } : m);
      set({ mediaList: updatedList });
      await get().fetchMedia(get().selectedGroupId === 'all' ? undefined : get().selectedGroupId);
    } catch (err: any) {
      console.error('Erro ao atualizar grupo da mídia:', err);
    }
  },

  createGroupItem: async (name, description, color) => {
    try {
      await api.createGroup(name, description, color);
      await get().fetchGroups();
    } catch (err: any) {
      console.error('Erro ao criar grupo:', err);
    }
  },

  deleteGroupItem: async (id) => {
    try {
      await api.deleteGroup(id);
      await get().fetchGroups();
      await get().fetchMedia(get().selectedGroupId === 'all' ? undefined : get().selectedGroupId);
    } catch (err: any) {
      console.error('Erro ao deletar grupo:', err);
    }
  },

  performSemanticSearch: async (query) => {
    set({ isSearching: true, error: null });
    try {
      const groupFilters = get().selectedGroupIdsForSearch;
      const data = await api.semanticSearch(query, groupFilters, 12);
      set({
        searchResults: data.results,
        searchEmbeddingInfo: {
          dimensions: [512],
          sample: [512]
        },
        isSearching: false
      });
    } catch (err: any) {
      set({ error: err.message || 'Erro na pesquisa por embedding.', isSearching: false });
    }
  },

  clearSearch: () => set({ searchResults: [], searchEmbeddingInfo: null })
}));
