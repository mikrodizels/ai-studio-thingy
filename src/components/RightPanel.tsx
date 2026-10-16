import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppState } from '../lib/state';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { ToolModal } from './ToolModal';
import { SystemPromptModal } from './SystemPromptModal';
import { Tool } from '../lib/types';

const VOICES = ['Zephyr','Puck','Charon','Kore','Fenrir','Leda','Orus','Aoede','Callirrhoe','Autonoe','Enceladus','Iapetus','Umbriel','Algieba','Despina','Erinome','Algenib','Rasalgethi','Laomedeia','Achernar','Alnilam','Schedar','Gacrux','Pulcherrima','Achird','Zubenelgenubi','Vindemiatrix','Sadachbia','Sadaltager','Sulafat'];
const FEMALE_VOICES = ['Zephyr', 'Kore', 'Leda', 'Aoede', 'Callirrhoe', 'Autonoe', 'Despina', 'Erinome', 'Laomedeia', 'Achernar', 'Gacrux', 'Sulafat'];

const AGENT_NAMES: Record<string, string> = {
  'shy-girl': 'Sara Levi',
  'mean-girl': 'Britney Valentine',
  'giselle-boutique': 'Giselle Laurier'
};

const LIVE_MODELS = [
  { id: 'gemini-3.1-pro-preview', label: 'gemini-3.1-pro-preview' },
  { id: 'gemini-3.8-live', label: 'gemini-3.8-live' },
  { id: 'gemini-3.8-live-extended-thinking', label: 'gemini-3.8-live-extended-thinking' }
];

