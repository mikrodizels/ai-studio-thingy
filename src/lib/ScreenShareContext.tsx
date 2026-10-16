import React, { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { useLiveAPI } from './useLiveAPI';

interface ScreenShareContextType {
  isScreenSharing: boolean;
  screenStream: MediaStream | null;
  startScreenShare: () => Promise<boolean>;
  stopScreenShare: () => void;
  getLatestClip: () => Promise<string | null>;
}

const ScreenShareContext = createContext<ScreenShareContextType | undefined>(undefined);

function getSupportedMimeType() {
  const types = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4'
  ];
  for (const t of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return '';
}

export function ScreenShareProvider({ children }: { children: ReactNode }) {
  const { connected, session } = useLiveAPI();
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

  const stopScreenShare = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error('Error stopping recorder', e);
      }
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];

    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }
    if (videoTrackRef.current) {
      videoTrackRef.current.stop();
      videoTrackRef.current = null;
    }

    setScreenStream(null);
    setIsScreenSharing(false);
  }, [screenStream]);

  // If live call disconnects, stop screen share automatically
  useEffect(() => {
    if (!connected && isScreenSharing) {
      stopScreenShare();
    }
  }, [connected, isScreenSharing, stopScreenShare]);

  const startScreenShare = async (): Promise<boolean> => {
    if (!connected) return false;

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { max: 30 }
        },
        audio: false
      });

      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack) {
        return false;
      }

      videoTrackRef.current = videoTrack;
      videoTrack.onended = () => {
        stopScreenShare();
      };

      setScreenStream(stream);
      setIsScreenSharing(true);

      // Initialize MediaRecorder for chunking video clips between replies
      try {
        const mimeType = getSupportedMimeType();
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        recorder.start(200);
        mediaRecorderRef.current = recorder;
      } catch (recErr) {
        console.error('Failed to start MediaRecorder for screen share:', recErr);
      }

      return true;
    } catch (err) {
      console.error('User cancelled or screen share failed:', err);
      setIsScreenSharing(false);
      setScreenStream(null);
      return false;
    }
  };

  const getLatestClip = async (): Promise<string | null> => {
    if (!chunksRef.current || chunksRef.current.length === 0) {
      return null;
    }
    const mimeType = mediaRecorderRef.current?.mimeType || 'video/webm';
    const blob = new Blob([...chunksRef.current], { type: mimeType });
    chunksRef.current = []; // Clear chunks for the next clip interval
    
    if (blob.size === 0) return null;
    return URL.createObjectURL(blob);
  };

  useEffect(() => {
    (window as any).__getLatestScreenShareClip = getLatestClip;
    return () => {
      delete (window as any).__getLatestScreenShareClip;
    };
  }, [getLatestClip]);

  // Periodically send current screen frame to Gemini Live API session
  useEffect(() => {
    if (!isScreenSharing || !screenStream || !connected || !session) return;

    const video = document.createElement('video');
    video.srcObject = screenStream;
    video.muted = true;
    video.play().catch(() => {});

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const interval = setInterval(() => {
      if (video.readyState >= 2 && ctx && session) {
        canvas.width = 640;
        canvas.height = 360;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        const base64Data = dataUrl.split(',')[1];
        if (base64Data) {
          try {
            session.sendRealtimeInput({
              video: {
                mimeType: 'image/jpeg',
                data: base64Data
              }
            });
          } catch (e) {
            console.error('Error sending frame to live session', e);
          }
        }
      }
    }, 1200);

    return () => {
      clearInterval(interval);
      video.srcObject = null;
    };
  }, [isScreenSharing, screenStream, connected, session]);

  return (
    <ScreenShareContext.Provider
      value={{
        isScreenSharing,
        screenStream,
        startScreenShare,
        stopScreenShare,
        getLatestClip
      }}
    >
      {children}
    </ScreenShareContext.Provider>
  );
}

export function useScreenShare() {
  const context = useContext(ScreenShareContext);
  if (!context) {
    throw new Error('useScreenShare must be used within a ScreenShareProvider');
  }
  return context;
}
