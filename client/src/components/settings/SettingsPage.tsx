import React, { useState, useEffect } from 'react';
import { Settings, Cpu, Key, Sparkles, Server, Check, Save, Shield, Sliders } from 'lucide-react';

export interface AppSettings {
  aiProvider: 'aistudio' | 'openrouter';
  aiModel: string;
  aiStudioKey: string;
  openRouterKey: string;
  cromyVoiceKey: string;
  defaultVoiceModel: string;
  defaultSubtitleStyle: 'neon' | 'modern' | 'classic';
  defaultOverlayPosition: 'center' | 'full' | 'top-right' | 'bottom-center';
  defaultOverlayScale: number;
}

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    aiProvider: 'aistudio',
    aiModel: 'gemini-2.0-flash',
    aiStudioKey: '',
    openRouterKey: '',
    cromyVoiceKey: '',
    defaultVoiceModel: 'pt_BR-faber-medium.onnx',
    defaultSubtitleStyle: 'neon',
    defaultOverlayPosition: 'center',
    defaultOverlayScale: 0.7
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const local = localStorage.getItem('cromyvoice_settings');
    if (local) {
      try {
        setSettings(JSON.parse(local));
      } catch (err) {}
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('cromyvoice_settings', JSON.stringify(settings));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="glass-card p-6 rounded-2xl border border-indigo-500/20 space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Configurações Globais & Provedores de IA</h2>
            <p className="text-xs text-slate-400">Escolha qual provedor de IA utilizar (Google AI Studio ou OpenRouter), selecione os modelos e gerencie suas chaves API.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Provedor de IA */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            Provedor Principal de Inteligência Artificial
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setSettings({ ...settings, aiProvider: 'aistudio', aiModel: 'gemini-2.0-flash' })}
              className={`p-4 rounded-xl border text-left transition-all relative ${
                settings.aiProvider === 'aistudio'
                  ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-lg'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs flex items-center gap-2 text-indigo-300">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Google AI Studio (Gemini API Direct)
                </span>
                {settings.aiProvider === 'aistudio' && <Check className="w-4 h-4 text-indigo-400" />}
              </div>
              <p className="text-[11px] text-slate-400">
                Acesso direto e rápido com a chave do AI Studio (Gemini 2.0 Flash). Recomendado para roteiros ultrarrápidos.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setSettings({ ...settings, aiProvider: 'openrouter', aiModel: 'anthropic/claude-3.5-sonnet' })}
              className={`p-4 rounded-xl border text-left transition-all relative ${
                settings.aiProvider === 'openrouter'
                  ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-lg'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs flex items-center gap-2 text-pink-300">
                  <Server className="w-4 h-4 text-pink-400" />
                  OpenRouter Unified Gateway
                </span>
                {settings.aiProvider === 'openrouter' && <Check className="w-4 h-4 text-pink-400" />}
              </div>
              <p className="text-[11px] text-slate-400">
                Acesso a múltiplos modelos como Claude 3.5 Sonnet, Llama 3.3 70B e Gemini via OpenRouter.
              </p>
            </button>
          </div>

          {/* Modelo Selecionado */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Modelo de IA Selecionado:</label>
            <select
              value={settings.aiModel}
              onChange={(e) => setSettings({ ...settings, aiModel: e.target.value })}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-mono"
            >
              {settings.aiProvider === 'aistudio' ? (
                <>
                  <option value="gemini-2.0-flash" className="bg-slate-900">Google Gemini 2.0 Flash (Recomendado)</option>
                  <option value="gemini-1.5-pro" className="bg-slate-900">Google Gemini 1.5 Pro</option>
                  <option value="gemini-1.5-flash" className="bg-slate-900">Google Gemini 1.5 Flash</option>
                </>
              ) : (
                <>
                  <option value="anthropic/claude-3.5-sonnet" className="bg-slate-900">Anthropic Claude 3.5 Sonnet</option>
                  <option value="meta-llama/llama-3.3-70b-instruct" className="bg-slate-900">Meta Llama 3.3 70B Instruct</option>
                  <option value="google/gemini-2.0-flash-001" className="bg-slate-900">Google Gemini 2.0 Flash (OpenRouter)</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Chaves de API */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            Chaves de API (API Keys)
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Chave Google AI Studio API (Gemini):</label>
              <input
                type="password"
                value={settings.aiStudioKey}
                onChange={(e) => setSettings({ ...settings, aiStudioKey: e.target.value })}
                className="glass-input w-full px-3 py-2 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Chave OpenRouter API:</label>
              <input
                type="password"
                value={settings.openRouterKey}
                onChange={(e) => setSettings({ ...settings, openRouterKey: e.target.value })}
                className="glass-input w-full px-3 py-2 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Chave API CromyVoice REST:</label>
              <input
                type="text"
                value={settings.cromyVoiceKey}
                onChange={(e) => setSettings({ ...settings, cromyVoiceKey: e.target.value })}
                className="glass-input w-full px-3 py-2 rounded-xl text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Padrões do Estúdio & Overlay */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-pink-400" />
            Padrões de Renderização do Estúdio
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Voz Padrão CromyVoice:</label>
              <select
                value={settings.defaultVoiceModel}
                onChange={(e) => setSettings({ ...settings, defaultVoiceModel: e.target.value })}
                className="glass-input w-full px-3 py-2 rounded-xl text-xs"
              >
                <option value="pt_BR-faber-medium.onnx" className="bg-slate-900">Locutor Faber (Medium)</option>
                <option value="pt_BR-cadu-medium.onnx" className="bg-slate-900">Locutor Cadu (Medium)</option>
                <option value="pt_BR-edresson-low.onnx" className="bg-slate-900">Locutor Edresson (Low)</option>
                <option value="pt_BR-jeff-medium.onnx" className="bg-slate-900">Locutor Jeff (Medium)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Estilo de Legenda:</label>
              <select
                value={settings.defaultSubtitleStyle}
                onChange={(e) => setSettings({ ...settings, defaultSubtitleStyle: e.target.value as any })}
                className="glass-input w-full px-3 py-2 rounded-xl text-xs"
              >
                <option value="neon" className="bg-slate-900">Neon Glow</option>
                <option value="modern" className="bg-slate-900">Modern Bold</option>
                <option value="classic" className="bg-slate-900">Classic</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Escala da Caixa de Sobreposição:</label>
              <select
                value={settings.defaultOverlayScale}
                onChange={(e) => setSettings({ ...settings, defaultOverlayScale: Number(e.target.value) })}
                className="glass-input w-full px-3 py-2 rounded-xl text-xs"
              >
                <option value={0.5} className="bg-slate-900">Pequeno (50%)</option>
                <option value={0.7} className="bg-slate-900">Médio (70% - Estilo Print)</option>
                <option value={0.9} className="bg-slate-900">Grande (90%)</option>
                <option value={1.0} className="bg-slate-900">Tela Cheia (100%)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          {savedSuccess ? (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
              <Check className="w-4 h-4" /> Configurações salvas com sucesso!
            </span>
          ) : <div />}

          <button
            type="submit"
            className="bg-gradient-to-r from-indigo-600 to-pink-600 hover:opacity-90 text-white text-xs font-extrabold px-8 py-3 rounded-xl shadow-lg flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Salvar Configurações
          </button>
        </div>
      </form>
    </div>
  );
};
