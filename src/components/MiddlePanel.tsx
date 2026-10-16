import React, { useState, useRef, useEffect } from 'react';
import { useAppState } from '../lib/state';
import { Send, Image as ImageIcon, Monitor, MonitorOff, X, Copy, Trash2, RefreshCw, Edit2, Download } from 'lucide-react';
import { useLiveAPI } from '../lib/useLiveAPI';
import { useScreenShare } from '../lib/ScreenShareContext';
import { GoogleGenAI } from '@google/genai';

export function MiddlePanel() {
  const { turns, addTurn, updateTurn, removeTurn, showSystemMessages, showAgentThinking } = useAppState();
  const { connected, session } = useLiveAPI();
  const { isScreenSharing, startScreenShare, stopScreenShare, getLatestClip } = useScreenShare();

  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImage, setUploadedImage] = useState<{data: string, mimeType: string} | null>(null);
  const [editingTurnId, setEditingTurnId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns]);

  const handleSend = async () => {
    if (!input.trim() && !uploadedImage) return;

    let videoClipUrl: string | undefined = undefined;
    if (isScreenSharing) {
      const clip = await getLatestClip();
      if (clip) videoClipUrl = clip;
    }

    addTurn({ 
      role: 'user', 
      text: input, 
      isFinal: true,
      images: uploadedImage ? [`data:${uploadedImage.mimeType};base64,${uploadedImage.data}`] : undefined,
      video: videoClipUrl
    });
    
    if (connected && session) {
      if (uploadedImage) {
        session.sendRealtimeInput({
          video: {
            mimeType: uploadedImage.mimeType,
            data: uploadedImage.data
          }
        });
      }
      
      if (input || !uploadedImage) {
        session.sendRealtimeInput({ text: input || "Please look at this image." });
      }
    }
    
    setInput('');
    setUploadedImage(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = (reader.result as string).split(',')[1];
      const mimeType = file.type;
      
      setUploadedImage({ data: base64Data, mimeType });
      addTurn({ role: 'user', text: 'Uploaded an image.', images: [reader.result as string], isFinal: true });
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeImage = async () => {
    if (!uploadedImage) return;
    
    addTurn({ role: 'user', text: 'Analyze this image.', isFinal: true });
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          { inlineData: { data: uploadedImage.data, mimeType: uploadedImage.mimeType } },
          "Describe this image in detail."
        ]
      });
      
      addTurn({ role: 'system', text: `Image Analysis: ${response.text}`, isFinal: true });
      
      if (connected && session) {
        session.sendRealtimeInput({ text: `I just uploaded an image. Here is the analysis: ${response.text}` });
      }
    } catch (err) {
      console.error(err);
      addTurn({ role: 'system', text: 'Failed to analyze image.', isFinal: true });
    }
  };

  const downloadAudio = (base64DataList: string[], sampleRate: number = 24000) => {
    if (!base64DataList || base64DataList.length === 0) return;
    
    // Concatenate base64 pcm data
    const allBytes: number[] = [];
    for (const b64 of base64DataList) {
      const binary = atob(b64);
      for (let i = 0; i < binary.length; i++) {
        allBytes.push(binary.charCodeAt(i));
      }
    }
    
    const bytes = new Uint8Array(allBytes);
    
    // Create WAV header
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = bytes.length;
    const chunkSize = 36 + dataSize;
    
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    
    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, chunkSize, true);
    writeString(view, 8, 'WAVE');
    
    // fmt sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    
    // data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Write PCM data
    const pcmData = new Uint8Array(buffer, 44);
    pcmData.set(bytes);
    
    const blob = new Blob([buffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `response-${Date.now()}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 ml-[-16px] mr-[2px]">
        {turns.map(turn => {
          if (turn.role === 'system' && !showSystemMessages) return null;
          
          return (
            <div key={turn.id} className={`flex flex-col max-w-[85%] ${turn.role === 'user' ? 'self-end' : 'self-start'} group w-full`}>
              
              {turn.role === 'agent' && showAgentThinking && turn.thinkingText && (
                <div className="bg-[#2a2438]/80 backdrop-blur-md border border-[#ffffff15] rounded-2xl rounded-tl-sm p-4 mb-2 text-sm italic opacity-80">
                  {turn.thinkingText}
                </div>
              )}
              
              <div className={`flex flex-col p-4 rounded-3xl shadow-[0_4px_30px_rgba(0,0,0,0.2)] backdrop-blur-md border ${
                turn.role === 'user' 
                  ? 'bg-[#4a3559]/80 border-[#ffffff20] text-text-primary rounded-tr-sm self-end max-w-full' 
                  : turn.role === 'agent' 
                    ? 'bg-[#322c42]/80 border-[#ffffff15] text-text-primary rounded-tl-sm self-start max-w-full' 
                    : 'bg-transparent border-transparent text-center italic text-text-secondary self-center w-full'
              }`}>
                
                {turn.role !== 'system' && (
                  <div className="flex items-center justify-between gap-4 mb-2 w-full">
                    <div className="text-xs font-bold uppercase tracking-wider opacity-80" style={{ color: turn.role === 'user' ? '#e5cfff' : turn.role === 'agent' ? '#a8dab5' : 'var(--color-text-secondary)' }}>
                      {turn.name || turn.role}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity shrink-0">
                      <button onClick={() => navigator.clipboard.writeText(turn.text)} className="p-1 text-text-secondary hover:text-text-primary" title="Copy"><Copy size={12} /></button>
                      {(turn.role === 'user' || turn.role === 'agent') && (
                        <button onClick={() => {
                          setEditingTurnId(turn.id);
                          setEditInput(turn.text);
                        }} className="p-1 text-text-secondary hover:text-text-primary" title="Edit"><Edit2 size={12} /></button>
                      )}
                      {turn.role === 'agent' && (
                        <button onClick={() => {
                          if (connected && session) {
                            session.sendRealtimeInput({ text: "Please regenerate your last response." });
                          }
                        }} className="p-1 text-text-secondary hover:text-text-primary" title="Regenerate"><RefreshCw size={12} /></button>
                      )}
                      {turn.audioData && turn.audioData.length > 0 && (
                        <button onClick={() => downloadAudio(turn.audioData!, turn.role === 'user' ? 16000 : 24000)} className="p-1 text-text-secondary hover:text-text-primary" title="Download Audio"><Download size={12} /></button>
                      )}
                      <button onClick={() => removeTurn(turn.id)} className="p-1 text-text-secondary hover:text-text-primary" title="Remove"><Trash2 size={12} /></button>
                    </div>
                  </div>
                )}
                
                {editingTurnId === turn.id ? (
                  <div className={`flex flex-col gap-2 relative max-w-full`}>
                    <div className="grid max-w-full w-full">
                      <div 
                        className={`text-[15px] leading-relaxed whitespace-pre-wrap invisible col-start-1 row-start-1 break-words`}
                        aria-hidden="true"
                      >
                        {editInput + ' '}
                      </div>
                      <textarea 
                        autoFocus
                        value={editInput} 
                        onChange={e => setEditInput(e.target.value)}
                        onFocus={e => {
                          const val = e.target.value;
                          e.target.value = '';
                          e.target.value = val;
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            updateTurn(turn.id, { text: editInput });
                            setEditingTurnId(null);
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setEditingTurnId(null);
                          }
                        }}
                        className={`w-full h-full col-start-1 row-start-1 text-[15px] leading-relaxed resize-none outline-none overflow-hidden bg-transparent border-none text-text-primary focus:ring-accent rounded`}
                      />
                    </div>
                    <div className={`flex gap-2`}>
                      <button onClick={() => {
                        updateTurn(turn.id, { text: editInput });
                        setEditingTurnId(null);
                      }} className="text-xs bg-accent text-[#2c2838] px-3 py-1.5 rounded font-medium hover:opacity-90">Save</button>
                      <button onClick={() => setEditingTurnId(null)} className="text-xs border border-white/20 px-3 py-1.5 rounded hover:bg-white/10 text-text-primary">Cancel</button>
                    </div>
                  </div>
                ) : (
                  turn.text && (
                    <div className="text-[15px] leading-relaxed whitespace-pre-wrap">
                      {turn.text}
                    </div>
                  )
                )}
                
                {turn.video && (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-[#ffffff18] shadow-2xl bg-black/60 max-w-md w-full">
                    <div className="bg-[#2a2438] px-3 py-1.5 flex items-center justify-between border-b border-white/10 text-xs text-text-secondary">
                      <span className="flex items-center gap-1.5 font-medium text-accent">
                        <Monitor size={14} /> Screen Feed Clip
                      </span>
                    </div>
                    <video 
                      src={turn.video} 
                      controls 
                      playsInline
                      className="w-full max-h-64 object-contain bg-black" 
                    />
                  </div>
                )}

                {turn.images && turn.images.map((img, idx) => (
                  <img key={idx} src={img} alt="attachment" className="mt-3 max-w-sm rounded-lg border border-[#ffffff15]" />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 shrink-0 relative mb-[-16px] -mx-4">
        {uploadedImage && (
          <div className="absolute bottom-full mb-4 left-4 bg-[#322c42]/80 backdrop-blur-md p-2 rounded-2xl border border-[#ffffff15] flex items-center gap-3 shadow-2xl">
            <img src={`data:${uploadedImage.mimeType};base64,${uploadedImage.data}`} className="h-12 w-12 object-cover rounded-xl" />
            <button onClick={handleAnalyzeImage} className="text-xs bg-accent text-[#2c2838] px-3 py-1.5 rounded-lg font-medium hover:opacity-90">Analyze</button>
            <button onClick={() => setUploadedImage(null)} className="p-1 text-text-secondary hover:text-text-primary"><X size={16} /></button>
          </div>
        )}

        <div className="bg-[#322c42]/80 backdrop-blur-xl border border-[#ffffff15] shadow-2xl rounded-full flex items-center p-2 gap-2">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-transparent border-none outline-none px-4 text-sm text-text-primary placeholder:text-text-secondary"
          />
          
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
          
          <button onClick={() => fileInputRef.current?.click()} className="p-2 text-text-secondary hover:bg-white/10 rounded-full transition-colors" title="Upload Image">
            <ImageIcon size={20} />
          </button>
          
          {!isScreenSharing ? (
            <button 
              onClick={startScreenShare} 
              disabled={!connected}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full flex items-center gap-1.5 shrink-0 transition-all ${
                connected 
                  ? 'bg-accent/20 border border-accent/40 text-accent hover:bg-accent/30 cursor-pointer shadow-sm' 
                  : 'bg-white/5 border border-white/10 text-text-secondary opacity-40 cursor-not-allowed'
              }`} 
              title={connected ? "Share Screen" : "Share Screen (Available during live call)"}
            >
              <Monitor size={16} />
              <span>Share Screen</span>
            </button>
          ) : (
            <button 
              onClick={stopScreenShare} 
              disabled={!connected}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-full bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 flex items-center gap-1.5 shrink-0 transition-all cursor-pointer animate-pulse shadow-sm" 
              title="Stop Share Screen"
            >
              <MonitorOff size={16} />
              <span>Stop Share Screen</span>
            </button>
          )}
          
          <button onClick={handleSend} disabled={!input.trim() && !uploadedImage} className={`p-2 text-[#2c2838] bg-accent hover:opacity-90 rounded-full transition-colors disabled:opacity-50`}>
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
