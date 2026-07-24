import fs from 'fs';
import path from 'path';
import DatabaseConstructor, { Database as SQLiteDB } from 'better-sqlite3';
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

const DEFAULT_GROUPS: MediaGroup[] = [
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
];

class Database {
  private dbPath: string;
  private sqlite: SQLiteDB;

  constructor() {
    this.dbPath = CONFIG.SQLITE_FILE;
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    console.log(`📦 [SQLite] Inicializando banco de dados em: ${this.dbPath}`);
    this.sqlite = new DatabaseConstructor(this.dbPath);
    this.sqlite.pragma('journal_mode = WAL');

    this.initTables();
    this.seedDefaultData();
    this.migrateLegacyJson();
  }

  private initTables() {
    // Tabela de Grupos
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT,
        createdAt TEXT NOT NULL
      );
    `);

    // Tabela de Mídias
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS media (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        originalname TEXT NOT NULL,
        mimetype TEXT NOT NULL,
        size INTEGER NOT NULL,
        filepath TEXT NOT NULL,
        url TEXT NOT NULL,
        description TEXT,
        embedding TEXT,
        groupId TEXT NOT NULL DEFAULT 'default',
        createdAt TEXT NOT NULL
      );
    `);

    // Tabela de Roteiros
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS scripts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        rawText TEXT,
        targetTone TEXT,
        scenes TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
    `);

    console.log('✅ [SQLite] Tabelas verificadas/criadas com sucesso.');
  }

  private seedDefaultData() {
    const countResult = this.sqlite.prepare('SELECT COUNT(*) as count FROM groups').get() as { count: number };
    if (countResult.count === 0) {
      console.log('🌱 [SQLite] Semeando grupos padrão...');
      const insertGroup = this.sqlite.prepare(`
        INSERT INTO groups (id, name, description, color, createdAt)
        VALUES (@id, @name, @description, @color, @createdAt)
      `);

      for (const g of DEFAULT_GROUPS) {
        insertGroup.run(g);
      }
    }
  }

  private migrateLegacyJson() {
    const jsonPath = CONFIG.DATA_FILE;
    if (fs.existsSync(jsonPath)) {
      try {
        console.log(`🔄 [SQLite] Migrando dados do legado JSON (${jsonPath})...`);
        const content = fs.readFileSync(jsonPath, 'utf-8');
        const legacyData = JSON.parse(content);

        if (Array.isArray(legacyData.groups)) {
          const insertGroup = this.sqlite.prepare(`
            INSERT OR IGNORE INTO groups (id, name, description, color, createdAt)
            VALUES (@id, @name, @description, @color, @createdAt)
          `);
          for (const g of legacyData.groups) {
            insertGroup.run(g);
          }
        }

        if (Array.isArray(legacyData.media)) {
          const insertMedia = this.sqlite.prepare(`
            INSERT OR IGNORE INTO media (id, filename, originalname, mimetype, size, filepath, url, description, embedding, groupId, createdAt)
            VALUES (@id, @filename, @originalname, @mimetype, @size, @filepath, @url, @description, @embedding, @groupId, @createdAt)
          `);
          for (const m of legacyData.media) {
            insertMedia.run({
              ...m,
              embedding: JSON.stringify(m.embedding || [])
            });
          }
        }

        if (Array.isArray(legacyData.scripts)) {
          const insertScript = this.sqlite.prepare(`
            INSERT OR IGNORE INTO scripts (id, title, rawText, targetTone, scenes, createdAt)
            VALUES (@id, @title, @rawText, @targetTone, @scenes, @createdAt)
          `);
          for (const s of legacyData.scripts) {
            insertScript.run({
              ...s,
              scenes: JSON.stringify(s.scenes || [])
            });
          }
        }

        console.log('✅ [SQLite] Migração legada concluída.');
      } catch (err) {
        console.error('⚠️ [SQLite] Erro ao migrar arquivo JSON legado:', err);
      }
    }
  }

  // GRUPOS
  public getGroups(): MediaGroup[] {
    const rows = this.sqlite.prepare('SELECT * FROM groups ORDER BY createdAt ASC').all() as MediaGroup[];
    return rows;
  }

  public createGroup(group: Omit<MediaGroup, 'createdAt'>): MediaGroup {
    const newGroup: MediaGroup = {
      ...group,
      description: group.description || '',
      color: group.color || '#6366f1',
      createdAt: new Date().toISOString()
    };
    this.sqlite.prepare(`
      INSERT INTO groups (id, name, description, color, createdAt)
      VALUES (@id, @name, @description, @color, @createdAt)
    `).run(newGroup);
    return newGroup;
  }

  public deleteGroup(id: string): boolean {
    if (id === 'default') return false;
    const info = this.sqlite.prepare('DELETE FROM groups WHERE id = ?').run(id);
    if (info.changes > 0) {
      this.sqlite.prepare("UPDATE media SET groupId = 'default' WHERE groupId = ?").run(id);
      return true;
    }
    return false;
  }

  // MÍDIAS
  public getMedia(): MediaItem[] {
    const rows = this.sqlite.prepare('SELECT * FROM media ORDER BY createdAt DESC').all() as any[];
    return rows.map(r => ({
      ...r,
      embedding: r.embedding ? JSON.parse(r.embedding) : []
    }));
  }

  public getMediaById(id: string): MediaItem | undefined {
    const row = this.sqlite.prepare('SELECT * FROM media WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return {
      ...row,
      embedding: row.embedding ? JSON.parse(row.embedding) : []
    };
  }

  public addMedia(item: MediaItem): MediaItem {
    const newItem: MediaItem = {
      ...item,
      description: item.description || '',
      groupId: item.groupId || 'default'
    };
    this.sqlite.prepare(`
      INSERT INTO media (id, filename, originalname, mimetype, size, filepath, url, description, embedding, groupId, createdAt)
      VALUES (@id, @filename, @originalname, @mimetype, @size, @filepath, @url, @description, @embedding, @groupId, @createdAt)
    `).run({
      ...newItem,
      embedding: JSON.stringify(newItem.embedding || [])
    });
    return newItem;
  }

  public updateMedia(id: string, updates: Partial<MediaItem>): MediaItem | undefined {
    const existing = this.getMediaById(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.sqlite.prepare(`
      UPDATE media SET
        description = ?,
        groupId = ?
      WHERE id = ?
    `).run(updated.description, updated.groupId, id);
    return updated;
  }

  public deleteMedia(id: string): boolean {
    const info = this.sqlite.prepare('DELETE FROM media WHERE id = ?').run(id);
    return info.changes > 0;
  }

  // ROTEIROS
  public getScripts(): GeneratedScript[] {
    const rows = this.sqlite.prepare('SELECT * FROM scripts ORDER BY createdAt DESC').all() as any[];
    return rows.map(r => ({
      ...r,
      scenes: r.scenes ? JSON.parse(r.scenes) : []
    }));
  }

  public getScriptById(id: string): GeneratedScript | undefined {
    const row = this.sqlite.prepare('SELECT * FROM scripts WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return {
      ...row,
      scenes: row.scenes ? JSON.parse(row.scenes) : []
    };
  }

  public saveScript(script: GeneratedScript): GeneratedScript {
    const existing = this.sqlite.prepare('SELECT id FROM scripts WHERE id = ?').get(script.id);
    if (existing) {
      this.sqlite.prepare(`
        UPDATE scripts SET
          title = ?,
          rawText = ?,
          targetTone = ?,
          scenes = ?
        WHERE id = ?
      `).run(script.title, script.rawText, script.targetTone, JSON.stringify(script.scenes || []), script.id);
    } else {
      this.sqlite.prepare(`
        INSERT INTO scripts (id, title, rawText, targetTone, scenes, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        script.id,
        script.title,
        script.rawText,
        script.targetTone,
        JSON.stringify(script.scenes || []),
        script.createdAt || new Date().toISOString()
      );
    }
    return script;
  }
}

export const db = new Database();
