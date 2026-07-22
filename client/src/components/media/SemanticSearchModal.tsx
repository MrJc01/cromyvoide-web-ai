import React, { useState } from 'react';
import { useMediaStore } from '../../store/useMediaStore';
import { Search, Cpu, Sparkles, Filter, X, ArrowRight, Check } from 'lucide-react';

interface SemanticSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMedia?: (mediaUrl: string, mediaId: string) => void;
}

export const SemanticSearchModal: React.FC<SemanticSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectMedia
}) => {
  const {
    groups,
    selectedGroupIdsForSearch,
    toggleSearchGroupFilter,
    performSemanticSearch,
    searchResults,
    searchEmbeddingInfo,
    isSearching,
    clearSearch
  } = useMediaStore();

  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      performSemanticSearch(query);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-4xl w-full rounded-2xl border border-indigo-500/30 overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Busca Semântica por Embedding IA
              </h2>
              <p className="text-xs text-slate-400">
                Digite uma frase em linguagem natural. A IA converte o texto em vetor e calcula a Cosine Similarity com a biblioteca.
              </p>
            </div>
          </div>
          <button
            onClick={() => { clearSearch(); onClose(); }}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Group Filter Selection */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-950/40 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            Pesquisar em:
          </span>

          <button
            type="button"
            onClick={() => toggleSearchGroupFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
              selectedGroupIdsForSearch.includes('all')
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            Todos os Grupos
          </button>

          {groups.map(g => {
            const isChecked = selectedGroupIdsForSearch.includes(g.id);
            return (
              <button
                type="button"
                key={g.id}
                onClick={() => toggleSearchGroupFilter(g.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                  isChecked
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color || '#6366f1' }} />
                <span>{g.name}</span>
                {isChecked && <Check className="w-3 h-3 text-white" />}
              </button>
            );
          })}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSearchSubmit} className="p-6 border-b border-slate-800/80 bg-slate-900/40">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex: 'microfone de estúdio profissional com luz neon azul' ou 'ambiente de gravação tecnológica'..."
                className="glass-input w-full pl-11 pr-4 py-3 rounded-xl text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !query.trim()}
              className="bg-gradient-to-r from-indigo-600 to-pink-600 hover:opacity-90 disabled:opacity-50 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 transition-all"
            >
              {isSearching ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  Calculando Vetor...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Buscar Embedding
                </>
              )}
            </button>
          </div>
        </form>

        {/* Results Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {searchEmbeddingInfo && (
            <div className="bg-indigo-950/60 border border-indigo-800/50 p-3.5 rounded-xl text-xs text-indigo-300 font-mono flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" />
                Embedding calculado: {searchEmbeddingInfo.dimensions?.[0] || 512} dimensões float32
              </span>
              <span className="text-[10px] text-slate-400">
                Similaridade de Cosseno com ranking por %
              </span>
            </div>
          )}

          {searchResults.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Search className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-xs">Digite uma frase acima e clique em "Buscar Embedding" para pesquisar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {searchResults.map((res, idx) => (
                <div
                  key={res.media.id}
                  className="glass-card rounded-xl p-3 border border-slate-800 hover:border-indigo-500/60 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="aspect-video bg-slate-950 rounded-lg overflow-hidden relative">
                      <img src={res.media.url} alt={res.media.originalname} className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2 bg-indigo-600 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded-md shadow">
                        {res.scorePercentage} Match
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-white truncate">{res.media.originalname}</p>
                    <p className="text-[10px] text-slate-400 line-clamp-2">{res.media.description}</p>
                  </div>

                  {onSelectMedia && (
                    <button
                      onClick={() => {
                        onSelectMedia(res.media.url, res.media.id);
                        onClose();
                      }}
                      className="mt-3 w-full bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-medium py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors"
                    >
                      <span>Selecionar para a Cena</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
