# 🎙️ CromyVoice AI Studio Pro

> **Plataforma completa para geração automatizada de vídeos, roteiros dinâmicos por IA, sintetização de voz ONNX, pesquisa vetorial por embeddings e composição de mídias em overlay.**

---

### 🔑 Acesso à API de Vídeo

> 💬 **Para solicitar acesso à API de Vídeo e Síntese da CromyVoice, entre em contato com `J` no Discord da comunidade: [crom.run/comunidade](https://crom.run/comunidade).**

---

## ✨ Principais Recursos

- 🎬 **Gerador de Roteiros Dinâmico (Com e Sem IA)**:
  - Divisão de matérias ou informações brutas em cenas narradas estruturadas usando LLM (OpenRouter / Gemini).
  - Opção de **geração imediata sem IA** (`Criar Cenas Direto`), fatiando textos por parágrafos sem consumo de API.
  - Edição manual completa: criar, reordenar (⬆️ ⬇️), editar fala inline e excluir cenas (🗑️).

- 🧠 **Pesquisa Vetorial de Mídias por Embeddings**:
  - Indexação semântica da biblioteca de mídias usando modelo leve ONNX (`Xenova/all-MiniLM-L6-v2`).
  - Associação automática por IA das melhores imagens para cada cena e busca com filtro por grupos.

- 🎙️ **Síntese de Voz & Legendas Dinâmicas (CromyVoice API)**:
  - Suporte a modelos de voz Piper ONNX (`pt_BR-faber-medium.onnx` e outros).
  - Presets de legenda configuráveis (`j-vid`, `neon`, `minimal`, `box`) e posicionamento (`center` / `bottom`).

- 📐 **Posicionamento de Overlay na Grade 9 Posições (3x3)**:
  - Enquadramento 1:1 quadrado perfeito em um canvas 1280x720.
  - Grade visual de 9 posições (`top-left`, `top-center`, `top-right`, `middle-left`, `center`, `middle-right`, `bottom-left`, `bottom-center`, `bottom-right`).
  - Seletor de cor sólida de fundo (`#000000` padrão, paleta personalizada e picker) ou imagem da galeria.
  - Slider contínuo de escala (15% a 100%) com presets rápidos.

- ✂️ **Editor & Recorte Simples de Vídeos**:
  - Popup integrado para ajuste de tempo inicial e duração de cortes de vídeos de mídia.
  - Opção de **remover/mutar o áudio original** do vídeo para não sobrepor a narração.

- 🎬 **Renderização do Vídeo Mestre Final**:
  - Concatenação automatizada de todas as cenas finais compostas em um único arquivo MP4 mestre pronto para publicação.

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- **Node.js**: v18.0.0 ou superior
- **npm**: v9.0.0 ou superior
- **FFmpeg**: Instalado e disponível no `PATH` do sistema

### 1. Clonar o Repositório & Instalar Dependências
```bash
git clone git@github.com:MrJc01/cromyvoide-web-ai.git
cd cromyvoide-web-ai

# Instala dependências da raiz, cliente e servidor
npm run install:all
```

### 2. Configurar Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

Preencha com suas chaves de API:
```env
PORT=3001
OPENROUTER_API_KEY=sua_chave_openrouter
AISTUDIO_API_KEY=sua_chave_gemini_aistudio
CROMYVOICE_API_KEY=sua_chave_cromyvoice
CROMYVOICE_BASE_URL=https://cromyvoice0.crom.me
```

### 3. Iniciar em Modo de Desenvolvimento
```bash
npm run dev
```
- **Frontend Vite**: `http://localhost:3002` (ou 3000/3003 dependendo da porta livre)
- **Backend Express**: `http://localhost:3001`

### 4. Compilar para Produção
```bash
npm run build
```

---

## 📁 Estrutura da Aplicação

```
cromyvoide-web-ai/
├── client/                   # Frontend SPA React + Vite + Tailwind CSS + Zustand
│   ├── src/
│   │   ├── components/       # Componentes (ScriptGenerator, VideoCreatorModal, MediaEditorModal, etc.)
│   │   ├── services/         # Cliente API Axios
│   │   ├── store/            # Gerenciadores de estado Zustand (script, media, cromyvoice)
│   │   └── types/            # Interfaces TypeScript
├── server/                   # Backend API REST Node.js + Express + TypeScript
│   ├── src/
│   │   ├── config/           # Configurações de ambiente
│   │   ├── controllers/      # Controladores REST (script, media, render, search)
│   │   ├── routes/           # Definição de rotas Express
│   │   └── services/         # Serviços (FFmpeg, Embeddings, CromyVoice, OpenRouter)
│   └── uploads/              # Armazenamento local de mídias e vídeos gerados
└── .gitignore
```

---

## 📄 Licença

Desenvolvido para **CromyVoice Studio Pro**. Todos os direitos reservados.
