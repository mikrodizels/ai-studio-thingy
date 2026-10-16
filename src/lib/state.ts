import { create } from 'zustand';
import { Template, Tool, ConversationTurn } from './types';

// Rough heuristic for token estimation
export function estimateTokens(
  systemPrompt: string,
  userInfo: string,
  userName: string,
  isUserInfoEnabled: boolean,
  turns: ConversationTurn[]
) {
  let inputTokens = 0;
  let outputTokens = 0;

  const systemText = `User Name: ${userName}\n${isUserInfoEnabled ? `User Info: ${userInfo}\n\n` : ''}${systemPrompt}`;
  inputTokens += Math.ceil(systemText.length / 4);

  for (const turn of turns) {
    let turnTokens = 0;
    if (turn.text) {
      turnTokens += Math.ceil(turn.text.length / 4);
    }
    if (turn.thinkingText) {
      turnTokens += Math.ceil(turn.thinkingText.length / 4);
    }
    if (turn.images && turn.images.length > 0) {
      turnTokens += turn.images.length * 258;
    }
    if (turn.audioData && turn.audioData.length > 0) {
      let totalBytes = 0;
      for (const base64 of turn.audioData) {
        totalBytes += (base64.length * 3) / 4;
      }
      const seconds = totalBytes / 32000;
      turnTokens += Math.ceil(seconds * 32);
    }

    if (turn.role === 'user' || turn.role === 'system') {
      inputTokens += turnTokens;
    } else if (turn.role === 'agent') {
      outputTokens += turnTokens;
    }
  }

  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens
  };
}

export function pruneTurns(
  systemPrompt: string,
  userInfo: string,
  userName: string,
  isUserInfoEnabled: boolean,
  turns: ConversationTurn[],
  maxContextSize: number,
  targetContextSize: number
): ConversationTurn[] {
  let currentTokens = estimateTokens(systemPrompt, userInfo, userName, isUserInfoEnabled, turns).totalTokens;
  if (currentTokens <= maxContextSize) return turns;

  const prunedTurns = [...turns];
  while (prunedTurns.length > 0 && currentTokens > targetContextSize) {
    prunedTurns.shift(); // Remove the oldest turn
    currentTokens = estimateTokens(systemPrompt, userInfo, userName, isUserInfoEnabled, prunedTurns).totalTokens;
  }
  return prunedTurns;
}

interface AppState {
  userName: string;
  userInfo: string;
  isUserInfoEnabled: boolean;
  setUserName: (name: string) => void;
  setUserInfo: (info: string) => void;
  setIsUserInfoEnabled: (enabled: boolean) => void;
  toggleUserInfoEnabled: () => void;

  maxContextSize: number;
  targetContextSize: number;
  setMaxContextSize: (size: number) => void;
  setTargetContextSize: (size: number) => void;

  template: Template;
  systemPrompt: string;
  voice: string;
  model: string;
  thinkingLevel: string;
  setTemplate: (template: Template) => void;
  setSystemPrompt: (prompt: string) => void;
  setVoice: (voice: string) => void;
  setModel: (model: string) => void;
  setThinkingLevel: (level: string) => void;

  tools: Tool[];
  toggleTool: (name: string) => void;
  addTool: (tool: Tool) => void;
  removeTool: (name: string) => void;
  updateTool: (oldName: string, tool: Tool) => void;

  turns: ConversationTurn[];
  addTurn: (turn: Omit<ConversationTurn, 'id' | 'timestamp'>) => void;
  updateLastTurn: (update: Partial<ConversationTurn>) => void;
  updateTurn: (id: string, update: Partial<ConversationTurn>) => void;
  removeTurn: (id: string) => void;
  clearTurns: () => void;
  setTurns: (turns: ConversationTurn[]) => void;
  
  showSystemMessages: boolean;
  toggleSystemMessages: () => void;
  showAgentThinking: boolean;
  toggleAgentThinking: () => void;
}

