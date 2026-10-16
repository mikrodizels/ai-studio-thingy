export type Template = 'shy-girl' | 'mean-girl' | 'giselle-boutique';

export interface Tool {
  name: string;
  description: string;
  parameters?: any;
  isEnabled: boolean;
}

export interface ConversationTurn {
  id: string;
  timestamp: Date;
  role: 'user' | 'agent' | 'system';
  name?: string;
  text: string;
  thinkingText?: string;
  isFinal: boolean;
  images?: string[];
  video?: string;
  audioData?: string[];
}
