import React, { useState, useEffect } from 'react';
import { useMediaStore } from '../../store/useMediaStore';
import {
  Upload,
  FolderPlus,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  Layers,
  Tag,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Plus,
  Folder
} from 'lucide-react';

export const MediaGallery: React.FC = () => {
  const {
    mediaList,
    groups,
    selectedGroupId,
    setSelectedGroup,
    fetchMedia,
    fetchGroups,
    uploadFile,
    deleteMediaItem,
    updateMediaItemGroup,
    createGroupItem,
    deleteGroupItem,
    isUploading,
    isLoading
  } = useMediaStore();

  const [dragActive, setDragActive] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#6366f1');
  const [selectedUploadGroup, setSelectedUploadGroup] = useState('default');
  const [customDescription, setCustomDescription] = useState('');

  useEffect(() => {
    fetchGroups();
    fetchMedia();
  }, []);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    await uploadFile(files, selectedUploadGroup, customDescription);
    setCustomDescription('');
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    await createGroupItem(newGroupName, newGroupDesc, newGroupColor);
    setNewGroupName('');
    setNewGroupDesc('');
    setShowNewGroupModal(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Banner / Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-6 rounded-2xl border border-indigo-500/20">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-400" />
            Biblioteca de Mídias & Grupos IA
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Faça upload de imagens e ativos visuais. Nossa IA leve extrai automaticamente embeddings semânticos (512-dim) e descrições para buscas inteligentes e associação automática nos roteiros.
          </p>
        </div>
        <button
          onClick={() => setShowNewGroupModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all self-start md:self-auto"
        >
          <FolderPlus className="w-4 h-4" />
          Novo Grupo / Pasta
        </button>
      </div>

      {/* Group Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedGroup('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
            selectedGroupId === 'all'
              ? 'bg-white text-slate-900 shadow-md font-bold'
              : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Folder className="w-3.5 h-3.5" />
          Todas as Mídias ({mediaList.length})
        </button>
        {groups.map((group) => {
          const isSelected = selectedGroupId === group.id;
          const groupCount = mediaList.filter(m => m.groupId === group.id).length;
          return (
            <div key={group.id} className="relative group/pill shrink-0">
              <button
                onClick={() => setSelectedGroup(group.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: group.color || '#6366f1' }} />
                <span>{group.name}</span>
                <span className="text-[10px] bg-slate-800/80 px-1.5 py-0.5 rounded-full">
                  {groupCount}
                </span>
              </button>
              {group.id !== 'default' && (
                <button
                  onClick={() => deleteGroupItem(group.id)}
                  title="Deletar Grupo"
                  className="opacity-0 group-hover/pill:opacity-100 absolute -top-1.5 -right-1.5 bg-rose-600 text-white p-1 rounded-full text-[10px] transition-opacity shadow"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Upload Zone */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 w-full">
            <label className="text-xs font-medium text-slate-400 mb-1 block">Associar ao Grupo:</label>
            <select
              value={selectedUploadGroup}
              onChange={(e) => setSelectedUploadGroup(e.target.value)}
              className="glass-input w-full px-3 py-2 rounded-xl text-xs"
            >
              {groups.map(g => (
                <option key={g.id} value={g.id} className="bg-slate-900 text-white">
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 w-full">
            <label className="text-xs font-medium text-slate-400 mb-1 block">Descrição Opcional (ou deixe p/ IA):</label>
            <input
              type="text"
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder="Ex: Microfone neon em ambiente escuro de podcast..."
              className="glass-input w-full px-3 py-2 rounded-xl text-xs"
            />
          </div>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFileUpload(e.dataTransfer.files);
          }}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
            dragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
          }`}
        >
          <input
            type="file"
            id="file-upload"
            accept="image/*,video/*"
            multiple
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
          />
          <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Upload className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {isUploading ? 'Processando IA & Gerando Embedding Vectors...' : 'Arraste vários arquivos aqui ou clique para selecionar múltiplos'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Suporta seleção múltipla de PNG, JPG, WEBP, MP4. O modelo de IA extrai automaticamente os vetores de embedding para cada mídia enviada.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Media Cards Grid */}
      <div>
        <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-indigo-400" />
          Mídias Cadastradas com Embedding ({mediaList.length})
        </h3>

        {mediaList.length === 0 ? (
          <div className="glass-card p-12 text-center rounded-2xl space-y-3">
            <Cpu className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-medium text-slate-400">Nenhuma mídia encontrada neste grupo.</p>
            <p className="text-xs text-slate-500">Faça upload de imagens acima para gerar embeddings e usar no estúdio.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {mediaList.map((media) => {
              const group = groups.find(g => g.id === media.groupId);
              return (
                <div
                  key={media.id}
                  className="glass-card rounded-2xl overflow-hidden group hover:border-indigo-500/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Media Thumbnail */}
                    <div className="aspect-video bg-slate-950 relative overflow-hidden">
                      <img
                        src={media.url}
                        alt={media.originalname}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute top-2 left-2 bg-slate-900/90 border border-slate-800 text-[10px] px-2 py-0.5 rounded-full text-slate-300 flex items-center gap-1 font-mono">
                        <Cpu className="w-3 h-3 text-indigo-400" />
                        512d Vector
                      </div>
                      <button
                        onClick={() => deleteMediaItem(media.id)}
                        className="absolute top-2 right-2 bg-rose-600/90 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow"
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Content Info */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        {/* Seletor de Grupo Interativo no Card */}
                        <select
                          value={media.groupId}
                          onChange={(e) => updateMediaItemGroup(media.id, e.target.value)}
                          className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/90 border border-indigo-800/60 px-2 py-0.5 rounded-md focus:outline-none cursor-pointer"
                        >
                          {groups.map(g => (
                            <option key={g.id} value={g.id} className="bg-slate-900 text-white">
                              Grupo: {g.name}
                            </option>
                          ))}
                        </select>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {(media.size / 1024).toFixed(0)} KB
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-white truncate" title={media.originalname}>
                        {media.originalname}
                      </p>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {media.description}
                      </p>
                    </div>
                  </div>

                  {/* Embedding Stats Footer */}
                  <div className="px-4 py-2.5 border-t border-slate-800/80 bg-slate-950/40 text-[10px] font-mono text-slate-500 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" /> CLIP Indexado
                    </span>
                    <span>{new Date(media.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Criar Novo Grupo */}
      {showNewGroupModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border border-indigo-500/30 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-indigo-400" />
              Criar Novo Grupo / Pasta
            </h3>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1 block">Nome do Grupo:</label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Ex: Cyberpunk, Entrevistas..."
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1 block">Descrição:</label>
                <input
                  type="text"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="Descrição sobre as mídias contidas"
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1 block">Cor da Etiqueta:</label>
                <input
                  type="color"
                  value={newGroupColor}
                  onChange={(e) => setNewGroupColor(e.target.value)}
                  className="w-full h-9 rounded-xl bg-transparent cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewGroupModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow"
                >
                  Salvar Grupo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
