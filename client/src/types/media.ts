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
  groupId: string;
  createdAt: string;
}

export interface SearchResult {
  media: MediaItem;
  similarity: number;
  scorePercentage: string;
}
