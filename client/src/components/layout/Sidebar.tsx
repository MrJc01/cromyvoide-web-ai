import React from 'react';
import {
  Video,
  FileText,
  Image as ImageIcon,
  BookOpen,
  Sparkles,
  Search,
  Settings
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenSearch: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onOpenSearch }) => {
  const menuItems = [
    { id: 'script', label: 'Gerador de Roteiros AI', icon: Sparkles, badge: 'IA' },
    { id: 'media-library', label: 'Biblioteca de Mídias & Grupos', icon: ImageIcon },
    { id: 'search-embedding', label: 'Busca por Embeddings', icon: Search },
    { id: 'video-creator', label: 'Estúdio de Vídeos Overlay', icon: Video },
    { id: 'settings', label: 'Configurações Globais & Provedores', icon: Settings },
    { id: 'api-docs', label: 'Documentação API CromyVoice', icon: BookOpen },
  ];

  return (
    <aside className="w-64 bg-[#0d121f] border-r border-slate-800 flex flex-col justify-between h-screen sticky top-0 z-30 select-none">
      {/* Brand Header */}
      <div>
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="font-extrabold text-lg tracking-wider text-white">CV</span>
          </div>
          <div>
            <h1 className="font-extrabold text-base text-white tracking-tight leading-tight">
              CromyVoice
            </h1>
            <span className="text-[10px] font-semibold text-indigo-400 tracking-wider uppercase block">
              Studio Pro
            </span>
          </div>
        </div>

        {/* Quick Vector Search Action */}
        <div className="px-4 py-4">
          <button
            onClick={onOpenSearch}
            className="w-full glass-input hover:border-indigo-500/50 rounded-xl px-3 py-2.5 flex items-center justify-between text-xs text-slate-400 transition-all group"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
              Busca vetorial por IA...
            </span>
            <kbd className="bg-slate-800 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded text-[10px] font-mono">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Real Active Navigation List */}
        <nav className="px-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
                    isActive ? 'bg-white/20 text-white' : 'bg-indigo-950 text-indigo-400 border border-indigo-800/40'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-500 text-center">
        CromyVoice AI Studio • v1.0
      </div>
    </aside>
  );
};