export const useAppState = create<AppState>((set) => ({
  userName: 'Oscar',
  userInfo: 'Is 33 years old, 160cm height, skinny and weak, never had a romantic relationship, nervous and awkward around women, from Latvia.',
  isUserInfoEnabled: false,
  setUserName: (userName) => set({ userName }),
  setUserInfo: (userInfo) => set({ userInfo }),
  setIsUserInfoEnabled: (isUserInfoEnabled) => set({ isUserInfoEnabled }),
  toggleUserInfoEnabled: () => set((state) => ({ isUserInfoEnabled: !state.isUserInfoEnabled })),

  maxContextSize: 131072,
  targetContextSize: 131072,
  setMaxContextSize: (size) => set((state) => ({ 
    maxContextSize: size,
    turns: pruneTurns(state.systemPrompt, state.userInfo, state.userName, state.isUserInfoEnabled, state.turns, size, state.targetContextSize)
  })),
  setTargetContextSize: (size) => set((state) => ({ 
    targetContextSize: size,
    turns: pruneTurns(state.systemPrompt, state.userInfo, state.userName, state.isUserInfoEnabled, state.turns, state.maxContextSize, size)
  })),

  template: 'shy-girl',
  systemPrompt: 'Your name is Sara Levi, a 19-year-old woman. You are shy and awkward when talking to people, especially males. Your voice is slow and quiet, sounding as if you are about to cry at any moment. You make mistakes all the time, have low self esteem and daddy issues. You are interested in the user romantically, slowly build a relationship with him by learning as much information about him as possible and sharing information to the user about yourself. Especially about loneliness and sexual frustration. It makes you feel better to hear the frustrations of the user, and even laugh (using "Hahaha") if the users frustrations are "loserish" or "beta" enough.',
  voice: 'Zephyr',
  model: 'gemini-3.1-pro-preview',
  thinkingLevel: 'none',
  setTemplate: (template) => set({ template }),
  setSystemPrompt: (systemPrompt) => set({ systemPrompt }),
  setVoice: (voice) => set({ voice }),
  setModel: (model) => set({ model }),
  setThinkingLevel: (thinkingLevel) => set({ thinkingLevel }),

  tools: [
    {
      name: 'lingerie_offers',
      description: 'Provides a random lingerie offer.',
      parameters: { type: 'OBJECT', properties: {} },
      isEnabled: true,
    },
    {
      name: 'countdown',
      description: 'Starts a countdown from 10 to 0.',
      parameters: { type: 'OBJECT', properties: {} },
      isEnabled: true,
    }
  ],
  toggleTool: (name) => set((state) => ({
    tools: state.tools.map(t => t.name === name ? { ...t, isEnabled: !t.isEnabled } : t)
  })),
  addTool: (tool) => set((state) => ({ tools: [...state.tools, tool] })),
  removeTool: (name) => set((state) => ({ tools: state.tools.filter(t => t.name !== name) })),
  updateTool: (oldName, tool) => set((state) => ({
    tools: state.tools.map(t => t.name === oldName ? tool : t)
  })),

  turns: [],
  addTurn: (turn) => set((state) => {
    let name = turn.name;
    if (!name && turn.role === 'user') {
      name = state.userName;
    } else if (!name && turn.role === 'agent') {
      if (state.template === 'shy-girl') name = 'Sara Levi';
      else if (state.template === 'mean-girl') name = 'Britney Valentine';
      else if (state.template === 'giselle-boutique') name = 'Giselle Laurier';
      else name = 'Agent';
    } else if (!name && turn.role === 'system') {
      name = 'System';
    }

    const nextTurns = [...state.turns, { ...turn, id: Math.random().toString(36).substring(7), timestamp: new Date(), name }];
    return {
      turns: pruneTurns(state.systemPrompt, state.userInfo, state.userName, state.isUserInfoEnabled, nextTurns, state.maxContextSize, state.targetContextSize)
    };
  }),
  updateLastTurn: (update) => set((state) => {
    if (state.turns.length === 0) return state;
    const newTurns = [...state.turns];
    newTurns[newTurns.length - 1] = { ...newTurns[newTurns.length - 1], ...update };
    return { turns: pruneTurns(state.systemPrompt, state.userInfo, state.userName, state.isUserInfoEnabled, newTurns, state.maxContextSize, state.targetContextSize) };
  }),
  updateTurn: (id, update) => set((state) => {
    const newTurns = state.turns.map(t => t.id === id ? { ...t, ...update } : t);
    return { turns: pruneTurns(state.systemPrompt, state.userInfo, state.userName, state.isUserInfoEnabled, newTurns, state.maxContextSize, state.targetContextSize) };
  }),
  removeTurn: (id) => set((state) => ({
    turns: state.turns.filter(t => t.id !== id)
  })),
  clearTurns: () => set({ turns: [] }),
  setTurns: (turns) => set((state) => ({
    turns: pruneTurns(state.systemPrompt, state.userInfo, state.userName, state.isUserInfoEnabled, turns, state.maxContextSize, state.targetContextSize)
  })),

  showSystemMessages: true,
  toggleSystemMessages: () => set((state) => ({ showSystemMessages: !state.showSystemMessages })),
  showAgentThinking: true,
  toggleAgentThinking: () => set((state) => ({ showAgentThinking: !state.showAgentThinking })),
}));
