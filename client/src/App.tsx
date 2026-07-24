import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ScriptGenerator } from './components/script/ScriptGenerator';
import { AutoVideoGenerator } from './components/script/AutoVideoGenerator';
import { VideoEditorStudio } from './components/editor/VideoEditorStudio';
import { MediaGallery } from './components/media/MediaGallery';
import { SemanticSearchModal } from './components/media/SemanticSearchModal';
import { VideoCreatorModal } from './components/cromyvoice/VideoCreatorModal';
import { MediaEditorModal } from './components/media/MediaEditorModal';
import { ApiDocs } from './components/docs/ApiDocs';
import { SettingsPage } from './components/settings/SettingsPage';
import { useScriptStore } from './store/useScriptStore';
import { Cpu, Video } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('timeline-studio');
  const [serverConnected, setServerConnected] = useState<boolean>(true);

  // Modals state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingVideoUrl, setEditingVideoUrl] = useState('');
  const [editingMediaSceneId, setEditingMediaSceneId] = useState<string | null>(null);

  // Active scene selection state for modal actions
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [creatorText, setCreatorText] = useState<string>('');
  const [creatorBgUrl, setCreatorBgUrl] = useState<string>('');
  const [creatorAudioUrl, setCreatorAudioUrl] = useState<string>('');
  const [creatorAudioId, setCreatorAudioId] = useState<number | undefined>(undefined);
  const [creatorVideoUrl, setCreatorVideoUrl] = useState<string>('');

  const { updateSceneMedia, updateSceneVideo, currentScript } = useScriptStore();

  const handleVideoGeneratedForScene = (videoUrl: string, videoId: number = 1) => {
    if (activeSceneId && currentScript) {
      updateSceneVideo(currentScript.id, activeSceneId, videoId, videoUrl);
    }
  };

  useEffect(() => {
    axios.get('/api/health')
      .then(() => setServerConnected(true))
      .catch(() => setServerConnected(false));
  }, []);

  const handleOpenSearchForScene = (sceneId: string) => {
    setActiveSceneId(sceneId);
    setIsSearchOpen(true);
  };

  const handleSelectMediaForScene = (mediaUrl: string, mediaId: string) => {
    if (activeSceneId && currentScript) {
      updateSceneMedia(currentScript.id, activeSceneId, mediaId, mediaUrl);
    }
  };

  const handleOpenVideoCreator = (
    sceneId: string,
    narrationText: string,
    bgUrl?: string,
    audioUrl?: string,
    audioId?: number,
    videoUrl?: string
  ) => {
    setActiveSceneId(sceneId);
    setCreatorText(narrationText);
    setCreatorBgUrl(bgUrl || '');
    setCreatorAudioUrl(audioUrl || '');
    setCreatorAudioId(audioId);
    setCreatorVideoUrl(videoUrl || '');
    setIsCreatorOpen(true);
  };

  const handleOpenMediaEditor = (sceneId: string, videoUrl: string) => {
    setEditingMediaSceneId(sceneId);
    setEditingVideoUrl(videoUrl);
    setIsEditorOpen(true);
  };

  const handleSaveEditedVideoForScene = (newVideoUrl: string) => {
    if (editingMediaSceneId && currentScript) {
      updateSceneMedia(currentScript.id, editingMediaSceneId, 'edited-media', newVideoUrl);
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'timeline-studio': return 'Editor de Vídeo Studio Pro';
      case 'auto-generator': return 'Gerador Automático de Vídeo 1-Clique';
      case 'script': return 'Gerador de Roteiro AI';
      case 'media-library': return 'Biblioteca de Mídias & Grupos';
      case 'search-embedding': return 'Busca por Embeddings';
      case 'video-creator': return 'Estúdio de Vídeos Overlay';
      case 'settings': return 'Configurações Globais & Provedores IA';
      case 'api-docs': return 'Documentação API CromyVoice';
      default: return 'CromyVoice Studio';
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0b0f19] text-slate-100 font-sans">
      {/* Sidebar funcional */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header activeTabTitle={getTabTitle()} serverConnected={serverConnected} />

        <main className={`flex-1 min-h-0 ${activeTab === 'timeline-studio' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto pb-12'}`}>
          {activeTab === 'timeline-studio' && <VideoEditorStudio />}

          {activeTab === 'auto-generator' && <AutoVideoGenerator />}

          {activeTab === 'script' && (
            <ScriptGenerator
              onOpenSearchForScene={handleOpenSearchForScene}
              onOpenVideoCreator={handleOpenVideoCreator}
              onOpenMediaEditor={handleOpenMediaEditor}
            />
          )}

          {activeTab === 'media-library' && <MediaGallery />}

          {activeTab === 'search-embedding' && (
            <div className="p-6">
              <div className="glass-card p-8 text-center rounded-2xl space-y-4 max-w-xl mx-auto mt-8 border border-indigo-500/30">
                <div className="w-16 h-16 bg-indigo-600/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto border border-indigo-500/40">
                  <Cpu className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white">Pesquisa Vetorial de Mídias por IA</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Digite qualquer frase para converter em vetor de embedding e encontrar imagens da sua galeria ranqueadas por similaridade.
                </p>
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
                >
                  Abrir Pesquisador por Embedding (⌘K)
                </button>
              </div>
            </div>
          )}

          {activeTab === 'video-creator' && (
            <div className="p-6">
              <div className="glass-card p-8 text-center rounded-2xl space-y-4 max-w-xl mx-auto mt-8 border border-pink-500/30">
                <div className="w-16 h-16 bg-pink-600/20 text-pink-400 rounded-2xl flex items-center justify-center mx-auto border border-pink-500/40">
                  <Video className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white">Estúdio de Vídeos & Overlay CromyVoice</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Sintetize voz TTS, gere o vídeo legendado da API CromyVoice e renderize a sobreposição sobre imagens da sua biblioteca com posições e tamanho configuráveis.
                </p>
                <button
                  onClick={() => {
                    setCreatorText('Olá! Este é um vídeo de teste gerado pelo CromyVoice Studio.');
                    setIsCreatorOpen(true);
                  }}
                  className="bg-gradient-to-r from-pink-600 to-indigo-600 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg shadow-pink-600/30 transition-all"
                >
                  Abrir Gerador de Vídeos Overlay
                </button>
              </div>
            </div>
          )}

          {activeTab === 'settings' && <SettingsPage />}

          {activeTab === 'api-docs' && <ApiDocs />}
        </main>
      </div>

      {/* Global Modals */}
      <SemanticSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectMedia={handleSelectMediaForScene}
      />

      <VideoCreatorModal
        isOpen={isCreatorOpen}
        onClose={() => setIsCreatorOpen(false)}
        sceneId={activeSceneId || undefined}
        initialText={creatorText}
        initialBgMediaUrl={creatorBgUrl}
        initialAudioUrl={creatorAudioUrl}
        initialAudioId={creatorAudioId}
        initialVideoUrl={creatorVideoUrl}
        onVideoGenerated={handleVideoGeneratedForScene}
      />

      <MediaEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        videoUrl={editingVideoUrl}
        onSaveEditedVideo={handleSaveEditedVideoForScene}
      />
    </div>
  );
};

export default App;
