import { useState, useEffect } from 'react';
import { Tool } from '../lib/types';
import { X } from 'lucide-react';

export function ToolModal({ tool, onClose, onSave }: { tool: Tool | null, onClose: () => void, onSave: (tool: Tool) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parameters, setParameters] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (tool) {
      setName(tool.name);
      setDescription(tool.description);
      setParameters(JSON.stringify(tool.parameters, null, 2));
    }
  }, [tool]);

  if (!tool) return null;

  const handleSave = () => {
    try {
      const parsed = JSON.parse(parameters);
      onSave({ ...tool, name, description, parameters: parsed });
    } catch (e) {
      setError('Invalid JSON parameters');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
       <div className="bg-bg-panel border border-border rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <h2 className="text-lg font-semibold text-text-primary">Edit Function Call</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"><X size={20} /></button>
        </div>
        <div className="p-5 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="bg-bg-input border border-border rounded-xl p-3 text-sm focus:border-accent outline-none transition-colors" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="bg-bg-input border border-border rounded-xl p-3 text-sm focus:border-accent outline-none h-24 resize-none transition-colors" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Parameters (JSON Schema)</label>
  <textarea value={parameters} onChange={e => {setParameters(e.target.value); setError('');}} className="bg-bg-input border border-border rounded-xl p-3 text-sm focus:border-accent outline-none h-64 font-mono resize-none transition-colors" />
            {error && <span className="text-red-400 text-xs font-medium">{error}</span>}
          </div>
        </div>
        <div className="p-5 border-t border-border/50 flex justify-end gap-3 bg-bg-input/30 rounded-b-2xl">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-bg-input hover:bg-border text-sm font-medium transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-5 py-2.5 rounded-xl bg-accent text-[#2c2838] font-semibold hover:opacity-90 text-sm transition-opacity">Save</button>
        </div>
      </div>
    </div>
  );
}
