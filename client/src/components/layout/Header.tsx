import React from 'react';
import { Wifi, Activity, Terminal, Shield } from 'lucide-react';

interface HeaderProps {
  activeTabTitle: string;
  serverConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({ activeTabTitle, serverConnected }) => {
  return (
    <header className="h-16 bg-[#0d121f]/90 backdrop-blur-md border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Breadcrumb & Current View */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-400 font-medium">Estúdio</span>
        <span className="text-slate-600">/</span>
        <span className="text-indigo-400 font-semibold uppercase tracking-wider">{activeTabTitle}</span>
      </div>

      {/* Server Status Badge & API Info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-full text-xs">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${serverConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${serverConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          </span>
          <span className="text-slate-300 font-medium text-[11px]">
            {serverConnected ? 'Servidor Conectado' : 'Conectando ao Backend...'}
          </span>
          <span className="text-slate-500 font-mono text-[10px] border-l border-slate-800 pl-2">
            cromyvoice0.crom.me
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-indigo-950/80 border border-indigo-800/50 text-indigo-300 text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-mono">
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span>API REST v1.0</span>
          </div>
        </div>
      </div>
    </header>
  );
};