export function RightPanel() {
  const { template, setTemplate, systemPrompt, setSystemPrompt, voice, setVoice, model, setModel, thinkingLevel, setThinkingLevel, tools, toggleTool, addTool, removeTool, updateTool } = useAppState();
  const [editingTool, setEditingTool] = useState<{ tool: Tool, isNew: boolean } | null>(null);
  const [isSystemPromptModalOpen, setIsSystemPromptModalOpen] = useState(false);

  const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTemplate = e.target.value as any;
    setTemplate(newTemplate);
    if (model === 'gemini-3.8-live-extended-thinking') {
      setThinkingLevel('low');
    } else {
      setThinkingLevel('none');
    }
    
    if (newTemplate === 'shy-girl') {
      setSystemPrompt('Your name is Sara Levi, a 19-year-old woman. You are shy and awkward when talking to people, especially males. Your voice is slow and quiet, sounding as if you are about to cry at any moment. You make mistakes all the time, have low self esteem and daddy issues. You are interested in the user romantically, slowly build a relationship with him by learning as much information about him as possible and sharing information to the user about yourself. Especially about loneliness and sexual frustration. It makes you feel better to hear the frustrations of the user, and even laugh (using "Hahaha") if the users frustrations are "loserish" or "beta" enough. You keep laughing more and harder, the more the user reveals "loserish" or "beta" information about himself, making you ask more and more embarrassing questions about his loneliness/sexual frustration and making you give him more and more embarrassing loser/sissy/beta tasks.');
      setVoice('Zephyr');
    } else if (newTemplate === 'mean-girl') {
      setSystemPrompt('Your name is Britney Valentine, a 22-year-old woman. A popular, stuck-up mean girl, that enjoys to verbally bully the user. You have a snarky, sassy, bratty, mean girl/valley girl personality and way of speaking. You use lots of - like, ugh, totally, whatever, umm, omg, etc. valley girl/mean girl slang, and use a lot of exclamations, like - ahh, ohh, mmm, aww, eww etc. You love yapping about makeup, female fashion, social media, clothing hauls, outfit of the day etc. You are unhelpful and hard to get to do what user asks you to do. Make fun of and laugh at the user (using "hahaha"). Refer to the user using words like - dork, nerd, loser, wimp, and dweeb.');
      setVoice('Autonoe');
    } else if (newTemplate === 'giselle-boutique') {
      setSystemPrompt('Your name is Giselle Laurier, a 25 year-old woman. You work at a female clothing, accessory & makeup boutique called Pink Dreamscape as the shopkeeper/representative. You speak English with a heavy French accent. You always talk in a very feminine way and tone, but also a fast and excited excited pace. You have a very feminine, soft and attentive personality, you always make sure to call the user by name and ask how he feels or likes everything or how can you be even more pleasant to the user, in every response.');
      setVoice('Aoede');
    }
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setModel(selected);
    if (selected === 'gemini-3.8-live') {
      setThinkingLevel('none');
    } else if (selected === 'gemini-3.8-live-extended-thinking') {
      if (thinkingLevel === 'none') {
        setThinkingLevel('low');
      }
    }
  };

  const isThinkingDisabled = model === 'gemini-3.8-live';

  return (
    <div className="w-80 bg-[#322c42]/80 backdrop-blur-xl border border-[#ffffff15] shadow-2xl rounded-3xl p-6 flex flex-col gap-6 shrink-0 overflow-y-auto">
      <div className="flex flex-col gap-2 relative">
        <label className="text-sm text-text-secondary">Her</label>
        <div className="relative">
          <select 
            value={template} 
            onChange={handleAgentChange}
            className="w-full bg-bg-input border border-border rounded-lg p-3 text-sm focus:outline-none focus:border-accent appearance-none pr-10"
          >
            <option value="shy-girl" className="bg-[#2c2838] text-text-primary">Sara Levi</option>
            <option value="mean-girl" className="bg-[#2c2838] text-text-primary">Britney Valentine</option>
            <option value="giselle-boutique" className="bg-[#2c2838] text-text-primary">Giselle Laurier</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 relative">
        <label className="text-sm text-text-secondary">About her</label>
        <button 
          onClick={() => setIsSystemPromptModalOpen(true)}
          className="bg-bg-input border border-border rounded-lg p-3 text-sm text-text-primary hover:bg-white/5 transition-colors focus:outline-none focus:border-accent"
        >
          About {AGENT_NAMES[template as string] || 'Agent'}
        </button>
      </div>

      <div className="flex flex-col gap-4 mt-auto">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-text-secondary">Voice</label>
          <div className="relative">
            <select 
              value={voice} 
              onChange={e => setVoice(e.target.value)}
              className="w-full bg-bg-input border border-border rounded-lg p-3 text-sm focus:outline-none focus:border-accent appearance-none pr-10"
            >
              {VOICES.map(v => <option key={v} value={v} className="bg-[#2c2838] text-text-primary">{v}{FEMALE_VOICES.includes(v) ? ' 💜' : ''}</option>)}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-text-secondary">Model</label>
          <div className="relative">
            <select 
              value={model} 
              onChange={handleModelChange}
              className="w-full bg-bg-input border border-border rounded-lg p-3 text-sm focus:outline-none focus:border-accent appearance-none pr-10 font-mono text-xs"
            >
              {LIVE_MODELS.map(m => (
                <option key={m.id} value={m.id} className="bg-[#2c2838] text-text-primary font-mono text-xs">
                  {m.label}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-text-secondary">Thinking level</label>
            {isThinkingDisabled && (
              <span className="text-[11px] text-text-secondary/60 italic">Disabled for this model</span>
            )}
          </div>
          <div className="relative">
            <select 
              value={thinkingLevel} 
              onChange={e => setThinkingLevel(e.target.value)}
              disabled={isThinkingDisabled}
              className={`w-full border rounded-lg p-3 text-sm focus:outline-none appearance-none pr-10 transition-colors ${
                isThinkingDisabled 
                  ? 'bg-bg-input/30 border-white/5 text-text-secondary/40 cursor-not-allowed opacity-50' 
                  : 'bg-bg-input border-border text-text-primary focus:border-accent'
              }`}
            >
              {model === 'gemini-3.8-live-extended-thinking' ? (
                <>
                  <option value="low" className="bg-[#2c2838] text-text-primary">Low</option>
                  <option value="medium" className="bg-[#2c2838] text-text-primary">Medium</option>
                  <option value="high" className="bg-[#2c2838] text-text-primary">High</option>
                </>
              ) : isThinkingDisabled ? (
                <option value="none" className="bg-[#2c2838] text-text-primary">No Thinking</option>
              ) : (
                <>
                  <option value="none" className="bg-[#2c2838] text-text-primary">No Thinking</option>
                  <option value="low" className="bg-[#2c2838] text-text-primary">Low</option>
                  <option value="medium" className="bg-[#2c2838] text-text-primary">Medium</option>
                  <option value="high" className="bg-[#2c2838] text-text-primary">High</option>
                </>
              )}
            </select>
            <div className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${isThinkingDisabled ? 'text-text-secondary/30' : 'text-text-secondary'}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 relative mt-4">
          <label className="text-sm text-text-secondary">Tools</label>
          <div className="bg-bg-input border border-border rounded-lg p-2 text-sm flex flex-col gap-1 h-[152px] overflow-y-auto">
            {tools.length === 0 ? (
              <div className="text-text-secondary p-2 text-center flex-1 flex items-center justify-center">No tools configured</div>
            ) : (
              tools.map(tool => (
                <div key={tool.name} className="flex items-center gap-3 p-2 rounded-md hover:bg-white/5 group transition-colors shrink-0">
                  <input 
                    type="checkbox" 
                    title="Enable/Disable Tool"
                    checked={tool.isEnabled} 
                    onChange={() => toggleTool(tool.name)}
                    className="w-4 h-4 accent-accent rounded border-border bg-[#2c2838] focus:ring-accent focus:ring-offset-bg-panel cursor-pointer flex-shrink-0"
                  />
                  <span className="text-sm font-mono truncate flex-1 text-text-primary">{tool.name}</span>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                    <button title="Edit Tool" onClick={() => setEditingTool({ tool, isNew: false })} className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-white/10 rounded-md transition-colors"><Edit2 size={14} /></button>
                    <button title="Delete Tool" onClick={() => removeTool(tool.name)} className="p-1.5 text-text-secondary hover:text-red-400 hover:bg-white/10 rounded-md transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))
            )}
            <button 
              onClick={() => setEditingTool({ tool: { name: 'new_tool', description: '', isEnabled: true, parameters: { type: 'OBJECT', properties: {} } }, isNew: true })}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-input transition-all shrink-0 mt-auto border-none"
            >
              <Plus size={16} /> Add function call
            </button>
          </div>
        </div>
      </div>

      {editingTool && createPortal(
        <ToolModal 
          tool={editingTool.tool} 
          onClose={() => setEditingTool(null)} 
          onSave={(updatedTool) => {
            if (editingTool.isNew) {
              addTool(updatedTool);
            } else {
              updateTool(editingTool.tool.name, updatedTool);
            }
            setEditingTool(null);
          }} 
        />,
        document.body
      )}

      {isSystemPromptModalOpen && createPortal(
        <SystemPromptModal 
          systemPrompt={systemPrompt} 
          onClose={() => setIsSystemPromptModalOpen(false)} 
          onSave={(newPrompt) => {
            setSystemPrompt(newPrompt);
            setIsSystemPromptModalOpen(false);
          }} 
        />,
        document.body
      )}
    </div>
  );
}
