export interface TTSResponse {
  id: number;
  success: boolean;
  status: string;
  filename: string;
  url: string;
  text: string;
  engine: string;
}

export interface VideoResponse {
  id: number;
  success: boolean;
  status: string;
  filename: string;
  url: string;
}

export interface VoiceProfile {
  id: number;
  user_id: number;
  name: string;
  engine: string;
  model: string;
  voice: string;
  settings: string;
  created_at: string;
}
