import React, { useState } from 'react';
import { X } from 'lucide-react';

export interface UserInfoModalProps {
  userInfo: string;
  onClose: () => void;
  onSave: (info: string) => void;
}

export function UserInfoModal({ userInfo, onClose, onSave }: UserInfoModalProps) {
  const [info, setInfo] = useState(userInfo);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-bg-panel border border-border rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <h2 className="text-lg font-semibold text-text-primary">Your Backstory</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"><X size={20} /></button>
        </div>
        
        <div className="p-6 flex flex-col gap-6 overflow-y-auto max-h-[70vh]">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">About you</label>
            <textarea 
              value={info} 
              onChange={e => setInfo(e.target.value)} 
              className="bg-bg-input border border-border rounded-xl p-4 text-sm focus:border-accent outline-none h-96 resize-none transition-colors text-text-primary" 
              placeholder="Enter your backstory here..."
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-border/50 bg-black/20 rounded-b-2xl">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-text-primary bg-bg-input border border-border hover:bg-white/5 transition-colors">Cancel</button>
          <button 
            onClick={() => onSave(info)}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#1e1a29] bg-accent hover:opacity-90 transition-opacity"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
