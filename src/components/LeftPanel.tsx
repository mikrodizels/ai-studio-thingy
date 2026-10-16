import { useAppState, estimateTokens } from '../lib/state';
import { Play, Square, Download, RefreshCw, Terminal, Brain, Upload, Info, Eye, EyeOff } from 'lucide-react';
import { useLiveAPI } from '../lib/useLiveAPI';
import React, { useRef, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { UserInfoModal } from './UserInfoModal';

export function LeftPanel() {
  const { userName, userInfo, setUserName, setUserInfo, showSystemMessages, toggleSystemMessages, showAgentThinking, toggleAgentThinking, clearTurns, turns, setTurns, systemPrompt, maxContextSize, isUserInfoEnabled, toggleUserInfoEnabled } = useAppState();
  const { connected, connecting, connect, disconnect } = useLiveAPI();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const tokenUsage = useMemo(() => estimateTokens(systemPrompt, userInfo, userName, isUserInfoEnabled, turns), [systemPrompt, userInfo, userName, isUserInfoEnabled, turns]);
  const [isUserInfoModalOpen, setIsUserInfoModalOpen] = useState(false);

  const handleExportLogs = () => {
    const logs = turns.map(t => {
      let log = `[${t.timestamp.toISOString()}] ${t.role.toUpperCase()}:\n`;
      if (t.name) log += `Name: ${t.name}\n`;
      if (t.thinkingText) log += `(Thinking: ${t.thinkingText})\n`;
      if (t.text) log += `${t.text}\n`;
      return log;
    }).join('\n----------------------------------------\n\n');

    const exportData = JSON.stringify(turns.map(t => ({
      id: t.id,
      timestamp: t.timestamp,
      role: t.role,
      name: t.name,
      text: t.text,
      isFinal: t.isFinal
    })));

    const fileContent = `${logs}\n\n=== EXPORT DATA ===\n${exportData}`;

    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportLogs = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const exportDataMatch = content.split('=== EXPORT DATA ===\n');
      if (exportDataMatch.length >= 2) {
        try {
          const parsedTurns = JSON.parse(exportDataMatch[1].trim());
          const filteredTurns = parsedTurns
            .filter((t: any) => t.role !== 'system')
            .map((t: any) => ({
              ...t,
              timestamp: new Date(t.timestamp),
              audioData: undefined,
              thinkingText: undefined
            }));
          setTurns(filteredTurns);
        } catch (err) {
          console.error("Failed to parse imported file", err);
        }
      } else {
        alert("Invalid file format. Please select a valid exported chat logs file.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-80 bg-[#322c42]/80 backdrop-blur-xl border border-[#ffffff15] shadow-2xl rounded-3xl p-6 flex flex-col gap-6 shrink-0 overflow-y-auto">
      <div className="flex flex-col gap-2">
        <label className="text-sm text-text-secondary mt-0">You</label>
        <input 
          type="text" 
          value={userName} 
          onChange={e => setUserName(e.target.value)}
          className="bg-bg-input border border-border rounded-lg p-3 text-sm focus:outline-none focus:border-accent"
        />
      </div>
      <div className="flex flex-col gap-2 relative">
        <label className="text-sm text-text-secondary">About you</label>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsUserInfoModalOpen(true)}
            className="flex-1 bg-bg-input border border-border rounded-lg p-3 text-sm text-text-primary hover:bg-white/5 transition-colors focus:outline-none focus:border-accent"
          >
            Your backstory
          </button>
          <button
            onClick={toggleUserInfoEnabled}
            className={`w-[20%] flex items-center justify-center rounded-lg transition-colors border ${isUserInfoEnabled ? 'border-accent/20 text-accent bg-accent/10 hover:bg-accent/20' : 'border-border text-text-secondary bg-bg-input hover:bg-white/5'}`}
            title="Toggle backstory in context"
          >
            {isUserInfoEnabled ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 mt-auto">
        <div className="flex items-center justify-between text-sm text-text-primary px-1 select-none font-bold">
          <span>Context Usage:</span>
          <span>{tokenUsage.totalTokens} / {maxContextSize}</span>
        </div>

        <input 
          type="file"
          accept=".txt"
          ref={fileInputRef}
          onChange={handleImportLogs}
          className="hidden"
        />
        <div className="flex justify-between items-center px-2">
          <button onClick={toggleSystemMessages} className={`p-2 rounded-lg transition-colors ${showSystemMessages ? 'text-accent bg-accent/10' : 'text-text-secondary hover:bg-bg-input'}`} title="Toggle System Messages">
            <Terminal size={18} />
          </button>
          <button onClick={toggleAgentThinking} className={`p-2 rounded-lg transition-colors ${showAgentThinking ? 'text-accent bg-accent/10' : 'text-text-secondary hover:bg-bg-input'}`} title="Toggle Agent Thinking">
            <Brain size={18} />
          </button>
          <button onClick={handleExportLogs} className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-input transition-colors" title="Export Logs">
            <Download size={18} />
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-input transition-colors" title="Import Logs">
            <Upload size={18} />
          </button>
          <button onClick={clearTurns} className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-input transition-colors" title="Reset Chat">
            <RefreshCw size={18} />
          </button>
        </div>
        
        <button 
          onClick={connected ? disconnect : connect}
          disabled={connecting}
          className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl border font-medium transition-all ${connected ? 'border-red-400/50 text-red-400 bg-red-400/10 hover:bg-red-400/20' : 'border-border text-text-primary hover:bg-bg-input'}`}
        >
          {connected ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          {connected ? 'Stop Streaming' : connecting ? 'Connecting...' : 'Start Streaming'}
        </button>
      </div>

      {isUserInfoModalOpen && createPortal(
        <UserInfoModal 
          userInfo={userInfo} 
          onClose={() => setIsUserInfoModalOpen(false)} 
          onSave={(newInfo) => {
            setUserInfo(newInfo);
            setIsUserInfoModalOpen(false);
          }} 
        />,
        document.body
      )}
    </div>
  );
}
