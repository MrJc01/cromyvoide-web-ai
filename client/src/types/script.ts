export interface ScriptScene {
  id: string;
  sceneNumber: number;
  narrationText: string;
  visualPrompt: string;
  visualDescription?: string;
  estimatedDurationSeconds: number;
  selectedMediaId?: string;
  selectedMediaUrl?: string;
  generatedAudioUrl?: string;
  generatedAudioId?: number;
  generatedVideoUrl?: string;
  generatedVideoId?: number;
  mode?: 'text' | 'audio' | 'video';
}

export interface GeneratedScript {
  id: string;
  title: string;
  rawText: string;
  targetTone: string;
  scenes: ScriptScene[];
  createdAt: string;
}
