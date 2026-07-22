import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config/env';

export interface MediaGroup {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
}

export interface MediaItem {
  id: string;
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  filepath: string;
  url: string;
  description: string;
  embedding: number[];
  groupId: string; // ID do grupo ou 'default'
  createdAt: string;
}

export interface ScriptScene {
  id: string;
  sceneNumber: number;
  narrationText: string;
  visualPrompt: string;
  estimatedDurationSeconds: number;
  selectedMediaId?: string;
  selectedMediaUrl?: string;
}

export interface GeneratedScript {
  id: string;
  title: string;
  rawText: string;
  targetTone: string;
  scenes: ScriptScene[];
  createdAt: string;
}

interface DatabaseSchema {
  groups: MediaGroup[];
  media: MediaItem[];
  scripts: GeneratedScript[];
}

const DEFAULT_DB: DatabaseSchema = {
  groups: [
    {
      id: 'default',
      name: 'Todos / Geral',
      description: 'Grupo padrão para todas as mídias',
      color: '#6366f1',
      createdAt: new Date().toISOString()
    },
    {
      id: 'podcast',
      name: 'Podcast & Estúdio',
      description: 'Mídias com estética de microfones, neon e estúdio',
      color: '#ec4899',
      createdAt: new Date().toISOString()
    },
    {
      id: 'tech',
      name: 'Tecnologia & IA',
      description: 'Imagens e clipes sobre tecnologia e futuro',
      color: '#06b6d4',
      createdAt: new Date().toISOString()
    }
  ],
  media: [],
  scripts: []
};

class Database {
  private dbPath: string;
  private data: DatabaseSchema;

  constructor() {
    this.dbPath = CONFIG.DATA_FILE;
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(this.dbPath)) {
        const fileData = fs.readFileSync(this.dbPath, 'utf-8');
        return JSON.parse(fileData);
      }
    } catch (err) {
      console.error('Erro ao ler banco de dados JSON:', err);
    }
    this.save(DEFAULT_DB);
    return DEFAULT_DB;
  }

  private save(data?: DatabaseSchema) {
    if (data) this.data = data;
    try {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Erro ao salvar banco de dados JSON:', err);
    }
  }

  // GRUPOS
  public getGroups(): MediaGroup[] {
    return this.data.groups;
  }

  public createGroup(group: Omit<MediaGroup, 'createdAt'>): MediaGroup {
    const newGroup: MediaGroup = {
      ...group,
      createdAt: new Date().toISOString()
    };
    this.data.groups.push(newGroup);
    this.save();
    return newGroup;
  }

  public deleteGroup(id: string): boolean {
    if (id === 'default') return false;
    this.data.groups = this.data.groups.filter(g => g.id !== id);
    // Mover mídias do grupo deletado para default
    this.data.media = this.data.media.map(m => m.groupId === id ? { ...m, groupId: 'default' } : m);
    this.save();
    return true;
  }

  // MÍDIAS
  public getMedia(): MediaItem[] {
    return this.data.media;
  }

  public getMediaById(id: string): MediaItem | undefined {
    return this.data.media.find(m => m.id === id);
  }

  public addMedia(item: MediaItem): MediaItem {
    this.data.media.push(item);
    this.save();
    return item;
  }

  public updateMedia(id: string, updates: Partial<MediaItem>): MediaItem | undefined {
    const idx = this.data.media.findIndex(m => m.id === id);
    if (idx === -1) return undefined;
    this.data.media[idx] = { ...this.data.media[idx], ...updates };
    this.save();
    return this.data.media[idx];
  }

  public deleteMedia(id: string): boolean {
    const initialLen = this.data.media.length;
    this.data.media = this.data.media.filter(m => m.id !== id);
    if (this.data.media.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // ROTEIROS
  public getScripts(): GeneratedScript[] {
    return this.data.scripts;
  }

  public getScriptById(id: string): GeneratedScript | undefined {
    return this.data.scripts.find(s => s.id === id);
  }

  public saveScript(script: GeneratedScript): GeneratedScript {
    const existingIdx = this.data.scripts.findIndex(s => s.id === script.id);
    if (existingIdx >= 0) {
      this.data.scripts[existingIdx] = script;
    } else {
      this.data.scripts.unshift(script);
    }
    this.save();
    return script;
  }
}

export const db = new Database();
