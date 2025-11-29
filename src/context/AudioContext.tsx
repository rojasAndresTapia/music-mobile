import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Track } from '../types/Track';
import { expoAudioService } from '../services/expoAudioService';
import { useMusicData } from '../hooks/useMusicData';

interface AudioContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  playTrack: (track: Track) => Promise<void>;
  pauseTrack: () => Promise<void>;
  resumeTrack: () => Promise<void>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

interface Props {
  children: ReactNode;
}

export const AudioProvider: React.FC<Props> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const { playTrack: dataPlayTrack } = useMusicData();

  // Initialize audio service
  useEffect(() => {
    const initAudio = async () => {
      try {
        await expoAudioService.initialize();
        console.log('🎵 Expo audio service initialized in context');
      } catch (error) {
        console.error('❌ Error initializing expo audio service:', error);
      }
    };

    initAudio();
  }, []);

  // Monitor audio status
  useEffect(() => {
    const checkAudioStatus = async () => {
      try {
        const status = await expoAudioService.getStatus();
        if (status && status.isLoaded) {
          setIsPlaying(status.isPlaying || false);
        }
      } catch (error) {
        // Ignore errors when no audio is loaded
      }
    };

    const interval = setInterval(checkAudioStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const playTrack = async (track: Track) => {
    try {
      setIsLoading(true);
      setCurrentTrack(track);
      
      // Get streaming URL
      let streamingUrl = track.src;
      if (!streamingUrl && track.key) {
        const { getTrackStreamingUrl } = await import('../utils/dataTransformers');
        streamingUrl = await getTrackStreamingUrl(track);
        track.src = streamingUrl; // Cache it
      }
      
      await expoAudioService.playTrack(track, streamingUrl);
      setIsPlaying(true);
    } catch (error) {
      console.error('❌ Error playing track from context:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const pauseTrack = async () => {
    try {
      await expoAudioService.pause();
      setIsPlaying(false);
    } catch (error) {
      console.error('❌ Error pausing track:', error);
    }
  };

  const resumeTrack = async () => {
    try {
      await expoAudioService.resume();
      setIsPlaying(true);
    } catch (error) {
      console.error('❌ Error resuming track:', error);
    }
  };

  const value: AudioContextType = {
    currentTrack,
    isPlaying,
    isLoading,
    playTrack,
    pauseTrack,
    resumeTrack,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
