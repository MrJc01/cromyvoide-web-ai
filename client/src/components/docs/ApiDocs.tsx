import React, { useState } from 'react';
import { Terminal, Copy, Check, ExternalLink, Code2, Server, Key, Layers, Film } from 'lucide-react';

export const ApiDocs: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const endpoints = [
    {
      method: 'POST',
      path: '/api/generate (Opção A: Perfil Salvo)',
      title: 'Sintetizar Áudio TTS (Usando profile_id)',
      desc: 'Se um perfil de voz salvo for informado via profile_id (obtido via GET /api/profiles), a API carrega automaticamente o motor, modelo, voz e efeitos salvos, sem necessidade de enviar os demais parâmetros de voz.',
      curl: `curl -X POST https://cromyvoice0.crom.me/api/generate \\
  -H "Authorization: Bearer YOUR_CROMYVOICE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Olá mundo, este áudio foi gerado com meu perfil salvo!",
    "profile_id": 1,
    "sync": true
  }'`,
      response: `{
  "id": 42,
  "success": true,
  "status": "completed",
  "filename": "audio_1_1784689192.wav",
  "url": "https://cromyvoice0.crom.me/static/audios/audio_1_1784689192.wav",
  "text": "Olá mundo, este áudio foi gerado com meu perfil salvo!",
  "engine": "piper"
}`
    },
    {
      method: 'POST',
      path: '/api/generate (Opção B: Parâmetros Manuais)',
      title: 'Sintetizar Áudio TTS (Parâmetros Manuais)',
      desc: 'Sintetiza texto em áudio especificando manualmente o motor ("piper" ou "edge"), o modelo ONNX ou voz neural, taxa de velocidade, tom e equalização.',
      curl: `curl -X POST https://cromyvoice0.crom.me/api/generate \\
  -H "Authorization: Bearer YOUR_CROMYVOICE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Olá mundo, este é um teste com parâmetros manuais!",
    "engine": "piper",
    "model": "pt_BR-faber-medium.onnx",
    "sync": true
  }'`,
      response: `{
  "id": 43,
  "success": true,
  "status": "completed",
  "filename": "audio_1_1784689193.wav",
  "url": "https://cromyvoice0.crom.me/static/audios/audio_1_1784689193.wav",
  "text": "Olá mundo, este é um teste com parâmetros manuais!",
  "engine": "piper"
}`
    },
    {
      method: 'GET',
      path: '/api/status/:id',
      title: 'Consulta de Status & Polling',
      desc: 'Quando enviado sync: false na geração, a API responde instantaneamente em ~50ms com o ID da tarefa. Use este endpoint para verificar se o status mudou para completed.',
      curl: `curl https://cromyvoice0.crom.me/api/status/42 \\
  -H "Authorization: Bearer YOUR_CROMYVOICE_API_KEY"`,
      response: `{
  "id": 42,
  "type": "audio",
  "status": "completed",
  "filename": "audio_1_1784689192.wav",
  "url": "https://cromyvoice0.crom.me/static/audios/audio_1_1784689192.wav",
  "text": "Olá mundo, este é um teste da API CromyVoice!"
}`
    },
    {
      method: 'POST',
      path: '/api/video/generate',
      title: 'Gerar Vídeo MP4 Legendado',
      desc: 'Transforma um áudio sintetizado em um vídeo MP4 com legendas dinâmicas palavra-por-palavra. Se um filtro/preset for informado via subtitle_style ("j-vid", "neon", "minimal", "box"), a API carrega automaticamente as configurações do estilo.',
      curl: `curl -X POST https://cromyvoice0.crom.me/api/video/generate \\
  -H "Authorization: Bearer YOUR_CROMYVOICE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "audio_id": 42,
    "subtitle_style": "j-vid",
    "position": "center",
    "aspect_ratio": "1:1",
    "sync": true
  }'`,
      response: `{
  "id": 12,
  "success": true,
  "status": "completed",
  "filename": "video_1_1784689250.mp4",
  "url": "https://cromyvoice0.crom.me/static/videos/video_1_1784689250.mp4"
}`
    },
    {
      method: 'GET',
      path: '/api/video/profiles',
      title: 'Perfis & Presets de Vídeo Salvos',
      desc: 'Lista os presets do sistema (j-vid, neon, minimal, box) e os perfis customizados de estilo de vídeo salvos pelo usuário.',
      curl: `curl https://cromyvoice0.crom.me/api/video/profiles \\
  -H "Authorization: Bearer YOUR_CROMYVOICE_API_KEY"`,
      response: `{
  "system_presets": [
    {
      "id": 0,
      "name": "j-vid",
      "is_system": true,
      "settings": {
        "aspect_ratio": "1:1",
        "position": "center",
        "words_per_card": 15,
        "font_name": "Liberation Sans",
        "font_size": 42,
        "font_color": "#ffffff",
        "outline_width": 3,
        "outline_color": "#000000",
        "highlight_color": "#00ffff",
        "bg_color": "#000000",
        "use_background_box": false
      }
    }
  ],
  "user_profiles": [
    {
      "id": 5,
      "user_id": 1,
      "name": "Meu Estilo Reels",
      "engine": "video",
      "settings": "{\\"aspect_ratio\\": \\"9:16\\", \\"font_size\\": 50, \\"highlight_color\\": \\"#00ffff\\"}",
      "created_at": "2026-07-22T03:00:00Z"
    }
  ]
}`
    },
    {
      method: 'GET',
      path: '/api/models',
      title: 'Modelos ONNX Disponíveis',
      desc: 'Lista todos os modelos de voz ONNX do Piper instalados e disponíveis para uso imediato.',
      curl: `curl https://cromyvoice0.crom.me/api/models \\
  -H "Authorization: Bearer YOUR_CROMYVOICE_API_KEY"`,
      response: `{
  "installed": [
    "pt_BR-faber-medium.onnx",
    "pt_BR-cadu-medium.onnx",
    "pt_BR-edresson-low.onnx",
    "pt_BR-jeff-medium.onnx"
  ]
}`
    },
    {
      method: 'GET',
      path: '/api/profiles',
      title: 'Perfis de Voz Salvos',
      desc: 'Lista os perfis de voz e presets de efeitos salvos pelo usuário para reutilização via profile_id.',
      curl: `curl https://cromyvoice0.crom.me/api/profiles \\
  -H "Authorization: Bearer YOUR_CROMYVOICE_API_KEY"`,
      response: `[
  {
    "id": 1,
    "user_id": 1,
    "name": "Locutor Comercial (Faber)",
    "engine": "piper",
    "model": "pt_BR-faber-medium.onnx",
    "voice": "",
    "settings": "{\\"speed\\": 1.0}",
    "created_at": "2026-07-22T03:00:00Z"
  }
]`
    }
  ];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="glass-card p-6 rounded-2xl border border-indigo-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Code2 className="w-6 h-6 text-indigo-400" />
            Documentação Oficial da API REST CromyVoice (Atualizada)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Guia completo de integração para sintetizar vozes neurais ONNX/Edge e gerar vídeos MP4 com legendas animadas em cURL, Python e Node.js.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-mono px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5" />
            https://cromyvoice0.crom.me
          </span>
        </div>
      </div>

      {/* Auth Info Card */}
      <div className="glass-card p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 text-amber-200 text-xs flex items-center gap-3">
        <Key className="w-5 h-5 text-amber-400 shrink-0" />
        <div>
          <span className="font-bold">Autenticação via API Key:</span> Adicione o cabeçalho{' '}
          <code className="bg-amber-950/80 px-2 py-0.5 rounded border border-amber-700/50 font-mono">
            Authorization: Bearer YOUR_CROMYVOICE_API_KEY
          </code>{' '}
          em todas as suas requisições.
        </div>
      </div>

      {/* Endpoints List */}
      <div className="space-y-6">
        {endpoints.map((ep, idx) => (
          <div key={ep.path} className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-extrabold px-3 py-1 rounded-lg uppercase font-mono ${
                    ep.method.startsWith('POST') ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'
                  }`}
                >
                  {ep.method.split(' ')[0]}
                </span>
                <span className="text-sm font-bold text-white font-mono">{ep.path}</span>
              </div>
              <h3 className="text-sm font-bold text-slate-300">{ep.title}</h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">{ep.desc}</p>

            {/* Code Block cURL */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span className="flex items-center gap-1">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" /> Exemplo cURL:
                </span>
                <button
                  onClick={() => handleCopy(ep.curl, idx)}
                  className="hover:text-white flex items-center gap-1 transition-colors"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copiar cURL
                    </>
                  )}
                </button>
              </div>
              <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto border border-slate-800 leading-relaxed">
                {ep.curl}
              </pre>
            </div>

            {/* Response JSON */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400 font-mono block">Exemplo de Resposta (HTTP 200 OK):</span>
              <pre className="bg-slate-950/80 p-4 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto border border-slate-900 leading-relaxed">
                {ep.response}
              </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
