# 📋 Checklist de Tarefas & Arquitetura do Editor de Vídeo (Timeline & Layouts)

Este documento contém o planejamento detalhado, checklist de tarefas e a pesquisa de arquitetura para as novas funcionalidades de edição de vídeo, layouts split-screen, oculta de fundo e o novo **Editor de Timeline Interativo (Pré-etapa Opcional)**.

---

## 📌 Checklist de Tarefas (Task List)

### 1. ✅ Layout Split-Screen / Side-by-Side com `object-contain` Editável
- [x] **[Frontend]** Adicionar seletor de layout de composição no modal de vídeo:
  - `overlay-grid` (Posição em 9 pontos atual)
  - `split-horizontal` (Lado a Lado - Esquerda/Direita)
  - `split-vertical` (Topo/Base)
  - `full-bg` (Fundo Inteiro com Avatar Sobreposto)
- [x] **[Frontend]** Criar controle de proporção do Split (Slider editável: 30/70, 50/50, 70/30).
- [x] **[Frontend]** Adicionar seletor de modo de encaixe da mídia (`object-fit: contain` vs `object-fit: cover`).
- [x] **[Backend - FFmpeg]** Atualizar `ffmpegService.renderSceneComposition`:
  - Suportar filtro `hstack` / `vstack` / `xstack` para lado a lado.
  - Implementar escala com preservação de aspect ratio (`scale=w:h:force_original_aspect_ratio=decrease,pad=w:h:(ow-iw)/2:(oh-ih)/2`) para o modo `object-contain`.

### 2. ✅ Opção de Ocultar / Desativar Vídeo de Fundo
- [x] **[Frontend]** Adicionar switch/toggle na UI: `"Esconder Vídeo de Fundo"`.
- [x] **[Frontend]** Exibir seletor de cor de fundo sólida (`bgColor`) quando a mídia de fundo estiver oculta.
- [x] **[Frontend]** Atualizar pré-visualização em tempo real na tela para refletir o fundo oculta/cor sólida.
- [x] **[Backend - FFmpeg]** Ajustar renderização no `ffmpegService`:
  - Quando a mídia for oculta, ignorar input de vídeo/imagem de fundo e gerar canvas de cor lavfi puramente com a cor escolhida.

### 3. ✅ Pré-Etapa Opcional: Editor de Vídeo com Timeline Multi-Track
- [x] **[Frontend - Modal & Navegação]** Adicionar botão de escolha após geração do roteiro/áudios:
  - **"⚡ GERAR VÍDEO COMPLETO (1-Clique)"** (Modo Rápido Atual)
  - **"🎬 ABRIR EDITOR DE TIMELINE (Pré-Etapa Editável)"** (Modo Avançado Editável)
- [x] **[Frontend - Estado Global do Editor]** Definir estrutura de estado da Timeline (`TimelineClipItem`).
- [x] **[Frontend - UI do Timeline Editor]** Desenvolver os componentes da Timeline no [VideoTimelineEditorModal.tsx](file:///home/j/Documentos/GitHub/cromyvoide-web-ai/client/src/components/cromyvoice/VideoTimelineEditorModal.tsx):
  - **Header / Toolbar**: Controles de Play/Pause, Rewind, Zoom.
  - **Régua de Tempo (Time Ruler)**: Exibição de marcações de tempo (00:00, 00:05, 00:10...) clicável para mover a agulha.
  - **Trilhas (Track Rows)**:
    - *Trilha 1 (Vídeo / CromyVoice)*: Blocos de avatar por cena.
    - *Trilha 2 (Mídia de Fundo)*: Blocos de imagens/clipes alinhados a cada cena com modo de layout.
    - *Trilha 3 (Narração)*: Onda de áudio gerada.
  - **Painel Inspector (Propriedades do Clipe Selecionado)**: Editar layout (overlay vs split horizontal/vertical), proporção split, encaixe contain/cover, cor sólida e ocultar fundo.
- [x] **[Backend - Renderizador de Projeto da Timeline]** Integração via `api.renderComposite` + `api.concatFinalVideos` para processar a Timeline inteira em um render final FFmpeg.
