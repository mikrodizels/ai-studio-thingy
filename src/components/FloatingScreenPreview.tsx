import React, { useState, useRef, useEffect } from 'react';
import { Monitor, X, GripHorizontal, Eye } from 'lucide-react';
import { useScreenShare } from '../lib/ScreenShareContext';

export function FloatingScreenPreview() {
  const { isScreenSharing, screenStream, stopScreenShare } = useScreenShare();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [position, setPosition] = useState({ x: 24, y: 72 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });

  useEffect(() => {
    if (videoRef.current && screenStream) {
      videoRef.current.srcObject = screenStream;
    }
  }, [screenStream, isScreenSharing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const newX = Math.max(10, Math.min(window.innerWidth - 280, dragRef.current.initialX + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - 180, dragRef.current.initialY + dy));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (!isScreenSharing || !screenStream) return null;

  return (
    <div
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      className={`fixed z-50 w-72 bg-[#2c2838]/90 backdrop-blur-xl border border-[#ffffff20] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col transition-shadow ${
        isDragging ? 'cursor-grabbing ring-2 ring-accent' : 'cursor-default'
      }`}
    >
      {/* Draggable Header */}
      <div
        onMouseDown={handleMouseDown}
        className="bg-[#201c2a]/95 px-3 py-2 flex items-center justify-between border-b border-white/10 select-none cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal size={14} className="text-text-secondary" />
          <span className="text-xs font-bold text-accent flex items-center gap-1.5">
            <Monitor size={14} /> Screen Sharing Feed
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded-full animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            LIVE
          </span>

          <button
            onClick={stopScreenShare}
            className="p-1 text-text-secondary hover:text-red-400 hover:bg-white/10 rounded-md transition-colors"
            title="Stop Screen Sharing"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Video Preview Container */}
      <div className="relative bg-black w-full aspect-video flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain"
        />

        <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] text-text-secondary border border-white/10 flex items-center gap-1">
          <Eye size={10} className="text-accent" />
          Agent Feed
        </div>
      </div>
    </div>
  );
}
