import React, { createContext, useContext, useState, useRef, useCallback, ReactNode } from 'react';
import { GoogleGenAI, Session, Modality, LiveServerMessage } from '@google/genai';
import { useAppState } from './state';
import { AudioStreamer } from './audio-streamer';
import { AudioRecorder } from './audio-recorder';

interface LiveAPIContextType {
  connected: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  session: Session | null;
}

const LiveAPIContext = createContext<LiveAPIContextType | undefined>(undefined);

export function LiveAPIProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const sessionRef = useRef<Session | null>(null);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const currentAudioDataRef = useRef<string[]>([]);
  const currentUserAudioDataRef = useRef<string[]>([]);
  
  const connect = useCallback(async () => {
    if (connected || connecting) return;
    setConnecting(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const state = useAppState.getState();
      
      const functionDeclarations = state.tools.filter(t => t.isEnabled).map(t => {
        const hasProps = t.parameters && t.parameters.properties && Object.keys(t.parameters.properties).length > 0;
        return {
          name: t.name,
          description: t.description,
          ...(hasProps ? { parameters: t.parameters } : {})
        };
      });

      const audioCtx = new AudioContext({ sampleRate: 24000 });
      audioStreamerRef.current = new AudioStreamer(audioCtx);
      audioRecorderRef.current = new AudioRecorder(16000);
      
      // Build session continuity history for the system instruction
      const completedTurns = [...state.turns].filter(t => t.role === 'user' || t.role === 'agent');
      
      let historyContextText = '';
      let pendingUserTurn: any = null;
      
      if (completedTurns.length > 0) {
        const lastTurn = completedTurns[completedTurns.length - 1];
        if (lastTurn.role === 'user') {
          // If the last turn was from the user, keep it as the pending turn to trigger a reply on connection open.
          pendingUserTurn = lastTurn;
          // Format everything else up to this point
          const previousTurns = completedTurns.slice(0, completedTurns.length - 1);
          if (previousTurns.length > 0) {
            const formattedLines: string[] = [];
            previousTurns.forEach(t => {
              const speaker = t.role === 'user' ? 'User' : 'Agent';
              const text = t.text || (t.role === 'agent' ? '(Interrupted)' : '(Audio)');
              
              if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1].startsWith(`${speaker}:`)) {
                formattedLines[formattedLines.length - 1] += ` ${text}`;
              } else {
                formattedLines.push(`${speaker}: ${text}`);
              }
            });
            historyContextText = `\n\n=== RECENT CONVERSATION HISTORY ===\n${formattedLines.join('\n')}\n===================================`;
          }
        } else {
          // Format all turns
          const formattedLines: string[] = [];
          completedTurns.forEach(t => {
            const speaker = t.role === 'user' ? 'User' : 'Agent';
            const text = t.text || (t.role === 'agent' ? '(Interrupted)' : '(Audio)');
            
            if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1].startsWith(`${speaker}:`)) {
              formattedLines[formattedLines.length - 1] += ` ${text}`;
            } else {
              formattedLines.push(`${speaker}: ${text}`);
            }
          });
          historyContextText = `\n\n=== RECENT CONVERSATION HISTORY ===\n${formattedLines.join('\n')}\n===================================`;
        }
      }

      // Map UI selected model to the appropriate Live API endpoint identifier
      let liveModel = state.model || 'gemini-3.1-pro-preview';
      if (liveModel === 'gemini-3.1-pro-preview') {
        liveModel = 'gemini-3.1-flash-live-preview';
      }

      const hasThinking = state.model === 'gemini-3.8-live-extended-thinking'
        ? true
        : state.model === 'gemini-3.1-pro-preview'
          ? state.thinkingLevel !== 'none'
          : false;

      const thinkingLevelValue = (
        state.model === 'gemini-3.8-live-extended-thinking' && state.thinkingLevel === 'none'
          ? 'LOW'
          : state.thinkingLevel.toUpperCase()
      ) as any;

      const sessionPromise = ai.live.connect({
        model: liveModel,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: state.voice }
            }
          },
          ...(hasThinking ? { 
            thinkingConfig: { 
              thinkingLevel: thinkingLevelValue,
              includeThoughts: true
            }
          } : {}),
          systemInstruction: { parts: [{ text: `User Name: ${state.userName}\n${state.isUserInfoEnabled ? `User Info: ${state.userInfo}\n\n` : ''}${state.systemPrompt}${historyContextText}` }] },
          tools: functionDeclarations.length > 0 ? [{ functionDeclarations }] : undefined,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setConnected(true);
            setConnecting(false);
            
            sessionPromise.then((session) => {
              sessionRef.current = session;
              if (pendingUserTurn) {
                const parts: any[] = [];
                if (pendingUserTurn.images && pendingUserTurn.images.length > 0) {
                  pendingUserTurn.images.forEach((img: string) => {
                    const match = img.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
                    if (match) {
                      parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
                    }
                  });
                }
                if (pendingUserTurn.text) {
                  parts.push({ text: pendingUserTurn.text });
                } else if (!pendingUserTurn.images || pendingUserTurn.images.length === 0) {
                  parts.push({ text: "(Audio)" });
                }
                
                // Trigger model reply by sending ONLY a clean, user-role content turn.
                session.sendClientContent({ 
                  turns: [{ role: 'user', parts }], 
                  turnComplete: true 
                });
              }

              audioRecorderRef.current?.start((base64) => {
                session.sendRealtimeInput({ audio: { mimeType: 'audio/pcm;rate=16000', data: base64 } });
                currentUserAudioDataRef.current.push(base64);
              });
            });
          },
          onclose: () => {
            setConnected(false);
            setConnecting(false);
            audioStreamerRef.current?.stop();
            audioRecorderRef.current?.stop();
          },
          onerror: (err) => {
            console.error('Live API Error:', err);
            setConnecting(false);
            setConnected(false);
            useAppState.getState().addTurn({
              role: 'system',
              text: `Live API Error: ${(err as any)?.message || String(err) || 'Connection failed'}`,
              isFinal: true
            });
          },
          onmessage: (msg: LiveServerMessage) => {
            if (msg.serverContent) {
              const { modelTurn, interrupted, turnComplete, inputTranscription, outputTranscription } = msg.serverContent;
              
              if (interrupted) {
                audioStreamerRef.current?.stop();
                currentAudioDataRef.current = [];
              }
              
              if (modelTurn) {
                console.log('modelTurn parts:', modelTurn.parts);
                const audioParts = modelTurn.parts.filter(p => p.inlineData?.mimeType?.startsWith('audio/pcm'));
                audioParts.forEach(p => {
                  if (p.inlineData?.data) {
                    audioStreamerRef.current?.addPCM16(p.inlineData.data);
                    currentAudioDataRef.current.push(p.inlineData.data);
                  }
                });

                const thoughtParts = modelTurn.parts.filter(p => p.thought && p.text);
                const combinedThoughts = thoughtParts.map(p => p.text).join('');
                if (combinedThoughts) {
                  const state = useAppState.getState();
                  const lastTurn = state.turns[state.turns.length - 1];
                  if (lastTurn?.role === 'agent' && !lastTurn.isFinal) {
                    state.updateLastTurn({ thinkingText: (lastTurn.thinkingText || '') + combinedThoughts });
                  } else {
                    state.addTurn({ role: 'agent', thinkingText: combinedThoughts, isFinal: false, text: '' });
                  }
                }
              }

              if (inputTranscription) {
                const state = useAppState.getState();
                const lastTurn = state.turns[state.turns.length - 1];
                if (lastTurn?.role === 'user' && !lastTurn.isFinal) {
                  state.updateLastTurn({ text: lastTurn.text + (inputTranscription.text || ''), isFinal: inputTranscription.finished, audioData: [...currentUserAudioDataRef.current] });
                } else {
                  state.addTurn({ role: 'user', text: inputTranscription.text || '', isFinal: inputTranscription.finished, audioData: [...currentUserAudioDataRef.current] });
                }

                if (inputTranscription.finished) {
                  currentUserAudioDataRef.current = [];
                  if (typeof (window as any).__getLatestScreenShareClip === 'function') {
                    (window as any).__getLatestScreenShareClip().then((clip: string | null) => {
                      if (clip) {
                        const state = useAppState.getState();
                        const userTurn = [...state.turns].reverse().find(t => t.role === 'user');
                        if (userTurn) {
                          state.updateTurn(userTurn.id, { video: clip });
                        }
                      }
                    });
                  }
                }
              }

              if (outputTranscription) {
                const state = useAppState.getState();
                const lastTurn = state.turns[state.turns.length - 1];
                if (lastTurn?.role === 'agent' && !lastTurn.isFinal) {
                  state.updateLastTurn({ text: lastTurn.text + (outputTranscription.text || ''), isFinal: outputTranscription.finished, audioData: [...currentAudioDataRef.current] });
                } else {
                  state.addTurn({ role: 'agent', text: outputTranscription.text || '', isFinal: outputTranscription.finished, audioData: [...currentAudioDataRef.current] });
                }
              }

              if (turnComplete) {
                currentAudioDataRef.current = [];
                const state = useAppState.getState();
                const lastTurn = state.turns[state.turns.length - 1];
                if (lastTurn?.role === 'agent') {
                  state.updateLastTurn({ isFinal: true });
                }
              }
            }
            
            if (msg.toolCall) {
              const responses = msg.toolCall.functionCalls.map(fc => {
                useAppState.getState().addTurn({ role: 'system', text: `Tool called: ${fc.name}`, isFinal: true });
                return {
                  id: fc.id,
                  name: fc.name,
                  response: { status: "ok", message: "Tool executed successfully." }
                };
              });
              sessionPromise.then((session) => {
                session.sendToolResponse({ functionResponses: responses });
              });
            }
          }
        }
      });
      
      sessionRef.current = await sessionPromise;
      
    } catch (err) {
      console.error(err);
      setConnecting(false);
      setConnected(false);
      useAppState.getState().addTurn({
        role: 'system',
        text: `Live API Connection Error: ${(err as any)?.message || String(err) || 'Connection failed'}`,
        isFinal: true
      });
    }
  }, [connected, connecting]);
  
  const disconnect = useCallback(() => {
    sessionRef.current?.close();
    sessionRef.current = null;
    audioStreamerRef.current?.stop();
    audioRecorderRef.current?.stop();
    setConnected(false);
  }, []);
  
  return (
    <LiveAPIContext.Provider value={{ connected, connecting, connect, disconnect, session: sessionRef.current }}>
      {children}
    </LiveAPIContext.Provider>
  );
}

export function useLiveAPI() {
  const context = useContext(LiveAPIContext);
  if (context === undefined) {
    throw new Error('useLiveAPI must be used within a LiveAPIProvider');
  }
  return context;
}
